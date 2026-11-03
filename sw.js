'use strict';

const CACHE = 'super-employee-v31-orders-clean';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // CSS Architecture
  './css/base.css',
  './css/themes.css',
  './css/components.css',
  './css/checklist.css',
  './css/super-employee.css',
  // JS Core & Checklist Engine
  './js/core/security.js',
  './js/core/i18n.js',
  './js/core/state.js',
  './js/domains/checklist/model.js',
  './js/core/time.js',
  './js/core/modal-picker.js',
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
  // JS Domain Modules: Auth & Inventory
  './js/domains/auth/pending-approvals.js',
  './js/domains/auth/session-auth.js',
  './js/domains/auth/profile-dialog.js',
  './js/domains/inventory/batch-tally.js',
  // JS Domain Modules: Shifts & Cloud
  './js/domains/shifts/sheet-state.js',
  './js/domains/shifts/section-claims.js',
  './js/domains/checklist/section-assignment.js',
  './js/domains/cloud/cloud-sync.js',
  './js/domains/cloud/realtime-broadcast.js',
  // JS Domain Modules: Tasks & Orders
  './js/domains/tasks/day-off.js',
  './js/domains/tasks/task-inbox-notif.js',
  './js/domains/tasks/task-assignment.js',
  './js/domains/orders/orders-view.js',
  // JS Domain Modules: Governance & Identity
  './js/domains/governance/restaurant-gov.js',
  './js/domains/governance/suggestions.js',
  './js/domains/shifts/role-identity.js',
  // JS Domain Modules: Operations & Lifecycle
  './js/domains/operations/ops-lifecycle.js',
  './js/domains/operations/hours-settings.js',
  // JS Domain Modules: Tips, Dashboard, Settings, Profile & Academy
  './js/domains/tips/tips-view.js',
  './js/domains/dashboard/dashboard-view.js',
  './js/domains/profile/health-profile-view.js',
  './js/domains/settings/settings-view.js',
  './js/domains/academy/academy-view.js',
  // JS Domain Modules: Notifications & Navigation
  './js/domains/notifications/snooze-engine.js',
  './js/domains/notifications/notif-center.js',
  './js/domains/navigation/sidebar-nav.js',
  './js/domains/navigation/bottom-bar.js',
  './js/domains/navigation/mode-dept-panels.js',
  // JS Domain Modules: UI Header, Navigation, Hero & Orchestration
  './js/domains/shifts/header-subbars.js',
  './js/domains/shifts/three-shifts-nav.js',
  './js/domains/shifts/landing-hero.js',
  './js/domains/shifts/signoff-gate.js',
  './js/domains/shifts/super-employee-init.js',
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

  // Network-first for navigation (HTML), dynamic API routes, and realtime channels
  if (
    req.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/') ||
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

// Web Push API: Fires even when PWA and screen are completely closed!
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }
  const title = data.title || '🔔 تنبيه عمليات المطعم (CEEN Operations)';
  const options = {
    body: data.body || 'لديك إشعار تشغيلي مهم في نظام المطعم.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: data.tag || 'ceen-alert-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 300],
    data: data.data || { url: './' },
    actions: [
      { action: 'open', title: 'عرض التفاصيل (View)' },
      { action: 'dismiss', title: 'تجاهل (Dismiss)' }
    ]
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      ('setAppBadge' in self.navigator) ? self.navigator.setAppBadge(data.badgeCount || 1).catch(() => {}) : Promise.resolve()
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }
  if (event.action === 'dismiss') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});
