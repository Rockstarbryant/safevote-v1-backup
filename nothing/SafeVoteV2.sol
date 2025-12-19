// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title SafeVoteV2
 * @notice Multichain decentralized voting system with Merkle proof verification
 * @dev V2 Features: Standalone elections, cross-chain coordination, gasless voting, delegation
 */
contract SafeVoteV2 is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // ============ V2 Structs ============

    struct Election {
        uint256 electionId;
        address creator;
        string title;
        string description;
        string location;
        uint256 createdAt;
        uint256 startTime;
        uint256 endTime;
        uint256 totalRegisteredVoters;
        uint256 totalVotesCast;
        bytes32 voterMerkleRoot;
        bool isPublic;
        bool allowAnonymous;
        bool allowDelegation;
        ElectionStatus status;
        Position[] positions;
        mapping(bytes32 => bool) usedVoterKeys;
        mapping(address => bool) hasVoted;
        mapping(address => address) delegations;
        mapping(uint256 => mapping(uint256 => uint256)) votes;
    }

    struct Position {
        string title;
        string[] candidates;
        uint256 maxSelections;
    }

    struct ElectionInfo {
        uint256 electionId;
        address creator;
        string title;
        string description;
        string location;
        uint256 createdAt;
        uint256 startTime;
        uint256 endTime;
        uint256 totalRegisteredVoters;
        uint256 totalVotesCast;
        bytes32 voterMerkleRoot;
        bool isPublic;
        bool allowAnonymous;
        bool allowDelegation;
        ElectionStatus status;
        Position[] positions;
    }

    enum ElectionStatus { Active, Completed, Cancelled }

    uint256 private _electionCounter;
    mapping(uint256 => Election) private elections;
    mapping(uint256 => uint256[]) public creatorElections;
    uint256 public currentChainId;

    event ElectionCreated(uint256 indexed electionId, address indexed creator, string title, uint256 startTime, uint256 endTime, uint256 timestamp);
    event VoteCast(uint256 indexed electionId, bytes32 indexed voterKeyHash, address indexed voter, bool isAnonymous, uint256 chainId, uint256 timestamp);
    event VoteDelegated(uint256 indexed electionId, address indexed delegator, address indexed delegate, uint256 timestamp);
    event ElectionCompleted(uint256 indexed electionId, uint256 totalVotes, uint256 timestamp);
    event ElectionCancelled(uint256 indexed electionId, address indexed creator, uint256 timestamp);
    event BatchVoteSubmitted(uint256 indexed electionId, uint256 voteCount, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    /// @custom:oz-upgrades-validate-as-initializer
    function initialize() public reinitializer(2) {
        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        if (_electionCounter == 0) {
            _electionCounter = 0;
            currentChainId = block.chainid;
        }
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function createElection(
        string memory title,
        string memory description,
        string memory location,
        uint256 startTime,
        uint256 endTime,
        uint256 totalVoters,
        bytes32 voterMerkleRoot,
        bool isPublic,
        bool allowAnonymous,
        bool allowDelegation,
        Position[] memory positions
    ) external whenNotPaused returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(startTime > block.timestamp, "Start time must be future");
        require(endTime > startTime, "End > start");
        require(totalVoters > 0, "Must have voters");
        require(voterMerkleRoot != bytes32(0), "Invalid root");
        require(positions.length > 0, "Need positions");

        _electionCounter++;
        uint256 electionId = _electionCounter;
        Election storage election = elections[electionId];
        election.electionId = electionId;
        election.creator = msg.sender;
        election.title = title;
        election.description = description;
        election.location = location;
        election.createdAt = block.timestamp;
        election.startTime = startTime;
        election.endTime = endTime;
        election.totalRegisteredVoters = totalVoters;
        election.voterMerkleRoot = voterMerkleRoot;
        election.isPublic = isPublic;
        election.allowAnonymous = allowAnonymous;
        election.allowDelegation = allowDelegation;
        election.status = ElectionStatus.Active;

        for (uint256 i = 0; i < positions.length; i++) {
            election.positions.push(positions[i]);
        }

        uint256 creatorHash = uint256(keccak256(abi.encodePacked(msg.sender)));
        creatorElections[creatorHash].push(electionId);
        emit ElectionCreated(electionId, msg.sender, title, startTime, endTime, block.timestamp);
        return electionId;
    }

    function vote(
        uint256 electionId,
        bytes32 voterKey,
        bytes32[] calldata merkleProof,
        uint256[][] calldata votes,
        address delegateTo
    ) external nonReentrant whenNotPaused {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Active, "Not active");
        require(block.timestamp >= election.startTime && block.timestamp <= election.endTime, "Timing");
        require(!election.hasVoted[msg.sender], "Already voted");

        bytes32 leaf = keccak256(abi.encodePacked(voterKey));
        require(MerkleProof.verify(merkleProof, election.voterMerkleRoot, leaf), "Invalid key");
        bytes32 keyHash = keccak256(abi.encodePacked(electionId, voterKey));
        require(!election.usedVoterKeys[keyHash], "Key used");

        if (delegateTo != address(0) && election.allowDelegation) {
            require(delegateTo != msg.sender, "No self-delegate");
            election.delegations[msg.sender] = delegateTo;
            emit VoteDelegated(electionId, msg.sender, delegateTo, block.timestamp);
            return;
        }

        require(votes.length == election.positions.length, "Invalid votes");
        for (uint256 i = 0; i < votes.length; i++) {
            for (uint256 j = 0; j < votes[i].length; j++) {
                require(votes[i][j] < election.positions[i].candidates.length, "Invalid candidate");
                election.votes[i][votes[i][j]]++;
            }
        }

        election.usedVoterKeys[keyHash] = true;
        election.hasVoted[msg.sender] = true;
        election.totalVotesCast++;
        emit VoteCast(electionId, keyHash, election.allowAnonymous ? address(0) : msg.sender, election.allowAnonymous, block.chainid, block.timestamp);
    }

    function submitBatchVotes(
        uint256 electionId,
        bytes32[] calldata voterKeys,
        bytes32[][] calldata merkleProofs,
        uint256[][][] calldata votesBatch
    ) external nonReentrant whenNotPaused {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Active, "Not active");
        require(voterKeys.length == merkleProofs.length && voterKeys.length == votesBatch.length, "Length mismatch");

        uint256 successCount = 0;
        for (uint256 i = 0; i < voterKeys.length; i++) {
            bytes32 keyHash = keccak256(abi.encodePacked(electionId, voterKeys[i]));
            if (election.usedVoterKeys[keyHash]) continue;

            bytes32 leaf = keccak256(abi.encodePacked(voterKeys[i]));
            if (!MerkleProof.verify(merkleProofs[i], election.voterMerkleRoot, leaf)) continue;

            uint256[][] memory votes = votesBatch[i];
            if (votes.length != election.positions.length) continue;

            bool valid = true;
            for (uint256 j = 0; j < votes.length && valid; j++) {
                for (uint256 k = 0; k < votes[j].length; k++) {
                    if (votes[j][k] >= election.positions[j].candidates.length) { valid = false; break; }
                }
            }
            if (!valid) continue;

            for (uint256 j = 0; j < votes.length; j++) {
                for (uint256 k = 0; k < votes[j].length; k++) {
                    election.votes[j][votes[j][k]]++;
                }
            }

            election.usedVoterKeys[keyHash] = true;
            election.totalVotesCast++;
            successCount++;
        }
        require(successCount > 0, "No valid votes");
        emit BatchVoteSubmitted(electionId, successCount, block.timestamp);
    }

    function completeElection(uint256 electionId) external {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Active && block.timestamp > election.endTime, "Cannot complete");
        election.status = ElectionStatus.Completed;
        emit ElectionCompleted(electionId, election.totalVotesCast, block.timestamp);
    }

    function cancelElection(uint256 electionId) external {
        Election storage election = elections[electionId];
        require(msg.sender == election.creator && election.status == ElectionStatus.Active, "Cannot cancel");
        election.status = ElectionStatus.Cancelled;
        emit ElectionCancelled(electionId, msg.sender, block.timestamp);
    }

    function deleteElection(uint256 electionId) external {
        Election storage election = elections[electionId];
        require(msg.sender == election.creator, "Not creator");
        require(election.status != ElectionStatus.Active, "Still active");
        delete elections[electionId];
    }

    function getElection(uint256 electionId) external view returns (ElectionInfo memory) {
        Election storage election = elections[electionId];
        require(election.creator != address(0), "Not found");
        return ElectionInfo({
            electionId: election.electionId, creator: election.creator, title: election.title,
            description: election.description, location: election.location, createdAt: election.createdAt,
            startTime: election.startTime, endTime: election.endTime, totalRegisteredVoters: election.totalRegisteredVoters,
            totalVotesCast: election.totalVotesCast, voterMerkleRoot: election.voterMerkleRoot,
            isPublic: election.isPublic, allowAnonymous: election.allowAnonymous,
            allowDelegation: election.allowDelegation, status: election.status, positions: election.positions
        });
    }

    function getElectionResults(uint256 electionId, uint256 positionIndex) external view returns (string[] memory, uint256[] memory) {
        Election storage election = elections[electionId];
        require(positionIndex < election.positions.length, "Invalid position");
        Position storage position = election.positions[positionIndex];
        uint256[] memory voteCounts = new uint256[](position.candidates.length);
        for (uint256 i = 0; i < position.candidates.length; i++) {
            voteCounts[i] = election.votes[positionIndex][i];
        }
        return (position.candidates, voteCounts);
    }

    function hasVoted(uint256 electionId, address voter) external view returns (bool) {
        return elections[electionId].hasVoted[voter];
    }

    function getCreatorElections(address creator) external view returns (uint256[] memory) {
        return creatorElections[uint256(keccak256(abi.encodePacked(creator)))];
    }

    function getTotalElections() external view returns (uint256) { return _electionCounter; }
    function version() external pure returns (string memory) { return "2.0.0"; }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}