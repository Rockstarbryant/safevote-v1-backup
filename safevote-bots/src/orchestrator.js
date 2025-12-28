// src/orchestrator.js
// Main coordinator for all bot operations

require('dotenv').config();
const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');

const logger = require('./utils/logger');
const walletManager = require('./core/walletManager');
const blockchainService = require('./services/blockchainService');
const { validateConfig, BOT_CONFIG } = require('../config/bot-config');
const { getCurrentNetwork } = require('../config/networks');

const ElectionCreatorBot = require('./bots/electionCreator');
const EligibleVoterBot = require('./bots/eligibleVoter');
const IneligibleVoterBot = require('./bots/ineligibleVoter');

// Command line interface
const program = new Command();

program
  .name('safevote-bots')
  .description('SafeVote automated testing bot system')
  .version('1.0.0')
  .option('--full', 'Run full test (elections + voting)')
  .option('--elections-only', 'Only create elections')
  .option('--voting-only', 'Only run voting bots')
  .option('--security-only', 'Only run security tests')
  .option('--elections <count>', 'Override election bot count')
  .option('--voters <count>', 'Override voter bot count')
  .option('--skip-funding', 'Skip wallet funding step')
  .option('--monitor', 'Enable monitoring dashboard')
  .parse(process.argv);

const options = program.opts();

// Override counts if specified
if (options.elections) {
  BOT_CONFIG.counts.electionCreators = parseInt(options.elections);
}
if (options.voters) {
  const total = parseInt(options.voters);
  BOT_CONFIG.counts.eligibleVoters = Math.floor(total * 0.75);
  BOT_CONFIG.counts.ineligibleVoters = Math.floor(total * 0.25);
}

class Orchestrator {
  constructor() {
    this.electionBots = [];
    this.voterBots = [];
    this.ineligibleBots = [];
    this.createdElections = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Display welcome banner
   */
  displayBanner() {
    console.log('\n');
    console.log(chalk.cyan('╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.white('          SafeVote Bot Testing System v1.0.0          ') + chalk.cyan('║'));
    console.log(chalk.cyan('║') + chalk.white('        Automated Stress Testing & Security Audit       ') + chalk.cyan('║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════════╝'));
    console.log('\n');
  }

  /**
   * Display configuration summary
   */
  displayConfig() {
    const network = getCurrentNetwork();
    
    console.log(chalk.bold.white('Configuration:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  Network:          ${chalk.cyan(network.name)}`);
    console.log(`  Chain ID:         ${chalk.cyan(network.chainId)}`);
    console.log(`  Contract:         ${chalk.cyan(process.env.CONTRACT_ADDRESS.substring(0, 10))}...`);
    console.log(`  Election Bots:    ${chalk.yellow(BOT_CONFIG.counts.electionCreators)}`);
    console.log(`  Eligible Voters:  ${chalk.green(BOT_CONFIG.counts.eligibleVoters)}`);
    console.log(`  Ineligible:       ${chalk.red(BOT_CONFIG.counts.ineligibleVoters)}`);
    console.log(`  Total Bots:       ${chalk.bold(BOT_CONFIG.counts.electionCreators + BOT_CONFIG.counts.totalVoters())}`);
    console.log(chalk.gray('─'.repeat(60)));
    console.log('\n');
  }

  /**
   * Initialize all systems
   */
  async initialize() {
    logger.header('System Initialization');

    // Validate configuration
    const validation = validateConfig();
    if (!validation.valid) {
      logger.error('Configuration validation failed:');
      validation.errors.forEach(err => logger.error(`  - ${err}`));
      throw new Error('Invalid configuration');
    }
    logger.info('✅ Configuration validated');

    // Initialize wallet manager
    const spinner = ora('Initializing wallet manager...').start();
    await walletManager.initialize();
    spinner.succeed('Wallet manager initialized');

    // Initialize blockchain service
    spinner.start('Connecting to blockchain...');
    await blockchainService.initialize();
    spinner.succeed('Blockchain connected');

    logger.info('✅ All systems initialized\n');
  }

  /**
   * Generate or load wallets
   */
  async setupWallets() {
    logger.header('Wallet Setup');

    let wallets = await walletManager.loadWallets();
    
    if (!wallets || BOT_CONFIG.options.skipWalletGeneration === false) {
      const spinner = ora('Generating bot wallets...').start();
      wallets = await walletManager.generateWallets();
      spinner.succeed(`Generated ${BOT_CONFIG.counts.electionCreators + BOT_CONFIG.counts.totalVoters()} wallets`);
    } else {
      logger.info('✅ Loaded existing wallets');
    }

    return wallets;
  }

  /**
   * Fund all wallets
   */
  async fundWallets() {
    if (options.skipFunding || BOT_CONFIG.options.skipFunding) {
      logger.info('⏭️  Skipping wallet funding (as requested)\n');
      return;
    }

    logger.header('Wallet Funding');

    // Check funding wallet balance
    const fundingBalance = await walletManager.fundingWallet.getBalance();
    const required = walletManager.calculateRequiredFunds();

    logger.info(`Funding wallet balance: ${chalk.cyan(require('ethers').utils.formatEther(fundingBalance))} ETH`);
    logger.info(`Required for bots: ${chalk.yellow(require('ethers').utils.formatEther(required))} ETH`);

    if (fundingBalance.lt(required)) {
      logger.warn(`\n⚠️  Insufficient funds! You need ${require('ethers').utils.formatEther(required.sub(fundingBalance))} more ETH`);
      logger.warn('Get testnet tokens from: ' + getCurrentNetwork().faucet);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      await new Promise((resolve) => {
        readline.question('\nContinue anyway? (y/N): ', (answer) => {
          readline.close();
          if (answer.toLowerCase() !== 'y') {
            logger.error('Funding cancelled by user');
            process.exit(0);
          }
          resolve();
        });
      });
    }

    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: 'Funding Wallets |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    const totalWallets = BOT_CONFIG.counts.electionCreators + BOT_CONFIG.counts.totalVoters();
    progressBar.start(totalWallets, 0);

    // Fund wallets
    const result = await walletManager.fundAllWallets();
    progressBar.stop();

    logger.info(`\n✅ Funding complete: ${result.successful}/${result.total} successful\n`);

    if (result.failed > 0) {
      logger.warn(`⚠️  ${result.failed} wallets failed to fund. Check logs for details.\n`);
    }
  }

  /**
   * Create elections
   */
  async createElections() {
    logger.header('Election Creation Phase');

    // Initialize election creator bots
    logger.info(`Initializing ${BOT_CONFIG.counts.electionCreators} election creator bots...`);
    for (let i = 0; i < BOT_CONFIG.counts.electionCreators; i++) {
      const bot = new ElectionCreatorBot(i);
      await bot.initialize();
      this.electionBots.push(bot);
    }
    logger.info('✅ Election creator bots ready\n');

    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: 'Creating Elections |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(this.electionBots.length, 0);

    // Create elections concurrently (with rate limiting)
    const batchSize = BOT_CONFIG.performance.maxConcurrent;
    let completed = 0;

    for (let i = 0; i < this.electionBots.length; i += batchSize) {
      const batch = this.electionBots.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(bot => bot.createElection())
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          this.createdElections.push(result.value.election);
        }
      });

      completed += batch.length;
      progressBar.update(completed);

      // Delay between batches
      if (i + batchSize < this.electionBots.length) {
        await this.sleep(BOT_CONFIG.timing.processDelay);
      }
    }

    progressBar.stop();

    const successful = this.createdElections.length;
    const failed = this.electionBots.length - successful;

    logger.info(`\n✅ Election creation complete:`);
    logger.info(`   Successful: ${chalk.green(successful)}`);
    logger.info(`   Failed: ${chalk.red(failed)}`);
    logger.info(`   Total: ${this.electionBots.length}\n`);

    return this.createdElections;
  }

  /**
   * Load existing elections from backend
   */
  async loadExistingElections() {
    try {
      logger.info('Loading existing elections from backend...');
      
      const apiClient = require('./core/apiClient');
      const elections = await apiClient.getAllElections();
      
      if (!elections || elections.length === 0) {
        logger.warn('No elections found in backend');
        return [];
      }

      logger.info(`Found ${elections.length} elections in backend`);
      
      // Convert to format expected by voter bots
      const formattedElections = elections.map(e => ({
        uuid: e.uuid,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        positions: e.positions || [],
        totalVoters: e.totalVoters,
        merkleRoot: e.merkleRoot
      }));

      // Filter to only active elections
      const now = Math.floor(Date.now() / 1000);
      const activeElections = formattedElections.filter(e => 
        e.startTime <= now && e.endTime >= now
      );

      logger.info(`  Active elections: ${activeElections.length}`);
      logger.info(`  Upcoming: ${formattedElections.filter(e => e.startTime > now).length}`);
      logger.info(`  Ended: ${formattedElections.filter(e => e.endTime < now).length}`);

      return activeElections;

    } catch (error) {
      logger.error('Failed to load existing elections:', error);
      return [];
    }
  }

  /**
   * Run voting bots
   */
  async runVotingBots() {
    // If no elections in memory, try to load from backend
    if (this.createdElections.length === 0) {
      logger.info('No elections in memory, loading from backend...\n');
      this.createdElections = await this.loadExistingElections();
    }

    if (this.createdElections.length === 0) {
      logger.warn('No elections available for voting. Skipping voting phase.\n');
      return;
    }

    logger.header('Voting Phase');

    // Wait for elections to start
    const now = Math.floor(Date.now() / 1000);
    const nextElection = this.createdElections[0];
    
    if (nextElection.startTime > now) {
      const waitTime = nextElection.startTime - now;
      logger.info(`⏳ Waiting ${Math.floor(waitTime / 60)} minutes for elections to start...\n`);
      await this.sleep(waitTime * 1000);
    }

    // Initialize eligible voter bots
    logger.info(`Initializing ${BOT_CONFIG.counts.eligibleVoters} eligible voter bots...`);
    for (let i = 0; i < BOT_CONFIG.counts.eligibleVoters; i++) {
      const bot = new EligibleVoterBot(i);
      await bot.initialize();
      this.voterBots.push(bot);
    }
    logger.info('✅ Eligible voter bots ready\n');

    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: 'Voting Progress |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    const totalVotes = this.voterBots.length * this.createdElections.length;
    progressBar.start(totalVotes, 0);

    let completed = 0;

    // Each voter bot votes in each election
    for (const electionInfo of this.createdElections) {
      // CRITICAL: Pass the full election object with positions
      const electionToVote = {
        uuid: electionInfo.uuid,
        title: electionInfo.title,
        startTime: electionInfo.startTime,
        endTime: electionInfo.endTime,
        positions: electionInfo.positions, // Include positions!
        totalVoters: electionInfo.totalVoters
      };

      logger.info(`\nVoting in election: ${electionInfo.title}`);
      logger.info(`  UUID: ${electionInfo.uuid}`);
      logger.info(`  Positions: ${electionInfo.positions?.length || 0}`);

      const batchSize = BOT_CONFIG.performance.maxConcurrent;
      
      for (let i = 0; i < this.voterBots.length; i += batchSize) {
        const batch = this.voterBots.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(bot => bot.vote(electionToVote))
        );

        completed += batch.length;
        progressBar.update(completed);

        // Small delay between batches
        await this.sleep(2000);
      }
    }

    progressBar.stop();

    // Calculate stats
    const totalVotesCast = this.voterBots.reduce((sum, bot) => 
      sum + bot.getStats().votesCast, 0
    );

    logger.info(`\n✅ Voting phase complete:`);
    logger.info(`   Votes cast: ${chalk.green(totalVotesCast)}`);
    logger.info(`   Total attempts: ${totalVotes}\n`);
  }

  /**
   * Run security tests
   */
  async runSecurityTests() {
    if (this.createdElections.length === 0) {
      logger.warn('No elections available for security testing. Skipping.\n');
      return;
    }

    logger.header('Security Testing Phase');

    // Initialize ineligible voter bots
    logger.info(`Initializing ${BOT_CONFIG.counts.ineligibleVoters} ineligible voter bots...`);
    for (let i = 0; i < BOT_CONFIG.counts.ineligibleVoters; i++) {
      const bot = new IneligibleVoterBot(i);
      await bot.initialize();
      this.ineligibleBots.push(bot);
    }
    logger.info('✅ Ineligible voter bots ready\n');

    // Run security tests
    const results = await Promise.all(
      this.ineligibleBots.map(bot => bot.testSecurity(this.createdElections))
    );

    // Aggregate results
    const totalTests = results.reduce((sum, r) => sum + r.total, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    logger.info('\n✅ Security testing complete:');
    logger.info(`   Tests passed: ${chalk.green(totalPassed)}/${totalTests}`);
    logger.info(`   Tests failed: ${chalk.red(totalFailed)}/${totalTests}\n`);

    if (totalFailed > 0) {
      logger.error('⚠️  SECURITY ISSUES DETECTED! Review logs for details.\n');
    }
  }

  /**
   * Generate final report
   */
  generateReport() {
    logger.header('Test Summary Report');

    const electionStats = this.electionBots.map(b => b.getStats());
    const voterStats = this.voterBots.map(b => b.getStats());
    const securityStats = this.ineligibleBots.map(b => b.getStats());

    const totalElections = electionStats.reduce((sum, s) => sum + s.electionsCreated, 0);
    const totalVotes = voterStats.reduce((sum, s) => sum + s.votesCast, 0);
    const totalGas = [...electionStats, ...voterStats].reduce((sum, s) => sum + s.totalGasUsed, 0);

    const duration = this.endTime - this.startTime;
    const durationMin = Math.floor(duration / 60000);

    console.log(chalk.bold.white('📊 Overall Statistics:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  Duration:         ${chalk.cyan(durationMin)} minutes`);
    console.log(`  Elections:        ${chalk.yellow(totalElections)}`);
    console.log(`  Votes Cast:       ${chalk.green(totalVotes)}`);
    console.log(`  Total Gas Used:   ${chalk.magenta(totalGas)}`);
    console.log(`  Avg per Election: ${chalk.cyan((totalVotes / totalElections || 0).toFixed(1))} votes`);
    console.log(chalk.gray('─'.repeat(60)));
    console.log('\n');

    logger.info('✅ All operations completed successfully!');
    logger.info('📝 Detailed logs saved to ./logs/\n');
  }

  /**
   * Helper: sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Main execution flow
   */
  async run() {
    try {
      this.startTime = Date.now();

      this.displayBanner();
      this.displayConfig();

      await this.initialize();
      await this.setupWallets();
      await this.fundWallets();

      if (options.full || options.electionsOnly) {
        await this.createElections();
      }

      if (options.full || options.votingOnly) {
        await this.runVotingBots();
      }

      if (options.full || options.securityOnly) {
        await this.runSecurityTests();
      }

      this.endTime = Date.now();
      this.generateReport();

    } catch (error) {
      logger.error('Fatal error during execution:', error);
      process.exit(1);
    }
  }
}

// Run orchestrator
const orchestrator = new Orchestrator();
orchestrator.run();