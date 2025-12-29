# SafeVote Bot Testing System

Comprehensive automated testing system for stress-testing the SafeVote decentralized voting platform.

## 🎯 Features

- ✅ **Automated Election Creation** - Bots create realistic elections with random data
- ✅ **Automated Voting** - Eligible voter bots cast votes across all elections
- ✅ **Security Testing** - Ineligible bots test access control systems
- ✅ **Multi-Network Support** - Test on Arbitrum, Base, Ethereum, or SEI testnets
- ✅ **Scalable** - From 5 to 20,000+ bots
- ✅ **Comprehensive Logging** - Detailed logs for all operations
- ✅ **Real-time Monitoring** - Progress bars and statistics
- ✅ **Automatic Retry Logic** - Failed operations retry automatically

## 📋 Prerequisites

- **Node.js** v16+ and npm
- **Testnet ETH** (10-20 ETH recommended for full test)
- **API Access** to SafeVote backend services
- **Basic command line knowledge**

## 🚀 Quick Start (15 Minutes)

### 1. Install

```bash
# Clone or download the project
cd safevote-bots

# Install dependencies
npm install
```

### 2. Configure

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Network
NETWORK=arbitrum-sepolia

# RPC
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc

# Contract & APIs
CONTRACT_ADDRESS=0xfa84a89D170084675b7ECb110a883fD47757916c
BACKEND_API=https://blockballot-results-server.onrender.com
KEYGEN_API=https://blockballot-node-services.onrender.com

# CRITICAL: Your funding wallet private key (WITHOUT 0x)
FUNDING_PRIVATE_KEY=your_private_key_here

# Bot Configuration (start small!)
ELECTION_BOTS=5
ELIGIBLE_VOTER_BOTS=50
INELIGIBLE_VOTER_BOTS=10
```

### 3. Get Testnet Tokens

**Fund your funding wallet:**

1. Visit: https://faucet.triangleplatform.com/arbitrum/sepolia
2. Enter your funding wallet address
3. Request 1-2 ETH
4. Wait 5-10 minutes for confirmation

### 4. Generate & Fund Wallets

```bash
# Generate wallets
node scripts/fund-wallets.js --generate

# Check funding wallet balance
node scripts/check-balances.js

# Fund all bot wallets (takes 10-15 minutes)
node scripts/fund-wallets.js --fund-all

# Verify funding
node scripts/check-balances.js
```

### 5. Run First Test

```bash
# Small test (5 elections, 60 voter bots)
node src/orchestrator.js --full

# Expected duration: 30-60 minutes
```

## 📖 Usage Guide

### Basic Commands

```bash
# Full test (elections + voting + security)
node src/orchestrator.js --full

# Elections only
node src/orchestrator.js --elections-only

# Voting only (requires existing elections)
node src/orchestrator.js --voting-only

# Security testing only
node src/orchestrator.js --security-only
```

### Custom Bot Counts

```bash
# Override bot counts
node src/orchestrator.js --full --elections=10 --voters=200

# This creates 10 elections and uses 200 voter bots
# (150 eligible + 50 ineligible by default 75/25 split)
```

### Skip Steps

```bash
# Skip wallet funding (if already funded)
node src/orchestrator.js --full --skip-funding
```

### Check Status

```bash
# Check wallet balances
node scripts/check-balances.js

# View logs
tail -f logs/combined.log
tail -f logs/elections.log
tail -f logs/voting.log
```

## 📊 Testing Scenarios

### Scenario 1: Basic Functionality Test
**Goal:** Verify core functionality works  
**Duration:** 30-60 minutes  
**Command:**
```bash
ELECTION_BOTS=5 ELIGIBLE_VOTER_BOTS=50 INELIGIBLE_VOTER_BOTS=10 \
node src/orchestrator.js --full
```

**Expected Results:**
- ✅ 5 elections created successfully
- ✅ ~40 votes cast per election (80% participation)
- ✅ All ineligible voters blocked
- ✅ No errors in logs

---

### Scenario 2: Moderate Load Test
**Goal:** Test with realistic load  
**Duration:** 2-3 hours  
**Command:**
```bash
ELECTION_BOTS=20 ELIGIBLE_VOTER_BOTS=300 INELIGIBLE_VOTER_BOTS=100 \
node src/orchestrator.js --full
```

**Expected Results:**
- ✅ 20 elections created
- ✅ ~6,000 total votes cast
- ✅ System remains responsive
- ✅ API response times < 2 seconds

---

### Scenario 3: Full Stress Test
**Goal:** Maximum load testing  
**Duration:** 4-8 hours  
**Config:** Use default in `.env`
```bash
node src/orchestrator.js --full
```

**Expected Results:**
- ✅ 50 elections created
- ✅ ~37,500 total votes (750 voters × 50 elections)
- ✅ Security tests all pass
- ✅ Gas costs tracked
- ✅ System handles load without timeouts

---

### Scenario 4: Security-Focused Test
**Goal:** Verify access controls  
**Duration:** 1-2 hours  
**Command:**
```bash
# First create elections
node src/orchestrator.js --elections-only

# Then run security tests
node src/orchestrator.js --security-only
```

**Expected Results:**
- ✅ 100% of ineligible voters blocked
- ✅ No security breaches
- ✅ Proper error messages returned
- ✅ Merkle proof verification works correctly

## 🔍 Understanding the Output

### Election Creation Phase

```
Creating Elections |████████████████████| 100% | 5/5

✅ Election creation complete:
   Successful: 5
   Failed: 0
   Total: 5
```

**What's happening:**
1. Bot generates random election data
2. Selects 75% of voter bots as eligible
3. Creates election in database
4. Generates voter keys & Merkle root
5. Deploys to blockchain
6. Syncs deployment info

**Check:** Look for transaction hashes in logs

---

### Voting Phase

```
Voting Progress |████████████████████| 100% | 250/250

✅ Voting phase complete:
   Votes cast: 230
   Total attempts: 250
```

**What's happening:**
1. Bot waits for election to start
2. Fetches voter key + Merkle proof
3. Selects random candidates
4. Submits vote to blockchain
5. Records vote in database

**Check:** Participation rate should be 75-85%

---

### Security Testing Phase

```
✅ Security testing complete:
   Tests passed: 250/250
   Tests failed: 0/250
```

**What's happening:**
- Ineligible bots attempt to vote
- System blocks them (expected)
- Tests pass if properly blocked
- Tests fail if they gain access (security breach!)

**Check:** All tests should pass (100%)

## 📁 Output Files

### Logs Directory

```
logs/
├── combined.log          # All log entries
├── elections.log         # Election creation logs
├── voting.log           # Voting activity logs
└── errors.log           # Error tracking
```

### Data Directory

```
data/
└── wallets.json         # All bot wallet addresses & keys
                        # ⚠️  KEEP THIS SECURE!
```

### Example Log Entry

```json
{
  "level": "info",
  "message": "Election created",
  "timestamp": "2025-12-28 14:30:45",
  "type": "election_created",
  "electionId": "elec-abc123...",
  "title": "Test Election #5",
  "positions": 3,
  "totalVoters": 38
}
```

## 🔧 Troubleshooting

### Issue: "Insufficient funds for gas"

**Solution:**
```bash
# Check funding wallet
node scripts/check-balances.js

# If low, get more testnet ETH from faucet
# Then fund specific wallets
node scripts/fund-wallets.js --fund-range 0-100
```

---

### Issue: "Merkle verification failed"

**Possible causes:**
1. Voter not registered (check eligible voter list)
2. Wrong voter key (database sync issue)
3. Merkle root mismatch

**Solution:**
```bash
# Check logs for the specific error
tail -f logs/voting.log | grep "Merkle"

# Verify voter is in eligible list
# Check that keys were generated correctly
```

---

### Issue: "Election not found"

**Possible causes:**
1. Election not created on-chain yet
2. Database sync delay
3. Wrong election UUID

**Solution:**
```bash
# Check if election was deployed
tail -f logs/elections.log | grep "deployed"

# Verify election exists in database
# Check election_chains table has entry
```

---

### Issue: "Rate limit exceeded"

**Solution:**
Edit `.env`:
```env
# Reduce concurrent operations
MAX_CONCURRENT_OPERATIONS=5

# Increase delays
REQUEST_DELAY=3000
PROCESS_DELAY=90000
```

---

### Issue: "Transaction timeout"

**Solution:**
Edit `.env`:
```env
# Increase timeout
TX_TIMEOUT=180000  # 3 minutes

# Increase gas price
GAS_PRICE_MULTIPLIER=1.5
```

## 📊 Monitoring & Analytics

### Real-time Monitoring

While running, you can monitor in another terminal:

```bash
# Watch election creation
tail -f logs/elections.log

# Watch voting
tail -f logs/voting.log

# Watch errors
tail -f logs/errors.log

# Count successful votes
grep "Vote confirmed" logs/voting.log | wc -l

# Check gas usage
grep "Gas used:" logs/combined.log
```

### Post-Test Analysis

```bash
# Count total elections created
grep "Election created" logs/elections.log | wc -l

# Count total votes cast
grep "Vote cast" logs/voting.log | wc -l

# Check error rate
grep "ERROR" logs/errors.log | wc -l

# Average gas per election
grep "Gas used:" logs/elections.log | awk '{sum+=$NF; count++} END {print sum/count}'
```

## 🔒 Security Best Practices

1. **Never commit `.env` file**
   - Add to `.gitignore`
   - Contains private keys

2. **Never use mainnet wallets**
   - Only use testnet wallets
   - No real funds at risk

3. **Secure `wallets.json`**
   - Contains all bot private keys
   - Add to `.gitignore`
   - Back up securely

4. **Monitor gas costs**
   - Even on testnet
   - Can run out of testnet ETH

5. **Rate limiting**
   - Respect backend API limits
   - Don't overwhelm services

## 🎯 Success Criteria

After a successful test, you should have:

✅ **Elections Created:** 50/50 (100%)  
✅ **Votes Cast:** ~37,500/50,000 (75%+)  
✅ **Security Tests Passed:** 250/250 (100%)  
✅ **Average Vote Time:** < 30 seconds  
✅ **API Response Time:** < 2 seconds  
✅ **Error Rate:** < 1%  
✅ **Gas Costs:** Within expected range  

## 🆘 Getting Help

If you encounter issues:

1. **Check logs first**
   ```bash
   tail -100 logs/errors.log
   ```

2. **Verify configuration**
   ```bash
   node -e "require('dotenv').config(); console.log(process.env)"
   ```

3. **Test connectivity**
   ```bash
   curl https://blockballot-results-server.onrender.com
   curl https://blockballot-node-services.onrender.com
   ```

4. **Check wallet balances**
   ```bash
   node scripts/check-balances.js
   ```

## 📈 Scaling Up

To scale from 1,000 to 20,000 bots:

1. **Increase bot counts** in `.env`:
   ```env
   ELECTION_BOTS=500
   ELIGIBLE_VOTER_BOTS=15000
   INELIGIBLE_VOTER_BOTS=5000
   ```

2. **Increase funding**:
   - Need ~200 ETH for 20,000 wallets
   - Request from multiple faucets
   - Or use faucet drip services

3. **Adjust performance settings**:
   ```env
   MAX_CONCURRENT_OPERATIONS=20
   BATCH_SIZE=100
   ```

4. **Run in phases**:
   ```bash
   # Phase 1: Create elections
   node src/orchestrator.js --elections-only
   
   # Phase 2: Run voting (split into batches)
   node src/orchestrator.js --voting-only
   ```

## 🎉 What's Next?

After successful testing:

1. ✅ Analyze results and logs
2. ✅ Identify bottlenecks
3. ✅ Optimize contract gas usage
4. ✅ Improve API response times
5. ✅ Fix any bugs found
6. ✅ Test on other networks (Base, SEI, ETH)
7. ✅ Scale up to maximum capacity
8. ✅ Ready for production deployment!

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Support

For issues or questions:
- Check logs first
- Review troubleshooting guide
- Contact: SafeVote Team

---

**Happy Testing! 🚀**


# 1. Test connection
node scripts/check-balances.js

# Should show: Balance: 70.0 SEI ✅

# 2. Fund wallets
node scripts/batch-fund.js

# 3. Create elections
node src/orchestrator.js --elections-only

# 4. Run voting
node src/orchestrator.js --voting-only


# Check results
node scripts/check-balances.js

node scripts/fund-wallets.js --generate

# Basic re-vote
node scripts/revote.js

# Vote in active elections only
node scripts/revote.js --active-only

# Vote in specific election
node scripts/revote.js --election elec-de471849-ee51-4fc7-8860-ee0a722ea8ab

# Use fewer bots for testing
node scripts/revote.js --voters 50

# Include security tests
node scripts/revote.js --security-test

### Scenario 2: Vote in Active Elections Only

```bash
node scripts/revote.js --active-only
```

**Best for:** Ongoing elections (filters out ended ones)


### Scenario 4: Small Test with Few Voters

```bash
node scripts/revote.js --voters 10 --active-only
```

**Best for:** Quick verification after code changes

---

## 📝 Logging & Monitoring

### Watch Logs in Real-Time

```bash
# All activity
tail -f logs/combined.log

# Just voting
tail -f logs/voting.log

# Just errors
tail -f logs/errors.log

# Count successful votes
grep "Vote confirmed" logs/voting.log | wc -l
```

---

### Check Vote Count on Blockchain

```bash
# Use verify script
node scripts/verify-onchain.js elec-abc123...

# Look for "Votes Cast: X"
```

---

## 🚨 Troubleshooting

### Issue: "No elections available for voting"

**Cause:** No elections in database or all ended

**Fix:**
```bash
# Check database
curl https://blockballot-results-server.onrender.com/api/elections

# If empty, create elections first
node src/orchestrator.js --elections-only
```

---

### Issue: All votes failing

**Cause:** Empty votes array (the issue we just fixed!)

**Fix:**
1. Apply the fixes to `eligibleVoter.js`, `orchestrator.js`
2. Make sure elections have positions
3. Check logs show "Positions found: X"

---

### Issue: "Voter not eligible"

**Cause:** Voter address not in election's Merkle tree

**Fix:** This is **expected** for some bots! Only 75% of bots are added as eligible voters. The other 25% should fail (that's the security test).

---

### Issue: "Already voted"

**Cause:** Voter voted in a previous run

**Fix:** This is **expected** when re-voting! Each voter can only vote once per election. If you want fresh votes, create new elections.

---

## 💡 Pro Tips

### Tip 1: Start Small

When testing fixes, start with a small test:
```bash
node scripts/revote.js --voters 5 --election elec-abc123...
```

Once that works, scale up!

---

### Tip 2: Monitor Gas Usage

```bash
# Track total gas used
grep "Gas used:" logs/voting.log | awk '{sum+=$NF} END {print sum}'
```

---

### Tip 3: Check Success Rate

If success rate is < 50%, something is wrong:
```bash
# Count successful
grep "Vote confirmed" logs/voting.log | wc -l

# Count failed
grep "Vote failed" logs/voting.log | wc -l
```

---

### Tip 4: Verify on Arbiscan

Pick a transaction hash from logs and check on:
https://sepolia.arbiscan.io/tx/0x...

Should show **success** with green checkmark!

---

## 🎯 Quick Decision Tree

**Want to...**
- ✅ Vote in all elections? → `node src/orchestrator.js --voting-only`
- ✅ Vote in active elections only? → `node scripts/revote.js --active-only`
- ✅ Vote in one election? → `node scripts/revote.js --election <uuid>`
- ✅ Test with few bots? → `node scripts/revote.js --voters 10`
- ✅ Test security? → `node scripts/revote.js --security-test`

---

## 📈 Expected Performance

**Small Test** (10 voters, 1 election):
- Duration: ~2 minutes
- Success rate: 80-90%

**Medium Test** (100 voters, 5 elections):
- Duration: ~15 minutes
- Success rate: 75-85%

**Full Test** (750 voters, 50 elections):
- Duration: 2-4 hours
- Success rate: 70-80%

---

## ✅ After Voting

Check your results:
1. Review logs for errors
2. Check transaction on Arbiscan
3. Verify vote count in database
4. Check success rate statistics

Your bots are now voting! 🎉

# Use the election ID from your logs
node scripts/verify-onchain.js elec-de471849-ee51-4fc7-8860-ee0a722ea8ab

# Copy debug script to your project
   # Then run with an election ID and voter address from your logs
   node scripts/debug-merkle.js elec-de471849-ee51-4fc7-8860-ee0a722ea8ab 0xa4c6907dc6C7f6e7728f2a94294f05EC47c4b0B4

   