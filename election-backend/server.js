// election-backend/server.js
// SafeVote Results Backend - PostgreSQL Only

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
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  try {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await dbPool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL (Supabase)');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'OK', backend: 'Results', database: 'PostgreSQL' });
});

// List elections
app.get('/api/elections', async (req, res) => {
  try {
    const { rows } = await dbPool.query('SELECT * FROM elections ORDER BY created_at DESC');
    res.json(rows.map(row => ({
      id: row.election_id,
      title: row.title || 'Untitled',
      description: row.description || '',
      startTime: row.start_time,
      endTime: row.end_time,
      totalVoters: row.total_voters,
      positions: row.positions || [],
      totalVotesCast: 0,
      participationRate: 0,
      votesByChain: []
    })));
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to load elections' });
  }
});

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Results backend live on port ${PORT}`);
    console.log('Connected to Supabase PostgreSQL');
  });
});