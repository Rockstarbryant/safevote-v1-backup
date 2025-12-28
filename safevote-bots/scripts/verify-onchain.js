#!/usr/bin/env node
// scripts/verify-onchain.js
// Verify election exists on blockchain and check its status

require('dotenv').config();
const { ethers } = require('ethers');
const chalk = require('chalk');
const axios = require('axios');

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC;
const BACKEND_API = process.env.BACKEND_API;

const ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'electionId', type: 'uint256' }],
    name: 'getElection',
    outputs: [
      { internalType: 'uint256', name: 'electionId_', type: 'uint256' },
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'string', name: 'title', type: 'string' },
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'string', name: 'location', type: 'string' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
      { internalType: 'uint256', name: 'startTime', type: 'uint256' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'uint256', name: 'totalRegisteredVoters', type: 'uint256' },
      { internalType: 'uint256', name: 'totalVotesCast', type: 'uint256' },
      { internalType: 'bytes32', name: 'voterMerkleRoot', type: 'bytes32' },
      { internalType: 'bool', name: 'isPublic', type: 'bool' },
      { internalType: 'bool', name: 'allowAnonymous', type: 'bool' },
      { internalType: 'bool', name: 'allowDelegation', type: 'bool' },
      { internalType: 'uint8', name: 'status', type: 'uint8' },
      {
        components: [
          { internalType: 'string', name: 'title', type: 'string' },
          { internalType: 'string[]', name: 'candidates', type: 'string[]' },
          { internalType: 'uint256', name: 'maxSelections', type: 'uint256' }
        ],
        internalType: 'struct SafeVote.Position[]',
        name: 'positions',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getTotalElections',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

async function verifyElection(electionUuid) {
  console.log(chalk.cyan('═'.repeat(70)));
  console.log(chalk.bold.white('  On-Chain Election Verification'));
  console.log(chalk.cyan('═'.repeat(70)));
  console.log('');

  try {
    // Connect to blockchain
    console.log(chalk.bold.white('📡 Connecting to blockchain...'));
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    const blockNumber = await provider.getBlockNumber();
    console.log(`  Connected! Block: ${chalk.cyan(blockNumber)}`);
    console.log('');

    // Get total elections on-chain
    console.log(chalk.bold.white('📊 Checking total elections on-chain...'));
    const totalElections = await contract.getTotalElections();
    console.log(`  Total elections on-chain: ${chalk.green(totalElections.toString())}`);
    console.log('');

    // Get on-chain ID from database
    console.log(chalk.bold.white('🔍 Fetching on-chain ID from database...'));
    const response = await axios.get(`${BACKEND_API}/api/elections/${electionUuid}/onchain-id`);
    const onChainId = response.data.onChainElectionId;
    
    console.log(`  Database says on-chain ID: ${chalk.yellow(onChainId)}`);
    console.log('');

    // Verify ID is within range
    if (onChainId > totalElections.toNumber() || onChainId < 1) {
      console.log(chalk.red('  ❌ ERROR: On-chain ID is out of range!'));
      console.log(`     Valid range: 1-${totalElections.toString()}`);
      console.log(`     Your ID: ${onChainId}`);
      console.log('');
      console.log(chalk.yellow('  This means the election was NOT successfully deployed on-chain.'));
      console.log(chalk.yellow('  The database has an invalid ID.'));
      return;
    }

    // Get election details from blockchain
    console.log(chalk.bold.white('📋 Fetching election details from blockchain...'));
    const election = await contract.getElection(onChainId);
    
    console.log(`  Title: ${chalk.cyan(election.title)}`);
    console.log(`  Creator: ${chalk.gray(election.creator)}`);
    console.log(`  Start Time: ${chalk.green(new Date(election.startTime.toNumber() * 1000).toLocaleString())}`);
    console.log(`  End Time: ${chalk.green(new Date(election.endTime.toNumber() * 1000).toLocaleString())}`);
    console.log(`  Total Voters: ${chalk.yellow(election.totalRegisteredVoters.toString())}`);
    console.log(`  Votes Cast: ${chalk.yellow(election.totalVotesCast.toString())}`);
    console.log(`  Merkle Root: ${chalk.magenta(election.voterMerkleRoot)}`);
    console.log(`  Status: ${chalk.cyan(election.status === 0 ? 'Active' : election.status === 1 ? 'Completed' : 'Cancelled')}`);
    console.log(`  Positions: ${chalk.yellow(election.positions.length)}`);
    console.log('');

    // Check timing
    const now = Math.floor(Date.now() / 1000);
    const startTime = election.startTime.toNumber();
    const endTime = election.endTime.toNumber();

    console.log(chalk.bold.white('⏰ Timing Check:'));
    console.log(`  Current time: ${chalk.cyan(new Date(now * 1000).toLocaleString())}`);
    
    if (now < startTime) {
      const waitTime = startTime - now;
      console.log(chalk.yellow(`  ⏳ Election hasn't started yet!`));
      console.log(chalk.yellow(`     Wait ${Math.floor(waitTime / 60)} minutes`));
    } else if (now > endTime) {
      console.log(chalk.red(`  ❌ Election has ended!`));
    } else {
      console.log(chalk.green(`  ✅ Election is currently active`));
    }
    console.log('');

    // Compare merkle roots
    console.log(chalk.bold.white('🌳 Merkle Root Verification:'));
    
    const dbResponse = await axios.get(`${BACKEND_API}/api/elections/${electionUuid}`);
    const dbMerkleRoot = dbResponse.data.merkleRoot;
    
    console.log(`  On-chain: ${chalk.cyan(election.voterMerkleRoot)}`);
    console.log(`  Database: ${chalk.magenta(dbMerkleRoot)}`);
    
    if (election.voterMerkleRoot.toLowerCase() === dbMerkleRoot?.toLowerCase()) {
      console.log(chalk.green(`  ✅ Merkle roots MATCH!`));
    } else {
      console.log(chalk.red(`  ❌ Merkle roots DO NOT MATCH!`));
      console.log('');
      console.log(chalk.yellow('  This is a CRITICAL issue!'));
      console.log(chalk.yellow('  Votes will fail because the proof verification will fail.'));
      console.log('');
      console.log(chalk.yellow('  Possible causes:'));
      console.log('    1. Keys were regenerated after deployment');
      console.log('    2. Database was updated but blockchain was not');
      console.log('    3. Deployment failed but database was updated');
    }
    console.log('');

    console.log(chalk.cyan('═'.repeat(70)));
    console.log('');

    // Summary
    if (now >= startTime && now <= endTime && 
        election.voterMerkleRoot.toLowerCase() === dbMerkleRoot?.toLowerCase()) {
      console.log(chalk.green.bold('✅ Election is READY for voting!'));
    } else {
      console.log(chalk.red.bold('❌ Election has ISSUES - votes will fail'));
    }
    console.log('');

  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    
    if (error.message.includes('invalid BigNumber string')) {
      console.log('');
      console.log(chalk.yellow('This usually means:'));
      console.log('  1. Election was never deployed on-chain');
      console.log('  2. Wrong election ID in database');
      console.log('  3. Contract call failed');
    }
  }
}

// Usage
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node scripts/verify-onchain.js <electionUuid>');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/verify-onchain.js elec-de471849-ee51-4fc7-8860-ee0a722ea8ab');
  console.log('');
  console.log('Get election UUID from your bot logs or database.');
  process.exit(1);
}

const electionUuid = args[0];
verifyElection(electionUuid);