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
    <>
      <header className="glass-header shadow-lg sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <Link to="/dashboard" className="flex items-center space-x-3 cursor-pointer">
              <i className="fas fa-shield-alt text-3xl text-white"></i>
              <div>
                <h1 className="text-2xl font-bold text-white">BlockBallot</h1>
                <p className="text-xs text-purple-200">Transparent • Secure • Decentralized</p>
              </div>
            </Link>

            {/* Right Section - Wallet & Network */}
            <div className="flex items-center space-x-4">
              {/* Network Badge */}
              <div className="glass rounded-lg px-4 py-2 flex items-center gap-3">
                <i className="fas fa-network-wired text-purple-300"></i>
                <span className="text-white font-medium text-sm">Arbitrum Sepolia</span>
              </div>

              {/* Wallet Connection */}
              {address ? (
                <div className="flex items-center space-x-4">
                  <div className="wallet-dropdown">
                    <button 
                      className="glass text-white px-4 py-2 rounded-full flex items-center space-x-2"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-mono">{formatAddress(address)}</span>
                      <ChevronDown className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`} size={16} />
                    </button>

                    {dropdownOpen && (
                      <div className="dropdown-menu-glass">
                        <div className="dropdown-header-glass">
                          <span className="dropdown-label-glass">Your Wallet</span>
                        </div>

                        <div className="dropdown-item-glass full-address-glass">
                          <code className="address-code-glass">{address}</code>
                          <button 
                            className="copy-button-glass"
                            onClick={handleCopyAddress}
                            title="Copy address"
                          >
                            {copied ? (
                              <>
                                <Check size={16} />
                                <span className="ml-1">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={16} />
                                <span className="ml-1">Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="dropdown-divider-glass"></div>

                        <button 
                          className="dropdown-item-glass disconnect-button-glass"
                          onClick={handleDisconnect}
                        >
                          <LogOut size={16} />
                          <span>Disconnect</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleConnectClick}
                  disabled={isConnecting}
                  className="btn-primary"
                >
                  {isConnecting ? (
                    <>
                      <Loader className="spinner-icon mr-2" size={18} />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-wallet mr-2"></i>
                      Connect Wallet
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Marquee Announcement Bar */}
      <div className="marquee-bar">
        <div className="marquee-content-wrapper">
          <span className="marquee-text">
            🎉 Welcome to BlockBallot - Secure Blockchain Voting Platform
          </span>
          <span className="marquee-text">
            🔒 End-to-End Encrypted Voting
          </span>
          <span className="marquee-text">
            ⛓️ Powered by Arbitrum Blockchain
          </span>
          <span className="marquee-text">
            ✅ Transparent & Verifiable Elections
          </span>
          <span className="marquee-text">
            🌍 Accessible from Anywhere
          </span>
          <span className="marquee-text">
            🎉 Welcome to BlockBallot - Secure Blockchain Voting Platform
          </span>
          <span className="marquee-text">
            🔒 End-to-End Encrypted Voting
          </span>
          <span className="marquee-text">
            ⛓️ Powered by Arbitrum Blockchain
          </span>
        </div>
      </div>
    </>
  );
}