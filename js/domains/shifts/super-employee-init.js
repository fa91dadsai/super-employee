// foh-opening/js/domains/shifts/super-employee-init.js
// Master UI Synchronizer & Application Initialization
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
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

  function saveGov(gov) {
    if (FOH.gov && FOH.gov.saveGov) FOH.gov.saveGov(gov);
  }

  function openSidebar() {
    if (FOH.navigation && FOH.navigation.openSidebar) FOH.navigation.openSidebar();
  }

  function closeSidebar() {
    if (FOH.navigation && FOH.navigation.closeSidebar) FOH.navigation.closeSidebar();
  }

  function switchView(v) {
    if (FOH.navigation && FOH.navigation.switchView) FOH.navigation.switchView(v);
  }

  function ensureStaffHealthAndPerms() {
    if (FOH.gov) FOH.gov.ensureStaffHealthAndPerms();
  }

  function canCurrentUserEditChecklist() {
    return FOH.gov ? FOH.gov.canCurrentUserEditChecklist() : false;
  }

  function getAppRoleIdentity() {
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : { allowedViews: ['opening', 'mine'] };
  }

  function canCurrentUserAccessOrders() {
    return FOH.roleIdentity ? FOH.roleIdentity.canCurrentUserAccessOrders() : true;
  }

  function getHealthAlerts() {
    return FOH.gov ? FOH.gov.getHealthAlerts() : [];
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function getAppRoleIdentity() {
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {};
  }

  function updateNotifBellUI() {
    if (FOH.notifCenter && FOH.notifCenter.updateNotifBellUI) FOH.notifCenter.updateNotifBellUI();
  }

  function loadSuggestions() {
    return FOH.suggestions ? FOH.suggestions.loadSuggestions() : [];
  }

  function ensureUpgradedClosingSections() {
    if (FOH.opsLifecycle) FOH.opsLifecycle.ensureUpgradedClosingSections();
  }

  function ensureNotifBellInHeader() {
    if (FOH.notifCenter) FOH.notifCenter.ensureNotifBellInHeader();
  }

  function renderHealthBanner() {
    if (FOH.gov) FOH.gov.renderHealthBanner();
  }

  function renderSmartAlertBanners() {
    if (FOH.snoozeEngine) FOH.snoozeEngine.renderSmartAlertBanners();
  }

  function renderOpsLifecycleBar() {
    if (FOH.opsLifecycle) FOH.opsLifecycle.renderOpsLifecycleBar();
  }

  function renderChecklistGovBar() {
    if (FOH.suggestions) FOH.suggestions.renderChecklistGovBar();
  }

  function enhanceChecklistContextAndRoleScope() {
    if (FOH.navigation) FOH.navigation.enhanceChecklistContextAndRoleScope();
  }

  function renderClosingDeptFilterBar() {
    if (FOH.opsLifecycle) FOH.opsLifecycle.renderClosingDeptFilterBar();
  }

  function injectChecklistItemNotes() {
    if (FOH.suggestions) FOH.suggestions.injectChecklistItemNotes();
  }

  function enhanceSidebarAndInventory() {
    if (FOH.navigation) FOH.navigation.enhanceSidebarAndInventory();
  }

  function wireAutomaticTaskCreationNotifications() {
    if (FOH.taskInbox) FOH.taskInbox.wireAutomaticTaskCreationNotifications();
  }

  function enforceTimeBasedSheetSchedule() {
    if (FOH.threeShifts) FOH.threeShifts.enforceTimeBasedSheetSchedule();
  }

  function relocateHeaderSubbarsToMain() {
    if (FOH.headerSubbars) FOH.headerSubbars.relocateHeaderSubbarsToMain();
  }

  function renderCleanHeaderText() {
    if (FOH.headerSubbars) FOH.headerSubbars.renderCleanHeaderText();
  }

  function collapseOpsLifecycleBarToOneLine() {
    if (FOH.headerSubbars) FOH.headerSubbars.collapseOpsLifecycleBarToOneLine();
  }

  function renderUnifiedSingleRowChecklistBar() {
    if (FOH.headerSubbars) FOH.headerSubbars.renderUnifiedSingleRowChecklistBar();
  }

  function renderUnifiedThreeSheetNav() {
    if (FOH.threeShifts) FOH.threeShifts.renderUnifiedThreeSheetNav();
  }

  function renderRoleSpecificLandingHero() {
    if (FOH.landingHero) FOH.landingHero.renderRoleSpecificLandingHero();
  }

  function renderAssignedTaskBadgesAndFilter() {
    if (FOH.taskAssignment) FOH.taskAssignment.renderAssignedTaskBadgesAndFilter();
  }

  function injectAssignTaskBtnIntoToolbarAndMine() {
    if (FOH.taskAssignment) FOH.taskAssignment.injectAssignTaskBtnIntoToolbarAndMine();
  }

  function injectRoleSwitcherInSidebar() {
    if (FOH.headerSubbars) FOH.headerSubbars.injectRoleSwitcherInSidebar();
  }

  function renderAcademyView(el) {
    if (FOH.academyView) FOH.academyView.renderAcademyView(el);
  }

  function renderTipsView(el) {
    if (FOH.tipsView) FOH.tipsView.renderTipsView(el);
  }

  function renderDashboardView(el) {
    if (FOH.dashboardView) FOH.dashboardView.renderDashboardView(el);
  }

  function renderProfilePageView(el) {
    if (FOH.healthProfileView && FOH.healthProfileView.renderProfilePageView) {
      FOH.healthProfileView.renderProfilePageView(el);
    } else if (FOH.healthProfile && FOH.healthProfile.renderProfilePageView) {
      FOH.healthProfile.renderProfilePageView(el);
    }
  }

  function renderSettingsView(el) {
    if (FOH.settingsView) FOH.settingsView.renderSettingsView(el);
  }

  function appendHoursAndSuperRolesSettings(el) {
    if (FOH.hoursSettings) FOH.hoursSettings.appendHoursAndSuperRolesSettings(el);
  }

  function checkExpiredSnoozeTimers() {
    if (FOH.snoozeEngine) FOH.snoozeEngine.checkExpiredSnoozeTimers();
  }

  function syncSuperEmployeeUI() {
    ensureStaffHealthAndPerms();
    if (FOH.sectionAssignment && FOH.sectionAssignment.init) {
      FOH.sectionAssignment.init();
    }
    if (FOH.bottomBar && FOH.bottomBar.init) {
      FOH.bottomBar.init();
    }
    const ar = isAr();
    const gov = loadGov();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const canEdit = canCurrentUserEditChecklist();
    const restName = ar ? gov.restaurantNameAr : gov.restaurantName;

    if ($('loginTitle')) $('loginTitle').textContent = 'Super Employee';
    if ($('loginSubtitle')) $('loginSubtitle').textContent = restName + ' · ' + (ar ? 'منصة العمليات الذكية للمطعم والبار' : 'Smart Restaurant & Bar Operations');
    const brandPill = document.querySelector('.login-brand-pill');
    if (brandPill) brandPill.textContent = '🍽 ' + restName;

    const ident = getAppRoleIdentity();
    if ($('title')) {
      $('title').textContent = S.editing
        ? (ar ? 'تعديل الشيك ليست' : 'Edit Checklist')
        : (ar ? ident.titleAr : ident.titleEn);
    }
    document.title = (ar ? ident.titleAr : ident.titleEn) + ' · ' + restName;
    if ($('restaurantBadge')) $('restaurantBadge').textContent = '🍽 ' + restName;
    if ($('activeSectionBadge')) {
      $('activeSectionBadge').style.display = 'none';
    }

    if ($('checklistLockPill')) {
      $('checklistLockPill').style.display = 'none';
    }

    if ($('ordersTab')) {
      $('ordersTab').hidden = !canCurrentUserAccessOrders();
    }
    if ($('lockBtn')) {
      $('lockBtn').hidden = !isMgr || S.editing;
      $('lockBtn').textContent = gov.checklistLocked ? '🔒' : '🔓';
      $('lockBtn').title = gov.checklistLocked ? (ar ? 'فتح قفل الشيك ليست' : 'Unlock Checklist') : (ar ? 'قفل الشيك ليست' : 'Lock Checklist');
    }
    if ($('modeBtn')) {
      $('modeBtn').style.display = (canEdit || S.editing) ? '' : 'none';
    }

    document.body.classList.toggle('focused-non-opening', !S.editing && S.view !== 'opening');

    const alerts = getHealthAlerts();
    const pendingSugs = loadSuggestions().filter((s) => s.status === 'pending');
    if ($('sbAlertDot')) {
      $('sbAlertDot').hidden = !(alerts.length > 0 || (isMgr && pendingSugs.length > 0));
    }

    ensureUpgradedClosingSections();
    ensureNotifBellInHeader();
    renderHealthBanner();
    renderSmartAlertBanners();
    renderOpsLifecycleBar();
    renderChecklistGovBar();
    enhanceChecklistContextAndRoleScope();
    renderClosingDeptFilterBar();
    injectChecklistItemNotes();
    enhanceSidebarAndInventory();
    wireAutomaticTaskCreationNotifications();
    enforceTimeBasedSheetSchedule();
    relocateHeaderSubbarsToMain();
    renderCleanHeaderText();
    collapseOpsLifecycleBarToOneLine();
    renderUnifiedSingleRowChecklistBar();
    renderUnifiedThreeSheetNav();
    renderRoleSpecificLandingHero();
    renderAssignedTaskBadgesAndFilter();
    injectAssignTaskBtnIntoToolbarAndMine();
    injectRoleSwitcherInSidebar();
    if (FOH.sectionAssignment && FOH.sectionAssignment.injectSectionControls) {
      FOH.sectionAssignment.injectSectionControls();
    }
    if (FOH.bottomBar && FOH.bottomBar.syncBottomBar) {
      FOH.bottomBar.syncBottomBar();
    }

    if (!S.editing) {
      if (S.view === 'academy' && $('academyView')) renderAcademyView($('academyView'));
      if (S.view === 'tips' && $('tipsView')) renderTipsView($('tipsView'));
      if (S.view === 'dashboard' && $('dashboardView')) renderDashboardView($('dashboardView'));
      if (S.view === 'profile' && $('profilePageView')) renderProfilePageView($('profilePageView'));
      if (S.view === 'settings' && $('settingsView')) {
        renderSettingsView($('settingsView'));
        appendHoursAndSuperRolesSettings($('settingsView'));
      }
    }
  }

  function init() {
    ensureStaffHealthAndPerms();
    if (FOH.sectionAssignment && FOH.sectionAssignment.init) {
      FOH.sectionAssignment.init();
    }
    if (FOH.bottomBar && FOH.bottomBar.init) {
      FOH.bottomBar.init();
    }

    const prevRender = FOH.app.render;
    FOH.app.render = function () {
      prevRender();
      syncSuperEmployeeUI();
    };

    if ($('sidebarToggleBtn')) $('sidebarToggleBtn').addEventListener('click', openSidebar);
    if ($('sbCloseBtn')) $('sbCloseBtn').addEventListener('click', closeSidebar);
    if ($('sidebarBackdrop')) $('sidebarBackdrop').addEventListener('click', closeSidebar);

    if ($('sbThemeToggle')) {
      $('sbThemeToggle').addEventListener('click', () => {
        if (FOH.erpPwa && FOH.erpPwa.setTheme) {
          FOH.erpPwa.setTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
        }
      });
    }
    if ($('sbLogoutBtn')) {
      $('sbLogoutBtn').addEventListener('click', () => {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        closeSidebar();
        location.reload();
      });
    }

    if ($('lockBtn')) {
      $('lockBtn').addEventListener('click', () => {
        const gov = loadGov();
        const sess = getSession();
        gov.checklistLocked = !gov.checklistLocked;
        gov.lockedBy = (sess && sess.displayName) || 'Supervisor';
        if (gov.checklistLocked) S.editing = false;
        saveGov(gov);
        FOH.edit.toast(gov.checklistLocked ? (isAr() ? 'تم قفل الشيك ليست 🔒' : 'Checklist locked 🔒') : (isAr() ? 'تم فتح قفل الشيك ليست 🔓' : 'Checklist unlocked 🔓'));
        FOH.app.render();
      });
    }

    ['sections', 'today', 'mine'].forEach((cid) => {
      const node = $(cid);
      if (!node) return;
      node.addEventListener(
        'click',
        (ev) => {
          const cb = ev.target.closest('input.ck[data-id]');
          if (!cb) return;
          const gov = loadGov();
          const sess = getSession();
          if (gov.checklistLocked && sess && !sess.isManager) {
            ev.preventDefault();
            ev.stopPropagation();
            FOH.edit.toast(isAr() ? '🔒 الشيك ليست مقفلة حاليًا من قِبل المدير' : '🔒 Checklist is currently locked by Manager');
          }
        },
        true
      );
    });

    setInterval(checkExpiredSnoozeTimers, 2000);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (ev) => {
        if (ev.data && ev.data.type === 'SNOOZE_WOKE_UP') {
          checkExpiredSnoozeTimers();
          FOH.app.render();
        }
      });
    }
    // Keep #metaPanel collapsed by default so it doesn't clutter the opening screen
    if ($('metaPanel')) $('metaPanel').hidden = true;
    syncSuperEmployeeUI();
  }

  


  FOH.superEmployee = {
    init,
    openSidebar: () => (FOH.navigation && FOH.navigation.openSidebar()),
    closeSidebar: () => (FOH.navigation && FOH.navigation.closeSidebar()),
    switchView: (v) => (FOH.navigation && FOH.navigation.switchView(v)),
    syncSuperEmployeeUI,
  };

  // Automatically initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (FOH.signoffGate && FOH.signoffGate.init) FOH.signoffGate.init();
    init();
  });
})(window.FOH = window.FOH || {});
