import React from 'react';

export default function ElectionDetails({ election }) {
  if (!election) return null;

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="mt-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
      <h2 className="text-4xl font-bold mb-2">{election.title}</h2>
      
      <p className="text-gray-300 mb-6 text-lg">{election.description || 'No description'}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <p className="text-purple-400 text-sm font-semibold">LOCATION</p>
            <p className="text-lg text-white mt-1">{election.location || 'Online'}</p>
          </div>

          <div>
            <p className="text-purple-400 text-sm font-semibold">CREATED BY</p>
            <p className="text-lg text-white font-mono mt-1 break-all">
              {election.creator.substring(0, 10)}...{election.creator.substring(-8)}
            </p>
          </div>

          <div>
            <p className="text-purple-400 text-sm font-semibold">CONTRACT ADDRESS</p>
            <p className="text-lg text-white font-mono mt-1 break-all text-sm">
              {election.contract_address.substring(0, 10)}...{election.contract_address.substring(-8)}
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div>
            <p className="text-purple-400 text-sm font-semibold">START TIME</p>
            <p className="text-lg text-white mt-1">{formatDate(election.start_time)}</p>
          </div>

          <div>
            <p className="text-purple-400 text-sm font-semibold">END TIME</p>
            <p className="text-lg text-white mt-1">{formatDate(election.end_time)}</p>
          </div>

          <div className="flex gap-4 pt-2">
            <div>
              <p className="text-blue-400 text-sm">Anonymous: {election.allow_anonymous ? '✅' : '❌'}</p>
            </div>
            <div>
              <p className="text-blue-400 text-sm">Delegation: {election.allow_delegation ? '✅' : '❌'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}