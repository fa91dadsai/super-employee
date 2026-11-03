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
  const OPS_CFG_KEY = 'super-employee.opsConfig.v1';
  const OPS_DAY_PREFIX = 'super-employee.opsDay.v1.';

  const SUPER_ROLES_META = {
    super_manager: {
      id: 'super_manager',
      badge: '👑 Super Manager',
      labelAr: '👑 سوبر مانجر (Super Manager · مدير المطعم)',
      labelEn: '👑 Super Manager (Restaurant Manager)',
      dept: 'all',
    },
    super_captain: {
      id: 'super_captain',
      badge: '🎖️ Super Captain',
      labelAr: '🎖️ سوبر كابتن (Super Captain · كابتن الصالة)',
      labelEn: '🎖️ Super Captain (Floor Captain)',
      dept: 'floor',
    },
    super_bartender: {
      id: 'super_bartender',
      badge: '🍸 Super Bartender',
      labelAr: '🍸 سوبر بارتندر (Super Bartender · مسؤول البار)',
      labelEn: '🍸 Super Bartender (Head Bartender)',
      dept: 'bar',
    },
    super_waiter: {
      id: 'super_waiter',
      badge: '⭐ Super Waiter',
      labelAr: '⭐ سوبر ويتر (Super Waiter · ويتر متقدم)',
      labelEn: '⭐ Super Waiter (Senior Waiter)',
      dept: 'floor',
    },
    staff: {
      id: 'staff',
      badge: '👤 Staff',
      labelAr: '👤 موظف صالة / بار (Waiter / Bartender)',
      labelEn: '👤 Waiter / Bartender (Standard Staff)',
      dept: 'floor',
    },
  };

  const PERM_LABELS = [
    ['canCloseRestaurant', '🚪 إغلاق المطعم رسمياً (بعد الحد الأدنى / مع آخر زبون)', '🚪 Official Restaurant Close (After Min Time / Last Guest)'],
    ['canEarlyCloseOverride', '⚠️ كسر قفل الإغلاق المبكر قبل 2:00 ص (بسبب إلزامي)', '⚠️ Override Early-Close Lock before 02:00 AM (with reason)'],
    ['canTriggerLastOrder', '🔔 إعلان وتوثيق Last Order للمطبخ والبار', '🔔 Trigger & Log Kitchen / Bar Last Order'],
    ['canSignoffDeptClosing', '🌙 اعتماد وإغلاق الـ Closing Sheet الخاص بالقسم', '🌙 Sign off Department Closing Sheet'],
    ['canEditChecklist', '✎ تعديل وإضافة بنود الشيك ليست (Opening / Closing)', '✎ Edit Opening & Closing Checklist Items'],
    ['canSubmitOrders', '🛒 إنشاء وإرسال طلبيات البار والصالة', '🛒 Create & Submit Bar / FOH Orders'],
    ['canManageAcademy', '🎓 إضافة وتعديل أصناف وأسئلة الأكاديمية', '🎓 Add & Edit Menu Academy Items & Quizzes'],
    ['canViewTeamTips', '💰 الاطلاع على جدول التبس الكامل للفريق', '💰 View Full Team Tip Pool & Shares'],
  ];

  function defaultOpsConfig() {
    return {
      hours: {
        prepStart: '12:00',        // 12:00 PM Staff shift & prep start (1h before opening)
        doorsOpen: '13:00',        // 1:00 PM Restaurant opens for guests
        kitchenLastOrder: '00:00', // 12:00 Midnight Kitchen Last Order
        barLastOrder: '01:00',     // 1:00 AM Bar Last Order
        minCloseTime: '02:00',     // 2:00 AM Minimum official closing time
        closeWithLastGuest: true,  // Close with last guest (never early even if empty at 11:30 PM)
      },
      staffSuperRoles: {
        fadi: 'super_manager',
        ali: 'super_captain',
        maher: 'super_bartender',
        sara: 'super_waiter',
      },
      orderingDelegation: {
        roles: ['super_manager', 'super_bartender'],
        staffUsernames: ['sara'],
      },
      taskAssignmentDelegation: {
        roles: ['super_manager', 'super_captain'],
        staffUsernames: ['ali'],
      },
      rolePermissions: {
        super_manager: {
          canCloseRestaurant: true,
          canEarlyCloseOverride: true,
          canTriggerLastOrder: true,
          canSignoffDeptClosing: true,
          canEditChecklist: true,
          canSubmitOrders: true,
          canManageAcademy: true,
          canViewTeamTips: true,
        },
        super_captain: {
          canCloseRestaurant: true,
          canEarlyCloseOverride: false,
          canTriggerLastOrder: true,
          canSignoffDeptClosing: true,
          canEditChecklist: true,
          canSubmitOrders: true,
          canManageAcademy: true,
          canViewTeamTips: true,
        },
        super_bartender: {
          canCloseRestaurant: false,
          canEarlyCloseOverride: false,
          canTriggerLastOrder: true,
          canSignoffDeptClosing: true,
          canEditChecklist: true,
          canSubmitOrders: true,
          canManageAcademy: true,
          canViewTeamTips: false,
        },
        super_waiter: {
          canCloseRestaurant: false,
          canEarlyCloseOverride: false,
          canTriggerLastOrder: true,
          canSignoffDeptClosing: true,
          canEditChecklist: true,
          canSubmitOrders: true,
          canManageAcademy: false,
          canViewTeamTips: false,
        },
        staff: {
          canCloseRestaurant: false,
          canEarlyCloseOverride: false,
          canTriggerLastOrder: false,
          canSignoffDeptClosing: false,
          canEditChecklist: false,
          canSubmitOrders: false,
          canManageAcademy: false,
          canViewTeamTips: false,
        },
      },
    };
  }

  function loadOpsConfig() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(OPS_CFG_KEY), 'null');
      const d = defaultOpsConfig();
      if (!raw || typeof raw !== 'object') return d;
      const mergedPerms = { ...d.rolePermissions };
      Object.keys(d.rolePermissions).forEach((rk) => {
        if (raw.rolePermissions && raw.rolePermissions[rk]) {
          mergedPerms[rk] = { ...d.rolePermissions[rk], ...raw.rolePermissions[rk] };
        }
      });
      return {
        hours: { ...d.hours, ...(raw.hours || {}) },
        staffSuperRoles: { ...d.staffSuperRoles, ...(raw.staffSuperRoles || {}) },
        orderingDelegation: {
          roles: (raw.orderingDelegation && Array.isArray(raw.orderingDelegation.roles))
            ? raw.orderingDelegation.roles
            : d.orderingDelegation.roles,
          staffUsernames: (raw.orderingDelegation && Array.isArray(raw.orderingDelegation.staffUsernames))
            ? raw.orderingDelegation.staffUsernames
            : d.orderingDelegation.staffUsernames,
        },
        taskAssignmentDelegation: {
          roles: (raw.taskAssignmentDelegation && Array.isArray(raw.taskAssignmentDelegation.roles))
            ? raw.taskAssignmentDelegation.roles
            : (d.taskAssignmentDelegation ? d.taskAssignmentDelegation.roles : ['super_manager', 'super_captain']),
          staffUsernames: (raw.taskAssignmentDelegation && Array.isArray(raw.taskAssignmentDelegation.staffUsernames))
            ? raw.taskAssignmentDelegation.staffUsernames
            : (d.taskAssignmentDelegation ? d.taskAssignmentDelegation.staffUsernames : ['ali']),
        },
        rolePermissions: mergedPerms,
      };
    } catch {
      return defaultOpsConfig();
    }
  }

  function saveOpsConfig(cfg) {
    try {
      localStorage.setItem(OPS_CFG_KEY, JSON.stringify(cfg));
    } catch (err) {
      /* Storage quota fallback */
    }
  }



  // Convert HH:MM to operational business-day minutes (06:00..29:59 so 00:00=24:00, 02:30=26:30)
  function toBizMinutes(hm) {
    if (!hm || typeof hm !== 'string' || !/^\d{2}:\d{2}$/.test(hm)) return 780;
    const h = Number(hm.slice(0, 2));
    const m = Number(hm.slice(3, 5));
    const adjH = h < 6 ? h + 24 : h;
    return adjH * 60 + m;
  }

  function formatTime12Ar(hm) {
    if (!hm || !/^\d{2}:\d{2}$/.test(hm)) return hm || '';
    const h = Number(hm.slice(0, 2));
    const m = hm.slice(3, 5);
    const ar = isAr();
    const suffix = h < 12 ? (ar ? 'ص' : 'AM') : (ar ? 'م' : 'PM');
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + m + ' ' + suffix;
  }

  let simulatedShiftTime = ''; // '' means real clock FOH.time.nowHM()

  function getEffectiveNowHM() {
    return simulatedShiftTime || FOH.time.nowHM();
  }

  function loadOpsDayState(dateStr) {
    const key = OPS_DAY_PREFIX + (dateStr || S.date);
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(key), 'null');
      if (raw && typeof raw === 'object') return raw;
    } catch (err) {
      /* Storage quota or JSON parse fallback */
    }
    return {
      kitchenLastOrderAt: '',
      kitchenLastOrderBy: '',
      barLastOrderAt: '',
      barLastOrderBy: '',
      closedAt: '',
      closedBy: '',
      closedRole: '',
      extensionMins: 0,
      earlyOverrideReason: '',
      overtimeCredited: false,
    };
  }

  function saveOpsDayState(dateStr, st) {
    const key = OPS_DAY_PREFIX + (dateStr || S.date);
    try {
      localStorage.setItem(key, JSON.stringify(st));
    } catch (err) {
      /* Storage quota fallback */
    }
  }

  // ---- Department-Specific Closing Sheet Sections ----
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

      const head = card.querySelector('.head');
      if (head && !head.querySelector('.dept-closing-tag')) {
        const tag = el('span', 'super-role-pill dept-closing-tag');
        tag.style.fontSize = '0.68rem';
        tag.textContent = secDept === 'bar'
          ? (ar ? '🍸 مختص بقسم البار' : '🍸 Bar Dept')
          : secDept === 'cash'
          ? (ar ? '💳 الكاشير والمشرف' : '💳 Cash & Manager')
          : (ar ? '🍽️ مختص بقسم الصالة' : '🍽️ Floor Dept');
        head.append(tag);
      }
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

  function renderOpsTopRow(phase, roleKey, roleMeta, ar) {
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
      o.selected = simulatedShiftTime === val;
      simSel.append(o);
    });
    simSel.addEventListener('change', () => {
      simulatedShiftTime = simSel.value;
      manualSheetOverride = false;
      FOH.app.render();
    });
    simWrap.append(simSel);
    topRow.append(leftBox, simWrap);
    return topRow;
  }

  function renderOpsTimelineGrid(h, daySt, times, ar) {
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

  function renderOpsActionButtons(opts) {
    const { daySt, h, nowHM, nowBiz, minCloseBiz, ar } = opts;
    const actRow = el('div', 'ops-actions-row');
    const leftBtns = el('div', 'gov-actions');
    const sess = getSession();
    const myName = (sess && sess.displayName) || S.me.name || 'Supervisor';
    const canLO = hasSuperPerm('canTriggerLastOrder');
    const canCloseRest = hasSuperPerm('canCloseRestaurant');

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
    leftBtns.append(kBtn);

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
    leftBtns.append(bBtn);
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

  function renderClosePermissionDenied(dlg, roleMeta, ar) {
    const box = el('div', '');
    box.style.padding = '16px 18px 22px';
    box.innerHTML =
      '<div class="grab"></div>' +
      '<h2 style="color:var(--danger);">🔒 ' + (ar ? 'صلاحية إغلاق المطعم غير متوفرة لمنصبك' : 'Permission Required to Close Restaurant') + '</h2>' +
      '<p style="font-size:0.88rem;color:var(--ink2);line-height:1.5;">' +
      (ar ? 'منصبك الحالي هو <b>' + roleMeta.badge + '</b>. إغلاق المطعم رسمياً في نهاية الشفت مخصص لـ <b>👑 Super Manager</b> أو <b>🎖️ Super Captain</b> (يمكن للمدير تعديل هذه الصلاحية من ⚙️ الإعدادات).' : 'Your current role is ' + roleMeta.badge + '. Super Manager or Super Captain permission required.') +
      '</p>';
    const okB = el('button', 'btn primary', ar ? 'حسناً' : 'OK');
    okB.type = 'button';
    okB.style.width = '100%';
    okB.addEventListener('click', () => dlg.close());
    box.append(okB);
    dlg.append(box);
    dlg.showModal();
  }

  function renderEarlyCloseWarning(dlg, box, opts, ar) {
    const { h, nowHM, minCloseBiz, canOverrideEarly, daySt, myName, roleMeta } = opts;
    box.innerHTML =
      '<div class="grab"></div>' +
      '<div style="padding:12px;border-radius:12px;background:var(--danger-soft);border:1.5px solid var(--danger);margin-bottom:12px;">' +
      '<h3 style="margin:0 0 6px;color:var(--danger);">⛔ ' + (ar ? 'منع الإغلاق المبكر للمطعم (الساعة الآن ' + formatTime12Ar(nowHM) + ')' : 'Early Closing Blocked (' + formatTime12Ar(nowHM) + ')') + '</h3>' +
      '<p style="margin:0;font-size:0.84rem;line-height:1.5;">' + (ar ? 'الحد الأدنى الرسمي لإغلاق المطعم هو <b>' + formatTime12Ar(h.minCloseTime) + '</b>. حسب قوانين المطعم، <b>لا يُغلق المطعم مبكراً (مثلاً الساعة 11:30 مساءً) حتى لو كانت الصالة فارغة من الزبائن</b>.' : 'Minimum closing time is ' + formatTime12Ar(h.minCloseTime) + '. Early close is blocked.') + '</p>' +
      '</div>';

    const simHint = el('button', 'btn', ar ? '⏱ تجربة محاكاة الساعة 02:30 ص (بعد مغادرة آخر زبون)' : '⏱ Simulate 02:30 AM (Last Guest Left)');
    simHint.type = 'button';
    simHint.style.width = '100%';
    simHint.style.marginBottom = '10px';
    simHint.addEventListener('click', () => {
      simulatedShiftTime = '02:30';
      dlg.close();
      renderOpsLifecycleBar();
      openCloseRestaurantDialog('02:30', toBizMinutes('02:30'), minCloseBiz);
    });
    box.append(simHint);

    if (canOverrideEarly) {
      const ovWrap = el('div', '');
      ovWrap.style.marginTop = '10px';
      ovWrap.style.paddingTop = '10px';
      ovWrap.style.borderTop = '1px dashed var(--line)';
      const ovLbl = el('label', '', ar ? '👑 تجاوز استثنائي بأمر Super Manager فقط (أدخل سبب الإغلاق المبكر الإلزامي):' : '👑 Super Manager Emergency Override:');
      ovLbl.style.fontSize = '0.8rem';
      ovLbl.style.fontWeight = '700';
      const ovIn = el('input', 'in');
      ovIn.placeholder = ar ? 'مثال: صيانة طارئة للكهرباء / ظرف جوي استثنائي...' : 'Emergency reason...';
      ovIn.style.marginTop = '6px';
      const ovBtn = el('button', 'btn danger', ar ? '⚠️ فرض الإغلاق المبكر بأمر السوبر مانجر' : '⚠️ Force Early Close');
      ovBtn.type = 'button';
      ovBtn.style.width = '100%';
      ovBtn.style.marginTop = '8px';
      ovBtn.addEventListener('click', () => {
        if (!ovIn.value.trim()) return ovIn.focus();
        daySt.closedAt = nowHM;
        daySt.closedBy = myName;
        daySt.closedRole = roleMeta.badge;
        daySt.extensionMins = 0;
        daySt.earlyOverrideReason = ovIn.value.trim();
        saveOpsDayState(S.date, daySt);
        dlg.close();
        FOH.edit.toast(ar ? '🔒 تم إغلاق المطعم استثنائياً بأمر السوبر مانجر' : '🔒 Restaurant closed via override');
        FOH.app.render();
      });
      ovWrap.append(ovLbl, ovIn, ovBtn);
      box.append(ovWrap);
    }

    const closeDlgB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    closeDlgB.type = 'button';
    closeDlgB.style.width = '100%';
    closeDlgB.style.marginTop = '8px';
    closeDlgB.addEventListener('click', () => dlg.close());
    box.append(closeDlgB);
    dlg.append(box);
    dlg.showModal();
  }

  function renderOfficialCloseConfirmation(dlg, box, opts, ar) {
    const { h, nowHM, extMins, doneClosingCount, allClosingLeaves, leftClosingCount, daySt, myName, roleMeta } = opts;
    box.innerHTML =
      '<div class="grab"></div>' +
      '<h2>🚪 ' + (ar ? 'تأكيد إغلاق المطعم رسمياً (مع مغادرة آخر زبون)' : 'Confirm Official Restaurant Closing') + '</h2>' +
      '<div style="padding:12px;border-radius:12px;background:var(--accent-soft);border:1px solid var(--accent);margin-bottom:12px;font-size:0.84rem;line-height:1.55;">' +
      '<div>🕒 <b>' + (ar ? 'وقت الإغلاق الفعلي:' : 'Closing Time:') + '</b> ' + formatTime12Ar(nowHM) + (extMins > 0 ? (ar ? ' (تمديد +' + extMins + ' دقيقة بعد الـ ' + formatTime12Ar(h.minCloseTime) + ')' : ' (+' + extMins + 'm extension)') : '') + '</div>' +
      '<div>🌙 <b>' + (ar ? 'إنجاز شيت الإغلاق:' : 'Closing Sheet:') + '</b> ' + doneClosingCount + ' / ' + allClosingLeaves.length + (leftClosingCount === 0 ? ' ✅' : (ar ? ' (متبقي ' + leftClosingCount + ' مهام)' : ' (' + leftClosingCount + ' left)')) + '</div>' +
      '<div>💰 <b>' + (ar ? 'ربط الساعات مع Tip Manager:' : 'Tip Manager Sync:') + '</b> ' + (extMins > 0 ? (ar ? 'سيتم احتساب +' + (extMins / 60).toFixed(1) + ' س إضافية تلقائياً' : '+' + (extMins / 60).toFixed(1) + 'h overtime logged') : (ar ? 'ساعات الشفت القياسية مكتملة' : 'Standard hours')) + '</div>' +
      '</div>';

    if (leftClosingCount > 0) {
      const openClsBtn = el('button', 'btn', ar ? '🌙 مراجعة واستكمال مهام الـ Closing Sheet المتبقية (' + leftClosingCount + ')' : '🌙 Review Remaining Items (' + leftClosingCount + ')');
      openClsBtn.type = 'button';
      openClsBtn.style.width = '100%';
      openClsBtn.style.marginBottom = '10px';
      openClsBtn.addEventListener('click', () => { dlg.close(); activateClosingSheet('all'); });
      box.append(openClsBtn);
    }

    const confirmCloseBtn = el('button', 'btn primary', ar ? '✅ تأكيد مغادرة آخر زبون وإغلاق المطعم الآن (' + formatTime12Ar(nowHM) + ')' : '✅ Confirm Close (' + formatTime12Ar(nowHM) + ')');
    confirmCloseBtn.type = 'button';
    confirmCloseBtn.style.width = '100%';
    confirmCloseBtn.addEventListener('click', () => {
      daySt.closedAt = nowHM;
      daySt.closedBy = myName;
      daySt.closedRole = roleMeta.badge;
      daySt.extensionMins = extMins;
      if (!daySt.kitchenLastOrderAt) daySt.kitchenLastOrderAt = h.kitchenLastOrder;
      if (!daySt.barLastOrderAt) daySt.barLastOrderAt = h.barLastOrder;

      if (extMins > 0 && !daySt.overtimeCredited) {
        const extraHours = Math.round((extMins / 60) * 10) / 10;
        const tipsDB = loadTipsData();
        if (tipsDB && tipsDB.staff) {
          Object.values(tipsDB.staff).forEach((st) => {
            st.hours = Math.round(((Number(st.hours) || 40) + extraHours) * 10) / 10;
          });
          saveTipsData(tipsDB);
        }
        daySt.overtimeCredited = true;
      }
      saveOpsDayState(S.date, daySt);
      dlg.close();
      FOH.edit.toast(ar ? '🚪 تم إغلاق المطعم رسمياً الساعة ' + formatTime12Ar(nowHM) + (extMins > 0 ? ' واحتساب +' + extMins + ' دقيقة تمديد ✓' : ' ✓') : '🚪 Closed at ' + formatTime12Ar(nowHM) + ' ✓');
      FOH.app.render();
    });

    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.style.width = '100%';
    cancelB.style.marginTop = '8px';
    cancelB.addEventListener('click', () => dlg.close());

    box.append(confirmCloseBtn, cancelB);
    dlg.append(box);
    dlg.showModal();
  }

  function openCloseRestaurantDialog(nowHM, nowBiz, minCloseBiz) {
    const ar = isAr();
    const cfg = loadOpsConfig();
    const h = cfg.hours;
    const daySt = loadOpsDayState(S.date);
    const sess = getSession();
    const myName = (sess && sess.displayName) || S.me.name || 'Supervisor';
    const roleKey = getCurrentSuperRoleKey();
    const roleMeta = SUPER_ROLES_META[roleKey] || SUPER_ROLES_META.staff;
    const canClose = hasSuperPerm('canCloseRestaurant');
    const canOverrideEarly = hasSuperPerm('canEarlyCloseOverride');

    let dlg = $('closeRestaurantDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'closeRestaurantDialog';
      document.body.append(dlg);
    }
    dlg.replaceChildren();

    if (!canClose) {
      renderClosePermissionDenied(dlg, roleMeta, ar);
      return;
    }

    const box = el('div', '');
    box.style.padding = '16px 18px 22px';

    if (nowBiz < minCloseBiz) {
      renderEarlyCloseWarning(dlg, box, { h, nowHM, minCloseBiz, canOverrideEarly, daySt, myName, roleMeta }, ar);
      return;
    }

    ensureUpgradedClosingSections();
    const closingSecs = FOH.safeJsonParse(localStorage.getItem('foh-opening.closingSections.v1'), 'null') || DEPT_CLOSING_SECTIONS;
    const closingRun = FOH.safeJsonParse(localStorage.getItem('foh-opening.closingRun.' + S.date), '{"checked":{}}');
    const checkedMap = (isClosingSheetActive() ? S.run.checked : closingRun.checked) || {};
    const allClosingLeaves = closingSecs.flatMap((s) => s.items || []);
    const doneClosingCount = allClosingLeaves.filter((it) => checkedMap[it.id]).length;
    const leftClosingCount = allClosingLeaves.length - doneClosingCount;
    const extMins = Math.max(0, nowBiz - minCloseBiz);

    renderOfficialCloseConfirmation(dlg, box, { h, nowHM, extMins, doneClosingCount, allClosingLeaves, leftClosingCount, daySt, myName, roleMeta }, ar);
  }

  FOH.opsLifecycle = {
    defaultOpsConfig,
    loadOpsConfig,
    saveOpsConfig,
    toBizMinutes,
    formatTime12Ar,
    getEffectiveNowHM,
    loadOpsDayState,
    saveOpsDayState,
    ensureUpgradedClosingSections,
    isClosingSheetActive,
    activateClosingSheet,
    setActiveClosingDeptFilter: (d) => { activeClosingDeptFilter = d; },
    getActiveClosingDeptFilter: () => activeClosingDeptFilter,
    renderClosingDeptFilterBar,
    SUPER_ROLES_META,
    PERM_LABELS,
    renderOpsLifecycleBar,
    openCloseRestaurantDialog,
  };
  FOH.SUPER_ROLES_META = SUPER_ROLES_META;
  FOH.PERM_LABELS = PERM_LABELS;
})(window.FOH = window.FOH || {});
