// Service Worker v3 - Production-ready with proper error handling
const CACHE_VERSION = 'v3';
const CACHE_NAME = `lastminutestay-${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Files to cache immediately (production only)
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Install event
self.addEventListener('install', event => {
  console.log(`[SW v3] Installing...`);
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        // Only cache in production
        if (self.location.hostname !== 'localhost') {
          return cache.addAll(STATIC_FILES).catch(err => {
            console.warn('[SW v3] Static cache failed:', err);
          });
        }
      }),
      caches.open(API_CACHE)
    ]).then(() => {
      console.log('[SW v3] Installation complete');
    })
  );
  
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  console.log(`[SW v3] Activating...`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('[SW v3] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW v3] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event with comprehensive filtering
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Quick protocol check - only handle HTTP(S)
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return;
  }
  
  const url = new URL(request.url);
  
  // Skip WebSocket connections
  if (request.headers.get('upgrade') === 'websocket') {
    return;
  }
  
  // Skip development server requests
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    // In development, only cache API responses
    if (!url.pathname.startsWith('/api/')) {
      return;
    }
  }
  
  // Skip Vite/dev server specific paths
  const skipPatterns = [
    '/@vite/',
    '/node_modules/',
    '/.vite/',
    '/@id/',
    '/@fs/',
    '.hot-update.',
    '__vite_ping',
    '?v=',
    '?t='
  ];
  
  if (skipPatterns.some(pattern => request.url.includes(pattern))) {
    return;
  }
  
  // Route to appropriate handler
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
  } else {
    event.respondWith(handleResourceRequest(request));
  }
});

// API handler with proper error handling
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      try {
        await cache.put(request, networkResponse.clone());
      } catch (err) {
        console.warn('[SW v3] API cache error:', err.message);
      }
    }
    
    return networkResponse;
  } catch (networkError) {
    // Try cache on network failure
    try {
      const cache = await caches.open(API_CACHE);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    } catch (cacheError) {
      console.warn('[SW v3] Cache retrieval error:', cacheError.message);
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'ネットワークに接続できません' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Document handler
async function handleDocumentRequest(request) {
  // In development, always fetch fresh
  if (self.location.hostname === 'localhost') {
    return fetch(request);
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      try {
        await cache.put(request, networkResponse.clone());
      } catch (err) {
        console.warn('[SW v3] Document cache error:', err.message);
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Try cache
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
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
              font-family: sans-serif; 
              text-align: center; 
              padding: 50px;
              background: #667eea;
              color: white;
            }
          </style>
        </head>
        <body>
          <h1>オフライン</h1>
          <p>インターネット接続を確認してください</p>
          <button onclick="location.reload()">再試行</button>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Resource handler
async function handleResourceRequest(request) {
  // In development, always fetch fresh
  if (self.location.hostname === 'localhost') {
    return fetch(request);
  }
  
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(response => {
      if (response && response.ok) {
        cache.put(request, response).catch(err => {
          console.warn('[SW v3] Background update error:', err.message);
        });
      }
    }).catch(() => {
      // Silent fail for background updates
    });
    
    return cachedResponse;
  }
  
  // Fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      try {
        await cache.put(request, networkResponse.clone());
      } catch (err) {
        console.warn('[SW v3] Resource cache error:', err.message);
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Return 404 for failed resources
    return new Response('Resource not found', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

// Message handler
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});