const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const SafeVoteV2 = await ethers.getContractFactory("SafeVoteV2");
  console.log("Deploying proxy...");

  const proxy = await upgrades.deployProxy(SafeVoteV2, [], {
    initializer: "initialize",
    kind: "uups",
    unsafeAllow: ["constructor"]  // Bypass viaIR check
  });
  await proxy.waitForDeployment();

  console.log("Proxy deployed to:", await proxy.getAddress());
  console.log("Implementation:", await upgrades.erc1967.getImplementationAddress(await proxy.getAddress()));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});