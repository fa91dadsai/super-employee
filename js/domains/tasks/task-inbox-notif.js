// foh-opening/js/domains/tasks/task-inbox-notif.js
// Automatic Task Creation Notifications & Staff Task Inbox
(function (FOH) {
  'use strict';

  const S = FOH.state;

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function updateNotifBellUI() {
    if (FOH.notifCenter) FOH.notifCenter.updateNotifBellUI();
  }

  const $ = (id) => document.getElementById(id);
  const { el } = FOH.view;

  function ensureNotificationPermission() {
    if (FOH.snoozeEngine) FOH.snoozeEngine.ensureNotificationPermission();
  }

  function openNotificationCenterModal() {
    if (FOH.notifCenter && FOH.notifCenter.openNotificationCenterModal) FOH.notifCenter.openNotificationCenterModal();
  }

  function scheduleServiceWorkerNotification(a, b, c) {
    if (FOH.snoozeEngine) FOH.snoozeEngine.scheduleServiceWorkerNotification(a, b, c);
  }

  function fireNativeLockScreenNotification(t, b, tag) {
    if (FOH.snoozeEngine) FOH.snoozeEngine.fireNativeLockScreenNotification(t, b, tag);
  }

  // ============================================================================
  // 14. SUPER EMPLOYEE v12: INSTANT MOBILE NOTIFICATION ON TASK ADDITION
  //     + AUTOMATIC DUE-TIME LOCK-SCREEN ALARM SCHEDULER + LIVE INBOX
  // ============================================================================
  const TASK_INBOX_KEY = 'super-employee.taskInbox.v1';
  const liveChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('super-employee-live-tasks') : null;

  function loadTaskInbox() {
    try {
      const arr = FOH.safeJsonParse(localStorage.getItem(TASK_INBOX_KEY), '[]');
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveTaskInbox(list) {
    try {
      localStorage.setItem(TASK_INBOX_KEY, JSON.stringify(list.slice(0, 50)));
    } catch (err) { /* Channel postMessage or storage fallback */ }
  }

  function computeDelayMsForHM(hm, remindBeforeMins) {
    if (!hm || !/^\d{2}:\d{2}$/.test(hm)) return 0;
    const now = new Date();
    const [hh, mm] = hm.split(':').map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    const offsetMs = (Number(remindBeforeMins) || 0) * 60 * 1000;
    let diff = target.getTime() - offsetMs - now.getTime();
    // If due time already passed today by more than 1 minute, don't schedule negative delay
    if (diff < -60000) return 0;
    return Math.max(3000, diff);
  }

  async function notifyMobileOnNewTaskAdded(taskMeta) {
    const ar = isAr();
    await ensureNotificationPermission();

    const title = ar
      ? '🆕 مهمة جديدة: ' + (taskMeta.titleAr || taskMeta.titleEn || 'مهمة شفت')
      : '🆕 New Task: ' + (taskMeta.titleEn || taskMeta.titleAr || 'Shift Task');

    const roleTxt = taskMeta.roleLabel ? (' · 👤 ' + taskMeta.roleLabel) : '';
    const dueTxt = taskMeta.dueHM ? (' · ⏰ ' + taskMeta.dueHM) : '';
    const body = (ar ? 'تمت إضافتها إلى ' : 'Added to ') + (taskMeta.sectionLabel || (ar ? 'مهام المطعم' : 'Checklist')) + roleTxt + dueTxt;

    // 1. Save to Task Notification Inbox so 🔔 Bell badge increments & shows it
    const inbox = loadTaskInbox();
    const entry = {
      id: 'tnotif_' + Date.now(),
      title,
      body,
      dueHM: taskMeta.dueHM || '',
      roleLabel: taskMeta.roleLabel || '',
      createdAtHM: FOH.time.nowHM(),
      unread: true,
    };
    inbox.unshift(entry);
    saveTaskInbox(inbox);

    // 2. Fire Immediate Native Mobile Notification (works in foreground & background via Service Worker)
    await fireNativeLockScreenNotification(title, body, entry.id);
    await scheduleServiceWorkerNotification(entry.id + '_imm', title, body, 800);

    // 3. If task has a Due Time (⏰), automatically schedule a Lock-Screen Notification for its Due Time!
    if (taskMeta.dueHM) {
      const delayMs = computeDelayMsForHM(taskMeta.dueHM, taskMeta.remindBefore);
      if (delayMs > 0) {
        const dueTitle = ar
          ? '⏰ حان موعد المهمة (' + taskMeta.dueHM + '): ' + (taskMeta.titleAr || taskMeta.titleEn)
          : '⏰ Task Due Now (' + taskMeta.dueHM + '): ' + (taskMeta.titleEn || taskMeta.titleAr);
        await scheduleServiceWorkerNotification(entry.id + '_due', dueTitle, body, delayMs);
      }
    }

    // 4. Broadcast to any other open tabs/devices on same browser
    if (liveChannel) {
      try {
        liveChannel.postMessage({ type: 'NEW_TASK_ADDED', entry });
      } catch (err) { /* Channel postMessage or storage fallback */ }
    }

    updateNotifBellUI();
  }

  function wireAutomaticTaskCreationNotifications() {
    // 1. Hook Checklist Item Sheet (#sheet) save
    const sheet = $('sheet');
    if (sheet && !sheet.dataset.v12NotifWired) {
      sheet.dataset.v12NotifWired = '1';
      sheet.addEventListener('close', () => {
        if (sheet.returnValue !== 'save') return;
        const txtEn = ($('dlgText') && $('dlgText').value.trim()) || '';
        const txtAr = ($('dlgTextAr') && $('dlgTextAr').value.trim()) || '';
        if (!txtEn && !txtAr) return;
        const dueHM = ($('dlgDue') && $('dlgDue').value) || '';
        const secSel = $('dlgSection');
        const secLabel = secSel && secSel.selectedOptions[0] ? secSel.selectedOptions[0].textContent : '';
        const roleSel = $('dlgRole');
        const roleLabel = roleSel && roleSel.value && roleSel.selectedOptions[0] ? roleSel.selectedOptions[0].textContent : '';

        notifyMobileOnNewTaskAdded({
          titleEn: txtEn || txtAr,
          titleAr: txtAr || txtEn,
          dueHM,
          sectionLabel: secLabel,
          roleLabel,
          remindBefore: 0,
        });
      });
    }

    // 2. Hook Scheduled / Personal Task Sheet (#taskSheet) save
    const taskSheet = $('taskSheet');
    if (taskSheet && !taskSheet.dataset.v12NotifWired) {
      taskSheet.dataset.v12NotifWired = '1';
      taskSheet.addEventListener('close', () => {
        if (taskSheet.returnValue !== 'save') return;
        const txtEn = ($('tkText') && $('tkText').value.trim()) || '';
        const txtAr = ($('tkTextAr') && $('tkTextAr').value.trim()) || '';
        if (!txtEn && !txtAr) return;
        const dueHM = ($('tkTime') && $('tkTime').value) || '';
        const roleSel = $('tkRole');
        const personIn = ($('tkPerson') && $('tkPerson').value.trim()) || '';
        const roleLabel = personIn || (roleSel && roleSel.value && roleSel.selectedOptions[0] ? roleSel.selectedOptions[0].textContent : '');

        notifyMobileOnNewTaskAdded({
          titleEn: txtEn || txtAr,
          titleAr: txtAr || txtEn,
          dueHM,
          sectionLabel: isAr() ? '📋 المهام المجدولة (My Tasks)' : '📋 Scheduled Tasks',
          roleLabel,
          remindBefore: 0,
        });
      });
    }

    // 3. Listen to cross-tab BroadcastChannel
    if (liveChannel && !window.__v12LiveChannelWired) {
      window.__v12LiveChannelWired = true;
      liveChannel.addEventListener('message', (ev) => {
        if (ev.data && ev.data.type === 'NEW_TASK_ADDED' && ev.data.entry) {
          fireNativeLockScreenNotification(ev.data.entry.title, ev.data.entry.body, ev.data.entry.id);
          FOH.app.render();
        }
      });
    }
  }

  function injectNewTasksInboxIntoNotifCenter() {
    const dlg = $('notifCenterDialog');
    if (!dlg || !dlg.open) return;
    if (dlg.querySelector('#notifNewTasksInboxCard')) return;

    const ar = isAr();
    const inbox = loadTaskInbox();
    const card = el('div', 'notif-center-card');
    card.id = 'notifNewTasksInboxCard';
    card.style.border = '1.5px solid var(--accent)';

    const head = el('div', '');
    head.style.display = 'flex';
    head.style.justifyContent = 'space-between';
    head.style.alignItems = 'center';
    head.style.gap = '8px';
    head.style.flexWrap = 'wrap';
    head.innerHTML =
      '<b>🆕 ' + (ar ? 'إشعارات المهام المضافة حديثاً (' + inbox.length + ')' : 'Newly Added Task Notifications (' + inbox.length + ')') + '</b>';

    const quickAddBtn = el('button', 'gov-btn primary', ar ? '+ إضافة مهمة سريعة مع إشعار فوري' : '+ Quick Task & Push Alert');
    quickAddBtn.type = 'button';
    quickAddBtn.addEventListener('click', () => {
      dlg.close();
      if (FOH.taskSheet && FOH.taskSheet.open) {
        FOH.taskSheet.open(null);
      } else if (FOH.sheet && FOH.sheet.open && S.tpl.sections[0]) {
        FOH.sheet.open({ sid: S.tpl.sections[0].id });
      }
    });
    head.append(quickAddBtn);
    card.append(head);

    if (!inbox.length) {
      card.append(
        el(
          'p',
          'empty',
          ar
            ? 'عند إضافة أي مهمة جديدة (من زر + إضافة مهمة أو تعديل الشيك ليست) سيصلك إشعار موبايل فوري وتظهر هنا ✓'
            : 'Whenever any task is added, an instant mobile notification is sent and logged here ✓'
        )
      );
    } else {
      inbox.slice(0, 5).forEach((item) => {
        const r = el('div', 'notif-item-row');
        r.innerHTML =
          '<div style="flex:1;min-width:170px;">' +
          '<b>' + item.title + '</b>' +
          '<small style="display:block;color:var(--ink2);margin-top:2px;">' + item.body + ' · 🕒 ' + item.createdAtHM + '</small>' +
          '</div>';
        card.append(r);
      });
      const clearBtn = el('button', 'gov-btn', ar ? '✓ مسح سجل المهام المضافة' : '✓ Clear History');
      clearBtn.type = 'button';
      clearBtn.style.marginTop = '8px';
      clearBtn.addEventListener('click', () => {
        saveTaskInbox([]);
        dlg.close();
        openNotificationCenterModal();
        updateNotifBellUI();
      });
      card.append(clearBtn);
    }

    const firstCard = dlg.querySelector('.notif-center-card');
    if (firstCard && firstCard.parentElement) {
      firstCard.parentElement.insertBefore(card, firstCard.nextSibling);
    }
  }




  FOH.taskInbox = {
    loadTaskInbox,
    saveTaskInbox,
    computeDelayMsForHM,
    notifyMobileOnNewTaskAdded,
    wireAutomaticTaskCreationNotifications,
    injectNewTasksInboxIntoNotifCenter,
  };
})(window.FOH = window.FOH || {});
