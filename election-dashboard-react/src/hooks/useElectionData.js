import { useState, useEffect } from 'react';
import { syncElection, getElection, getAnalytics } from '../services/api';

export const useElectionData = (electionId) => {
  const [election, setElection] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load election data
  const loadElection = async (id) => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Sync from blockchain first
      await syncElection(id);

      // Get updated election data
      const electionData = await getElection(id);
      setElection(electionData);

      // Get analytics
      const analyticsData = await getAnalytics(id);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err.message);
      console.error('Error loading election:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 10 seconds when election is loaded
  useEffect(() => {
    if (!election) return;

    const interval = setInterval(() => {
      loadElection(election.election_id);
    }, 10000);

    return () => clearInterval(interval);
  }, [election]);

  return { election, analytics, loading, error, loadElection };
};
