// src/utils/logger.js
// Comprehensive logging system with file and console output

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { BOT_CONFIG } = require('../../config/bot-config');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output with colors
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const ts = chalk.gray(timestamp);
  let levelColor;

  switch (level) {
    case 'error':
      levelColor = chalk.red.bold(level.toUpperCase());
      break;
    case 'warn':
      levelColor = chalk.yellow.bold(level.toUpperCase());
      break;
    case 'info':
      levelColor = chalk.blue.bold(level.toUpperCase());
      break;
    case 'debug':
      levelColor = chalk.magenta(level.toUpperCase());
      break;
    default:
      levelColor = level.toUpperCase();
  }

  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${ts} ${levelColor} ${message}${metaStr}`;
});

// Create winston logger
const logger = winston.createLogger({
  level: BOT_CONFIG.logging.level || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
      )
    }),

    // Main log file (all logs)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'errors.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),

    // Elections log file
    new winston.transports.File({
      filename: path.join(logsDir, 'elections.log'),
      level: 'info',
      maxsize: 5242880,
      maxFiles: 3
    }),

    // Voting log file
    new winston.transports.File({
      filename: path.join(logsDir, 'voting.log'),
      level: 'info',
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// Helper methods for structured logging

logger.election = {
  created: (electionId, botIndex, data) => {
    logger.info('Election created', {
      type: 'election_created',
      electionId,
      botIndex,
      title: data.title,
      positions: data.positions?.length,
      totalVoters: data.totalVoters
    });
  },

  deployed: (electionId, chainId, txHash) => {
    logger.info('Election deployed', {
      type: 'election_deployed',
      electionId,
      chainId,
      txHash
    });
  },

  failed: (electionId, botIndex, error) => {
    logger.error('Election creation failed', {
      type: 'election_failed',
      electionId,
      botIndex,
      error: error.message
    });
  }
};

logger.vote = {
  cast: (electionId, voterAddress, positionVotes) => {
    logger.info('Vote cast', {
      type: 'vote_cast',
      electionId,
      voterAddress,
      positions: positionVotes.length
    });
  },

  confirmed: (electionId, voterAddress, txHash) => {
    logger.info('Vote confirmed', {
      type: 'vote_confirmed',
      electionId,
      voterAddress,
      txHash
    });
  },

  failed: (electionId, voterAddress, error, isEligible) => {
    const logLevel = isEligible ? 'error' : 'warn';
    logger[logLevel]('Vote failed', {
      type: 'vote_failed',
      electionId,
      voterAddress,
      isEligible,
      error: error.message
    });
  },

  retrying: (electionId, voterAddress, attempt, maxAttempts) => {
    logger.warn('Vote retry', {
      type: 'vote_retry',
      electionId,
      voterAddress,
      attempt,
      maxAttempts
    });
  }
};

logger.wallet = {
  generated: (count, type) => {
    logger.info('Wallets generated', {
      type: 'wallets_generated',
      count,
      walletType: type
    });
  },

  funded: (address, amount, txHash) => {
    logger.debug('Wallet funded', {
      type: 'wallet_funded',
      address,
      amount,
      txHash
    });
  },

  fundingFailed: (address, error) => {
    logger.error('Wallet funding failed', {
      type: 'wallet_funding_failed',
      address,
      error: error.message
    });
  }
};

logger.monitor = {
  progress: (stage, current, total, percentage) => {
    logger.info('Progress update', {
      type: 'progress',
      stage,
      current,
      total,
      percentage: `${percentage.toFixed(1)}%`
    });
  },

  stats: (stats) => {
    logger.info('Statistics', {
      type: 'stats',
      ...stats
    });
  }
};

// Helper to log with context
logger.withContext = (context) => {
  return {
    info: (message, meta = {}) => logger.info(message, { ...context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { ...context, ...meta }),
    error: (message, meta = {}) => logger.error(message, { ...context, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { ...context, ...meta })
  };
};

// Pretty print separator
logger.separator = (char = '=', length = 60) => {
  logger.info(char.repeat(length));
};

// Pretty print header
logger.header = (text) => {
  logger.separator();
  logger.info(chalk.cyan.bold(`  ${text}`));
  logger.separator();
};

module.exports = logger;