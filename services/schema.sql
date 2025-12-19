-- SafeVote Cross-Chain Vote Tracker Database Schema
-- Run this after creating the database

-- Create elections table
CREATE TABLE IF NOT EXISTS elections (
  id VARCHAR(66) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  creator VARCHAR(42) NOT NULL,
  merkle_root VARCHAR(66) NOT NULL,
  start_time BIGINT NOT NULL,
  end_time BIGINT NOT NULL,
  total_voters INT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  allow_anonymous BOOLEAN DEFAULT FALSE,
  allow_delegation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_creator (creator),
  INDEX idx_start_time (start_time),
  INDEX idx_end_time (end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id VARCHAR(66) NOT NULL,
  voter_address VARCHAR(42) NOT NULL,
  voter_key_hash VARCHAR(66) NOT NULL,
  chain_id INT NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_voter (election_id, voter_address),
  INDEX idx_election (election_id),
  INDEX idx_voter (voter_address),
  INDEX idx_chain (chain_id),
  CONSTRAINT fk_election 
    FOREIGN KEY (election_id) 
    REFERENCES elections(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create voter_keys table
CREATE TABLE IF NOT EXISTS voter_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id VARCHAR(66) NOT NULL,
  voter_id VARCHAR(32) NOT NULL,
  voter_address VARCHAR(42) NOT NULL,
  voter_key VARCHAR(66) NOT NULL,
  key_hash VARCHAR(66) NOT NULL,
  distributed BOOLEAN DEFAULT FALSE,
  distributed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_key (election_id, voter_key),
  INDEX idx_election_voter (election_id, voter_address),
  INDEX idx_distributed (distributed),
  CONSTRAINT fk_voter_election 
    FOREIGN KEY (election_id) 
    REFERENCES elections(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create delegations table
CREATE TABLE IF NOT EXISTS delegations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id VARCHAR(66) NOT NULL,
  delegator_address VARCHAR(42) NOT NULL,
  delegate_address VARCHAR(42) NOT NULL,
  chain_id INT NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  delegated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_delegation (election_id, delegator_address),
  INDEX idx_election (election_id),
  INDEX idx_delegator (delegator_address),
  INDEX idx_delegate (delegate_address),
  CONSTRAINT fk_delegation_election 
    FOREIGN KEY (election_id) 
    REFERENCES elections(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create results cache table (optional, for performance)
CREATE TABLE IF NOT EXISTS results_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id VARCHAR(66) NOT NULL,
  position_index INT NOT NULL,
  candidate_index INT NOT NULL,
  vote_count INT NOT NULL DEFAULT 0,
  chain_id INT NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_result (election_id, position_index, candidate_index, chain_id),
  INDEX idx_election_position (election_id, position_index),
  CONSTRAINT fk_results_election 
    FOREIGN KEY (election_id) 
    REFERENCES elections(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample data (optional, for testing)
-- You can delete this section if you don't want sample data
/*
INSERT INTO elections (id, title, description, location, creator, merkle_root, start_time, end_time, total_voters, is_public) 
VALUES (
  '0x1234567890123456789012345678901234567890123456789012345678901234',
  'Test Election',
  'This is a test election',
  'Test Location',
  '0x0000000000000000000000000000000000000000',
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  UNIX_TIMESTAMP(NOW()),
  UNIX_TIMESTAMP(DATE_ADD(NOW(), INTERVAL 7 DAY)),
  100,
  TRUE
);
*/