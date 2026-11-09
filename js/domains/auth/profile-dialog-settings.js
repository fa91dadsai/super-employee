// foh-opening/js/domains/auth/profile-dialog-settings.js
// Profile Dialog Settings & Identity Tab Component
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { el } = FOH.view;
  const t = (k) => (FOH.i18n && FOH.i18n.t ? FOH.i18n.t(k) : k);

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.loadSession() : null;
  }

  function loadPendingNameChanges() {
    try {
      return JSON.parse(localStorage.getItem('foh_pending_name_changes') || '[]');
    } catch {
      /* Storage quota fallback */
      return [];
    }
  }

  function savePendingNameChanges(list) {
    try {
      localStorage.setItem('foh_pending_name_changes', JSON.stringify(list || []));
    } catch {
      /* Storage quota fallback */
    }
  }

  function setTheme(mode) {
    if (FOH.state && FOH.state.setTheme) {
      FOH.state.setTheme(mode);
    }
  }

  function createActivationCodeBox(curCode, ar) {
    const codeBox = el('div', 'st-invite-box');
    codeBox.style.marginTop = '10px';
    const codeRow = el('div', '');
    codeRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;';
    codeRow.innerHTML = '<span>🔑 <b>' + (ar ? 'كود التفعيل الخاص بك:' : 'Your Activation Code:') + '</b></span>';
    const copyWrap = el('div', '');
    copyWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';
    const codePill = el('code', 'st-code-pill', curCode);
    const copyBtn = el('button', 'btn sm', ar ? '📋 نسخ' : '📋 Copy');
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(curCode);
        copyBtn.textContent = ar ? '✓ تم النسخ' : '✓ Copied';
        setTimeout(() => { copyBtn.textContent = ar ? '📋 نسخ' : '📋 Copy'; }, 2000);
      }
    });
    copyWrap.append(codePill, copyBtn);
    codeRow.append(copyWrap);
    codeBox.append(codeRow);
    return codeBox;
  }

  function renderIdentityForm(container, opts = {}) {
    const { session, staffRec, isMgr, ar } = opts;
    const secProf = el('section', 'prof-section');
    secProf.append(el('h4', '', '👤 ' + (ar ? 'البيانات الشخصية وهوية الموظف في النظام (ERP Profile)' : 'Personal Identity & ERP Profile')));

    const rowContact = el('div', 'two');
    const emailWrap = el('label', '', ar ? '📧 البريد الإلكتروني (Email)' : '📧 Email Address');
    const emailIn = el('input', 'in');
    emailIn.type = 'email';
    emailIn.value = session.email || staffRec.email || '';
    emailWrap.append(emailIn);

    const phoneWrap = el('label', '', ar ? '📱 رقم الهاتف والواتساب (Phone / WhatsApp)' : '📱 Phone / WhatsApp');
    const phoneIn = el('input', 'in');
    phoneIn.type = 'tel';
    phoneIn.value = session.phone || staffRec.phone || '';
    phoneWrap.append(phoneIn);
    rowContact.append(emailWrap, phoneWrap);

    const nickWrap = el('label', '');
    nickWrap.style.cssText = 'display:block;margin-top:10px;';
    nickWrap.innerHTML = '<b>🏷️ ' + (ar ? 'الاسم المستعار في الصالة (Floor Nickname):' : 'Floor Nickname:') + '</b>';
    const nickIn = el('input', 'in');
    nickIn.value = session.nickname || staffRec.nickname || '';
    nickWrap.append(nickIn);

    const syncPills = el('div', 'erp-sync-pill-row');
    syncPills.innerHTML =
      '<span class="erp-sync-pill">🏷️ Tip Manager</span>' +
      '<span class="erp-sync-pill">🗓️ OpsFlow Schedule</span>' +
      '<span class="erp-sync-pill">👥 HR Directory</span>';
    nickWrap.append(syncPills);

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

    const curCode = session.inviteCode || staffRec.inviteCode || 'CEEN-1001';
    const codeBox = createActivationCodeBox(curCode, ar);

    const saveProfBtn = el('button', 'btn primary', ar ? '💾 حفظ التعديلات وإرسال للاعتماد' : '💾 Save Profile & Submit');
    saveProfBtn.type = 'button';
    saveProfBtn.style.cssText = 'margin-top:12px;width:100%;';
    saveProfBtn.addEventListener('click', () => {
      handleProfileSave({
        newEmail: emailIn.value.trim(),
        newPhone: phoneIn.value.trim(),
        newFn: fnIn.value.trim() || session.firstName,
        newLn: lnIn.value.trim(),
        newNick: nickIn.value.trim(),
      }, { session, staffRec, isMgr, ar });
    });

    secProf.append(rowContact, nickWrap, rowNames, codeBox, saveProfBtn);
    container.append(secProf);
  }

  function renderPasswordChangeBox(session) {
    const passWrap = el('div', '');
    passWrap.style.marginTop = '10px';
    const passIn = el('input', 'in');
    passIn.type = 'password';
    passIn.placeholder = t('profNewPass');
    const passBtn = el('button', 'btn', t('profUpdatePass'));
    passBtn.type = 'button';
    passBtn.style.cssText = 'margin-top:8px;width:100%;';
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
        } catch (err) {
          /* Supabase password sync fallback */
        }
      }
      passIn.value = '';
      FOH.edit.toast(t('profPassChanged'));
    });
    passWrap.append(passIn, passBtn);
    return passWrap;
  }

  // ---- Sub-Renderer 5B: System Preferences & Security ----
  function renderSystemPreferences(container, opts = {}) {
    const { session } = opts;
    const secSet = el('section', 'prof-section');
    secSet.append(el('h4', '', '⚙️ ' + t('profSettingsHead')));

    const isDark = document.body.classList.contains('dark');
    const themeBtn = el('button', 'btn', (isDark ? '☀️ ' + t('profThemeLight') : '🌙 ' + t('profThemeDark')));
    themeBtn.type = 'button';
    themeBtn.style.cssText = 'width:100%;margin-bottom:10px;';
    themeBtn.addEventListener('click', () => {
      setTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
      renderProfileBody();
    });
    secSet.append(themeBtn);

    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const pushBtn = el('button', 'btn', '🔔 ' + (perm === 'granted' ? t('profPushGranted') : perm === 'denied' ? t('profPushDenied') : t('profPushEnable')));
    pushBtn.type = 'button';
    pushBtn.style.cssText = 'width:100%;margin-bottom:10px;';
    pushBtn.addEventListener('click', async () => {
      if (!('Notification' in window)) return;
      let status = Notification.permission;
      if (status === 'default') status = await Notification.requestPermission();
      if (status === 'granted') {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            await reg.showNotification('Oasis FOH · ' + session.displayName, {
              body: FOH.i18n.lang === 'ar' ? 'الإشعارات تعمل بنجاح!' : 'Push notifications active!',
              icon: 'icons/icon-192.png',
            });
          }
        }
        FOH.edit.toast(t('profPushSent'));
      }
      renderProfileBody();
    });
    secSet.append(pushBtn);

    if (FOH.pwa && FOH.pwa.renderInstallSection) {
      FOH.pwa.renderInstallSection(secSet);
    }

    secSet.append(renderPasswordChangeBox(session));

    const outBtn = el('button', 'btn danger', '🚪 ' + t('profLogout'));
    outBtn.type = 'button';
    outBtn.style.cssText = 'width:100%;margin-top:8px;';
    outBtn.addEventListener('click', () => {
      $('profileSheet').close();
      saveSession(null, { remember: false });
      applyAuthUI();
    });
    secSet.append(outBtn);
    container.append(secSet);
  }

  // ---- Sub-Renderer 5: Tab 3 Coordinator ----
  function renderSettingsTab(container, opts = {}) {
    const { session, staffRec, isMgr, ar } = opts;
    if (staffRec.pendingNameChange && staffRec.pendingNameChange.status === 'pending') {
      const pnc = staffRec.pendingNameChange;
      const banner = el('div', 'pending-approval-banner');
      banner.innerHTML =
        '<div class="pab-head">⏳ ' + (ar ? 'طلب تعديل الاسم قيد المراجعة' : 'Pending Manager Approval') + '</div>' +
        '<div class="pab-body">' +
        '<b>' + (ar ? 'الاسم المطلوب:' : 'Legal Name:') + '</b> ' + (FOH.escapeHtml(pnc.reqFullName || '—')) + '<br>' +
        '<b>' + (ar ? 'اللقب:' : 'Nickname:') + '</b> 🏷️ ' + (FOH.escapeHtml(pnc.reqNickname || '—')) +
        '</div>';
      container.append(banner);
    }
    renderIdentityForm(container, { session, staffRec, isMgr, ar });
    renderSystemPreferences(container, { session, isMgr, ar });
  }

  // ---- Main Profile Sheet Coordinator ----

  FOH.profileDialogSettings = {
    renderSettingsTab,
    renderIdentityForm,
    renderSystemPreferences,
    renderPasswordChangeBox
  };
})(window.FOH = window.FOH || {});
