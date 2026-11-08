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

  const DEPT_CLOSING_SECTIONS = [
    {
      id: 'cls-bar',
      dept: 'bar',
      icon: '🍸',
      title: 'Bar Department Closing (After 01:00 AM Last Order)',
      titleAr: 'إغلاق قسم البار (بعد Last Order البار 1:00 ص)',
      items: [
        { id: 'cb1', text: 'Backflush espresso machine, clean steam wands & empty grinder hopper', textAr: 'تنظيف ماكينة الإسبريسو وعمل Backflush وتفريغ مطحنة القهوة', due: '01:05', role: '', children: [] },
        { id: 'cb2', text: 'Wrap & date-label all garnishes, fresh juices, syrups & purées in chiller', textAr: 'تغطية وتغليف الفواكه والغارنيش والعصائر والـ Syrups مع ملصق التاريخ', due: '01:15', role: '', children: [] },
        { id: 'cb3', text: 'Wipe speed rail bottles, lock premium bottle vault & bar fridges', textAr: 'مسح زجاجات الـ Speed Rail وإقفال ثلاجات البار وخزنة الزجاجات الفاخرة', due: '01:25', role: '', children: [] },
        { id: 'cb4', text: 'Burn/melt ice wells, sanitize bar counter, mats & floor drains', textAr: 'تذويب وتفريغ أحواض الثلج وتعقيم كاونتر البار والأرضيات والمصافي', due: '01:40', role: '', children: [] },
      ],
    },
    {
      id: 'cls-tables',
      dept: 'floor',
      icon: '🍽️',
      title: 'Floor & Terrace Closing (After 00:00 Kitchen Last Order)',
      titleAr: 'إغلاق قسم الصالة والتراس (بعد Last Order المطبخ 12:00 ص)',
      items: [
        { id: 'c1', text: 'Clear and sanitize all indoor & terrace tables after guests depart', textAr: 'تنظيف وتعقيم جميع طاولات الصالة والتراس بعد مغادرة الزبائن', due: '01:00', role: '', children: [] },
        { id: 'c2', text: 'Collect food/drink menus, bill folders & table lamps to station', textAr: 'جمع قوائم الطعام والمشروبات وحافظات الفواتير وإعادتها للمحطة', due: '01:15', role: '', children: [] },
        { id: 'c3', text: 'Close terrace umbrellas, shut off gas heaters & secure cushions', textAr: 'إغلاق مظلات التراس وفصل دفايات الغاز وتأمين الوسائد الخارجية', due: '01:30', role: '', children: [] },
      ],
    },
    {
      id: 'cls-stations',
      dept: 'floor',
      icon: '☕',
      title: 'Waiter Stations & Linen Handover (Floor Dept)',
      titleAr: 'إغلاق محطات الويتر والبياضات (قسم الصالة)',
      items: [
        { id: 'c4', text: 'Send all remaining glassware, plates & cutlery to dishwashing area', textAr: 'إرسال جميع الكؤوس والصحون والشوك والسكاكين المتبقية لمنطقة الغسيل', due: '01:30', role: '', children: [] },
        { id: 'c5', text: 'Wipe condiment trays, refill station base & seal sugar/sauces', textAr: 'تنظيف صواني الإضافات وإغلاق علب السكر والصوصات وتجهيز أساس الصباح', due: '01:40', role: '', children: [] },
        { id: 'c6', text: 'Count dirty linen/napkins for laundry & stage clean morning set', textAr: 'فرز وعدّ المفارش والمناديل المتسخة للغسيل وتجهيز طقم الصباح', due: '01:50', role: '', children: [] },
      ],
    },
    {
      id: 'cls-lockup',
      dept: 'cash',
      icon: '💳',
      title: 'Cashier, Tip Box & Final Restaurant Lockup (At Last Guest 02:00+)',
      titleAr: 'إغلاق الكاشير وصندوق التبس والأمان النهائي (مع آخر زبون 2:00+ ص)',
      items: [
        { id: 'c7', text: 'Close POS terminals (Z-Report) & reconcile Visa slips and cash float', textAr: 'إغلاق أجهزة الكاشير (Z-Report) ومطابقة إيصالات الفيزا والكاش', due: '02:00', role: '', children: [] },
        { id: 'c8', text: 'Log daily tips into Tip Manager box & verify safe/vault is locked', textAr: 'توثيق وتسليم حصيلة التبس اليومي في صندوق Tip Manager وإقفال الخزنة', due: '02:05', role: '', children: [] },
        { id: 'c9', text: 'Switch off A/C units, kitchen pass warmers, sound system & exterior sign', textAr: 'إطفاء المكيفات وسخانات الباص ونظام الصوت واللافتة الخارجية', due: '02:10', role: '', children: [] },
        { id: 'c10', text: 'Inspect restrooms, lock terrace & main doors, set alarm after last guest', textAr: 'تفقد الحمامات وإقفال أبواب التراس والمدخل الرئيسي بعد مغادرة آخر زبون', due: '02:15', role: '', children: [] },
      ],
    },
  ];

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
      return {
        key: 'closed',
        icon: '🔒',
        title: ar ? 'تم إغلاق المطعم رسمياً الساعة ' + formatTime12Ar(daySt.closedAt) + extTxt : 'Restaurant Officially Closed at ' + formatTime12Ar(daySt.closedAt) + extTxt,
        sub: ar ? 'تم الإغلاق بواسطة: ' + (daySt.closedBy || 'Supervisor') + (daySt.earlyOverrideReason ? ' · سبب استثنائي: ' + daySt.earlyOverrideReason : ' · اكتمل يوم العمل وتم تحديث الساعات في Tip Manager ✓') : 'Closed by: ' + (daySt.closedBy || 'Supervisor'),
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

  function renderOpsTopRow(phase, roleKey, opts = {}) {
    const isLegacy = typeof opts === 'object' && !('roleMeta' in opts) && !('badge' in opts);
    const roleMeta = (opts && opts.roleMeta) || (isLegacy ? opts : (SUPER_ROLES_META[roleKey] || SUPER_ROLES_META.staff));
    const ar = (opts && typeof opts.ar === 'boolean') ? opts.ar : (isLegacy ? !!arguments[3] : isAr());
    const topRow = el('div', 'ops-top-row');
    const leftBox = el('div', '');
    leftBox.innerHTML =
      '<div class="ops-phase-title">' +
      '<span>' + phase.icon + ' ' + phase.title + '</span>' +
      '<span class="super-role-pill ' + roleKey + '">' + roleMeta.badge + '</span>' +
      '</div>' +
      '<div class="ops-phase-sub">' + phase.sub + '</div>';

    const simWrap = el('div', 'ops-sim-wrap');
    const simSel = el('select', 'ops-sim-select');
    simSel.title = ar ? 'محاكاة وقت الشفت لتجربة سيناريوهات الفتح والـ Last Order والإغلاق' : 'Simulate shift time';
    [
      ['', ar ? '🕒 وقت الساعة الفعلي (' + FOH.time.nowHM() + ')' : '🕒 Real Clock (' + FOH.time.nowHM() + ')'],
      ['12:15', ar ? '☀️ محاكاة 12:15 ظهراً (بداية دوام التحضير)' : '☀️ Sim 12:15 PM (Staff Prep)'],
      ['13:30', ar ? '☀️ محاكاة 01:30 ظهراً (شيت الافتتاح 12–3 م)' : '☀️ Sim 1:30 PM (Opening Sheet)'],
      ['15:30', ar ? '🌤️ محاكاة 03:30 عصراً (شيت منتصف الشفت)' : '🌤️ Sim 3:30 PM (Mid-Shift)'],
      ['23:30', ar ? '🚫 محاكاة 11:30 ليلاً (يُمنع الإغلاق المبكر)' : '🚫 Sim 11:30 PM (Early Close Blocked)'],
      ['00:00', ar ? '🍳 محاكاة 12:00 منتصف الليل (Last Order المطبخ)' : '🍳 Sim 12:00 AM (Kitchen LO)'],
      ['01:00', ar ? '🍸 محاكاة 01:00 فجراً (Last Order البار)' : '🍸 Sim 01:00 AM (Bar LO)'],
      ['02:30', ar ? '⏳ محاكاة 02:30 فجراً (جاهز للإغلاق مع آخر زبون)' : '⏳ Sim 02:30 AM (Last Guest Left)'],
    ].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = val;
      o.selected = getSimulatedShiftTime() === val;
      simSel.append(o);
    });
    simSel.addEventListener('change', () => {
      setSimulatedShiftTime(simSel.value);
      manualSheetOverride = false;
      FOH.app.render();
    });
    simWrap.append(simSel);
    topRow.append(leftBox, simWrap);
    return topRow;
  }

  function renderOpsTimelineGrid(h, daySt, opts = {}) {
    const isLegacy = opts && typeof opts === 'object' && ('nowBiz' in opts);
    const times = isLegacy ? opts : ((opts && opts.times) || {});
    const ar = (opts && typeof opts.ar === 'boolean') ? opts.ar : (isLegacy ? !!arguments[3] : isAr());
    const { nowBiz, openBiz, prepBiz, kLastBiz, bLastBiz, minCloseBiz } = times;
    const timeline = el('div', 'ops-timeline-grid');
    const stages = [
      { label: ar ? '١. دوام التحضير' : '1. Staff Prep', time: formatTime12Ar(h.prepStart), done: nowBiz >= openBiz || !!daySt.closedAt, active: !daySt.closedAt && nowBiz >= prepBiz && nowBiz < openBiz, status: ar ? 'قبل الفتح بـ ١س' : '1h pre-open' },
      { label: ar ? '٢. فتح المطعم' : '2. Doors Open', time: formatTime12Ar(h.doorsOpen), done: nowBiz >= kLastBiz || !!daySt.closedAt, active: !daySt.closedAt && nowBiz >= openBiz && nowBiz < kLastBiz, status: ar ? 'استقبال الزبائن' : 'Guest service' },
      { label: ar ? '٣. Last Order المطبخ' : '3. Kitchen L.O.', time: formatTime12Ar(h.kitchenLastOrder), done: !!daySt.kitchenLastOrderAt || nowBiz >= bLastBiz || !!daySt.closedAt, active: !daySt.closedAt && nowBiz >= kLastBiz - 15 && nowBiz < bLastBiz, status: daySt.kitchenLastOrderAt ? ('✓ ' + daySt.kitchenLastOrderAt) : (ar ? 'إغلاق المطبخ' : 'Kitchen cutoff') },
      { label: ar ? '٤. Last Order البار' : '4. Bar L.O.', time: formatTime12Ar(h.barLastOrder), done: !!daySt.barLastOrderAt || nowBiz >= minCloseBiz || !!daySt.closedAt, active: !daySt.closedAt && nowBiz >= bLastBiz - 15 && nowBiz < minCloseBiz, status: daySt.barLastOrderAt ? ('✓ ' + daySt.barLastOrderAt) : (ar ? 'إغلاق البار' : 'Bar cutoff') },
      { label: ar ? '٥. إغلاق المطعم' : '5. Close (Last Guest)', time: formatTime12Ar(h.minCloseTime) + '+', done: !!daySt.closedAt, active: !daySt.closedAt && nowBiz >= minCloseBiz, status: daySt.closedAt ? ('🔒 ' + formatTime12Ar(daySt.closedAt)) : (ar ? 'مع آخر زبون' : 'With last guest') },
    ];
    stages.forEach((st) => {
      const card = el('div', 'ops-step-card' + (st.done ? ' done' : st.active ? ' active' : ''));
      card.innerHTML = '<small>' + st.label + '</small><strong>' + st.time + '</strong><span>' + st.status + '</span>';
      timeline.append(card);
    });
    return timeline;
  }

  function createLastOrderButtons(opts) {
    const { daySt, h, nowHM, ar, myName, canLO } = opts;
    const btns = el('div', 'gov-actions');

    const kBtn = el('button', 'gov-btn' + (daySt.kitchenLastOrderAt ? '' : ' primary'), daySt.kitchenLastOrderAt ? (ar ? '🍳 Last Order المطبخ (' + daySt.kitchenLastOrderAt + ')' : '🍳 Kitchen L.O. (' + daySt.kitchenLastOrderAt + ')') : (ar ? '🍳 إعلان Last Order المطبخ (' + formatTime12Ar(h.kitchenLastOrder) + ')' : '🍳 Trigger Kitchen LO'));
    kBtn.type = 'button';
    kBtn.addEventListener('click', () => {
      if (!canLO) return FOH.edit.toast(ar ? '🔒 صلاحية إعلان Last Order مخصصة لـ Super Waiter / Captain / Manager' : '🔒 Permission required');
      daySt.kitchenLastOrderAt = nowHM;
      daySt.kitchenLastOrderBy = myName;
      saveOpsDayState(S.date, daySt);
      if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) FOH.cloudRealtime.broadcast('LAST_ORDER_TRIGGERED', { kind: 'kitchen', byName: myName, at: nowHM });
      FOH.edit.toast(ar ? '🍳 تم إعلان Last Order المطبخ الساعة ' + nowHM + ' وفتح شيت إغلاق الصالة ✓' : '🍳 Kitchen LO logged ✓');
      activateClosingSheet('floor');
    });
    btns.append(kBtn);

    const bBtn = el('button', 'gov-btn' + (daySt.barLastOrderAt ? '' : ' primary'), daySt.barLastOrderAt ? (ar ? '🍸 Last Order البار (' + daySt.barLastOrderAt + ')' : '🍸 Bar L.O. (' + daySt.barLastOrderAt + ')') : (ar ? '🍸 إعلان Last Order البار (' + formatTime12Ar(h.barLastOrder) + ')' : '🍸 Trigger Bar LO'));
    bBtn.type = 'button';
    bBtn.addEventListener('click', () => {
      if (!canLO) return FOH.edit.toast(ar ? '🔒 صلاحية إعلان Last Order البار مخصصة لـ Super Bartender / Captain / Manager' : '🔒 Permission required');
      daySt.barLastOrderAt = nowHM;
      daySt.barLastOrderBy = myName;
      saveOpsDayState(S.date, daySt);
      if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) FOH.cloudRealtime.broadcast('LAST_ORDER_TRIGGERED', { kind: 'bar', byName: myName, at: nowHM });
      FOH.edit.toast(ar ? '🍸 تم إعلان Last Order البار الساعة ' + nowHM + ' وفتح شيت إغلاق البار ✓' : '🍸 Bar LO logged ✓');
      activateClosingSheet('bar');
    });
    btns.append(bBtn);
    return btns;
  }

  function renderOpsActionButtons(opts) {
    const { daySt, h, nowHM, nowBiz, minCloseBiz, ar } = opts;
    const actRow = el('div', 'ops-actions-row');
    const sess = getSession();
    const myName = (sess && sess.displayName) || S.me.name || 'Supervisor';
    const canLO = hasSuperPerm('canTriggerLastOrder');
    const canCloseRest = hasSuperPerm('canCloseRestaurant');

    const leftBtns = createLastOrderButtons({ daySt, h, nowHM, ar, myName, canLO });
    actRow.append(leftBtns);

    if (daySt.closedAt && canCloseRest) {
      const reopenBtn = el('button', 'gov-btn', ar ? '🔓 إعادة فتح المطعم (إلغاء الإغلاق)' : '🔓 Reopen Restaurant');
      reopenBtn.type = 'button';
      reopenBtn.addEventListener('click', () => {
        if (!confirm(ar ? 'هل أنت متأكد من إلغاء حالة الإغلاق وإعادة فتح المطعم؟' : 'Are you sure you want to reopen?')) return;
        daySt.closedAt = '';
        daySt.closedBy = '';
        saveOpsDayState(S.date, daySt);
        FOH.edit.toast(ar ? '🔓 تم إلغاء الإغلاق وإعادة فتح المطعم' : '🔓 Restaurant reopened');
        FOH.app.render();
      });
      actRow.append(reopenBtn);
    } else if (!daySt.closedAt) {
      const closeRestBtn = el('button', 'gov-btn primary', ar ? '🚪 تأكيد إغلاق المطعم رسمياً (مع آخر زبون)' : '🚪 Close Restaurant (Last Guest)');
      closeRestBtn.type = 'button';
      closeRestBtn.addEventListener('click', () => openCloseRestaurantDialog(nowHM, nowBiz, minCloseBiz));
      actRow.append(closeRestBtn);
    }
    return actRow;
  }

  function renderOpsLifecycleBar() {
    let bar = $('opsLifecycleBar');
    const mainEl = $('appMain');
    const govBar = $('checklistGovBar');
    if (!mainEl) return;
    if (!bar) {
      bar = el('div', 'ops-lifecycle-bar run-only');
      bar.id = 'opsLifecycleBar';
      if (govBar) mainEl.insertBefore(bar, govBar);
      else mainEl.prepend(bar);
    }

    const rKey = getCurrentSuperRoleKey();
    if (S.editing || (S.view !== 'opening' && S.view !== 'dashboard') || rKey !== 'super_manager') {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    bar.replaceChildren();

    const ar = isAr();
    const cfg = loadOpsConfig();
    const h = cfg.hours;
    const daySt = loadOpsDayState(S.date);
    const nowHM = getEffectiveNowHM();
    const nowBiz = toBizMinutes(nowHM);
    const prepBiz = toBizMinutes(h.prepStart);
    const openBiz = toBizMinutes(h.doorsOpen);
    const kLastBiz = toBizMinutes(h.kitchenLastOrder);
    const bLastBiz = toBizMinutes(h.barLastOrder);
    const minCloseBiz = toBizMinutes(h.minCloseTime);

    const phase = computeOpsPhase({ daySt, nowBiz, openBiz, prepBiz, kLastBiz, minCloseBiz, h, ar });
    bar.className = 'ops-lifecycle-bar run-only status-' + phase.key;

    const roleMeta = SUPER_ROLES_META[rKey] || SUPER_ROLES_META.staff;
    const topRow = renderOpsTopRow(phase, rKey, roleMeta, ar);
    const timeline = renderOpsTimelineGrid(h, daySt, { nowBiz, openBiz, prepBiz, kLastBiz, bLastBiz, minCloseBiz }, ar);
    const actRow = renderOpsActionButtons({ daySt, h, nowHM, nowBiz, minCloseBiz, ar });

    bar.append(topRow, timeline, actRow);
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
