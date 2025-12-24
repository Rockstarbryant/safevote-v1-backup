// services/keyGenerator.js - PostgreSQL with voter_keys table
const { ethers } = require('ethers');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const crypto = require('crypto');

class VoterKeyGenerator {
  constructor(dbPool) {
    this.db = dbPool;
    this.inMemoryTrees = new Map();
    console.log('🔐 VoterKeyGenerator initialized');
  }

  /**
   * Generate random voter keys (bytes32) and merkle root
   * Contract expects: leaf = keccak256(abi.encodePacked(voterKey))
   * voterKey is a random bytes32 value (0x...)
   */
  async generateVoterKeys(electionId, numVoters, voterAddresses = []) {
    console.log(`\n=== 🚀 KEY GENERATION START ===`);
    console.log(`📋 Election ID: ${electionId}`);
    console.log(`👥 Total Voters: ${numVoters}`);
    console.log(`📊 Voter Addresses: ${voterAddresses.length}`);

    try {
      // Check if keys already exist for this election
      const existing = await this.getStoredMerkleRoot(electionId);
      if (existing) {
        console.warn(`⚠️  Keys already exist for election ${electionId}`);
        throw new Error('Keys already generated for this election');
      }

      // Validate address count matches
      if (voterAddresses.length !== numVoters) {
        throw new Error(
          `Address count mismatch: expected ${numVoters}, got ${voterAddresses.length}`
        );
      }

      // Normalize all addresses to lowercase
      const normalized = voterAddresses.map(a => {
        const cleaned = a.trim().toLowerCase();
        // Basic validation
        if (!/^0x[a-f0-9]{40}$/.test(cleaned)) {
          throw new Error(`Invalid address format: ${a}`);
        }
        return cleaned;
      });

      console.log(`✓ All ${numVoters} addresses validated`);

      const records = [];

      // Step 1: Generate random voter keys (bytes32)
      console.log(`\n📝 Generating ${numVoters} random voter keys...`);

      for (let i = 0; i < numVoters; i++) {
        // Generate random 32 bytes
        const keyBytes = crypto.randomBytes(32);
        const voterKey = '0x' + keyBytes.toString('hex');

        records.push({
          election_id: electionId,
          voter_address: normalized[i],
          voter_key: voterKey,
          // proof will be generated after tree is built
          proof: null
        });

        if ((i + 1) % Math.max(1, Math.floor(numVoters / 5)) === 0) {
          console.log(`  ✓ Generated ${i + 1}/${numVoters} keys`);
        }
      }

      console.log(`✅ All ${numVoters} random keys generated`);

      // Step 2: Build merkle tree
      // For contract verification: leaf = keccak256(abi.encodePacked(voterKey))
      console.log(`\n🌳 Building Merkle Tree...`);

      // Create leaves: hash of each voter key
      const leaves = records.map(r => {
        // Match contract: keccak256(abi.encodePacked(voterKey))
        // In ethers: keccak256(toBeHex(voterKey))
        const packed = ethers.utils.solidityPack(['bytes32'], [r.voter_key]);
        const leaf = keccak256(packed);
        return leaf;
      });

      console.log(`📌 Created ${leaves.length} leaf hashes`);

      // Build tree with sortPairs for consistent root
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const merkleRoot = tree.getHexRoot();

      console.log(`🔑 Merkle Root: ${merkleRoot}`);

      // Step 3: Generate proofs for each voter
      console.log(`\n📤 Generating merkle proofs...`);

      records.forEach((r, i) => {
        const proof = tree.getHexProof(leaves[i]);
        r.proof = JSON.stringify(proof);

        if ((i + 1) % Math.max(1, Math.floor(numVoters / 5)) === 0) {
          console.log(`  ✓ Generated proofs for ${i + 1}/${numVoters} voters (proof length: ${proof.length})`);
        }
      });

      console.log(`✅ All proofs generated`);

      // Step 4: Save to database
      console.log(`\n💾 Saving to PostgreSQL...`);

      const client = await this.db.connect();
      try {
        await client.query('BEGIN');

        // Update election with merkle root
        const updateResult = await client.query(
          `UPDATE elections 
           SET merkle_root = $1, updated_at = CURRENT_TIMESTAMP
           WHERE uuid = $2`,
          [merkleRoot, electionId]
        );

        if (updateResult.rowCount === 0) {
          throw new Error(`Election ${electionId} not found in database`);
        }

        console.log(`✓ Updated election with merkle root`);

        // Insert voter keys with proofs
        let insertCount = 0;
        for (const r of records) {
          try {
            // Generate key_hash for this voter_key
            const keyHashInput = keccak256(ethers.utils.solidityPack(['bytes32'], [r.voter_key]));
            const keyHash = '0x' + keyHashInput.toString('hex');

            await client.query(
              `INSERT INTO voter_keys 
               (election_id, voter_address, voter_key, key_hash, proof, distributed, created_at)
               VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)`,
              [r.election_id, r.voter_address, r.voter_key, keyHash, r.proof]
            );
            insertCount++;
          } catch (insertErr) {
            console.warn(`⚠️  Failed to insert key for ${r.voter_address}: ${insertErr.message}`);
          }
        }

        await client.query('COMMIT');
        
        console.log(`✓ Inserted/updated ${insertCount} voter keys in database`);
        console.log(`\n=== ✅ KEY GENERATION SUCCESS ===\n`);

        return {
          merkleRoot,
          totalKeys: numVoters,
          votersProcessed: insertCount,
          success: true
        };

      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Database transaction failed:`, err.message);
        throw err;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error(`\n=== ❌ KEY GENERATION FAILED ===`);
      console.error(`Error: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * Load merkle tree from database into memory
   * Used for proof generation when voting
   */
  async loadTreeIntoMemory(electionId) {
    if (this.inMemoryTrees.has(electionId)) {
      console.log(`📦 Using cached tree for ${electionId}`);
      return this.inMemoryTrees.get(electionId);
    }

    console.log(`📖 Loading merkle tree for ${electionId} from database...`);

    try {
      const { rows } = await this.db.query(
        `SELECT voter_key FROM voter_keys 
         WHERE election_id = $1 
         ORDER BY id ASC`,
        [electionId]
      );

      if (rows.length === 0) {
        throw new Error(`No voter keys found for election ${electionId}`);
      }

      console.log(`✓ Loaded ${rows.length} voter keys from database`);

      const voterKeys = rows.map(r => r.voter_key);

      // Rebuild leaves (match generation process)
      const leaves = voterKeys.map(k => {
        const packed = ethers.utils.solidityPack(['bytes32'], [k]);
        const leaf = keccak256(packed);
        return leaf;
      });

      console.log(`✓ Created ${leaves.length} leaf hashes`);

      // Rebuild tree with same sorting
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const root = tree.getHexRoot();

      console.log(`✓ Merkle tree loaded (root: ${root.substring(0, 10)}...)`);

      const treeData = { tree, leaves, root };
      this.inMemoryTrees.set(electionId, treeData);

      return treeData;

    } catch (error) {
      console.error(`❌ Error loading tree: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate merkle proof for a specific voter
   * Contract call: MerkleProof.verify(merkleProof, root, leaf)
   */
  async getMerkleProof(electionId, voterKey) {
    console.log(`\n🔍 Generating merkle proof for ${voterKey.substring(0, 10)}...`);

    try {
      const treeData = await this.loadTreeIntoMemory(electionId);

      // Create leaf from voter key (match contract)
      const packed = ethers.utils.solidityPack(['bytes32'], [voterKey]);
      const leaf = keccak256(packed);

      console.log(`📌 Leaf hash: ${leaf.toString('hex').substring(0, 10)}...`);

      // Generate proof
      const proof = treeData.tree.getHexProof(leaf);

      console.log(`📤 Proof generated (length: ${proof.length} hashes)`);
      console.log(`✅ Ready for contract verification\n`);

      return {
        proof,
        merkleRoot: treeData.root,
        leaf: '0x' + leaf.toString('hex')
      };

    } catch (error) {
      console.error(`❌ Error generating proof: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get stored merkle root from database
   */
  async getStoredMerkleRoot(electionId) {
    try {
      const { rows } = await this.db.query(
        `SELECT merkle_root FROM elections WHERE uuid = $1`,
        [electionId]
      );

      if (rows.length === 0) {
        console.log(`ℹ️  Election ${electionId} not found`);
        return null;
      }

      const root = rows[0].merkle_root;
      const isValid = root && root !== '0x0000000000000000000000000000000000000000000000000000000000000000';

      if (isValid) {
        console.log(`✓ Found merkle root: ${root.substring(0, 10)}...`);
      } else {
        console.log(`ℹ️  No valid merkle root stored yet`);
      }

      return isValid ? root : null;

    } catch (error) {
      console.error(`❌ Error fetching merkle root: ${error.message}`);
      return null;
    }
  }

  /**
   * Get voter data: voter_key + merkleProof
   * Returns everything needed for contract vote() call
   */
  async getVoterData(electionId, voterAddress) {
    console.log(`\n🔎 Fetching voter data for ${voterAddress.substring(0, 10)}... in election ${electionId}`);

    try {
      const normalized = voterAddress.toLowerCase();

      // Check voter is registered
      const { rows } = await this.db.query(
        `SELECT voter_key, key_hash, proof FROM voter_keys 
         WHERE election_id = $1 AND voter_address = $2 
         LIMIT 1`,
        [electionId, normalized]
      );

      if (rows.length === 0) {
        console.log(`❌ Voter ${normalized} not registered for this election`);
        return null;
      }

      const voterKey = rows[0].voter_key;
      const keyHash = rows[0].key_hash;
      const storedProof = JSON.parse(rows[0].proof);

      console.log(`✓ Found voter key: ${voterKey.substring(0, 10)}...`);
      console.log(`✓ Found key hash: ${keyHash.substring(0, 10)}...`);
      console.log(`✓ Proof hashes: ${storedProof.length}`);

      // Generate fresh proof from tree to ensure accuracy
      const proofData = await this.getMerkleProof(electionId, voterKey);

      console.log(`✅ Voter data ready for voting\n`);

      return {
        voterKey,
        keyHash,
        merkleProof: proofData.proof,
        merkleRoot: proofData.merkleRoot,
        eligible: true
      };

    } catch (error) {
      console.error(`❌ Error fetching voter data: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if voter has already voted on any chain
   * Prevents cross-chain double voting
   */
  async hasVotedAnyChain(electionId, voterAddress) {
    try {
      const normalized = voterAddress.toLowerCase();

      const { rows } = await this.db.query(
        `SELECT 1 FROM votes 
         WHERE election_uuid = $1 AND voter_address = $2 
         LIMIT 1`,
        [electionId, normalized]
      );

      if (rows.length > 0) {
        console.log(`⚠️  Voter ${normalized} already voted on another chain`);
        return true;
      }

      console.log(`✓ Voter ${normalized} eligible (no previous votes)`);
      return false;

    } catch (error) {
      console.error(`❌ Error checking vote status: ${error.message}`);
      return false;
    }
  }

  /**
   * Record a vote after successful blockchain transaction
   */
  async recordVote(electionId, voterAddress, chainId, txHash, voterKeyHash = null) {
    try {
      const normalized = voterAddress.toLowerCase();

      await this.db.query(
        `INSERT INTO votes 
         (election_uuid, voter_address, chain_id, tx_hash, voted_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (election_uuid, voter_address, chain_id) 
         DO UPDATE SET 
           tx_hash = EXCLUDED.tx_hash,
           voted_at = CURRENT_TIMESTAMP`,
        [electionId, normalized, chainId, txHash]
      );

      console.log(`✅ Vote recorded: ${normalized} on chain ${chainId}`);
      console.log(`   TX Hash: ${txHash}`);

    } catch (error) {
      console.error(`❌ Error recording vote: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark voter key as distributed (optional tracking)
   */
  async markKeyDistributed(electionId, voterAddress) {
    try {
      const normalized = voterAddress.toLowerCase();

      const { rows } = await this.db.query(
        `UPDATE voter_keys 
         SET distributed = TRUE, distributed_at = CURRENT_TIMESTAMP
         WHERE election_id = $1 AND voter_address = $2
         RETURNING voter_address`,
        [electionId, normalized]
      );

      if (rows.length > 0) {
        console.log(`✅ Marked key distributed for ${normalized}`);
      }

    } catch (error) {
      console.error(`❌ Error marking distributed: ${error.message}`);
    }
  }

  /**
   * Get all voter keys for an election (for admin/export)
   */
  async getAllVoterKeys(electionId) {
    try {
      console.log(`📥 Exporting all voter keys for ${electionId}...`);

      const { rows } = await this.db.query(
        `SELECT voter_address, voter_key, key_hash, distributed, created_at
         FROM voter_keys 
         WHERE election_id = $1
         ORDER BY id ASC`,
        [electionId]
      );

      console.log(`✓ Exported ${rows.length} voter keys`);

      return {
        electionId,
        totalVoters: rows.length,
        voters: rows,
      };

    } catch (error) {
      console.error(`❌ Error exporting keys: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear in-memory tree cache for an election
   */
  clearMemoryCache(electionId) {
    if (this.inMemoryTrees.has(electionId)) {
      this.inMemoryTrees.delete(electionId);
      console.log(`🗑️  Cleared memory cache for ${electionId}`);
    }
  }

  /**
   * Clear all in-memory caches
   */
  clearAllCaches() {
    const count = this.inMemoryTrees.size;
    this.inMemoryTrees.clear();
    console.log(`🗑️  Cleared ${count} cached merkle trees`);
  }
}

module.exports = { VoterKeyGenerator };