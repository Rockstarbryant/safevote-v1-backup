import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-section">
          <h4>BlockBallot</h4>
          <p>
            BlockBallot uses blockchain to finalize votes, while a backend coordinates voter </p>
          <p>  participation to ensure one-vote-per-election across multiple chains.
          </p>
          <p className="footer-tagline">Making democracy transparent and accessible</p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li>
              <button onClick={() => navigate('/elections')} className="footer-link-button">
                Browse Elections
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/voting')} className="footer-link-button">
                How It Works
              </button>
            </li>
            <li>
              <a href="https://sepolia.arbiscan.io" target="_blank" rel="noopener noreferrer">
                Block Explorer ↗
              </a>
            </li>
            <li>
              <a href="https://docs.arbitrum.io" target="_blank" rel="noopener noreferrer">
                Arbitrum Docs ↗
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Security</h4>
          <ul className="footer-features">
            <li>🔒 End-to-end verifiable voting</li>
            <li>⛓️ Tamper-resistant, blockchain-finalized voting</li>
            <li>🛡️ Merkle proof secured</li>
            <li>🔐 Anonymous voting option</li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Network Status</h4>
          <div className="network-status">
            <span className="network-badge">
              <span className="network-dot"></span>
              Arbitrum Sepolia Testnet
            </span>
            <p className="network-info">Chain ID: 421614</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>&copy; {currentYear} BlockBallot. All rights reserved.</p>
          <div className="footer-legal">
            <button onClick={() => alert('Privacy Policy')} className="footer-link-button">
              Privacy Policy
            </button>
            <span className="separator">•</span>
            <button onClick={() => alert('Terms of Service')} className="footer-link-button">
              Terms of Service
            </button>
            <span className="separator">•</span>
            <button onClick={() => alert('Contact Us')} className="footer-link-button">
              Contact
            </button>
          </div>
        </div>
        <p className="footer-disclaimer">
          BlockBallot supports multichain deployment when required, but single-chain elections offer the strongest guarantees
        </p>
      </div>
    </footer>
  );
};

export default Footer;
