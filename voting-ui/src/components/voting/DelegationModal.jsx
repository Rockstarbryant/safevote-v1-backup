// ============================================================
// FILE 13: src/components/voting/DelegationModal.jsx
// Vote Delegation Modal
// ============================================================

import React, { useState } from 'react';
import { validateAddress } from '../../services/securityService';

export default function DelegationModal({ onDelegate, onClose }) {
  const [delegateAddress, setDelegateAddress] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDelegate = async () => {
    setError(null);

    if (!delegateAddress.trim()) {
      setError('Please enter a delegate address');
      return;
    }

    if (!validateAddress(delegateAddress)) {
      setError('Invalid Ethereum address format');
      return;
    }

    setLoading(true);

    try {
      await onDelegate(delegateAddress);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤝 Delegate Your Vote</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p>Enter the Ethereum address of the person you want to delegate your vote to:</p>

          <input
            type="text"
            placeholder="0x..."
            value={delegateAddress}
            onChange={(e) => setDelegateAddress(e.target.value)}
            className="delegation-input"
            disabled={loading}
          />

          {error && <p className="error-message">❌ {error}</p>}

          <div className="delegation-info">
            <p>ℹ️ By delegating, you authorize this address to vote on your behalf.</p>
            <p>You can only delegate, not vote directly after delegation.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDelegate}
            disabled={loading || !delegateAddress.trim()}
          >
            {loading ? 'Processing...' : 'Delegate Vote'}
          </button>
        </div>
      </div>
    </div>
  );
}
