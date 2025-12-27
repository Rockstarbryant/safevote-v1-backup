import React, { useState } from 'react';
import { formatAddress } from '../../utils/formatters';
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
    <header className="app-header-compact">
      <div className="header-container-compact">
        {/* Left Section - Just Title */}
        <div className="header-left-compact">
          <h1 className="app-title-compact">🗳️ BlockBallot</h1>
        </div>

        {/* Right Section - Wallet Status */}
        <div className="header-right-compact">
          {address ? (
            <div className="wallet-container-compact">
              {/* Wallet Badge */}
              <div className="wallet-badge-compact">
                <span className="wallet-status-dot"></span>
                <span className="wallet-status-text">Connected</span>
              </div>

              {/* Wallet Button with Dropdown */}
              <div className="wallet-dropdown">
                <button 
                  className="wallet-button-compact"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <span className="wallet-address">{formatAddress(address)}</span>
                  <ChevronDown className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`} size={16} />
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
            <div className="wallet-container-compact">
              <div className="wallet-badge-compact disconnected">
                <span className="wallet-status-dot disconnected"></span>
                <span className="wallet-status-text">Not Connected</span>
              </div>
              <button 
                className="wallet-button-compact connect-button"
                onClick={handleConnectClick}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader className="spinner-icon" size={16} />
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