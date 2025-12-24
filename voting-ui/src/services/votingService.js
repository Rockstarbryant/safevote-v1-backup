import { ethers } from 'ethers';
import { SAFE_VOTE_V2_ABI } from '../utils/SafeVoteV2ABI';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';
const KEYGEN_API = process.env.REACT_APP_KEYGEN_API || 'http://localhost:3001';

let provider = null;
let signer = null;
let contract = null;

// Cache UUID → on-chain ID
const onChainIdCache = new Map();

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
    console.log(`Cache hit for on-chain ID: ${uuid}`);
    return onChainIdCache.get(uuid);
  }

  console.log(`Fetching on-chain ID for election UUID: ${uuid}`);
  const res = await fetch(`${BACKEND_API}/api/elections/${uuid}/onchain-id`);

  if (!res.ok) {
    const text = await res.text();
    console.error('On-chain ID fetch failed:', text);
    throw new Error(`Failed to fetch on-chain ID: ${text}`);
  }

  const { onChainElectionId } = await res.json();
  if (onChainElectionId === null || onChainElectionId === undefined) {
    throw new Error('Election not deployed on-chain');
  }

  console.log(`On-chain election ID: ${onChainElectionId}`);
  onChainIdCache.set(uuid, onChainElectionId);
  return onChainElectionId;
};

/* ============================================
   GET VOTER DATA WITH MERKLE PROOF
   FIXED: Fetch from keyService instead of context
============================================ */

export const getVoterMerkleData = async (electionId, voterAddress) => {
  console.log(`\n🔐 Fetching voter merkle data from keyService...`);
  console.log(`   Election: ${electionId}`);
  console.log(`   Voter: ${voterAddress.substring(0, 10)}...`);

  try {
    const response = await fetch(
      `${KEYGEN_API}/api/elections/${electionId}/keys/${voterAddress}`
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to fetch voter data');
    }

    const data = await response.json();

    console.log(`✅ Voter data received:`);
    console.log(`   voterKey: ${data.voterKey.substring(0, 20)}...`);
    console.log(`   merkleProof length: ${data.merkleProof.length}`);
    console.log(`   merkleRoot: ${data.merkleRoot.substring(0, 20)}...`);

    return {
      voterKey: data.voterKey,
      merkleProof: data.merkleProof,
      merkleRoot: data.merkleRoot
    };
  } catch (error) {
    console.error('❌ Error fetching voter merkle data:', error.message);
    throw error;
  }
};

/* ============================================
   VOTING STATUS
============================================ */

export const hasVoted = async (electionUuid, voterAddress) => {
  try {
    if (!contract) await initializeProvider();

    const onChainElectionId = await getOnChainElectionId(electionUuid);
    
    // Create voterKeyHash using keccak256(voterKey)
    // But we need to check against the actual key used
    console.log(`Checking if address ${voterAddress} has voted...`);

    // For now, we can't check without the voterKey
    // This would need to be modified based on your contract implementation
    return false;
  } catch (err) {
    console.error('Vote check failed:', err);
    return false;
  }
};

/* ============================================
   CAST VOTE - FIXED VERSION
   
   Contract signature:
   function vote(
     uint256 electionId,
     bytes32 voterKey,           ← random bytes32 from voter_keys table
     bytes32[] calldata merkleProof,
     uint256[][] calldata votes,
     address delegateTo
   )
   
   Merkle verification in contract:
   bytes32 leaf = keccak256(abi.encodePacked(voterKey));
   require(MerkleProof.verify(merkleProof, root, leaf));
============================================ */

export const castVote = async (
  electionUuid,
  voterAddress,
  votes,
  delegateTo
) => {
  try {
    if (!contract) await initializeProvider();

    console.log('\n🗳️ Starting vote submission...');
    console.log('━'.repeat(60));

    // STEP 1: Fetch voter merkle data from keyService
    console.log(`\n📍 Step 1: Fetching voter merkle proof...`);
    const merkleData = await getVoterMerkleData(electionUuid, voterAddress);
    
    const voterKey = merkleData.voterKey;
    const merkleProof = merkleData.merkleProof;

    console.log(`✅ Merkle data retrieved`);

    // STEP 2: Validate inputs
    console.log(`\n📍 Step 2: Validating parameters...`);

    if (!ethers.utils.isHexString(voterKey, 32)) {
      throw new Error(`Invalid voterKey format: ${voterKey}`);
    }

    if (!Array.isArray(merkleProof)) {
      throw new Error('Merkle proof must be an array');
    }

    console.log(`   voterKey: ${voterKey.substring(0, 20)}...`);
    console.log(`   merkleProof length: ${merkleProof.length}`);
    merkleProof.forEach((proof, i) => {
      console.log(`     [${i}] ${proof.substring(0, 20)}...`);
    });

    if (!Array.isArray(votes)) {
      throw new Error('Votes must be an array');
    }

    console.log(`   votes: ${JSON.stringify(votes)}`);

    // STEP 3: Format votes as uint256[][]
    console.log(`\n📍 Step 3: Formatting votes...`);
    const formattedVotes = votes.map((arr, i) => {
      if (!Array.isArray(arr)) {
        throw new Error(`Votes[${i}] must be an array`);
      }
      return arr.map(v => ethers.BigNumber.from(v));
    });

    console.log(`✅ Votes formatted: ${JSON.stringify(formattedVotes.map(v => v.map(bn => bn.toString())))}`);

    // STEP 4: Get on-chain election ID
    console.log(`\n📍 Step 4: Fetching on-chain election ID...`);
    const onChainElectionId = await getOnChainElectionId(electionUuid);
    console.log(`✅ On-chain election ID: ${onChainElectionId}`);

    // STEP 5: Prepare delegate address
    console.log(`\n📍 Step 5: Preparing delegate address...`);
    const delegateAddress = delegateTo || ethers.constants.AddressZero;
    console.log(`   Delegate: ${delegateAddress}`);

    // STEP 6: Submit transaction
    console.log(`\n📍 Step 6: Submitting vote transaction...`);
    console.log(`━`.repeat(60));

    const tx = await contract.vote(
      onChainElectionId,           // uint256 electionId
      voterKey,                    // bytes32 voterKey (random from voter_keys table)
      merkleProof,                 // bytes32[] merkleProof
      formattedVotes,              // uint256[][] votes
      delegateAddress,             // address delegateTo
      { 
        gasLimit: 800000,
        gasPrice: ethers.utils.parseUnits('0.05', 'gwei')
      }
    );

    console.log(`📤 TX sent: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);

    const receipt = await tx.wait();

    console.log(`\n✅ TX confirmed!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Hash: ${receipt.transactionHash}`);
    console.log(`━`.repeat(60));

    // STEP 7: Record vote off-chain
    console.log(`\n📍 Step 7: Recording vote in database...`);
    try {
      const { chainId } = await provider.getNetwork();

      const recordResponse = await fetch(`${BACKEND_API}/api/votes/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: electionUuid,
          voterAddress: voterAddress,
          chainId,
          voterKeyHash: ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32'], [voterKey])),
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          onChainElectionId
        })
      });

      if (recordResponse.ok) {
        console.log(`✅ Vote recorded in database`);
      } else {
        console.warn(`⚠️  Failed to record vote: ${await recordResponse.text()}`);
      }
    } catch (dbErr) {
      console.warn('⚠️  Database record failed:', dbErr.message);
    }

    console.log(`\n🎉 Vote submitted successfully!\n`);

    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('\n❌ Error casting vote:', error);
    console.log(`━`.repeat(60));

    return {
      success: false,
      error: error.reason || error.message || 'Transaction failed'
    };
  }
};

/* ============================================
   RESULTS & DELEGATION
============================================ */

export const getElectionResults = async (electionId, positionIndex) => {
  if (!contract) await initializeProvider();
  const res = await contract.getElectionResults(electionId, positionIndex);
  return {
    candidates: res.candidates,
    votesCast: res.votesCast.map(v => v.toNumber())
  };
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
  getOnChainElectionId,
  getVoterMerkleData,
  hasVoted,
  castVote,
  getElectionResults,
  delegateVote
};