const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BatchVoteSubmitter", function () {
  it("Should compile and deploy", async function () {
    const SafeVoteV2 = await ethers.getContractFactory("SafeVoteV2");
    const safeVote = await SafeVoteV2.deploy();
    await safeVote.deployed();

    const BatchVoteSubmitter = await ethers.getContractFactory("BatchVoteSubmitter");
    const batchSubmitter = await BatchVoteSubmitter.deploy(safeVote.address);
    await batchSubmitter.deployed();

    expect(await batchSubmitter.owner()).to.not.equal(ethers.constants.AddressZero);
    console.log("✅ BatchVoteSubmitter deployed successfully!");
  });
});