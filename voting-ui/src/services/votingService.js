import { ethers } from 'ethers';
import { SAFE_VOTE_V2_ABI } from '../utils/SafeVoteV2ABI';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';

let provider = null;
let signer = null;
let contract = null;

// Cache for on-chain election IDs to avoid repeated API calls
const onChainIdCache = new Map();

// ============================================
// GET ON-CHAIN ELECTION ID
// Maps UUID (used for merkle proofs) to numeric on-chain ID
// ============================================
export const getOnChainElectionId = async (uuidElectionId) => {
  try {
    // Check cache first
    if (onChainIdCache.has(uuidElectionId)) {
      console.log(`📦 Using cached on-chain ID for ${uuidElectionId}`);
      return onChainIdCache.get(uuidElectionId);
    }

    console.log(`🔍 Fetching on-chain ID for UUID: ${uuidElectionId}`);
    console.log(`   API Endpoint: ${BACKEND_API}/api/elections/${uuidElectionId}/onchain-id`);

    const response = await fetch(
      `${BACKEND_API}/api/elections/${uuidElectionId}/onchain-id`
    );

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        errorMsg = errData.error || errorMsg;
      } catch (e) {
        const errText = await response.text();
        errorMsg = errText || errorMsg;
      }
      throw new Error(`Failed to get on-chain election ID: ${errorMsg}`);
    }

    const data = await response.json();
    const onChainId = data.onChainElectionId;

    if (onChainId === undefined || onChainId === null) {
      throw new Error(
        'On-chain election ID is null. Election may not be deployed on-chain yet.'
      );
    }

    // Cache it
    onChainIdCache.set(uuidElectionId, onChainId);
    console.log(`✅ Successfully fetched on-chain ID: ${onChainId} for UUID: ${uuidElectionId}`);

    return onChainId;
  } catch (error) {
    console.error('❌ Error fetching on-chain election ID:', error.message);
    throw error;
  }
};

// Initialize provider
export const initializeProvider = async () => {
  try {
    if (window.ethereum) {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      signer = provider.getSigner();
      contract = new ethers.Contract(CONTRACT_ADDRESS, SAFE_VOTE_V2_ABI, signer);
      return true;
    } else {
      throw new Error('No Ethereum wallet found');
    }
  } catch (error) {
    console.error('Provider initialization failed:', error);
    throw error;
  }
};

export const getProvider = () => provider;
export const getSigner = () => signer;
export const getContract = () => contract;
export const isContractReady = () => {
  return contract !== null && signer !== null;
};

export const getCurrentAccount = async () => {
  if (!signer) await initializeProvider();
  return await signer.getAddress();
};

export const getTotalElections = async () => {
  try {
    if (!contract) await initializeProvider();
    const total = await contract.getTotalElections();
    return total.toNumber();
  } catch (error) {
    console.error('Error getting total elections:', error);
    throw error;
  }
};

export const getElection = async (electionId) => {
  try {
    if (!contract) await initializeProvider();
    const election = await contract.getElection(electionId);

    return {
      electionId: election.electionId_.toNumber(),
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
      positions: election.positions,
    };
  } catch (error) {
    console.error('Error getting election:', error);
    throw error;
  }
};

// Check if voter has already voted
export const hasVoted = async (uuidElectionId, voterKey) => {
  try {
    if (!contract) await initializeProvider();

    // Get on-chain election ID
    const onChainElectionId = await getOnChainElectionId(uuidElectionId);

    const keyHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes32'],
        [onChainElectionId, voterKey]
      )
    );

    const used = await contract.usedVoterKeys(onChainElectionId, keyHash);
    console.log(
      `🗳️ Vote check for on-chain ID ${onChainElectionId}: ${used ? 'Already voted' : 'Not voted'}`
    );
    return used;
  } catch (error) {
    console.error('Error checking vote status:', error);
    return false;
  }
};

// ============================================
// CAST VOTE - Main function
// Expects: uuidElectionId (UUID string used for merkle proofs)
// Internally converts to on-chain ID for contract call
// ============================================
export const castVote = async (uuidElectionId, voterKey, merkleProof, votes, delegateTo) => {
  try {
    if (!contract) await initializeProvider();

    console.log(`📤 Casting vote for election UUID: ${uuidElectionId}`);

    // Convert UUID to on-chain ID
    const onChainElectionId = await getOnChainElectionId(uuidElectionId);
    console.log(
      `🔗 Using on-chain election ID: ${onChainElectionId}`
    );

    const delegateAddress = delegateTo || ethers.constants.AddressZero;

    // Call contract with on-chain ID
    const tx = await contract.vote(
      onChainElectionId,
      voterKey,
      merkleProof,
      votes,
      delegateAddress
    );

    console.log(`⏳ Transaction pending: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed: ${receipt.transactionHash}`);

    // Record vote in backend database
    try {
      const currentAddress = await signer.getAddress();
      const chainId = (await provider.getNetwork()).chainId;

      await fetch(`${BACKEND_API}/api/votes/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: uuidElectionId, // Keep UUID for backend records
          voterAddress: currentAddress,
          chainId: chainId,
          voterKey: voterKey,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          onChainElectionId: onChainElectionId, // Also send on-chain ID
        }),
      });
      console.log('✅ Vote recorded in backend database');
    } catch (recordErr) {
      console.warn(
        '⚠️ Failed to record vote in DB (vote is still on-chain):',
        recordErr
      );
    }

    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error('❌ Error casting vote:', error);
    return {
      success: false,
      error: error.message || 'Transaction failed or was rejected',
    };
  }
};

export const getElectionResults = async (electionId, positionIndex) => {
  try {
    if (!contract) await initializeProvider();
    const results = await contract.getElectionResults(electionId, positionIndex);

    return {
      candidates: results.candidates,
      votesCast: results.votesCast.map((v) => v.toNumber()),
    };
  } catch (error) {
    console.error('Error getting results:', error);
    throw error;
  }
};

export const delegateVote = async (electionId, delegateAddress) => {
  try {
    if (!contract) await initializeProvider();

    const tx = await contract.vote(
      electionId,
      ethers.constants.HashZero,
      [],
      [],
      delegateAddress
    );

    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.transactionHash,
    };
  } catch (error) {
    console.error('Error delegating vote:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Initialize on import
if (window.ethereum) {
  initializeProvider().catch(console.error);
}

const votingService = {
  initializeProvider,
  getProvider,
  getSigner,
  getContract,
  isContractReady,
  getCurrentAccount,
  getTotalElections,
  getElection,
  castVote,
  hasVoted,
  getElectionResults,
  delegateVote,
  getOnChainElectionId,
};

export default votingService;