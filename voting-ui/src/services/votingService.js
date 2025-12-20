import { ethers } from 'ethers';
import { SAFE_VOTE_V2_ABI } from '../utils/SafeVoteV2ABI';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
// const CHAIN_ID = parseInt(process.env.REACT_APP_CHAIN_ID || '421614'); // ← Removed unused variable

let provider = null;
let signer = null;
let contract = null;

// Initialize provider
export const initializeProvider = async () => {
  try {
    if (window.ethereum) {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
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

// Get provider
export const getProvider = () => provider;

// Get signer
export const getSigner = () => signer;

// Get contract
export const getContract = () => contract;

// Check if contract is ready
export const isContractReady = () => {
  return contract !== null && signer !== null;
};

// Get current account
export const getCurrentAccount = async () => {
  if (!signer) await initializeProvider();
  return await signer.getAddress();
};

// Get total elections
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

// Get election details
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
      positions: election.positions
    };
  } catch (error) {
    console.error('Error getting election:', error);
    throw error;
  }
};

// Check if this voter has already voted in this election (using key hash)
export const hasVoted = async (electionId, voterKey) => {
  try {
    if (!contract) await initializeProvider();

    // The contract uses keccak256(electionId, voterKey) as the key hash
    const keyHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes32'],
        [electionId, voterKey]
      )
    );

    const used = await contract.usedVoterKeys(electionId, keyHash);
    return used;
  } catch (error) {
    console.error('Error checking vote status:', error);
    // On error, assume not voted (safe default)
    return false;
  }
};

// Cast vote
export const castVote = async (electionId, voterKey, merkleProof, votes, delegateTo) => {
  try {
    if (!contract) await initializeProvider();
    
    const delegateAddress = delegateTo || ethers.constants.AddressZero;
    
    const tx = await contract.vote(
      electionId,
      voterKey,
      merkleProof,
      votes,
      delegateAddress
    );
    
    const receipt = await tx.wait();
    
    // === SUCCESS: Record vote in backend database ===
    try {
      const currentAddress = await signer.getAddress();
      const chainId = (await provider.getNetwork()).chainId;

      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/votes/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: electionId,           // UUID
          voterAddress: currentAddress,
          chainId: chainId,
          voterKey: voterKey,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber
        })
      });
      console.log('Vote recorded in backend database');
    } catch (recordErr) {
      console.warn('Failed to record vote in DB (vote is still on-chain):', recordErr);
      // Don't fail the whole vote — on-chain is what matters
    }

    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Error casting vote:', error);
    return {
      success: false,
      error: error.message || 'Transaction failed or was rejected'
    };
  }
};

// Get election results
export const getElectionResults = async (electionId, positionIndex) => {
  try {
    if (!contract) await initializeProvider();
    const results = await contract.getElectionResults(electionId, positionIndex);
    
    return {
      candidates: results.candidates,
      votesCast: results.votesCast.map(v => v.toNumber())
    };
  } catch (error) {
    console.error('Error getting results:', error);
    throw error;
  }
};

// Delegate vote
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
      transactionHash: receipt.transactionHash
    };
  } catch (error) {
    console.error('Error delegating vote:', error);
    return {
      success: false,
      error: error.message
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
  delegateVote
};

export default votingService;