// Format wallet address
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(38)}`;
};

// Format date/time
export const formatDateTime = (timestamp) => {
  if (!timestamp) return 'Invalid Date';
  const ts = Number(timestamp);
  if (isNaN(ts)) return 'Invalid Date';
  const date = new Date(ts * 1000);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleString();
};

// Format date only
export const formatDate = (timestamp) => {
  if (!timestamp) return 'Invalid Date';
  const ts = Number(timestamp);
  if (isNaN(ts)) return 'Invalid Date';
  const date = new Date(ts * 1000);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) + ', ' + date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format number with commas
export const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  return num.toLocaleString();
};

// Format percentage
export const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%';
  return `${((value / total) * 100).toFixed(2)}%`;
};

// Format time remaining
export const formatTimeRemaining = (endTime) => {
  if (!endTime) return 'Ended';
  const ts = Number(endTime);
  if (isNaN(ts)) return 'Ended';
  const now = Date.now() / 1000;
  const remaining = ts - now;

  if (remaining <= 0) return 'Ended';

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

// Format vote count
export const formatVoteCount = (count) => {
  if (!count && count !== 0) return '0 votes';
  if (count === 1) return '1 vote';
  return `${formatNumber(count)} votes`;
};

// Format transaction hash
export const formatTxHash = (hash) => {
  if (!hash) return '';
  return `${hash.substring(0, 10)}...${hash.substring(56)}`;
};

// Format voter key
export const formatVoterKey = (key) => {
  if (!key) return '';
  return `${key.substring(0, 10)}...${key.substring(56)}`;
};

// Export as default object AND named exports
const formatters = {
  formatAddress,
  formatDateTime,
  formatDate,
  formatNumber,
  formatPercentage,
  formatTimeRemaining,
  formatVoteCount,
  formatTxHash,
  formatVoterKey,
};

export default formatters;
