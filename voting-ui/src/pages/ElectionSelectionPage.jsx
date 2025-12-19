import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ElectionSelectionPage = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active');
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchElections();
  }, [filter]);

  const fetchElections = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from backend using UUIDs
      const response = await fetch(`${API_URL}/api/elections/all`);
      if (!response.ok) throw new Error('Failed to load elections');

      let allElections = await response.json();

      // Filter client-side
      const now = Math.floor(Date.now() / 1000);
      let filtered = allElections;

      if (filter === 'active') {
        filtered = allElections.filter(e => 
          e.startTime <= now && e.endTime >= now
        );
      } else if (filter === 'completed') {
        filtered = allElections.filter(e => e.endTime < now);
      }
      // 'all' shows everything

      setElections(filtered);
    } catch (err) {
      setError('Failed to load elections from server.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleElectionSelect = (election) => {
    navigate(`/verify/${election.id}`); // id = UUID from backend
  };

  const getStatusBadge = (election) => {
    const now = Math.floor(Date.now() / 1000);
    if (election.startTime > now) return <span className="status-badge badge-upcoming">Upcoming</span>;
    if (election.endTime < now) return <span className="status-badge badge-completed">Completed</span>;
    return <span className="status-badge badge-active">Active</span>;
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
          <p>No {filter} elections available at the moment.</p>
        </div>
      ) : (
        <div className="elections-grid">
          {elections.map(election => (
            <div key={election.id} className="election-card">
              <div className="election-header">
                <h3>{election.title || 'Untitled Election'}</h3>
                {getStatusBadge(election)}
              </div>

              <p className="election-description">
                {election.description || 'No description'}
              </p>

              <div className="election-meta">
                <div className="meta-item">
                  <span className="meta-label">📍 Location:</span>
                  <span className="meta-value">{election.location || 'Global'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">🗓️ Start:</span>
                  <span className="meta-value">
                    {new Date(election.startTime * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">⏰ End:</span>
                  <span className="meta-value">
                    {new Date(election.endTime * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">👥 Voters:</span>
                  <span className="meta-value">{election.totalVoters || 0} registered</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">🎯 Positions:</span>
                  <span className="meta-value">{election.positions?.length || 0}</span>
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