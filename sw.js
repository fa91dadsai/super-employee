'use strict';

const CACHE = 'super-employee-v22';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/base.css',
  './css/themes.css',
  './css/components.css',
  './css/checklist.css',
  './css/super-employee.css',
  './js/core/i18n.js',
  './js/core/state.js',
  './js/domains/checklist/model.js',
  './js/core/time.js',
  './js/domains/inventory/store.js',
  './js/domains/checklist/view.js',
  './js/domains/tasks/tasks-view.js',
  './js/domains/tasks/reminders.js',
  './js/domains/checklist/app.js',
  './js/domains/checklist/edit-sheet.js',
  './js/domains/tasks/task-sheet.js',
  './js/domains/tasks/task-actions.js',
  './js/domains/auth/staff.js',
  './js/domains/inventory/breakage.js',
  './js/domains/inventory/count.js',
  './js/domains/inventory/item-sheet.js',
  './js/domains/inventory/items.js',
  './js/domains/inventory/results.js',
  './js/domains/inventory/stock.js',
  './js/domains/inventory/manage.js',
  './js/domains/checklist/edit-actions.js',
  './js/core/pwa-install.js',
  './js/core/preview-demo.js',
  './js/domains/auth/erp-pwa-module.js',
  './js/domains/shifts/super-employee-module.js'
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
            client.navigate(client.url);
          }
        });
      })
    )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Network-first for dynamic API routes, navigation, and realtime channels
  if (
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/realtime/v1/') ||
    url.pathname.includes('/auth/v1/')
  ) {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then((cached) => cached || new Response('{"offline":true}', { status: 503, headers: { 'Content-Type': 'application/json' } }))
      )
    );
    return;
  }

  // Cache-first, network fallback for static assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        fetch(req).then((resp) => {
          if (resp && resp.ok) {
            caches.open(CACHE).then((cache) => cache.put(req, resp));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((resp) => {
        if (resp && resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone));
        }
        return resp;
      });
    })
  );
});

// Precision Push & Background Alarms for Due Tasks
self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { type, taskId, text, dueTime, msUntilDue } = event.data;

  if (type === 'SCHEDULE_TASK_ALARM') {
    if (scheduledTimers.has(taskId)) {
      clearTimeout(scheduledTimers.get(taskId));
    }
    const timer = setTimeout(() => {
      self.registration.showNotification('⏰ تذكير مهمة شفت الافتتاح', {
        body: `${text} (موعدها: ${dueTime})`,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        tag: `task-${taskId}`,
        vibrate: [200, 100, 200],
        data: { taskId }
      });
      scheduledTimers.delete(taskId);
    }, Math.max(0, msUntilDue || 0));
    scheduledTimers.set(taskId, timer);
  } else if (type === 'CANCEL_TASK_ALARM') {
    if (scheduledTimers.has(taskId)) {
      clearTimeout(scheduledTimers.get(taskId));
      scheduledTimers.delete(taskId);
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
