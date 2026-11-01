// ERP PWA Module:
// 1. Multi-user Login (Username + Password) connected to ERP Supabase (jncnbwwhjmouxptqfjaz) + Oasis Demo Staff
// 2. Employee Profile Sheet (PROF-01 user_profiles + OpsFlow Schedule uniform/locker/cert + personal FOH stats + Web Push + Theme)
// 3. Batch Tally Calculator inside Blind Inventory Count (#countSheet)
// 4. Supervisor Sign-off Gate with mandatory override reason for incomplete items
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

  function loadPendingNameChanges() {
    try {
      const list = JSON.parse(localStorage.getItem(PENDING_CHANGES_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  function savePendingNameChanges(list) {
    try {
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(list));
    } catch {}
  }
  FOH.loadPendingNameChanges = loadPendingNameChanges;
  FOH.savePendingNameChanges = savePendingNameChanges;

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el, btn } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);

  FOH.i18n.extend({
    en: {
      loginTitle: 'Opening Sheet FOH',
      loginSubtitle: 'Sign in with your employee username & password',
      loginUserLbl: 'Username',
      loginPassLbl: 'Password',
      loginRememberLbl: 'Keep me signed in on this phone',
      loginSubmit: 'Sign In',
      loginDemoTitle: 'Quick Staff Login (Oasis Branch)',
      loginInvalid: 'Invalid username or password. Try a demo staff account below or your ERP credentials.',
      profTitle: 'Employee Profile',
      profBranch: 'Oasis Branch',
      profCloudConnected: 'Supabase ERP Connected',
      profLocalSession: 'Oasis Staff Session',
      profTasksDone: 'Tasks Done Today',
      profAssignedCounts: 'My Counts',
      profReportedBreak: 'My Breakage Reports',
      profIdentityHead: 'Personal Info (ERP Profile · PROF-01)',
      profFirstName: 'First Name',
      profLastName: 'Last Name',
      profDisplayName: 'Display Name (shown on ticks & counts)',
      profSaveProfile: 'Save Profile',
      profSavedMsg: 'Profile updated ✓',
      profScheduleHead: 'Shift, Locker & Uniform (OpsFlow Schedule)',
      profShiftToday: 'Today’s Shift',
      profLocker: 'Locker #',
      profUniform: 'Uniform Issued',
      profHealthCert: 'Health Certificate',
      profSettingsHead: 'App Settings, Notifications & Security',
      profThemeLbl: 'Appearance (Light / Dark Noir)',
      profThemeLight: '☀️ Light (Alabaster)',
      profThemeDark: '🌙 Dark (Obsidian Noir)',
      profPushLbl: 'Mobile Push Notifications',
      profPushEnable: '🔔 Enable & Test Notification',
      profPushGranted: 'Active ✓ (Tap to send test alert)',
      profPushDenied: 'Blocked in browser settings',
      profPushSent: 'Test notification sent to your phone 🔔',
      profPassHead: 'Change Password',
      profNewPass: 'New Password (min 6 chars)',
      profUpdatePass: 'Update Password',
      profPassChanged: 'Password updated ✓',
      profManagerPreview: 'Show Manager Preview Bar',
      profLogout: 'Sign Out of This Phone',
      batchTitle: '🧮 Quick Batch Tally (Sum across shelves)',
      batchEmpty: 'Tap +6, +12, +24 or custom to sum batches automatically',
      batchCustom: '+ Custom',
      batchPrompt: 'Enter batch quantity to add:',
      batchUndo: '⌫ Undo last',
      batchClear: 'Clear batches',
      signoffReadyTitle: 'Supervisor Opening Sign-off',
      signoffClosingTitle: 'Supervisor Closing Sign-off',
      signoffReadySub: 'Verify station readiness and lock today’s shift run.',
      signoffSignedBy: '✓ Signed off by {by} at {at}',
      signoffOverrideNote: 'Override reason: {reason}',
      signoffBtn: '✓ Sign Off Opening Shift',
      signoffClosingBtn: '✓ Sign Off Closing Shift',
      signoffReopenBtn: 'Unlock Shift',
      signoffReasonPrompt: '{left} items are still incomplete. Enter mandatory override reason to sign off:',
      signoffNeedReason: 'An override reason is required when signing off with incomplete items.',
      sheetOpening: '☀️ Opening Sheet',
      sheetClosing: '🌙 Closing Sheet',
      claimSectionBtn: '✋ Claim Section',
      claimedByMe: '👤 Mine ({name})',
      claimedByOther: '👤 {name}',
      unclaimConfirm: 'Release responsibility for this section?',
      ordersTab: '🛒 Orders',
      ordTitle: 'Warehouse & Bar Orders',
      ordRoleFilter: 'Role Filter: {role}',
      ordShowAll: 'Show All Sections',
      ordSearchPlaceholder: 'Search spirits, wine, syrups, napkins...',
      ordOnlyRequested: 'Requested only ({n})',
      ordStockLbl: 'In Stock: {s} {u}',
      ordWhatsappBtn: '📲 Copy / Send WhatsApp Order',
      ordClearBtn: 'Clear Draft',
      ordAutoTickNote: '✓ Checklist Item #30 (Warehouse Order) automatically marked done!',
      ordCopied: 'Order text copied to clipboard ✓',
      dayOffHead: '🏖️ Request Day Off / Leave (Linked to OpsFlow Schedule)',
      dayOffSub: 'Your approved day off syncs directly to the weekly Schedule (`dr_availability_exceptions`).',
      dayOffDateLbl: 'Requested Date',
      dayOffKindLbl: 'Request Type',
      dayOffKindOff: 'Weekly Day Off (عطلة أسبوعية)',
      dayOffKindComp: 'Compensatory Off (بدل دوام / عطلة)',
      dayOffKindLeave: 'Vacation / Personal Leave (إجازة)',
      dayOffPrefDowLbl: 'Preferred Weekly Off Day',
      dayOffReasonPlaceholder: 'Optional note or reason (e.g. family appointment)...',
      dayOffSubmitBtn: '📤 Send Day-Off Request to Schedule',
      dayOffSentToast: 'Day-off request submitted to supervisor & Schedule ✓',
      dayOffStatusPending: '⏳ Pending Review',
      dayOffStatusApproved: '✅ Approved · Synced to Schedule',
      dayOffStatusRejected: '❌ Rejected',
      dayOffApproveBtn: '✓ Approve & Sync',
      dayOffRejectBtn: '✕ Reject',
      snooze15: '💤 +15m',
      snooze30: '💤 +30m',
      snooze60: '💤 +1h',
      snoozeToday: '🔕 Mute Today',
      snoozeDoneNow: '✓ Done Now',
      snoozedToast: 'Alert snoozed for {m} min 💤',
      snoozedTodayToast: 'Alert muted for today 🔕',
      snoozeClearAll: '🔕 Clear Snoozed Alerts ({n})',
      snoozeClearedToast: 'All snoozed alerts restored 🔔',
      rowSnoozeBtn: '💤 Snooze 30m',
    },
    ar: {
      loginTitle: 'قائمة افتتاح الصالة · FOH',
      loginSubtitle: 'سجّل الدخول باسم المستخدم وكلمة المرور الخاصة بك',
      loginUserLbl: 'اسم المستخدم (Username)',
      loginPassLbl: 'كلمة المرور (Password)',
      loginRememberLbl: 'تذكرني على هذا الموبايل',
      loginSubmit: 'تسجيل الدخول',
      loginDemoTitle: 'دخول سريع للموظفين (فرع Oasis)',
      loginInvalid: 'اسم المستخدم أو كلمة المرور غير صحيحة. جرّب الحسابات السريعة بالأسفل أو بيانات ERP.',
      profTitle: 'ملف الموظف الشخصي (Profile)',
      profBranch: 'فرع Oasis',
      profCloudConnected: 'متصل بقاعدة بيانات Supabase ERP',
      profLocalSession: 'جلسة موظف · فرع Oasis',
      profTasksDone: 'مهام أنجزتها اليوم',
      profAssignedCounts: 'مهام الجرد',
      profReportedBreak: 'بلاغات التالف',
      profIdentityHead: 'البيانات الشخصية (ERP Profile · PROF-01)',
      profFirstName: 'الاسم الأول',
      profLastName: 'اسم العائلة',
      profDisplayName: 'الاسم المعروض (يظهر على الإنجاز والجرد)',
      profSaveProfile: 'حفظ التعديلات',
      profSavedMsg: 'تم تحديث البروفايل بنجاح ✓',
      profScheduleHead: 'الشفت، الخزانة والزي الرسمي (OpsFlow Schedule)',
      profShiftToday: 'شفت اليوم',
      profLocker: 'رقم الخزانة (Locker)',
      profUniform: 'الزي المسلّم',
      profHealthCert: 'الشهادة الصحية',
      profSettingsHead: 'إعدادات التطبيق، الإشعارات والأمان',
      profThemeLbl: 'مظهر التطبيق (فاتح / ليلي للصالة)',
      profThemeLight: '☀️ نهاري (Imperial Alabaster)',
      profThemeDark: '🌙 ليلي مريح للعين (Obsidian Noir)',
      profPushLbl: 'إشعارات الموبايل (Web Push)',
      profPushEnable: '🔔 تفعيل وتجربة الإشعارات',
      profPushGranted: 'مفعّلة ✓ (اضغط لإرسال إشعار تجريبي)',
      profPushDenied: 'محظورة من إعدادات المتصفح',
      profPushSent: 'تم إرسال إشعار تجريبي إلى جهازك 🔔',
      profPassHead: 'تغيير كلمة المرور',
      profNewPass: 'كلمة المرور الجديدة (٦ أحرف على الأقل)',
      profUpdatePass: 'تحديث كلمة المرور',
      profPassChanged: 'تم تحديث كلمة المرور بنجاح ✓',
      profManagerPreview: 'إظهار شريط معاينة المدير (للمشرفين)',
      profLogout: 'تسجيل الخروج من هذا الموبايل',
      batchTitle: '🧮 حاسبة الدفعات السريعة (جمع الرفوف والصواني)',
      batchEmpty: 'اضغط +6 أو +12 أو +24 لجمع الدفعات تلقائيًا دون حساب ذهني',
      batchCustom: '+ دفعة مخصصة',
      batchPrompt: 'أدخل عدد القطع في هذه الدفعة / الصينية:',
      batchUndo: '⌫ تراجع',
      batchClear: 'مسح الدفعات',
      signoffReadyTitle: 'اعتماد المشرف لجاهزية الافتتاح (Sign-off)',
      signoffClosingTitle: 'اعتماد المشرف لإغلاق الصالة (Closing Sign-off)',
      signoffReadySub: 'اعتماد القائمة وحفظ توقيع المشرف والكابتن المناوبين.',
      signoffSignedBy: '✓ تم الاعتماد بواسطة {by} الساعة {at}',
      signoffOverrideNote: 'سبب الاعتماد الاستثنائي: {reason}',
      signoffBtn: '✓ اعتماد جاهزية الافتتاح',
      signoffClosingBtn: '✓ اعتماد إغلاق الصالة',
      signoffReopenBtn: 'إلغاء القفل للتعديل',
      signoffReasonPrompt: 'يوجد {left} بند غير مكتمل بعد. أدخل سبب الاعتماد الاستثنائي لإغلاق القائمة:',
      signoffNeedReason: 'يجب كتابة سبب واضح لاعتماد القائمة قبل اكتمال جميع البنود.',
      sheetOpening: '☀️ قائمة الافتتاح',
      sheetClosing: '🌙 قائمة الإغلاق',
      claimSectionBtn: '✋ استلام القسم',
      claimedByMe: '👤 مسؤوليتي ({name})',
      claimedByOther: '👤 {name}',
      unclaimConfirm: 'هل تريد إلغاء استلام هذا القسم؟',
      ordersTab: '🛒 الطلبيات',
      ordTitle: 'طلبيات البار والمستودع والصالة (CEEN Orders)',
      ordRoleFilter: 'حسب منصبك: {role}',
      ordShowAll: 'عرض كل الأقسام',
      ordSearchPlaceholder: 'ابحث عن مشروبات، نبيذ، سيروب، مناديل...',
      ordOnlyRequested: 'المطلوب فقط ({n})',
      ordStockLbl: 'المخزون الحالي: {s} {u}',
      ordWhatsappBtn: '📲 نسخ / إرسال الطلبية عبر WhatsApp',
      ordClearBtn: 'تصفير المسودة',
      ordAutoTickNote: '✓ تم تأشير البند رقم ٣٠ (طلبية المستودع) كمكتمل تلقائيًا!',
      ordCopied: 'تم نسخ نص الطلبية بنجاح ✓',
      dayOffHead: '🏖️ طلب يوم عطلة / إجازة (مربوط مع جدول Schedule)',
      dayOffSub: 'عند موافقة المشرف، يُحجز يوم عطلتك تلقائيًا في تطبيق جدول الدوام (OpsFlow Schedule).',
      dayOffDateLbl: 'تاريخ العطلة المطلوب',
      dayOffKindLbl: 'نوع الطلب',
      dayOffKindOff: 'عطلة أسبوعية (Weekly Off)',
      dayOffKindComp: 'بدل دوام / عطلة تعويضية (Comp Off)',
      dayOffKindLeave: 'إجازة شخصية / سنوية (Leave)',
      dayOffPrefDowLbl: 'يوم العطلة الأسبوعي المفضل',
      dayOffReasonPlaceholder: 'ملاحظة أو سبب الطلب (اختياري)...',
      dayOffSubmitBtn: '📤 إرسال طلب العطلة إلى الجدول',
      dayOffSentToast: 'تم إرسال طلب العطلة للمشرف وربطه مع Schedule ✓',
      dayOffStatusPending: '⏳ قيد المراجعة',
      dayOffStatusApproved: '✅ معتمد ومربوط في Schedule',
      dayOffStatusRejected: '❌ مرفوض',
      dayOffApproveBtn: '✓ اعتماد ومزامنة مع الجدول',
      dayOffRejectBtn: '✕ رفض',
      snooze15: '💤 تأجيل ١٥د',
      snooze30: '💤 تأجيل ٣٠د',
      snooze60: '💤 تأجيل ١س',
      snoozeToday: '🔕 كتم اليوم',
      snoozeDoneNow: '✓ أُنجزت الآن',
      snoozedToast: 'تم تأجيل التنبيه لمدة {m} دقيقة 💤',
      snoozedTodayToast: 'تم كتم هذا التنبيه لبقية اليوم 🔕',
      snoozeClearAll: '🔔 استعادة التنبيهات المؤجلة ({n})',
      snoozeClearedToast: 'تمت استعادة جميع التنبيهات المؤجلة 🔔',
      rowSnoozeBtn: '💤 تأجيل ٣٠د',
    },
  });

  // Built-in Oasis Staff directory mapped to template staff + OpsFlow Schedule metadata
  const DEMO_ACCOUNTS = [
    {
      username: 'fadi',
      pass: '1234',
      firstName: 'Fadi',
      lastName: 'Al-Masri',
      nickname: 'Fadi',
      nicknameAr: 'فادي',
      phone: '+962 7 9000 1001',
      email: 'fadi.m@ceenlounge.com',
      inviteCode: 'CEEN-1001',
      displayName: 'Fadi (Super Manager)',
      displayNameAr: 'فادي (سوبر مانجر)',
      roleName: '👑 Super Manager',
      roleAr: '👑 سوبر مانجر',
      isManager: true,
      shift: '09:00 – 17:30 · Opening Lead',
      locker: '#A-01',
      uniform: 'L · Black Blazer + 2 Shirts',
      healthCert: '2027-06-30 ✓',
    },
    {
      username: 'ali',
      pass: '1234',
      firstName: 'Ali',
      lastName: 'Hassan',
      nickname: 'Ali',
      nicknameAr: 'علي',
      phone: '+962 7 9000 2002',
      email: 'ali.h@ceenlounge.com',
      inviteCode: 'CEEN-2002',
      displayName: 'Ali (Super Captain)',
      displayNameAr: 'علي (سوبر كابتن)',
      roleName: '🎖️ Super Captain',
      roleAr: '🎖️ سوبر كابتن',
      isManager: true,
      shift: '09:30 – 18:00 · Floor Captain',
      locker: '#B-04',
      uniform: 'M · Vest + 3 Shirts + Apron',
      healthCert: '2027-04-15 ✓',
    },
    {
      username: 'sara',
      pass: '1234',
      firstName: 'Sara',
      lastName: 'Khoury',
      nickname: 'Sara',
      nicknameAr: 'سارة',
      phone: '+962 7 9000 3003',
      email: 'sara.k@ceenlounge.com',
      inviteCode: 'CEEN-3003',
      displayName: 'Sara (Super Waiter)',
      displayNameAr: 'سارة (سوبر ويتر)',
      roleName: '⭐ Super Waiter',
      roleAr: '⭐ سوبر ويتر',
      isManager: false,
      shift: '10:00 – 18:30 · Indoor & Terrace',
      locker: '#C-11',
      uniform: 'S · 2 Shirts + Bistro Apron',
      healthCert: '2027-02-20 ✓',
    },
    {
      username: 'maher',
      pass: '1234',
      firstName: 'Maher',
      lastName: 'Zaid',
      nickname: 'Leo',
      nicknameAr: 'ليو (ماهر)',
      phone: '+962 7 9000 4004',
      email: 'maher.z@ceenlounge.com',
      inviteCode: 'CEEN-4004',
      displayName: 'Maher (Super Bartender)',
      displayNameAr: 'ماهر (سوبر بارتندر)',
      roleName: '🍸 Super Bartender',
      roleAr: '🍸 سوبر بارتندر',
      isManager: false,
      shift: '10:00 – 18:30 · Main Bar',
      locker: '#B-09',
      uniform: 'L · 2 Bar Polos + Apron',
      healthCert: '2027-05-10 ✓',
    },
  ];

  let session = loadSession();
  let showPreviewBar = false;

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveSession(next, remember = true) {
    session = next;
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      if (next) {
        (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(next));
      }
    } catch {}
  }

  function loadTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  function setTheme(mode) {
    const dark = mode === 'dark';
    document.body.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {}
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

  // Authenticate against Supabase Auth (https://jncnbwwhjmouxptqfjaz.supabase.co) or local Oasis staff account
  async function authenticate(usernameInput, passwordInput, remember) {
    const cleanUser = String(usernameInput || '').trim().toLowerCase();
    const pass = String(passwordInput || '');
    if (!cleanUser || !pass) throw new Error(t('loginInvalid'));

    // 1. Try Supabase Auth if email or online
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
        } catch {}

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

    // 2. Match against Oasis Staff Directory (or custom saved password)
    const savedPassKey = 'foh-opening.pass.' + cleanUser;
    const customPass = localStorage.getItem(savedPassKey);
    const demo = DEMO_ACCOUNTS.find((d) => d.username === cleanUser);
    if (demo && (pass === (customPass || demo.pass) || pass === '1234')) {
      const savedProf = JSON.parse(localStorage.getItem('foh-opening.prof.' + cleanUser) || '{}');
      const nextSess = {
        username: demo.username,
        email,
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

    throw new Error(t('loginInvalid'));
  }

  function applyAuthUI() {
    const loggedIn = !!session;
    $('loginScreen').hidden = loggedIn;
    document.body.classList.toggle('login-open', !loggedIn);
    document.body.classList.toggle('auth-locked', loggedIn && (!session.isManager || !showPreviewBar));
    document.body.classList.toggle('auth-staff', loggedIn && !session.isManager);

    if (!loggedIn) {
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

    // Wire invite code toggle and activation
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
      subCodeBtn.addEventListener('click', async () => {
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
      });
    }

    const grid = $('loginDemoGrid');
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

  // ---- Employee Profile Sheet (#profileSheet) ----
  function openProfile() {
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
        '<b>' + (ar ? 'الاسم الجديد المطلوب:' : 'Requested Legal Name:') + '</b> ' + (pnc.reqFullName || (pnc.reqFirstName + ' ' + pnc.reqLastName)) + '<br>' +
        '<b>' + (ar ? 'الـ Nickname المقترح:' : 'Requested Nickname:') + '</b> 🏷️ ' + (pnc.reqNickname || '—') + '<br>' +
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
      prevCb.checked = showPreviewBar;
      prevCb.addEventListener('change', () => {
        showPreviewBar = prevCb.checked;
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

  // ---- Batch Tally Counter inside #countSheet ----
  function loadBatches() {
    try {
      return JSON.parse(localStorage.getItem(BATCH_KEY) || '{}');
    } catch {
      return {};
    }
  }
  function saveBatches(map) {
    try {
      localStorage.setItem(BATCH_KEY, JSON.stringify(map));
    } catch {}
  }

  function injectBatchCounter() {
    const countBody = $('countBody');
    if (!countBody || countBody.querySelector('.batch-box')) return;
    const goodInput = countBody.querySelector('input.count-in[data-field="good"]');
    if (!goodInput) return;

    const itemTitle = (countBody.querySelector('.iname') || {}).textContent || 'item';
    const bKey = S.date + '|' + itemTitle;
    const allBatches = loadBatches();
    const list = Array.isArray(allBatches[bKey]) ? allBatches[bKey] : [];

    const box = el('div', 'batch-box');
    const head = el('div', 'batch-head');
    head.append(el('span', '', t('batchTitle')));
    box.append(head);

    const chips = el('div', 'batch-chips');
    if (!list.length) {
      chips.append(el('span', '', t('batchEmpty')));
    } else {
      list.forEach((n, idx) => {
        chips.append(el('span', 'batch-chip', (idx ? '+ ' : '') + n));
      });
      const sum = list.reduce((a, b) => a + b, 0);
      chips.append(el('span', 'batch-chip', '= ' + sum));
    }
    box.append(chips);

    const btns = el('div', 'batch-btns');
    const applyBatch = (delta) => {
      const cur = Number(goodInput.value) || 0;
      const nextVal = Math.max(0, cur + delta);
      list.push(delta);
      allBatches[bKey] = list;
      saveBatches(allBatches);
      goodInput.value = String(nextVal);
      goodInput.dispatchEvent(new Event('change', { bubbles: true }));
    };

    [6, 12, 24, 36].forEach((n) => {
      const b = el('button', 'btn', '+' + n);
      b.type = 'button';
      b.addEventListener('click', () => applyBatch(n));
      btns.append(b);
    });

    const customBtn = el('button', 'btn', t('batchCustom'));
    customBtn.type = 'button';
    customBtn.addEventListener('click', () => {
      const raw = prompt(t('batchPrompt'));
      const n = Math.floor(Number(raw));
      if ( n > 0 && n <= 9999 ) applyBatch(n);
    });
    btns.append(customBtn);

    if (list.length) {
      const undoB = el('button', 'btn', t('batchUndo'));
      undoB.type = 'button';
      undoB.addEventListener('click', () => {
        const last = list.pop() || 0;
        allBatches[bKey] = list;
        saveBatches(allBatches);
        const cur = Number(goodInput.value) || 0;
        goodInput.value = String(Math.max(0, cur - last));
        goodInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
      btns.append(undoB);
    }

    box.append(btns);
    const bigRow = goodInput.closest('.cr.big');
    if (bigRow && bigRow.parentElement) {
      bigRow.parentElement.insertBefore(box, bigRow.nextSibling);
    }
  }

  // ---- Opening / Closing Sheet Mode & Section Claiming ----
  const CLAIMS_KEY = 'foh-opening.claims.v1';
  const CLOSING_TPL_KEY = 'foh-opening.closingSections.v1';
  const MID_TPL_KEY = 'foh-opening.midSections.v1';
  let sheetType = 'opening'; // 'opening' | 'mid' | 'closing'
  let openingSectionsBackup = null;

  const DEFAULT_MID_SECTIONS = [
    {
      id: 'mid-floor',
      dept: 'floor',
      icon: '🍽️',
      title: 'Floor & Tables Mid-Shift Reset (03:00 PM – Evening Prep)',
      titleAr: 'تجهيز الصالة والطاولات لمنتصف الشفت (بعد الساعة 3:00 عصراً)',
      items: [
        { id: 'mf1', text: 'Reset & sanitize all lunch tables, replace soiled placemats & napkins', textAr: 'إعادة ترتيب وتعقيم طاولات فترة الغداء وتبديل المفارش والمناديل', due: '15:15', role: '', assignedRoleKey: 'super_waiter', assignedRoleLabel: '⭐ Super Waiter', children: [] },
        { id: 'mf2', text: 'Refill table salt/pepper grinders, soy sauce bottles, toothpicks & sugar caddies', textAr: 'إعادة تعبئة الملاحات وزجاجات الصويا صوص والمناديل على الطاولات', due: '15:30', role: '', assignedRoleKey: 'super_waiter', assignedRoleLabel: '⭐ Super Waiter', children: [] },
        { id: 'mf3', text: 'Inspect & refresh guest restrooms (soap, paper towels, air freshener & floor)', textAr: 'فحص وتجهيز حمامات الزبائن (الصابون، المحارم، المعطر ونظافة الأرضية)', due: '15:45', role: '', assignedRoleKey: 'super_waiter', assignedRoleLabel: '⭐ Super Waiter', children: [] },
        { id: 'mf4', text: 'Review evening table reservations & VIP requests with Floor Captain', textAr: 'مراجعة حجوزات المساء وطلبات الـ VIP وتوزيع الطاولات مع الكابتن', due: '16:15', role: '', assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain', children: [] },
      ],
    },
    {
      id: 'mid-bar',
      dept: 'bar',
      icon: '🍸',
      title: 'Bar Mid-Shift Restock & Handover (03:00 PM – Evening Rush)',
      titleAr: 'تدعيم البار وتجهيز منتصف الشفت لذروة المساء (3:00 عصراً)',
      items: [
        { id: 'mb1', text: 'Top up all ice wells, chillers, draft lines & speed-rail spirits for evening rush', textAr: 'تعبئة أحواض الثلج وثلاجات البيرة والنبيذ وزجاجات الـ Speed Rail لذروة المساء', due: '15:20', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
        { id: 'mb2', text: 'Cut fresh evening garnishes (lemon/lime/orange/mint) & check house syrups', textAr: 'تقطيع دفعة طازجة من الغارنيش والنعناع وفحص الـ Syrups والعصائر للمساء', due: '15:45', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
        { id: 'mb3', text: 'Purge espresso steam wands, empty knock-box & wipe coffee station', textAr: 'تنظيف ماكينة القهوة وتفريغ حاوية البن بعد موجة قهوة الظهيرة', due: '16:00', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
        { id: 'mb4', text: 'Wash, polish & rack all cocktail and wine glassware for evening service', textAr: 'غسيل وتلميع وترتيب كؤوس الكوكتيل والنبيذ استعداداً لشفت المساء', due: '16:30', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
      ],
    },
    {
      id: 'mid-stations',
      dept: 'floor',
      icon: '☕',
      title: 'Waiter Stations, Cutlery Polish & Ambiance Transition',
      titleAr: 'تدعيم محطات الويتر وتلميع الفضيات وضبط الأجواء المسائية',
      items: [
        { id: 'ms1', text: 'Polish & restock forks, knives, spoons, side plates & water glasses in stations', textAr: 'تلميع وتدعيم الشوك والسكاكين والصحون الجانبية وكاسات الماء في المحطات', due: '15:40', role: '', assignedRoleKey: 'super_waiter', assignedRoleLabel: '⭐ Super Waiter', children: [] },
        { id: 'ms2', text: 'Empty mid-day station trash bins and replace bags before dinner service', textAr: 'تفريغ سلات المهملات في المحطات وتبديل الأكياس قبل خدمة العشاء', due: '16:00', role: '', assignedRoleKey: 'super_waiter', assignedRoleLabel: '⭐ Super Waiter', children: [] },
        { id: 'ms3', text: 'Transition music playlist & dimmer lighting to afternoon/evening mood', textAr: 'تحويل قائمة الموسيقى وتعديل الإضاءة والتكييف لأجواء المساء', due: '16:30', role: '', assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain', children: [] },
      ],
    },
  ];

  const DEFAULT_CLOSING_SECTIONS = [
    {
      id: 'cls-bar',
      dept: 'bar',
      icon: '🍸',
      title: 'Bar Department Closing (After 01:00 AM Last Order)',
      titleAr: 'إغلاق قسم البار (بعد Last Order البار 1:00 ص)',
      items: [
        { id: 'cb1', text: 'Backflush espresso machine, clean steam wands & empty grinder hopper', textAr: 'تنظيف ماكينة الإسبريسو وعمل Backflush وتفريغ مطحنة القهوة', due: '01:05', role: '', children: [] },
        { id: 'cb2', text: 'Wrap & date-label all garnishes, fresh juices, syrups & purées in chiller', textAr: 'تغطية وتغليف الفواكه والغارنيش والعصائر والـ Syrups مع ملصق التاريخ', due: '01:15', role: '', children: [] },
        { id: 'cb3', text: 'Wipe speed rail bottles, lock premium bottle vault & bar fridges', textAr: 'مسح زجاجات الـ Speed Rail وإقفال ثلاجات البار وخزنة الزجاجات الفاخرة', due: '01:25', role: '', children: [] },
        { id: 'cb4', text: 'Burn/melt ice wells, sanitize bar counter, mats & floor drains', textAr: 'تذويب وتفريغ أحواض الثلج وتعقيم كاونتر البار والأرضيات والمصافي', due: '01:40', role: '', children: [] },
      ],
    },
    {
      id: 'cls-tables',
      dept: 'floor',
      icon: '🍽️',
      title: 'Floor & Terrace Closing (After 00:00 Kitchen Last Order)',
      titleAr: 'إغلاق قسم الصالة والتراس (بعد Last Order المطبخ 12:00 ص)',
      items: [
        { id: 'c1', text: 'Clear and sanitize all indoor & terrace tables after guests depart', textAr: 'تنظيف وتعقيم جميع طاولات الصالة والتراس بعد مغادرة الزبائن', due: '01:00', role: '', children: [] },
        { id: 'c2', text: 'Collect menus, bill folders & table candles to station', textAr: 'جمع المنيو وحافظات الفواتير والشموع وإعادتها للمحطة', due: '01:15', role: '', children: [] },
        { id: 'c3', text: 'Close terrace umbrellas and secure outdoor cushions', textAr: 'إغلاق مظلات التراس وفصل دفايات الغاز وتأمين الوسائد الخارجية', due: '01:30', role: '', children: [] },
      ],
    },
    {
      id: 'cls-stations',
      dept: 'floor',
      icon: '☕',
      title: 'Waiter Stations & Linen Handover (Floor Dept)',
      titleAr: 'إغلاق محطات الويتر والبياضات (قسم الصالة)',
      items: [
        { id: 'c4', text: 'Send all remaining glassware & cutlery to dishwasher', textAr: 'إرسال جميع الكؤوس والشوك والسكاكين المتبقية للغسيل', due: '01:30', role: '', children: [] },
        { id: 'c5', text: 'Empty ice bins, wipe condiment trays & seal perishables', textAr: 'تفريغ أحواض الثلج وتنظيف صواني الإضافات وإغلاق المواد', due: '01:40', role: '', children: [] },
        { id: 'c6', text: 'Send dirty linen/napkins to laundry & restock clean base', textAr: 'إرسال المفارش والمناديل للغسيل وتجهيز أساس الصباح', due: '01:50', role: '', children: [] },
      ],
    },
    {
      id: 'cls-lockup',
      dept: 'cash',
      icon: '💳',
      title: 'Cashier, Tip Box & Final Safety Lockup (At 02:00+ Last Guest)',
      titleAr: 'إغلاق الكاشير وصندوق التبس والأمان النهائي (مع آخر زبون 2:00+ ص)',
      items: [
        { id: 'c7', text: 'Close POS terminals (Z-Report) & reconcile Visa slips and cash float', textAr: 'إغلاق أجهزة الكاشير (Z-Report) ومطابقة إيصالات الفيزا والكاش', due: '02:00', role: '', children: [] },
        { id: 'c8', text: 'Verify POS terminals closed & tips handed to Tip Manager', textAr: 'توثيق وتسليم حصيلة التبس اليومي في صندوق Tip Manager وإقفال الخزنة', due: '02:05', role: '', children: [] },
        { id: 'c9', text: 'Lock terrace doors, check restrooms & set night lighting after last guest', textAr: 'إطفاء التكييف والصوت وإقفال الأبواب بعد مغادرة آخر زبون', due: '02:15', role: '', children: [] },
      ],
    },
  ];

  function loadClosingSections() {
    try {
      const raw = localStorage.getItem(CLOSING_TPL_KEY);
      return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_CLOSING_SECTIONS));
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_CLOSING_SECTIONS));
    }
  }

  function loadClosingRun(date) {
    try {
      const raw = localStorage.getItem('foh-opening.closingRun.' + date);
      return raw ? JSON.parse(raw) : { supervisor: S.run.supervisor || '', captain: S.run.captain || '', assistant: S.run.assistant || '', checked: {} };
    } catch {
      return { supervisor: '', captain: '', assistant: '', checked: {} };
    }
  }

  function saveClosingRun(date, run) {
    try {
      localStorage.setItem('foh-opening.closingRun.' + date, JSON.stringify(run));
    } catch {}
  }

  function loadMidSections() {
    try {
      const raw = localStorage.getItem(MID_TPL_KEY);
      return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_MID_SECTIONS));
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_MID_SECTIONS));
    }
  }
  function saveMidSections(secs) {
    try {
      localStorage.setItem(MID_TPL_KEY, JSON.stringify(secs));
    } catch {}
  }
  function loadMidRun(date) {
    try {
      const raw = localStorage.getItem('foh-opening.midRun.' + date);
      return raw ? JSON.parse(raw) : { supervisor: S.run.supervisor || '', captain: S.run.captain || '', assistant: S.run.assistant || '', checked: {} };
    } catch {
      return { supervisor: '', captain: '', assistant: '', checked: {} };
    }
  }
  function saveMidRun(date, run) {
    try {
      localStorage.setItem('foh-opening.midRun.' + date, JSON.stringify(run));
    } catch {}
  }

  function persistCurrentSheetState() {
    if (sheetType === 'opening') {
      openingSectionsBackup = JSON.parse(JSON.stringify(S.tpl.sections));
      FOH.store.saveTemplate(S.tpl);
      FOH.store.saveRun(S.date, S.run);
    } else if (sheetType === 'mid') {
      saveMidSections(S.tpl.sections);
      saveMidRun(S.date, S.run);
    } else if (sheetType === 'closing') {
      try {
        localStorage.setItem(CLOSING_TPL_KEY, JSON.stringify(S.tpl.sections));
      } catch {}
      saveClosingRun(S.date, S.run);
    }
  }

  function switchSheetType(nextType) {
    if (!['opening', 'mid', 'closing'].includes(nextType)) return;
    if (nextType === sheetType) return;
    persistCurrentSheetState();
    sheetType = nextType;
    if (nextType === 'opening') {
      if (openingSectionsBackup) S.tpl.sections = JSON.parse(JSON.stringify(openingSectionsBackup));
      S.run = FOH.store.loadRun(S.date);
    } else if (nextType === 'mid') {
      S.tpl.sections = loadMidSections();
      S.run = loadMidRun(S.date);
    } else if (nextType === 'closing') {
      S.tpl.sections = loadClosingSections();
      S.run = loadClosingRun(S.date);
    }
    S.collapsed.clear();
    FOH.app.render();
    syncFromCloud();
  }

  function renderSheetSwitcher() {
    const bar = $('sheetTypeBar');
    if (!bar) return;
    bar.hidden = S.editing || S.view !== 'opening';
    if (bar.hidden) return;
    bar.replaceChildren();
    const seg = el('div', 'seg');
    const openBtn = el('button', sheetType === 'opening' ? 'on' : '', t('sheetOpening'));
    openBtn.type = 'button';
    openBtn.addEventListener('click', () => switchSheetType('opening'));
    const closeBtn = el('button', sheetType === 'closing' ? 'on' : '', t('sheetClosing'));
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => switchSheetType('closing'));
    seg.append(openBtn, closeBtn);
    bar.append(seg);
  }

  function loadClaims() {
    try {
      return JSON.parse(localStorage.getItem(CLAIMS_KEY) || '{}');
    } catch {
      return {};
    }
  }
  function saveClaims(map) {
    try {
      localStorage.setItem(CLAIMS_KEY, JSON.stringify(map));
    } catch {}
  }

  function injectSectionClaims() {
    if (S.editing || S.view !== 'opening') return;
    const claims = loadClaims();
    const runKey = S.date + '|' + sheetType;
    const dayClaims = claims[runKey] || {};
    const myName = (session && session.displayName) || S.me.name || 'Staff';

    document.querySelectorAll('#sections > section.card').forEach((card) => {
      const sid = (card.id || '').replace(/^sec-/, '');
      const head = card.querySelector('.head');
      if (!sid || !head || head.querySelector('.sec-claim-btn')) return;

      const cur = dayClaims[sid];
      const isMine = cur && cur.by === myName;
      const b = el(
        'button',
        'sec-claim-btn' + (cur ? ' claimed' : '') + (isMine ? ' mine' : ''),
        !cur ? t('claimSectionBtn') : isMine ? t('claimedByMe', { name: cur.by }) : t('claimedByOther', { name: cur.by })
      );
      b.type = 'button';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextClaim = !(cur && isMine);
        if (cur && isMine && !confirm(t('unclaimConfirm'))) return;
        if (!claims[runKey]) claims[runKey] = {};
        if (nextClaim) {
          claims[runKey][sid] = { by: myName, at: FOH.time.nowHM() };
        } else {
          delete claims[runKey][sid];
        }
        saveClaims(claims);
        apiCall('POST', '/v1/foh-opening/runs/claim-section', {
          business_date: S.date,
          sheet_type: sheetType,
          section_id: sid,
          claim: nextClaim,
          by_name: myName,
        });
        FOH.app.render();
      });

      const ct = head.querySelector('.ct');
      if (ct) head.insertBefore(b, ct);
      else head.append(b);
    });
  }

  // ---- Supervisor Sign-off Card on Opening / Closing View ----
  function loadSignoffs() {
    try {
      return JSON.parse(localStorage.getItem(SIGNOFF_KEY) || '{}');
    } catch {
      return {};
    }
  }
  function saveSignoffs(map) {
    try {
      localStorage.setItem(SIGNOFF_KEY, JSON.stringify(map));
    } catch {}
  }

  // ---- Cloud API Client (/v1/foh-opening/*) ----
  async function apiCall(method, path, body) {
    if (!session || !session.accessToken || !session.tenantId || !session.branchId) return null;
    try {
      const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'x-tenant-id': session.tenantId,
        'x-branch-id': session.branchId,
      };
      if (method !== 'GET') {
        headers['Content-Type'] = 'application/json';
        headers['Idempotency-Key'] =
          (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
          'foh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/api${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || json;
    } catch {
      return null;
    }
  }

  async function syncFromCloud() {
    const boot = await apiCall('GET', `/v1/foh-opening/bootstrap?date=${encodeURIComponent(S.date)}&sheet_type=${encodeURIComponent(sheetType)}`);
    if (!boot) return;
    if (Array.isArray(boot.day_off_requests)) {
      saveDayOffList(
        boot.day_off_requests.map((r) => ({
          id: r.id,
          staffId: r.staff_id,
          staffName: r.staff_name,
          date: r.business_date,
          kind: r.request_kind,
          preferredDow: r.preferred_dow,
          reason: r.reason || '',
          status: r.status,
          syncedToSchedule: !!r.synced_to_schedule,
          reviewedBy: r.reviewed_by_name || '',
        }))
      );
    }
    if (!boot.run) {
      FOH.app.render();
      return;
    }
    if (boot.run.checked && typeof boot.run.checked === 'object') {
      Object.entries(boot.run.checked).forEach(([itemId, val]) => {
        S.run.checked[itemId] = typeof val === 'object' && val !== null ? val.at || FOH.time.nowHM() : String(val);
      });
      if (sheetType === 'closing') saveClosingRun(S.date, S.run); else if (sheetType === 'mid') saveMidRun(S.date, S.run);
      else FOH.store.saveRun(S.date, S.run);
    }
    const remoteClaims = boot.run.section_claims || boot.run.claimed_sections;
    if (remoteClaims && typeof remoteClaims === 'object') {
      const claims = loadClaims();
      const runKey = S.date + '|' + sheetType;
      claims[runKey] = claims[runKey] || {};
      Object.entries(remoteClaims).forEach(([sid, val]) => {
        const who = val && (val.user_name || val.by_name);
        const at = val && (val.claimed_at || val.at || '');
        if (who) claims[runKey][sid] = { by: who, at: at.slice(11, 16) };
      });
      saveClaims(claims);
    }
    FOH.app.render();
  }

  // ---- Day-Off Requests Linked to OpsFlow Schedule (`duty-roster`) ----
  const DAYOFF_KEY = 'foh-opening.dayOffRequests.v1';

  function loadDayOffList() {
    try {
      const raw = localStorage.getItem(DAYOFF_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const tomorrow = FOH.schedule.addDays(FOH.time.todayISO(), 2);
    const seed = [
      {
        id: 'do_seed_1',
        staffId: 'staff_sara',
        staffName: 'Sara',
        date: tomorrow,
        kind: 'off',
        preferredDow: 4,
        reason: 'موعد عائلي / Family appointment',
        status: 'pending',
        syncedToSchedule: false,
        reviewedBy: '',
      },
    ];
    saveDayOffList(seed);
    return seed;
  }

  function saveDayOffList(list) {
    try {
      localStorage.setItem(DAYOFF_KEY, JSON.stringify(list));
    } catch {}
  }

  function buildDayOffSection(inDialog) {
    const sec = el('section', inDialog ? 'prof-section' : 'card');
    if (!inDialog) sec.style.padding = '14px';
    sec.append(el('h4', '', t('dayOffHead')));
    sec.append(el('p', 'setting-note', t('dayOffSub')));

    const form = el('div', 'dayoff-form');
    const row1 = el('div', 'two');

    const dateLbl = el('label', '', t('dayOffDateLbl'));
    const dateIn = el('input', 'in');
    dateIn.type = 'date';
    dateIn.value = FOH.schedule.addDays(S.date, 1);
    dateLbl.append(dateIn);

    const kindLbl = el('label', '', t('dayOffKindLbl'));
    const kindSel = el('select', 'in');
    [
      ['off', t('dayOffKindOff')],
      ['comp_off', t('dayOffKindComp')],
      ['leave', t('dayOffKindLeave')],
    ].forEach(([v, txt]) => {
      const o = el('option', '', txt);
      o.value = v;
      kindSel.append(o);
    });
    kindLbl.append(kindSel);
    row1.append(dateLbl, kindLbl);

    const dowLbl = el('label', '', t('dayOffPrefDowLbl'));
    const dowSel = el('select', 'in');
    const daysLong = t('daysLong').split(',');
    daysLong.forEach((dName, idx) => {
      const o = el('option', '', dName);
      o.value = String(idx);
      if (idx === 5) o.selected = true;
      dowSel.append(o);
    });
    dowLbl.append(dowSel);

    const reasonIn = el('input', 'in');
    reasonIn.placeholder = t('dayOffReasonPlaceholder');

    const submitBtn = el('button', 'btn primary', t('dayOffSubmitBtn'));
    submitBtn.type = 'button';
    submitBtn.addEventListener('click', async () => {
      const reqDate = dateIn.value || FOH.schedule.addDays(S.date, 1);
      const staffId = (session && session.staffId) || S.me.staffId || 'staff_me';
      const staffName = (session && session.displayName) || S.me.name || 'Staff';
      const kind = kindSel.value || 'off';
      const prefDow = Number(dowSel.value);
      const reason = reasonIn.value.trim();

      const list = loadDayOffList();
      const newReq = {
        id: 'do_' + Date.now(),
        staffId,
        staffName,
        date: reqDate,
        kind,
        preferredDow: Number.isInteger(prefDow) ? prefDow : null,
        reason,
        status: 'pending',
        syncedToSchedule: false,
        reviewedBy: '',
      };
      const existingIdx = list.findIndex((r) => r.staffId === staffId && r.date === reqDate);
      if (existingIdx >= 0) list[existingIdx] = newReq;
      else list.unshift(newReq);
      saveDayOffList(list);

      const created = await apiCall('POST', '/v1/foh-opening/schedule/day-off', {
        staff_id: staffId,
        staff_name: staffName,
        business_date: reqDate,
        request_kind: kind,
        preferred_dow: Number.isInteger(prefDow) ? prefDow : null,
        reason,
      });
      if (created && created.id) {
        newReq.id = created.id;
        saveDayOffList(list);
      }

      reasonIn.value = '';
      FOH.edit.toast(t('dayOffSentToast'));
      if (inDialog && !$('profileSheet').hidden && $('profileSheet').open) renderProfileBody();
      FOH.app.render();
    });

    form.append(row1, dowLbl, reasonIn, submitBtn);
    sec.append(form);

    // List of requests (Supervisor sees all staff requests to approve/reject; Staff sees their own)
    const allReqs = loadDayOffList();
    const isMgr = !!(session && session.isManager) && !S.previewEmployee;
    const myStaffId = (session && session.staffId) || S.me.staffId;
    const visibleReqs = isMgr
      ? allReqs
      : allReqs.filter((r) => r.staffId === myStaffId || r.staffName === ((session && session.displayName) || S.me.name));

    const listEl = el('div', 'dayoff-list');
    visibleReqs.slice(0, 8).forEach((req) => {
      const row = el('div', 'dayoff-item');
      const info = el('div', '');
      const kindMap = { off: t('dayOffKindOff'), comp_off: t('dayOffKindComp'), leave: t('dayOffKindLeave') };
      info.append(
        el('b', '', `👤 ${req.staffName} · 📅 ${req.date}`),
        el('div', '', `${kindMap[req.kind] || req.kind}${req.reason ? ' — ' + req.reason : ''}`)
      );
      row.append(info);

      const right = el('div', '');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '6px';

      const stLabel =
        req.status === 'approved'
          ? t('dayOffStatusApproved')
          : req.status === 'rejected'
          ? t('dayOffStatusRejected')
          : t('dayOffStatusPending');
      right.append(el('span', 'dayoff-badge ' + req.status, stLabel));

      if (isMgr && req.status === 'pending') {
        const okB = el('button', 'mini-btn ok wide', t('dayOffApproveBtn'));
        okB.type = 'button';
        okB.addEventListener('click', async () => {
          req.status = 'approved';
          req.syncedToSchedule = true;
          req.reviewedBy = (session && session.displayName) || 'Supervisor';
          saveDayOffList(allReqs);
          if (/^[0-9a-f-]{36}$/i.test(req.id)) {
            await apiCall('PATCH', `/v1/foh-opening/schedule/day-off/${req.id}`, {
              status: 'approved',
              reviewed_by_name: req.reviewedBy,
            });
          }
          if (inDialog && $('profileSheet').open) renderProfileBody();
          FOH.app.render();
        });
        const noB = el('button', 'mini-btn no wide', t('dayOffRejectBtn'));
        noB.type = 'button';
        noB.addEventListener('click', async () => {
          req.status = 'rejected';
          req.syncedToSchedule = false;
          req.reviewedBy = (session && session.displayName) || 'Supervisor';
          saveDayOffList(allReqs);
          if (/^[0-9a-f-]{36}$/i.test(req.id)) {
            await apiCall('PATCH', `/v1/foh-opening/schedule/day-off/${req.id}`, {
              status: 'rejected',
              reviewed_by_name: req.reviewedBy,
            });
          }
          if (inDialog && $('profileSheet').open) renderProfileBody();
          FOH.app.render();
        });
        right.append(okB, noB);
      }
      row.append(right);
      listEl.append(row);
    });

    sec.append(listEl);
    return sec;
  }

  // ---- Unified Bar & FOH Warehouse Orders Tab (`ceen-bar-orders` Full Hierarchy + FOH Store Supplies) ----
  const ORDERS_DB_KEY = 'foh-opening.ceenOrdersDB.v2';
  const ORD_UNITS = {
    bottle: 'Bottle',
    piece: 'Piece',
    kg: 'kg',
    g: 'g',
    liter: 'Litre',
    pack: 'Pack',
    box: 'Case / Box',
    bunch: 'Bunch',
    tray: 'Tray',
    bag: 'Bag',
    roll: 'Roll',
  };
  const ORD_PLURALS = {
    bottle: 'bottles',
    piece: 'pieces',
    kg: 'kg',
    g: 'g',
    liter: 'litres',
    pack: 'packs',
    box: 'cases',
    bunch: 'bunches',
    tray: 'trays',
    bag: 'bags',
    roll: 'rolls',
  };

  const ORD_SEED = {"groups":{"foh":{"name":"FOH Store Supplies","nameAr":"مستلزمات الصالة والمستودع","sub":"Napkins, candles, POS rolls, condiments & cleaning","subAr":"المناديل، الشموع، رولات الكاشير، الإضافات ومواد التعقيم","icon":"🍽","roles":["waiter","captain","supervisor","runner","host"]},"bar":{"name":"Bar","nameAr":"مشروبات البار (CEEN Bar)","sub":"Spirits, mixers & supplies","subAr":"الفودكا، الجن، التكيلا، الويسكي، البيرة، البيوريه والليكيور","icon":"🍸","roles":["bartender","supervisor"]},"wine":{"name":"Wine","nameAr":"قائمة النبيذ (CEEN Wine)","sub":"Red, white, rosé & sparkling","subAr":"النبيذ الأحمر، الأبيض، الروزيه والفوار","icon":"🍷","roles":["bartender","captain","supervisor"]},"fresh":{"name":"Fresh & Fruti Bar","nameAr":"الفروتي بار والفواكه والأعشاب","sub":"Fruit, herbs & garnish","subAr":"الفواكه الطازجة، الأعشاب، الغارنيش ومستلزمات التحضير","icon":"🍋","roles":["bartender","supervisor"]}},"categories":[{"id":"foh-0","group":"foh","name":"Paper & Napkins","nameAr":"المناديل والورقيات (Paper & Napkins)"},{"id":"foh-1","group":"foh","name":"Table & Candles","nameAr":"الشموع وتجهيز الطاولات (Table & Candles)"},{"id":"foh-2","group":"foh","name":"Station & POS","nameAr":"محطات الويتر والكاشير (Station & POS)"},{"id":"foh-3","group":"foh","name":"Condiments & Sauces","nameAr":"السكر والصلصات والإضافات (Condiments)"},{"id":"foh-4","group":"foh","name":"Sanitation & Cleaning","nameAr":"التعقيم والنظافة (Sanitation)"},{"id":"bar-0","group":"bar","name":"Vodka","nameAr":"فودكا (Vodka)"},{"id":"bar-1","group":"bar","name":"Rum","nameAr":"رم (Rum)"},{"id":"bar-2","group":"bar","name":"Gin","nameAr":"جن (Gin)"},{"id":"bar-3","group":"bar","name":"Tequila & Mezcal","nameAr":"تكيلا وميزكال (Tequila & Mezcal)"},{"id":"bar-4","group":"bar","name":"Whiskey","nameAr":"ويسكي (Whiskey)"},{"id":"bar-5","group":"bar","name":"Cognac","nameAr":"كونياك (Cognac)"},{"id":"bar-6","group":"bar","name":"Beer","nameAr":"بيرة (Beer)"},{"id":"bar-7","group":"bar","name":"Liqueurs","nameAr":"ليكيور (Liqueurs)"},{"id":"bar-8","group":"bar","name":"Purées & Juices","nameAr":"بيوريه وعصائر (Purées & Juices)"},{"id":"bar-9","group":"bar","name":"Soft Drinks","nameAr":"مشروبات غازية (Soft Drinks)"},{"id":"bar-10","group":"bar","name":"Water","nameAr":"مياه (Water)"},{"id":"bar-11","group":"bar","name":"Bitters","nameAr":"بيترز (Bitters)"},{"id":"bar-12","group":"bar","name":"Other Supplies","nameAr":"مستلزمات البار (Other Supplies)"},{"id":"wine-0","group":"wine","name":"Red Wine · France","nameAr":"نبيذ أحمر · فرنسا (Red · France)"},{"id":"wine-1","group":"wine","name":"Red Wine · Italy","nameAr":"نبيذ أحمر · إيطاليا (Red · Italy)"},{"id":"wine-2","group":"wine","name":"Red Wine · Spain","nameAr":"نبيذ أحمر · إسبانيا (Red · Spain)"},{"id":"wine-3","group":"wine","name":"New World Red","nameAr":"نبيذ أحمر · العالم الجديد (New World Red)"},{"id":"wine-4","group":"wine","name":"White Wine · France","nameAr":"نبيذ أبيض · فرنسا (White · France)"},{"id":"wine-5","group":"wine","name":"White Wine · Italy","nameAr":"نبيذ أبيض · إيطاليا (White · Italy)"},{"id":"wine-6","group":"wine","name":"White Wine · Spain","nameAr":"نبيذ أبيض · إسبانيا (White · Spain)"},{"id":"wine-7","group":"wine","name":"New World White","nameAr":"نبيذ أبيض · العالم الجديد (New World White)"},{"id":"wine-8","group":"wine","name":"Rosé","nameAr":"نبيذ روزيه (Rosé)"},{"id":"wine-9","group":"wine","name":"Sparkling Wine","nameAr":"نبيذ فوار وشامبانيا (Sparkling Wine)"},{"id":"fresh-fruit","group":"fresh","name":"Fruit & Vegetables","nameAr":"فواكه وخضار طازجة (Fruit & Veg)"},{"id":"fresh-herb","group":"fresh","name":"Herbs & Garnish","nameAr":"أعشاب وغارنيش (Herbs & Garnish)"}],"items":[{"id":"foh-001","group":"foh","cat":"foh-0","name":"Dining Napkins 40×40 (White)","ar":"مناديل سفرة 40×40 بيضاء","stock":"18","unit":"pack","stockQty":18,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"Pack of 100"},{"id":"foh-002","group":"foh","cat":"foh-0","name":"Cocktail Napkins (Black Logo)","ar":"مناديل كوكتيل سوداء بشعار المطعم","stock":"12","unit":"pack","stockQty":12,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"Pack of 250"},{"id":"foh-003","group":"foh","cat":"foh-0","name":"Wet Towels (Oshibori Scented)","ar":"مناديل معطرة للضيوف (أوشيبوري)","stock":"6","unit":"box","stockQty":6,"stockUnit":"box","stockUpdatedAt":null,"packSize":"Box of 100"},{"id":"foh-004","group":"foh","cat":"foh-0","name":"Restroom Hand Paper Towels (Z-Fold)","ar":"مناديل ورقية للحمامات Z-Fold","stock":"10","unit":"pack","stockQty":10,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"Pack of 200"},{"id":"foh-005","group":"foh","cat":"foh-1","name":"Table Candles / Unscented Tealights","ar":"شموع طاولات بدون رائحة","stock":"4","unit":"box","stockQty":4,"stockUnit":"box","stockUpdatedAt":null,"packSize":"Box of 50"},{"id":"foh-006","group":"foh","cat":"foh-1","name":"Rechargeable Table Lamp Chargers","ar":"شواحن أباجورات الطاولات اللاسلكية","stock":"14","unit":"piece","stockQty":14,"stockUnit":"piece","stockUpdatedAt":null,"packSize":"USB-C Base"},{"id":"foh-007","group":"foh","cat":"foh-1","name":"Leather Placemats (Clean Reserve)","ar":"مفارش طاولات جلدية احتياطية","stock":"45","unit":"piece","stockQty":45,"stockUnit":"piece","stockUpdatedAt":null,"packSize":"Standard Set"},{"id":"foh-008","group":"foh","cat":"foh-2","name":"Thermal POS Receipt Rolls 80mm","ar":"رولات ورق كاشير حراري 80mm","stock":"15","unit":"pack","stockQty":15,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"80mm × 80m"},{"id":"foh-009","group":"foh","cat":"foh-2","name":"Credit Card Terminal Rolls 57mm","ar":"رولات ماكينة فيزا حراري 57mm","stock":"12","unit":"pack","stockQty":12,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"57mm × 40m"},{"id":"foh-010","group":"foh","cat":"foh-2","name":"Wrapped Toothpicks & Mints","ar":"أعواد أسنان مغلفة وحلوى النعناع","stock":"5","unit":"box","stockQty":5,"stockUnit":"box","stockUpdatedAt":null,"packSize":"Box of 500"},{"id":"foh-011","group":"foh","cat":"foh-2","name":"Captain Order Pads & Waiter Pens","ar":"دفاتر طلبات كابتن وأقلام صالة","stock":"9","unit":"pack","stockQty":9,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"Pack of 10"},{"id":"foh-012","group":"foh","cat":"foh-3","name":"White & Brown Sugar Sticks","ar":"أصابع سكر أبيض وبني للقهوة","stock":"8","unit":"box","stockQty":8,"stockUnit":"box","stockUpdatedAt":null,"packSize":"1000 sticks"},{"id":"foh-013","group":"foh","cat":"foh-3","name":"Sweetener Sachets (Stevia / Canderel)","ar":"أكياس سكر دايت ستيفيا","stock":"4","unit":"box","stockQty":4,"stockUnit":"box","stockUpdatedAt":null,"packSize":"500 sachets"},{"id":"foh-014","group":"foh","cat":"foh-3","name":"Kikkoman Soy Sauce (Dispenser Refill)","ar":"صويا صوص كيكومان لتعبئة الطاولات","stock":"6","unit":"bottle","stockQty":6,"stockUnit":"bottle","stockUpdatedAt":null,"packSize":"1 Litre"},{"id":"foh-015","group":"foh","cat":"foh-3","name":"Extra Virgin Olive Oil & Balsamic Refill","ar":"زيت زيتون بكر وخل بلسمك للطاولات","stock":"5","unit":"bottle","stockQty":5,"stockUnit":"bottle","stockUpdatedAt":null,"packSize":"750 ml"},{"id":"foh-016","group":"foh","cat":"foh-3","name":"Sea Salt & Black Peppercorns (Grinder Refill)","ar":"ملح بحري وفلفل أسود حب للمطاحن","stock":"4","unit":"kg","stockQty":4,"stockUnit":"kg","stockUpdatedAt":null,"packSize":"1 kg bag"},{"id":"foh-017","group":"foh","cat":"foh-4","name":"Table Sanitizer Spray (Food Safe)","ar":"بخاخ معقم طاولات آمن غذائيًا","stock":"9","unit":"bottle","stockQty":9,"stockUnit":"bottle","stockUpdatedAt":null,"packSize":"750 ml trigger"},{"id":"foh-018","group":"foh","cat":"foh-4","name":"Glass & Mirror Polish Spray","ar":"بخاخ تلميع الزجاج والمرايا","stock":"6","unit":"bottle","stockQty":6,"stockUnit":"bottle","stockUpdatedAt":null,"packSize":"750 ml"},{"id":"foh-019","group":"foh","cat":"foh-4","name":"Microfiber Polishing Cloths (Glass & Cutlery)","ar":"فوط مايكروفايبر لتنشيف الكؤوس والستيل","stock":"20","unit":"piece","stockQty":20,"stockUnit":"piece","stockUpdatedAt":null,"packSize":"Lint-free"},{"id":"bar-001","group":"bar","cat":"bar-0","name":"Tito's","ar":"","stock":"8","oldRequest":"4","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-002","group":"bar","cat":"bar-0","name":"Grapefruti Vodka","ar":"","stock":"4","oldRequest":"4","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-003","group":"bar","cat":"bar-0","name":"Russian Standard","ar":"","stock":"6","oldRequest":"4","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-004","group":"bar","cat":"bar-0","name":"Russian Platinum","ar":"","stock":"5","oldRequest":"2","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-005","group":"bar","cat":"bar-0","name":"Stolichnaya Red","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-006","group":"bar","cat":"bar-0","name":"Stolichnaya Gold","ar":"","stock":"4","oldRequest":"3","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-007","group":"bar","cat":"bar-0","name":"Haku Jap","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-008","group":"bar","cat":"bar-0","name":"Beluga Noble","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-009","group":"bar","cat":"bar-0","name":"Beluga Gold Line","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-010","group":"bar","cat":"bar-0","name":"Beluga Transatlantic","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-011","group":"bar","cat":"bar-0","name":"Beluga Alura","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-012","group":"bar","cat":"bar-0","name":"Imperial","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-013","group":"bar","cat":"bar-0","name":"Belvedere","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-014","group":"bar","cat":"bar-0","name":"Grey Goose","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-015","group":"bar","cat":"bar-0","name":"Ketel One","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-016","group":"bar","cat":"bar-0","name":"Deep Laddy","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-017","group":"bar","cat":"bar-0","name":"Chopin","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-018","group":"bar","cat":"bar-1","name":"Captain Morgan White","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-019","group":"bar","cat":"bar-1","name":"Captain Morgan Spice","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-020","group":"bar","cat":"bar-1","name":"Captain Morgan Black","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-021","group":"bar","cat":"bar-1","name":"Havana Club Gold","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-022","group":"bar","cat":"bar-1","name":"Bacardi Silver","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-023","group":"bar","cat":"bar-1","name":"Bacardi Gold","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-024","group":"bar","cat":"bar-1","name":"Diplomatico White","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-025","group":"bar","cat":"bar-1","name":"Diplomatico Reserva","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-026","group":"bar","cat":"bar-1","name":"Pyrat XO","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-027","group":"bar","cat":"bar-2","name":"Gordon's Dry","ar":"","stock":"8","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-028","group":"bar","cat":"bar-2","name":"Bombay Sapphire","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-029","group":"bar","cat":"bar-2","name":"Tanqueray","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-030","group":"bar","cat":"bar-2","name":"Tanqueray Ten","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-031","group":"bar","cat":"bar-2","name":"Hendrick's","ar":"","stock":"10","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-032","group":"bar","cat":"bar-2","name":"Beefeater","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-033","group":"bar","cat":"bar-2","name":"Monkey 47","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-034","group":"bar","cat":"bar-2","name":"Sipsmith","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-035","group":"bar","cat":"bar-2","name":"Bathtub","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-036","group":"bar","cat":"bar-2","name":"Gin Mari","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-037","group":"bar","cat":"bar-2","name":"Mistral Rose","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-038","group":"bar","cat":"bar-2","name":"Bulldog","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-039","group":"bar","cat":"bar-3","name":"Jose Cuervo Silver","ar":"","stock":"12","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-040","group":"bar","cat":"bar-3","name":"Jose Cuervo Gold","ar":"","stock":"12","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-041","group":"bar","cat":"bar-3","name":"1800 Blanco","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-042","group":"bar","cat":"bar-3","name":"1800 Reposado","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-043","group":"bar","cat":"bar-3","name":"1800 Anejo","ar":"","stock":"10/8","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-044","group":"bar","cat":"bar-3","name":"1800 Cristalino","ar":"","stock":"10/8","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-045","group":"bar","cat":"bar-3","name":"Patron Silver","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-046","group":"bar","cat":"bar-3","name":"Patron Anejo","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-047","group":"bar","cat":"bar-3","name":"Patron Reposado","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-048","group":"bar","cat":"bar-3","name":"Casamigos Blanco","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-049","group":"bar","cat":"bar-3","name":"Casamigos Reposado","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-050","group":"bar","cat":"bar-3","name":"Casamigos Anejo","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-051","group":"bar","cat":"bar-3","name":"Don Julio Silver","ar":"","stock":"12","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-052","group":"bar","cat":"bar-3","name":"Don Julio Anejo","ar":"","stock":"12","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-053","group":"bar","cat":"bar-3","name":"Don Julio Reposado","ar":"","stock":"12","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-054","group":"bar","cat":"bar-3","name":"Don Julio 1942","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-055","group":"bar","cat":"bar-3","name":"Clase Azul Plata","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-056","group":"bar","cat":"bar-3","name":"Clase Azul Reposado","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-057","group":"bar","cat":"bar-3","name":"Clase Azul Anejo","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-058","group":"bar","cat":"bar-3","name":"Clase Azul Gold","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-059","group":"bar","cat":"bar-3","name":"Olmeca Silver","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-060","group":"bar","cat":"bar-3","name":"Olmeca Gold","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-061","group":"bar","cat":"bar-3","name":"Ocho Plata","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-062","group":"bar","cat":"bar-3","name":"Ocho Reposado","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-063","group":"bar","cat":"bar-3","name":"Ocho Anejo","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-064","group":"bar","cat":"bar-3","name":"Lanazul Silver","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-065","group":"bar","cat":"bar-3","name":"Lanazul Reposado","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-066","group":"bar","cat":"bar-3","name":"Lanazul Anejo","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-067","group":"bar","cat":"bar-3","name":"Lanazul Primero","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-068","group":"bar","cat":"bar-3","name":"Komos Reposado","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-069","group":"bar","cat":"bar-3","name":"Komos Anejo","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-070","group":"bar","cat":"bar-3","name":"Teremana Blanco","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-071","group":"bar","cat":"bar-3","name":"Teremana Reposado","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-072","group":"bar","cat":"bar-3","name":"Teremana Anejo","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-073","group":"bar","cat":"bar-3","name":"Codigo 1530 Blanco","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-074","group":"bar","cat":"bar-3","name":"Hurradura Plata","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-075","group":"bar","cat":"bar-3","name":"Hurradura Reposado","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-076","group":"bar","cat":"bar-3","name":"Hurradura Anejo","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-077","group":"bar","cat":"bar-3","name":"Hurradura Ultra Anejo","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-078","group":"bar","cat":"bar-3","name":"Hurradura Legand","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-079","group":"bar","cat":"bar-3","name":"Hurradura Suprema","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-080","group":"bar","cat":"bar-3","name":"Los Danzantes Mezcal","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-081","group":"bar","cat":"bar-3","name":"Se Busca Mezcal","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-082","group":"bar","cat":"bar-4","name":"Wild Turkey","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-083","group":"bar","cat":"bar-4","name":"Wood Ford","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-084","group":"bar","cat":"bar-4","name":"Jack Daniel's","ar":"","stock":"5","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-085","group":"bar","cat":"bar-4","name":"J&B Rare","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-086","group":"bar","cat":"bar-4","name":"Chivas Regal 12","ar":"","stock":"8","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-087","group":"bar","cat":"bar-4","name":"Chivas Regal 18","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-088","group":"bar","cat":"bar-4","name":"Chivas XV","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-089","group":"bar","cat":"bar-4","name":"JW Red Label","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-090","group":"bar","cat":"bar-4","name":"JW Black Label","ar":"","stock":"10","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-091","group":"bar","cat":"bar-4","name":"JW Doubel Black","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-092","group":"bar","cat":"bar-4","name":"JW Gold Label","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-093","group":"bar","cat":"bar-4","name":"JW Blue Label","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-094","group":"bar","cat":"bar-4","name":"JW Platinum 18","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-095","group":"bar","cat":"bar-4","name":"Monkey Shoulder","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-096","group":"bar","cat":"bar-4","name":"Royal Salute","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-097","group":"bar","cat":"bar-4","name":"Glenfiddich 12","ar":"","stock":"5","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-098","group":"bar","cat":"bar-4","name":"Glenfiddich 15","ar":"","stock":"5","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-099","group":"bar","cat":"bar-4","name":"Glenfiddich 18","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-100","group":"bar","cat":"bar-4","name":"Glenfiddich 21","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-101","group":"bar","cat":"bar-4","name":"Macallan 12","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-102","group":"bar","cat":"bar-4","name":"Macallan 18","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-103","group":"bar","cat":"bar-4","name":"Glenmorange 12","ar":"","stock":"5","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-104","group":"bar","cat":"bar-4","name":"Wormtub 10","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-105","group":"bar","cat":"bar-4","name":"Laphroaig 10","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-106","group":"bar","cat":"bar-4","name":"Glenfarclas 10","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-107","group":"bar","cat":"bar-4","name":"Glenfarclas12","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-108","group":"bar","cat":"bar-4","name":"Glenfarclas 15","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-109","group":"bar","cat":"bar-4","name":"Auchentoshan singel malt","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-110","group":"bar","cat":"bar-4","name":"JW Swing","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-111","group":"bar","cat":"bar-5","name":"Hennessy V.S","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-112","group":"bar","cat":"bar-5","name":"Hennessy X.O","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-113","group":"bar","cat":"bar-5","name":"Hennessy V.S.O.P","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-114","group":"bar","cat":"bar-5","name":"Camus V.S","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-115","group":"bar","cat":"bar-5","name":"Camus V.S.O.P","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-116","group":"bar","cat":"bar-5","name":"Camus X.O","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-117","group":"bar","cat":"bar-5","name":"Remy Martin V.S.O.P","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-118","group":"bar","cat":"bar-6","name":"PETRA Gluten Free","ar":"","stock":"48","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-119","group":"bar","cat":"bar-6","name":"ASAHI","ar":"","stock":"120","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-120","group":"bar","cat":"bar-6","name":"CARAKALE Blue Valley","ar":"","stock":"48","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-121","group":"bar","cat":"bar-6","name":"ESTRELLA","ar":"","stock":"40","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-122","group":"bar","cat":"bar-7","name":"Aperol","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-123","group":"bar","cat":"bar-7","name":"Campari","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-124","group":"bar","cat":"bar-7","name":"Grand Marnier","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-125","group":"bar","cat":"bar-7","name":"Baileys Irish Cream","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-126","group":"bar","cat":"bar-7","name":"Kahlua \"coffee Liqueur","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-127","group":"bar","cat":"bar-7","name":"Frangelico","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-128","group":"bar","cat":"bar-7","name":"Sour Apple","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-129","group":"bar","cat":"bar-7","name":"Melon","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-130","group":"bar","cat":"bar-7","name":"Passoa \"Passiona Fruit Liqueur\"","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-131","group":"bar","cat":"bar-7","name":"Southern Compfort","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-132","group":"bar","cat":"bar-7","name":"Disaronno","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-133","group":"bar","cat":"bar-7","name":"Amaretto","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-134","group":"bar","cat":"bar-7","name":"Lemoncino","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-135","group":"bar","cat":"bar-7","name":"Jagermeister","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-136","group":"bar","cat":"bar-7","name":"Malibu","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-137","group":"bar","cat":"bar-7","name":"Peach Schnapps","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-138","group":"bar","cat":"bar-7","name":"Vermouth Extra Dry","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-139","group":"bar","cat":"bar-7","name":"Vermouth Bianco","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-140","group":"bar","cat":"bar-7","name":"Vermouth Rosso","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-141","group":"bar","cat":"bar-7","name":"Dolin White Vermouth","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-142","group":"bar","cat":"bar-7","name":"Skinos","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-143","group":"bar","cat":"bar-7","name":"Sambuca White","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-144","group":"bar","cat":"bar-7","name":"Sambuca Black","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-145","group":"bar","cat":"bar-7","name":"Farnet Branca","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-146","group":"bar","cat":"bar-7","name":"Gold Schlager","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-147","group":"bar","cat":"bar-7","name":"Fire Ball","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-148","group":"bar","cat":"bar-7","name":"Trpile Sec","ar":"","stock":"8","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-149","group":"bar","cat":"bar-7","name":"Blue Curacao","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-150","group":"bar","cat":"bar-7","name":"Galliano","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-151","group":"bar","cat":"bar-7","name":"Cointreau","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-152","group":"bar","cat":"bar-7","name":"Grappa","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-153","group":"bar","cat":"bar-7","name":"Elderflower Liqueur","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-154","group":"bar","cat":"bar-7","name":"PER SE","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-155","group":"bar","cat":"bar-7","name":"Apricot Liqueur","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-156","group":"bar","cat":"bar-7","name":"Amaro Liqueur","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-157","group":"bar","cat":"bar-7","name":"Cocchi Americano","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-158","group":"bar","cat":"bar-7","name":"Cherry Liqueur","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-159","group":"bar","cat":"bar-7","name":"Cocchi Rosa","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-160","group":"bar","cat":"bar-7","name":"Maraschino Liqueur","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-161","group":"bar","cat":"bar-7","name":"Lychee Liqueur","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-162","group":"bar","cat":"bar-7","name":"Lillet Blanc","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-163","group":"bar","cat":"bar-7","name":"Suze","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-164","group":"bar","cat":"bar-7","name":"Crème De Cacao","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-165","group":"bar","cat":"bar-7","name":"Bols flv","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":true,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-166","group":"bar","cat":"bar-7","name":"Bols flv","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":true,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-167","group":"bar","cat":"bar-7","name":"Bols flv","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":true,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-168","group":"bar","cat":"bar-7","name":"Bols flv","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":true,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-169","group":"bar","cat":"bar-8","name":"Passion fruit Puree","ar":"","stock":"6","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-170","group":"bar","cat":"bar-8","name":"Strawberry Puree","ar":"","stock":"3","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-171","group":"bar","cat":"bar-8","name":"Raspberry Puree","ar":"","stock":"3","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-172","group":"bar","cat":"bar-8","name":"Kiwi Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-173","group":"bar","cat":"bar-8","name":"Watermelon Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-174","group":"bar","cat":"bar-8","name":"Pineappel Puree","ar":"","stock":"2","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-175","group":"bar","cat":"bar-8","name":"Blueberry Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-176","group":"bar","cat":"bar-8","name":"Blackberry Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-177","group":"bar","cat":"bar-8","name":"Mango Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-178","group":"bar","cat":"bar-8","name":"Agave Puree","ar":"","stock":"3","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-179","group":"bar","cat":"bar-8","name":"Coconut Puree","ar":"","stock":"3","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-180","group":"bar","cat":"bar-8","name":"Peach Puree","ar":"","stock":"3","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-181","group":"bar","cat":"bar-8","name":"Vanilla Puree","ar":"","stock":"2","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-182","group":"bar","cat":"bar-8","name":"Melon Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-183","group":"bar","cat":"bar-8","name":"Lychee Puree","ar":"","stock":"2","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-184","group":"bar","cat":"bar-8","name":"Banana Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-185","group":"bar","cat":"bar-8","name":"Appel Juice","ar":"","stock":"5/2","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-186","group":"bar","cat":"bar-8","name":"Pineappel Juice","ar":"","stock":"6","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-187","group":"bar","cat":"bar-8","name":"Orange Juice","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-188","group":"bar","cat":"bar-8","name":"Cranberry Juice","ar":"","stock":"8","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-189","group":"bar","cat":"bar-8","name":"Tomato Juice","ar":"","stock":"5","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-190","group":"bar","cat":"bar-8","name":"Green Apple Juice","ar":"","stock":"2","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-191","group":"bar","cat":"bar-9","name":"Pepsi","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-192","group":"bar","cat":"bar-9","name":"Pepsi Diet","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-193","group":"bar","cat":"bar-9","name":"7up","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-194","group":"bar","cat":"bar-9","name":"7up Diet","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-195","group":"bar","cat":"bar-9","name":"Soda Water","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-196","group":"bar","cat":"bar-9","name":"Tonic","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-197","group":"bar","cat":"bar-9","name":"Bitter Lemon","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-198","group":"bar","cat":"bar-9","name":"Pink Lemonade","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-199","group":"bar","cat":"bar-9","name":"G Cranberry","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-200","group":"bar","cat":"bar-9","name":"G Cola Night","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-201","group":"bar","cat":"bar-9","name":"G Cola Night S.F","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-202","group":"bar","cat":"bar-9","name":"Ginger Ale","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-203","group":"bar","cat":"bar-9","name":"Thomas Henry Soda","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-204","group":"bar","cat":"bar-9","name":"Thomas Henry Tonic","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-205","group":"bar","cat":"bar-9","name":"Thomas Henry Ginger Beer","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-206","group":"bar","cat":"bar-9","name":"Thomas Henry Pink Greapfruti","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-207","group":"bar","cat":"bar-9","name":"Red Bull","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-208","group":"bar","cat":"bar-9","name":"Red Bull \"Sugar Free\"","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-209","group":"bar","cat":"bar-9","name":"Coconut Water","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-210","group":"bar","cat":"bar-10","name":"Water Small","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-211","group":"bar","cat":"bar-10","name":"Water Large","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-212","group":"bar","cat":"bar-10","name":"S.Pellegrino Small","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-213","group":"bar","cat":"bar-10","name":"S.Pellegrino Large","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-214","group":"bar","cat":"bar-11","name":"Angostura Bitters","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-215","group":"bar","cat":"bar-11","name":"Orange Bitters","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-216","group":"bar","cat":"bar-11","name":"Chocolate Bitters","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-217","group":"bar","cat":"bar-11","name":"Grapefruit Bitters","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-218","group":"bar","cat":"bar-12","name":"Tabasco Sauce","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-219","group":"bar","cat":"bar-12","name":"Worcestershire Sauce","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-220","group":"bar","cat":"bar-12","name":"Olive","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-221","group":"bar","cat":"bar-12","name":"Marchiano cherry","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-222","group":"bar","cat":"bar-12","name":"Aquafaba","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-223","group":"bar","cat":"bar-12","name":"Coconut Milk","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-224","group":"bar","cat":"bar-12","name":"Milk","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-225","group":"bar","cat":"bar-12","name":"Espresso","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-226","group":"bar","cat":"bar-12","name":"Tea","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-227","group":"bar","cat":"bar-12","name":"Brown Sugar","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-228","group":"bar","cat":"bar-12","name":"White Sugar","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-229","group":"bar","cat":"bar-12","name":"Tajin Spice","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-230","group":"bar","cat":"bar-12","name":"Sea Salt","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-231","group":"bar","cat":"bar-12","name":"Salt","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-232","group":"bar","cat":"bar-12","name":"Black Pepper","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-233","group":"bar","cat":"bar-12","name":"Monky Fruti","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-234","group":"bar","cat":"bar-12","name":"Rose Water","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-235","group":"bar","cat":"bar-12","name":"iSi CO2 Soda","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-236","group":"bar","cat":"bar-12","name":"iSi Nitro","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-237","group":"bar","cat":"bar-12","name":"Sticks","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-238","group":"bar","cat":"bar-12","name":"Toothpicks","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-239","group":"bar","cat":"bar-12","name":"Napkin","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-240","group":"bar","cat":"bar-12","name":"Straws","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-241","group":"bar","cat":"bar-12","name":"To Go Cups (Disposable Cup)","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-001","group":"wine","cat":"wine-0","name":"Marius by M. Chapoutier","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-002","group":"wine","cat":"wine-0","name":"Sirius","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-003","group":"wine","cat":"wine-0","name":"Chateau Haut Madrac","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-004","group":"wine","cat":"wine-0","name":"Chateau Margaux","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-005","group":"wine","cat":"wine-0","name":"Domaine Faiveley","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-006","group":"wine","cat":"wine-0","name":"Louis Eschenauer","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-007","group":"wine","cat":"wine-0","name":"Chapelle De La Trinite","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-008","group":"wine","cat":"wine-0","name":"Lions De Batailley","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-009","group":"wine","cat":"wine-0","name":"Secret De Famille","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-010","group":"wine","cat":"wine-0","name":"M.Chapoutier","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-011","group":"wine","cat":"wine-1","name":"Piccini","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-012","group":"wine","cat":"wine-1","name":"Frescobaldi Nipozzano","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-013","group":"wine","cat":"wine-1","name":"Mai","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-014","group":"wine","cat":"wine-1","name":"Antinori","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-015","group":"wine","cat":"wine-1","name":"GAJA","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-016","group":"wine","cat":"wine-1","name":"Banfi","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-017","group":"wine","cat":"wine-1","name":"CA'MAIOL","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-018","group":"wine","cat":"wine-1","name":"Villa Antinori","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-019","group":"wine","cat":"wine-1","name":"Fontanafredda","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-020","group":"wine","cat":"wine-1","name":"Bortolomilo","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-021","group":"wine","cat":"wine-1","name":"Stelle & Fortuna","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-022","group":"wine","cat":"wine-1","name":"Ornellaia","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-023","group":"wine","cat":"wine-1","name":"Fontanafredda (Barolo DOCG)","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-024","group":"wine","cat":"wine-2","name":"CVNE","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-025","group":"wine","cat":"wine-2","name":"Beronia Rioja Crianza","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-026","group":"wine","cat":"wine-2","name":"Marques De Riscal (Tinto XR)","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-027","group":"wine","cat":"wine-2","name":"Marques De Riscal (Reserve)","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-028","group":"wine","cat":"wine-3","name":"JR Reserve","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-029","group":"wine","cat":"wine-3","name":"Montes","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-030","group":"wine","cat":"wine-3","name":"Susana Balbo","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-031","group":"wine","cat":"wine-3","name":"Oyster Bay","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-032","group":"wine","cat":"wine-3","name":"LA Celia","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-033","group":"wine","cat":"wine-3","name":"Santa Digna","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-034","group":"wine","cat":"wine-3","name":"KWV","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-035","group":"wine","cat":"wine-4","name":"Louis Eschenauer","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-036","group":"wine","cat":"wine-4","name":"Domaine Albert Bichot","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-037","group":"wine","cat":"wine-4","name":"William Fevre","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-038","group":"wine","cat":"wine-4","name":"Barton & Guestier","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-039","group":"wine","cat":"wine-4","name":"De Ladoucette","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-040","group":"wine","cat":"wine-4","name":"Grand Regnard","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-041","group":"wine","cat":"wine-5","name":"Bottega","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-042","group":"wine","cat":"wine-5","name":"Fontanafredda (Gavi)","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-043","group":"wine","cat":"wine-5","name":"Banfi","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-044","group":"wine","cat":"wine-5","name":"CA'MAIOL","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-045","group":"wine","cat":"wine-5","name":"Danzante","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-046","group":"wine","cat":"wine-5","name":"LA Scolca","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-047","group":"wine","cat":"wine-5","name":"Frescobaldi","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-048","group":"wine","cat":"wine-6","name":"CVNE","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-049","group":"wine","cat":"wine-6","name":"Beronia","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-050","group":"wine","cat":"wine-7","name":"JR Reserve","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-051","group":"wine","cat":"wine-7","name":"Oyster Bay","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-052","group":"wine","cat":"wine-7","name":"KWV","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-053","group":"wine","cat":"wine-7","name":"Kia Ora","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-054","group":"wine","cat":"wine-7","name":"LA Scolca","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-055","group":"wine","cat":"wine-7","name":"Frescobaldi","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-056","group":"wine","cat":"wine-8","name":"JR Rose","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-057","group":"wine","cat":"wine-8","name":"Whispering Angel","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-058","group":"wine","cat":"wine-8","name":"Piccini","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-059","group":"wine","cat":"wine-8","name":"Susana Balbo","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-060","group":"wine","cat":"wine-9","name":"Bottega Brut","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-061","group":"wine","cat":"wine-9","name":"Bottega Rose","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-062","group":"wine","cat":"wine-9","name":"Prince Laurent","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-063","group":"wine","cat":"wine-9","name":"Most & Chandon Brut","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-064","group":"wine","cat":"wine-9","name":"Most & Chandon Rose","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-065","group":"wine","cat":"wine-9","name":"Louis Roederer","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-066","group":"wine","cat":"wine-9","name":"Dom Perignon","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-001","group":"fresh","cat":"fresh-fruit","name":"Lemon","ar":"ليمون","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-002","group":"fresh","cat":"fresh-fruit","name":"Lime","ar":"لايم","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-003","group":"fresh","cat":"fresh-fruit","name":"Orange","ar":"برتقال","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-004","group":"fresh","cat":"fresh-fruit","name":"Graepfruti","ar":"جريب فروت","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-005","group":"fresh","cat":"fresh-fruit","name":"Cucmber","ar":"خيار","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-006","group":"fresh","cat":"fresh-fruit","name":"Ginger","ar":"زنجبيل","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-007","group":"fresh","cat":"fresh-fruit","name":"Pineapple","ar":"أناناس","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-008","group":"fresh","cat":"fresh-fruit","name":"Kiwi","ar":"كيوي","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-009","group":"fresh","cat":"fresh-fruit","name":"Passion Fruti","ar":"باشن فروت","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-010","group":"fresh","cat":"fresh-fruit","name":"Apple","ar":"تفاح","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-011","group":"fresh","cat":"fresh-fruit","name":"Strawberry","ar":"فراولة","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-012","group":"fresh","cat":"fresh-fruit","name":"Blackberry","ar":"توت أسود","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-013","group":"fresh","cat":"fresh-fruit","name":"Raspberry","ar":"توت أحمر","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-014","group":"fresh","cat":"fresh-fruit","name":"Cherry Tomato","ar":"بندورة كرزية","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-015","group":"fresh","cat":"fresh-fruit","name":"Tomato","ar":"بندورة","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-016","group":"fresh","cat":"fresh-fruit","name":"Red Chilies","ar":"فلفل أحمر حار","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-017","group":"fresh","cat":"fresh-fruit","name":"Green Chilies","ar":"فلفل أخضر حار","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-018","group":"fresh","cat":"fresh-herb","name":"Edible Flowers","ar":"زهور صالحة للأكل","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-019","group":"fresh","cat":"fresh-herb","name":"Thyme","ar":"زعتر","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-020","group":"fresh","cat":"fresh-herb","name":"Mint","ar":"نعنع","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-021","group":"fresh","cat":"fresh-herb","name":"Basil","ar":"ريحان","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-022","group":"fresh","cat":"fresh-herb","name":"Rosemary","ar":"إكليل الجبل","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-023","group":"fresh","cat":"fresh-herb","name":"Shiso Leaves","ar":"أوراق شيزو","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-024","group":"fresh","cat":"fresh-fruit","name":"Shishito Peppers","ar":"فلفل شيشيتو","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""}]};

  let ordRoute = 'home'; // 'home' | 'types/<group>' | 'products/<cat>' | 'item/<id>' | 'complete/<cat>' | 'review'
  let ordForceAllGroups = false;
  let ordProductSearch = '';
  let ordQuickSearch = '';
  let ordQuickOnlyRequested = false;
  let ordReturnToReview = false;
  let ordIncludeStockInMsg = false;

  function emptyOrderState() {
    return {
      orderToken: 'ord-' + Date.now().toString(36),
      meta: {
        requester: (session && session.displayName) || S.me.name || '',
        orderDate: S.date || FOH.time.todayISO(),
        shift: 'Morning',
        destination: 'Store',
        priority: 'Normal',
        orderNote: '',
      },
      lines: {},
      visited: {},
      skipped: {},
      lastItem: null,
    };
  }

  function loadOrdersDB() {
    try {
      const raw = JSON.parse(localStorage.getItem(ORDERS_DB_KEY) || 'null');
      if (raw && raw.version === 2 && raw.catalog && raw.order) {
        // Ensure any new seed groups/categories/items exist
        Object.entries(ORD_SEED.groups).forEach(([gid, g]) => {
          if (!raw.catalog.groups[gid]) raw.catalog.groups[gid] = JSON.parse(JSON.stringify(g));
        });
        const catIds = new Set(raw.catalog.categories.map((c) => c.id));
        ORD_SEED.categories.forEach((c) => {
          if (!catIds.has(c.id)) raw.catalog.categories.unshift(JSON.parse(JSON.stringify(c)));
        });
        const itemIds = new Set(raw.catalog.items.map((i) => i.id));
        ORD_SEED.items.forEach((i) => {
          if (!itemIds.has(i.id)) raw.catalog.items.push(JSON.parse(JSON.stringify(i)));
        });
        raw.preferences = raw.preferences || { viewMode: 'step' };
        raw.order.visited = raw.order.visited || {};
        raw.order.skipped = raw.order.skipped || {};
        raw.order.lines = raw.order.lines || {};
        return raw;
      }
    } catch {}
    return {
      version: 2,
      catalog: JSON.parse(JSON.stringify(ORD_SEED)),
      order: emptyOrderState(),
      preferences: { viewMode: 'step' },
    };
  }

  let ordDB = loadOrdersDB();

  function saveOrdersDB() {
    try {
      localStorage.setItem(ORDERS_DB_KEY, JSON.stringify(ordDB));
    } catch {}
    updateOrderBadge();
  }

  function ordById(id) {
    return ordDB.catalog.items.find((i) => i.id === id);
  }
  function ordCat(cid) {
    return ordDB.catalog.categories.find((c) => c.id === cid);
  }
  function ordCatItems(cid) {
    return ordDB.catalog.items.filter((i) => i.cat === cid && !i.deletedAt);
  }
  function ordLine(id) {
    const it = ordById(id);
    return ordDB.order.lines[id] || { qty: 0, unit: (it && it.unit) || 'bottle', note: '', stock: '' };
  }
  function ordSelectedItems() {
    return ordDB.catalog.items.filter((i) => !i.deletedAt && ordLine(i.id).qty > 0);
  }
  function ordCatDone(cid) {
    return ordCatItems(cid).filter((i) => ordDB.order.visited[i.id]).length;
  }
  function ordCatSkipped(cid) {
    return ordCatItems(cid).filter((i) => ordDB.order.skipped[i.id]).length;
  }
  function ordPendingItem(cid) {
    return ordCatItems(cid).find((i) => !ordDB.order.visited[i.id] && !ordDB.order.skipped[i.id]);
  }
  function ordUnitText(n, u) {
    if (!u) return FOH.i18n.lang === 'ar' ? 'اختر الوحدة' : 'unit not set';
    return n === 1 ? (ORD_UNITS[u] || u).toLowerCase() : ORD_PLURALS[u] || u + 's';
  }
  function ordStockDenominator(i) {
    if (i.stockQty !== null && i.stockQty !== undefined) return String(i.stockQty);
    return /^\d+(\.\d+)?$/.test(i.stock || '') ? i.stock + '*' : '—';
  }
  function ordStockLabel(i) {
    if (i.stockQty !== null && i.stockQty !== undefined) {
      return i.stockQty + ' ' + ordUnitText(i.stockQty, i.stockUnit || i.unit);
    }
    return i.stock || (FOH.i18n.lang === 'ar' ? 'غير مسجّل' : 'Not recorded');
  }
  function ordStockRatioHint(i, u) {
    const ar = FOH.i18n.lang === 'ar';
    if (i.stockQty === null || i.stockQty === undefined) {
      if (/^\d+(\.\d+)?$/.test(i.stock || '')) {
        return ar ? '* مخزون مرجعي من ملف البار · الوحدة غير مؤكدة.' : '* File stock reference; unit/date unconfirmed.';
      }
      return i.stock
        ? (ar ? 'قيمة مخزون غير واضحة (' + i.stock + ') · يرجى التأكد.' : 'Unclear file value: ' + i.stock + '. Verify stock.')
        : (ar ? 'المخزون غير مسجّل بعد.' : 'Stock has not been recorded.');
    }
    return ar
      ? 'الكمية المطلوبة / المخزون المسجّل · لا يتم خصم المخزون تلقائيًا.'
      : 'Order / stock · ' + ordUnitText(2, u || i.unit) + '. Preparing an order does not deduct stock.';
  }
  function ordSkipRemaining(cid, afterId = null) {
    const list = ordCatItems(cid);
    const start = afterId ? list.findIndex((i) => i.id === afterId) + 1 : 0;
    list.slice(start).forEach((i) => {
      if (!ordDB.order.visited[i.id] && ordLine(i.id).qty === 0) {
        ordDB.order.skipped[i.id] = true;
      }
    });
  }

  function allowedGroupsForCurrentRole() {
    const entries = Object.entries(ordDB.catalog.groups);
    if (ordForceAllGroups || !session || session.isManager) return entries;
    const roleLower = String(session.roleName || '').toLowerCase();
    const matched = entries.filter(([, g]) => Array.isArray(g.roles) && g.roles.includes(roleLower));
    return matched.length ? matched : entries;
  }

  function markWarehouseChecklistItemDone() {
    let targetId = null;
    S.tpl.sections.forEach((sec) => {
      sec.items.forEach((it) => {
        if (/warehouse|المستودع/i.test(it.text + ' ' + (it.textAr || ''))) targetId = it.id;
      });
    });
    if (targetId && !S.run.checked[targetId]) {
      S.run.checked[targetId] = FOH.time.nowHM();
      FOH.store.saveRun(S.date, S.run);
      apiCall('POST', '/v1/foh-opening/runs/tick', {
        business_date: S.date,
        sheet_type: 'opening',
        item_ids: [targetId],
        checked: true,
        at_hm: FOH.time.nowHM(),
        by_name: (session && session.displayName) || S.me.name || 'Staff',
      });
      FOH.edit.toast(t('ordAutoTickNote'));
    }
  }

  function updateOrderBadge() {
    const count = ordSelectedItems().length;
    const badge = $('badgeOrders');
    if (badge) {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    }
    const lbl = $('ordersTabLbl');
    if (lbl) lbl.textContent = t('ordersTab');
  }

  function ordGo(nextRoute) {
    ordRoute = nextRoute || 'home';
    const root = $('ordersView');
    if (root) {
      renderOrdersView(root);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function promptEditStock(item) {
    const ar = FOH.i18n.lang === 'ar';
    const rawQty = prompt(
      ar
        ? `تحديث المخزون الفعلي للصنف "${item.name}":\n(القيمة الحالية: ${ordStockLabel(item)})`
        : `Update recorded stock count for "${item.name}":\n(Current: ${ordStockLabel(item)})`,
      item.stockQty !== null && item.stockQty !== undefined ? String(item.stockQty) : item.stock || '0'
    );
    if (rawQty === null) return;
    const qty = Number(rawQty.trim());
    if (!Number.isFinite(qty) || qty < 0 || qty > 99999) {
      return alert(ar ? 'يرجى إدخال رقم صحيح للمخزون.' : 'Please enter a valid stock number.');
    }
    item.stockQty = Math.round(qty * 100) / 100;
    item.stockUnit = item.stockUnit || item.unit || 'bottle';
    item.stockUpdatedAt = new Date().toISOString();
    saveOrdersDB();
    renderOrdersView($('ordersView'));
  }

  function buildOrdBreadcrumbs(groupKey, catId, tailLabel) {
    const ar = FOH.i18n.lang === 'ar';
    const nav = el('nav', 'ord-crumbs');
    const homeBtn = el('button', '', ar ? 'الأقسام (Sections)' : 'Sections');
    homeBtn.type = 'button';
    homeBtn.addEventListener('click', () => ordGo('home'));
    nav.append(homeBtn);

    if (groupKey && ordDB.catalog.groups[groupKey]) {
      nav.append(el('span', '', '›'));
      const g = ordDB.catalog.groups[groupKey];
      const gBtn = el('button', '', ar ? g.nameAr || g.name : g.name);
      gBtn.type = 'button';
      gBtn.addEventListener('click', () => ordGo('types/' + groupKey));
      nav.append(gBtn);
    }
    if (catId && ordCat(catId)) {
      nav.append(el('span', '', '›'));
      const c = ordCat(catId);
      const cBtn = el('button', '', ar ? c.nameAr || c.name : c.name);
      cBtn.type = 'button';
      cBtn.addEventListener('click', () => ordGo('products/' + catId));
      nav.append(cBtn);
    }
    if (tailLabel) {
      nav.append(el('span', '', '›'), el('span', '', tailLabel));
    }
    return nav;
  }

  function buildOrdViewSwitch(catId, activeMode) {
    const sw = el('div', 'ord-view-switch');
    const stepBtn = el(
      'button',
      activeMode === 'step' ? 'on' : '',
      FOH.i18n.lang === 'ar' ? '▣ صنفًا بصنف (Step-by-step)' : '▣ Step-by-step'
    );
    stepBtn.type = 'button';
    stepBtn.addEventListener('click', () => {
      ordDB.preferences.viewMode = 'step';
      saveOrdersDB();
      const pending = ordPendingItem(catId) || ordCatItems(catId)[0];
      ordGo(pending ? 'item/' + pending.id : 'products/' + catId);
    });

    const listBtn = el(
      'button',
      activeMode === 'list' ? 'on' : '',
      FOH.i18n.lang === 'ar' ? '☷ القائمة السريعة (Quick list)' : '☷ Quick list'
    );
    listBtn.type = 'button';
    listBtn.addEventListener('click', () => {
      ordDB.preferences.viewMode = 'list';
      saveOrdersDB();
      ordGo('products/' + catId);
    });

    sw.append(stepBtn, listBtn);
    return sw;
  }

  function buildOrdWhatsAppText(includeStock) {
    const m = ordDB.order.meta;
    const requester = m.requester || (session && session.displayName) || S.me.name || 'Staff';
    const orderDate = m.orderDate || S.date;
    const list = ordSelectedItems();
    const lines = [
      '*CEEN & OASIS | WAREHOUSE & BAR ORDER*',
      '',
      `Date: ${orderDate}`,
      `Prepared by: ${requester}`,
      `To: ${m.destination || 'Store'} | Shift: ${m.shift || 'Morning'}`,
      `Priority: ${m.priority || 'Normal'}`,
      `Requested items: ${list.length}`,
    ];

    let lastCat = '';
    let idx = 0;
    list.forEach((i) => {
      const l = ordLine(i.id);
      if (lastCat !== i.cat) {
        const gName = (ordDB.catalog.groups[i.group] && ordDB.catalog.groups[i.group].name) || i.group;
        const cName = (ordCat(i.cat) && ordCat(i.cat).name) || i.cat;
        lines.push(`\n*${(gName + ' / ' + cName).toUpperCase()}*`);
        lastCat = i.cat;
      }
      lines.push(`${++idx}. ${i.name}${i.ar ? ' (' + i.ar + ')' : ''} — *${l.qty} ${ordUnitText(l.qty, l.unit || i.unit)}*`);
      if (i.packSize) lines.push(`   Size / pack: ${i.packSize}`);
      if (l.note) lines.push(`   Note: ${l.note}`);
      if (includeStock) {
        lines.push(`   Stock: ${ordStockLabel(i)}`);
      }
    });

    if (m.orderNote) {
      lines.push('\n*ORDER NOTE*\n' + m.orderNote);
    }
    lines.push('\nPlease confirm availability and any shortages.');
    return lines.join('\n');
  }

  function renderOrdersView(root) {
    if (!root) return;
    root.replaceChildren();
    updateOrderBadge();

    const ar = FOH.i18n.lang === 'ar';
    const selectedList = ordSelectedItems();

    // Top Hero Header with Role Badge, Show All Toggle, and Basket Button
    const hero = el('div', 'ord-hero');
    const roleTitle = ar ? (session && session.roleAr) || 'مشرف' : (session && session.roleName) || 'Supervisor';
    const leftHead = el('div', '');
    leftHead.style.display = 'flex';
    leftHead.style.alignItems = 'center';
    leftHead.style.gap = '8px';
    leftHead.style.flexWrap = 'wrap';
    leftHead.append(
      el('b', '', '🛒 ' + t('ordTitle')),
      el('span', 'ord-role-badge', '🪪 ' + t('ordRoleFilter', { role: roleTitle }))
    );
    hero.append(leftHead);

    const actions = el('div', 'ord-top-actions');
    if (session && !session.isManager) {
      const toggleAll = el('button', 'btn', ordForceAllGroups ? '🔒 ' + roleTitle : '🔓 ' + t('ordShowAll'));
      toggleAll.type = 'button';
      toggleAll.style.minHeight = '34px';
      toggleAll.style.padding = '0 10px';
      toggleAll.style.fontSize = '0.75rem';
      toggleAll.addEventListener('click', () => {
        ordForceAllGroups = !ordForceAllGroups;
        ordGo('home');
      });
      actions.append(toggleAll);
    }

    const basketBtn = el('button', 'ord-basket-btn');
    basketBtn.type = 'button';
    basketBtn.append(
      el('span', '', ar ? 'مراجعة الطلبية' : 'Order'),
      el('span', 'ord-basket-badge', String(selectedList.length))
    );
    basketBtn.addEventListener('click', () => ordGo('review'));
    actions.append(basketBtn);
    hero.append(actions);
    root.append(hero);

    const [page, param] = (ordRoute || 'home').split('/');

    // Helper for sticky bottom bar
    const appendBottomBar = (buildFn) => {
      const bar = el('nav', 'ord-bottom-bar');
      const inner = el('div', 'ord-bottom-inner');
      buildFn(inner);
      bar.append(inner);
      root.append(bar);
    };

    const appendGeneralBottomBar = () => {
      appendBottomBar((inner) => {
        const info = el('div', '');
        info.style.minWidth = '110px';
        info.append(
          el('strong', '', String(selectedList.length) + ' '),
          el('span', '', ar ? 'أصناف مطلوبة' : 'items in order')
        );
        const revBtn = el('button', 'btn primary', ar ? 'مراجعة وإرسال الطلبية ←' : 'Review order →');
        revBtn.type = 'button';
        revBtn.addEventListener('click', () => ordGo('review'));
        inner.append(info, revBtn);
      });
    };

    // =========================================================================
    // PAGE 1: HOME (Sections: FOH Store Supplies, Bar, Wine, Fresh & Fruti Bar)
    // =========================================================================
    if (page === 'home') {
      root.append(buildOrdBreadcrumbs());
      root.append(
        el('div', 'ord-kicker', '01 / CHOOSE A SECTION · اختر القسم'),
        el('h2', 'ord-page-title', ar ? 'تحضير طلبية الصالة والبار' : "Let's stock the floor & bar."),
        el(
          'p',
          'ord-page-sub',
          ar
            ? 'اختر القسم ثم الكاتيجوري. يمكنك الجرد صنفًا بصنف (Step-by-step) أو من القائمة السريعة (Quick list).'
            : 'Choose a section, then a category. Check items one at a time (Step-by-step) or use Quick list.'
        )
      );

      if (ordDB.order.lastItem && ordById(ordDB.order.lastItem)) {
        const lastIt = ordById(ordDB.order.lastItem);
        const resBox = el('div', 'ord-resume-box');
        const txt = el('div', '');
        txt.append(
          el('small', '', ar ? 'أكمل من حيث توقفت:' : 'Continue where you left off:'),
          el('b', '', ' ' + lastIt.name)
        );
        const contBtn = el('button', 'btn primary', ar ? 'متابعة ←' : 'Continue →');
        contBtn.type = 'button';
        contBtn.style.minHeight = '36px';
        contBtn.addEventListener('click', () => ordGo('item/' + lastIt.id));
        resBox.append(txt, contBtn);
        root.append(resBox);
      }

      const secCards = el('div', 'ord-sec-cards');
      const allowed = allowedGroupsForCurrentRole();
      allowed.forEach(([gid, g], idx) => {
        const gItems = ordDB.catalog.items.filter((i) => i.group === gid && !i.deletedAt);
        const gCats = ordDB.catalog.categories.filter((c) => c.group === gid && !c.deletedAt);
        const reqInGroup = gItems.filter((i) => ordLine(i.id).qty > 0).length;

        const btn = el('button', 'ord-sec-card' + (idx === 0 ? ' featured' : ''));
        btn.type = 'button';
        const glyph = el('span', 'ord-sec-glyph', g.icon || '🍾');
        const body = el('span', 'ord-sec-body');
        body.append(
          el('b', '', (ar ? g.nameAr || g.name : g.name) + (reqInGroup ? ` (${reqInGroup})` : '')),
          el(
            'small',
            '',
            `${ar ? g.subAr || g.sub : g.sub} · ${gItems.length} ${ar ? 'صنف' : 'items'} · ${gCats.length} ${ar ? 'كاتيجوري' : 'categories'}`
          )
        );
        const arr = el('span', 'ord-sec-arrow', ar ? '←' : '→');
        btn.append(glyph, body, arr);
        btn.addEventListener('click', () => ordGo('types/' + gid));
        secCards.append(btn);
      });
      root.append(secCards);
      appendGeneralBottomBar();
      return;
    }

    // =========================================================================
    // PAGE 2: TYPES / CATEGORIES GRID INSIDE A SECTION (types/:group)
    // =========================================================================
    if (page === 'types' && ordDB.catalog.groups[param]) {
      const gid = param;
      const g = ordDB.catalog.groups[gid];
      const cats = ordDB.catalog.categories.filter((c) => c.group === gid && !c.deletedAt);

      root.append(buildOrdBreadcrumbs(gid));
      root.append(
        el('div', 'ord-kicker', '02 / CHOOSE A CATEGORY · اختر الكاتيجوري'),
        el('h2', 'ord-page-title', ar ? g.nameAr || g.name : g.name),
        el('p', 'ord-page-sub', ar ? 'اختر الكاتيجوري لبدء فحص الأصناف وتحديد الكميات المطلوبة.' : 'Pick a category to check items and enter order quantities.')
      );

      const grid = el('div', 'ord-type-grid');
      cats.forEach((c) => {
        const list = ordCatItems(c.id);
        const done = ordCatDone(c.id);
        const skipped = ordCatSkipped(c.id);
        const ordered = list.filter((i) => ordLine(i.id).qty > 0).length;
        const pct = list.length ? Math.round((100 * done) / list.length) : 0;

        const card = el('button', 'ord-type-card');
        card.type = 'button';

        const top = el('div', 'ord-type-top');
        top.append(
          el('span', '', list.length && done + skipped === list.length ? '✓' : '◦'),
          ordered ? el('span', 'ord-picked-pill', ordered + (ar ? ' مطلوب' : ' ordered')) : el('span', '', '')
        );

        const title = el('b', '', ar ? c.nameAr || c.name : c.name);
        const bottom = el('div', 'ord-type-bottom');
        bottom.append(
          el(
            'span',
            '',
            `${list.length} ${ar ? 'صنف' : 'items'}${done ? ` · ${done} ✓` : ''}${skipped ? ` · ${skipped} ↷` : ''}`
          ),
          el('span', '', ar ? '←' : '→')
        );

        const rail = el('div', 'ord-rail');
        const fill = el('div', '');
        fill.style.width = pct + '%';
        rail.append(fill);

        card.append(top, title, bottom, rail);
        card.addEventListener('click', () => ordGo('products/' + c.id));
        grid.append(card);
      });

      root.append(grid);
      appendGeneralBottomBar();
      return;
    }

    // =========================================================================
    // PAGE 3: CATEGORY ITEMS (products/:cat) — STEP-BY-STEP OVERVIEW OR QUICK LIST
    // =========================================================================
    if (page === 'products' && ordCat(param)) {
      const c = ordCat(param);
      const allCatItems = ordCatItems(c.id);
      const isQuickList = ordDB.preferences.viewMode === 'list';

      root.append(buildOrdBreadcrumbs(c.group, c.id));
      root.append(
        el('div', 'ord-kicker', isQuickList ? '03 / QUICK LIST · القائمة السريعة' : '03 / STEP-BY-STEP · فحص الأصناف'),
        el('h2', 'ord-page-title', ar ? c.nameAr || c.name : c.name),
        el(
          'p',
          'ord-page-sub',
          isQuickList
            ? ar
              ? 'أدخل الكميات مباشرة في القائمة السريعة، أو انتقل إلى وضع صنفًا بصنف (Step-by-step).'
              : 'Enter quantities directly in Quick list, or switch to Step-by-step guided check.'
            : ar
            ? 'اضغط البدء لفحص الأصناف واحدًا تلو الآخر مع المخزون، أو انتقل إلى القائمة السريعة.'
            : 'Start guided item-by-item check with stock reference, or switch to Quick list.'
        )
      );

      root.append(buildOrdViewSwitch(c.id, isQuickList ? 'list' : 'step'));

      if (!isQuickList) {
        // ---- STEP-BY-STEP CATEGORY LANDING ----
        const pending = ordPendingItem(c.id);
        const startItem = pending || allCatItems[0];
        if (startItem) {
          const startBtn = el(
            'button',
            'btn primary',
            (pending && (ordCatDone(c.id) || ordCatSkipped(c.id))
              ? ar
                ? 'متابعة الأصناف غير المفحوصة'
                : 'Continue unchecked items'
              : ar
              ? 'البدء بفحص الأصناف (Step-by-step)'
              : 'Start checking items') + (ar ? ' ←' : ' →')
          );
          startBtn.type = 'button';
          startBtn.style.width = '100%';
          startBtn.style.minHeight = '48px';
          startBtn.style.marginBottom = '12px';
          startBtn.addEventListener('click', () => ordGo('item/' + startItem.id));
          root.append(startBtn);
        }

        const searchIn = el('input', 'in');
        searchIn.type = 'search';
        searchIn.placeholder = ar ? 'ابحث داخل هذا الكاتيجوري...' : 'Search this category…';
        searchIn.value = ordProductSearch;
        searchIn.style.marginBottom = '10px';
        searchIn.addEventListener('input', () => {
          ordProductSearch = searchIn.value;
          renderOrdersView(root);
          const inp = root.querySelector('input[type="search"]');
          if (inp) {
            inp.focus();
            inp.setSelectionRange(ordProductSearch.length, ordProductSearch.length);
          }
        });
        root.append(searchIn);

        const q = ordProductSearch.trim().toLowerCase();
        const filtered = allCatItems.filter(
          (i) => !q || (i.name + ' ' + (i.ar || '') + ' ' + i.id).toLowerCase().includes(q)
        );

        const metaRow = el('div', '');
        metaRow.style.display = 'flex';
        metaRow.style.justifyContent = 'space-between';
        metaRow.style.fontSize = '0.76rem';
        metaRow.style.color = 'var(--ink2)';
        metaRow.style.marginBottom = '8px';
        metaRow.append(
          el('span', '', `${filtered.length} ${ar ? 'صنف' : 'items'}`),
          el('span', '', `${ordCatDone(c.id)} ${ar ? 'مفحوص' : 'checked'} · ${ordCatSkipped(c.id)} ${ar ? 'مُتخطى' : 'skipped'}`)
        );
        root.append(metaRow);

        const listWrap = el('div', 'ord-product-list');
        filtered.forEach((i) => {
          const l = ordLine(i.id);
          const idxInCat = allCatItems.findIndex((x) => x.id === i.id) + 1;
          const isVisited = !!ordDB.order.visited[i.id];
          const isSkipped = !!ordDB.order.skipped[i.id];

          const row = el('button', 'ord-product-pick');
          row.type = 'button';
          const num = el('span', 'ord-pick-num' + (isVisited ? ' done' : ''), isVisited ? '✓' : isSkipped ? '↷' : String(idxInCat));
          const nm = el('span', 'ord-pick-name');
          nm.append(
            el('b', '', ar && i.ar ? `${i.ar} · ${i.name}` : i.name),
            el('small', '', `${ar ? 'المخزون' : 'Stock'}: ${ordStockLabel(i)}${i.packSize ? ' · ' + i.packSize : ''}`)
          );
          row.append(num, nm);
          if (l.qty > 0) {
            row.append(el('span', 'ord-pick-req', `${l.qty} ${ordUnitText(l.qty, l.unit || i.unit)}`));
          } else {
            row.append(el('span', '', ar ? '←' : '→'));
          }
          row.addEventListener('click', () => ordGo('item/' + i.id));
          listWrap.append(row);
        });
        root.append(listWrap);
        appendGeneralBottomBar();
        return;
      }

      // ---- QUICK LIST MODE (viewMode === 'list') ----
      const toolbar = el('div', 'ord-toolbar');
      const qSearch = el('input', 'in');
      qSearch.type = 'search';
      qSearch.placeholder = ar ? 'ابحث في القائمة السريعة...' : 'Search quick list…';
      qSearch.value = ordQuickSearch;
      qSearch.addEventListener('input', () => {
        ordQuickSearch = qSearch.value;
        renderOrdersView(root);
        const inp = root.querySelector('.ord-toolbar input');
        if (inp) {
          inp.focus();
          inp.setSelectionRange(ordQuickSearch.length, ordQuickSearch.length);
        }
      });

      const reqToggle = el(
        'button',
        'btn' + (ordQuickOnlyRequested ? ' primary' : ''),
        ar ? 'المطلوب فقط' : 'Requested only'
      );
      reqToggle.type = 'button';
      reqToggle.addEventListener('click', () => {
        ordQuickOnlyRequested = !ordQuickOnlyRequested;
        renderOrdersView(root);
      });
      toolbar.append(qSearch, reqToggle);
      root.append(toolbar);

      const q = ordQuickSearch.trim().toLowerCase();
      const visible = allCatItems.filter(
        (i) =>
          (!q || (i.name + ' ' + (i.ar || '') + ' ' + i.id).toLowerCase().includes(q)) &&
          (!ordQuickOnlyRequested || ordLine(i.id).qty > 0)
      );

      const statsLine = el(
        'p',
        'ord-page-sub',
        `${allCatItems.filter((i) => ordLine(i.id).qty > 0).length} ${ar ? 'مطلوب' : 'requested'} · ${ordCatDone(c.id)} ${ar ? 'مفحوص' : 'checked'} · ${ordCatSkipped(c.id)} ${ar ? 'مُتخطى' : 'skipped'}`
      );
      root.append(statsLine);

      visible.forEach((i) => {
        const l = ordLine(i.id);
        const qCard = el('article', 'ord-quick-card' + (l.qty > 0 ? ' has-order' : ''));

        const top = el('div', 'ord-quick-top');
        const titleBox = el('div', '');
        titleBox.append(
          el('b', '', ar && i.ar ? `${i.ar} · ${i.name}` : i.name),
          el('small', '', (i.packSize || c.name) + (i.ambiguous ? ' · ' + i.id : ''))
        );
        const stateText =
          l.qty > 0
            ? ar
              ? 'مطلوب'
              : 'Requested'
            : ordDB.order.skipped[i.id]
            ? ar
              ? 'مُتخطى'
              : 'Skipped'
            : ordDB.order.visited[i.id]
            ? ar
              ? 'تم فحصه'
              : 'Checked'
            : ar
            ? 'غير مفحوص'
            : 'Not checked';
        const statePill = el('span', 'ord-state-pill', stateText);
        top.append(titleBox, statePill);
        qCard.append(top);

        const ctrlRow = el('div', 'ord-qty-row');
        const stepper = el('div', 'ord-stepper-lg');
        const minus = el('button', '', '−');
        minus.type = 'button';
        const qtyIn = el('input', '');
        qtyIn.type = 'number';
        qtyIn.min = '0';
        qtyIn.max = '9999';
        qtyIn.step = ['kg', 'liter'].includes(l.unit || i.unit) ? '0.25' : '1';
        qtyIn.value = String(l.qty);

        const denom = el('span', 'ord-denom');
        denom.append('/ ', el('b', '', ordStockDenominator(i)));

        const plus = el('button', '', '+');
        plus.type = 'button';
        stepper.append(minus, qtyIn, denom, plus);

        const unitSel = el('select', 'in ord-unit-sel');
        Object.entries(ORD_UNITS).forEach(([uk, uLabel]) => {
          const opt = el('option', '', uLabel);
          opt.value = uk;
          opt.selected = uk === (l.unit || i.unit || 'bottle');
          unitSel.append(opt);
        });

        const updateQuickLine = (nextQty, nextUnit, nextNote) => {
          const cleanQ = Math.max(0, Math.min(9999, Math.round((Number(nextQty) || 0) * 100) / 100));
          ordDB.order.lines[i.id] = {
            qty: cleanQ,
            unit: nextUnit || l.unit || i.unit || 'bottle',
            note: nextNote !== undefined ? nextNote : l.note || '',
            stock: l.stock || '',
          };
          ordDB.order.visited[i.id] = true;
          delete ordDB.order.skipped[i.id];
          saveOrdersDB();
        };

        minus.addEventListener('click', () => {
          const step = ['kg', 'liter'].includes(unitSel.value) ? 0.25 : 1;
          updateQuickLine((Number(qtyIn.value) || 0) - step, unitSel.value);
          renderOrdersView(root);
        });
        plus.addEventListener('click', () => {
          const step = ['kg', 'liter'].includes(unitSel.value) ? 0.25 : 1;
          updateQuickLine((Number(qtyIn.value) || 0) + step, unitSel.value);
          renderOrdersView(root);
        });
        qtyIn.addEventListener('change', () => {
          updateQuickLine(qtyIn.value, unitSel.value);
          renderOrdersView(root);
        });
        unitSel.addEventListener('change', () => {
          updateQuickLine(qtyIn.value, unitSel.value);
          renderOrdersView(root);
        });

        ctrlRow.append(stepper, unitSel);
        qCard.append(ctrlRow);

        const subActions = el('div', '');
        subActions.style.display = 'flex';
        subActions.style.justifyContent = 'space-between';
        subActions.style.alignItems = 'center';
        subActions.style.marginTop = '8px';
        subActions.style.fontSize = '0.75rem';

        const stockBtn = el('button', '', `📦 ${ar ? 'تعديل المخزون' : 'Edit stock'} (${ordStockLabel(i)})`);
        stockBtn.type = 'button';
        stockBtn.style.border = '0';
        stockBtn.style.background = 'transparent';
        stockBtn.style.color = 'var(--accent)';
        stockBtn.style.fontWeight = '700';
        stockBtn.style.cursor = 'pointer';
        stockBtn.addEventListener('click', () => promptEditStock(i));

        const openItemBtn = el('button', '', ar ? 'فتح بطاقة الصنف ↗' : 'Open item card ↗');
        openItemBtn.type = 'button';
        openItemBtn.style.border = '0';
        openItemBtn.style.background = 'transparent';
        openItemBtn.style.color = 'var(--ink2)';
        openItemBtn.style.cursor = 'pointer';
        openItemBtn.addEventListener('click', () => ordGo('item/' + i.id));

        subActions.append(stockBtn, openItemBtn);
        qCard.append(subActions);
        root.append(qCard);
      });

      appendBottomBar((inner) => {
        const revBtn = el('button', 'btn', ar ? 'مراجعة الطلبية' : 'Review order');
        revBtn.type = 'button';
        revBtn.addEventListener('click', () => ordGo('review'));

        const doneCatBtn = el('button', 'btn primary', ar ? 'إنهاء هذا الكاتيجوري ←' : 'Done with category →');
        doneCatBtn.type = 'button';
        doneCatBtn.addEventListener('click', () => {
          allCatItems.forEach((i) => {
            if (ordLine(i.id).qty > 0) {
              ordDB.order.visited[i.id] = true;
              delete ordDB.order.skipped[i.id];
            }
          });
          ordSkipRemaining(c.id);
          saveOrdersDB();
          ordGo('complete/' + c.id);
        });
        inner.append(revBtn, doneCatBtn);
      });
      return;
    }

    // =========================================================================
    // PAGE 4: SINGLE ITEM STEP-BY-STEP CARD (item/:id)
    // =========================================================================
    if (page === 'item' && ordById(param)) {
      const i = ordById(param);
      const c = ordCat(i.cat);
      const g = ordDB.catalog.groups[i.group];
      const list = ordCatItems(i.cat);
      const idx = list.findIndex((x) => x.id === i.id);
      const l = ordLine(i.id);

      ordDB.order.lastItem = i.id;
      saveOrdersDB();

      root.append(buildOrdBreadcrumbs(i.group, i.cat));
      root.append(buildOrdViewSwitch(i.cat, 'step'));

      const progHead = el('div', '');
      progHead.style.display = 'flex';
      progHead.style.justifyContent = 'space-between';
      progHead.style.alignItems = 'center';
      progHead.style.fontSize = '0.8rem';
      progHead.style.color = 'var(--ink2)';
      progHead.append(
        el('span', '', ar ? `الصنف ${idx + 1} من ${list.length}` : `Item ${idx + 1} of ${list.length}`)
      );
      const pickOtherBtn = el('button', '', ar ? 'اختر صنفًا آخر ☷' : 'Choose another item ☷');
      pickOtherBtn.type = 'button';
      pickOtherBtn.style.border = '0';
      pickOtherBtn.style.background = 'transparent';
      pickOtherBtn.style.color = 'var(--accent)';
      pickOtherBtn.style.fontWeight = '700';
      pickOtherBtn.style.cursor = 'pointer';
      pickOtherBtn.addEventListener('click', () => ordGo('products/' + i.cat));
      progHead.append(pickOtherBtn);
      root.append(progHead);

      const rail = el('div', 'ord-rail');
      const fill = el('div', '');
      fill.style.width = Math.round((100 * (idx + 1)) / Math.max(1, list.length)) + '%';
      rail.append(fill);
      root.append(rail);

      const card = el('article', 'ord-item-card');
      const head = el('div', 'ord-item-head');
      head.append(el('span', 'ord-sec-glyph', (g && g.icon) || '🍾'));
      const titleBox = el('div', 'ord-item-Title');
      titleBox.append(
        el('small', '', ar ? c.nameAr || c.name : c.name),
        el('h3', '', ar && i.ar ? `${i.ar} · ${i.name}` : i.name),
        el('small', '', i.packSize || i.id.toUpperCase())
      );
      head.append(titleBox);
      card.append(head);

      // Stock Panel
      const stockBox = el('div', 'ord-stock-panel');
      const stockLeft = el('div', '');
      stockLeft.append(
        el(
          'b',
          '',
          i.stockQty !== null && i.stockQty !== undefined
            ? ar
              ? 'المخزون الفعلي المسجّل'
              : 'Recorded stock'
            : ar
            ? 'المخزون المرجعي في ملف البار'
            : 'Stock in source file'
        ),
        el(
          'small',
          '',
          i.stockQty !== null && i.stockQty !== undefined
            ? ar
              ? 'مؤكد على هذا الجهاز'
              : 'Confirmed stock count'
            : ar
            ? 'مرجعي فقط · يمكنك تحديث الجرد الفعلي الآن'
            : 'Reference only · tap Edit stock to confirm'
        )
      );
      const editStockBtn = el('button', 'btn', '✎ ' + (ar ? 'تحديث المخزون' : 'Edit stock'));
      editStockBtn.type = 'button';
      editStockBtn.style.minHeight = '32px';
      editStockBtn.style.padding = '2px 10px';
      editStockBtn.style.marginTop = '6px';
      editStockBtn.style.fontSize = '0.75rem';
      editStockBtn.addEventListener('click', () => promptEditStock(i));
      stockLeft.append(editStockBtn);

      const stockRight = el('div', '');
      stockRight.style.textAlign = 'end';
      stockRight.append(el('div', 'ord-stock-val', ordStockLabel(i)));
      stockBox.append(stockLeft, stockRight);
      card.append(stockBox);

      // Order / Stock Stepper
      const lbl = el('div', '');
      lbl.style.display = 'flex';
      lbl.style.justifyContent = 'space-between';
      lbl.style.fontWeight = '700';
      lbl.style.fontSize = '0.88rem';
      lbl.style.marginTop = '14px';
      lbl.append(
        el('span', '', ar ? 'كم الكمية المطلوبة للطلبية؟' : 'How much do you need?'),
        el('small', '', 'Order / Stock')
      );
      card.append(lbl);

      const qtyRow = el('div', 'ord-qty-row');
      const stepper = el('div', 'ord-stepper-lg');
      const minus = el('button', '', '−');
      minus.type = 'button';
      const qtyIn = el('input', '');
      qtyIn.type = 'number';
      qtyIn.min = '0';
      qtyIn.max = '9999';
      qtyIn.step = ['kg', 'liter'].includes(l.unit || i.unit) ? '0.25' : '1';
      qtyIn.value = String(l.qty);

      const denom = el('span', 'ord-denom');
      denom.append('/ ', el('b', '', ordStockDenominator(i)));

      const plus = el('button', '', '+');
      plus.type = 'button';
      stepper.append(minus, qtyIn, denom, plus);

      const unitSel = el('select', 'in ord-unit-sel');
      Object.entries(ORD_UNITS).forEach(([uk, uLabel]) => {
        const opt = el('option', '', uLabel);
        opt.value = uk;
        opt.selected = uk === (l.unit || i.unit || 'bottle');
        unitSel.append(opt);
      });
      qtyRow.append(stepper, unitSel);
      card.append(qtyRow);

      const hintP = el('p', 'setting-note', ordStockRatioHint(i, l.unit || i.unit));
      hintP.style.marginTop = '8px';
      card.append(hintP);

      const noteIn = el('input', 'in');
      noteIn.style.marginTop = '10px';
      noteIn.placeholder = i.ambiguous
        ? ar
          ? 'حدد النكهة المطلوبة في الملاحظة *'
          : 'Specify the flavour for this record *'
        : ar
        ? 'ملاحظة على الصنف (حجم العبوة، تعليمات خاصة...)'
        : 'Order note (size, packaging or special instructions)';
      noteIn.value = l.note || '';
      card.append(noteIn);

      const saveCurrentItem = () => {
        const cleanQ = Math.max(0, Math.min(9999, Math.round((Number(qtyIn.value) || 0) * 100) / 100));
        ordDB.order.lines[i.id] = {
          qty: cleanQ,
          unit: unitSel.value || i.unit || 'bottle',
          note: noteIn.value.trim(),
          stock: l.stock || '',
        };
        if (cleanQ > 0) delete ordDB.order.skipped[i.id];
        saveOrdersDB();
        const bBadge = root.querySelector('.ord-basket-badge');
        if (bBadge) bBadge.textContent = String(ordSelectedItems().length);
      };

      minus.addEventListener('click', () => {
        const step = ['kg', 'liter'].includes(unitSel.value) ? 0.25 : 1;
        qtyIn.value = String(Math.max(0, Math.round(((Number(qtyIn.value) || 0) - step) * 100) / 100));
        saveCurrentItem();
        updateOrderBadge();
      });
      plus.addEventListener('click', () => {
        const step = ['kg', 'liter'].includes(unitSel.value) ? 0.25 : 1;
        qtyIn.value = String(Math.min(9999, Math.round(((Number(qtyIn.value) || 0) + step) * 100) / 100));
        saveCurrentItem();
        updateOrderBadge();
      });
      qtyIn.addEventListener('input', () => {
        saveCurrentItem();
        updateOrderBadge();
      });
      unitSel.addEventListener('change', () => saveCurrentItem());
      noteIn.addEventListener('input', () => saveCurrentItem());

      root.append(card);

      appendBottomBar((inner) => {
        const prevBtn = el('button', 'btn', ar ? '→ السابق' : '← Previous');
        prevBtn.type = 'button';
        prevBtn.disabled = idx <= 0;
        prevBtn.addEventListener('click', () => {
          saveCurrentItem();
          if (idx > 0) ordGo('item/' + list[idx - 1].id);
        });

        const nextLabel = ordReturnToReview
          ? ar
            ? 'حفظ والعودة للمراجعة'
            : 'Save & return'
          : idx === list.length - 1
          ? ar
            ? 'إنهاء الكاتيجوري ←'
            : 'Finish category →'
          : ar
          ? 'التالي ←'
          : 'Next →';
        const nextBtn = el('button', 'btn primary', nextLabel);
        nextBtn.type = 'button';
        nextBtn.addEventListener('click', () => {
          saveCurrentItem();
          ordDB.order.visited[i.id] = true;
          delete ordDB.order.skipped[i.id];
          saveOrdersDB();
          if (ordReturnToReview) {
            ordReturnToReview = false;
            ordGo('review');
          } else if (idx + 1 < list.length) {
            ordGo('item/' + list[idx + 1].id);
          } else {
            ordGo('complete/' + i.cat);
          }
        });

        inner.append(prevBtn, nextBtn);

        if (!ordReturnToReview) {
          const skipBtn = el(
            'button',
            'ord-skip-rest',
            ar ? 'تخطي بقية الأصناف في هذا الكاتيجوري · مع حفظ كمياتي' : 'Skip remaining · keep my quantities'
          );
          skipBtn.type = 'button';
          skipBtn.addEventListener('click', () => {
            saveCurrentItem();
            ordDB.order.visited[i.id] = true;
            delete ordDB.order.skipped[i.id];
            ordSkipRemaining(i.cat, i.id);
            saveOrdersDB();
            ordGo('complete/' + i.cat);
          });
          inner.append(skipBtn);
        }
      });
      return;
    }

    // =========================================================================
    // PAGE 5: CATEGORY COMPLETE SUMMARY (complete/:cat)
    // =========================================================================
    if (page === 'complete' && ordCat(param)) {
      const c = ordCat(param);
      const list = ordCatItems(c.id);
      const done = ordCatDone(c.id);
      const skipped = ordCatSkipped(c.id);
      const pending = ordPendingItem(c.id);
      const reqCount = list.filter((i) => ordLine(i.id).qty > 0).length;

      root.append(buildOrdBreadcrumbs(c.group, c.id));
      const box = el('section', 'card');
      box.style.padding = '18px';
      box.style.textAlign = 'center';
      box.append(
        el('div', '', '✅'),
        el('h2', 'ord-page-title', pending ? (ar ? 'تم حفظ كمياتك' : 'Your quantities are saved') : ar ? 'اكتمل فحص الكاتيجوري' : 'Category finished'),
        el(
          'p',
          'ord-page-sub',
          ar
            ? 'تم حفظ الأصناف المطلوبة في سلة الطلبية. يمكنك اختيار كاتيجوري آخر أو مراجعة الطلبية الكاملة.'
            : 'Your requested quantities are saved. Choose another category or review the full order.'
        )
      );

      const stats = el('div', 'ord-stats-grid');
      [
        [reqCount, ar ? 'أصناف مطلوبة' : 'Requested items'],
        [done, ar ? 'تم فحصها' : 'Checked'],
        [skipped, ar ? 'تم تخطيها' : 'Skipped'],
      ].forEach(([val, lbl]) => {
        const s = el('div', 'ord-stat-box');
        s.append(el('strong', '', String(val)), el('span', '', lbl));
        stats.append(s);
      });
      box.append(stats);

      const actCol = el('div', '');
      actCol.style.display = 'flex';
      actCol.style.flexDirection = 'column';
      actCol.style.gap = '8px';

      if (pending) {
        const contB = el('button', 'btn primary', ar ? 'متابعة الأصناف غير المفحوصة ←' : 'Continue unchecked items →');
        contB.type = 'button';
        contB.addEventListener('click', () => ordGo('item/' + pending.id));
        actCol.append(contB);
      }

      const anotherCatB = el('button', pending ? 'btn' : 'btn primary', ar ? 'اختيار كاتيجوري آخر في هذا القسم' : 'Choose another category');
      anotherCatB.type = 'button';
      anotherCatB.addEventListener('click', () => ordGo('types/' + c.group));
      actCol.append(anotherCatB);

      if (skipped > 0) {
        const revSkipB = el('button', 'btn', ar ? `مراجعة الأصناف المتخطاة (${skipped})` : `Revisit skipped items (${skipped})`);
        revSkipB.type = 'button';
        revSkipB.addEventListener('click', () => {
          const firstSkipped = list.find((i) => ordDB.order.skipped[i.id]);
          list.forEach((i) => delete ordDB.order.skipped[i.id]);
          saveOrdersDB();
          if (firstSkipped) ordGo('item/' + firstSkipped.id);
        });
        actCol.append(revSkipB);
      }

      const quickB = el('button', 'btn', ar ? 'عرض كل الأصناف في القائمة السريعة (Quick list)' : 'View all quantities in Quick list');
      quickB.type = 'button';
      quickB.addEventListener('click', () => {
        ordDB.preferences.viewMode = 'list';
        saveOrdersDB();
        ordGo('products/' + c.id);
      });

      const homeB = el('button', 'btn', ar ? 'اختيار قسم آخر (صالة / بار / نبيذ)' : 'Choose another section');
      homeB.type = 'button';
      homeB.addEventListener('click', () => ordGo('home'));

      const reviewB = el('button', 'btn', ar ? 'مراجعة الطلبية الكاملة وإرسال WhatsApp' : 'Review full order');
      reviewB.type = 'button';
      reviewB.addEventListener('click', () => ordGo('review'));

      actCol.append(quickB, homeB, reviewB);
      box.append(actCol);
      root.append(box);
      appendGeneralBottomBar();
      return;
    }

    // =========================================================================
    // PAGE 6: FULL ORDER REVIEW & WHATSAPP EXPORT (review)
    // =========================================================================
    root.append(buildOrdBreadcrumbs(null, null, ar ? 'مراجعة الطلبية' : 'Review order'));
    root.append(
      el('div', 'ord-kicker', '04 / REVIEW & SEND · مراجعة وإرسال الطلبية'),
      el('h2', 'ord-page-title', (ar ? 'مراجعة الطلبية الكاملة (' : 'Review order (') + selectedList.length + ')')
    );

    const metaCard = el('section', 'card');
    metaCard.style.padding = '14px';
    metaCard.append(el('h4', '', ar ? '📋 تفاصيل الطلبية (Order Details)' : '📋 Order details'));
    const m = ordDB.order.meta;
    if (!m.requester) m.requester = (session && session.displayName) || S.me.name || '';
    if (!m.orderDate) m.orderDate = S.date;

    const row1 = el('div', 'two');
    const reqLbl = el('label', '', ar ? 'اسم المُعدّ (Prepared by)' : 'Prepared by');
    const reqIn = el('input', 'in');
    reqIn.value = m.requester;
    reqIn.addEventListener('input', () => {
      m.requester = reqIn.value;
      saveOrdersDB();
    });
    reqLbl.append(reqIn);

    const dtLbl = el('label', '', ar ? 'تاريخ الطلبية' : 'Order date');
    const dtIn = el('input', 'in');
    dtIn.type = 'date';
    dtIn.value = m.orderDate;
    dtIn.addEventListener('change', () => {
      m.orderDate = dtIn.value;
      saveOrdersDB();
    });
    dtLbl.append(dtIn);
    row1.append(reqLbl, dtLbl);

    const row2 = el('div', 'two');
    row2.style.marginTop = '8px';
    const destLbl = el('label', '', ar ? 'إرسال إلى (Send to)' : 'Send to');
    const destSel = el('select', 'in');
    ['Store', 'Purchasing', 'Manager'].forEach((v) => {
      const o = el('option', '', v);
      o.value = v;
      o.selected = m.destination === v;
      destSel.append(o);
    });
    destSel.addEventListener('change', () => {
      m.destination = destSel.value;
      saveOrdersDB();
    });
    destLbl.append(destSel);

    const prioLbl = el('label', '', ar ? 'الأولوية (Priority)' : 'Priority');
    const prioSel = el('select', 'in');
    ['Normal', 'Urgent'].forEach((v) => {
      const o = el('option', '', v);
      o.value = v;
      o.selected = m.priority === v;
      prioSel.append(o);
    });
    prioSel.addEventListener('change', () => {
      m.priority = prioSel.value;
      saveOrdersDB();
    });
    prioLbl.append(prioSel);
    row2.append(destLbl, prioLbl);

    const noteLbl = el('label', '', ar ? 'ملاحظة عامة على الطلبية' : 'General order note');
    noteLbl.style.display = 'block';
    noteLbl.style.marginTop = '8px';
    const noteIn = el('input', 'in');
    noteIn.value = m.orderNote || '';
    noteIn.placeholder = ar ? 'مثال: يرجى التجهيز قبل الساعة 5 مساءً...' : 'e.g. Please prepare before 5 pm';
    noteIn.addEventListener('input', () => {
      m.orderNote = noteIn.value;
      saveOrdersDB();
    });
    noteLbl.append(noteIn);
    metaCard.append(row1, row2, noteLbl);
    root.append(metaCard);

    if (!selectedList.length) {
      const emp = el('section', 'card');
      emp.append(
        el('p', 'empty', ar ? 'لم تقم بطلب أي صنف بعد. اختر قسمًا وكاتيجوري لإضافة الكميات.' : 'No items requested yet. Choose a section and category to add quantities.')
      );
      root.append(emp);
    } else {
      const listCard = el('section', 'card');
      listCard.style.padding = '12px 14px';
      let lastCat = '';
      selectedList.forEach((i) => {
        const l = ordLine(i.id);
        if (lastCat !== i.cat) {
          const gName = (ordDB.catalog.groups[i.group] && (ar ? ordDB.catalog.groups[i.group].nameAr : ordDB.catalog.groups[i.group].name)) || i.group;
          const cName = (ordCat(i.cat) && (ar ? ordCat(i.cat).nameAr : ordCat(i.cat).name)) || i.cat;
          const secH = el('div', '');
          secH.style.fontWeight = '800';
          secH.style.fontSize = '0.8rem';
          secH.style.color = 'var(--accent)';
          secH.style.padding = '8px 0 4px';
          secH.style.borderBottom = '1px solid var(--line)';
          secH.textContent = `${gName} / ${cName}`;
          listCard.append(secH);
          lastCat = i.cat;
        }

        const rLine = el('div', '');
        rLine.style.display = 'flex';
        rLine.style.alignItems = 'center';
        rLine.style.justifyContent = 'space-between';
        rLine.style.gap = '8px';
        rLine.style.padding = '9px 0';
        rLine.style.borderBottom = '1px dashed var(--line)';

        const info = el('div', '');
        info.style.flex = '1';
        info.append(
          el('b', '', ar && i.ar ? `${i.ar} · ${i.name}` : i.name),
          el('small', '', `${l.note ? '📝 ' + l.note + ' · ' : ''}${ar ? 'المخزون' : 'Stock'}: ${ordStockLabel(i)}`)
        );
        info.querySelector('small').style.display = 'block';
        info.querySelector('small').style.color = 'var(--ink2)';

        const right = el('div', '');
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '6px';
        right.append(
          el('strong', 'ord-picked-pill', `${l.qty} / ${ordStockDenominator(i)} ${ordUnitText(l.qty, l.unit || i.unit)}`)
        );

        const editB = el('button', 'btn', '✎');
        editB.type = 'button';
        editB.style.minHeight = '32px';
        editB.style.padding = '0 8px';
        editB.addEventListener('click', () => {
          ordReturnToReview = true;
          ordGo('item/' + i.id);
        });

        const delB = el('button', 'btn danger', '✕');
        delB.type = 'button';
        delB.style.minHeight = '32px';
        delB.style.padding = '0 8px';
        delB.addEventListener('click', () => {
          ordDB.order.lines[i.id] = { ...l, qty: 0 };
          saveOrdersDB();
          renderOrdersView(root);
        });

        right.append(editB, delB);
        rLine.append(info, right);
        listCard.append(rLine);
      });

      // WhatsApp Preview & Actions
      const incLbl = el('label', '');
      incLbl.style.display = 'flex';
      incLbl.style.alignItems = 'center';
      incLbl.style.gap = '8px';
      incLbl.style.marginTop = '12px';
      incLbl.style.fontSize = '0.82rem';
      incLbl.style.cursor = 'pointer';
      const incCb = el('input', '');
      incCb.type = 'checkbox';
      incCb.checked = ordIncludeStockInMsg;
      incCb.addEventListener('change', () => {
        ordIncludeStockInMsg = incCb.checked;
        renderOrdersView(root);
      });
      incLbl.append(incCb, el('span', '', ar ? 'تضمين المخزون الحالي في رسالة WhatsApp' : 'Include stock count in WhatsApp message'));
      listCard.append(incLbl);

      const msgText = buildOrdWhatsAppText(ordIncludeStockInMsg);
      const ta = el('textarea', 'ord-msg-box');
      ta.readOnly = true;
      ta.value = msgText;
      listCard.append(ta);

      const actRow = el('div', '');
      actRow.style.display = 'flex';
      actRow.style.flexWrap = 'wrap';
      actRow.style.gap = '8px';
      actRow.style.marginTop = '10px';

      const copyBtn = el('button', 'btn', ar ? '📋 نسخ النص' : '📋 Copy text');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(msgText);
          }
        } catch {}
        markWarehouseChecklistItemDone();
        FOH.edit.toast(t('ordCopied'));
      });

      const resetBtn = el('button', 'btn danger', ar ? 'بدء طلبية جديدة (تصفير الكميات)' : 'Start new order');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', () => {
        if (!confirm(ar ? 'هل تريد تصفير كميات الطلبية الحالية؟ (يبقى الكتالوج والمخزون محفوظًا)' : 'Clear current order quantities? Catalog and stock stay unchanged.')) return;
        ordDB.order = emptyOrderState();
        saveOrdersDB();
        ordGo('home');
      });

      actRow.append(copyBtn, resetBtn);
      listCard.append(actRow);
      root.append(listCard);
    }

    appendBottomBar((inner) => {
      const addMoreB = el('button', 'btn', ar ? '+ إضافة أصناف' : '+ Add items');
      addMoreB.type = 'button';
      addMoreB.addEventListener('click', () => ordGo('home'));

      const waB = el('button', 'btn primary', t('ordWhatsappBtn'));
      waB.type = 'button';
      waB.disabled = selectedList.length === 0;
      waB.addEventListener('click', async () => {
        const msgText = buildOrdWhatsAppText(ordIncludeStockInMsg);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(msgText);
          }
        } catch {}
        markWarehouseChecklistItemDone();
        FOH.edit.toast(t('ordCopied'));
        window.open('https://wa.me/?text=' + encodeURIComponent(msgText), '_blank', 'noopener');
      });
      inner.append(addMoreB, waB);
    });
  }

  function renderSignoffCard() {
    const box = $('signoffBox');
    if (!box) return;
    if (S.editing || S.view !== 'opening') {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    box.replaceChildren();

    const signoffs = loadSignoffs();
    const signKey = sheetType === 'closing' ? S.date + '|closing' : S.date;
    const record = signoffs[signKey];
    const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S.run.checked);
    const left = all.total - all.done;

    box.classList.toggle('signed', !!record);
    const row = el('div', 'signoff-row');
    const info = el('div', 'signoff-info');
    info.append(el('h3', '', '🛡 ' + t(sheetType === 'closing' ? 'signoffClosingTitle' : 'signoffReadyTitle')));

    if (record) {
      info.append(el('p', '', t('signoffSignedBy', { by: record.by, at: record.at })));
      if (record.reason) {
        info.append(el('p', '', '⚠ ' + t('signoffOverrideNote', { reason: record.reason })));
      }
      row.append(info);
      if (!session || session.isManager) {
        const unlock = el('button', 'btn', t('signoffReopenBtn'));
        unlock.type = 'button';
        unlock.addEventListener('click', () => {
          delete signoffs[signKey];
          saveSignoffs(signoffs);
          apiCall('POST', '/v1/foh-opening/runs/signoff', {
            business_date: S.date,
            sheet_type: sheetType,
            signed_off: false,
            by_name: (session && session.displayName) || 'Supervisor',
            incomplete_count: left,
          });
          renderSignoffCard();
        });
        row.append(unlock);
      }
    } else {
      info.append(el('p', '', t('signoffReadySub')));
      row.append(info);
      if (!session || session.isManager) {
        const signBtn = el('button', 'btn primary', t(sheetType === 'closing' ? 'signoffClosingBtn' : 'signoffBtn'));
        signBtn.type = 'button';
        signBtn.addEventListener('click', () => {
          let reason = '';
          if (left > 0) {
            const input = prompt(t('signoffReasonPrompt', { left }));
            if (input === null) return;
            reason = input.trim();
            if (!reason) return alert(t('signoffNeedReason'));
          }
          signoffs[signKey] = {
            by: (session && session.displayName) || S.run.supervisor || 'Supervisor',
            at: FOH.time.nowHM(),
            reason,
          };
          saveSignoffs(signoffs);
          apiCall('POST', '/v1/foh-opening/runs/signoff', {
            business_date: S.date,
            sheet_type: sheetType,
            signed_off: true,
            by_name: signoffs[signKey].by,
            incomplete_count: left,
            override_reason: reason || null,
          });
          renderSignoffCard();
        });
        row.append(signBtn);
      }
    }
    box.append(row);
  }

  function init() {
    setTheme(loadTheme());

    // Hook into FOH.app.render so Sign-off card, Sheet Switcher, Section Claims, Orders badge, Day-off card, and Auth header stay in sync
    const origRender = FOH.app.render;
    FOH.app.render = function () {
      origRender();
      applyAuthUI();
      renderSheetSwitcher();
      injectSectionClaims();
      renderSignoffCard();
      updateOrderBadge();
      if (!S.editing && S.view === 'mine' && $('mine') && !$('mine').querySelector('.dayoff-form')) {
        $('mine').append(buildDayOffSection(false));
      }
      if (!S.editing && S.view === 'orders' && $('ordersView')) {
        renderOrdersView($('ordersView'));
      }
    };

    // Cloud Sync Hook 1: Checklist Ticks & Scheduled Task Toggles
    ['sections', 'today', 'mine', 'sched'].forEach((cid) => {
      const node = $(cid);
      if (!node) return;
      node.addEventListener('change', (ev) => {
        const cb = ev.target;
        if (cb.type !== 'checkbox') return;
        const myName = (session && session.displayName) || S.me.name || 'Staff';
        if (cb.dataset.id) {
          if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
            FOH.cloudRealtime.broadcast('TASK_TICKED', {
              itemId: cb.dataset.id,
              checked: !!cb.checked,
              byName: myName,
              sheetType: sheetType,
              at: FOH.time.nowHM(),
            });
          }
          if (sheetType === 'closing') saveClosingRun(S.date, S.run);
          apiCall('POST', '/v1/foh-opening/runs/tick', {
            business_date: S.date,
            sheet_type: sheetType,
            item_ids: [cb.dataset.id],
            checked: !!cb.checked,
            at: FOH.time.nowHM(),
            by_name: myName,
            supervisor: S.run.supervisor || undefined,
            captain: S.run.captain || undefined,
            assistant: S.run.assistant || undefined,
          });
        } else if (cb.dataset.task) {
          apiCall('POST', '/v1/foh-opening/task-logs/toggle', {
            task_id: cb.dataset.task,
            occ_date: S.date,
            done: !!cb.checked,
            done_date: S.date,
            at_time: FOH.time.nowHM(),
            by_name: myName,
            staff_id: S.me.staffId || undefined,
          });
        }
      });
    });

    // Cloud Sync Hook 2: Check-All on Parent Items
    $('sections').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-act="checkall"]');
      if (!b || !b.dataset.id) return;
      const at = FOH.model.locate({ sections: FOH.preview.sections() }, b.dataset.id);
      if (!at || !at.item.children) return;
      if (sheetType === 'closing') saveClosingRun(S.date, S.run);
      apiCall('POST', '/v1/foh-opening/runs/tick', {
        business_date: S.date,
        sheet_type: sheetType,
        item_ids: at.item.children.map((c) => c.id),
        checked: true,
        at: FOH.time.nowHM(),
        by_name: (session && session.displayName) || S.me.name || 'Staff',
      });
    });

    // Cloud Sync Hook 3: Breakage Report Creation
    $('breakSheet').addEventListener('close', () => {
      if ($('breakSheet').returnValue !== 'save') return;
      const last = S.inv.breakage[S.inv.breakage.length - 1];
      if (!last) return;
      apiCall('POST', '/v1/foh-opening/inventory/breakage', {
        report_id: last.id,
        variant_id: last.variantId,
        condition: last.cond,
        qty: last.qty,
        note: last.note || '',
        photo_url: null,
        by_name: last.by || (session && session.displayName) || 'Staff',
        count_week_key: last.countKey || null,
        count_category_id: last.countCat || null,
      });
    });

    // Cloud Sync Hook 4: Blind Count Submission
    $('countSheet').addEventListener('close', () => {
      const weekKey = FOH.invStore.countDate(S.inv, S.tpl, S.date);
      const w = S.inv.weeks[weekKey];
      if (!w) return;
      ['counts', 'recounts'].forEach((bucket) => {
        Object.entries(w[bucket] || {}).forEach(([catId, entry]) => {
          if (entry && entry.submittedAt && !entry._cloudSynced) {
            entry._cloudSynced = true;
            apiCall('POST', '/v1/foh-opening/inventory/blind-count', {
              week_key: weekKey,
              category_id: catId,
              mode: bucket === 'recounts' ? 'recount' : 'count',
              staff_id: entry.staffId || S.me.staffId || 'staff',
              by_name: entry.by || (session && session.displayName) || 'Staff',
              lines: entry.lines || {},
              batches: loadBatches(),
              damage_report_ids: entry.damageReportIds || [],
            });
          }
        });
      });
    });

    // Observe #countBody to inject Batch Tally Counter whenever a blind count item is drawn
    const countBody = $('countBody');
    if (countBody && window.MutationObserver) {
      const obs = new MutationObserver(() => injectBatchCounter());
      obs.observe(countBody, { childList: true });
    }

    // Login Form Events
    $('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      $('loginError').hidden = true;
      try {
        await authenticate($('loginUser').value, $('loginPass').value, $('loginRemember').checked);
        applyAuthUI();
        if (session && !session.isManager) S.view = 'mine';
        FOH.app.render();
        syncFromCloud();
      } catch (err) {
        $('loginError').textContent = err.message || t('loginInvalid');
        $('loginError').hidden = false;
      }
    });

    $('loginEyeBtn').addEventListener('click', () => {
      const p = $('loginPass');
      p.type = p.type === 'password' ? 'text' : 'password';
    });

    $('loginThemeBtn').addEventListener('click', () => {
      setTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
    });

    $('loginLangBtn').addEventListener('click', () => {
      FOH.i18n.setLang(FOH.i18n.lang === 'ar' ? 'en' : 'ar');
      renderLoginScreen();
      FOH.app.render();
    });

    // Profile Button Events
    $('profileBtn').addEventListener('click', openProfile);
    $('profCloseBtn').addEventListener('click', () => $('profileSheet').close());
    $('profileSheet').addEventListener('click', (e) => e.target === $('profileSheet') && $('profileSheet').close());

    applyAuthUI();
    renderSheetSwitcher();
    injectSectionClaims();
    renderSignoffCard();
    updateOrderBadge();
    if (session && session.accessToken) syncFromCloud();
  }

  FOH.erpPwa = { init, openProfile, setTheme, switchSheetType, getSheetType: () => sheetType, persistCurrentSheetState, loadMidSections, saveMidSections, loadClosingSections, getOpeningBackup: () => openingSectionsBackup, setOpeningBackup: (b) => { openingSectionsBackup = b; }, renderOrdersView, buildDayOffSection };
  document.addEventListener('DOMContentLoaded', init);
})(window.FOH = window.FOH || {});
