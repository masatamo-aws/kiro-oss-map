// Service Worker for PWA functionality
const CACHE_NAME = 'kiro-oss-map-v1.0.0';
const STATIC_CACHE = 'kiro-oss-map-static-v1.0.0';
const DYNAMIC_CACHE = 'kiro-oss-map-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/main.js',
  '/styles/main.css',
  '/icons/logo.svg',
  '/icons/favicon.svg',
  'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js'
];

// API endpoints to cache with network-first strategy (for future use)
// const API_ENDPOINTS = [
//   '/api/v1/health',
//   '/api/v1/geocoding/search',
//   '/api/v1/routing/route'
// ];

// Tile URLs to cache
const TILE_PATTERN = /^https:\/\/(tile\.openstreetmap\.org|server\.arcgisonline\.com|tile\.opentopomap\.org)/;

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (isStaticFile(request)) {
    event.respondWith(cacheFirst(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(networkFirst(request));
  } else if (isTileRequest(request)) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(networkFirst(request));
  }
});

// Cache-first strategy (for static files and tiles)
async function cacheFirst(request, cacheName = STATIC_CACHE) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Return cached version and update in background
      updateCache(request, cacheName);
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    
    // Return offline fallback if available
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/index.html');
    }
    
    throw error;
  }
}

// Network-first strategy (for API requests)
async function networkFirst(request, cacheName = DYNAMIC_CACHE) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    if (isAPIRequest(request)) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'This request is not available offline'
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Update cache in background
async function updateCache(request, cacheName = STATIC_CACHE) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// Helper functions
function isStaticFile(request) {
  const url = new URL(request.url);
  return STATIC_FILES.some(file => url.pathname === file) ||
         url.pathname.startsWith('/assets/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg');
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

function isTileRequest(request) {
  return TILE_PATTERN.test(request.url);
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sync offline actions when back online
    const offlineActions = await getOfflineActions();
    
    for (const action of offlineActions) {
      try {
        await processOfflineAction(action);
        await removeOfflineAction(action.id);
      } catch (error) {
        console.error('Failed to sync offline action:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function getOfflineActions() {
  // Get offline actions from IndexedDB
  return [];
}

async function processOfflineAction(action) {
  // Process offline action
  console.log('Processing offline action:', action);
}

async function removeOfflineAction(id) {
  // Remove processed offline action
  console.log('Removing offline action:', id);
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icons/logo.svg',
    badge: '/icons/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open Map',
        icon: '/icons/logo.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/favicon.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Kiro OSS Map', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});