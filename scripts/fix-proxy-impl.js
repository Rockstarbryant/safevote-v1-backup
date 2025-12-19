const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = "0xAAdb21aD340D00843A0Fa1758349A59AfE04aB14";
  const correctImpl = "0x23B25cAEfac1C25136ca3fF5f1bCc945c59EEA4A";  // Your full merged impl

  const SafeVoteV2 = await ethers.getContractFactory("SafeVoteV2");

  console.log("Force importing proxy...");
  await upgrades.forceImport(proxyAddress, SafeVoteV2, { kind: "uups" });

  console.log("Upgrading to correct implementation...");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, SafeVoteV2, {
    unsafeAllow: ["constructor"]
  });

  const newImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Proxy now points to:", newImpl);
  if (newImpl.toLowerCase() === correctImpl.toLowerCase()) {
    console.log("Fixed successfully!");
  } else {
    console.log("Still wrong — check manifest");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});