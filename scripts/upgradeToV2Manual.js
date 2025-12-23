// scripts/upgradeToV2Manual.js - Fixed for OZ v5+ (uses upgradeToAndCall)

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Existing V1 proxy addresses
const V1_PROXIES = {
  11155111: '0xd8bFdD7f2bb39D5D78a4Bb1D9D2f70968C63e8F3', // Sepolia
  84532: '0xC724408090C739daD30f5a9d6756DB0d56e060be', // Base Sepolia
  421614: '0x38290e4834FFc92065B921E092BCD0b5D65aD4A0', // Arbitrum Sepolia
  97: '0x38290e4834FFc92065B921E092BCD0b5D65aD4A0', // BNB Testnet
  1328: '0x38290e4834FFc92065B921E092BCD0b5D65aD4A0', // Sei Testnet
};

const CHAINS = [
  { name: 'sepolia', chainId: 11155111, rpc: process.env.SEPOLIA_RPC_URL },
  { name: 'baseSepolia', chainId: 84532, rpc: process.env.BASE_SEPOLIA_RPC_URL },
  { name: 'arbitrumSepolia', chainId: 421614, rpc: process.env.ARBITRUM_SEPOLIA_RPC_URL },
  { name: 'bnbTestnet', chainId: 97, rpc: process.env.BNB_TESTNET_RPC_URL },
  { name: 'seiTestnet', chainId: 1328, rpc: process.env.SEI_TESTNET_RPC_URL },
];

async function manualUpgrade(chainConfig) {
  console.log(`\n🔄 Manual UUPS Upgrade on ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
  console.log('━'.repeat(60));

  const proxyAddress = V1_PROXIES[chainConfig.chainId];
  if (!proxyAddress) {
    console.log('❌ No proxy address for this chain');
    return { success: false, chainName: chainConfig.name, error: 'No proxy' };
  }

  if (!chainConfig.rpc || !process.env.PRIVATE_KEY) {
    console.log('❌ Missing RPC or PRIVATE_KEY');
    return { success: false, error: 'Config missing' };
  }

  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log('📝 Using account:', wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance));

    if (balance < ethers.parseEther('0.01')) {
      console.warn('⚠️ Low balance — upgrade may fail');
    }

    console.log('📦 Proxy:', proxyAddress);

    // Deploy new V2 implementation
    console.log('\n🚀 Deploying new SafeVoteV2 implementation...');
    const SafeVoteV2 = await ethers.getContractFactory('SafeVoteV2', wallet);
    const v2Impl = await SafeVoteV2.deploy();
    await v2Impl.waitForDeployment();
    const newImplAddress = await v2Impl.getAddress();
    console.log('📦 New Implementation deployed:', newImplAddress);

    // Attach to proxy using V1 ABI (since current impl is V1)
    // But call upgradeToAndCall (exists in both v4 and v5)
    console.log('\n🔑 Calling upgradeToAndCall on proxy...');
    const proxyAsV1 = await ethers.getContractAt('VotingSystem', proxyAddress, wallet); // Use V1 ABI
    const tx = await proxyAsV1.upgradeToAndCall(newImplAddress, '0x'); // empty data
    console.log('⏳ Tx sent:', tx.hash);
    await tx.wait();
    console.log('✅ Upgrade successful!');

    // Verify with V2 ABI
    const proxyAsV2 = await ethers.getContractAt('SafeVoteV2', proxyAddress, wallet);
    const version = await proxyAsV2.version();
    console.log('📌 New version:', version);

    return {
      success: true,
      chainName: chainConfig.name,
      proxyAddress,
      newImplementation: newImplAddress,
      txHash: tx.hash,
      v2Version: version.toString(),
    };
  } catch (error) {
    console.error(`❌ Failed on ${chainConfig.name}:`, error.message);
    return { success: false, chainName: chainConfig.name, error: error.message };
  }
}

async function main() {
  console.log('🔄 SafeVote V1 → V2 Manual Multichain Upgrade (Fixed for OZ v5+)\n');

  const results = [];
  for (const chain of CHAINS) {
    const result = await manualUpgrade(chain);
    results.push(result);
    await new Promise((r) => setTimeout(r, 5000)); // Longer delay for safety
  }

  // Save report
  const dir = path.join(__dirname, '../deployments/upgrades');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `manual-upgrade-${Date.now()}.json`),
    JSON.stringify(results, null, 2)
  );

  console.log('\n📊 SUMMARY: Success:', results.filter((r) => r.success).length, '/5');
  console.log('✨ Manual upgrade complete!');
}

main().catch((err) => console.error('Script error:', err));
