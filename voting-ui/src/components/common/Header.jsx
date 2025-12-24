import React, { useState } from 'react';
import { formatAddress } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, Copy, Check, Loader } from 'lucide-react';
import useWallet from '../../hooks/useWallet';


export default function Header() {
  const { address, isConnecting, connectWallet, disconnectWallet } = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    setDropdownOpen(false);
    disconnectWallet();
  };

  const handleConnectClick = async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Left Section - Logo & Title */}
        <div className="header-left">
          <h1 className="app-title">🗳️ BlockBallot</h1>
          <p className="app-subtitle">Secure & Transparent Blockchain Voting</p>
        </div>

        {/* Center Section - Navigation */}
        <nav className="header-nav">
          <a href="/create-election" className="nav-link">Create Election</a>
          <Link to="/elections" className="nav-link">View Elections</Link>
          <Link to="/results" className="nav-link">Check Results</Link>
          <Link to="/voting" className="nav-link">Voting</Link>
        </nav>

        {/* Right Section - Wallet Status */}
        <div className="header-right">
          {address ? (
            <div className="wallet-container">
              {/* Wallet Badge */}
              <div className="wallet-badge">
                <span className="wallet-status-dot"></span>
                <span className="wallet-status-text">Connected</span>
              </div>

              {/* Wallet Button with Dropdown */}
              <div className="wallet-dropdown">
                <button 
                  className="wallet-button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <span className="wallet-address">{formatAddress(address)}</span>
                  <ChevronDown className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <span className="dropdown-label">Connected Wallet</span>
                    </div>

                    <div className="dropdown-item full-address">
                      <code>{address}</code>
                      <button 
                        className="copy-button"
                        onClick={handleCopyAddress}
                        title="Copy address"
                      >
                        {copied ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>

                    <div className="dropdown-divider"></div>

                    <button 
                      className="dropdown-item disconnect-button"
                      onClick={handleDisconnect}
                    >
                      <LogOut size={16} />
                      <span>Disconnect Wallet</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="wallet-container">
              <div className="wallet-badge disconnected">
                <span className="wallet-status-dot disconnected"></span>
                <span className="wallet-status-text">Not Connected</span>
              </div>
              <button 
                className="wallet-button connect-button"
                onClick={handleConnectClick}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader className="spinner-icon" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Connect Wallet</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}