// foh-opening/js/domains/cloud/realtime-handlers.js
// Supabase Realtime Inbound Message Handlers & UI Notifications
(function (FOH) {
  'use strict';

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }
  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }
  function loadMidSections() {
    return FOH.sheetState ? FOH.sheetState.loadMidSections() : [];
  }
  function loadClosingSections() {
    return FOH.sheetState ? FOH.sheetState.loadClosingSections() : [];
  }
  function saveMidSections(s) {
    if (FOH.sheetState) FOH.sheetState.saveMidSections(s);
  }
  function fireNativeLockScreenNotification(t, b, id) {
    if (FOH.snoozeEngine) FOH.snoozeEngine.fireNativeLockScreenNotification(t, b, id);
  }
  function notifyMobileOnNewTaskAdded(t) {
    if (FOH.notifCenter && FOH.notifCenter.notifyMobileOnNewTaskAdded) {
      FOH.notifCenter.notifyMobileOnNewTaskAdded(t);
    }
  }

  function appendTaskToSections(item, targetSheet, S) {
    let targetSections = S.tpl.sections;
    if (targetSheet === 'mid' && typeof loadMidSections === 'function') {
      targetSections = loadMidSections();
    } else if (targetSheet === 'closing' && typeof loadClosingSections === 'function') {
      targetSections = loadClosingSections();
    }

    const sec = targetSections.find((s) => s.id === item.sectionId) || targetSections[0];
    if (sec && !sec.items.some((it) => it.id === item.id)) {
      sec.items.unshift(item);
      if (targetSheet === 'mid' && typeof saveMidSections === 'function') {
        saveMidSections(targetSections);
      } else if (targetSheet === 'closing') {
        localStorage.setItem('foh-opening.closingSections.v1', JSON.stringify(targetSections));
      } else {
        FOH.store.saveTemplate(S.tpl);
      }
    }
  }

  function appendTaskToSchedule(item, targetSheet, S) {
    if (S.tpl.tasks.some((tk) => tk.id === item.id)) return;
    S.tpl.tasks.unshift({
      id: item.id,
      text: item.text,
      textAr: item.textAr || item.text,
      icon: targetSheet === 'opening' ? '☀️' : targetSheet === 'mid' ? '🌤️' : '🌙',
      rule: { type: 'once', date: S.date },
      start: S.date,
      time: item.due || '14:00',
      lateAfter: 60,
      role: '',
      person: item.assignedRoleLabel || '',
      assignedRoleKey: item.assignedRoleKey,
      assignedUsername: item.assignedUsername,
      assignedSheet: targetSheet,
      carry: true,
      paused: false,
    });
    FOH.store.saveTemplate(S.tpl);
  }

  function notifyTaskAssignment(item, opts = {}) {
    const { senderName = '', targetSheet = 'opening', ar = true } = opts;
    const alertTitle = ar
      ? '📲 مهمة جديدة موكلة لك من ' + (senderName || 'المدير')
      : '📲 New Task from ' + (senderName || 'Manager');
    const alertBody = (item.textAr || item.text) + (item.due ? (' · ⏰ ' + item.due) : '');

    if (typeof fireNativeLockScreenNotification === 'function') {
      fireNativeLockScreenNotification(alertTitle, alertBody, item.id);
    }
    if (typeof notifyMobileOnNewTaskAdded === 'function') {
      notifyMobileOnNewTaskAdded({
        titleEn: item.text,
        titleAr: item.textAr || item.text,
        dueHM: item.due,
        sectionLabel: targetSheet,
        roleLabel: item.assignedRoleLabel,
      });
    }
    if (FOH.edit && FOH.edit.toast) {
      FOH.edit.toast('📲 ' + alertTitle + ': ' + alertBody);
    }
  }

  function handleTaskAssignedBroadcast(data, opts = {}) {
    if (!data.item) return;
    const { curUser, curRole, ar, S } = opts;
    const item = data.item;
    const targetSheet = data.targetSheet || 'opening';
    const isForMe = !item.assignedUsername || item.assignedUsername === curUser ||
                    item.assignedRoleKey === 'all' || item.assignedRoleKey === curRole ||
                    curRole === 'super_manager' || curRole === 'super_captain';

    appendTaskToSections(item, targetSheet, S);

    if (isForMe) {
      appendTaskToSchedule(item, targetSheet, S);
      notifyTaskAssignment(item, { senderName: data.senderName, targetSheet, ar });
    }
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function handleTaskTickedBroadcast(data, S) {
    if (!data.itemId) return;
    if (data.checked) {
      S.run.checked[data.itemId] = data.at || FOH.time.nowHM();
    } else {
      delete S.run.checked[data.itemId];
    }
    if (data.sheetType === 'closing') {
      try {
        const cr = FOH.safeJsonParse(localStorage.getItem('foh-opening.closingRun.' + S.date), '{}');
        cr.checked = cr.checked || {};
        if (data.checked) cr.checked[data.itemId] = S.run.checked[data.itemId];
        else delete cr.checked[data.itemId];
        localStorage.setItem('foh-opening.closingRun.' + S.date, JSON.stringify(cr));
      } catch { /* Closing run storage quota fallback */ }
    } else if (data.sheetType === 'mid') {
      try {
        const mr = FOH.safeJsonParse(localStorage.getItem('foh-opening.midRun.' + S.date), '{}');
        mr.checked = mr.checked || {};
        if (data.checked) mr.checked[data.itemId] = S.run.checked[data.itemId];
        else delete mr.checked[data.itemId];
        localStorage.setItem('foh-opening.midRun.' + S.date, JSON.stringify(mr));
      } catch { /* Mid run storage quota fallback */ }
    } else {
      FOH.store.saveRun(S.date, S.run);
    }
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function handleLastOrderBroadcast(data, ar) {
    const title = ar
      ? '🔔 إعلان Last Order ' + (data.kind === 'kitchen' ? 'المطبخ 🍳' : 'البار 🍸') + ' من ' + data.byName
      : '🔔 Last Order Declared for ' + data.kind + ' by ' + data.byName;
    const body = ar
      ? 'الساعة ' + data.at + ' · يرجى البدء بإجراءات إغلاق القسم.'
      : 'At ' + data.at + ' · Please initiate department closing.';

    if (typeof fireNativeLockScreenNotification === 'function') {
      fireNativeLockScreenNotification(title, body, 'lo_' + Date.now());
    }
    if (FOH.edit && FOH.edit.toast) FOH.edit.toast(title);
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function handleRestaurantClosedBroadcast(data, ar) {
    const title = ar
      ? '🔒 تم إغلاق المطعم رسمياً من ' + data.closedBy
      : '🔒 Restaurant Officially Closed by ' + data.closedBy;
    if (typeof fireNativeLockScreenNotification === 'function') {
      fireNativeLockScreenNotification(title, ar ? 'اكتمل يوم العمل بنجاح ✓' : 'Shift day completed ✓', 'rc_' + Date.now());
    }
    if (FOH.edit && FOH.edit.toast) FOH.edit.toast(title);
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function handleShiftSealedBroadcast(data, ar) {
    const sType = data.shiftType === 'mid' ? (ar ? 'المتوسط' : 'Mid') : (data.shiftType === 'closing' ? (ar ? 'الإغلاق' : 'Closing') : (ar ? 'الافتتاح' : 'Opening'));
    const title = ar ? `🔒 تم ختم شفت ${sType} بواسطة ${data.sealedBy || ''}` : `🔒 ${sType} shift sealed by ${data.sealedBy || ''}`;
    const body = ar ? `الرصيد: ${data.cashCountJOD || 0} د.أ · البصمة: ${(data.auditDigest || '').slice(0, 8)}` : `Cash: ${data.cashCountJOD || 0} JOD · Digest: ${(data.auditDigest || '').slice(0, 8)}`;
    if (typeof fireNativeLockScreenNotification === 'function') fireNativeLockScreenNotification(title, body, 'seal_' + Date.now());
    if (FOH.edit && FOH.edit.toast) FOH.edit.toast(title);
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function handleShiftSealAckBroadcast(data, ar) {
    const title = ar ? `✓ اعتمد ${data.ackBy || 'المدير'} ختم الشفت` : `✓ Shift seal acknowledged by ${data.ackBy || 'Manager'}`;
    if (FOH.edit && FOH.edit.toast) FOH.edit.toast(title);
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function handleShiftSealDisputeBroadcast(data, ar) {
    const title = ar ? `⚠️ اعتراض على ختم الشفت: ${data.reason || ''}` : `⚠️ Shift seal disputed: ${data.reason || ''}`;
    if (typeof fireNativeLockScreenNotification === 'function') fireNativeLockScreenNotification(title, data.disputedBy || '', 'disp_' + Date.now());
    if (FOH.edit && FOH.edit.toast) FOH.edit.toast(title);
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function handleQuickReplenishBroadcast(data, ar) {
    const title = ar ? `⚡ طلب عاجل: ${data.itemName || ''} (${data.dept || ''})` : `⚡ Urgent Replenish: ${data.itemName || ''} (${data.dept || ''})`;
    const body = (ar ? 'بواسطة: ' : 'By: ') + (data.by || '');
    if (typeof fireNativeLockScreenNotification === 'function') fireNativeLockScreenNotification(title, body, 'repl_' + Date.now());
    if (FOH.edit && FOH.edit.toast) FOH.edit.toast(title);
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function handleInventoryCountSubmittedBroadcast(data, ar) {
    const modeLabel = data.mode === 'recount' ? (ar ? 'إعادة عد' : 'recount') : (ar ? 'عد أعمى' : 'blind count');
    const title = ar
      ? `📊 تم تسليم جرد (${modeLabel}) بواسطة ${data.byName || 'الموظف'}`
      : `📊 Inventory ${modeLabel} submitted by ${data.byName || 'Staff'}`;
    if (typeof fireNativeLockScreenNotification === 'function') {
      fireNativeLockScreenNotification(title, data.weekKey || '', 'inv_' + Date.now());
    }
    if (FOH.edit && FOH.edit.toast) FOH.edit.toast(title);
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function handleBreakageReportedBroadcast(data, ar) {
    const title = ar
      ? `⚠️ بلاغ كسر جديد (${data.qty || 1} قطعة) بواسطة ${data.byName || 'الموظف'}`
      : `⚠️ New breakage reported (${data.qty || 1} pcs) by ${data.byName || 'Staff'}`;
    if (typeof fireNativeLockScreenNotification === 'function') {
      fireNativeLockScreenNotification(title, data.cond || '', 'brk_' + Date.now());
    }
    if (FOH.edit && FOH.edit.toast) FOH.edit.toast(title);
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function handleIncomingBroadcast(data) {
    if (!data || !data.type) return;
    const ar = FOH.i18n ? FOH.i18n.lang === 'ar' : true;
    const sess = typeof getSession === 'function' ? getSession() : null;
    const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
    const curRole = typeof getCurrentSuperRoleKey === 'function' ? getCurrentSuperRoleKey() : 'staff';
    const S = FOH.state;

    if (data.type === 'TASK_ASSIGNED') {
      handleTaskAssignedBroadcast(data, { curUser, curRole, ar, S });
    } else if (data.type === 'TASK_TICKED') {
      handleTaskTickedBroadcast(data, S);
    } else if (data.type === 'LAST_ORDER_TRIGGERED') {
      handleLastOrderBroadcast(data, ar);
    } else if (data.type === 'RESTAURANT_CLOSED') {
      handleRestaurantClosedBroadcast(data, ar);
    } else if (data.type === 'SHIFT_SEALED') {
      handleShiftSealedBroadcast(data, ar);
    } else if (data.type === 'SHIFT_SEAL_ACKNOWLEDGED') {
      handleShiftSealAckBroadcast(data, ar);
    } else if (data.type === 'SHIFT_SEAL_DISPUTED') {
      handleShiftSealDisputeBroadcast(data, ar);
    } else if (data.type === 'QUICK_REPLENISH_TRIGGERED') {
      handleQuickReplenishBroadcast(data, ar);
    } else if (data.type === 'INVENTORY_COUNT_SUBMITTED') {
      handleInventoryCountSubmittedBroadcast(data, ar);
    } else if (data.type === 'BREAKAGE_REPORTED') {
      handleBreakageReportedBroadcast(data, ar);
    }
  }

  FOH.realtimeHandlers = {
    handleIncomingBroadcast,
  };
})(window.FOH = window.FOH || {});
