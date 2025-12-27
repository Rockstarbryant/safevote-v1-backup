import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <footer className="app-footer">


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