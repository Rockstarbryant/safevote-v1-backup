// SafeVote V2 Contract ABI
// This is the same as SafeVoteV2ABI.js from your documents

export const SAFE_VOTE_V2_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'EnforcedPause',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ExpectedPause',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'voteCount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'BatchVoteSubmittedV2',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'creator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ElectionCancelledV2',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'totalVotes',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ElectionCompletedV2',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'creator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'title',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'startTime',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'endTime',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ElectionCreatedV2',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256',
      },
    ],
    name: 'getElection',
    outputs: [
      {
        internalType: 'uint256',
        name: 'electionId_',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'creator',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'title',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'description',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'location',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'createdAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'startTime',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'endTime',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'totalRegisteredVoters',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'totalVotesCast',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'voterMerkleRoot',
        type: 'bytes32',
      },
      {
        internalType: 'bool',
        name: 'isPublic',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'allowAnonymous',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'allowDelegation',
        type: 'bool',
      },
      {
        internalType: 'uint8',
        name: 'status',
        type: 'uint8',
      },
      {
        components: [
          {
            internalType: 'string',
            name: 'title',
            type: 'string',
          },
          {
            internalType: 'string[]',
            name: 'candidates',
            type: 'string[]',
          },
          {
            internalType: 'uint256',
            name: 'maxSelections',
            type: 'uint256',
          },
        ],
        internalType: 'struct SafeVote.Position[]',
        name: 'positions',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalElections',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'voterKey',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32[]',
        name: 'merkleProof',
        type: 'bytes32[]',
      },
      {
        internalType: 'uint256[][]',
        name: 'votes',
        type: 'uint256[][]',
      },
      {
        internalType: 'address',
        name: 'delegateTo',
        type: 'address',
      },
    ],
    name: 'vote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'usedVoterKeys',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'electionId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'positionIndex',
        type: 'uint256',
      },
    ],
    name: 'getElectionResults',
    outputs: [
      {
        internalType: 'string[]',
        name: 'candidates',
        type: 'string[]',
      },
      {
        internalType: 'uint256[]',
        name: 'votesCast',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

export default SAFE_VOTE_V2_ABI;
