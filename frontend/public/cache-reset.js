// Complete Cache Reset Script for LastMinuteStay
// Execute this directly in browser to clear all caches

(async function cacheReset() {
  console.log('🔧 LastMinuteStay Cache Reset Started');
  
  try {
    // 1. Clear all Service Worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('📦 Found caches:', cacheNames);
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('🗑️ Deleted cache:', cacheName);
      }
      console.log('✅ All Service Worker caches cleared');
    }
    
    // 2. Unregister all Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('🔧 Found Service Workers:', registrations.length);
      
      for (const registration of registrations) {
        await registration.unregister();
        console.log('🗑️ Unregistered Service Worker:', registration.scope);
      }
      console.log('✅ All Service Workers unregistered');
    }
    
    // 3. Clear IndexedDB
    if ('indexedDB' in window) {
      try {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
            console.log('🗑️ Deleted IndexedDB:', db.name);
          }
        }
        console.log('✅ IndexedDB cleared');
      } catch (e) {
        console.log('⚠️ IndexedDB clear failed:', e.message);
      }
    }
    
    // 4. Clear Local Storage
    if ('localStorage' in window) {
      const itemCount = localStorage.length;
      localStorage.clear();
      console.log(`🗑️ Cleared ${itemCount} localStorage items`);
    }
    
    // 5. Clear Session Storage
    if ('sessionStorage' in window) {
      const itemCount = sessionStorage.length;
      sessionStorage.clear();
      console.log(`🗑️ Cleared ${itemCount} sessionStorage items`);
    }
    
    // 6. Clear cookies for this domain
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    console.log('🗑️ Cleared cookies');
    
    // 7. Force refresh with cache bypass
    console.log('🔄 Cache reset complete! Reloading page...');
    console.log('✅ LastMinuteStay system ready for fresh start');
    
    // Show success message
    const successDiv = document.createElement('div');
    successDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: Arial, sans-serif;
        max-width: 300px;
      ">
        <h3 style="margin: 0 0 10px 0;">✅ Cache Reset Complete</h3>
        <p style="margin: 0;">All caches cleared successfully!</p>
        <p style="margin: 10px 0 0 0; font-size: 14px;">Reloading in 3 seconds...</p>
      </div>
    `;
    document.body.appendChild(successDiv);
    
    // Auto reload after 3 seconds
    setTimeout(() => {
      window.location.reload(true);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Cache reset failed:', error);
    
    // Show error message
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #f44336, #d32f2f);
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: Arial, sans-serif;
        max-width: 300px;
      ">
        <h3 style="margin: 0 0 10px 0;">❌ Cache Reset Error</h3>
        <p style="margin: 0; font-size: 14px;">${error.message}</p>
        <button onclick="location.reload(true)" style="
          margin-top: 10px;
          padding: 8px 16px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          border-radius: 4px;
          cursor: pointer;
        ">Manual Reload</button>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }
})();

// Additional diagnostic function
window.cacheDiagnostic = async function() {
  console.log('🔍 Cache Diagnostic Report:');
  
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log('Cache Storage:', cacheNames);
  }
  
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('Service Workers:', registrations.map(r => r.scope));
  }
  
  console.log('Local Storage items:', localStorage.length);
  console.log('Session Storage items:', sessionStorage.length);
  console.log('Cookies:', document.cookie);
};

console.log('🚀 LastMinuteStay Cache Reset Script Loaded');
console.log('📋 Usage: Simply load this script to auto-execute cache reset');
console.log('🔍 Run cacheDiagnostic() for current cache status');