// Service Worker for Kiro OSS Map
// Version: 1.3.0
// Enhanced PWA functionality with advanced caching strategies

const CACHE_NAME = 'kiro-oss-map-v1.3.0';
const STATIC_CACHE = 'static-v1.3.0';
const DYNAMIC_CACHE = 'dynamic-v1.3.0';
const TILES_CACHE = 'tiles-v1.3.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/styles/main.css',
  '/src/services/MapService.js',
  '/src/services/SearchService.js',
  '/src/services/RouteService.js',
  '/src/services/StorageService.js',
  '/src/services/ShareService.js',
  '/src/components/SearchBox.js',
  '/src/components/RoutePanel.js',
  '/src/components/ShareDialog.js',
  '/src/components/BookmarkPanel.js',
  '/manifest.json'
];

// Dynamic cache patterns
const CACHE_PATTERNS = {
  api: /^https:\/\/(nominatim\.openstreetmap\.org|router\.project-osrm\.org)/,
  tiles: /^https:\/\/[abc]\.tile\.openstreetmap\.org/,
  images: /\.(jpg|jpeg|png|gif|webp|svg)$/,
  fonts: /\.(woff|woff2|ttf|eot)$/
};

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker v1.3.0');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker v1.3.0');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== TILES_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - advanced caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (CACHE_PATTERNS.tiles.test(request.url)) {
    // Tiles: Cache first with network fallback
    event.respondWith(handleTilesRequest(request));
  } else if (CACHE_PATTERNS.api.test(request.url)) {
    // API: Network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (CACHE_PATTERNS.images.test(request.url)) {
    // Images: Cache first with network fallback
    event.respondWith(handleImageRequest(request));
  } else if (url.origin === location.origin) {
    // Same origin: Cache first with network fallback
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle tiles requests - Cache first strategy
async function handleTilesRequest(request) {
  try {
    const cache = await caches.open(TILES_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Return cached tile and update in background
      updateTileInBackground(request, cache);
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Tiles request failed:', error);
    return new Response('Tile not available', { status: 404 });
  }
}

// Handle API requests - Network first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    // Fallback to cache
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('API not available offline', { status: 503 });
  }
}

// Handle image requests - Cache first strategy
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Image not available', { status: 404 });
  }
}

// Handle static requests - Cache first strategy
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Fallback to index.html for SPA routing
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/index.html');
    }
    return new Response('Resource not available', { status: 404 });
  }
}

// Background tile update
async function updateTileInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

// Message handling for cache management
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CLEAR_CACHE':
      clearCache(data.cacheName);
      break;
    case 'CACHE_TILES':
      cacheTilesArea(data.bounds, data.zoomLevels);
      break;
  }
});

// Clear specific cache
async function clearCache(cacheName) {
  try {
    await caches.delete(cacheName);
    console.log('[SW] Cache cleared:', cacheName);
  } catch (error) {
    console.error('[SW] Failed to clear cache:', error);
  }
}

// Cache tiles for offline use
async function cacheTilesArea(bounds, zoomLevels) {
  const cache = await caches.open(TILES_CACHE);
  const tileUrls = generateTileUrls(bounds, zoomLevels);
  
  console.log(`[SW] Caching ${tileUrls.length} tiles for offline use`);
  
  for (const url of tileUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.warn('[SW] Failed to cache tile:', url);
    }
  }
}

// Generate tile URLs for given bounds and zoom levels
function generateTileUrls(bounds, zoomLevels) {
  const urls = [];
  const tileServers = ['a', 'b', 'c'];
  
  zoomLevels.forEach(zoom => {
    const minTile = latLngToTile(bounds.north, bounds.west, zoom);
    const maxTile = latLngToTile(bounds.south, bounds.east, zoom);
    
    for (let x = minTile.x; x <= maxTile.x; x++) {
      for (let y = minTile.y; y <= maxTile.y; y++) {
        const server = tileServers[Math.floor(Math.random() * tileServers.length)];
        urls.push(`https://${server}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
      }
    }
  });
  
  return urls;
}

// Convert lat/lng to tile coordinates
function latLngToTile(lat, lng, zoom) {
  const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y };
}