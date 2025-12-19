import { expect } from "chai";
import hre from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

describe("SafeVoteV2 - Full Compatibility Tests", function () {
  let safeVote, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await hre.ethers.getSigners();

    const SafeVoteV2Factory = await hre.ethers.getContractFactory("SafeVoteV2");
    safeVote = await hre.upgrades.deployProxy(SafeVoteV2Factory, [], { 
      initializer: "initialize",
      unsafeAllow: ["constructor"]
    });
    await safeVote.waitForDeployment();
  });

  it("V1: Should create organization and add members", async function () {
    await safeVote.createOrganization("Test Org", "test.eth", true);
    const org = await safeVote.getOrganization(1);
    expect(org.name).to.equal("Test Org");

    await safeVote.addMember(1, addr1.address);
    await safeVote.addMember(1, addr2.address);

    const members = await safeVote.getOrganizationMembers(1);
    expect(members.length).to.equal(3);
  });

  it("V1: Should create poll and cast vote", async function () {
    await safeVote.createOrganization("Poll Org", "", true);

    await safeVote.createPoll(
      1,
      "Best color?",
      0,
      ["Red", "Blue"],
      3600,
      50,
      10,
      false
    );

    const keys = await safeVote.generateVotingKeys(1); // Called by owner (creator)
    expect(keys.length).to.equal(10);

    await safeVote.authorizeVoter(1, owner.address);
    await safeVote.vote(1, 0, keys[0]);

    const results = await safeVote.getPollResults(1);
    expect(results.votes[0]).to.equal(1n);
  });

  it("V2: Should create election and vote with Merkle proof", async function () {
    const voters = [addr1.address, addr2.address];
    const leaves = voters.map(addr => keccak256(addr));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getRoot();

    const block = await hre.ethers.provider.getBlock("latest");
    const now = block.timestamp;

    const positions = [{
      title: "President",
      candidates: ["Alice", "Bob"],
      maxSelections: 1
    }];

    await safeVote.createElection(
      "Test Election",
      "Desc",
      "Online",
      now + 100,
      now + 3600,
      2,
      root,
      true,
      false,
      false,
      positions
    );

    await hre.ethers.provider.send("evm_increaseTime", [200]);
    await hre.ethers.provider.send("evm_mine");

    const proof = tree.getHexProof(keccak256(addr1.address));
    const votes = [[0]];

    await safeVote.connect(addr1).vote(1, keccak256(addr1.address), proof, votes, hre.ethers.ZeroAddress);

    const results = await safeVote.getElectionResults(1, 0);
    expect(results.votesCast[0]).to.equal(1n);
  });

  it("V2: Should support delegation", async function () {
    const voters = [addr1.address];
    const leaves = voters.map(addr => keccak256(addr));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getRoot();

    const block = await hre.ethers.provider.getBlock("latest");
    const now = block.timestamp;

    await safeVote.createElection(
      "Delegation Test",
      "",
      "",
      now + 100,
      now + 3600,
      1,
      root,
      true,
      false,
      true,
      [{ title: "Test", candidates: ["A"], maxSelections: 1 }]
    );

    await hre.ethers.provider.send("evm_increaseTime",", [200]);
    await hre.ethers.provider.send("evm_mine");

    const proof = tree.getHexProof(keccak256(addr1.address));

    await safeVote.connect(addr1).vote(1, keccak256(addr1.address), proof, [], addr2.address);

    const delegate = await safeVote.delegations(1, addr1.address);
    expect(delegate).to.equal(addr2.address);
  });

  it("Should complete elections", async function () {
    const block = await hre.ethers.provider.getBlock("latest");
    const now = block.timestamp;

    await safeVote.createElection(
      "Complete Test",
      "",
      "",
      now - 3600,
      now - 100,
      1,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      true,
      false,
      false,
      [{ title: "Test", candidates: ["A"], maxSelections: 1 }]
    );

    await safeVote.completeElection(1);
    const election = await safeVote.getElection(1);
    expect(election.status).to.equal(1);
  });

  it("Should return correct counters and versions", async function () {
    expect(await safeVote.getTotalOrganizations()).to.equal(0);
    expect(await safeVote.getTotalPolls()).to.equal(0);
    expect(await safeVote.getTotalElections()).to.equal(0);
    expect(await safeVote.version()).to.equal("2.0.0-full");
  });
});