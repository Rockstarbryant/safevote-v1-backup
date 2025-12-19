import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'];

export default function CandidateResults({ positions }) {
  if (!positions || positions.length === 0) return null;

  // Prepare data for charts
  const chartData = positions.map((pos) => ({
    name: pos.title,
    candidates: pos.candidates.map((c) => ({
      name: c.name,
      votes: c.votes || 0
    }))
  }));

  // Get top candidates
  const allCandidates = positions
    .flatMap((pos) => pos.candidates)
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
    .slice(0, 5);

  return (
    <div className="mt-12 space-y-8">
      <h2 className="text-3xl font-bold">📊 Results by Position</h2>

      {/* Bar Charts for each position */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {chartData.map((position, idx) => (
          <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4 text-purple-300">{position.name}</h3>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={position.candidates}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  cursor={{ fill: 'rgba(168, 85, 247, 0.1)' }}
                />
                <Bar dataKey="votes" fill="#a855f7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Top Candidates Pie Chart */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4 text-purple-300">🏆 Top Candidates</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={allCandidates}
                dataKey="votes"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {allCandidates.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Rankings Table */}
          <div className="space-y-3">
            {allCandidates.map((candidate, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                <div>
                  <p className="font-bold text-lg">#{idx + 1}</p>
                  <p className="text-sm text-gray-400">{candidate.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-400">{candidate.votes}</p>
                  <p className="text-xs text-gray-400">votes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}