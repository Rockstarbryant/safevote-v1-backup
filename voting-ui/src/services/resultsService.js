/**
 * Results Service - Fetch and process election results
 * Works with the backend API to get election data and metadata
 */

const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';

/* ============================================
   GET ELECTION BY UUID
============================================ */

export const getElectionByUuid = async (electionId) => {
  try {
    console.log(`📊 Fetching election details for: ${electionId}`);
    
    const response = await fetch(`${BACKEND_API}/api/elections/${electionId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch election: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`✅ Election loaded:`);
    console.log(`   Title: ${data.title}`);
    console.log(`   Positions: ${data.positions?.length || 0}`);
    console.log(`   Total Voters: ${data.totalVoters}`);
    console.log(`   Public: ${data.isPublic}`);

    return data;
  } catch (error) {
    console.error('❌ Error fetching election:', error);
    throw error;
  }
};

/* ============================================
   GET ELECTION ON-CHAIN ID
============================================ */

export const getOnChainElectionId = async (electionId) => {
  try {
    console.log(`🔗 Fetching on-chain election ID for: ${electionId}`);
    
    const response = await fetch(`${BACKEND_API}/api/elections/${electionId}/onchain-id`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch on-chain ID');
    }

    const { onChainElectionId } = await response.json();
    
    console.log(`✅ On-chain ID: ${onChainElectionId}`);
    
    return onChainElectionId;
  } catch (error) {
    console.error('❌ Error fetching on-chain ID:', error);
    throw error;
  }
};

/* ============================================
   GET VOTER PARTICIPATION COUNT
============================================ */

export const getVoterParticipation = async (electionId) => {
  try {
    console.log(`👥 Fetching voter participation for: ${electionId}`);
    
    const response = await fetch(`${BACKEND_API}/api/elections/${electionId}/participation`);
    
    if (!response.ok) {
      return { voted: 0, total: 0 };
    }

    const data = await response.json();
    
    console.log(`✅ Participation: ${data.voted}/${data.total} (${((data.voted/data.total)*100).toFixed(1)}%)`);
    
    return data;
  } catch (error) {
    console.warn('⚠️  Could not fetch participation data:', error);
    return { voted: 0, total: 0 };
  }
};

/* ============================================
   GET ELECTION RESULTS FROM SMART CONTRACT
============================================ */

export const getElectionResults = async (contract, electionId, positionIndex) => {
  try {
    console.log(`📊 Fetching results for position ${positionIndex} on chain...`);
    
    const { candidates, votesCast } = await contract.getElectionResults(electionId, positionIndex);
    
    const results = {
      candidates: candidates,
      votesCast: votesCast.map(v => v.toNumber ? v.toNumber() : Number(v))
    };

    console.log(`✅ Position results:`);
    console.log(`   Candidates: ${candidates.length}`);
    console.log(`   Votes: ${results.votesCast.reduce((a, b) => a + b, 0)}`);

    return results;
  } catch (error) {
    console.error('❌ Error fetching contract results:', error);
    throw error;
  }
};

/* ============================================
   CHECK IF USER CAN VIEW RESULTS
============================================ */

export const canViewResults = (election, userAddress) => {
  // Public elections: anyone can view
  if (election.isPublic) {
    console.log('✅ Public election - results visible');
    return true;
  }

  // Private elections: only creator/voters can view
  const isCreator = userAddress?.toLowerCase() === election.creator?.toLowerCase();
  
  if (isCreator) {
    console.log('✅ User is creator - results visible');
    return true;
  }

  // For private elections without creator check, deny access
  console.log('🔒 Private election - results restricted');
  return false;
};

/* ============================================
   CALCULATE ELECTION STATISTICS
============================================ */

export const calculateStatistics = (election, results, votedCount, totalVoters) => {
  const stats = {
    totalVoters: totalVoters || election.totalVoters || 0,
    votedCount: Math.round(votedCount) || 0,
    participationRate: 0,
    remainingVoters: 0,
    averageVotesPerPosition: 0,
    leadingCandidate: null,
    tieCount: 0
  };

  // Calculate participation
  stats.remainingVoters = Math.max(0, stats.totalVoters - stats.votedCount);
  stats.participationRate = stats.totalVoters > 0 
    ? ((stats.votedCount / stats.totalVoters) * 100).toFixed(1) 
    : 0;

  // Calculate average votes per position
  let totalVotesAcrossPositions = 0;
  let positionCount = 0;

  Object.values(results).forEach(position => {
    if (position.votes && Array.isArray(position.votes)) {
      const positionTotal = position.votes.reduce((a, b) => a + b, 0);
      totalVotesAcrossPositions += positionTotal;
      positionCount++;
    }
  });

  stats.averageVotesPerPosition = positionCount > 0 
    ? (totalVotesAcrossPositions / positionCount).toFixed(1) 
    : 0;

  // Find leading candidate across all positions
  let maxVotes = 0;
  let leadingInfo = null;

  Object.entries(results).forEach(([posIdx, position]) => {
    if (position.votes && Array.isArray(position.votes)) {
      position.votes.forEach((votes, candIdx) => {
        if (votes > maxVotes) {
          maxVotes = votes;
          leadingInfo = {
            positionIdx: parseInt(posIdx),
            candidateIdx: candIdx,
            candidate: position.candidates[candIdx],
            position: position.title,
            votes: votes
          };
        }
      });
    }
  });

  stats.leadingCandidate = leadingInfo;

  // Count ties (candidates with same max votes)
  Object.values(results).forEach(position => {
    if (position.votes && Array.isArray(position.votes)) {
      const maxInPosition = Math.max(...position.votes);
      const tiesInPosition = position.votes.filter(v => v === maxInPosition && v > 0).length;
      if (tiesInPosition > 1) {
        stats.tieCount += tiesInPosition - 1;
      }
    }
  });

  return stats;
};

/* ============================================
   FORMAT TIME REMAINING
============================================ */

export const formatTimeRemaining = (endTime) => {
  const now = Date.now();
  const endMs = endTime * 1000;
  const remaining = endMs - now;

  if (remaining <= 0) {
    return { text: 'Closed', status: 'completed' };
  }

  if (remaining < 60000) {
    const seconds = Math.floor(remaining / 1000);
    return { text: `${seconds}s`, status: 'closing' };
  }

  if (remaining < 3600000) {
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return { text: `${minutes}m ${seconds}s`, status: 'active' };
  }

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return { text: `${hours}h ${minutes}m`, status: 'active' };
};

/* ============================================
   EXPORT ALL FUNCTIONS
============================================ */

export default {
  getElectionByUuid,
  getOnChainElectionId,
  getVoterParticipation,
  getElectionResults,
  canViewResults,
  calculateStatistics,
  formatTimeRemaining
};