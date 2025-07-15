import React from 'react';
import ReactDOM from 'react-dom/client';
import NewApp from './NewApp';
import './index.css';

// Hide loader
const loader = document.getElementById('app-loader');
if (loader) {
  loader.style.display = 'none';
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <NewApp />
  </React.StrictMode>
);