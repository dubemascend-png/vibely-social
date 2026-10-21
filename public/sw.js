/* Vibe.ly PWA shell cache. Auth, calls and message delivery remain server-owned. */
const CACHE_NAME = 'vibely-shell-v2';
const APP_BASE = '/vibely-social/';
const OFFLINE = '/vibely-social/vibely-offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([APP_BASE, OFFLINE]).catch(() => undefined)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('vibely-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok && (request.mode === 'navigate' || ['style','script','image','font'].includes(request.destination))) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => undefined);
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return (await caches.match(APP_BASE)) || (await caches.match(OFFLINE)) || Response.error();
    return Response.error();
  }));
});
self.addEventListener('push', event => {
  // TODO: connect backend — send authenticated push payloads from a trusted server.
  let data = { title: 'Vibe.ly', body: 'You have a new notification.' };
  try { if (event.data) data = event.data.json(); } catch {}
  event.waitUntil(self.registration.showNotification(data.title || 'Vibe.ly', {
    body: data.body || 'You have a new notification.',
    icon: '/vibely-social/icon.svg',
    badge: '/vibely-social/icon.svg',
    data: { url: data.url || APP_BASE }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || APP_BASE, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => client.url === target);
    if (existing) return existing.focus();
    return self.clients.openWindow(target);
  }));
});
