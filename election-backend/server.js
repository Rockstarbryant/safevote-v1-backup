// election-backend/server.js
// SafeVote Results Backend - PostgreSQL (Supabase)
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

let dbPool;

async function connectDB() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  try {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Test connection
    await dbPool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');

    // Initialize tables
    await initializeTables();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

async function initializeTables() {
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS elections (
        uuid VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        creator VARCHAR(255),
        start_time BIGINT,
        end_time BIGINT,
        total_voters INTEGER,
        is_public BOOLEAN DEFAULT true,
        allow_anonymous BOOLEAN DEFAULT false,
        allow_delegation BOOLEAN DEFAULT false,
        merkle_root VARCHAR(255),
        positions JSONB,
        voter_addresses JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS votes (
        vote_id SERIAL PRIMARY KEY,
        election_uuid VARCHAR(255) NOT NULL,
        voter_address VARCHAR(255) NOT NULL,
        position_id INTEGER,
        candidate_name VARCHAR(255),
        chain_id INTEGER,
        tx_hash VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (election_uuid) REFERENCES elections(uuid)
      );

      CREATE TABLE IF NOT EXISTS election_chains (
        id SERIAL PRIMARY KEY,
        election_id VARCHAR(255) NOT NULL,
        chain_id INTEGER NOT NULL,
        on_chain_election_id INTEGER,
        tx_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(election_id, chain_id)
      );
    `);
    console.log('✅ Tables initialized');
  } catch (err) {
    console.error('⚠️ Table initialization warning:', err.message);
  }
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'SafeVote Results Backend',
    database: 'PostgreSQL connected',
  });
});

// ============================================
// GET ALL ELECTIONS (Returns UUIDs)
// ============================================
app.get('/api/elections', async (req, res) => {
  try {
    const { rows } = await dbPool.query(`
      SELECT 
        uuid,
        title,
        description,
        location,
        start_time AS "startTime",
        end_time AS "endTime",
        total_voters AS "totalVoters",
        is_public AS "isPublic",
        allow_anonymous AS "allowAnonymous",
        allow_delegation AS "allowDelegation",
        merkle_root AS "merkleRoot",
        created_at AS "createdAt",
        positions
      FROM elections 
      ORDER BY created_at DESC
    `);

    console.log(`✅ Fetched ${rows.length} elections from database`);

    const elections = rows.map((row) => ({
      uuid: row.uuid,
      title: row.title || 'Untitled Election',
      description: row.description || '',
      location: row.location || 'Global',
      startTime: row.startTime,
      endTime: row.endTime,
      totalVoters: row.totalVoters || 0,
      isPublic: row.isPublic,
      allowAnonymous: row.allowAnonymous,
      allowDelegation: row.allowDelegation,
      merkleRoot: row.merkleRoot,
      createdAt: row.createdAt,
      positions: row.positions || [],
      totalVotesCast: 0,
      participationRate: 0,
    }));

    res.json(elections);
  } catch (err) {
    console.error('❌ Error fetching elections:', err.message);
    res.status(500).json({ error: 'Failed to fetch elections', details: err.message });
  }
});

// ============================================
// GET SINGLE ELECTION BY UUID
// ============================================
app.get('/api/elections/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { rows } = await dbPool.query(
      `
      SELECT * FROM elections WHERE uuid = $1
    `,
      [uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    const row = rows[0];
    res.json({
      uuid: row.uuid,
      title: row.title,
      description: row.description,
      location: row.location,
      creator: row.creator,
      startTime: row.start_time,
      endTime: row.end_time,
      totalVoters: row.total_voters,
      isPublic: row.is_public,
      allowAnonymous: row.allow_anonymous,
      allowDelegation: row.allow_delegation,
      merkleRoot: row.merkle_root,
      positions: row.positions,
      voterAddresses: row.voter_addresses,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error('❌ Error fetching election:', err.message);
    res.status(500).json({ error: 'Failed to fetch election', details: err.message });
  }
});

// ============================================
// GET ON-CHAIN ELECTION ID
// FIX: Uses election_chains table (correct table with actual data)
// ============================================
app.get('/api/elections/:electionId/onchain-id', async (req, res) => {
  const { electionId } = req.params;

  try {
    console.log(`🔍 Fetching on-chain ID for election: ${electionId}`);

    // Query election_chains table (correct table with actual data)
    const { rows } = await dbPool.query(
      `SELECT on_chain_election_id, chain_id 
       FROM election_chains 
       WHERE election_id = $1 
       LIMIT 1`,
      [electionId]
    );

    if (rows.length === 0) {
      console.warn(`⚠️ No on-chain deployment found for election: ${electionId}`);
      return res.status(404).json({
        error: 'On-chain election ID not found. Election may not be deployed on-chain yet.',
        electionId,
      });
    }

    const onChainElectionId = rows[0].on_chain_election_id;
    const chainId = rows[0].chain_id;

    console.log(`✅ Found on-chain ID: ${onChainElectionId} on chain ${chainId}`);

    res.json({
      success: true,
      electionId,
      onChainElectionId: parseInt(onChainElectionId),
      chainId,
    });
  } catch (err) {
    console.error('❌ On-chain ID fetch error:', err.message);
    res.status(500).json({
      error: 'Failed to fetch on-chain ID',
      details: err.message,
    });
  }
});

// ============================================
// CREATE ELECTION (accepts electionId as UUID)
// ============================================
app.post('/api/elections/create', async (req, res) => {
  try {
    const {
      electionId,
      title,
      description,
      location,
      creator,
      startTime,
      endTime,
      totalVoters,
      isPublic,
      allowAnonymous,
      allowDelegation,
      merkleRoot,
      positions,
      voterAddresses,
    } = req.body;

    // Validate required fields
    if (!electionId || !title || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Missing required fields: electionId (UUID), title, startTime, endTime',
      });
    }

    console.log(`📝 Creating election with UUID: ${electionId}`);

    const { rows } = await dbPool.query(
      `
      INSERT INTO elections (
        uuid, title, description, location, creator,
        start_time, end_time, total_voters, is_public,
        allow_anonymous, allow_delegation, merkle_root, positions, voter_addresses
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (uuid) DO UPDATE
      SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        location = EXCLUDED.location,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        total_voters = EXCLUDED.total_voters,
        merkle_root = EXCLUDED.merkle_root,
        positions = EXCLUDED.positions,
        voter_addresses = EXCLUDED.voter_addresses,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
      [
        electionId,
        title,
        description || '',
        location || '',
        creator || '',
        startTime,
        endTime,
        totalVoters || 0,
        isPublic !== false,
        allowAnonymous || false,
        allowDelegation || false,
        merkleRoot || '',
        JSON.stringify(positions || []),
        JSON.stringify(voterAddresses || []),
      ]
    );

    console.log(`✅ Election created/updated with UUID: ${electionId}`);

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      election: {
        uuid: rows[0].uuid,
        title: rows[0].title,
        createdAt: rows[0].created_at,
      },
    });
  } catch (err) {
    console.error('❌ Error creating election:', err.message);
    res.status(500).json({ error: 'Failed to create election', details: err.message });
  }
});

// ============================================
// RECORD VOTE (after blockchain confirmation)
// Called by: votingService.js (frontend)
// ============================================
app.post('/api/votes/record', async (req, res) => {
  try {
    const { electionId, voterAddress, chainId, txHash, blockNumber, onChainElectionId } = req.body;

    if (!electionId || !voterAddress || !chainId || !txHash) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['electionId', 'voterAddress', 'chainId', 'txHash'],
      });
    }

    const normalizedAddress = voterAddress.toLowerCase();

    console.log(`📝 Recording vote: ${normalizedAddress} in election ${electionId}`);

    // Insert vote record
    await dbPool.query(
      `INSERT INTO votes (election_uuid, voter_address, chain_id, tx_hash, timestamp)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (election_uuid, voter_address, chain_id) 
       DO UPDATE SET 
         tx_hash = EXCLUDED.tx_hash,
         timestamp = CURRENT_TIMESTAMP`,
      [electionId, normalizedAddress, chainId, txHash]
    );

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

// Add these routes to your server.js or create a separate routes file

// ============================================================
// VOTER KEYS API
// ============================================================

app.get('/api/voter-keys', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('voter_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching voter keys:', err);
    res.status(500).json({ error: 'Failed to fetch voter keys' });
  }
});

// Get voter keys for specific election
app.get('/api/voter-keys/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;

    const { data, error } = await supabase
      .from('voter_keys')
      .select('*')
      .eq('election_id', electionId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching voter keys:', err);
    res.status(500).json({ error: 'Failed to fetch voter keys' });
  }
});

// ============================================================
// VOTES API
// ============================================================

app.get('/api/votes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching votes:', err);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// Get votes for specific election
app.get('/api/votes/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('election_uuid', electionId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching votes:', err);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// Get votes by voter address
app.get('/api/votes/voter/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('voter_address', address)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching voter votes:', err);
    res.status(500).json({ error: 'Failed to fetch voter votes' });
  }
});

// ============================================================
// USER PROFILE API
// ============================================================

// Get user profile by wallet address
app.get('/api/profile/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Get elections created by this user
    const { data: elections, error: electionsError } = await supabase
      .from('elections')
      .select('*')
      .eq('creator', address);

    if (electionsError) throw electionsError;

    // Get votes cast by this user
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .eq('voter_address', address);

    if (votesError) throw votesError;

    // Calculate stats
    const now = Math.floor(Date.now() / 1000);
    const stats = {
      electionsCreated: elections?.length || 0,
      activeElections: elections?.filter(e => e.start_time <= now && e.end_time >= now).length || 0,
      completedElections: elections?.filter(e => e.end_time < now).length || 0,
      totalVoters: elections?.reduce((sum, e) => sum + (e.total_voters || 0), 0) || 0,
      votesCast: votes?.length || 0
    };

    res.json({
      address,
      stats,
      elections: elections || [],
      votes: votes || []
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// ============================================================
// DASHBOARD STATS API
// ============================================================

app.get('/api/stats/dashboard', async (req, res) => {
  try {
    // Get all elections
    const { data: elections, error: electionsError } = await supabase
      .from('elections')
      .select('*');

    if (electionsError) throw electionsError;

    // Get all votes
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('*');

    if (votesError) throw votesError;

    // Get all voter keys
    const { data: voterKeys, error: keysError } = await supabase
      .from('voter_keys')
      .select('*');

    if (keysError) throw keysError;

    const now = Math.floor(Date.now() / 1000);

    const stats = {
      totalElections: elections?.length || 0,
      activeElections: elections?.filter(e => e.start_time <= now && e.end_time >= now).length || 0,
      completedElections: elections?.filter(e => e.end_time < now).length || 0,
      upcomingElections: elections?.filter(e => e.start_time > now).length || 0,
      totalVoters: voterKeys?.length || 0,
      totalVotes: votes?.length || 0,
      activeVoters: new Set(votes?.map(v => v.voter_address)).size || 0
    };

    res.json(stats);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});


// ============================================
// SYNC CHAIN DEPLOYMENT
// Uses election_chains table (correct table with actual data)
// ============================================
app.post('/api/elections/sync-chain', async (req, res) => {
  try {
    const { electionId, chainId, onChainElectionId, txHash } = req.body;

    if (!electionId || !chainId || onChainElectionId === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: electionId (UUID), chainId, onChainElectionId',
      });
    }

    console.log(
      `⛓️ Syncing chain deployment: ${electionId} -> onChainId ${onChainElectionId} on chain ${chainId}`
    );

    await dbPool.query(
      `
      INSERT INTO election_chains (election_id, chain_id, on_chain_election_id, tx_hash)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (election_id, chain_id) DO UPDATE
      SET on_chain_election_id = EXCLUDED.on_chain_election_id,
          tx_hash = EXCLUDED.tx_hash
    `,
      [electionId, chainId, onChainElectionId, txHash || '']
    );

    console.log(
      `✅ Chain deployment synced: ${electionId} on chain ${chainId} with on-chain ID ${onChainElectionId}`
    );

    res.json({
      success: true,
      message: 'Chain deployment synced',
      electionId,
      onChainElectionId,
      chainId,
    });
  } catch (err) {
    console.error('❌ Error syncing chain:', err.message);
    res.status(500).json({ error: 'Failed to sync chain', details: err.message });
  }
});

// ============================================
// START SERVER
// ============================================
connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SafeVote Backend running on port ${PORT}`);
      console.log(`📊 API: http://localhost:${PORT}`);
      console.log(`✅ Ready to serve elections and on-chain deployments`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });