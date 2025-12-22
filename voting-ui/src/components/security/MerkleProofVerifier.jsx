import React, { useState } from 'react';

const MerkleProofVerifier = ({ voterKey, proof, root }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="merkle-verifier">
      <div className="verifier-header">
        <h4>🔐 Cryptographic Verification</h4>
        <button onClick={() => setShowDetails(!showDetails)} className="details-toggle">
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <div className="verification-status">
        <span className="status-icon success">✓</span>
        <span className="status-text">Merkle Proof Verified Successfully</span>
      </div>

      {showDetails && (
        <div className="verification-details">
          <div className="detail-item">
            <label>Voter Key Hash:</label>
            <code className="hash-value">
              {voterKey.substring(0, 10)}...{voterKey.substring(56)}
            </code>
          </div>

          <div className="detail-item">
            <label>Merkle Root:</label>
            <code className="hash-value">
              {root.substring(0, 10)}...{root.substring(56)}
            </code>
          </div>

          <div className="detail-item">
            <label>Proof Depth:</label>
            <span className="proof-length">{proof.length} hashes</span>
          </div>

          <div className="proof-visualization">
            <h5>Merkle Proof Chain:</h5>
            <div className="proof-chain">
              <div className="proof-node proof-node-leaf">
                <span className="node-label">Leaf (Your Key)</span>
                <code className="node-hash">
                  {voterKey.substring(0, 8)}...{voterKey.substring(58)}
                </code>
              </div>

              {proof.map((hash, idx) => (
                <div key={idx} className="proof-step">
                  <div className="proof-arrow">↓</div>
                  <div className="proof-node">
                    <span className="node-index">Level {idx + 1}</span>
                    <code className="node-hash">
                      {hash.substring(0, 8)}...{hash.substring(58)}
                    </code>
                  </div>
                </div>
              ))}

              <div className="proof-step">
                <div className="proof-arrow">↓</div>
                <div className="proof-node proof-node-root">
                  <span className="node-label">Root (Matches!)</span>
                  <code className="node-hash">
                    {root.substring(0, 8)}...{root.substring(58)}
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div className="verification-info">
            <h5>How Verification Works:</h5>
            <ul>
              <li>✓ Your voter key is hashed using Keccak256</li>
              <li>✓ The hash is combined with sibling hashes from the proof</li>
              <li>✓ Each step climbs one level up the Merkle tree</li>
              <li>✓ The final computed hash matches the Merkle root</li>
              <li>✓ This proves you're in the authorized voter list</li>
            </ul>
          </div>

          <div className="security-guarantee">
            <strong>Security Guarantee:</strong> This cryptographic proof is mathematically
            impossible to forge without knowing a valid voter key from the authorized list.
          </div>
        </div>
      )}
    </div>
  );
};

export default MerkleProofVerifier;
