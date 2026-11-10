// foh-opening/js/domains/auth/session-auth.js
// Authentication, Session Storage & Oasis Staff Directory Access
(function (FOH) {
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
    if (FOH.demoAuth && FOH.demoAuth.authenticateDemoAccount) {
      return FOH.demoAuth.authenticateDemoAccount({ ...opts, bindSessionToStaff, saveSession, TENANT_SLUG, TENANT_NAME });
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
        const demoMatch = DEMO_ACCOUNTS.find((d) => d.username === cleanUser.split('@')[0]);
        const nextSess = {
          username: cleanUser.split('@')[0],
          email,
          accessToken: token,
          tenantId,
          branchId,
          cloudConnected: true,
          firstName: (profile && profile.first_name) || (demoMatch && demoMatch.firstName) || cleanUser.split('@')[0],
          lastName: (profile && profile.last_name) || (demoMatch && demoMatch.lastName) || '',
          displayName: (profile && profile.display_name) || (demoMatch && demoMatch.displayName) || cleanUser.split('@')[0],
          roleName: (demoMatch && demoMatch.roleName) || 'Staff',
          roleAr: (demoMatch && demoMatch.roleAr) || 'موظف',
          isManager: !!(demoMatch && demoMatch.isManager),
          shift: (demoMatch && demoMatch.shift) || '12:00 – 02:00',
          locker: (demoMatch && demoMatch.locker) || '#Staff',
          uniform: (demoMatch && demoMatch.uniform) || 'Standard',
          healthCert: (demoMatch && demoMatch.healthCert) || 'Valid',
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

  function renderLoginScreen() {
    $('loginTitle').textContent = t('loginTitle');
    $('loginSubtitle').textContent = t('loginSubtitle');
    $('loginUserLbl').textContent = t('loginUserLbl');
    $('loginPassLbl').textContent = t('loginPassLbl');
    $('loginRememberLbl').textContent = t('loginRememberLbl');
    $('loginSubmitBtn').textContent = t('loginSubmit');
    $('loginDemoTitle').textContent = t('loginDemoTitle');
    $('loginLangBtn').textContent = FOH.i18n.lang === 'ar' ? 'EN' : 'ع';

    if (FOH.demoAuth) {
      if (FOH.demoAuth.wireInviteCodeForm) FOH.demoAuth.wireInviteCodeForm();
      if (FOH.demoAuth.renderLoginDemoGrid) {
        FOH.demoAuth.renderLoginDemoGrid(async (uname, p, rem) => {
          await authenticate(uname, p, rem);
          applyAuthUI();
          if (session && !session.isManager) S.view = 'mine';
          FOH.app.render();
        });
      }
    }
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