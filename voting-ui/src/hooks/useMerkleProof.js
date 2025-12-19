// ============================================================
// FILE 8: src/hooks/useMerkleProof.js
// Merkle Proof Generation Hook
// ============================================================

import { useState, useCallback } from 'react';
import { generateMerkleProof, formatProofForContract } from '../services/merkleService';
import { validateVoterKey } from '../services/securityService';

export const useMerkleProof = () => {
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Generate proof
   */
  const generateProof = useCallback(async (voterKey, allKeys) => {
    setLoading(true);
    setError(null);

    try {
      // Validate voter key
      if (!validateVoterKey(voterKey)) {
        throw new Error('Invalid voter key format');
      }

      // Generate merkle proof
      const merkleProof = generateMerkleProof(voterKey, allKeys);

      if (!merkleProof.isValid) {
        throw new Error('Invalid merkle proof');
      }

      // Format for contract
      const formattedProof = formatProofForContract(merkleProof.proof);

      setProof({
        voterKey,
        merkleProof: formattedProof,
        leaf: merkleProof.leaf,
        root: merkleProof.root,
      });

      console.log('✅ Merkle proof generated');

      return formattedProof;
    } catch (err) {
      setError(err.message);
      console.error('❌ Merkle proof error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear proof
   */
  const clearProof = useCallback(() => {
    setProof(null);
    setError(null);
  }, []);

  return {
    proof,
    loading,
    error,
    generateProof,
    clearProof,
  };
};