import React, { createContext, useContext, useState, useEffect } from 'react';

const VotingContext = createContext();

export const useVoting = () => {
  const context = useContext(VotingContext);
  if (!context) {
    throw new Error('useVoting must be used within VotingProvider');
  }
  return context;
};

export const VotingProvider = ({ children }) => {
  const [currentElection, setCurrentElection] = useState(null);
  const [voterKey, setVoterKey] = useState(null);
  const [merkleProof, setMerkleProof] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [votes, setVotes] = useState({});
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [delegateTo, setDelegateTo] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const savedElection = sessionStorage.getItem('currentElection');
      const savedVoterKey = sessionStorage.getItem('voterKey');
      const savedProof = sessionStorage.getItem('merkleProof');
      const savedVotes = sessionStorage.getItem('votes');
      const savedWallet = sessionStorage.getItem('walletAddress');
      const savedAnonymous = sessionStorage.getItem('isAnonymous');
      const savedDelegate = sessionStorage.getItem('delegateTo');

      if (savedElection) setCurrentElection(JSON.parse(savedElection));
      if (savedVoterKey) setVoterKey(savedVoterKey);
      if (savedProof) setMerkleProof(JSON.parse(savedProof));
      if (savedVotes) setVotes(JSON.parse(savedVotes));
      if (savedWallet) setWalletAddress(savedWallet);
      if (savedAnonymous) setIsAnonymous(savedAnonymous === 'true');
      if (savedDelegate) setDelegateTo(savedDelegate);
    } catch (error) {
      console.error('Error loading from sessionStorage:', error);
    }
  }, []);

  // Save to sessionStorage on change
  useEffect(() => {
    if (currentElection) {
      sessionStorage.setItem('currentElection', JSON.stringify(currentElection));
    }
  }, [currentElection]);

  useEffect(() => {
    if (voterKey) {
      sessionStorage.setItem('voterKey', voterKey);
    }
  }, [voterKey]);

  useEffect(() => {
    if (merkleProof) {
      sessionStorage.setItem('merkleProof', JSON.stringify(merkleProof));
    }
  }, [merkleProof]);

  useEffect(() => {
    if (votes && Object.keys(votes).length > 0) {
      sessionStorage.setItem('votes', JSON.stringify(votes));
    }
  }, [votes]);

  useEffect(() => {
    if (walletAddress) {
      sessionStorage.setItem('walletAddress', walletAddress);
    }
  }, [walletAddress]);

  useEffect(() => {
    sessionStorage.setItem('isAnonymous', isAnonymous.toString());
  }, [isAnonymous]);

  useEffect(() => {
    if (delegateTo) {
      sessionStorage.setItem('delegateTo', delegateTo);
    } else {
      sessionStorage.removeItem('delegateTo');
    }
  }, [delegateTo]);

  const updateVote = (positionIndex, candidateIndices) => {
    setVotes((prev) => ({
      ...prev,
      [positionIndex]: candidateIndices,
    }));
  };

  const clearVote = (positionIndex) => {
    setVotes((prev) => {
      const newVotes = { ...prev };
      delete newVotes[positionIndex];
      return newVotes;
    });
  };

  const resetVoting = () => {
    setCurrentElection(null);
    setVoterKey(null);
    setMerkleProof(null);
    setIsVerified(false);
    setVotes({});
    setIsAnonymous(false);
    setDelegateTo(null);
    sessionStorage.clear();
  };

  const value = {
    currentElection,
    setCurrentElection,
    voterKey,
    setVoterKey,
    merkleProof,
    setMerkleProof,
    isVerified,
    setIsVerified,
    votes,
    updateVote,
    clearVote,
    setVotes,
    isAnonymous,
    setIsAnonymous,
    delegateTo,
    setDelegateTo,
    walletAddress,
    setWalletAddress,
    resetVoting,
  };

  return <VotingContext.Provider value={value}>{children}</VotingContext.Provider>;
};

export default VotingContext;
