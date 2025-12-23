import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVoting } from '../context/VotingContext';
import { useSecurity } from '../context/SecurityContext';
import votingService from '../services/votingService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SecurityBadge from '../components/common/SecurityBadge';

const ReviewPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { currentElection, voterKey, merkleProof, votes, isAnonymous, delegateTo, resetVoting } =
    useVoting();
  const { addSecurityWarning } = useSecurity();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  useEffect(() => {
    if (!voterKey || !merkleProof) {
      addSecurityWarning('Unauthorized access to review page');
      navigate(`/verify/${electionId}`);
      return;
    }

    if (!delegateTo && currentElection?.positions) {
      const requiredPositions = currentElection.positions.length;
      const completedPositions = Object.keys(votes).length;
      if (completedPositions < requiredPositions) {
        setError('Please complete voting for all positions.');
        setTimeout(() => navigate(`/vote/${electionId}`), 2000);
      }
    }
  }, [
    voterKey,
    merkleProof,
    delegateTo,
    votes,
    currentElection,
    electionId,
    navigate,
    addSecurityWarning,
  ]);

  const handleSubmitVote = async () => {
    if (!confirmSubmit) {
      setError('Please confirm your vote before submitting.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // PRE-CHECK: Has voter already voted?
      console.log(`🔍 Checking if voter already voted...`);
      const alreadyVoted = await votingService.hasVoted(electionId, voterKey);
      if (alreadyVoted) {
        setError('You have already voted in this election. Thank you for participating!');
        setSubmitting(false);
        return;
      }
      console.log(`✅ Voter has not voted yet`);

      // Format votes (just pass as-is, votingService handles it)
      const formattedVotes = currentElection.positions.map((_, i) => votes[i] || []);

      console.log(`📝 Submitting vote for election UUID: ${electionId}`);
      console.log(`   Voter Key: ${voterKey?.substring(0, 10)}...`);
      console.log(`   Votes: `, formattedVotes);

      // votingService.castVote will:
      // 1. Fetch on-chain election ID automatically
      // 2. Call smart contract with correct parameters
      // 3. Record vote in database
      const result = await votingService.castVote(
        electionId, // UUID - votingService will fetch on-chain ID
        voterKey,
        merkleProof,
        formattedVotes,
        delegateTo || '0x0000000000000000000000000000000000000000'
      );

      if (!result.success) {
        let userMessage = 'Transaction failed. Please try again.';
        if (result.error?.includes('Key used')) {
          userMessage = 'This voter key has already been used.';
        } else if (result.error?.includes('user rejected')) {
          userMessage = 'You rejected the transaction.';
        } else if (result.error?.includes('insufficient funds')) {
          userMessage = 'Insufficient funds for gas fees.';
        } else if (result.error?.includes('On-chain election ID not found')) {
          userMessage = 'Election has not been deployed on-chain yet.';
        }
        throw new Error(userMessage);
      }

      console.log(`✅ Vote submitted successfully!`);
      console.log(`   TX Hash: ${result.transactionHash}`);
      console.log(`   Block: ${result.blockNumber}`);

      navigate(`/confirmation/${electionId}`, {
        state: {
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
        },
      });
    } catch (err) {
      console.error('❌ Vote submission error:', err);
      setError(err.message || 'Failed to submit vote. Please try again.');
      addSecurityWarning('Vote submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(`/vote/${electionId}`);
  };

  const handleReset = () => {
    if (window.confirm('Reset all votes and return to elections?')) {
      resetVoting();
      navigate('/elections');
    }
  };

  if (!currentElection) {
    return (
      <div className="review-page">
        <LoadingSpinner message="Loading your ballot review..." />
      </div>
    );
  }

  return (
    <div className="review-page">
      <div className="review-container">
        {/* Header Card */}
        <div className="review-header-card">
          <div className="review-header-content">
            <h1 className="review-title">Final Review</h1>
            <p className="review-subtitle">Double-check your vote before submitting on-chain</p>
          </div>
          <div className="review-security">
            <SecurityBadge />
          </div>
        </div>

        {/* Delegation Card OR Vote Review */}
        {delegateTo ? (
          <div className="review-delegation-card">
            <div className="delegation-icon">🤝</div>
            <h3 className="delegation-title">Vote Delegation Active</h3>
            <p className="delegation-label">You are delegating to:</p>
            <code className="delegation-address">{delegateTo}</code>
            <p className="delegation-warning">
              ⚠️ Your delegate will cast the vote for all positions
            </p>
          </div>
        ) : (
          <div className="review-ballot-card">
            <h3 className="ballot-review-title">Review Your Ballot</h3>
            <p className="ballot-review-subtitle">
              Confirm your selections before submitting on-chain
            </p>
            <div className="ballot-review-positions">
              {currentElection.positions.map((position, posIdx) => {
                const selectedCandidateIdx = votes[posIdx]?.[0];
                const selectedCandidate =
                  selectedCandidateIdx !== undefined
                    ? position.candidates[selectedCandidateIdx]
                    : null;

                return (
                  <div key={posIdx} className="ballot-review-item">
                    <div className="ballot-review-header">
                      <h4 className="ballot-review-position">{position.title}</h4>
                      <span className="ballot-review-badge">
                        {selectedCandidate ? '✅ Selected' : '○ Not Selected'}
                      </span>
                    </div>
                    {selectedCandidate ? (
                      <div className="ballot-review-selection">
                        <span className="selection-icon">✓</span>
                        <span className="selection-text">{selectedCandidate}</span>
                      </div>
                    ) : (
                      <div className="ballot-review-empty">No selection made</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Settings Card */}
        <div className="review-settings-card">
          <h3 className="settings-title">⚙️ Voting Settings</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <span className="setting-label">Anonymous Voting</span>
              <span
                className={`setting-value ${isAnonymous ? 'setting-enabled' : 'setting-disabled'}`}
              >
                {isAnonymous ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Delegation</span>
              <span
                className={`setting-value ${delegateTo ? 'setting-enabled' : 'setting-disabled'}`}
              >
                {delegateTo ? '✓ Active' : '✗ None'}
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Voter Key</span>
             <code className="setting-key">
              {voterKey?.substring(0, 6)}...{voterKey?.substring(38)}
            </code>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="review-error-card">
            <span className="error-icon">⚠️</span>
            <p className="error-message">{error}</p>
          </div>
        )}

        {/* Confirmation Checkbox */}
        <div className="review-confirmation-card">
          <label className="confirmation-checkbox">
            <input
              type="checkbox"
              checked={confirmSubmit}
              onChange={(e) => setConfirmSubmit(e.target.checked)}
              className="confirmation-input"
            />
            <span className="confirmation-text">
              I confirm that I have reviewed my ballot and these are my final selections.
              <strong className="confirmation-warning">This action is irreversible.</strong>
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="review-actions-grid">
          <button
            onClick={handleBack}
            disabled={submitting}
            className="review-btn review-btn-secondary"
          >
            ← Edit Ballot
          </button>

          <button
            onClick={handleReset}
            disabled={submitting}
            className="review-btn review-btn-danger"
          >
            🔄 Reset & Exit
          </button>

          <button
            onClick={handleSubmitVote}
            disabled={!confirmSubmit || submitting}
            className="review-btn review-btn-primary"
          >
            {submitting ? '⏳ Submitting on Chain...' : 'Submit Vote Permanently →'}
          </button>
        </div>

        {/* Security Footer */}
        <div className="review-footer">
          <p className="footer-text">
            ✓ Your vote is cryptographically secured and permanently recorded on the blockchain.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;