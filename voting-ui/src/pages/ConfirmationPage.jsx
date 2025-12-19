import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useVoting } from '../context/VotingContext';
import formatters from '../utils/formatters';
import SecurityBadge from '../components/common/SecurityBadge';

const ConfirmationPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentElection, resetVoting, isAnonymous } = useVoting();

  const [showConfetti, setShowConfetti] = useState(false);
  const transactionHash = location.state?.transactionHash;
  const blockNumber = location.state?.blockNumber;

  useEffect(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    const cleanup = setTimeout(() => {
      handleFinish();
    }, 30000);

    return () => clearTimeout(cleanup);
  }, []);

  const handleFinish = () => {
    resetVoting();
    navigate('/elections');
  };

  const handleViewTransaction = () => {
    window.open(`https://arbiscan.io/tx/${transactionHash}`, '_blank');
  };

  const handleCopyMessage = () => {
    const text = `I just voted in ${currentElection?.title} using SafeVote! 🗳️`;
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const explorerUrl = `https://arbiscan.io/tx/${transactionHash}`;

  return (
    <div className="confirmation-page">
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: [
                  '#667eea',
                  '#764ba2',
                  '#f093fb',
                  '#4facfe',
                  '#00f2fe',
                  '#10B981'
                ][Math.floor(Math.random() * 6)]
              }}
            ></div>
          ))}
        </div>
      )}

      <div className="confirmation-container">
        
        {/* Success Card */}
        <div className="confirmation-success-card">
          <div className="success-icon">✓</div>
          <h1 className="success-title">Vote Successfully Submitted!</h1>
          <p className="success-subtitle">
            Your vote has been securely recorded on the blockchain
          </p>
          <div className="success-badge">
            <SecurityBadge />
          </div>
        </div>

        {/* Details Grid */}
        <div className="confirmation-details-grid">
          <div className="detail-item">
            <span className="detail-label">Election</span>
            <p className="detail-value">{currentElection?.title || 'N/A'}</p>
          </div>

          <div className="detail-item">
            <span className="detail-label">Transaction Hash</span>
            <code className="detail-code">
              {transactionHash
                ? `${transactionHash.substring(0, 10)}...${transactionHash.substring(56)}`
                : 'N/A'}
            </code>
            {transactionHash && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-link"
              >
                View on Explorer ↗
              </a>
            )}
          </div>

          <div className="detail-item">
            <span className="detail-label">Block Number</span>
            <p className="detail-value">{blockNumber ? formatters.formatNumber(blockNumber) : 'Pending'}</p>
          </div>

          <div className="detail-item">
            <span className="detail-label">Timestamp</span>
            <p className="detail-value">{formatters.formatDate(Date.now() / 1000)}</p>
          </div>

          <div className="detail-item">
            <span className="detail-label">Vote Type</span>
            <p className="detail-value vote-type">
              {isAnonymous ? '🔒 Anonymous' : '👤 Public'}
            </p>
          </div>
        </div>

        {/* What Happens Next Card */}
        <div className="confirmation-info-card">
          <h3 className="info-card-title">What Happens Next?</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-icon">✓</span>
              <p>Your vote is permanently recorded on the blockchain</p>
            </div>
            <div className="info-item">
              <span className="info-icon">✓</span>
              <p>Your voter key has been invalidated to prevent double voting</p>
            </div>
            <div className="info-item">
              <span className="info-icon">✓</span>
              <p>You can verify your vote using the transaction hash</p>
            </div>
            <div className="info-item">
              <span className="info-icon">✓</span>
              <p>Results will be available after the election ends</p>
            </div>
          </div>
        </div>

        {/* Security Notice Card */}
        <div className="confirmation-security-card">
          <div className="security-header">
            <span className="security-icon">🔐</span>
            <h4 className="security-title">Security Notes</h4>
          </div>
          <p className="security-text">
            Keep your transaction hash for your records. This is your proof of voting.
            {isAnonymous && ' Your wallet address is not publicly linked to your vote choices.'}
          </p>
        </div>

        {/* Share Card */}
        <div className="confirmation-share-card">
          <h4 className="share-title">📢 Share Your Participation</h4>
          <p className="share-subtitle">Let others know you voted (without revealing your choices)</p>
          <button
            onClick={handleCopyMessage}
            className="confirmation-btn confirmation-btn-secondary"
          >
            📋 Copy Message
          </button>
        </div>

        {/* Action Buttons */}
        <div className="confirmation-actions">
          <button
            onClick={handleViewTransaction}
            className="confirmation-btn confirmation-btn-secondary"
          >
            🔍 View Transaction
          </button>
          <button
            onClick={handleFinish}
            className="confirmation-btn confirmation-btn-primary"
          >
            ← Back to Elections
          </button>
        </div>

        {/* Footer */}
        <div className="confirmation-footer">
          <p className="footer-message">
            Thank you for participating in democratic governance! 🎉
          </p>
        </div>

      </div>
    </div>
  );
};

export default ConfirmationPage;