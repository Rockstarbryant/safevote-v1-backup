import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import MetricsCards from './components/MetricsCards';
import ElectionDetails from './components/ElectionDetails';
import CandidateResults from './components/CandidateResults';
import { useElectionData } from './hooks/useElectionData';

function App() {
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const { election, analytics, loading, error, loadElection } = useElectionData(selectedElectionId);

  const handleSearch = (electionId) => {
    setSelectedElectionId(electionId);
    loadElection(electionId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent mb-2">
            🗳️ Election Dashboard Pro
          </h1>
          <p className="text-xl text-gray-300">Real-time Analytics & Live Results</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              <p className="text-gray-300 mt-4">Loading election data...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 mb-8">
            <p className="text-red-300 font-bold">❌ Error: {error}</p>
            <p className="text-sm text-red-200 mt-2">
              Make sure your backend is running on port 3001
            </p>
          </div>
        )}

        {/* Content */}
        {election && !loading && (
          <>
            <MetricsCards election={election} analytics={analytics} />
            <ElectionDetails election={election} />
            <CandidateResults positions={election.positions} />

            {/* Auto-refresh indicator */}
            <div className="mt-12 text-center text-gray-400 text-sm">
              <p>🔄 Auto-refreshing every 10 seconds</p>
            </div>
          </>
        )}

        {/* Empty State */}
        {!election && !loading && !error && (
          <div className="text-center py-24">
            <p className="text-2xl text-gray-400">Search for an election to get started</p>
            <p className="text-gray-500 mt-2">Enter an election ID or title above</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
