// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./SafeVote.sol";

/**
 * @title BatchVoteSubmitter
 * @notice Enables gasless voting by aggregating votes and submitting in batches
 * @dev Users sign votes off-chain, relayer submits to this contract
 */
contract BatchVoteSubmitter {
    SafeVote public safeVote;
    
    mapping(address => uint256) public nonces;
    mapping(bytes32 => bool) public processedVotes;
    
    // Relayer addresses authorized to submit batches
    mapping(address => bool) public authorizedRelayers;
    address public owner;
    
    event VoteQueued(address indexed voter, uint256 indexed electionId, bytes32 voteHash);
    event BatchProcessed(uint256 indexed electionId, uint256 voteCount, address indexed relayer);
    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);
    
    struct SignedVote {
        uint256 electionId;
        bytes32 voterKey;
        bytes32[] merkleProof;
        uint256[][] votes;
        address voter;
        uint256 nonce;
        bytes signature;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyRelayer() {
        require(authorizedRelayers[msg.sender], "Not authorized relayer");
        _;
    }
    
    constructor(address _safeVoteAddress) {
        safeVote = SafeVote(_safeVoteAddress);
        owner = msg.sender;
        authorizedRelayers[msg.sender] = true;
    }
    
    /**
     * @notice Submit a batch of signed votes
     * @param signedVotes Array of signed vote structs
     */
    function submitBatch(SignedVote[] calldata signedVotes) external onlyRelayer {
        require(signedVotes.length > 0 && signedVotes.length <= 100, "Invalid batch size");
        
        uint256 electionId = signedVotes[0].electionId;
        uint256 successCount = 0;
        
        for (uint256 i = 0; i < signedVotes.length; i++) {
            SignedVote calldata sv = signedVotes[i];
            
            // Verify all votes are for same election
            require(sv.electionId == electionId, "Mixed elections");
            
            // Create vote hash (FIXED: properly encode 2D array)
            bytes32 voteHash = hashVote(
                sv.electionId,
                sv.voterKey,
                sv.votes,
                sv.voter,
                sv.nonce
            );
            
            // Check not already processed
            if (processedVotes[voteHash]) continue;
            
            // Verify signature
            if (!verifySignature(voteHash, sv.signature, sv.voter)) continue;
            
            // Verify nonce
            if (nonces[sv.voter] != sv.nonce) continue;
            
            // Mark as processed
            processedVotes[voteHash] = true;
            nonces[sv.voter]++;
            
            // Submit vote to SafeVote contract
            try safeVote.vote(
                sv.electionId,
                sv.voterKey,
                sv.merkleProof,
                sv.votes,
                address(0) // No delegation in batch votes
            ) {
                successCount++;
                emit VoteQueued(sv.voter, sv.electionId, voteHash);
            } catch {
                // Revert processing mark if vote failed
                processedVotes[voteHash] = false;
                nonces[sv.voter]--;
            }
        }
        
        require(successCount > 0, "No valid votes");
        emit BatchProcessed(electionId, successCount, msg.sender);
    }
    
    /**
     * @notice Hash vote data for signing (FIXED VERSION)
     * @dev Uses abi.encode instead of abi.encodePacked to support 2D arrays
     */
    function hashVote(
        uint256 electionId,
        bytes32 voterKey,
        uint256[][] memory votes,
        address voter,
        uint256 nonce
    ) public pure returns (bytes32) {
        // Use abi.encode (supports complex types) then hash
        return keccak256(abi.encode(
            electionId,
            voterKey,
            votes,  // ✅ Now properly supported
            voter,
            nonce
        ));
    }
    
    /**
     * @notice Verify ECDSA signature
     */
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address expectedSigner
    ) public pure returns (bool) {
        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));
        
        address recovered = recoverSigner(ethSignedHash, signature);
        return recovered == expectedSigner;
    }
    
    /**
     * @notice Recover signer from signature
     */
    function recoverSigner(bytes32 ethSignedHash, bytes memory signature) 
        internal 
        pure 
        returns (address) 
    {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature v value");
        
        return ecrecover(ethSignedHash, v, r, s);
    }
    
    /**
     * @notice Add authorized relayer
     */
    function addRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = true;
        emit RelayerAdded(relayer);
    }
    
    /**
     * @notice Remove relayer
     */
    function removeRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = false;
        emit RelayerRemoved(relayer);
    }
    
    /**
     * @notice Get current nonce for voter
     */
    function getNonce(address voter) external view returns (uint256) {
        return nonces[voter];
    }
    
    /**
     * @notice Check if vote hash was processed
     */
    function isVoteProcessed(bytes32 voteHash) external view returns (bool) {
        return processedVotes[voteHash];
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}