import React from 'react';

export default function MetricsCards({ election, analytics }) {
  if (!election) return null;

  const statusColors = {
    0: 'bg-green-500/30',
    1: 'bg-blue-500/30',
    2: 'bg-red-500/30'
  };

  const statusText = ['Active', 'Completed', 'Cancelled'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
      {/* Total Voters */}
      <div className="bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30 rounded-xl p-6">
        <p className="text-gray-300 text-sm font-semibold">TOTAL VOTERS</p>
        <p className="text-4xl font-bold text-purple-400 mt-2">
          {election.total_registered_voters}
        </p>
        <p className="text-xs text-gray-400 mt-2">Registered</p>
      </div>

      {/* Votes Cast */}
      <div className="bg-gradient-to-br from-pink-500/20 to-transparent border border-pink-500/30 rounded-xl p-6">
        <p className="text-gray-300 text-sm font-semibold">VOTES CAST</p>
        <p className="text-4xl font-bold text-pink-400 mt-2">
          {election.total_votes_cast}
        </p>
        <p className="text-xs text-gray-400 mt-2">Live count</p>
      </div>

      {/* Participation */}
      <div className="bg-gradient-to-br from-green-500/20 to-transparent border border-green-500/30 rounded-xl p-6">
        <p className="text-gray-300 text-sm font-semibold">PARTICIPATION</p>
        <p className="text-4xl font-bold text-green-400 mt-2">
          {analytics ? analytics.participationRate : '0'}%
        </p>
        <p className="text-xs text-gray-400 mt-2">Turnout</p>
      </div>

      {/* Status */}
      <div className={`${statusColors[election.status]} border border-white/20 rounded-xl p-6`}>
        <p className="text-gray-300 text-sm font-semibold">STATUS</p>
        <p className="text-4xl font-bold text-blue-400 mt-2">
          {statusText[election.status]}
        </p>
        <p className="text-xs text-gray-400 mt-2">Current</p>
      </div>
    </div>
  );
}