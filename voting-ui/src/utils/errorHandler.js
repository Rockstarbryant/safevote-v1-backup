// ============================================================
// FILE 13: src/utils/errorHandler.js
// Error Handling Utilities
// ============================================================

/**
 * Handle contract errors
 */
export const handleContractError = (error) => {
  const message = error.message || error.toString();

  if (message.includes('revert')) {
    return 'Transaction was reverted. Please check your input.';
  }

  if (message.includes('insufficient')) {
    return 'Insufficient balance or gas.';
  }

  if (message.includes('denied')) {
    return 'Transaction was denied by user.';
  }

  if (message.includes('network')) {
    return 'Network error. Please check your connection.';
  }

  return `Error: ${message}`;
};

/**
 * Handle API errors
 */
export const handleAPIError = (error) => {
  if (error.status === 404) {
    return 'Resource not found.';
  }

  if (error.status === 500) {
    return 'Server error. Please try again later.';
  }

  if (error.message === 'Failed to fetch') {
    return 'Network error. Please check your connection.';
  }

  return error.message || 'An unknown error occurred.';
};

/**
 * Handle wallet errors
 */
export const handleWalletError = (error) => {
  const message = error.message || error.toString();

  if (message.includes('MetaMask')) {
    return 'MetaMask error. Please check your wallet.';
  }

  if (message.includes('chainId')) {
    return 'Wrong network. Please switch to Arbitrum.';
  }

  if (message.includes('account')) {
    return 'No account connected. Please connect your wallet.';
  }

  return message;
};

/**
 * Create error object
 */
export const createError = (type, message, details = {}) => {
  return {
    type,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
};
