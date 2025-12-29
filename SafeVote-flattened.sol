

// Sources flattened with hardhat v2.28.0 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/utils/cryptography/Hashes.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (utils/cryptography/Hashes.sol)

pragma solidity ^0.8.20;

/**
 * @dev Library of standard hash functions.
 *
 * _Available since v5.1._
 */
library Hashes {
    /**
     * @dev Commutative Keccak256 hash of a sorted pair of bytes32. Frequently used when working with merkle proofs.
     *
     * NOTE: Equivalent to the `standardNodeHash` in our https://github.com/OpenZeppelin/merkle-tree[JavaScript library].
     */
    function commutativeKeccak256(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? efficientKeccak256(a, b) : efficientKeccak256(b, a);
    }

    /**
     * @dev Implementation of keccak256(abi.encode(a, b)) that doesn't allocate or expand memory.
     */
    function efficientKeccak256(bytes32 a, bytes32 b) internal pure returns (bytes32 value) {
        assembly ("memory-safe") {
            mstore(0x00, a)
            mstore(0x20, b)
            value := keccak256(0x00, 0x40)
        }
    }
}


// File @openzeppelin/contracts/utils/cryptography/MerkleProof.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/cryptography/MerkleProof.sol)
// This file was procedurally generated from scripts/generate/templates/MerkleProof.js.

pragma solidity ^0.8.20;

/**
 * @dev These functions deal with verification of Merkle Tree proofs.
 *
 * The tree and the proofs can be generated using our
 * https://github.com/OpenZeppelin/merkle-tree[JavaScript library].
 * You will find a quickstart guide in the readme.
 *
 * WARNING: You should avoid using leaf values that are 64 bytes long prior to
 * hashing, or use a hash function other than keccak256 for hashing leaves.
 * This is because the concatenation of a sorted pair of internal nodes in
 * the Merkle tree could be reinterpreted as a leaf value.
 * OpenZeppelin's JavaScript library generates Merkle trees that are safe
 * against this attack out of the box.
 *
 * IMPORTANT: Consider memory side-effects when using custom hashing functions
 * that access memory in an unsafe way.
 *
 * NOTE: This library supports proof verification for merkle trees built using
 * custom _commutative_ hashing functions (i.e. `H(a, b) == H(b, a)`). Proving
 * leaf inclusion in trees built using non-commutative hashing functions requires
 * additional logic that is not supported by this library.
 */
library MerkleProof {
    /**
     *@dev The multiproof provided is not valid.
     */
    error MerkleProofInvalidMultiproof();

    /**
     * @dev Returns true if a `leaf` can be proved to be a part of a Merkle tree
     * defined by `root`. For this, a `proof` must be provided, containing
     * sibling hashes on the branch from the leaf to the root of the tree. Each
     * pair of leaves and each pair of pre-images are assumed to be sorted.
     *
     * This version handles proofs in memory with the default hashing function.
     */
    function verify(bytes32[] memory proof, bytes32 root, bytes32 leaf) internal pure returns (bool) {
        return processProof(proof, leaf) == root;
    }

    /**
     * @dev Returns the rebuilt hash obtained by traversing a Merkle tree up
     * from `leaf` using `proof`. A `proof` is valid if and only if the rebuilt
     * hash matches the root of the tree. When processing the proof, the pairs
     * of leaves & pre-images are assumed to be sorted.
     *
     * This version handles proofs in memory with the default hashing function.
     */
    function processProof(bytes32[] memory proof, bytes32 leaf) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = Hashes.commutativeKeccak256(computedHash, proof[i]);
        }
        return computedHash;
    }

    /**
     * @dev Returns true if a `leaf` can be proved to be a part of a Merkle tree
     * defined by `root`. For this, a `proof` must be provided, containing
     * sibling hashes on the branch from the leaf to the root of the tree. Each
     * pair of leaves and each pair of pre-images are assumed to be sorted.
     *
     * This version handles proofs in memory with a custom hashing function.
     */
    function verify(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf,
        function(bytes32, bytes32) view returns (bytes32) hasher
    ) internal view returns (bool) {
        return processProof(proof, leaf, hasher) == root;
    }

    /**
     * @dev Returns the rebuilt hash obtained by traversing a Merkle tree up
     * from `leaf` using `proof`. A `proof` is valid if and only if the rebuilt
     * hash matches the root of the tree. When processing the proof, the pairs
     * of leaves & pre-images are assumed to be sorted.
     *
     * This version handles proofs in memory with a custom hashing function.
     */
    function processProof(
        bytes32[] memory proof,
        bytes32 leaf,
        function(bytes32, bytes32) view returns (bytes32) hasher
    ) internal view returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = hasher(computedHash, proof[i]);
        }
        return computedHash;
    }

    /**
     * @dev Returns true if a `leaf` can be proved to be a part of a Merkle tree
     * defined by `root`. For this, a `proof` must be provided, containing
     * sibling hashes on the branch from the leaf to the root of the tree. Each
     * pair of leaves and each pair of pre-images are assumed to be sorted.
     *
     * This version handles proofs in calldata with the default hashing function.
     */
    function verifyCalldata(bytes32[] calldata proof, bytes32 root, bytes32 leaf) internal pure returns (bool) {
        return processProofCalldata(proof, leaf) == root;
    }

    /**
     * @dev Returns the rebuilt hash obtained by traversing a Merkle tree up
     * from `leaf` using `proof`. A `proof` is valid if and only if the rebuilt
     * hash matches the root of the tree. When processing the proof, the pairs
     * of leaves & pre-images are assumed to be sorted.
     *
     * This version handles proofs in calldata with the default hashing function.
     */
    function processProofCalldata(bytes32[] calldata proof, bytes32 leaf) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = Hashes.commutativeKeccak256(computedHash, proof[i]);
        }
        return computedHash;
    }

    /**
     * @dev Returns true if a `leaf` can be proved to be a part of a Merkle tree
     * defined by `root`. For this, a `proof` must be provided, containing
     * sibling hashes on the branch from the leaf to the root of the tree. Each
     * pair of leaves and each pair of pre-images are assumed to be sorted.
     *
     * This version handles proofs in calldata with a custom hashing function.
     */
    function verifyCalldata(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf,
        function(bytes32, bytes32) view returns (bytes32) hasher
    ) internal view returns (bool) {
        return processProofCalldata(proof, leaf, hasher) == root;
    }

    /**
     * @dev Returns the rebuilt hash obtained by traversing a Merkle tree up
     * from `leaf` using `proof`. A `proof` is valid if and only if the rebuilt
     * hash matches the root of the tree. When processing the proof, the pairs
     * of leaves & pre-images are assumed to be sorted.
     *
     * This version handles proofs in calldata with a custom hashing function.
     */
    function processProofCalldata(
        bytes32[] calldata proof,
        bytes32 leaf,
        function(bytes32, bytes32) view returns (bytes32) hasher
    ) internal view returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = hasher(computedHash, proof[i]);
        }
        return computedHash;
    }

    /**
     * @dev Returns true if the `leaves` can be simultaneously proven to be a part of a Merkle tree defined by
     * `root`, according to `proof` and `proofFlags` as described in {processMultiProof}.
     *
     * This version handles multiproofs in memory with the default hashing function.
     *
     * CAUTION: Not all Merkle trees admit multiproofs. See {processMultiProof} for details.
     *
     * NOTE: Consider the case where `root == proof[0] && leaves.length == 0` as it will return `true`.
     * The `leaves` must be validated independently. See {processMultiProof}.
     */
    function multiProofVerify(
        bytes32[] memory proof,
        bool[] memory proofFlags,
        bytes32 root,
        bytes32[] memory leaves
    ) internal pure returns (bool) {
        return processMultiProof(proof, proofFlags, leaves) == root;
    }

    /**
     * @dev Returns the root of a tree reconstructed from `leaves` and sibling nodes in `proof`. The reconstruction
     * proceeds by incrementally reconstructing all inner nodes by combining a leaf/inner node with either another
     * leaf/inner node or a proof sibling node, depending on whether each `proofFlags` item is true or false
     * respectively.
     *
     * This version handles multiproofs in memory with the default hashing function.
     *
     * CAUTION: Not all Merkle trees admit multiproofs. To use multiproofs, it is sufficient to ensure that: 1) the tree
     * is complete (but not necessarily perfect), 2) the leaves to be proven are in the opposite order they are in the
     * tree (i.e., as seen from right to left starting at the deepest layer and continuing at the next layer).
     *
     * NOTE: The _empty set_ (i.e. the case where `proof.length == 1 && leaves.length == 0`) is considered a no-op,
     * and therefore a valid multiproof (i.e. it returns `proof[0]`). Consider disallowing this case if you're not
     * validating the leaves elsewhere.
     */
    function processMultiProof(
        bytes32[] memory proof,
        bool[] memory proofFlags,
        bytes32[] memory leaves
    ) internal pure returns (bytes32 merkleRoot) {
        // This function rebuilds the root hash by traversing the tree up from the leaves. The root is rebuilt by
        // consuming and producing values on a queue. The queue starts with the `leaves` array, then goes onto the
        // `hashes` array. At the end of the process, the last hash in the `hashes` array should contain the root of
        // the Merkle tree.
        uint256 leavesLen = leaves.length;
        uint256 proofFlagsLen = proofFlags.length;

        // Check proof validity.
        if (leavesLen + proof.length != proofFlagsLen + 1) {
            revert MerkleProofInvalidMultiproof();
        }

        // The xxxPos values are "pointers" to the next value to consume in each array. All accesses are done using
        // `xxx[xxxPos++]`, which return the current value and increment the pointer, thus mimicking a queue's "pop".
        bytes32[] memory hashes = new bytes32[](proofFlagsLen);
        uint256 leafPos = 0;
        uint256 hashPos = 0;
        uint256 proofPos = 0;
        // At each step, we compute the next hash using two values:
        // - a value from the "main queue". If not all leaves have been consumed, we get the next leaf, otherwise we
        //   get the next hash.
        // - depending on the flag, either another value from the "main queue" (merging branches) or an element from the
        //   `proof` array.
        for (uint256 i = 0; i < proofFlagsLen; i++) {
            bytes32 a = leafPos < leavesLen ? leaves[leafPos++] : hashes[hashPos++];
            bytes32 b = proofFlags[i]
                ? (leafPos < leavesLen ? leaves[leafPos++] : hashes[hashPos++])
                : proof[proofPos++];
            hashes[i] = Hashes.commutativeKeccak256(a, b);
        }

        if (proofFlagsLen > 0) {
            if (proofPos != proof.length) {
                revert MerkleProofInvalidMultiproof();
            }
            unchecked {
                return hashes[proofFlagsLen - 1];
            }
        } else if (leavesLen > 0) {
            return leaves[0];
        } else {
            return proof[0];
        }
    }

    /**
     * @dev Returns true if the `leaves` can be simultaneously proven to be a part of a Merkle tree defined by
     * `root`, according to `proof` and `proofFlags` as described in {processMultiProof}.
     *
     * This version handles multiproofs in memory with a custom hashing function.
     *
     * CAUTION: Not all Merkle trees admit multiproofs. See {processMultiProof} for details.
     *
     * NOTE: Consider the case where `root == proof[0] && leaves.length == 0` as it will return `true`.
     * The `leaves` must be validated independently. See {processMultiProof}.
     */
    function multiProofVerify(
        bytes32[] memory proof,
        bool[] memory proofFlags,
        bytes32 root,
        bytes32[] memory leaves,
        function(bytes32, bytes32) view returns (bytes32) hasher
    ) internal view returns (bool) {
        return processMultiProof(proof, proofFlags, leaves, hasher) == root;
    }

    /**
     * @dev Returns the root of a tree reconstructed from `leaves` and sibling nodes in `proof`. The reconstruction
     * proceeds by incrementally reconstructing all inner nodes by combining a leaf/inner node with either another
     * leaf/inner node or a proof sibling node, depending on whether each `proofFlags` item is true or false
     * respectively.
     *
     * This version handles multiproofs in memory with a custom hashing function.
     *
     * CAUTION: Not all Merkle trees admit multiproofs. To use multiproofs, it is sufficient to ensure that: 1) the tree
     * is complete (but not necessarily perfect), 2) the leaves to be proven are in the opposite order they are in the
     * tree (i.e., as seen from right to left starting at the deepest layer and continuing at the next layer).
     *
     * NOTE: The _empty set_ (i.e. the case where `proof.length == 1 && leaves.length == 0`) is considered a no-op,
     * and therefore a valid multiproof (i.e. it returns `proof[0]`). Consider disallowing this case if you're not
     * validating the leaves elsewhere.
     */
    function processMultiProof(
        bytes32[] memory proof,
        bool[] memory proofFlags,
        bytes32[] memory leaves,
        function(bytes32, bytes32) view returns (bytes32) hasher
    ) internal view returns (bytes32 merkleRoot) {
        // This function rebuilds the root hash by traversing the tree up from the leaves. The root is rebuilt by
        // consuming and producing values on a queue. The queue starts with the `leaves` array, then goes onto the
        // `hashes` array. At the end of the process, the last hash in the `hashes` array should contain the root of
        // the Merkle tree.
        uint256 leavesLen = leaves.length;
        uint256 proofFlagsLen = proofFlags.length;

        // Check proof validity.
        if (leavesLen + proof.length != proofFlagsLen + 1) {
            revert MerkleProofInvalidMultiproof();
        }

        // The xxxPos values are "pointers" to the next value to consume in each array. All accesses are done using
        // `xxx[xxxPos++]`, which return the current value and increment the pointer, thus mimicking a queue's "pop".
        bytes32[] memory hashes = new bytes32[](proofFlagsLen);
        uint256 leafPos = 0;
        uint256 hashPos = 0;
        uint256 proofPos = 0;
        // At each step, we compute the next hash using two values:
        // - a value from the "main queue". If not all leaves have been consumed, we get the next leaf, otherwise we
        //   get the next hash.
        // - depending on the flag, either another value from the "main queue" (merging branches) or an element from the
        //   `proof` array.
        for (uint256 i = 0; i < proofFlagsLen; i++) {
            bytes32 a = leafPos < leavesLen ? leaves[leafPos++] : hashes[hashPos++];
            bytes32 b = proofFlags[i]
                ? (leafPos < leavesLen ? leaves[leafPos++] : hashes[hashPos++])
                : proof[proofPos++];
            hashes[i] = hasher(a, b);
        }

        if (proofFlagsLen > 0) {
            if (proofPos != proof.length) {
                revert MerkleProofInvalidMultiproof();
            }
            unchecked {
                return hashes[proofFlagsLen - 1];
            }
        } else if (leavesLen > 0) {
            return leaves[0];
        } else {
            return proof[0];
        }
    }

    /**
     * @dev Returns true if the `leaves` can be simultaneously proven to be a part of a Merkle tree defined by
     * `root`, according to `proof` and `proofFlags` as described in {processMultiProof}.
     *
     * This version handles multiproofs in calldata with the default hashing function.
     *
     * CAUTION: Not all Merkle trees admit multiproofs. See {processMultiProof} for details.
     *
     * NOTE: Consider the case where `root == proof[0] && leaves.length == 0` as it will return `true`.
     * The `leaves` must be validated independently. See {processMultiProofCalldata}.
     */
    function multiProofVerifyCalldata(
        bytes32[] calldata proof,
        bool[] calldata proofFlags,
        bytes32 root,
        bytes32[] memory leaves
    ) internal pure returns (bool) {
        return processMultiProofCalldata(proof, proofFlags, leaves) == root;
    }

    /**
     * @dev Returns the root of a tree reconstructed from `leaves` and sibling nodes in `proof`. The reconstruction
     * proceeds by incrementally reconstructing all inner nodes by combining a leaf/inner node with either another
     * leaf/inner node or a proof sibling node, depending on whether each `proofFlags` item is true or false
     * respectively.
     *
     * This version handles multiproofs in calldata with the default hashing function.
     *
     * CAUTION: Not all Merkle trees admit multiproofs. To use multiproofs, it is sufficient to ensure that: 1) the tree
     * is complete (but not necessarily perfect), 2) the leaves to be proven are in the opposite order they are in the
     * tree (i.e., as seen from right to left starting at the deepest layer and continuing at the next layer).
     *
     * NOTE: The _empty set_ (i.e. the case where `proof.length == 1 && leaves.length == 0`) is considered a no-op,
     * and therefore a valid multiproof (i.e. it returns `proof[0]`). Consider disallowing this case if you're not
     * validating the leaves elsewhere.
     */
    function processMultiProofCalldata(
        bytes32[] calldata proof,
        bool[] calldata proofFlags,
        bytes32[] memory leaves
    ) internal pure returns (bytes32 merkleRoot) {
        // This function rebuilds the root hash by traversing the tree up from the leaves. The root is rebuilt by
        // consuming and producing values on a queue. The queue starts with the `leaves` array, then goes onto the
        // `hashes` array. At the end of the process, the last hash in the `hashes` array should contain the root of
        // the Merkle tree.
        uint256 leavesLen = leaves.length;
        uint256 proofFlagsLen = proofFlags.length;

        // Check proof validity.
        if (leavesLen + proof.length != proofFlagsLen + 1) {
            revert MerkleProofInvalidMultiproof();
        }

        // The xxxPos values are "pointers" to the next value to consume in each array. All accesses are done using
        // `xxx[xxxPos++]`, which return the current value and increment the pointer, thus mimicking a queue's "pop".
        bytes32[] memory hashes = new bytes32[](proofFlagsLen);
        uint256 leafPos = 0;
        uint256 hashPos = 0;
        uint256 proofPos = 0;
        // At each step, we compute the next hash using two values:
        // - a value from the "main queue". If not all leaves have been consumed, we get the next leaf, otherwise we
        //   get the next hash.
        // - depending on the flag, either another value from the "main queue" (merging branches) or an element from the
        //   `proof` array.
        for (uint256 i = 0; i < proofFlagsLen; i++) {
            bytes32 a = leafPos < leavesLen ? leaves[leafPos++] : hashes[hashPos++];
            bytes32 b = proofFlags[i]
                ? (leafPos < leavesLen ? leaves[leafPos++] : hashes[hashPos++])
                : proof[proofPos++];
            hashes[i] = Hashes.commutativeKeccak256(a, b);
        }

        if (proofFlagsLen > 0) {
            if (proofPos != proof.length) {
                revert MerkleProofInvalidMultiproof();
            }
            unchecked {
                return hashes[proofFlagsLen - 1];
            }
        } else if (leavesLen > 0) {
            return leaves[0];
        } else {
            return proof[0];
        }
    }

    /**
     * @dev Returns true if the `leaves` can be simultaneously proven to be a part of a Merkle tree defined by
     * `root`, according to `proof` and `proofFlags` as described in {processMultiProof}.
     *
     * This version handles multiproofs in calldata with a custom hashing function.
     *
     * CAUTION: Not all Merkle trees admit multiproofs. See {processMultiProof} for details.
     *
     * NOTE: Consider the case where `root == proof[0] && leaves.length == 0` as it will return `true`.
     * The `leaves` must be validated independently. See {processMultiProofCalldata}.
     */
    function multiProofVerifyCalldata(
        bytes32[] calldata proof,
        bool[] calldata proofFlags,
        bytes32 root,
        bytes32[] memory leaves,
        function(bytes32, bytes32) view returns (bytes32) hasher
    ) internal view returns (bool) {
        return processMultiProofCalldata(proof, proofFlags, leaves, hasher) == root;
    }

    /**
     * @dev Returns the root of a tree reconstructed from `leaves` and sibling nodes in `proof`. The reconstruction
     * proceeds by incrementally reconstructing all inner nodes by combining a leaf/inner node with either another
     * leaf/inner node or a proof sibling node, depending on whether each `proofFlags` item is true or false
     * respectively.
     *
     * This version handles multiproofs in calldata with a custom hashing function.
     *
     * CAUTION: Not all Merkle trees admit multiproofs. To use multiproofs, it is sufficient to ensure that: 1) the tree
     * is complete (but not necessarily perfect), 2) the leaves to be proven are in the opposite order they are in the
     * tree (i.e., as seen from right to left starting at the deepest layer and continuing at the next layer).
     *
     * NOTE: The _empty set_ (i.e. the case where `proof.length == 1 && leaves.length == 0`) is considered a no-op,
     * and therefore a valid multiproof (i.e. it returns `proof[0]`). Consider disallowing this case if you're not
     * validating the leaves elsewhere.
     */
    function processMultiProofCalldata(
        bytes32[] calldata proof,
        bool[] calldata proofFlags,
        bytes32[] memory leaves,
        function(bytes32, bytes32) view returns (bytes32) hasher
    ) internal view returns (bytes32 merkleRoot) {
        // This function rebuilds the root hash by traversing the tree up from the leaves. The root is rebuilt by
        // consuming and producing values on a queue. The queue starts with the `leaves` array, then goes onto the
        // `hashes` array. At the end of the process, the last hash in the `hashes` array should contain the root of
        // the Merkle tree.
        uint256 leavesLen = leaves.length;
        uint256 proofFlagsLen = proofFlags.length;

        // Check proof validity.
        if (leavesLen + proof.length != proofFlagsLen + 1) {
            revert MerkleProofInvalidMultiproof();
        }

        // The xxxPos values are "pointers" to the next value to consume in each array. All accesses are done using
        // `xxx[xxxPos++]`, which return the current value and increment the pointer, thus mimicking a queue's "pop".
        bytes32[] memory hashes = new bytes32[](proofFlagsLen);
        uint256 leafPos = 0;
        uint256 hashPos = 0;
        uint256 proofPos = 0;
        // At each step, we compute the next hash using two values:
        // - a value from the "main queue". If not all leaves have been consumed, we get the next leaf, otherwise we
        //   get the next hash.
        // - depending on the flag, either another value from the "main queue" (merging branches) or an element from the
        //   `proof` array.
        for (uint256 i = 0; i < proofFlagsLen; i++) {
            bytes32 a = leafPos < leavesLen ? leaves[leafPos++] : hashes[hashPos++];
            bytes32 b = proofFlags[i]
                ? (leafPos < leavesLen ? leaves[leafPos++] : hashes[hashPos++])
                : proof[proofPos++];
            hashes[i] = hasher(a, b);
        }

        if (proofFlagsLen > 0) {
            if (proofPos != proof.length) {
                revert MerkleProofInvalidMultiproof();
            }
            unchecked {
                return hashes[proofFlagsLen - 1];
            }
        } else if (leavesLen > 0) {
            return leaves[0];
        } else {
            return proof[0];
        }
    }
}


// File @openzeppelin/contracts/utils/Pausable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}


// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}


// File contracts/SafeVote.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.22;
/**
 * @title SafeVote - Non-Upgradeable Full V1 + V2 Contract
 * @notice Complete V1 compatibility (all functions/events) + full V2 election features
 * @dev Normal contract (no proxy/upgradeable) for simplicity and reliability
 */
contract SafeVote is Ownable, Pausable, ReentrancyGuard {
    // ============ V1 Storage ============

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

    // ============ V2 Storage ============

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
    mapping(uint256 => mapping(uint256 => mapping(uint256 => uint256))) public electionVotes;
    mapping(uint256 => mapping(bytes32 => bool)) public usedVoterKeys;
    mapping(uint256 => mapping(address => address)) public delegations;

    uint256 public currentChainId;

    // ============ V1 Events ============

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

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {
        _orgCounter = 0;
        _pollCounter = 0;
        _electionCounter = 0;
        currentChainId = block.chainid;
    }

    // ============ V1 FULL FUNCTIONS ============

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

    // ============ V1 View Functions ============

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

    // ============ V2 Election Functions ============

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
        return "2.0.0-non-upgradeable";
    }
}
