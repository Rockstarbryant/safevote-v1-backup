// ============================================================
// FILE 7: src/hooks/useRateLimit.js
// Rate Limiting Protection
// ============================================================

import { useState, useCallback } from 'react';
import { checkRateLimit } from '../services/securityService';

export const useRateLimit = (maxRequests = 10, timeWindow = 60000) => {
  const [rateLimitError, setRateLimitError] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);

  /**
   * Check if action is allowed
   */
  const checkLimit = useCallback(
    (key = 'default') => {
      const allowed = checkRateLimit(key, maxRequests, timeWindow);

      if (!allowed) {
        const error = `Too many requests. Try again in ${Math.ceil(timeWindow / 1000)} seconds`;
        setRateLimitError(error);
        setAttemptCount((prev) => prev + 1);
        return false;
      }

      setRateLimitError(null);
      setAttemptCount(0);
      return true;
    },
    [maxRequests, timeWindow]
  );

  /**
   * Reset rate limit
   */
  const reset = useCallback(() => {
    setRateLimitError(null);
    setAttemptCount(0);
  }, []);

  return {
    checkLimit,
    rateLimitError,
    attemptCount,
    reset,
  };
};
