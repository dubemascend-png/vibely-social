// Lightweight service worker to make Vibe.ly installable as a PWA.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
// Keep requests online-first: messaging, authentication, and calls require connectivity.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});
