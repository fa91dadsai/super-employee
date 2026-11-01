'use strict';

const CACHE = 'super-employee-v12';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const scheduledTimers = new Map();

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim()).then(() =>
      self.clients.matchAll({ type: 'window' }).then((windowClients) => {
        windowClients.forEach((client) => {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url).catch(() => {});
          }
        });
      })
    )
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (request.mode === 'navigate' || isLocal || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error('Network failed');
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request.mode === 'navigate' ? './index.html' : request, copy));
          return response;
        })
        .catch(() => caches.match(request.mode === 'navigate' ? './index.html' : request))
    );
  } else {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (!response.ok) return response;
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});

// Background & Lock-Screen Scheduled Notifications (Snooze Wakeup & Alerts)
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SCHEDULE_NOTIFICATION') {
    const id = String(data.id || 'notif_' + Date.now());
    const delayMs = Math.max(500, Number(data.delayMs) || 1000);
    const title = data.title || 'Super Employee · CEEN';
    const body = data.body || 'حان موعد التنبيه المؤجل!';
    const tag = data.tag || id;

    if (scheduledTimers.has(id)) {
      clearTimeout(scheduledTimers.get(id));
      scheduledTimers.delete(id);
    }

    const work = new Promise((resolve) => {
      const tid = setTimeout(() => {
        scheduledTimers.delete(id);
        self.registration
          .showNotification(title, {
            body,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            tag,
            renotify: true,
            requireInteraction: true,
            vibrate: [220, 100, 220, 100, 300],
            data: './',
          })
          .then(() => {
            return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          })
          .then((clients) => {
            (clients || []).forEach((c) => {
              c.postMessage({ type: 'SNOOZE_WOKE_UP', id, title, body });
            });
          })
          .catch(() => {})
          .finally(resolve);
      }, delayMs);
      scheduledTimers.set(id, tid);
    });

    if (event.waitUntil) event.waitUntil(work);
  } else if (data.type === 'CANCEL_NOTIFICATION') {
    const id = String(data.id || '');
    if (scheduledTimers.has(id)) {
      clearTimeout(scheduledTimers.get(id));
      scheduledTimers.delete(id);
    }
  }
});

// Web Push Notification handler (Android & iOS 16.4+ Standalone PWA)
self.addEventListener('push', (event) => {
  let payload = { title: 'Super Employee · CEEN', body: 'New task or inventory update', tag: 'foh-notify' };
  if (event.data) {
    try {
      payload = Object.assign(payload, event.data.json());
    } catch (e) {
      payload.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: payload.tag || 'foh-notify',
      renotify: true,
      requireInteraction: true,
      data: payload.url || './',
      vibrate: [200, 80, 200]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
