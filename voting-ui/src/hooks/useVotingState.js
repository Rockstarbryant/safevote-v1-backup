// ============================================================
// FILE 5: src/hooks/useVotingState.js
// Global Voting State Management
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { getElection, getElectionResults } from '../services/votingService';
import { checkVotingEligibility } from '../services/securityService';

export const useVotingState = () => {
  const [electionId, setElectionId] = useState(null);
  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [results, setResults] = useState({});
  const [votes, setVotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  /**
   * Load election data
   */
  const loadElection = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const electionData = await getElection(id);
      setElection(electionData);
      setElectionId(id);
      setPositions(electionData.positions || []);

      // Check eligibility
      const elig = checkVotingEligibility(electionData);
      setEligibility(elig);

      // Initialize votes structure
      const initialVotes = {};
      electionData.positions.forEach((pos, idx) => {
        initialVotes[idx] = [];
      });
      setVotes(initialVotes);

      console.log('✅ Election loaded:', electionData.title);
    } catch (err) {
      setError(err.message);
      console.error('❌ Failed to load election:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load results for a position
   */
  const loadResults = useCallback(
    async (positionIndex) => {
      try {
        if (!electionId) return;

        const positionResults = await getElectionResults(electionId, positionIndex);
        setResults((prev) => ({
          ...prev,
          [positionIndex]: positionResults,
        }));
      } catch (err) {
        console.error('Failed to load results:', err);
      }
    },
    [electionId]
  );

  /**
   * Update vote for a position
   */
  const updateVote = useCallback(
    (positionIndex, candidateIndex) => {
      setVotes((prev) => {
        const newVotes = { ...prev };
        const positionVotes = newVotes[positionIndex] || [];
        const maxSelections = positions[positionIndex]?.max_selections || 1;

        // If already selected, remove it
        if (positionVotes.includes(candidateIndex)) {
          newVotes[positionIndex] = positionVotes.filter((idx) => idx !== candidateIndex);
        } else if (positionVotes.length < maxSelections) {
          // Add if under max
          newVotes[positionIndex] = [...positionVotes, candidateIndex];
        } else {
          // Replace last if at max
          newVotes[positionIndex] = [...positionVotes.slice(0, -1), candidateIndex];
        }

        return newVotes;
      });
    },
    [positions]
  );

  /**
   * Clear votes for a position
   */
  const clearPositionVotes = useCallback((positionIndex) => {
    setVotes((prev) => ({
      ...prev,
      [positionIndex]: [],
    }));
  }, []);

  /**
   * Clear all votes
   */
  const clearAllVotes = useCallback(() => {
    const cleared = {};
    positions.forEach((_, idx) => {
      cleared[idx] = [];
    });
    setVotes(cleared);
  }, [positions]);

  /**
   * Check if a candidate is selected
   */
  const isSelected = useCallback(
    (positionIndex, candidateIndex) => {
      return votes[positionIndex]?.includes(candidateIndex) || false;
    },
    [votes]
  );

  /**
   * Get votes for a position
   */
  const getPositionVotes = useCallback(
    (positionIndex) => {
      return votes[positionIndex] || [];
    },
    [votes]
  );

  /**
   * Get all votes as array
   */
  const getAllVotes = useCallback(() => {
    return positions.map((_, idx) => votes[idx] || []);
  }, [positions, votes]);

  return {
    electionId,
    election,
    positions,
    results,
    votes,
    loading,
    error,
    eligibility,
    loadElection,
    loadResults,
    updateVote,
    clearPositionVotes,
    clearAllVotes,
    isSelected,
    getPositionVotes,
    getAllVotes,
  };
};
