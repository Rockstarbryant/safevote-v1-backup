import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Loader } from 'lucide-react';
import ElectionCreationService from '../services/ElectionCreationService';
import '../styles/CreateElectionPage.css';

const CreateElectionPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [electionData, setElectionData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    numVoters: 0,
    electionUUID: '',
    isPublic: true,
    allowAnonymous: false,
    allowDelegation: false,
    positions: [{ title: '', candidates: ['', ''] }],
  });

  const [selectedChains, setSelectedChains] = useState([11155111, 84532, 421614]);
  const [voterAddresses, setVoterAddresses] = useState([]);
  const [merkleRoot, setMerkleRoot] = useState(null);
  const [keyGenerationResult, setKeyGenerationResult] = useState(null);

  useEffect(() => {
    const uuid = ElectionCreationService.generateUUID();
    setElectionData(prev => ({ ...prev, electionUUID: uuid }));
  }, []);

  const chains = [
    { id: 11155111, name: 'Ethereum Sepolia', icon: '🔷' },
    { id: 84532, name: 'Base Sepolia', icon: '🔵' },
    { id: 421614, name: 'Arbitrum Sepolia', icon: '🔹' },
    { id: 97, name: 'BNB Testnet', icon: '🟡' },
    { id: 1328, name: 'Sei Testnet', icon: '⚡' },
  ];

  const handleInputChange = (field, value) => {
    setElectionData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handlePositionChange = (posIdx, field, value) => {
    setElectionData(prev => {
      const positions = [...prev.positions];
      positions[posIdx] = { ...positions[posIdx], [field]: value };
      return { ...prev, positions };
    });
  };

  const handleCandidateChange = (posIdx, candIdx, value) => {
    setElectionData(prev => {
      const positions = [...prev.positions];
      positions[posIdx].candidates[candIdx] = value;
      return { ...prev, positions };
    });
  };

  const addCandidate = (posIdx) => {
    setElectionData(prev => {
      const positions = [...prev.positions];
      positions[posIdx].candidates.push('');
      return { ...prev, positions };
    });
  };

  const removeCandidate = (posIdx, candIdx) => {
    setElectionData(prev => {
      const positions = [...prev.positions];
      if (positions[posIdx].candidates.length > 2) {
        positions[posIdx].candidates.splice(candIdx, 1);
      }
      return { ...prev, positions };
    });
  };

  const addPosition = () => {
    setElectionData(prev => ({
      ...prev,
      positions: [...prev.positions, { title: '', candidates: ['', ''] }],
    }));
  };

  const removePosition = (posIdx) => {
    setElectionData(prev => {
      if (prev.positions.length > 1) {
        const positions = [...prev.positions];
        positions.splice(posIdx, 1);
        return { ...prev, positions };
      }
      return prev;
    });
  };

  const handleChainToggle = (chainId) => {
    setSelectedChains(prev =>
      prev.includes(chainId)
        ? prev.filter(id => id !== chainId)
        : [...prev, chainId]
    );
  };

  const validateStep = async () => {
    setError(null);

    switch (currentStep) {
      case 1:
        if (!electionData.title || !electionData.startDate || !electionData.endDate) {
          setError('Please fill in all required fields (Title, Start Date, End Date)');
          return false;
        }
        const start = new Date(`${electionData.startDate}T${electionData.startTime}`);
        const end = new Date(`${electionData.endDate}T${electionData.endTime}`);
        if (start >= end) {
          setError('End date/time must be after start date/time');
          return false;
        }
        break;

      case 2:
        const invalidPositions = electionData.positions.filter(
          p => !p.title || p.candidates.filter(c => c).length === 0
        );
        if (invalidPositions.length > 0) {
          setError('All positions must have a title and at least one candidate');
          return false;
        }
        break;

      case 3:
        const addresses = document
          .getElementById('voterAddresses')
          ?.value.split('\n')
          .filter(a => a.trim()) || [];
        if (addresses.length === 0) {
          setError('Please add at least one voter address');
          return false;
        }
        setVoterAddresses(addresses);
        break;
    }
    return true;
  };

  const handleNext = async () => {
    if (!(await validateStep())) return;
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerateKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const addresses = document
        .getElementById('voterAddresses')
        ?.value.split('\n')
        .filter(a => a.trim()) || [];

      if (addresses.length === 0) {
        throw new Error('Please enter at least one voter address');
      }

      const result = await ElectionCreationService.generateKeys(
        electionData,
        addresses
      );

      setMerkleRoot(result.merkleRoot);
      setVoterAddresses(addresses);
      setKeyGenerationResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    setLoading(true);
    setError(null);
    try {
      await ElectionCreationService.deploy(
        electionData,
        voterAddresses,
        merkleRoot,
        selectedChains
      );
      setTimeout(() => {
        setCurrentStep(1);
        setElectionData(prev => ({
          ...prev,
          title: '',
          description: '',
          location: '',
          startDate: '',
          startTime: '',
          endDate: '',
          endTime: '',
          positions: [{ title: '', candidates: ['', ''] }],
          electionUUID: ElectionCreationService.generateUUID(),
        }));
        setSelectedChains([11155111, 84532, 421614]);
        setVoterAddresses([]);
        setMerkleRoot(null);
        setKeyGenerationResult(null);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-election-container">
      <div className="create-election-max-width">
        <div className="election-header">
          <h1 className="election-title">Conduct Election Onchain</h1>
          <p className="election-subtitle">Create your election in 5 easy steps</p>
        </div>

        <ProgressBar currentStep={currentStep} />

        <div className="content-box">
          {error && (
            <div className="error-alert">
              <AlertCircle className="error-icon" />
              <p className="error-text">{error}</p>
            </div>
          )}

          {loading && (
            <div className="loading-container">
              <Loader className="loading-spinner" />
              <span className="loading-text">Processing...</span>
            </div>
          )}

          {!loading && currentStep === 1 && <Step1 data={electionData} onChange={handleInputChange} />}
          {!loading && currentStep === 2 && (
            <Step2
              positions={electionData.positions}
              onPositionChange={handlePositionChange}
              onCandidateChange={handleCandidateChange}
              onAddCandidate={addCandidate}
              onRemoveCandidate={removeCandidate}
              onAddPosition={addPosition}
              onRemovePosition={removePosition}
            />
          )}
          {!loading && currentStep === 3 && (
            <Step3
              voterAddresses={voterAddresses}
              merkleRoot={merkleRoot}
              keyGenerationResult={keyGenerationResult}
              onGenerateKeys={handleGenerateKeys}
            />
          )}
          {!loading && currentStep === 4 && (
            <Step4 chains={chains} selectedChains={selectedChains} onChainToggle={handleChainToggle} />
          )}
          {!loading && currentStep === 5 && (
            <Step5
              data={electionData}
              positions={electionData.positions}
              voterAddresses={voterAddresses}
              selectedChains={selectedChains}
              chains={chains}
            />
          )}
        </div>

        <div className="nav-buttons">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="button-base button-secondary"
            style={{ opacity: currentStep === 1 ? 0.5 : 1, cursor: currentStep === 1 ? 'not-allowed' : 'pointer' }}
          >
            <ChevronLeft className="w-5 h-5" /> Previous
          </button>

          <button
            onClick={currentStep === 5 ? handleDeploy : handleNext}
            disabled={loading}
            className="button-base button-primary"
            style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {currentStep === 5 ? (
              <>
                🚀 Deploy <ChevronRight className="w-5 h-5" />
              </>
            ) : (
              <>
                Next <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ currentStep }) => {
  const steps = ['Details', 'Positions', 'Voters', 'Chains', 'Review'];
  return (
    <div className="progress-bar">
      {steps.map((label, i) => {
        const num = i + 1;
        const completed = num < currentStep;
        const active = num === currentStep;

        return (
          <React.Fragment key={num}>
            <div className="progress-step">
              <div
                className={`progress-circle ${
                  completed
                    ? 'progress-circle-completed'
                    : active
                    ? 'progress-circle-active'
                    : 'progress-circle-inactive'
                }`}
              >
                {completed ? <Check className="w-6 h-6" /> : num}
              </div>
              <span className="progress-label">{label}</span>
            </div>
            {i < 4 && <div className="progress-divider" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Step1 = ({ data, onChange }) => (
  <div>
    <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#fff', marginBottom: '2rem' }}>Step 1: Election Details</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <label className="form-label">Title *</label>
        <input
          type="text"
          value={data.title}
          onChange={e => onChange('title', e.target.value)}
          placeholder="e.g., 2025 Student Government Election"
          className="form-input"
        />
      </div>
      <div>
        <label className="form-label">Description</label>
        <textarea
          rows="3"
          value={data.description}
          onChange={e => onChange('description', e.target.value)}
          placeholder="Describe your election..."
          className="form-textarea"
        />
      </div>
      <div>
        <label className="form-label">Location</label>
        <input
          type="text"
          value={data.location}
          onChange={e => onChange('location', e.target.value)}
          placeholder="e.g., Stanford University"
          className="form-input"
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label className="form-label">Start Date *</label>
          <input type="date" value={data.startDate} onChange={e => onChange('startDate', e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="form-label">Start Time *</label>
          <input type="time" value={data.startTime} onChange={e => onChange('startTime', e.target.value)} className="form-input" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label className="form-label">End Date *</label>
          <input type="date" value={data.endDate} onChange={e => onChange('endDate', e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="form-label">End Time *</label>
          <input type="time" value={data.endTime} onChange={e => onChange('endTime', e.target.value)} className="form-input" />
        </div>
      </div>
      <div className="checkbox-group">
        <label className="checkbox-label">
          <input type="checkbox" checked={data.isPublic} onChange={e => onChange('isPublic', e.target.checked)} className="checkbox-input" />
          Public results (anyone can view)
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={data.allowAnonymous} onChange={e => onChange('allowAnonymous', e.target.checked)} className="checkbox-input" />
          Allow anonymous voting
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={data.allowDelegation} onChange={e => onChange('allowDelegation', e.target.checked)} className="checkbox-input" />
          Allow vote delegation
        </label>
      </div>
    </div>
  </div>
);

const Step2 = ({
  positions,
  onPositionChange,
  onCandidateChange,
  onAddCandidate,
  onRemoveCandidate,
  onAddPosition,
  onRemovePosition,
}) => (
  <div>
    <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#fff', marginBottom: '2rem' }}>Step 2: Positions & Candidates</h2>
    <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {positions.map((pos, posIdx) => (
        <div key={posIdx} className="position-card">
          <label className="form-label">Position {posIdx + 1}</label>
          <input
            type="text"
            value={pos.title}
            onChange={e => onPositionChange(posIdx, 'title', e.target.value)}
            placeholder="Position Title (e.g., President)"
            className="form-input"
            style={{ marginBottom: '1rem' }}
          />
          <label className="form-label">Candidates:</label>
          <div className="candidates-list">
            {pos.candidates.map((cand, candIdx) => (
              <div key={candIdx} className="candidate-input-group">
                <input
                  type="text"
                  value={cand}
                  onChange={e => onCandidateChange(posIdx, candIdx, e.target.value)}
                  placeholder={`Candidate ${candIdx + 1}`}
                  className="form-input"
                />
                {pos.candidates.length > 2 && (
                  <button onClick={() => onRemoveCandidate(posIdx, candIdx)} className="button-base button-danger button-small">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => onAddCandidate(posIdx)} className="button-base button-small" style={{ backgroundColor: 'rgba(168, 85, 247, 0.3)', color: '#ddd6fe', marginRight: '0.5rem' }}>
            + Add Candidate
          </button>
          {positions.length > 1 && (
            <button onClick={() => onRemovePosition(posIdx)} className="button-base button-danger button-small">
              Remove Position
            </button>
          )}
        </div>
      ))}
    </div>
    <button onClick={onAddPosition} className="button-base button-primary" style={{ width: '100%' }}>
      + Add Position
    </button>
  </div>
);

const Step3 = ({ voterAddresses, merkleRoot, keyGenerationResult, onGenerateKeys }) => (
  <div>
    <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#fff', marginBottom: '2rem' }}>Step 3: Register Voters</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <label className="form-label">Voter Addresses (one per line)</label>
        <textarea
          id="voterAddresses"
          rows="8"
          placeholder="0x1234...&#10;0x5678...&#10;0xabcd..."
          className="form-textarea"
        />
        <p style={{ color: '#fff', fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.7 }}>Paste Ethereum addresses, one per line</p>
      </div>
      <button onClick={onGenerateKeys} className="button-base button-primary" style={{ width: '100%' }}>
        🔑 Generate Voter Keys
      </button>
      {keyGenerationResult && (
        <div className="success-alert">
          <h3 className="success-title">✅ Election & Keys Generated!</h3>
          <div className="success-content">
            <p>Election UUID: <span className="review-code">{keyGenerationResult.electionId}</span></p>
            <p>Merkle Root: <span className="review-code">{merkleRoot?.substring(0, 20)}...</span></p>
            <p>Total Voters: {voterAddresses.length}</p>
          </div>
        </div>
      )}
    </div>
  </div>
);

const Step4 = ({ chains, selectedChains, onChainToggle }) => (
  <div>
    <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Step 4: Select Blockchains</h2>
    <p style={{ color: '#d1d5db', marginBottom: '2rem' }}>Choose which chains to deploy your election to</p>
    <div className="chains-grid">
      {chains.map(chain => (
        <label key={chain.id} className={`chain-option ${selectedChains.includes(chain.id) ? 'chain-option-selected' : ''}`}>
          <input type="checkbox" checked={selectedChains.includes(chain.id)} onChange={() => onChainToggle(chain.id)} style={{ marginRight: '0.75rem' }} />
          <span className="chain-icon">{chain.icon}</span>
          <span className="chain-name">{chain.name}</span>
        </label>
      ))}
    </div>
    <div className="info-box" style={{ marginTop: '2rem' }}>
      <h3 className="info-title">💡 Why Multichain?</h3>
      <ul className="info-list">
        <li>• Distribute load across networks</li>
        <li>• Scale to millions of voters</li>
        <li>• Give voters chain choice</li>
        <li>• Prevent single point of failure</li>
      </ul>
    </div>
  </div>
);

const Step5 = ({ data, positions, voterAddresses, selectedChains, chains }) => {
  const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
  const endDateTime = new Date(`${data.endDate}T${data.endTime}`);
  const duration = Math.floor((endDateTime - startDateTime) / (1000 * 60 * 60));
  const chainNames = {
    11155111: 'Ethereum Sepolia',
    84532: 'Base Sepolia',
    421614: 'Arbitrum Sepolia',
    97: 'BNB Testnet',
    1328: 'Sei Testnet',
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#fff', marginBottom: '2rem' }}>Step 5: Review & Deploy</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="review-section">
          <h3>📋 Election Details</h3>
          <div className="review-content">
            <div className="review-item"><span className="review-label">UUID:</span> <span className="review-code">{data.electionUUID}</span></div>
            <div className="review-item"><span className="review-label">Title:</span> {data.title}</div>
            <div className="review-item"><span className="review-label">Start:</span> {data.startDate} at {data.startTime}</div>
            <div className="review-item"><span className="review-label">End:</span> {data.endDate} at {data.endTime}</div>
            <div className="review-item"><span className="review-label">Duration:</span> {duration} hours</div>
          </div>
        </div>

        <div className="review-section">
          <h3>🎯 Positions ({positions.length})</h3>
          <div className="review-content">
            {positions.map((p, i) => (
              <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                <p><strong>{i + 1}. {p.title || 'Untitled Position'}</strong></p>
                <p style={{ color: '#d1d5db', marginTop: '0.25rem' }}>Candidates: {p.candidates.filter(c => c).length}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="review-section">
          <h3>👥 Voters ({voterAddresses.length})</h3>
          <p style={{ color: '#fff', fontSize: '0.875rem' }}>{voterAddresses.length} registered voter{voterAddresses.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="review-section">
          <h3>⛓️ Selected Chains ({selectedChains.length})</h3>
          <div className="review-content">
            {selectedChains.map(chainId => (
              <p key={chainId}>✓ {chainNames[chainId] || 'Chain ' + chainId}</p>
            ))}
          </div>
        </div>

        <div className="ready-to-deploy">
          <h3 className="ready-title">✅ Ready to Deploy</h3>
          <p className="ready-text">Your election is ready to be deployed! Click the "🚀 Deploy" button to create this election on the selected blockchains.</p>
          <p className="ready-warning">Make sure your wallet is connected and has sufficient gas fees on each chain.</p>
        </div>
      </div>
    </div>
  );
};

export default CreateElectionPage;