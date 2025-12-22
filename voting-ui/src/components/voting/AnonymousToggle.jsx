// ============================================================
// FILE 11: src/components/voting/AnonymousToggle.jsx
// Anonymous Voting Toggle
// ============================================================

import React from 'react';

export default function AnonymousToggle({ enabled, onChange }) {
  return (
    <div className="anonymous-toggle">
      <div className="toggle-header">
        <h4>🔒 Anonymous Voting</h4>
        <p>Keep your vote private - your identity won't be linked to your vote</p>
      </div>

      <label className="toggle-switch">
        <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-slider"></span>
      </label>

      <div className="toggle-info">
        {enabled ? (
          <p className="info-text success">
            ✓ Anonymous mode enabled - Your vote will be recorded without your address
          </p>
        ) : (
          <p className="info-text warning">⚠ Your vote will be linked to your wallet address</p>
        )}
      </div>
    </div>
  );
}
