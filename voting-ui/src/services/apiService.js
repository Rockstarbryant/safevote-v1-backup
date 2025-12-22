// ============================================================
// FILE 4: src/services/apiService.js
// Backend API Communication
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Fetch election data from backend
 */
export const fetchElectionFromAPI = async (electionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/elections/${electionId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      election: data,
    };
  } catch (error) {
    console.error('❌ API Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Fetch all elections
 */
export const fetchElectionsFromAPI = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/elections`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      elections: Array.isArray(data) ? data : [],
    };
  } catch (error) {
    console.error('❌ API Error:', error.message);
    return {
      success: false,
      elections: [],
      error: error.message,
    };
  }
};

/**
 * Sync election data
 */
export const syncElectionFromAPI = async (electionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sync/${electionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      election: data.election,
    };
  } catch (error) {
    console.error('❌ Sync Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get election analytics
 */
export const getAnalyticsFromAPI = async (electionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/${electionId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      analytics: data,
    };
  } catch (error) {
    console.error('❌ Analytics Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Report suspicious activity
 */
export const reportSuspiciousActivity = async (activityData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/report-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        ...activityData,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to report activity:', error);
    return false;
  }
};
