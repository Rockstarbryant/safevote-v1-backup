/**
 * UI Module - User Interface Rendering and Interactions
 * Handles all DOM manipulations and UI rendering
 */

import { Utils } from './utils.js';
import { Storage } from './storage.js';
import { ImmutableLoader } from './persistentCache.js';

export const UI = {
  currentOrgId: null,
  currentAccount: null,

  /**
   * Initialize UI
   */
  init(account) {
    this.currentAccount = account;
    this.setupSearchListener();
    this.renderModals();
  },

  /**
   * Setup search functionality
   */
  setupSearchListener() {
    const searchInput = document.getElementById('orgSearch');
    if (!searchInput) return;

    const debouncedSearch = Utils.debounce((query) => {
      this.filterOrganizations(query);
      if (query.trim()) Storage.searchHistory.add(query.trim());
    }, 300);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
  },

  /**
   * Filter displayed organizations
   */
  filterOrganizations(query) {
    const q = query.toLowerCase().trim();
    const cards = document.querySelectorAll('#organizationsGrid > div');

    cards.forEach((card) => {
      const name = (card.querySelector('h4')?.textContent || '').toLowerCase();
      const id = card.querySelector('.font-mono')?.textContent || '';

      const matches = !q || name.includes(q) || id.includes(q);
      card.style.display = matches ? '' : 'none';
    });
  },

  /**
   * Clear search
   */
  clearSearch() {
    const searchInput = document.getElementById('orgSearch');
    if (searchInput) {
      searchInput.value = '';
      this.filterOrganizations('');
    }
  },

  /**
   * Display organizations grid
   */
  displayOrganizations(orgIds, organizations) {
    const grid = document.getElementById('organizationsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (orgIds.length === 0) {
      grid.innerHTML = `
                <div class="glass rounded-xl p-8 text-center text-white col-span-full animate-fade-in">
                    <i class="fas fa-inbox text-5xl mb-4 opacity-50"></i>
                    <p class="text-lg opacity-70">No organizations found</p>
                    <button onclick="UI.showModal('createOrgModal')" class="mt-4 btn-primary">
                        <i class="fas fa-plus mr-2"></i>Create Your First Organization
                    </button>
                </div>
            `;
      return;
    }

    orgIds.forEach((orgId, index) => {
      const org = organizations[index];
      if (org) {
        const card = this.createOrgCard(orgId, org);
        grid.appendChild(card);
      }
    });
  },

  /**
   * Create organization card
   */
  createOrgCard(orgId, org) {
    const card = document.createElement('div');
    card.className =
      'rounded-xl p-6 card-hover cursor-pointer animate-fade-in bg-emerald-500 border border-emerald-600 text-white';

    card.style.animationDelay = `${Math.min(0.1 * (orgId % 10), 0.5)}s`;

    const isAdmin =
      this.currentAccount && org[2].toLowerCase() === this.currentAccount.toLowerCase();

    // Safe BigNumber handling
    const memberCount = Utils.bigNumberToNumber(org[5]);
    const createdTimestamp = org[4].toNumber
      ? org[4].toNumber()
      : typeof org[4] === 'string'
        ? parseInt(org[4])
        : org[4];

    const createdDate = Utils.formatDate(createdTimestamp);
    // const memberCount = org[5].toString();
    // const createdDate = Utils.formatDate(org[4].toNumber());

    card.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                    <h4 class="text-xl font-bold text-white mb-1 truncate">${Utils.escapeHtml(org[0])}</h4>
                    ${org[1] ? `<p class="text-sm text-purple-200 truncate">${Utils.escapeHtml(org[1])}</p>` : ''}
                </div>
                <span class="badge ${org[3] ? 'badge-public' : 'badge-private'} ml-2 flex-shrink-0">
                    <i class="fas ${org[3] ? 'fa-globe' : 'fa-lock'} mr-1"></i>
                    ${org[3] ? 'Public' : 'Private'}
                </span>
            </div>

            <div class="mb-4 p-3 bg-gradient-to-r from-black-500 to-black-400 bg-opacity-20 rounded-lg hover:bg-opacity-30 transition">

                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-xs text-black-800 uppercase tracking-wider mb-1">Org ID</div>
                        <div class="font-mono text-sm text-white">${orgId.toString()}</div>
                    </div>
                    <button onclick="Utils.copyOrgId(${orgId}); event.stopPropagation();" 
                            class="btn-icon text-sm">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>

            <div class="flex items-center justify-between text-white text-sm mb-4">
                <div class="flex items-center">
                    <i class="fas fa-users text-purple-300 mr-2"></i>
                    <span>${memberCount} member${memberCount !== 1 ? 's' : ''}</span>
                </div>
                <div class="flex items-center">
                    <i class="fas fa-calendar text-purple-300 mr-2"></i>
                    <span>${createdDate}</span>
                </div>
            </div>

            ${isAdmin ? '<div class="mb-3"><span class="badge badge-admin"><i class="fas fa-crown mr-1"></i>Administrator</span></div>' : ''}
            
            <button onclick="UI.openOrganization(${orgId}); event.stopPropagation();" 
                    class="w-full btn-primary">
                <i class="fas fa-arrow-right mr-2"></i>Open Organization
            </button>
        `;

    return card;
  },

  /**
   * Open organization dashboard
   */
  async openOrganization(orgId) {
  this.currentOrgId = orgId;

  // CACHED organization data — instant after first load
  const org = await ImmutableLoader.loadOrganization(window.Contract.contract, orgId);

  if (!org || org[0] === '') {
    Utils.showNotification('Organization not found or failed to load', 'error');
    return;
  }

  // Check if user is member
  const isMember = await window.Contract.isMember(orgId, this.currentAccount || '0x0000000000000000000000000000000000000000');

  // Frontend-only view restriction (creator can toggle in Settings)
  const isViewRestricted = Storage.orgSettings.isViewRestricted(orgId);

  if (isViewRestricted && !isMember) {
    Utils.showNotification('This organization restricts viewing to members only', 'warning');
    return;
  }

  // Update recent orgs
  Storage.recentOrgs.add(orgId, org[0]);

  // Update header
  document.getElementById('orgName').textContent = org[0];

  const orgInfo = document.getElementById('orgInfo');
  orgInfo.innerHTML = `
      <div class="flex flex-wrap items-center gap-4 text-sm">
          <span><i class="fas fa-users mr-1"></i>${Utils.bigNumberToNumber(org[5])} members</span>
          <span>•</span>
          <span><i class="fas fa-calendar mr-1"></i>Created ${Utils.formatDate(org[4])}</span>
          <span>•</span>
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-black bg-opacity-30 rounded-lg">
              <span class="text-xs">ID: <span class="font-mono">${orgId}</span></span>
              <button onclick="Utils.copyOrgId(${orgId})" class="text-purple-300 hover:text-white text-xs">
                  <i class="fas fa-copy"></i>
              </button>
          </div>
      </div>
  `;

  // Show dashboard
  const dashboard = document.getElementById('orgDashboard');
  dashboard.classList.remove('hidden');

  // Load everything in parallel
  await Promise.all([
    window.Contract.loadOrgPolls(orgId),
    window.Contract.loadOrgMembers(orgId),
    window.Contract.loadOrgSettings(orgId),
  ]);

  // Default to Active Polls tab
  UI.switchTab('activePolls');

  Utils.scrollTo('orgDashboard');
},

  /**
   * Close organization dashboard
   */
  closeDashboard() {
    document.getElementById('orgDashboard').classList.add('hidden');
    this.currentOrgId = null;
  },

  /**
   * Switch tabs
   */
  switchTab(tabName) {
    // Valid tab names
    const validTabs = ['activePolls', 'endedPolls', 'members', 'settings'];
    if (!validTabs.includes(tabName)) return;

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach((tab) => tab.classList.add('hidden'));

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));

    // Show the selected tab content
    const selectedTab = document.getElementById(`${tabName}Tab`);
    if (selectedTab) selectedTab.classList.remove('hidden');

    // Highlight the active button
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Load polls only for poll tabs
    if (tabName === 'activePolls') {
      window.Contract.loadOrgPolls(UI.currentOrgId, false); // Active polls
    } else if (tabName === 'endedPolls') {
      window.Contract.loadOrgPolls(UI.currentOrgId, true); // Ended polls
    }
    // Members and Settings don't need extra loading here (already loaded in openOrganization)
  },
  /**
   * Render polls list
   */
  renderPolls(pollsData) {
    const container = document.getElementById('pollsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (pollsData.length === 0) {
      container.innerHTML = `
            <div class="glass rounded-xl p-12 text-center text-white animate-fade-in">
                <i class="fas fa-inbox text-6xl mb-6 opacity-40"></i>
                <p class="text-xl opacity-80">No polls to display</p>
            </div>
        `;
      return;
    }

    pollsData.forEach(({ pollId, poll, results, isActive }) => {
      const card = this.createPollCard(pollId, poll, results, isActive);
      if (card) container.appendChild(card);
    });

    // Render comments
    setTimeout(() => {
      pollsData.forEach(({ pollId }) => this.renderComments(pollId));
    }, 100);
  },

  /**
   * Create poll card (your original + new features)
   */
  createPollCard(pollId, poll, results, isActive) {
    const isCreator =
      this.currentAccount && poll.creator.toLowerCase() === this.currentAccount.toLowerCase();
    // const isActive = Utils.isPollActive(poll);

    // If for some reason isActive is undefined (fallback safety)
    if (typeof isActive === 'undefined') {
      isActive = Utils.isPollActive(poll);
    }

    // Hide check — respects the global toggle
    const isHidden = Storage.visibility.isHidden(pollId);
    const showHidden = UI.showHiddenPolls || false;

    if (isHidden && !showHidden) {
      if (!isCreator) return null;
      if (!showHidden) return null;
    }

    const totalVotes = results[2].toNumber();
    const maxVotes = poll.totalVotingKeys.toNumber();
    const progress = Utils.calculateProgress(totalVotes, maxVotes);

    const createdDate = Utils.formatDate(poll.creationTime || poll.createdAt || 0);
    const endDate = Utils.formatDate(poll.endTime);

    const card = document.createElement('div');
    card.className =
      'rounded-xl p-6 card-hover cursor-pointer animate-fade-in bg-black border border-gray-800 text-white';

    // Highlight hidden polls when shown
    if (isHidden && showHidden) {
      card.classList.add('opacity-70', 'ring-2', 'ring-orange-500/50', 'bg-orange-900/10');
    }

    card.innerHTML = `
        <!-- Header -->
        <div class="flex items-start justify-between mb-5">
            <div class="flex-1 pr-4">
            <div class="flex items-center gap-3 mb-2">
                    <i class="fas fa-circle text-lg ${isActive ? 'text-green-400' : 'text-gray-500'}"></i>
                    <span class="text-sm font-medium ${isActive ? 'text-green-300' : 'text-gray-400'}">
                        ${isActive ? 'Active' : 'Ended'}
                    </span>
                </div>
                <h3 class="text-xl font-bold text-white mb-2 line-clamp-2">${Utils.escapeHtml(poll.question)}</h3>
                <div class="flex flex-wrap items-center gap-3 text-sm">
                    <span class="px-3 py-1 rounded-full font-medium ${Utils.getPollStatusColor(poll.status)} text-white">
                        ${Utils.getPollStatusText(poll.status)}
                    </span>
                    <span class="text-gray-300">${Utils.getPollTypeText(poll.pollType)}</span>
                    ${poll.isAnonymous ? '<span class="text-gray-400"><i class="fas fa-user-secret mr-1"></i>Anonymous</span>' : ''}
                </div>
                <!-- Created & End Time -->
            <div class="text-right text-xs text-gray-400">
                <div>Created: ${createdDate}</div>
                <div>Ends: ${endDate}</div>
            </div>
            </div>
            ${isCreator ? '<div class="text-yellow-400 text-2xl"><i class="fas fa-crown"></i></div>' : ''}
        </div>

        <!-- Progress Bar -->
        <div class="mb-5">
            <div class="flex justify-between text-white text-sm mb-2">
                <span class="font-medium">${totalVotes} / ${maxVotes} votes cast</span>
                <span class="font-bold text-purple-300">${progress}% participation</span>
            </div>
            <div class="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700" style="width: ${progress}%"></div>
            </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-white/5 rounded-xl p-4 text-center">
                <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Time Remaining</p>
                <p class="text-2xl font-bold text-white">${Utils.formatTimeRemaining(poll.endTime.toNumber())}</p>
            </div>
            <div class="bg-white/5 rounded-xl p-4 text-center">
                <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Quorum Required</p>
                <p class="text-2xl font-bold text-white">${poll.requiredQuorum}%</p>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-3">
            ${
              isActive
                ? `
                <button onclick="window.Contract.showVoteModal(${pollId})" 
                        class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg transform hover:scale-105">
                    <i class="fas fa-vote-yea mr-2"></i>Vote Now
                </button>
            `
                : `
                <button onclick="window.Contract.viewPollResults(${pollId})" 
                        class="w-full bg-gray-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-600 transition">
                    <i class="fas fa-chart-bar mr-2"></i>View Results
                </button>
            `
            }

            ${
              isCreator && isActive
                ? `
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="window.Contract.managePollKeys(${pollId})" 
                            class="bg-purple-600/30 text-purple-300 py-3 rounded-xl font-medium hover:bg-purple-600/50 transition border border-purple-500/30">
                        <i class="fas fa-key mr-2"></i>Manage Keys
                    </button>
                    <button onclick="UI.togglePollVisibility(${pollId})" 
                            class="bg-orange-600 text-white py-3 rounded-xl font-medium hover:bg-orange-700 transition">
                        <i class="fas ${Storage.visibility.isHidden(pollId) ? 'fa-eye' : 'fa-eye-slash'} mr-2"></i>
                        ${Storage.visibility.isHidden(pollId) ? 'Unhide Poll' : 'Hide Poll'}
                    </button>
                </div>
            `
                : ''
            }
        </div>

        <!-- Interactions -->
        <div class="mt-6 pt-6 border-t border-white/10">
            <div class="flex items-center justify-between mb-4">
                <button id="likeBtn_${pollId}" onclick="Storage.likes.toggle(pollId, UI.currentAccount)" 
                        class="flex items-center gap-2 text-white hover:text-red-400 transition">
                    <i class="fas fa-heart text-lg"></i>
                    <span id="likeCount_${pollId}" class="font-medium">0 Likes</span>
                </button>
                <div class="text-gray-400 text-sm">
                    <i class="fas fa-comment mr-1"></i>
                    <span id="commentCount_${pollId}">0</span> Comments
                </div>
            </div>

            <div id="comments_${pollId}" class="space-y-3 mb-4"></div>

            <div class="flex gap-2">
                <input type="text" id="commentInput_${pollId}" placeholder="Add a comment..." 
                       class="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition">
                <button onclick="UI.handleComment(${pollId})" 
                        class="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition font-medium">
                    Post
                </button>
            </div>
        </div>
    `;

    // Load likes & comments
    setTimeout(() => {
      Storage.likes.updateDisplay(pollId);
      this.renderComments(pollId);
    }, 100);

    return card;
  },

  handleLike(pollId) {
    Storage.likes.toggle(pollId, this.currentAccount);
  },

  handleComment(pollId) {
    const input = document.getElementById(`commentInput_${pollId}`);
    if (!input || !input.value.trim()) return;

    Storage.comments.add(pollId, this.currentAccount, input.value.trim());
    input.value = '';
    this.renderComments(pollId);
    Utils.showNotification('Comment posted!', 'success');
  },

  renderComments(pollId) {
    const container = document.getElementById(`comments_${pollId}`);
    if (!container) return;

    const comments = Storage.comments.get(pollId);

    if (comments.length === 0) {
      container.innerHTML =
        '<p class="text-gray-400 text-center py-4">No comments yet. Be the first!</p>';
      return;
    }

    const renderThread = (commentList, depth = 0) => {
      return commentList
        .map((comment, index) => {
          const hasLiked = comment.likes.includes(this.currentAccount);
          const path = depth === 0 ? [index] : [/* parent path */ index]; // We'll fix path in handleLike

          return `
                <div class="${depth > 0 ? 'ml-8 border-l-2 border-purple-500/30 pl-4 mt-4' : 'mb-6'}">
                    <div class="flex gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                            ${comment.author.substring(2, 4).toUpperCase()}
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-mono text-purple-300 text-sm">${Utils.formatAddress(comment.author)}</span>
                                <span class="text-gray-500 text-xs">${Utils.timeAgo(comment.timestamp)}</span>
                            </div>
                            <p class="text-white mb-3">${Utils.escapeHtml(comment.text)}</p>
                            <div class="flex items-center gap-6 text-sm">
                                <button onclick="UI.handleLike(${pollId}, ${depth === 0 ? index : '/*need path*/'})" 
                                        class="flex items-center gap-1 hover:text-red-400 transition ${hasLiked ? 'text-red-400' : 'text-gray-400'}">
                                    <i class="fas fa-heart"></i> ${comment.likes.length || ''}
                                </button>
                                <button onclick="UI.startReply(${pollId}, ${depth === 0 ? index : 'path'})" 
                                        class="text-gray-400 hover:text-purple-400 transition">
                                    Reply
                                </button>
                            </div>
                            ${comment.replies.length > 0 ? renderThread(comment.replies, depth + 1) : ''}
                        </div>
                    </div>
                </div>
            `;
        })
        .join('');
    };

    container.innerHTML = renderThread(comments);
  },

  togglePollVisibility(pollId) {
    const isHidden = Storage.visibility.isHidden(pollId);

    if (isHidden) {
      // Currently hidden → Unhide
      Storage.visibility.unhide(pollId);
      Utils.showNotification('Poll is now visible to all members', 'success');
    } else {
      // Currently visible → Hide
      if (!Utils.confirm('Hide this poll from all members? You can unhide it later.')) {
        return;
      }
      Storage.visibility.hide(pollId);
      Utils.showNotification('Poll hidden', 'success');
    }

    // Refresh the polls list
    window.Contract.loadOrgPolls(UI.currentOrgId);
  },

  showHiddenPolls: false,

  toggleHiddenPollsView() {
    this.showHiddenPolls = !this.showHiddenPolls;

    const icon = document.getElementById('hiddenPollsIcon');
    const text = document.getElementById('hiddenPollsText');
    const btn = document.getElementById('toggleHiddenPollsBtn');

    if (this.showHiddenPolls) {
      // Showing hidden polls
      icon.className = 'fas fa-eye';
      text.textContent = 'Hide Unwanted Polls';
      btn.classList.add('bg-purple-600/30', 'border-purple-500/50', 'border');

      // Load ONLY hidden polls
      window.Contract.loadHiddenPolls(this.currentOrgId);
    } else {
      // Back to normal view (Active + Ended)
      icon.className = 'fas fa-eye-slash';
      text.textContent = 'Show Hidden Polls';
      btn.classList.remove('bg-purple-600/30', 'border-purple-500/50', 'border');

      // Reload normal polls (respects current Active/Ended tab)
      const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
      if (activeTab === 'activePolls') {
        window.Contract.loadOrgPolls(this.currentOrgId, false);
      } else if (activeTab === 'endedPolls') {
        window.Contract.loadOrgPolls(this.currentOrgId, true);
      } else {
        // Fallback: default to active
        window.Contract.loadOrgPolls(this.currentOrgId);
      }
    }
  },

  toggleViewRestriction() {
  const restricted = document.getElementById('restrictViewToggle').checked;
  Storage.orgSettings.setViewRestricted(UI.currentOrgId, restricted);
  Utils.showNotification('View restriction updated', 'info');
},

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  },

  renderModals() {
    const container = document.getElementById('modalsContainer');
    if (!container) return;

    container.innerHTML = `
            ${this.getCreateOrgModal()}
            ${this.getJoinOrgModal()}
            ${this.getAddMemberModal()}
            ${this.getCreatePollModal()}
            ${this.getVoteModal()}
        `;
  },

  getCreateOrgModal() {
    return `
        <div id="createOrgModal" class="hidden fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onclick="if(event.target===this) UI.closeModal('createOrgModal')">
            <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-modal-pop">
                <div class="p-8">
                    <h3 class="text-3xl font-bold text-gradient mb-4">Create Organization</h3>
                    <form onsubmit="window.Contract.createOrganization(event)">
                        <div class="space-y-5">
                            <div>
                                <label class="block text-gray-700 font-semibold mb-2">Organization Name *</label>
                                <input type="text" id="orgNameInput" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500" required>
                            </div>
                            <div>
                                <label class="block text-gray-700 font-semibold mb-2">ENS Name (Optional)</label>
                                <input type="text" id="orgENSInput" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500" placeholder="yourorg.eth">
                            </div>
                            <div class="flex items-center gap-3">
                                <input type="checkbox" id="orgPublicInput" checked class="w-6 h-6">
                                <label class="text-gray-700 font-medium">Make organization public</label>
                            </div>
                        </div>
                        <div class="flex gap-4 mt-8">
                            <button type="button" onclick="UI.closeModal('createOrgModal')" class="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300">
                                Cancel
                            </button>
                            <button type="submit" class="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg">
                                Create Organization
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
  },

  getJoinOrgModal() {
    return `
        <div id="joinOrgModal" class="hidden fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onclick="if(event.target===this) UI.closeModal('joinOrgModal')">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-modal-pop">
                <div class="p-8">
                    <h3 class="text-3xl font-bold text-gradient mb-4">Access Private Organization</h3>
                    <form onsubmit="window.Contract.joinPrivateOrg(event)">
                        <div class="space-y-5">
                            <div>
                                <label class="block text-gray-700 font-semibold mb-2">Organization ID *</label>
                                <input type="number" id="privateOrgIdInput" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500" required>
                            </div>
                            <div>
                                <label class="block text-gray-700 font-semibold mb-2">Secret Key *</label>
                                <input type="text" id="privateOrgKeyInput" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 font-mono" required>
                            </div>
                        </div>
                        <div class="flex gap-4 mt-8">
                            <button type="button" onclick="UI.closeModal('joinOrgModal')" class="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300">
                                Cancel
                            </button>
                            <button type="submit" class="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg">
                                Verify & Access
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
  },

  getAddMemberModal() {
    return `
        <div id="addMemberModal" class="hidden fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onclick="if(event.target===this) UI.closeModal('addMemberModal')">
            <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-modal-pop">
                <div class="p-8">
                    <div class="text-center mb-8">
                        <h3 class="text-3xl font-bold text-gradient mb-2">Add Members</h3>
                        <p class="text-gray-600">Invite new members to your organization</p>
                    </div>
                    <form onsubmit="window.Contract.addMembers(event)">
                        <div class="space-y-6">
                            <div>
                                <label class="block text-left text-gray-700 font-semibold mb-2">Member Addresses *</label>
                                <textarea id="memberAddressesInput" rows="6" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 focus:border-transparent transition" 
                                          placeholder="One address per line&#10;&#10;0x1234...&#10;0x5678..." required></textarea>
                                <p class="text-sm text-gray-500 mt-2">You can add multiple addresses at once</p>
                            </div>
                        </div>
                        <div class="flex gap-4 mt-8">
                            <button type="button" onclick="UI.closeModal('addMemberModal')" 
                                    class="flex-1 py-4 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition">
                                Cancel
                            </button>
                            <button type="submit" 
                                    class="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition shadow-lg">
                                Add Members
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
  },

  getCreatePollModal() {
    return `
        <div id="createPollModal" class="hidden fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onclick="if(event.target===this) UI.closeModal('createPollModal')">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-modal-pop overflow-y-auto max-h-screen">
                <div class="p-8">
                    <div class="text-center mb-6">
                        <h3 class="text-3xl font-bold text-gradient">Create New Poll</h3>
                        <p class="text-gray-600 mt-2">Set up secure and transparent voting</p>
                    </div>
                    <form onsubmit="window.Contract.createPoll(event)">
                        <div class="space-y-6">
                            <div>
                                <label class="block text-left text-gray-700 font-semibold mb-2">Poll Question *</label>
                                <input type="text" id="pollQuestionInput" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 focus:border-transparent transition" placeholder="e.g. Should we approve the new budget?" required>
                            </div>

                            <div>
                                <label class="block text-left text-gray-700 font-semibold mb-2" for="pollTypeInput"> Poll Type *</label>
                                <select id="pollTypeInput" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 focus:border-transparent transition" onchange="UI.updatePollOptions()">
                                    <option value="0">Yes/No</option>
                                    <option value="1">Multiple Choice</option>
                                    <option value="2">Ranked Voting</option>
                                </select>
                            </div>

                            <div id="pollOptionsContainer" class="hidden">
                                <label class="block text-left text-gray-700 font-semibold mb-2">Options (one per line) *</label>
                                <textarea id="pollOptionsInput" rows="5" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 focus:border-transparent transition" placeholder="Option A&#10;Option B&#10;Option C&#10;Option D"></textarea>
                                <p class="text-xs text-gray-500 mt-1">Enter one option per line</p>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label class="block text-left text-gray-700 font-semibold mb-2">Duration (hours) *</label>
                                    <input type="number" id="pollDurationInput" min="1" value="24" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 focus:border-transparent transition" required>
                                </div>
                                <div>
                                    <label class="block text-left text-gray-700 font-semibold mb-2">Quorum (%) *</label>
                                    <input type="number" id="pollQuorumInput" min="0" max="100" value="50" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 focus:border-transparent transition" required>
                                </div>
                                <div>
                                    <label class="block text-left text-gray-700 font-semibold mb-2">Number of Voting Keys *</label>
                                    <input type="number" id="votingKeysInput" min="1" value="10" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 focus:border-transparent transition" required>
                                    <p class="text-xs text-gray-500 mt-1">Generate enough for all voters</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-3">
                                <input type="checkbox" id="anonymousPollInput" class="w-6 h-6 text-purple-600 rounded focus:ring-purple-500">
                                <label class="text-gray-700 font-medium cursor-pointer">Enable Anonymous Voting</label>
                            </div>
                            <p class="text-sm text-gray-500">Voter identities will be hidden in results</p>
                        </div>

                        <div class="flex gap-4 mt-8">
                            <button type="button" onclick="UI.closeModal('createPollModal')" class="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition">
                                Cancel
                            </button>
                            <button type="submit" class="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition shadow-lg">
                                Create Poll
                            </button>
                            
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
  },

  getVoteModal() {
    return `
        <div id="voteModal" class="hidden fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onclick="if(event.target===this) UI.closeModal('voteModal')">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-modal-pop">
                <div class="p-8">
                    <h3 id="voteModalTitle" class="text-3xl font-bold text-gradient mb-4">Cast Your Vote</h3>
                    <div id="voteOptionsContainer" class="space-y-3 mb-6"></div>
                    <div>
                        <label class="block text-gray-700 font-semibold mb-2">Voting Key *</label>
                        <input type="text" id="voteKeyInput" class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 font-mono" required>
                    </div>
                    <div class="flex gap-4 mt-8">
                        <button type="button" onclick="UI.closeModal('voteModal')" class="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300">
                            Cancel
                        </button>
                        <button onclick="window.Contract.submitVote()" class="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg">
                            Submit Vote
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
  },

  updatePollOptions() {
    const type = document.getElementById('pollTypeInput')?.value;
    const container = document.getElementById('pollOptionsContainer');
    if (container) container.classList.toggle('hidden', type === '0');
  },
};

window.UI = UI;

window.clearSearch = () => UI.clearSearch();
