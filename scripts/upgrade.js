const { ethers, upgrades } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔄 Starting contract upgrade...\n');

  const [deployer] = await ethers.getSigners();
  console.log('📍 Upgrading contracts with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('💰 Account balance:', ethers.formatEther(balance), 'ETH\n');

  // Read the previous deployment to get the proxy address
  const deploymentsDir = path.join(__dirname, '../deployments');

  if (!fs.existsSync(deploymentsDir)) {
    console.error('❌ No deployments directory found!');
    console.log('💡 Please deploy the contract first using deploy.js');
    process.exit(1);
  }

  // Get the latest deployment file
  const files = fs
    .readdirSync(deploymentsDir)
    .filter((f) => f.startsWith('deployment-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error('❌ No deployment files found!');
    console.log('💡 Please deploy the contract first using deploy.js');
    process.exit(1);
  }

  const latestDeployment = JSON.parse(fs.readFileSync(path.join(deploymentsDir, files[0]), 'utf8'));

  const PROXY_ADDRESS = latestDeployment.proxyAddress;
  console.log('📦 Current proxy address:', PROXY_ADDRESS);
  console.log('📦 Current implementation:', latestDeployment.implementationAddress);

  // Get the new contract factory
  console.log('\n📝 Preparing new implementation...');
  const VotingSystemV2 = await ethers.getContractFactory('VotingSystem');

  // Upgrade the proxy to point to the new implementation
  console.log('⏳ Upgrading proxy...');
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, VotingSystemV2);
  await upgraded.waitForDeployment();

  const newProxyAddress = await upgraded.getAddress();
  console.log('✅ Proxy address (unchanged):', newProxyAddress);

  // Get the new implementation address
  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(newProxyAddress);
  console.log('📦 New implementation deployed to:', newImplementationAddress);

  // Verify the upgrade
  console.log('\n🔍 Verifying upgrade...');
  const currentVersion = await upgraded.version();
  console.log('📌 Contract version:', currentVersion);

  // Test basic functionality
  console.log('\n🧪 Testing basic functionality...');
  try {
    const totalOrgs = await upgraded.getTotalOrganizations();
    const totalPolls = await upgraded.getTotalPolls();
    console.log('✅ Total organizations:', totalOrgs.toString());
    console.log('✅ Total polls:', totalPolls.toString());
    console.log('✅ Upgrade successful! All data preserved.');
  } catch (error) {
    console.error('❌ Error testing upgraded contract:', error.message);
  }

  // Save upgrade info
  const upgradeInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    proxyAddress: newProxyAddress,
    oldImplementationAddress: latestDeployment.implementationAddress,
    newImplementationAddress: newImplementationAddress,
    upgrader: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    version: currentVersion,
  };

  const upgradeFilePath = path.join(
    deploymentsDir,
    `upgrade-${upgradeInfo.network}-${Date.now()}.json`
  );

  fs.writeFileSync(upgradeFilePath, JSON.stringify(upgradeInfo, null, 2));
  console.log('\n📄 Upgrade info saved to:', upgradeFilePath);

  // Update frontend config if implementation address is used
  const configPath = path.join(__dirname, '../frontend/js/config.js');
  if (fs.existsSync(configPath)) {
    const configContent = `// Auto-generated deployment configuration
export const CONTRACT_ADDRESS = "${newProxyAddress}";
export const NETWORK_NAME = "${upgradeInfo.network}";
export const CHAIN_ID = ${upgradeInfo.chainId};
export const DEPLOYMENT_BLOCK = ${upgradeInfo.blockNumber};
export const IMPLEMENTATION_ADDRESS = "${newImplementationAddress}";

// Contract ABI will be imported separately
`;
    fs.writeFileSync(configPath, configContent);
    console.log('📄 Frontend config updated');
  }

  console.log('\n✨ Upgrade completed successfully!\n');
  console.log('📋 Summary:');
  console.log('  Proxy Address:', newProxyAddress);
  console.log('  Old Implementation:', latestDeployment.implementationAddress);
  console.log('  New Implementation:', newImplementationAddress);
  console.log('  Version:', currentVersion);

  console.log('\n💡 Next steps:');
  console.log('1. Test the upgraded contract thoroughly');
  console.log('2. Verify the new implementation on Etherscan (optional):');
  console.log(`   npx hardhat verify --network sepolia ${newImplementationAddress}`);
  console.log('3. Announce the upgrade to your users');
  console.log('4. Monitor the contract for any issues\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Upgrade failed:', error);
    process.exit(1);
  });
