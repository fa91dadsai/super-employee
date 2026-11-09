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

  function renderShiftBentoCard(opts = {}) {
    const { session, staffRec, hcMeta, ar } = opts;
    const secSched = el('section', 'prof-section');
    secSched.append(el('h4', '', '🗓 ' + t('profScheduleHead')));
    const kv = el('div', 'prof-kv');
    const hcStatusTxt = staffRec.healthCertExpiry
      ? (staffRec.healthCertExpiry + ' (' + (hcMeta.hcDays !== null && hcMeta.hcDays <= 30 ? (ar ? '⚠️ تجديد' : '⚠️ Renew') : (ar ? 'صالحة ✓' : 'Valid ✓')) + ')')
      : (session.healthCert || 'Valid ✓');

    [
      [t('profShiftToday'), session.shift || '09:00 – 17:30'],
      [t('profLocker'), session.locker || '#B-04'],
      [t('profUniform'), session.uniform || 'M · Complete'],
      [t('profHealthCert'), hcStatusTxt],
    ].forEach(([k, v]) => {
      const cell = el('div', 'prof-kv-cell');
      cell.append(el('small', '', k), el('b', '', v));
      kv.append(cell);
    });
    secSched.append(kv);
    return secSched;
  }

  function renderShiftShortcuts(ar) {
    const secActs = el('section', 'prof-section');
    secActs.append(el('h4', '', ar ? '⚡ اختصارات سريعة للموظف' : '⚡ Quick Shortcuts'));
    const actsGrid = el('div', 'prof-shortcuts-grid');

    const dayOffBtn = el('button', 'prof-shortcut-btn');
    dayOffBtn.type = 'button';
    dayOffBtn.innerHTML =
      '<div class="psb-icon">🏖️</div>' +
      '<div class="psb-txt"><b>' + (ar ? 'الانتقال إلى قسم طلب إجازة / عطلة (Day-Off)' : 'Request Day-Off & Leave') + '</b><small>' + (ar ? 'تقديم طلب العطلة الأسبوعية للربط مع جدول الشفتات' : 'Submit leave request directly to roster') + '</small></div>' +
      '<div class="psb-arr">' + (ar ? '←' : '→') + '</div>';
    dayOffBtn.addEventListener('click', () => {
      $('profileSheet').close();
      if (FOH.switchView) FOH.switchView('dayoff');
    });

    const dmgBtn = el('button', 'prof-shortcut-btn');
    dmgBtn.type = 'button';
    dmgBtn.innerHTML =
      '<div class="psb-icon">🔧</div>' +
      '<div class="psb-txt"><b>' + (ar ? 'تسجيل كسر أو عطل بالمعدات (Damage / Repair)' : 'Report Breakage / Repair') + '</b><small>' + (ar ? 'تبليغ فوري عن تلف كأس أو صحن أو طلب صيانة' : 'Log broken glassware or equipment repair') + '</small></div>' +
      '<div class="psb-arr">' + (ar ? '←' : '→') + '</div>';
    dmgBtn.addEventListener('click', () => {
      $('profileSheet').close();
      if (FOH.invBreak && FOH.invBreak.open) FOH.invBreak.open();
    });

    actsGrid.append(dayOffBtn, dmgBtn);
    secActs.append(actsGrid);
    return secActs;
  }

  // ---- Sub-Renderer 3: Tab 1 (Shift & Duty) ----
  function renderShiftTab(container, opts = {}) {
    const { session, staffRec, hcMeta, ar } = opts;
    const myDoneOpening = FOH.tasksView ? FOH.tasksView.myOpeningItems().filter((it) => S.run.checked[it.id]).length : 0;
    const myDoneSched = FOH.tasksView ? FOH.tasksView.todayStates().filter((st) => FOH.tasksView.isMine(st.task) && st.status === 'done').length : 0;
    const myCountsTotal = FOH.invCount ? FOH.invCount.myCounts().length : 0;
    const myBreakage = (S.inv && S.inv.breakage) ? S.inv.breakage.filter((b) => (b.by || '').toLowerCase() === (session.displayName || '').toLowerCase()).length : 0;

    const stats = el('div', 'prof-stats');
    [
      [String(myDoneOpening + myDoneSched), t('profTasksDone')],
      [String(myCountsTotal), t('profAssignedCounts')],
      [String(myBreakage), t('profReportedBreak')],
    ].forEach(([num, lbl]) => {
      const box = el('div', 'prof-stat');
      box.append(el('b', '', num), el('small', '', lbl));
      stats.append(box);
    });
    container.append(stats);
    container.append(renderShiftBentoCard({ session, staffRec, hcMeta, ar }));

    if (hcMeta.hcDays !== null && hcMeta.hcDays <= 30) {
      const warnCard = el('div', 'prof-hc-banner ' + (hcMeta.hcDays < 0 ? 'critical' : 'warning'));
      const expiryDateSafe = FOH.escapeHtml(staffRec.healthCertExpiry || '');
      warnCard.innerHTML =
        '<b>' + (hcMeta.hcDays < 0 ? '🚨 ' + (ar ? 'الشهادة الصحية منتهية الصلاحية!' : 'Health Certificate Expired!') : '⚠️ ' + (ar ? 'تنبيه: الشهادة الصحية تقترب من الانتهاء' : 'Health Certificate Expiring Soon')) + '</b>' +
        '<p>' + (ar ? ('شهادتك الصحية تنتهي في تاريخ (' + expiryDateSafe + '). يرجى مراجعة إدارة المطعم لتجديد الشهادة فوراً.') : ('Your certificate expires on ' + expiryDateSafe + '. Please renew with HR immediately.')) + '</p>';
      container.append(warnCard);
    }

    container.append(renderShiftShortcuts(ar));
  }

  function computeTipsMetrics(session) {
    const tipsDB = FOH.tipsView && FOH.tipsView.loadTipsData ? FOH.tipsView.loadTipsData() : null;
    const myKey = (session.username || '').toLowerCase();
    const emp = (tipsDB && tipsDB.staff && (tipsDB.staff[myKey] || tipsDB.staff.sara)) || {
      name: session.displayName || 'Sara',
      points: 100,
      workedDays: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'],
      withdrawals: [{ amountJOD: 10.0 }, { amountJOD: 10.0 }],
    };

    const pointsVal = emp.points || 100;
    const multVal = (pointsVal / 100).toFixed(1) + 'x';
    const workedDaysCount = emp.workedDays ? emp.workedDays.length : 5;
    const totalPool = (tipsDB && tipsDB.totalPoolJOD) || 420.0;
    const totalWeight = tipsDB && tipsDB.staff
      ? Object.values(tipsDB.staff).reduce((sum, st) => sum + (st.points || 100) * (st.workedDays ? st.workedDays.length : 5), 0)
      : 500;
    const empWeight = pointsVal * workedDaysCount;
    const grossShare = ((empWeight / (totalWeight || 1)) * totalPool).toFixed(3);
    const withdrawnTotal = ((emp.withdrawals || []).reduce((s, w) => s + Number(w.amountJOD || 0), 0)).toFixed(3);
    const netPayout = Math.max(0, grossShare - withdrawnTotal).toFixed(3);

    return { multVal, pointsVal, workedDaysCount, withdrawnTotal, netPayout };
  }

  // ---- Sub-Renderer 4: Tab 2 (Tips & Wallet) ----
  function renderTipsTab(container, opts = {}) {
    const { session, ar } = opts;
    const m = computeTipsMetrics(session);

    const bento = el('div', 'prof-bento-grid');
    const b1 = el('div', 'prof-bento-card');
    b1.append(el('small', '', ar ? '⭐ نقاط التبس (Points Multiplier)' : '⭐ Tip Multiplier'), el('b', '', m.multVal + ' (' + m.pointsVal + ' pts)'));
    const b2 = el('div', 'prof-bento-card');
    b2.append(el('small', '', ar ? '📅 أيام العمل بالشفت' : '📅 Worked Days'), el('b', '', m.workedDaysCount + ' / 7 ' + (ar ? 'أيام' : 'days')));
    const b3 = el('div', 'prof-bento-card');
    b3.append(el('small', '', ar ? '💵 السلف والمسحوبات' : '💵 Advances'), el('b', '', m.withdrawnTotal + ' JOD'));
    const b4 = el('div', 'prof-bento-card highlight');
    b4.append(el('small', '', ar ? '💰 الصافي المقدر للمغلف' : '💰 Net Estimated'), el('b', '', m.netPayout + ' JOD'));
    bento.append(b1, b2, b3, b4);
    container.append(bento);

    const infoCard = el('div', 'prof-info-banner');
    infoCard.innerHTML =
      '<div class="pib-head">⚖️ <b>' + (ar ? 'شفافية احتساب التبس في CEEN Lounge:' : 'Tip Distribution Governance:') + '</b></div>' +
      '<div class="pib-body">' +
      (ar
        ? 'يتم توزيع التبس وفق خوارزمية <b>Largest-Remainder</b> الرسمية بالأفلاس الدقيقة وبدون أي اقتطاعات إدارية. نقاطك تُحسب تلقائياً حسب المسمى الوظيفي وساعات الدوام الفعلية الموثقة.'
        : 'Tips are split with exact integer fils precision via the Largest-Remainder rule without administrative deductions. Points reflect your logged role & shift hours.') +
      '</div>';
    container.append(infoCard);

    const openTipsBtn = el('button', 'btn primary prof-action-btn');
    openTipsBtn.type = 'button';
    openTipsBtn.innerHTML = '<span>💰 ' + (ar ? 'فتح شاشة التبس والمغلفات الكاملة (Tip Manager)' : 'Open Full Tip Manager Wallet') + '</span> <span>' + (ar ? '←' : '→') + '</span>';
    openTipsBtn.addEventListener('click', () => {
      $('profileSheet').close();
      if (FOH.switchView) FOH.switchView('tips');
    });
    container.append(openTipsBtn);
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
    openProfile,
    renderProfileBody,
  };

  FOH.openProfile = openProfile;
})(window.FOH = window.FOH || {});
