// config/networks.js
// Network configurations for multi-chain support

require('dotenv').config();

const NETWORKS = {
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
    explorer: 'https://sepolia.arbiscan.io',
    currency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    faucet: 'https://faucet.triangleplatform.com/arbitrum/sepolia',
    gasPrice: '0.1', // gwei
    confirmations: 1
  },

  'base-sepolia': {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    currency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    faucet: 'https://www.coinbase.com/faucets/base-ethereum-goerli-faucet',
    gasPrice: '0.05', // gwei
    confirmations: 1
  },

  'eth-sepolia': {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcUrl: process.env.ETH_SEPOLIA_RPC || 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    currency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    faucet: 'https://sepoliafaucet.com',
    gasPrice: '20', // gwei
    confirmations: 2
  },

  'sei-testnet': {
    name: 'SEI Testnet',
    chainId: 1328,
    rpcUrl: process.env.SEI_TESTNET_RPC || 'https://evm-rpc-arctic-1.sei-apis.com',
    explorer: 'https://seitrace.com',
    currency: {
      name: 'SEI',
      symbol: 'SEI',
      decimals: 18
    },
    faucet: 'https://atlantic-2.app.sei.io/faucet',
    gasPrice: '0.01', // gwei
    confirmations: 1,
    // Alternative RPC endpoints
    alternativeRPCs: [
      'https://evm-rpc-testnet.sei-apis.com',
      'https://evm-rpc-arctic-1.sei-apis.com',
      'https://sei-testnet-rpc.polkachu.com'
    ]
  }
};

/**
 * Get current network configuration
 */
function getCurrentNetwork() {
  const networkKey = process.env.NETWORK || 'arbitrum-sepolia';
  
  if (!NETWORKS[networkKey]) {
    throw new Error(`Unknown network: ${networkKey}. Available: ${Object.keys(NETWORKS).join(', ')}`);
  }

  return NETWORKS[networkKey];
}

/**
 * Get all available networks
 */
function getAllNetworks() {
  return Object.entries(NETWORKS).map(([key, config]) => ({
    key,
    ...config
  }));
}

/**
 * Get network by chain ID
 */
function getNetworkByChainId(chainId) {
  const entry = Object.entries(NETWORKS).find(([_, config]) => config.chainId === chainId);
  return entry ? entry[1] : null;
}

/**
 * Validate network configuration
 */
function validateNetwork(networkKey) {
  const network = NETWORKS[networkKey];
  
  if (!network) {
    return { valid: false, error: `Network ${networkKey} not found` };
  }

  if (!network.rpcUrl) {
    return { valid: false, error: `RPC URL not configured for ${networkKey}` };
  }

  return { valid: true, network };
}

/**
 * Get explorer URL for address
 */
function getExplorerUrl(address, type = 'address') {
  const network = getCurrentNetwork();
  return `${network.explorer}/${type}/${address}`;
}

/**
 * Get explorer URL for transaction
 */
function getTxExplorerUrl(txHash) {
  return getExplorerUrl(txHash, 'tx');
}

module.exports = {
  NETWORKS,
  getCurrentNetwork,
  getAllNetworks,
  getNetworkByChainId,
  validateNetwork,
  getExplorerUrl,
  getTxExplorerUrl
};