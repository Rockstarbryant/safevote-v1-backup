// ============================================================
// FILE 6: src/components/common/Header.jsx
// Navigation Header
// ============================================================

import React from 'react';
import { formatAddress } from '../../utils/formatters';

export default function Header({ account }) {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="app-title">🗳️ SafeVote</h1>
          <p className="app-subtitle">Secure & Transparent Blockchain Voting</p>
        </div>

        <div className="header-right">
          {account && (
            <div className="account-info">
              <span className="account-label">Connected:</span>
              <span className="account-address">{formatAddress(account)}</span>
              <div className="status-indicator active"></div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}