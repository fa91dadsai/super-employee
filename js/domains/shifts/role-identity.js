// foh-opening/js/domains/shifts/role-identity.js
// Role Identities, Permission Matrix & Quick Account Switcher
(function (FOH) {
  'use strict';

  const S = FOH.state;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function loadOpsConfig() {
    return FOH.opsLifecycle ? FOH.opsLifecycle.loadOpsConfig() : {};
  }

  function isClosingSheetActive() {
    return (FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive)
      ? FOH.opsLifecycle.isClosingSheetActive()
      : ((FOH.threeShifts && FOH.threeShifts.getActiveSheetType) ? FOH.threeShifts.getActiveSheetType() === 'closing' : false);
  }

  function getCurrentSuperRoleKey() {
    const sess = getSession();
    const cfg = loadOpsConfig();
    const uname = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
    if (cfg.staffSuperRoles && cfg.staffSuperRoles[uname]) {
      return cfg.staffSuperRoles[uname];
    }
    if (sess && sess.isManager) return 'super_manager';
    if (sess && sess.isCaptain) return 'super_captain';
    if (!sess) return 'staff';
    return 'staff';
  }

  function hasSuperPerm(permKey) {
    const cfg = loadOpsConfig();
    const roleKey = getCurrentSuperRoleKey();
    const rolePerms = (cfg.rolePermissions && cfg.rolePermissions[roleKey]) || cfg.rolePermissions.staff;
    return !!(rolePerms && rolePerms[permKey]);
  }

  function canCurrentUserAccessOrders() {
    const sess = getSession();
    if (!sess) return true;
    if (sess.isManager) return true;
    const cfg = loadOpsConfig();
    const del = cfg.orderingDelegation || { roles: ['super_manager', 'super_bartender'], staffUsernames: ['sara'] };
    const rKey = getCurrentSuperRoleKey();
    if (Array.isArray(del.roles) && del.roles.includes(rKey)) return true;
    const uname = (sess.username || '').toLowerCase().trim();
    if (Array.isArray(del.staffUsernames) && del.staffUsernames.map((s) => (s || '').toLowerCase().trim()).includes(uname)) return true;
    return false;
  }

  function canCurrentUserAssignTasks() {
    const sess = getSession();
    if (!sess) return true;
    if (sess.isManager) return true;
    const cfg = loadOpsConfig();
    const del = cfg.taskAssignmentDelegation || { roles: ['super_manager', 'super_captain'], staffUsernames: ['ali'] };
    const rKey = getCurrentSuperRoleKey();
    if (Array.isArray(del.roles) && del.roles.includes(rKey)) return true;
    const uname = (sess.username || '').toLowerCase().trim();
    if (Array.isArray(del.staffUsernames) && del.staffUsernames.map((s) => (s || '').toLowerCase().trim()).includes(uname)) return true;
    return false;
  }


    // ============================================================================
  // 12. SUPER EMPLOYEE v10 UPGRADE:
  //     - Clean Header (☰ + Dynamic Role App Name + 🔔 Notification Bell + Avatar)
  //     - Contextual Lock/Edit/Date/Progress inside Checklist Section
  //     - Relocated "Report Damage / Repair" to Inventory & Sidebar
  //     - Role-Scoped Workspace (Super Waiter / Super Bartender / Super Captain / Super Manager)
  //     - Precision Disappear-and-Reappear Snooze Engine + Lock-Screen Push
  // ============================================================================
  const SNOOZE_TIMERS_KEY = 'super-employee.snoozeTimers.v2';
  let roleScopeOnly = true; // Automatically scopes checklist & tasks to employee's role

  const ROLE_APP_IDENTITY = {
    super_manager: {
      titleEn: '👑 Super Manager',
      titleAr: '👑 Super Manager · سوبر مانجر',
      subEn: 'Full Restaurant & Bar Management Workspace',
      subAr: 'منصة الإدارة الشاملة للمطعم والبار والتحليلات',
      allowedViews: ['opening', 'closing_sheet', 'mine', 'dayoff', 'orders', 'inv', 'academy', 'tips', 'dashboard', 'profile', 'settings'],
      openingKeywords: null, // all sections
      closingDept: 'all',
    },
    super_captain: {
      titleEn: '🎖️ Super Captain',
      titleAr: '🎖️ Super Captain · سوبر كابتن',
      subEn: 'Floor Leadership, Last Order & Closing Sign-off',
      subAr: 'قيادة الصالة، إعلان الـ Last Order واعتماد الإغلاق',
      allowedViews: ['opening', 'closing_sheet', 'mine', 'dayoff', 'orders', 'inv', 'academy', 'tips', 'profile'],
      openingKeywords: null, // all floor & station sections
      closingDept: 'all',
    },
    super_bartender: {
      titleEn: '🍸 Super Bartender',
      titleAr: '🍸 Super Bartender · سوبر بارتندر',
      subEn: 'Bar Prep, Cocktails, Beverage Orders & Bar Closing',
      subAr: 'واجهة ومهام البار المخصصة · المشروبات، الطلبيات وإغلاق البار',
      allowedViews: ['opening', 'closing_sheet', 'mine', 'dayoff', 'orders', 'inv', 'academy', 'tips', 'profile'],
      openingKeywords: ['bar', 'station', 'clean', 'staff', 'music', 'بار', 'محطات', 'نظافة', 'موظف'],
      closingDept: 'bar',
    },
    super_waiter: {
      titleEn: '⭐ Super Waiter',
      titleAr: '⭐ Super Waiter · سوبر ويتر',
      subEn: 'Floor Tables, Terrace, Waiter Stations & Menu Academy',
      subAr: 'واجهة ومهام الويتر المخصصة · تجهيز الطاولات، الصالة والأكاديمية',
      allowedViews: ['opening', 'closing_sheet', 'mine', 'dayoff', 'orders', 'academy', 'tips', 'profile'],
      openingKeywords: ['table', 'floor', 'terrace', 'clean', 'staff', 'music', 'station', 'طاولات', 'صالة', 'تراس', 'نظافة', 'محطات'],
      closingDept: 'floor',
    },
    staff: {
      titleEn: '⭐ Super Waiter',
      titleAr: '⭐ Super Waiter · سوبر ويتر',
      subEn: 'Assigned Shift Tasks, Tables & Menu Academy',
      subAr: 'مهام الشفت الموكلة لك، الصالة والأكاديمية',
      allowedViews: ['opening', 'closing_sheet', 'mine', 'dayoff', 'academy', 'tips', 'profile'],
      openingKeywords: ['table', 'floor', 'terrace', 'clean', 'staff', 'طاولات', 'صالة', 'نظافة'],
      closingDept: 'floor',
    },
  };

  function getAppRoleIdentity() {
    const rKey = getCurrentSuperRoleKey();
    const base = ROLE_APP_IDENTITY[rKey] || ROLE_APP_IDENTITY.super_waiter;
    const copy = { ...base, allowedViews: [...(base.allowedViews || [])] };
    if (!canCurrentUserAccessOrders()) {
      copy.allowedViews = copy.allowedViews.filter((v) => v !== 'orders');
    }
    return copy;
  }

  // Switch active employee account in 1 tap (for testing & quick terminal handoff)
  function getQuickSwitchAccounts(ar) {
    return {
      fadi: { username: 'fadi', firstName: 'Fadi', lastName: 'Al-Masri', nickname: 'Fadi', phone: '+962 7 9000 1001', email: 'fadi.m@ceenlounge.com', inviteCode: 'CEEN-1001', displayName: ar ? 'فادي (سوبر مانجر)' : 'Fadi (Super Manager)', roleName: '👑 Super Manager', roleAr: '👑 سوبر مانجر', isManager: true, shift: '12:00 – 02:00 · Restaurant Manager' },
      ali: { username: 'ali', firstName: 'Ali', lastName: 'Hassan', nickname: 'Ali', phone: '+962 7 9000 2002', email: 'ali.h@ceenlounge.com', inviteCode: 'CEEN-2002', displayName: ar ? 'علي (سوبر كابتن)' : 'Ali (Super Captain)', roleName: '🎖️ Super Captain', roleAr: '🎖️ سوبر كابتن', isManager: false, isCaptain: true, shift: '12:00 – 02:00 · Floor Captain' },
      maher: { username: 'maher', firstName: 'Maher', lastName: 'Zaid', nickname: 'Leo', phone: '+962 7 9000 4004', email: 'maher.z@ceenlounge.com', inviteCode: 'CEEN-4004', displayName: ar ? 'ماهر (سوبر بارتندر)' : 'Maher (Super Bartender)', roleName: '🍸 Super Bartender', roleAr: '🍸 سوبر بارتندر', isManager: false, shift: '12:00 – 02:00 · Main Bar Lead' },
      sara: { username: 'sara', firstName: 'Sara', lastName: 'Khoury', nickname: 'Sara', phone: '+962 7 9000 3003', email: 'sara.k@ceenlounge.com', inviteCode: 'CEEN-3003', displayName: ar ? 'سارة (سوبر ويتر)' : 'Sara (Super Waiter)', roleName: '⭐ Super Waiter', roleAr: '⭐ سوبر ويتر', isManager: false, shift: '12:00 – 02:00 · Indoor & Terrace Waiter' },
    };
  }

  function bindStaffAndRoleToTemplate(username) {
    const targetRoleName = username === 'fadi' ? 'Supervisor' : username === 'ali' ? 'Captain' : username === 'maher' ? 'Bartender' : 'Waiter';
    const roleObj = (S.tpl.roles || []).find((r) => (r.name || '').toLowerCase().includes(targetRoleName.toLowerCase())) || S.tpl.roles[0];
    const person = (S.tpl.staff || []).find((p) => (p.name || '').toLowerCase().startsWith(username));
    if (person && roleObj) {
      person.role = roleObj.id;
      S.me = { staffId: person.id, role: roleObj.id, name: person.name };
      FOH.store.saveMe(S.me);
    }
  }

  function quickSwitchEmployeeAccount(username) {
    const ar = isAr();
    const accounts = getQuickSwitchAccounts(ar);
    const target = accounts[username] || accounts.fadi;
    const prevSess = getSession() || {};
    const nextSess = { ...prevSess, ...target };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSess));
      sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {
      /* Storage quota exceeded or disabled in private browsing */
    }

    bindStaffAndRoleToTemplate(username);

    roleScopeOnly = username === 'sara' || username === 'maher';
    const ident = ROLE_APP_IDENTITY[getCurrentSuperRoleKey()] || ROLE_APP_IDENTITY.super_waiter;
    if (isClosingSheetActive()) {
      if (FOH.opsLifecycle && FOH.opsLifecycle.setActiveClosingDeptFilter) FOH.opsLifecycle.setActiveClosingDeptFilter(ident.closingDept || 'all');
    }
    if (!ident.allowedViews.includes(S.view)) {
      S.view = 'opening';
    }
    location.reload();
  }



  FOH.roleIdentity = {
    ROLE_APP_IDENTITY,
    getCurrentSuperRoleKey,
    hasSuperPerm,
    canCurrentUserAccessOrders,
    canCurrentUserAssignTasks,
    getAppRoleIdentity,
    quickSwitchEmployeeAccount,
    isRoleScopeOnly: () => roleScopeOnly,
    setRoleScopeOnly: (v) => { roleScopeOnly = v; },
  };

  try {
    Object.defineProperty(window, 'roleScopeOnly', {
      get() { return roleScopeOnly; },
      set(v) { roleScopeOnly = v; },
      configurable: true,
    });
  } catch (err) {
    /* Window property already defined or non-configurable in strict mode */
  }

  FOH.getCurrentSuperRoleKey = getCurrentSuperRoleKey;
  FOH.canCurrentUserAccessOrders = canCurrentUserAccessOrders;
  FOH.canCurrentUserAssignTasks = canCurrentUserAssignTasks;
})(window.FOH = window.FOH || {});
