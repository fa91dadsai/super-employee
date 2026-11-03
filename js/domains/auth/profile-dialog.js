// foh-opening/js/domains/auth/profile-dialog.js
// Employee Profile Sheet Dialog (PROF-01, Contact Info, Floor Nickname, 3-Tab System: Shift, Tips, Settings)
(function (FOH) {
  'use strict';

  const SUPABASE_URL = 'https://jncnbwwhjmouxptqfjaz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_82pr7lscQZiCiyxUT_TTEA_J9IhKuz1';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  let activeProfileTab = 'shift'; // 'shift' | 'tips' | 'settings'

  function isAr() {
    return FOH.i18n.lang === 'ar';
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

  function saveSession(next, remember = true) {
    if (FOH.sessionAuth) FOH.sessionAuth.saveSession(next, remember);
  }

  function applyAuthUI() {
    if (FOH.sessionAuth) FOH.sessionAuth.applyAuthUI();
  }

  function setTheme(mode) {
    if (FOH.sessionAuth) FOH.sessionAuth.setTheme(mode);
  }

  function getShowPreviewBar() {
    return FOH.sessionAuth && FOH.sessionAuth.getShowPreviewBar ? FOH.sessionAuth.getShowPreviewBar() : false;
  }
  function setShowPreviewBar(v) {
    if (FOH.sessionAuth && FOH.sessionAuth.setShowPreviewBar) FOH.sessionAuth.setShowPreviewBar(v);
  }

  // ---- Employee Profile Sheet (#profileSheet) ----
  function openProfile() {
    const session = getSession();
    if (!session) return;
    renderProfileBody();
    $('profileSheet').showModal();
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

    // Health Certificate Calculation
    const hcDays = staffRec && staffRec.healthCertExpiry && FOH.restaurantGov && FOH.restaurantGov.calcDaysLeft
      ? FOH.restaurantGov.calcDaysLeft(staffRec.healthCertExpiry)
      : null;
    let hcBadgeTxt = ar ? '🏥 الشهادة: صالحة ✓' : '🏥 Cert: Valid ✓';
    let hcBadgeClass = 'valid';
    if (hcDays !== null) {
      if (hcDays < 0) {
        hcBadgeTxt = ar ? '🏥 منتهية (' + Math.abs(hcDays) + ' ي)' : '🏥 Expired (' + Math.abs(hcDays) + 'd)';
        hcBadgeClass = 'expired';
      } else if (hcDays <= 30) {
        hcBadgeTxt = ar ? '🏥 باقي ' + hcDays + ' يوم' : '🏥 ' + hcDays + 'd left';
        hcBadgeClass = 'warning';
      }
    }

    // ---- Top Hero Card: Digital Staff Pass ----
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
      el('span', 'prof-badge ' + hcBadgeClass, hcBadgeTxt)
    );
    info.append(badges);
    hero.append(av, info);
    body.append(hero);

    // ---- 3-Tab Segmented Controller (شفتي، التبس، الإعدادات) ----
    const tabBar = el('div', 'prof-tab-bar');
    const tabs = [
      { id: 'shift', icon: '🪪', label: ar ? 'شفتي وهويتي' : 'My Shift' },
      { id: 'tips', icon: '💰', label: ar ? 'التبس والمستحقات' : 'Tips & Share' },
      { id: 'settings', icon: '⚙️', label: ar ? 'حسابي وإعداداتي' : 'Settings' },
    ];
    tabs.forEach((tab) => {
      const btn = el('button', 'prof-tab-btn' + (activeProfileTab === tab.id ? ' active' : ''));
      btn.type = 'button';
      btn.append(el('span', '', tab.icon), el('span', '', tab.label));
      btn.addEventListener('click', () => {
        if (activeProfileTab !== tab.id) {
          activeProfileTab = tab.id;
          renderProfileBody();
        }
      });
      tabBar.append(btn);
    });
    body.append(tabBar);

    // Container for active tab content
    const tabPane = el('div', 'prof-tab-pane');
    body.append(tabPane);

    // ==========================================
    // TAB 1: SHIFT & DUTY (شفتي وهويتي)
    // ==========================================
    if (activeProfileTab === 'shift') {
      // 1. Bento Personal Stats
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
      tabPane.append(stats);

      // 2. Shift & Station Bento Card
      const secSched = el('section', 'prof-section');
      secSched.append(el('h4', '', '🗓 ' + t('profScheduleHead')));
      const kv = el('div', 'prof-kv');
      [
        [t('profShiftToday'), session.shift || '09:00 – 17:30'],
        [t('profLocker'), session.locker || '#B-04'],
        [t('profUniform'), session.uniform || 'M · Complete'],
        [t('profHealthCert'), staffRec.healthCertExpiry ? (staffRec.healthCertExpiry + ' (' + (hcDays !== null && hcDays <= 30 ? (ar ? '⚠️ تجديد' : '⚠️ Renew') : (ar ? 'صالحة ✓' : 'Valid ✓')) + ')') : (session.healthCert || 'Valid ✓')],
      ].forEach(([k, v]) => {
        const cell = el('div', 'prof-kv-cell');
        cell.append(el('small', '', k), el('b', '', v));
        kv.append(cell);
      });
      secSched.append(kv);
      tabPane.append(secSched);

      // 3. Health Certificate Expiry Warning Banner (if expiring or expired)
      if (hcDays !== null && hcDays <= 30) {
        const warnCard = el('div', 'prof-hc-banner ' + (hcDays < 0 ? 'critical' : 'warning'));
        warnCard.innerHTML =
          '<b>' + (hcDays < 0 ? '🚨 ' + (ar ? 'الشهادة الصحية منتهية الصلاحية!' : 'Health Certificate Expired!') : '⚠️ ' + (ar ? 'تنبيه: الشهادة الصحية تقترب من الانتهاء' : 'Health Certificate Expiring Soon')) + '</b>' +
          '<p>' + (ar ? ('شهادتك الصحية تنتهي في تاريخ (' + staffRec.healthCertExpiry + '). يرجى مراجعة إدارة المطعم لإجراء الفحص الطبي وتجديد الشهادة فوراً لتجنب الإيقاف المؤقت.') : ('Your certificate expires on ' + staffRec.healthCertExpiry + '. Please renew with HR immediately.')) + '</p>';
        tabPane.append(warnCard);
      }

      // 4. Quick Action Shortcuts
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
      tabPane.append(secActs);
    }

    // ==========================================
    // TAB 2: TIPS & WALLET (التبس والمستحقات)
    // ==========================================
    else if (activeProfileTab === 'tips') {
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

      // Bento Tip Cards (2x2 Grid)
      const bento = el('div', 'prof-bento-grid');

      const b1 = el('div', 'prof-bento-card');
      b1.append(el('small', '', ar ? '⭐ نقاط التبس (Points Multiplier)' : '⭐ Tip Multiplier'), el('b', '', multVal + ' (' + pointsVal + ' pts)'));

      const b2 = el('div', 'prof-bento-card');
      b2.append(el('small', '', ar ? '📅 أيام العمل بالشفت' : '📅 Worked Days'), el('b', '', workedDaysCount + ' / 7 ' + (ar ? 'أيام' : 'days')));

      const b3 = el('div', 'prof-bento-card');
      b3.append(el('small', '', ar ? '💵 السلف والمسحوبات' : '💵 Advances'), el('b', '', withdrawnTotal + ' JOD'));

      const b4 = el('div', 'prof-bento-card highlight');
      b4.append(el('small', '', ar ? '💰 الصافي المقدر للمغلف' : '💰 Net Estimated'), el('b', '', netPayout + ' JOD'));

      bento.append(b1, b2, b3, b4);
      tabPane.append(bento);

      // Info Banner
      const infoCard = el('div', 'prof-info-banner');
      infoCard.innerHTML =
        '<div class="pib-head">⚖️ <b>' + (ar ? 'شفافية احتساب التبس في CEEN Lounge:' : 'Tip Distribution Governance:') + '</b></div>' +
        '<div class="pib-body">' +
        (ar
          ? 'يتم توزيع التبس وفق خوارزمية <b>Largest-Remainder</b> الرسمية بالأفلاس الدقيقة وبدون أي اقتطاعات إدارية. نقاطك تُحسب تلقائياً حسب المسمى الوظيفي وساعات الدوام الفعلية الموثقة.'
          : 'Tips are split with exact integer fils precision via the Largest-Remainder rule without administrative deductions. Points reflect your logged role & shift hours.') +
        '</div>';
      tabPane.append(infoCard);

      // Action Button to Open Full Tip Manager
      const openTipsBtn = el('button', 'btn primary prof-action-btn');
      openTipsBtn.type = 'button';
      openTipsBtn.innerHTML = '<span>💰 ' + (ar ? 'فتح شاشة التبس والمغلفات الكاملة (Tip Manager)' : 'Open Full Tip Manager Wallet') + '</span> <span>' + (ar ? '←' : '→') + '</span>';
      openTipsBtn.addEventListener('click', () => {
        $('profileSheet').close();
        if (FOH.switchView) FOH.switchView('tips');
      });
      tabPane.append(openTipsBtn);
    }

    // ==========================================
    // TAB 3: SETTINGS & ACCOUNT (حسابي وإعداداتي)
    // ==========================================
    else if (activeProfileTab === 'settings') {
      // 1. Pending Approval Banner (if staff member submitted a name/nickname change)
      if (staffRec.pendingNameChange && staffRec.pendingNameChange.status === 'pending') {
        const pnc = staffRec.pendingNameChange;
        const banner = el('div', 'pending-approval-banner');
        banner.innerHTML =
          '<div class="pab-head">⏳ ' + (ar ? 'طلب تعديل الاسم والـ Nickname قيد مراجعة المدير العام' : 'Pending General Manager Approval') + '</div>' +
          '<div class="pab-body">' +
          '<b>' + (ar ? 'الاسم الجديد المطلوب:' : 'Requested Legal Name:') + '</b> ' + (FOH.escapeHtml(pnc.reqFullName || (pnc.reqFirstName + ' ' + pnc.reqLastName))) + '<br>' +
          '<b>' + (ar ? 'الـ Nickname المقترح:' : 'Requested Nickname:') + '</b> 🏷️ ' + (FOH.escapeHtml(pnc.reqNickname || '—')) + '<br>' +
          '<small style="display:block;margin-top:4px;color:var(--muted);">' +
          (ar ? '💡 لمنع الغش والعبث ببيانات الشركة، يبقى اسمك الحالي معتمداً في الشفتات والتبس حتى يقوم المدير العام باعتماده رسمياً.' : '💡 For governance, your current name remains in place until Manager approval.') +
          '</small>' +
          '</div>';
        tabPane.append(banner);
      }

      // 2. Personal Identity & ERP Profile Section
      const secProf = el('section', 'prof-section');
      secProf.append(el('h4', '', '👤 ' + (ar ? 'البيانات الشخصية وهوية الموظف في النظام (ERP Profile)' : 'Personal Identity & ERP Profile')));

      // Row 1: Contact Info (Email & Phone)
      const rowContact = el('div', 'two');
      const emailWrap = el('label', '', ar ? '📧 البريد الإلكتروني (Email)' : '📧 Email Address');
      const emailIn = el('input', 'in');
      emailIn.type = 'email';
      emailIn.placeholder = 'employee@ceenlounge.com';
      emailIn.value = session.email || staffRec.email || '';
      emailWrap.append(emailIn);

      const phoneWrap = el('label', '', ar ? '📱 رقم الهاتف والواتساب (Phone / WhatsApp)' : '📱 Phone / WhatsApp');
      const phoneIn = el('input', 'in');
      phoneIn.type = 'tel';
      phoneIn.placeholder = '+962 7 9xxx xxxx';
      phoneIn.value = session.phone || staffRec.phone || '';
      phoneWrap.append(phoneIn);
      rowContact.append(emailWrap, phoneWrap);

      // Row 2: Floor Nickname with ERP sync badges
      const nickWrap = el('label', '');
      nickWrap.style.display = 'block';
      nickWrap.style.marginTop = '10px';
      nickWrap.innerHTML = '<b>🏷️ ' + (ar ? 'الاسم المستعار في الصالة (Floor Nickname):' : 'Floor Nickname:') + '</b>';
      const nickIn = el('input', 'in');
      nickIn.placeholder = ar ? 'مثال: سارة، سيمو، ليو...' : 'e.g. Sara, Simo, Leo...';
      nickIn.value = session.nickname || staffRec.nickname || '';
      nickWrap.append(nickIn);

      const syncPills = el('div', 'erp-sync-pill-row');
      syncPills.innerHTML =
        '<span class="erp-sync-pill">🏷️ Tip Manager (' + (ar ? 'توزيع ونقاط التبس' : 'Tip Points & Envelope') + ')</span>' +
        '<span class="erp-sync-pill">🗓️ OpsFlow Schedule (' + (ar ? 'جدول الشفتات الأسبوعي' : 'Weekly Roster') + ')</span>' +
        '<span class="erp-sync-pill">👥 HR Directory (' + (ar ? 'الملف الوظيفي' : 'HR Staff Record') + ')</span>';
      nickWrap.append(syncPills);

      // Row 3: Official Legal Name
      const rowNames = el('div', 'two');
      rowNames.style.marginTop = '10px';
      const fnWrap = el('label', '', ar ? 'الاسم الأول (Legal First Name)' : 'Legal First Name');
      const fnIn = el('input', 'in');
      fnIn.value = session.firstName || '';
      fnWrap.append(fnIn);

      const lnWrap = el('label', '', ar ? 'اسم العائلة (Legal Last Name)' : 'Legal Last Name');
      const lnIn = el('input', 'in');
      lnIn.value = session.lastName || '';
      lnWrap.append(lnIn);
      rowNames.append(fnWrap, lnWrap);

      // Row 4: Activation Code with 1-tap Copy
      const curCode = session.inviteCode || staffRec.inviteCode || 'CEEN-1001';
      const codeBox = el('div', 'st-invite-box');
      codeBox.style.marginTop = '10px';
      const codeRow = el('div', '');
      codeRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;';
      codeRow.innerHTML = '<span>🔑 <b>' + (ar ? 'كود التفعيل الخاص بك (Activation Code):' : 'Your Activation Code:') + '</b></span>';

      const copyWrap = el('div', '');
      copyWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';
      const codePill = el('code', 'st-code-pill', curCode);
      const copyBtn = el('button', 'btn sm', ar ? '📋 نسخ' : '📋 Copy');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(curCode);
        copyBtn.textContent = ar ? '✓ تم النسخ' : '✓ Copied';
        setTimeout(() => { copyBtn.textContent = ar ? '📋 نسخ' : '📋 Copy'; }, 2000);
      });
      copyWrap.append(codePill, copyBtn);
      codeRow.append(copyWrap);
      codeBox.append(codeRow);
      codeBox.append(Object.assign(el('small', ''), {
        style: 'display:block;margin-top:6px;color:var(--muted);',
        textContent: ar ? '💡 يمكنك استخدام هذا الكود لتسجيل الدخول السريع إلى النظام من أي جهاز.' : '💡 Use this code to sign in instantly from any device.'
      }));

      // Save Profile Button
      const saveProfBtn = el('button', 'btn primary', ar ? '💾 حفظ التعديلات وإرسال للاعتماد' : '💾 Save Profile & Submit');
      saveProfBtn.type = 'button';
      saveProfBtn.style.marginTop = '12px';
      saveProfBtn.style.width = '100%';
      saveProfBtn.addEventListener('click', async () => {
        const newEmail = emailIn.value.trim();
        const newPhone = phoneIn.value.trim();
        const newFn = fnIn.value.trim() || session.firstName;
        const newLn = lnIn.value.trim();
        const newNick = nickIn.value.trim();
        const newFullName = (newFn + ' ' + newLn).trim();

        session.email = newEmail;
        session.phone = newPhone;
        if (staffRec.id) {
          staffRec.email = newEmail;
          staffRec.phone = newPhone;
        }

        const curLegalFull = ((session.firstName || '') + ' ' + (session.lastName || '')).trim();
        const curNick = session.nickname || staffRec.nickname || '';
        const nameChanged = (newFullName !== curLegalFull) || (newNick && newNick !== curNick);

        if (isMgr) {
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
          saveSession(session, true);
          applyAuthUI();
          FOH.app.render();
          renderProfileBody();
          FOH.edit.toast(t('profSavedMsg'));
        } else {
          if (nameChanged) {
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
            saveSession(session, true);
            FOH.app.render();
            renderProfileBody();
            FOH.edit.toast(ar ? '⏳ تم حفظ جهات الاتصال وإرسال طلب تعديل الاسم/اللقب للمدير العام للاعتماد ✓' : '⏳ Contact info saved. Name change submitted for Manager approval ✓');
          } else {
            FOH.store.saveTemplate(S.tpl);
            saveSession(session, true);
            FOH.app.render();
            renderProfileBody();
            FOH.edit.toast(ar ? '✓ تم حفظ رقم الهاتف والبريد الإلكتروني بنجاح' : '✓ Contact info updated successfully');
          }
        }
      });

      secProf.append(rowContact, nickWrap, rowNames, codeBox, saveProfBtn);
      tabPane.append(secProf);

      // 3. App Settings, Dark Mode, Web Push & Security
      const secSet = el('section', 'prof-section');
      secSet.append(el('h4', '', '⚙️ ' + t('profSettingsHead')));

      // Theme toggle
      const isDark = document.body.classList.contains('dark');
      const themeBtn = el('button', 'btn', (isDark ? '☀️ ' + t('profThemeLight') : '🌙 ' + t('profThemeDark')));
      themeBtn.type = 'button';
      themeBtn.style.width = '100%';
      themeBtn.style.marginBottom = '10px';
      themeBtn.addEventListener('click', () => {
        setTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
        renderProfileBody();
      });
      secSet.append(themeBtn);

      // Web Push Notification button
      const perm = 'Notification' in window ? Notification.permission : 'unsupported';
      const pushBtn = el(
        'button',
        'btn',
        '🔔 ' + (perm === 'granted' ? t('profPushGranted') : perm === 'denied' ? t('profPushDenied') : t('profPushEnable'))
      );
      pushBtn.type = 'button';
      pushBtn.style.width = '100%';
      pushBtn.style.marginBottom = '10px';
      pushBtn.addEventListener('click', async () => {
        if (!('Notification' in window)) return;
        let status = Notification.permission;
        if (status === 'default') {
          status = await Notification.requestPermission();
        }
        if (status === 'granted') {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && reg.showNotification) {
              await reg.showNotification('Oasis FOH · ' + session.displayName, {
                body: FOH.i18n.lang === 'ar' ? 'الإشعارات تعمل بنجاح على موبايلك!' : 'Push notifications are active on your phone!',
                icon: 'icons/icon-192.png',
              });
            } else {
              new Notification('Oasis FOH · ' + session.displayName);
            }
          }
          FOH.edit.toast(t('profPushSent'));
        }
        renderProfileBody();
      });
      secSet.append(pushBtn);

      // Clear Snoozed Alerts button if any alerts are snoozed today
      const snoozedCount = FOH.reminders && FOH.reminders.activeSnoozeCount
        ? FOH.reminders.activeSnoozeCount(S.date, FOH.time.nowHM())
        : 0;
      if (snoozedCount > 0) {
        const clrSnoozeBtn = el('button', 'btn', t('snoozeClearAll', { n: snoozedCount }));
        clrSnoozeBtn.type = 'button';
        clrSnoozeBtn.style.width = '100%';
        clrSnoozeBtn.style.marginBottom = '10px';
        clrSnoozeBtn.addEventListener('click', () => {
          FOH.reminders.clearSnoozesForDate(S.date);
          FOH.edit.toast(t('snoozeClearedToast'));
          FOH.app.render();
          renderProfileBody();
        });
        secSet.append(clrSnoozeBtn);
      }

      // Manager Preview Toggle (only for Supervisors/Captains)
      if (session.isManager) {
        const prevRow = el('label', 'tog');
        prevRow.append(el('span', '', t('profManagerPreview')));
        const prevCb = el('input', 'sw');
        prevCb.type = 'checkbox';
        prevCb.checked = getShowPreviewBar();
        prevCb.addEventListener('change', () => {
          setShowPreviewBar(prevCb.checked);
          applyAuthUI();
        });
        prevRow.append(prevCb);
        secSet.append(prevRow);
      }

      // Password update
      const passWrap = el('div', '');
      passWrap.style.marginTop = '10px';
      const passIn = el('input', 'in');
      passIn.type = 'password';
      passIn.placeholder = t('profNewPass');
      const passBtn = el('button', 'btn', t('profUpdatePass'));
      passBtn.type = 'button';
      passBtn.style.marginTop = '8px';
      passBtn.style.width = '100%';
      passBtn.addEventListener('click', async () => {
        const np = passIn.value.trim();
        if (np.length < 4) return;
        localStorage.setItem('foh-opening.pass.' + session.username, np);
        if (session.accessToken) {
          try {
            await fetch(`${SUPABASE_URL}/auth/v1/user`, {
              method: 'PUT',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ password: np }),
            });
          } catch {}
        }
        passIn.value = '';
        FOH.edit.toast(t('profPassChanged'));
      });
      passWrap.append(passIn, passBtn);
      secSet.append(passWrap);
      tabPane.append(secSet);

      // Logout button
      const outBtn = el('button', 'btn danger', '🚪 ' + t('profLogout'));
      outBtn.type = 'button';
      outBtn.style.width = '100%';
      outBtn.style.marginTop = '8px';
      outBtn.addEventListener('click', () => {
        $('profileSheet').close();
        saveSession(null);
        applyAuthUI();
      });
      tabPane.append(outBtn);
    }
  }

  FOH.profileDialog = {
    openProfile,
    renderProfileBody,
  };

  FOH.openProfile = openProfile;
})(window.FOH = window.FOH || {});
