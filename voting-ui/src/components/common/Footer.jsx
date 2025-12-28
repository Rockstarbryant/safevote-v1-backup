import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <footer className="glass-header py-6 mt-12">
      <div className="container mx-auto px-6">
        {/* Main Footer Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 text-white">
          {/* Column 1: About */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <i className="fas fa-shield-alt text-2xl text-purple-300"></i>
              <h3 className="text-lg font-bold">BlockBallot</h3>
            </div>
            <p className="text-sm opacity-70 leading-relaxed">
              A decentralized voting platform leveraging blockchain technology to ensure 
              transparent, secure, and tamper-proof elections.
            </p>
            <div className="flex items-center space-x-3 mt-4">
              <div className="glass px-3 py-1 rounded-full text-xs font-semibold">
                <i className="fas fa-shield-alt mr-1"></i>Secure
              </div>
              <div className="glass px-3 py-1 rounded-full text-xs font-semibold">
                <i className="fas fa-check-circle mr-1"></i>Verified
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-purple-300">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fas fa-chart-line mr-2"></i>Dashboard
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/elections')}
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fas fa-vote-yea mr-2"></i>Browse Elections
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/create-election')}
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fas fa-plus-circle mr-2"></i>Create Election
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/results')}
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fas fa-chart-bar mr-2"></i>View Results
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-purple-300">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://docs.arbitrum.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fas fa-book mr-2"></i>Documentation
                </a>
              </li>
              <li>
                <a 
                  href="https://sepolia.arbiscan.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fas fa-cube mr-2"></i>Block Explorer
                </a>
              </li>
              <li>
                <button 
                  onClick={() => alert('API Documentation coming soon!')}
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fas fa-code mr-2"></i>API Reference
                </button>
              </li>
              <li>
                <button 
                  onClick={() => alert('Support: contact@blockballot.io')}
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fas fa-life-ring mr-2"></i>Help & Support
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Community */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-purple-300">Community</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://github.com/blockballot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fab fa-github mr-2"></i>GitHub
                </a>
              </li>
              <li>
                <a 
                  href="https://twitter.com/blockballot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fab fa-twitter mr-2"></i>Twitter
                </a>
              </li>
              <li>
                <a 
                  href="https://discord.gg/blockballot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fab fa-discord mr-2"></i>Discord
                </a>
              </li>
              <li>
                <a 
                  href="mailto:contact@blockballot.io"
                  className="opacity-70 hover:opacity-100 hover:text-yellow-300 transition-all"
                >
                  <i className="fas fa-envelope mr-2"></i>Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-purple-500 border-opacity-20 mb-6"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-white text-sm">
          {/* Copyright */}
          <p className="opacity-70">
            &copy; {currentYear} BlockBallot. Built on Arbitrum Blockchain.
          </p>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => alert('Privacy Policy')}
              className="text-yellow-300 hover:underline"
            >
              Privacy Policy
            </button>
            <span className="opacity-50">|</span>
            <button 
              onClick={() => alert('Terms of Service')}
              className="text-yellow-300 hover:underline"
            >
              Terms of Service
            </button>
            <span className="opacity-50">|</span>
            <a 
              href="https://docs.arbitrum.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-yellow-300 hover:underline"
            >
              Docs
            </a>
          </div>

          {/* Network Badge */}
          <div className="glass px-3 py-1 rounded-full flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold">Arbitrum Sepolia</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 pt-6 border-t border-purple-500 border-opacity-20 text-center">
          <p className="text-xs text-white opacity-60">
            ⚠️ This is a testnet application. Do not use real funds or sensitive information. 
            BlockBallot uses blockchain technology to ensure vote integrity and transparency.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;