// SafeVoteV2ABI.js - FIXED FOR ETHERS V5
// The issue: Position tuple format was incorrect for ethers v5

export const SAFE_VOTE_V2_ABI = [
  // Constructor
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },

  // ============ Errors ============
  {
    "inputs": [],
    "name": "EnforcedPause",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ExpectedPause",
    "type": "error"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"}
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "account", "type": "address"}
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },

  // ============ V2 Events ============
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "electionId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "title", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "endTime", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "ElectionCreatedV2",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "electionId", "type": "uint256"},
      {"indexed": true, "internalType": "bytes32", "name": "voterKeyHash", "type": "bytes32"},
      {"indexed": true, "internalType": "address", "name": "voter", "type": "address"},
      {"indexed": false, "internalType": "bool", "name": "isAnonymous", "type": "bool"},
      {"indexed": false, "internalType": "uint256", "name": "chainId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "VoteCastV2",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "electionId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "delegator", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "delegate", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "VoteDelegatedV2",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "electionId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "totalVotes", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "ElectionCompletedV2",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "electionId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "ElectionCancelledV2",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "electionId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "voteCount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "BatchVoteSubmittedV2",
    "type": "event"
  },

  // ============ OpenZeppelin Events ============
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "previousOwner", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "newOwner", "type": "address"}
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "address", "name": "account", "type": "address"}
    ],
    "name": "Paused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "address", "name": "account", "type": "address"}
    ],
    "name": "Unpaused",
    "type": "event"
  },

  // ============ Election Functions ============
  {
    "inputs": [
      {"internalType": "string", "name": "title", "type": "string"},
      {"internalType": "string", "name": "description", "type": "string"},
      {"internalType": "string", "name": "location", "type": "string"},
      {"internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"internalType": "uint256", "name": "endTime", "type": "uint256"},
      {"internalType": "uint256", "name": "totalVoters", "type": "uint256"},
      {"internalType": "bytes32", "name": "voterMerkleRoot", "type": "bytes32"},
      {"internalType": "bool", "name": "isPublic", "type": "bool"},
      {"internalType": "bool", "name": "allowAnonymous", "type": "bool"},
      {"internalType": "bool", "name": "allowDelegation", "type": "bool"},
      {
        "components": [
          {"internalType": "string", "name": "title", "type": "string"},
          {"internalType": "string[]", "name": "candidates", "type": "string[]"},
          {"internalType": "uint256", "name": "maxSelections", "type": "uint256"}
        ],
        "internalType": "struct SafeVote.Position[]",
        "name": "positions",
        "type": "tuple[]"
      }
    ],
    "name": "createElection",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ⭐ CRITICAL: Vote function for elections (NOT polls)
  {
    "inputs": [
      {"internalType": "uint256", "name": "electionId", "type": "uint256"},
      {"internalType": "bytes32", "name": "voterKey", "type": "bytes32"},
      {"internalType": "bytes32[]", "name": "merkleProof", "type": "bytes32[]"},
      {"internalType": "uint256[][]", "name": "votes", "type": "uint256[][]"},
      {"internalType": "address", "name": "delegateTo", "type": "address"}
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ⭐ CRITICAL: Get election results - THIS WAS THE PROBLEM
  {
    "inputs": [
      {"internalType": "uint256", "name": "electionId", "type": "uint256"},
      {"internalType": "uint256", "name": "positionIndex", "type": "uint256"}
    ],
    "name": "getElectionResults",
    "outputs": [
      {"internalType": "string[]", "name": "candidates", "type": "string[]"},
      {"internalType": "uint256[]", "name": "votesCast", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // ⭐ CRITICAL: Get election - tuple format must be exact
  {
    "inputs": [
      {"internalType": "uint256", "name": "electionId", "type": "uint256"}
    ],
    "name": "getElection",
    "outputs": [
      {"internalType": "uint256", "name": "electionId_", "type": "uint256"},
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "string", "name": "title", "type": "string"},
      {"internalType": "string", "name": "description", "type": "string"},
      {"internalType": "string", "name": "location", "type": "string"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"internalType": "uint256", "name": "endTime", "type": "uint256"},
      {"internalType": "uint256", "name": "totalRegisteredVoters", "type": "uint256"},
      {"internalType": "uint256", "name": "totalVotesCast", "type": "uint256"},
      {"internalType": "bytes32", "name": "voterMerkleRoot", "type": "bytes32"},
      {"internalType": "bool", "name": "isPublic", "type": "bool"},
      {"internalType": "bool", "name": "allowAnonymous", "type": "bool"},
      {"internalType": "bool", "name": "allowDelegation", "type": "bool"},
      {"internalType": "enum SafeVote.ElectionStatus", "name": "status", "type": "uint8"},
      {
        "components": [
          {"internalType": "string", "name": "title", "type": "string"},
          {"internalType": "string[]", "name": "candidates", "type": "string[]"},
          {"internalType": "uint256", "name": "maxSelections", "type": "uint256"}
        ],
        "internalType": "struct SafeVote.Position[]",
        "name": "positions",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "address", "name": "creator", "type": "address"}
    ],
    "name": "getCreatorElections",
    "outputs": [
      {"internalType": "uint256[]", "name": "", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [],
    "name": "getTotalElections",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "uint256", "name": "electionId", "type": "uint256"}
    ],
    "name": "completeElection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "uint256", "name": "electionId", "type": "uint256"}
    ],
    "name": "cancelElection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "uint256", "name": "electionId", "type": "uint256"}
    ],
    "name": "deleteElection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ============ Storage/State Variables ============
  {
    "inputs": [],
    "name": "currentChainId",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "name": "electionVotes",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "bytes32", "name": "", "type": "bytes32"}
    ],
    "name": "usedVoterKeys",
    "outputs": [
      {"internalType": "bool", "name": "", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "name": "delegations",
    "outputs": [
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "name": "creatorElections",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // ============ Admin Functions ============
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {"internalType": "bool", "name": "", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "address", "name": "newOwner", "type": "address"}
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [],
    "name": "version",
    "outputs": [
      {"internalType": "string", "name": "", "type": "string"}
    ],
    "stateMutability": "pure",
    "type": "function"
  }
];


export default SAFE_VOTE_V2_ABI;