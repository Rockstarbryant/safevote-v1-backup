#!/usr/bin/env node
// scripts/revote.js
// Re-run voting on existing elections without creating new ones

require('dotenv').config();
const chalk = require('chalk');
const cliProgress = require('cli-progress');
const { Command } = require('commander');

const logger = require('../src/utils/logger');
const walletManager = require('../src/core/walletManager');
const blockchainService = require('../src/services/blockchainService');
const apiClient = require('../src/core/apiClient');
const { BOT_CONFIG } = require('../config/bot-config');
const { getCurrentNetwork } = require('../config/networks');

const EligibleVoterBot = require('../src/bots/eligibleVoter');
const IneligibleVoterBot = require('../src/bots/ineligibleVoter');

const program = new Command();

program
  .name('revote')
  .description('Re-run voting on existing elections')
  .option('--election <uuid>', 'Vote in specific election only')
  .option('--voters <count>', 'Number of voter bots to use')
  .option('--security-test', 'Also run security tests')
  .option('--active-only', 'Only vote in currently active elections')
  .parse(process.argv);

const options = program.opts();

class RevoteRunner {
  constructor() {
    this.voterBots = [];
    this.ineligibleBots = [];
    this.elections = [];
  }

  displayBanner() {
    console.log('\n');
    console.log(chalk.cyan('╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.white('          SafeVote Re-Voting Utility v1.0.0           ') + chalk.cyan('║'));
    console.log(chalk.cyan('║') + chalk.white('          Vote in Existing Elections                  ') + chalk.cyan('║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════════╝'));
    console.log('\n');
  }

  async initialize() {
    logger.header('System Initialization');

    // Initialize wallet manager
    logger.info('Initializing wallet manager...');
    await walletManager.initialize();
    await walletManager.loadWallets();
    logger.info('✅ Wallets loaded\n');

    // Initialize blockchain service
    logger.info('Connecting to blockchain...');
    await blockchainService.initialize();
    logger.info('✅ Blockchain connected\n');
  }

  async loadElections() {
    logger.header('Loading Elections');

    try {
      if (options.election) {
        // Load specific election
        logger.info(`Loading specific election: ${options.election}`);
        const election = await apiClient.getElection(options.election);
        
        if (!election) {
          throw new Error('Election not found');
        }

        this.elections = [{
          uuid: election.uuid,
          title: election.title,
          startTime: election.startTime,
          endTime: election.endTime,
          positions: election.positions,
          totalVoters: election.totalVoters
        }];

        logger.info(`✅ Loaded: ${election.title}`);
      } else {
        // Load all elections
        logger.info('Loading all elections from backend...');
        const allElections = await apiClient.getAllElections();

        if (!allElections || allElections.length === 0) {
          throw new Error('No elections found in backend');
        }

        logger.info(`Found ${allElections.length} total elections`);

        // Filter elections
        const now = Math.floor(Date.now() / 1000);
        
        if (options.activeOnly) {
          this.elections = allElections.filter(e => 
            e.startTime <= now && e.endTime >= now
          ).map(e => ({
            uuid: e.uuid,
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
            positions: e.positions,
            totalVoters: e.totalVoters
          }));

          logger.info(`✅ Filtered to ${this.elections.length} active elections`);
        } else {
          this.elections = allElections.map(e => ({
            uuid: e.uuid,
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
            positions: e.positions,
            totalVoters: e.totalVoters
          }));

          logger.info(`✅ Loaded ${this.elections.length} elections`);
        }
      }

      // Display elections
      console.log('');
      console.log(chalk.bold.white('Elections to vote in:'));
      console.log(chalk.gray('─'.repeat(60)));
      this.elections.forEach((e, i) => {
        const now = Math.floor(Date.now() / 1000);
        const status = 
          e.startTime > now ? chalk.yellow('Upcoming') :
          e.endTime < now ? chalk.red('Ended') :
          chalk.green('Active');
        
        console.log(`  ${i + 1}. ${chalk.cyan(e.title)} - ${status}`);
        console.log(`     UUID: ${chalk.gray(e.uuid)}`);
        console.log(`     Positions: ${e.positions?.length || 0}`);
      });
      console.log(chalk.gray('─'.repeat(60)));
      console.log('');

    } catch (error) {
      logger.error('Failed to load elections:', error);
      throw error;
    }
  }

  async runVoting() {
    if (this.elections.length === 0) {
      logger.warn('No elections to vote in');
      return;
    }

    logger.header('Voting Phase');

    // Initialize voter bots
    const voterCount = options.voters ? 
      parseInt(options.voters) : 
      BOT_CONFIG.counts.eligibleVoters;

    logger.info(`Initializing ${voterCount} voter bots...`);
    for (let i = 0; i < voterCount; i++) {
      const bot = new EligibleVoterBot(i);
      await bot.initialize();
      this.voterBots.push(bot);
    }
    logger.info('✅ Voter bots ready\n');

    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: 'Voting Progress |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    const totalVotes = this.voterBots.length * this.elections.length;
    progressBar.start(totalVotes, 0);

    let completed = 0;
    let successful = 0;

    // Vote in each election
    for (const election of this.elections) {
      logger.info(`\nVoting in: ${election.title}`);

      const batchSize = BOT_CONFIG.performance.maxConcurrent;
      
      for (let i = 0; i < this.voterBots.length; i += batchSize) {
        const batch = this.voterBots.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(bot => bot.vote(election))
        );

        // Count successful votes
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value.success) {
            successful++;
          }
        });

        completed += batch.length;
        progressBar.update(completed);

        // Small delay between batches
        await this.sleep(2000);
      }
    }

    progressBar.stop();

    logger.info(`\n✅ Voting complete:`);
    logger.info(`   Votes cast: ${chalk.green(successful)}`);
    logger.info(`   Total attempts: ${totalVotes}`);
    logger.info(`   Success rate: ${chalk.cyan(((successful/totalVotes)*100).toFixed(1))}%\n`);
  }

  async runSecurityTests() {
    if (this.elections.length === 0) {
      logger.warn('No elections for security testing');
      return;
    }

    logger.header('Security Testing Phase');

    // Initialize ineligible bots
    logger.info(`Initializing ${BOT_CONFIG.counts.ineligibleVoters} ineligible voter bots...`);
    for (let i = 0; i < BOT_CONFIG.counts.ineligibleVoters; i++) {
      const bot = new IneligibleVoterBot(i);
      await bot.initialize();
      this.ineligibleBots.push(bot);
    }
    logger.info('✅ Ineligible voter bots ready\n');

    // Run security tests
    const results = await Promise.all(
      this.ineligibleBots.map(bot => bot.testSecurity(this.elections))
    );

    // Aggregate results
    const totalTests = results.reduce((sum, r) => sum + r.total, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    logger.info('\n✅ Security testing complete:');
    logger.info(`   Tests passed: ${chalk.green(totalPassed)}/${totalTests}`);
    logger.info(`   Tests failed: ${chalk.red(totalFailed)}/${totalTests}\n`);

    if (totalFailed > 0) {
      logger.error('⚠️  SECURITY ISSUES DETECTED!\n');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    try {
      this.displayBanner();

      const network = getCurrentNetwork();
      console.log(chalk.bold.white('Configuration:'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(`  Network:        ${chalk.cyan(network.name)}`);
      console.log(`  Voter Bots:     ${chalk.yellow(options.voters || BOT_CONFIG.counts.eligibleVoters)}`);
      console.log(`  Specific:       ${chalk.cyan(options.election || 'All elections')}`);
      console.log(`  Active Only:    ${chalk.cyan(options.activeOnly ? 'Yes' : 'No')}`);
      console.log(`  Security Test:  ${chalk.cyan(options.securityTest ? 'Yes' : 'No')}`);
      console.log(chalk.gray('─'.repeat(60)));
      console.log('\n');

      await this.initialize();
      await this.loadElections();
      await this.runVoting();

      if (options.securityTest) {
        await this.runSecurityTests();
      }

      logger.header('Complete');
      logger.info('✅ All operations completed successfully!\n');

    } catch (error) {
      logger.error('Fatal error:', error);
      process.exit(1);
    }
  }
}

// Run
const runner = new RevoteRunner();
runner.run();