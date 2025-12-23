import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App.jsx'; // App.jsx is in root
import '../index.css'; // Tailwind CSS file in root

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
