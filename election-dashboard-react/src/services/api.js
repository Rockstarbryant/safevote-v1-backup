import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Get all elections
export const getElections = async () => {
  try {
    const response = await api.get('/elections');
    return response.data;
  } catch (error) {
    console.error('Error fetching elections:', error);
    throw error;
  }
};

// Search election by ID or title
export const getElection = async (query) => {
  try {
    const response = await api.get(`/elections/${query}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching election:', error);
    throw error;
  }
};

// Sync election from blockchain
export const syncElection = async (electionId) => {
  try {
    const response = await api.post(`/sync/${electionId}`);
    return response.data;
  } catch (error) {
    console.error('Error syncing election:', error);
    throw error;
  }
};

// Get analytics
export const getAnalytics = async (electionId) => {
  try {
    const response = await api.get(`/analytics/${electionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

export default api;