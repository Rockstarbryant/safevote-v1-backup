import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ElectionSelectionPage = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active');
  const navigate = useNavigate();

  // ✅ FIX 1: Use correct API endpoint
  // UUID is critical for merkle proof generation - do NOT use numeric IDs
  const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';

  useEffect(() => {
    fetchElections();
  }, [filter]);

  const fetchElections = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📡 Fetching from: ${BACKEND_API}/api/elections`);

      // ✅ FIX 2: Correct API URL (was using RESULTS_API which doesn't exist)
      const response = await fetch(`${BACKEND_API}/api/elections`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      let allElections = await response.json();
      console.log(`✅ Fetched ${allElections.length} elections from backend`, allElections);

      // ✅ FIX 3: Handle empty response
      if (!Array.isArray(allElections)) {
        console.warn('⚠️ API returned non-array response:', allElections);
        allElections = [];
      }

      // Filter client-side
      const now = Math.floor(Date.now() / 1000);
      let filtered = allElections;

      if (filter === 'active') {
        // Only show elections that are currently active
        filtered = allElections.filter(e => {
          const startOk = e.startTime && e.startTime <= now;
          const endOk = e.endTime && e.endTime >= now;
          return startOk && endOk;
        });
        console.log(`🔍 Filtered to ${filtered.length} active elections`);
      } else if (filter === 'completed') {
        filtered = allElections.filter(e => e.endTime && e.endTime < now);
        console.log(`🔍 Filtered to ${filtered.length} completed elections`);
      } else if (filter === 'upcoming') {
        filtered = allElections.filter(e => e.startTime && e.startTime > now);
        console.log(`🔍 Filtered to ${filtered.length} upcoming elections`);
      }
      // 'all' shows everything

      setElections(filtered);

      // ✅ FIX 4: Show helpful message if no elections match filter
      if (filtered.length === 0 && allElections.length > 0) {
        console.warn(`⚠️ No ${filter} elections. Total in DB: ${allElections.length}`);
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError(`Failed to load elections: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleElectionSelect = (election) => {
    console.log('🗳️ Selected election:', election);
    // Use election.uuid (critical for merkle proof verification)
    navigate(`/verify/${election.uuid}`);
  };

  const getStatusBadge = (election) => {
    const now = Math.floor(Date.now() / 1000);
    
    // ✅ FIX 5: Handle missing timestamps
    if (!election.startTime || !election.endTime) {
      return <span className="status-badge badge-inactive">Invalid</span>;
    }

    if (election.startTime > now) {
      return <span className="status-badge badge-upcoming">Upcoming</span>;
    }
    if (election.endTime < now) {
      return <span className="status-badge badge-completed">Completed</span>;
    }
    return <span className="status-badge badge-active">Active</span>;
  };

  const formatDate = (timestamp) => {
    // ✅ FIX 6: Handle both Unix timestamps and ISO strings
    if (!timestamp) return 'N/A';
    
    let date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      // Check if it's a Unix timestamp (seconds) or milliseconds
      date = new Date(timestamp * (timestamp > 10000000000 ? 1 : 1000));
    } else {
      return 'N/A';
    }

    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner message="Loading elections..." />
      </div>
    );
  }

  return (
    <div className="page-container election-selection-page">
      <div className="page-header">
        <h1>🗳️ Available Elections</h1>
        <p>Select an election to view details or cast your vote</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
          <button onClick={fetchElections} className="btn-text">Retry</button>
        </div>
      )}

      <div className="filter-tabs">
        <button 
          className={filter === 'active' ? 'tab-active' : 'tab'}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button 
          className={filter === 'completed' ? 'tab-active' : 'tab'}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button 
          className={filter === 'upcoming' ? 'tab-active' : 'tab'}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </button>
        <button 
          className={filter === 'all' ? 'tab-active' : 'tab'}
          onClick={() => setFilter('all')}
        >
          All
        </button>
      </div>

      {elections.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No elections found</h3>
          <p>
            {filter === 'all' 
              ? 'No elections in the database yet.' 
              : `No ${filter} elections available at the moment.`}
          </p>
          <button onClick={fetchElections} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            🔄 Refresh
          </button>
        </div>
      ) : (
        <div className="elections-grid">
          {elections.map(election => (
            <div key={election.uuid} className="election-card">
              <div className="election-header">
                <h3>{election.title || 'Untitled Election'}</h3>
                {getStatusBadge(election)}
              </div>

              <p className="election-description">
                {election.description || 'No description provided'}
              </p>

              <div className="election-meta">
                <div className="meta-item">
                  <span className="meta-label">📍 Location:</span>
                  <span className="meta-value">{election.location || 'Global'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">🗓️ Start:</span>
                  <span className="meta-value">{formatDate(election.startTime)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">⏰ End:</span>
                  <span className="meta-value">{formatDate(election.endTime)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">👥 Voters:</span>
                  <span className="meta-value">{election.totalVoters || 0} registered</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">🎯 Positions:</span>
                  <span className="meta-value">
                    {Array.isArray(election.positions) ? election.positions.length : 0}
                  </span>
                </div>
              </div>

              <div className="election-features">
                {election.allowAnonymous && (
                  <span className="feature-badge">🔒 Anonymous</span>
                )}
                {election.allowDelegation && (
                  <span className="feature-badge">🤝 Delegation</span>
                )}
                {election.isPublic && (
                  <span className="feature-badge">🌐 Public Results</span>
                )}
              </div>

              <button
                onClick={() => handleElectionSelect(election)}
                className="btn btn-primary btn-large"
              >
                Vote Now →
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="page-footer">
        <button onClick={fetchElections} className="btn-secondary">
          🔄 Refresh List
        </button>
      </div>
    </div>
  );
};

export default ElectionSelectionPage;