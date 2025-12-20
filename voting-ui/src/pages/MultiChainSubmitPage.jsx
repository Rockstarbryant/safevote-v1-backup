import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVoting } from '../context/VotingContext';
import { useWallet } from '../hooks/useWallet';
import votingService from '../services/votingService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const MultiChainSubmitPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { currentElection, voterKey, merkleProof, votes } = useVoting();
  const { address, provider } = useWallet();

  const [chains, setChains] = useState([]);
  const [selectedChain, setSelectedChain] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [currentChainId, setCurrentChainId] = useState(null);

  useEffect(() => {
    if (!currentElection || !provider) return;

    // Get current wallet chain
    provider.getNetwork().then(net => setCurrentChainId(net.chainId));

    // Get deployed chains from backend
    fetch(`http://localhost:3001/api/elections/${electionId}/chains`)
      .then(res => res.json())
      .then(data => {
        if (data.chains && data.chains.length > 0) {
          setChains(data.chains);
          // Auto-select current chain if available
          const current = data.chains.find(c => c.chainId === net.chainId);
          if (current) setSelectedChain(current);
        }
      })
      .catch(err => console.error('Failed to load chains', err));
  }, [currentElection, provider, electionId]);

  const handleSubmit = async () => {
    if (!selectedChain) {
      setError('Please select a chain to submit your vote.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Switch chain if needed
      if (currentChainId !== selectedChain.chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + selectedChain.chainId.toString(16) }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            // Chain not added — you can add it here if needed
            setError('This chain is not added to your wallet. Please add it manually.');
            setSubmitting(false);
            return;
          }
          throw switchError;
        }
      }

      // Get on-chain election ID for this chain
      const res = await fetch(`http://localhost:3001/api/elections/${electionId}/chain/${selectedChain.chainId}`);
      const { onChainElectionId } = await res.json();

      // Format votes
      const formattedVotes = currentElection.positions.map((_, i) => votes[i] || []);

      const result = await votingService.castVote(
        onChainElectionId,  // numeric ID for this chain
        voterKey,
        merkleProof,
        formattedVotes
      );

      if (!result.success) throw new Error(result.error);

      navigate(`/confirmation/${electionId}`, {
        state: {
          transactionHash: result.transactionHash,
          chainName: selectedChain.name,
          chainId: selectedChain.chainId
        }
      });
    } catch (err) {
      setError(err.message || 'Vote submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentElection) {
    return <LoadingSpinner message="Loading submission options..." />;
  }

  return (
    <div className="page-container min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🌐 Choose Blockchain
          </h1>
          <p className="text-2xl text-purple-200">
            This election is live on multiple chains. Select where to submit your vote.
          </p>
        </div>

        {chains.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-400">Loading available chains...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {chains.map(chain => (
              <div
                key={chain.chainId}
                onClick={() => setSelectedChain(chain)}
                className={`glass card-glow p-8 rounded-2xl cursor-pointer transition-all duration-300
                  ${selectedChain?.chainId === chain.chainId 
                    ? 'ring-4 ring-purple-400 shadow-2xl scale-105' 
                    : 'hover:scale-105'
                  }`}
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">{chain.icon}</div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {chain.name}
                  </h3>
                  <p className="text-purple-300 mb-4">
                    Chain ID: {chain.chainId}
                  </p>
                  <p className="text-sm text-gray-300">
                    {chain.votesCast || 0} votes cast
                  </p>
                  {currentChainId === chain.chainId && (
                    <p className="mt-4 text-green-400 font-bold">Currently Connected</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-400 rounded-2xl p-6 text-center mb-8">
            <p className="text-xl text-red-300">{error}</p>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedChain || submitting}
            className="px-12 py-6 text-3xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-2xl shadow-2xl transform hover:scale-105 transition disabled:opacity-60"
          >
            {submitting ? 'Submitting Vote...' : `Submit on ${selectedChain?.name || 'Selected Chain'} →`}
          </button>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => navigate(-1)}
            className="text-purple-300 hover:text-white text-lg"
          >
            ← Back to Review
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiChainSubmitPage;