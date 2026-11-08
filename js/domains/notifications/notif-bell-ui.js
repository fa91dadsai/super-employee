// foh-opening/js/domains/notifications/notif-bell-ui.js
// Header Notification Bell with Glowing Red Indicator Dot
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const { el } = FOH.view;

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function isAlertSnoozedNow(id) {
    return FOH.snoozeEngine ? FOH.snoozeEngine.isAlertSnoozedNow(id) : false;
  }

  function getHealthAlerts() {
    return FOH.gov ? FOH.gov.getHealthAlerts() : [];
  }

  function getActiveSnoozeTimersList() {
    return FOH.snoozeEngine ? FOH.snoozeEngine.getActiveSnoozeTimersList() : [];
  }

  function loadTaskInbox() {
    return FOH.taskInbox ? FOH.taskInbox.loadTaskInbox() : [];
  }

  function loadPendingNameChanges() {
    return FOH.pendingApprovals ? FOH.pendingApprovals.loadPendingNameChanges() : [];
  }

  function getActivePendingNameChanges() {
    const fromStorage = typeof loadPendingNameChanges === 'function' ? loadPendingNameChanges() : [];
    const staffList = (S() && S().tpl && S().tpl.staff) || [];
    const fromStaff = staffList.map((p) => p.pendingNameChange).filter((p) => p && p.status === 'pending');
    const map = new Map();
    fromStorage.concat(fromStaff).forEach((it) => {
      if (it && it.status === 'pending') {
        const key = it.staffId || it.staffUsername || it.id;
        if (!map.has(key) || (it.requestedAt && (!map.get(key).requestedAt || it.requestedAt > map.get(key).requestedAt))) {
          map.set(key, it);
        }
      }
    });
    return Array.from(map.values());
  }

  function ensureNotifBellInHeader() {
    let bellBtn = $('notifBellBtn');
    if (!bellBtn) {
      const cluster = document.querySelector('.top-right-actions');
      const bar = document.querySelector('header.top .bar');
      const profBtn = $('profileBtn');
      bellBtn = el('button', 'notif-bell-btn');
      bellBtn.type = 'button';
      bellBtn.id = 'notifBellBtn';
      bellBtn.setAttribute('aria-label', 'Notifications');
      bellBtn.innerHTML = '🔔<span id="notifRedDot" class="notif-bell-red-dot" hidden></span>';
      if (cluster && profBtn) cluster.insertBefore(bellBtn, profBtn);
      else if (bar && profBtn) bar.insertBefore(bellBtn, profBtn);
    } else if (!$('notifRedDot')) {
      const dot = el('span', 'notif-bell-red-dot');
      dot.id = 'notifRedDot';
      dot.hidden = true;
      bellBtn.appendChild(dot);
    }
    if (bellBtn && !bellBtn.dataset.v18Wired) {
      bellBtn.dataset.v18Wired = '1';
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (FOH.notifCenter && FOH.notifCenter.openNotificationCenterModal) {
          FOH.notifCenter.openNotificationCenterModal();
        }
      });
    }
  }

  function updateNotifBellUI() {
    ensureNotifBellInHeader();
    const bellBtn = $('notifBellBtn');
    const redDot = $('notifRedDot');
    const badge = $('notifCountBadge');
    if (!bellBtn) return;

    const hAlerts = isAlertSnoozedNow('__group_health_banner') ? [] : getHealthAlerts();
    const st = S();
    const due = (!isAlertSnoozedNow('__group_task_banner') && FOH.reminders && st && st.run && FOH.preview)
      ? FOH.reminders.next(FOH.preview.sections(), st.run.checked, FOH.tasksView ? FOH.tasksView.todayStates() : [], st.date, FOH.time ? FOH.time.nowHM() : '')
      : null;
    const activeCount = hAlerts.length + (due && due.ids ? due.ids.length : 0);
    const snoozedList = getActiveSnoozeTimersList().filter((x) => !x.key.startsWith('__group_'));
    const unreadTasks = (typeof loadTaskInbox === 'function' ? loadTaskInbox().length : 0);
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const pendingChanges = isMgr ? getActivePendingNameChanges() : [];
    const total = activeCount + snoozedList.length + unreadTasks + pendingChanges.length;

    // Red dot indicator shines/glows quietly when notifications exist
    const hasAlerts = total > 0;
    if (redDot) redDot.hidden = !hasAlerts;
    if (badge) badge.hidden = true; // Quiet bell: indicator is pulsing red dot
    bellBtn.classList.toggle('has-unread', hasAlerts);
  }

  FOH.notifBell = {
    ensureNotifBellInHeader,
    updateNotifBellUI,
    getActivePendingNameChanges,
  };
})(window.FOH = window.FOH || {});

