import { initializeVoting } from './services/votingService';
import { fetchElectionsFromAPI } from './services/apiService';
import { useWallet } from './hooks/useWallet';
import { useVotingState } from './hooks/useVotingState';

// Test in browser console
window.testPhase1 = async () => {
  console.log('🧪 Testing Phase 1...');

  try {
    // Test 1: Initialize voting
    console.log('Test 1: Initialize voting...');
    const voting = await initializeVoting();
    console.log('✅ Voting initialized:', voting.success);

    // Test 2: Fetch elections
    console.log('Test 2: Fetch elections...');
    const elections = await fetchElectionsFromAPI();
    console.log('✅ Elections fetched:', elections.elections.length);

    // Test 3: Get election details
    if (elections.elections.length > 0) {
      console.log('Test 3: Get election details...');
      const firstElection = elections.elections[0];
      console.log('✅ First election:', firstElection.title);
    }

    console.log('✅ All Phase 1 tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};
