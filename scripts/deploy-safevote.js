const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const SafeVote = await ethers.getContractFactory("SafeVote");
  console.log("Deploying SafeVote...");

  const safeVote = await SafeVote.deploy();
  await safeVote.waitForDeployment();

  console.log("SafeVote deployed to:", await safeVote.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});