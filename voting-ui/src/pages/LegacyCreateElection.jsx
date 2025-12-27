// src/pages/LegacyCreateElection.jsx

import React, { useEffect } from 'react';

const LegacyCreateElection = () => {
  useEffect(() => {
    // Hide Header, Footer, and remove main content padding
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    const mainContent = document.querySelector('.main-content');

    if (header) header.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (mainContent) {
      mainContent.style.padding = '0';
      mainContent.style.minHeight = '100vh';
    }

    // Cleanup: restore everything when leaving the page
    return () => {
      if (header) header.style.display = '';
      if (footer) footer.style.display = '';
      if (mainContent) {
        mainContent.style.padding = '';
        mainContent.style.minHeight = '';
      }
    };
  }, []);

  return (
    <iframe
      src="/BlockBallotv1.html"
      title="Legacy Create Election"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block',
      }}
      sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-top-navigation allow-downloads"
    />
  );
};

export default LegacyCreateElection;