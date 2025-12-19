import { ethers } from 'ethers';

// Generate Merkle proof for voter key
export const generateProof = async (voterKey, merkleRoot) => {
  try {
    // In production, this would fetch from your backend API
    // For now, we'll simulate proof generation
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/merkle/proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voterKey,
        merkleRoot
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate proof');
    }

    const data = await response.json();
    return data.proof;
  } catch (error) {
    console.error('Error generating Merkle proof:', error);
    // Return empty array if API fails (for demo purposes)
    // In production, this should fail gracefully
    return [];
  }
};

// Verify Merkle proof locally
export const verifyProof = (voterKey, proof, root) => {
  try {
    let computedHash = ethers.utils.keccak256(voterKey);
    
    for (const proofElement of proof) {
      if (computedHash < proofElement) {
        computedHash = ethers.utils.keccak256(
          ethers.utils.concat([computedHash, proofElement])
        );
      } else {
        computedHash = ethers.utils.keccak256(
          ethers.utils.concat([proofElement, computedHash])
        );
      }
    }
    
    return computedHash === root;
  } catch (error) {
    console.error('Error verifying Merkle proof:', error);
    return false;
  }
};

// Generate voter key (for testing)
export const generateVoterKey = () => {
  return ethers.utils.hexlify(ethers.utils.randomBytes(32));
};

// Format proof for contract
export const formatProofForContract = (proof) => {
  return proof.map(p => {
    if (typeof p === 'string' && !p.startsWith('0x')) {
      return '0x' + p;
    }
    return p;
  });
};

// Generate Merkle proof (alias for consistency)
export const generateMerkleProof = generateProof;

// Verify Merkle proof (alias for consistency)
export const verifyMerkleProof = verifyProof;

// Export as default object AND named exports
const merkleService = {
  generateProof,
  verifyProof,
  generateVoterKey,
  formatProofForContract,
  generateMerkleProof,
  verifyMerkleProof
};

export default merkleService;