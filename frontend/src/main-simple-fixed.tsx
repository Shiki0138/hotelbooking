import React from 'react';
import ReactDOM from 'react-dom/client';
import SimpleHotelApp from './SimpleHotelApp';

// エラーハンドリング
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('Starting Simple Hotel App...');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(<SimpleHotelApp />);