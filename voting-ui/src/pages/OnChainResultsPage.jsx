import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, PieChart, Pie, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import votingService from '../services/votingService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ResultsToggle from '../components/common/ResultsToggle';
import '../styles/ResultsPage.css';

const OnChainResultsPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();

  // State
  const [election, setElection] = useState(null);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onChainId, setOnChainId] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [dataSource, setDataSource] = useState('contract'); // 'contract' or 'backend'
  const [contractStats, setContractStats] = useState({
    totalVoters: 0,
    votedCount: 0,
    timeRemaining: null,
    electionStatus: 'active'
  });

  const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';

  // Fetch election metadata from backend
  const fetchElectionDetails = useCallback(async () => {
    try {
      console.log(`📡 Fetching election from: ${BACKEND_API}/api/elections/${electionId}`);
      
      const response = await fetch(`${BACKEND_API}/api/elections/${electionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Election fetched:`, data);
      
      setElection(data);
      
      return data;
    } catch (err) {
      console.error('❌ Error fetching election:', err);
      setError(`Failed to load election: ${err.message}`);
      return null;
    }
  }, [electionId, BACKEND_API]);

  // Fetch on-chain election ID
  const fetchOnChainId = useCallback(async () => {
    try {
      console.log(`🔗 Fetching on-chain ID for: ${electionId}`);
      
      const id = await votingService.getOnChainElectionId(electionId);
      setOnChainId(id);
      console.log(`✅ On-chain ID: ${id}`);
      
      return id;
    } catch (err) {
      console.error('❌ Error fetching on-chain ID:', err);
      setError(`Failed to get on-chain ID: ${err.message}`);
      return null;
    }
  }, [electionId]);

  // Fetch results directly from smart contract
  const fetchContractResults = useCallback(async (chainId, elecData) => {
    if (!chainId || !elecData) {
      console.log('⏭️ Skipping contract results: chainId or election missing');
      return;
    }

    try {
      console.log(`📈 Fetching ON-CHAIN results for ${elecData.positions.length} positions...`);
      
      const newResults = {};
      let totalVotes = 0;

      for (let posIdx = 0; posIdx < elecData.positions.length; posIdx++) {
        const position = elecData.positions[posIdx];
        
        try {
          const response = await votingService.getElectionResults(chainId, posIdx);
          
          newResults[posIdx] = {
            title: position.title,
            candidates: position.candidates,
            votes: response.votesCast || []
          };

          totalVotes += response.votesCast.reduce((a, b) => a + b, 0);
        } catch (posErr) {
          console.warn(`⚠️ Error fetching position ${posIdx}:`, posErr);
          newResults[posIdx] = {
            title: position.title,
            candidates: position.candidates,
            votes: new Array(position.candidates.length).fill(0)
          };
        }
      }

      setResults(newResults);
      const avgVotes = elecData.positions.length > 0 ? totalVotes / elecData.positions.length : 0;
      
      setContractStats(prev => ({
        ...prev,
        votedCount: avgVotes,
        totalVoters: elecData.totalVoters || 0
      }));

      console.log(`✅ Contract results fetched: ${totalVotes} total votes`);
    } catch (err) {
      console.error('❌ Error fetching contract results:', err);
    }
  }, []);

  // Time remaining countdown
  useEffect(() => {
    if (!election) return;

    const updateTimer = () => {
      const now = Date.now();
      const endTime = election.endTime * 1000;
      const remaining = endTime - now;

      if (remaining <= 0) {
        setContractStats(prev => ({ ...prev, electionStatus: 'completed', timeRemaining: null }));
      } else {
        const status = remaining < 60000 ? 'closing' : 'active';
        
        let timeStr;
        if (remaining < 60000) {
          const seconds = Math.floor(remaining / 1000);
          timeStr = `${seconds}s`;
        } else if (remaining < 3600000) {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          timeStr = `${minutes}m ${seconds}s`;
        } else {
          const hours = Math.floor(remaining / 3600000);
          const minutes = Math.floor((remaining % 3600000) / 60000);
          timeStr = `${hours}h ${minutes}m`;
        }
        
        setContractStats(prev => ({ ...prev, electionStatus: status, timeRemaining: timeStr }));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [election]);

  // Initial data load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);

      const elecData = await fetchElectionDetails();
      const chainId = await fetchOnChainId();

      if (elecData && chainId) {
        await fetchContractResults(chainId, elecData);
      }

      setLoading(false);
    };

    init();
  }, [electionId, fetchElectionDetails, fetchOnChainId, fetchContractResults]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    if (!onChainId || !election) return;
    setLoading(true);
    await fetchContractResults(onChainId, election);
    setLoading(false);
  };

  // Loading / Error states
  if (loading && !election) {
    return <LoadingSpinner message="Loading on-chain results..." />;
  }

  if (error) {
    return (
      <div className="results-error">
        <h2>❌ Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/elections')}>← Back to Elections</button>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="results-error">
        <h2>❌ Election Not Found</h2>
        <button onClick={() => navigate('/elections')}>← Back to Elections</button>
      </div>
    );
  }

  // Prepare data for display
  const position = election.positions[selectedPosition];
  const positionResults = results[selectedPosition];
  const totalVotesInPosition = positionResults?.votes?.reduce((a, b) => a + b, 0) || 0;
  const participationRate = contractStats.totalVoters > 0 
    ? ((contractStats.votedCount / contractStats.totalVoters) * 100).toFixed(1) 
    : 0;
  const remainingVoters = Math.max(0, contractStats.totalVoters - Math.round(contractStats.votedCount));

  const chartData = positionResults?.candidates?.map((candidate, idx) => ({
    name: candidate,
    votes: positionResults.votes[idx] || 0,
    percentage: totalVotesInPosition > 0 ? ((positionResults.votes[idx] / totalVotesInPosition) * 100).toFixed(1) : 0,
    fill: ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'][idx % 6]
  })) || [];

  const participationData = [
    { name: 'Voted', value: Math.round(contractStats.votedCount), fill: '#82ca9d' },
    { name: 'Not Voted', value: remainingVoters, fill: '#ff7c7c' }
  ];

  return (
    <div className="results-page">
      {/* Header with Data Source Toggle */}
      <div className="results-header">
        <button className="back-btn" onClick={() => navigate('/elections')}>← Back</button>
        <div className="header-content">
          <h1>{election.title}</h1>
          <p className="election-description">{election.description}</p>
        </div>
        <div className="header-status">
          <ResultsToggle />
          <span className={`status-badge ${contractStats.electionStatus}`}>
            {contractStats.electionStatus.toUpperCase()}
          </span>
          {contractStats.timeRemaining && <span className="time-remaining">⏱️ {contractStats.timeRemaining}</span>}
          
          {/* Data Source Badge */}
          <div className="data-source-badge">
            <span className="source-icon">⛓️</span>
            <span className="source-text">ON-CHAIN DATA</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="info-banner on-chain">
        <span className="banner-icon">🔗</span>
        <div className="banner-content">
          <strong>Reading directly from blockchain</strong>
          <p>Results fetched from smart contract in real-time</p>
        </div>
        <button onClick={handleManualRefresh} className="refresh-btn-small">
          🔄 Refresh
        </button>
      </div>

      <div className="results-grid">
        {/* Info Cards */}
        <div className="info-section">
          <div className="info-card">
            <div className="info-label">Election UUID</div>
            <code className="info-value-small">{electionId}</code>
          </div>
          <div className="info-card">
            <div className="info-label">On-Chain ID</div>
            <code className="info-value-small">{onChainId || 'Loading...'}</code>
          </div>
          <div className="info-card">
            <div className="info-label">Location</div>
            <div className="info-value">{election.location || 'N/A'}</div>
          </div>
          <div className="info-card">
            <div className="info-label">Data Source</div>
            <div className="info-value on-chain-text">⛓️ Smart Contract</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="timeline-section">
          <div className="timeline-card">
            <div className="timeline-item">
              <span className="timeline-label">Starts</span>
              <span className="timeline-value">{new Date(election.startTime * 1000).toLocaleString()}</span>
            </div>
            <div className="timeline-divider">→</div>
            <div className="timeline-item">
              <span className="timeline-label">Ends</span>
              <span className="timeline-value">{new Date(election.endTime * 1000).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Participation Stats */}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-label">Total Voters</div>
              <div className="stat-value">{contractStats.totalVoters}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-label">Already Voted</div>
              <div className="stat-value">{Math.round(contractStats.votedCount)}</div>
              <div className="stat-percentage">{participationRate}%</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-label">Remaining</div>
              <div className="stat-value">{remainingVoters}</div>
              <div className="stat-percentage">{(100 - participationRate).toFixed(1)}%</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🗳️</div>
            <div className="stat-content">
              <div className="stat-label">Positions</div>
              <div className="stat-value">{election.positions.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Position Tabs */}
      <div className="positions-tabs">
        {election.positions.map((pos, idx) => (
          <button
            key={idx}
            className={`tab-btn ${selectedPosition === idx ? 'active' : ''}`}
            onClick={() => setSelectedPosition(idx)}
          >
            {pos.title}
            <span className="badge">{results[idx]?.votes?.reduce((a, b) => a + b, 0) || 0}</span>
          </button>
        ))}
      </div>

      {/* Results Display */}
      <div className="results-container">
        <div className="position-header">
          <h2>{position?.title}</h2>
          <p className="votes-count">Total Votes: {totalVotesInPosition}</p>
        </div>

        <div className="charts-grid">
          {/* Pie Chart */}
          <div className="chart-card">
            <h3>Vote Distribution</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.votes}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="votes"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} votes`, 'Votes']}
                    contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: '#999' }}>No data yet</p>
            )}
          </div>

          {/* Bar Chart */}
          <div className="chart-card">
            <h3>Votes by Candidate</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }}
                    cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                  />
                  <Bar dataKey="votes" fill="#8884d8" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: '#999' }}>No data yet</p>
            )}
          </div>

          {/* Participation Pie */}
          <div className="chart-card">
            <h3>Voter Participation (On-Chain)</h3>
            {participationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={participationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {participationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} voters`, 'Count']}
                    contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: '#999' }}>No data yet</p>
            )}
          </div>
        </div>

        {/* Candidate Results Table */}
        <div className="results-table">
          <h3>Detailed Results (Blockchain)</h3>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Votes</th>
                <th>Percentage</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {chartData
                .sort((a, b) => b.votes - a.votes)
                .map((candidate, idx) => (
                  <tr key={idx} className={idx === 0 ? 'leading' : ''}>
                    <td className="rank">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </td>
                    <td className="candidate-name">
                      <span className="candidate-dot" style={{ background: candidate.fill }}></span>
                      {candidate.name}
                    </td>
                    <td className="votes">{candidate.votes}</td>
                    <td className="percentage">{candidate.percentage}%</td>
                    <td className="progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${candidate.percentage}%`,
                            background: candidate.fill
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OnChainResultsPage;