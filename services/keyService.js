// services/keyService.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { VoterKeyGenerator } = require('./keyGenerator');

const app = express();
const PORT = process.env.PORT || process.env.KEY_SERVICE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
let dbPool = null;
let keyGen = null;

async function connectDB() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ No DATABASE_URL found — running in limited mode');
    return;
  }

  try {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test connection
    await dbPool.query('SELECT 1');
    console.log('✅ PostgreSQL database connected successfully');

    // Initialize key generator with DB
    keyGen = new VoterKeyGenerator(dbPool);

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('   Check your DATABASE_URL');
    dbPool = null;
    keyGen = null;
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SafeVote Key Service',
    version: '2.0.0 (PostgreSQL)',
    database: dbPool ? 'connected' : 'not connected',
    timestamp: new Date().toISOString()
  });
});

// Generate keys for an election
app.post('/api/elections/keys/generate', async (req, res) => {
  if (!keyGen) {
    return res.status(503).json({ error: 'Database not available' });
  }

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

// Get voter key + proof
app.get('/api/elections/:electionId/keys/:address', async (req, res) => {
  if (!keyGen) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const { electionId, address } = req.params;
    const normalizedAddress = address.toLowerCase();

    console.log(`🔍 Fetching key for ${normalizedAddress} in election ${electionId}`);

    // Check cross-chain double vote
    const hasVoted = await keyGen.hasVotedAnyChain(electionId, normalizedAddress);
    if (hasVoted) {
      return res.status(403).json({ 
        error: 'Voter has already voted on another chain',
        voterAddress: normalizedAddress
      });
    }

    const voterData = await keyGen.getVoterData(electionId, normalizedAddress);
    if (!voterData) {
      return res.status(404).json({ 
        error: 'Voter not eligible or not found in this election' 
      });
    }

    // Mark as distributed
    await dbPool.query(
      `UPDATE voter_keys 
       SET distributed = TRUE, distributed_at = NOW() 
       WHERE election_id = $1 AND voter_address = $2`,
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
    res.status(500).json({ error: 'Failed to retrieve voter key' });
  }
});

// Record successful vote
app.post('/api/votes/record', async (req, res) => {
  if (!dbPool) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const { electionId, voterAddress, chainId, voterKey, txHash, blockNumber } = req.body;

    if (!electionId || !voterAddress || !chainId || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedAddress = voterAddress.toLowerCase();

    await dbPool.query(
      `INSERT INTO votes 
       (election_id, voter_address, chain_id, voter_key, tx_hash, block_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (election_id, voter_address, chain_id) DO UPDATE SET
         tx_hash = EXCLUDED.tx_hash,
         block_number = EXCLUDED.block_number`,
      [electionId, normalizedAddress, chainId, voterKey || null, txHash, blockNumber]
    );

    console.log(`✅ Vote recorded: ${normalizedAddress} on chain ${chainId}`);
    res.json({ success: true });

  } catch (error) {
    console.error('Record vote error:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Create/Update election metadata
app.post('/api/elections/create', async (req, res) => {
  if (!dbPool) {
    return res.status(503).json({ error: 'Database not available' });
  }

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

    if (!electionId || !creator) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const positionsJson = JSON.stringify(positions);

    await dbPool.query(
      `INSERT INTO elections (
        election_id, title, description, location, creator,
        start_time, end_time, total_voters,
        is_public, allow_anonymous, allow_delegation,
        positions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (election_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        location = EXCLUDED.location,
        creator = EXCLUDED.creator,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        total_voters = EXCLUDED.total_voters,
        is_public = EXCLUDED.is_public,
        allow_anonymous = EXCLUDED.allow_anonymous,
        allow_delegation = EXCLUDED.allow_delegation,
        positions = EXCLUDED.positions`,
      [
        electionId, title, description, location, creator.toLowerCase(),
        startTime, endTime, totalVoters,
        isPublic, allowAnonymous, allowDelegation,
        positionsJson
      ]
    );

    console.log(`Election saved: ${electionId} - ${title}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Create election error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync chain deployment
app.post('/api/elections/sync-chain', async (req, res) => {
  if (!dbPool) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const { electionId, chainId, onChainElectionId, txHash } = req.body;

    if (!electionId || !chainId || !onChainElectionId || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await dbPool.query(
      `INSERT INTO election_chains 
       (election_id, chain_id, on_chain_election_id, tx_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (election_id, chain_id) DO UPDATE SET
         on_chain_election_id = EXCLUDED.on_chain_election_id,
         tx_hash = EXCLUDED.tx_hash`,
      [electionId, chainId, onChainElectionId, txHash]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Sync chain error:', error);
    res.status(500).json({ error: 'Failed to sync chain' });
  }
});

// Get election by UUID
app.get('/api/elections/uuid/:uuid', async (req, res) => {
  if (!dbPool) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const { uuid } = req.params;

    const { rows } = await dbPool.query(
      `SELECT 
        election_id AS id,
        title, description, location, creator,
        merkle_root AS voterMerkleRoot,
        start_time AS startTime, end_time AS endTime,
        total_voters AS totalVoters,
        is_public AS isPublic,
        allow_anonymous AS allowAnonymous,
        allow_delegation AS allowDelegation,
        positions
       FROM elections WHERE election_id = $1`,
      [uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    const election = rows[0];
    election.positions = election.positions ? JSON.parse(election.positions) : [];

    res.json(election);
  } catch (error) {
    console.error('Get election error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ============================================');
    console.log('🔑 SafeVote Key Service v2.0.0 (PostgreSQL)');
    console.log(`📡 Running on http://0.0.0.0:${PORT}`);
    console.log('🗄️  Database: PostgreSQL');
    console.log('✅ Ready for production deployment!');
    console.log('============================================');
    console.log('');
  });
});