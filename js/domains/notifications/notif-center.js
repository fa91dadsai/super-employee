// foh-opening/js/domains/notifications/notif-center.js
// Header Notification Bell & Operational Notification Center Modal
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function getAppRoleIdentity() {
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {};
  }

  function isAlertSnoozedNow(id) {
    return FOH.snoozeEngine ? FOH.snoozeEngine.isAlertSnoozedNow(id) : false;
  }

  function snoozeAlertWithTimer(opts) {
    if (FOH.snoozeEngine && FOH.snoozeEngine.snoozeAlertWithTimer) FOH.snoozeEngine.snoozeAlertWithTimer(opts);
  }

  const loadSnoozeTimers = () => (FOH.snoozeEngine ? FOH.snoozeEngine.loadSnoozeTimers() : {});
  const saveSnoozeTimers = (t) => { if (FOH.snoozeEngine && FOH.snoozeEngine.saveSnoozeTimers) FOH.snoozeEngine.saveSnoozeTimers(t); };
  const ensureNotificationPermission = () => ((FOH.snoozeEngine && FOH.snoozeEngine.ensureNotificationPermission) ? FOH.snoozeEngine.ensureNotificationPermission() : Promise.resolve('denied'));
  const scheduleServiceWorkerNotification = (opts = {}) => ((FOH.snoozeEngine && FOH.snoozeEngine.scheduleServiceWorkerNotification) ? FOH.snoozeEngine.scheduleServiceWorkerNotification(opts.id, opts.title, opts.body, opts.delay) : Promise.resolve());
  const fireNativeLockScreenNotification = (t, b, tag) => { if (FOH.snoozeEngine && FOH.snoozeEngine.fireNativeLockScreenNotification) FOH.snoozeEngine.fireNativeLockScreenNotification(t, b, tag); };
  const roleName = (id) => (FOH.taskSheet && FOH.taskSheet.roleName ? FOH.taskSheet.roleName(id) : 'Staff');
  const getHealthAlerts = () => (FOH.gov ? FOH.gov.getHealthAlerts() : []);

  function getActiveSnoozeTimersList() {
    return FOH.snoozeEngine ? FOH.snoozeEngine.getActiveSnoozeTimersList() : [];
  }

  function loadTaskInbox() {
    return FOH.taskInbox ? FOH.taskInbox.loadTaskInbox() : [];
  }

  function ensureNotifBellInHeader() {
    if (FOH.notifBell && FOH.notifBell.ensureNotifBellInHeader) {
      return FOH.notifBell.ensureNotifBellInHeader();
    }
  }

  function getActivePendingNameChanges() {
    if (FOH.notifBell && FOH.notifBell.getActivePendingNameChanges) {
      return FOH.notifBell.getActivePendingNameChanges();
    }
    return [];
  }

  function updateNotifBellUI() {
    if (FOH.notifBell && FOH.notifBell.updateNotifBellUI) {
      return FOH.notifBell.updateNotifBellUI();
    }
  }

  function handleApproveNameChange(opts = {}) {
    const { req, st, ar, onAction } = opts;
    if (!st) {
      st = { id: req.staffId, name: req.reqFullName, nickname: req.reqNickname, role: 'staff', active: true, inv: true };
      S.tpl.staff.push(st);
    } else {
      st.name = req.reqFullName || ((req.reqFirstName + ' ' + req.reqLastName).trim()) || st.name;
      if (req.reqNickname) st.nickname = req.reqNickname;
      delete st.pendingNameChange;
    }
    const allReqs = (typeof FOH.loadPendingNameChanges === 'function' ? FOH.loadPendingNameChanges() : []).filter((r) => r.id !== req.id && r.staffId !== req.staffId && r.staffUsername !== req.staffUsername);
    if (typeof FOH.savePendingNameChanges === 'function') FOH.savePendingNameChanges(allReqs);
    FOH.store.saveTemplate(S.tpl);
    if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
      FOH.cloudRealtime.broadcast('STAFF_NAME_CHANGE_APPROVED', { staffId: st.id, name: st.name, nickname: st.nickname });
    }
    FOH.edit.toast(ar ? '✓ تم اعتماد تعديل اسم ' + st.name + ' بنجاح' : 'Approved ✓');
    onAction();
    updateNotifBellUI();
    FOH.app.render();
  }

  function handleRejectNameChange(opts = {}) {
    const { req, st, ar, onAction } = opts;
    if (st) delete st.pendingNameChange;
    const allReqs = (typeof FOH.loadPendingNameChanges === 'function' ? FOH.loadPendingNameChanges() : []).filter((r) => r.id !== req.id && r.staffId !== req.staffId && r.staffUsername !== req.staffUsername);
    if (typeof FOH.savePendingNameChanges === 'function') FOH.savePendingNameChanges(allReqs);
    FOH.store.saveTemplate(S.tpl);
    FOH.edit.toast(ar ? 'تم رفض طلب التعديل' : 'Rejected');
    onAction();
    updateNotifBellUI();
    FOH.app.render();
  }

  function renderPendingApprovalsCard(pendingChanges, opts = {}) {
    const { onAction, ar } = opts;
    const pac = el('div', 'pending-approvals-card');
    pac.innerHTML =
      '<div class="pac-head"><b>📝 ' + (ar ? 'طلبات تعديل الأسماء بانتظار اعتمادك:' : 'Pending Staff Name Change Approvals:') + '</b><span class="pac-badge">' + pendingChanges.length + '</span></div>';
    const pacList = el('div', 'pac-list');

    pendingChanges.forEach((req) => {
      let st = (S.tpl.staff || []).find((p) => p.id === req.staffId || (req.staffUsername && (p.name || '').toLowerCase().startsWith(req.staffUsername.toLowerCase())));
      const it = el('div', 'pac-item');
      it.innerHTML =
        '<div class="pac-item-info">' +
        '<b>' + (FOH.escapeHtml(req.currentName || (st && st.name) || 'Staff')) + '</b> (' + (st ? roleName(st.role) : 'Staff') + ')<br>' +
        (ar ? 'الاسم الجديد المطلوب:' : 'Requested Legal Name:') + ' <b style="color:var(--accent);">' + (FOH.escapeHtml(req.reqFullName || (req.reqFirstName + ' ' + req.reqLastName))) + '</b><br>' +
        (ar ? 'الـ Nickname المقترح:' : 'Requested Nickname:') + ' <b style="color:#10b981;">🏷️ ' + (FOH.escapeHtml(req.reqNickname || '—')) + '</b>' +
        '</div>';

      const aRow = el('div', 'pac-item-actions');
      const okB = el('button', 'pac-btn approve', ar ? '✓ اعتماد وتطبيق' : '✓ Approve');
      okB.type = 'button';
      okB.addEventListener('click', () => handleApproveNameChange({ req, st, ar, onAction }));

      const noB = el('button', 'pac-btn reject', ar ? '✕ رفض' : '✕ Reject');
      noB.type = 'button';
      noB.addEventListener('click', () => handleRejectNameChange({ req, st, ar, onAction }));

      aRow.append(okB, noB);
      it.append(aRow);
      pacList.append(it);
    });
    pac.append(pacList);
    return pac;
  }

  function renderLockScreenPushCard(ident, ar) {
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const pushCard = el('div', 'notif-center-card');
    pushCard.style.border = '1.5px solid var(--accent)';
    pushCard.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">' +
      '<b>📲 ' + (ar ? 'إشعارات الهاتف والشاشة مغلقة (Lock-Screen Push)' : 'Lock-Screen & Background Notifications') + '</b>' +
      '<span class="dayoff-badge ' + (perm === 'granted' ? 'approved' : 'pending') + '">' +
      (perm === 'granted' ? (ar ? '✅ مفعّلة' : '✅ Active') : (ar ? '⚠️ تحتاج تفعيل' : '⚠️ Needs Permission')) +
      '</span>' +
      '</div>' +
      '<p style="margin:6px 0 10px;font-size:0.78rem;color:var(--ink2);line-height:1.45;">' +
      (ar
        ? 'اضغط الزر بالأسفل ثم اقفل شاشة موبايلك فوراً — سيصلك إشعار حقيقي مع اهتزاز وصوت بعد 5 ثوانٍ حتى والشاشة مغلقة!'
        : 'Tap the button below and lock your phone screen immediately — a real OS notification will arrive in 5 seconds while locked!') +
      '</p>';

    const testLockBtn = el(
      'button',
      'btn primary',
      ar ? '🔔 أرسل إشعاراً بعد 5 ثوانٍ (اقفل شاشة الهاتف الآن للتجربة!)' : '🔔 Send Lock-Screen Notification in 5s (Lock Phone Now!)'
    );
    testLockBtn.type = 'button';
    testLockBtn.style.width = '100%';
    testLockBtn.addEventListener('click', async () => {
      const status = await ensureNotificationPermission();
      if (status !== 'granted') {
        return alert(ar ? 'يرجى السماح بالإشعارات (Allow Notifications) من المتصفح أولاً.' : 'Please allow notifications in your browser prompt.');
      }
      const title = (ar ? ident.titleAr : ident.titleEn) + ' · 🍽 CEEN';
      const body = ar
        ? '✅ إشعار قفل الشاشة يعمل بنجاح! لديك مهام جاهزة في قسمك.'
        : '✅ Lock-screen notification works! Check your assigned tasks.';
      await scheduleServiceWorkerNotification({ id: 'lock_test_' + Date.now(), title, body, delay: 5000 });
      setTimeout(() => {
        fireNativeLockScreenNotification(title, body, 'lock_test_fallback');
      }, 5200);
      FOH.edit.toast(ar ? '⏳ تم جدولة الإشعار! اقفل شاشة هاتفك الآن — سيصلك خلال 5 ثوانٍ 📲' : '⏳ Scheduled! Lock your phone screen now — arriving in 5s 📲');
    });

    pushCard.append(testLockBtn);
    return pushCard;
  }

  function renderSnoozedAlertsCard(snoozedList, opts = {}) {
    const { onWake, ar } = opts;
    const snzCard = el('div', 'notif-center-card');
    snzCard.innerHTML = '<b>💤 ' + (ar ? 'التنبيهات المؤجلة حالياً (ستعود للظهور تلقائياً):' : 'Snoozed Alerts (Will auto-reappear):') + '</b>';

    if (!snoozedList.length) {
      snzCard.append(el('p', 'empty', ar ? 'لا توجد تنبيهات مؤجلة حالياً ✓' : 'No snoozed alerts right now ✓'));
      return snzCard;
    }

    snoozedList.forEach((item) => {
      const mins = Math.floor(item.remainingSec / 60);
      const secs = item.remainingSec % 60;
      const timeStr = mins > 0 ? (mins + (ar ? 'د و ' : 'm ') + secs + (ar ? 'ث' : 's')) : (secs + (ar ? ' ثانية' : 's'));
      const row = el('div', 'notif-item-row');
      row.innerHTML =
        '<div style="flex:1;min-width:180px;">' +
        '<b>' + (item.title || '🔔 تنبيه') + '</b>' +
        '<small style="display:block;color:var(--ink2);margin-top:2px;">' + (item.body || '') + '</small>' +
        '</div>' +
        '<span class="notif-countdown-pill">⏳ ' + (ar ? 'يظهر بعد ' : 'In ') + timeStr + ' (' + (item.wakeHM || '') + ')</span>';

      const wakeNowBtn = el('button', 'gov-btn primary', ar ? '🔔 إظهار الآن' : '🔔 Wake Now');
      wakeNowBtn.type = 'button';
      wakeNowBtn.addEventListener('click', () => {
        const map = loadSnoozeTimers();
        delete map[item.key];
        delete map['__group_task_banner'];
        delete map['__group_health_banner'];
        saveSnoozeTimers(map);
        if (FOH.reminders && FOH.reminders.clearSnoozesForDate) {
          FOH.reminders.clearSnoozesForDate(S.date);
        }
        FOH.app.render();
        onWake();
      });
      row.append(wakeNowBtn);
      snzCard.append(row);
    });
    return snzCard;
  }

  function renderActiveAlertsCard(opts = {}) {
    const { onSnooze, ar } = opts;
    const actCard = el('div', 'notif-center-card');
    actCard.innerHTML = '<b>⚡ ' + (ar ? 'التنبيهات النشطة الآن:' : 'Active Alerts Now:') + '</b>';
    const hAlerts = getHealthAlerts();
    const due = FOH.reminders.next(FOH.preview.sections(), S.run.checked, FOH.tasksView.todayStates(), S.date, FOH.time.nowHM());

    if (!hAlerts.length && !due) {
      actCard.append(el('p', 'empty', ar ? 'جميع المهام والشهادات على ما يرام ✅' : 'All tasks and certificates are on track ✅'));
      return actCard;
    }

    if (due) {
      const r = el('div', 'notif-item-row');
      r.innerHTML =
        '<div><b>⏰ ' + due.at + ' · ' + due.names.join('، ') + '</b>' +
        '<small style="display:block;color:var(--ink2);">' + (ar ? 'مهمة مستحقة في الشفت' : 'Shift task due') + '</small></div>';
      const snz1m = el('button', 'gov-btn', ar ? '💤 تأجيل ١د' : '💤 +1m');
      snz1m.type = 'button';
      snz1m.addEventListener('click', () => {
        snoozeAlertWithTimer({
          ids: due.ids,
          bannerGroup: 'task_banner',
          title: ar ? 'تذكير مهمة' : 'Task Reminder',
          body: due.at + ' · ' + due.names.join('، '),
          minutes: 1,
        });
        onSnooze();
      });
      r.append(snz1m);
      actCard.append(r);
    }

    hAlerts.forEach((ha) => {
      const r = el('div', 'notif-item-row');
      r.innerHTML =
        '<div><b>🏥 ' + FOH.escapeHtml(ha.staff.name) + ' (' + ha.staff.healthCertExpiry + ')</b>' +
        '<small style="display:block;color:var(--danger);">' +
        (ha.expired ? (ar ? 'منتهية منذ ' + Math.abs(ha.days) + ' يوم' : 'Expired ' + Math.abs(ha.days) + 'd ago') : (ar ? 'تنتهي خلال ' + ha.days + ' يوم' : 'Expires in ' + ha.days + 'd')) +
        '</small></div>';
      actCard.append(r);
    });

    return actCard;
  }

  function drawCenter(dlg, ar) {
    dlg.replaceChildren();
    const box = el('div', '');
    box.style.padding = '14px 16px 20px';

    const ident = getAppRoleIdentity();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const pendingChanges = isMgr ? getActivePendingNameChanges() : [];

    box.innerHTML =
      '<div class="grab"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">' +
      '<h2 style="margin:0;font-size:1.08rem;">🔔 ' + (ar ? 'مركز الإشعارات والتنبيهات المؤجلة' : 'Notification Center & Snoozed Alerts') + '</h2>' +
      '<span class="super-role-pill">' + (ar ? ident.titleAr : ident.titleEn) + '</span>' +
      '</div>';

    if (pendingChanges.length > 0) {
      box.append(renderPendingApprovalsCard(pendingChanges, { onAction: () => drawCenter(dlg, ar), ar }));
    }

    box.append(renderLockScreenPushCard(ident, ar));

    if (FOH.pwa && !FOH.pwa.isStandalone() && FOH.pwa.renderInstallSection) {
      FOH.pwa.renderInstallSection(box);
    }

    const snoozedList = getActiveSnoozeTimersList();
    box.append(renderSnoozedAlertsCard(snoozedList, { onWake: () => drawCenter(dlg, ar), ar }));
    box.append(renderActiveAlertsCard({ onSnooze: () => drawCenter(dlg, ar), ar }));

    const closeB = el('button', 'btn', ar ? 'إغلاق' : 'Close');
    closeB.type = 'button';
    closeB.style.width = '100%';
    closeB.addEventListener('click', () => dlg.close());
    box.append(closeB);

    dlg.append(box);
  }

  let notifCenterInterval = 0;

  function openNotificationCenterModal() {
    const ar = isAr();
    let dlg = $('notifCenterDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'notifCenterDialog';
      dlg.addEventListener('close', () => clearInterval(notifCenterInterval));
      dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
      document.body.append(dlg);
    }

    drawCenter(dlg, ar);
    clearInterval(notifCenterInterval);
    notifCenterInterval = setInterval(() => {
      if (dlg.open) drawCenter(dlg, ar);
    }, 1000);
    dlg.showModal();
  }

  FOH.notifCenter = {
    ensureNotifBellInHeader,
    updateNotifBellUI,
    openNotificationCenterModal,
  };
})(window.FOH = window.FOH || {});
