import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, PieChart, Pie, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import votingService from '../services/votingService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ResultsToggle from '../components/common/ResultsToggle';

const ResultsPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();

  // State
  const [election, setElection] = useState(null);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onChainId, setOnChainId] = useState(null);
  const [totalVoters, setTotalVoters] = useState(0);
  const [votedCount, setVotedCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [electionStatus, setElectionStatus] = useState('active');
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [historyData, setHistoryData] = useState([]);
  
  // 0 = disabled. You can change default if you want occasional auto-refresh.
  const [refreshInterval, setRefreshInterval] = useState(0);

  const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';

  // Fetch election details from backend
  const fetchElectionDetails = useCallback(async () => {
    try {
      console.log(`📊 Fetching election from: ${BACKEND_API}/api/elections/${electionId}`);
      
      const response = await fetch(`${BACKEND_API}/api/elections/${electionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Election fetched:`, data);
      
      setElection(data);
      setTotalVoters(data.totalVoters || 0);
      
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

  // Fetch real-time results from smart contract
  const fetchResults = useCallback(async (chainId) => {
    if (!chainId || !election) {
      console.log('⏭️ Skipping results fetch: chainId or election missing');
      return;
    }

    try {
      console.log(`📈 Fetching results for ${election.positions.length} positions...`);
      
      const newResults = {};
      let totalVotes = 0;

      for (let posIdx = 0; posIdx < election.positions.length; posIdx++) {
        const position = election.positions[posIdx];
        
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
      const avgVotes = election.positions.length > 0 ? totalVotes / election.positions.length : 0;
      setVotedCount(avgVotes);

      // Add to history for graph (only if auto-refresh is on)
      if (refreshInterval > 0) {
        setHistoryData(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          votes: avgVotes,
          timestamp: Date.now()
        }].slice(-50));
      }

      console.log(`✅ Results fetched: ${totalVotes} total votes`);
    } catch (err) {
      console.error('❌ Error fetching results:', err);
    }
  }, [election, refreshInterval]);

  // Time remaining countdown (minimal state updates)
  useEffect(() => {
    if (!election) return;

    const updateTimer = () => {
      const now = Date.now();
      const endTime = election.endTime * 1000;
      const remaining = endTime - now;

      if (remaining <= 0) {
        setElectionStatus('completed');
        setTimeRemaining(null);
      } else {
        setElectionStatus(remaining < 60000 ? 'closing' : 'active');

        if (remaining < 60000) {
          const seconds = Math.floor(remaining / 1000);
          setTimeRemaining(`${seconds}s`);
        } else if (remaining < 3600000) {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          setTimeRemaining(`${minutes}m ${seconds}s`);
        } else {
          const hours = Math.floor(remaining / 3600000);
          const minutes = Math.floor((remaining % 3600000) / 60000);
          setTimeRemaining(`${hours}h ${minutes}m`);
        }
      }
    };

    updateTimer(); // Immediate first update
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [election]);

  // Initial data load (only once)
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);

      const elecData = await fetchElectionDetails();
      const chainId = await fetchOnChainId();

      if (elecData && chainId) {
        await fetchResults(chainId);
      }

      setLoading(false);
    };

    init();
  }, [electionId, fetchElectionDetails, fetchOnChainId, fetchResults]);

  // Optional long-interval auto-refresh
  useEffect(() => {
    if (!onChainId || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchResults(onChainId);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [onChainId, fetchResults, refreshInterval]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    if (!onChainId) return;
    setLoading(true);
    await fetchResults(onChainId);
    setLoading(false);
  };

  // Loading / Error states
  if (loading && !election) {
    return <LoadingSpinner message="Loading election results..." />;
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
  const participationRate = totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(1) : 0;
  const remainingVoters = Math.max(0, totalVoters - Math.round(votedCount));

  const candleChartData = positionResults?.candidates?.map((candidate, idx) => ({
    name: candidate,
    votes: positionResults.votes[idx] || 0,
    percentage: totalVotesInPosition > 0 ? ((positionResults.votes[idx] / totalVotesInPosition) * 100).toFixed(1) : 0,
    fill: ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'][idx % 6]
  })) || [];

  const participationData = [
    { name: 'Voted', value: Math.round(votedCount), fill: '#82ca9d' },
    { name: 'Not Voted', value: remainingVoters, fill: '#ff7c7c' }
  ];

  return (
    <div className="results-page">
      <div className="results-header">
         <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ResultsToggle />
          <button className="back-btn" onClick={() => navigate('/elections')}>← Back</button>
        </div>
        <div className="header-content">
          <h1>{election.title}</h1>
          <p className="election-description">{election.description}</p>
        </div>
        <div className="header-status">
          <span className={`status-badge ${electionStatus}`}>{electionStatus.toUpperCase()}</span>
          {timeRemaining && <span className="time-remaining">⏱️ {timeRemaining}</span>}
        </div>
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
            <div className="info-label">Visibility</div>
            <div className="info-value">
              {election.isPublic ? '🌐 Public' : '🔒 Private'}
            </div>
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
              <div className="stat-value">{totalVoters}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-label">Already Voted</div>
              <div className="stat-value">{Math.round(votedCount)}</div>
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
            {candleChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={candleChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.votes}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="votes"
                  >
                    {candleChartData.map((entry, index) => (
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
            {candleChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={candleChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }}
                    cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                  />
                  <Bar dataKey="votes" fill="#8884d8" radius={[8, 8, 0, 0]}>
                    {candleChartData.map((entry, index) => (
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
            <h3>Voter Participation</h3>
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

          {/* Live Results Line Graph - only shown when auto-refresh is enabled */}
          {historyData.length > 1 && refreshInterval > 0 && (
            <div className="chart-card">
              <h3>Vote Trend (Live)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    interval={Math.max(0, historyData.length - 10)}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="votes"
                    stroke="#82ca9d"
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Candidate Results Table */}
        <div className="results-table">
          <h3>Detailed Results</h3>
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
              {candleChartData
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

      {/* Refresh Control */}
      <div className="refresh-control">
        <label>Auto-Refresh:</label>
        <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))}>
          <option value={0}>Off (Manual only)</option>
          <option value={300000}>Every 5 minutes</option>
          <option value={600000}>Every 10 minutes</option>
          <option value={1800000}>Every 30 minutes</option>
          <option value={3600000}>Every hour</option>
        </select>
        <button onClick={handleManualRefresh} className="refresh-btn">
          🔄 Refresh Now
        </button>
      </div>
    </div>
  );
};

export default ResultsPage;