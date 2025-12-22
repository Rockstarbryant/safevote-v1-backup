// ============================================================
// FILE 15: src/components/security/SecurityWarning.jsx
// Security Warning Component
// ============================================================

import React from 'react';

export default function SecurityWarning({ title, message }) {
  return (
    <div className="security-warning">
      <div className="warning-icon">⚠️</div>
      <div className="warning-content">
        <h4>{title}</h4>
        <p>{message}</p>
      </div>
    </div>
  );
}
