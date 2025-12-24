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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
// Input: { electionId, numVoters, voterAddresses[] }
// Output: { merkleRoot, totalKeys, success }
// ============================================
app.post('/api/elections/keys/generate', async (req, res) => {
  console.log('\n📨 POST /api/elections/keys/generate');

  if (!keyGen) {
    console.error('❌ Database not initialized');
    return res.status(503).json({
      success: false,
      error: 'Database not available',
      status: 'service unavailable',
    });
  }

  try {
    const { electionId, numVoters, voterAddresses } = req.body;

    console.log(`📋 Request payload:`);
    console.log(`   - electionId: ${electionId}`);
    console.log(`   - numVoters: ${numVoters}`);
    console.log(`   - voterAddresses: ${voterAddresses?.length || 0} addresses`);

    // Validate input
    if (!electionId || typeof electionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid electionId (must be UUID string)',
        required: ['electionId', 'numVoters', 'voterAddresses'],
      });
    }

    if (!numVoters || typeof numVoters !== 'number' || numVoters <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid numVoters (must be a positive number)',
        provided: numVoters,
      });
    }

    if (!Array.isArray(voterAddresses) || voterAddresses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'voterAddresses must be a non-empty array',
        provided: Array.isArray(voterAddresses) ? `${voterAddresses.length} items` : typeof voterAddresses,
      });
    }

    if (voterAddresses.length !== numVoters) {
      return res.status(400).json({
        success: false,
        error: 'Voter address count mismatch',
        expected: numVoters,
        received: voterAddresses.length,
      });
    }

    console.log(`🔐 Starting key generation for election ${electionId}`);

    // Generate keys and merkle root
    const result = await keyGen.generateVoterKeys(electionId, numVoters, voterAddresses);

    console.log(`\n✅ Key generation response:`);
    console.log(`   - merkleRoot: ${result.merkleRoot.substring(0, 10)}...`);
    console.log(`   - totalKeys: ${result.totalKeys}`);
    console.log(`   - votersProcessed: ${result.votersProcessed}\n`);

    res.status(200).json({
      success: true,
      electionId,
      merkleRoot: result.merkleRoot,
      totalKeys: result.totalKeys,
      votersProcessed: result.votersProcessed,
      message: 'Voter keys generated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('\n❌ Key generation error:', error.message);

    if (error.message.includes('already generated')) {
      return res.status(409).json({
        success: false,
        error: error.message,
        status: 'conflict',
      });
    }

    if (error.message.includes('Address count mismatch')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        status: 'validation_error',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate keys',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// GET VOTER KEY + MERKLE PROOF (FOR VOTING)
// Called by: voting-ui.js (frontend during voting)
// Input: electionId, address
// Output: { voterKey, merkleProof, merkleRoot, eligible }
// ============================================
app.get('/api/elections/:electionId/keys/:address', async (req, res) => {
  console.log(`\n🔍 GET /api/elections/${req.params.electionId}/keys/${req.params.address}`);

  if (!keyGen) {
    console.error('❌ Database not initialized');
    return res.status(503).json({
      success: false,
      error: 'Database not available',
    });
  }

  try {
    const { electionId, address } = req.params;
    const normalized = address.toLowerCase();

    console.log(`📍 Voter: ${normalized.substring(0, 10)}...`);
    console.log(`📋 Election: ${electionId}`);

    // Check if voter already voted on another chain
    const hasVoted = await keyGen.hasVotedAnyChain(electionId, normalized);
    if (hasVoted) {
      console.log(`⚠️  Double voting detected`);
      return res.status(403).json({
        success: false,
        error: 'Voter has already voted on another chain',
        voterAddress: normalized,
        status: 'already_voted',
      });
    }

    // Get voter data and generate merkle proof
    const voterData = await keyGen.getVoterData(electionId, normalized);

    if (!voterData) {
      console.log(`❌ Voter not found or not eligible`);
      return res.status(404).json({
        success: false,
        error: 'Voter not eligible or not found in this election',
        voterAddress: normalized,
        electionId,
      });
    }

    console.log(`✅ Voter data retrieved successfully`);

    res.json({
      success: true,
      electionId,
      voterAddress: normalized,
      voterKey: voterData.voterKey,
      merkleProof: voterData.merkleProof,
      merkleRoot: voterData.merkleRoot,
      eligible: voterData.eligible,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`❌ Error getting voter key: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voter proof',
      message: error.message,
    });
  }
});

// ============================================
// GET VOTER KEY ONLY (FOR VERIFICATION PAGE)
// Called by: VoterVerificationPage.jsx (key lookup)
// Input: electionId, address
// Output: { voterKey, keyHash, merkleProof }
// ============================================
app.get('/api/elections/:electionId/voter/:address/key', async (req, res) => {
  console.log(`\n🔓 GET /api/elections/${req.params.electionId}/voter/${req.params.address}/key`);

  const { electionId, address } = req.params;
  const normalized = address.toLowerCase();

  try {
    console.log(`📍 Looking up key for: ${normalized.substring(0, 10)}...`);

    const { rows } = await dbPool.query(
      `SELECT voter_key, key_hash, proof FROM voter_keys 
       WHERE election_id = $1 AND voter_address = $2 
       LIMIT 1`,
      [electionId, normalized]
    );

    if (rows.length === 0) {
      console.log(`❌ Voter not registered`);
      return res.status(404).json({
        success: false,
        error: 'Voter not registered for this election'
      });
    }

    const voterKey = rows[0].voter_key;
    const keyHash = rows[0].key_hash;
    const merkleProof = JSON.parse(rows[0].proof);

    console.log(`✅ Key found: ${voterKey.substring(0, 10)}...`);

    res.json({
      success: true,
      voterKey,
      keyHash,
      merkleProof
    });

  } catch (err) {
    console.error(`❌ Voter key fetch error: ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
});

// ============================================
// CREATE/UPDATE ELECTION
// Called by: electionconductor.js (frontend)
// Input: { electionId, title, description, location, ... }
// Output: { success, electionId }
// ============================================
app.post('/api/elections/create', async (req, res) => {
  console.log('\n📝 POST /api/elections/create');

  if (!dbPool) {
    console.error('❌ Database not initialized');
    return res.status(503).json({
      success: false,
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

    console.log(`📋 Election Details:`);
    console.log(`   - electionId: ${electionId}`);
    console.log(`   - title: ${title}`);
    console.log(`   - totalVoters: ${totalVoters}`);
    console.log(`   - positions: ${positions.length}`);

    // Validate required fields
    if (!electionId || typeof electionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing electionId (UUID)',
      });
    }

    console.log(`💾 Inserting/updating election in database...`);

    // Insert or update election
    const result = await dbPool.query(
      `INSERT INTO elections (
        uuid, title, description, location, creator,
        start_time, end_time, total_voters,
        is_public, allow_anonymous, allow_delegation,
        positions, voter_addresses, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (uuid) 
      DO UPDATE SET
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
        updated_at = CURRENT_TIMESTAMP
      RETURNING uuid`,
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
      message: 'Election created/updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`❌ Create election error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to create election',
      message: error.message,
    });
  }
});

// ============================================
// SYNC CHAIN DEPLOYMENT
// Called by: electionconductor.js (after contract deployment)
// Input: { electionId, chainId, onChainElectionId, txHash }
// ============================================
app.post('/api/elections/sync-deployment', async (req, res) => {
  console.log('\n🔗 POST /api/elections/sync-deployment');

  const { electionId, chainId, onChainElectionId, txHash } = req.body;

  console.log(`📍 Election: ${electionId}`);
  console.log(`⛓️  Chain: ${chainId}`);
  console.log(`📍 On-Chain ID: ${onChainElectionId}`);

  if (!electionId || !chainId || !onChainElectionId || !txHash) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: electionId, chainId, onChainElectionId, txHash'
    });
  }

  try {
    const result = await dbPool.query(
      `INSERT INTO election_chains (election_id, chain_id, on_chain_election_id, tx_hash, deployed_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (election_id, chain_id) 
       DO UPDATE
       SET on_chain_election_id = EXCLUDED.on_chain_election_id,
           tx_hash = EXCLUDED.tx_hash,
           deployed_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [electionId, chainId, onChainElectionId, txHash]
    );

    console.log(`✅ Deployment synced to database`);
    res.json({ 
      success: true,
      message: 'Deployment synced successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error(`❌ Sync deployment error: ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to sync deployment',
      message: err.message
    });
  }
});

// ============================================
// RECORD VOTE
// Called by: voting-ui.js (after successful vote transaction)
// Input: { electionId, voterAddress, chainId, txHash }
// ============================================
app.post('/api/elections/:electionId/record-vote', async (req, res) => {
  console.log(`\n📨 POST /api/elections/${req.params.electionId}/record-vote`);

  const { electionId } = req.params;
  const { voterAddress, chainId, txHash } = req.body;

  const normalized = voterAddress.toLowerCase();

  console.log(`📍 Voter: ${normalized.substring(0, 10)}...`);
  console.log(`⛓️  Chain: ${chainId}`);
  console.log(`🔗 TX: ${txHash}`);

  try {
    if (!keyGen) {
      throw new Error('Database not initialized');
    }

    await keyGen.recordVote(electionId, normalized, chainId, txHash);

    console.log(`✅ Vote recorded successfully`);

    res.json({
      success: true,
      message: 'Vote recorded',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`❌ Record vote error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to record vote',
      message: error.message,
    });
  }
});

// ============================================
// MARK KEY AS DISTRIBUTED
// Called by: voting-ui.js (after voter receives key)
// ============================================
app.post('/api/elections/:electionId/keys/:address/mark-distributed', async (req, res) => {
  console.log(`\n✉️  POST /api/elections/${req.params.electionId}/keys/${req.params.address}/mark-distributed`);

  if (!keyGen) {
    return res.status(503).json({
      success: false,
      error: 'Database not available',
    });
  }

  try {
    const { electionId, address } = req.params;

    await keyGen.markKeyDistributed(electionId, address);

    res.json({
      success: true,
      message: 'Voter key marked as distributed',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`❌ Mark distributed error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to mark key as distributed',
      message: error.message,
    });
  }
});

// ============================================
// GET ALL VOTER KEYS (ADMIN EXPORT)
// Called by: Admin dashboard
// ============================================
app.get('/api/elections/:electionId/keys/export', async (req, res) => {
  console.log(`\n📥 GET /api/elections/${req.params.electionId}/keys/export`);

  if (!keyGen) {
    return res.status(503).json({
      success: false,
      error: 'Database not available',
    });
  }

  try {
    const { electionId } = req.params;

    const result = await keyGen.getAllVoterKeys(electionId);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`❌ Export keys error: ${error.message}`);
    res.status(500).json({
      success: false,
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
      console.log('\n');
      console.log('🚀 ============================================');
      console.log('🔐 SafeVote Key Service v2.0.0 (PostgreSQL)');
      console.log(`🔌 Running on http://0.0.0.0:${PORT}`);
      console.log('🗄️  Database: PostgreSQL (Supabase)');
      console.log('✅ Ready for deployment!');
      console.log('============================================\n');
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });