/**
 * Persistent Cache Module v2 - Smart Immutable + Mutable Caching
 * Optimized for SafeVote: immutable org/poll data + smart invalidation
 */

// import { Utils } from './utils.js';
console.log('✅ persistentCache.js loaded successfully');
const CACHE_VERSION = 'v2.1'; // Bump this when structure changes
const STORAGE_PREFIX = `safevote_cache_${CACHE_VERSION}_`;

export const PersistentCache = {
  memoryCache: new Map(),
  fetchingPromises: new Map(),

  /**
   * Initialize - Load cached data, clear old versions
   */
  init() {
    try {
      // Clear any old version caches first
      this.clearOldVersions();

      let loaded = 0;
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (key.startsWith(STORAGE_PREFIX)) {
          const cacheKey = key.substring(STORAGE_PREFIX.length);
          const value = this.getFromStorage(cacheKey);
          if (value !== null) {
            this.memoryCache.set(cacheKey, value);
            loaded++;
          }
        }
      }

      console.log(`📦 Persistent Cache ${CACHE_VERSION} initialized: ${loaded} items loaded`);
    } catch (error) {
      console.warn('Cache init error:', error);
    }
  },

  /**
   * Clear old cache versions to prevent bloat/corruption
   */
  clearOldVersions() {
    const keys = Object.keys(localStorage);
    let cleared = 0;

    for (const key of keys) {
      if (key.startsWith('safevote_cache_') && !key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`🗑️ Cleared ${cleared} items from old cache versions`);
    }
  },

  get(key) {
    return this.memoryCache.get(key) ?? null;
  },

  has(key) {
    return this.memoryCache.has(key);
  },

  set(key, value) {
    try {
      this.memoryCache.set(key, value);
      this.setInStorage(key, value);
      return true;
    } catch (error) {
      console.warn('Cache set error:', error);
      return false;
    }
  },

  getFromStorage(key) {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      // Add timestamp check if needed later
      return parsed.data ?? parsed;
    } catch (error) {
      console.warn(`Corrupted cache item ${key}, removing:`, error);
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
  },

  setInStorage(key, value) {
    try {
      const toStore = {
        data: value,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(toStore));
    } catch (error) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn('Storage full, running aggressive cleanup...');
        this.aggressiveCleanup();
        // Retry once
        try {
          localStorage.setItem(
            STORAGE_PREFIX + key,
            JSON.stringify({ data: value, savedAt: Date.now() })
          );
        } catch (e) {
          console.error('Failed to save even after cleanup:', e);
        }
      } else {
        throw error;
      }
    }
  },

  async fetchOnce(key, fetchFn) {
    if (this.has(key)) {
      return this.get(key);
    }

    if (this.fetchingPromises.has(key)) {
      return await this.fetchingPromises.get(key);
    }

    const promise = (async () => {
      try {
        const data = await fetchFn();
        this.set(key, data);
        return data;
      } catch (error) {
        console.error(`Fetch failed for ${key}:`, error);
        throw error;
      } finally {
        this.fetchingPromises.delete(key);
      }
    })();

    this.fetchingPromises.set(key, promise);
    return await promise;
  },

  async fetchBatch(keys, fetchFn) {
    const results = {};
    const toFetch = [];

    keys.forEach((key) => {
      if (this.has(key)) {
        results[key] = this.get(key);
      } else {
        toFetch.push(key);
      }
    });

    if (toFetch.length > 0) {
      const fetched = await Promise.all(
        toFetch.map((key) => this.fetchOnce(key, () => fetchFn(key)))
      );
      toFetch.forEach((key, i) => {
        results[key] = fetched[i];
      });
    }

    return results;
  },

  invalidate(key) {
    this.memoryCache.delete(key);
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);

    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    const keys = Object.keys(localStorage);
    for (const storageKey of keys) {
      if (storageKey.startsWith(STORAGE_PREFIX)) {
        const cacheKey = storageKey.substring(STORAGE_PREFIX.length);
        if (regex.test(cacheKey)) {
          localStorage.removeItem(storageKey);
        }
      }
    }
  },

  clearAll() {
    this.memoryCache.clear();
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    console.log('🗑️ All SafeVote cache cleared');
  },

  // Better cleanup: remove largest/oldest items
  aggressiveCleanup() {
    const entries = [];
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX)) {
        const item = localStorage.getItem(key);
        entries.push({ key, size: item.length });
      }
    }

    // Sort by size descending, remove top 30%
    entries.sort((a, b) => b.size - a.size);
    const toRemove = entries.slice(0, Math.max(1, Math.floor(entries.length * 0.3)));

    toRemove.forEach((entry) => {
      this.invalidate(entry.key.substring(STORAGE_PREFIX.length));
    });

    console.log(`🧹 Aggressively cleaned ${toRemove.length} large items`);
  },

  getStats() {
    let storageBytes = 0;
    let itemCount = 0;

    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX)) {
        itemCount++;
        const item = localStorage.getItem(key);
        if (item) storageBytes += item.length;
      }
    }

    return {
      version: CACHE_VERSION,
      memoryItems: this.memoryCache.size,
      storageItems: itemCount,
      storageMB: (storageBytes / (1024 * 1024)).toFixed(3),
      fetchingNow: this.fetchingPromises.size,
    };
  },
};

export const ImmutableLoader = {
  cache: PersistentCache,

  async loadOrganization(contract, orgId) {
    const key = `org_${orgId}`;
    return await this.cache.fetchOnce(key, async () => {
      console.log(`🔄 Loading organization ${orgId} from chain`);
      return await contract.getOrganization(orgId);
    });
  },

  async loadOrganizations(contract, orgIds) {
    const keys = orgIds.map((id) => `org_${id}`);
    const results = await this.cache.fetchBatch(keys, async (key) => {
      const orgId = key.replace('org_', '');
      return await contract.getOrganization(orgId);
    });

    return orgIds.map((id) => results[`org_${id}`]);
  },

  async loadPoll(contract, pollId) {
    const key = `poll_${pollId}`;
    return await this.cache.fetchOnce(key, async () => {
      console.log(`🔄 Loading poll ${pollId} from chain`);
      return await contract.getPoll(pollId);
    });
  },

  // Results are MUTABLE → never cache permanently
  async loadPollResults(contract, pollId) {
    console.log(`🔄 Fetching latest results for poll ${pollId}`);
    return await contract.getPollResults(pollId);
  },

  async loadPollWithResults(contract, pollId) {
    const [poll, results] = await Promise.all([
      this.loadPoll(contract, pollId),
      this.loadPollResults(contract, pollId),
    ]);
    return { poll, results };
  },

  async loadMemberInfo(contract, orgId, address) {
    const key = `member_${orgId}_${address.toLowerCase()}`;
    return await this.cache.fetchOnce(key, async () => {
      return await contract.getMemberInfo(orgId, address);
    });
  },

  // Call this after any state-changing transaction
  invalidateAfterAction(action, data) {
    switch (action) {
      case 'vote':
        // Poll results change → but we don't cache them anyway
        // Optionally: could add short-term results cache later
        console.log(`✓ Vote recorded – results will refresh on next view`);
        break;

      case 'createPoll':
        // New poll → invalidate org's poll list if cached
        this.cache.invalidatePattern(`polls_org_${data.orgId}`);
        this.cache.invalidatePattern(`org_${data.orgId}_polls`);
        break;

      case 'addMember':
      case 'removeMember':
        this.cache.invalidatePattern(`member_.*_${data.address.toLowerCase()}`);
        this.cache.invalidatePattern(`members_${data.orgId}`);
        break;

      case 'createOrg':
        this.cache.invalidate('public_orgs');
        this.cache.invalidate(`user_orgs_${data.creator.toLowerCase()}`);
        break;
    }
  },
};

// Auto-init
PersistentCache.init();

// Global access (optional)
window.SafeVoteCache = { PersistentCache, ImmutableLoader };
window.PersistentCache = PersistentCache; // optional, for direct access
window.ImmutableLoader = ImmutableLoader;

console.log('✅ SafeVoteCache exposed on window');

export default { PersistentCache, ImmutableLoader };
