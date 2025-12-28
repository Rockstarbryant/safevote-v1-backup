#!/usr/bin/env node
// scripts/fund-wallets.js
// Generate and fund all bot wallets

require('dotenv').config();
const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');
const walletManager = require('../src/core/walletManager');
const logger = require('../src/utils/logger');
const { ethers } = require('ethers');

const program = new Command();

program
  .option('--generate', 'Generate new wallets')
  .option('--fund-all', 'Fund all wallets')
  .option('--fund-range <range>', 'Fund specific range (e.g., 0-100)')
  .option('--check-only', 'Only check if wallets need funding')
  .parse(process.argv);

const options = program.opts();

async function generateWallets() {
  const spinner = ora('Generating bot wallets...').start();
  
  try {
    await walletManager.initialize();
    const wallets = await walletManager.generateWallets();
    
    const total = 
      wallets.electionCreators.length +
      wallets.eligibleVoters.length +
      wallets.ineligibleVoters.length;

    spinner.succeed(`Generated ${total} wallets`);
    
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  Election Creators: ${chalk.yellow(wallets.electionCreators.length)}`);
    console.log(`  Eligible Voters: ${chalk.green(wallets.eligibleVoters.length)}`);
    console.log(`  Ineligible Voters: ${chalk.red(wallets.ineligibleVoters.length)}`);
    console.log(chalk.gray('─'.repeat(60)) + '\n');

    return wallets;

  } catch (error) {
    spinner.fail('Failed to generate wallets');
    throw error;
  }
}

async function checkFundingNeeds() {
  const spinner = ora('Checking which wallets need funding...').start();
  
  try {
    await walletManager.initialize();
    await walletManager.loadWallets();

    const allWallets = [
      ...walletManager.wallets.electionCreators,
      ...walletManager.wallets.eligibleVoters,
      ...walletManager.wallets.ineligibleVoters
    ];

    let needFunding = 0;
    let alreadyFunded = 0;

    for (const wallet of allWallets) {
      const balance = await walletManager.provider.getBalance(wallet.address);
      if (balance.eq(0)) {
        needFunding++;
      } else {
        alreadyFunded++;
      }
    }

    spinner.succeed('Funding check complete');
    
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  Need Funding: ${chalk.red(needFunding)}`);
    console.log(`  Already Funded: ${chalk.green(alreadyFunded)}`);
    console.log(`  Total: ${chalk.cyan(allWallets.length)}`);
    console.log(chalk.gray('─'.repeat(60)) + '\n');

    return { needFunding, alreadyFunded };

  } catch (error) {
    spinner.fail('Failed to check funding needs');
    throw error;
  }
}

async function fundAllWallets() {
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.bold.white('  Funding All Bot Wallets'));
  console.log(chalk.cyan('═'.repeat(60)) + '\n');

  try {
    await walletManager.initialize();
    await walletManager.loadWallets();

    // Check funding wallet balance
    const fundingBalance = await walletManager.fundingWallet.getBalance();
    const required = walletManager.calculateRequiredFunds();

    console.log(chalk.bold.white('💰 Funding Wallet:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  Address: ${chalk.cyan(walletManager.fundingWallet.address)}`);
    console.log(`  Balance: ${chalk.yellow(ethers.utils.formatEther(fundingBalance))} ETH`);
    console.log(`  Required: ${chalk.yellow(ethers.utils.formatEther(required))} ETH`);
    console.log(chalk.gray('─'.repeat(60)) + '\n');

    if (fundingBalance.lt(required)) {
      console.log(chalk.red('⚠️  WARNING: Insufficient balance!'));
      console.log(chalk.yellow(`Need ${ethers.utils.formatEther(required.sub(fundingBalance))} more ETH\n`));
    }

    // Confirm before proceeding
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

    // Create progress bar
    const allWallets = [
      ...walletManager.wallets.electionCreators,
      ...walletManager.wallets.eligibleVoters,
      ...walletManager.wallets.ineligibleVoters
    ];

    const progressBar = new cliProgress.SingleBar({
      format: 'Funding Progress |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(allWallets.length, 0);

    const result = await walletManager.fundAllWallets();

    progressBar.stop();

    console.log('\n' + chalk.gray('─'.repeat(60)));
    console.log(chalk.bold.white('📊 Results:'));
    console.log(`  Successful: ${chalk.green(result.successful)}`);
    console.log(`  Failed: ${chalk.red(result.failed)}`);
    console.log(`  Total: ${chalk.cyan(result.total)}`);
    console.log(chalk.gray('─'.repeat(60)) + '\n');

    if (result.failed > 0) {
      console.log(chalk.yellow('⚠️  Some wallets failed to fund. Check logs for details.\n'));
    } else {
      console.log(chalk.green('✅ All wallets funded successfully!\n'));
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Funding failed:'), error.message);
    process.exit(1);
  }
}

async function main() {
  try {
    console.log('\n' + chalk.cyan('═'.repeat(60)));
    console.log(chalk.bold.white('  SafeVote Wallet Funding Utility'));
    console.log(chalk.cyan('═'.repeat(60)) + '\n');

    if (options.generate) {
      await generateWallets();
    } else if (options.checkOnly) {
      await checkFundingNeeds();
    } else if (options.fundAll) {
      await fundAllWallets();
    } else {
      console.log(chalk.yellow('No action specified. Use --help for options.\n'));
      console.log('Available commands:');
      console.log('  --generate      Generate new wallets');
      console.log('  --fund-all      Fund all wallets');
      console.log('  --check-only    Check funding status\n');
    }

  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

main();