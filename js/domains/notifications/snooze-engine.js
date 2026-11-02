// foh-opening/js/domains/notifications/snooze-engine.js
// Precision Snooze Timer Engine & Native Lock-Screen Push Dispatcher
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const SNOOZE_TIMERS_KEY = 'super-employee.snoozeTimers.v2';

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

  function getAppRoleIdentity() {
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {};
  }

  function updateNotifBellUI() {
    if (FOH.notifCenter && FOH.notifCenter.updateNotifBellUI) FOH.notifCenter.updateNotifBellUI();
  }

  // ---- Precision Disappear-and-Reappear Snooze Timer Engine ----
  function loadSnoozeTimers() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(SNOOZE_TIMERS_KEY), '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }

  function saveSnoozeTimers(map) {
    try {
      localStorage.setItem(SNOOZE_TIMERS_KEY, JSON.stringify(map));
    } catch {}
  }

  function isAlertSnoozedNow(alertKey) {
    const map = loadSnoozeTimers();
    const entry = map[alertKey];
    if (!entry || !entry.wakeAtMs) return false;
    return Date.now() < entry.wakeAtMs;
  }

  function getActiveSnoozeTimersList() {
    const map = loadSnoozeTimers();
    const now = Date.now();
    return Object.entries(map)
      .filter(([, v]) => v && v.wakeAtMs > now)
      .map(([k, v]) => ({ key: k, ...v, remainingSec: Math.max(1, Math.ceil((v.wakeAtMs - now) / 1000)) }))
      .sort((a, b) => a.wakeAtMs - b.wakeAtMs);
  }

  async function ensureNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'default') {
      try {
        return await Notification.requestPermission();
      } catch {
        return Notification.permission;
      }
    }
    return Notification.permission;
  }

  async function fireNativeLockScreenNotification(title, body, tag) {
    try {
      if (navigator.vibrate) navigator.vibrate([220, 100, 220]);
    } catch {}
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
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
    } catch {}
  }

  async function scheduleServiceWorkerNotification(id, title, body, delayMs) {
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
    } catch {}
  }

  function snoozeAlertWithTimer({ ids, bannerGroup, title, body, minutes }) {
    const ar = isAr();
    const now = Date.now();
    const delayMs = Math.max(5000, Math.round(Number(minutes) * 60000));
    const wakeAtMs = now + delayMs;
    const wakeDate = new Date(wakeAtMs);
    const wakeHM = String(wakeDate.getHours()).padStart(2, '0') + ':' + String(wakeDate.getMinutes()).padStart(2, '0');

    const map = loadSnoozeTimers();
    const targetIds = Array.isArray(ids) && ids.length ? ids : [bannerGroup || 'general_alert'];
    targetIds.forEach((id) => {
      map[id] = {
        wakeAtMs,
        title: title || (ar ? 'تنبيه Super Employee' : 'Super Employee Alert'),
        body: body || '',
        minutes,
        atHM: FOH.time.nowHM(),
        wakeHM,
        notified: false,
      };
    });
    if (bannerGroup) {
      map['__group_' + bannerGroup] = {
        wakeAtMs,
        title: title || (ar ? 'تنبيه Super Employee' : 'Super Employee Alert'),
        body: body || '',
        minutes,
        atHM: FOH.time.nowHM(),
        wakeHM,
        notified: false,
      };
    }
    saveSnoozeTimers(map);

    // Also sync with FOH.reminders for compatibility
    if (FOH.reminders && FOH.reminders.snoozeItems && minutes >= 1) {
      FOH.reminders.snoozeItems(targetIds, S.date, FOH.time.nowHM(), Math.ceil(minutes));
    }

    // Immediately hide the banner in the DOM!
    if (bannerGroup === 'task_banner' && $('banner')) $('banner').hidden = true;
    if (bannerGroup === 'health_banner' && $('healthAlertBanner')) $('healthAlertBanner').hidden = true;

    // Schedule background / lock-screen notification via Service Worker
    const notifId = 'snooze_' + (bannerGroup || targetIds[0]);
    const ident = getAppRoleIdentity();
    const notifTitle = (ar ? ident.titleAr : ident.titleEn) + ' · 🔔 ' + (title || (ar ? 'تذكير مهمة' : 'Task Reminder'));
    const notifBody = body || (ar ? 'انتهى وقت التأجيل — يرجى إنجاز المهمة الآن!' : 'Snooze time ended — please complete this task now!');
    scheduleServiceWorkerNotification(notifId, notifTitle, notifBody, delayMs);

    const minsLabel = minutes < 1 ? (Math.round(minutes * 60) + (ar ? ' ثانية' : 's')) : minutes >= 1440 ? (ar ? 'بقية اليوم' : 'today') : (minutes + (ar ? ' دقيقة' : 'm'));
    FOH.edit.toast(
      ar
        ? '💤 اختفى التنبيه وتم تأجيله لمدة (' + minsLabel + ') · سيظهر ويرسل إشعاراً الساعة ' + wakeHM
        : '💤 Alert hidden & snoozed for ' + minsLabel + ' · Will reappear & push at ' + wakeHM
    );

    updateNotifBellUI();
  }

  // Background watcher every 2 seconds to wake up expired snoozes & re-show banner + push notification
  function checkExpiredSnoozeTimers() {
    const map = loadSnoozeTimers();
    const now = Date.now();
    let wokeAny = false;
    let wokeEntry = null;

    Object.keys(map).forEach((k) => {
      const entry = map[k];
      if (!entry || !entry.wakeAtMs) return;
      if (now >= entry.wakeAtMs) {
        if (!entry.notified && !k.startsWith('__group_')) {
          wokeEntry = entry;
        }
        delete map[k];
        wokeAny = true;
      }
    });

    if (wokeAny) {
      saveSnoozeTimers(map);
      if (FOH.reminders && FOH.reminders.clearSnoozesForDate) {
        FOH.reminders.clearSnoozesForDate(S.date);
      }
      if (wokeEntry) {
        const ar = isAr();
        const ident = getAppRoleIdentity();
        fireNativeLockScreenNotification(
          (ar ? ident.titleAr : ident.titleEn) + ' · ⏰ ' + (wokeEntry.title || ''),
          wokeEntry.body || (ar ? 'انتهى وقت التأجيل وحان موعد التنبيه!' : 'Snooze ended — reminder is due now!'),
          'wake_' + Date.now()
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

  // ---- Upgrade Both Alert Banners so Snooze Hides Immediately & Never Stacks Clutter ----
  function renderSmartAlertBanners() {
    const ar = isAr();
    const hBox = $('healthAlertBanner');
    const tBox = $('banner');

    // 1. Check if Task Banner is snoozed as a group
    if (tBox && !tBox.hidden) {
      if (isAlertSnoozedNow('__group_task_banner')) {
        tBox.hidden = true;
      } else {
        // Add +1m Quick Test Snooze & wire all snooze buttons to snoozeAlertWithTimer
        const mainTxt = (tBox.querySelector('.banner-main') || tBox).textContent || '';
        const acts = tBox.querySelector('.banner-actions');
        if (acts && !acts.dataset.v10Wired) {
          acts.dataset.v10Wired = '1';
          acts.replaceChildren();

          const doneBtn = el('button', 'snooze-btn done-now', ar ? '✓ أُنجزت الآن' : '✓ Done Now');
          doneBtn.type = 'button';
          doneBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const due = FOH.reminders.next(FOH.preview.sections(), S.run.checked, FOH.tasksView.todayStates(), S.date, FOH.time.nowHM());
            const now = FOH.time.nowHM();
            if (due && due.items) {
              due.items.forEach((entry) => {
                if (entry.kind === 'task') {
                  const st = FOH.schedule.stateOn(entry.item, S.log, S.date, FOH.time.todayISO(), now);
                  if (st && !st.doneEntry) {
                    FOH.schedule.toggle(S.log, st, S.date, now, S.me.name);
                    FOH.store.saveLog(S.log);
                  }
                } else {
                  FOH.model.leaves(entry.item).forEach((lf) => {
                    S.run.checked[lf.id] = now;
                  });
                  FOH.store.saveRun(S.date, S.run);
                }
              });
            }
            FOH.app.render();
          });
          acts.append(doneBtn);

          [
            [1, ar ? '💤 +1د (تجربة)' : '💤 +1m'],
            [15, ar ? '💤 +15د' : '💤 +15m'],
            [30, ar ? '💤 +30د' : '💤 +30m'],
            [60, ar ? '💤 +1س' : '💤 +1h'],
            [1440, ar ? '🔕 كتم اليوم' : '🔕 Mute Today'],
          ].forEach(([mins, lbl]) => {
            const b = el('button', 'snooze-btn', lbl);
            b.type = 'button';
            b.addEventListener('click', (e) => {
              e.stopPropagation();
              const due = FOH.reminders.next(FOH.preview.sections(), S.run.checked, FOH.tasksView.todayStates(), S.date, FOH.time.nowHM());
              snoozeAlertWithTimer({
                ids: (due && due.ids) || ['task_due'],
                bannerGroup: 'task_banner',
                title: ar ? 'تذكير مهمة مستحقة' : 'Due Task Reminder',
                body: mainTxt.trim(),
                minutes: mins,
              });
            });
            acts.append(b);
          });
        }
      }
    }

    // 2. Check Health Banner snooze & prevent double-banner stacking on mobile
    if (hBox) {
      if (isAlertSnoozedNow('__group_health_banner')) {
        hBox.hidden = true;
      } else if (!hBox.hidden) {
        // Wire health banner snooze buttons to snoozeAlertWithTimer
        const hTxt = (hBox.querySelector('b') || hBox).textContent || '';
        const hActs = hBox.querySelector('.health-banner-actions');
        if (hActs && !hActs.dataset.v10Wired) {
          hActs.dataset.v10Wired = '1';
          hActs.replaceChildren();

          const isMgr = getCurrentSuperRoleKey() === 'super_manager';
          let actionBtn;
          if (isMgr) {
            actionBtn = el('button', 'snooze-btn done-now', ar ? '📅 تحديث التاريخ (مدير)' : '📅 Update Expiry (Manager)');
            actionBtn.type = 'button';
            actionBtn.addEventListener('click', () => {
              S.view = 'profile';
              FOH.app.render();
            });
          } else {
            actionBtn = el('button', 'snooze-btn done-now', ar ? '🏥 إشعار الإدارة بالتجديد' : '🏥 Notify Manager');
            actionBtn.type = 'button';
            actionBtn.addEventListener('click', () => {
              const sess = getSession();
              if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
                FOH.cloudRealtime.broadcast('HEALTH_CERT_RENEWAL_REQUEST', {
                  by: (sess && sess.displayName) || S.me.name || 'Staff',
                  at: FOH.time.nowHM(),
                });
              }
              FOH.edit.toast(ar ? 'تم إرسال إشعار لإدارة المطعم لمراجعة وتحديث الشهادة الصحية ✓' : 'Management notified of renewal request ✓');
              const alerts = getHealthAlerts();
              snoozeAlertWithTimer({
                ids: alerts.map((a) => a.snoozeId),
                bannerGroup: 'health_banner',
                title: ar ? 'طلب تجديد الشهادة الصحية' : 'Health Certificate Renewal',
                body: hTxt.trim(),
                minutes: 1440,
              });
            });
          }
          hActs.append(actionBtn);

          [
            [1, ar ? '💤 +1د (تجربة)' : '💤 +1m'],
            [60, ar ? '💤 +1س' : '💤 +1h'],
            [1440, ar ? '🔕 كتم اليوم' : '🔕 Mute Today'],
          ].forEach(([mins, lbl]) => {
            const b = el('button', 'snooze-btn', lbl);
            b.type = 'button';
            b.addEventListener('click', () => {
              const alerts = getHealthAlerts();
              snoozeAlertWithTimer({
                ids: alerts.map((a) => a.snoozeId),
                bannerGroup: 'health_banner',
                title: ar ? 'تنبيه الشهادة الصحية' : 'Health Certificate Alert',
                body: hTxt.trim(),
                minutes: mins,
              });
            });
            hActs.append(b);
          });
        }
      }
    }

    // If BOTH banners are visible simultaneously on mobile, keep only the task banner in the header and put the second inside 🔔 Notification Center so header stays compact!
    if (hBox && tBox && !hBox.hidden && !tBox.hidden) {
      hBox.hidden = true;
    }

    updateNotifBellUI();
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
    checkExpiredSnoozeTimers,
    renderSmartAlertBanners,
  };
})(window.FOH = window.FOH || {});
