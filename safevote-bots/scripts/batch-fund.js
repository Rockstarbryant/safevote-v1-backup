#!/usr/bin/env node
// scripts/batch-fund.js
// Improved wallet funding with batching and retry logic

require('dotenv').config();
const { ethers } = require('ethers');
const chalk = require('chalk');
const cliProgress = require('cli-progress');
const fs = require('fs').promises;
const path = require('path');

const { getCurrentNetwork } = require('../config/networks');
const logger = require('../src/utils/logger');

class BatchFundingManager {
  constructor() {
    this.provider = null;
    this.fundingWallet = null;
    this.network = null;
    this.walletsFile = path.join(__dirname, '../data/wallets.json');
    this.fundingAmount = parseFloat(process.env.BOT_WALLET_FUNDING || '0.01');
    this.batchSize = parseInt(process.env.FUNDING_BATCH_SIZE || '10');
    this.delayBetweenBatches = parseInt(process.env.FUNDING_BATCH_DELAY || '5000');
    this.maxRetries = 3;
  }

  async initialize() {
    console.log(chalk.cyan('═'.repeat(70)));
    console.log(chalk.bold.white('  SafeVote Batch Wallet Funding'));
    console.log(chalk.cyan('═'.repeat(70)));
    console.log('');

    // Initialize network
    this.network = getCurrentNetwork();
    console.log(`Network: ${chalk.cyan(this.network.name)}`);
    console.log(`RPC: ${chalk.gray(this.network.rpcUrl)}`);
    console.log('');

    // Connect to blockchain
    console.log('Connecting to blockchain...');
    this.provider = new ethers.providers.JsonRpcProvider(this.network.rpcUrl);

    try {
      const blockNumber = await this.provider.getBlockNumber();
      console.log(`✅ Connected! Block: ${chalk.cyan(blockNumber)}`);
    } catch (error) {
      console.error(chalk.red('❌ Connection failed!'));
      console.error(chalk.red(`Error: ${error.message}`));
      console.log('');
      console.log(chalk.yellow('Troubleshooting:'));
      console.log('  1. Check your RPC URL is correct');
      console.log('  2. Try alternative RPC endpoints');
      console.log('  3. Check your internet connection');
      console.log('  4. SEI testnet might be down - check status');
      throw error;
    }

    // Initialize funding wallet
    if (!process.env.FUNDING_PRIVATE_KEY) {
      throw new Error('FUNDING_PRIVATE_KEY not set in .env');
    }

    this.fundingWallet = new ethers.Wallet(
      process.env.FUNDING_PRIVATE_KEY,
      this.provider
    );

    const balance = await this.fundingWallet.getBalance();
    console.log('');
    console.log(chalk.bold.white('Funding Wallet:'));
    console.log(`  Address: ${chalk.cyan(this.fundingWallet.address)}`);
    console.log(`  Balance: ${chalk.yellow(ethers.utils.formatEther(balance))} ${this.network.currency.symbol}`);
    console.log('');
  }

  async loadWallets() {
    try {
      const data = await fs.readFile(this.walletsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(chalk.red('❌ No wallets file found!'));
      console.log('');
      console.log(chalk.yellow('Run this first:'));
      console.log('  node scripts/fund-wallets.js --generate');
      throw error;
    }
  }

  async fundWallet(address, retryCount = 0) {
    try {
      const amountWei = ethers.utils.parseEther(this.fundingAmount.toString());

      // Get current gas price
      const gasPrice = await this.provider.getGasPrice();
      const adjustedGasPrice = gasPrice.mul(120).div(100); // 20% buffer

      const tx = await this.fundingWallet.sendTransaction({
        to: address,
        value: amountWei,
        gasLimit: 21000,
        gasPrice: adjustedGasPrice
      });

      // Wait for confirmation
      await tx.wait(1);

      return {
        success: true,
        txHash: tx.hash,
        amount: ethers.utils.formatEther(amountWei)
      };

    } catch (error) {
      // Retry on specific errors
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        console.log(chalk.yellow(`    Retry ${retryCount + 1}/${this.maxRetries} for ${address.substring(0, 10)}...`));
        await this.sleep(2000 * (retryCount + 1)); // Exponential backoff
        return this.fundWallet(address, retryCount + 1);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  shouldRetry(error) {
    const retryableErrors = [
      'nonce too low',
      'replacement fee too low',
      'timeout',
      'network error',
      'EAI_AGAIN',
      'ETIMEDOUT',
      'ECONNRESET'
    ];

    return retryableErrors.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  async fundBatch(wallets, startIdx, endIdx) {
    const batch = wallets.slice(startIdx, endIdx);
    const results = [];

    for (const wallet of batch) {
      // Skip if already funded
      if (wallet.funded) {
        results.push({ success: true, skipped: true });
        continue;
      }

      const result = await this.fundWallet(wallet.address);
      
      if (result.success) {
        wallet.funded = true;
        wallet.fundingTx = result.txHash;
      } else {
        wallet.funded = false;
        wallet.fundingError = result.error;
      }

      results.push(result);

      // Small delay between transactions in batch
      await this.sleep(500);
    }

    return results;
  }

  async fundAllWallets() {
    const walletData = await this.loadWallets();

    const allWallets = [
      ...walletData.electionCreators,
      ...walletData.eligibleVoters,
      ...walletData.ineligibleVoters
    ];

    console.log(chalk.bold.white('📊 Funding Plan:'));
    console.log(chalk.gray('─'.repeat(70)));
    console.log(`  Total Wallets: ${chalk.cyan(allWallets.length)}`);
    console.log(`  Batch Size: ${chalk.yellow(this.batchSize)} wallets per batch`);
    console.log(`  Delay Between Batches: ${chalk.yellow(this.delayBetweenBatches / 1000)}s`);
    console.log(`  Amount per Wallet: ${chalk.yellow(this.fundingAmount)} ${this.network.currency.symbol}`);
    console.log(`  Total Required: ${chalk.yellow((allWallets.length * this.fundingAmount).toFixed(2))} ${this.network.currency.symbol}`);
    console.log(chalk.gray('─'.repeat(70)));
    console.log('');

    // Check balance
    const balance = await this.fundingWallet.getBalance();
    const required = ethers.utils.parseEther((allWallets.length * this.fundingAmount).toString());

    if (balance.lt(required)) {
      console.log(chalk.red('⚠️  WARNING: Insufficient balance!'));
      console.log(`Need: ${ethers.utils.formatEther(required)} ${this.network.currency.symbol}`);
      console.log(`Have: ${ethers.utils.formatEther(balance)} ${this.network.currency.symbol}`);
      console.log(`Short: ${ethers.utils.formatEther(required.sub(balance))} ${this.network.currency.symbol}`);
      console.log('');
    }

    // Confirm
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise((resolve) => {
      readline.question(chalk.yellow('Proceed with funding? (y/N): '), (answer) => {
        readline.close();
        if (answer.toLowerCase() !== 'y') {
          console.log(chalk.red('\nFunding cancelled.\n'));
          process.exit(0);
        }
        resolve();
      });
    });

    console.log('');

    // Progress bar
    const progressBar = new cliProgress.SingleBar({
      format: 'Funding |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} | Batch {batch}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(allWallets.length, 0, { batch: '0/?' });

    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // Process in batches
    const numBatches = Math.ceil(allWallets.length / this.batchSize);

    for (let i = 0; i < allWallets.length; i += this.batchSize) {
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const endIdx = Math.min(i + this.batchSize, allWallets.length);

      console.log(''); // New line before batch info
      console.log(chalk.gray(`Batch ${batchNum}/${numBatches} (wallets ${i + 1}-${endIdx})`));

      const results = await this.fundBatch(allWallets, i, endIdx);

      // Count results
      results.forEach(r => {
        if (r.skipped) {
          totalSkipped++;
        } else if (r.success) {
          totalSuccessful++;
        } else {
          totalFailed++;
        }
      });

      progressBar.update(endIdx, { batch: `${batchNum}/${numBatches}` });

      // Delay between batches (except last batch)
      if (endIdx < allWallets.length) {
        await this.sleep(this.delayBetweenBatches);
      }
    }

    progressBar.stop();

    // Save updated wallet data
    await fs.writeFile(
      this.walletsFile,
      JSON.stringify(walletData, null, 2)
    );

    console.log('');
    console.log(chalk.gray('─'.repeat(70)));
    console.log(chalk.bold.white('📊 Results:'));
    console.log(`  ${chalk.green('✅ Successful:')} ${totalSuccessful}`);
    console.log(`  ${chalk.gray('⏭️  Skipped (already funded):')} ${totalSkipped}`);
    console.log(`  ${chalk.red('❌ Failed:')} ${totalFailed}`);
    console.log(`  ${chalk.cyan('📦 Total:')} ${allWallets.length}`);
    console.log(chalk.gray('─'.repeat(70)));
    console.log('');

    if (totalFailed > 0) {
      console.log(chalk.yellow('⚠️  Some wallets failed to fund.'));
      console.log(chalk.yellow('   Run this script again to retry failed wallets.'));
      console.log('');
    } else {
      console.log(chalk.green('✅ All wallets funded successfully!\n'));
    }

    return {
      successful: totalSuccessful,
      failed: totalFailed,
      skipped: totalSkipped,
      total: allWallets.length
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const manager = new BatchFundingManager();

  try {
    await manager.initialize();
    await manager.fundAllWallets();
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'), error.message);
    process.exit(1);
  }
}

main();