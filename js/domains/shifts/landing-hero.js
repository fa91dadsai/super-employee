// foh-opening/js/domains/shifts/landing-hero.js
// Role-Tailored Landing Hero Cockpit with High-Precision Progress KPI & Next Urgent Task
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  function getSession() {
    return (FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.getSession() : null);
  }

  function getCurrentSuperRoleKey() {
    return (FOH.auth && FOH.auth.getCurrentSuperRoleKey) ? FOH.auth.getCurrentSuperRoleKey() : (FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff');
  }

  function canCurrentUserAssignTasks() {
    return (FOH.auth && FOH.auth.canCurrentUserAssignTasks) ? FOH.auth.canCurrentUserAssignTasks() : true;
  }

  function switchView(v) {
    if (FOH.superEmployee && FOH.superEmployee.switchView) FOH.superEmployee.switchView(v);
    else if (FOH.navigation && FOH.navigation.switchView) FOH.navigation.switchView(v);
    else { S.view = v; FOH.app.render(); }
  }

  function openAssignTaskToStaffOrRoleModal() {
    if (FOH.taskAssignment && FOH.taskAssignment.openAssignTaskToStaffOrRoleModal) {
      FOH.taskAssignment.openAssignTaskToStaffOrRoleModal();
    }
  }

  function saveSession(s) {
    if (FOH.sessionAuth) FOH.sessionAuth.saveSession(s);
  }

  function isItemAssigned(it, curUser, curRole) {
    if (it.assignedUsername && it.assignedUsername.toLowerCase() === curUser) return true;
    if (!it.assignedUsername && it.assignedRoleKey && it.assignedRoleKey === curRole) return true;
    return false;
  }

  function findNextUrgentTask() {
    const sess = getSession();
    const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
    const curRole = getCurrentSuperRoleKey();
    const sections = (S.tpl && S.tpl.sections) || [];
    const checked = (S.run && S.run.checked) || {};

    for (const sec of sections) {
      for (const it of (sec.items || [])) {
        if (!checked[it.id] && isItemAssigned(it, curUser, curRole)) {
          return { type: 'item', id: it.id, text: it.text, textAr: it.textAr, secId: sec.id };
        }
      }
    }
    return null;
  }

  function renderHeroHeader(opts) {
    const { titleHtml, subHtml, pct, all, ar } = opts;
    const headerRow = el('div', 'rlh-header-row');
    const titleBlock = el('div', 'rlh-title-block');
    titleBlock.innerHTML =
      '<h3 class="rlh-title">' + titleHtml + '</h3>' +
      '<p class="rlh-sub">' + subHtml + '</p>';

    const kpiBadge = el('div', 'rlh-kpi-badge');
    kpiBadge.innerHTML =
      '<div class="rlh-kpi-num">' + pct + '<small>%</small></div>' +
      '<div class="rlh-kpi-sub">' + all.done + '/' + all.total + ' ' + (ar ? 'منجز' : 'Done') + '</div>';

    headerRow.append(titleBlock, kpiBadge);
    return headerRow;
  }

  function renderNextUrgentTaskCard(task, ar) {
    const card = el('div', 'rlh-next-task');
    card.append(
      el('span', 'rlh-next-ico', '⚡'),
      Object.assign(el('div', 'rlh-next-info'), {
        innerHTML: '<small>' + (ar ? 'المهمة المستعجلة التالية:' : 'Next Urgent Task:') + '</small>' +
          '<b>' + FOH.escapeHtml(ar && task.textAr ? task.textAr : task.text) + '</b>',
      })
    );

    const doneBtn = el('button', 'rlh-next-done-btn', ar ? '✓ إنجاز الآن' : '✓ Mark Done');
    doneBtn.type = 'button';
    doneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(15);
      const timeStr = FOH.time ? FOH.time.nowHM() : '';
      S.run.checked[task.id] = timeStr;
      if (FOH.store && FOH.store.saveRun) FOH.store.saveRun(S.date, S.run);
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '✓ تم إنجاز المهمة بنجاح' : '✓ Task marked complete');
      }
      FOH.app.render();
    });

    card.append(doneBtn);
    return card;
  }

  function renderHeroActions(rKey, ar) {
    const actions = el('div', 'rlh-actions');
    if (rKey === 'super_waiter' || rKey === 'staff') {
      const bMine = el('button', 'rlh-btn primary', ar ? '📋 مهامي الخاصة بهذا الشفت' : '📋 My Shift Tasks');
      bMine.type = 'button';
      bMine.addEventListener('click', () => switchView('mine'));
      actions.append(bMine);
    } else if (rKey === 'super_bartender') {
      const bOrd = el('button', 'rlh-btn primary', ar ? '🛒 طلبيات البار من المستودع' : '🛒 Bar Warehouse Orders');
      bOrd.type = 'button';
      bOrd.addEventListener('click', () => switchView('orders'));
      actions.append(bOrd);
    } else if (rKey === 'super_captain') {
      if (canCurrentUserAssignTasks()) {
        const bAsg = el('button', 'rlh-btn primary', ar ? '➕ تعيين مهمة لويتر / بارتندر' : '➕ Assign Task');
        bAsg.type = 'button';
        bAsg.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());
        actions.append(bAsg);
      }
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
    const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S.run.checked);
    const pct = all.total ? Math.round((all.done * 100) / all.total) : 0;
    const leftCount = all.total - all.done;

    hero.className = 'role-landing-hero run-only role-' + rKey;

    let titleHtml = '';
    let subHtml = '';
    if (rKey === 'super_waiter' || rKey === 'staff') {
      titleHtml = '⭐ ' + (ar ? 'أهلاً ' + dispName + ' · مساحة عمل الويتر' : 'Welcome ' + dispName + ' · Waiter Station');
      subHtml = ar ? 'لديك ' + leftCount + ' مهام متبقية في شيك ليست هذا الشفت' : leftCount + ' tasks remaining in current shift';
    } else if (rKey === 'super_bartender') {
      titleHtml = '🍸 ' + (ar ? 'أهلاً ' + dispName + ' · محطة عمليات البار' : 'Welcome ' + dispName + ' · Bar Operations');
      subHtml = ar ? 'لديك ' + leftCount + ' مهام متبقية لتجهيز البار والطلبيات' : leftCount + ' tasks left for bar prep & orders';
    } else if (rKey === 'super_captain') {
      titleHtml = '🎖️ ' + (ar ? 'قيادة الصالة والشفت · الكابتن ' + dispName : 'Floor Captain Cockpit · ' + dispName);
      subHtml = ar ? 'جاهزية الصالة ' + pct + '% · إدارة وتعيين مهام الويترية' : 'Floor readiness ' + pct + '% · Manage waitstaff tasks';
    } else {
      titleHtml = '👑 ' + (ar ? 'لوحة القيادة التنفيذية · المدير ' + dispName : 'Executive Manager Pulse · ' + dispName);
      subHtml = ar ? 'إشراف كامل على الشيتات الثلاثة، التبس وجاهزية المطعم' : 'Full oversight of shift sheets, tips & readiness';
    }

    const headerRow = renderHeroHeader({ titleHtml, subHtml, pct, all, ar });

    const progressTrack = el('div', 'rlh-progress-track');
    const progressBar = el('div', 'rlh-progress-fill');
    progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    progressTrack.append(progressBar);

    hero.append(headerRow, progressTrack);

    // Next Urgent Task Cockpit
    const nextTask = findNextUrgentTask();
    if (nextTask) {
      hero.append(renderNextUrgentTaskCard(nextTask, ar));
    }

    hero.append(renderHeroActions(rKey, ar));
  }

  FOH.landingHero = {
    renderRoleSpecificLandingHero,
  };
})(window.FOH = window.FOH || {});
