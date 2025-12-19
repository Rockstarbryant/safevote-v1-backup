// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title VotingSystem
 * @notice Decentralized organizational voting system with upgradeable architecture
 * @dev Implements UUPS upgradeable pattern with comprehensive voting features
 */
contract VotingSystem is 
    Initializable, 
    OwnableUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable 
{
    // ============ Structs ============
    
    struct Organization {
        string name;
        string ensName;
        address admin;
        bool isPublic;
        bool exists;
        uint256 createdAt;
        uint256 memberCount;
        bytes32 secretKey; // For private orgs
    }

    struct Member {
        address memberAddress;
        uint256 joinedAt;
        bool isActive;
        uint256 votesParticipated;
    }

    enum PollType { YesNo, MultipleChoice, RankedVoting }
    enum PollStatus { Active, Completed, Cancelled }

    struct Poll {
        uint256 pollId;
        uint256 orgId;
        address creator;
        string question;
        PollType pollType;
        string[] options;
        uint256 startTime;
        uint256 endTime;
        uint256 totalVotes;
        uint256 requiredQuorum; // Percentage (0-100)
        uint256 totalVotingKeys;
        bool isAnonymous;
        PollStatus status;
        mapping(bytes32 => bool) usedVotingKeys;
        mapping(uint256 => uint256) voteCounts; // optionIndex => count
        mapping(address => bool) hasVoted;
        mapping(address => bool) authorizedVoters;
        address[] voters;
    }

    struct PollInfo {
        uint256 pollId;
        uint256 orgId;
        address creator;
        string question;
        PollType pollType;
        string[] options;
        uint256 startTime;
        uint256 endTime;
        uint256 totalVotes;
        uint256 requiredQuorum;
        uint256 totalVotingKeys;
        bool isAnonymous;
        PollStatus status;
    }

    // ============ State Variables ============
    
    uint256 private _orgCounter;
    uint256 private _pollCounter;
    
    mapping(uint256 => Organization) public organizations;
    mapping(uint256 => mapping(address => Member)) public orgMembers;
    mapping(uint256 => address[]) public orgMembersList;
    mapping(address => uint256[]) public userOrganizations;
    mapping(uint256 => Poll) private polls;
    mapping(uint256 => uint256[]) public orgPolls;
    
    // ENS Integration
    mapping(string => uint256) public ensToOrgId;
    
    // ============ Events ============
    
    event OrganizationCreated(
        uint256 indexed orgId, 
        string name, 
        address indexed admin, 
        bool isPublic,
        uint256 timestamp
    );
    
    event MemberAdded(
        uint256 indexed orgId, 
        address indexed member, 
        address indexed addedBy,
        uint256 timestamp
    );
    
    event MemberRemoved(
        uint256 indexed orgId, 
        address indexed member, 
        address indexed removedBy,
        uint256 timestamp
    );
    
    event MemberLeft(
        uint256 indexed orgId, 
        address indexed member,
        uint256 timestamp
    );
    
    event PollCreated(
        uint256 indexed pollId,
        uint256 indexed orgId,
        address indexed creator,
        string question,
        PollType pollType,
        uint256 endTime,
        uint256 timestamp
    );
    
    event VoteCast(
        uint256 indexed pollId,
        uint256 indexed orgId,
        address indexed voter,
        uint256 optionIndex,
        uint256 timestamp
    );
    
    event PollCompleted(
        uint256 indexed pollId,
        uint256 indexed orgId,
        uint256 winningOption,
        uint256 winningVotes,
        uint256 timestamp
    );
    
    event VotingKeyGenerated(
        uint256 indexed pollId,
        bytes32 keyHash,
        uint256 timestamp
    );

    event OrganizationVisibilityChanged(
        uint256 indexed orgId,
        bool isPublic,
        uint256 timestamp
    );

    // ============ Modifiers ============
    
    modifier onlyOrgAdmin(uint256 orgId) {
        require(organizations[orgId].exists, "Organization does not exist");
        require(organizations[orgId].admin == msg.sender, "Only admin can perform this action");
        _;
    }
    
    modifier onlyOrgMember(uint256 orgId) {
        require(organizations[orgId].exists, "Organization does not exist");
        require(orgMembers[orgId][msg.sender].isActive, "Not an active member");
        _;
    }
    
    modifier pollExists(uint256 pollId) {
        require(pollId > 0 && pollId <= _pollCounter, "Poll does not exist");
        _;
    }
    
    modifier pollActive(uint256 pollId) {
        Poll storage poll = polls[pollId];
        require(poll.status == PollStatus.Active, "Poll is not active");
        require(block.timestamp >= poll.startTime, "Poll has not started");
        require(block.timestamp <= poll.endTime, "Poll has ended");
        _;
    }

    // ============ Initialization ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _orgCounter = 0;
        _pollCounter = 0;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ Organization Functions ============
    
    /**
     * @notice Create a new organization
     * @param name Organization name
     * @param ensName ENS name (optional, pass empty string if not using)
     * @param isPublic Whether the organization is publicly visible
     * @return orgId The created organization ID
     */
    function createOrganization(
        string memory name,
        string memory ensName,
        bool isPublic
    ) external whenNotPaused returns (uint256) {
        require(bytes(name).length > 0, "Name cannot be empty");
        
        _orgCounter++;
        uint256 orgId = _orgCounter;
        
        bytes32 secretKey = keccak256(abi.encodePacked(
            orgId,
            msg.sender,
            block.timestamp,
            block.prevrandao
        ));
        
        Organization storage org = organizations[orgId];
        org.name = name;
        org.ensName = ensName;
        org.admin = msg.sender;
        org.isPublic = isPublic;
        org.exists = true;
        org.createdAt = block.timestamp;
        org.memberCount = 1;
        org.secretKey = secretKey;
        
        // Add creator as first member
        orgMembers[orgId][msg.sender] = Member({
            memberAddress: msg.sender,
            joinedAt: block.timestamp,
            isActive: true,
            votesParticipated: 0
        });
        
        orgMembersList[orgId].push(msg.sender);
        userOrganizations[msg.sender].push(orgId);
        
        // ENS mapping
        if (bytes(ensName).length > 0) {
            ensToOrgId[ensName] = orgId;
        }
        
        emit OrganizationCreated(orgId, name, msg.sender, isPublic, block.timestamp);
        
        return orgId;
    }
    
    /**
     * @notice Add a single member to an organization
     * @param orgId Organization ID
     * @param member Address to add
     */
    function addMember(uint256 orgId, address member) 
        external 
        onlyOrgMember(orgId) 
        whenNotPaused 
    {
        require(member != address(0), "Invalid address");
        require(!orgMembers[orgId][member].isActive, "Already a member");
        
        orgMembers[orgId][member] = Member({
            memberAddress: member,
            joinedAt: block.timestamp,
            isActive: true,
            votesParticipated: 0
        });
        
        orgMembersList[orgId].push(member);
        userOrganizations[member].push(orgId);
        organizations[orgId].memberCount++;
        
        emit MemberAdded(orgId, member, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Batch add members to organization (gas optimized)
     * @param orgId Organization ID
     * @param members Array of addresses to add
     */
    function batchAddMembers(uint256 orgId, address[] calldata members) 
        external 
        onlyOrgMember(orgId) 
        whenNotPaused 
    {
        require(members.length > 0, "Empty members array");
        require(members.length <= 100, "Too many members at once");
        
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            
            if (member == address(0) || orgMembers[orgId][member].isActive) {
                continue; // Skip invalid or existing members
            }
            
            orgMembers[orgId][member] = Member({
                memberAddress: member,
                joinedAt: block.timestamp,
                isActive: true,
                votesParticipated: 0
            });
            
            orgMembersList[orgId].push(member);
            userOrganizations[member].push(orgId);
            organizations[orgId].memberCount++;
            
            emit MemberAdded(orgId, member, msg.sender, block.timestamp);
        }
    }
    
    /**
     * @notice Remove a member from organization (admin only)
     * @param orgId Organization ID
     * @param member Address to remove
     */
    function removeMember(uint256 orgId, address member) 
        external 
        onlyOrgAdmin(orgId) 
        whenNotPaused 
    {
        require(member != organizations[orgId].admin, "Cannot remove admin");
        require(orgMembers[orgId][member].isActive, "Not an active member");
        
        orgMembers[orgId][member].isActive = false;
        organizations[orgId].memberCount--;
        
        emit MemberRemoved(orgId, member, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Leave an organization voluntarily
     * @param orgId Organization ID
     */
    function leaveOrganization(uint256 orgId) external whenNotPaused {
        require(organizations[orgId].exists, "Organization does not exist");
        require(orgMembers[orgId][msg.sender].isActive, "Not a member");
        require(msg.sender != organizations[orgId].admin, "Admin cannot leave");
        
        orgMembers[orgId][msg.sender].isActive = false;
        organizations[orgId].memberCount--;
        
        emit MemberLeft(orgId, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Change organization visibility
     * @param orgId Organization ID
     * @param isPublic New visibility status
     */
    function setOrganizationVisibility(uint256 orgId, bool isPublic) 
        external 
        onlyOrgAdmin(orgId) 
    {
        organizations[orgId].isPublic = isPublic;
        emit OrganizationVisibilityChanged(orgId, isPublic, block.timestamp);
    }

    // ============ Poll Functions ============
    
    /**
     * @notice Create a new poll
     * @param orgId Organization ID
     * @param question Poll question
     * @param pollType Type of poll (0: YesNo, 1: MultipleChoice, 2: RankedVoting)
     * @param options Array of options (for YesNo, pass ["Yes", "No"])
     * @param durationInSeconds Poll duration
     * @param requiredQuorum Required quorum percentage (0-100)
     * @param numberOfKeys Number of voting keys to generate
     * @param isAnonymous Whether voting is anonymous
     * @return pollId The created poll ID
     */
    function createPoll(
        uint256 orgId,
        string memory question,
        PollType pollType,
        string[] memory options,
        uint256 durationInSeconds,
        uint256 requiredQuorum,
        uint256 numberOfKeys,
        bool isAnonymous
    ) external onlyOrgMember(orgId) whenNotPaused returns (uint256) {
        require(bytes(question).length > 0, "Question cannot be empty");
        require(options.length >= 2, "At least 2 options required");
        require(durationInSeconds >= 60, "Duration must be at least 1 minute");
        require(requiredQuorum <= 100, "Quorum cannot exceed 100%");
        require(numberOfKeys > 0, "Must generate at least 1 key");
        
        _pollCounter++;
        uint256 pollId = _pollCounter;
        
        Poll storage poll = polls[pollId];
        poll.pollId = pollId;
        poll.orgId = orgId;
        poll.creator = msg.sender;
        poll.question = question;
        poll.pollType = pollType;
        poll.options = options;
        poll.startTime = block.timestamp;
        poll.endTime = block.timestamp + durationInSeconds;
        poll.totalVotes = 0;
        poll.requiredQuorum = requiredQuorum;
        poll.totalVotingKeys = numberOfKeys;
        poll.isAnonymous = isAnonymous;
        poll.status = PollStatus.Active;
        
        orgPolls[orgId].push(pollId);
        
        emit PollCreated(
            pollId,
            orgId,
            msg.sender,
            question,
            pollType,
            poll.endTime,
            block.timestamp
        );
        
        return pollId;
    }
    
    /**
     * @notice Generate voting keys for a poll
     * @param pollId Poll ID
     * @return keys Array of generated voting keys
     */
    function generateVotingKeys(uint256 pollId) 
        external 
        pollExists(pollId) 
        returns (bytes32[] memory) 
    {
        Poll storage poll = polls[pollId];
        require(msg.sender == poll.creator, "Only poll creator can generate keys");
        
        bytes32[] memory keys = new bytes32[](poll.totalVotingKeys);
        
        for (uint256 i = 0; i < poll.totalVotingKeys; i++) {
            bytes32 key = keccak256(abi.encodePacked(
                pollId,
                i,
                block.timestamp,
                block.prevrandao,
                msg.sender
            ));
            
            keys[i] = key;
            emit VotingKeyGenerated(pollId, key, block.timestamp);
        }
        
        return keys;
    }
    
    /**
     * @notice Authorize a voter for a specific poll
     * @param pollId Poll ID
     * @param voter Address to authorize
     */
    function authorizeVoter(uint256 pollId, address voter) 
        external 
        pollExists(pollId) 
    {
        Poll storage poll = polls[pollId];
        require(msg.sender == poll.creator, "Only poll creator can authorize voters");
        require(orgMembers[poll.orgId][voter].isActive, "Voter must be org member");
        
        poll.authorizedVoters[voter] = true;
    }
    
    /**
     * @notice Batch authorize voters
     * @param pollId Poll ID
     * @param voters Array of addresses to authorize
     */
    function batchAuthorizeVoters(uint256 pollId, address[] calldata voters) 
        external 
        pollExists(pollId) 
    {
        Poll storage poll = polls[pollId];
        require(msg.sender == poll.creator, "Only poll creator can authorize voters");
        
        for (uint256 i = 0; i < voters.length; i++) {
            if (orgMembers[poll.orgId][voters[i]].isActive) {
                poll.authorizedVoters[voters[i]] = true;
            }
        }
    }
    
    /**
     * @notice Cast a vote
     * @param pollId Poll ID
     * @param optionIndex Index of the option to vote for
     * @param votingKey The voting key provided by poll creator
     */
    function vote(
        uint256 pollId,
        uint256 optionIndex,
        bytes32 votingKey
    ) external pollExists(pollId) pollActive(pollId) nonReentrant whenNotPaused {
        Poll storage poll = polls[pollId];
        
        require(poll.authorizedVoters[msg.sender], "Not authorized to vote");
        require(!poll.hasVoted[msg.sender], "Already voted");
        require(!poll.usedVotingKeys[votingKey], "Voting key already used");
        require(optionIndex < poll.options.length, "Invalid option");
        
        // Mark key as used and voter as voted
        poll.usedVotingKeys[votingKey] = true;
        poll.hasVoted[msg.sender] = true;
        poll.voteCounts[optionIndex]++;
        poll.totalVotes++;
        poll.voters.push(msg.sender);
        
        // Update member stats
        orgMembers[poll.orgId][msg.sender].votesParticipated++;
        
        emit VoteCast(pollId, poll.orgId, msg.sender, optionIndex, block.timestamp);
        
        // Auto-complete poll if ended
        if (block.timestamp > poll.endTime) {
            _completePoll(pollId);
        }
    }
    
    /**
     * @notice Complete a poll (can be called by anyone after end time)
     * @param pollId Poll ID
     */
    function completePoll(uint256 pollId) external pollExists(pollId) {
        Poll storage poll = polls[pollId];
        require(block.timestamp > poll.endTime, "Poll has not ended yet");
        require(poll.status == PollStatus.Active, "Poll already completed");
        
        _completePoll(pollId);
    }
    
    /**
     * @notice Internal function to complete a poll
     * @param pollId Poll ID
     */
    function _completePoll(uint256 pollId) private {
        Poll storage poll = polls[pollId];
        poll.status = PollStatus.Completed;
        
        // Find winning option
        uint256 winningOption = 0;
        uint256 maxVotes = 0;
        
        for (uint256 i = 0; i < poll.options.length; i++) {
            if (poll.voteCounts[i] > maxVotes) {
                maxVotes = poll.voteCounts[i];
                winningOption = i;
            }
        }
        
        emit PollCompleted(pollId, poll.orgId, winningOption, maxVotes, block.timestamp);
    }

    // ============ View Functions ============
    
    /**
     * @notice Get organization details
     * @param orgId Organization ID
     */
    function getOrganization(uint256 orgId) 
        external 
        view 
        returns (
            string memory name,
            string memory ensName,
            address admin,
            bool isPublic,
            uint256 createdAt,
            uint256 memberCount
        ) 
    {
        Organization storage org = organizations[orgId];
        require(org.exists, "Organization does not exist");
        
        return (
            org.name,
            org.ensName,
            org.admin,
            org.isPublic,
            org.createdAt,
            org.memberCount
        );
    }
    
    /**
     * @notice Get organization secret key (admin only)
     * @param orgId Organization ID
     */
    function getOrganizationSecretKey(uint256 orgId) 
        external 
        view 
        onlyOrgAdmin(orgId) 
        returns (bytes32) 
    {
        return organizations[orgId].secretKey;
    }
    
    /**
     * @notice Verify private organization access
     * @param orgId Organization ID
     * @param secretKey Secret key to verify
     */
    function verifyPrivateOrgAccess(uint256 orgId, bytes32 secretKey) 
        external 
        view 
        returns (bool) 
    {
        return organizations[orgId].secretKey == secretKey;
    }
    
    /**
     * @notice Get all public organizations
     */
    function getPublicOrganizations() external view returns (uint256[] memory) {
        uint256 publicCount = 0;
        
        // Count public orgs
        for (uint256 i = 1; i <= _orgCounter; i++) {
            if (organizations[i].exists && organizations[i].isPublic) {
                publicCount++;
            }
        }
        
        uint256[] memory publicOrgs = new uint256[](publicCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= _orgCounter; i++) {
            if (organizations[i].exists && organizations[i].isPublic) {
                publicOrgs[index] = i;
                index++;
            }
        }
        
        return publicOrgs;
    }
    
    /**
     * @notice Get organization members list
     * @param orgId Organization ID
     */
    function getOrganizationMembers(uint256 orgId) 
        external 
        view 
        returns (address[] memory) 
    {
        require(organizations[orgId].exists, "Organization does not exist");
        return orgMembersList[orgId];
    }
    
    /**
     * @notice Get member details
     * @param orgId Organization ID
     * @param member Member address
     */
    function getMemberInfo(uint256 orgId, address member) 
        external 
        view 
        returns (
            uint256 joinedAt,
            bool isActive,
            uint256 votesParticipated
        ) 
    {
        Member storage m = orgMembers[orgId][member];
        return (m.joinedAt, m.isActive, m.votesParticipated);
    }
    
    /**
     * @notice Get user's organizations
     * @param user User address
     */
    function getUserOrganizations(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userOrganizations[user];
    }
    
    /**
     * @notice Get poll details
     * @param pollId Poll ID
     */
    function getPoll(uint256 pollId) 
        external 
        view 
        pollExists(pollId) 
        returns (PollInfo memory) 
    {
        Poll storage poll = polls[pollId];
        
        return PollInfo({
            pollId: poll.pollId,
            orgId: poll.orgId,
            creator: poll.creator,
            question: poll.question,
            pollType: poll.pollType,
            options: poll.options,
            startTime: poll.startTime,
            endTime: poll.endTime,
            totalVotes: poll.totalVotes,
            requiredQuorum: poll.requiredQuorum,
            totalVotingKeys: poll.totalVotingKeys,
            isAnonymous: poll.isAnonymous,
            status: poll.status
        });
    }
    
    /**
     * @notice Get poll results
     * @param pollId Poll ID
     */
    function getPollResults(uint256 pollId) 
        external 
        view 
        pollExists(pollId) 
        returns (
            string[] memory options,
            uint256[] memory votes,
            uint256 totalVotes,
            PollStatus status,
            bool quorumMet
        ) 
    {
        Poll storage poll = polls[pollId];
        
        uint256[] memory voteCounts = new uint256[](poll.options.length);
        for (uint256 i = 0; i < poll.options.length; i++) {
            voteCounts[i] = poll.voteCounts[i];
        }
        
        uint256 orgMemberCount = organizations[poll.orgId].memberCount;
        uint256 requiredVotes = (orgMemberCount * poll.requiredQuorum) / 100;
        bool metQuorum = poll.totalVotes >= requiredVotes;
        
        return (
            poll.options,
            voteCounts,
            poll.totalVotes,
            poll.status,
            metQuorum
        );
    }
    
    /**
     * @notice Check if address has voted
     * @param pollId Poll ID
     * @param voter Voter address
     */
    function hasVoted(uint256 pollId, address voter) 
        external 
        view 
        pollExists(pollId) 
        returns (bool) 
    {
        return polls[pollId].hasVoted[voter];
    }
    
    /**
     * @notice Check if voter is authorized
     * @param pollId Poll ID
     * @param voter Voter address
     */
    function isAuthorizedVoter(uint256 pollId, address voter) 
        external 
        view 
        pollExists(pollId) 
        returns (bool) 
    {
        return polls[pollId].authorizedVoters[voter];
    }
    
    /**
     * @notice Get organization polls
     * @param orgId Organization ID
     */
    function getOrganizationPolls(uint256 orgId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return orgPolls[orgId];
    }
    
    /**
     * @notice Get poll voters (non-anonymous polls only)
     * @param pollId Poll ID
     */
    function getPollVoters(uint256 pollId) 
        external 
        view 
        pollExists(pollId) 
        returns (address[] memory) 
    {
        Poll storage poll = polls[pollId];
        require(!poll.isAnonymous, "Poll is anonymous");
        return poll.voters;
    }
    
    /**
     * @notice Get total organizations count
     */
    function getTotalOrganizations() external view returns (uint256) {
        return _orgCounter;
    }
    
    /**
     * @notice Get total polls count
     */
    function getTotalPolls() external view returns (uint256) {
        return _pollCounter;
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Get contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}