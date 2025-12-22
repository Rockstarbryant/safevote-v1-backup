// ============================================================
// FILE 8: src/components/common/LoadingSpinner.jsx
// Loading Indicator
// ============================================================

import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>{message}</p>
      </div>
    </div>
  );
}
