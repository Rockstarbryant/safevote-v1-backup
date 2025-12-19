// ============================================================
// FILE 12: src/utils/securityUtils.js
// Additional Security Utilities
// ============================================================

import { sanitizeInput, generateCSRFToken, validateCSRFToken } from '../services/securityService';

/**
 * Create secure session
 */
export const createSecureSession = () => {
  const sessionId = generateCSRFToken();
  const timestamp = Date.now();
  const expiresAt = timestamp + 1800000; // 30 minutes

  return {
    sessionId,
    timestamp,
    expiresAt,
    isValid: () => Date.now() < expiresAt,
  };
};

/**
 * Validate session
 */
export const validateSession = (session) => {
  if (!session) return false;
  if (!session.sessionId) return false;
  if (Date.now() > session.expiresAt) return false;
  return true;
};

/**
 * Hash data (simple client-side)
 */
export const hashData = async (data) => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Encrypt sensitive data (basic)
 */
export const encryptData = (data, password) => {
  // Use a library like TweetNaCl.js for proper encryption
  // This is a simple example
  const encoded = new TextEncoder().encode(data);
  const key = new TextEncoder().encode(password);
  return btoa(String.fromCharCode.apply(null, encoded));
};

/**
 * Sanitize form input
 */
export const sanitizeFormInput = (input) => {
  return sanitizeInput(input);
};