// src/core/apiClient.js
// Handles all API communication with backend services

const axios = require('axios');
const logger = require('../utils/logger');
const { BOT_CONFIG } = require('../../config/bot-config');

const BACKEND_API = process.env.BACKEND_API;
const KEYGEN_API = process.env.KEYGEN_API;

class APIClient {
  constructor() {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  /**
   * Rate limiting delay
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = BOT_CONFIG.timing.requestDelay;

    if (timeSinceLastRequest < minDelay) {
      const delay = minDelay - timeSinceLastRequest;
      await this.sleep(delay);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(method, url, data = null, options = {}) {
    await this.rateLimit();

    const maxRetries = BOT_CONFIG.performance.maxRetries;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const config = {
          method,
          url,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        };

        if (data) {
          config.data = data;
        }

        const response = await axios(config);
        return response.data;

      } catch (error) {
        lastError = error;
        
        const status = error.response?.status;
        const message = error.response?.data?.error || error.message;

        logger.warn(`Request failed (attempt ${attempt + 1}/${maxRetries}): ${message}`);

        // Don't retry on 4xx errors (except 429 rate limit)
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw error;
        }

        // Exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  // ============================================
  // ELECTION API METHODS
  // ============================================

  /**
   * Create election in database
   * Called BEFORE generating keys
   */
  async createElection(electionData) {
    try {
      logger.debug(`Creating election in database: ${electionData.electionId}`);

      const response = await this.makeRequest(
        'POST',
        `${KEYGEN_API}/api/elections/create`,
        {
          electionId: electionData.electionId,
          title: electionData.title,
          description: electionData.description || '',
          location: electionData.location || '',
          creator: electionData.creator || '0x0000000000000000000000000000000000000000',
          startTime: electionData.startTime,
          endTime: electionData.endTime,
          totalVoters: electionData.totalVoters,
          isPublic: electionData.isPublic !== false,
          allowAnonymous: electionData.allowAnonymous || false,
          allowDelegation: electionData.allowDelegation || false,
          positions: electionData.positions,
          voterAddresses: electionData.voterAddresses
        }
      );

      logger.debug(`✅ Election created in database: ${electionData.electionId}`);
      return response;

    } catch (error) {
      logger.error(`Failed to create election in database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate voter keys and Merkle root
   * Called AFTER creating election in database
   */
  async generateVoterKeys(electionId, numVoters, voterAddresses) {
    try {
      logger.debug(`Generating ${numVoters} voter keys for election ${electionId}`);

      const response = await this.makeRequest(
        'POST',
        `${KEYGEN_API}/api/elections/keys/generate`,
        {
          electionId,
          numVoters,
          voterAddresses
        }
      );

      if (!response.success || !response.merkleRoot) {
        throw new Error('Key generation failed or returned invalid data');
      }

      logger.debug(`✅ Voter keys generated. Merkle root: ${response.merkleRoot.substring(0, 20)}...`);
      
      return {
        merkleRoot: response.merkleRoot,
        totalKeys: response.totalKeys,
        votersProcessed: response.votersProcessed
      };

    } catch (error) {
      logger.error(`Failed to generate voter keys: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get voter key and merkle proof
   * Called when voter is ready to vote
   */
  async getVoterData(electionId, voterAddress) {
    try {
      logger.debug(`Fetching voter data for ${voterAddress.substring(0, 10)}... in election ${electionId}`);

      const response = await this.makeRequest(
        'GET',
        `${KEYGEN_API}/api/elections/${electionId}/keys/${voterAddress}`
      );

      if (!response.success || !response.voterKey) {
        throw new Error('Voter not eligible or data not found');
      }

      logger.debug(`✅ Voter data retrieved: key ${response.voterKey.substring(0, 10)}...`);

      return {
        voterKey: response.voterKey,
        merkleProof: response.merkleProof,
        merkleRoot: response.merkleRoot,
        eligible: response.eligible
      };

    } catch (error) {
      const status = error.response?.status;
      if (status === 404) {
        logger.debug(`Voter ${voterAddress} not registered for election ${electionId}`);
        return null;
      }
      
      logger.error(`Failed to get voter data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get election details from backend
   */
  async getElection(electionId) {
    try {
      logger.debug(`Fetching election details: ${electionId}`);

      const response = await this.makeRequest(
        'GET',
        `${BACKEND_API}/api/elections/${electionId}`
      );

      logger.debug(`✅ Election details retrieved: ${response.title}`);
      return response;

    } catch (error) {
      logger.error(`Failed to get election: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get on-chain election ID
   */
  async getOnChainElectionId(electionId) {
    try {
      logger.debug(`Fetching on-chain election ID for: ${electionId}`);

      const response = await this.makeRequest(
        'GET',
        `${BACKEND_API}/api/elections/${electionId}/onchain-id`
      );

      if (!response.onChainElectionId && response.onChainElectionId !== 0) {
        throw new Error('On-chain election ID not found');
      }

      logger.debug(`✅ On-chain election ID: ${response.onChainElectionId}`);
      return response.onChainElectionId;

    } catch (error) {
      logger.error(`Failed to get on-chain election ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync chain deployment info
   * Called after deploying election to blockchain
   */
  async syncChainDeployment(electionId, chainId, onChainElectionId, txHash) {
    try {
      logger.debug(`Syncing chain deployment: ${electionId} -> chain ${chainId}`);

      await this.makeRequest(
        'POST',
        `${KEYGEN_API}/api/elections/sync-deployment`,
        {
          electionId,
          chainId,
          onChainElectionId: parseInt(onChainElectionId),
          txHash
        }
      );

      logger.debug(`✅ Chain deployment synced`);

    } catch (error) {
      logger.warn(`Failed to sync chain deployment (non-fatal): ${error.message}`);
      // Don't throw - this is not critical
    }
  }

  /**
   * Record vote in database
   * Called after successful blockchain vote
   */
  async recordVote(electionId, voterAddress, chainId, txHash, blockNumber, onChainElectionId) {
    try {
      logger.debug(`Recording vote in database: ${voterAddress.substring(0, 10)}...`);

      await this.makeRequest(
        'POST',
        `${BACKEND_API}/api/votes/record`,
        {
          electionId,
          voterAddress: voterAddress.toLowerCase(),
          chainId,
          txHash,
          blockNumber,
          onChainElectionId
        }
      );

      logger.debug(`✅ Vote recorded in database`);

    } catch (error) {
      logger.warn(`Failed to record vote in database (non-fatal): ${error.message}`);
      // Don't throw - vote is on-chain, database sync is secondary
    }
  }

  /**
   * Get all elections (for monitoring)
   */
  async getAllElections() {
    try {
      const response = await this.makeRequest(
        'GET',
        `${BACKEND_API}/api/elections`
      );

      return response || [];

    } catch (error) {
      logger.error(`Failed to get all elections: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if voter has already voted
   */
  async hasVoted(electionId, voterAddress) {
    try {
      const response = await this.makeRequest(
        'GET',
        `${BACKEND_API}/api/votes/${electionId}`
      );

      const votes = response || [];
      return votes.some(v => 
        v.voter_address?.toLowerCase() === voterAddress.toLowerCase()
      );

    } catch (error) {
      logger.debug(`Could not check vote status: ${error.message}`);
      return false;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Sleep/delay helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get API statistics
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      lastRequestTime: this.lastRequestTime
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
}

// Export singleton instance
module.exports = new APIClient();