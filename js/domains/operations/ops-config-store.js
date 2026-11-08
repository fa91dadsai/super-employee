// Operations Lifecycle Component
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
    return (FOH.sessionAuth && FOH.sessionAuth.loadSession) ? FOH.sessionAuth.loadSession() : null;
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

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

  const DEFAULT_OPS_HOURS = {
    prepStart: '12:00',
    doorsOpen: '13:00',
    kitchenLastOrder: '00:00',
    barLastOrder: '01:00',
    minCloseTime: '02:00',
    closeWithLastGuest: true,
  };
  const DEFAULT_STAFF_SUPER_ROLES = {
    fadi: 'super_manager',
    ali: 'super_captain',
    maher: 'super_bartender',
    sara: 'super_waiter',
  };
  const DEFAULT_ORDERING_DELEGATION = {
    roles: ['super_manager', 'super_bartender'],
    staffUsernames: ['sara'],
  };
  const DEFAULT_TASK_DELEGATION = {
    roles: ['super_manager', 'super_captain'],
    staffUsernames: ['ali'],
  };
  const DEFAULT_ROLE_PERMISSIONS = {
    super_manager: { canCloseRestaurant: true, canEarlyCloseOverride: true, canTriggerLastOrder: true, canSignoffDeptClosing: true, canEditChecklist: true, canSubmitOrders: true, canManageAcademy: true, canViewTeamTips: true },
    super_captain: { canCloseRestaurant: true, canEarlyCloseOverride: false, canTriggerLastOrder: true, canSignoffDeptClosing: true, canEditChecklist: true, canSubmitOrders: true, canManageAcademy: true, canViewTeamTips: true },
    super_bartender: { canCloseRestaurant: false, canEarlyCloseOverride: false, canTriggerLastOrder: true, canSignoffDeptClosing: true, canEditChecklist: false, canSubmitOrders: true, canManageAcademy: true, canViewTeamTips: false },
    super_waiter: { canCloseRestaurant: false, canEarlyCloseOverride: false, canTriggerLastOrder: true, canSignoffDeptClosing: true, canEditChecklist: false, canSubmitOrders: true, canManageAcademy: false, canViewTeamTips: false },
    staff: { canCloseRestaurant: false, canEarlyCloseOverride: false, canTriggerLastOrder: false, canSignoffDeptClosing: false, canEditChecklist: false, canSubmitOrders: false, canManageAcademy: false, canViewTeamTips: false },
  };

  function defaultOpsConfig() {
    return {
      hours: { ...DEFAULT_OPS_HOURS },
      staffSuperRoles: { ...DEFAULT_STAFF_SUPER_ROLES },
      orderingDelegation: { roles: [...DEFAULT_ORDERING_DELEGATION.roles], staffUsernames: [...DEFAULT_ORDERING_DELEGATION.staffUsernames] },
      taskAssignmentDelegation: { roles: [...DEFAULT_TASK_DELEGATION.roles], staffUsernames: [...DEFAULT_TASK_DELEGATION.staffUsernames] },
      rolePermissions: JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)),
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
        if (rk === 'super_waiter' || rk === 'super_bartender' || rk === 'staff') {
          mergedPerms[rk].canEditChecklist = false;
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

  function getSimulatedShiftTime() {
    return simulatedShiftTime;
  }

  function setSimulatedShiftTime(val) {
    simulatedShiftTime = val || '';
  }

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

  FOH.opsConfigStore = {
    SUPER_ROLES_META,
    PERM_LABELS,
    DEFAULT_OPS_HOURS,
    DEFAULT_STAFF_SUPER_ROLES,
    DEFAULT_ORDERING_DELEGATION,
    DEFAULT_TASK_DELEGATION,
    DEFAULT_ROLE_PERMISSIONS,
    defaultOpsConfig,
    loadOpsConfig,
    saveOpsConfig,
    toBizMinutes,
    formatTime12Ar,
    getEffectiveNowHM,
    getSimulatedShiftTime,
    setSimulatedShiftTime,
    get simulatedShiftTime() { return simulatedShiftTime; },
    set simulatedShiftTime(v) { simulatedShiftTime = v || ''; },
    loadOpsDayState,
    saveOpsDayState,
  };
  FOH.SUPER_ROLES_META = SUPER_ROLES_META;
  FOH.PERM_LABELS = PERM_LABELS;
})(window.FOH = window.FOH || {});
