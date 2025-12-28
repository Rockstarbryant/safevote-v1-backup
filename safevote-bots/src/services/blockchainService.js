// src/services/blockchainService.js
// Handles all smart contract interactions

const { ethers } = require('ethers');
const logger = require('../utils/logger');
const { getCurrentNetwork } = require('../../config/networks');
const { BOT_CONFIG } = require('../../config/bot-config');
const { SAFE_VOTE_V2_ABI } = require('../utils/contractABI');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.network = null;
  }

  /**
   * Initialize blockchain connection
   */
  async initialize() {
    try {
      this.network = getCurrentNetwork();
      
      logger.info(`Connecting to ${this.network.name}...`);
      this.provider = new ethers.providers.JsonRpcProvider(this.network.rpcUrl);

      // Test connection
      const blockNumber = await this.provider.getBlockNumber();
      logger.info(`✅ Connected to blockchain (block: ${blockNumber})`);

      // Initialize contract
      const contractAddress = process.env.CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('CONTRACT_ADDRESS not set in environment');
      }

      this.contract = new ethers.Contract(
        contractAddress,
        SAFE_VOTE_V2_ABI,
        this.provider
      );

      logger.info(`✅ Contract initialized at ${contractAddress}`);

      return true;
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Get gas price with multiplier
   */
  async getGasPrice() {
    try {
      const baseGasPrice = await this.provider.getGasPrice();
      const multiplier = BOT_CONFIG.gas.priceMultiplier;
      const adjustedGasPrice = baseGasPrice.mul(
        Math.floor(multiplier * 100)
      ).div(100);

      logger.debug(`Gas price: ${ethers.utils.formatUnits(adjustedGasPrice, 'gwei')} gwei`);
      
      return adjustedGasPrice;
    } catch (error) {
      logger.warn('Failed to fetch gas price, using default');
      return ethers.utils.parseUnits('20', 'gwei');
    }
  }

  /**
   * Create election on blockchain
   */
  async createElection(wallet, electionData) {
    try {
      logger.info(`Creating election on-chain: ${electionData.title}`);

      // Prepare positions data
      const positions = electionData.positions.map(p => ({
        title: p.title,
        candidates: p.candidates,
        maxSelections: p.maxSelections || 1
      }));

      // Connect wallet to contract
      const contractWithSigner = this.contract.connect(wallet);

      // Get gas price
      const gasPrice = await this.getGasPrice();

      // Estimate gas
      let gasLimit;
      try {
        gasLimit = await contractWithSigner.estimateGas.createElection(
          electionData.title,
          electionData.description || '',
          electionData.location || '',
          electionData.startTime,
          electionData.endTime,
          electionData.totalVoters,
          electionData.merkleRoot,
          electionData.isPublic !== false,
          electionData.allowAnonymous || false,
          electionData.allowDelegation || false,
          positions
        );
        
        // Add 20% buffer
        gasLimit = gasLimit.mul(120).div(100);
      } catch (error) {
        logger.warn('Gas estimation failed, using default limit');
        gasLimit = BOT_CONFIG.gas.electionLimit;
      }

      logger.debug(`Gas limit: ${gasLimit.toString()}`);

      // Submit transaction
      const tx = await contractWithSigner.createElection(
        electionData.title,
        electionData.description || '',
        electionData.location || '',
        electionData.startTime,
        electionData.endTime,
        electionData.totalVoters,
        electionData.merkleRoot,
        electionData.isPublic !== false,
        electionData.allowAnonymous || false,
        electionData.allowDelegation || false,
        positions,
        {
          gasLimit,
          gasPrice
        }
      );

      logger.info(`Transaction submitted: ${tx.hash}`);
      logger.info(`Waiting for confirmation...`);

      // Wait for confirmation
      const receipt = await tx.wait(this.network.confirmations || 1);

      // Extract election ID from event
      const event = receipt.events?.find(e => e.event === 'ElectionCreatedV2');
      const onChainElectionId = event?.args?.electionId?.toString();

      if (!onChainElectionId) {
        throw new Error('Could not extract election ID from transaction receipt');
      }

      logger.info(`✅ Election deployed on-chain!`);
      logger.info(`   On-chain ID: ${onChainElectionId}`);
      logger.info(`   Block: ${receipt.blockNumber}`);
      logger.info(`   Gas used: ${receipt.gasUsed.toString()}`);

      return {
        success: true,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        onChainElectionId: parseInt(onChainElectionId),
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Failed to create election on-chain:', error);
      
      return {
        success: false,
        error: error.message,
        reason: error.reason || 'Unknown error'
      };
    }
  }

  /**
   * Cast vote on blockchain
   */
  async castVote(wallet, onChainElectionId, voterKey, merkleProof, votes, delegateTo = null) {
    try {
      logger.info(`Casting vote for election ${onChainElectionId}`);

      // Validate inputs
      if (!ethers.utils.isHexString(voterKey, 32)) {
        throw new Error(`Invalid voterKey format: ${voterKey}`);
      }

      if (!Array.isArray(merkleProof)) {
        throw new Error('Merkle proof must be an array');
      }

      if (merkleProof.length === 0) {
        throw new Error('Merkle proof is empty - voter may not be registered');
      }

      if (!Array.isArray(votes)) {
        throw new Error('Votes must be an array');
      }

      // Additional validation
      logger.debug(`Voter key: ${voterKey}`);
      logger.debug(`Merkle proof length: ${merkleProof.length}`);
      logger.debug(`Votes structure: ${JSON.stringify(votes)}`);

      // Format votes as uint256[][]
      const formattedVotes = votes.map((arr) => {
        if (!Array.isArray(arr)) {
          throw new Error('Each position vote must be an array');
        }
        return arr.map(v => ethers.BigNumber.from(v));
      });

      // Prepare delegate address
      const delegateAddress = delegateTo || ethers.constants.AddressZero;

      // Connect wallet to contract
      const contractWithSigner = this.contract.connect(wallet);

      // Get gas price
      const gasPrice = await this.getGasPrice();

      // Estimate gas
      let gasLimit;
      try {
        gasLimit = await contractWithSigner.estimateGas.vote(
          onChainElectionId,
          voterKey,
          merkleProof,
          formattedVotes,
          delegateAddress
        );
        
        // Add 20% buffer
        gasLimit = gasLimit.mul(120).div(100);
      } catch (error) {
        logger.warn('Gas estimation failed, using default limit');
        gasLimit = BOT_CONFIG.gas.voteLimit;
      }

      logger.debug(`Gas limit: ${gasLimit.toString()}`);

      // Submit transaction
      const tx = await contractWithSigner.vote(
        onChainElectionId,
        voterKey,
        merkleProof,
        formattedVotes,
        delegateAddress,
        {
          gasLimit,
          gasPrice
        }
      );

      logger.info(`Vote transaction submitted: ${tx.hash}`);
      logger.info(`Waiting for confirmation...`);

      // Wait for confirmation with timeout
      const receipt = await Promise.race([
        tx.wait(this.network.confirmations || 1),
        this.timeout(BOT_CONFIG.timing.txTimeout)
      ]);

      if (!receipt) {
        throw new Error('Transaction confirmation timeout');
      }

      logger.info(`✅ Vote confirmed!`);
      logger.info(`   Block: ${receipt.blockNumber}`);
      logger.info(`   Gas used: ${receipt.gasUsed.toString()}`);

      return {
        success: true,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Failed to cast vote:', error);

      return {
        success: false,
        error: error.message,
        reason: error.reason || 'Unknown error'
      };
    }
  }

  /**
   * Get election details from blockchain
   */
  async getElection(onChainElectionId) {
    try {
      const election = await this.contract.getElection(onChainElectionId);

      return {
        electionId: election.electionId_.toString(),
        creator: election.creator,
        title: election.title,
        description: election.description,
        location: election.location,
        createdAt: election.createdAt.toNumber(),
        startTime: election.startTime.toNumber(),
        endTime: election.endTime.toNumber(),
        totalRegisteredVoters: election.totalRegisteredVoters.toNumber(),
        totalVotesCast: election.totalVotesCast.toNumber(),
        voterMerkleRoot: election.voterMerkleRoot,
        isPublic: election.isPublic,
        allowAnonymous: election.allowAnonymous,
        allowDelegation: election.allowDelegation,
        status: election.status,
        positions: election.positions.map(p => ({
          title: p.title,
          candidates: p.candidates,
          maxSelections: p.maxSelections.toNumber()
        }))
      };

    } catch (error) {
      logger.error(`Failed to get election ${onChainElectionId}:`, error);
      throw error;
    }
  }

  /**
   * Get election results for a position
   */
  async getElectionResults(onChainElectionId, positionIndex) {
    try {
      const results = await this.contract.getElectionResults(
        onChainElectionId,
        positionIndex
      );

      return {
        candidates: results.candidates,
        votesCast: results.votesCast.map(v => v.toNumber())
      };

    } catch (error) {
      logger.error('Failed to get election results:', error);
      throw error;
    }
  }

  /**
   * Check if voter key has been used
   */
  async hasVoterKeyBeenUsed(onChainElectionId, voterKey) {
    try {
      const keyHash = ethers.utils.keccak256(
        ethers.utils.solidityPack(['bytes32'], [voterKey])
      );

      const used = await this.contract.usedVoterKeys(onChainElectionId, keyHash);
      return used;

    } catch (error) {
      logger.error('Failed to check voter key status:', error);
      return false;
    }
  }

  /**
   * Get current block number
   */
  async getBlockNumber() {
    return this.provider.getBlockNumber();
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash) {
    return this.provider.getTransactionReceipt(txHash);
  }

  /**
   * Wait for transaction with timeout
   */
  async waitForTransaction(txHash, confirmations = 1, timeout = 120000) {
    const tx = await this.provider.getTransaction(txHash);
    if (!tx) {
      throw new Error('Transaction not found');
    }

    return Promise.race([
      tx.wait(confirmations),
      this.timeout(timeout)
    ]);
  }

  /**
   * Timeout helper
   */
  timeout(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), ms)
    );
  }

  /**
   * Get network info
   */
  getNetworkInfo() {
    return {
      name: this.network.name,
      chainId: this.network.chainId,
      rpcUrl: this.network.rpcUrl,
      explorer: this.network.explorer
    };
  }
}

// Export singleton instance
module.exports = new BlockchainService();