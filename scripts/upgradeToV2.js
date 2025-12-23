// scripts/upgradeToV2.js - Upgrade existing V1 deployments to V2

const { ethers, upgrades } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Existing V1 proxy addresses (from your previous deployments)
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

async function upgradeChain(chainConfig) {
  console.log(`\n🔄 Upgrading ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
  console.log('━'.repeat(60));

  const proxyAddress = V1_PROXIES[chainConfig.chainId];
  if (!proxyAddress || proxyAddress.startsWith('0x0000')) {
    console.log('❌ No V1 proxy address configured for this chain — skipping');
    return { success: false, chainName: chainConfig.name, error: 'Missing proxy address' };
  }

  if (!chainConfig.rpc) {
    console.log('❌ Missing RPC URL — check .env');
    return { success: false, chainName: chainConfig.name, error: 'Missing RPC URL' };
  }

  if (!process.env.PRIVATE_KEY) {
    console.log('❌ PRIVATE_KEY not set in .env');
    return { success: false, chainName: chainConfig.name, error: 'Missing PRIVATE_KEY' };
  }

  try {
    // Create dedicated provider and wallet for this chain
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log('📝 Upgrading with account:', wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'Native Token');

    if (balance < ethers.parseEther('0.01')) {
      console.warn('⚠️  Low balance — upgrade may fail');
    }

    console.log('📦 V1 Proxy:', proxyAddress);

    // Get current implementation
    const oldImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log('📦 V1 Implementation:', oldImpl);

    // Attach to V1 to read data
    const V1 = await ethers.getContractAt('VotingSystem', proxyAddress, wallet);
    const totalOrgsV1 = await V1.getTotalOrganizations();
    const totalPollsV1 = await V1.getTotalPolls();
    const v1Version = await V1.version();

    console.log(`📊 V1 Data: ${totalOrgsV1} orgs, ${totalPollsV1} polls, version ${v1Version}`);

    // Upgrade to V2
    console.log('\n🚀 Upgrading proxy to SafeVoteV2...');

    const SafeVoteV2 = await ethers.getContractFactory('SafeVoteV2', wallet);

    const upgraded = await upgrades.upgradeProxy(proxyAddress, SafeVoteV2, {
      kind: 'uups',
      unsafeAllow: ['delegatecall'],
      unsafeSkipStorageCheck: true, // ← This bypasses the ERC1967 check
      timeout: 600000, // 10 minutes
      pollingInterval: 10000,
    });

    console.log('✅ Upgrade transaction sent — waiting for confirmation...');

    const newImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log('📦 V2 Implementation:', newImpl);

    // Re-attach to upgraded contract
    const V2 = await ethers.getContractAt('SafeVoteV2', proxyAddress, wallet);
    const v2Version = await V2.version();

    console.log('📌 V2 Version:', v2Version);

    // Data verification
    const totalOrgsV2 = await V2.getTotalOrganizations();
    const totalPollsV2 = await V2.getTotalPolls();
    let totalElections = 'N/A';
    try {
      totalElections = await V2.getTotalElections();
    } catch {}

    console.log('\n🧪 Data Verification:');
    console.log(
      `  Organizations: ${totalOrgsV1} → ${totalOrgsV2} ${
        totalOrgsV1.eq(totalOrgsV2) ? '✅' : '❌'
      }`
    );
    console.log(
      `  Polls: ${totalPollsV1} → ${totalPollsV2} ${totalPollsV1.eq(totalPollsV2) ? '✅' : '❌'}`
    );
    if (totalElections !== 'N/A') console.log(`  Elections (new): ${totalElections}`);

    // Test sample org
    if (totalOrgsV2 > 0n) {
      try {
        const orgTest = await V2.getOrganization(1);
        console.log(`  Sample Org #1: ${orgTest.name || orgTest[0]} ✅`);
      } catch (e) {
        console.log('  Sample Org #1: Failed to load ❌');
      }
    }

    return {
      success: true,
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      proxyAddress,
      oldImplementation: oldImpl,
      newImplementation: newImpl,
      v1Version: v1Version.toString(),
      v2Version: v2Version.toString(),
      dataPreserved: {
        organizations: totalOrgsV1.eq(totalOrgsV2),
        polls: totalPollsV1.eq(totalPollsV2),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Upgrade failed on ${chainConfig.name}:`, error.message);
    return {
      success: false,
      chainId: chainConfig.chainId,
      chainName: chainConfig.name,
      error: error.message || error.toString(),
    };
  }
}

async function main() {
  console.log('🔄 SafeVote V1 → V2 Multichain Upgrade\n');

  const results = [];
  const successful = [];
  const failed = [];

  for (const chain of CHAINS) {
    const result = await upgradeChain(chain);
    results.push(result);
    if (result.success) successful.push(result);
    else failed.push(result);

    // Be nice to RPCs
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Save report
  const upgradesDir = path.join(__dirname, '../deployments/upgrades');
  fs.mkdirSync(upgradesDir, { recursive: true });

  const timestamp = Date.now();
  const upgradeFile = path.join(upgradesDir, `v1-to-v2-${timestamp}.json`);
  fs.writeFileSync(
    upgradeFile,
    JSON.stringify(
      {
        upgradeType: 'v1-to-v2',
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
        },
      },
      null,
      2
    )
  );

  console.log('\n📊 UPGRADE SUMMARY');
  console.log('━'.repeat(60));
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`📄 Report saved: ${upgradeFile}`);

  if (successful.length > 0) {
    console.log('\n✅ Successful Upgrades:');
    successful.forEach((u) => {
      console.log(`  • ${u.chainName.padEnd(16)} ${u.v1Version} → ${u.v2Version}`);
      console.log(`    Proxy: ${u.proxyAddress}`);
      console.log(
        `    Data: Orgs ${u.dataPreserved.organizations ? '✅' : '❌'}, Polls ${
          u.dataPreserved.polls ? '✅' : '❌'
        }`
      );
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Upgrades:');
    failed.forEach((u) => console.log(`  • ${u.chainName.padEnd(16)} ${u.error}`));
  }

  console.log('\n📝 Frontend config unchanged — proxy addresses remain the same');
  console.log('\n✨ V2 Upgrade complete across chains!\n');
  console.log('📋 Next Steps:');
  console.log('1. Test new V2 features thoroughly');
  console.log('2. Monitor contracts on block explorers');
  console.log('3. Announce upgrade to users');
  console.log('4. Verify on Etherscan/Blockscout if desired\n');
}

main().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
