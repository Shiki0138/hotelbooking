// Service Worker Manager for Vite Development Environment
// Handles conflicts between Vite HMR and Service Worker

class ViteServiceWorkerManager {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.serviceWorker = null;
    this.isRegistered = false;
  }

  async initialize() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    // In development mode, be more careful with SW registration
    if (this.isDevelopment) {
      console.log('🔧 Development mode detected - SW with Vite compatibility');
      await this.setupDevelopmentMode();
    } else {
      console.log('🚀 Production mode - Full SW registration');
      await this.setupProductionMode();
    }
  }

  async setupDevelopmentMode() {
    try {
      // Check if SW is already registered
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        console.log('🔄 Existing SW found, checking compatibility...');
        
        // Update the service worker if needed
        await registration.update();
        
        // Listen for messages from SW
        this.setupMessageHandling(registration);
        
        this.serviceWorker = registration;
        this.isRegistered = true;
      } else {
        // Register new service worker with development-friendly settings
        await this.registerServiceWorker();
      }

      // Setup Vite HMR compatibility
      this.setupViteCompatibility();
      
    } catch (error) {
      console.error('🚨 Development SW setup failed:', error);
      // Continue without SW in development
    }
  }

  async setupProductionMode() {
    try {
      await this.registerServiceWorker();
      this.setupPerformanceOptimizations();
    } catch (error) {
      console.error('🚨 Production SW setup failed:', error);
    }
  }

  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      console.log('✅ Service Worker registered:', registration.scope);
      
      this.serviceWorker = registration;
      this.isRegistered = true;
      
      // Setup update handling
      this.setupUpdateHandling(registration);
      
      // Setup message handling
      this.setupMessageHandling(registration);
      
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      throw error;
    }
  }

  setupViteCompatibility() {
    if (!this.isDevelopment) return;

    // Prevent SW from interfering with Vite HMR
    if (window.__vite_plugin_react_preamble_installed__) {
      console.log('🔥 Vite HMR detected - configuring SW compatibility');
    }

    // Listen for Vite updates and notify SW
    if (import.meta.hot) {
      import.meta.hot.on('vite:beforeUpdate', () => {
        this.notifyServiceWorker({
          type: 'VITE_UPDATE',
          timestamp: Date.now()
        });
      });

      import.meta.hot.on('vite:afterUpdate', () => {
        this.notifyServiceWorker({
          type: 'VITE_UPDATED',
          timestamp: Date.now()
        });
      });
    }

    // Override fetch for development to bypass SW for certain requests
    this.setupDevelopmentFetchOverride();
  }

  setupDevelopmentFetchOverride() {
    // Store original fetch
    const originalFetch = window.fetch;
    
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      
      // Bypass SW for Vite-specific requests
      if (this.shouldBypassServiceWorker(url)) {
        return originalFetch(input, init);
      }
      
      return originalFetch(input, init);
    };
  }

  shouldBypassServiceWorker(url) {
    const vitePatterns = [
      '/@vite/',
      '/node_modules/',
      '/__vite_ping',
      '/@fs/',
      '/@id/',
      '.hot-update.',
      '?t=',
      '?v=',
      '?import',
      '?worker',
      '?url'
    ];

    return vitePatterns.some(pattern => url.includes(pattern));
  }

  setupUpdateHandling(registration) {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (!newWorker) return;

      console.log('🔄 New Service Worker available');
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW is available, prompt for update
          this.promptForUpdate();
        }
      });
    });

    // Listen for controlling SW changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker controller changed');
      
      if (!this.isDevelopment) {
        // Reload page to use new SW (production only)
        window.location.reload();
      }
    });
  }

  setupMessageHandling(registration) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { data } = event;
      
      switch (data.type) {
        case 'CACHE_UPDATED':
          console.log('📦 Cache updated to version:', data.version);
          this.handleCacheUpdate(data);
          break;
          
        case 'OFFLINE_STATUS':
          console.log('🌐 Offline status:', data.offline);
          this.handleOfflineStatus(data.offline);
          break;
          
        case 'SW_ERROR':
          console.error('🚨 Service Worker error:', data.error);
          break;
          
        default:
          console.log('📨 SW message:', data);
      }
    });
  }

  setupPerformanceOptimizations() {
    // Preload critical resources
    this.preloadCriticalResources();
    
    // Setup background sync
    this.setupBackgroundSync();
  }

  async preloadCriticalResources() {
    const criticalResources = [
      '/api/hotels/popular',
      '/api/search/suggestions',
      '/manifest.json'
    ];

    for (const resource of criticalResources) {
      try {
        await fetch(resource);
        console.log('⚡ Preloaded:', resource);
      } catch (error) {
        console.warn('⚠️ Failed to preload:', resource, error);
      }
    }
  }

  setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      console.log('🔄 Background sync available');
      
      // Register for background sync when coming back online
      window.addEventListener('online', () => {
        this.registerBackgroundSync('background-sync');
      });
    }
  }

  async registerBackgroundSync(tag) {
    try {
      if (this.serviceWorker) {
        await this.serviceWorker.sync.register(tag);
        console.log('📤 Background sync registered:', tag);
      }
    } catch (error) {
      console.warn('⚠️ Background sync registration failed:', error);
    }
  }

  notifyServiceWorker(message) {
    if (this.serviceWorker && this.serviceWorker.active) {
      this.serviceWorker.active.postMessage(message);
    }
  }

  handleCacheUpdate(data) {
    // Show notification to user about cache update
    if (!this.isDevelopment) {
      this.showUpdateNotification(data.version);
    }
  }

  handleOfflineStatus(isOffline) {
    // Update UI to reflect offline status
    document.body.classList.toggle('offline', isOffline);
    
    // Dispatch custom event for components to listen
    window.dispatchEvent(new CustomEvent('offline-status', {
      detail: { offline: isOffline }
    }));
  }

  promptForUpdate() {
    // Show update prompt to user
    const updateBanner = document.createElement('div');
    updateBanner.className = 'sw-update-banner';
    updateBanner.innerHTML = `
      <div class="sw-update-content">
        <span>🔄 新しいバージョンが利用可能です</span>
        <button id="sw-update-btn">更新</button>
        <button id="sw-dismiss-btn">後で</button>
      </div>
    `;
    
    document.body.appendChild(updateBanner);
    
    document.getElementById('sw-update-btn').onclick = () => {
      this.activateNewServiceWorker();
      updateBanner.remove();
    };
    
    document.getElementById('sw-dismiss-btn').onclick = () => {
      updateBanner.remove();
    };
  }

  activateNewServiceWorker() {
    if (this.serviceWorker && this.serviceWorker.waiting) {
      this.serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  showUpdateNotification(version) {
    console.log(`✨ アプリが更新されました (v${version})`);
    
    // Could show a toast notification here
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('LastMinuteStay 更新完了', {
        body: `バージョン ${version} が利用可能になりました`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png'
      });
    }
  }

  // Public API methods
  async clearCache() {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🗑️ All caches cleared');
      }
      
      this.notifyServiceWorker({ type: 'CLEAR_CACHE' });
    } catch (error) {
      console.error('❌ Cache clear failed:', error);
    }
  }

  async checkForUpdates() {
    try {
      if (this.serviceWorker) {
        await this.serviceWorker.update();
        console.log('🔍 Checked for SW updates');
      }
    } catch (error) {
      console.error('❌ Update check failed:', error);
    }
  }

  getStatus() {
    return {
      registered: this.isRegistered,
      development: this.isDevelopment,
      controller: navigator.serviceWorker.controller ? 'active' : 'none',
      registration: this.serviceWorker ? 'available' : 'none'
    };
  }
}

// Create and export singleton instance
const swManager = new ViteServiceWorkerManager();

// Auto-initialize
swManager.initialize().catch(error => {
  console.error('🚨 SW Manager initialization failed:', error);
});

export default swManager;