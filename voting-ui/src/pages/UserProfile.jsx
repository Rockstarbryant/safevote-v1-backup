import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { User, Mail, MapPin, Edit2, Save, X, Award, Calendar, Users, Vote } from 'lucide-react';

const UserProfile = () => {
  const { address } = useWallet();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    company: '',
    location: '',
    country: '',
    postalCode: '',
    aboutMe: ''
  });
  const [stats, setStats] = useState({
    electionsCreated: 0,
    totalVoters: 0,
    activeElections: 0,
    completedElections: 0
  });
  const [myElections, setMyElections] = useState([]);
  const [votingHistory, setVotingHistory] = useState([]);
  const [activityLog, setActivityLog] = useState([]);

  const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';

  useEffect(() => {
    if (address) {
      fetchUserData();
    }
  }, [address]);

  const fetchUserData = async () => {
    try {
      // Fetch user profile
      const profileRes = await fetch(`${BACKEND_API}/api/profile/${address}`);
      const profileData = await profileRes.json();

      setStats({
        electionsCreated: profileData.stats.electionsCreated,
        totalVoters: profileData.stats.totalVoters,
        activeElections: profileData.stats.activeElections,
        completedElections: profileData.stats.completedElections,
        votesCast: profileData.stats.votesCast
      });

      setMyElections(profileData.elections.slice(0, 5));
      setVotingHistory(profileData.votes.slice(0, 5));

      // Create activity log
      const activity = [
        ...profileData.elections.map(e => ({
          type: 'created',
          title: `Created ${e.title}`,
          date: new Date(e.created_at),
          icon: '📝'
        })),
        ...profileData.votes.map(v => ({
          type: 'voted',
          title: `Voted in election`,
          date: new Date(v.timestamp),
          icon: '🗳️'
        }))
      ].sort((a, b) => b.date - a.date).slice(0, 5);

      setActivityLog(activity);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // TODO: Save to backend
    setEditing(false);
    console.log('Profile updated:', profile);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner-pulse">
          <div className="pulse-ring"></div>
          <div className="pulse-ring pulse-ring-2"></div>
        </div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Page Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">Manage your account and view statistics</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-avatar">
              <User size={48} />
            </div>
            <button 
              className="btn-icon"
              onClick={() => setEditing(!editing)}
              title={editing ? 'Cancel' : 'Edit Profile'}
            >
              {editing ? <X size={20} /> : <Edit2 size={20} />}
            </button>
          </div>

          <div className="profile-info">
            <h2 className="profile-name">{profile.username || 'Anonymous User'}</h2>
            <p className="profile-address">{address?.substring(0, 10)}...{address?.substring(38)}</p>
          </div>

          <div className="profile-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={profile.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                disabled={!editing}
                placeholder="Enter your username"
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!editing}
                placeholder="user@example.com"
              />
            </div>

            <div className="form-group">
              <label>Company</label>
              <input
                type="text"
                value={profile.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                disabled={!editing}
                placeholder="Company name"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  disabled={!editing}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={profile.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  disabled={!editing}
                  placeholder="Country"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Postal Code</label>
              <input
                type="text"
                value={profile.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                disabled={!editing}
                placeholder="Postal code"
              />
            </div>

            <div className="form-group">
              <label>About Me</label>
              <textarea
                rows="4"
                value={profile.aboutMe}
                onChange={(e) => handleInputChange('aboutMe', e.target.value)}
                disabled={!editing}
                placeholder="Tell us about yourself..."
              />
            </div>

            {editing && (
              <div className="form-actions">
                <button className="btn-secondary" onClick={handleCancel}>
                  <X size={16} />
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSave}>
                  <Save size={16} />
                  Update Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Column */}
        <div className="profile-stats-column">
          {/* Stats Cards */}
          <div className="profile-stats-grid">
            <div className="stat-card-small stat-card-purple">
              <div className="stat-icon-small">
                <Vote size={24} />
              </div>
              <div className="stat-details">
                <h3>{stats.electionsCreated}</h3>
                <p>Elections Created</p>
              </div>
            </div>

            <div className="stat-card-small stat-card-green">
              <div className="stat-icon-small">
                <Users size={24} />
              </div>
              <div className="stat-details">
                <h3>{stats.totalVoters}</h3>
                <p>Total Voters</p>
              </div>
            </div>

            <div className="stat-card-small stat-card-blue">
              <div className="stat-icon-small">
                <Calendar size={24} />
              </div>
              <div className="stat-details">
                <h3>{stats.activeElections}</h3>
                <p>Active Now</p>
              </div>
            </div>

            <div className="stat-card-small stat-card-orange">
              <div className="stat-icon-small">
                <Award size={24} />
              </div>
              <div className="stat-details">
                <h3>{stats.completedElections}</h3>
                <p>Completed</p>
              </div>
            </div>
          </div>

          {/* My Elections */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2 className="card-title">My Elections</h2>
            </div>
            <div className="elections-list">
              {myElections.length === 0 ? (
                <div className="empty-elections">
                  <p>No elections created yet</p>
                </div>
              ) : (
                myElections.map(election => (
                  <div key={election.uuid} className="election-item">
                    <div className="election-item-content">
                      <h4>{election.title}</h4>
                      <p>{election.totalVoters || 0} voters</p>
                    </div>
                    <span className={`status-badge status-${
                      election.endTime < Math.floor(Date.now() / 1000) ? 'completed' : 
                      election.startTime > Math.floor(Date.now() / 1000) ? 'upcoming' : 
                      'active'
                    }`}>
                      {election.endTime < Math.floor(Date.now() / 1000) ? 'Completed' : 
                       election.startTime > Math.floor(Date.now() / 1000) ? 'Upcoming' : 
                       'Active'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Voting History */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2 className="card-title">Voting History</h2>
            </div>
            <div className="elections-list">
              {votingHistory.length === 0 ? (
                <div className="empty-elections">
                  <p>No votes cast yet</p>
                </div>
              ) : (
                votingHistory.map((vote, idx) => (
                  <div key={idx} className="election-item">
                    <div className="election-item-content">
                      <h4>Election ID: {vote.election_uuid.substring(0, 10)}...</h4>
                      <p>Position {vote.position_id} • {vote.candidate_name}</p>
                    </div>
                    <span className="status-badge status-completed">
                      Voted
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2 className="card-title">Recent Activity</h2>
            </div>
            <div className="activity-timeline">
              {activityLog.length === 0 ? (
                <div className="empty-elections">
                  <p>No activity yet</p>
                </div>
              ) : (
                activityLog.map((activity, idx) => (
                  <div key={idx} className="activity-item">
                    <div className="activity-icon">{activity.icon}</div>
                    <div className="activity-content">
                      <p className="activity-title">{activity.title}</p>
                      <span className="activity-date">
                        {activity.date.toLocaleDateString()} at {activity.date.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;