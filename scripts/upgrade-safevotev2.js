const { ethers, upgrades } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Upgrading with account:', deployer.address);

  const proxyAddress = '0x38290e4834FFc92065B921E092BCD0b5D65aD4A0';

  const SafeVoteV2 = await ethers.getContractFactory('SafeVoteV2');

  // Step 1: Force import the existing proxy
  console.log('Force importing existing proxy...');
  const imported = await upgrades.forceImport(proxyAddress, SafeVoteV2, { kind: 'uups' });
  console.log('Proxy imported successfully');

  // Step 2: Upgrade
  console.log('Upgrading proxy...');
  const upgraded = await upgrades.upgradeProxy(proxyAddress, SafeVoteV2, {
    unsafeAllow: ['constructor'], // Bypass viaIR false positive
  });

  console.log('Upgrade successful!');
  console.log('New implementation:', await upgrades.erc1967.getImplementationAddress(proxyAddress));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
