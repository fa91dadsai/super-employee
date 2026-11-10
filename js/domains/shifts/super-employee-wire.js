// Wiring and brand sync helpers for Super Employee UI lifecycle.
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
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

  function canCurrentUserAccessOrders() {
    return FOH.roleIdentity ? FOH.roleIdentity.canCurrentUserAccessOrders() : true;
  }

  function syncBrandAndTitles(opts) {
    const { ar, gov, ident, restName, canEdit, isMgr } = opts;
    if ($('loginTitle')) $('loginTitle').textContent = 'Super Employee';
    if ($('loginSubtitle')) $('loginSubtitle').textContent = restName + ' · ' + (ar ? 'منصة العمليات الذكية للمطعم والبار' : 'Smart Restaurant & Bar Operations');
    const brandPill = document.querySelector('.login-brand-pill');
    if (brandPill) brandPill.textContent = '🍽 ' + restName;

    if ($('title')) {
      $('title').textContent = S.editing
        ? (ar ? 'تعديل الشيك ليست' : 'Edit Checklist')
        : (ar ? ident.titleAr : ident.titleEn);
    }
    document.title = (ar ? ident.titleAr : ident.titleEn) + ' · ' + restName;
    if ($('restaurantBadge')) $('restaurantBadge').textContent = '🍽 ' + restName;
    if ($('activeSectionBadge')) $('activeSectionBadge').style.display = 'none';
    if ($('checklistLockPill')) $('checklistLockPill').style.display = 'none';

    if ($('ordersTab')) $('ordersTab').hidden = !canCurrentUserAccessOrders();
    if ($('lockBtn')) {
      $('lockBtn').hidden = !isMgr || S.editing;
      $('lockBtn').textContent = gov.checklistLocked ? '🔒' : '🔓';
      $('lockBtn').title = gov.checklistLocked ? (ar ? 'فتح قفل الشيك ليست' : 'Unlock Checklist') : (ar ? 'قفل الشيك ليست' : 'Lock Checklist');
    }
    if ($('modeBtn')) {
      $('modeBtn').style.display = (canEdit || S.editing) ? '' : 'none';
    }
    document.body.classList.toggle('focused-non-opening', !S.editing && S.view !== 'opening');
  }

  function renderActiveNonOpeningViews() {
    if (S.editing) return;
    if (S.view === 'academy' && $('academyView') && FOH.academyView) FOH.academyView.renderAcademyView($('academyView'));
    if (S.view === 'tips' && $('tipsView') && FOH.tipsView) FOH.tipsView.renderTipsView($('tipsView'));
    if (S.view === 'dashboard' && $('dashboardView') && FOH.dashboardView) FOH.dashboardView.renderDashboardView($('dashboardView'));
    if (S.view === 'profile' && $('profilePageView')) {
      if (FOH.healthProfileView && FOH.healthProfileView.renderProfilePageView) {
        FOH.healthProfileView.renderProfilePageView($('profilePageView'));
      } else if (FOH.healthProfile && FOH.healthProfile.renderProfilePageView) {
        FOH.healthProfile.renderProfilePageView($('profilePageView'));
      }
    }
    if (S.view === 'dayoff' && $('dayoffView') && FOH.dayOff && FOH.dayOff.buildDayOffSection) {
      $('dayoffView').replaceChildren();
      const sec = FOH.dayOff.buildDayOffSection(false);
      if (sec) $('dayoffView').append(sec);
    }
    if (S.view === 'settings' && $('settingsView')) {
      if (FOH.settingsView) FOH.settingsView.renderSettingsView($('settingsView'));
      if (FOH.hoursSettings) FOH.hoursSettings.appendHoursAndSuperRolesSettings($('settingsView'));
    }
  }

  function wireSidebarControls() {
    const openSidebar = () => FOH.navigation && FOH.navigation.openSidebar && FOH.navigation.openSidebar();
    const closeSidebar = () => FOH.navigation && FOH.navigation.closeSidebar && FOH.navigation.closeSidebar();

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
  }

  function wireChecklistLockGuards() {
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
  }

  FOH.superEmployeeWire = {
    syncBrandAndTitles,
    renderActiveNonOpeningViews,
    wireSidebarControls,
    wireChecklistLockGuards,
  };
})(window.FOH = window.FOH || {});

