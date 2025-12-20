// election-backend/server.js
// SafeVote Results Backend - PostgreSQL (Fly.io/Supabase)

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
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'OK', service: 'SafeVote Results Backend', database: 'PostgreSQL connected' });
});

// Get all elections
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

    const elections = rows.map(row => ({
      id: row.id,
      title: row.title || 'Untitled Election',
      description: row.description || '',
      location: row.location || 'Global',
      startTime: row.startTime,
      endTime: row.endTime,
      totalVoters: row.totalVoters,
      createdAt: row.createdAt,
      totalVotesCast: 0,
      participationRate: 0,
      positions: row.positions || [],
      votesByChain: []
    }));

    res.json(elections);
  } catch (err) {
    console.error('Error fetching elections:', err.message);
    res.json([]); // Return empty on error
  }
});

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Results backend live on port ${PORT}`);
  });
});