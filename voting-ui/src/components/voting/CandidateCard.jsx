// ============================================================
// FILE 10: src/components/voting/CandidateCard.jsx
// Individual Candidate Card
// ============================================================

import React from 'react';

export default function CandidateCard({
  index,
  name,
  isSelected,
  isMultiSelect,
  onClick,
  maxSelections,
  currentSelections,
}) {
  const isDisabled = !isSelected && currentSelections >= maxSelections;

  return (
    <div
      className={`candidate-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={!isDisabled ? onClick : null}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' && !isDisabled) onClick();
      }}
    >
      <div className="candidate-checkbox">
        {isMultiSelect ? (
          <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected && <span>✓</span>}
          </div>
        ) : (
          <div className={`radio ${isSelected ? 'checked' : ''}`}>
            {isSelected && <span>●</span>}
          </div>
        )}
      </div>

      <div className="candidate-info">
        <h4 className="candidate-name">{name}</h4>
        <p className="candidate-number">Candidate #{index + 1}</p>
      </div>

      {isSelected && <div className="selection-indicator">✓ Selected</div>}

      {isDisabled && <div className="disabled-indicator">Max {maxSelections} selected</div>}
    </div>
  );
}
