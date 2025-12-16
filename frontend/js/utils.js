/**
 * Utils Module - Helper Functions
 * Centralized utility functions for the application
 */

export const Utils = {
  /**
   * Format Ethereum address for display
   */
  formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  },

  /**
   * Format timestamp to readable date
   */
  /**
   * Format timestamp to readable date
   * Safe for both BigNumber (fresh) and number/string (cached)
   */
  /**
   * Format timestamp to readable date
   */
  formatDate(timestamp) {
    if (!timestamp) return 'Unknown';

    const ts = this.bigNumberToNumber(timestamp);
    if (ts === 0) return 'Invalid date';

    const date = new Date(ts * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  /**
   * Format time remaining
   */
  formatTimeRemaining(endTime) {
    const end = this.bigNumberToNumber(endTime) * 1000;
    const now = Date.now();
    const remaining = end - now;

    if (remaining <= 0) return 'Ended';

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  },

  /**
   * Convert any ethers BigNumber format to plain number
   * Handles:
   * - Fresh BigNumber (has .toNumber())
   * - Cached plain number/string
   * - Cached object { _hex: "0x..." }
   */
  bigNumberToNumber(value) {
    if (!value) return 0;

    // Fresh ethers BigNumber
    if (typeof value === 'object' && value.toNumber) {
      try {
        return value.toNumber();
      } catch {
        // If too large for Number, return as string (rare for counts/timestamps)
        return value.toString();
      }
    }

    // Cached ethers BigNumber object
    if (typeof value === 'object' && value._hex) {
      return parseInt(value._hex, 16);
    }

    // Plain number or string (from older cache or fallback)
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  },

  /**
   * Calculate progress percentage
   */
  calculateProgress(current, total) {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  },

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      return false;
    }
  },

  /**
   * Copy organization ID
   */
  async copyOrgId(orgId) {
    const success = await this.copyToClipboard(orgId.toString());
    if (success) {
      this.showNotification('Organization ID copied!', 'success');
    } else {
      this.showNotification('Failed to copy', 'error');
    }
  },

  /**
   * Copy secret key
   */
  async copySecretKey() {
    const key = document.getElementById('secretKey')?.textContent;
    if (!key || key === 'Loading...' || key === 'Only admin can view') {
      this.showNotification('No key available', 'error');
      return;
    }

    const success = await this.copyToClipboard(key);
    if (success) {
      this.showNotification('Secret key copied!', 'success');
    } else {
      this.showNotification('Failed to copy', 'error');
    }
  },

  /**
   * Validate Ethereum address
   */
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  /**
   * Parse addresses from textarea input
   */
  parseAddresses(text) {
    return text
      .split(/[\n,]/)
      .map((addr) => addr.trim())
      .filter((addr) => addr && this.isValidAddress(addr));
  },

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    if (!container) return;

    const colors = {
      success: 'notification-success',
      error: 'notification-error',
      info: 'notification-info',
      warning: 'notification-warning',
    };

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      info: 'fa-info-circle',
      warning: 'fa-exclamation-triangle',
    };

    const notification = document.createElement('div');
    notification.className = `notification ${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 min-w-[300px]`;
    notification.innerHTML = `
            <i class="fas ${icons[type]} text-xl"></i>
            <span class="flex-1 font-medium">${message}</span>
            <button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        `;

    container.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  },

  /**
   * Show loading overlay
   */
  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');

    if (overlay && text) {
      text.textContent = message;
      overlay.classList.remove('hidden');
    }
  },

  /**
   * Hide loading overlay
   */
  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  },

  /**
   * Confirm action
   */
  confirm(message) {
    return window.confirm(message);
  },

  /**
   * Download text as file
   */
  downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Get poll status text
   */
  getPollStatusText(status) {
    const statuses = {
      0: 'Active',
      1: 'Completed',
      2: 'Cancelled',
    };
    return statuses[status] || 'Unknown';
  },

  /**
   * Get poll status color
   */
  getPollStatusColor(status) {
    const colors = {
      0: 'poll-status-active',
      1: 'poll-status-completed',
      2: 'poll-status-cancelled',
    };
    return colors[status] || 'bg-gray-500';
  },

  /**
   * Get poll type text
   */
  getPollTypeText(type) {
    const types = {
      0: 'Yes/No',
      1: 'Multiple Choice',
      2: 'Ranked Voting',
    };
    return types[type] || 'Unknown';
  },

  /**
   * Check if poll is active
   */
  isPollActive(poll) {
    return poll.status === 0 && Date.now() < poll.endTime.toNumber() * 1000;
  },

  /**
   * Format large numbers
   */
  formatNumber(num) {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  },

  /**
   * Truncate text
   */
  truncate(text, length = 50) {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  },

  /**
   * Get time ago
   */
  timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }

    return 'just now';
  },

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Check if mobile device
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  },

  /**
   * Smooth scroll to element
   */
  scrollTo(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  /**
   * Generate random color
   */
  randomColor() {
    const colors = [
      '#667eea',
      '#764ba2',
      '#f093fb',
      '#4facfe',
      '#43e97b',
      '#fa709a',
      '#feca57',
      '#ff6b6b',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  /**
   * Local storage helpers
   */
  storage: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Storage error:', error);
        return false;
      }
    },

    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error('Storage error:', error);
        return defaultValue;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('Storage error:', error);
        return false;
      }
    },

    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error('Storage error:', error);
        return false;
      }
    },
  },
};

// Make Utils globally accessible
window.Utils = Utils;

export default Utils;
