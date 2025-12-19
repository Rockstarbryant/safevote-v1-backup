import React, { useState } from 'react';

const VoterKeyGenerator = () => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="voter-key-help">
      <button 
        onClick={() => setShowHelp(!showHelp)}
        className="help-toggle"
      >
        ❓ Don't have a voter key?
      </button>

      {showHelp && (
        <div className="help-content">
          <h4>How to Get Your Voter Key</h4>
          <ol>
            <li>
              <strong>From Election Organizer:</strong> The election organizer 
              should have provided you with a unique 64-character hexadecimal voter key.
            </li>
            <li>
              <strong>Check Your Email:</strong> Look for an email from the election 
              organizer containing your voter key.
            </li>
            <li>
              <strong>Secure Storage:</strong> Never share your voter key with anyone. 
              It can only be used once.
            </li>
          </ol>

          <div className="key-format-info">
            <h5>Key Format Example:</h5>
            <code>
              0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
            </code>
            <p className="format-note">
              64 hexadecimal characters (0-9, a-f) prefixed with "0x"
            </p>
          </div>

          <div className="security-tips">
            <h5>Security Tips:</h5>
            <ul>
              <li>✓ Keep your voter key private</li>
              <li>✓ Only use it on the official voting site</li>
              <li>✓ Each key can only be used once</li>
              <li>✓ Do not screenshot or share your key</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoterKeyGenerator;