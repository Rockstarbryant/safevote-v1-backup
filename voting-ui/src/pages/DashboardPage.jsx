import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, CheckCircle, Activity, ArrowUp, ArrowDown } from 'lucide-react';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalElections: 0,
    activeVoters: 0,
    completedVotes: 0,
    systemStatus: 0
  });
  const [recentElections, setRecentElections] = useState([]);
  const [loading, setLoading] = useState(true);

  const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${BACKEND_API}/api/elections`);
      const elections = await response.json();

      const now = Math.floor(Date.now() / 1000);
      const active = elections.filter(e => e.startTime <= now && e.endTime >= now).length;
      const completed = elections.filter(e => e.endTime < now).length;
      const totalVoters = elections.reduce((sum, e) => sum + (e.totalVoters || 0), 0);

      setStats({
        totalElections: elections.length,
        activeVoters: totalVoters,
        completedVotes: completed,
        systemStatus: active > 0 ? 100 : 85
      });

      setRecentElections(elections.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Elections',
      value: stats.totalElections,
      icon: TrendingUp,
      color: 'green',
      trend: '+12%',
      trendUp: true,
      subtitle: 'Since last month'
    },
    {
      title: 'Active Voters',
      value: stats.activeVoters,
      icon: Users,
      color: 'orange',
      trend: '+8%',
      trendUp: true,
      subtitle: 'Registered users'
    },
    {
      title: 'Completed Votes',
      value: stats.completedVotes,
      icon: CheckCircle,
      color: 'red',
      trend: '+23%',
      trendUp: true,
      subtitle: 'Total finalized'
    },
    {
      title: 'System Status',
      value: `${stats.systemStatus}%`,
      icon: Activity,
      color: 'blue',
      trend: 'Operational',
      trendUp: true,
      subtitle: 'All systems go'
    }
  ];

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-pulse">
          <div className="pulse-ring"></div>
          <div className="pulse-ring pulse-ring-2"></div>
          <div className="pulse-ring pulse-ring-3"></div>
        </div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back to BlockBallot</p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="stats-grid">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`stat-card stat-card-${card.color}`}>
              <div className="stat-card-header">
                <div className="stat-icon-wrapper">
                  <Icon className="stat-icon" size={24} />
                </div>
                <div className="stat-trend">
                  {card.trendUp ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                  <span>{card.trend}</span>
                </div>
              </div>
              <div className="stat-content">
                <h3 className="stat-value">{card.value}</h3>
                <p className="stat-title">{card.title}</p>
                <p className="stat-subtitle">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Elections Table */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">Recent Elections</h2>
          <button 
            className="btn-text"
            onClick={() => navigate('/elections')}
          >
            View All →
          </button>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Voters</th>
                <th>End Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentElections.map((election) => {
                const now = Math.floor(Date.now() / 1000);
                const status = election.endTime < now ? 'Completed' : 
                              election.startTime > now ? 'Upcoming' : 'Active';
                
                return (
                  <tr key={election.uuid}>
                    <td className="font-medium">{election.title}</td>
                    <td>
                      <span className={`status-badge status-${status.toLowerCase()}`}>
                        {status}
                      </span>
                    </td>
                    <td>{election.totalVoters || 0}</td>
                    <td>{new Date(election.endTime * 1000).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-action"
                        onClick={() => navigate(`/results/${election.uuid}`)}
                      >
                        View Results
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;