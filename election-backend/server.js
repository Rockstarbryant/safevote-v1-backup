// FILE: election-backend/server.js
// SafeVote Multi-Chain Results Backend (Database-Driven)

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Database connection
let db;
async function connectDB() {
  try {
    db = await mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'safevote_tracker',
      waitForConnections: true,
      connectionLimit: 10
    });
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

// Cache
const resultsCache = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

// Get all elections with basic stats
app.get('/api/elections', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        election_id AS uuid,
        title,
        description,
        start_time AS startTime,
        end_time AS endTime,
        total_voters AS totalVoters,
        created_at AS createdAt
      FROM elections 
      ORDER BY created_at DESC
    `);

    // Add vote counts per chain
    const elections = await Promise.all(rows.map(async (election) => {
      const [chainVotes] = await db.query(`
        SELECT chain_id, COUNT(*) as votesCast 
        FROM votes 
        WHERE election_id = ? 
        GROUP BY chain_id
      `, [election.uuid]);

      const totalVotes = chainVotes.reduce((sum, c) => sum + parseInt(c.votesCast), 0);
      const participation = election.totalVoters > 0 
        ? ((totalVotes / election.totalVoters) * 100).toFixed(1) 
        : 0;

      return {
        ...election,
        totalVotesCast: totalVotes,
        participationRate: parseFloat(participation),
        votesByChain: chainVotes.map(c => ({
          chainId: c.chain_id,
          name: getChainName(c.chain_id),
          votes: parseInt(c.votesCast)
        }))
      };
    }));

    res.json(elections);
  } catch (err) {
    console.error('Error fetching elections:', err);
    res.status(500).json({ error: 'Failed to load elections' });
  }
});

// Get detailed results for one election (multi-chain)
app.get('/api/elections/:uuid/results', async (req, res) => {
  const { uuid } = req.params;

  try {
    // Check cache
    if (resultsCache.has(uuid)) {
      return res.json(resultsCache.get(uuid));
    }

    const [electionRows] = await db.query(`
      SELECT title, description, start_time, end_time, total_voters, positions
      FROM elections WHERE election_id = ?
    `, [uuid]);

    if (electionRows.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    const election = electionRows[0];
    const positions = election.positions ? JSON.parse(election.positions) : [];

    // Get votes per chain
    const [chainVotes] = await db.query(`
      SELECT chain_id, COUNT(*) as count 
      FROM votes 
      WHERE election_id = ? 
      GROUP BY chain_id
    `, [uuid]);

    const totalVotes = chainVotes.reduce((sum, c) => sum + parseInt(c.count), 0);
    const participation = election.total_voters > 0 
      ? ((totalVotes / election.total_voters) * 100).toFixed(2) 
      : 0;

    // For now, since votes are anonymous, we show only totals per chain
    // In future, you can add on-chain tally sync if needed
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
        candidates: p.candidates,
        maxSelections: p.maxSelections || 1
      })),
      votesByChain: chainVotes.map(c => ({
        chainId: c.chain_id,
        chainName: getChainName(c.chain_id),
        votesCast: parseInt(c.count),
        percentage: totalVotes > 0 ? ((c.count / totalVotes) * 100).toFixed(1) : 0
      }))
    };

    // Cache for 30 seconds
    resultsCache.set(uuid, results);
    setTimeout(() => resultsCache.delete(uuid), 30000);

    res.json(results);
  } catch (err) {
    console.error('Results error:', err);
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
  app.listen(PORT, () => {
    console.log('\n═══════════════════════════════════════');
    console.log('🚀 SAFEVOTE RESULTS BACKEND LIVE');
    console.log('═══════════════════════════════════════');
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📊 /api/elections - List all elections`);
    console.log(`📈 /api/elections/{uuid}/results - Detailed results`);
    console.log('═══════════════════════════════════════\n');
  });
});