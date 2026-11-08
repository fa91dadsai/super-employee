// foh-opening/js/domains/shifts/landing-hero.js
// Compact Header Hero, Next Urgent Task Widget & Quick Shift Actions
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : true;
  }

  function getSession() {
    return (FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.getSession() : null);
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'super_manager';
  }

  function switchView(viewName) {
    if (FOH.app && FOH.app.switchView) FOH.app.switchView(viewName);
  }

  function canCurrentUserAssignTasks() {
    return FOH.roleIdentity ? FOH.roleIdentity.canCurrentUserAssignTasks() : true;
  }

  function openAssignTaskToStaffOrRoleModal() {
    if (FOH.taskAssignment && FOH.taskAssignment.openAssignTaskToStaffOrRoleModal) {
      FOH.taskAssignment.openAssignTaskToStaffOrRoleModal();
    }
  }

  function findNextUrgentTask() {
    const list = FOH.model.allLeaves({ sections: FOH.preview.sections() });
    return list.find((it) => it.isCritical && !S.run.checked[it.id]) || list.find((it) => !S.run.checked[it.id]);
  }

  function renderHeroHeader(opts) {
    const { titleHtml, subHtml, pct, all, ar } = opts;
    const headerRow = el('div', 'rlh-header-row');
    const titleBlock = el('div', 'rlh-title-block');
    titleBlock.innerHTML = '<h3 class="rlh-title">' + titleHtml + '</h3><p class="rlh-sub">' + subHtml + '</p>';

    const kpiBadge = el('div', 'rlh-kpi-badge');
    kpiBadge.innerHTML = '<div class="rlh-kpi-num">' + pct + '<small>%</small></div>' +
      '<div class="rlh-kpi-sub">' + all.done + '/' + all.total + ' ' + (ar ? 'منجز' : 'done') + '</div>';

    headerRow.append(titleBlock, kpiBadge);
    return headerRow;
  }

  function renderNextUrgentTaskCard(task, ar) {
    const card = el('div', 'rlh-next-task');
    const icon = task.isCritical ? '🚨' : '⚡';
    const tag = task.isCritical ? (ar ? 'مهمة حرجة فورية' : 'Critical Immediate') : (ar ? 'المهمة التالية المقترحة' : 'Next Suggested Task');
    const label = ar && task.textAr ? task.textAr : task.text;

    card.innerHTML = '<span class="rlh-next-ico">' + icon + '</span>' +
      '<div class="rlh-next-info"><small>' + tag + '</small>' +
      '<b title="' + FOH.escapeHtml(label) + '">' + FOH.escapeHtml(label) + '</b></div>';

    const checkBtn = el('button', 'rlh-next-done-btn', '✓ ' + (ar ? 'إنجاز' : 'Done'));
    checkBtn.type = 'button';
    checkBtn.setAttribute('aria-label', (ar ? 'إنجاز المهمة: ' : 'Complete task: ') + label);
    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      S.run.checked[task.id] = FOH.time.nowHM();
      if (FOH.store && FOH.store.saveRun) FOH.store.saveRun(S.date, S.run);
      if (navigator.vibrate) navigator.vibrate(15);
      FOH.app.render();
    });
    card.append(checkBtn);
    return card;
  }

  function renderHeroActions(rKey, ar) {
    const actions = el('div', 'rlh-actions');
    const bCockpit = el('button', 'rlh-btn' + (rKey === 'super_waiter' ? ' primary' : ''), ar ? '⚡ الوضع السريع (Cockpit)' : '⚡ Fast Cockpit');
    bCockpit.type = 'button';
    bCockpit.addEventListener('click', () => {
      if (FOH.opsLifecycle && FOH.opsLifecycle.setViewMode) {
        FOH.opsLifecycle.setViewMode('cockpit');
      }
    });
    actions.append(bCockpit);

    if (rKey === 'super_waiter' || rKey === 'staff') {
      const bAcad = el('button', 'rlh-btn', ar ? '🎓 أكاديمية المنيو' : '🎓 Academy');
      bAcad.type = 'button';
      bAcad.addEventListener('click', () => switchView('academy'));
      actions.append(bAcad);
    } else if (rKey === 'super_bartender') {
      const bOrd = el('button', 'rlh-btn primary', ar ? '🛒 طلبيات المستودع' : '🛒 Bar Orders');
      bOrd.type = 'button';
      bOrd.addEventListener('click', () => switchView('orders'));
      actions.append(bOrd);
    } else {
      if (canCurrentUserAssignTasks()) {
        const bAsg = el('button', 'rlh-btn primary', ar ? '➕ تعيين مهمة' : '➕ Assign Task');
        bAsg.type = 'button';
        bAsg.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());
        actions.append(bAsg);
      }
      const bDash = el('button', 'rlh-btn', ar ? '📊 لوحة التحليلات' : '📊 Analytics');
      bDash.type = 'button';
      bDash.addEventListener('click', () => switchView('dashboard'));
      actions.append(bDash);
    }
    return actions;
  }

  function resolveHeroText(opts) {
    const { rKey, dispName, leftCount, pct, myStaffId, ar } = opts;
    const cleanName = (dispName || 'Staff').replace(/\s*\([^)]*\)/g, '').trim();
    const safeDispName = FOH.escapeHtml(cleanName);
    const isOffToday = FOH.dayOff && FOH.dayOff.isStaffOffToday(myStaffId);
    let titleHtml = '';
    let subHtml = '';

    if (rKey === 'super_waiter' || rKey === 'staff') {
      titleHtml = '⭐ ' + (ar ? 'أهلاً ' + safeDispName + ' · مساحة الصالة' : 'Welcome ' + safeDispName + ' · Floor Station');
      subHtml = isOffToday ? (ar ? '🌴 عطلة رسمية معتمدة لليوم (OpsFlow Schedule)' : '🌴 Approved day off today') : (ar ? 'متبقي ' + leftCount + ' مهام في شيك ليست الشفت' : leftCount + ' tasks remaining');
    } else if (rKey === 'super_bartender') {
      titleHtml = '🍸 ' + (ar ? 'أهلاً ' + safeDispName + ' · محطة البار' : 'Welcome ' + safeDispName + ' · Bar Station');
      subHtml = isOffToday ? (ar ? '🌴 عطلة رسمية معتمدة لليوم (OpsFlow Schedule)' : '🌴 Approved day off today') : (ar ? 'متبقي ' + leftCount + ' مهام لتجهيز البار والطلبيات' : leftCount + ' tasks remaining');
    } else if (rKey === 'super_captain') {
      titleHtml = '🎖️ ' + (ar ? 'قيادة الصالة · الكابتن ' + safeDispName : 'Floor Captain · ' + safeDispName);
      subHtml = ar ? 'جاهزية الصالة ' + pct + '% · مهام الشفت' : 'Floor readiness ' + pct + '%';
    } else {
      titleHtml = '👑 ' + (ar ? 'لوحة القيادة التنفيذية · ' + safeDispName : 'Executive Pulse · ' + safeDispName);
      subHtml = ar ? 'إشراف كامل على الشيتات والتبس والجاهزية' : 'Full oversight of shift sheets & readiness';
    }
    return { titleHtml, subHtml };
  }

  function triggerRunnerCall(ar) {
    if (navigator.vibrate) navigator.vibrate(15);
    const sess = getSession();
    const uname = (sess && sess.displayName) || S.me.name || 'Staff';
    const activeSec = (FOH.modeDeptPanels && FOH.modeDeptPanels.getActiveDept) ? FOH.modeDeptPanels.getActiveDept() : 'floor';
    if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
      FOH.cloudRealtime.broadcast('RUNNER_CALL_TRIGGERED', {
        stationId: activeSec,
        byName: uname,
        at: FOH.time ? FOH.time.nowHM() : new Date().toLocaleTimeString(),
      });
    }
    const msg = ar ? '🏃 تم إرسال نداء فوري لمساعد الخدمة (Runner)!' : '🏃 Runner alert dispatched!';
    if (FOH.edit && FOH.edit.toast) FOH.edit.toast(msg);
  }

  function renderCompactCockpitBar(opts) {
    const { ar, dispName } = opts;
    const bar = el('div', 'rlh-cockpit-bar');
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.justifyContent = 'space-between';
    bar.style.minHeight = '38px';
    bar.style.maxHeight = '42px';
    bar.style.padding = '0 8px';
    bar.style.gap = '8px';

    const left = el('div', 'rlh-cockpit-left');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '6px';
    left.style.minWidth = '0';
    const activeSec = (FOH.modeDeptPanels && FOH.modeDeptPanels.getActiveDept) ? FOH.modeDeptPanels.getActiveDept() : 'floor';
    const secLabel = activeSec === 'all' ? (ar ? 'الصالة العامة' : 'Floor') : activeSec;
    left.innerHTML = '<span class="shift-live-pulse-dot"></span><b style="font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
      FOH.escapeHtml(secLabel) + ' · ' + FOH.escapeHtml(dispName) + '</b>';

    const right = el('div', 'rlh-cockpit-right');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '6px';

    const runnerBtn = el('button', 'btn sm danger rlh-runner-btn', ar ? '🏃 نداء رنر' : '🏃 Runner');
    runnerBtn.type = 'button';
    runnerBtn.style.padding = '4px 10px';
    runnerBtn.style.fontSize = '0.78rem';
    runnerBtn.style.minHeight = '32px';
    runnerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerRunnerCall(ar);
    });

    const toggleBtn = el('button', 'btn sm rlh-toggle-btn', ar ? '📋 القائمة' : '📋 Checklist');
    toggleBtn.type = 'button';
    toggleBtn.style.padding = '4px 8px';
    toggleBtn.style.fontSize = '0.75rem';
    toggleBtn.style.minHeight = '32px';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (FOH.opsLifecycle && FOH.opsLifecycle.toggleViewMode) {
        FOH.opsLifecycle.toggleViewMode();
      }
    });

    right.append(runnerBtn, toggleBtn);
    bar.append(left, right);
    return bar;
  }

  function renderRoleSpecificLandingHero() {
    const mainEl = $('appMain');
    if (!mainEl) return;
    let hero = $('roleLandingHero');
    if (S.editing || S.view !== 'opening') {
      if (hero) hero.hidden = true;
      return;
    }
    if (!hero) {
      hero = el('section', 'role-landing-hero run-only');
      hero.id = 'roleLandingHero';
      mainEl.prepend(hero);
    }
    hero.hidden = false;
    hero.replaceChildren();

    const ar = isAr();
    const rKey = getCurrentSuperRoleKey();
    const sess = getSession();
    const dispName = (sess && (ar ? sess.displayNameAr || sess.displayName : sess.displayName)) || S.me.name || 'Staff';
    const myStaffId = (sess && sess.staffId) || S.me.staffId;

    const isCockpit = FOH.opsLifecycle && FOH.opsLifecycle.getViewMode && FOH.opsLifecycle.getViewMode() === 'cockpit';
    const activeSec = (FOH.modeDeptPanels && FOH.modeDeptPanels.getActiveDept) ? FOH.modeDeptPanels.getActiveDept() : 'floor';
    if (isCockpit) {
      hero.className = 'role-landing-hero run-only cockpit-compact role-' + rKey;
      hero.append(renderCompactCockpitBar({ ar, rKey, dispName }));
      if (FOH.shiftSealing && FOH.shiftSealing.renderPendingHandoverPill) {
        FOH.shiftSealing.renderPendingHandoverPill(hero, activeSec);
      }
      if (FOH.ordersView && FOH.ordersView.renderQuickReplenishDrawer) {
        FOH.ordersView.renderQuickReplenishDrawer(hero);
      }
      return;
    }

    if (FOH.shiftSealing && FOH.shiftSealing.renderPendingHandoverPill) {
      FOH.shiftSealing.renderPendingHandoverPill(hero, activeSec);
    }

    const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S.run.checked);
    const pct = all.total ? Math.round((all.done * 100) / all.total) : 0;
    const leftCount = all.total - all.done;

    hero.className = 'role-landing-hero run-only role-' + rKey;
    const { titleHtml, subHtml } = resolveHeroText({ rKey, dispName, leftCount, pct, myStaffId, ar });
    const headerRow = renderHeroHeader({ titleHtml, subHtml, pct, all, ar });

    const progressTrack = el('div', 'rlh-progress-track');
    const progressBar = el('div', 'rlh-progress-fill');
    progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    progressTrack.append(progressBar);
    hero.append(headerRow, progressTrack);

    const nextTask = findNextUrgentTask();
    if (nextTask) hero.append(renderNextUrgentTaskCard(nextTask, ar));
    hero.append(renderHeroActions(rKey, ar));
  }

  FOH.landingHero = {
    renderRoleSpecificLandingHero,
  };
})(window.FOH = window.FOH || {});
