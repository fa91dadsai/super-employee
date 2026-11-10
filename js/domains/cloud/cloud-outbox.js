// foh-opening/js/domains/cloud/cloud-outbox.js
// Persistent Offline Outbox Queue & Network Reconnect Relay
(function (FOH) {
  'use strict';

  const STORAGE_KEY = 'foh-opening.outbox.v1';
  let isFlushing = false;

  function loadQueue() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      /* Storage quota fallback */
      return [];
    }
  }

  function saveQueue(queue) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch {
      /* Storage quota fallback */
    }
    updateOutboxBadge();
  }

  function enqueue(op = {}) {
    if (!op.path || !op.method) return null;
    const queue = loadQueue();
    const item = {
      opId: op.opId || 'op_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      method: op.method.toUpperCase(),
      path: op.path,
      body: op.body || null,
      businessDate: op.businessDate || (FOH.time && FOH.time.businessDateISO ? FOH.time.businessDateISO() : ''),
      sheetType: op.sheetType || (FOH.threeShifts ? FOH.threeShifts.getActiveSheetType() : 'opening'),
      createdAt: op.createdAt || new Date().toISOString(),
      attempts: 0,
    };
    queue.push(item);
    saveQueue(queue);
    return item;
  }

  async function flushOutbox() {
    if (isFlushing) return;
    const queue = loadQueue();
    if (!queue.length) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    isFlushing = true;
    try {
      const remaining = [];
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        try {
          if (!FOH.cloudSync || typeof FOH.cloudSync.apiCall !== 'function') {
            remaining.push(item);
            continue;
          }
          item.attempts = (item.attempts || 0) + 1;
          const res = await FOH.cloudSync.apiCall(item.method, item.path, item.body, false);
          if (res === null && typeof navigator !== 'undefined' && !navigator.onLine) {
            remaining.push(item);
            for (let j = i + 1; j < queue.length; j++) remaining.push(queue[j]);
            break;
          }
        } catch {
          remaining.push(item);
        }
      }
      saveQueue(remaining);
    } finally {
      isFlushing = false;
      updateOutboxBadge();
    }
  }

  function updateOutboxBadge() {
    const count = getPendingCount();
    if (typeof document === 'undefined') return;
    const el = document.getElementById('cloudOutboxBadge');
    if (!el) return;
    if (count > 0) {
      el.style.display = 'inline-flex';
      el.textContent = '📤 ' + count;
      el.title = `${count} pending offline actions queued for sync`;
    } else {
      el.style.display = 'none';
    }
  }

  function getPendingCount() {
    return loadQueue().length;
  }

  function getPendingOps() {
    return loadQueue();
  }

  function clearQueue() {
    saveQueue([]);
  }

  function init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        flushOutbox();
      });
    }
    updateOutboxBadge();
  }

  FOH.cloudOutbox = {
    enqueue,
    flush: flushOutbox,
    getPendingCount,
    getPendingOps,
    clear: clearQueue,
    init,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(window.FOH = window.FOH || {});
