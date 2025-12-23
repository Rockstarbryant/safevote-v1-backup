import { VotingSystemABI } from './VotingSystemABI.js';
import { SafeVoteV2ABI } from './SafeVoteV2ABI.js';

// Combine arrays (ABIs are just arrays of fragments)
const CombinedABI = [...VotingSystemABI, ...SafeVoteV2ABI];

// Optional: dedupe (in case of overlap)
const seen = new Set();
const uniqueABI = CombinedABI.filter((item) => {
  if (item.type !== 'function' && item.type !== 'event') return true;
  const sig = `${item.name}(${item.inputs.map((i) => i.type).join(',')})`;
  if (seen.has(sig)) return false;
  seen.add(sig);
  return true;
});

export { uniqueABI as CombinedABI };
