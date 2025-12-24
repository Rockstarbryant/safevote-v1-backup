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
 * Matches contract: leaf = keccak256(abi.encodePacked(voterKey))
 */
async generateVoterKeys(electionId, numVoters, voterAddresses = []) {
  console.log(`\n=== KEY GENERATION START ===`);
  console.log(`Election: ${electionId}`);
  console.log(`Voters: ${numVoters}`);

  try {
    const existing = await this.getStoredMerkleRoot(electionId);
    if (existing) throw new Error('Keys already generated');

    if (voterAddresses.length !== numVoters) throw new Error('Address count mismatch');

    const normalized = voterAddresses.map(a => a.toLowerCase());
    const records = [];

    console.log(`Generating ${numVoters} random voter keys...`);

    for (let i = 0; i < numVoters; i++) {
      const keyBytes = crypto.randomBytes(32);
      const voterKey = '0x' + keyBytes.toString('hex');

      records.push({
        election_id: electionId,
        voter_address: normalized[i],
        voter_key: voterKey
      });

      console.log(`Key ${i+1}: ${voterKey.substring(0,10)}... → ${normalized[i]}`);
    }

    console.log(`Building merkle tree from voterKey bytes`);

    // FIXED: Use Buffer for Node
    const leaves = records.map(r => keccak256(Buffer.from(r.voter_key.slice(2), 'hex')));

    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getHexRoot();

    console.log(`Merkle root: ${root}`);

    // Generate proofs
    records.forEach((r, i) => {
      const proof = tree.getHexProof(leaves[i]);
      r.proof = JSON.stringify(proof);
      console.log(`Proof ${i+1} length: ${proof.length}`);
    });

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      await client.query(`UPDATE elections SET merkle_root = $1 WHERE uuid = $2`, [root, electionId]);

      for (const r of records) {
        await client.query(
          `INSERT INTO voter_keys (election_id, voter_address, voter_key, proof, distributed, created_at)
           VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP)
           ON CONFLICT (election_id, voter_address) DO UPDATE SET voter_key = EXCLUDED.voter_key, proof = EXCLUDED.proof`,
          [r.election_id, r.voter_address, r.voter_key, r.proof]
        );
      }

      await client.query('COMMIT');
      console.log('=== KEY GENERATION SUCCESS ===\n');
      return { merkleRoot: root, totalKeys: numVoters };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('=== KEY GENERATION FAILED ===', error.message);
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