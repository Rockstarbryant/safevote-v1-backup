// src/bots/eligibleVoter.js
// Bot that casts votes as an eligible voter

const logger = require('../utils/logger');
const walletManager = require('../core/walletManager');
const apiClient = require('../core/apiClient');
const blockchainService = require('../services/blockchainService');
const { BOT_CONFIG, randomInt, getRetryDelay } = require('../../config/bot-config');
const { getCurrentNetwork } = require('../../config/networks');

class EligibleVoterBot {
  constructor(botIndex) {
    this.botIndex = botIndex;
    this.wallet = null;
    this.votes = [];
    this.failedAttempts = [];
  }

  /**
   * Initialize bot wallet
   */
  async initialize() {
    try {
      const walletData = walletManager.wallets.eligibleVoters[this.botIndex];
      if (!walletData) {
        throw new Error(`Wallet not found for bot index ${this.botIndex}`);
      }

      this.wallet = walletManager.getEthersWallet(walletData.address);
      
      logger.debug(`Eligible voter bot #${this.botIndex} initialized`);
      logger.debug(`  Address: ${this.wallet.address}`);

      return true;
    } catch (error) {
      logger.error(`Failed to initialize eligible voter bot #${this.botIndex}:`, error);
      throw error;
    }
  }

  /**
   * Check if bot can vote in election
   */
  async canVote(election) {
    try {
      // Check timing
      const now = Math.floor(Date.now() / 1000);
      if (now < election.startTime) {
        logger.debug(`Election ${election.uuid} hasn't started yet`);
        return { canVote: false, reason: 'not_started' };
      }

      if (now > election.endTime) {
        logger.debug(`Election ${election.uuid} has ended`);
        return { canVote: false, reason: 'ended' };
      }

      // Check if already voted
      const hasVoted = await apiClient.hasVoted(election.uuid, this.wallet.address);
      if (hasVoted) {
        logger.debug(`Already voted in election ${election.uuid}`);
        return { canVote: false, reason: 'already_voted' };
      }

      // Check eligibility (has voter key)
      const voterData = await apiClient.getVoterData(election.uuid, this.wallet.address);
      if (!voterData) {
        logger.debug(`Not eligible for election ${election.uuid}`);
        return { canVote: false, reason: 'not_eligible' };
      }

      return {
        canVote: true,
        voterData
      };

    } catch (error) {
      logger.error(`Error checking eligibility: ${error.message}`);
      return { canVote: false, reason: 'error', error: error.message };
    }
  }

  /**
   * Generate random vote selections
   */
  generateVoteSelections(positions) {
    const votes = [];

    logger.debug(`Generating vote selections for ${positions.length} positions`);

    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      
      if (!position || !position.candidates || position.candidates.length === 0) {
        logger.error(`Position ${i} has no candidates!`);
        throw new Error(`Position ${i} is invalid or has no candidates`);
      }

      const numCandidates = position.candidates.length;
      
      // Select one random candidate
      const selectedCandidate = randomInt(0, numCandidates - 1);
      votes.push([selectedCandidate]);

      logger.debug(`Position ${i}: selected candidate ${selectedCandidate} (${position.candidates[selectedCandidate]})`);
    }

    logger.debug(`Final votes array: ${JSON.stringify(votes)}`);
    
    if (votes.length === 0) {
      throw new Error('No votes generated - positions array may be empty');
    }

    return votes;
  }

  /**
   * Cast vote in election
   */
  async vote(election, retryAttempt = 0) {
    try {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`Bot #${this.botIndex} voting in election: ${election.uuid}`);
      logger.info(`  Title: ${election.title || 'Unknown'}`);
      if (retryAttempt > 0) {
        logger.info(`  Retry attempt: ${retryAttempt}/${BOT_CONFIG.performance.maxRetries}`);
      }
      logger.info('='.repeat(60));

      // Step 1: Check eligibility
      logger.info('Step 1: Checking eligibility...');
      const eligibility = await this.canVote(election);

      if (!eligibility.canVote) {
        logger.warn(`  ❌ Cannot vote: ${eligibility.reason}`);
        return {
          success: false,
          reason: eligibility.reason,
          shouldRetry: false
        };
      }

      logger.info('  ✅ Eligible to vote');

      // Step 2: Get voter data (key + proof)
      logger.info('\nStep 2: Fetching voter key and proof...');
      const { voterKey, merkleProof, merkleRoot } = eligibility.voterData;
      
      logger.info(`  Voter key: ${voterKey.substring(0, 20)}...`);
      logger.info(`  Merkle proof: ${merkleProof.length} hashes`);
      logger.info(`  Merkle root: ${merkleRoot.substring(0, 20)}...`);

      // Step 2.5: Get full election details (CRITICAL - need positions!)
      logger.info('\nStep 2.5: Fetching full election details...');
      const fullElection = await apiClient.getElection(election.uuid);
      
      if (!fullElection || !fullElection.positions || fullElection.positions.length === 0) {
        throw new Error('Election has no positions or could not be loaded');
      }

      logger.info(`  Positions found: ${fullElection.positions.length}`);
      fullElection.positions.forEach((pos, i) => {
        logger.info(`    ${i + 1}. ${pos.title}: ${pos.candidates?.length || 0} candidates`);
      });

      // Step 3: Generate vote selections
      logger.info('\nStep 3: Selecting candidates...');
      const voteSelections = this.generateVoteSelections(fullElection.positions);
      
      voteSelections.forEach((selection, i) => {
        const position = fullElection.positions[i];
        const candidateIdx = selection[0];
        const candidateName = position.candidates[candidateIdx];
        logger.info(`  Position ${i + 1} (${position.title}): ${candidateName} (index: ${candidateIdx})`);
      });

      // Step 4: Get on-chain election ID
      logger.info('\nStep 4: Fetching on-chain election ID...');
      const onChainElectionId = await apiClient.getOnChainElectionId(election.uuid);
      logger.info(`  On-chain ID: ${onChainElectionId}`);

      // Step 5: Submit vote to blockchain
      logger.info('\nStep 5: Submitting vote to blockchain...');
      const network = getCurrentNetwork();
      logger.info(`  Network: ${network.name}`);
      logger.info(`  Voter: ${this.wallet.address.substring(0, 10)}...`);

      // CRITICAL: Verify votes array is not empty
      logger.info('\nVote validation:');
      logger.info(`  Votes array: ${JSON.stringify(voteSelections)}`);
      logger.info(`  Length: ${voteSelections.length}`);
      
      if (voteSelections.length === 0 || voteSelections.some(v => v.length === 0)) {
        throw new Error('Invalid votes: empty vote selections');
      }

      const voteResult = await blockchainService.castVote(
        this.wallet,
        onChainElectionId,
        voterKey,
        merkleProof,
        voteSelections,
        null // no delegation
      );

      if (!voteResult.success) {
        throw new Error(`Vote submission failed: ${voteResult.error}`);
      }

      logger.info('  ✅ Vote submitted on-chain');
      logger.info(`  TX Hash: ${voteResult.txHash}`);
      logger.info(`  Block: ${voteResult.blockNumber}`);
      logger.info(`  Gas used: ${voteResult.gasUsed}`);

      // Step 6: Record vote in database
      logger.info('\nStep 6: Recording vote in database...');
      await apiClient.recordVote(
        election.uuid,
        this.wallet.address,
        network.chainId,
        voteResult.txHash,
        voteResult.blockNumber,
        onChainElectionId
      );

      logger.info('  ✅ Vote recorded');

      // Store vote info
      const voteInfo = {
        electionUUID: election.uuid,
        electionTitle: election.title,
        onChainElectionId,
        voter: this.wallet.address,
        voteSelections,
        txHash: voteResult.txHash,
        blockNumber: voteResult.blockNumber,
        gasUsed: voteResult.gasUsed,
        timestamp: Date.now()
      };

      this.votes.push(voteInfo);

      logger.info(`\n${'='.repeat(60)}`);
      logger.info('✅ VOTE CAST SUCCESSFULLY');
      logger.info('='.repeat(60));
      logger.vote.cast(election.uuid, this.wallet.address, voteSelections);
      logger.vote.confirmed(election.uuid, this.wallet.address, voteResult.txHash);

      return {
        success: true,
        vote: voteInfo
      };

    } catch (error) {
      logger.error(`\n❌ Vote failed for bot #${this.botIndex}:`, error);
      logger.vote.failed(election.uuid, this.wallet.address, error, true);

      // Should we retry?
      const shouldRetry = retryAttempt < BOT_CONFIG.performance.maxRetries &&
                          !error.message.includes('already voted') &&
                          !error.message.includes('not eligible');

      if (shouldRetry) {
        const retryDelay = getRetryDelay();
        logger.vote.retrying(
          election.uuid,
          this.wallet.address,
          retryAttempt + 1,
          BOT_CONFIG.performance.maxRetries
        );
        
        logger.info(`  ⏳ Retrying in ${Math.floor(retryDelay / 60000)} minutes...`);

        // Store failed attempt
        this.failedAttempts.push({
          electionUUID: election.uuid,
          attempt: retryAttempt + 1,
          error: error.message,
          timestamp: Date.now(),
          willRetry: true,
          retryAt: Date.now() + retryDelay
        });

        // Wait and retry
        await this.sleep(retryDelay);
        return this.vote(election, retryAttempt + 1);
      }

      // Final failure
      this.failedAttempts.push({
        electionUUID: election.uuid,
        attempt: retryAttempt + 1,
        error: error.message,
        timestamp: Date.now(),
        willRetry: false
      });

      return {
        success: false,
        error: error.message,
        shouldRetry: false
      };
    }
  }

  /**
   * Attempt to vote in multiple elections
   */
  async voteInElections(elections) {
    const results = [];

    for (const election of elections) {
      try {
        // Random delay before voting (realistic behavior)
        const delay = randomInt(
          BOT_CONFIG.timing.votingDelayMin,
          BOT_CONFIG.timing.votingDelayMax
        );
        
        logger.debug(`Waiting ${Math.floor(delay / 1000)}s before voting...`);
        await this.sleep(delay);

        const result = await this.vote(election);
        results.push(result);

        // Delay between elections
        await this.sleep(BOT_CONFIG.timing.processDelay);

      } catch (error) {
        logger.error(`Error voting in election ${election.uuid}:`, error);
        results.push({
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get bot statistics
   */
  getStats() {
    const successful = this.votes.length;
    const failed = this.failedAttempts.filter(a => !a.willRetry).length;
    const totalGasUsed = this.votes.reduce((sum, v) => 
      sum + parseInt(v.gasUsed || 0), 0
    );

    return {
      botIndex: this.botIndex,
      address: this.wallet?.address,
      votesCast: successful,
      votesFailed: failed,
      totalGasUsed
    };
  }

  /**
   * Get all votes cast by this bot
   */
  getVotes() {
    return this.votes;
  }

  /**
   * Helper: sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EligibleVoterBot;