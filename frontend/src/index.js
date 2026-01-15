import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Add spinner animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin { 
    to { transform: rotate(360deg); } 
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    background-color: #f8fafc;
  }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);