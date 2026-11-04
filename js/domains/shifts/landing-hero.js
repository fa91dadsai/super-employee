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
    const textCol = el('div', 'rlh-text-col');
    textCol.innerHTML = '<h3>' + titleHtml + '</h3><p>' + subHtml + '</p>';

    const badgeCol = el('div', 'rlh-badge-col');
    badgeCol.innerHTML = '<span class="rlh-pct-badge">' + pct + '%</span>' +
      '<small>' + all.done + '/' + all.total + ' ' + (ar ? 'مكتمل' : 'done') + '</small>';

    headerRow.append(textCol, badgeCol);
    return headerRow;
  }

  function renderNextUrgentTaskCard(task, ar) {
    const card = el('div', 'rlh-urgent-card');
    const icon = task.isCritical ? '🚨' : '⚡';
    const tag = task.isCritical ? (ar ? 'مهمة حرجة فورية' : 'Critical Immediate') : (ar ? 'المهمة التالية المقترحة' : 'Next Suggested Task');
    const label = ar && task.textAr ? task.textAr : task.text;

    card.innerHTML = '<div class="rlh-urgent-icon">' + icon + '</div>' +
      '<div class="rlh-urgent-info"><span class="rlh-urgent-tag">' + tag + '</span>' +
      '<strong class="rlh-urgent-title">' + FOH.escapeHtml(label) + '</strong></div>';

    const checkBtn = el('button', 'rlh-urgent-action', '✓ ' + (ar ? 'إنجاز الآن' : 'Mark Done'));
    checkBtn.type = 'button';
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
    const actions = el('div', 'rlh-actions-row');
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
        const bAsg = el('button', 'rlh-btn primary', ar ? '➕ إضافة وتعيين مهمة' : '➕ Assign Task');
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
    const isOffToday = FOH.dayOff && FOH.dayOff.isStaffOffToday(myStaffId);
    let titleHtml = '';
    let subHtml = '';

    if (rKey === 'super_waiter' || rKey === 'staff') {
      titleHtml = '⭐ ' + (ar ? 'أهلاً ' + dispName + ' · مساحة عمل الويتر' : 'Welcome ' + dispName + ' · Waiter Station');
      subHtml = isOffToday ? (ar ? '🌴 عطلة رسمية معتمدة لليوم (OpsFlow Schedule)' : '🌴 Approved day off today (OpsFlow)') : (ar ? 'لديك ' + leftCount + ' مهام متبقية في شيك ليست هذا الشفت' : leftCount + ' tasks left');
    } else if (rKey === 'super_bartender') {
      titleHtml = '🍸 ' + (ar ? 'أهلاً ' + dispName + ' · محطة عمليات البار' : 'Welcome ' + dispName + ' · Bar Operations');
      subHtml = isOffToday ? (ar ? '🌴 عطلة رسمية معتمدة لليوم (OpsFlow Schedule)' : '🌴 Approved day off today') : (ar ? 'لديك ' + leftCount + ' مهام متبقية لتجهيز البار والطلبيات' : leftCount + ' tasks left');
    } else if (rKey === 'super_captain') {
      titleHtml = '🎖️ ' + (ar ? 'قيادة الصالة والشفت · الكابتن ' + dispName : 'Floor Captain Cockpit · ' + dispName);
      subHtml = ar ? 'جاهزية الصالة ' + pct + '% · إدارة وتعيين مهام الويترية' : 'Floor readiness ' + pct + '% · Waitstaff tasks';
    } else {
      titleHtml = '👑 ' + (ar ? 'لوحة القيادة التنفيذية · المدير ' + dispName : 'Executive Manager Pulse · ' + dispName);
      subHtml = ar ? 'إشراف كامل على الشيتات الثلاثة، التبس وجاهزية المطعم' : 'Full oversight of shift sheets, tips & readiness';
    }
    return { titleHtml, subHtml };
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
