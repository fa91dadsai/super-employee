// foh-opening/js/domains/notifications/alert-banners.js
// Smart alert banners, task reminders, and health certificate action buttons (< 350 lines)

(function () {
  'use strict';

  window.FOH = window.FOH || {};

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { el } = FOH.view || { el: (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; } };

  function isAr() {
    return FOH.i18n && FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth && FOH.sessionAuth.loadSession ? FOH.sessionAuth.loadSession() : null;
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity && FOH.roleIdentity.getCurrentSuperRoleKey ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function getHealthAlerts() {
    return FOH.notificationsView && FOH.notificationsView.getHealthAlerts ? FOH.notificationsView.getHealthAlerts() : [];
  }

  function updateNotifBellUI() {
    if (FOH.notificationsView && FOH.notificationsView.updateNotifBellUI) {
      FOH.notificationsView.updateNotifBellUI();
    }
  }

  function isAlertSnoozedNow(alertKey) {
    return FOH.snoozeEngine && FOH.snoozeEngine.isAlertSnoozedNow ? FOH.snoozeEngine.isAlertSnoozedNow(alertKey) : false;
  }

  function snoozeAlertWithTimer(opts) {
    if (FOH.snoozeEngine && FOH.snoozeEngine.snoozeAlertWithTimer) {
      FOH.snoozeEngine.snoozeAlertWithTimer(opts);
    }
  }

  function handleTaskBannerDone() {
    const due = FOH.reminders && FOH.reminders.next ? FOH.reminders.next(FOH.preview.sections(), S.run.checked, FOH.tasksView ? FOH.tasksView.todayStates() : [], S.date, FOH.time.nowHM()) : null;
    const now = FOH.time.nowHM();
    if (!due || !due.items) return;

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
    FOH.app.render();
  }

  function wireTaskBannerActions(tBox, ar) {
    if (isAlertSnoozedNow('__group_task_banner')) {
      tBox.hidden = true;
      return;
    }
    const mainTxt = (tBox.querySelector('.banner-main') || tBox).textContent || '';
    const acts = tBox.querySelector('.banner-actions');
    if (!acts || acts.dataset.v10Wired) return;
    acts.dataset.v10Wired = '1';
    acts.replaceChildren();

    const doneBtn = el('button', 'snooze-btn done-now', ar ? '✓ أُنجزت الآن' : '✓ Done Now');
    doneBtn.type = 'button';
    doneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleTaskBannerDone();
    });
    acts.append(doneBtn);

    const snoozePresets = [
      [1, ar ? '💤 +1د (تجربة)' : '💤 +1m'],
      [15, ar ? '💤 +15د' : '💤 +15m'],
      [30, ar ? '💤 +30د' : '💤 +30m'],
      [60, ar ? '💤 +1س' : '💤 +1h'],
      [1440, ar ? '🔕 كتم اليوم' : '🔕 Mute Today'],
    ];

    snoozePresets.forEach(([mins, lbl]) => {
      const b = el('button', 'snooze-btn', lbl);
      b.type = 'button';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const due = FOH.reminders && FOH.reminders.next ? FOH.reminders.next(FOH.preview.sections(), S.run.checked, FOH.tasksView ? FOH.tasksView.todayStates() : [], S.date, FOH.time.nowHM()) : null;
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

  function handleHealthCertRenewalRequest(hTxt, ar) {
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
  }

  function createHealthActionBtn(isMgr, ar, hTxt) {
    if (isMgr) {
      const alerts = getHealthAlerts();
      const top = alerts && alerts[0];
      const targetName = (top && top.staff && top.staff.name) || '';
      const actionBtn = el(
        'button',
        'snooze-btn done-now',
        ar ? (targetName ? '📅 تحديث شهادة (' + targetName + ')' : '📅 تحديث الشهادة (مدير)') : (targetName ? '📅 Update (' + targetName + ')' : '📅 Update Expiry (Manager)')
      );
      actionBtn.type = 'button';
      actionBtn.addEventListener('click', () => {
        if (top && top.staff && top.staff.id) {
          S.selectedHealthStaffId = top.staff.id;
        }
        S.view = 'profile';
        FOH.app.render();
      });
      return actionBtn;
    }
    const notifyBtn = el('button', 'snooze-btn done-now', ar ? '🏥 إشعار الإدارة بالتجديد' : '🏥 Notify Manager');
    notifyBtn.type = 'button';
    notifyBtn.addEventListener('click', () => handleHealthCertRenewalRequest(hTxt, ar));
    return notifyBtn;
  }

  function wireHealthBannerActions(hBox, ar) {
    if (isAlertSnoozedNow('__group_health_banner')) {
      hBox.hidden = true;
      return;
    }
    if (hBox.hidden) return;

    const hTxt = (hBox.querySelector('b') || hBox).textContent || '';
    const hActs = hBox.querySelector('.health-banner-actions');
    if (!hActs || hActs.dataset.v10Wired) return;
    hActs.dataset.v10Wired = '1';
    hActs.replaceChildren();

    const isMgr = getCurrentSuperRoleKey() === 'super_manager';
    hActs.append(createHealthActionBtn(isMgr, ar, hTxt));

    const healthPresets = [
      [1, ar ? '💤 +1د (تجربة)' : '💤 +1m'],
      [60, ar ? '💤 +1س' : '💤 +1h'],
      [1440, ar ? '🔕 كتم اليوم' : '🔕 Mute Today'],
    ];

    healthPresets.forEach(([mins, lbl]) => {
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

  function renderSmartAlertBanners() {
    const ar = isAr();
    const hBox = $('healthAlertBanner');
    const tBox = $('banner');

    if (tBox && !tBox.hidden) {
      wireTaskBannerActions(tBox, ar);
    }

    if (hBox) {
      wireHealthBannerActions(hBox, ar);
    }

    if (hBox && tBox && !hBox.hidden && !tBox.hidden) {
      hBox.hidden = true;
    }

    updateNotifBellUI();
  }

  FOH.alertBanners = {
    wireTaskBannerActions,
    wireHealthBannerActions,
    renderSmartAlertBanners,
  };
})();

