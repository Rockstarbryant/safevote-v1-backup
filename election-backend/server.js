// FILE: election-backend/server.js
// SafeVote Results Backend - PostgreSQL (Supabase/Render Ready)

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
    console.log('✅ PostgreSQL connected successfully');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'OK', database: 'connected' });
});

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

    const elections = rows.map(election => ({
      id: election.id,
      title: election.title || 'Untitled Election',
      description: election.description || '',
      location: election.location || 'Global',
      startTime: election.startTime,
      endTime: election.endTime,
      totalVoters: election.totalVoters,
      createdAt: election.createdAt,
      totalVotesCast: 0, // placeholder - calculate from votes table
      participationRate: 0,
      positions: election.positions || [],
      votesByChain: []
    }));

    res.json(elections);
  } catch (err) {
    console.error('Error fetching elections:', err);
    res.status(500).json({ error: 'Failed to load elections' });
  }
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log('🚀 SAFEVOTE RESULTS BACKEND LIVE');
    console.log(`🌐 http://0.0.0.0:${PORT}`);
    console.log('🗄️  Database: PostgreSQL (Supabase)');
  });
});