// config/bot-config.js
// Bot behavior configuration and scaling settings

require('dotenv').config();

/**
 * Parse environment variable as integer with fallback
 */
const getInt = (key, defaultValue) => {
  const value = process.env[key];
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse environment variable as float with fallback
 */
const getFloat = (key, defaultValue) => {
  const value = process.env[key];
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const BOT_CONFIG = {
  // Bot counts (adjustable for scaling)
  counts: {
    electionCreators: getInt('ELECTION_BOTS', 50),
    eligibleVoters: getInt('ELIGIBLE_VOTER_BOTS', 750),
    ineligibleVoters: getInt('INELIGIBLE_VOTER_BOTS', 250),
    totalVoters: function() {
      return this.eligibleVoters + this.ineligibleVoters;
    }
  },

  // Eligible voter percentage (how many voters get registered)
  eligiblePercentage: getFloat('ELIGIBLE_VOTER_PERCENTAGE', 0.75),

  // Timing configuration (milliseconds)
  timing: {
    processDelay: getInt('PROCESS_DELAY', 60000),           // 1 minute
    retryDelayMin: getInt('RETRY_DELAY_MIN', 300000),       // 5 minutes
    retryDelayMax: getInt('RETRY_DELAY_MAX', 420000),       // 7 minutes
    requestDelay: getInt('REQUEST_DELAY', 2000),            // 2 seconds
    txTimeout: getInt('TX_TIMEOUT', 120000),                // 2 minutes
    verificationTimeout: 30000,                              // 30 seconds (fixed)
    votingDelayMin: 120000,                                  // 2 minutes
    votingDelayMax: 300000                                   // 5 minutes
  },

  // Election configuration
  election: {
    durationMin: getInt('ELECTION_DURATION_MIN', 172800),   // 2 days (seconds)
    durationMax: getInt('ELECTION_DURATION_MAX', 259200),   // 3 days (seconds)
    positionsMin: 2,
    positionsMax: 5,
    candidatesMin: 2,
    candidatesMax: 6,
    startDelayMin: 300,                                      // 5 minutes after creation
    startDelayMax: 600                                       // 10 minutes after creation
  },

  // Rate limiting & performance
  performance: {
    maxConcurrent: getInt('MAX_CONCURRENT_OPERATIONS', 10),
    maxRetries: getInt('MAX_RETRIES', 3),
    batchSize: getInt('BATCH_SIZE', 50)
  },

  // Gas configuration
  gas: {
    priceMultiplier: getFloat('GAS_PRICE_MULTIPLIER', 1.2),
    electionLimit: getInt('ELECTION_GAS_LIMIT', 800000),
    voteLimit: getInt('VOTE_GAS_LIMIT', 500000),
    walletFunding: getFloat('BOT_WALLET_FUNDING', 0.01)      // ETH per wallet
  },

  // Logging & monitoring
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    verbose: process.env.VERBOSE_LOGGING === 'true',
    enableMonitor: process.env.ENABLE_MONITOR !== 'false',
    saveReports: process.env.SAVE_REPORTS !== 'false'
  },

  // Advanced options
  options: {
    skipWalletGeneration: process.env.SKIP_WALLET_GENERATION === 'true',
    skipFunding: process.env.SKIP_FUNDING === 'true',
    autoCleanup: process.env.AUTO_CLEANUP === 'true',
    dryRun: process.env.DRY_RUN === 'true'
  }
};

/**
 * Election title templates
 */
const ELECTION_TITLES = [
  'Student Council Election',
  'Faculty Board Selection',
  'Community Leadership Vote',
  'Department Representative Election',
  'Annual Board Election',
  'Executive Committee Selection',
  'Club President Election',
  'Class Representative Vote',
  'Organization Leadership',
  'Team Captain Selection'
];

/**
 * Position titles
 */
const POSITIONS = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Public Relations Officer',
  'Events Coordinator',
  'Technical Lead',
  'Communications Director',
  'Operations Manager',
  'Membership Chair'
];

/**
 * Candidate name generation helpers
 */
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen'
];

/**
 * Location templates
 */
const LOCATIONS = [
  'Stanford University, CA',
  'MIT, Cambridge, MA',
  'Harvard University, MA',
  'UC Berkeley, CA',
  'Columbia University, NY',
  'Princeton University, NJ',
  'Yale University, CT',
  'University of Chicago, IL',
  'Northwestern University, IL',
  'Duke University, NC'
];

/**
 * Get random item from array
 */
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random election data
 */
function generateElectionData(botIndex) {
  const now = Math.floor(Date.now() / 1000);
  const config = BOT_CONFIG.election;

  // Random delays
  const startDelay = randomInt(config.startDelayMin, config.startDelayMax);
  const duration = randomInt(config.durationMin, config.durationMax);

  // Generate positions
  const numPositions = randomInt(config.positionsMin, config.positionsMax);
  const positions = [];

  for (let i = 0; i < numPositions; i++) {
    const numCandidates = randomInt(config.candidatesMin, config.candidatesMax);
    const candidates = [];

    for (let j = 0; j < numCandidates; j++) {
      candidates.push(`${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`);
    }

    positions.push({
      title: POSITIONS[i % POSITIONS.length],
      candidates,
      maxSelections: 1
    });
  }

  return {
    title: `Test Election #${botIndex + 1} - ${randomItem(ELECTION_TITLES)} ${new Date().getFullYear()}`,
    description: `Automated test election for system verification. This election contains ${numPositions} positions with a total of ${positions.reduce((sum, p) => sum + p.candidates.length, 0)} candidates.`,
    location: randomItem(LOCATIONS),
    startTime: now + startDelay,
    endTime: now + startDelay + duration,
    isPublic: true,
    allowAnonymous: Math.random() > 0.5,
    allowDelegation: Math.random() > 0.3,
    positions
  };
}

/**
 * Calculate required eligible voters for an election
 */
function calculateEligibleVoters() {
  return Math.floor(BOT_CONFIG.counts.totalVoters() * BOT_CONFIG.eligiblePercentage);
}

/**
 * Get random delay within retry window
 */
function getRetryDelay() {
  const { retryDelayMin, retryDelayMax } = BOT_CONFIG.timing;
  return randomInt(retryDelayMin, retryDelayMax);
}

/**
 * Get random voting delay (time before bot votes)
 */
function getVotingDelay() {
  const { votingDelayMin, votingDelayMax } = BOT_CONFIG.timing;
  return randomInt(votingDelayMin, votingDelayMax);
}

/**
 * Validate bot configuration
 */
function validateConfig() {
  const errors = [];

  if (BOT_CONFIG.counts.electionCreators < 1) {
    errors.push('Must have at least 1 election creator bot');
  }

  if (BOT_CONFIG.counts.totalVoters() < 10) {
    errors.push('Must have at least 10 total voter bots');
  }

  if (BOT_CONFIG.eligiblePercentage < 0.5 || BOT_CONFIG.eligiblePercentage > 1.0) {
    errors.push('Eligible voter percentage must be between 0.5 and 1.0');
  }

  if (BOT_CONFIG.gas.walletFunding < 0.00001) {
    errors.push('Wallet funding too low (minimum 0.00001 ETH)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  BOT_CONFIG,
  ELECTION_TITLES,
  POSITIONS,
  FIRST_NAMES,
  LAST_NAMES,
  LOCATIONS,
  randomItem,
  randomInt,
  generateElectionData,
  calculateEligibleVoters,
  getRetryDelay,
  getVotingDelay,
  validateConfig
};