// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title SafeVoteV2 - Storage Compatible Version
 * @notice Preserves V1 storage layout while adding V2 features
 * @dev This version maintains backward compatibility with VotingSystem V1
 * 
 * Storage Layout:
 * - Slots 0-49:   V1 Organization data (_orgCounter, organizations mapping, etc.)
 * - Slots 50+:    V2 Election data (_electionCounter, elections mapping, etc.)
 * 
 * This ensures V1 organizations remain accessible after upgrade!
 */
contract SafeVoteV2 is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // ============ V1 Storage (PRESERVED - DO NOT MODIFY ORDER) ============
    
    uint256 private _orgCounter;
    uint256 private _pollCounter;
    
    struct OrganizationV1 {
        string name;
        string ensName;
        address admin;
        bool isPublic;
        bool exists;
        uint256 createdAt;
        uint256 memberCount;
        bytes32 secretKey;
    }
    
    // V1 mappings - MUST preserve exact order
    mapping(uint256 => OrganizationV1) public organizations;
    mapping(uint256 => mapping(address => bytes)) private __gap_members; // Placeholder for member info
    mapping(uint256 => address[]) public orgMembersList;
    mapping(address => uint256[]) public userOrganizations;
    mapping(string => uint256) public ensToOrgId;
    
    // Storage gaps to reserve space for V1 polls and other data
    uint256[45] private __v1_reserved_gap;
    
    // ============ V2 Storage (NEW - Starts after V1 gap) ============
    
    uint256 private _electionCounter;
    
    struct Position {
        string title;
        string[] candidates;
        uint256 maxSelections;
    }

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

    mapping(uint256 => Election) private elections;
    mapping(uint256 => Position[]) private electionPositions;
    mapping(uint256 => uint256[]) public creatorElections;
    mapping(uint256 => mapping(bytes32 => bool)) private electionUsedKeys;
    mapping(uint256 => mapping(address => bool)) private electionVoters;
    mapping(uint256 => mapping(address => address)) private electionDelegations;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => uint256))) private electionVotes;
    
    uint256 public currentChainId;

    // ============ Events ============
    
    // V1 Events (for backward compatibility if needed)
    event OrganizationCreated(uint256 indexed orgId, string name, address indexed admin, bool isPublic, uint256 timestamp);
    event OrganizationVisibilityChanged(uint256 indexed orgId, bool isPublic, uint256 timestamp);
    event MemberAdded(uint256 indexed orgId, address indexed member, address indexed addedBy, uint256 timestamp);
    event MemberRemoved(uint256 indexed orgId, address indexed member, address indexed removedBy, uint256 timestamp);
    event MemberLeft(uint256 indexed orgId, address indexed member, uint256 timestamp);
    event PollCreated(uint256 indexed pollId, uint256 indexed orgId, address indexed creator, string question, uint8 pollType, uint256 endTime, uint256 timestamp);
    event VoteCastV1(uint256 indexed pollId, uint256 indexed orgId, address indexed voter, uint256 optionIndex, uint256 timestamp);
    event PollCompleted(uint256 indexed pollId, uint256 indexed orgId, uint256 winningOption, uint256 winningVotes, uint256 timestamp);
    event VotingKeyGenerated(uint256 indexed pollId, bytes32 keyHash, uint256 timestamp);
    
    // V2 Events (new, non-conflicting)
    event ElectionCreatedV2(uint256 indexed electionId, address indexed creator, string title, uint256 startTime, uint256 endTime, uint256 timestamp);
    event VoteCastV2(uint256 indexed electionId, bytes32 indexed voterKeyHash, address indexed voter, bool isAnonymous, uint256 chainId, uint256 timestamp);
    event VoteDelegatedV2(uint256 indexed electionId, address indexed delegator, address indexed delegate, uint256 timestamp);
    event ElectionCompletedV2(uint256 indexed electionId, uint256 totalVotes, uint256 timestamp);
    event ElectionCancelledV2(uint256 indexed electionId, address indexed creator, uint256 timestamp);
    event BatchVoteSubmittedV2(uint256 indexed electionId, uint256 voteCount, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @custom:oz-upgrades-validate-as-initializer
    function initialize() public reinitializer(2) {
        // V2 initialization
        // V1 storage (_orgCounter, _pollCounter, organizations) is preserved
        if (currentChainId == 0) {
            currentChainId = block.chainid;
        }
        // Do NOT reinitialize V1 counters - they already exist
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ============ V1 Compatibility - Read-Only Access ============
    
    /**
     * @notice Check if orgId exists as V1 organization
     */
    function isV1Organization(uint256 orgId) public view returns (bool) {
        return organizations[orgId].exists;
    }
    
    /**
     * @notice Get V1 organization count
     */
    function getTotalOrganizations() external view returns (uint256) {
        return _orgCounter;
    }
    
    /**
     * @notice Get V1 organization details (backward compatible)
     */
    function getOrganization(uint256 orgId) external view returns (
        string memory name,
        string memory ensName,
        address admin,
        bool isPublic,
        uint256 createdAt,
        uint256 memberCount
    ) {
        OrganizationV1 storage org = organizations[orgId];
        require(org.exists, "Organization does not exist");
        return (org.name, org.ensName, org.admin, org.isPublic, org.createdAt, org.memberCount);
    }
    
    /**
     * @notice Get all V1 public organizations
     */
    function getPublicOrganizations() external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count public organizations
        for (uint256 i = 1; i <= _orgCounter; i++) {
            if (organizations[i].exists && organizations[i].isPublic) {
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= _orgCounter; i++) {
            if (organizations[i].exists && organizations[i].isPublic) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Get user's V1 organizations
     */
    function getUserOrganizations(address user) external view returns (uint256[] memory) {
        return userOrganizations[user];
    }
    
    /**
     * @notice Get V1 organization members
     */
    function getOrganizationMembers(uint256 orgId) external view returns (address[] memory) {
        require(organizations[orgId].exists, "Organization does not exist");
        return orgMembersList[orgId];
    }

    // ============ V2 Election Functions ============
    
    /**
     * @notice Create a V2 election
     */
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

        // Store positions
        for (uint256 i = 0; i < positions.length; i++) {
            electionPositions[electionId].push(positions[i]);
        }

        uint256 creatorHash = uint256(keccak256(abi.encodePacked(msg.sender)));
        creatorElections[creatorHash].push(electionId);
        
        emit ElectionCreatedV2(electionId, msg.sender, title, startTime, endTime, block.timestamp);
        return electionId;
    }

    /**
     * @notice Vote in a V2 election
     */
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
        require(!electionVoters[electionId][msg.sender], "Already voted");

        bytes32 leaf = keccak256(abi.encodePacked(voterKey));
        require(MerkleProof.verify(merkleProof, election.voterMerkleRoot, leaf), "Invalid key");
        
        bytes32 keyHash = keccak256(abi.encodePacked(electionId, voterKey));
        require(!electionUsedKeys[electionId][keyHash], "Key used");

        // Handle delegation
        if (delegateTo != address(0) && election.allowDelegation) {
            require(delegateTo != msg.sender, "No self-delegate");
            electionDelegations[electionId][msg.sender] = delegateTo;
            emit VoteDelegatedV2(electionId, msg.sender, delegateTo, block.timestamp);
            return;
        }

        // Record votes
        Position[] storage positions = electionPositions[electionId];
        require(votes.length == positions.length, "Invalid votes");
        
        for (uint256 i = 0; i < votes.length; i++) {
            for (uint256 j = 0; j < votes[i].length; j++) {
                require(votes[i][j] < positions[i].candidates.length, "Invalid candidate");
                electionVotes[electionId][i][votes[i][j]]++;
            }
        }

        electionUsedKeys[electionId][keyHash] = true;
        electionVoters[electionId][msg.sender] = true;
        election.totalVotesCast++;
        
        emit VoteCastV2(
            electionId, 
            keyHash, 
            election.allowAnonymous ? address(0) : msg.sender, 
            election.allowAnonymous, 
            block.chainid, 
            block.timestamp
        );
    }

    /**
     * @notice Complete a V2 election
     */
    function completeElection(uint256 electionId) external {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Active, "Not active");
        require(block.timestamp > election.endTime, "Not ended");
        
        election.status = ElectionStatus.Completed;
        emit ElectionCompletedV2(electionId, election.totalVotesCast, block.timestamp);
    }

    /**
     * @notice Cancel a V2 election (creator only)
     */
    function cancelElection(uint256 electionId) external {
        Election storage election = elections[electionId];
        require(msg.sender == election.creator, "Not creator");
        require(election.status == ElectionStatus.Active, "Not active");
        
        election.status = ElectionStatus.Cancelled;
        emit ElectionCancelledV2(electionId, msg.sender, block.timestamp);
    }

    /**
     * @notice Delete a V2 election (creator only, after completion)
     */
    function deleteElection(uint256 electionId) external {
        Election storage election = elections[electionId];
        require(msg.sender == election.creator, "Not creator");
        require(election.status != ElectionStatus.Active, "Still active");
        
        delete elections[electionId];
        delete electionPositions[electionId];
    }

    /**
     * @notice Get V2 election details
     */
    function getElection(uint256 electionId) external view returns (ElectionInfo memory) {
        Election storage election = elections[electionId];
        require(election.creator != address(0), "Election not found");
        
        Position[] storage positions = electionPositions[electionId];
        Position[] memory posArray = new Position[](positions.length);
        for (uint256 i = 0; i < positions.length; i++) {
            posArray[i] = positions[i];
        }
        
        return ElectionInfo({
            electionId: election.electionId,
            creator: election.creator,
            title: election.title,
            description: election.description,
            location: election.location,
            createdAt: election.createdAt,
            startTime: election.startTime,
            endTime: election.endTime,
            totalRegisteredVoters: election.totalRegisteredVoters,
            totalVotesCast: election.totalVotesCast,
            voterMerkleRoot: election.voterMerkleRoot,
            isPublic: election.isPublic,
            allowAnonymous: election.allowAnonymous,
            allowDelegation: election.allowDelegation,
            status: election.status,
            positions: posArray
        });
    }

    /**
     * @notice Get V2 election results for a position
     */
    function getElectionResults(uint256 electionId, uint256 positionIndex) 
        external 
        view 
        returns (string[] memory candidates, uint256[] memory votesCast) 
    {
        Position[] storage positions = electionPositions[electionId];
        require(positionIndex < positions.length, "Invalid position");
        
        Position storage position = positions[positionIndex];
        uint256[] memory votes = new uint256[](position.candidates.length);
        
        for (uint256 i = 0; i < position.candidates.length; i++) {
            votes[i] = electionVotes[electionId][positionIndex][i];
        }
        
        return (position.candidates, votes);
    }

    /**
     * @notice Check if voter has voted in election
     */
    function hasVoted(uint256 electionId, address voter) external view returns (bool) {
        return electionVoters[electionId][voter];
    }

    /**
     * @notice Get elections created by an address
     */
    function getCreatorElections(address creator) external view returns (uint256[] memory) {
        return creatorElections[uint256(keccak256(abi.encodePacked(creator)))];
    }

    /**
     * @notice Get total number of V2 elections
     */
    function getTotalElections() external view returns (uint256) {
        return _electionCounter;
    }

    /**
     * @notice Get contract version
     */
    function version() external pure returns (string memory) {
        return "2.0.1-compatible";
    }

    // ============ Admin Functions ============
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}