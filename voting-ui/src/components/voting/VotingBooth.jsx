import React from 'react';
import CandidateCard from './CandidateCard';

const VotingBooth = ({
  position,
  positionIndex,
  selectedCandidates = [],
  onVoteChange,
  maxSelections = 1,
}) => {
  const handleCandidateClick = (candidateIndex) => {
    const isCurrentlySelected = selectedCandidates.includes(candidateIndex);

    // Toggle: if already selected → deselect, else try to select
    const shouldSelect = !isCurrentlySelected;

    // Prevent selecting if max reached
    if (shouldSelect && selectedCandidates.length >= maxSelections) {
      return;
    }

    // Call parent with the candidate index and the new selected state
    onVoteChange(candidateIndex, shouldSelect);
  };

  const selectionProgress =
    maxSelections > 0 ? (selectedCandidates.length / maxSelections) * 100 : 0;

  return (
    <div className="voting-booth">
      <div className="voting-booth-header">
        <div className="header-content">
          <h3>Select Your Candidate(s)</h3>
          <p className="selection-instruction">
            You can select up to {maxSelections} candidate{maxSelections > 1 ? 's' : ''} for this
            position
          </p>
        </div>
        <div className="selection-counter">
          <div className="counter-text">
            <span className="counter-current">{selectedCandidates.length}</span>
            <span className="counter-divider">/</span>
            <span className="counter-max">{maxSelections}</span>
            <span className="counter-label">selected</span>
          </div>
          <div className="selection-progress-bar">
            <div
              className="selection-progress-fill"
              style={{ width: `${selectionProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="candidates-list">
        {position.candidates.map((candidate, idx) => {
          const isSelected = selectedCandidates.includes(idx);
          const isDisabled = !isSelected && selectedCandidates.length >= maxSelections;

          return (
            <CandidateCard
              key={idx}
              candidate={candidate}
              index={idx}
              isSelected={isSelected}
              onSelect={() => handleCandidateClick(idx)} // ← Important: pass function, not values
              disabled={isDisabled}
            />
          );
        })}
      </div>

      {selectedCandidates.length >= maxSelections && selectedCandidates.length > 0 && (
        <div className="selection-notice">
          <span className="notice-icon">ℹ️</span>
          <span className="notice-text">
            Maximum selections reached. Deselect a candidate to choose another.
          </span>
        </div>
      )}

      {selectedCandidates.length === 0 && (
        <div className="no-selection-notice">
          <span className="notice-icon">👆</span>
          <span className="notice-text">Please select at least one candidate to continue</span>
        </div>
      )}
    </div>
  );
};

export default VotingBooth;
