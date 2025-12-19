require('@nomicfoundation/hardhat-verify');
require('@nomicfoundation/hardhat-toolbox');
require('@openzeppelin/hardhat-upgrades');
require("hardhat-abi-exporter");
require("hardhat-deploy");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.22',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
    arbitrumSepolia: {
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614,
    },
    bnbTestnet: {
      url:  'https://data-seed-prebsc-1-s1.binance.org:8545',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 97,
    },
    seiTestnet: {
      url: 'https://evm-rpc-testnet.sei-apis.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1328, // Atlantic-2
      gasPrice: 100000000000, // 100 Gwei — Sei often needs higher gas price
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || '',
      baseSepolia: process.env.BASESCAN_API_KEY || '',
      arbitrumSepolia: process.env.ARBSCAN_API_KEY || '',
      bnbTestnet: process.env.BSCSCAN_API_KEY || '',
      // Sei uses Seiscan (no API key required for testnet)
      seiTestnet: 'abc', // placeholder
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://sepolia.basescan.org"
        }
      },
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://sepolia.arbiscan.io"
        }
      },
      {
        network: "bnbTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://testnet.bscscan.com"
        }
      },
      {
        network: "seiTestnet",
        chainId: 1328,
        urls: {
          apiURL:  "https://testnet.seiscan.com/api",
          browserURL:  "https://testnet.seiscan.com"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    outputFile: 'gas-report.txt',
    noColors: true,
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  sourcify: {
    enabled: true,
  },
   abiExporter: {
    path: './abis',
    runOnCompile: true,
    clear: true,
    flat: true,
    format: "minimal"  // or "full", "json"
  },
};