import React, { useState } from 'react';
import { getElections } from '../services/api';

export default function SearchBar({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allElections, setAllElections] = useState([]);

  // Load all elections on mount
  React.useEffect(() => {
    const loadElections = async () => {
      try {
        const elections = await getElections();
        setAllElections(elections);
      } catch (error) {
        console.error('Error loading elections:', error);
      }
    };
    loadElections();
  }, []);

  // Handle search input
  const handleSearch = (value) => {
    setSearchTerm(value);

    if (value.length > 0) {
      const filtered = allElections.filter(
        (e) =>
          e.title.toLowerCase().includes(value.toLowerCase()) ||
          e.election_id.toString().includes(value)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  // Handle selection
  const handleSelect = (electionId) => {
    onSearch(electionId);
    setSearchTerm('');
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="🔍 Search by Election ID or Title..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-4 py-3 bg-white/10 rounded-lg text-white border border-white/20 placeholder-white/50 focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={() => handleSelect(searchTerm)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold hover:shadow-lg transition"
        >
          Load
        </button>
      </div>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute top-16 left-0 right-0 bg-slate-800 border border-white/20 rounded-lg overflow-hidden z-10">
          {suggestions.map((election) => (
            <div
              key={election.election_id}
              onClick={() => handleSelect(election.election_id)}
              className="px-4 py-2 hover:bg-purple-600/30 cursor-pointer border-b border-white/10 last:border-b-0"
            >
              <p className="font-bold">{election.title}</p>
              <p className="text-sm text-gray-400">ID: {election.election_id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
