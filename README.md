# 🗳️ Decentralized Voting System

A fully on-chain organizational voting system built with Solidity, Hardhat, and vanilla JavaScript. Create organizations, manage members, and conduct transparent, tamper-proof polls on the Ethereum blockchain.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-green.svg)
![Hardhat](https://img.shields.io/badge/Hardhat-2.19-yellow.svg)

## ✨ Features

### 🏢 Organization Management

- **Create Public/Private Organizations** - Full control over visibility
- **Batch Member Addition** - Gas-optimized bulk operations
- **Role-Based Access Control** - Admin, moderator, and member roles
- **ENS Integration** - Use Ethereum Name Service for org names
- **Secret Key Access** - Private organizations with secure key-based access

### 🗳️ Advanced Voting

- **Multiple Poll Types**:
  - Yes/No polls
  - Multiple choice
  - Ranked voting
- **One-Time Voting Keys** - Secure, single-use authentication
- **Anonymous Voting** - Privacy-preserving vote casting
- **Quorum Requirements** - Minimum participation thresholds
- **Time-Bound Polls** - Automatic start/end with countdowns
- **Real-Time Progress** - Live vote counts and participation tracking

### 🔒 Security & Upgradability

- **UUPS Upgradeable Pattern** - Future-proof with OpenZeppelin
- **Pausable** - Emergency circuit breaker
- **ReentrancyGuard** - Protection against reentrancy attacks
- **Access Control** - Granular permissions system
- **Auditable** - All actions recorded on-chain

### ⚡ Gas Optimization

- **Batch Operations** - Add multiple members in one transaction
- **Efficient Storage** - Optimized data structures
- **Event-Driven** - Minimal storage, maximum events

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (HTML/JS)                  │
│  ┌───────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │   Wallet  │  │  Web3.js │  │  Tailwind CSS   │ │
│  │ (MetaMask)│  │(Ethers.js)│  │   Components    │ │
│  └───────────┘  └──────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│            Smart Contract Layer (Solidity)           │
│  ┌──────────────────────────────────────────────┐  │
│  │         VotingSystem.sol (Upgradeable)        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │  │
│  │  │   Orgs   │ │  Members │ │    Polls     │ │  │
│  │  └──────────┘ └──────────┘ └──────────────┘ │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │  │
│  │  │  Voting  │ │   Keys   │ │   Results    │ │  │
│  │  └──────────┘ └──────────┘ └──────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│               Ethereum Blockchain                    │
│          (Sepolia Testnet → Mainnet)                │
└─────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ and npm
- MetaMask browser extension
- Sepolia test ETH (from faucets)
- Alchemy account (free)

### Installation

1. **Clone and Install**

```bash
git clone <your-repo-url>
cd voting-system
npm install
```

2. **Configure Environment**

```bash
cp .env.example .env
# Edit .env with your values
```

3. **Compile Contracts**

```bash
npx hardhat compile
```

4. **Run Tests**

```bash
npx hardhat test
```

5. **Deploy to Sepolia**

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

6. **Launch Frontend**

```bash
cd frontend
python3 -m http.server 8000
# Open http://localhost:8000
```

## 📖 Detailed Documentation

### Smart Contract Functions

#### Organization Functions

```solidity
// Create a new organization
function createOrganization(
    string memory name,
    string memory ensName,
    bool isPublic
) external returns (uint256 orgId)

// Add single member
function addMember(uint256 orgId, address member) external

// Batch add members (gas-optimized)
function batchAddMembers(uint256 orgId, address[] calldata members) external

// Remove member (admin only)
function removeMember(uint256 orgId, address member) external

// Leave organization
function leaveOrganization(uint256 orgId) external

// Change visibility
function setOrganizationVisibility(uint256 orgId, bool isPublic) external
```

#### Poll Functions

```solidity
// Create a poll
function createPoll(
    uint256 orgId,
    string memory question,
    PollType pollType,
    string[] memory options,
    uint256 durationInSeconds,
    uint256 requiredQuorum,
    uint256 numberOfKeys,
    bool isAnonymous
) external returns (uint256 pollId)

// Generate voting keys
function generateVotingKeys(uint256 pollId)
    external returns (bytes32[] memory keys)

// Authorize voter
function authorizeVoter(uint256 pollId, address voter) external

// Batch authorize voters
function batchAuthorizeVoters(uint256 pollId, address[] calldata voters) external

// Cast a vote
function vote(
    uint256 pollId,
    uint256 optionIndex,
    bytes32 votingKey
) external

// Complete poll
function completePoll(uint256 pollId) external
```

#### View Functions

```solidity
// Get organization details
function getOrganization(uint256 orgId) external view returns (...)

// Get public organizations
function getPublicOrganizations() external view returns (uint256[] memory)

// Get user's organizations
function getUserOrganizations(address user) external view returns (uint256[] memory)

// Get poll details
function getPoll(uint256 pollId) external view returns (PollInfo memory)

// Get poll results
function getPollResults(uint256 pollId) external view returns (...)

// Check if voted
function hasVoted(uint256 pollId, address voter) external view returns (bool)
```

### Frontend Integration

```javascript
// Connect wallet
await connectWallet();

// Create organization
const tx = await contract.createOrganization('My Org', '', true);
await tx.wait();

// Create poll
const tx = await contract.createPoll(
  orgId,
  'Should we implement feature X?',
  0, // Yes/No poll
  ['Yes', 'No'],
  86400, // 24 hours
  50, // 50% quorum
  10, // 10 voting keys
  false // Not anonymous
);

// Vote
const tx = await contract.vote(pollId, optionIndex, votingKey);
await tx.wait();
```

## 🧪 Testing

### Run All Tests

```bash
npx hardhat test
```

### Run Specific Test File

```bash
npx hardhat test test/VotingSystem.test.js
```

### Test Coverage

```bash
npx hardhat coverage
```

### Gas Reporter

```bash
REPORT_GAS=true npx hardhat test
```

## 📊 Contract Events

The contract emits comprehensive events for easy indexing:

```solidity
event OrganizationCreated(uint256 indexed orgId, string name, address indexed admin, bool isPublic, uint256 timestamp);
event MemberAdded(uint256 indexed orgId, address indexed member, address indexed addedBy, uint256 timestamp);
event PollCreated(uint256 indexed pollId, uint256 indexed orgId, address indexed creator, string question, PollType pollType, uint256 endTime, uint256 timestamp);
event VoteCast(uint256 indexed pollId, uint256 indexed orgId, address indexed voter, uint256 optionIndex, uint256 timestamp);
event PollCompleted(uint256 indexed pollId, uint256 indexed orgId, uint256 winningOption, uint256 winningVotes, uint256 timestamp);
event VotingKeyGenerated(uint256 indexed pollId, bytes32 keyHash, uint256 timestamp);
```

## 🔐 Security Considerations

### Implemented Security Measures

- ✅ OpenZeppelin battle-tested libraries
- ✅ ReentrancyGuard on all state-changing functions
- ✅ Access control with role-based permissions
- ✅ Pausable for emergency situations
- ✅ One-time use voting keys
- ✅ Time-locked poll execution
- ✅ Input validation on all functions

### Best Practices

- ✅ Follow checks-effects-interactions pattern
- ✅ Use SafeMath operations (built into Solidity 0.8+)
- ✅ Comprehensive event emission
- ✅ Gas-optimized storage patterns
- ✅ Upgradeable architecture (UUPS)

### Pre-Mainnet Checklist

- [ ] Complete security audit
- [ ] Extensive testnet testing
- [ ] Bug bounty program
- [ ] Documentation review
- [ ] Gas optimization review
- [ ] Emergency procedures documented

## 🔄 Upgrading Contracts

The contract uses UUPS (Universal Upgradeable Proxy Standard):

1. **Create New Implementation**

```solidity
// contracts/VotingSystemV2.sol
contract VotingSystemV2 is VotingSystem {
    // Add new features
    function newFeature() external { ... }
}
```

2. **Deploy Upgrade**

```bash
npx hardhat run scripts/upgrade.js --network sepolia
```

3. **Verify Upgrade**

```bash
npx hardhat verify --network sepolia <NEW_IMPLEMENTATION_ADDRESS>
```

## 🌐 Network Configuration

### Sepolia Testnet

- **Chain ID**: 11155111
- **RPC**: https://eth-sepolia.g.alchemy.com/v2/YOUR-KEY
- **Explorer**: https://sepolia.etherscan.io/
- **Faucets**:
  - https://sepoliafaucet.com/
  - https://sepolia-faucet.pk910.de/

### Mainnet (Future)

- **Chain ID**: 1
- **RPC**: https://eth-mainnet.g.alchemy.com/v2/YOUR-KEY
- **Explorer**: https://etherscan.io/

## 📈 Gas Costs

Approximate gas costs on Sepolia (actual costs may vary):

| Operation              | Gas Cost | USD (at $2000 ETH, 30 gwei) |
| ---------------------- | -------- | --------------------------- |
| Create Organization    | ~200,000 | ~$12                        |
| Add Member             | ~50,000  | ~$3                         |
| Batch Add Members (10) | ~300,000 | ~$18                        |
| Create Poll            | ~250,000 | ~$15                        |
| Vote                   | ~80,000  | ~$4.80                      |
| Complete Poll          | ~50,000  | ~$3                         |

## 🛣️ Roadmap

### Phase 1: Core Features ✅

- [x] Organization creation and management
- [x] Member management with batch operations
- [x] Multiple poll types
- [x] One-time voting keys
- [x] Anonymous voting
- [x] Frontend interface

### Phase 2: Advanced Features 🚧

- [ ] Delegation system
- [ ] Weighted voting
- [ ] Multi-signature polls
- [ ] Proposal system with execution
- [ ] Integration with The Graph
- [ ] Mobile app (React Native)

### Phase 3: Enhancement 📋

- [ ] NFT-gated organizations
- [ ] Token-based governance
- [ ] Off-chain voting with on-chain verification
- [ ] Gasless voting (meta-transactions)
- [ ] Advanced analytics dashboard

### Phase 4: Ecosystem 🌍

- [ ] DAO tooling integration
- [ ] Plugin system
- [ ] Third-party integrations
- [ ] Governance marketplace

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write comprehensive tests for new features
- Follow Solidity style guide
- Update documentation
- Add gas optimization notes
- Include security considerations

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenZeppelin** - Secure smart contract libraries
- **Hardhat** - Ethereum development environment
- **Ethers.js** - Web3 library
- **Tailwind CSS** - Utility-first CSS framework
- **Alchemy** - Blockchain infrastructure

## 📞 Support

- **Documentation**: See SETUP_GUIDE.md
- **Issues**: GitHub Issues
- **Discord**: [Coming Soon]
- **Twitter**: [Coming Soon]

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. Always conduct thorough testing and audits before deploying to mainnet.

---

**Built with ❤️ for decentralized governance**

_Star ⭐ this repo if you find it useful!_
