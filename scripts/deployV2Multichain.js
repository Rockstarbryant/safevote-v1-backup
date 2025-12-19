const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Chains to deploy to
const DEPLOYMENT_CHAINS = [
  { name: "sepolia", chainId: 11155111, rpc: process.env.SEPOLIA_RPC_URL },
  { name: "baseSepolia", chainId: 84532, rpc: process.env.BASE_SEPOLIA_RPC_URL },
  { name: "arbitrumSepolia", chainId: 421614, rpc: process.env.ARBITRUM_SEPOLIA_RPC_URL },
  { name: "bnbTestnet", chainId: 97, rpc: process.env.BNB_TESTNET_RPC_URL },
  { name: "seiTestnet", chainId: 1328, rpc: process.env.SEI_TESTNET_RPC_URL },
];

async function deployToChain(chainConfig) {
  console.log(`\n🌐 Deploying to ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
  console.log("━".repeat(60));

  if (!chainConfig.rpc) {
    console.log(`❌ Missing RPC URL for ${chainConfig.name} (check .env)`);
    return { success: false, chainName: chainConfig.name, error: "Missing RPC URL" };
  }

  if (!process.env.PRIVATE_KEY) {
    console.log("❌ PRIVATE_KEY not set in .env");
    return { success: false, chainName: chainConfig.name, error: "Missing PRIVATE_KEY" };
  }

  try {
    // Create provider and wallet for this specific chain
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("📝 Deploying with account:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "Native Token");

    if (balance < ethers.parseEther("0.01")) {
      console.warn("⚠️  Warning: Low balance, deployment may fail");
    }

    // Deploy upgradeable proxy
    console.log("\n🚀 Deploying SafeVoteV2 (UUPS Proxy)...");

    const SafeVoteV2 = await ethers.getContractFactory("SafeVoteV2", wallet);

    const proxy = await upgrades.deployProxy(SafeVoteV2, [], {
      initializer: "initialize",
      kind: "uups",
      unsafeAllow: ["delegatecall"],
       timeout: 600000,         // 10 minutes (in ms)
        pollingInterval: 10000,  // Check every 10 seconds instead of default ~5s
    });

    console.log("⏳ Waiting for proxy deployment...");
    await proxy.waitForDeployment();

    const proxyAddress = await proxy.getAddress();
    console.log("✅ Proxy deployed:", proxyAddress);

    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("📦 Implementation:", implAddress);

    const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
    console.log("🔐 ProxyAdmin:", adminAddress);

    // Verify version
    const version = await proxy.version();
    console.log("📌 Contract version:", version);

    return {
      success: true,
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      proxyAddress,
      implAddress,
      adminAddress,
      deployer: wallet.address,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Deployment failed on ${chainConfig.name}:`, error.message);
    return {
      success: false,
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      error: error.shortMessage || error.message,
    };
  }
}

async function main() {
  console.log("🚀 SafeVote V2 Multichain Deployment\n");

  const deployments = [];
  const successful = [];
  const failed = [];

  for (const chain of DEPLOYMENT_CHAINS) {
    const result = await deployToChain(chain);
    deployments.push(result);

    if (result.success) {
      successful.push(result);
    } else {
      failed.push(result);
    }

    // Small delay between chains to be nice to RPCs
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // Save deployment report
  const deploymentsDir = path.join(__dirname, "../deployments/v2");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const timestamp = Date.now();
  const deploymentFile = path.join(deploymentsDir, `multichain-${timestamp}.json`);
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify(
      {
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        deployments,
        summary: {
          total: deployments.length,
          successful: successful.length,
          failed: failed.length,
        },
      },
      null,
      2
    )
  );

  console.log("\n📊 DEPLOYMENT SUMMARY");
  console.log("━".repeat(60));
  console.log(`✅ Successful: ${successful.length}/${deployments.length}`);
  console.log(`❌ Failed: ${failed.length}/${deployments.length}`);
  console.log(`📄 Report saved: ${deploymentFile}`);

  if (successful.length > 0) {
    console.log("\n✅ Successful Deployments:");
    successful.forEach((d) => {
      console.log(`  • ${d.chainName.padEnd(15)} ${d.proxyAddress}`);
    });
  }

  if (failed.length > 0) {
    console.log("\n❌ Failed Deployments:");
    failed.forEach((d) => {
      console.log(`  • ${d.chainName.padEnd(15)} ${d.error}`);
    });
  }

  // Update frontend config
  if (successful.length > 0) {
    updateFrontendConfig(successful);
  }

  console.log("\n✨ Deployment complete!\n");
}

function updateFrontendConfig(deployments) {
  const frontendDir = path.join(__dirname, "../frontend/js");
  const configPath = path.join(frontendDir, "multichain.js");

  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const chainConfig = deployments.reduce((acc, d) => {
    acc[d.chainId] = {
      name: d.chainName,
      proxy: d.proxyAddress,
    };
    return acc;
  }, {});

  const configContent = `// Auto-generated multichain configuration - ${new Date().toISOString()}
window.CHAIN_CONFIG = ${JSON.stringify(chainConfig, null, 2)};

window.CONTRACT_ADDRESS = null;

window.updateContractForChain = function(chainId) {
  chainId = parseInt(chainId, 10);
  const config = window.CHAIN_CONFIG[chainId];
  if (config) {
    window.CONTRACT_ADDRESS = config.proxy;
    console.log(\`🌐 Switched to \${config.name} - Contract: \${config.proxy}\`);
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

if (window.ethereum) {
  window.ethereum.on('chainChanged', (chainId) => {
    console.log(\`Chain changed to \${chainId}\`);
    if (window.SafeVoteCache?.PersistentCache) {
      window.SafeVoteCache.PersistentCache.clearAll();
    }
    window.updateContractForChain(chainId);
    setTimeout(() => location.reload(), 300);
  });

  const initialChainId = window.ethereum?.chainId ? parseInt(window.ethereum.chainId, 16) : 11155111;
  window.updateContractForChain(initialChainId);
  window.syncNetworkSwitcher();
}
`;

  fs.writeFileSync(configPath, configContent);
  console.log("📝 Frontend config updated:", configPath);
}

main().catch((error) => {
  console.error("💥 Deployment script failed:", error);
  process.exit(1);
});