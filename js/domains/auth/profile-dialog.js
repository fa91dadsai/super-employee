// foh-opening/js/domains/auth/profile-dialog.js
// Employee Profile Sheet Dialog (PROF-01, Contact Info, Floor Nickname, Health Cert Lock)
(function (FOH) {
  'use strict';

  const SUPABASE_URL = 'https://jncnbwwhjmouxptqfjaz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_82pr7lscQZiCiyxUT_TTEA_J9IhKuz1';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

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

  function buildDayOffSection(isCard = false) {
    return FOH.dayOff ? FOH.dayOff.buildDayOffSection(isCard) : el('div', '');
  }

  // ---- Employee Profile Sheet (#profileSheet) ----
  function openProfile() {
    const session = getSession();
    if (!session) return;
    renderProfileBody();
    $('profileSheet').showModal();
  }

  function renderProfileBody() {
    const body = $('profSheetBody');
    body.replaceChildren();
    $('profSheetTitle').textContent = t('profTitle');
    const ar = isAr();
    if (typeof FOH.ensureStaffHealthAndPerms === 'function') FOH.ensureStaffHealthAndPerms();
    const isMgr = !!(session && session.isManager);

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

    const initials = ((session.firstName || session.displayName || 'U')[0] + ((session.lastName || '')[0] || '')).toUpperCase();
    const hero = el('div', 'prof-hero');
    const av = el('div', 'prof-avatar-lg', initials);
    const info = el('div', 'prof-hero-info');
    const curDisp = (session.firstName ? (session.firstName + ' ' + (session.lastName || '')).trim() : session.displayName) || 'Employee';
    const nickBadge = session.nickname || staffRec.nickname ? ` (${session.nickname || staffRec.nickname})` : '';
    info.append(el('h3', '', curDisp + nickBadge));
    const badges = el('div', 'prof-badges');
    const roleLabel = FOH.i18n.lang === 'ar' ? session.roleAr || session.roleName : session.roleName;
    badges.append(
      el('span', 'prof-badge', '🪪 ' + roleLabel),
      el('span', 'prof-badge', '🌿 ' + t('profBranch')),
      el('span', 'prof-badge cloud', '⚡ ' + (session.cloudConnected ? t('profCloudConnected') : t('profLocalSession')))
    );
    info.append(badges);
    hero.append(av, info);
    body.append(hero);

    // Personal Stats Row
    const myDoneOpening = FOH.tasksView.myOpeningItems().filter((it) => S.run.checked[it.id]).length;
    const myDoneSched = FOH.tasksView.todayStates().filter((st) => FOH.tasksView.isMine(st.task) && st.status === 'done').length;
    const myCountsTotal = FOH.invCount.myCounts().length;
    const myBreakage = S.inv.breakage.filter((b) => (b.by || '').toLowerCase() === (session.displayName || '').toLowerCase()).length;

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
    body.append(stats);

    // Pending Approval Banner if staff member submitted a name/nickname change
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
      body.append(banner);
    }

    // Section 1: PROF-01 User Profile Form
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

    // Row 4: Invite Code (Display Only)
    const curCode = session.inviteCode || staffRec.inviteCode || 'CEEN-1001';
    const codeBox = el('div', 'st-invite-box');
    codeBox.style.marginTop = '10px';
    codeBox.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<span>🔑 <b>' + (ar ? 'كود التفعيل الخاص بك (Activation Code):' : 'Your Activation Code:') + '</b></span>' +
      '<code class="st-code-pill">' + curCode + '</code>' +
      '</div>' +
      '<small style="display:block;margin-top:4px;color:var(--muted);">' +
      (ar ? '💡 يمكنك استخدام هذا الكود لتسجيل الدخول السريع إلى النظام من أي جهاز.' : '💡 Use this code to sign in instantly from any device.') +
      '</small>';

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

      // Save contact details immediately
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
        // Super Manager has direct authorization to update names immediately
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
        // Non-manager employee (Waiter, Bartender, Captain):
        // Name & Nickname changes require Manager Approval to prevent unauthorized alterations!
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
    body.append(secProf);

    // Section 2: OpsFlow Schedule (Shift, Locker, Uniform, Health Certificate) + Day-Off Request
    const secSched = el('section', 'prof-section');
    secSched.append(el('h4', '', '🗓 ' + t('profScheduleHead')));
    const kv = el('div', 'prof-kv');
    [
      [t('profShiftToday'), session.shift || '09:00 – 17:30'],
      [t('profLocker'), session.locker || '#B-04'],
      [t('profUniform'), session.uniform || 'M · Complete'],
      [t('profHealthCert'), session.healthCert || 'Valid ✓'],
    ].forEach(([k, v]) => {
      const cell = el('div', '');
      cell.append(el('small', '', k), el('b', '', v));
      kv.append(cell);
    });
    secSched.append(kv);
    body.append(secSched);

    // Section 2B: Employee Day-Off & Schedule Availability Request (`foh_day_off_requests` -> `dr_availability_exceptions`)
    body.append(buildDayOffSection(true));

    // Section 3: App Settings, Dark Mode, Web Push & Password
    const secSet = el('section', 'prof-section');
    secSet.append(el('h4', '', '⚙️ ' + t('profSettingsHead')));

    // Theme toggle
    const isDark = document.body.classList.contains('dark');
    const themeBtn = el('button', 'btn', isDark ? t('profThemeLight') : t('profThemeDark'));
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
      perm === 'granted' ? t('profPushGranted') : perm === 'denied' ? t('profPushDenied') : t('profPushEnable')
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
    body.append(secSet);

    // Logout button
    const outBtn = el('button', 'btn danger', '🚪 ' + t('profLogout'));
    outBtn.type = 'button';
    outBtn.style.width = '100%';
    outBtn.addEventListener('click', () => {
      $('profileSheet').close();
      saveSession(null);
      applyAuthUI();
    });
    body.append(outBtn);
  }



  FOH.profileDialog = {
    openProfile,
    renderProfileBody,
  };

  FOH.openProfile = openProfile;
})(window.FOH = window.FOH || {});
