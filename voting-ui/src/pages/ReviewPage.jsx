import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVoting } from '../context/VotingContext';
import { useSecurity } from '../context/SecurityContext';
import { useWallet } from '../hooks/useWallet';
import votingService from '../services/votingService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SecurityBadge from '../components/common/SecurityBadge';

const ReviewPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { currentElection, votes, isAnonymous, delegateTo, resetVoting } = useVoting();
  const { addSecurityWarning } = useSecurity();
  const { address } = useWallet();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  useEffect(() => {
    // Guard: check if we have election data
    if (!currentElection) {
      addSecurityWarning('Unauthorized access to review page');
      navigate(`/verify/${electionId}`);
      return;
    }

    // Guard: if not delegating, check if all positions are completed
    if (!delegateTo && currentElection.positions) {
      const required = currentElection.positions.length;
      const completed = Object.keys(votes).length;
      if (completed < required) {
        setError('Please complete all positions.');
        setTimeout(() => navigate(`/vote/${electionId}`), 2000);
      }
    }
  }, [currentElection, delegateTo, votes, electionId, navigate, addSecurityWarning]);

  const handleSubmitVote = async () => {
    if (!confirmSubmit) {
      setError('Please confirm your vote before submitting.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      console.log('🗳️ ReviewPage: Starting vote submission');
      console.log(`   Election UUID: ${electionId}`);
      console.log(`   Voter Address: ${address}`);
      console.log(`   Delegating: ${delegateTo ? 'Yes' : 'No'}`);

      // Format votes as array of arrays (for each position)
      const formattedVotes = currentElection.positions.map((_, i) => votes[i] || []);

      console.log(`   Votes: ${JSON.stringify(formattedVotes)}`);

      // FIXED: Call castVote with correct signature
      // OLD: castVote(electionUuid, voterAddress, merkleProof, votes, delegateTo)
      // NEW: castVote(electionUuid, voterAddress, votes, delegateTo)
      // merkleProof is now fetched inside castVote from keyService
      
      const result = await votingService.castVote(
        electionId,              // Election UUID
        address,                 // Voter Address
        formattedVotes,          // Votes (uint256[][])
        delegateTo || null       // Delegate (optional)
      );

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      console.log(`✅ Vote submitted successfully!`);
      console.log(`   TX Hash: ${result.transactionHash}`);

      // Navigate to confirmation page
      navigate(`/confirmation/${electionId}`, {
        state: {
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber
        }
      });
    } catch (err) {
      console.error('❌ Vote submission error:', err);
      setError(err.message || 'Failed to submit vote.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => navigate(`/vote/${electionId}`);
  
  const handleReset = () => {
    if (window.confirm('Reset and return to elections?')) {
      resetVoting();
      navigate('/elections');
    }
  };

  if (!currentElection) {
    return <LoadingSpinner message="Loading review..." />;
  }

  return (
    <div className="review-page">
      <div className="review-container">
        <div className="review-header-card">
          <h1>Final Review</h1>
          <p>Double-check before submitting on-chain</p>
          <SecurityBadge />
        </div>

        {delegateTo ? (
          <div className="review-delegation-card">
            <h3>Vote Delegation Active</h3>
            <code>{delegateTo}</code>
            <p>⚠️ Delegate will cast vote</p>
          </div>
        ) : (
          <div className="review-ballot-card">
            <h3>Review Your Ballot</h3>
            <div className="ballot-review-positions">
              {currentElection.positions.map((position, posIdx) => {
                const selectedIdx = votes[posIdx]?.[0];
                const selected = selectedIdx !== undefined ? position.candidates[selectedIdx] : null;

                return (
                  <div key={posIdx} className="ballot-review-item">
                    <h4>{position.title}</h4>
                    {selected ? (
                      <div>✓ {selected}</div>
                    ) : (
                      <div>No selection</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="review-settings-card">
          <h3>Voting Settings</h3>
          <div>
            <span>Anonymous: {isAnonymous ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span>Delegation: {delegateTo ? 'Active' : 'None'}</span>
          </div>
          <div>
            <span>Voter Address:</span>
            <code>{address?.substring(0, 6)}...{address?.substring(38)}</code>
          </div>
        </div>

        {error && (
          <div className="review-error-card">
            <p>❌ {error}</p>
          </div>
        )}

        <div className="review-confirmation-card">
          <label>
            <input
              type="checkbox"
              checked={confirmSubmit}
              onChange={e => setConfirmSubmit(e.target.checked)}
            />
            <span>
              I confirm my selections. <strong>This is irreversible.</strong>
            </span>
          </label>
        </div>

        <div className="review-actions-grid">
          <button onClick={handleBack} disabled={submitting}>
            ← Edit Ballot
          </button>
          <button onClick={handleReset} disabled={submitting}>
            Reset & Exit
          </button>
          <button
            onClick={handleSubmitVote}
            disabled={!confirmSubmit || submitting}
            className="review-btn-primary"
          >
            {submitting ? 'Submitting...' : 'Submit Vote →'}
          </button>
        </div>

        <div className="review-footer">
          <p>Your vote is cryptographically secured on-chain.</p>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;