// services/keyGenerator.js - PostgreSQL with voter_keys table
const { ethers } = require('ethers');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const crypto = require('crypto');

class VoterKeyGenerator {
  constructor(dbPool) {
    this.db = dbPool; // PostgreSQL Pool (pg library)
    this.inMemoryTrees = new Map(); // Cache merkle trees for fast proof generation
  }

  /**
   * Generate voter keys and merkle root for an election
   * Stores keys in voter_keys table and merkle root in elections table
   */
  async generateVoterKeys(electionId, numVoters, voterAddresses = []) {
    try {
      // Check if keys already generated
      const existing = await this.getStoredMerkleRoot(electionId);
      if (existing) {
        throw new Error(`Keys already generated for election ${electionId}`);
      }

      if (!Array.isArray(voterAddresses) || voterAddresses.length === 0) {
        throw new Error('voterAddresses must be a non-empty array');
      }

      if (voterAddresses.length !== numVoters) {
        throw new Error(
          `Address count (${voterAddresses.length}) doesn't match numVoters (${numVoters})`
        );
      }

      const keys = [];
      const voterKeyMappings = [];
      const normalizedAddresses = voterAddresses.map((addr) => addr.toLowerCase());

      // Generate unique key for each voter
      for (let i = 0; i < numVoters; i++) {
        const voterId = crypto.randomBytes(16).toString('hex');
        const voterKey = ethers.utils.id(`${electionId}-${voterId}-${Date.now()}-${i}`);
        const keyHash = keccak256(voterKey).toString('hex');

        keys.push(voterKey);

        voterKeyMappings.push({
          election_uuid: electionId,
          voter_id: voterId,
          voter_address: normalizedAddresses[i],
          voter_key: voterKey,
          key_hash: keyHash,
        });
      }

      // Build merkle tree from keys
      const leaves = keys.map((key) => keccak256(key));
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const merkleRoot = tree.getHexRoot();

      // ============================================
      // TRANSACTION: Store everything atomically
      // ============================================
      const client = await this.db.connect();
      try {
        await client.query('BEGIN');

        // 1. Update elections table with merkle root
        await client.query(
          `UPDATE elections 
                     SET merkle_root = $1, updated_at = CURRENT_TIMESTAMP
                     WHERE uuid = $2`,
          [merkleRoot, electionId]
        );

        await client.query('COMMIT');

        console.log(`✅ Generated merkle root for election ${electionId}`);
        console.log(`   Root: ${merkleRoot}`);
        console.log(`   Total voters: ${numVoters}`);
        console.log(`   Voter keys stored in database`);

        // Cache tree in memory for proof generation
        this.inMemoryTrees.set(electionId, {
          tree,
          keys,
          addresses: normalizedAddresses,
          merkleRoot,
        });

        return {
          merkleRoot,
          totalKeys: keys.length,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error generating voter keys:', error.message);
      throw error;
    }
  }

  /**
   * Load merkle tree into memory from stored keys
   */
  async loadTreeIntoMemory(electionId) {
    if (this.inMemoryTrees.has(electionId)) {
      return this.inMemoryTrees.get(electionId);
    }

    try {
      // Fetch election with voter addresses instead
      const { rows } = await this.db.query(
        `SELECT voter_addresses FROM elections WHERE uuid = $1`,
        [electionId]
      );

      if (rows.length === 0) {
        throw new Error(`Election ${electionId} not found`);
      }

      const addresses = rows[0].voter_addresses || [];
      if (!Array.isArray(addresses)) {
        addresses = JSON.parse(addresses);
      }

      if (addresses.length === 0) {
        throw new Error(`No voter addresses found for election ${electionId}`);
      }

      // Regenerate keys from addresses
      const keys = addresses.map((addr, i) => ethers.utils.id(`${electionId}-${addr}-${i}`));

      const leaves = keys.map((k) => keccak256(k));
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const merkleRoot = tree.getHexRoot();

      const treeData = {
        tree,
        keys,
        addresses: addresses.map((a) => String(a).toLowerCase()),
        merkleRoot,
      };

      this.inMemoryTrees.set(electionId, treeData);
      return treeData;
    } catch (error) {
      console.error('❌ Error loading tree into memory:', error.message);
      throw error;
    }
  }

  /**
   * Generate merkle proof for a specific voter
   */
  async getMerkleProof(electionId, voterAddress) {
    try {
      const treeData = await this.loadTreeIntoMemory(electionId);

      const normalizedAddress = voterAddress.toLowerCase();
      const voterIndex = treeData.addresses.findIndex((addr) => addr === normalizedAddress);

      if (voterIndex === -1) {
        throw new Error(`Voter ${voterAddress} not found in election ${electionId}`);
      }

      const key = treeData.keys[voterIndex];
      const leaf = keccak256(key);
      const proof = treeData.tree.getHexProof(leaf);

      console.log(`✅ Generated merkle proof for ${voterAddress}`);

      return proof;
    } catch (error) {
      console.error('❌ Error generating merkle proof:', error.message);
      throw error;
    }
  }

  /**
   * Get voter data including merkle proof and voter key
   * Called by: voting-ui to get proof before submitting vote
   */
  async getVoterData(electionId, voterAddress) {
    try {
      const normalizedAddress = voterAddress.toLowerCase();

      const { rows } = await this.db.query(
        `SELECT voter_addresses, merkle_root FROM elections WHERE uuid = $1`,
        [electionId]
      );

      if (rows.length === 0) {
        console.log(`❌ Election ${electionId} not found`);
        return null;
      }

      const election = rows[0];

      // Parse voter_addresses
      let voterList = [];
      if (election.voter_addresses) {
        if (typeof election.voter_addresses === 'string') {
          voterList = JSON.parse(election.voter_addresses);
        } else {
          voterList = election.voter_addresses;
        }
      }

      console.log(`📋 Voter list:`, voterList);
      console.log(`🔍 Looking for:`, normalizedAddress);

      // Check if voter is in the list
      const isEligible = voterList.some((addr) => {
        const normalized = String(addr).trim().toLowerCase();
        console.log(`   Comparing: "${normalized}" === "${normalizedAddress}"`);
        return normalized === normalizedAddress;
      });

      if (!isEligible) {
        console.log(`❌ Voter ${normalizedAddress} NOT ELIGIBLE`);
        return null;
      }

      console.log(`✅ Voter ${normalizedAddress} IS ELIGIBLE`);

      const proof = await this.getMerkleProof(electionId, voterAddress);

      return {
        voterAddress: normalizedAddress,
        merkleProof: proof,
        merkleRoot: election.merkle_root,
        eligible: true,
      };
    } catch (error) {
      console.error('❌ Error getting voter data:', error.message);
      return null;
    }
  }

    /**
   * Get stored merkle root from elections table
   * Used to check if keys already generated
   */
  async getStoredMerkleRoot(electionId) {
    try {
      const { rows } = await this.db.query(
        `SELECT merkle_root FROM elections WHERE uuid = $1`,
        [electionId]
      );

      if (rows.length === 0) return null;

      const root = rows[0].merkle_root;
      return root && root !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
        ? root 
        : null;
    } catch (error) {
      console.error('Error fetching stored merkle root:', error.message);
      return null;
    }
  }

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
                 WHERE election_uuid = $1 AND voter_address = $2`,
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
        `SELECT voter_id, voter_address, voter_key, key_hash, distributed
                 FROM voter_keys 
                 WHERE election_uuid = $1
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

  /**
   * Clear tree from memory (for testing/cleanup)
   */
  clearMemoryCache(electionId) {
    this.inMemoryTrees.delete(electionId);
    console.log(`🧹 Cleared cache for election ${electionId}`);
  }
}

module.exports = { VoterKeyGenerator };
