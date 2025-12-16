/**
 * Storage Module - LocalStorage Management for Offchain Data
 * Handles likes, comments, and poll visibility
 */

import { Utils } from './utils.js';
import { ImmutableLoader } from './persistentCache.js';

let currentAccount = null;

// Listen for account changes from contract.js
window.addEventListener('accountChanged', (e) => {
  currentAccount = e.detail;
});

export const Storage = {
  /**
   * Poll Likes Management
   */
  likes: {
    get(pollId) {
      return Utils.storage.get(`likes_poll_${pollId}`, []);
    },

    add(pollId, userAddress) {
      const likes = this.get(pollId);
      if (!likes.includes(userAddress)) {
        likes.push(userAddress);
        Utils.storage.set(`likes_poll_${pollId}`, likes);
      }
      return likes.length;
    },

    remove(pollId, userAddress) {
      const likes = this.get(pollId);
      const index = likes.indexOf(userAddress);
      if (index > -1) {
        likes.splice(index, 1);
        Utils.storage.set(`likes_poll_${pollId}`, likes);
      }
      return likes.length;
    },

    toggle(pollId, userAddress) {
      const likes = this.get(pollId);
      const index = likes.indexOf(userAddress);

      if (index > -1) {
        likes.splice(index, 1);
      } else {
        likes.push(userAddress);
      }

      Utils.storage.set(`likes_poll_${pollId}`, likes);
      return { count: likes.length, liked: index === -1 };
    },

    hasLiked(pollId, userAddress) {
      return this.get(pollId).includes(userAddress);
    },

    count(pollId) {
      return this.get(pollId).length;
    },

    updateDisplay(pollId) {
      if (!currentAccount) return; // Safety
      const key = `like_poll_${pollId}`;
      const likes = JSON.parse(localStorage.getItem(key) || '[]');
      const btn = document.getElementById(`likeBtn_${pollId}`);
      if (btn) {
        btn.innerHTML = `Likes (${likes.length})`;
        if (likes.includes(currentAccount)) {
          btn.classList.add('text-red-500');
        } else {
          btn.classList.remove('text-red-500');
        }
      }
    },
  },

  orgSettings: {
  setViewRestricted(orgId, restricted) {
    const settings = JSON.parse(localStorage.getItem('safevote_org_view_restrictions') || '{}');
    settings[orgId] = restricted;
    localStorage.setItem('safevote_org_view_restrictions', JSON.stringify(settings));
  },
  isViewRestricted(orgId) {
    const settings = JSON.parse(localStorage.getItem('safevote_org_view_restrictions') || '{}');
    return !!settings[orgId];
  }
},

  /**
   * Comments Management
   */
  comments: {
    // Get all comments (top-level only, replies are nested inside)
    get(pollId) {
      return JSON.parse(localStorage.getItem(`comments_poll_${pollId}`) || '[]');
    },

    // Add a comment or reply
    add(pollId, userAddress, text, parentIndex = null) {
      if (!text || !text.trim()) return false;

      const comments = this.get(pollId);

      const newComment = {
        id: Date.now() + Math.random(), // unique ID
        author: userAddress,
        text: text.trim(),
        timestamp: Date.now(),
        likes: [],
        replies: [], // for nested replies
      };

      if (parentIndex === null) {
        // Top-level comment
        comments.push(newComment);
      } else {
        // Reply to existing comment
        if (comments[parentIndex]) {
          comments[parentIndex].replies.push(newComment);
        } else {
          return false;
        }
      }

      localStorage.setItem(`comments_poll_${pollId}`, JSON.stringify(comments));
      return newComment;
    },

    // Like a comment or reply
    like(pollId, path, userAddress) {
      // path = [topLevelIndex] for top comment
      // path = [topLevelIndex, replyIndex] for reply
      const comments = this.get(pollId);
      let target = comments;

      // Navigate to the target comment/reply
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]].replies;
      }

      const comment = target[path[path.length - 1]];
      if (!comment) return false;

      const likeIndex = comment.likes.indexOf(userAddress);
      if (likeIndex > -1) {
        comment.likes.splice(likeIndex, 1);
      } else {
        comment.likes.push(userAddress);
      }

      localStorage.setItem(`comments_poll_${pollId}`, JSON.stringify(comments));
      return { count: comment.likes.length, liked: likeIndex === -1 };
    },

    // Count total comments (top + replies)
    count(pollId) {
      const comments = this.get(pollId);
      let total = comments.length;
      comments.forEach((c) => {
        total += c.replies.length;
      });
      return total;
    },

    // Optional: delete (only by author)
    delete(pollId, path, userAddress) {
      const comments = this.get(pollId);
      let target = comments;
      let parent = null;
      let index = path[path.length - 1];

      for (let i = 0; i < path.length - 1; i++) {
        parent = target;
        target = target[path[i]].replies;
      }

      const comment = target[index];
      if (!comment || comment.author !== userAddress) return false;

      target.splice(index, 1);
      localStorage.setItem(`comments_poll_${pollId}`, JSON.stringify(comments));
      return true;
    },
  },

  /**
   * Poll Visibility Management (Hidden Polls)
   */
  visibility: {
    hide(pollId) {
      Utils.storage.set(`hidden_poll_${pollId}`, true);
    },

    unhide(pollId) {
      Utils.storage.remove(`hidden_poll_${pollId}`);
    },

    show(pollId) {
      Utils.storage.remove(`hidden_poll_${pollId}`);
    },

    isHidden(pollId) {
      return Utils.storage.get(`hidden_poll_${pollId}`, false) === true;
    },

    toggle(pollId) {
      const isHidden = this.isHidden(pollId);
      if (isHidden) {
        this.show(pollId);
      } else {
        this.hide(pollId);
      }
      return !isHidden;
    },
  },

  /**
   * User Preferences
   */
  preferences: {
    get(key, defaultValue = null) {
      const prefs = Utils.storage.get('user_preferences', {});
      return prefs[key] !== undefined ? prefs[key] : defaultValue;
    },

    set(key, value) {
      const prefs = Utils.storage.get('user_preferences', {});
      prefs[key] = value;
      Utils.storage.set('user_preferences', prefs);
    },

    getAll() {
      return Utils.storage.get('user_preferences', {});
    },

    clear() {
      Utils.storage.remove('user_preferences');
    },
  },

  /**
   * Search History
   */
  searchHistory: {
    add(query) {
      if (!query || !query.trim()) return;

      const history = this.get();
      const trimmed = query.trim();

      // Remove if exists
      const index = history.indexOf(trimmed);
      if (index > -1) {
        history.splice(index, 1);
      }

      // Add to beginning
      history.unshift(trimmed);

      // Keep only last 10
      if (history.length > 10) {
        history.pop();
      }

      Utils.storage.set('search_history', history);
    },

    get() {
      return Utils.storage.get('search_history', []);
    },

    clear() {
      Utils.storage.remove('search_history');
    },
  },

  /**
   * Recent Organizations
   */
  recentOrgs: {
    add(orgId, orgName) {
      const recent = this.get();
      const existing = recent.findIndex((o) => o.id === orgId);

      if (existing > -1) {
        recent.splice(existing, 1);
      }

      recent.unshift({ id: orgId, name: orgName, timestamp: Date.now() });

      // Keep only last 5
      if (recent.length > 5) {
        recent.pop();
      }

      Utils.storage.set('recent_orgs', recent);
    },

    get() {
      return Utils.storage.get('recent_orgs', []);
    },

    clear() {
      Utils.storage.remove('recent_orgs');
    },
  },

  /**
   * Voting Keys Cache (for convenience - NOT secure, just UX)
   */
  votingKeys: {
    save(pollId, keys) {
      Utils.storage.set(`keys_poll_${pollId}`, {
        keys: keys,
        timestamp: Date.now(),
      });
    },

    get(pollId) {
      const data = Utils.storage.get(`keys_poll_${pollId}`);
      if (!data) return null;

      // Auto-expire after 7 days
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - data.timestamp > sevenDays) {
        this.clear(pollId);
        return null;
      }

      return data.keys;
    },

    clear(pollId) {
      Utils.storage.remove(`keys_poll_${pollId}`);
    },
  },

  /**
   * Draft Polls (Save incomplete poll creation)
   */
  drafts: {
    save(orgId, draftData) {
      Utils.storage.set(`draft_org_${orgId}`, {
        ...draftData,
        timestamp: Date.now(),
      });
    },

    get(orgId) {
      return Utils.storage.get(`draft_org_${orgId}`);
    },

    clear(orgId) {
      Utils.storage.remove(`draft_org_${orgId}`);
    },
  },

  /**
   * Analytics & Stats (for user dashboard)
   */
  stats: {
    incrementVotesCast() {
      const count = this.get('votesCast', 0);
      this.set('votesCast', count + 1);
    },

    incrementPollsCreated() {
      const count = this.get('pollsCreated', 0);
      this.set('pollsCreated', count + 1);
    },

    get(key, defaultValue = 0) {
      const stats = Utils.storage.get('user_stats', {});
      return stats[key] !== undefined ? stats[key] : defaultValue;
    },

    set(key, value) {
      const stats = Utils.storage.get('user_stats', {});
      stats[key] = value;
      Utils.storage.set('user_stats', stats);
    },

    getAll() {
      return Utils.storage.get('user_stats', {});
    },

    reset() {
      Utils.storage.remove('user_stats');
    },
  },

  /**
   * Clear all app data
   */
  clearAll() {
    if (confirm('This will clear all local data (likes, comments, preferences). Continue?')) {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (
          key.startsWith('likes_') ||
          key.startsWith('comments_') ||
          key.startsWith('hidden_') ||
          key.startsWith('user_') ||
          key.startsWith('search_') ||
          key.startsWith('recent_') ||
          key.startsWith('keys_') ||
          key.startsWith('draft_')
        ) {
          localStorage.removeItem(key);
        }
      });
      Utils.showNotification('All local data cleared', 'success');
      setTimeout(() => location.reload(), 1000);
    }
  },

  /**
   * Export all data
   */
  exportData() {
    const data = {};
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      try {
        data[key] = JSON.parse(localStorage.getItem(key));
      } catch {
        data[key] = localStorage.getItem(key);
      }
    });

    const json = JSON.stringify(data, null, 2);
    Utils.downloadFile(json, `safevote-data-${Date.now()}.json`);
    Utils.showNotification('Data exported successfully', 'success');
  },

  /**
   * Get storage usage stats
   */
  getUsageStats() {
    let totalSize = 0;
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      const item = localStorage.getItem(key);
      if (item) {
        totalSize += item.length + key.length;
      }
    });

    return {
      itemCount: keys.length,
      sizeBytes: totalSize,
      sizeKB: (totalSize / 1024).toFixed(2),
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  },
};

// Make Storage globally accessible
window.Storage = Storage;

export default Storage;
