// foh-opening/js/domains/auth/session-auth.js
// Authentication, Session Storage & Oasis Staff Directory Access
(function (FOH) {
  'use strict';

  'use strict';

  const SUPABASE_URL = 'https://jncnbwwhjmouxptqfjaz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_82pr7lscQZiCiyxUT_TTEA_J9IhKuz1';
  const TENANT_SLUG = 'odyssey';
  const TENANT_NAME = 'Oasis';
  const SESSION_KEY = 'foh-opening.erpSession.v1';
  const THEME_KEY = 'foh-opening.theme';
  const SIGNOFF_KEY = 'foh-opening.signoffs.v1';
  const BATCH_KEY = 'foh-opening.batches.v1';
  const PENDING_CHANGES_KEY = 'super-employee.pendingNameChanges.v1';

  
  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el, btn } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);

  const DEMO_ACCOUNTS = FOH.authAccountsData || [];
  let showPreviewBar = false;
  let session = null;

  function cleanRoleParens(str) {
    return typeof str === 'string' ? str.replace(/\s*\([^)]*\)/g, '').trim() : str;
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s) {
        if (s.user) s.user = cleanRoleParens(s.user);
        if (s.displayName) s.displayName = cleanRoleParens(s.displayName);
        if (s.displayNameAr) s.displayNameAr = cleanRoleParens(s.displayNameAr);
      }
      return s;
    } catch (err) {
      /* Session load storage fallback */
      return null;
    }
  }

  session = loadSession();

  function saveSession(next, opts = {}) {
    session = next;
    const remember = typeof opts === 'boolean' ? opts : (opts && typeof opts.remember === 'boolean' ? opts.remember : true);
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      if (next) {
        (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(next));
      }
    } catch (err) { /* Session parse/storage fallback */ }
  }

  function loadTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch (err) {
      /* Theme load storage fallback */
      return 'light';
    }
  }

  function setTheme(mode) {
    const dark = mode === 'dark';
    document.body.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch (err) { /* Session parse/storage fallback */ }
    if ($('loginThemeBtn')) $('loginThemeBtn').textContent = dark ? '☀️' : '🌙';
  }

  // Ensure the logged-in user exists in S.tpl.staff & S.tpl.roles so tasks and blind counts link seamlessly
  function bindSessionToStaff(sess) {
    if (!sess) return;
    let roleObj = S.tpl.roles.find((r) => r.name.toLowerCase() === (sess.roleName || '').toLowerCase());
    if (!roleObj) {
      roleObj = S.tpl.roles[0] || { id: FOH.store.uid(), name: sess.roleName || 'Waiter' };
      if (!S.tpl.roles.length) S.tpl.roles.push(roleObj);
    }
    let person = S.tpl.staff.find(
      (p) => p.id === sess.staffId || (sess.inviteCode && p.inviteCode === sess.inviteCode) || p.name.toLowerCase() === (sess.displayName || '').toLowerCase() || p.name.toLowerCase() === (sess.firstName || '').toLowerCase()
    );
    if (!person) {
      person = {
        id: sess.staffId || 'staff_' + sess.username,
        name: sess.displayName || sess.firstName || sess.username,
        nickname: sess.nickname || sess.firstName || sess.username,
        email: sess.email || '',
        phone: sess.phone || '',
        inviteCode: sess.inviteCode || ('CEEN-' + Math.floor(1000 + Math.random() * 9000)),
        role: roleObj.id,
        inv: true,
        active: true,
      };
      S.tpl.staff.push(person);
      FOH.store.saveTemplate(S.tpl);
    } else {
      if (sess.nickname && !person.nickname) person.nickname = sess.nickname;
      if (sess.phone && !person.phone) person.phone = sess.phone;
      if (sess.email && !person.email) person.email = sess.email;
      if (sess.inviteCode && !person.inviteCode) person.inviteCode = sess.inviteCode;
      sess.nickname = person.nickname || sess.nickname || '';
      sess.phone = person.phone || sess.phone || '';
      sess.email = person.email || sess.email || '';
      sess.inviteCode = person.inviteCode || sess.inviteCode || '';
      person.name = sess.displayName || person.name;
    }
    sess.staffId = person.id;
    sess.roleId = person.role || roleObj.id;
    S.me = { staffId: person.id, role: sess.roleId, name: person.name };
    FOH.store.saveMe(S.me);

    // Auto-fill Supervisor / Captain from Oasis schedule if blank today
    if (!S.run.supervisor) S.run.supervisor = 'Fadi Al-Masri';
    if (!S.run.captain) S.run.captain = 'Ali Hassan';
    if (!S.run.assistant) S.run.assistant = 'Sara Khoury';
    FOH.store.saveRun(S.date, S.run);
  }

  function authenticateDemoAccount(opts) {
    const { cleanUser, pass, remember } = opts;
    const demo = DEMO_ACCOUNTS.find((d) => d.username === cleanUser);
    const savedPassKey = 'foh-opening.pass.' + cleanUser;
    const customPass = localStorage.getItem(savedPassKey);
    if (!cleanUser.includes('@') && demo && (pass === (customPass || demo.pass) || pass === '1234')) {
      const savedProf = FOH.safeJsonParse(localStorage.getItem('foh-opening.prof.' + cleanUser), '{}');
      const nextSess = {
        username: demo.username,
        email: demo.email || (cleanUser + '@ceenlounge.com'),
        accessToken: null,
        cloudConnected: false,
        firstName: savedProf.firstName || demo.firstName,
        lastName: savedProf.lastName || demo.lastName,
        displayName: savedProf.displayName || (FOH.i18n.lang === 'ar' ? demo.displayNameAr : demo.displayName),
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
      bindSessionToStaff(nextSess);
      saveSession(nextSess, remember);
      return nextSess;
    }
    return null;
  }

  async function fetchCloudProfileAndMemberships(token) {
    let profile = null;
    let tenantId = null;
    let branchId = null;
    try {
      const [profRes, memRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/functions/v1/api/v1/me/profile`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
        }),
        fetch(`${SUPABASE_URL}/functions/v1/api/v1/me/memberships`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
        }),
      ]);
      if (profRes.ok) {
        const pj = await profRes.json();
        profile = pj.data || pj;
      }
      if (memRes.ok) {
        const mj = await memRes.json();
        const list = (mj.data && mj.data.memberships) || mj.memberships || [];
        const oasis = list.find((m) => m.tenant_slug === TENANT_SLUG) || list[0];
        if (oasis) {
          tenantId = oasis.tenant_id;
          branchId = (oasis.branches && oasis.branches[0] && oasis.branches[0].id) || oasis.branch_id || null;
        }
      }
    } catch (err) { /* Session parse/storage fallback */ }
    return { profile, tenantId, branchId };
  }

  async function authenticateSupabase(opts) {
    const { cleanUser, pass, remember } = opts;
    const email = cleanUser.includes('@') ? cleanUser : `${cleanUser}@oasis.erp.local`;
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: pass }),
      });
      if (res.ok) {
        const authData = await res.json();
        const token = authData.access_token;
        const { profile, tenantId, branchId } = await fetchCloudProfileAndMemberships(token);
        const demoMatch = DEMO_ACCOUNTS.find((d) => d.username === cleanUser.split('@')[0]) || DEMO_ACCOUNTS[0];
        const nextSess = {
          username: cleanUser.split('@')[0],
          email,
          accessToken: token,
          tenantId,
          branchId,
          cloudConnected: true,
          firstName: (profile && profile.first_name) || demoMatch.firstName,
          lastName: (profile && profile.last_name) || demoMatch.lastName,
          displayName: (profile && profile.display_name) || demoMatch.displayName,
          roleName: demoMatch.roleName,
          roleAr: demoMatch.roleAr,
          isManager: demoMatch.isManager,
          shift: demoMatch.shift,
          locker: demoMatch.locker,
          uniform: demoMatch.uniform,
          healthCert: demoMatch.healthCert,
          tenantSlug: TENANT_SLUG,
          tenantName: TENANT_NAME,
        };
        bindSessionToStaff(nextSess);
        saveSession(nextSess, remember);
        return nextSess;
      }
    } catch {
      /* Fallback to local Oasis verification when offline */
    }
    return null;
  }

  // Authenticate against Supabase Auth (https://jncnbwwhjmouxptqfjaz.supabase.co) or local Oasis staff account
  async function authenticate(usernameInput, passwordInput, remember) {
    const cleanUser = String(usernameInput || '').trim().toLowerCase();
    const pass = String(passwordInput || '');
    if (!cleanUser || !pass) throw new Error(t('loginInvalid'));

    const demoSess = authenticateDemoAccount({ cleanUser, pass, remember });
    if (demoSess) return demoSess;

    const cloudSess = await authenticateSupabase({ cleanUser, pass, remember });
    if (cloudSess) return cloudSess;

    throw new Error(t('loginInvalid'));
  }

  function applyAuthUI() {
    const loggedIn = !!session;
    $('loginScreen').hidden = loggedIn;
    document.body.classList.toggle('login-open', !loggedIn);
    document.body.classList.toggle('auth-locked', loggedIn && (!session.isManager || !showPreviewBar));
    document.body.classList.toggle('auth-staff', loggedIn && !session.isManager);

    if (!loggedIn) {
      if (FOH.bottomBar && FOH.bottomBar.syncBottomBar) {
        FOH.bottomBar.syncBottomBar();
      }
      renderLoginScreen();
      return;
    }

    bindSessionToStaff(session);
    const initials = ((session.firstName || session.displayName || 'U')[0] + ((session.lastName || '')[0] || '')).toUpperCase();
    $('headerAvatar').textContent = initials;
    $('headerUserName').textContent = session.displayName || session.firstName;
  }

  function handleInviteCodeActivation() {
    const rawCode = ($('inviteCodeIn') ? $('inviteCodeIn').value : '').trim().toUpperCase();
    if (!rawCode) {
      alert(isAr() ? 'يرجى إدخال كود التفعيل الممنوح لك من الإدارة' : 'Please enter your invite code');
      return;
    }
    if (typeof FOH.ensureStaffHealthAndPerms === 'function') FOH.ensureStaffHealthAndPerms();
    const match = (S.tpl.staff || []).find((p) => (p.inviteCode || '').toUpperCase() === rawCode);
    const demoMatch = DEMO_ACCOUNTS.find((d) => (d.inviteCode || '').toUpperCase() === rawCode);
    if (!match && !demoMatch) {
      alert(isAr() ? 'كود التفعيل غير صحيح أو غير مسجل في النظام. يرجى مراجعة إدارة المطعم.' : 'Invalid invite code. Please check with restaurant management.');
      return;
    }
    const username = demoMatch ? demoMatch.username : ((match && match.name) ? match.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'staff');
    const roleName = match ? (match.role ? (FOH.taskSheet.roleName ? FOH.taskSheet.roleName(match.role) : match.role) : 'Waiter') : (demoMatch ? demoMatch.roleName : 'Waiter');
    const isMgr = /supervisor|manager/i.test(roleName);
    const isCapt = /captain/i.test(roleName);
    const nextSess = {
      username,
      email: (match && match.email) || (demoMatch && demoMatch.email) || '',
      phone: (match && match.phone) || (demoMatch && demoMatch.phone) || '',
      nickname: (match && match.nickname) || (demoMatch && demoMatch.nickname) || '',
      inviteCode: rawCode,
      accessToken: null,
      cloudConnected: false,
      firstName: (match && match.name ? match.name.split(' ')[0] : (demoMatch && demoMatch.firstName)) || 'Employee',
      lastName: (match && match.name ? match.name.split(' ').slice(1).join(' ') : (demoMatch && demoMatch.lastName)) || '',
      displayName: (match && match.name) || (demoMatch && demoMatch.displayName) || 'Employee',
      roleName: demoMatch ? demoMatch.roleName : (isMgr ? '👑 Super Manager' : isCapt ? '🎖️ Super Captain' : '⭐ Super Waiter'),
      roleAr: demoMatch ? demoMatch.roleAr : (isMgr ? '👑 سوبر مانجر' : isCapt ? '🎖️ سوبر كابتن' : '⭐ سوبر ويتر'),
      isManager: isMgr,
      isCaptain: isCapt,
      shift: (demoMatch && demoMatch.shift) || '12:00 – 02:00',
      locker: (demoMatch && demoMatch.locker) || '#Staff',
      uniform: (demoMatch && demoMatch.uniform) || 'Standard',
      healthCert: (match && match.healthCertExpiry) || 'Valid',
      tenantSlug: TENANT_SLUG,
      tenantName: TENANT_NAME,
    };
    bindSessionToStaff(nextSess);
    saveSession(nextSess, true);
    applyAuthUI();
    if (!nextSess.isManager) S.view = 'mine';
    FOH.app.render();
    setTimeout(() => {
      openProfile();
      FOH.edit.toast(isAr() ? '🎉 مرحباً بك في CEEN! يرجى إكمال رقم هاتفك والبريد والـ Nickname المفضل' : 'Welcome to CEEN! Please complete your profile.');
    }, 300);
  }

  function wireInviteCodeForm() {
    const codeBtn = $('loginWithCodeBtn');
    if (codeBtn && !codeBtn.dataset.wired) {
      codeBtn.dataset.wired = '1';
      codeBtn.addEventListener('click', () => {
        const box = $('inviteCodeBox');
        if (box) {
          box.hidden = !box.hidden;
          if (!box.hidden && $('inviteCodeIn')) $('inviteCodeIn').focus();
        }
      });
    }
    const cancelCodeBtn = $('cancelInviteCodeBtn');
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

  function renderLoginDemoGrid() {
    const grid = $('loginDemoGrid');
    if (!grid) return;
    grid.replaceChildren();
    DEMO_ACCOUNTS.forEach((acc) => {
      const b = el('button', 'login-demo-btn');
      b.type = 'button';
      const name = FOH.i18n.lang === 'ar' ? acc.displayNameAr : acc.displayName;
      const role = FOH.i18n.lang === 'ar' ? acc.roleAr : acc.roleName;
      b.append(el('b', '', '👤 ' + name), el('small', '', role + ' · ' + acc.username + ' / 1234' + (acc.inviteCode ? ' · 🔑 ' + acc.inviteCode : '')));
      b.addEventListener('click', async () => {
        $('loginUser').value = acc.username;
        $('loginPass').value = '1234';
        $('loginError').hidden = true;
        await authenticate(acc.username, '1234', $('loginRemember').checked);
        applyAuthUI();
        if (!session.isManager) S.view = 'mine';
        FOH.app.render();
      });
      grid.append(b);
    });
  }

  function renderLoginScreen() {
    $('loginTitle').textContent = t('loginTitle');
    $('loginSubtitle').textContent = t('loginSubtitle');
    $('loginUserLbl').textContent = t('loginUserLbl');
    $('loginPassLbl').textContent = t('loginPassLbl');
    $('loginRememberLbl').textContent = t('loginRememberLbl');
    $('loginSubmitBtn').textContent = t('loginSubmit');
    $('loginDemoTitle').textContent = t('loginDemoTitle');
    $('loginLangBtn').textContent = FOH.i18n.lang === 'ar' ? 'EN' : 'ع';

    wireInviteCodeForm();
    renderLoginDemoGrid();
  }



  FOH.sessionAuth = {
    loadSession,
    saveSession,
    loadTheme,
    setTheme,
    bindSessionToStaff,
    authenticate,
    applyAuthUI,
    renderLoginScreen,
    DEMO_ACCOUNTS,
    getSession: () => session,
    showPreviewBar: () => showPreviewBar,
    getShowPreviewBar: () => showPreviewBar,
    setShowPreviewBar: (v) => { showPreviewBar = !!v; },
  };

  FOH.loadSession = loadSession;
  FOH.saveSession = saveSession;
  FOH.setTheme = setTheme;
  FOH.applyAuthUI = applyAuthUI;

  try {
    Object.defineProperty(window, 'session', {
      get() {
        return session || loadSession();
      },
      set(val) {
        session = val;
        if (val) saveSession(val);
      },
      configurable: true,
    });
  } catch (err) { /* Session parse/storage fallback */ }
})(window.FOH = window.FOH || {});