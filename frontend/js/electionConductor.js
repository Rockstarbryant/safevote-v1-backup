/**
 * Election Conductor - Multi-step election creation wizard
 */

const ElectionConductor = {
  currentStep: 1,
  electionData: {
    title: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    numVoters: 0,
    electionUUID: null,
    isPublic: true,
    allowAnonymous: false,
    allowDelegation: false,
    positions: [{ title: '', candidates: ['', ''] }],
  },
  selectedChains: [11155111, 84532, 421614],
  voterAddresses: [],
  merkleRoot: null,

  /**
   * Initialize
   */
  init() {
    const container = document.getElementById('electionConductorContainer');
    if (!container) {
      console.error('Election conductor container not found');
      return;
    }
    this.electionUUID = this.generateUUID();
    console.log('Generated Election UUID:', this.electionUUID);
    this.render();
  },

  /**
   * Generate a unique election UUID (v4 style)
   */
  generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      // Modern browsers
      return 'elec-' + crypto.randomUUID();
    }

    // Fallback for older browsers (still very unique)
    return (
      'elec-' +
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      })
    );
  },

  /**
   * Render main interface
   */
  render() {
    const container = document.getElementById('electionConductorContainer');
    container.innerHTML = `
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-white mb-2">🗳️ Election Conductor</h1>
          <p class="text-white opacity-80">Create your election in 5 easy steps</p>
        </div>

        <div id="progressBar" class="mb-8"></div>
        <div class="glass rounded-2xl p-8 mb-6" id="stepContent"></div>

        <div class="flex justify-between gap-4">
          <button id="prevBtn" class="btn-secondary px-8 py-3 rounded-xl font-bold">
            ← Previous
          </button>
          <button id="nextBtn" class="btn-primary px-8 py-3 rounded-xl font-bold">
            Next →
          </button>
        </div>
      </div>
    `;
    this.attachEventListeners();
    this.renderStep();
  },

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    document.getElementById('prevBtn').addEventListener('click', () => this.prevStep());
    document.getElementById('nextBtn').addEventListener('click', () => this.nextStep());
  },

  /**
   * Render current step
   */
  renderStep() {
    this.renderProgress();

    const content = document.getElementById('stepContent');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = this.currentStep === 1;
    prevBtn.style.opacity = this.currentStep === 1 ? '0.5' : '1';

    if (this.currentStep === 5) {
      nextBtn.textContent = '🚀 Deploy';
      nextBtn.disabled = false;
    } else {
      nextBtn.textContent = 'Next →';
      nextBtn.disabled = false;
    }

    switch (this.currentStep) {
      case 1:
        content.innerHTML = this.renderStep1();
        break;
      case 2:
        content.innerHTML = this.renderStep2();
        this.attachStep2Listeners();
        break;
      case 3:
        content.innerHTML = this.renderStep3();
        this.attachStep3Listeners();
        break;
      case 4:
        content.innerHTML = this.renderStep4();
        this.attachStep4Listeners();
        break;
      case 5:
        content.innerHTML = this.renderStep5();
        break;
    }
  },

  /**
   * Render progress bar
   */
  renderProgress() {
    const steps = ['Details', 'Positions', 'Voters', 'Chains', 'Review'];
    const bar = document.getElementById('progressBar');

    bar.innerHTML = `
      <div class="flex items-center justify-center gap-2 flex-wrap">
        ${steps
          .map((label, i) => {
            const num = i + 1;
            const active = num === this.currentStep;
            const completed = num < this.currentStep;

            return `
              <div class="flex items-center">
                <div class="flex flex-col items-center">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                      ${
                        completed
                          ? 'bg-green-500 text-white'
                          : active
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-600 text-gray-400'
                      }">
                    ${completed ? '✓' : num}
                  </div>
                  <span class="text-white text-xs mt-2">${label}</span>
                </div>
                ${i < 4 ? '<div class="w-8 h-1 bg-gray-600 mx-2"></div>' : ''}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  },

  /**
   * Render step 1 - Election details
   */
  renderStep1() {
    return `
      <h2 class="text-2xl font-bold text-white mb-6">Step 1: Election Details</h2>

      <div class="space-y-4">
        <div>
          <label class="text-white font-semibold mb-2 block">Title *</label>
          <input type="text" id="title" value="${this.electionData.title}"
                 placeholder="e.g., 2025 Student Government Election"
                 class="w-full px-4 py-3 rounded-xl bg-white">
        </div>

        <div>
          <label class="text-white font-semibold mb-2 block">Description</label>
          <textarea id="description" rows="3"
                    class="w-full px-4 py-3 rounded-xl bg-white"
                    placeholder="Describe your election...">${
                      this.electionData.description
                    }</textarea>
        </div>

        <div>
          <label class="text-white font-semibold mb-2 block">Location</label>
          <input type="text" id="location" value="${this.electionData.location}"
                 placeholder="e.g., Stanford University"
                 class="w-full px-4 py-3 rounded-xl bg-white">
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-white font-semibold mb-2 block">Start Date *</label>
            <input type="date" id="startDate" value="${this.electionData.startDate}"
                   class="w-full px-4 py-3 rounded-xl bg-white">
          </div>
          <div>
            <label class="text-white font-semibold mb-2 block">Start Time *</label>
            <input type="time" id="startTime" value="${this.electionData.startTime}"
                   class="w-full px-4 py-3 rounded-xl bg-white">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-white font-semibold mb-2 block">End Date *</label>
            <input type="date" id="endDate" value="${this.electionData.endDate}"
                   class="w-full px-4 py-3 rounded-xl bg-white">
          </div>
          <div>
            <label class="text-white font-semibold mb-2 block">End Time *</label>
            <input type="time" id="endTime" value="${this.electionData.endTime}"
                   class="w-full px-4 py-3 rounded-xl bg-white">
          </div>
        </div>

        <div class="space-y-2 mt-4">
          <label class="flex items-center text-white cursor-pointer">
            <input type="checkbox" id="isPublic" ${this.electionData.isPublic ? 'checked' : ''}
                   class="mr-3 w-5 h-5">
            Public results (anyone can view)
          </label>
          <label class="flex items-center text-white cursor-pointer">
            <input type="checkbox" id="allowAnonymous" ${
              this.electionData.allowAnonymous ? 'checked' : ''
            }
                   class="mr-3 w-5 h-5">
            Allow anonymous voting
          </label>
          <label class="flex items-center text-white cursor-pointer">
            <input type="checkbox" id="allowDelegation" ${
              this.electionData.allowDelegation ? 'checked' : ''
            }
                   class="mr-3 w-5 h-5">
            Allow vote delegation
          </label>
        </div>
      </div>
    `;
  },

  /**
   * Render step 2 - Positions
   */
  renderStep2() {
    return `
      <h2 class="text-2xl font-bold text-white mb-6">Step 2: Positions & Candidates</h2>

      <div id="positionsContainer" class="space-y-4 mb-4">
        ${this.electionData.positions
          .map(
            (pos, i) => `
          <div class="bg-white bg-opacity-10 rounded-xl p-4" data-position="${i}">
            <label class="text-white font-semibold mb-2 block">Position ${i + 1}</label>
            <input type="text"
                   data-position-idx="${i}"
                   placeholder="Position Title (e.g., President)"
                   value="${pos.title || ''}"
                   class="position-title-input w-full px-4 py-2 rounded-lg mb-3 bg-white">

            <label class="text-white font-semibold mb-2 block">Candidates:</label>
            <div class="space-y-2">
              ${pos.candidates
                .map(
                  (cand, j) => `
                <div class="flex gap-2">
                  <input type="text"
                         data-position-idx="${i}"
                         data-candidate-idx="${j}"
                         placeholder="Candidate ${j + 1}"
                         value="${cand || ''}"
                         class="candidate-input flex-1 px-4 py-2 rounded-lg bg-white">
                  ${
                    pos.candidates.length > 2
                      ? `
                    <button data-position-idx="${i}" data-candidate-idx="${j}"
                            class="remove-candidate-btn px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                      ✕
                    </button>
                  `
                      : ''
                  }
                </div>
              `
                )
                .join('')}
            </div>

            <button data-position-idx="${i}"
                    class="add-candidate-btn mt-3 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm">
              + Add Candidate
            </button>

            ${
              this.electionData.positions.length > 1
                ? `
              <button data-position-idx="${i}"
                      class="remove-position-btn mt-3 ml-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                Remove Position
              </button>
            `
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>

      <button id="addPositionBtn" class="btn-primary px-6 py-2 rounded-xl">
        + Add Position
      </button>
    `;
  },

  /**
   * Attach step 2 listeners
   */
  attachStep2Listeners() {
    document.querySelectorAll('.position-title-input').forEach((input) => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.positionIdx);
        this.electionData.positions[idx].title = e.target.value;
      });
    });

    document.querySelectorAll('.candidate-input').forEach((input) => {
      input.addEventListener('change', (e) => {
        const posIdx = parseInt(e.target.dataset.positionIdx);
        const candIdx = parseInt(e.target.dataset.candidateIdx);
        this.electionData.positions[posIdx].candidates[candIdx] = e.target.value;
      });
    });

    document.querySelectorAll('.add-candidate-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.positionIdx);
        this.electionData.positions[idx].candidates.push('');
        this.renderStep();
      });
    });

    document.querySelectorAll('.remove-candidate-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const posIdx = parseInt(e.target.dataset.positionIdx);
        const candIdx = parseInt(e.target.dataset.candidateIdx);
        if (this.electionData.positions[posIdx].candidates.length > 2) {
          this.electionData.positions[posIdx].candidates.splice(candIdx, 1);
          this.renderStep();
        }
      });
    });

    document.querySelectorAll('.remove-position-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.positionIdx);
        if (this.electionData.positions.length > 1) {
          this.electionData.positions.splice(idx, 1);
          this.renderStep();
        }
      });
    });

    document.getElementById('addPositionBtn').addEventListener('click', () => {
      this.electionData.positions.push({ title: '', candidates: ['', ''] });
      this.renderStep();
    });
  },

  /**
   * Render step 3 - Voters
   */
  renderStep3() {
    return `
      <h2 class="text-2xl font-bold text-white mb-6">Step 3: Register Voters</h2>

      <div class="space-y-4">
        <div>
          <label class="text-white font-semibold mb-2 block">Number of Voters *</label>
          <input type="number" id="numVoters" value="${this.electionData.numVoters || ''}"
                 placeholder="e.g., 1000"
                 class="w-full px-4 py-3 rounded-xl bg-white">
        </div>

        <div>
          <label class="text-white font-semibold mb-2 block">Voter Addresses (one per line)</label>
          <textarea id="voterAddresses" rows="8"
                    class="w-full px-4 py-3 rounded-xl bg-white font-mono text-sm"
                    placeholder="0x1234...&#10;0x5678...&#10;0xabcd...">${this.voterAddresses.join(
                      '\n'
                    )}</textarea>
          <p class="text-white text-sm mt-2 opacity-70">
            Paste Ethereum addresses, one per line
          </p>
        </div>

        <button id="generateKeysBtn" class="btn-primary w-full py-3 rounded-xl font-bold">
          🔑 Generate Voter Keys
        </button>

        <div id="keyResult"></div>
      </div>
    `;
  },

  /**
   * Attach step 3 listeners
   */
  attachStep3Listeners() {
    document.getElementById('generateKeysBtn').addEventListener('click', () => {
      this.generateKeys();
    });
  },

  /**
   * Render step 4 - Chains
   */
  renderStep4() {
    const chains = [
      { id: 11155111, name: 'Ethereum Sepolia', icon: '🔷' },
      { id: 84532, name: 'Base Sepolia', icon: '🔵' },
      { id: 421614, name: 'Arbitrum Sepolia', icon: '🔹' },
      { id: 97, name: 'BNB Testnet', icon: '🟡' },
      { id: 1328, name: 'Sei Testnet', icon: '⚡' },
    ];

    return `
      <h2 class="text-2xl font-bold text-white mb-6">Step 4: Select Blockchains</h2>
      <p class="text-white opacity-80 mb-6">Choose which chains to deploy your election to</p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${chains
          .map(
            (chain) => `
          <label class="flex items-center p-4 rounded-xl cursor-pointer transition
                        ${
                          this.selectedChains.includes(chain.id)
                            ? 'bg-purple-600 bg-opacity-30 border-2 border-purple-500'
                            : 'bg-white bg-opacity-10 border-2 border-transparent hover:bg-opacity-20'
                        }">
            <input type="checkbox"
                   value="${chain.id}"
                   data-chain-id="${chain.id}"
                   ${this.selectedChains.includes(chain.id) ? 'checked' : ''}
                   class="chain-checkbox mr-3 w-5 h-5">
            <span class="text-2xl mr-2">${chain.icon}</span>
            <span class="text-white font-semibold">${chain.name}</span>
          </label>
        `
          )
          .join('')}
      </div>

      <div class="mt-6 bg-blue-500 bg-opacity-20 border border-blue-400 rounded-xl p-4">
        <h3 class="text-white font-bold mb-2">💡 Why Multichain?</h3>
        <ul class="text-white text-sm space-y-1 opacity-90">
          <li>• Distribute load across networks</li>
          <li>• Scale to millions of voters</li>
          <li>• Give voters chain choice</li>
          <li>• Prevent single point of failure</li>
        </ul>
      </div>
    `;
  },

  /**
   * Attach step 4 listeners
   */
  attachStep4Listeners() {
    document.querySelectorAll('.chain-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const chainId = parseInt(e.target.dataset.chainId);
        const idx = this.selectedChains.indexOf(chainId);

        if (e.target.checked && idx === -1) {
          this.selectedChains.push(chainId);
        } else if (!e.target.checked && idx > -1) {
          this.selectedChains.splice(idx, 1);
        }

        this.renderStep();
      });
    });
  },

  /**
   * Render step 5 - Review
   */
  renderStep5() {
    const startDateTime = new Date(`${this.electionData.startDate}T${this.electionData.startTime}`);
    const endDateTime = new Date(`${this.electionData.endDate}T${this.electionData.endTime}`);
    const duration = Math.floor((endDateTime - startDateTime) / (1000 * 60 * 60));

    return `
      <h2 class="text-2xl font-bold text-white mb-6">Step 5: Review & Deploy</h2>

      <div class="space-y-4">
        <div class="bg-white bg-opacity-10 rounded-xl p-4">
          <h3 class="text-white font-bold mb-3">📋 Election Details</h3>
          <div class="text-white text-sm space-y-2">
            <p><strong>Title:</strong> ${this.electionData.title}</p>
            <p><strong>Description:</strong> ${this.electionData.description || '(None)'}</p>
            <p><strong>Location:</strong> ${this.electionData.location || '(None)'}</p>
            <p><strong>Start:</strong> ${this.electionData.startDate} at ${
      this.electionData.startTime
    }</p>
            <p><strong>End:</strong> ${this.electionData.endDate} at ${
      this.electionData.endTime
    }</p>
            <p><strong>Duration:</strong> ${duration} hours</p>
            <p><strong>Visibility:</strong> ${
              this.electionData.isPublic ? '🌍 Public' : '🔒 Private'
            }</p>
            <p><strong>Anonymous:</strong> ${
              this.electionData.allowAnonymous ? '✓ Yes' : '✗ No'
            }</p>
            <p><strong>Delegation:</strong> ${
              this.electionData.allowDelegation ? '✓ Yes' : '✗ No'
            }</p>
          </div>
        </div>

        <div class="bg-white bg-opacity-10 rounded-xl p-4">
          <h3 class="text-white font-bold mb-3">🎯 Positions (${
            this.electionData.positions.length
          })</h3>
          <div class="text-white text-sm space-y-3">
            ${this.electionData.positions
              .map(
                (p, i) => `
              <div class="bg-white bg-opacity-5 rounded-lg p-3">
                <p><strong>${i + 1}. ${p.title || 'Untitled Position'}</strong></p>
                <p class="text-gray-300 mt-1">Candidates: ${
                  p.candidates.filter((c) => c).length
                }</p>
                <div class="mt-2 text-xs text-gray-400">
                  ${p.candidates
                    .filter((c) => c)
                    .map(
                      (c) =>
                        `<span class="inline-block bg-white bg-opacity-10 px-2 py-1 rounded mr-1 mb-1">${c}</span>`
                    )
                    .join('')}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="bg-white bg-opacity-10 rounded-xl p-4">
          <h3 class="text-white font-bold mb-3">👥 Voters (${this.voterAddresses.length})</h3>
          <p class="text-white text-sm">${this.voterAddresses.length} registered voter${
      this.voterAddresses.length !== 1 ? 's' : ''
    }</p>
          <div class="text-white text-xs mt-2 text-gray-300">
            Sample addresses: ${this.voterAddresses.slice(0, 2).join(', ')}${
      this.voterAddresses.length > 2 ? ', ...' : ''
    }
          </div>
        </div>

        <div class="bg-white bg-opacity-10 rounded-xl p-4">
          <h3 class="text-white font-bold mb-3">⛓️ Selected Chains (${
            this.selectedChains.length
          })</h3>
          <div class="text-white text-sm space-y-2">
            ${this.selectedChains
              .map((chainId) => {
                const chainNames = {
                  11155111: 'Ethereum Sepolia',
                  84532: 'Base Sepolia',
                  421614: 'Arbitrum Sepolia',
                  97: 'BNB Testnet',
                  1328: 'Sei Testnet',
                };
                return `<p>✓ ${chainNames[chainId] || 'Chain ' + chainId}</p>`;
              })
              .join('')}
          </div>
        </div>

        <div class="bg-blue-500 bg-opacity-20 border border-blue-400 rounded-xl p-4">
          <h3 class="text-white font-bold mb-2">✅ Ready to Deploy</h3>
          <p class="text-white text-sm">
            Your election is ready to be deployed! Click the "🚀 Deploy" button below to create this election on the selected blockchains.
          </p>
          <p class="text-white text-xs mt-3 opacity-80">
            Make sure your wallet is connected and has sufficient gas fees on each chain.
          </p>
        </div>
      </div>
    `;
  },

  /**
   * Generate keys
   */
  async generateKeys() {
    const addressesText = document.getElementById('voterAddresses').value.trim();
    if (!addressesText) {
      alert('Please enter at least one voter address');
      return;
    }

    const voterAddresses = addressesText
      .split('\n')
      .map((a) => a.trim())
      .filter((a) => a && /^0x[a-fA-F0-9]{40}$/.test(a));

    if (voterAddresses.length === 0) {
      alert('No valid addresses found');
      return;
    }

    try {
      Utils.showLoading('Generating secure keys...');

      // ✅ FIX: For vanilla JavaScript (no React)
      // Get API URLs from window object or use defaults
      const KEYGEN_API = window.KEYGEN_API || 'http://localhost:3001';
      const BACKEND_API = window.BACKEND_API || 'http://localhost:5000';

      console.log(`📡 Calling keyService: ${KEYGEN_API}/api/elections/keys/generate`);

      const response = await fetch(`${KEYGEN_API}/api/elections/keys/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: this.electionUUID,
          numVoters: voterAddresses.length,
          voterAddresses,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Key generation failed');
      }

      const data = await response.json();
      this.merkleRoot = data.merkleRoot;
      this.voterAddresses = voterAddresses;

      console.log(`✅ Keys generated. Merkle root: ${this.merkleRoot}`);

      // Save full election details after keys succeed
      const startDateTime = new Date(
        `${this.electionData.startDate}T${this.electionData.startTime}`
      );
      const endDateTime = new Date(`${this.electionData.endDate}T${this.electionData.endTime}`);
      const startTime = Math.floor(startDateTime.getTime() / 1000);
      const endTime = Math.floor(endDateTime.getTime() / 1000);

      console.log(`📝 Saving election to: ${BACKEND_API}/api/elections/create`);

      const saveResponse = await fetch(`${BACKEND_API}/api/elections/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: this.electionUUID,
          title: this.electionData.title || 'Untitled Election',
          description: this.electionData.description || '',
          location: this.electionData.location || '',
          creator: '0x0000000000000000000000000000000000000000', // Temporary; get from wallet later
          startTime: startTime,
          endTime: endTime,
          totalVoters: voterAddresses.length,
          isPublic: this.electionData.isPublic,
          allowAnonymous: this.electionData.allowAnonymous,
          allowDelegation: this.electionData.allowDelegation,
          positions: this.electionData.positions.map((p) => ({
            title: p.title || 'Untitled Position',
            candidates: p.candidates.filter((c) => c.trim()),
            maxSelections: 1,
          })),
          merkleRoot: this.merkleRoot,
          voterAddresses: voterAddresses,
        }),
      });

      if (!saveResponse.ok) {
        const err = await saveResponse.json();
        console.warn('⚠️ Failed to save election details:', err);
        // Don't throw - keys were generated successfully
        // Election can be saved again later
      } else {
        console.log('✅ Election details saved successfully');
      }

      // Update UI
      document.getElementById('keyResult').innerHTML = `
      <div class="bg-green-500 bg-opacity-20 border border-green-400 rounded-xl p-4">
        <h3 class="text-white font-bold mb-2">✅ Keys Generated!</h3>
        <p class="text-white text-sm">Merkle Root: <code class="font-mono">${this.merkleRoot}</code></p>
        <p class="text-white text-sm">Total Voters: ${voterAddresses.length}</p>
      </div>
    `;

      Utils.showNotification('Keys generated and details saved!', 'success');
    } catch (error) {
      console.error('❌ Key generation error:', error);
      document.getElementById('keyResult').innerHTML = `
      <div class="bg-red-500 bg-opacity-20 border border-red-400 rounded-xl p-4">
        <h3 class="text-white font-bold mb-2">❌ Error</h3>
        <p class="text-white text-sm">${error.message}</p>
      </div>
    `;
      Utils.showNotification('Key generation failed', 'error');
    } finally {
      Utils.hideLoading();
    }
  },
  /**
   * Save step data
   */
  saveStep() {
    switch (this.currentStep) {
      case 1:
        this.electionData.title = document.getElementById('title').value;
        this.electionData.description = document.getElementById('description').value;
        this.electionData.location = document.getElementById('location').value;
        this.electionData.startDate = document.getElementById('startDate').value;
        this.electionData.startTime = document.getElementById('startTime').value;
        this.electionData.endDate = document.getElementById('endDate').value;
        this.electionData.endTime = document.getElementById('endTime').value;
        this.electionData.isPublic = document.getElementById('isPublic').checked;
        this.electionData.allowAnonymous = document.getElementById('allowAnonymous').checked;
        this.electionData.allowDelegation = document.getElementById('allowDelegation').checked;
        break;
      case 3:
        this.electionData.numVoters = parseInt(document.getElementById('numVoters').value) || 0;
        break;
    }
  },

  /**
   * Next step
   */
  nextStep() {
    this.saveStep();

    if (this.currentStep === 1) {
      if (!this.electionData.title || !this.electionData.startDate || !this.electionData.endDate) {
        alert('❌ Please fill in all required fields (Title, Start Date, End Date)');
        return;
      }

      const start = new Date(`${this.electionData.startDate}T${this.electionData.startTime}`);
      const end = new Date(`${this.electionData.endDate}T${this.electionData.endTime}`);
      if (start >= end) {
        alert('❌ End date/time must be after start date/time');
        return;
      }
    }

    if (this.currentStep === 2) {
      const invalidPositions = this.electionData.positions.filter(
        (p) => !p.title || p.candidates.filter((c) => c).length === 0
      );
      if (invalidPositions.length > 0) {
        alert('❌ All positions must have a title and at least one candidate');
        return;
      }
    }

    if (this.currentStep === 3) {
      const addresses = document
        .getElementById('voterAddresses')
        .value.split('\n')
        .filter((a) => a.trim());
      if (addresses.length === 0) {
        alert('❌ Please add at least one voter address');
        return;
      }
      this.voterAddresses = addresses;
    }

    if (this.currentStep === 5) {
      if (!window.Contract || !window.Contract.contract) {
        alert('❌ Please connect your wallet first');
        return;
      }
      this.deploy();
      return;
    }

    if (this.currentStep < 5) {
      this.currentStep++;
      this.renderStep();
    }
  },

  /**
   * Previous step
   */
  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.renderStep();
    }
  },

  /**
   * Reset to initial state
   */
  reset() {
    this.currentStep = 1;
    this.electionData = {
      title: '',
      description: '',
      location: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      numVoters: 0,
      isPublic: true,
      allowAnonymous: false,
      allowDelegation: false,
      positions: [{ title: '', candidates: ['', ''] }],
    };
    this.selectedChains = [11155111, 84532, 421614];
    this.voterAddresses = [];
    this.merkleRoot = null;
    this.render();
  },

  /**
   * Deploy election
   */
  async deploy() {
    try {
      if (typeof Utils !== 'undefined') {
        Utils.showLoading('Deploying election...');
      }

      // Validate required fields
      if (!this.electionData.title || !this.electionData.startDate || !this.electionData.endDate) {
        throw new Error('Please fill in all required election details');
      }

      if (this.electionData.positions.length === 0) {
        throw new Error('Please add at least one position');
      }

      if (!this.voterAddresses || this.voterAddresses.length === 0) {
        throw new Error('Please add voter addresses');
      }

      if (this.selectedChains.length === 0) {
        throw new Error('Please select at least one blockchain');
      }

      // Check if contract is available
      if (!window.Contract || !window.Contract.contract) {
        throw new Error('Please connect your wallet first');
      }

      // Parse start and end times
      const startDateTime = new Date(
        `${this.electionData.startDate}T${this.electionData.startTime}`
      );
      const endDateTime = new Date(`${this.electionData.endDate}T${this.electionData.endTime}`);
      const now = new Date();

      if (startDateTime <= now) {
        throw new Error('Start time must be in the future');
      }

      if (endDateTime <= startDateTime) {
        throw new Error('End time must be after start time');
      }

      // Convert times to Unix timestamps
      const startTime = Math.floor(startDateTime.getTime() / 1000);
      const endTime = Math.floor(endDateTime.getTime() / 1000);
      const totalVoters = this.voterAddresses.length;

      // Prepare positions data
      const positions = this.electionData.positions.map((pos) => ({
        title: pos.title || 'Untitled Position',
        candidates: pos.candidates.filter((c) => c.trim()),
        maxSelections: 1,
      }));

      // Validate positions have candidates
      const invalidPositions = positions.filter((p) => p.candidates.length === 0);
      if (invalidPositions.length > 0) {
        throw new Error('All positions must have at least one candidate');
      }

      // Generate voter merkle root (simplified)
      const voterMerkleRoot = this.merkleRoot;

      if (!voterMerkleRoot || voterMerkleRoot === '0x000...') {
        throw new Error('Keys not generated yet. Click "Generate Voter Keys" first.');
      }

      // Deploy to selected chains
      const deploymentResults = [];

      for (const chainId of this.selectedChains) {
        try {
          if (typeof Utils !== 'undefined') {
            Utils.showLoading(`Deploying to chain ${chainId}...`);
          }

          // Get current chain
          const currentNetwork = await window.Contract.provider.getNetwork();

          // Switch chain if needed
          if (currentNetwork.chainId !== chainId) {
            await window.Contract.switchNetwork(chainId);
            // Wait a moment for chain switch
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          // Call createElection contract method
          const tx = await window.Contract.contract.createElection(
            this.electionData.title,
            this.electionData.description || '',
            this.electionData.location || '',
            startTime,
            endTime,
            totalVoters,
            voterMerkleRoot,
            this.electionData.isPublic,
            this.electionData.allowAnonymous,
            this.electionData.allowDelegation,
            positions
          );

          const receipt = await tx.wait();
          const event = receipt.events?.find((e) => e.event === 'ElectionCreatedV2');
          const onChainElectionId = event?.args?.electionId?.toString() || 'unknown';

          deploymentResults.push({
            chainId,
            success: true,
            electionId: this.electionUUID, // Global ID for frontend/backend
            onChainElectionId, // Real on-chain ID
            txHash: receipt.transactionHash,
          });

          // After all deployments succeed — save full election data

          // Sync to backend
          try {
            await fetch('https://blockballot-node-services.onrender.com/api/elections/sync-deployment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                electionId: this.electionUUID,
                chainId: chainId,
                onChainElectionId: onChainElectionId,
                txHash: receipt.transactionHash,
              }),
            });
          } catch (syncErr) {
            console.warn(`Sync failed for chain ${chainId}:`, syncErr);
          }

          console.log(`✅ Election deployed on chain ${chainId} with ID ${this.electionUUID}`);
        } catch (error) {
          console.error(`❌ Deployment failed on chain ${chainId}:`, error);
          deploymentResults.push({
            chainId,
            success: false,
            error: error.message,
          });
        }
      }

      // Check results
      const successCount = deploymentResults.filter((r) => r.success).length;
      const failureCount = deploymentResults.filter((r) => !r.success).length;

      if (successCount === 0) {
        throw new Error('Election deployment failed on all chains');
      }

      // Show results
      if (typeof Utils !== 'undefined') {
        Utils.hideLoading();
        const message =
          failureCount === 0
            ? `✅ Election deployed successfully on ${successCount} chain(s)!`
            : `✅ Election deployed on ${successCount} chain(s), failed on ${failureCount}`;
        Utils.showNotification(message, 'success');
      }

      // Log deployment details
      console.log('🎉 Deployment Results:', deploymentResults);

      // Show summary
      this.showDeploymentSummary(deploymentResults);

      // Reset after successful deployment
      setTimeout(() => {
        this.reset();
      }, 2000);
    } catch (error) {
      console.error('Deploy error:', error);
      if (typeof Utils !== 'undefined') {
        Utils.hideLoading();
        Utils.showNotification(`Deployment failed: ${error.message}`, 'error');
      } else {
        alert(`Deployment failed: ${error.message}`);
      }
    }
  },

  /**
   * Show deployment summary
   */
  showDeploymentSummary(results) {
    // Deduplicate by chainId
    const uniqueResults = [];
    const seen = new Set();
    for (const r of results) {
      if (!seen.has(r.chainId)) {
        seen.add(r.chainId);
        uniqueResults.push(r);
      }
    }

    let summary = '📋 Deployment Summary\n\n';
    summary += `Election: ${this.electionData.title}\n`;
    summary += `Global ID: ${this.electionUUID}\n`; // ← Important!
    summary += `Start: ${this.electionData.startDate} ${this.electionData.startTime}\n`;
    summary += `End: ${this.electionData.endDate} ${this.electionData.endTime}\n`;
    summary += `Voters: ${this.voterAddresses.length}\n`;
    summary += `Positions: ${this.electionData.positions.length}\n\n`;

    summary += '📊 Chain Deployments:\n';
    uniqueResults.forEach((r) => {
      if (r.success) {
        summary += `✅ Chain ${r.chainId} (Arbitrum Sepolia)\n`;
        summary += `   Global ID: ${this.electionUUID}\n`;
        summary += `   TX: ${r.txHash}\n\n`;
      } else {
        summary += `❌ Chain ${r.chainId}: ${r.error || 'Failed'}\n\n`;
      }
    });

    summary += `🔗 Vote Link: ${window.location.origin}/verify/${this.electionUUID}\n`;
    summary += `\nYour election is now LIVE! Share the vote link with voters.`;

    console.log(summary);

    // Show in UI
    const resultDiv = document.createElement('div');
    resultDiv.className = 'glass rounded-2xl p-8 mt-8 text-center';
    resultDiv.innerHTML = `
    <h2 class="text-3xl font-bold text-green-400 mb-4">🎉 Election Deployed Successfully!</h2>
    <pre class="text-left text-sm bg-black bg-opacity-50 p-4 rounded-xl overflow-x-auto">${summary}</pre>
    <button onclick="navigator.clipboard.writeText('${window.location.origin}/verify/${this.electionUUID}')" 
            class="btn-primary mt-4">
      📋 Copy Vote Link
    </button>
  `;
    document.getElementById('electionConductorContainer').appendChild(resultDiv);
  },
};

window.ElectionConductor = ElectionConductor;
export default ElectionConductor;
