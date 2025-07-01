// Service Worker Manager with version checking and update handling
class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.updateCheckInterval = 60 * 60 * 1000; // 1 hour
    this.currentVersion = null;
  }

  // Initialize service worker
  async init() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    // Skip service worker in development with Vite
    if (import.meta.env.DEV) {
      console.log('Service Worker disabled in development mode');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw-improved.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully');

      // Check for updates immediately
      await this.checkForUpdates();

      // Set up update checking interval
      setInterval(() => this.checkForUpdates(), this.updateCheckInterval);

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');
        this.handleControllerChange();
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', event => {
        this.handleServiceWorkerMessage(event);
      });

      // Check version
      await this.checkVersion();

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  // Check for service worker updates
  async checkForUpdates() {
    if (!this.registration) return;

    try {
      await this.registration.update();
      console.log('Checked for Service Worker updates');
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }

  // Handle controller change
  handleControllerChange() {
    // Show update notification to user
    this.showUpdateNotification();
  }

  // Handle messages from service worker
  handleServiceWorkerMessage(event) {
    const { data } = event;

    if (data.type === 'SERVICE_WORKER_UPDATED') {
      console.log(`Service Worker updated to version ${data.version}`);
      this.currentVersion = data.version;
      
      // Clear old caches in localStorage/sessionStorage if needed
      this.clearOldApplicationCaches();
    }
  }

  // Check current service worker version
  async checkVersion() {
    if (!navigator.serviceWorker.controller) return;

    const messageChannel = new MessageChannel();
    
    return new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        this.currentVersion = event.data.version;
        console.log(`Current Service Worker version: ${this.currentVersion}`);
        resolve(event.data.version);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  }

  // Show update notification
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'sw-update-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4A5568;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 10000;
      ">
        <span>新しいバージョンが利用可能です</span>
        <button onclick="window.location.reload()" style="
          background: #667EEA;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">更新</button>
        <button onclick="this.parentElement.remove()" style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">後で</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 30 seconds
    setTimeout(() => {
      notification.remove();
    }, 30000);
  }

  // Clear old application caches
  clearOldApplicationCaches() {
    // Clear session storage
    const keysToKeep = ['user_preferences', 'auth_token'];
    const sessionKeys = Object.keys(sessionStorage);
    
    sessionKeys.forEach(key => {
      if (!keysToKeep.includes(key) && key.startsWith('cache_')) {
        sessionStorage.removeItem(key);
      }
    });

    console.log('Cleared old application caches');
  }

  // Force update service worker
  async forceUpdate() {
    if (!this.registration || !this.registration.waiting) {
      console.log('No service worker waiting to activate');
      return;
    }

    // Tell waiting service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload once the new service worker has taken control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  // Unregister service worker (for debugging)
  async unregister() {
    if (!this.registration) return;

    try {
      const success = await this.registration.unregister();
      if (success) {
        console.log('Service Worker unregistered successfully');
        this.registration = null;
      }
    } catch (error) {
      console.error('Failed to unregister service worker:', error);
    }
  }

  // Get cache statistics
  async getCacheStats() {
    if (!('caches' in window)) return null;

    try {
      const cacheNames = await caches.keys();
      const stats = {
        caches: [],
        totalSize: 0
      };

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        stats.caches.push({
          name: cacheName,
          entries: requests.length
        });
      }

      // Estimate storage usage
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        stats.usage = estimate.usage;
        stats.quota = estimate.quota;
        stats.percentage = (estimate.usage / estimate.quota) * 100;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get cache statistics:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new ServiceWorkerManager();