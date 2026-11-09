// foh-opening/js/domains/shifts/header-subbars.js
// Header Subbars Layout & Single-Row Checklist Subbar
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const isAr = () => FOH.i18n.lang === 'ar';
  const getSession = () => (FOH.sessionAuth ? FOH.sessionAuth.getSession() : null);
  const loadGov = () => (FOH.gov ? FOH.gov.loadGov() : {});
  const saveGov = (g) => { if (FOH.gov) FOH.gov.saveGov(g); };
  const canCurrentUserEditChecklist = () => (FOH.gov ? FOH.gov.canCurrentUserEditChecklist() : false);
  const getActiveSheetType = () => (FOH.threeShifts ? FOH.threeShifts.getActiveSheetType() : 'opening');
  const openSuggestionModal = () => { if (FOH.suggestions) FOH.suggestions.openSuggestionModal(); };
  const getEffectiveNowHM = () => (FOH.opsLifecycle ? FOH.opsLifecycle.getEffectiveNowHM() : '12:00');
  const formatTime12Ar = (hm) => (FOH.opsLifecycle ? FOH.opsLifecycle.formatTime12Ar(hm) : hm);
  const getAppRoleIdentity = () => (FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {});
  const quickSwitchEmployeeAccount = (u) => { if (FOH.roleIdentity && FOH.roleIdentity.quickSwitchEmployeeAccount) FOH.roleIdentity.quickSwitchEmployeeAccount(u); };
  const hasSuperPerm = (p) => (FOH.roleIdentity ? FOH.roleIdentity.hasSuperPerm(p) : true);
  const closeSidebar = () => { if (FOH.navigation) FOH.navigation.closeSidebar(); };
  const isClosingSheetActive = () => (FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive ? FOH.opsLifecycle.isClosingSheetActive() : (FOH.threeShifts && FOH.threeShifts.getActiveSheetType ? FOH.threeShifts.getActiveSheetType() === 'closing' : false));
  const toBizMinutes = (hm) => (FOH.opsLifecycle && FOH.opsLifecycle.toBizMinutes ? FOH.opsLifecycle.toBizMinutes(hm) : (FOH.opsConfigStore && FOH.opsConfigStore.toBizMinutes ? FOH.opsConfigStore.toBizMinutes(hm) : 0));
  const loadOpsConfig = () => (FOH.opsLifecycle && FOH.opsLifecycle.loadOpsConfig ? FOH.opsLifecycle.loadOpsConfig() : (FOH.opsConfigStore && FOH.opsConfigStore.loadOpsConfig ? FOH.opsConfigStore.loadOpsConfig() : {}));
  const loadOpsDayState = () => (FOH.opsLifecycle && FOH.opsLifecycle.loadOpsDayState ? FOH.opsLifecycle.loadOpsDayState() : (FOH.opsConfigStore && FOH.opsConfigStore.loadOpsDayState ? FOH.opsConfigStore.loadOpsDayState() : {}));
  const getCurrentSuperRoleKey = () => (FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff');

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
      if (S.view === 'orders') {
        $('title').textContent = ar ? '🛒 طلبيات البار والمستودع' : '🛒 Bar & FOH Orders';
      } else {
        $('title').textContent = S.editing
          ? (ar ? '✎ تعديل الشيك ليست' : '✎ Edit Checklist')
          : (ar ? ident.titleAr.split('·')[0].trim() : ident.titleEn);
      }
    }
    if ($('restaurantBadge')) {
      $('restaurantBadge').textContent = '🍽 ' + (ar ? (gov.restaurantNameAr || 'مطعم سين') : (gov.restaurantName || 'CEEN Restaurant & Lounge'));
    }
    if ($('checklistLockPill')) $('checklistLockPill').style.display = 'none';
    if ($('activeSectionBadge')) $('activeSectionBadge').style.display = 'none';
  }

  function computeOpsStatusText(opts) {
    const { ar, h, daySt, nowBiz, openBiz, kLastBiz, minCloseBiz } = opts;
    if (daySt.closedAt) {
      return '🔒 ' + (ar ? 'مغلق (' + formatTime12Ar(daySt.closedAt) + ')' : 'Closed (' + formatTime12Ar(daySt.closedAt) + ')');
    }
    if (nowBiz < openBiz) {
      return '☀️ ' + (ar ? 'دوام التحضير ' + formatTime12Ar(h.prepStart) + ' · يفتح ' + formatTime12Ar(h.doorsOpen) : 'Prep ' + formatTime12Ar(h.prepStart) + ' · Opens ' + formatTime12Ar(h.doorsOpen));
    }
    if (nowBiz < kLastBiz - 15) {
      return '🟢 ' + (ar ? 'مفتوح (' + formatTime12Ar(h.doorsOpen) + '–' + formatTime12Ar(h.minCloseTime) + '+)' : 'Open (' + formatTime12Ar(h.doorsOpen) + '–' + formatTime12Ar(h.minCloseTime) + '+)');
    }
    if (nowBiz < minCloseBiz) {
      return '🔔 ' + (ar ? 'مرحلة Last Order (' + formatTime12Ar(h.kitchenLastOrder) + ' / ' + formatTime12Ar(h.barLastOrder) + ')' : 'Last Order (' + formatTime12Ar(h.kitchenLastOrder) + ' / ' + formatTime12Ar(h.barLastOrder) + ')');
    }
    return '⏳ ' + (ar ? 'بعد ' + formatTime12Ar(h.minCloseTime) + ' · يغلق مع آخر زبون' : 'Past ' + formatTime12Ar(h.minCloseTime) + ' · Last Guest Mode');
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

    const statusText = computeOpsStatusText({ ar, h, daySt, nowBiz, openBiz, kLastBiz, minCloseBiz });
    const existingChildren = Array.from(bar.children);
    bar.replaceChildren();

    const summaryRow = el('div', 'ops-compact-summary');
    const left = el('div', 'ops-compact-left', statusText);

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

  function renderGovProgressAndDate(opts) {
    const { pct, all, dateLabel, names } = opts;
    const items = [];
    items.push(el('span', 'u-pill accent', '📊 ' + pct + '% (' + all.done + '/' + all.total + ')'));

    const metaBtn = el('button', 'u-pill', '📅 ' + dateLabel + (names.length ? ' · ' + names[0] : '') + ' ▾');
    metaBtn.type = 'button';
    metaBtn.addEventListener('click', () => {
      if ($('metaPanel')) $('metaPanel').hidden = !$('metaPanel').hidden;
    });
    items.push(metaBtn);
    return items;
  }

  function renderGovScopeAndLock(opts) {
    const { ar, ident, gov, isMgr, sess } = opts;
    const items = [];
    if (ident.openingKeywords && !isClosingSheetActive()) {
      const curScope = (FOH.roleIdentity && FOH.roleIdentity.isRoleScopeOnly) ? FOH.roleIdentity.isRoleScopeOnly() : window.roleScopeOnly;
      const scopeBtn = el(
        'button',
        'u-pill' + (curScope ? ' accent' : ''),
        curScope ? (ar ? '🎯 مهام قسمي ✓' : '🎯 My Dept ✓') : (ar ? '👁 كل الأقسام' : '👁 All Depts')
      );
      scopeBtn.type = 'button';
      scopeBtn.addEventListener('click', () => {
        if (FOH.roleIdentity && FOH.roleIdentity.setRoleScopeOnly) {
          FOH.roleIdentity.setRoleScopeOnly(!curScope);
        } else {
          window.roleScopeOnly = !curScope;
        }
        FOH.app.render();
      });
      items.push(scopeBtn);
    }

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
      items.push(lockB);
    } else if (gov.checklistLocked) {
      items.push(el('span', 'u-pill warn', ar ? '🔒 مقفلة' : '🔒 Locked'));
    }
    return items;
  }

  function renderGovEditAndDamage(opts) {
    const { ar, canEdit, gov } = opts;
    const items = [];
    if (canEdit && !gov.checklistLocked) {
      const editB = el('button', 'u-pill', ar ? '✎ تعديل' : '✎ Edit');
      editB.type = 'button';
      editB.addEventListener('click', () => {
        S.editing = true;
        FOH.app.render();
      });
      items.push(editB);
    } else {
      const sugB = el('button', 'u-pill', ar ? '💡 اقتراح' : '💡 Suggest');
      sugB.type = 'button';
      sugB.addEventListener('click', () => openSuggestionModal());
      items.push(sugB);
    }

    const dmgB = el('button', 'u-pill', ar ? '🔧 كسر/صيانة' : '🔧 Damage');
    dmgB.type = 'button';
    dmgB.addEventListener('click', () => {
      if (FOH.invBreak && FOH.invBreak.open) FOH.invBreak.open();
    });
    items.push(dmgB);
    return items;
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

    const sugBox = govBar.querySelector('.sug-card');
    govBar.replaceChildren();

    const row = el('div', 'unified-sec-toolbar');
    row.append(...renderGovProgressAndDate({ pct, all, dateLabel, names }));
    row.append(...renderGovScopeAndLock({ ar, ident, gov, isMgr, sess }));
    row.append(...renderGovEditAndDamage({ ar, canEdit, gov }));

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
