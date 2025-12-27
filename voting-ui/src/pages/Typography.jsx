import React from 'react';
import { Type, Hash, Quote, List, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Typography = () => {
  const navigate = useNavigate();
  return (
    <div className="typography-page">
      {/* Page Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Typography</h1>
          <p className="page-subtitle">Design system and text styles showcase</p>
        </div>
      </div>

      {/* Headings Card */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">
            <Type size={20} style={{ marginRight: '0.5rem' }} />
            Headings
          </h2>
        </div>
        <div className="typo-section">
          <div className="typo-item">
            <h1 className="typo-sample">The quick brown fox jumps over the lazy dog</h1>
            <code className="typo-code">h1 - Heading 1 (2rem / 32px)</code>
          </div>
          <div className="typo-item">
            <h2 className="typo-sample">The quick brown fox jumps over the lazy dog</h2>
            <code className="typo-code">h2 - Heading 2 (1.75rem / 28px)</code>
          </div>
          <div className="typo-item">
            <h3 className="typo-sample">The quick brown fox jumps over the lazy dog</h3>
            <code className="typo-code">h3 - Heading 3 (1.5rem / 24px)</code>
          </div>
          <div className="typo-item">
            <h4 className="typo-sample">The quick brown fox jumps over the lazy dog</h4>
            <code className="typo-code">h4 - Heading 4 (1.25rem / 20px)</code>
          </div>
          <div className="typo-item">
            <h5 className="typo-sample">The quick brown fox jumps over the lazy dog</h5>
            <code className="typo-code">h5 - Heading 5 (1.125rem / 18px)</code>
          </div>
          <div className="typo-item">
            <h6 className="typo-sample">The quick brown fox jumps over the lazy dog</h6>
            <code className="typo-code">h6 - Heading 6 (1rem / 16px)</code>
          </div>
        </div>
      </div>

      {/* Paragraphs Card */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">
            <Hash size={20} style={{ marginRight: '0.5rem' }} />
            Paragraphs
          </h2>
        </div>
        <div className="typo-section">
          <p className="typo-paragraph">
            I will be the leader of a company that ends up being worth billions of dollars, 
            because I got the answers. I understand culture. I am the nucleus. I think that's a 
            responsibility that I have, to push possibilities, to show people, this is the level 
            that things could be at.
          </p>
          <p className="typo-paragraph text-secondary">
            I will be the leader of a company that ends up being worth billions of dollars, 
            because I got the answers. I understand culture. I am the nucleus. I think that's a 
            responsibility that I have, to push possibilities, to show people, this is the level 
            that things could be at. (Secondary Text)
          </p>
          <p className="typo-paragraph small">
            I will be the leader of a company that ends up being worth billions of dollars, 
            because I got the answers. I understand culture. I am the nucleus. (Small Text)
          </p>
        </div>
      </div>

      {/* Quotes Card */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">
            <Quote size={20} style={{ marginRight: '0.5rem' }} />
            Quotes
          </h2>
        </div>
        <div className="typo-section">
          <blockquote className="typo-quote">
            "I will be the leader of a company that ends up being worth billions of dollars, 
            because I got the answers. I understand culture. I am the nucleus. I think that's a 
            responsibility that I have, to push possibilities, to show people, this is the level 
            that things could be at."
            <footer>— Kanye West, Musician</footer>
          </blockquote>
        </div>
      </div>

      {/* Lists Card */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">
            <List size={20} style={{ marginRight: '0.5rem' }} />
            Lists
          </h2>
        </div>
        <div className="typo-section">
          <div className="typo-lists">
            <div className="typo-list-section">
              <h4>Unordered List</h4>
              <ul className="typo-list">
                <li>Blockchain voting platform</li>
                <li>Secure and transparent elections</li>
                <li>Multi-chain support
                  <ul>
                    <li>Ethereum Sepolia</li>
                    <li>Arbitrum Sepolia</li>
                    <li>Base Sepolia</li>
                  </ul>
                </li>
                <li>Real-time results</li>
              </ul>
            </div>
            <div className="typo-list-section">
              <h4>Ordered List</h4>
              <ol className="typo-list">
                <li>Connect your wallet</li>
                <li>Browse available elections</li>
                <li>Verify your voter key</li>
                <li>Cast your vote securely</li>
                <li>View confirmation on-chain</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

            <div className="footer-container">
        <div className="footer-section">
          <h4>BlockBallot</h4>
          <p>
            BlockBallot uses blockchain to finalize votes, while a backend coordinates voter </p>
          <p>  participation to ensure one-vote-per-election across multiple chains.
          </p>
          <p className="footer-tagline">Making democracy transparent and accessible</p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li>
              <button onClick={() => navigate('/elections')} className="footer-link-button">
                Browse Elections
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/voting')} className="footer-link-button">
                How It Works
              </button>
            </li>
            <li>
              <a href="https://sepolia.arbiscan.io" target="_blank" rel="noopener noreferrer">
                Block Explorer ↗
              </a>
            </li>
            <li>
              <a href="https://docs.arbitrum.io" target="_blank" rel="noopener noreferrer">
                Arbitrum Docs ↗
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Security</h4>
          <ul className="footer-features">
            <li>🔒 End-to-end verifiable voting</li>
            <li>⛓️ Tamper-resistant, blockchain-finalized voting</li>
            <li>🛡️ Merkle proof secured</li>
            <li>🔐 Anonymous voting option</li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Network Status</h4>
          <div className="network-status">
            <span className="network-badge">
              <span className="network-dot"></span>
              Arbitrum Sepolia Testnet
            </span>
            <p className="network-info">Chain ID: 421614</p>
          </div>
        </div>
      </div>

      {/* Code Card */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">
            <Code size={20} style={{ marginRight: '0.5rem' }} />
            Code Blocks
          </h2>
        </div>
        <div className="typo-section">
          <p className="typo-paragraph">Inline code: <code className="inline-code">const vote = await contract.castVote()</code></p>
          
          <pre className="code-block">
            <code>{`// Cast vote example
const castVote = async (electionId, votes) => {
  const tx = await contract.vote(
    electionId,
    voterKey,
    merkleProof,
    votes,
    delegateAddress
  );
  
  const receipt = await tx.wait();
  return receipt.transactionHash;
};`}</code>
          </pre>
        </div>
      </div>

      {/* Colors Card */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">Color Palette</h2>
        </div>
        <div className="color-grid">
          <div className="color-item">
            <div className="color-swatch" style={{ background: 'var(--primary)' }}></div>
            <div className="color-info">
              <p className="color-name">Primary</p>
              <code>#8b5cf6</code>
            </div>
          </div>
          <div className="color-item">
            <div className="color-swatch" style={{ background: 'var(--success)' }}></div>
            <div className="color-info">
              <p className="color-name">Success</p>
              <code>#10b981</code>
            </div>
          </div>
          <div className="color-item">
            <div className="color-swatch" style={{ background: 'var(--warning)' }}></div>
            <div className="color-info">
              <p className="color-name">Warning</p>
              <code>#f59e0b</code>
            </div>
          </div>
          <div className="color-item">
            <div className="color-swatch" style={{ background: 'var(--danger)' }}></div>
            <div className="color-info">
              <p className="color-name">Danger</p>
              <code>#ef4444</code>
            </div>
          </div>
          <div className="color-item">
            <div className="color-swatch" style={{ background: 'var(--info)' }}></div>
            <div className="color-info">
              <p className="color-name">Info</p>
              <code>#3b82f6</code>
            </div>
          </div>
          <div className="color-item">
            <div className="color-swatch" style={{ background: 'var(--dark-bg)' }}></div>
            <div className="color-info">
              <p className="color-name">Dark BG</p>
              <code>#1a1a2e</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Typography;