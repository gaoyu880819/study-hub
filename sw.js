// Service Worker for PWA - Plants vs Zombies Study Hub
// Strategy: network-first with short cache timeout, ensures users always get latest content
const CACHE_NAME = 'pvz-study-hub-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/wordbank.js',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

// Install - cache all assets, activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  // Force activation immediately - don't wait for old SW to release
  self.skipWaiting();
});

// Activate - delete ALL old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Delete ALL caches that don't match current version
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('SW: Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch - network first with cache fallback
// For navigation requests (HTML), always try network first
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // For HTML navigation requests - always network first, never serve stale HTML
  if (event.request.mode === 'navigate' || 
      requestUrl.pathname === '/' || 
      requestUrl.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          // Update cache with fresh copy
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache only if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // For other assets (JS, CSS, images) - network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
