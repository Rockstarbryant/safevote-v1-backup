#!/usr/bin/env node
// scripts/debug-merkle.js
// Debug Merkle proof verification issues

require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const chalk = require('chalk');

const KEYGEN_API = process.env.KEYGEN_API;
const BACKEND_API = process.env.BACKEND_API;

async function debugMerkleProof(electionId, voterAddress) {
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.bold.white('  Merkle Proof Debug Tool'));
  console.log(chalk.cyan('═'.repeat(60)));
  console.log('');

  try {
    // Step 1: Get election data
    console.log(chalk.bold.white('Step 1: Fetching election data...'));
    const electionRes = await axios.get(`${BACKEND_API}/api/elections/${electionId}`);
    const election = electionRes.data;
    
    console.log(`  Election: ${chalk.cyan(election.title)}`);
    console.log(`  Merkle Root: ${chalk.yellow(election.merkleRoot)}`);
    console.log(`  Total Voters: ${chalk.green(election.totalVoters)}`);
    console.log('');

    // Step 2: Get voter data from keyService
    console.log(chalk.bold.white('Step 2: Fetching voter data...'));
    const voterRes = await axios.get(`${KEYGEN_API}/api/elections/${electionId}/keys/${voterAddress}`);
    const voterData = voterRes.data;

    if (!voterData.success) {
      console.log(chalk.red('  ❌ Voter not eligible or not found'));
      return;
    }

    console.log(`  Voter Key: ${chalk.cyan(voterData.voterKey)}`);
    console.log(`  Merkle Proof Length: ${chalk.green(voterData.merkleProof.length)} hashes`);
    console.log(`  Merkle Root (from keyService): ${chalk.yellow(voterData.merkleRoot)}`);
    console.log('');

    // Step 3: Verify roots match
    console.log(chalk.bold.white('Step 3: Verifying Merkle roots match...'));
    const rootsMatch = election.merkleRoot?.toLowerCase() === voterData.merkleRoot?.toLowerCase();
    
    if (rootsMatch) {
      console.log(chalk.green('  ✅ Merkle roots match!'));
    } else {
      console.log(chalk.red('  ❌ MERKLE ROOTS DO NOT MATCH!'));
      console.log(`     Election DB: ${election.merkleRoot}`);
      console.log(`     KeyService:  ${voterData.merkleRoot}`);
      console.log('');
      console.log(chalk.yellow('  This is the problem! The roots must match for verification to work.'));
      return;
    }
    console.log('');

    // Step 4: Verify proof locally
    console.log(chalk.bold.white('Step 4: Verifying proof locally...'));
    
    // Create leaf from voter key (match contract logic)
    const packed = ethers.utils.solidityPack(['bytes32'], [voterData.voterKey]);
    const leaf = ethers.utils.keccak256(packed);
    
    console.log(`  Leaf (from voterKey): ${chalk.cyan(leaf)}`);
    console.log(`  Proof hashes:`);
    voterData.merkleProof.forEach((hash, i) => {
      console.log(`    [${i}] ${chalk.gray(hash)}`);
    });
    console.log('');

    // Manual verification
    let computedHash = leaf;
    for (let i = 0; i < voterData.merkleProof.length; i++) {
      const proofElement = voterData.merkleProof[i];
      
      // Determine order (smaller hash first)
      if (computedHash.toLowerCase() < proofElement.toLowerCase()) {
        computedHash = ethers.utils.keccak256(
          ethers.utils.concat([computedHash, proofElement])
        );
      } else {
        computedHash = ethers.utils.keccak256(
          ethers.utils.concat([proofElement, computedHash])
        );
      }
      
      console.log(`  Step ${i + 1}: ${chalk.gray(computedHash)}`);
    }

    console.log('');
    console.log(`  Computed Root: ${chalk.cyan(computedHash)}`);
    console.log(`  Expected Root: ${chalk.yellow(voterData.merkleRoot)}`);
    console.log('');

    const proofValid = computedHash.toLowerCase() === voterData.merkleRoot.toLowerCase();
    
    if (proofValid) {
      console.log(chalk.green('  ✅ PROOF IS VALID!'));
      console.log('');
      console.log(chalk.yellow('  If voting still fails, the issue is likely:'));
      console.log('    1. Gas estimation failure');
      console.log('    2. Wrong on-chain election ID');
      console.log('    3. Election not started yet');
      console.log('    4. Voter key already used');
    } else {
      console.log(chalk.red('  ❌ PROOF IS INVALID!'));
      console.log('');
      console.log(chalk.yellow('  Possible causes:'));
      console.log('    1. Merkle tree was not built correctly');
      console.log('    2. Proof was generated for wrong voter key');
      console.log('    3. Tree structure mismatch (sortPairs setting)');
    }
    console.log('');

    // Step 5: Check if voter key was already used
    console.log(chalk.bold.white('Step 5: Checking if voter key was already used...'));
    
    const keyHash = ethers.utils.keccak256(packed);
    console.log(`  Key Hash: ${chalk.cyan(keyHash)}`);
    
    // Check database
    try {
      const votesRes = await axios.get(`${BACKEND_API}/api/votes/${electionId}`);
      const votes = votesRes.data || [];
      const alreadyVoted = votes.some(v => 
        v.voter_address?.toLowerCase() === voterAddress.toLowerCase()
      );
      
      if (alreadyVoted) {
        console.log(chalk.red('  ❌ This voter has already voted!'));
      } else {
        console.log(chalk.green('  ✅ Voter has not voted yet'));
      }
    } catch (err) {
      console.log(chalk.gray('  Could not check vote status'));
    }
    console.log('');

    console.log(chalk.cyan('═'.repeat(60)));
    console.log('');

  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    if (error.response) {
      console.error(chalk.red('Response:'), error.response.data);
    }
  }
}

// Usage
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node scripts/debug-merkle.js <electionId> <voterAddress>');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/debug-merkle.js elec-de471849-ee51-4fc7-8860-ee0a722ea8ab 0xa4c6907dc6C7f6e7728f2a94294f05EC47c4b0B4');
  process.exit(1);
}

const [electionId, voterAddress] = args;
debugMerkleProof(electionId, voterAddress);