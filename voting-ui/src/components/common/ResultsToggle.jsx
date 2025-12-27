import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Database, Link as LinkIcon } from 'lucide-react';

const ResultsToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { electionId } = useParams();
  
  const isOnChain = location.pathname.includes('/results/onchain/');
  
  const handleToggle = (mode) => {
    if (mode === 'onchain') {
      navigate(`/results/onchain/${electionId}`);
    } else {
      navigate(`/results/${electionId}`);
    }
  };

  return (
    <div className="data-source-toggle">
      <button
        className={`toggle-btn ${!isOnChain ? 'active' : ''}`}
        onClick={() => handleToggle('backend')}
      >
        <Database size={16} style={{ marginRight: '0.5rem' }} />
        Backend Data
      </button>
      <button
        className={`toggle-btn ${isOnChain ? 'active' : ''}`}
        onClick={() => handleToggle('onchain')}
      >
        <LinkIcon size={16} style={{ marginRight: '0.5rem' }} />
        On-Chain Data
      </button>
    </div>
  );
};

export default ResultsToggle;