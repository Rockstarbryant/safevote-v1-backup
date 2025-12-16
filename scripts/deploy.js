const { ethers, upgrades } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Starting multichain deployment...\n');

  const [deployer] = await ethers.getSigners();
  console.log('📍 Deploying with account:', deployer.address);

  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = network.chainId;

  console.log(`🌐 Network: ${networkName} (Chain ID: ${chainId})\n`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('💰 Account balance:', ethers.formatEther(balance), 'Native Token\n');

  // Deploy VotingSystem with UUPS proxy
  console.log('📝 Deploying VotingSystem (Upgradeable)...');

  const VotingSystem = await ethers.getContractFactory('VotingSystem');

  const votingSystem = await upgrades.deployProxy(VotingSystem, [], {
    initializer: 'initialize',
    kind: 'uups',
     unsafeAllow: ['delegatecall', 'external-library-linking'],
  });

  if ([84532, 421614, 97].includes(chainId)) {  // Base, Arb, BNB testnets
  redeployOptions.unsafeAllow = ['delegatecall'];
}

  await votingSystem.waitForDeployment();
  const proxyAddress = await votingSystem.getAddress();

  console.log('✅ Proxy deployed to:', proxyAddress);

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log('📦 Implementation at:', implementationAddress);

  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
  console.log('🔐 ProxyAdmin at:', adminAddress);

  // Deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: chainId.toString(),
    proxyAddress,
    implementationAddress,
    adminAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  // === Save to deployments folder (per network) ===
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFileName = `deployment-${networkName}-${chainId}-${Date.now()}.json`;
  const deploymentPath = path.join(deploymentsDir, deploymentFileName);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('📄 Deployment info saved to:', deploymentPath);

  // === Update frontend config with correct address for this chain ===
  const frontendDir = path.join(__dirname, '../frontend/js');
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const configPath = path.join(frontendDir, 'config.js');
  const configContent = `// Auto-generated — SafeVote Multichain Deployment
// Network: ${networkName} (Chain ID: ${chainId})
export const CONTRACT_ADDRESS = "${proxyAddress}";
export const CHAIN_ID = ${chainId};
export const NETWORK_NAME = "${networkName}";
export const DEPLOYMENT_BLOCK = ${deploymentInfo.blockNumber};

// Add more chains here manually or via future automation
`;

  fs.writeFileSync(configPath, configContent);
  console.log('📄 Frontend config updated at:', configPath);

  // === Copy ABI (same for all chains) ===
  const artifactPath = path.join(
    __dirname,
    '../artifacts/contracts/VotingSystem.sol/VotingSystem.json'
  );

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abiPath = path.join(frontendDir, 'VotingSystemABI.js');
    const abiContent = `// Auto-generated ABI — Safe for all chains
export const VOTING_SYSTEM_ABI = ${JSON.stringify(artifact.abi, null, 2)};
`;
    fs.writeFileSync(abiPath, abiContent);
    console.log('📄 ABI saved to:', abiPath);
  }

  console.log('\n✨ Deployment completed successfully!\n');
  console.log('📋 Next steps:');
  console.log('1. Verify contract (optional):');
  console.log(`   npx hardhat verify --network ${networkName} ${implementationAddress}\n`);
  console.log('2. Your frontend is already updated with the correct address for this chain');
  console.log('3. Switch wallet network and refresh — SafeVote works instantly!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });