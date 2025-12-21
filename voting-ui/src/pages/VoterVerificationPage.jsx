import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVoting } from '../context/VotingContext';
import { useSecurity } from '../context/SecurityContext';
import { useWallet } from '../hooks/useWallet';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SecurityWarning from '../components/security/SecurityWarning';

  const VoterVerificationPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { setCurrentElection, setVoterKey, setMerkleProof, setIsVerified, setWalletAddress } = useVoting();
  const { addSecurityWarning } = useSecurity();
  const { address, connectWallet, isConnecting } = useWallet();

  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('');

  // const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const KEYGEN_API = process.env.REACT_APP_KEYGEN_API || 'http://localhost:3001';
  const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';

  useEffect(() => {
    if (electionId) {
      fetchElection();
    }
  }, [electionId]);

  useEffect(() => {
    if (address && election) {
      setWalletAddress(address);
      autoVerifyVoter();
    }
  }, [address, election]);

  const fetchElection = async () => {
    try {
      setLoading(true);
      setError(null);

     // const response = await fetch(`${API_URL}/api/elections/uuid/${electionId}`);
      const response = await fetch(`${BACKEND_API}/api/elections/${electionId}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Election not found');
      }

      const electionData = await response.json();

      const now = Math.floor(Date.now() / 1000);
      if (electionData.startTime && now < electionData.startTime) {
        setError('This election has not started yet.');
        return;
      }
      if (electionData.endTime && now > electionData.endTime) {
        setError('This election has ended.');
        return;
      }

      setElection(electionData);
      setCurrentElection(electionData);
    } catch (err) {
      setError(err.message || 'Failed to load election. Please check the link.');
      console.error('Election fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const autoVerifyVoter = async () => {
    if (!address || !election) return;

    try {
      setVerifying(true);
      setError(null);

    //  const response = await fetch(`${API_URL}/api/elections/${electionId}/keys/${address}`);
      const response = await fetch(`${KEYGEN_API}/api/elections/${electionId}/keys/${address}`);

      if (!response.ok) {
        if (response.status === 403) {
          setVerificationStatus('alreadyVoted');
          setError('You have already voted in this election.');
          addSecurityWarning('Double vote attempt detected');
        } else if (response.status === 404) {
          setVerificationStatus('ineligible');
          setError('Your wallet is not registered for this election.');
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Verification failed');
        }
        return;
      }

      const data = await response.json();

      if (!data.success || !data.key || !data.merkleProof) {
        throw new Error('Invalid verification data received');
      }

      setVoterKey(data.key);
      setMerkleProof(data.merkleProof);
      setIsVerified(true);
      setVerificationStatus('success');

      setTimeout(() => {
        navigate(`/vote/${electionId}`);
      }, 2000);
    } catch (err) {
      console.error('Auto verification failed:', err);
      setError(err.message || 'Verification failed. Please try again.');
      addSecurityWarning('Voter verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (err) {
      setError('Failed to connect wallet.');
      addSecurityWarning('Wallet connection failed');
    }
  };

  if (loading) {
    return (
      <div className="verification-page">
        <LoadingSpinner message="Loading election..." />
      </div>
    );
  }

  if (error && !election) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <div className="verification-error-state">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">{error}</h2>
            <p className="error-description">
              Make sure you're using the correct voting link shared by the election organizer.
            </p>
            <button 
              onClick={() => navigate('/elections')} 
              className="verification-btn verification-btn-primary"
            >
              ← Back to Elections
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-page">
      <div className="verification-container">
        
        {/* Header Card */}
        <div className="verification-header-card">
          <div className="verification-header-content">
            <h1 className="verification-title">Voter Verification</h1>
            <p className="verification-subtitle">
              Verify your eligibility for: <strong>{election?.title || 'Loading...'}</strong>
            </p>
          </div>
        </div>

        {/* Security Warning */}
        <div className="verification-security-card">
          <SecurityWarning />
        </div>

        {/* Step 1: Connect Wallet */}
        <div className="verification-step-card">
          <div className="step-header">
            <div className="step-number">1</div>
            <h3 className="step-title">Connect Your Wallet</h3>
          </div>

          {!address ? (
            <div className="step-content">
              <p className="step-description">Connect your wallet to verify your voting eligibility</p>
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="verification-btn verification-btn-primary"
              >
                {isConnecting ? '⏳ Connecting...' : '🔌 Connect Wallet'}
              </button>
            </div>
          ) : (
            <div className="step-success">
              <span className="success-check">✓</span>
              <div className="success-content">
                <p className="success-label">Wallet Connected</p>
                <code className="success-address">{address.substring(0, 6)}...{address.substring(38)}</code>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Verification */}
        {address && (
          <div className="verification-step-card">
            <div className="step-header">
              <div className="step-number">2</div>
              <h3 className="step-title">Verify Eligibility</h3>
            </div>

            {verifying && (
              <div className="step-content-center">
                <LoadingSpinner message="Checking your eligibility..." />
              </div>
            )}

            {verificationStatus === 'success' && (
              <div className="step-success-large">
                <div className="success-icon-large">✓</div>
                <h4 className="success-title">You're Eligible to Vote!</h4>
                <p className="success-message">Redirecting to your ballot...</p>
              </div>
            )}

            {verificationStatus === 'alreadyVoted' && (
              <div className="verification-alert verification-alert-error">
                <span className="alert-icon">🔒</span>
                <div className="alert-content">
                  <h4 className="alert-title">Already Voted</h4>
                  <p className="alert-message">Thank you for participating in this election.</p>
                </div>
              </div>
            )}

            {verificationStatus === 'ineligible' && (
              <div className="verification-alert verification-alert-warning">
                <span className="alert-icon">⚠️</span>
                <div className="alert-content">
                  <h4 className="alert-title">Not Eligible</h4>
                  <p className="alert-message">Your wallet address is not on the approved voter list.</p>
                  <p className="alert-sub">Please contact the election organizer if you believe this is a mistake.</p>
                </div>
              </div>
            )}

            {error && !verifying && verificationStatus === '' && (
              <div className="verification-alert verification-alert-error">
                <span className="alert-icon">⚠️</span>
                <p className="alert-message">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="verification-footer">
        <button 
          onClick={() => navigate('/elections')} 
          className="verification-footer-link"
        >
          ← Back to Elections
        </button>
      </div>
    </div>
  );
};

export default VoterVerificationPage;