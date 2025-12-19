// src/components/voting/VoteReview.jsx
import React from 'react';

const VoteReview = ({ election, votes }) => {
  if (!election || !election.positions || !votes) {
    return (
      <div className="text-center py-12">
        <p className="text-white text-xl">No vote data to review.</p>
      </div>
    );
  }

  return (
    <div className="vote-review max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">
          🔍 Review Your Ballot
        </h2>
        <p className="text-xl text-purple-200">
          Confirm your selections before submitting on-chain
        </p>
      </div>

      <div className="space-y-8">
        {election.positions.map((position, posIdx) => {
          const selectedVotes = votes[posIdx] || [];
          const hasSelection = selectedVotes.length > 0;

          return (
            <div
              key={posIdx}
              className={`review-card rounded-2xl p-8 transition-all duration-300
                ${hasSelection 
                  ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-400/50 shadow-xl shadow-purple-500/20' 
                  : 'bg-white/5 border border-white/10'
                }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {position.title}
                  </h3>
                  <p className="text-purple-200 text-lg">
                    {selectedVotes.length} of {position.maxSelections || 1} selected
                  </p>
                </div>
                {hasSelection ? (
                  <span className="text-4xl">✓</span>
                ) : (
                  <span className="text-3xl text-gray-500">—</span>
                )}
              </div>

              <div className="selections-list">
                {hasSelection ? (
                  <div className="space-y-4">
                    {selectedVotes.map((candIdx) => (
                      <div
                        key={candIdx}
                        className="flex items-center bg-white/10 rounded-xl p-5 backdrop-blur-sm border border-white/20"
                      >
                        <span className="text-2xl mr-5 text-purple-300">→</span>
                        <span className="text-xl font-medium text-white">
                          {position.candidates[candIdx] || `Candidate ${candIdx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-xl italic">
                      No candidate selected
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VoteReview;