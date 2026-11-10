// foh-opening/js/domains/shifts/super-employee-init.js
// Master UI Synchronizer & Application Initialization
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function loadGov() {
    return FOH.gov ? FOH.gov.loadGov() : {};
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

  function getHealthAlerts() {
    return FOH.gov ? FOH.gov.getHealthAlerts() : [];
  }

  function loadSuggestions() {
    return FOH.suggestions ? FOH.suggestions.loadSuggestions() : [];
  }

  function checkExpiredSnoozeTimers() {
    if (FOH.snoozeEngine) FOH.snoozeEngine.checkExpiredSnoozeTimers();
  }

  function syncSuperEmployeeUI() {
    ensureStaffHealthAndPerms();
    if (FOH.sectionAssignment && FOH.sectionAssignment.init) FOH.sectionAssignment.init();
    if (FOH.bottomBar && FOH.bottomBar.init) FOH.bottomBar.init();
    if (FOH.modeDeptPanels && FOH.modeDeptPanels.init) FOH.modeDeptPanels.init();

    const ar = isAr();
    const gov = loadGov();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const canEdit = canCurrentUserEditChecklist();
    const restName = ar ? gov.restaurantNameAr : gov.restaurantName;
    const ident = getAppRoleIdentity();

    if (FOH.superEmployeeWire) {
      FOH.superEmployeeWire.syncBrandAndTitles({ ar, gov, ident, restName, canEdit, isMgr });
    }

    const alerts = getHealthAlerts();
    const pendingSugs = loadSuggestions().filter((s) => s.status === 'pending');
    if ($('sbAlertDot')) {
      $('sbAlertDot').hidden = !(alerts.length > 0 || (isMgr && pendingSugs.length > 0));
    }

    if (FOH.opsLifecycle) FOH.opsLifecycle.ensureUpgradedClosingSections();
    if (FOH.notifCenter) FOH.notifCenter.ensureNotifBellInHeader();
    if (FOH.gov) FOH.gov.renderHealthBanner();
    if (FOH.snoozeEngine) FOH.snoozeEngine.renderSmartAlertBanners();
    if (FOH.opsLifecycle) FOH.opsLifecycle.renderOpsLifecycleBar();
    if (FOH.suggestions) FOH.suggestions.renderChecklistGovBar();
    if (FOH.navigation) FOH.navigation.enhanceChecklistContextAndRoleScope();
    if (FOH.opsLifecycle) FOH.opsLifecycle.renderClosingDeptFilterBar();
    if (FOH.suggestions) FOH.suggestions.injectChecklistItemNotes();
    if (FOH.navigation) FOH.navigation.enhanceSidebarAndInventory();
    if (FOH.taskInbox) FOH.taskInbox.wireAutomaticTaskCreationNotifications();
    if (FOH.threeShifts) FOH.threeShifts.enforceTimeBasedSheetSchedule();
    if (FOH.headerSubbars) {
      FOH.headerSubbars.relocateHeaderSubbarsToMain();
      FOH.headerSubbars.renderCleanHeaderText();
      FOH.headerSubbars.collapseOpsLifecycleBarToOneLine();
      FOH.headerSubbars.renderUnifiedSingleRowChecklistBar();
      FOH.headerSubbars.injectRoleSwitcherInSidebar();
    }
    if (FOH.threeShifts) FOH.threeShifts.renderUnifiedThreeSheetNav();
    if (FOH.landingHero) FOH.landingHero.renderRoleSpecificLandingHero();
    if (FOH.taskAssignment) {
      FOH.taskAssignment.renderAssignedTaskBadgesAndFilter();
      FOH.taskAssignment.injectAssignTaskBtnIntoToolbarAndMine();
    }
    if (FOH.sectionAssignment && FOH.sectionAssignment.injectSectionControls) {
      FOH.sectionAssignment.injectSectionControls();
    }
    if (FOH.bottomBar && FOH.bottomBar.syncBottomBar) FOH.bottomBar.syncBottomBar();
    if (FOH.modeDeptPanels && FOH.modeDeptPanels.syncPanels) FOH.modeDeptPanels.syncPanels();

    if (FOH.superEmployeeWire) {
      FOH.superEmployeeWire.renderActiveNonOpeningViews();
    }
  }

  function init() {
    ensureStaffHealthAndPerms();
    if (FOH.sectionAssignment && FOH.sectionAssignment.init) FOH.sectionAssignment.init();
    if (FOH.bottomBar && FOH.bottomBar.init) FOH.bottomBar.init();
    if (FOH.modeDeptPanels && FOH.modeDeptPanels.init) FOH.modeDeptPanels.init();

    const prevRender = FOH.app.render;
    FOH.app.render = function () {
      prevRender();
      syncSuperEmployeeUI();
    };

    if (FOH.superEmployeeWire) {
      FOH.superEmployeeWire.wireSidebarControls();
      FOH.superEmployeeWire.wireChecklistLockGuards();
    }

    setInterval(checkExpiredSnoozeTimers, 2000);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (ev) => {
        if (ev.data && ev.data.type === 'SNOOZE_WOKE_UP') {
          checkExpiredSnoozeTimers();
          FOH.app.render();
        }
      });
    }
    if ($('metaPanel')) $('metaPanel').hidden = true;
    syncSuperEmployeeUI();
  }

  FOH.superEmployee = {
    init,
    openSidebar: () => (FOH.navigation && FOH.navigation.openSidebar && FOH.navigation.openSidebar()),
    closeSidebar: () => (FOH.navigation && FOH.navigation.closeSidebar && FOH.navigation.closeSidebar()),
    switchView: (v) => (FOH.navigation && FOH.navigation.switchView && FOH.navigation.switchView(v)),
    syncSuperEmployeeUI,
  };

  // Automatically initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (FOH.signoffGate && FOH.signoffGate.init) FOH.signoffGate.init();
    init();
  });
})(window.FOH = window.FOH || {});
