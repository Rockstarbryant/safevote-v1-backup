import React, { createContext, useContext, useState } from 'react';

const SecurityContext = createContext();

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within SecurityProvider');
  }
  return context;
};

export const SecurityProvider = ({ children }) => {
  const [securityWarnings, setSecurityWarnings] = useState([]);
  const [rateLimitInfo, setRateLimitInfo] = useState({
    requests: 0,
    windowStart: Date.now(),
    isBlocked: false
  });

  const addSecurityWarning = (warning) => {
    setSecurityWarnings(prev => [...prev, {
      id: Date.now(),
      message: warning,
      timestamp: new Date().toISOString()
    }]);
  };

  const clearSecurityWarnings = () => {
    setSecurityWarnings([]);
  };

  const updateRateLimit = (requests) => {
    setRateLimitInfo(prev => ({
      ...prev,
      requests,
      isBlocked: requests >= 10
    }));
  };

  const resetRateLimit = () => {
    setRateLimitInfo({
      requests: 0,
      windowStart: Date.now(),
      isBlocked: false
    });
  };

  const value = {
    securityWarnings,
    addSecurityWarning,
    clearSecurityWarnings,
    rateLimitInfo,
    updateRateLimit,
    resetRateLimit
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};