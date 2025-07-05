import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AccessibilityProvider } from './utils/accessibility/AccessibilityManager';
import PerformanceOptimizer from './utils/performance/PerformanceOptimizer';
import viteSwManager from './utils/sw-vite-manager.js';
import App from './App';
import './index.css';
import './i18n';

// Initialize performance optimization
PerformanceOptimizer.init();

// Enhanced Service Worker initialization with Vite compatibility
console.log('🔧 Initializing Service Worker with Vite compatibility...');
console.log('Environment:', import.meta.env.MODE);
console.log('SW Manager Status:', viteSwManager.getStatus());

// Initialize API connection testing
import './utils/api-connection-test';

// Initialize axios configuration
import './config/axios';

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
    <Provider store={store}>
      <AccessibilityProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AccessibilityProvider>
    </Provider>
  </React.StrictMode>
);