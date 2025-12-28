// src/bots/electionCreator.js
// Bot that creates elections with random data

const crypto = require('crypto');
const logger = require('../utils/logger');
const walletManager = require('../core/walletManager');
const apiClient = require('../core/apiClient');
const blockchainService = require('../services/blockchainService');
const { generateElectionData, calculateEligibleVoters } = require('../../config/bot-config');
const { getCurrentNetwork } = require('../../config/networks');

class ElectionCreatorBot {
  constructor(botIndex) {
    this.botIndex = botIndex;
    this.wallet = null;
    this.elections = [];
  }

  /**
   * Initialize bot wallet
   */
  async initialize() {
    try {
      // Get wallet for this bot
      const walletData = walletManager.wallets.electionCreators[this.botIndex];
      if (!walletData) {
        throw new Error(`Wallet not found for bot index ${this.botIndex}`);
      }

      this.wallet = walletManager.getEthersWallet(walletData.address);
      
      logger.debug(`Election creator bot #${this.botIndex} initialized`);
      logger.debug(`  Address: ${this.wallet.address}`);

      return true;
    } catch (error) {
      logger.error(`Failed to initialize election creator bot #${this.botIndex}:`, error);
      throw error;
    }
  }

  /**
   * Generate unique election UUID
   */
  generateElectionUUID() {
    return 'elec-' + crypto.randomUUID();
  }

  /**
   * Select eligible voters from voter pool
   */
  selectEligibleVoters() {
    const eligibleVoterAddresses = walletManager.getAllAddresses('eligible');
    const numEligible = calculateEligibleVoters();

    // Shuffle and select
    const shuffled = [...eligibleVoterAddresses].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numEligible);
  }

  /**
   * Create a single election
   */
  async createElection() {
    const electionUUID = this.generateElectionUUID();
    
    try {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`Bot #${this.botIndex} creating election: ${electionUUID}`);
      logger.info('='.repeat(60));

      // Step 1: Generate election data
      logger.info('Step 1: Generating election data...');
      const electionData = generateElectionData(this.botIndex);
      
      logger.info(`  Title: ${electionData.title}`);
      logger.info(`  Positions: ${electionData.positions.length}`);
      logger.info(`  Duration: ${Math.floor((electionData.endTime - electionData.startTime) / 86400)} days`);

      // Step 2: Select eligible voters
      logger.info('\nStep 2: Selecting eligible voters...');
      const voterAddresses = this.selectEligibleVoters();
      
      logger.info(`  Total voters: ${voterAddresses.length}`);
      logger.info(`  Sample: ${voterAddresses.slice(0, 3).map(a => a.substring(0, 10)).join(', ')}...`);

      // Step 3: Create election in database
      logger.info('\nStep 3: Creating election in database...');
      await apiClient.createElection({
        electionId: electionUUID,
        title: electionData.title,
        description: electionData.description,
        location: electionData.location,
        creator: this.wallet.address,
        startTime: electionData.startTime,
        endTime: electionData.endTime,
        totalVoters: voterAddresses.length,
        isPublic: electionData.isPublic,
        allowAnonymous: electionData.allowAnonymous,
        allowDelegation: electionData.allowDelegation,
        positions: electionData.positions,
        voterAddresses: voterAddresses
      });

      logger.info('  ✅ Election created in database');

      // Step 4: Generate voter keys and Merkle root
      logger.info('\nStep 4: Generating voter keys...');
      const keyGenResult = await apiClient.generateVoterKeys(
        electionUUID,
        voterAddresses.length,
        voterAddresses
      );

      logger.info(`  ✅ Keys generated`);
      logger.info(`  Merkle root: ${keyGenResult.merkleRoot.substring(0, 20)}...`);
      logger.info(`  Total keys: ${keyGenResult.totalKeys}`);

      // Step 5: Deploy to blockchain
      logger.info('\nStep 5: Deploying to blockchain...');
      const network = getCurrentNetwork();
      logger.info(`  Network: ${network.name}`);
      logger.info(`  Creator: ${this.wallet.address.substring(0, 10)}...`);

      const deployResult = await blockchainService.createElection(this.wallet, {
        ...electionData,
        totalVoters: voterAddresses.length,
        merkleRoot: keyGenResult.merkleRoot
      });

      if (!deployResult.success) {
        throw new Error(`Blockchain deployment failed: ${deployResult.error}`);
      }

      logger.info('  ✅ Deployed on-chain');
      logger.info(`  TX Hash: ${deployResult.txHash}`);
      logger.info(`  Block: ${deployResult.blockNumber}`);
      logger.info(`  On-chain ID: ${deployResult.onChainElectionId}`);
      logger.info(`  Gas used: ${deployResult.gasUsed}`);

      // Step 6: Sync deployment info to backend
      logger.info('\nStep 6: Syncing deployment info...');
      await apiClient.syncChainDeployment(
        electionUUID,
        network.chainId,
        deployResult.onChainElectionId,
        deployResult.txHash
      );

      logger.info('  ✅ Deployment synced');

      // Store election info
      const electionInfo = {
        uuid: electionUUID,
        onChainId: deployResult.onChainElectionId,
        title: electionData.title,
        creator: this.wallet.address,
        startTime: electionData.startTime,
        endTime: electionData.endTime,
        positions: electionData.positions.length,
        totalVoters: voterAddresses.length,
        merkleRoot: keyGenResult.merkleRoot,
        txHash: deployResult.txHash,
        blockNumber: deployResult.blockNumber,
        gasUsed: deployResult.gasUsed,
        createdAt: Date.now()
      };

      this.elections.push(electionInfo);

      logger.info(`\n${'='.repeat(60)}`);
      logger.info('✅ ELECTION CREATED SUCCESSFULLY');
      logger.info('='.repeat(60));
      logger.election.created(electionUUID, this.botIndex, electionInfo);

      return {
        success: true,
        election: electionInfo
      };

    } catch (error) {
      logger.error(`\n❌ Election creation failed for bot #${this.botIndex}:`, error);
      logger.election.failed(electionUUID, this.botIndex, error);

      return {
        success: false,
        error: error.message,
        electionUUID
      };
    }
  }

  /**
   * Get all elections created by this bot
   */
  getElections() {
    return this.elections;
  }

  /**
   * Get bot statistics
   */
  getStats() {
    const successful = this.elections.length;
    const totalGasUsed = this.elections.reduce((sum, e) => 
      sum + parseInt(e.gasUsed || 0), 0
    );

    return {
      botIndex: this.botIndex,
      address: this.wallet?.address,
      electionsCreated: successful,
      totalGasUsed
    };
  }
}

module.exports = ElectionCreatorBot;