// Example of App.jsx integration with Service Worker Manager
import React, { useEffect } from 'react';
import serviceWorkerManager from './utils/serviceWorkerManager';

function App() {
  useEffect(() => {
    // Initialize service worker
    serviceWorkerManager.init();

    // Optional: Add debug info in development
    if (import.meta.env.DEV) {
      window.swManager = serviceWorkerManager;
      console.log('Service Worker Manager available as window.swManager');
    }
  }, []);

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  );
}

export default App;