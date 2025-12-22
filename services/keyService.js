// services/keyService.js - PostgreSQL Compatible
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { VoterKeyGenerator } = require('./keyGenerator');

const app = express();
const PORT = process.env.PORT || process.env.KEY_SERVICE_PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// PostgreSQL connection pool
let dbPool = null;
let keyGen = null;

// ============================================
// DATABASE CONNECTION
// ============================================
async function connectDB() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env file');
    process.exit(1);
  }

  try {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Test connection
    await dbPool.query('SELECT 1');
    console.log('✅ PostgreSQL connected successfully');

    // Initialize key generator with DB pool
    keyGen = new VoterKeyGenerator(dbPool);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('   Check your DATABASE_URL in .env');
    process.exit(1);
  }
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SafeVote Key Service',
    version: '2.0.0 (PostgreSQL)',
    database: dbPool ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// GENERATE VOTER KEYS
// Called by: electionconductor.js (frontend)
// ============================================
app.post('/api/elections/keys/generate', async (req, res) => {
  if (!keyGen) {
    return res.status(503).json({
      error: 'Database not available',
      status: 'service unavailable',
    });
  }

  try {
    const { electionId, numVoters, voterAddresses } = req.body;

    // Validate input
    if (!electionId) {
      return res.status(400).json({
        error: 'Missing electionId (UUID)',
        required: ['electionId', 'numVoters', 'voterAddresses'],
      });
    }

    if (!numVoters || typeof numVoters !== 'number') {
      return res.status(400).json({
        error: 'Invalid numVoters (must be a number)',
      });
    }

    if (!Array.isArray(voterAddresses) || voterAddresses.length === 0) {
      return res.status(400).json({
        error: 'voterAddresses must be a non-empty array',
      });
    }

    if (voterAddresses.length !== numVoters) {
      return res.status(400).json({
        error: 'Voter address count mismatch',
        expected: numVoters,
        received: voterAddresses.length,
      });
    }

    console.log(`🔑 Generating ${numVoters} keys for election ${electionId}`);

    // Generate keys and merkle root
    const result = await keyGen.generateVoterKeys(electionId, numVoters, voterAddresses);

    res.status(200).json({
      success: true,
      electionId,
      merkleRoot: result.merkleRoot,
      totalKeys: result.totalKeys,
      message: 'Keys generated successfully',
    });
  } catch (error) {
    console.error('❌ Key generation error:', error.message);

    if (error.message.includes('already generated')) {
      return res.status(409).json({
        error: error.message,
        status: 'conflict',
      });
    }

    res.status(500).json({
      error: 'Failed to generate keys',
      message: error.message,
    });
  }
});

// ============================================
// GET VOTER KEY + MERKLE PROOF
// Called by: voting-ui.js (frontend)
// ============================================
app.get('/api/elections/:electionId/keys/:address', async (req, res) => {
  if (!keyGen) {
    return res.status(503).json({
      error: 'Database not available',
    });
  }

  try {
    const { electionId, address } = req.params;
    const normalizedAddress = address.toLowerCase();

    console.log(`🔍 Fetching proof for ${normalizedAddress} in election ${electionId}`);

    // Check if voter already voted on another chain
    const hasVoted = await keyGen.hasVotedAnyChain(electionId, normalizedAddress);
    if (hasVoted) {
      return res.status(403).json({
        error: 'Voter has already voted on another chain',
        voterAddress: normalizedAddress,
        status: 'already_voted',
      });
    }

    // Get voter data and merkle proof
    const voterData = await keyGen.getVoterData(electionId, normalizedAddress);

    if (!voterData) {
      return res.status(404).json({
        error: 'Voter not eligible or not found in this election',
        voterAddress: normalizedAddress,
      });
    }

    console.log(`✅ Proof generated for ${normalizedAddress}`);

    res.json({
      success: true,
      electionId,
      voterAddress: normalizedAddress,
      merkleProof: voterData.merkleProof,
      merkleRoot: voterData.merkleRoot,
      eligible: voterData.eligible,
    });
  } catch (error) {
    console.error('❌ Error getting voter key:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve voter proof',
      message: error.message,
    });
  }
});

// ============================================
// RECORD VOTE (after blockchain confirmation)
// Called by: voting-ui.js (frontend)
// ============================================
app.post('/api/votes/record', async (req, res) => {
  if (!dbPool) {
    return res.status(503).json({
      error: 'Database not available',
    });
  }

  try {
    const { electionId, voterAddress, chainId, txHash } = req.body;

    if (!electionId || !voterAddress || !chainId || !txHash) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['electionId', 'voterAddress', 'chainId', 'txHash'],
      });
    }

    const normalizedAddress = voterAddress.toLowerCase();

    // Record vote in database
    await keyGen.recordVote(electionId, normalizedAddress, chainId, txHash);

    console.log(`✅ Vote recorded for ${normalizedAddress} on chain ${chainId}`);

    res.json({
      success: true,
      electionId,
      voterAddress: normalizedAddress,
      chainId,
      txHash,
      message: 'Vote recorded successfully',
    });
  } catch (error) {
    console.error('❌ Record vote error:', error.message);
    res.status(500).json({
      error: 'Failed to record vote',
      message: error.message,
    });
  }
});

// ============================================
// CREATE/UPDATE ELECTION
// Called by: electionconductor.js (frontend)
// ============================================
app.post('/api/elections/create', async (req, res) => {
  if (!dbPool) {
    return res.status(503).json({
      error: 'Database not available',
    });
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
      positions = [],
      voterAddresses = [],
    } = req.body;

    // Validate required fields
    if (!electionId) {
      return res.status(400).json({
        error: 'Missing electionId (UUID)',
      });
    }

    console.log(`📝 Creating election: ${electionId}`);

    // Insert or update election
    await dbPool.query(
      `INSERT INTO elections (
                uuid, title, description, location, creator,
                start_time, end_time, total_voters,
                is_public, allow_anonymous, allow_delegation,
                positions, voter_addresses
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (uuid) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                location = EXCLUDED.location,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                total_voters = EXCLUDED.total_voters,
                is_public = EXCLUDED.is_public,
                allow_anonymous = EXCLUDED.allow_anonymous,
                allow_delegation = EXCLUDED.allow_delegation,
                positions = EXCLUDED.positions,
                voter_addresses = EXCLUDED.voter_addresses,
                updated_at = CURRENT_TIMESTAMP`,
      [
        electionId,
        title,
        description,
        location,
        creator ? creator.toLowerCase() : null,
        startTime,
        endTime,
        totalVoters || 0,
        isPublic,
        allowAnonymous,
        allowDelegation,
        JSON.stringify(positions),
        JSON.stringify(voterAddresses),
      ]
    );

    console.log(`✅ Election saved: ${electionId}`);

    res.json({
      success: true,
      electionId,
      message: 'Election created successfully',
    });
  } catch (error) {
    console.error('❌ Create election error:', error.message);
    res.status(500).json({
      error: 'Failed to create election',
      message: error.message,
    });
  }
});

// ============================================
// SYNC CHAIN DEPLOYMENT
// Called by: electionconductor.js (frontend)
// ============================================
app.post('/api/elections/sync-chain', async (req, res) => {
  if (!dbPool) {
    return res.status(503).json({
      error: 'Database not available',
    });
  }

  try {
    const { electionId, chainId, onChainElectionId, txHash } = req.body;

    if (!electionId || !chainId || !onChainElectionId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['electionId', 'chainId', 'onChainElectionId'],
      });
    }

    console.log(`⛓️  Syncing deployment: ${electionId} on chain ${chainId}`);

    // Insert or update chain deployment
    await dbPool.query(
      `INSERT INTO chain_deployments 
             (election_uuid, chain_id, on_chain_election_id, tx_hash)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (election_uuid, chain_id) DO UPDATE SET
               on_chain_election_id = EXCLUDED.on_chain_election_id,
               tx_hash = EXCLUDED.tx_hash,
               deployed_at = CURRENT_TIMESTAMP`,
      [electionId, chainId, onChainElectionId, txHash || '']
    );

    console.log(`✅ Chain deployment synced`);

    res.json({
      success: true,
      message: 'Chain deployment synced successfully',
    });
  } catch (error) {
    console.error('❌ Sync chain error:', error.message);
    res.status(500).json({
      error: 'Failed to sync chain deployment',
      message: error.message,
    });
  }
});

// ============================================
// MARK VOTER KEY AS DISTRIBUTED
// Called by: voting-ui.js (after voter receives key)
// ============================================
app.post('/api/elections/:electionId/keys/:address/mark-distributed', async (req, res) => {
  if (!keyGen) {
    return res.status(503).json({
      error: 'Database not available',
    });
  }

  try {
    const { electionId, address } = req.params;
    const normalizedAddress = address.toLowerCase();

    await keyGen.markKeyDistributed(electionId, normalizedAddress);

    res.json({
      success: true,
      message: 'Voter key marked as distributed',
    });
  } catch (error) {
    console.error('❌ Error marking distributed:', error.message);
    res.status(500).json({
      error: 'Failed to mark key as distributed',
      message: error.message,
    });
  }
});

// ============================================
// GET ALL VOTER KEYS FOR ELECTION (Admin only)
// Called by: Admin dashboard
// ============================================
app.get('/api/elections/:electionId/keys/export', async (req, res) => {
  if (!keyGen) {
    return res.status(503).json({
      error: 'Database not available',
    });
  }

  try {
    const { electionId } = req.params;

    const result = await keyGen.getAllVoterKeys(electionId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error exporting keys:', error.message);
    res.status(500).json({
      error: 'Failed to export voter keys',
      message: error.message,
    });
  }
});

// ============================================
// START SERVER
// ============================================
connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🚀 ============================================');
      console.log('🔑 SafeVote Key Service v2.0.0 (PostgreSQL)');
      console.log(`📡 Running on http://0.0.0.0:${PORT}`);
      console.log('🗄️  Database: PostgreSQL (Supabase)');
      console.log('✅ Ready for deployment!');
      console.log('============================================');
      console.log('');
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
