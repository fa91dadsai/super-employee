// foh-opening/js/domains/auth/profile-dialog.js
// Employee Profile Sheet Dialog (PROF-01, Contact Info, Floor Nickname, 3-Tab System)
// Clean Code Architecture: Decomposed into single-responsibility renderers (< 50 lines each)
(function (FOH) {
  'use strict';

  const SUPABASE_URL = 'https://jncnbwwhjmouxptqfjaz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_82pr7lscQZiCiyxUT_TTEA_J9IhKuz1';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;

  let activeProfileTab = 'shift'; // 'shift' | 'tips' | 'settings'

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function loadPendingNameChanges() {
    return FOH.pendingApprovals ? FOH.pendingApprovals.loadPendingNameChanges() : [];
  }

  function savePendingNameChanges(list) {
    if (FOH.pendingApprovals) FOH.pendingApprovals.savePendingNameChanges(list);
  }

  function saveSession(next, opts = {}) {
    const remember = opts.remember !== false;
    if (FOH.sessionAuth) FOH.sessionAuth.saveSession(next, remember);
  }

  function applyAuthUI() {
    if (FOH.sessionAuth) FOH.sessionAuth.applyAuthUI();
  }

  function setTheme(mode) {
    if (FOH.sessionAuth) FOH.sessionAuth.setTheme(mode);
  }

  function getStaffRecord(session) {
    let staffRec = (S.tpl.staff || []).find(
      (p) => (p.id === session.staffId) ||
             (session.inviteCode && p.inviteCode === session.inviteCode) ||
             (p.name || '').toLowerCase().startsWith(((session.username) || '').toLowerCase())
    );
    if (!staffRec) {
      staffRec = {
        id: session.staffId || ('staff_' + session.username),
        name: session.displayName || session.firstName || session.username,
        nickname: session.nickname || session.firstName || session.username,
        email: session.email || '',
        phone: session.phone || '',
        inviteCode: session.inviteCode || ('CEEN-' + Math.floor(1000 + Math.random() * 9000)),
        role: session.roleId || 'staff',
        active: true,
        inv: true,
      };
      if (!S.tpl.staff) S.tpl.staff = [];
      S.tpl.staff.push(staffRec);
      FOH.store.saveTemplate(S.tpl);
    }
    const activeReq = (loadPendingNameChanges().find((r) => r.staffId === staffRec.id || r.staffUsername === session.username) || staffRec.pendingNameChange);
    if (activeReq && activeReq.status === 'pending') {
      staffRec.pendingNameChange = activeReq;
    }
    return staffRec;
  }

  function computeHealthCertMeta(staffRec, ar) {
    const hcDays = staffRec && staffRec.healthCertExpiry && FOH.restaurantGov && FOH.restaurantGov.calcDaysLeft
      ? FOH.restaurantGov.calcDaysLeft(staffRec.healthCertExpiry)
      : null;
    let badgeTxt = ar ? '🏥 الشهادة: صالحة ✓' : '🏥 Cert: Valid ✓';
    let badgeClass = 'valid';
    if (hcDays !== null) {
      if (hcDays < 0) {
        badgeTxt = ar ? ('🏥 منتهية (' + Math.abs(hcDays) + ' ي)') : ('🏥 Expired (' + Math.abs(hcDays) + 'd)');
        badgeClass = 'expired';
      } else if (hcDays <= 30) {
        badgeTxt = ar ? ('🏥 باقي ' + hcDays + ' يوم') : ('🏥 ' + hcDays + 'd left');
        badgeClass = 'warning';
      }
    }
    return { hcDays, badgeTxt, badgeClass };
  }

  // ---- Sub-Renderer 1: Hero Pass Card ----
  function renderProfileHero(container, opts = {}) {
    const { session, staffRec, hcMeta, ar } = opts;
    const initials = ((session.firstName || session.displayName || 'U')[0] + ((session.lastName || '')[0] || '')).toUpperCase();
    const hero = el('div', 'prof-hero');
    const av = el('div', 'prof-avatar-lg', initials);
    const info = el('div', 'prof-hero-info');
    const curDisp = (session.firstName ? (session.firstName + ' ' + (session.lastName || '')).trim() : session.displayName) || 'Employee';
    const nickBadge = session.nickname || staffRec.nickname ? ' (' + (session.nickname || staffRec.nickname) + ')' : '';
    info.append(el('h3', '', curDisp + nickBadge));

    const badges = el('div', 'prof-badges');
    const roleLabel = ar ? (session.roleAr || session.roleName || 'موظف') : (session.roleName || 'Staff');
    badges.append(
      el('span', 'prof-badge', '🪪 ' + roleLabel),
      el('span', 'prof-badge', '🌿 ' + t('profBranch')),
      el('span', 'prof-badge cloud', '⚡ ' + (session.cloudConnected ? t('profCloudConnected') : t('profLocalSession'))),
      el('span', 'prof-badge ' + hcMeta.badgeClass, hcMeta.badgeTxt)
    );
    info.append(badges);
    hero.append(av, info);
    container.append(hero);
  }

  // ---- Sub-Renderer 2: 3-Tab Segmented Controller ----
  function renderProfileTabBar(container, opts = {}) {
    const { activeTab, onSwitchTab, ar } = opts;
    const tabBar = el('div', 'prof-tab-bar');
    const tabs = [
      { id: 'shift', icon: '🪪', label: ar ? 'شفتي وهويتي' : 'My Shift' },
      { id: 'tips', icon: '💰', label: ar ? 'التبس والمستحقات' : 'Tips & Share' },
      { id: 'settings', icon: '⚙️', label: ar ? 'حسابي وإعداداتي' : 'Settings' },
    ];
    tabs.forEach((tab) => {
      const btn = el('button', 'prof-tab-btn' + (activeTab === tab.id ? ' active' : ''));
      btn.type = 'button';
      btn.append(el('span', '', tab.icon), el('span', '', tab.label));
      btn.addEventListener('click', () => {
        if (activeTab !== tab.id) onSwitchTab(tab.id);
      });
      tabBar.append(btn);
    });
    container.append(tabBar);
  }

  function renderShiftTab(container, opts = {}) {
    if (FOH.profileDialogTabs && FOH.profileDialogTabs.renderShiftTab) {
      return FOH.profileDialogTabs.renderShiftTab(container, opts);
    }
  }

  function renderTipsTab(container, opts = {}) {
    if (FOH.profileDialogTabs && FOH.profileDialogTabs.renderTipsTab) {
      return FOH.profileDialogTabs.renderTipsTab(container, opts);
    }
  }


  function applyManagerDirectSave({ newFn, newLn, newNick, newFullName }, { session, staffRec }) {
    session.firstName = newFn;
    session.lastName = newLn;
    session.nickname = newNick || session.nickname;
    session.displayName = newFullName || session.displayName;
    if (staffRec.id) {
      staffRec.name = session.displayName;
      staffRec.nickname = session.nickname;
      delete staffRec.pendingNameChange;
    }
    FOH.store.saveTemplate(S.tpl);
    saveSession(session, { remember: true });
    applyAuthUI();
    FOH.app.render();
    renderProfileBody();
    FOH.edit.toast(t('profSavedMsg'));
  }

  function submitStaffNameChangeRequest({ newFn, newLn, newNick, newFullName, curLegalFull, curNick }, { session, staffRec, ar }) {
    const reqObj = {
      id: 'pnc_' + Date.now(),
      staffId: staffRec.id || ('staff_' + session.username),
      staffUsername: session.username,
      currentName: staffRec.name || curLegalFull,
      currentNickname: curNick,
      reqFirstName: newFn,
      reqLastName: newLn,
      reqFullName: newFullName,
      reqNickname: newNick,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    staffRec.pendingNameChange = reqObj;
    const pList = loadPendingNameChanges().filter((r) => r.staffId !== staffRec.id && r.staffUsername !== session.username);
    pList.push(reqObj);
    savePendingNameChanges(pList);
    FOH.store.saveTemplate(S.tpl);
    if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
      FOH.cloudRealtime.broadcast('STAFF_NAME_CHANGE_REQUEST', reqObj);
    }
    saveSession(session, { remember: true });
    FOH.app.render();
    renderProfileBody();
    FOH.edit.toast(ar ? '⏳ تم حفظ جهات الاتصال وإرسال طلب تعديل الاسم/اللقب للمدير العام للاعتماد ✓' : '⏳ Contact info saved. Name change submitted for Manager approval ✓');
  }

  // ---- Sub-Renderer 5A: Helper - Save Profile Logic ----
  function handleProfileSave(newVals, opts = {}) {
    const { newEmail, newPhone, newFn, newLn, newNick } = newVals;
    const { session, staffRec, isMgr, ar } = opts;
    const newFullName = (newFn + ' ' + newLn).trim();
    session.email = newEmail;
    session.phone = newPhone;
    if (staffRec.id) { staffRec.email = newEmail; staffRec.phone = newPhone; }

    const curLegalFull = ((session.firstName || '') + ' ' + (session.lastName || '')).trim();
    const curNick = session.nickname || staffRec.nickname || '';
    const nameChanged = (newFullName !== curLegalFull) || (newNick && newNick !== curNick);

    if (isMgr) {
      applyManagerDirectSave({ newFn, newLn, newNick, newFullName }, { session, staffRec });
    } else if (nameChanged) {
      submitStaffNameChangeRequest({ newFn, newLn, newNick, newFullName, curLegalFull, curNick }, { session, staffRec, ar });
    } else {
      FOH.store.saveTemplate(S.tpl);
      saveSession(session, { remember: true });
      FOH.app.render();
      renderProfileBody();
      FOH.edit.toast(ar ? '✓ تم حفظ رقم الهاتف والبريد الإلكتروني بنجاح' : '✓ Contact info updated successfully');
    }
  }

  // ---- Sub-Renderer 5A: Identity Form ----

  function renderSettingsTab(container, opts = {}) {
    if (FOH.profileDialogSettings && FOH.profileDialogSettings.renderSettingsTab) {
      return FOH.profileDialogSettings.renderSettingsTab(container, opts);
    }
  }

  function renderProfileBody() {
    const session = getSession();
    if (!session) return;
    const body = $('profSheetBody');
    body.replaceChildren();
    $('profSheetTitle').textContent = t('profTitle');
    const ar = isAr();
    if (typeof FOH.ensureStaffHealthAndPerms === 'function') FOH.ensureStaffHealthAndPerms();
    const isMgr = !!session.isManager;

    const staffRec = getStaffRecord(session);
    const hcMeta = computeHealthCertMeta(staffRec, ar);

    renderProfileHero(body, { session, staffRec, hcMeta, ar });

    renderProfileTabBar(body, {
      activeTab: activeProfileTab,
      onSwitchTab: (nextTab) => {
        activeProfileTab = nextTab;
        renderProfileBody();
      },
      ar,
    });

    const tabPane = el('div', 'prof-tab-pane');
    body.append(tabPane);

    if (activeProfileTab === 'shift') {
      renderShiftTab(tabPane, { session, staffRec, hcMeta, ar });
    } else if (activeProfileTab === 'tips') {
      renderTipsTab(tabPane, { session, ar });
    } else if (activeProfileTab === 'settings') {
      renderSettingsTab(tabPane, { session, staffRec, isMgr, ar });
    }
  }

  function openProfile() {
    const session = getSession();
    if (!session) return;
    renderProfileBody();
    $('profileSheet').showModal();
  }

  FOH.profileDialog = {
    open: openProfile,
    openProfile,
    renderProfileBody,
    handleProfileSave,
  };

  FOH.openProfile = openProfile;
})(window.FOH = window.FOH || {});
