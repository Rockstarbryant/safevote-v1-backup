// frontend/js/multichain.js

// Multichain Configuration
window.CHAIN_CONFIG = {
  11155111: { name: "Ethereum Sepolia", proxy: "0xd8bFdD7f2bb39D5D78a4Bb1D9D2f70968C63e8F3" },
  84532: { name: "Base Sepolia", proxy: "0xC724408090C739daD30f5a9d6756DB0d56e060be" },
  421614: { name: "Arbitrum Sepolia", proxy: "0x38290e4834FFc92065B921E092BCD0b5D65aD4A0" },
  97: { name: "BNB Testnet", proxy: "0x38290e4834FFc92065B921E092BCD0b5D65aD4A0" },
  1328: { name: "Sei Testnet", proxy: "0x38290e4834FFc92065B921E092BCD0b5D65aD4A0" },
};

// Global contract address
window.CONTRACT_ADDRESS = null;

// Global helper functions
window.updateContractForChain = function(chainId) {
  chainId = parseInt(chainId, 10);
  const config = window.CHAIN_CONFIG[chainId];
  if (config) {
    window.CONTRACT_ADDRESS = config.proxy;
    console.log(`🌐 Switched to ${config.name} - Contract: ${config.proxy}`);
  } else {
    console.warn('Unsupported chain ID:', chainId);
    window.CONTRACT_ADDRESS = null;
  }
};

window.syncNetworkSwitcher = function() {
  const switcher = document.getElementById('networkSwitcher');
  if (switcher && window.ethereum) {
    switcher.value = parseInt(window.ethereum.chainId, 16);
  }
};

// Initial setup and listeners
if (window.ethereum) {
  window.ethereum.on('chainChanged', (chainId) => {
    console.log(`Chain changed to ${chainId} — clearing cache and reloading`);

    // Auto-clear persistent cache (critical for multichain)
    if (window.SafeVoteCache?.PersistentCache) {
      window.SafeVoteCache.PersistentCache.clearAll();
      console.log('✅ Persistent cache cleared automatically');
    }

    // Optional: clear off-chain data (comments, likes, hidden polls)
    // if (window.Storage) Storage.clearAll();

    window.updateContractForChain(chainId);

    // Reload for fresh state on new chain
    // Small delay to ensure localStorage clear completes
  setTimeout(() => {
    location.reload();
  }, 300); // 300ms is plenty — guarantees write completion
  });

  // Initial load
  const initialChainId = window.ethereum.chainId || '11155111'; // fallback to Sepolia
  window.updateContractForChain(initialChainId);
  window.syncNetworkSwitcher();
}