const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('🚀 Deploying SafeVote Contract');
  console.log('=====================================');
  console.log('Deploying with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');

  // Deploy regular contract (no proxy, no upgrades)
  console.log('\n📦 Deploying SafeVote...');
  const SafeVote = await ethers.getContractFactory('SafeVote');
  const contract = await SafeVote.deploy();
  
  console.log('⏳ Waiting for deployment...');
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  
  console.log('\n✅ Deployment Successful!');
  console.log('=====================================');
  console.log('📍 Contract Address:', contractAddress);
  console.log('🔗 Transaction Hash:', contract.deploymentTransaction().hash);
  console.log('🌐 Network:', (await ethers.provider.getNetwork()).name);
  console.log('🔢 Chain ID:', (await ethers.provider.getNetwork()).chainId);
  
  // Verify the deployment
  console.log('\n⏳ Waiting for block confirmations...');
  await contract.deploymentTransaction().wait(3);
  
  const version = await contract.version();
  console.log('✅ Contract Version:', version);
  
  console.log('\n📋 Next Steps:');
  console.log('1. Update your frontend with this address:', contractAddress);
  console.log('2. Verify contract on block explorer (if on mainnet/testnet)');
  console.log('3. Save this address for future reference');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment Failed:');
    console.error(error);
    process.exit(1);
  });