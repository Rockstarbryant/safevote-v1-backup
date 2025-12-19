// FILE: election-backend/server.js
// SafeVote React-Compatible Backend

const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ============ MIDDLEWARE ============
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// ============ CONFIGURATION ============
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0xfa84a89D170084675b7ECb110a883fD47757916c';
const PROVIDER_URL = process.env.PROVIDER_URL || 'https://arb-sepolia.g.alchemy.com/v2/Q2yshQ_-U-fUSkWeuebk_R18kGpxebkN';
const PORT = process.env.PORT || 3001;

const CONTRACT_ABI = require('./CONTRACT_ABI.js');

console.log('\n═══════════════════════════════════════');
console.log('🚀 SAFEVOTE BACKEND - REACT EDITION');
console.log('═══════════════════════════════════════');
console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
console.log(`🌐 Provider: ${PROVIDER_URL}`);
console.log(`🔌 Port: ${PORT}`);
console.log('═══════════════════════════════════════\n');

// ============ ETHEREUM SETUP ============
let provider;
let contract;

async function initializeProvider() {
  try {
    provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const network = await provider.getNetwork();
    console.log(`✅ Connected to ${network.name} (Chain ID: ${network.chainId})`);
    return true;
  } catch (error) {
    console.error('❌ Blockchain connection error:', error.message);
    return false;
  }
}

// ============ IN-MEMORY CACHE (For React) ============
const electionCache = new Map();
const electionsIndex = [];

// ============ API ROUTES ============

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend is running!',
    connected: contract ? true : false 
  });
});

// Get all elections (for dropdown)
app.get('/api/elections', async (req, res) => {
  try {
    // If we have cached elections, return them
    if (electionsIndex.length > 0) {
      const elections = electionsIndex.map(id => electionCache.get(id)).filter(Boolean);
      console.log(`📊 Returning ${elections.length} cached elections`);
      return res.json(elections);
    }

    // Try to fetch from blockchain
    if (!contract) {
      console.warn('⚠️  Contract not initialized, returning empty list');
      return res.json([]);
    }

    console.log(`📊 Attempting to load elections from blockchain...`);

    const elections = [];
    
    // Try to load elections 0-100 (adjust range if you have more)
    // Your new election is ID 2, so we need to check a wider range
    for (let i = 0; i < 100; i++) {
      try {
        const election = await contract.getElection(i);
        
        // Skip if title is empty
        if (!election.title || election.title.trim() === '') {
          continue;
        }

        const electionData = {
          election_id: i,
          title: election.title,
          description: election.description,
          location: election.location,
          creator: election.creator,
          start_time: Number(election.startTime),
          end_time: Number(election.endTime),
          total_registered_voters: Number(election.totalRegisteredVoters),
          total_votes_cast: Number(election.totalVotesCast),
          status: Number(election.status),
          allow_anonymous: election.allowAnonymous,
          allow_delegation: election.allowDelegation,
          contract_address: CONTRACT_ADDRESS
        };
        
        // Cache it
        electionCache.set(i, electionData);
        electionsIndex.push(i);
        elections.push(electionData);
        
        console.log(`✅ Loaded election ${i}: ${election.title}`);
      } catch (error) {
        // Election doesn't exist, continue to next ID
        continue;
      }
    }

    console.log(`✅ Found ${elections.length} elections on blockchain`);
    res.json(elections);

  } catch (error) {
    console.error('Error fetching elections:', error.message);
    res.status(500).json({ error: error.message, elections: [] });
  }
});

// Get single election by ID
app.get('/api/elections/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;
    const id = parseInt(electionId);

    if (!contract) {
      return res.status(503).json({ error: 'Contract not initialized' });
    }

    console.log(`📖 Fetching election ${id}...`);

    const election = await contract.getElection(id);
    const positions = election.positions || [];
    const results = [];

    // Get results for each position
    for (let i = 0; i < positions.length; i++) {
      try {
        const posResults = await contract.getElectionResults(id, i);
        results.push({
          position_index: i,
          title: positions[i].title,
          max_selections: Number(positions[i].maxSelections),
          candidates: positions[i].candidates.map((name, idx) => ({
            name: name,
            votes: Number(posResults.votesCast[idx]) || 0
          }))
        });
      } catch (error) {
        console.warn(`⚠️  Could not get results for position ${i}`);
      }
    }

    const electionData = {
      election_id: id,
      title: election.title,
      description: election.description,
      location: election.location,
      creator: election.creator,
      start_time: Number(election.startTime),
      end_time: Number(election.endTime),
      created_at: Number(election.createdAt),
      total_registered_voters: Number(election.totalRegisteredVoters),
      total_votes_cast: Number(election.totalVotesCast),
      status: Number(election.status),
      allow_anonymous: election.allowAnonymous,
      allow_delegation: election.allowDelegation,
      contract_address: CONTRACT_ADDRESS,
      positions: results
    };

    // Cache it
    electionCache.set(id, electionData);
    if (!electionsIndex.includes(id)) {
      electionsIndex.push(id);
    }

    console.log(`✅ Successfully fetched election ${id}`);
    res.json(electionData);

  } catch (error) {
    console.error('Error fetching election:', error.message);
    res.status(404).json({ error: error.message });
  }
});

// Get analytics for an election
app.get('/api/analytics/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;
    const id = parseInt(electionId);

    if (!contract) {
      return res.status(503).json({ error: 'Contract not initialized' });
    }

    const election = await contract.getElection(id);
    
    const totalVoters = Number(election.totalRegisteredVoters);
    const votesCast = Number(election.totalVotesCast);
    const participationRate = totalVoters > 0 
      ? ((votesCast / totalVoters) * 100).toFixed(2)
      : 0;

    res.json({
      election_id: id,
      total_registered_voters: totalVoters,
      total_votes_cast: votesCast,
      participation_rate: parseFloat(participationRate),
      status: Number(election.status),
      start_time: Number(election.startTime),
      end_time: Number(election.endTime)
    });

  } catch (error) {
    console.error('Error fetching analytics:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Sync specific election (fetch and cache)
app.post('/api/sync/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;
    const id = parseInt(electionId);

    if (!contract) {
      return res.status(503).json({ error: 'Contract not initialized' });
    }

    console.log(`🔄 Syncing election ${id}...`);

    const election = await contract.getElection(id);
    const positions = election.positions || [];

    // Get results for each position
    const results = [];
    for (let i = 0; i < positions.length; i++) {
      try {
        const posResults = await contract.getElectionResults(id, i);
        results.push({
          position_index: i,
          title: positions[i].title,
          max_selections: Number(positions[i].maxSelections),
          candidates: positions[i].candidates.map((name, idx) => ({
            name: name,
            votes: Number(posResults.votesCast[idx]) || 0
          }))
        });
      } catch (error) {
        console.warn(`⚠️  Could not sync position ${i}`);
      }
    }

    const electionData = {
      election_id: id,
      title: election.title,
      description: election.description,
      location: election.location,
      creator: election.creator,
      start_time: Number(election.startTime),
      end_time: Number(election.endTime),
      created_at: Number(election.createdAt),
      total_registered_voters: Number(election.totalRegisteredVoters),
      total_votes_cast: Number(election.totalVotesCast),
      status: Number(election.status),
      allow_anonymous: election.allowAnonymous,
      allow_delegation: election.allowDelegation,
      contract_address: CONTRACT_ADDRESS,
      positions: results
    };

    // Cache it
    electionCache.set(id, electionData);
    if (!electionsIndex.includes(id)) {
      electionsIndex.push(id);
    }

    console.log(`✅ Synced election ${id}`);
    res.json({ success: true, election: electionData });

  } catch (error) {
    console.error('Error syncing election:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get merkle root
app.post('/api/merkle', async (req, res) => {
  try {
    const { electionId, address } = req.body;

    if (!electionId || !address) {
      return res.status(400).json({ error: 'Missing electionId or address' });
    }

    if (!contract) {
      return res.status(503).json({ error: 'Contract not initialized' });
    }

    const merkleRoot = await contract.merkleRoots(electionId, address);
    res.json({ merkleRoot });

  } catch (error) {
    console.error('Error fetching merkle:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ============ START SERVER ============
async function startServer() {
  const isConnected = await initializeProvider();

  if (!isConnected) {
    console.warn('⚠️  Warning: Could not connect to blockchain. API will work with cached data only.');
  }

  app.listen(PORT, () => {
    console.log('\n═══════════════════════════════════════');
    console.log('✅ BACKEND READY FOR REACT');
    console.log('═══════════════════════════════════════');
    console.log(`🌐 Health: http://localhost:${PORT}/health`);
    console.log(`📊 Elections: http://localhost:${PORT}/api/elections`);
    console.log('═══════════════════════════════════════\n');
  });
}

startServer();

module.exports = app;