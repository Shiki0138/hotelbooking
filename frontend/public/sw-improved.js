// Improved Service Worker with version management and Vite compatibility
const VERSION = '2.0.0';
const CACHE_PREFIX = 'lastminutestay';
const CACHE_NAME = `${CACHE_PREFIX}-v${VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-v${VERSION}`;
const API_CACHE = `${CACHE_PREFIX}-api-v${VERSION}`;

// Environment detection
const IS_DEVELOPMENT = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Files to cache immediately (production only)
const STATIC_FILES = IS_DEVELOPMENT ? [] : [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Patterns to exclude from caching
const EXCLUDE_PATTERNS = [
  /\/@vite\//,           // Vite client
  /\/@id\//,             // Vite module resolution
  /\.hot-update\./,      // HMR updates
  /\/__vite_ping/,       // Vite ping
  /\/node_modules\//,    // Node modules
  /chrome-extension:/,   // Browser extensions
  /moz-extension:/,
  /edge-extension:/
];

// API routes to cache
const API_ROUTES = [
  '/api/hotels',
  '/api/search',
  '/api/popular'
];

// Check if URL should be cached
function shouldCache(url) {
  // Skip in development mode for Vite files
  if (IS_DEVELOPMENT) {
    return false;
  }

  // Check exclude patterns
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(url)) {
      return false;
    }
  }

  return true;
}

// Install event - cache static files
self.addEventListener('install', event => {
  console.log(`Service Worker ${VERSION} installing...`);
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        if (!IS_DEVELOPMENT && STATIC_FILES.length > 0) {
          return cache.addAll(STATIC_FILES);
        }
      }),
      caches.open(API_CACHE)
    ]).then(() => {
      console.log(`Service Worker ${VERSION} installed`);
    })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log(`Service Worker ${VERSION} activating...`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches with same prefix but different version
          if (cacheName.startsWith(CACHE_PREFIX) && 
              cacheName !== STATIC_CACHE && 
              cacheName !== API_CACHE) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`Service Worker ${VERSION} activated`);
      // Send version update message to all clients
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SERVICE_WORKER_UPDATED',
            version: VERSION
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
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip if shouldn't cache
  if (!shouldCache(url.href)) {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:' || 
      url.protocol === 'moz-extension:' ||
      url.protocol === 'edge-extension:') {
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

  // Handle other resources
  event.respondWith(handleResourceRequest(request));
});

// API request handler - Network first, then cache
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
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

// Document request handler
async function handleDocumentRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (!IS_DEVELOPMENT && networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    if (!IS_DEVELOPMENT) {
      const cache = await caches.open(STATIC_CACHE);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline page
    return new Response(
      `<!DOCTYPE html>
       <html lang="ja">
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
             }
           </style>
         </head>
         <body>
           <h1>オフライン</h1>
           <p>インターネット接続を確認してください</p>
           <button onclick="window.location.reload()">再試行</button>
         </body>
       </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Resource request handler
async function handleResourceRequest(request) {
  const url = new URL(request.url);
  
  // Skip caching in development
  if (IS_DEVELOPMENT || !shouldCache(url.href)) {
    return fetch(request);
  }
  
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetchAndUpdateCache(request, cache);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Background cache update
async function fetchAndUpdateCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

// Listen for skip waiting message
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Version check endpoint
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
});