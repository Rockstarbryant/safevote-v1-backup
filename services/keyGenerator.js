// services/keyGenerator.js
const { ethers } = require('ethers');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const crypto = require('crypto');

class VoterKeyGenerator {
    constructor(dbPool) {
        this.db = dbPool;                    // MySQL pool
        this.inMemoryTrees = new Map();      // Keep trees in memory for fast proofs
    }

    async generateVoterKeys(electionId, numVoters, voterAddresses = []) {
        // Check if already generated
        const existing = await this.getStoredMerkleRoot(electionId);
        if (existing) {
            throw new Error(`Keys already generated for election ${electionId}`);
        }

        const keys = [];
        const voterMapping = [];

        for (let i = 0; i < numVoters; i++) {
            const voterId = crypto.randomBytes(16).toString('hex');
            const key = ethers.utils.id(`${electionId}-${voterId}-${Date.now()}-${i}`);
            
            const address = voterAddresses[i] || ethers.constants.AddressZero;

            const entry = {
                election_id: electionId,
                voter_id: voterId,
                address: address.toLowerCase(),
                key: key,
                key_hash: keccak256(key).toString('hex')
            };

            keys.push(key);
            voterMapping.push(entry);
        }

        const leaves = keys.map(key => keccak256(key));
        const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        const merkleRoot = tree.getHexRoot();

        // === Persist to MySQL ===
        try {
            await this.db.query('START TRANSACTION');

            // Store merkle root
            await this.db.query(
                `INSERT INTO elections (election_id, merkle_root, total_voters, created_at)
                 VALUES (?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE merkle_root = VALUES(merkle_root)`,
                [electionId, merkleRoot, numVoters]
            );

            // Store all voter keys (batch insert for performance)
            const values = voterMapping.map(v => [
                v.election_id,
                v.voter_id,
                v.address,
                v.key,
                v.key_hash
            ]);

            await this.db.query(
                `INSERT INTO voter_keys 
                 (election_id, voter_id, voter_address, voter_key, key_hash)
                 VALUES ?`,
                [values]
            );

            await this.db.query('COMMIT');

            // Cache tree in memory for fast proof generation
            this.inMemoryTrees.set(electionId, { tree, voterMapping });

            return {
                merkleRoot,
                totalKeys: keys.length
            };
        } catch (error) {
            await this.db.query('ROLLBACK');
            throw error;
        }
    }

    // Load tree from DB into memory if needed
    async loadTreeIntoMemory(electionId) {
        if (this.inMemoryTrees.has(electionId)) return;

        const [rows] = await this.db.query(
            `SELECT voter_key FROM voter_keys 
             WHERE election_id = ? 
             ORDER BY id ASC`,
            [electionId]
        );

        if (rows.length === 0) return null;

        const keys = rows.map(r => r.voter_key);
        const leaves = keys.map(k => keccak256(k));
        const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

        this.inMemoryTrees.set(electionId, { tree, keys });
    }

    async getMerkleProof(electionId, voterKey) {
        await this.loadTreeIntoMemory(electionId);

        const data = this.inMemoryTrees.get(electionId);
        if (!data) throw new Error('Election keys not found');

        const leaf = keccak256(voterKey);
        return data.tree.getHexProof(leaf);
    }

    async getVoterData(electionId, voterAddress) {
        const [rows] = await this.db.query(
            `SELECT voter_id, voter_key, key_hash 
             FROM voter_keys 
             WHERE election_id = ? AND voter_address = ? 
             LIMIT 1`,
            [electionId, voterAddress.toLowerCase()]
        );

        if (rows.length === 0) return null;

        const voter = rows[0];
        const proof = await this.getMerkleProof(electionId, voter.voter_key);

        return {
            voterId: voter.voter_id,
            address: voterAddress,
            key: voter.voter_key,
            keyHash: voter.key_hash,
            merkleProof: proof
        };
    }

    async getStoredMerkleRoot(electionId) {
        const [rows] = await this.db.query(
            `SELECT merkle_root FROM elections WHERE election_id = ?`,
            [electionId]
        );
        return rows.length > 0 ? rows[0].merkle_root : null;
    }

    // Fixed: No need to pass database anymore
    async hasVotedAnyChain(electionId, voterAddress) {
        const [rows] = await this.db.query(
            `SELECT 1 FROM votes 
             WHERE election_id = ? AND voter_address = ? 
             LIMIT 1`,
            [electionId, voterAddress.toLowerCase()]
        );
        return rows.length > 0;
    }

    async recordVote(electionId, voterAddress, chainId, txHash, keyHash = 'pending') {
        await this.db.query(
            `INSERT INTO votes 
             (election_id, voter_address, voter_key_hash, chain_id, tx_hash, voted_at)
             VALUES (?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE tx_hash = VALUES(tx_hash)`,
            [electionId, voterAddress.toLowerCase(), keyHash, chainId, txHash]
        );
    }

    // Optional: Export all keys (for backup or frontend distribution)
    async exportKeys(electionId) {
        const root = await this.getStoredMerkleRoot(electionId);
        if (!root) throw new Error('Election not found');

        const [keys] = await this.db.query(
            `SELECT voter_id, voter_address AS address, voter_key AS key 
             FROM voter_keys WHERE election_id = ?`,
            [electionId]
        );

        return { electionId, merkleRoot: root, totalKeys: keys.length, keys };
    }
}

module.exports = { VoterKeyGenerator };