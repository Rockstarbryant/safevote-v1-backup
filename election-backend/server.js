// election-backend/server.js
// SafeVote Results Backend - Test Version (No DB)

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Results backend live - no DB test' });
});

// Test elections
app.get('/api/elections', (req, res) => {
  res.json([
    {
      id: 'test-123',
      title: 'Test Election',
      description: 'This is a test',
      startTime: 1730000000,
      endTime: 1739999999,
      totalVoters: 10,
      totalVotesCast: 5,
      participationRate: 50,
      positions: [],
      votesByChain: []
    }
  ]);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test results backend live on port ${PORT}`);
});