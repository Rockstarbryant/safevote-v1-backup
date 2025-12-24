// services/keyGenerator.js - PostgreSQL with voter_keys table
const { ethers } = require('ethers');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const crypto = require('crypto');

class VoterKeyGenerator {
  constructor(dbPool) {
    this.db = dbPool;
    this.inMemoryTrees = new Map();
    console.log('VoterKeyGenerator initialized');
  }

  /**
   * Generate random voter keys (bytes32) and merkle root
   * Stores voter_key, key_hash, proof in voter_keys table
   */
  async generateVoterKeys(electionId, numVoters, voterAddresses = []) {
    console.log(`Starting key generation for election ${electionId}`);
    console.log(`Requested voters: ${numVoters}, addresses provided: ${voterAddresses.length}`);

    try {
      const existing = await this.getStoredMerkleRoot(electionId);
      if (existing) {
        console.log(`Keys already exist for election ${electionId}, root: ${existing}`);
        throw new Error(`Keys already generated for election ${electionId}`);
      }

      if (!Array.isArray(voterAddresses) || voterAddresses.length === 0) {
        throw new Error('voterAddresses must be a non-empty array');
      }

      if (voterAddresses.length !== numVoters) {
        throw new Error(`Mismatch: ${voterAddresses.length} addresses vs ${numVoters} requested`);
      }

      const normalizedAddresses = voterAddresses.map(addr => addr.toLowerCase());
      console.log(`Generating ${numVoters} random voter keys...`);

      const voterKeys = []; // raw '0x' + 64 hex
      const mappings = [];

      for (let i = 0; i < numVoters; i++) {
        const keyBytes = crypto.randomBytes(32);
        const voterKey = '0x' + keyBytes.toString('hex');

        voterKeys.push(voterKey);

        mappings.push({
          election_id: electionId,
          voter_address: normalizedAddresses[i],
          voter_key: voterKey,
          key_hash: ethers.utils.keccak256(voterKey), // for double-vote check if needed
        });

        if (i < 3 || i === numVoters - 1) {
          console.log(`Generated key ${i}: ${voterKey.substring(0, 10)}...`);
        }
      }

      console.log(`Building merkle tree from ${voterKeys.length} voter keys`);

      // Leaves = keccak256(voterKey bytes) to match Solidity keccak256(abi.encodePacked(voterKey))
      const leaves = voterKeys.map(key => keccak256(ethers.utils.arrayify(key)));
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const merkleRoot = tree.getHexRoot();

      console.log(`Merkle root calculated: ${merkleRoot}`);

      // Generate and attach proofs
      mappings.forEach((m, i) => {
        const leaf = leaves[i];
        m.proof = JSON.stringify(tree.getHexProof(leaf));
      });

      console.log(`Generated proofs for all voters`);

      const client = await this.db.connect();
      try {
        await client.query('BEGIN');
        console.log('Transaction started');

        // Update elections with root
        await client.query(
          `UPDATE elections 
           SET merkle_root = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE uuid = $2`,
          [merkleRoot, electionId]
        );
        console.log('Updated elections table with merkle root');

        // Insert voter_keys
        for (const m of mappings) {
          await client.query(
            `INSERT INTO voter_keys 
             (election_id, voter_address, voter_key, key_hash, proof, distributed, created_at)
             VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)
             ON CONFLICT (election_id, voter_address) DO UPDATE
             SET voter_key = EXCLUDED.voter_key, proof = EXCLUDED.proof`,
            [m.election_id, m.voter_address, m.voter_key, m.key_hash, m.proof]
          );
        }
        console.log(`Inserted ${mappings.length} voter keys into DB`);

        await client.query('COMMIT');
        console.log('Transaction committed successfully');

        // Cache tree
        this.inMemoryTrees.set(electionId, {
          tree,
          voterKeys,
          addresses: normalizedAddresses,
          merkleRoot
        });

        console.log(`Key generation completed for election ${electionId}`);
        return { merkleRoot, totalKeys: numVoters };
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction rolled back due to error:', error.message);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Key generation failed:', error.message);
      throw error;
    }
  }

   async loadTreeIntoMemory(electionId) {
    if (this.inMemoryTrees.has(electionId)) {
      return this.inMemoryTrees.get(electionId);
    }

    console.log(`Loading tree for ${electionId} from DB`);

    const { rows } = await this.db.query(
      `SELECT voter_key FROM voter_keys WHERE election_id = $1 ORDER BY id`,
      [electionId]
    );

    if (rows.length === 0) throw new Error('No keys found');

    const voterKeys = rows.map(r => r.voter_key);
    const leaves = voterKeys.map(k => keccak256(ethers.utils.arrayify(k)));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

    const treeData = { tree, leaves };
    this.inMemoryTrees.set(electionId, treeData);
    return treeData;
  }

   async getMerkleProof(electionId, voterKey) {
    const treeData = await this.loadTreeIntoMemory(electionId);
    const leaf = keccak256(ethers.utils.arrayify(voterKey));
    const proof = treeData.tree.getHexProof(leaf);
    console.log(`Proof generated for key ${voterKey.substring(0, 10)}..., length: ${proof.length}`);
    return proof;
  }

  /**
   * Get stored merkle root
   */
  async getStoredMerkleRoot(electionId) {
    try {
      const { rows } = await this.db.query(
        `SELECT merkle_root FROM elections WHERE uuid = $1`,
        [electionId]
      );
      if (rows.length === 0) return null;
      const root = rows[0].merkle_root;
      return root && root !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? root : null;
    } catch (error) {
      console.error('Error fetching merkle root:', error.message);
      return null;
    }
  }

  /**
   * Get voter data: voter_key + merkleProof
   */
  async getVoterData(electionId, voterAddress) {
    console.log(`Fetching voter data for ${voterAddress} in election ${electionId}`);

    try {
      const normalized = voterAddress.toLowerCase();

      const { rows } = await this.db.query(
        `SELECT voter_key, proof FROM voter_keys 
         WHERE election_id = $1 AND voter_address = $2 
         LIMIT 1`,
        [electionId, normalized]
      );

      if (rows.length === 0) {
        console.log(`Voter ${voterAddress} not found`);
        return null;
      }

      const voterKey = rows[0].voter_key;
      const proof = JSON.parse(rows[0].proof);

      console.log(`Found voter key: ${voterKey.substring(0, 10)}...`);
      console.log(`Proof length: ${proof.length}`);

      return {
        voterKey,
        merkleProof: proof,
        eligible: true
      };
    } catch (error) {
      console.error('Error fetching voter data:', error.message);
      return null;
    }
  }

  // Keep other methods (hasVotedAnyChain, recordVote, etc.) as needed
  

  /**
   * Check if voter has already voted on any chain
   * Prevents cross-chain double voting
   */
  async hasVotedAnyChain(electionId, voterAddress) {
    try {
      const { rows } = await this.db.query(
        `SELECT 1 FROM votes 
                 WHERE election_uuid = $1 AND voter_address = $2 
                 LIMIT 1`,
        [electionId, voterAddress.toLowerCase()]
      );
      return rows.length > 0;
    } catch (error) {
      console.error('❌ Error checking vote status:', error.message);
      return false;
    }
  }

  /**
   * Record a vote after successful blockchain transaction
   */
  async recordVote(electionId, voterAddress, chainId, txHash, voterKeyHash = null) {
    try {
      await this.db.query(
        `INSERT INTO votes 
                 (election_uuid, voter_address, chain_id, tx_hash)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (election_uuid, voter_address, chain_id) 
                 DO UPDATE SET 
                   tx_hash = EXCLUDED.tx_hash,
                   timestamp = CURRENT_TIMESTAMP`,
        [electionId, voterAddress.toLowerCase(), chainId, txHash]
      );

      console.log(`✅ Vote recorded: ${voterAddress} on chain ${chainId}`);
    } catch (error) {
      console.error('❌ Error recording vote:', error.message);
      throw error;
    }
  }

  /**
   * Mark voter key as distributed (optional tracking)
   */
  async markKeyDistributed(electionId, voterAddress) {
    try {
      await this.db.query(
        `UPDATE voter_keys 
                 SET distributed = TRUE, distributed_at = CURRENT_TIMESTAMP
                 WHERE uuid = $1 AND voter_address = $2`,
        [electionId, voterAddress.toLowerCase()]
      );

      console.log(`✅ Marked key distributed for ${voterAddress}`);
    } catch (error) {
      console.error('❌ Error marking key distributed:', error.message);
    }
  }

  /**
   * Get all voter keys for an election (for admin/export)
   */
  async getAllVoterKeys(electionId) {
    try {
      const { rows } = await this.db.query(
        `SELECT voter_address, voter_key, key_hash, distributed
                 FROM voter_keys 
                 WHERE election_id = $1
                 ORDER BY id ASC`,
        [electionId]
      );

      return {
        electionId,
        totalVoters: rows.length,
        voters: rows,
      };
    } catch (error) {
      console.error('❌ Error fetching voter keys:', error.message);
      throw error;
    }
  }

  clearMemoryCache(electionId) {
    this.inMemoryTrees.delete(electionId);
    console.log(`Cleared cache for ${electionId}`);
  }
}

module.exports = { VoterKeyGenerator };