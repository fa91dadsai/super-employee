// foh-opening/js/domains/shifts/header-subbars.js
// Header Subbars Layout & Single-Row Checklist Subbar
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

  function loadGov() {
    return FOH.gov ? FOH.gov.loadGov() : {};
  }

  function saveGov(g) {
    if (FOH.gov) FOH.gov.saveGov(g);
  }

  function canCurrentUserEditChecklist() {
    return FOH.gov ? FOH.gov.canCurrentUserEditChecklist() : false;
  }

  function getActiveSheetType() {
    return FOH.threeShifts ? FOH.threeShifts.getActiveSheetType() : 'opening';
  }

  function openSuggestionModal() {
    if (FOH.suggestions) FOH.suggestions.openSuggestionModal();
  }

  function getEffectiveNowHM() {
    return FOH.opsLifecycle ? FOH.opsLifecycle.getEffectiveNowHM() : '12:00';
  }

  function formatTime12Ar(hm) {
    return FOH.opsLifecycle ? FOH.opsLifecycle.formatTime12Ar(hm) : hm;
  }

  function getAppRoleIdentity() {
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {};
  }

  function quickSwitchEmployeeAccount(u) {
    if (FOH.roleIdentity && FOH.roleIdentity.quickSwitchEmployeeAccount) FOH.roleIdentity.quickSwitchEmployeeAccount(u);
  }

  function hasSuperPerm(p) {
    return FOH.roleIdentity ? FOH.roleIdentity.hasSuperPerm(p) : true;
  }

  function closeSidebar() {
    if (FOH.navigation) FOH.navigation.closeSidebar();
  }

  function isClosingSheetActive() {
    return (FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive)
      ? FOH.opsLifecycle.isClosingSheetActive()
      : ((FOH.threeShifts && FOH.threeShifts.getActiveSheetType) ? FOH.threeShifts.getActiveSheetType() === 'closing' : false);
  }

  function toBizMinutes(hm) {
    return FOH.opsLifecycle ? FOH.opsLifecycle.toBizMinutes(hm) : 0;
  }

  function loadOpsConfig() {
    return FOH.opsLifecycle ? FOH.opsLifecycle.loadOpsConfig() : {};
  }

  function loadOpsDayState() {
    return FOH.opsLifecycle ? FOH.opsLifecycle.loadOpsDayState() : {};
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  // ============================================================================
  // 13. SUPER EMPLOYEE v11 ULTRA-CLEAN HEADER & SINGLE-ROW TOOLBAR OVERRIDES
  // ============================================================================
  let opsBarExpanded = false;

  function relocateHeaderSubbarsToMain() {
    const mainEl = $('appMain');
    if (!mainEl) return;
    const chips = $('chips');
    const sections = $('sections');
    if (chips && chips.parentElement !== mainEl && sections && sections.parentElement === mainEl) {
      mainEl.insertBefore(chips, sections);
    }
    const hBanner = $('healthAlertBanner');
    const tBanner = $('banner');
    if (tBanner && tBanner.parentElement !== mainEl) {
      mainEl.prepend(tBanner);
    }
    if (hBanner && hBanner.parentElement !== mainEl) {
      mainEl.prepend(hBanner);
    }
  }

  function renderCleanHeaderText() {
    const ar = isAr();
    const gov = loadGov();
    const ident = getAppRoleIdentity();

    if ($('title')) {
      $('title').textContent = S.editing
        ? (ar ? '✎ تعديل الشيك ليست' : '✎ Edit Checklist')
        : (ar ? ident.titleAr.split('·')[0].trim() : ident.titleEn);
    }
    if ($('restaurantBadge')) {
      $('restaurantBadge').textContent = '🍽 ' + (ar ? (gov.restaurantNameAr || 'مطعم سين') : (gov.restaurantName || 'CEEN Restaurant & Lounge'));
    }
    if ($('checklistLockPill')) $('checklistLockPill').style.display = 'none';
    if ($('activeSectionBadge')) $('activeSectionBadge').style.display = 'none';
  }

  function collapseOpsLifecycleBarToOneLine() {
    const bar = $('opsLifecycleBar');
    if (!bar) return;
    const rKey = getCurrentSuperRoleKey();
    if (rKey !== 'super_manager') {
      bar.hidden = true;
      return;
    }
    if (bar.hidden) return;
    const ar = isAr();
    const cfg = loadOpsConfig();
    const h = cfg.hours;
    const daySt = loadOpsDayState(S.date);
    const nowHM = getEffectiveNowHM();
    const nowBiz = toBizMinutes(nowHM);
    const openBiz = toBizMinutes(h.doorsOpen);
    const kLastBiz = toBizMinutes(h.kitchenLastOrder);
    const minCloseBiz = toBizMinutes(h.minCloseTime);

    let statusText = '';
    if (daySt.closedAt) {
      statusText = '🔒 ' + (ar ? 'مغلق (' + formatTime12Ar(daySt.closedAt) + ')' : 'Closed (' + formatTime12Ar(daySt.closedAt) + ')');
    } else if (nowBiz < openBiz) {
      statusText = '☀️ ' + (ar ? 'دوام التحضير ' + formatTime12Ar(h.prepStart) + ' · يفتح ' + formatTime12Ar(h.doorsOpen) : 'Prep ' + formatTime12Ar(h.prepStart) + ' · Opens ' + formatTime12Ar(h.doorsOpen));
    } else if (nowBiz < kLastBiz - 15) {
      statusText = '🟢 ' + (ar ? 'مفتوح (' + formatTime12Ar(h.doorsOpen) + '–' + formatTime12Ar(h.minCloseTime) + '+)' : 'Open (' + formatTime12Ar(h.doorsOpen) + '–' + formatTime12Ar(h.minCloseTime) + '+)');
    } else if (nowBiz < minCloseBiz) {
      statusText = '🔔 ' + (ar ? 'مرحلة Last Order (' + formatTime12Ar(h.kitchenLastOrder) + ' / ' + formatTime12Ar(h.barLastOrder) + ')' : 'Last Order (' + formatTime12Ar(h.kitchenLastOrder) + ' / ' + formatTime12Ar(h.barLastOrder) + ')');
    } else {
      statusText = '⏳ ' + (ar ? 'بعد ' + formatTime12Ar(h.minCloseTime) + ' · يغلق مع آخر زبون' : 'Past ' + formatTime12Ar(h.minCloseTime) + ' · Last Guest Mode');
    }

    const existingChildren = Array.from(bar.children);
    bar.replaceChildren();

    const summaryRow = el('div', 'ops-compact-summary');
    const left = el('div', 'ops-compact-left');
    left.textContent = statusText;

    const right = el('div', '');
    right.style.display = 'flex';
    right.style.gap = '5px';
    right.style.alignItems = 'center';

    const toggleBtn = el(
      'button',
      'ops-compact-toggle',
      opsBarExpanded
        ? (ar ? 'إخفاء الأوقات ▲' : 'Hide Hours ▲')
        : (ar ? '🕐 Last Order / إغلاق ▾' : '🕐 Hours & Close ▾')
    );
    toggleBtn.type = 'button';
    toggleBtn.addEventListener('click', () => {
      opsBarExpanded = !opsBarExpanded;
      FOH.app.render();
    });
    right.append(toggleBtn);
    summaryRow.append(left, right);
    bar.append(summaryRow);

    if (opsBarExpanded) {
      const drawer = el('div', 'ops-details-drawer');
      existingChildren.forEach((ch) => drawer.append(ch));
      bar.append(drawer);
    }
  }

  function renderUnifiedSingleRowChecklistBar() {
    const govBar = $('checklistGovBar');
    if (!govBar || S.editing || S.view !== 'opening') return;

    const ar = isAr();
    const gov = loadGov();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const canEdit = canCurrentUserEditChecklist();
    const ident = getAppRoleIdentity();

    const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S.run.checked);
    const pct = all.total ? Math.round((all.done * 100) / all.total) : 0;
    const names = [S.run.supervisor, S.run.captain, S.run.assistant].filter(Boolean);
    const day = new Date(S.date + 'T00:00:00');
    const dateLabel = isNaN(day)
      ? S.date
      : day.toLocaleDateString(FOH.i18n.locale, { weekday: 'short', day: 'numeric', month: 'short' });

    // Preserve pending suggestions box if any
    const sugBox = govBar.querySelector('.sug-card');
    govBar.replaceChildren();

    const row = el('div', 'unified-sec-toolbar');

    // 1. Progress Pill
    row.append(el('span', 'u-pill accent', '📊 ' + pct + '% (' + all.done + '/' + all.total + ')'));

    // 2. Date & Shift Leaders Toggle
    const metaBtn = el(
      'button',
      'u-pill',
      '📅 ' + dateLabel + (names.length ? ' · ' + names[0] : '') + ' ▾'
    );
    metaBtn.type = 'button';
    metaBtn.addEventListener('click', () => {
      if ($('metaPanel')) $('metaPanel').hidden = !$('metaPanel').hidden;
    });
    row.append(metaBtn);

    // 3. Role Scope Toggle (for Waiter / Bartender)
    if (ident.openingKeywords && !isClosingSheetActive()) {
      const scopeBtn = el(
        'button',
        'u-pill' + (roleScopeOnly ? ' accent' : ''),
        roleScopeOnly ? (ar ? '🎯 مهام قسمي ✓' : '🎯 My Dept ✓') : (ar ? '👁 كل الأقسام' : '👁 All Depts')
      );
      scopeBtn.type = 'button';
      scopeBtn.addEventListener('click', () => {
        roleScopeOnly = !roleScopeOnly;
        FOH.app.render();
      });
      row.append(scopeBtn);
    }

    // 4. Lock / Unlock Button (for Manager / Captain) or Lock Status
    if (isMgr || hasSuperPerm('canLockChecklist')) {
      const lockB = el(
        'button',
        'u-pill' + (gov.checklistLocked ? ' warn' : ''),
        gov.checklistLocked ? (ar ? '🔒 مقفلة' : '🔒 Locked') : (ar ? '🔓 مفتوحة' : '🔓 Unlocked')
      );
      lockB.type = 'button';
      lockB.addEventListener('click', () => {
        gov.checklistLocked = !gov.checklistLocked;
        gov.lockedBy = (sess && sess.displayName) || 'Supervisor';
        if (gov.checklistLocked) S.editing = false;
        saveGov(gov);
        FOH.app.render();
      });
      row.append(lockB);
    } else if (gov.checklistLocked) {
      row.append(el('span', 'u-pill warn', ar ? '🔒 مقفلة' : '🔒 Locked'));
    }

    // 5. Edit Checklist Button (or Suggest Edit for staff)
    if (canEdit && !gov.checklistLocked) {
      const editB = el('button', 'u-pill', ar ? '✎ تعديل' : '✎ Edit');
      editB.type = 'button';
      editB.addEventListener('click', () => {
        S.editing = true;
        FOH.app.render();
      });
      row.append(editB);
    } else {
      const sugB = el('button', 'u-pill', ar ? '💡 اقتراح' : '💡 Suggest');
      sugB.type = 'button';
      sugB.addEventListener('click', () => openSuggestionModal());
      row.append(sugB);
    }

    // 6. Report Damage / Repair Button
    const dmgB = el('button', 'u-pill', ar ? '🔧 كسر/صيانة' : '🔧 Damage');
    dmgB.type = 'button';
    dmgB.addEventListener('click', () => {
      if (FOH.invBreak && FOH.invBreak.open) FOH.invBreak.open();
    });
    row.append(dmgB);

    govBar.append(row);
    if (sugBox) govBar.append(sugBox);
  }

  function injectRoleSwitcherInSidebar() {
    const sb = $('appSidebar');
    const profCard = $('sbProfileCard');
    if (!sb || !profCard) return;
    let switcher = $('sbRoleQuickSwitcher');
    if (!switcher) {
      switcher = el('div', '');
      switcher.id = 'sbRoleQuickSwitcher';
      switcher.style.marginBottom = '10px';
      profCard.insertAdjacentElement('afterend', switcher);
    }
    switcher.replaceChildren();
    const ar = isAr();
    const sess = getSession();
    const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');

    const lbl = el('div', 'sb-sec-label', ar ? 'معاينة التطبيق حسب المنصب (تجربة فورية)' : 'SWITCH ROLE VIEW (1-TAP)');
    switcher.append(lbl);

    const pills = el('div', 'role-switch-pills');
    [
      ['sara', '⭐ Waiter'],
      ['maher', '🍸 Bartender'],
      ['ali', '🎖️ Captain'],
      ['fadi', '👑 Manager'],
    ].forEach(([uname, label]) => {
      const b = el('button', 'role-switch-pill' + (curUser === uname ? ' on' : ''), label);
      b.type = 'button';
      b.addEventListener('click', () => {
        quickSwitchEmployeeAccount(uname);
        closeSidebar();
      });
      pills.append(b);
    });
    switcher.append(pills);
  }




  FOH.headerSubbars = {
    relocateHeaderSubbarsToMain,
    renderCleanHeaderText,
    collapseOpsLifecycleBarToOneLine,
    renderUnifiedSingleRowChecklistBar,
    injectRoleSwitcherInSidebar,
  };
})(window.FOH = window.FOH || {});
