// foh-opening/js/domains/shifts/landing-hero.js
// Role-Tailored Landing Hero Card with High-Precision Progress KPI Badge
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

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function canCurrentUserAccessOrders() {
    return FOH.roleIdentity ? FOH.roleIdentity.canCurrentUserAccessOrders() : true;
  }

  function canCurrentUserAssignTasks() {
    return FOH.roleIdentity ? FOH.roleIdentity.canCurrentUserAssignTasks() : true;
  }

  function switchView(v) {
    if (FOH.navigation) FOH.navigation.switchView(v);
  }

  function openAssignTaskToStaffOrRoleModal() {
    if (FOH.taskAssignment) FOH.taskAssignment.openAssignTaskToStaffOrRoleModal();
  }

  function saveSession(s) {
    if (FOH.sessionAuth) FOH.sessionAuth.saveSession(s);
  }

  // ============================================================================
  // 16. SUPER EMPLOYEE v14: ROLE-SPECIFIC LANDING PAGE COCKPIT
  // ============================================================================
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

    // Hide the administrative #opsLifecycleBar for Waiters & Bartenders & Captains so only Manager sees restaurant open/close lifecycle!
    const opsBar = $('opsLifecycleBar');
    if (opsBar) {
      if (rKey !== 'super_manager') {
        opsBar.hidden = true;
      }
    }

    const headerRow = el('div', 'rlh-header-row');
    const titleBlock = el('div', 'rlh-title-block');
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

    titleBlock.innerHTML =
      '<h3 class="rlh-title">' + titleHtml + '</h3>' +
      '<p class="rlh-sub">' + subHtml + '</p>';

    // Sleek KPI Badge in Corner - NEVER crushed or wrapped
    const kpiBadge = el('div', 'rlh-kpi-badge');
    kpiBadge.innerHTML =
      '<div class="rlh-kpi-num">' + pct + '<small>%</small></div>' +
      '<div class="rlh-kpi-sub">' + all.done + '/' + all.total + ' ' + (ar ? 'منجز' : 'Done') + '</div>';

    headerRow.append(titleBlock, kpiBadge);

    // Sleek Linear Progress Track
    const progressTrack = el('div', 'rlh-progress-track');
    const progressBar = el('div', 'rlh-progress-fill');
    progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    progressTrack.append(progressBar);

    const actions = el('div', 'rlh-actions');

    if (rKey === 'super_waiter' || rKey === 'staff') {
      const bMine = el('button', 'rlh-btn primary', ar ? '📋 مهامي الخاصة بهذا الشفت' : '📋 My Shift Tasks');
      bMine.type = 'button';
      bMine.addEventListener('click', () => switchView('mine'));

      const bDayOff = el('button', 'rlh-btn', ar ? '🏖️ طلب يوم عطلة / أوف' : '🏖️ Request Day-Off');
      bDayOff.type = 'button';
      bDayOff.addEventListener('click', () => {
        switchView('mine');
        setTimeout(() => {
          const el = document.querySelector('.dayoff-form') || document.getElementById('mine');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      });

      actions.append(bMine, bDayOff);

      if (canCurrentUserAccessOrders()) {
        const bOrd = el('button', 'rlh-btn', ar ? '🛒 طلبيات الصالة والمستودع' : '🛒 Store Orders');
        bOrd.type = 'button';
        bOrd.addEventListener('click', () => switchView('orders'));
        actions.append(bOrd);
      }

      const bAcad = el('button', 'rlh-btn', ar ? '🎓 منيو أكاديمي (+XP)' : '🎓 Menu Academy (+XP)');
      bAcad.type = 'button';
      bAcad.addEventListener('click', () => switchView('academy'));

      const bDmg = el('button', 'rlh-btn', ar ? '🔧 تبليغ كسر / صيانة' : '🔧 Report Breakage');
      bDmg.type = 'button';
      bDmg.addEventListener('click', () => FOH.invBreak && FOH.invBreak.open && FOH.invBreak.open());

      if (canCurrentUserAssignTasks()) {
        const bAsg = el('button', 'rlh-btn primary', ar ? '➕ تعيين مهمة' : '➕ Assign Task');
        bAsg.type = 'button';
        bAsg.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());
        actions.append(bAsg);
      }
      actions.append(bAcad, bDmg);
    } else if (rKey === 'super_bartender') {
      if (canCurrentUserAccessOrders()) {
        const bOrd = el('button', 'rlh-btn primary', ar ? '🛒 طلبيات البار من المستودع' : '🛒 Bar Warehouse Orders');
        bOrd.type = 'button';
        bOrd.addEventListener('click', () => switchView('orders'));
        actions.append(bOrd);
      }

      const bMine = el('button', 'rlh-btn' + (!canCurrentUserAccessOrders() ? ' primary' : ''), ar ? '📋 مهام البار الخاصة بي' : '📋 My Bar Tasks');
      bMine.type = 'button';
      bMine.addEventListener('click', () => switchView('mine'));

      const bDayOff = el('button', 'rlh-btn', ar ? '🏖️ طلب يوم عطلة / أوف' : '🏖️ Request Day-Off');
      bDayOff.type = 'button';
      bDayOff.addEventListener('click', () => {
        switchView('mine');
        setTimeout(() => {
          const el = document.querySelector('.dayoff-form') || document.getElementById('mine');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      });

      const bInv = el('button', 'rlh-btn', ar ? '📦 جرد البار وتسجيل التالف' : '📦 Bar Inventory & Breakage');
      bInv.type = 'button';
      bInv.addEventListener('click', () => switchView('inv'));

      if (canCurrentUserAssignTasks()) {
        const bAsg = el('button', 'rlh-btn primary', ar ? '➕ تعيين مهمة' : '➕ Assign Task');
        bAsg.type = 'button';
        bAsg.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());
        actions.append(bAsg);
      }
      actions.append(bMine, bDayOff, bInv);
    } else if (rKey === 'super_captain') {
      if (canCurrentUserAssignTasks()) {
        const bAsg = el('button', 'rlh-btn primary', ar ? '➕ تعيين مهمة لويتر / بارتندر' : '➕ Assign Task to Staff');
        bAsg.type = 'button';
        bAsg.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());
        actions.append(bAsg);
      }

      const bMine = el('button', 'rlh-btn', ar ? '📋 مهامي الخاصة' : '📋 My Tasks');
      bMine.type = 'button';
      bMine.addEventListener('click', () => switchView('mine'));

      if (canCurrentUserAccessOrders()) {
        const bOrd = el('button', 'rlh-btn', ar ? '🛒 مراجعة طلبيات الصالة' : '🛒 Review Orders');
        bOrd.type = 'button';
        bOrd.addEventListener('click', () => switchView('orders'));
        actions.append(bOrd);
      }

      const bDayOff = el('button', 'rlh-btn', ar ? '🏖️ طلب يوم عطلة / أوف' : '🏖️ Request Day-Off');
      bDayOff.type = 'button';
      bDayOff.addEventListener('click', () => {
        switchView('mine');
        setTimeout(() => {
          const el = document.querySelector('.dayoff-form') || document.getElementById('mine');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      });

      actions.append(bMine, bDayOff);
    } else {
      if (canCurrentUserAssignTasks()) {
        const bAsg = el('button', 'rlh-btn primary', ar ? '➕ إضافة وتعيين مهمة' : '➕ Assign Task to Staff');
        bAsg.type = 'button';
        bAsg.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());
        actions.append(bAsg);
      }

      const bDash = el('button', 'rlh-btn', ar ? '📊 لوحة التحليلات والتقارير' : '📊 Analytics Dashboard');
      bDash.type = 'button';
      bDash.addEventListener('click', () => switchView('dashboard'));

      const bSet = el('button', 'rlh-btn', ar ? '⚙️ الإعدادات والصلاحيات' : '⚙️ Settings & Permissions');
      bSet.type = 'button';
      bSet.addEventListener('click', () => switchView('settings'));

      actions.append(bDash, bSet);
    }

    hero.append(headerRow, progressTrack, actions);

    // If Manager and there are pending staff name/nickname change requests, display pending approvals card
    if (rKey === 'super_manager') {
      const pendingChanges = (S.tpl.staff || []).filter(
        (p) => p.pendingNameChange && p.pendingNameChange.status === 'pending'
      );
      if (pendingChanges.length > 0) {
        const pac = el('div', 'pending-approvals-card');
        pac.innerHTML =
          '<div class="pac-head">' +
          '<span><b>📝 ' + (ar ? 'طلبات اعتماد تعديل أسماء الموظفين والـ Nicknames' : 'Pending Staff Name Change Approvals') + '</b></span>' +
          '<span class="pac-badge">' + pendingChanges.length + ' ' + (ar ? 'طلب جديد' : 'New') + '</span>' +
          '</div>';
        const pacList = el('div', 'pac-list');
        pendingChanges.forEach((st) => {
          const req = st.pendingNameChange;
          const it = el('div', 'pac-item');
          it.innerHTML =
            '<div class="pac-item-info">' +
            '<b>' + st.name + '</b> (' + (st.role || 'Staff') + ')<br>' +
            (ar ? 'الاسم الرسمي الجديد المطلوب:' : 'Requested Legal Name:') + ' <b style="color:var(--accent);">' + (FOH.escapeHtml(req.reqFullName || (req.reqFirstName + ' ' + req.reqLastName))) + '</b><br>' +
            (ar ? 'الـ Nickname المقترح (للتبس والجدول):' : 'Requested Nickname:') + ' <b style="color:#10b981;">🏷️ ' + (FOH.escapeHtml(req.reqNickname || '—')) + '</b>' +
            '</div>';
          const actDiv = el('div', 'pac-item-actions');
          const appBtn = el('button', 'pac-btn approve', ar ? '✓ اعتماد وتطبيق في كافة الأنظمة' : '✓ Approve & Sync');
          appBtn.type = 'button';
          appBtn.addEventListener('click', () => {
            st.name = req.reqFullName || ((req.reqFirstName + ' ' + req.reqLastName).trim()) || st.name;
            if (req.reqNickname) st.nickname = req.reqNickname;
            delete st.pendingNameChange;
            FOH.store.saveTemplate(S.tpl);
            if (sess && (sess.staffId === st.id || (sess.username || '').toLowerCase() === (st.name || '').toLowerCase())) {
              sess.firstName = req.reqFirstName;
              sess.lastName = req.reqLastName;
              sess.displayName = st.name;
              sess.nickname = st.nickname;
              saveSession(sess, true);
            }
            if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
              FOH.cloudRealtime.broadcast('STAFF_NAME_CHANGE_APPROVED', { staffId: st.id, name: st.name, nickname: st.nickname });
            }
            FOH.edit.toast(ar ? ('✓ تم اعتماد تعديل اسم ' + st.name + ' ولقب ' + (st.nickname || '') + ' بنجاح') : 'Approved and synced across all apps ✓');
            FOH.app.render();
          });

          const rejBtn = el('button', 'pac-btn reject', ar ? '✕ رفض الطلب' : '✕ Reject');
          rejBtn.type = 'button';
          rejBtn.addEventListener('click', () => {
            delete st.pendingNameChange;
            FOH.store.saveTemplate(S.tpl);
            FOH.edit.toast(ar ? 'تم رفض طلب التعديل' : 'Request rejected');
            FOH.app.render();
          });

          actDiv.append(appBtn, rejBtn);
          it.append(actDiv);
          pacList.append(it);
        });
        pac.append(pacList);
        hero.append(pac);
      }
    }
  }



  FOH.landingHero = {
    renderRoleSpecificLandingHero,
  };
})(window.FOH = window.FOH || {});
