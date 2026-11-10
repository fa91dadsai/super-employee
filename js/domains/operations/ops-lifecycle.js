// foh-opening/js/domains/operations/ops-lifecycle.js
// Operational Hours, Lifecycle Bar & Closing Department Flow
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const OPS_CONFIG_KEY = 'super-employee.opsConfig.v2';
  const OPS_DAY_STATE_KEY = 'super-employee.opsDayState.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function loadGov() {
    return FOH.gov ? FOH.gov.loadGov() : {};
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function getSheetType() {
    return FOH.sheetState ? FOH.sheetState.getSheetType() : 'opening';
  }

  function switchSheetType(t) {
    if (FOH.sheetState) FOH.sheetState.switchSheetType(t);
  }

  function loadTipsData() {
    return FOH.tipsView ? FOH.tipsView.loadTipsData() : {};
  }

  function saveTipsData(d) {
    if (FOH.tipsView) FOH.tipsView.saveTipsData(d);
  }

  function hasSuperPerm(p) {
    return FOH.roleIdentity ? FOH.roleIdentity.hasSuperPerm(p) : true;
  }

  // ============================================================================
  // 11. Operational Hours, Shift Prep, Department Last Order, Closing Sheet
  //     by Department, "Close Restaurant (Last Guest)" Gate & Super Roles (v9)
  // ============================================================================
  // Delegate to opsConfigStore
  const SUPER_ROLES_META = (FOH.opsConfigStore && FOH.opsConfigStore.SUPER_ROLES_META) || (FOH.SUPER_ROLES_META || {});
  const PERM_LABELS = (FOH.opsConfigStore && FOH.opsConfigStore.PERM_LABELS) || (FOH.PERM_LABELS || []);
  const loadOpsConfig = () => (FOH.opsConfigStore && FOH.opsConfigStore.loadOpsConfig ? FOH.opsConfigStore.loadOpsConfig() : {});
  const saveOpsConfig = (c) => (FOH.opsConfigStore && FOH.opsConfigStore.saveOpsConfig ? FOH.opsConfigStore.saveOpsConfig(c) : null);
  const toBizMinutes = (hm) => (FOH.opsConfigStore && FOH.opsConfigStore.toBizMinutes ? FOH.opsConfigStore.toBizMinutes(hm) : 0);
  const formatTime12Ar = (hm) => (FOH.opsConfigStore && FOH.opsConfigStore.formatTime12Ar ? FOH.opsConfigStore.formatTime12Ar(hm) : hm);
  const getEffectiveNowHM = () => (FOH.opsConfigStore && FOH.opsConfigStore.getEffectiveNowHM ? FOH.opsConfigStore.getEffectiveNowHM() : '12:00');
  const getSimulatedShiftTime = () => (FOH.opsConfigStore && FOH.opsConfigStore.getSimulatedShiftTime ? FOH.opsConfigStore.getSimulatedShiftTime() : '');
  const setSimulatedShiftTime = (v) => { if (FOH.opsConfigStore && FOH.opsConfigStore.setSimulatedShiftTime) FOH.opsConfigStore.setSimulatedShiftTime(v); };
  const loadOpsDayState = (d) => (FOH.opsConfigStore && FOH.opsConfigStore.loadOpsDayState ? FOH.opsConfigStore.loadOpsDayState(d) : {});
  const saveOpsDayState = (d, st) => (FOH.opsConfigStore && FOH.opsConfigStore.saveOpsDayState ? FOH.opsConfigStore.saveOpsDayState(d, st) : null);

  function openCloseRestaurantDialog(...args) {
    if (FOH.opsCloseDialog && FOH.opsCloseDialog.openCloseRestaurantDialog) {
      return FOH.opsCloseDialog.openCloseRestaurantDialog(...args);
    }
  }

  const DEPT_CLOSING_SECTIONS = FOH.DEFAULT_CLOSING_SECTIONS || [];

  let activeClosingDeptFilter = 'all'; // 'all' | 'bar' | 'floor' | 'cash'

  function ensureUpgradedClosingSections() {
    const CLOSING_KEY = 'foh-opening.closingSections.v1';
    try {
      const existing = FOH.safeJsonParse(localStorage.getItem(CLOSING_KEY), 'null');
      const hasBarSec = Array.isArray(existing) && existing.some((s) => s.id === 'cls-bar' || s.dept === 'bar');
      if (!hasBarSec) {
        localStorage.setItem(CLOSING_KEY, JSON.stringify(DEPT_CLOSING_SECTIONS));
      }
    } catch (err) {
      /* Storage quota fallback */
    }
  }

  function isClosingSheetActive() {
    if (FOH.threeShifts && FOH.threeShifts.getActiveSheetType) {
      return FOH.threeShifts.getActiveSheetType() === 'closing';
    }
    if (FOH.erpPwa && FOH.erpPwa.getSheetType) {
      return FOH.erpPwa.getSheetType() === 'closing';
    }
    return false;
  }
  function activateClosingSheet(targetDept) {
    ensureUpgradedClosingSections();
    if (targetDept) activeClosingDeptFilter = targetDept;
    if (S.view !== 'opening') S.view = 'opening';
    S.editing = false;
    if (FOH.erpPwa && FOH.erpPwa.switchSheetType) {
      FOH.erpPwa.switchSheetType('closing');
      // Ensure upgraded sections are loaded in S.tpl.sections
      const hasBar = (S.tpl.sections || []).some((s) => s.id === 'cls-bar');
      if (!hasBar) {
        S.tpl.sections = JSON.parse(JSON.stringify(DEPT_CLOSING_SECTIONS));
      }
    }
    FOH.app.render();
  }

  function renderClosingDeptFilterBar() {
    // Hide duplicate filter bar; Bento Hub (#deptSegmentPanel) handles all department filtering
    const deptBar = $('closingDeptBar');
    if (deptBar) {
      deptBar.hidden = true;
      deptBar.style.display = 'none';
    }

    // Ensure S.tpl.sections has dept tags for Bento Hub
    (S.tpl.sections || []).forEach((s) => {
      if (!s.dept) {
        if (s.id === 'cls-bar') s.dept = 'bar';
        else if (s.id === 'cls-lockup') s.dept = 'cash';
        else s.dept = 'floor';
      }
    });

    const inClosing = !S.editing && S.view === 'opening' && isClosingSheetActive();
    if (!inClosing) return;

    const ar = isAr();
    // Inject closing department badge into section card headers for floor clarity
    document.querySelectorAll('#sections > section.card').forEach((card) => {
      const sid = (card.id || '').replace(/^sec-/, '');
      const secObj = (S.tpl.sections || []).find((x) => x.id === sid);
      const secDept = (secObj && secObj.dept) || (sid === 'cls-bar' ? 'bar' : sid === 'cls-lockup' ? 'cash' : 'floor');

      // Department closing tag omitted to avoid duplicating section name in card header
    });
  }

  // ---- Operational Hours & Lifecycle Bar (#opsLifecycleBar) ----
  // ============================================================================
  // Operational Lifecycle Bar & Closing Dialog Sub-Renderers (< 80 lines each)
  // ============================================================================

  function computeOpsPhase(opts) {
    const { daySt, nowBiz, openBiz, prepBiz, kLastBiz, minCloseBiz, h, ar } = opts;
    if (daySt.closedAt) {
      const extTxt = daySt.extensionMins > 0 ? (ar ? ' (تمديد مع آخر زبون +' + daySt.extensionMins + ' دقيقة)' : ' (+' + daySt.extensionMins + 'm with last guest)') : '';
      const closedByEsc = FOH.escapeHtml ? FOH.escapeHtml(daySt.closedBy || 'Supervisor') : (daySt.closedBy || 'Supervisor');
      const overrideEsc = daySt.earlyOverrideReason ? (FOH.escapeHtml ? FOH.escapeHtml(daySt.earlyOverrideReason) : daySt.earlyOverrideReason) : '';
      return {
        key: 'closed',
        icon: '🔒',
        title: ar ? 'تم إغلاق المطعم رسمياً الساعة ' + formatTime12Ar(daySt.closedAt) + extTxt : 'Restaurant Officially Closed at ' + formatTime12Ar(daySt.closedAt) + extTxt,
        sub: ar ? 'تم الإغلاق بواسطة: ' + closedByEsc + (overrideEsc ? ' · سبب استثنائي: ' + overrideEsc : ' · اكتمل يوم العمل وتم تحديث الساعات في Tip Manager ✓') : 'Closed by: ' + closedByEsc,
      };
    }
    if (nowBiz < openBiz) {
      const minsToOpen = Math.max(0, openBiz - nowBiz);
      return {
        key: 'prep',
        icon: '☀️',
        title: ar ? 'فترة دوام التحضير للموظفين (' + formatTime12Ar(h.prepStart) + ' – ' + formatTime12Ar(h.doorsOpen) + ') · متبقي ' + minsToOpen + ' دقيقة لفتح المطعم' : 'Staff Shift & Prep · ' + minsToOpen + 'm to open',
        sub: ar ? 'بدأ دوام الموظفين الساعة ' + formatTime12Ar(h.prepStart) + ' لتجهيز الصالة والبار قبل استقبال الزبائن الساعة ' + formatTime12Ar(h.doorsOpen) : 'Staff prep until ' + formatTime12Ar(h.doorsOpen),
      };
    }
    if (nowBiz < kLastBiz - 15) {
      return {
        key: 'open',
        icon: '🟢',
        title: ar ? 'المطعم مفتوح ويستقبل الزبائن (منذ ' + formatTime12Ar(h.doorsOpen) + ')' : 'Restaurant Open for Service (since ' + formatTime12Ar(h.doorsOpen) + ')',
        sub: ar ? '🛡️ قاعدة عدم الإغلاق المبكر مفعّلة: لا يُغلق المطعم قبل ' + formatTime12Ar(h.minCloseTime) + ' حتى لو كانت الصالة فارغة.' : '🛡️ Anti-Early-Close: Cannot close before ' + formatTime12Ar(h.minCloseTime),
      };
    }
    if (nowBiz < minCloseBiz) {
      return {
        key: 'last-order',
        icon: '🔔',
        title: ar ? 'مرحلة الـ Last Order وتجهيز الإغلاق التدرّجي للأقسام' : 'Last Order Phase & Staged Department Closing',
        sub: ar ? 'آخر طلب للمطبخ: ' + formatTime12Ar(h.kitchenLastOrder) + ' · آخر طلب للبار: ' + formatTime12Ar(h.barLastOrder) : 'Kitchen LO: ' + formatTime12Ar(h.kitchenLastOrder) + ' · Bar LO: ' + formatTime12Ar(h.barLastOrder),
      };
    }
    const extMins = Math.max(0, nowBiz - minCloseBiz);
    return {
      key: 'extended',
      icon: '⏳',
      title: ar ? 'وضع الإغلاق مع آخر زبون (بعد ' + formatTime12Ar(h.minCloseTime) + (extMins > 0 ? ' · تمديد +' + extMins + ' دقيقة' : '') + ')' : 'Until Last Guest Mode (Past ' + formatTime12Ar(h.minCloseTime) + ')',
      sub: ar ? 'تجاوزنا الساعة ' + formatTime12Ar(h.minCloseTime) + ' — بمجرد مغادرة آخر زبون واكتمال الـ Closing Sheet اضغط (🚪 تأكيد إغلاق المطعم).' : 'Past minimum close time — close once last guest departs.',
    };
  }

  function renderOpsLifecycleBar() {
    if (FOH.opsLifecycleBar && FOH.opsLifecycleBar.renderOpsLifecycleBar) {
      return FOH.opsLifecycleBar.renderOpsLifecycleBar();
    }
  }

  // ---- Presentation Mode Toggle (Checklist vs Cockpit) ----
  const VIEW_MODE_KEY = 'foh-opening.viewMode.v1';
  let cachedViewMode = null;

  function getViewMode() {
    if (cachedViewMode) return cachedViewMode;
    try {
      cachedViewMode = localStorage.getItem(VIEW_MODE_KEY) || 'checklist';
    } catch (err) {
      /* Storage quota fallback */
      cachedViewMode = 'checklist';
    }
    return cachedViewMode;
  }

  function setViewMode(mode) {
    cachedViewMode = mode === 'cockpit' ? 'cockpit' : 'checklist';
    try {
      localStorage.setItem(VIEW_MODE_KEY, cachedViewMode);
    } catch (err) {
      /* Storage quota fallback */
    }
    const secEl = $('sections');
    if (secEl) {
      if (cachedViewMode === 'cockpit') secEl.classList.add('cockpit-collapsed');
      else secEl.classList.remove('cockpit-collapsed');
    }
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function toggleViewMode() {
    setViewMode(getViewMode() === 'cockpit' ? 'checklist' : 'cockpit');
  }

  FOH.opsLifecycle = {
    SUPER_ROLES_META,
    PERM_LABELS,
    loadOpsConfig,
    saveOpsConfig,
    toBizMinutes,
    formatTime12Ar,
    getEffectiveNowHM,
    loadOpsDayState,
    saveOpsDayState,
    computeOpsPhase,
    renderOpsLifecycleBar,
    openCloseRestaurantDialog: (opts) => (FOH.opsCloseDialog ? FOH.opsCloseDialog.openCloseRestaurantDialog(opts) : null),
    ensureUpgradedClosingSections,
    isClosingSheetActive,
    activateClosingSheet,
    renderClosingDeptFilterBar,
    setActiveClosingDeptFilter: (d) => { activeClosingDeptFilter = d; },
    getActiveClosingDeptFilter: () => activeClosingDeptFilter,
    getViewMode,
    setViewMode,
    toggleViewMode,
  };
  FOH.SUPER_ROLES_META = SUPER_ROLES_META;
  FOH.PERM_LABELS = PERM_LABELS;
})(window.FOH = window.FOH || {});
