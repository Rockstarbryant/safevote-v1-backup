/**
 * SafeVote - Main Application Entry Point
 * Initializes all modules and sets up the application
 */

import { Utils } from './utils.js';
import { Storage } from './storage.js';
import { UI } from './ui.js';
import { Contract } from './contract.js';
import { ImmutableLoader } from './persistentCache.js';
/**
 * Application State
 */
const App = {
  initialized: false,
  version: '1.0.0',

  /**
   * Initialize application
   */
  async init() {
    console.log(
      `%c SafeVote v${this.version} `,
      'background: #667eea; color: white; font-size: 16px; padding: 5px 10px; border-radius: 5px;'
    );
    console.log('Initializing decentralized voting system...');

    try {
      // Check for Web3 support
      if (typeof window.ethereum === 'undefined') {
        this.showInstallMetaMask();
        return;
      }

      // Initialize contract
      await Contract.init();

      // Setup global event listeners
      this.setupGlobalListeners();

      // Show welcome message
      this.showWelcomeMessage();

      this.initialized = true;
      console.log('✓ Application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      Utils.showNotification('Failed to initialize app. Please refresh the page.', 'error');
    }
  },

  /**
   * Setup global event listeners
   */
  setupGlobalListeners() {
    // Connect wallet button
    document.getElementById('connectWallet')?.addEventListener('click', async () => {
      await Contract.connect();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape key closes modals
      if (e.key === 'Escape') {
        document.querySelectorAll('[id$="Modal"]').forEach((modal) => {
          if (!modal.classList.contains('hidden')) {
            UI.closeModal(modal.id);
          }
        });
      }

      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('orgSearch')?.focus();
      }

      // Ctrl/Cmd + N for new organization
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        UI.showModal('createOrgModal');
      }
    });

    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Contract.contract && UI.currentOrgId) {
        // Refresh data when user returns to tab
        this.refreshCurrentView();
      }
    });

    // Handle online/offline
    window.addEventListener('online', () => {
      Utils.showNotification('Connection restored', 'success');
      this.refreshCurrentView();
    });

    window.addEventListener('offline', () => {
      Utils.showNotification('You are offline', 'warning');
    });

    // Performance monitoring
    if ('performance' in window && 'PerformanceObserver' in window) {
      this.setupPerformanceMonitoring();
    }
  },

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 1000) {
            console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
          }
        }
      });
      observer.observe({ entryTypes: ['measure'] });
    } catch (error) {
      // Performance monitoring not critical
    }
  },

  /**
   * Refresh current view
   */
  async refreshCurrentView() {
    if (!Contract.contract) return;

    try {
      if (UI.currentOrgId) {
        await Promise.all([
          Contract.loadOrgPolls(UI.currentOrgId),
          Contract.loadOrgMembers(UI.currentOrgId),
        ]);
      } else {
        await Contract.loadPublicOrgs();
      }
    } catch (error) {
      console.error('Refresh error:', error);
    }
  },

  /**
   * Show MetaMask installation prompt
   */
  showInstallMetaMask() {
    const container = document.getElementById('welcomeSection');
    if (!container) return;

    container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-exclamation-triangle text-6xl text-yellow-300 mb-6"></i>
                <h2 class="text-4xl font-bold text-white mb-4">MetaMask Required</h2>
                <p class="text-xl text-white opacity-90 mb-8 max-w-2xl mx-auto">
                    You need MetaMask to use SafeVote. It's a secure wallet for interacting with blockchain applications.
                </p>
                <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <a href="https://metamask.io/download/" target="_blank" class="btn-primary inline-flex items-center justify-center">
                        <i class="fas fa-download mr-2"></i>Install MetaMask
                    </a>
                    <button onclick="location.reload()" class="btn-secondary inline-flex items-center justify-center">
                        <i class="fas fa-sync-alt mr-2"></i>I've Installed It
                    </button>
                </div>
                <div class="mt-12 glass rounded-xl p-6 max-w-2xl mx-auto">
                    <h3 class="text-xl font-bold text-white mb-4">Why MetaMask?</h3>
                    <div class="grid md:grid-cols-3 gap-6 text-white">
                        <div>
                            <i class="fas fa-shield-alt text-3xl text-green-400 mb-3"></i>
                            <h4 class="font-semibold mb-2">Secure</h4>
                            <p class="text-sm opacity-80">Your keys, your crypto. Non-custodial security.</p>
                        </div>
                        <div>
                            <i class="fas fa-bolt text-3xl text-yellow-400 mb-3"></i>
                            <h4 class="font-semibold mb-2">Fast</h4>
                            <p class="text-sm opacity-80">Interact with blockchain in seconds.</p>
                        </div>
                        <div>
                            <i class="fas fa-users text-3xl text-blue-400 mb-3"></i>
                            <h4 class="font-semibold mb-2">Trusted</h4>
                            <p class="text-sm opacity-80">Used by millions worldwide.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
  },

  /**
   * Show welcome message (first-time users)
   */
  showWelcomeMessage() {
    const hasVisited = Storage.preferences.get('hasVisited', false);

    if (!hasVisited) {
      Storage.preferences.set('hasVisited', true);

      setTimeout(() => {
        const message = `
                    Welcome to SafeVote! 🎉
                    
                    Quick Start:
                    1. Connect your wallet
                    2. Create or join an organization
                    3. Create polls and start voting!
                    
                    Tip: Press Ctrl+K to search organizations
                `;

        console.log('%c' + message, 'color: #667eea; font-size: 12px;');
      }, 1000);
    }
  },

  /**
   * Get app statistics
   */
  getStats() {
    const stats = Storage.stats.getAll();
    const usage = Storage.getUsageStats();

    return {
      version: this.version,
      initialized: this.initialized,
      connected: Contract.currentAccount !== null,
      account: Contract.currentAccount,
      stats: stats,
      storage: usage,
      recentOrgs: Storage.recentOrgs.get(),
      searchHistory: Storage.searchHistory.get(),
    };
  },

  /**
   * Debug mode
   */
  enableDebug() {
    window.DEBUG = true;
    console.log('Debug mode enabled');
    console.log('App State:', this.getStats());
  },

  /**
   * Export data
   */
  exportData() {
    Storage.exportData();
  },

  /**
   * Clear all data
   */
  clearData() {
    Storage.clearAll();
  },

  /**
   * Show help
   */
  showHelp() {
    const helpHTML = `
            <div class="modal-backdrop" onclick="this.remove()">
                <div class="modal-content max-w-3xl" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3 class="text-2xl font-bold text-gradient">SafeVote Help</h3>
                        <button onclick="this.closest('.modal-backdrop').remove()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="space-y-6">
                            <div>
                                <h4 class="font-bold text-lg mb-3 flex items-center">
                                    <i class="fas fa-keyboard text-purple-600 mr-2"></i>
                                    Keyboard Shortcuts
                                </h4>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between p-2 bg-gray-50 rounded">
                                        <span>Search organizations</span>
                                        <kbd class="px-2 py-1 bg-white border rounded">Ctrl + K</kbd>
                                    </div>
                                    <div class="flex justify-between p-2 bg-gray-50 rounded">
                                        <span>Create organization</span>
                                        <kbd class="px-2 py-1 bg-white border rounded">Ctrl + N</kbd>
                                    </div>
                                    <div class="flex justify-between p-2 bg-gray-50 rounded">
                                        <span>Close modal</span>
                                        <kbd class="px-2 py-1 bg-white border rounded">Esc</kbd>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 class="font-bold text-lg mb-3 flex items-center">
                                    <i class="fas fa-question-circle text-purple-600 mr-2"></i>
                                    How It Works
                                </h4>
                                <ol class="space-y-3 text-sm list-decimal list-inside">
                                    <li><strong>Create Organization:</strong> Start your own governance group</li>
                                    <li><strong>Add Members:</strong> Invite people by their Ethereum address</li>
                                    <li><strong>Create Polls:</strong> Set up voting with custom options and duration</li>
                                    <li><strong>Distribute Keys:</strong> Share voting keys with authorized members</li>
                                    <li><strong>Vote:</strong> Members use their key to cast votes securely</li>
                                    <li><strong>View Results:</strong> Transparent on-chain results</li>
                                </ol>
                            </div>

                            <div>
                                <h4 class="font-bold text-lg mb-3 flex items-center">
                                    <i class="fas fa-shield-alt text-purple-600 mr-2"></i>
                                    Security Tips
                                </h4>
                                <ul class="space-y-2 text-sm">
                                    <li>✓ Never share your private key or seed phrase</li>
                                    <li>✓ Only connect to trusted sites</li>
                                    <li>✓ Verify transaction details before confirming</li>
                                    <li>✓ Keep your voting keys secure</li>
                                    <li>✓ Use strong passwords for MetaMask</li>
                                </ul>
                            </div>

                            <div>
                                <h4 class="font-bold text-lg mb-3 flex items-center">
                                    <i class="fas fa-info-circle text-purple-600 mr-2"></i>
                                    Features
                                </h4>
                                <div class="grid md:grid-cols-2 gap-3 text-sm">
                                    <div class="p-3 bg-gray-50 rounded">
                                        <strong>Public/Private Orgs</strong>
                                        <p class="text-gray-600 mt-1">Control who can discover your organization</p>
                                    </div>
                                    <div class="p-3 bg-gray-50 rounded">
                                        <strong>Anonymous Voting</strong>
                                        <p class="text-gray-600 mt-1">Hide voter identities for privacy</p>
                                    </div>
                                    <div class="p-3 bg-gray-50 rounded">
                                        <strong>Batch Operations</strong>
                                        <p class="text-gray-600 mt-1">Add multiple members at once</p>
                                    </div>
                                    <div class="p-3 bg-gray-50 rounded">
                                        <strong>Real-time Updates</strong>
                                        <p class="text-gray-600 mt-1">See votes as they come in</p>
                                    </div>
                                    <div class="p-3 bg-gray-50 rounded">
                                        <strong>Likes & Comments</strong>
                                        <p class="text-gray-600 mt-1">Engage with polls offchain</p>
                                    </div>
                                    <div class="p-3 bg-gray-50 rounded">
                                        <strong>Poll Management</strong>
                                        <p class="text-gray-600 mt-1">Hide or manage poll visibility</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button onclick="this.closest('.modal-backdrop').remove()" 
                                class="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition">
                            Got It!
                        </button>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', helpHTML);
  },
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

// Network switcher
document.getElementById('networkSwitcher')?.addEventListener('change', async (e) => {
  const targetChainId = parseInt(e.target.value);
  const chainIdHex = '0x' + targetChainId.toString(16);

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (error) {
    if (error.code === 4902) {
      Utils.showNotification('Network not added to wallet', 'error');
    } else {
      console.error('Switch error:', error);
    }
  }
});

// Expose App globally for console access
window.App = App;

// Console utilities
window.help = () => App.showHelp();
window.debug = () => App.enableDebug();
window.stats = () => console.table(App.getStats());
window.exportData = () => App.exportData();
window.clearData = () => App.clearData();

// Log available console commands
console.log('%cConsole Commands:', 'color: #667eea; font-weight: bold; font-size: 14px;');
console.log('  help() - Show help modal');
console.log('  debug() - Enable debug mode');
console.log('  stats() - View app statistics');
console.log('  exportData() - Export local data');
console.log('  clearData() - Clear all local data');

export default App;
