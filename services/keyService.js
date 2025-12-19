// services/keyService.js
require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { VoterKeyGenerator } = require('./keyGenerator');

const app = express();
const PORT = process.env.KEY_SERVICE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database pool (better than single connection for concurrent requests)
let dbPool;

async function connectDB() {
    try {
        dbPool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'safevote_tracker',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Test connection
        await dbPool.query('SELECT 1');
        console.log('✅ Database pool connected');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('   Check your .env file and MySQL server');
        process.exit(1);
    }
}

// Initialize VoterKeyGenerator with DB pool
let keyGen;

connectDB().then(() => {
    keyGen = new VoterKeyGenerator(dbPool);

    app.listen(PORT, () => {
        console.log('');
        console.log('🚀 ============================================');
        console.log(`🔑 SafeVote Key Service v2.0.0`);
        console.log(`📡 Running on http://localhost:${PORT}`);
        console.log(`🗄️  Database: ${process.env.DB_NAME}`);
        console.log('✅ Ready to generate and distribute keys!');
        console.log('============================================');
        console.log('');
    });
});

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'SafeVote Key Service',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

// Generate keys for an election
app.post('/api/elections/keys/generate', async (req, res) => {
    try {
        const { electionId, numVoters, voterAddresses } = req.body;

        if (!electionId || !numVoters || !Array.isArray(voterAddresses)) {
            return res.status(400).json({ 
                error: 'Missing or invalid parameters',
                required: ['electionId', 'numVoters', 'voterAddresses (array)']
            });
        }

        if (voterAddresses.length !== numVoters) {
            return res.status(400).json({ 
                error: 'Voter address count mismatch',
                expected: numVoters,
                received: voterAddresses.length
            });
        }

        console.log(`🔑 Generating ${numVoters} keys for election ${electionId}`);

        // This now persists to DB and updates elections.merkle_root
        const result = await keyGen.generateVoterKeys(electionId, numVoters, voterAddresses);

        res.json({
            success: true,
            electionId,
            merkleRoot: result.merkleRoot,
            totalKeys: result.totalKeys,
            message: 'Keys generated and stored successfully'
        });

    } catch (error) {
        console.error('❌ Key generation error:', error.message);
        if (error.message.includes('already generated')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ 
            error: 'Failed to generate keys',
            message: error.message
        });
    }
});

// Get voter key + Merkle proof (for frontend to vote)
app.get('/api/elections/:electionId/keys/:address', async (req, res) => {
    try {
        const { electionId, address } = req.params;
        const normalizedAddress = address.toLowerCase();

        console.log(`🔍 Fetching key for ${normalizedAddress} in election ${electionId}`);

        // Check if voter already voted on any chain
        const hasVoted = await keyGen.hasVotedAnyChain(electionId, normalizedAddress);
        if (hasVoted) {
            return res.status(403).json({ 
                error: 'Voter has already voted on another chain',
                voterAddress: normalizedAddress
            });
        }

        // Get voter data + Merkle proof
        const voterData = await keyGen.getVoterData(electionId, normalizedAddress);
        if (!voterData) {
            return res.status(404).json({ 
                error: 'Voter not eligible or not found in this election' 
            });
        }

        // Mark key as distributed
        await dbPool.query(
            `UPDATE voter_keys 
             SET distributed = TRUE, distributed_at = NOW() 
             WHERE election_id = ? AND voter_address = ?`,
            [electionId, normalizedAddress]
        );

        console.log(`✅ Key distributed to ${normalizedAddress}`);

        res.json({
            success: true,
            electionId,
            voterAddress: normalizedAddress,
            voterId: voterData.voterId,
            key: voterData.key,
            merkleProof: voterData.merkleProof
        });

    } catch (error) {
        console.error('❌ Get voter key error:', error.message);
        res.status(500).json({ 
            error: 'Failed to retrieve voter key',
            message: error.message
        });
    }
});

// Record a successful vote (called by relayer or frontend after tx confirmation)
app.post('/api/votes/record', async (req, res) => {
    try {
        const { electionId, voterAddress, chainId, txHash } = req.body;

        if (!electionId || !voterAddress || !chainId || !txHash) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const normalizedAddress = voterAddress.toLowerCase();

        console.log(`📝 Recording vote: ${normalizedAddress} on chain ${chainId}, tx: ${txHash.substring(0, 10)}...`);

        // Get key hash for storage
        const voterData = await keyGen.getVoterData(electionId, normalizedAddress);
        const keyHash = voterData ? voterData.keyHash : 'recorded-manually';

        await keyGen.recordVote(electionId, normalizedAddress, chainId, txHash, keyHash);

        res.json({ 
            success: true,
            message: 'Vote recorded successfully',
            voterAddress: normalizedAddress,
            chainId,
            txHash
        });

    } catch (error) {
        console.error('❌ Record vote error:', error.message);
        if (error.message.includes('Duplicate entry')) {
            return res.status(409).json({ error: 'Vote already recorded' });
        }
        res.status(500).json({ 
            error: 'Failed to record vote',
            message: error.message
        });
    }
});

// Optional: Get merkle root only
app.get('/api/elections/:electionId/merkle-root', async (req, res) => {
    try {
        const { electionId } = req.params;
        const root = await keyGen.getStoredMerkleRoot(electionId);
        if (!root) {
            return res.status(404).json({ error: 'Election not found or keys not generated' });
        }
        res.json({ electionId, merkleRoot: root });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// In keyService.js
app.get('/api/elections/:electionId/chain-details/:chainId', async (req, res) => {
  try {
    const { electionId, chainId } = req.params;
    const [rows] = await dbPool.query(
      'SELECT on_chain_election_id FROM election_chains WHERE election_id = ? AND chain_id = ?',
      [electionId, chainId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No details found for this chain' });
    }
    res.json({ onChainElectionId: rows[0].on_chain_election_id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chain details' });
  }
});

// Get on-chain electionId for a UUID + current chain
app.get('/api/elections/:uuid/onchain-id', async (req, res) => {
  try {
    const { uuid } = req.params;
    // You can get chainId from request or assume current testnet
    const chainId = 421614; // Arbitrum Sepolia — change if multi-chain

    const [rows] = await dbPool.query(
      `SELECT on_chain_election_id FROM election_chains 
       WHERE election_id = ? AND chain_id = ?`,
      [uuid, chainId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Election not deployed on this chain' });
    }

    res.json({ onChainElectionId: parseInt(rows[0].on_chain_election_id) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get on-chain ID' });
  }
});

app.post('/api/elections/create', async (req, res) => {
  try {
    const {
      electionId,
      title = 'Untitled Election',
      description = '',
      location = '',
      creator,
      startTime,
      endTime,
      totalVoters,
      isPublic = true,
      allowAnonymous = false,
      allowDelegation = false,
      positions = []
    } = req.body;

    if (!electionId || !creator || startTime === undefined || endTime === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const positionsJson = JSON.stringify(positions);

    await dbPool.query(
      `INSERT INTO elections (
        election_id, title, description, location, creator,
        start_time, end_time, total_voters,
        is_public, allow_anonymous, allow_delegation,
        positions, merkle_root
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0x000...')
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        location = VALUES(location),
        creator = VALUES(creator),
        start_time = VALUES(start_time),
        end_time = VALUES(end_time),
        total_voters = VALUES(total_voters),
        is_public = VALUES(is_public),
        allow_anonymous = VALUES(allow_anonymous),
        allow_delegation = VALUES(allow_delegation),
        positions = VALUES(positions)`,
      [
        electionId,
        title,
        description,
        location,
        creator.toLowerCase(),
        startTime,
        endTime,
        totalVoters,
        isPublic ? 1 : 0,
        allowAnonymous ? 1 : 0,
        allowDelegation ? 1 : 0,
        positionsJson
      ]
    );

    console.log(`Election created/updated: ${electionId} - ${title}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Election create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET election details by UUID (for frontend)
// Save positions after deployment
app.post('/api/elections/positions', async (req, res) => {
  try {
    const { electionId, positions } = req.body;

    if (!electionId || !Array.isArray(positions)) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    await dbPool.query(
      'UPDATE elections SET positions = ? WHERE election_id = ?',
      [JSON.stringify(positions), electionId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Save positions error:', error);
    res.status(500).json({ error: 'Failed to save positions' });
  }
});

// Already have /api/elections/uuid/:uuid — update it to include positions
app.get('/api/elections/uuid/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;

    const [rows] = await dbPool.query(
      `SELECT 
        election_id AS id,
        title, 
        description, 
        location,
        creator,
        merkle_root AS voterMerkleRoot,
        start_time AS startTime,
        end_time AS endTime,
        total_voters AS totalVoters,
        is_public AS isPublic,
        allow_anonymous AS allowAnonymous,
        allow_delegation AS allowDelegation,
        positions
       FROM elections 
       WHERE election_id = ?`,
      [uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    const election = rows[0];

    // Safely parse positions
    if (election.positions) {
      try {
        // If it's already a string (from DB), parse it
        if (typeof election.positions === 'string') {
          election.positions = JSON.parse(election.positions);
        }
        // If it's already an object (rare case), leave it
      } catch (parseError) {
        console.error('Failed to parse positions JSON:', parseError);
        election.positions = []; // fallback to empty
      }
    } else {
      election.positions = []; // null → empty array
    }

    res.json(election);
  } catch (error) {
    console.error('Get election by UUID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET on-chain electionId for a UUID + chain
app.get('/api/elections/uuid/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const [rows] = await dbPool.query(
      `SELECT title, description, location, merkle_root AS voterMerkleRoot,
              start_time AS startTime, end_time AS endTime, total_voters AS totalVoters,
              is_public AS isPublic, allow_anonymous AS allowAnonymous, allow_delegation AS allowDelegation
       FROM elections WHERE election_id = ?`,
      [uuid]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Election not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all elections (for dashboard)
app.get('/api/elections/all', async (req, res) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT 
        election_id AS id,
        title,
        description,
        location,
        start_time AS startTime,
        end_time AS endTime,
        total_voters AS totalVoters,
        is_public AS isPublic,
        allow_anonymous AS allowAnonymous,
        allow_delegation AS allowDelegation,
        positions
      FROM elections 
      ORDER BY created_at DESC
    `);

    // Parse positions
    rows.forEach(row => {
      if (row.positions) {
        try {
          row.positions = typeof row.positions === 'string' ? JSON.parse(row.positions) : row.positions;
        } catch {
          row.positions = [];
        }
      } else {
        row.positions = [];
      }
    });

    res.json(rows);
  } catch (error) {
    console.error('Get all elections error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// In keyService.js, add this after other routes
app.post('/api/elections/sync-chain', async (req, res) => {
  try {
    const { electionId, chainId, onChainElectionId, txHash } = req.body;

    if (!electionId || !chainId || !onChainElectionId || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await dbPool.query(
      `INSERT INTO election_chains 
       (election_id, chain_id, on_chain_election_id, tx_hash)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE on_chain_election_id = VALUES(on_chain_election_id), tx_hash = VALUES(tx_hash)`,
      [electionId, chainId, onChainElectionId, txHash]
    );

    res.json({ success: true, message: 'Chain synced successfully' });
  } catch (error) {
    console.error('Sync chain error:', error);
    res.status(500).json({ error: 'Failed to sync chain' });
  }
});