// ============================================================
// FILE 10: src/utils/validators.js
// Input Validation Functions
// ============================================================

import {
  validateVoterKey,
  validateElectionId,
  validateAddress,
  validateVoteStructure,
} from '../services/securityService';

/**
 * Validate voting input
 */
export const validateVotingInput = (electionId, voterKey, votes, positions) => {
  const errors = [];

  // Validate election ID
  if (!validateElectionId(electionId)) {
    errors.push('Invalid election ID');
  }

  // Validate voter key
  if (!validateVoterKey(voterKey)) {
    errors.push('Invalid voter key format');
  }

  // Validate vote structure
  if (!validateVoteStructure(votes, positions)) {
    errors.push('Invalid vote selection');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate delegation input
 */
export const validateDelegationInput = (delegateAddress) => {
  const errors = [];

  if (!validateAddress(delegateAddress)) {
    errors.push('Invalid delegate address');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate election object
 */
export const validateElectionObject = (election) => {
  const required = [
    'election_id',
    'title',
    'positions',
    'start_time',
    'end_time',
    'status',
  ];

  const missing = required.filter(field => !(field in election));

  return {
    valid: missing.length === 0,
    missing,
  };
};