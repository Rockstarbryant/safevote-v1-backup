// election-backend/server.js
// SafeVote Results Backend - PostgreSQL (Supabase Ready)

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
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await dbPool.query('SELECT 1');
    console.log('✅ PostgreSQL connected successfully (Supabase)');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'SafeVote Results Backend',
    database: 'PostgreSQL connected'
  });
});

// Get all elections with basic stats
app.get('/api/elections', async (req, res) => {
  try {
    const { rows } = await dbPool.query(`
      SELECT 
        election_id AS id,
        title,
        description,
        location,
        start_time AS "startTime",
        end_time AS "endTime",
        total_voters AS "totalVoters",
        created_at AS "createdAt",
        positions
      FROM elections 
      ORDER BY created_at DESC
    `);

    // Add vote counts per chain
    const elections = await Promise.all(rows.map(async (election) => {
      const { rows: chainVotes } = await dbPool.query(`
        SELECT chain_id, COUNT(*) as "votesCast" 
        FROM votes 
        WHERE election_id = $1 
        GROUP BY chain_id
      `, [election.id]);

      const totalVotes = chainVotes.reduce((sum, c) => sum + parseInt(c.votesCast), 0);
      const participation = election.totalVoters > 0 
        ? ((totalVotes / election.totalVoters) * 100).toFixed(1) 
        : 0;

      return {
        id: election.id,
        title: election.title || 'Untitled Election',
        description: election.description || '',
        location: election.location || 'Global',
        startTime: election.startTime,
        endTime: election.endTime,
        totalVoters: election.totalVoters,
        createdAt: election.createdAt,
        totalVotesCast: totalVotes,
        participationRate: parseFloat(participation),
        positions: election.positions || [],
        votesByChain: chainVotes.map(c => ({
          chainId: c.chain_id,
          name: getChainName(c.chain_id),
          votes: parseInt(c.votesCast)
        }))
      };
    }));

    res.json(elections);
  } catch (err) {
    console.error('Error fetching elections:', err.message);
    res.status(500).json({ error: 'Failed to load elections' });
  }
});

// Get detailed results for one election
app.get('/api/elections/:uuid/results', async (req, res) => {
  const { uuid } = req.params;

  try {
    const { rows: electionRows } = await dbPool.query(`
      SELECT title, description, start_time, end_time, total_voters, positions
      FROM elections WHERE election_id = $1
    `, [uuid]);

    if (electionRows.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    const election = electionRows[0];
    const positions = election.positions || [];

    const { rows: chainVotes } = await dbPool.query(`
      SELECT chain_id, COUNT(*) as count 
      FROM votes 
      WHERE election_id = $1 
      GROUP BY chain_id
    `, [uuid]);

    const totalVotes = chainVotes.reduce((sum, c) => sum + parseInt(c.count), 0);
    const participation = election.total_voters > 0 
      ? ((totalVotes / election.total_voters) * 100).toFixed(2) 
      : 0;

    const results = {
      uuid,
      title: election.title,
      description: election.description,
      startTime: election.start_time,
      endTime: election.end_time,
      totalRegistered: election.total_voters,
      totalVotesCast: totalVotes,
      participationRate: parseFloat(participation),
      status: election.end_time < Math.floor(Date.now() / 1000) ? 'Completed' : 'Active',
      positions: positions.map(p => ({
        title: p.title,
        candidates: p.candidates || [],
        maxSelections: p.maxSelections || 1
      })),
      votesByChain: chainVotes.map(c => ({
        chainId: c.chain_id,
        chainName: getChainName(c.chain_id),
        votesCast: parseInt(c.count),
        percentage: totalVotes > 0 ? ((c.count / totalVotes) * 100).toFixed(1) : 0
      }))
    };

    res.json(results);
  } catch (err) {
    console.error('Results error:', err.message);
    res.status(500).json({ error: 'Failed to load results' });
  }
});

// Helper: Chain names
function getChainName(chainId) {
  const names = {
    421614: 'Arbitrum Sepolia',
    11155111: 'Ethereum Sepolia',
    84532: 'Base Sepolia',
    97: 'BNB Testnet',
    80001: 'Polygon Mumbai'
  };
  return names[chainId] || `Chain ${chainId}`;
}

// Start server
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n═══════════════════════════════════════');
    console.log('🚀 SAFEVOTE RESULTS BACKEND LIVE');
    console.log('═══════════════════════════════════════');
    console.log(`🌐 http://0.0.0.0:${PORT}`);
    console.log(`📊 /api/elections - List all elections`);
    console.log(`📈 /api/elections/{uuid}/results - Detailed results`);
    console.log('🗄️  Database: PostgreSQL (Supabase)');
    console.log('═══════════════════════════════════════\n');
  });
});