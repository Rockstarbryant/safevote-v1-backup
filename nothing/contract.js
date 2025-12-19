/**
 * Contract Module - Blockchain Interactions
 * Handles all smart contract calls and Web3 operations
 */

import { CONTRACT_ADDRESS, CHAIN_ID } from './config.js';
import { SafeVoteV2MergedABI } from './SafeVoteV2MergedABI.js';
import { Utils } from './utils.js';
import { Storage } from './storage.js';
import { UI } from './ui.js';
import { ImmutableLoader } from './persistentCache.js';

export const Contract = {
  provider: null,
  signer: null,
  contract: null,
  currentAccount: null,

  /**
   * Initialize contract connection
   */
  /**
   * Initialize contract connection
   */
  async init() {
  if (typeof window.ethereum === 'undefined') {
    Utils.showNotification('Please install a Web3 wallet (MetaMask, Rabby, OKX, etc.)', 'error');
    return false;
  }

  try {
    // Check if already connected
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      await this.connect();
    }
    return true;
  } catch (error) {
    console.error('Init error:', error);
    return false;
  }
},

/**
 * Connect wallet
 */
async connect() {
  try {
    Utils.showLoading('Connecting wallet...');

    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    this.signer = this.provider.getSigner();
    this.currentAccount = accounts[0];

    // Dispatch account change
    window.dispatchEvent(new CustomEvent('accountChanged', { detail: this.currentAccount }));

    // Get current network
    const network = await this.provider.getNetwork();
    updateContractForChain(network.chainId);  // Now global

    // Re-create contract instance with new address
    this.contract = new ethers.Contract(window.CONTRACT_ADDRESS, SafeVoteV2MergedABI, this.signer);
    if (!window.CONTRACT_ADDRESS) {
  Utils.showNotification('Unsupported network — no contract deployed here yet', 'warning');
  return;
}

    // Update UI
    document.getElementById('connectWallet').classList.add('hidden');
    document.getElementById('accountInfo').classList.remove('hidden');
    document.getElementById('accountAddress').textContent = Utils.formatAddress(this.currentAccount);

    // Sync network switcher dropdown
    syncNetworkSwitcher();

    // Initialize UI
    UI.init(this.currentAccount);

    // Setup listeners
    this.setupEventListeners();

    // Load organizations
    await this.loadPublicOrgs();

    Utils.hideLoading();
    Utils.showNotification(`Wallet connected on ${CHAIN_CONFIG[network.chainId]?.name || 'Unknown Network'}!`, 'success');
    // After successful connect
const refreshBtn = document.getElementById('refreshDataBtn');
if (refreshBtn) refreshBtn.classList.remove('hidden');

    return true;
  } catch (error) {
    Utils.hideLoading();
    console.error(`Connection error:`, error);
    Utils.showNotification('Failed to connect wallet', 'error');
    return false;
  }
},

/**
 * Switch to a specific network (called from dropdown)
 */
async switchNetwork(targetChainId) {
  const chainIdHex = '0x' + parseInt(targetChainId).toString(16);

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
    // Wallet will trigger chainChanged → page reloads via listener
  } catch (switchError) {
    if (switchError.code === 4902) {
      Utils.showNotification('This network is not added to your wallet. Add it manually.', 'error');
    } else {
      console.error('Network switch error:', switchError);
      Utils.showNotification('Failed to switch network', 'error');
    }
  }
},

  /**
   * Setup blockchain event listeners
   */
  setupEventListeners() {
    if (!this.contract) return;

    // Organization events
    this.contract.on('OrganizationCreated', (_orgId, name) => {
      Utils.showNotification(`New organization: ${name}`, 'info');
      this.loadPublicOrgs();
    });

    // Poll events
    this.contract.on('PollCreated', (_pollId, orgId, _creator, question, _pollType, _endTime, _timestamp) => {
  if (UI.currentOrgId && orgId.toString() === UI.currentOrgId.toString()) {
    Utils.showNotification(`New poll: ${question}`, 'info');
    this.loadOrgPolls(UI.currentOrgId);
  }
});

    // Vote events
    this.contract.on('VoteCastV1', (_pollId, orgId) => {
      if (UI.currentOrgId && orgId.toString() === UI.currentOrgId.toString()) {
        Utils.showNotification('New vote cast!', 'info');
        this.loadOrgPolls(UI.currentOrgId);
      }
    });

    // Account change
    window.ethereum.on('accountsChanged', () => location.reload());
    window.ethereum.on('chainChanged', () => location.reload());
  },

  /**
   * Create organization
   */
  async createOrganization(event) {
    event.preventDefault();

    if (!this.contract) {
      Utils.showNotification('Please connect your wallet first', 'error');
      return;
    }

    const name = document.getElementById('orgNameInput').value.trim();
    const ensName = document.getElementById('orgENSInput').value.trim();
    const isPublic = document.getElementById('orgPublicInput').checked;

    if (!name) {
      Utils.showNotification('Organization name is required', 'error');
      return;
    }

    try {
      Utils.showLoading('Creating organization...');

      const tx = await this.contract.createOrganization(name, ensName || '', isPublic);
      await tx.wait();

      Utils.showNotification('Organization created successfully!', 'success');
      UI.closeModal('createOrgModal');

      // Clear form
      document.getElementById('orgNameInput').value = '';
      document.getElementById('orgENSInput').value = '';
      document.getElementById('orgPublicInput').checked = true;

      // ← NEW: Invalidate lists so new org appears immediately
      ImmutableLoader.invalidateAfterAction('createOrg', { creator: this.currentAccount });

      // Reload
      await this.loadPublicOrgs();
      await this.loadMyOrgs();
    } catch (error) {
      console.error('Create org error:', error);
      const msg = error?.reason || error?.message || 'Transaction failed';
      Utils.showNotification('Failed: ' + msg, 'error');
    } finally {
      Utils.hideLoading();
    }
  },

  /**
   * Join private organization
   */
  async joinPrivateOrg(event) {
    event.preventDefault();

    const orgId = document.getElementById('privateOrgIdInput').value;
    const secretKey = document.getElementById('privateOrgKeyInput').value.trim();

    try {
      Utils.showLoading('Verifying access...');

      const isValid = await this.contract.verifyPrivateOrgAccess(orgId, secretKey);

      if (isValid) {
        Utils.showNotification('Access verified! Opening organization...', 'success');
        UI.closeModal('joinOrgModal');
        await UI.openOrganization(orgId);
      } else {
        Utils.showNotification('Invalid secret key', 'error');
      }
    } catch (error) {
      console.error('Join error:', error);
      Utils.showNotification('Failed to verify access', 'error');
    } finally {
      Utils.hideLoading();
    }
  },

  /**
   * Load public organizations
   */
  async loadPublicOrgs() {
  if (!this.contract) return;

  try {
    let publicOrgIds = [];
    try {
      publicOrgIds = await this.contract.getPublicOrganizations();
    } catch (error) {
      if (error.code === 'CALL_EXCEPTION' && (error.data === '0x' || error.data === null)) {
        console.info('No public organizations — normal for new deployments');
        publicOrgIds = [];
      } else {
        throw error;
      }
    }

    const orgs = await ImmutableLoader.loadOrganizations(this.contract, publicOrgIds);

    UI.displayOrganizations(publicOrgIds, orgs);

    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filterPublic')?.classList.add('active');

  } catch (error) {
    console.error('Error loading public orgs:', error);
    Utils.showNotification('Failed to load organizations', 'error');
  }
},

/**
 * Check if organization exists
 */
async organizationExists(orgId) {
  try {
    const org = await this.contract.getOrganization(orgId);
    return org && org[0] && org[0].length > 0; // Check if name exists
  } catch (error) {
    return false;
  }
},
  

  /**
   * Load user's organizations
   */
  async loadMyOrgs() {
    if (!this.contract || !this.currentAccount) return;

    try {
      const myOrgIds = await this.contract.getUserOrganizations(this.currentAccount);

      // ← CACHED: Batch load
      const orgs = await ImmutableLoader.loadOrganizations(this.contract, myOrgIds);

      /*
            const orgs = [];

            for (const orgId of myOrgIds) {
                try {
                    const org = await this.contract.getOrganization(orgId);
                    orgs.push(org);
                } catch (error) {
                    console.error(`Error loading org ${orgId}:`, error);
                }
            }
            */

      UI.displayOrganizations(myOrgIds, orgs);

      // Update filter button
      document.querySelectorAll('.btn-filter').forEach((btn) => btn.classList.remove('active'));
      document.getElementById('filterMy')?.classList.add('active');
    } catch (error) {
      console.error('Error loading user orgs:', error);
    }
  },

  /**
   * Get organization details
   */
  async getOrganization(orgId) {
    return await ImmutableLoader.loadOrganization(this.contract, orgId);
    /*
        try {
            return await this.contract.getOrganization(orgId);
        } catch (error) {
            console.error('Get org error:', error);
            return null;
        }  */
  },

  /**
   * Check if user is member
   */
  async isMember(orgId, address) {
    try {
      const memberInfo = await this.contract.getMemberInfo(orgId, address);
      return memberInfo[1]; // isActive
    } catch (error) {
      return false;
    }
  },

  /**
   * Add members
   */
  async addMembers(event) {
    event.preventDefault();

    if (!this.contract || !UI.currentOrgId) return;

    const addressesText = document.getElementById('memberAddressesInput').value;
    const addresses = Utils.parseAddresses(addressesText);

    if (addresses.length === 0) {
      Utils.showNotification('No valid addresses provided', 'error');
      return;
    }

    try {
      Utils.showLoading(`Adding ${addresses.length} member(s)...`);

      const tx =
        addresses.length === 1
          ? await this.contract.addMember(UI.currentOrgId, addresses[0])
          : await this.contract.batchAddMembers(UI.currentOrgId, addresses);

      await tx.wait();

      Utils.showNotification(`Successfully added ${addresses.length} member(s)!`, 'success');
      UI.closeModal('addMemberModal');
      document.getElementById('memberAddressesInput').value = '';

      await this.loadOrgMembers(UI.currentOrgId);
    } catch (error) {
      console.error('Add members error:', error);
      Utils.showNotification('You need to be a member of this organization to add members', 'error');
    } finally {
      Utils.hideLoading();
    }
  },

  /**
   * Remove member
   */
  async removeMember(orgId, memberAddress) {
    if (!Utils.confirm(`Remove ${Utils.formatAddress(memberAddress)} from organization?`)) {
      return;
    }

    try {
      Utils.showLoading('Removing member...');

      const tx = await this.contract.removeMember(orgId, memberAddress);
      await tx.wait();

      Utils.showNotification('Member removed', 'success');
      await this.loadOrgMembers(orgId);
    } catch (error) {
      console.error('Remove member error:', error);
      Utils.showNotification('Failed to remove member', 'error');
    } finally {
      Utils.hideLoading();
    }
  },

  /**
 * Load organization polls
 */
async loadOrgPolls(orgId, showEnded = false) {
  try {
    // ✅ First check if organization exists
    try {
      const org = await this.contract.getOrganization(orgId);
      if (!org || !org[0]) { // org[0] is the name
        console.warn(`Organization ${orgId} does not exist`);
        const containerId = showEnded ? 'endedPollsContainer' : 'activePollsContainer';
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = `
            <div class="col-span-full glass rounded-xl p-12 text-center text-white animate-fade-in">
              <i class="fas fa-exclamation-triangle text-6xl mb-6 opacity-40"></i>
              <p class="text-xl opacity-80">Organization not found</p>
            </div>
          `;
        }
        return;
      }
    } catch (error) {
      console.error(`Organization ${orgId} not found:`, error);
      Utils.showNotification('Organization not found', 'error');
      return;
    }

    // ✅ Try to get polls with error handling
    let pollIds = [];
    try {
      pollIds = await this.contract.getOrganizationPolls(orgId);
    } catch (error) {
      console.warn(`No polls found for org ${orgId}:`, error);
      pollIds = [];
    }

    const pollsData = [];

    // Batch load poll metadata from cache or chain
    const polls = await ImmutableLoader.cache.fetchBatch(
      pollIds.map((id) => `poll_${id}`),
      async (key) => {
        const pollId = key.replace('poll_', '');
        console.log(`📄 Loading poll ${pollId} from chain`);
        try {
          return await this.contract.getPoll(pollId);
        } catch (error) {
          console.warn(`Could not load poll ${pollId}:`, error);
          return null;
        }
      }
    );

    // Process each poll
    for (const pollId of pollIds) {
      const poll = polls[`poll_${pollId}`];
      if (!poll) continue;

      try {
        const results = await this.contract.getPollResults(pollId);
        const isActive = Utils.isPollActive(poll);

        if (isActive === showEnded) continue;

        pollsData.push({
          pollId,
          poll,
          results,
          isActive,
        });
      } catch (error) {
        console.warn(`Could not load results for poll ${pollId}:`, error);
        // Skip this poll and continue
      }
    }

    // Sort polls
    pollsData.sort((a, b) => {
      const aEnd = Utils.bigNumberToNumber(a.poll.endTime);
      const bEnd = Utils.bigNumberToNumber(b.poll.endTime);
      return showEnded ? bEnd - aEnd : aEnd - bEnd;
    });

    // Render to the correct container
    const containerId = showEnded ? 'endedPollsContainer' : 'activePollsContainer';
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (pollsData.length === 0) {
      container.innerHTML = `
        <div class="col-span-full glass rounded-xl p-12 text-center text-white animate-fade-in">
          <i class="fas fa-inbox text-6xl mb-6 opacity-40"></i>
          <p class="text-xl opacity-80">
            No ${showEnded ? 'ended' : 'active'} polls yet
          </p>
          ${!showEnded ? '<p class="text-sm opacity-60 mt-4">Create one to get started!</p>' : ''}
        </div>
      `;
      return;
    }

    // Append poll cards
    pollsData.forEach((data) => {
      const card = UI.createPollCard(data.pollId, data.poll, data.results, data.isActive);
      if (card) container.appendChild(card);
    });

    // Render comments after cards are in DOM
    setTimeout(() => {
      pollsData.forEach(({ pollId }) => UI.renderComments(pollId));
    }, 100);
  } catch (error) {
    console.error('Error loading polls:', error);
    Utils.showNotification('Failed to load polls', 'error');
  }
},

  
  /**
 * Load organization members
 */
async loadOrgMembers(orgId) {
  try {
    // ✅ First check if organization exists
    let org;
    try {
      org = await ImmutableLoader.loadOrganization(this.contract, orgId);
      if (!org || !org[5]) { // Check if org exists (org[5] is memberCount or similar)
        console.warn(`Organization ${orgId} does not exist`);
        const container = document.getElementById('membersList');
        if (container) {
          container.innerHTML = '<p class="text-white opacity-70 text-center py-8">Organization not found</p>';
        }
        return;
      }
    } catch (error) {
      console.error(`Organization ${orgId} not found:`, error);
      Utils.showNotification('Organization not found', 'error');
      return;
    }

    // ✅ Then try to get members with error handling
    let members = [];
    try {
      members = await this.contract.getOrganizationMembers(orgId);
    } catch (error) {
      console.warn(`No members found for org ${orgId}:`, error);
      members = [];
    }

    const membersData = [];

    // Load member info with individual error handling
    for (const address of members) {
      try {
        const info = await ImmutableLoader.loadMemberInfo(this.contract, orgId, address);
        if (info && info[1]) {
          // isActive
          membersData.push({ address, info });
        }
      } catch (error) {
        console.warn(`Could not load member ${address}:`, error);
        // Skip this member and continue
      }
    }

    // SAFE CALL — check if UI is ready
    if (typeof window.UI !== 'undefined' && typeof window.UI.renderMembers === 'function') {
      window.UI.renderMembers(membersData, org);
    } else {
      console.info('Rendering members list (fallback mode)');
      const container = document.getElementById('membersList');
      if (!container) return;

      const currentUser = window.Contract.currentAccount?.toLowerCase();
      const isAdmin = currentUser && org[2].toLowerCase() === currentUser;

      // Show/Hide Leave Organization button
      const leaveBtn = document.getElementById('leaveOrgBtn');
      if (leaveBtn) {
        const isMember = membersData.some(m => m.address.toLowerCase() === currentUser);
        if (isMember && !isAdmin) {
          leaveBtn.classList.remove('hidden');
        } else {
          leaveBtn.classList.add('hidden');
        }
      }

      if (membersData.length === 0) {
        container.innerHTML = '<p class="text-white opacity-70 text-center py-8">No members yet</p>';
        return;
      }

      container.innerHTML = membersData.map(m => {
        const addr = m.address.toLowerCase();
        const isCurrentUser = addr === currentUser;
        const votesCast = Utils.bigNumberToNumber(m.info[2]);

        return `
          <div class="glass rounded-xl p-5 flex items-center justify-between hover:bg-white hover:bg-opacity-10 transition">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                ${addr.slice(2, 4).toUpperCase()}
              </div>
              <div>
                <p class="font-mono text-purple-300">${Utils.formatAddress(m.address)}</p>
                <p class="text-sm text-gray-400">${votesCast} vote${votesCast !== 1 ? 's' : ''} cast</p>
                ${isAdmin ? '<span class="text-xs text-yellow-400"><i class="fas fa-crown mr-1"></i>Admin</span>' : ''}
                ${isCurrentUser ? '<span class="text-xs text-green-400">You</span>' : ''}
              </div>
            </div>

            ${isAdmin && !isCurrentUser ? `
              <button onclick="window.Contract.removeMember(${orgId}, '${m.address}')" 
                      class="text-red-400 hover:text-red-300 transition text-xl" title="Remove member">
                <i class="fas fa-user-times"></i>
              </button>
            ` : ''}
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading members:', error);
    Utils.showNotification('Failed to load members', 'error');
  }
},

  /**
   * Load organization settings
   */
  async loadOrgSettings(orgId) {
    try {
      const org = await this.contract.getOrganization(orgId);
      const isAdmin =
        this.currentAccount && org[2].toLowerCase() === this.currentAccount.toLowerCase();

      document.getElementById('orgVisibility').checked = org[3];

      if (isAdmin) {
        try {
          const secretKey = await this.contract.getOrganizationSecretKey(orgId);
          document.getElementById('secretKey').textContent = secretKey;
        } catch (error) {
          document.getElementById('secretKey').textContent = 'Error loading key';
        }
      } else {
        document.getElementById('secretKey').textContent = 'Only admin can view';
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },

  async leaveOrganization() {
  if (!this.contract || !UI.currentOrgId) return;

  if (!confirm('Are you sure you want to leave this organization?')) return;

  try {
    Utils.showLoading('Leaving organization...');
    const tx = await this.contract.leaveOrganization(UI.currentOrgId);
    await tx.wait();
    Utils.showNotification('You have left the organization', 'success');

    // Refresh members list
    await this.loadOrgMembers(UI.currentOrgId);
  } catch (error) {
    console.error('Leave error:', error);
    Utils.showNotification('Failed to leave organization', 'error');
  } finally {
    Utils.hideLoading();
  }
},

  /**
   * Load only hidden polls (for creator in "Show Hidden" mode)
   */
  async loadHiddenPolls(orgId) {
    try {
      const pollIds = await this.contract.getOrganizationPolls(orgId);
      const hiddenPollsData = [];

      for (const pollId of pollIds) {
        try {
          // Check if this poll is hidden (off-chain via localStorage)
          if (!Storage.visibility.isHidden(pollId)) {
            continue; // Skip non-hidden polls
          }

          const poll = await this.contract.getPoll(pollId);
          const results = await this.contract.getPollResults(pollId);
          hiddenPollsData.push({ pollId, poll, results });
        } catch (error) {
          console.error(`Error loading hidden poll ${pollId}:`, error);
        }
      }

      UI.renderPolls(hiddenPollsData);

      // Render comments for each hidden poll
      setTimeout(() => {
        hiddenPollsData.forEach(({ pollId }) => {
          UI.renderComments(pollId);
        });
      }, 100);

      // Optional: show message if no hidden polls
      if (hiddenPollsData.length === 0) {
        Utils.showNotification('No hidden polls found', 'info');
      }
    } catch (error) {
      console.error('Error loading hidden polls:', error);
      Utils.showNotification('Failed to load hidden polls', 'error');
    }
  },

  /**
   * Update organization visibility
   */
  async updateOrgVisibility() {
    if (!this.contract || !UI.currentOrgId) return;

    const isPublic = document.getElementById('orgVisibility').checked;

    try {
      Utils.showLoading('Updating visibility...');

      const tx = await this.contract.setOrganizationVisibility(UI.currentOrgId, isPublic);
      await tx.wait();

      Utils.showNotification('Visibility updated!', 'success');
    } catch (error) {
      console.error('Update visibility error:', error);
      Utils.showNotification('Failed to update visibility', 'error');
      // Revert checkbox
      document.getElementById('orgVisibility').checked = !isPublic;
    } finally {
      Utils.hideLoading();
    }
  },

  /**
   * Create poll
   */
  async createPoll(event) {
    event.preventDefault();

    if (!this.contract || !UI.currentOrgId) return;

    const question = document.getElementById('pollQuestionInput').value.trim();
    const pollType = parseInt(document.getElementById('pollTypeInput').value);
    const durationHours = parseInt(document.getElementById('pollDurationInput').value);
    const quorum = parseInt(document.getElementById('pollQuorumInput').value);
    const numberOfKeys = parseInt(document.getElementById('votingKeysInput').value);
    const isAnonymous = document.getElementById('anonymousPollInput').checked;

    let options =
      pollType === 0
        ? ['Yes', 'No']
        : document
            .getElementById('pollOptionsInput')
            .value.split('\n')
            .map((o) => o.trim())
            .filter((o) => o);

    if (options.length < 2) {
      Utils.showNotification('Please provide at least 2 options', 'error');
      return;
    }

    try {
      Utils.showLoading('Creating poll...');

      const tx = await this.contract.createPoll(
        UI.currentOrgId,
        question,
        pollType,
        options,
        durationHours * 3600,
        quorum,
        numberOfKeys,
        isAnonymous
      );

      const receipt = await tx.wait();
      const event = receipt.events.find((e) => e.event === 'PollCreated');
      const pollId = event.args[0];

      Utils.showNotification('Poll created successfully!', 'success');
      // ← NEW: Invalidate poll list for this org
      ImmutableLoader.invalidateAfterAction('createPoll', { orgId: UI.currentOrgId });
      UI.closeModal('createPollModal');

      // Clear form
      document.getElementById('pollQuestionInput').value = '';
      document.getElementById('pollOptionsInput').value = '';

      // Generate keys
      await this.generateVotingKeys(pollId, numberOfKeys);

      // Reload polls
      await this.loadOrgPolls(UI.currentOrgId);

      // Update stats
      Storage.stats.incrementPollsCreated();
    } catch (error) {
      console.error('Create poll error:', error);
      Utils.showNotification('Only members of this organization can create polls', 'error');
    } finally {
      Utils.hideLoading();
    }
  },

  /**
   * Generate voting keys
   */
  async generateVotingKeys(pollId, _numberOfKeys) {
    try {
      Utils.showLoading('Generating voting keys...');

      const tx = await this.contract.generateVotingKeys(pollId);
      const receipt = await tx.wait();

      const keyEvents = receipt.events.filter((e) => e.event === 'VotingKeyGenerated');
      const keys = keyEvents.map((e) => e.args.keyHash);

      // Save keys (for convenience)
      Storage.votingKeys.save(pollId, keys);

      // Download keys
      const keysText = keys.map((key, i) => `Key ${i + 1}: ${key}`).join('\n');
      Utils.downloadFile(keysText, `poll-${pollId}-voting-keys.txt`);

      Utils.showNotification('Voting keys generated and downloaded!', 'success');
    } catch (error) {
      console.error('Generate keys error:', error);
      Utils.showNotification('Failed to generate keys', 'error');
    } finally {
      Utils.hideLoading();
    }
  },

  /**
   * Retrieve already generated voting keys from past events
   */
  async retrieveGeneratedKeys(pollId) {
    try {
      Utils.showLoading('Retrieving voting keys from blockchain...');

      const poll = await this.contract.getPoll(pollId);
      const totalKeys = poll.totalVotingKeys.toNumber();

      // Get all VotingKeyGenerated events for this poll
      const filter = this.contract.filters.VotingKeyGenerated(pollId);
      const events = await this.contract.queryFilter(filter);

      const keys = events.map((event) => event.args.keyHash);

      if (keys.length === 0) {
        Utils.showNotification('No keys found — generate them first', 'error');
        return;
      }

      // Download
      const keysText = keys.map((key, i) => `Key ${i + 1}: ${key}`).join('\n');
      Utils.downloadFile(keysText, `retrieved-keys-poll-${pollId}.txt`);

      Utils.showNotification(`Retrieved ${keys.length} voting keys!`, 'success');
    } catch (error) {
      console.error('Retrieve keys error:', error);
      Utils.showNotification('Failed to retrieve keys', 'error');
    } finally {
      Utils.hideLoading();
    }
  },

  /**
   * Show vote modal
   */
  async showVoteModal(pollId) {
    try {
      const poll = await this.contract.getPoll(pollId);
      const isAuthorized = await this.contract.isAuthorizedVoter(pollId, this.currentAccount);
      const hasVoted = await this.contract.hasVoted(pollId, this.currentAccount);

      document.getElementById('voteModalTitle').textContent = poll.question;

      const container = document.getElementById('voteOptionsContainer');
      container.innerHTML = '';

      poll.options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className =
          'flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer';
        div.onclick = () => {
          document
            .querySelectorAll('#voteOptionsContainer input')
            .forEach((i) => (i.checked = false));
          document.getElementById(`voteOpt${index}`).checked = true;
        };

        div.innerHTML = `
                    <input type="radio" name="voteOption" value="${index}" id="voteOpt${index}" class="w-5 h-5 mr-3">
                    <label for="voteOpt${index}" class="text-lg text-gray-800 cursor-pointer flex-1">${Utils.escapeHtml(option)}</label>
                `;

        container.appendChild(div);
      });

      document.getElementById('voteKeyInput').value = '';
      document.getElementById('voteModal').dataset.pollId = pollId;

      if (hasVoted) {
        Utils.showNotification('You have already voted in this poll', 'info');
      } else if (!isAuthorized) {
        Utils.showNotification('You need authorization from the poll creator', 'warning');
      }

      UI.showModal('voteModal');
    } catch (error) {
      console.error('Show vote modal error:', error);
      Utils.showNotification('Failed to load poll', 'error');
    }
  },

  /**
   * Submit vote
   */
  async submitVote() {
    const pollId = document.getElementById('voteModal').dataset.pollId;
    const selectedOption = document.querySelector('input[name="voteOption"]:checked');
    let votingKey = document.getElementById('voteKeyInput').value.trim();

    if (!selectedOption) {
      Utils.showNotification('Please select an option', 'error');
      return;
    }

    if (!votingKey) {
      Utils.showNotification('Please enter your voting key', 'error');
      return;
    }

    // THIS IS THE FIX — Add "0x" if missing
    if (!votingKey.startsWith('0x')) {
      votingKey = '0x' + votingKey;
    }

    // Optional: Validate it's 66 characters (0x + 64 hex)
    if (!/^0x[a-fA-F0-9]{64}$/.test(votingKey)) {
      Utils.showNotification('Invalid voting key format', 'error');
      return;
    }

    try {
      Utils.showLoading('Casting vote...');

      const tx = await this.contract.vote(pollId, parseInt(selectedOption.value), votingKey);

      await tx.wait();

      Utils.showNotification('Vote cast successfully!', 'success');
      // Results changed → reload fresh
      await this.loadOrgPolls(UI.currentOrgId);
      UI.closeModal('voteModal');

      // SAFE CLEAR — check if element exists
      const voteKeyInput = document.getElementById('voteKeyInput');
      if (voteKeyInput) {
        voteKeyInput.value = '';
      }

      await this.loadOrgPolls(UI.currentOrgId);

      // Update stats
      Storage.stats.incrementVotesCast();
    } catch (error) {
      console.error('Vote error:', error);

      const msg = error.message.includes('Already voted')
        ? 'You have already voted'
        : error.message.includes('Voting key already used')
          ? 'This voting key has already been used'
          : error.message.includes('Not authorized')
            ? 'You are not authorized to vote'
            : 'Failed to cast vote';

      Utils.showNotification(msg, 'error');
    } finally {
      Utils.hideLoading();
    }
  },

  /**
   * View poll results
   */
  async viewPollResults(pollId) {
    try {
      Utils.showLoading('Loading results...');

      // const poll = await this.contract.getPoll(pollId);
      // ← CACHED: Poll metadata (question, options, endTime, etc.) — instant after first load
      const poll = await ImmutableLoader.loadPoll(this.contract, pollId);
      const results = await this.contract.getPollResults(pollId);

      Utils.hideLoading();

      const modalHTML = `
            <div id="resultsModal" class="hidden fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onclick="if(event.target===this) this.remove()">
                <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-modal-pop">
                    <div class="p-8">
                        <div class="text-center mb-8">
                            <h3 class="text-3xl font-bold text-gradient mb-4">${Utils.escapeHtml(poll.question)}</h3>
                            <div class="flex flex-wrap justify-center gap-6 text-gray-600">
                                <span>Total Votes: <span class="font-bold">${results[2].toNumber()}</span></span>
                                <span>Quorum: <span class="font-bold">${poll.requiredQuorum}%</span></span>
                            </div>
                        </div>

                        <div class="space-y-5 mb-8">
                            ${results[0]
                              .map((option, i) => {
                                const votes = results[1][i].toNumber();
                                const total = results[2].toNumber();
                                const pct = total > 0 ? (votes / total) * 100 : 0;
                                const isWinner =
                                  votes === Math.max(...results[1].map((v) => v.toNumber()));

                                return `
                                    <div class="bg-gray-50 rounded-xl p-5 ${isWinner ? 'ring-4 ring-yellow-400' : ''}">
                                        <div class="flex justify-between items-center mb-3">
                                            <span class="text-xl font-bold flex items-center gap-3">
                                                ${isWinner ? '<i class="fas fa-trophy text-yellow-500"></i>' : ''}
                                                ${Utils.escapeHtml(option)}
                                            </span>
                                            <span class="text-2xl font-bold">${votes} <span class="text-lg text-gray-600">(${pct.toFixed(1)}%)</span></span>
                                        </div>
                                        <div class="w-full bg-gray-200 rounded-full h-4">
                                            <div class="bg-gradient-to-r from-purple-600 to-pink-600 h-4 rounded-full" style="width: ${pct}%"></div>
                                        </div>
                                    </div>
                                `;
                              })
                              .join('')}
                        </div>

                        <div class="text-center p-6 rounded-xl mb-8 ${results[4] ? 'bg-green-50' : 'bg-red-50'}">
                            <span class="text-3xl font-bold ${results[4] ? 'text-green-700' : 'text-red-700'}">
                                ${results[4] ? '✓ Quorum Met' : '✗ Quorum Not Met'}
                            </span>
                        </div>

                        <button onclick="this.closest('#resultsModal').remove()" 
                                class="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transition">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);
      document.getElementById('resultsModal').classList.remove('hidden');
    } catch (error) {
      Utils.hideLoading();
      console.error('View results error:', error);
      Utils.showNotification('Failed to load results', 'error');
    }
  },

  /**
   * Create results modal
   */
  /**
   * Create beautiful results modal — Polymarket-inspired
   */
  createResultsModal(poll, results) {
    const totalVotes = results[2].toNumber();
    const options = results[0];
    const votes = results[1].map((v) => v.toNumber());
    const quorumMet = results[4];

    const maxVotes = Math.max(...votes);
    const winners = votes.map((v, i) => (v === maxVotes ? i : -1)).filter((i) => i !== -1);

    let html = `
        <div id="resultsModal" class="hidden fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-2" onclick="if(event.target===this) UI.closeModal('resultsModal')">
            <div class="bg-white rounded-lg shadow-xl w-full max-w-[400px] animate-modal-pop overflow-y-auto max-h-[80vh]">
                <div class="p-4 space-y-3">
                    <!-- Header -->
                    <div class="text-center">
                        <h3 class="text-base font-semibold text-gray-900">${Utils.escapeHtml(poll.question)}</h3>
                        <div class="flex justify-center gap-2 text-gray-500 text-xs mt-1">
                            <span>Total: <span class="font-medium">${totalVotes}</span></span>
                            <span>Quorum: <span class="font-medium">${poll.requiredQuorum}%</span></span>
                        </div>
                    </div>

                    <!-- Options -->
                    <div class="space-y-2 mt-2">
    `;

    options.forEach((option, i) => {
      const voteCount = votes[i];
      const pct = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
      const isWinner = winners.includes(i);

      html += `
            <div class="flex flex-col">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-medium flex items-center gap-1">
                        ${isWinner ? '<i class="fas fa-trophy text-yellow-400 text-xs"></i>' : ''}
                        ${Utils.escapeHtml(option)}
                    </span>
                    <span class="text-xs font-semibold">${voteCount} (${pct.toFixed(1)}%)</span>
                </div>
                <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-3 ${isWinner ? 'bg-yellow-400' : 'bg-purple-500'} rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    });

    html += `
                    </div>

                    <!-- Quorum Info -->
                    <div class="text-center p-2 rounded-md ${quorumMet ? 'bg-green-50' : 'bg-red-50'}">
                        <span class="text-xs font-semibold ${quorumMet ? 'text-green-700' : 'text-red-700'}">
                            ${quorumMet ? '✓ Quorum Met' : '✗ Quorum Not Met'}
                        </span>
                    </div>

                    <!-- Close Button -->
                    <button onclick="UI.closeModal('resultsModal')"
                        class="w-full py-2 mt-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-md shadow-sm hover:from-purple-700 hover:to-pink-700 transition">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    return html;
  },

  /**
   * Manage poll keys
   */
  async managePollKeys(pollId) {
    try {
      Utils.showLoading('Loading members...');

      const poll = await this.contract.getPoll(pollId);
      const orgId = poll.orgId;
      const members = await this.contract.getOrganizationMembers(orgId);

      const memberDetails = await Promise.all(
        members.map(async (addr) => {
          try {
            const info = await this.contract.getMemberInfo(orgId, addr);
            const isAuthorized = await this.contract.isAuthorizedVoter(pollId, addr);
            const hasVoted = await this.contract.hasVoted(pollId, addr);

            return { addr, votes: info[2].toNumber(), isAuthorized, hasVoted };
          } catch {
            return { addr, votes: 0, isAuthorized: false, hasVoted: false };
          }
        })
      );

      Utils.hideLoading();

      const modalHTML = `
            <div id="manageKeysModal" class="hidden fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onclick="if(event.target===this) this.remove()">
                <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-modal-pop">
                    <div class="p-8">
                        <div class="text-center mb-8">
                            <h3 class="text-3xl font-bold text-gradient mb-2">Manage Voting Keys</h3>
                            <p class="text-gray-600">Poll #${pollId}: ${Utils.escapeHtml(poll.question)}</p>
                        </div>

                        <p class="text-center text-gray-700 mb-6">
                            Select members to authorize them to vote
                        </p>

                        <div class="max-h-96 overflow-y-auto space-y-3 mb-8">
                            ${memberDetails
                              .map((m) => {
                                const short = Utils.formatAddress(m.addr);
                                const canAuthorize = !m.isAuthorized && !m.hasVoted;
                                const checked = m.isAuthorized ? 'checked' : '';
                                const disabled = !canAuthorize ? 'opacity-50' : '';

                                return `
                                    <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl ${disabled} cursor-pointer">
                                        <div class="flex items-center gap-4">
                                            <input type="checkbox" value="${m.addr}" class="authBox w-5 h-5" ${checked} ${!canAuthorize ? 'disabled' : ''}>
                                            <div>
                                                <div class="font-mono font-semibold">${short}</div>
                                                <div class="text-sm text-gray-600">${m.votes} past votes</div>
                                            </div>
                                        </div>
                                        <span class="px-3 py-1 rounded-full text-xs font-medium ${m.hasVoted ? 'bg-green-600 text-white' : m.isAuthorized ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'}">
                                            ${m.hasVoted ? 'Voted' : m.isAuthorized ? 'Authorized' : 'Pending'}
                                        </span>
                                    </label>
                                `;
                              })
                              .join('')}
                        </div>

                        <div class="flex gap-4">
                            <button onclick="this.closest('#manageKeysModal').remove()" 
                                    class="flex-1 py-4 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition">
                                Cancel
                            </button>
                            <button onclick="Contract.batchAuthorize(${pollId}); this.closest('#manageKeysModal').remove()" 
                                    class="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition">
                                Authorize Selected
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);
      document.getElementById('manageKeysModal').classList.remove('hidden');
    } catch (error) {
      Utils.hideLoading();
      console.error('Manage keys error:', error);
      Utils.showNotification('Failed to load members', 'error');
    }
  },

  /**
   * Create manage keys modal
   */
  createManageKeysModal(pollId, poll, memberDetails) {
    const pendingCount = memberDetails.filter((m) => !m.isAuthorized && !m.hasVoted).length;

    return `
        <div class="hidden fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onclick="this.remove()">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-modal-pop">
                <div class="p-8">
                    <div class="text-center mb-8">
                        <h3 class="text-3xl font-bold text-gradient mb-2">Manage Voting Keys</h3>
                        <p class="text-gray-600">Poll #${pollId}: ${Utils.escapeHtml(poll.question)}</p>
                    </div>

                    <p class="text-center text-gray-700 mb-6">
                        Select members to authorize them to vote
                    </p>

                    <div class="max-h-96 overflow-y-auto space-y-3 mb-8">
                        ${memberDetails
                          .map((m) => {
                            const short = Utils.formatAddress(m.addr);
                            const canAuthorize = !m.isAuthorized && !m.hasVoted;
                            const checked = m.isAuthorized ? 'checked' : '';
                            const disabled = !canAuthorize ? 'opacity-50' : '';

                            return `
                                <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl ${disabled} cursor-pointer">
                                    <div class="flex items-center gap-4">
                                        <input type="checkbox" value="${m.addr}" class="authBox w-5 h-5" ${checked} ${!canAuthorize ? 'disabled' : ''}>
                                        <div>
                                            <div class="font-mono font-semibold">${short}</div>
                                            <div class="text-sm text-gray-600">${m.votes} past votes</div>
                                        </div>
                                    </div>
                                    <span class="px-3 py-1 rounded-full text-xs font-medium ${m.hasVoted ? 'bg-green-600 text-white' : m.isAuthorized ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'}">
                                        ${m.hasVoted ? 'Voted' : m.isAuthorized ? 'Authorized' : 'Pending'}
                                    </span>
                                </label>
                            `;
                          })
                          .join('')}
                    </div>

                    <div class="flex gap-4">
                        <button onclick="this.closest('.fixed').remove()" 
                                class="flex-1 py-4 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition">
                            Cancel
                        </button>
                        <button onclick="Contract.batchAuthorize(${pollId})" 
                                class="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition">
                            Authorize Selected (${pendingCount})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
  },

  /**
   * Batch authorize voters
   */
  async batchAuthorize(pollId) {
    const selected = Array.from(document.querySelectorAll('.authBox:checked:not(:disabled)'))
      .map((cb) => cb.value)
      .filter((addr) => Utils.isValidAddress(addr));

    if (selected.length === 0) {
      Utils.showNotification('No members selected', 'info');
      return;
    }

    try {
      Utils.showLoading(`Authorizing ${selected.length} member(s)...`);

      const tx =
        selected.length === 1
          ? await this.contract.authorizeVoter(pollId, selected[0])
          : await this.contract.batchAuthorizeVoters(pollId, selected);

      await tx.wait();

      Utils.showNotification(`Authorized ${selected.length} voter(s)!`, 'success');
      document.getElementById('manageKeysModal')?.remove();
    } catch (error) {
      console.error('Batch authorize error:', error);
      Utils.showNotification('Transaction failed: ' + (error.reason || error.message), 'error');
    } finally {
      Utils.hideLoading();
    }
  },
};

// Make Contract globally accessible
window.Contract = Contract;

// Global connect function for button
async function connectWallet() {
  if (window.Contract) {
    await window.Contract.connect();
  } else {
    Utils.showNotification('Please refresh the page', 'error');
  }
}

  

// Auto-init on load
window.addEventListener('load', async () => {
  await Contract.init();
});

// Global function to refresh organizations
window.refreshOrganizations = async function () {
  Utils.showNotification('Refreshing organizations...', 'info');
  if (document.getElementById('filterPublic')) {
    document.getElementById('filterPublic').classList.contains('active')
      ? await Contract.loadPublicOrgs()
      : await Contract.loadMyOrgs();
  } else {
    await Contract.loadPublicOrgs(); // default to public
  }
};

export default Contract;
