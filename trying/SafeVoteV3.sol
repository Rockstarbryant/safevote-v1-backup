// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title SafeVoteV2 - Full V1 + V2 Compatibility
 * @notice Complete backward compatibility with V1 (all functions/events) + full V2 election features
 * @dev Storage layout: V1 storage first (unchanged order) → V2 storage after
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

    mapping(uint256 => Organization) public organizations;
    mapping(uint256 => mapping(address => Member)) public orgMembers;
    mapping(uint256 => address[]) public orgMembersList;
    mapping(address => uint256[]) public userOrganizations;
    mapping(uint256 => Poll) private polls;
    mapping(uint256 => uint256[]) public orgPolls;

    // ENS Integration
    mapping(string => uint256) public ensToOrgId;

    // ============ V2 Storage (NEW - ADDED AFTER V1) ============

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
        Position[] positions;
    }

    enum ElectionStatus { Active, Completed, Cancelled }

    mapping(uint256 => Election) private elections;
    mapping(uint256 => uint256[]) public creatorElections;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => uint256))) public electionVotes; // electionId => positionIndex => candidateIndex => votes
    mapping(uint256 => mapping(bytes32 => bool)) public usedVoterKeys;
    mapping(uint256 => mapping(address => address)) public delegations;

    uint256 public currentChainId;

    // ============ V1 Events (FULLY PRESERVED) ============

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

    // ============ V2 Events ============

    event ElectionCreatedV2(
        uint256 indexed electionId,
        address indexed creator,
        string title,
        uint256 startTime,
        uint256 endTime,
        uint256 timestamp
    );

    event VoteCastV2(
        uint256 indexed electionId,
        bytes32 indexed voterKeyHash,
        address indexed voter,
        bool isAnonymous,
        uint256 chainId,
        uint256 timestamp
    );

    event VoteDelegatedV2(
        uint256 indexed electionId,
        address indexed delegator,
        address indexed delegate,
        uint256 timestamp
    );

    event ElectionCompletedV2(
        uint256 indexed electionId,
        uint256 totalVotes,
        uint256 timestamp
    );

    event ElectionCancelledV2(
        uint256 indexed electionId,
        address indexed creator,
        uint256 timestamp
    );

    event BatchVoteSubmittedV2(
        uint256 indexed electionId,
        uint256 voteCount,
        uint256 timestamp
    );

    // ============ Modifiers (V1) ============

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

    // ============ Constructor & Initializer ============

    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        currentChainId = block.chainid;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ V1 FULL FUNCTIONS (ALL INCLUDED) ============

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

        orgMembers[orgId][msg.sender] = Member({
            memberAddress: msg.sender,
            joinedAt: block.timestamp,
            isActive: true,
            votesParticipated: 0
        });

        orgMembersList[orgId].push(msg.sender);
        userOrganizations[msg.sender].push(orgId);

        if (bytes(ensName).length > 0) {
            ensToOrgId[ensName] = orgId;
        }

        emit OrganizationCreated(orgId, name, msg.sender, isPublic, block.timestamp);

        return orgId;
    }

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
                continue;
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

    function leaveOrganization(uint256 orgId) external whenNotPaused {
        require(organizations[orgId].exists, "Organization does not exist");
        require(orgMembers[orgId][msg.sender].isActive, "Not a member");
        require(msg.sender != organizations[orgId].admin, "Admin cannot leave");

        orgMembers[orgId][msg.sender].isActive = false;
        organizations[orgId].memberCount--;

        emit MemberLeft(orgId, msg.sender, block.timestamp);
    }

    function setOrganizationVisibility(uint256 orgId, bool isPublic) 
        external 
        onlyOrgAdmin(orgId) 
    {
        organizations[orgId].isPublic = isPublic;
        emit OrganizationVisibilityChanged(orgId, isPublic, block.timestamp);
    }

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

    function authorizeVoter(uint256 pollId, address voter) 
        external 
        pollExists(pollId) 
    {
        Poll storage poll = polls[pollId];
        require(msg.sender == poll.creator, "Only poll creator can authorize voters");
        require(orgMembers[poll.orgId][voter].isActive, "Voter must be org member");

        poll.authorizedVoters[voter] = true;
    }

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

    // V1 vote (overloaded with V2 vote)
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

        poll.usedVotingKeys[votingKey] = true;
        poll.hasVoted[msg.sender] = true;
        poll.voteCounts[optionIndex]++;
        poll.totalVotes++;
        poll.voters.push(msg.sender);

        orgMembers[poll.orgId][msg.sender].votesParticipated++;

        emit VoteCast(pollId, poll.orgId, msg.sender, optionIndex, block.timestamp);

        if (block.timestamp > poll.endTime) {
            _completePoll(pollId);
        }
    }

    function completePoll(uint256 pollId) external pollExists(pollId) {
        Poll storage poll = polls[pollId];
        require(block.timestamp > poll.endTime, "Poll has not ended yet");
        require(poll.status == PollStatus.Active, "Poll already completed");

        _completePoll(pollId);
    }

    function _completePoll(uint256 pollId) private {
        Poll storage poll = polls[pollId];
        poll.status = PollStatus.Completed;

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

    // ============ V1 View Functions (ALL INCLUDED) ============

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

    function getOrganizationSecretKey(uint256 orgId) 
        external 
        view 
        onlyOrgAdmin(orgId) 
        returns (bytes32) 
    {
        return organizations[orgId].secretKey;
    }

    function verifyPrivateOrgAccess(uint256 orgId, bytes32 secretKey) 
        external 
        view 
        returns (bool) 
    {
        return organizations[orgId].secretKey == secretKey;
    }

    function getPublicOrganizations() external view returns (uint256[] memory) {
        uint256 publicCount = 0;

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

    function getOrganizationMembers(uint256 orgId) 
        external 
        view 
        returns (address[] memory) 
    {
        require(organizations[orgId].exists, "Organization does not exist");
        return orgMembersList[orgId];
    }

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

    function getUserOrganizations(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userOrganizations[user];
    }

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

    function hasVoted(uint256 pollId, address voter) 
        external 
        view 
        pollExists(pollId) 
        returns (bool) 
    {
        return polls[pollId].hasVoted[voter];
    }

    function isAuthorizedVoter(uint256 pollId, address voter) 
        external 
        view 
        pollExists(pollId) 
        returns (bool) 
    {
        return polls[pollId].authorizedVoters[voter];
    }

    function getOrganizationPolls(uint256 orgId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return orgPolls[orgId];
    }

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

    function getTotalOrganizations() external view returns (uint256) {
        return _orgCounter;
    }

    function getTotalPolls() external view returns (uint256) {
        return _pollCounter;
    }

    // ============ V2 Election Functions (FROM YOUR LATEST V2 CODE) ============

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

        creatorElections[uint256(keccak256(abi.encodePacked(msg.sender)))].push(electionId);
        
        emit ElectionCreatedV2(electionId, msg.sender, title, startTime, endTime, block.timestamp);
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

        bytes32 leaf = keccak256(abi.encodePacked(voterKey));
        require(MerkleProof.verify(merkleProof, election.voterMerkleRoot, leaf), "Invalid key");
        
        bytes32 keyHash = keccak256(abi.encodePacked(electionId, voterKey));
        require(!usedVoterKeys[electionId][keyHash], "Key used");

        if (delegateTo != address(0) && election.allowDelegation) {
            require(delegateTo != msg.sender, "No self-delegate");
            delegations[electionId][msg.sender] = delegateTo;
            emit VoteDelegatedV2(electionId, msg.sender, delegateTo, block.timestamp);
            return;
        }

        require(votes.length == election.positions.length, "Invalid votes");
        
        for (uint256 i = 0; i < votes.length; i++) {
            for (uint256 j = 0; j < votes[i].length; j++) {
                require(votes[i][j] < election.positions[i].candidates.length, "Invalid candidate");
                electionVotes[electionId][i][votes[i][j]]++;
            }
        }

        usedVoterKeys[electionId][keyHash] = true;
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

    function completeElection(uint256 electionId) external {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Active, "Not active");
        require(block.timestamp > election.endTime, "Not ended");
        
        election.status = ElectionStatus.Completed;
        emit ElectionCompletedV2(electionId, election.totalVotesCast, block.timestamp);
    }

    function cancelElection(uint256 electionId) external {
        Election storage election = elections[electionId];
        require(msg.sender == election.creator, "Not creator");
        require(election.status == ElectionStatus.Active, "Not active");
        
        election.status = ElectionStatus.Cancelled;
        emit ElectionCancelledV2(electionId, msg.sender, block.timestamp);
    }

    function deleteElection(uint256 electionId) external {
        Election storage election = elections[electionId];
        require(msg.sender == election.creator, "Not creator");
        require(election.status != ElectionStatus.Active, "Still active");
        
        delete elections[electionId];
        // Note: positions are stored in election.positions
    }

    function getElection(uint256 electionId) external view returns (
        uint256 electionId_,
        address creator,
        string memory title,
        string memory description,
        string memory location,
        uint256 createdAt,
        uint256 startTime,
        uint256 endTime,
        uint256 totalRegisteredVoters,
        uint256 totalVotesCast,
        bytes32 voterMerkleRoot,
        bool isPublic,
        bool allowAnonymous,
        bool allowDelegation,
        ElectionStatus status,
        Position[] memory positions
    ) {
        Election storage election = elections[electionId];
        require(election.creator != address(0), "Election not found");

        return (
            election.electionId,
            election.creator,
            election.title,
            election.description,
            election.location,
            election.createdAt,
            election.startTime,
            election.endTime,
            election.totalRegisteredVoters,
            election.totalVotesCast,
            election.voterMerkleRoot,
            election.isPublic,
            election.allowAnonymous,
            election.allowDelegation,
            election.status,
            election.positions
        );
    }

    function getElectionResults(uint256 electionId, uint256 positionIndex) 
        external 
        view 
        returns (string[] memory candidates, uint256[] memory votesCast) 
    {
        Election storage election = elections[electionId];
        require(positionIndex < election.positions.length, "Invalid position");

        Position storage position = election.positions[positionIndex];
        uint256[] memory votes = new uint256[](position.candidates.length);

        for (uint256 i = 0; i < position.candidates.length; i++) {
            votes[i] = electionVotes[electionId][positionIndex][i];
        }

        return (position.candidates, votes);
    }

    function getCreatorElections(address creator) external view returns (uint256[] memory) {
        return creatorElections[uint256(keccak256(abi.encodePacked(creator)))];
    }

    function getTotalElections() external view returns (uint256) {
        return _electionCounter;
    }

    // ============ Admin Functions ============

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function version() external pure returns (string memory) {
        return "2.0.0-full";
    }
}