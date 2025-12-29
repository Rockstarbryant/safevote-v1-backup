// Auto-generated ABI — Safe for all chains
export const SAFE_VOTE_V2_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
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
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrancyGuardReentrantCall",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "voteCount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "BatchVoteSubmittedV2",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "ElectionCancelledV2",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "totalVotes",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "ElectionCompletedV2",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "startTime",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "ElectionCreatedV2",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "member",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "addedBy",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "MemberAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "member",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "MemberLeft",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "member",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "removedBy",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "MemberRemoved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "OrganizationCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "OrganizationVisibilityChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "winningOption",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "winningVotes",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "PollCompleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "question",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "enum SafeVote.PollType",
          "name": "pollType",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "PollCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "optionIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "VoteCast",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "voterKeyHash",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isAnonymous",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "chainId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "VoteCastV2",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "delegator",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "delegate",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "VoteDelegatedV2",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "keyHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "VotingKeyGenerated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "member",
          "type": "address"
        }
      ],
      "name": "addMember",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "voter",
          "type": "address"
        }
      ],
      "name": "authorizeVoter",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "internalType": "address[]",
          "name": "members",
          "type": "address[]"
        }
      ],
      "name": "batchAddMembers",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        },
        {
          "internalType": "address[]",
          "name": "voters",
          "type": "address[]"
        }
      ],
      "name": "batchAuthorizeVoters",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        }
      ],
      "name": "cancelElection",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        }
      ],
      "name": "completeElection",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        }
      ],
      "name": "completePoll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "location",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "startTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalVoters",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "voterMerkleRoot",
          "type": "bytes32"
        },
        {
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "allowAnonymous",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "allowDelegation",
          "type": "bool"
        },
        {
          "components": [
            {
              "internalType": "string",
              "name": "title",
              "type": "string"
            },
            {
              "internalType": "string[]",
              "name": "candidates",
              "type": "string[]"
            },
            {
              "internalType": "uint256",
              "name": "maxSelections",
              "type": "uint256"
            }
          ],
          "internalType": "struct SafeVote.Position[]",
          "name": "positions",
          "type": "tuple[]"
        }
      ],
      "name": "createElection",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "ensName",
          "type": "string"
        },
        {
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        }
      ],
      "name": "createOrganization",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "question",
          "type": "string"
        },
        {
          "internalType": "enum SafeVote.PollType",
          "name": "pollType",
          "type": "uint8"
        },
        {
          "internalType": "string[]",
          "name": "options",
          "type": "string[]"
        },
        {
          "internalType": "uint256",
          "name": "durationInSeconds",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "requiredQuorum",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "numberOfKeys",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isAnonymous",
          "type": "bool"
        }
      ],
      "name": "createPoll",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "creatorElections",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "currentChainId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "delegations",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        }
      ],
      "name": "deleteElection",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "electionVotes",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "name": "ensToOrgId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        }
      ],
      "name": "generateVotingKeys",
      "outputs": [
        {
          "internalType": "bytes32[]",
          "name": "",
          "type": "bytes32[]"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "creator",
          "type": "address"
        }
      ],
      "name": "getCreatorElections",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        }
      ],
      "name": "getElection",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "electionId_",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "location",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "startTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalRegisteredVoters",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalVotesCast",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "voterMerkleRoot",
          "type": "bytes32"
        },
        {
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "allowAnonymous",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "allowDelegation",
          "type": "bool"
        },
        {
          "internalType": "enum SafeVote.ElectionStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "components": [
            {
              "internalType": "string",
              "name": "title",
              "type": "string"
            },
            {
              "internalType": "string[]",
              "name": "candidates",
              "type": "string[]"
            },
            {
              "internalType": "uint256",
              "name": "maxSelections",
              "type": "uint256"
            }
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
        {
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "positionIndex",
          "type": "uint256"
        }
      ],
      "name": "getElectionResults",
      "outputs": [
        {
          "internalType": "string[]",
          "name": "candidates",
          "type": "string[]"
        },
        {
          "internalType": "uint256[]",
          "name": "votesCast",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "member",
          "type": "address"
        }
      ],
      "name": "getMemberInfo",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "joinedAt",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "votesParticipated",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        }
      ],
      "name": "getOrganization",
      "outputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "ensName",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "memberCount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        }
      ],
      "name": "getOrganizationMembers",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        }
      ],
      "name": "getOrganizationPolls",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        }
      ],
      "name": "getOrganizationSecretKey",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        }
      ],
      "name": "getPoll",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "pollId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "orgId",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "creator",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "question",
              "type": "string"
            },
            {
              "internalType": "enum SafeVote.PollType",
              "name": "pollType",
              "type": "uint8"
            },
            {
              "internalType": "string[]",
              "name": "options",
              "type": "string[]"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "totalVotes",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "requiredQuorum",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "totalVotingKeys",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "isAnonymous",
              "type": "bool"
            },
            {
              "internalType": "enum SafeVote.PollStatus",
              "name": "status",
              "type": "uint8"
            }
          ],
          "internalType": "struct SafeVote.PollInfo",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        }
      ],
      "name": "getPollResults",
      "outputs": [
        {
          "internalType": "string[]",
          "name": "options",
          "type": "string[]"
        },
        {
          "internalType": "uint256[]",
          "name": "votes",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256",
          "name": "totalVotes",
          "type": "uint256"
        },
        {
          "internalType": "enum SafeVote.PollStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "bool",
          "name": "quorumMet",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        }
      ],
      "name": "getPollVoters",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getPublicOrganizations",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalElections",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalOrganizations",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalPolls",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserOrganizations",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "voter",
          "type": "address"
        }
      ],
      "name": "hasVoted",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "voter",
          "type": "address"
        }
      ],
      "name": "isAuthorizedVoter",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        }
      ],
      "name": "leaveOrganization",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "orgMembers",
      "outputs": [
        {
          "internalType": "address",
          "name": "memberAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "joinedAt",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "votesParticipated",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "orgMembersList",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "orgPolls",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "organizations",
      "outputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "ensName",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "exists",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "memberCount",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "secretKey",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
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
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "member",
          "type": "address"
        }
      ],
      "name": "removeMember",
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
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        }
      ],
      "name": "setOrganizationVisibility",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
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
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "usedVoterKeys",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "userOrganizations",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orgId",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "secretKey",
          "type": "bytes32"
        }
      ],
      "name": "verifyPrivateOrgAccess",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "version",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "electionId",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "voterKey",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32[]",
          "name": "merkleProof",
          "type": "bytes32[]"
        },
        {
          "internalType": "uint256[][]",
          "name": "votes",
          "type": "uint256[][]"
        },
        {
          "internalType": "address",
          "name": "delegateTo",
          "type": "address"
        }
      ],
      "name": "vote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "pollId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "optionIndex",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "votingKey",
          "type": "bytes32"
        }
      ],
      "name": "vote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
