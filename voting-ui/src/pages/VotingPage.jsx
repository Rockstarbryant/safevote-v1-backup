import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VotingPage = () => {
  const navigate = useNavigate();
  const [electionIdInput, setElectionIdInput] = useState('');

  const handleQuickVote = () => {
    if (electionIdInput && !isNaN(electionIdInput)) {
      navigate(`/verify/${electionIdInput}`);
    } else {
      alert('Please enter a valid election ID');
    }
  };

  return (
    <div className="page-container voting-page">
      <div className="hero-section">
        <h1>🗳️ SafeVote</h1>
        <p className="hero-subtitle">Secure, Transparent, Blockchain-Powered Voting</p>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Secure & Private</h3>
          <p>Cryptographic proofs ensure vote integrity and voter privacy</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">⛓️</div>
          <h3>Blockchain Verified</h3>
          <p>All votes recorded on Arbitrum blockchain for transparency</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">👁️</div>
          <h3>Anonymous Voting</h3>
          <p>Optional anonymous voting to protect voter identity</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🤝</div>
          <h3>Vote Delegation</h3>
          <p>Delegate your voting power to trusted representatives</p>
        </div>
      </div>

      <div className="quick-vote-section">
        <h2>Quick Vote Access</h2>
        <p>Have an election ID? Enter it here to vote directly</p>

        <div className="quick-vote-input">
          <input
            type="number"
            placeholder="Enter Election ID"
            value={electionIdInput}
            onChange={(e) => setElectionIdInput(e.target.value)}
            className="input-field"
          />
          <button onClick={handleQuickVote} className="btn-primary">
            Go to Election →
          </button>
        </div>
      </div>

      <div className="cta-section">
        <h2>Ready to Vote?</h2>
        <p>Browse available elections and participate in democratic governance</p>

        <button onClick={() => navigate('/elections')} className="btn-primary btn-large">
          Browse Elections →
        </button>
      </div>

      <div className="info-section">
        <h3>How It Works</h3>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h4>Select Election</h4>
            <p>Browse and choose an active election</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h4>Verify Identity</h4>
            <p>Connect wallet and verify your voter key</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h4>Cast Vote</h4>
            <p>Select candidates for each position</p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h4>Confirm</h4>
            <p>Review and submit your ballot securely</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VotingPage;
