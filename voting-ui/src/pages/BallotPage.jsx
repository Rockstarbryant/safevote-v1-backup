import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVoting } from '../context/VotingContext';
import { useSecurity } from '../context/SecurityContext';
import LoadingSpinner from '../components/common/LoadingSpinner';


const BallotPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { currentElection, merkleProof, isVerified, votes, updateVote } = useVoting();
  const { addSecurityWarning } = useSecurity();

  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isVerified || !merkleProof || !currentElection) {
      addSecurityWarning('Unauthorized ballot access');
      navigate(`/verify/${electionId}`);
    }
  }, [isVerified, merkleProof, currentElection, electionId, navigate]);

  if (!currentElection || !currentElection.positions?.length) {
    return (
      <div className="ballot-page">
        <LoadingSpinner message="Loading ballot..." />
      </div>
    );
  }

  const positions = currentElection.positions;
  const currentPosition = positions[currentPositionIndex];
  const selectedCandidateIndex = votes[currentPositionIndex]
    ? votes[currentPositionIndex][0]
    : null;
  const progress = ((currentPositionIndex + 1) / positions.length) * 100;
  const isLast = currentPositionIndex === positions.length - 1;

  const handleSelect = (candidateIndex) => {
    updateVote(currentPositionIndex, [candidateIndex]);
    setError(null);
  };

  const handleNext = () => {
    if (selectedCandidateIndex === null) {
      setError('Please select a candidate before continuing.');
      return;
    }
    if (isLast) {
      navigate(`/review/${electionId}`);
    } else {
      setCurrentPositionIndex(currentPositionIndex + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentPositionIndex > 0) {
      setCurrentPositionIndex(currentPositionIndex - 1);
      setError(null);
    }
  };

  return (
    <div className="ballot-page">
      <div className="ballot-container">
        {/* Header Card */}
        <div className="ballot-header-card">
          <div className="ballot-header-content">
            <h1 className="ballot-title">🗳️ Cast Your Vote</h1>
          </div>
          
        </div>

        {/* Progress Card */}
        <div className="ballot-progress-card">
          <div className="progress-info">
            <span className="progress-label">
              Position {currentPositionIndex + 1} of {positions.length}
            </span>
            <span className="progress-percent">{Math.round(progress)}% Complete</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {/* Position Card */}
        <div className="ballot-position-card">
          <h2 className="position-title">{currentPosition.title}</h2>
          <p className="position-subtitle">Select one candidate</p>
        </div>

        {/* Candidates Card */}
        <div className="ballot-candidates-card">
          <div className="candidates-list">
            {currentPosition.candidates.map((candidate, idx) => {
              const isSelected = selectedCandidateIndex === idx;

              return (
                <label
                  key={idx}
                  className={`candidate-option ${isSelected ? 'candidate-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="candidate"
                    value={idx}
                    checked={isSelected}
                    onChange={() => handleSelect(idx)}
                    className="candidate-radio"
                  />
                  <span className="candidate-text">{candidate || `Candidate #${idx + 1}`}</span>
                  {isSelected && <span className="candidate-checkmark">✓</span>}
                </label>
              );
            })}
          </div>
        </div>

        {/* Error Alert Card */}
        {error && (
          <div className="ballot-error-card">
            <span className="error-icon">⚠️</span>
            <p className="error-text">{error}</p>
          </div>
        )}

        {/* Actions Card */}
        <div className="ballot-actions-card">
          <button
            onClick={handleBack}
            disabled={currentPositionIndex === 0}
            className="ballot-btn ballot-btn-secondary"
          >
            ← Previous
          </button>

          <button
            onClick={handleNext}
            disabled={selectedCandidateIndex === null}
            className="ballot-btn ballot-btn-primary"
          >
            {isLast ? 'Review & Submit →' : 'Next →'}
          </button>
        </div>

        {/* Footer */}
        <div className="ballot-footer">
          <button onClick={() => navigate('/elections')} className="ballot-back-link">
            ← Back to Elections
          </button>
        </div>
      </div>
    </div>
  );
};

export default BallotPage;
