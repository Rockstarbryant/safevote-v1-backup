import { ethers } from 'ethers';
import { SAFE_VOTE_V2_ABI } from '../utils/SafeVoteV2ABI';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';

let provider = null;
let signer = null;
let contract = null;

// Cache UUID → on-chain ID
const onChainIdCache = new Map();

/* ============================================
   HELPERS
============================================ */

const validateBytes32 = (value, name) => {
  if (!value) throw new Error(`${name} is missing`);

  let v = typeof value === 'string' ? value : value.toString();
  if (!v.startsWith('0x')) v = '0x' + v;

  if (!/^0x[0-9a-fA-F]{64}$/.test(v)) {
    throw new Error(`${name} must be bytes32`);
  }

  return v;
};

/* ============================================
   PROVIDER / CONTRACT
============================================ */

export const initializeProvider = async () => {
  if (!window.ethereum) throw new Error('No Ethereum wallet found');

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  signer = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, SAFE_VOTE_V2_ABI, signer);

  return true;
};

export const getProvider = () => provider;
export const getSigner = () => signer;
export const getContract = () => contract;

export const isContractReady = () => contract && signer;

export const getCurrentAccount = async () => {
  if (!signer) await initializeProvider();
  return signer.getAddress();
};

/* ============================================
   ELECTION HELPERS
============================================ */

export const getOnChainElectionId = async (uuid) => {
  if (onChainIdCache.has(uuid)) {
    return onChainIdCache.get(uuid);
  }

  const res = await fetch(
    `${BACKEND_API}/api/elections/${uuid}/onchain-id`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch on-chain ID: ${text}`);
  }

  const { onChainElectionId } = await res.json();
  if (onChainElectionId === null || onChainElectionId === undefined) {
    throw new Error('Election not deployed on-chain');
  }

  onChainIdCache.set(uuid, onChainElectionId);
  return onChainElectionId;
};

export const getTotalElections = async () => {
  if (!contract) await initializeProvider();
  const total = await contract.getTotalElections();
  return total.toNumber();
};

export const getElection = async (electionId) => {
  if (!contract) await initializeProvider();
  return contract.getElection(electionId);
};

/* ============================================
   VOTING STATUS
============================================ */

export const hasVoted = async (electionUuid, voterKey) => {
  try {
    if (!contract) await initializeProvider();

    const onChainElectionId = await getOnChainElectionId(electionUuid);
    const voterKeyBytes32 = validateBytes32(voterKey, 'Voter Key');

    // IMPORTANT: keyHash = keccak256(voterKey)
    const keyHash = ethers.utils.keccak256(voterKeyBytes32);

    return await contract.usedVoterKeys(onChainElectionId, keyHash);
  } catch (err) {
    console.error('Vote check failed:', err);
    return false;
  }
};

/* ============================================
   CAST VOTE (MATCHES keyGenerator.js)
============================================ */

export const castVote = async (
  electionUuid,
  voterKey,
  merkleProof,
  votes,
  delegateTo
) => {
  try {
    if (!contract) await initializeProvider();

    console.log('📤 Casting vote...');
    console.log('Election UUID:', electionUuid);

    const voterKeyBytes32 = validateBytes32(voterKey, 'Voter Key');

    // 🔑 THIS IS THE CRITICAL FIX
    // Backend Merkle tree uses keccak256(voterKey)
    const keyHash = ethers.utils.keccak256(voterKeyBytes32);

    console.log('Voter Key:', voterKeyBytes32);
    console.log('Key Hash (leaf):', keyHash);

    if (!Array.isArray(merkleProof)) {
      throw new Error('Merkle proof must be an array');
    }

    if (!Array.isArray(votes)) {
      throw new Error('Votes must be an array');
    }

    // Convert votes → uint256[][]
    const formattedVotes = votes.map((arr, i) => {
      if (!Array.isArray(arr)) {
        throw new Error(`Votes[${i}] must be an array`);
      }
      return arr.map(v => ethers.BigNumber.from(v));
    });

    const onChainElectionId = await getOnChainElectionId(electionUuid);
    const delegateAddress =
      delegateTo && delegateTo !== ethers.constants.AddressZero
        ? delegateTo
        : ethers.constants.AddressZero;

    console.log('On-chain election ID:', onChainElectionId);
    console.log('Merkle proof length:', merkleProof.length);
    console.log('Votes:', formattedVotes);
    console.log('Delegate:', delegateAddress);

    const tx = await contract.vote(
      onChainElectionId,
      keyHash,            // 🔥 HASHED KEY (MATCHES MERKLE TREE)
      merkleProof,
      formattedVotes,
      delegateAddress,
      { gasLimit: 800000 }
    );

    console.log('⏳ TX pending:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ TX confirmed:', receipt.transactionHash);

    // Record vote off-chain (best-effort)
    try {
      const address = await signer.getAddress();
      const { chainId } = await provider.getNetwork();

      await fetch(`${BACKEND_API}/api/votes/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: electionUuid,
          voterAddress: address,
          chainId,
          voterKeyHash: keyHash,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          onChainElectionId
        })
      });
    } catch (dbErr) {
      console.warn('Vote recorded on-chain but DB update failed:', dbErr);
    }

    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('❌ Error casting vote:', error);
    return {
      success: false,
      error: error.reason || error.message || 'Transaction failed'
    };
  }
};

/* ============================================
   RESULTS
============================================ */

export const getElectionResults = async (electionId, positionIndex) => {
  if (!contract) await initializeProvider();
  const res = await contract.getElectionResults(electionId, positionIndex);
  return {
    candidates: res.candidates,
    votesCast: res.votesCast.map(v => v.toNumber())
  };
};

/* ============================================
   DELEGATION
============================================ */

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
    return { success: true, transactionHash: receipt.transactionHash };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/* ============================================
   AUTO INIT
============================================ */

if (window.ethereum) {
  initializeProvider().catch(console.error);
}

export default {
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
  getOnChainElectionId
};

