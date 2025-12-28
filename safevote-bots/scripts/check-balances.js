#!/usr/bin/env node
// scripts/check-balances.js
// Check balances of all bot wallets

require('dotenv').config();
const chalk = require('chalk');
const walletManager = require('../src/core/walletManager');
const logger = require('../src/utils/logger');
const { ethers } = require('ethers');

async function main() {
  try {
    console.log('\n' + chalk.cyan('═'.repeat(60)));
    console.log(chalk.bold.white('  Wallet Balance Checker'));
    console.log(chalk.cyan('═'.repeat(60)) + '\n');

    // Initialize
    await walletManager.initialize();
    await walletManager.loadWallets();

    // Check funding wallet
    console.log(chalk.bold.white('🏦 Funding Wallet:'));
    console.log(chalk.gray('─'.repeat(60)));
    
    const fundingBalance = await walletManager.fundingWallet.getBalance();
    const fundingAddress = walletManager.fundingWallet.address;
    
    console.log(`  Address: ${chalk.cyan(fundingAddress)}`);
    console.log(`  Balance: ${chalk.yellow(ethers.utils.formatEther(fundingBalance))} ETH\n`);

    // Check election creator wallets
    console.log(chalk.bold.white('🏗️  Election Creator Wallets:'));
    console.log(chalk.gray('─'.repeat(60)));
    
    const creators = walletManager.wallets.electionCreators.slice(0, 5);
    let creatorTotal = ethers.BigNumber.from(0);
    
    for (let i = 0; i < creators.length; i++) {
      const wallet = creators[i];
      const balance = await walletManager.provider.getBalance(wallet.address);
      creatorTotal = creatorTotal.add(balance);
      
      const status = balance.gt(0) ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} Bot ${i}: ${chalk.cyan(wallet.address.substring(0, 10))}... = ${chalk.yellow(ethers.utils.formatEther(balance))} ETH`);
    }
    
    if (creators.length < walletManager.wallets.electionCreators.length) {
      console.log(chalk.gray(`  ... and ${walletManager.wallets.electionCreators.length - 5} more`));
    }
    
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  Sample Total: ${chalk.yellow(ethers.utils.formatEther(creatorTotal))} ETH\n`);

    // Check eligible voter wallets (sample)
    console.log(chalk.bold.white('✅ Eligible Voter Wallets (sample):'));
    console.log(chalk.gray('─'.repeat(60)));
    
    const voters = walletManager.wallets.eligibleVoters.slice(0, 10);
    let voterTotal = ethers.BigNumber.from(0);
    
    for (let i = 0; i < voters.length; i++) {
      const wallet = voters[i];
      const balance = await walletManager.provider.getBalance(wallet.address);
      voterTotal = voterTotal.add(balance);
      
      const status = balance.gt(0) ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} Bot ${i}: ${chalk.cyan(wallet.address.substring(0, 10))}... = ${chalk.yellow(ethers.utils.formatEther(balance))} ETH`);
    }
    
    if (voters.length < walletManager.wallets.eligibleVoters.length) {
      console.log(chalk.gray(`  ... and ${walletManager.wallets.eligibleVoters.length - 10} more`));
    }
    
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  Sample Total: ${chalk.yellow(ethers.utils.formatEther(voterTotal))} ETH\n`);

    // Check ineligible voter wallets (sample)
    console.log(chalk.bold.white('❌ Ineligible Voter Wallets (sample):'));
    console.log(chalk.gray('─'.repeat(60)));
    
    const ineligible = walletManager.wallets.ineligibleVoters.slice(0, 5);
    let ineligibleTotal = ethers.BigNumber.from(0);
    
    for (let i = 0; i < ineligible.length; i++) {
      const wallet = ineligible[i];
      const balance = await walletManager.provider.getBalance(wallet.address);
      ineligibleTotal = ineligibleTotal.add(balance);
      
      const status = balance.gt(0) ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} Bot ${i}: ${chalk.cyan(wallet.address.substring(0, 10))}... = ${chalk.yellow(ethers.utils.formatEther(balance))} ETH`);
    }
    
    if (ineligible.length < walletManager.wallets.ineligibleVoters.length) {
      console.log(chalk.gray(`  ... and ${walletManager.wallets.ineligibleVoters.length - 5} more`));
    }
    
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  Sample Total: ${chalk.yellow(ethers.utils.formatEther(ineligibleTotal))} ETH\n`);

    // Summary
    console.log(chalk.bold.white('📊 Summary:'));
    console.log(chalk.gray('─'.repeat(60)));
    
    const totalWallets = 
      walletManager.wallets.electionCreators.length +
      walletManager.wallets.eligibleVoters.length +
      walletManager.wallets.ineligibleVoters.length;
    
    console.log(`  Total Wallets: ${chalk.cyan(totalWallets)}`);
    console.log(`  Funding Wallet: ${chalk.yellow(ethers.utils.formatEther(fundingBalance))} ETH`);
    console.log(chalk.gray('─'.repeat(60)) + '\n');

    logger.info('✅ Balance check complete\n');

  } catch (error) {
    logger.error('Error checking balances:', error);
    process.exit(1);
  }
}

main();