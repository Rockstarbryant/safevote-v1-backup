// ============================================================
// FILE 9: src/utils/constants.js
// Global Constants
// ============================================================

export const ELECTION_STATUS = {
  ACTIVE: 0,
  COMPLETED: 1,
  CANCELLED: 2,
};

export const ELECTION_STATUS_NAMES = {
  0: 'Active',
  1: 'Completed',
  2: 'Cancelled',
};

export const VOTING_STEPS = {
  SELECTION: 'election_selection',
  VERIFICATION: 'voter_verification',
  BALLOT: 'ballot',
  REVIEW: 'review',
  CONFIRMATION: 'confirmation',
};

export const ERROR_MESSAGES = {
  NO_METAMASK: 'MetaMask is not installed. Please install it first.',
  CONNECTION_FAILED: 'Failed to connect wallet. Please try again.',
  INVALID_ELECTION: 'Election not found or invalid.',
  VOTING_NOT_STARTED: 'Voting has not started yet.',
  VOTING_ENDED: 'Voting has ended.',
  INVALID_VOTE: 'Invalid vote selection.',
  SUBMISSION_FAILED: 'Failed to submit vote.',
  RATE_LIMIT: 'Too many requests. Please wait before trying again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
};

export const SUCCESS_MESSAGES = {
  VOTE_SUBMITTED: 'Your vote has been submitted successfully!',
  VOTE_DELEGATED: 'Your vote has been delegated successfully!',
  WALLET_CONNECTED: 'Wallet connected successfully!',
};

// Security settings
export const SECURITY_CONFIG = {
  RATE_LIMIT_REQUESTS: 10,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_INPUT_LENGTH: 1000,
  SESSION_TIMEOUT: 1800000, // 30 minutes
};

// API endpoints
export const API_ENDPOINTS = {
  ELECTIONS: '/api/elections',
  ELECTION: '/api/elections/:id',
  SYNC: '/api/sync/:id',
  ANALYTICS: '/api/analytics/:id',
  REPORT_ACTIVITY: '/api/report-activity',
};
