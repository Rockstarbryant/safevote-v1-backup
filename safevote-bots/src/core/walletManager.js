// src/core/walletManager.js
// Generate, manage, and fund bot wallets

const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');
const { getCurrentNetwork } = require('../../config/networks');
const { BOT_CONFIG } = require('../../config/bot-config');
const logger = require('../utils/logger');

class WalletManager {
  constructor() {
    this.wallets = {
      electionCreators: [],
      eligibleVoters: [],
      ineligibleVoters: []
    };
    
    this.walletsFile = path.join(__dirname, '../../data/wallets.json');
    this.provider = null;
    this.fundingWallet = null;
  }

  /**
   * Initialize provider and funding wallet
   */
  async initialize() {
    try {
      const network = getCurrentNetwork();
      this.provider = new ethers.providers.JsonRpcProvider(network.rpcUrl);

      if (!process.env.FUNDING_PRIVATE_KEY) {
        throw new Error('FUNDING_PRIVATE_KEY not set in environment');
      }

      this.fundingWallet = new ethers.Wallet(
        process.env.FUNDING_PRIVATE_KEY,
        this.provider
      );

      const balance = await this.fundingWallet.getBalance();
      logger.info(`Funding wallet initialized: ${this.fundingWallet.address}`);
      logger.info(`Funding wallet balance: ${ethers.utils.formatEther(balance)} ETH`);

      // Check if we have enough funds
      const required = this.calculateRequiredFunds();
      if (balance.lt(required)) {
        logger.warn(`Insufficient funds! Required: ${ethers.utils.formatEther(required)} ETH`);
      }

      return true;
    } catch (error) {
      logger.error('Failed to initialize wallet manager:', error);
      throw error;
    }
  }

  /**
   * Calculate total funds needed for all bots
   */
  calculateRequiredFunds() {
    const totalBots = 
      BOT_CONFIG.counts.electionCreators + 
      BOT_CONFIG.counts.totalVoters();
    
    const fundingPerWallet = ethers.utils.parseEther(
      BOT_CONFIG.gas.walletFunding.toString()
    );

    return fundingPerWallet.mul(totalBots);
  }

  /**
   * Generate all bot wallets
   */
  async generateWallets() {
    try {
      logger.info('Generating bot wallets...');

      // Generate election creator wallets
      logger.info(`Generating ${BOT_CONFIG.counts.electionCreators} election creator wallets...`);
      for (let i = 0; i < BOT_CONFIG.counts.electionCreators; i++) {
        const wallet = ethers.Wallet.createRandom();
        this.wallets.electionCreators.push({
          index: i,
          address: wallet.address,
          privateKey: wallet.privateKey,
          type: 'election_creator'
        });

        if ((i + 1) % 10 === 0) {
          logger.debug(`Generated ${i + 1}/${BOT_CONFIG.counts.electionCreators} creator wallets`);
        }
      }

      // Generate eligible voter wallets
      logger.info(`Generating ${BOT_CONFIG.counts.eligibleVoters} eligible voter wallets...`);
      for (let i = 0; i < BOT_CONFIG.counts.eligibleVoters; i++) {
        const wallet = ethers.Wallet.createRandom();
        this.wallets.eligibleVoters.push({
          index: i,
          address: wallet.address,
          privateKey: wallet.privateKey,
          type: 'eligible_voter'
        });

        if ((i + 1) % 50 === 0) {
          logger.debug(`Generated ${i + 1}/${BOT_CONFIG.counts.eligibleVoters} eligible voter wallets`);
        }
      }

      // Generate ineligible voter wallets
      logger.info(`Generating ${BOT_CONFIG.counts.ineligibleVoters} ineligible voter wallets...`);
      for (let i = 0; i < BOT_CONFIG.counts.ineligibleVoters; i++) {
        const wallet = ethers.Wallet.createRandom();
        this.wallets.ineligibleVoters.push({
          index: i,
          address: wallet.address,
          privateKey: wallet.privateKey,
          type: 'ineligible_voter'
        });

        if ((i + 1) % 25 === 0) {
          logger.debug(`Generated ${i + 1}/${BOT_CONFIG.counts.ineligibleVoters} ineligible voter wallets`);
        }
      }

      // Save wallets to file
      await this.saveWallets();

      const total = 
        this.wallets.electionCreators.length +
        this.wallets.eligibleVoters.length +
        this.wallets.ineligibleVoters.length;

      logger.info(`✅ Generated ${total} total wallets`);
      logger.info(`   - Election Creators: ${this.wallets.electionCreators.length}`);
      logger.info(`   - Eligible Voters: ${this.wallets.eligibleVoters.length}`);
      logger.info(`   - Ineligible Voters: ${this.wallets.ineligibleVoters.length}`);

      return this.wallets;
    } catch (error) {
      logger.error('Failed to generate wallets:', error);
      throw error;
    }
  }

  /**
   * Save wallets to JSON file
   */
  async saveWallets() {
    try {
      const dataDir = path.dirname(this.walletsFile);
      await fs.mkdir(dataDir, { recursive: true });
      
      await fs.writeFile(
        this.walletsFile,
        JSON.stringify(this.wallets, null, 2)
      );

      logger.debug(`Wallets saved to ${this.walletsFile}`);
    } catch (error) {
      logger.error('Failed to save wallets:', error);
      throw error;
    }
  }

  /**
   * Load wallets from file
   */
  async loadWallets() {
    try {
      const data = await fs.readFile(this.walletsFile, 'utf8');
      this.wallets = JSON.parse(data);

      const total = 
        this.wallets.electionCreators.length +
        this.wallets.eligibleVoters.length +
        this.wallets.ineligibleVoters.length;

      logger.info(`Loaded ${total} wallets from file`);
      return this.wallets;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn('No existing wallets file found');
        return null;
      }
      throw error;
    }
  }

  /**
   * Fund a single wallet
   */
  async fundWallet(address, amount) {
    try {
      const amountWei = ethers.utils.parseEther(amount.toString());

      const tx = await this.fundingWallet.sendTransaction({
        to: address,
        value: amountWei,
        gasLimit: 21000
      });

      await tx.wait(1);
      
      return {
        success: true,
        txHash: tx.hash,
        amount: ethers.utils.formatEther(amountWei)
      };
    } catch (error) {
      logger.error(`Failed to fund wallet ${address}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fund all bot wallets
   */
  async fundAllWallets() {
    try {
      logger.info('Starting wallet funding process...');

      const fundingAmount = BOT_CONFIG.gas.walletFunding;
      const allWallets = [
        ...this.wallets.electionCreators,
        ...this.wallets.eligibleVoters,
        ...this.wallets.ineligibleVoters
      ];

      let successful = 0;
      let failed = 0;

      for (let i = 0; i < allWallets.length; i++) {
        const wallet = allWallets[i];

        logger.debug(`Funding wallet ${i + 1}/${allWallets.length}: ${wallet.address}`);

        const result = await this.fundWallet(wallet.address, fundingAmount);

        if (result.success) {
          successful++;
          wallet.funded = true;
          wallet.fundingTx = result.txHash;
        } else {
          failed++;
          wallet.funded = false;
          wallet.fundingError = result.error;
        }

        // Progress update every 50 wallets
        if ((i + 1) % 50 === 0) {
          logger.info(`Progress: ${i + 1}/${allWallets.length} wallets processed (${successful} successful, ${failed} failed)`);
        }

        // Small delay to avoid rate limiting
        await this.delay(200);
      }

      // Save updated wallet data
      await this.saveWallets();

      logger.info(`✅ Wallet funding complete!`);
      logger.info(`   - Successful: ${successful}`);
      logger.info(`   - Failed: ${failed}`);
      logger.info(`   - Total: ${allWallets.length}`);

      if (failed > 0) {
        logger.warn(`⚠️  ${failed} wallets failed to fund. Check logs for details.`);
      }

      return {
        successful,
        failed,
        total: allWallets.length
      };
    } catch (error) {
      logger.error('Failed to fund wallets:', error);
      throw error;
    }
  }

  /**
   * Check balance of a wallet
   */
  async checkBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      logger.error(`Failed to check balance for ${address}:`, error);
      return '0.0';
    }
  }

  /**
   * Check balances of all wallets
   */
  async checkAllBalances() {
    try {
      logger.info('Checking all wallet balances...');

      const results = {
        electionCreators: [],
        eligibleVoters: [],
        ineligibleVoters: []
      };

      // Check election creator wallets
      for (const wallet of this.wallets.electionCreators) {
        const balance = await this.checkBalance(wallet.address);
        results.electionCreators.push({
          address: wallet.address,
          balance
        });
      }

      // Check eligible voter wallets (sample)
      const sampleSize = Math.min(10, this.wallets.eligibleVoters.length);
      for (let i = 0; i < sampleSize; i++) {
        const wallet = this.wallets.eligibleVoters[i];
        const balance = await this.checkBalance(wallet.address);
        results.eligibleVoters.push({
          address: wallet.address,
          balance
        });
      }

      // Check ineligible voter wallets (sample)
      const sampleSize2 = Math.min(5, this.wallets.ineligibleVoters.length);
      for (let i = 0; i < sampleSize2; i++) {
        const wallet = this.wallets.ineligibleVoters[i];
        const balance = await this.checkBalance(wallet.address);
        results.ineligibleVoters.push({
          address: wallet.address,
          balance
        });
      }

      return results;
    } catch (error) {
      logger.error('Failed to check balances:', error);
      throw error;
    }
  }

  /**
   * Get wallet by address
   */
  getWalletByAddress(address) {
    const allWallets = [
      ...this.wallets.electionCreators,
      ...this.wallets.eligibleVoters,
      ...this.wallets.ineligibleVoters
    ];

    return allWallets.find(w => w.address.toLowerCase() === address.toLowerCase());
  }

  /**
   * Get ethers Wallet instance
   */
  getEthersWallet(address) {
    const wallet = this.getWalletByAddress(address);
    if (!wallet) {
      throw new Error(`Wallet not found: ${address}`);
    }

    return new ethers.Wallet(wallet.privateKey, this.provider);
  }

  /**
   * Get all addresses by type
   */
  getAllAddresses(type = 'all') {
    switch (type) {
      case 'creators':
        return this.wallets.electionCreators.map(w => w.address);
      case 'eligible':
        return this.wallets.eligibleVoters.map(w => w.address);
      case 'ineligible':
        return this.wallets.ineligibleVoters.map(w => w.address);
      case 'all':
      default:
        return [
          ...this.wallets.electionCreators.map(w => w.address),
          ...this.wallets.eligibleVoters.map(w => w.address),
          ...this.wallets.ineligibleVoters.map(w => w.address)
        ];
    }
  }

  /**
   * Helper: delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new WalletManager();