// foh-opening/js/domains/notifications/snooze-engine.js
// Multi-Device Alert Snooze Engine & OS Native Lock-Screen Push Notifications
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SNOOZE_KEY = 'super-employee.snoozeTimers.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function getHealthAlerts() {
    return FOH.gov ? FOH.gov.getHealthAlerts() : [];
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function updateNotifBellUI() {
    if (FOH.notifCenter && FOH.notifCenter.updateNotifBellUI) FOH.notifCenter.updateNotifBellUI();
  }

  // ---- 1. Timed Snooze Engine (Persisted in localStorage & Service Worker) ----
  function loadSnoozeTimers() {
    try {
      const data = FOH.safeJsonParse(localStorage.getItem(SNOOZE_KEY), '{}');
      return (data && typeof data === 'object') ? data : {};
    } catch (err) {
      /* Snooze timers read storage fallback */
      return {};
    }
  }

  function saveSnoozeTimers(map) {
    try {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(map));
    } catch (err) { /* Snooze timers write storage quota fallback */ }
  }

  function isAlertSnoozedNow(alertKey) {
    if (!alertKey) return false;
    const map = loadSnoozeTimers();
    const entry = map[alertKey];
    if (!entry || !entry.wakeAtMs) return false;
    if (Date.now() < entry.wakeAtMs) return true;
    delete map[alertKey];
    saveSnoozeTimers(map);
    return false;
  }

  function getActiveSnoozeTimersList() {
    const map = loadSnoozeTimers();
    const now = Date.now();
    const list = [];
    let dirty = false;
    Object.keys(map).forEach((k) => {
      const it = map[k];
      if (it && it.wakeAtMs) {
        if (now < it.wakeAtMs) {
          const rem = Math.max(0, Math.round((it.wakeAtMs - now) / 1000));
          list.push(Object.assign({}, it, { key: k, remainingSec: rem }));
        } else {
          delete map[k];
          dirty = true;
        }
      }
    });
    if (dirty) saveSnoozeTimers(map);
    return list;
  }

  // ---- 2. Native Push Notifications & Lock-Screen Awakening ----
  async function ensureNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try {
      return await Notification.requestPermission();
    } catch (err) {
      /* Notification permission request fallback */
      return 'denied';
    }
  }

  async function fireNativeLockScreenNotification(title, body, tag) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch (err) { /* Vibration API fallback */ }
      }
      if ('Notification' in window && Notification.permission === 'granted') {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon: './icons/icon-192.png',
              badge: './icons/icon-192.png',
              tag: tag || 'super-emp-alert',
              renotify: true,
              requireInteraction: true,
              vibrate: [220, 100, 220, 100, 300],
              data: './',
            });
            return;
          }
        }
        new Notification(title, { body, icon: './icons/icon-192.png', tag: tag || 'super-emp-alert' });
      }
    } catch (err) { /* Native notification fallback */ }
  }

  async function scheduleServiceWorkerNotification(opts = {}) {
    const { id, title, body, delayMs } = typeof opts === 'object' && !Array.isArray(opts)
      ? opts
      : { id: arguments[0], title: arguments[1], body: arguments[2], delayMs: arguments[3] };
    await ensureNotificationPermission();
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const targetSW = (navigator.serviceWorker && navigator.serviceWorker.controller) || (reg && (reg.active || reg.waiting || reg.installing));
        if (targetSW) {
          targetSW.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            id,
            title,
            body,
            delayMs,
            tag: id,
          });
        }
      }
    } catch (err) { /* SW notification schedule fallback */ }
  }

  function recordSnoozeEntries(targetIds, bannerGroup, entryData) {
    const map = loadSnoozeTimers();
    targetIds.forEach((id) => {
      map[id] = Object.assign({}, entryData);
    });
    if (bannerGroup) {
      map['__group_' + bannerGroup] = Object.assign({}, entryData);
    }
    saveSnoozeTimers(map);
  }

  function snoozeAlertWithTimer(opts = {}) {
    const { ids, bannerGroup, title, body, minutes } = opts;
    const ar = isAr();
    const now = Date.now();
    const delayMs = Math.max(5000, Math.round(Number(minutes) * 60000));
    const wakeAtMs = now + delayMs;
    const wakeDate = new Date(wakeAtMs);
    const wakeHM = String(wakeDate.getHours()).padStart(2, '0') + ':' + String(wakeDate.getMinutes()).padStart(2, '0');

    const targetIds = Array.isArray(ids) && ids.length ? ids : [bannerGroup || 'general_alert'];
    const entryData = {
      wakeAtMs,
      title: title || (ar ? 'تنبيه Super Employee' : 'Super Employee Alert'),
      body: body || '',
      minutes,
      atHM: FOH.time.nowHM(),
      wakeHM,
      notified: false,
    };

    recordSnoozeEntries(targetIds, bannerGroup, entryData);
    scheduleServiceWorkerNotification({
      id: 'snz_' + (bannerGroup || (targetIds[0] || 'alert')) + '_' + wakeAtMs,
      title: ar ? '🔔 تنبيه مستحق بعد التأجيل' : '🔔 Snoozed Alert Due',
      body: body || title || (ar ? 'حان موعد المهمة المؤجلة!' : 'Your snoozed task is due now!'),
      delayMs,
    });

    FOH.edit.toast(
      ar
        ? '💤 تم تأجيل التنبيه حتى ' + wakeHM + ' (سيصلك إشعار بالموعد 📲)'
        : '💤 Snoozed until ' + wakeHM + ' (notification scheduled 📲)'
    );

    FOH.app.render();
    updateNotifBellUI();
  }

  let snoozeTicker = 0;

  function initSnoozeEngine() {
    clearInterval(snoozeTicker);
    snoozeTicker = setInterval(() => {
      checkDueSnoozeTimers();
    }, 5000);
  }

  function checkDueSnoozeTimers() {
    const map = loadSnoozeTimers();
    const now = Date.now();
    const ar = isAr();
    let changed = false;
    let wokeEntry = null;

    Object.keys(map).forEach((k) => {
      const it = map[k];
      if (it && it.wakeAtMs && now >= it.wakeAtMs) {
        if (!wokeEntry && !k.startsWith('__group_')) wokeEntry = it;
        delete map[k];
        changed = true;
      }
    });

    if (changed) {
      saveSnoozeTimers(map);
      updateNotifBellUI();
      if (wokeEntry) {
        fireNativeLockScreenNotification(
          ar ? '🔔 تنبيه موعد المهمة المؤجلة' : '🔔 Snoozed Task Due',
          wokeEntry.body || wokeEntry.title,
          'snooze_due_' + Date.now()
        );
        FOH.edit.toast(
          ar
            ? '🔔 حان موعد التنبيه المؤجل: ' + (wokeEntry.body || wokeEntry.title)
            : '🔔 Snoozed alert is due now: ' + (wokeEntry.body || wokeEntry.title)
        );
      }
      FOH.app.render();
    }
  }

  function renderSmartAlertBanners() {
    if (FOH.alertBanners && FOH.alertBanners.renderSmartAlertBanners) {
      return FOH.alertBanners.renderSmartAlertBanners();
    }
  }

  FOH.snoozeEngine = {
    loadSnoozeTimers,
    saveSnoozeTimers,
    isAlertSnoozedNow,
    getActiveSnoozeTimersList,
    ensureNotificationPermission,
    fireNativeLockScreenNotification,
    scheduleServiceWorkerNotification,
    snoozeAlertWithTimer,
    initSnoozeEngine,
    checkDueSnoozeTimers,
    checkExpiredSnoozeTimers: checkDueSnoozeTimers,
    renderSmartAlertBanners,
  };

  document.addEventListener('DOMContentLoaded', initSnoozeEngine);
})(window.FOH = window.FOH || {});
