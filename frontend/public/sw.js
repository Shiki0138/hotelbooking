// Service Worker for LMS Hotel Booking App
const CACHE_VERSION = 'v3'; // Update this when making changes
const CACHE_NAME = `lms-hotel-${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/favicon.ico'
];

// API routes to cache
const API_ROUTES = [
  '/api/hotels',
  '/api/search',
  '/api/popular'
];

// Install event - cache static files
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(STATIC_FILES);
      }),
      caches.open(API_CACHE)
    ])
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete all old version caches
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache with fallback strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Early return for non-HTTP(S) protocols
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return; // Let browser handle chrome-extension://, ws://, etc.
  }
  
  // Skip WebSocket connections (Vite HMR)
  if (request.headers.get('upgrade') === 'websocket') {
    return;
  }
  
  // Skip Vite development files and HMR - more comprehensive check
  if (url.pathname.startsWith('/@vite/') || 
      url.pathname.startsWith('/node_modules/') ||
      url.pathname.includes('.vite/deps/') ||
      url.pathname.includes('/@id/') ||
      url.pathname.includes('/@fs/') ||
      url.pathname.includes('.hot-update.') ||
      url.pathname.includes('/__vite_ping') ||
      url.pathname.includes('/__open-in-editor') ||
      url.pathname.includes('/src/') ||
      url.pathname.endsWith('.ts') ||
      url.pathname.endsWith('.tsx') ||
      url.pathname.endsWith('.jsx') ||
      url.pathname.endsWith('.vue') ||
      url.search.includes('?t=') || // Vite timestamp queries
      url.search.includes('?v=') || // Vite version queries
      url.search.includes('?import') || // Vite import queries
      url.search.includes('?worker') || // Vite worker queries
      url.search.includes('?url')) { // Vite URL queries
    return;
  }
  
  // Additional validation
  if (!isValidRequest(request)) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static files
  if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
    return;
  }

  // Handle other resources (images, CSS, JS)
  event.respondWith(handleResourceRequest(request));
});

// API request handler - Network first, then cache
async function handleApiRequest(request) {
  try {
    // Check storage quota periodically
    await checkStorageQuota();
    
    const cache = await caches.open(API_CACHE);
    await manageCacheCapacity(cache);
    
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && networkResponse.clone) {
      try {
        // Cache successful responses with proper error handling
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.warn('Cache storage failed:', cacheError);
      }
    }
    
    return networkResponse;
  } catch (networkError) {
    try {
      const cache = await caches.open(API_CACHE);
      // Fall back to cache
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        // Add header to indicate cached response
        const headers = new Headers(cachedResponse.headers);
        headers.set('X-Served-From', 'cache');
        
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers
        });
      }
    } catch (cacheError) {
      console.warn('Cache access failed:', cacheError);
    }
    
    // Return offline page for API failures
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'このデータはオフラインでは利用できません' 
      }), 
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Document request handler - Cache first, then network
async function handleDocumentRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    await manageCacheCapacity(cache);
    
    const cachedResponse = await cache.match('/');
    
    if (cachedResponse) {
      // Serve cached version immediately
      fetchAndUpdateCache(request, cache);
      return cachedResponse;
    }
    
    // If not cached, fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok && networkResponse.clone) {
      try {
        await cache.put('/', networkResponse.clone());
      } catch (cacheError) {
        console.warn('Document cache failed:', cacheError);
      }
    }
    return networkResponse;
  } catch (error) {
    // Return offline page
    return new Response(
      `<!DOCTYPE html>
       <html>
         <head>
           <title>オフライン - LastMinuteStay</title>
           <meta charset="UTF-8">
           <meta name="viewport" content="width=device-width, initial-scale=1.0">
           <style>
             body { 
               font-family: Inter, sans-serif; 
               text-align: center; 
               padding: 50px;
               background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
               color: white;
               min-height: 100vh;
               margin: 0;
               display: flex;
               flex-direction: column;
               justify-content: center;
               align-items: center;
             }
             .offline-container {
               background: rgba(255, 255, 255, 0.1);
               padding: 40px;
               border-radius: 16px;
               backdrop-filter: blur(10px);
               border: 1px solid rgba(255, 255, 255, 0.2);
             }
             h1 { font-size: 2.5rem; margin-bottom: 20px; }
             p { font-size: 1.2rem; margin-bottom: 30px; }
             button {
               background: rgba(255, 255, 255, 0.2);
               border: none;
               padding: 12px 24px;
               border-radius: 8px;
               color: white;
               font-size: 16px;
               cursor: pointer;
               transition: all 0.3s ease;
             }
             button:hover { background: rgba(255, 255, 255, 0.3); }
           </style>
         </head>
         <body>
           <div class="offline-container">
             <h1>🌐 オフライン</h1>
             <p>インターネット接続を確認してください</p>
             <button onclick="window.location.reload()">再試行</button>
           </div>
         </body>
       </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Resource request handler - Cache first with stale-while-revalidate
async function handleResourceRequest(request) {
  // Skip caching for non-HTTP(S) requests
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) {
    return fetch(request);
  }
  
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Serve cached version and update in background
    fetchAndUpdateCache(request, cache);
    return cachedResponse;
  }
  
  // If not cached, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && (url.protocol === 'http:' || url.protocol === 'https:')) {
      try {
        // Validate response before caching
        if (networkResponse.status === 200 && networkResponse.headers.get('content-length') !== '0') {
          await cache.put(request, networkResponse.clone());
        }
      } catch (cacheError) {
        console.warn('Resource cache failed:', cacheError.message);
        // Continue without caching
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Return placeholder for failed resources
    if (request.destination === 'image') {
      return new Response(
        `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
           <rect width="100%" height="100%" fill="#f0f0f0"/>
           <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">
             画像を読み込めません
           </text>
         </svg>`,
        {
          headers: { 'Content-Type': 'image/svg+xml' }
        }
      );
    }
    
    throw error;
  }
}

// Background cache update
async function fetchAndUpdateCache(request, cache) {
  try {
    // Validate request before attempting
    const url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return;
    }
    
    // Skip Vite-specific paths
    if (url.pathname.includes('.vite') || url.pathname.includes('/@')) {
      return;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok && networkResponse.status === 200) {
      try {
        // Only cache if we can clone the response
        const responseToCache = networkResponse.clone();
        await manageCacheCapacity(cache);
        await cache.put(request, responseToCache);
      } catch (cacheError) {
        console.warn('Background cache storage failed:', cacheError.message);
        // Don't throw, just log and continue
      }
    }
  } catch (error) {
    // Silent fail for background updates - don't disrupt main thread
    console.warn('Background update skipped:', request.url, error.message);
  }
}

// Request validation function
function isValidRequest(request) {
  try {
    const url = new URL(request.url);
    
    // Double-check HTTP(S) only
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    
    // Skip data URLs, blob URLs
    if (request.url.startsWith('data:') || request.url.startsWith('blob:')) {
      return false;
    }
    
    // Check method validity
    const supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    if (!supportedMethods.includes(request.method)) {
      return false;
    }
    
    // Skip if request mode indicates it shouldn't be cached
    if (request.mode === 'websocket') {
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('Request validation failed:', error);
    return false;
  }
}

// Cache capacity management
async function manageCacheCapacity(cache) {
  try {
    const requests = await cache.keys();
    const maxEntries = 100; // Limit cache entries per cache
    
    if (requests.length >= maxEntries) {
      // Remove oldest entries (FIFO strategy)
      const entriesToRemove = requests.slice(0, Math.floor(maxEntries * 0.2));
      await Promise.all(entriesToRemove.map(request => 
        cache.delete(request).catch(err => 
          console.warn('Failed to delete cache entry:', err)
        )
      ));
    }
  } catch (error) {
    console.warn('Cache capacity management failed:', error);
  }
}

// Storage quota monitoring
async function checkStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usagePercentage = (estimate.usage / estimate.quota) * 100;
      
      if (usagePercentage > 80) {
        console.warn('Storage quota nearly exceeded:', usagePercentage.toFixed(1) + '%');
        await cleanupOldCaches();
      }
    } catch (error) {
      console.warn('Storage quota check failed:', error);
    }
  }
}

// Cleanup old/unused caches
async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    const activeCaches = [STATIC_CACHE, API_CACHE];
    
    const oldCaches = cacheNames.filter(name => !activeCaches.includes(name));
    
    await Promise.all(oldCaches.map(cacheName => 
      caches.delete(cacheName).catch(err => 
        console.warn('Failed to delete old cache:', cacheName, err)
      )
    ));
    
    if (oldCaches.length > 0) {
      console.log('Cleaned up', oldCaches.length, 'old caches');
    }
  } catch (error) {
    console.warn('Cache cleanup failed:', error);
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle offline bookings, form submissions, etc.
  const offlineActions = await getOfflineActions();
  
  for (const action of offlineActions) {
    try {
      await processOfflineAction(action);
      await removeOfflineAction(action.id);
    } catch (error) {
      console.error('Failed to sync offline action:', error);
    }
  }
}

async function getOfflineActions() {
  // Retrieve offline actions from IndexedDB
  return []; // Implementation depends on your offline storage strategy
}

async function processOfflineAction(action) {
  // Process the offline action (booking, search, etc.)
  return fetch(action.url, {
    method: action.method,
    headers: action.headers,
    body: action.body
  });
}

async function removeOfflineAction(actionId) {
  // Remove processed action from offline storage
  console.log('Removing offline action:', actionId);
}

// Push notification handler
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: [
      {
        action: 'view',
        title: '表示',
        icon: '/action-view.png'
      },
      {
        action: 'close',
        title: '閉じる'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});