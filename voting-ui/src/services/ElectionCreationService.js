/**
 * Election Creation Service
 * Handles API calls and logic for creating elections
 */

const ElectionCreationService = {
  /**
   * Generate a unique election UUID (v4 style)
   */
  generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'elec-' + crypto.randomUUID();
    }
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
   * Generate keys - Create election in DB FIRST, then generate keys
   */
  async generateKeys(electionData, voterAddresses) {
    const addressesText = voterAddresses.join('\n').trim();
    if (!addressesText) {
      throw new Error('Please enter at least one voter address');
    }

    const validAddresses = voterAddresses
      .map(a => a.trim())
      .filter(a => a && /^0x[a-fA-F0-9]{40}$/.test(a));

    if (validAddresses.length === 0) {
      throw new Error('No valid addresses found. Please use valid Ethereum addresses (0x...)');
    }

    //const KEYGEN_API = window.KEYGEN_API || 'http://localhost:3001';
    //const BACKEND_API = window.BACKEND_API || 'http://localhost:5000';
    const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';
    const KEYGEN_API = process.env.REACT_APP_KEYGEN_API || 'http://localhost:3001';


    // Parse timestamps
    const startDateTime = new Date(
      `${electionData.startDate}T${electionData.startTime}`
    );
    const endDateTime = new Date(`${electionData.endDate}T${electionData.endTime}`);
    const startTime = Math.floor(startDateTime.getTime() / 1000);
    const endTime = Math.floor(endDateTime.getTime() / 1000);

    console.log(`🔐 Step 1: Creating election in database...`);
    console.log(`   Election UUID: ${electionData.electionUUID}`);

    // STEP 1: Create election in database FIRST
    const createResponse = await fetch(`${BACKEND_API}/api/elections/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        electionId: electionData.electionUUID,
        title: electionData.title || 'Untitled Election',
        description: electionData.description || '',
        location: electionData.location || '',
        creator: '0x0000000000000000000000000000000000000000',
        startTime: startTime,
        endTime: endTime,
        totalVoters: validAddresses.length,
        isPublic: electionData.isPublic,
        allowAnonymous: electionData.allowAnonymous,
        allowDelegation: electionData.allowDelegation,
        positions: electionData.positions.map(p => ({
          title: p.title || 'Untitled Position',
          candidates: p.candidates.filter(c => c.trim()),
          maxSelections: 1,
        })),
        voterAddresses: validAddresses,
      }),
    });

    if (!createResponse.ok) {
      const err = await createResponse.json();
      throw new Error(`Failed to create election: ${err.message || err.error}`);
    }

    const createData = await createResponse.json();
    console.log(`✅ Election created in database`);

    // STEP 2: Now generate keys
    console.log(`\n🔑 Step 2: Generating voter keys...`);

    const keyResponse = await fetch(`${KEYGEN_API}/api/elections/keys/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        electionId: electionData.electionUUID,
        numVoters: validAddresses.length,
        voterAddresses: validAddresses,
      }),
    });

    if (!keyResponse.ok) {
      const err = await keyResponse.json();
      throw new Error(`Key generation failed: ${err.message || err.error}`);
    }

    const keyData = await keyResponse.json();
    const merkleRoot = keyData.merkleRoot;

    console.log(`✅ Keys generated successfully`);
    console.log(`   Merkle Root: ${merkleRoot}`);

    return {
      electionId: electionData.electionUUID,
      merkleRoot: merkleRoot,
      totalVoters: validAddresses.length,
    };
  },

  /**
   * Deploy election to blockchains
   */
  async deploy(electionData, voterAddresses, merkleRoot, selectedChains) {
    // Validate required fields
    if (!electionData.title || !electionData.startDate || !electionData.endDate) {
      throw new Error('Please fill in all required election details');
    }

    if (electionData.positions.length === 0) {
      throw new Error('Please add at least one position');
    }

    if (!voterAddresses || voterAddresses.length === 0) {
      throw new Error('Please add voter addresses');
    }

    if (selectedChains.length === 0) {
      throw new Error('Please select at least one blockchain');
    }

    // Check if contract is available
    if (!window.Contract || !window.Contract.contract) {
      throw new Error('Please connect your wallet first');
    }

    // Parse start and end times
    const startDateTime = new Date(
      `${electionData.startDate}T${electionData.startTime}`
    );
    const endDateTime = new Date(`${electionData.endDate}T${electionData.endTime}`);
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
    const totalVoters = voterAddresses.length;

    // Prepare positions data
    const positions = electionData.positions.map(pos => ({
      title: pos.title || 'Untitled Position',
      candidates: pos.candidates.filter(c => c.trim()),
      maxSelections: 1,
    }));

    // Validate positions have candidates
    const invalidPositions = positions.filter(p => p.candidates.length === 0);
    if (invalidPositions.length > 0) {
      throw new Error('All positions must have at least one candidate');
    }

    // Get voter merkle root
    const voterMerkleRoot = merkleRoot;

    if (!voterMerkleRoot || voterMerkleRoot === '0x000...') {
      throw new Error('Keys not generated yet. Click "Generate Voter Keys" first.');
    }

    // Deploy to selected chains
    const deploymentResults = [];

    for (const chainId of selectedChains) {
      try {
        console.log(`🚀 Deploying to chain ${chainId}...`);

        // Get current chain
        const currentNetwork = await window.Contract.provider.getNetwork();

        // Switch chain if needed
        if (currentNetwork.chainId !== chainId) {
          await window.Contract.switchNetwork(chainId);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Call createElection contract method
        const tx = await window.Contract.contract.createElection(
          electionData.title,
          electionData.description || '',
          electionData.location || '',
          startTime,
          endTime,
          totalVoters,
          voterMerkleRoot,
          electionData.isPublic,
          electionData.allowAnonymous,
          electionData.allowDelegation,
          positions
        );

        const receipt = await tx.wait();
        const event = receipt.events?.find(e => e.event === 'ElectionCreatedV2');
        const onChainElectionId = event?.args?.electionId?.toString() || 'unknown';

        deploymentResults.push({
          chainId,
          success: true,
          electionId: electionData.electionUUID,
          onChainElectionId,
          txHash: receipt.transactionHash,
        });

        // Sync to backend
        try {
          await fetch('https://blockballot-node-services.onrender.com/api/elections/sync-deployment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              electionId: electionData.electionUUID,
              chainId: chainId,
              onChainElectionId: onChainElectionId,
              txHash: receipt.transactionHash,
            }),
          });
        } catch (syncErr) {
          console.warn(`Sync failed for chain ${chainId}:`, syncErr);
        }

        console.log(`✅ Election deployed on chain ${chainId}`);
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
    const successCount = deploymentResults.filter(r => r.success).length;
    const failureCount = deploymentResults.filter(r => !r.success).length;

    if (successCount === 0) {
      throw new Error('Election deployment failed on all chains');
    }

    console.log('🎉 Deployment Results:', deploymentResults);

    const message =
      failureCount === 0
        ? `✅ Election deployed successfully on ${successCount} chain(s)!`
        : `✅ Election deployed on ${successCount} chain(s), failed on ${failureCount}`;

    return {
      success: true,
      message,
      results: deploymentResults,
    };
  },
};

export default ElectionCreationService;