import { ethers } from 'ethers';

// Sanitize user input to prevent XSS
export const sanitizeInput = (input) => {
  if (!input) return '';

  return String(input)
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Validate Ethereum address
export const validateAddress = (address) => {
  try {
    return ethers.utils.isAddress(address);
  } catch {
    return false;
  }
};

// Validate voter key format
export const validateVoterKey = (key) => {
  if (!key) return false;

  // Remove 0x prefix if present
  const cleanKey = key.startsWith('0x') ? key.slice(2) : key;

  // Check if it's a valid 64-character hex string (32 bytes)
  return /^[a-fA-F0-9]{64}$/.test(cleanKey);
};

// Validate election ID
export const validateElectionId = (electionId) => {
  const id = parseInt(electionId);
  return !isNaN(id) && id > 0;
};

// Rate limiting check
const requestCounts = new Map();

export const checkRateLimit = (identifier, limit = 10, windowMs = 60000) => {
  const now = Date.now();
  const userRequests = requestCounts.get(identifier) || [];

  // Filter out old requests
  const recentRequests = userRequests.filter((time) => now - time < windowMs);

  if (recentRequests.length >= limit) {
    return false; // Rate limit exceeded
  }

  // Add current request
  recentRequests.push(now);
  requestCounts.set(identifier, recentRequests);

  return true; // Within rate limit
};

// Validate vote structure
export const validateVoteStructure = (votes, positions) => {
  if (!Array.isArray(votes)) return false;
  if (votes.length !== positions.length) return false;

  for (let i = 0; i < votes.length; i++) {
    const positionVotes = votes[i];
    const position = positions[i];

    if (!Array.isArray(positionVotes)) return false;
    if (positionVotes.length === 0) return false;
    if (positionVotes.length > position.maxSelections) return false;

    // Check all indices are valid
    for (const idx of positionVotes) {
      if (idx < 0 || idx >= position.candidates.length) return false;
    }
  }

  return true;
};

// Check if user is eligible to vote
export const checkVotingEligibility = async (electionId, voterKey) => {
  try {
    // This would typically check against backend
    if (!validateElectionId(electionId)) return false;
    if (!validateVoterKey(voterKey)) return false;

    return true;
  } catch (error) {
    console.error('Error checking voting eligibility:', error);
    return false;
  }
};

// Generate CSRF token
export const generateCSRFToken = () => {
  return ethers.utils.hexlify(ethers.utils.randomBytes(32));
};

// Validate CSRF token
export const validateCSRFToken = (token, storedToken) => {
  return token === storedToken;
};

// Detect suspicious activity
export const detectSuspiciousActivity = (activity) => {
  const suspiciousPatterns = [/script/gi, /javascript/gi, /eval/gi, /onclick/gi, /onerror/gi];

  return suspiciousPatterns.some((pattern) => pattern.test(activity));
};

// Export as default object AND named exports
const securityService = {
  sanitizeInput,
  validateAddress,
  validateVoterKey,
  validateElectionId,
  checkRateLimit,
  validateVoteStructure,
  checkVotingEligibility,
  generateCSRFToken,
  validateCSRFToken,
  detectSuspiciousActivity,
};

export default securityService;
