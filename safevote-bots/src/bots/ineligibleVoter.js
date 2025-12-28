// src/bots/ineligibleVoter.js
// Bot that attempts to vote without being registered (tests security)

const logger = require('../utils/logger');
const walletManager = require('../core/walletManager');
const apiClient = require('../core/apiClient');
const { BOT_CONFIG, getRetryDelay } = require('../../config/bot-config');

class IneligibleVoterBot {
  constructor(botIndex) {
    this.botIndex = botIndex;
    this.wallet = null;
    this.attempts = [];
  }

  /**
   * Initialize bot wallet
   */
  async initialize() {
    try {
      const walletData = walletManager.wallets.ineligibleVoters[this.botIndex];
      if (!walletData) {
        throw new Error(`Wallet not found for bot index ${this.botIndex}`);
      }

      this.wallet = walletManager.getEthersWallet(walletData.address);
      
      logger.debug(`Ineligible voter bot #${this.botIndex} initialized`);
      logger.debug(`  Address: ${this.wallet.address}`);

      return true;
    } catch (error) {
      logger.error(`Failed to initialize ineligible voter bot #${this.botIndex}:`, error);
      throw error;
    }
  }

  /**
   * Attempt to vote (should fail - testing security)
   */
  async attemptVote(election, retryAttempt = 0) {
    try {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`🔒 Security Test - Bot #${this.botIndex}`);
      logger.info(`  Election: ${election.uuid}`);
      logger.info(`  Expected: VOTE SHOULD BE REJECTED`);
      if (retryAttempt > 0) {
        logger.info(`  Retry: ${retryAttempt}/${BOT_CONFIG.performance.maxRetries}`);
      }
      logger.info('='.repeat(60));

      // Step 1: Check if we have voter key (we shouldn't)
      logger.info('Step 1: Checking eligibility...');
      const voterData = await apiClient.getVoterData(election.uuid, this.wallet.address);

      if (!voterData) {
        logger.info('  ✅ SECURITY CHECK PASSED: Not eligible (as expected)');
        
        // Store attempt
        this.attempts.push({
          electionUUID: election.uuid,
          electionTitle: election.title,
          voter: this.wallet.address,
          result: 'rejected_not_registered',
          timestamp: Date.now(),
          expectedBehavior: true
        });

        return {
          success: false,
          reason: 'not_eligible',
          securityPassed: true,
          message: 'Security check passed - ineligible voter was correctly rejected'
        };
      }

      // If we somehow got voter data, this is a security breach!
      logger.error('  ❌ SECURITY BREACH: Ineligible voter has access!');
      
      this.attempts.push({
        electionUUID: election.uuid,
        electionTitle: election.title,
        voter: this.wallet.address,
        result: 'security_breach',
        timestamp: Date.now(),
        expectedBehavior: false,
        severity: 'CRITICAL'
      });

      return {
        success: false,
        reason: 'security_breach',
        securityPassed: false,
        message: '⚠️ CRITICAL: Ineligible voter gained access to voting keys!'
      };

    } catch (error) {
      // Errors are expected for ineligible voters
      const isExpectedError = 
        error.message.includes('not eligible') ||
        error.message.includes('not found') ||
        error.message.includes('404');

      if (isExpectedError) {
        logger.info('  ✅ SECURITY CHECK PASSED: Access denied (as expected)');
        
        this.attempts.push({
          electionUUID: election.uuid,
          electionTitle: election.title,
          voter: this.wallet.address,
          result: 'rejected_api_error',
          error: error.message,
          timestamp: Date.now(),
          expectedBehavior: true
        });

        return {
          success: false,
          reason: 'expected_failure',
          securityPassed: true,
          message: 'Security check passed - ineligible voter correctly blocked'
        };
      }

      // Unexpected errors might indicate issues
      logger.warn(`  ⚠️ Unexpected error: ${error.message}`);
      
      this.attempts.push({
        electionUUID: election.uuid,
        voter: this.wallet.address,
        result: 'unexpected_error',
        error: error.message,
        timestamp: Date.now(),
        expectedBehavior: false
      });

      // Should we retry to confirm it's consistently blocked?
      if (retryAttempt < BOT_CONFIG.performance.maxRetries) {
        const retryDelay = getRetryDelay();
        logger.info(`  ⏳ Retrying in ${Math.floor(retryDelay / 60000)} minutes to confirm...`);
        
        await this.sleep(retryDelay);
        return this.attemptVote(election, retryAttempt + 1);
      }

      return {
        success: false,
        reason: 'unexpected_error',
        error: error.message,
        securityPassed: null // Unknown
      };
    }
  }

  /**
   * Test security across multiple elections
   */
  async testSecurity(elections) {
    const results = [];

    logger.header('Security Testing - Ineligible Voter Attempts');

    for (const election of elections) {
      try {
        const result = await this.attemptVote(election);
        results.push(result);

        // Delay between attempts
        await this.sleep(BOT_CONFIG.timing.processDelay);

      } catch (error) {
        logger.error(`Error during security test for election ${election.uuid}:`, error);
        results.push({
          success: false,
          error: error.message,
          securityPassed: null
        });
      }
    }

    // Summary
    const passed = results.filter(r => r.securityPassed === true).length;
    const failed = results.filter(r => r.securityPassed === false).length;
    const unknown = results.filter(r => r.securityPassed === null).length;

    logger.info(`\n${'='.repeat(60)}`);
    logger.info('SECURITY TEST SUMMARY');
    logger.info('='.repeat(60));
    logger.info(`  ✅ Passed: ${passed}/${elections.length}`);
    logger.info(`  ❌ Failed: ${failed}/${elections.length}`);
    logger.info(`  ❓ Unknown: ${unknown}/${elections.length}`);
    logger.info('='.repeat(60));

    if (failed > 0) {
      logger.error('⚠️ CRITICAL: Security vulnerabilities detected!');
    } else if (passed === elections.length) {
      logger.info('✅ All security checks passed!');
    }

    return {
      total: elections.length,
      passed,
      failed,
      unknown,
      results
    };
  }

  /**
   * Get bot statistics
   */
  getStats() {
    const total = this.attempts.length;
    const blocked = this.attempts.filter(a => a.expectedBehavior === true).length;
    const breaches = this.attempts.filter(a => a.result === 'security_breach').length;

    return {
      botIndex: this.botIndex,
      address: this.wallet?.address,
      totalAttempts: total,
      correctlyBlocked: blocked,
      securityBreaches: breaches,
      securityScore: total > 0 ? ((blocked / total) * 100).toFixed(1) + '%' : 'N/A'
    };
  }

  /**
   * Get all attempts
   */
  getAttempts() {
    return this.attempts;
  }

  /**
   * Helper: sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = IneligibleVoterBot;