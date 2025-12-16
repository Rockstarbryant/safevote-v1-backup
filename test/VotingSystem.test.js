const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('VotingSystem', function () {
  let votingSystem;
  let owner, admin, member1, member2, member3, nonMember;
  let orgId, pollId;

  beforeEach(async function () {
    // Get signers
    [owner, admin, member1, member2, member3, nonMember] = await ethers.getSigners();

    // Deploy contract
    const VotingSystem = await ethers.getContractFactory('VotingSystem');
    votingSystem = await upgrades.deployProxy(VotingSystem, [], {
      initializer: 'initialize',
      kind: 'uups',
    });
    await votingSystem.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await votingSystem.owner()).to.equal(owner.address);
    });

    it('Should return correct version', async function () {
      expect(await votingSystem.version()).to.equal('1.0.0');
    });
  });

  describe('Organization Management', function () {
    it('Should create a public organization', async function () {
      const tx = await votingSystem.connect(admin).createOrganization('Test Org', '', true);

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === 'OrganizationCreated'
      );

      orgId = event.args[0];

      const org = await votingSystem.getOrganization(orgId);
      expect(org[0]).to.equal('Test Org'); // name
      expect(org[2]).to.equal(admin.address); // admin
      expect(org[3]).to.equal(true); // isPublic
    });

    it('Should create a private organization', async function () {
      const tx = await votingSystem.connect(admin).createOrganization('Private Org', '', false);

      await tx.wait();

      const publicOrgs = await votingSystem.getPublicOrganizations();
      expect(publicOrgs.length).to.equal(0);
    });

    it('Should add a member to organization', async function () {
      const tx = await votingSystem.connect(admin).createOrganization('Test Org', '', true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === 'OrganizationCreated'
      );
      orgId = event.args[0];

      await votingSystem.connect(admin).addMember(orgId, member1.address);

      const memberInfo = await votingSystem.getMemberInfo(orgId, member1.address);
      expect(memberInfo[1]).to.equal(true); // isActive
    });

    it('Should batch add members', async function () {
      const tx = await votingSystem.connect(admin).createOrganization('Test Org', '', true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === 'OrganizationCreated'
      );
      orgId = event.args[0];

      const members = [member1.address, member2.address, member3.address];
      await votingSystem.connect(admin).batchAddMembers(orgId, members);

      const orgInfo = await votingSystem.getOrganization(orgId);
      expect(orgInfo[5]).to.equal(4); // memberCount (admin + 3 members)
    });

    it('Should not allow non-members to add members', async function () {
      const tx = await votingSystem.connect(admin).createOrganization('Test Org', '', true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === 'OrganizationCreated'
      );
      orgId = event.args[0];

      await expect(
        votingSystem.connect(nonMember).addMember(orgId, member1.address)
      ).to.be.revertedWith('Not an active member');
    });

    it('Should allow member to leave organization', async function () {
      const tx = await votingSystem.connect(admin).createOrganization('Test Org', '', true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === 'OrganizationCreated'
      );
      orgId = event.args[0];

      await votingSystem.connect(admin).addMember(orgId, member1.address);
      await votingSystem.connect(member1).leaveOrganization(orgId);

      const memberInfo = await votingSystem.getMemberInfo(orgId, member1.address);
      expect(memberInfo[1]).to.equal(false); // isActive
    });

    it('Should not allow admin to leave', async function () {
      const tx = await votingSystem.connect(admin).createOrganization('Test Org', '', true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === 'OrganizationCreated'
      );
      orgId = event.args[0];

      await expect(votingSystem.connect(admin).leaveOrganization(orgId)).to.be.revertedWith(
        'Admin cannot leave'
      );
    });

    it('Should allow admin to remove members', async function () {
      const tx = await votingSystem.connect(admin).createOrganization('Test Org', '', true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === 'OrganizationCreated'
      );
      orgId = event.args[0];

      await votingSystem.connect(admin).addMember(orgId, member1.address);
      await votingSystem.connect(admin).removeMember(orgId, member1.address);

      const memberInfo = await votingSystem.getMemberInfo(orgId, member1.address);
      expect(memberInfo[1]).to.equal(false); // isActive
    });
  });

  describe('Poll Management', function () {
    beforeEach(async function () {
      const tx = await votingSystem.connect(admin).createOrganization('Test Org', '', true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === 'OrganizationCreated'
      );
      orgId = event.args[0];

      await votingSystem.connect(admin).addMember(orgId, member1.address);
      await votingSystem.connect(admin).addMember(orgId, member2.address);
    });

    it('Should create a poll', async function () {
      const options = ['Yes', 'No'];
      const duration = 3600; // 1 hour
      const quorum = 50; // 50%
      const numberOfKeys = 2;

      const tx = await votingSystem
        .connect(admin)
        .createPoll(orgId, 'Test Poll?', 0, options, duration, quorum, numberOfKeys, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === 'PollCreated');
      pollId = event.args[0];

      const poll = await votingSystem.getPoll(pollId);
      expect(poll.question).to.equal('Test Poll?');
      expect(poll.options.length).to.equal(2);
    });

    it('Should generate voting keys', async function () {
      const options = ['Yes', 'No'];
      const duration = 3600;
      const quorum = 50;
      const numberOfKeys = 3;

      const tx = await votingSystem
        .connect(admin)
        .createPoll(orgId, 'Test Poll?', 0, options, duration, quorum, numberOfKeys, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === 'PollCreated');
      pollId = event.args[0];

      const keysTx = await votingSystem.connect(admin).generateVotingKeys(pollId);
      const keysReceipt = await keysTx.wait();

      // Count VotingKeyGenerated events
      const keyEvents = keysReceipt.logs.filter(
        (log) => log.fragment && log.fragment.name === 'VotingKeyGenerated'
      );
      expect(keyEvents.length).to.equal(numberOfKeys);
    });

    it('Should authorize voters', async function () {
      const options = ['Yes', 'No'];
      const duration = 3600;
      const quorum = 50;
      const numberOfKeys = 2;

      const tx = await votingSystem
        .connect(admin)
        .createPoll(orgId, 'Test Poll?', 0, options, duration, quorum, numberOfKeys, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === 'PollCreated');
      pollId = event.args[0];

      await votingSystem.connect(admin).authorizeVoter(pollId, member1.address);

      const isAuthorized = await votingSystem.isAuthorizedVoter(pollId, member1.address);
      expect(isAuthorized).to.equal(true);
    });

    it('Should batch authorize voters', async function () {
      const options = ['Yes', 'No'];
      const duration = 3600;
      const quorum = 50;
      const numberOfKeys = 2;

      const tx = await votingSystem
        .connect(admin)
        .createPoll(orgId, 'Test Poll?', 0, options, duration, quorum, numberOfKeys, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === 'PollCreated');
      pollId = event.args[0];

      const voters = [member1.address, member2.address];
      await votingSystem.connect(admin).batchAuthorizeVoters(pollId, voters);

      const isAuthorized1 = await votingSystem.isAuthorizedVoter(pollId, member1.address);
      const isAuthorized2 = await votingSystem.isAuthorizedVoter(pollId, member2.address);

      expect(isAuthorized1).to.equal(true);
      expect(isAuthorized2).to.equal(true);
    });

    it('Should allow authorized voters to vote', async function () {
      const options = ['Yes', 'No'];
      const duration = 3600;
      const quorum = 50;
      const numberOfKeys = 2;

      const tx = await votingSystem
        .connect(admin)
        .createPoll(orgId, 'Test Poll?', 0, options, duration, quorum, numberOfKeys, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === 'PollCreated');
      pollId = event.args[0];

      const keysTx = await votingSystem.connect(admin).generateVotingKeys(pollId);
      const keysReceipt = await keysTx.wait();
      const keyEvents = keysReceipt.logs.filter(
        (log) => log.fragment && log.fragment.name === 'VotingKeyGenerated'
      );
      const firstKey = keyEvents[0].args.keyHash;

      await votingSystem.connect(admin).authorizeVoter(pollId, member1.address);

      await votingSystem.connect(member1).vote(pollId, 0, firstKey);

      const hasVotedStatus = await votingSystem.hasVoted(pollId, member1.address);
      expect(hasVotedStatus).to.equal(true);

      const results = await votingSystem.getPollResults(pollId);
      expect(results[2]).to.equal(1n); // totalVotes
    });

    it('Should not allow double voting', async function () {
      const options = ['Yes', 'No'];
      const duration = 3600;
      const quorum = 50;
      const numberOfKeys = 2;

      const tx = await votingSystem
        .connect(admin)
        .createPoll(orgId, 'Test Poll?', 0, options, duration, quorum, numberOfKeys, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === 'PollCreated');
      pollId = event.args[0];

      const keysTx = await votingSystem.connect(admin).generateVotingKeys(pollId);
      const keysReceipt = await keysTx.wait();
      const keyEvents = keysReceipt.logs.filter(
        (log) => log.fragment && log.fragment.name === 'VotingKeyGenerated'
      );
      const firstKey = keyEvents[0].args.keyHash;
      const secondKey = keyEvents[1].args.keyHash;

      await votingSystem.connect(admin).authorizeVoter(pollId, member1.address);

      await votingSystem.connect(member1).vote(pollId, 0, firstKey);

      await expect(votingSystem.connect(member1).vote(pollId, 1, secondKey)).to.be.revertedWith(
        'Already voted'
      );
    });

    it('Should not allow reusing voting keys', async function () {
      const options = ['Yes', 'No'];
      const duration = 3600;
      const quorum = 50;
      const numberOfKeys = 2;

      const tx = await votingSystem
        .connect(admin)
        .createPoll(orgId, 'Test Poll?', 0, options, duration, quorum, numberOfKeys, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === 'PollCreated');
      pollId = event.args[0];

      const keysTx = await votingSystem.connect(admin).generateVotingKeys(pollId);
      const keysReceipt = await keysTx.wait();
      const keyEvents = keysReceipt.logs.filter(
        (log) => log.fragment && log.fragment.name === 'VotingKeyGenerated'
      );
      const firstKey = keyEvents[0].args.keyHash;

      await votingSystem
        .connect(admin)
        .batchAuthorizeVoters(pollId, [member1.address, member2.address]);

      await votingSystem.connect(member1).vote(pollId, 0, firstKey);

      await expect(votingSystem.connect(member2).vote(pollId, 1, firstKey)).to.be.revertedWith(
        'Voting key already used'
      );
    });

    it('Should not allow voting after poll ends', async function () {
      const options = ['Yes', 'No'];
      const duration = 60; // 1 minute
      const quorum = 50;
      const numberOfKeys = 2;

      const tx = await votingSystem
        .connect(admin)
        .createPoll(orgId, 'Test Poll?', 0, options, duration, quorum, numberOfKeys, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === 'PollCreated');
      pollId = event.args[0];

      const keysTx = await votingSystem.connect(admin).generateVotingKeys(pollId);
      const keysReceipt = await keysTx.wait();
      const keyEvents = keysReceipt.logs.filter(
        (log) => log.fragment && log.fragment.name === 'VotingKeyGenerated'
      );
      const firstKey = keyEvents[0].args.keyHash;

      await votingSystem.connect(admin).authorizeVoter(pollId, member1.address);

      // Fast forward time past poll end
      await time.increase(duration + 1);

      await expect(votingSystem.connect(member1).vote(pollId, 0, firstKey)).to.be.revertedWith(
        'Poll has ended'
      );
    });

    it('Should complete poll after end time', async function () {
      const options = ['Yes', 'No'];
      const duration = 60;
      const quorum = 50;
      const numberOfKeys = 2;

      const tx = await votingSystem
        .connect(admin)
        .createPoll(orgId, 'Test Poll?', 0, options, duration, quorum, numberOfKeys, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === 'PollCreated');
      pollId = event.args[0];

      const keysTx = await votingSystem.connect(admin).generateVotingKeys(pollId);
      const keysReceipt = await keysTx.wait();
      const keyEvents = keysReceipt.logs.filter(
        (log) => log.fragment && log.fragment.name === 'VotingKeyGenerated'
      );
      const firstKey = keyEvents[0].args.keyHash;
      const secondKey = keyEvents[1].args.keyHash;

      await votingSystem
        .connect(admin)
        .batchAuthorizeVoters(pollId, [member1.address, member2.address]);

      await votingSystem.connect(member1).vote(pollId, 0, firstKey);
      await votingSystem.connect(member2).vote(pollId, 0, secondKey);

      // Fast forward time
      await time.increase(duration + 1);

      await votingSystem.completePoll(pollId);

      const poll = await votingSystem.getPoll(pollId);
      expect(poll.status).to.equal(1); // Completed
    });

    it('Should calculate poll results correctly', async function () {
      const options = ['Option A', 'Option B', 'Option C'];
      const duration = 3600;
      const quorum = 50;
      const numberOfKeys = 3;

      const tx = await votingSystem
        .connect(admin)
        .createPoll(orgId, 'Which option?', 1, options, duration, quorum, numberOfKeys, false);

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === 'PollCreated');
      pollId = event.args[0];

      const keysTx = await votingSystem.connect(admin).generateVotingKeys(pollId);
      const keysReceipt = await keysTx.wait();
      const keyEvents = keysReceipt.logs.filter(
        (log) => log.fragment && log.fragment.name === 'VotingKeyGenerated'
      );

      // Add member3
      await votingSystem.connect(admin).addMember(orgId, member3.address);

      await votingSystem
        .connect(admin)
        .batchAuthorizeVoters(pollId, [member1.address, member2.address, member3.address]);

      await votingSystem.connect(member1).vote(pollId, 0, keyEvents[0].args.keyHash); // Option A
      await votingSystem.connect(member2).vote(pollId, 1, keyEvents[1].args.keyHash); // Option B
      await votingSystem.connect(member3).vote(pollId, 0, keyEvents[2].args.keyHash); // Option A

      const results = await votingSystem.getPollResults(pollId);
      expect(results[1][0]).to.equal(2n); // Option A: 2 votes
      expect(results[1][1]).to.equal(1n); // Option B: 1 vote
      expect(results[1][2]).to.equal(0n); // Option C: 0 votes
    });
  });

  describe('Access Control', function () {
    it('Should allow only owner to pause', async function () {
      await votingSystem.connect(owner).pause();
      expect(await votingSystem.paused()).to.equal(true);
    });

    it('Should not allow non-owner to pause', async function () {
      await expect(votingSystem.connect(admin).pause()).to.be.reverted;
    });

    it('Should not allow operations when paused', async function () {
      await votingSystem.connect(owner).pause();

      await expect(
        votingSystem.connect(admin).createOrganization('Test', '', true)
      ).to.be.revertedWithCustomError(votingSystem, 'EnforcedPause');
    });
  });

  describe('Edge Cases', function () {
    it('Should handle empty organization name', async function () {
      await expect(votingSystem.connect(admin).createOrganization('', '', true)).to.be.revertedWith(
        'Name cannot be empty'
      );
    });

    it('Should handle poll with insufficient options', async function () {
      const tx = await votingSystem.connect(admin).createOrganization('Test Org', '', true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === 'OrganizationCreated'
      );
      orgId = event.args[0];

      await expect(
        votingSystem.connect(admin).createPoll(orgId, 'Test?', 0, ['Only One'], 3600, 50, 2, false)
      ).to.be.revertedWith('At least 2 options required');
    });

    it('Should handle poll with too short duration', async function () {
      const tx = await votingSystem.connect(admin).createOrganization('Test Org', '', true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === 'OrganizationCreated'
      );
      orgId = event.args[0];

      await expect(
        votingSystem.connect(admin).createPoll(
          orgId,
          'Test?',
          0,
          ['Yes', 'No'],
          30, // Less than 1 minute
          50,
          2,
          false
        )
      ).to.be.revertedWith('Duration must be at least 1 minute');
    });
  });
});
