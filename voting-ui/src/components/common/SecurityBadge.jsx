// ============================================================
// FILE 9: src/components/common/SecurityBadge.jsx
// Security Status Badge
// ============================================================

import React from 'react';

export default function SecurityBadge() {
  return (
    <div className="security-badge">
      <div className="badge-content">
        <span className="badge-icon">🔐</span>
        <div className="badge-text">
          <p className="badge-title">Secure Connection</p>
          <p className="badge-subtitle">Your data is encrypted and protected</p>
        </div>
        <span className="badge-status">✓</span>
      </div>
    </div>
  );
}