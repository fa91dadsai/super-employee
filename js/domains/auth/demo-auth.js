// foh-opening/js/domains/auth/demo-auth.js
// Demo accounts, guest invite codes, and quick demo login grid (< 350 lines)

(function () {
  'use strict';

  window.FOH = window.FOH || {};

  const { el } = FOH.view || { el: (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; } };
  const $ = (id) => document.getElementById(id);

  const DEMO_ACCOUNTS = [
    {
      username: 'fadi',
      displayName: 'Fadi Al-Masri',
      displayNameAr: 'فادي المصري',
      firstName: 'Fadi',
      lastName: 'Al-Masri',
      roleName: 'General Manager',
      roleAr: 'المدير العام',
      isManager: true,
      shift: '12:00 – 02:30',
      locker: '#01 (Executive)',
      uniform: 'Blazer & Tie (Managerial)',
      healthCert: 'Valid until 15/12/2026',
      inviteCode: 'OASIS-MGR-2026',
    },
    {
      username: 'ali',
      displayName: 'Ali Hassan',
      displayNameAr: 'علي حسن',
      firstName: 'Ali',
      lastName: 'Hassan',
      roleName: 'Head Bartender & Supervisor',
      roleAr: 'كبير البارتندرية والمشرف',
      isManager: true,
      shift: '14:00 – 02:00',
      locker: '#07 (Bar Supervisor)',
      uniform: 'Black Apron & Vest',
      healthCert: 'Valid until 10/08/2026',
      inviteCode: 'OASIS-BAR-2026',
    },
    {
      username: 'sara',
      displayName: 'Sara Khoury',
      displayNameAr: 'سارة خوري',
      firstName: 'Sara',
      lastName: 'Khoury',
      roleName: 'Floor Captain / Waitress',
      roleAr: 'كابتن الصالة والضيافة',
      isManager: false,
      shift: '12:30 – 23:30',
      locker: '#12 (Floor Staff)',
      uniform: 'White Shirt & Bistro Apron',
      healthCert: 'Renewal due in 14 days',
      inviteCode: 'OASIS-FOH-2026',
    },
    {
      username: 'maher',
      displayName: 'Maher Zaid',
      displayNameAr: 'ماهر زيد',
      firstName: 'Maher',
      lastName: 'Zaid',
      roleName: 'Floor Supervisor & Cashier',
      roleAr: 'مشرف الصالة وأمين الصندوق',
      isManager: false,
      shift: '15:00 – 02:30',
      locker: '#04 (Cashier/Lead)',
      uniform: 'Classic Bistro Uniform',
      healthCert: 'Valid until 22/11/2026',
      inviteCode: 'OASIS-CAP-2026',
    },
  ];

  function authenticateDemoAccount(opts) {
    const { cleanUser, pass, remember, bindSessionToStaff, saveSession, TENANT_SLUG, TENANT_NAME } = opts;
    const demo = DEMO_ACCOUNTS.find((d) => d.username === cleanUser);
    if (!demo) return null;

    const savedPassKey = 'foh-opening.pass.' + cleanUser;
    const customPass = localStorage.getItem(savedPassKey);
    const validPass = customPass || demo.pass || (customPass ? null : '1234');
    if (!validPass) return null;

    if (!cleanUser.includes('@') && pass === validPass) {
      const savedProf = FOH.safeJsonParse ? FOH.safeJsonParse(localStorage.getItem('foh-opening.prof.' + cleanUser), '{}') : {};
      const nextSess = {
        username: demo.username,
        email: demo.email || (cleanUser + '@ceenlounge.com'),
        accessToken: null,
        cloudConnected: false,
        firstName: savedProf.firstName || demo.firstName,
        lastName: savedProf.lastName || demo.lastName,
        displayName: savedProf.displayName || (FOH.i18n && FOH.i18n.lang === 'ar' ? demo.displayNameAr : demo.displayName),
        roleName: demo.roleName,
        roleAr: demo.roleAr,
        isManager: demo.isManager,
        shift: demo.shift,
        locker: demo.locker,
        uniform: demo.uniform,
        healthCert: demo.healthCert,
        tenantSlug: TENANT_SLUG,
        tenantName: TENANT_NAME,
      };
      if (typeof bindSessionToStaff === 'function') bindSessionToStaff(nextSess);
      if (typeof saveSession === 'function') saveSession(nextSess, remember);
      return nextSess;
    }
    return null;
  }

  function handleInviteCodeActivation() {
    const codeIn = $('inviteCodeInput');
    const errEl = $('inviteCodeError');
    if (!codeIn) return;
    const val = codeIn.value.trim().toUpperCase();
    if (errEl) errEl.hidden = true;
    if (!val) {
      if (errEl) {
        errEl.textContent = FOH.i18n && FOH.i18n.lang === 'ar' ? 'الرجاء إدخال رمز الدعوة' : 'Please enter an invite code';
        errEl.hidden = false;
      }
      return;
    }

    const matched = DEMO_ACCOUNTS.find((acc) => acc.inviteCode && acc.inviteCode.toUpperCase() === val);
    if (matched) {
      $('loginUser').value = matched.username;
      $('loginPass').value = '1234';
      if ($('inviteCodeBox')) $('inviteCodeBox').hidden = true;
      if ($('loginSubmitBtn')) $('loginSubmitBtn').click();
    } else {
      if (errEl) {
        errEl.textContent = FOH.i18n && FOH.i18n.lang === 'ar' ? 'رمز دعوة غير صالح أو منتهي الصلاحية' : 'Invalid or expired invite code';
        errEl.hidden = false;
      }
    }
  }

  function wireInviteCodeForm() {
    const togBtn = $('toggleInviteBtn');
    if (togBtn && !togBtn.dataset.wired) {
      togBtn.dataset.wired = '1';
      togBtn.addEventListener('click', () => {
        const box = $('inviteCodeBox');
        if (box) box.hidden = !box.hidden;
        if (box && !box.hidden && $('inviteCodeInput')) $('inviteCodeInput').focus();
      });
    }
    const cancelCodeBtn = $('inviteCancelBtn');
    if (cancelCodeBtn && !cancelCodeBtn.dataset.wired) {
      cancelCodeBtn.dataset.wired = '1';
      cancelCodeBtn.addEventListener('click', () => {
        if ($('inviteCodeBox')) $('inviteCodeBox').hidden = true;
      });
    }
    const subCodeBtn = $('inviteSubmitBtn');
    if (subCodeBtn && !subCodeBtn.dataset.wired) {
      subCodeBtn.dataset.wired = '1';
      subCodeBtn.addEventListener('click', () => handleInviteCodeActivation());
    }
  }

  function renderLoginDemoGrid(authenticateCallback) {
    const grid = $('loginDemoGrid');
    if (!grid) return;
    grid.replaceChildren();
    DEMO_ACCOUNTS.forEach((acc) => {
      const b = el('button', 'login-demo-btn');
      b.type = 'button';
      const name = FOH.i18n && FOH.i18n.lang === 'ar' ? acc.displayNameAr : acc.displayName;
      const role = FOH.i18n && FOH.i18n.lang === 'ar' ? acc.roleAr : acc.roleName;
      b.append(el('b', '', '👤 ' + name), el('small', '', role + ' · ' + acc.username + ' / 1234' + (acc.inviteCode ? ' · 🔑 ' + acc.inviteCode : '')));
      b.addEventListener('click', async () => {
        $('loginUser').value = acc.username;
        $('loginPass').value = '1234';
        $('loginError').hidden = true;
        if (typeof authenticateCallback === 'function') {
          await authenticateCallback(acc.username, '1234', $('loginRemember').checked);
        }
      });
      grid.append(b);
    });
  }

  FOH.demoAuth = {
    DEMO_ACCOUNTS,
    authenticateDemoAccount,
    handleInviteCodeActivation,
    wireInviteCodeForm,
    renderLoginDemoGrid,
  };
})();

