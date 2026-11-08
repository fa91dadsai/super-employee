// Task Assignment Module
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.loadSession() : null;
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function roleName(id) {
    return (FOH.staff && FOH.staff.roleName(id)) || id || '';
  }

  function getActiveSheetType() {
    return (FOH.sheetState && FOH.sheetState.getActiveSheetType) ? FOH.sheetState.getActiveSheetType() : 'opening';
  }

  function notifyMobileOnNewTaskAdded(t) {
    if (FOH.taskInbox && FOH.taskInbox.notifyMobileOnNewTaskAdded) {
      FOH.taskInbox.notifyMobileOnNewTaskAdded(t);
    } else if (FOH.notifCenter && FOH.notifCenter.notifyMobileOnNewTaskAdded) {
      FOH.notifCenter.notifyMobileOnNewTaskAdded(t);
    } else if (FOH.realtime && FOH.realtime.notifyMobileOnNewTaskAdded) {
      FOH.realtime.notifyMobileOnNewTaskAdded(t);
    }
  }

  function getScheduledSheetForNow() {
    return FOH.threeShifts ? FOH.threeShifts.getScheduledSheetForNow() : 'opening';
  }

  // ---- Add & Assign Task to Specific Employee or Role Modal ----
  // Helper for date math

  function canCurrentUserAssignTasks() {
    return (FOH.roleIdentity && FOH.roleIdentity.canCurrentUserAssignTasks)
      ? FOH.roleIdentity.canCurrentUserAssignTasks()
      : true;
  }

  function addDaysIso(iso, n) {
    if (FOH.schedule && FOH.schedule.addDays) return FOH.schedule.addDays(iso, n);
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  // ---- Add & Assign Task to Specific Employee or Role Modal ----
  // ============================================================================
  // Task Assignment Sub-Renderers & Modals (< 80 lines per function)
  // ============================================================================


  function buildTaskRuleAndBadge(recurData, rKey, opts = {}) {
    const isLegacy = typeof opts === 'string';
    const empUser = isLegacy ? opts : ((opts && opts.empUser) || '');
    const ar = isLegacy ? !!arguments[3] : (opts && typeof opts.ar === 'boolean' ? opts.ar : isAr());
    const roleBadgeMap = {
      super_waiter: '⭐ Super Waiter',
      super_bartender: '🍸 Super Bartender',
      super_captain: '🎖️ Super Captain',
      super_manager: '👑 Super Manager',
      all: ar ? '👥 الجميع' : '👥 All',
    };
    const empNameMap = {
      sara: ar ? 'سارة (Sara)' : 'Sara',
      maher: ar ? 'ماهر (Maher)' : 'Maher',
      ali: ar ? 'علي (Ali)' : 'Ali',
      fadi: ar ? 'فادي (Fadi)' : 'Fadi',
    };
    (S.tpl.staff || []).forEach((st) => {
      const k = (st.name || '').toLowerCase().split(' ')[0];
      if (k && !empNameMap[k]) empNameMap[k] = st.name;
    });

    const assignedRoleLabel = (empUser ? ('👤 ' + (empNameMap[empUser] || empUser) + ' · ') : '') + (roleBadgeMap[rKey] || '');

    let taskRule, taskStart, taskEndDate, isOpenEnded, dueHM, scheduleDate;
    if (recurData.recurType === 'recurring') {
      dueHM = recurData.recurTimeHM;
      taskStart = recurData.startDate;
      isOpenEnded = recurData.isOpenEnded;
      taskEndDate = isOpenEnded ? null : recurData.endDate;
      taskRule = { type: 'interval', every: recurData.currentEvery };
      scheduleDate = null;
    } else {
      dueHM = recurData.dueHM;
      scheduleDate = recurData.onceDate;
      taskStart = scheduleDate;
      taskEndDate = null;
      isOpenEnded = false;
      taskRule = { type: 'once', date: scheduleDate };
    }

    const recurDesc = recurData.recurType === 'recurring'
      ? (recurData.currentEvery === 1
          ? (ar ? '🔄 يومياً' : '🔄 Daily')
          : recurData.currentEvery === 7
          ? (ar ? '🔄 أسبوعياً' : '🔄 Weekly')
          : (ar ? '🔄 كل ' + recurData.currentEvery + ' أيام' : '🔄 Every ' + recurData.currentEvery + 'd')) +
        (isOpenEnded ? '' : (ar ? ' (حتى ' + taskEndDate + ')' : ' (until ' + taskEndDate + ')'))
      : (scheduleDate ? '📅 ' + scheduleDate : '');

    const fullBadgeLabel = assignedRoleLabel + (recurDesc ? ' · ' + recurDesc : '');

    return {
      assignedRoleLabel,
      fullBadgeLabel,
      taskRule,
      taskStart,
      taskEndDate,
      isOpenEnded,
      dueHM,
      scheduleDate,
      empName: empUser ? (empNameMap[empUser] || empUser) : (roleBadgeMap[rKey] || 'Staff'),
    };
  }

  function assembleNewTaskItems(params, meta) {
    const { textVal, targetSheet, rKey, empUser, recurData } = params;
    const newItem = {
      id: 'asg_' + Date.now(),
      text: textVal,
      textAr: textVal,
      due: meta.dueHM,
      role: '',
      assignedRoleKey: rKey,
      assignedUsername: empUser,
      assignedRoleLabel: meta.fullBadgeLabel,
      isRecurring: recurData.recurType === 'recurring',
      scheduleDate: recurData.recurType === 'once' ? meta.scheduleDate : null,
      recurrence: recurData.recurType === 'recurring' ? {
        type: 'interval',
        every: recurData.currentEvery,
        start: meta.taskStart,
        endDate: meta.taskEndDate,
        isOpenEnded: meta.isOpenEnded,
      } : null,
      children: [],
    };
    const templateTask = {
      id: newItem.id,
      text: textVal,
      textAr: textVal,
      icon: targetSheet === 'opening' ? '☀️' : targetSheet === 'mid' ? '🌤️' : '🌙',
      rule: meta.taskRule,
      start: meta.taskStart,
      endDate: meta.taskEndDate,
      isOpenEnded: meta.isOpenEnded,
      time: meta.dueHM || '14:00',
      lateAfter: 60,
      role: '',
      person: meta.empName,
      assignedRoleKey: rKey,
      assignedUsername: empUser,
      assignedSheet: targetSheet,
      carry: true,
      paused: false,
    };
    return { newItem, templateTask };
  }

  function broadcastAssignedTask(sess, targetSheet, opts = {}) {
    const isLegacy = typeof opts === 'object' && !('meta' in opts);
    const meta = isLegacy ? opts : (opts && opts.meta);
    const newItem = isLegacy ? arguments[3] : (opts && opts.newItem);
    const recurData = isLegacy ? arguments[4] : (opts && opts.recurData);
    if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
      FOH.cloudRealtime.broadcast('TASK_ASSIGNED', {
        senderName: (sess && sess.displayName) || 'Manager',
        targetSheet,
        dueHM: meta.dueHM,
        item: newItem,
        schedule: {
          recurType: recurData.recurType,
          every: recurData.currentEvery,
          start: meta.taskStart,
          endDate: meta.taskEndDate,
          scheduleDate: meta.scheduleDate,
        },
      });
    }
  }

  function saveAndNotifyTask(params) {
    const { textVal, targetSheet, targetSecId, rKey, empUser, recurData, ar, dlg } = params;
    const sess = getSession();
    const meta = buildTaskRuleAndBadge(recurData, rKey, empUser, ar);
    const { newItem, templateTask } = assembleNewTaskItems(params, meta);

    if (targetSheet !== getActiveSheetType() && FOH.erpPwa && FOH.erpPwa.switchSheetType) {
      manualSheetOverride = targetSheet !== getScheduledSheetForNow();
      FOH.erpPwa.switchSheetType(targetSheet);
    }

    const secObj = (S.tpl.sections || []).find((s) => s.id === targetSecId) || S.tpl.sections[0];
    if (secObj) secObj.items.unshift(newItem);
    if (FOH.erpPwa && FOH.erpPwa.persistCurrentSheetState) FOH.erpPwa.persistCurrentSheetState();

    S.tpl.tasks.unshift(templateTask);
    FOH.store.saveTemplate(S.tpl);
    dlg.close();

    notifyMobileOnNewTaskAdded({
      titleEn: textVal,
      titleAr: textVal,
      dueHM: meta.dueHM,
      sectionLabel: (secObj ? (ar ? secObj.titleAr || secObj.title : secObj.title) : targetSheet),
      roleLabel: meta.fullBadgeLabel,
      remindBefore: 0,
    });

    broadcastAssignedTask(sess, targetSheet, { meta, newItem, recurData });
    FOH.edit.toast(ar ? '✅ تم حفظ المهمة وتعيينها لـ (' + meta.assignedRoleLabel + ')!' : '✅ Task assigned to ' + meta.assignedRoleLabel + ' & saved!');
    FOH.app.render();
  }


  FOH.taskAssignmentState = {
    canCurrentUserAssignTasks,
    addDaysIso,
    buildTaskRuleAndBadge,
    assembleNewTaskItems,
    broadcastAssignedTask,
    saveAndNotifyTask,
    notifyMobileOnNewTaskAdded,
    getScheduledSheetForNow,
  };
})(window.FOH = window.FOH || {});
