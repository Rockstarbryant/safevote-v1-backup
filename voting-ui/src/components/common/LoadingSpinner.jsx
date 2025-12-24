import React from 'react';


export default function LoadingSpinner({ message = 'Loading...', type = 'pulse' }) {
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        {/* Pulse Ring Spinner (Default) */}
        {type === 'pulse' && (
          <div className="spinner-pulse">
            <div className="pulse-ring"></div>
            <div className="pulse-ring pulse-ring-2"></div>
            <div className="pulse-ring pulse-ring-3"></div>
            <div className="pulse-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="spinner-icon">
                <circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0110 10" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        )}

        {/* Orbital Spinner */}
        {type === 'orbital' && (
          <div className="spinner-orbital">
            <div className="orbit orbit-1"></div>
            <div className="orbit orbit-2"></div>
            <div className="orbit orbit-3"></div>
            <div className="spinner-center"></div>
          </div>
        )}

        {/* Gradient Spinner */}
        {type === 'gradient' && (
          <div className="spinner-gradient">
            <svg viewBox="0 0 50 50" className="gradient-spinner-svg">
              <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
            </svg>
          </div>
        )}

        {/* Dots Spinner */}
        {type === 'dots' && (
          <div className="spinner-dots">
            <div className="dot dot-1"></div>
            <div className="dot dot-2"></div>
            <div className="dot dot-3"></div>
            <div className="dot dot-4"></div>
          </div>
        )}

        {/* Bar Spinner */}
        {type === 'bars' && (
          <div className="spinner-bars">
            <div className="bar bar-1"></div>
            <div className="bar bar-2"></div>
            <div className="bar bar-3"></div>
            <div className="bar bar-4"></div>
          </div>
        )}

        {/* Message */}
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
}