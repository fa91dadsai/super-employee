// foh-opening/js/domains/navigation/sidebar-nav.js
// Responsive Drawer Navigation, Role-Scoped Views & Contextual Controls (RBAC Enforced)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;

  const PERM_LABELS = (FOH.opsLifecycle && FOH.opsLifecycle.PERM_LABELS) || (FOH.PERM_LABELS || []);
  const SUPER_ROLES_META = new Proxy({}, {
    get(target, prop) {
      const meta = (FOH.opsLifecycle && FOH.opsLifecycle.SUPER_ROLES_META) || (FOH.SUPER_ROLES_META || {});
      return meta[prop];
    },
    ownKeys() {
      const meta = (FOH.opsLifecycle && FOH.opsLifecycle.SUPER_ROLES_META) || (FOH.SUPER_ROLES_META || {});
      return Object.keys(meta);
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true, value: this.get(target, prop) };
    }
  });
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function getAppRoleIdentity() {
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : { allowedViews: ['opening', 'mine'] };
  }

  function canCurrentUserAccessOrders() {
    return FOH.roleIdentity ? FOH.roleIdentity.canCurrentUserAccessOrders() : true;
  }

  function loadGov() {
    return FOH.gov ? FOH.gov.loadGov() : {};
  }

  function saveGov(g) {
    if (FOH.gov) FOH.gov.saveGov(g);
  }

  function canCurrentUserEditChecklist() {
    return FOH.gov ? FOH.gov.canCurrentUserEditChecklist() : false;
  }

  function getActiveSheetType() {
    return FOH.threeShifts ? FOH.threeShifts.getActiveSheetType() : 'opening';
  }

  function calcDaysLeft(d) {
    return FOH.gov ? FOH.gov.calcDaysLeft(d) : 999;
  }

  function renderUnifiedThreeSheetNav() {
    if (FOH.threeShifts) FOH.threeShifts.renderUnifiedThreeSheetNav();
  }

  function collapseOpsLifecycleBarToOneLine() {
    if (FOH.headerSubbars) FOH.headerSubbars.collapseOpsLifecycleBarToOneLine();
  }

  function enforceTimeBasedSheetSchedule() {
    if (FOH.threeShifts) FOH.threeShifts.enforceTimeBasedSheetSchedule();
  }

  function activateClosingSheet() {
    if (FOH.opsLifecycle && FOH.opsLifecycle.activateClosingSheet) FOH.opsLifecycle.activateClosingSheet();
  }

  function injectAssignTaskBtnIntoToolbarAndMine() {
    if (FOH.taskAssignment) FOH.taskAssignment.injectAssignTaskBtnIntoToolbarAndMine();
  }

  function quickSwitchEmployeeAccount(u) {
    if (FOH.roleIdentity && FOH.roleIdentity.quickSwitchEmployeeAccount) FOH.roleIdentity.quickSwitchEmployeeAccount(u);
  }

  function relocateHeaderSubbarsToMain() {
    if (FOH.headerSubbars) FOH.headerSubbars.relocateHeaderSubbarsToMain();
  }

  function isClosingSheetActive() {
    return (FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive)
      ? FOH.opsLifecycle.isClosingSheetActive()
      : ((FOH.threeShifts && FOH.threeShifts.getActiveSheetType) ? FOH.threeShifts.getActiveSheetType() === 'closing' : false);
  }

  function renderUnifiedSingleRowChecklistBar() {
    if (FOH.headerSubbars) FOH.headerSubbars.renderUnifiedSingleRowChecklistBar();
  }

  function injectRoleSwitcherInSidebar() {
    if (FOH.headerSubbars) FOH.headerSubbars.injectRoleSwitcherInSidebar();
  }

  function renderAssignedTaskBadgesAndFilter() {
    if (FOH.taskAssignment) FOH.taskAssignment.renderAssignedTaskBadgesAndFilter();
  }

  function wireAutomaticTaskCreationNotifications() {
    if (FOH.taskInbox) FOH.taskInbox.wireAutomaticTaskCreationNotifications();
  }

  function renderCleanHeaderText() {
    if (FOH.headerSubbars) FOH.headerSubbars.renderCleanHeaderText();
  }

  // ---- Role-Scoped Checklist Filtering (Super Waiter / Super Bartender Scope) ----
  function enhanceChecklistContextAndRoleScope() {
    if (S.editing || S.view !== 'opening') return;

    const ident = getAppRoleIdentity();
    const rKey = getCurrentSuperRoleKey();

    // Filter Opening Checklist Sections & Chips when roleScopeOnly is active for Super Waiter / Super Bartender
    if (!isClosingSheetActive() && ident.openingKeywords && roleScopeOnly) {
      const kwList = ident.openingKeywords;
      document.querySelectorAll('#sections > section.card').forEach((card) => {
        const sid = (card.id || '').replace(/^sec-/, '');
        const secObj = (S.tpl.sections || []).find((x) => x.id === sid);
        const titleCombo = ((secObj && (secObj.title + ' ' + secObj.titleAr)) || card.textContent || '').toLowerCase();
        let match = kwList.some((kw) => titleCombo.includes(kw));
        if (rKey === 'super_waiter' && (titleCombo.includes('stations & bar') || titleCombo.includes('tech & cash') || titleCombo.includes('الكاشير'))) {
          match = false;
        }
        if (rKey === 'super_bartender' && (titleCombo.includes('tables setup') || titleCombo.includes('tech & cash') || titleCombo.includes('الطاولات'))) {
          match = false;
        }
        card.style.display = match ? '' : 'none';
      });
      document.querySelectorAll('#chips .chip').forEach((chip) => {
        const sid = chip.dataset.sid;
        const card = $('sec-' + sid);
        if (card) chip.style.display = card.style.display;
      });
    } else if (!isClosingSheetActive()) {
      document.querySelectorAll('#sections > section.card, #chips .chip').forEach((node) => {
        node.style.display = '';
      });
    }
  }

  function enhanceSidebarBrandAndLang(ar, ident) {
    const sbBrandStrong = document.querySelector('#appSidebar .sb-brand-txt strong');
    if (sbBrandStrong) {
      sbBrandStrong.textContent = ar ? ident.titleAr : ident.titleEn;
    }
    const sbFoot = document.querySelector('#appSidebar .sb-foot');
    if (sbFoot && !$('sbLangToggle')) {
      const langBtn = el('button', 'btn sb-foot-btn', ar ? '🌐 EN' : '🌐 عربي');
      langBtn.type = 'button';
      langBtn.id = 'sbLangToggle';
      langBtn.addEventListener('click', () => {
        if ($('langBtn')) $('langBtn').click();
        langBtn.textContent = isAr() ? '🌐 EN' : '🌐 عربي';
        renderSidebarContent();
      });
      sbFoot.insertBefore(langBtn, $('sbLogoutBtn'));
    } else if ($('sbLangToggle')) {
      $('sbLangToggle').textContent = ar ? '🌐 EN' : '🌐 عربي';
    }
  }

  function injectSidebarDamageButton(nav, ar) {
    if (!nav || nav.dataset.v10Scoped) return;
    nav.dataset.v10Scoped = '1';
    const dmgBtn = el('button', 'sb-nav-btn');
    dmgBtn.type = 'button';
    dmgBtn.append(
      el('span', 'sb-nav-ico', '🔧'),
      Object.assign(el('span', 'sb-nav-txt'), {
        innerHTML:
          '<b>' + (ar ? 'تسجيل كسر أو طلب صيانة' : 'Report Damage / Repair') + '</b>' +
          '<small>' + (ar ? 'تبليغ فوري عن كسر أو عطل بالمعدات' : 'Log broken glassware or equipment repair') + '</small>',
      })
    );
    dmgBtn.addEventListener('click', () => {
      closeSidebar();
      if (FOH.invBreak && FOH.invBreak.open) FOH.invBreak.open();
    });
    nav.append(dmgBtn);
  }

  function injectInventoryDamageCard(ar) {
    const invRoot = $('inv');
    if (invRoot && !invRoot.hidden && !invRoot.querySelector('#invDamageReportCard')) {
      const dmgCard = el('div', 'sec-context-bar');
      dmgCard.id = 'invDamageReportCard';
      dmgCard.style.border = '1.5px solid var(--accent)';
      dmgCard.innerHTML =
        '<div><b>🔧 ' + (ar ? 'بلاغات الكسر والتالف وطلبات الصيانة' : 'Breakage & Equipment Repair Reports') + '</b>' +
        '<small style="display:block;color:var(--ink2);">' + (ar ? 'سجّل أي كسر في الكؤوس أو الصحون أو عطل بحاجة لصيانة' : 'Report broken items or request equipment repair') + '</small></div>';
      const openBrkBtn = el('button', 'btn primary', ar ? '+ تسجيل كسر / طلب صيانة' : '+ Report Damage / Repair');
      openBrkBtn.type = 'button';
      openBrkBtn.addEventListener('click', () => {
        if (FOH.invBreak && FOH.invBreak.open) FOH.invBreak.open();
      });
      dmgCard.append(openBrkBtn);
      invRoot.prepend(dmgCard);
    }
  }

  // ---- Enhance Sidebar with Language Toggle, Report Damage Button & Role-Scoped Navigation ----
  function enhanceSidebarAndInventory() {
    const ar = isAr();
    const ident = getAppRoleIdentity();
    enhanceSidebarBrandAndLang(ar, ident);
    injectSidebarDamageButton($('sbNavList'), ar);
    injectInventoryDamageCard(ar);
  }


  // ---- 9. Hamburger ☰ Sidebar Drawer & Header Sync ----
  function openSidebar() {
    if ($('sidebarBackdrop')) $('sidebarBackdrop').hidden = false;
    if ($('appSidebar')) $('appSidebar').hidden = false;
    renderSidebarContent();
  }

  function closeSidebar() {
    if ($('sidebarBackdrop')) $('sidebarBackdrop').hidden = true;
    if ($('appSidebar')) $('appSidebar').hidden = true;
  }

  function switchView(nextView) {
    if (nextView === 'orders' && !canCurrentUserAccessOrders()) {
      const ar = isAr();
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '⚠️ ليس لديك صلاحية الوصول إلى قسم الطلبيات والمستودع' : '⚠️ You do not have permission to access Bar & FOH Orders');
      }
      return;
    }
    S.editing = false;
    S.view = nextView;
    closeSidebar();
    window.scrollTo(0, 0);
    FOH.app.render();
  }

  function getSectionMeta(view) {
    const ar = isAr();
    const map = {
      opening: { ico: '📋', title: ar ? 'شيتات الشفت (Opening · Mid · Closing)' : 'Shift Sheets (Opening · Mid · Closing)', sub: ar ? 'افتتاح (12–3) · منتصف الشفت (3–11) · إغلاق (11+)' : 'Time-scheduled: Opening · Mid-Shift · Closing' },
      mine: { ico: '📋', title: ar ? 'مهامي اليومية' : 'My Tasks', sub: ar ? 'مهامك ومسؤوليات الشفت' : 'Personal daily shift tasks' },
      dayoff: { ico: '🏖️', title: ar ? 'طلب عطلة / إجازة' : 'Day-Off & Leave', sub: ar ? 'طلب العطلة الأسبوعية والربط مع الجدول' : 'Weekly rest days & schedule leave' },
      orders: { ico: '🛒', title: ar ? 'طلبيات البار والصالة' : 'Bar & FOH Orders', sub: ar ? 'Step-by-step و Quick list' : 'Step-by-step & Quick list' },
      inv: { ico: '📦', title: ar ? 'الجرد وبلاغات التالف' : 'Inventory & Breakage', sub: ar ? 'الجرد الأعمى وإدارة الأصناف' : 'Blind counts & breakage reports' },
      academy: { ico: '🎓', title: ar ? 'أكاديمية المنيو والاختبارات' : 'Menu Academy & Quiz', sub: ar ? 'تعلّم الأطباق والمشروبات واكسب نقاطاً' : 'Learn dishes & drinks + 3-choice quiz' },
      tips: { ico: '💰', title: ar ? 'التبس والنقاط وأيام العمل' : 'Tips, Points & Days', sub: ar ? 'حصتك، المسحوبات وأيام الدوام' : 'Your share, advances & worked days' },
      dashboard: { ico: '📊', title: ar ? 'لوحة التحكم والتحليلات' : 'Dashboard & Analytics', sub: ar ? 'إحصائيات الشفت والامتثال' : 'Shift KPIs & compliance analytics' },
      profile: { ico: '👤', title: ar ? 'البروفايل والشهادة الصحية' : 'Profile & Health Cert', sub: ar ? 'بياناتك وتنبيه الشهادة الصحية' : 'Personal info & health certificate' },
      settings: { ico: '⚙️', title: ar ? 'إعدادات المدير والصلاحيات' : 'Settings & Permissions', sub: ar ? 'قفل الشيك ليست وصلاحيات التبس' : 'Checklist lock & tip visibility' },
    };
    return map[view] || map.opening;
  }

  function renderSidebarProfileCard(profBox, sess, ar) {
    profBox.replaceChildren();
    const dispName = (sess && (ar ? sess.displayNameAr || sess.displayName : sess.displayName)) || S.me.name || 'Fadi (Supervisor)';
    const srKey = getCurrentSuperRoleKey();
    const srMeta = SUPER_ROLES_META[srKey] || SUPER_ROLES_META.staff;
    const roleLbl = srMeta.badge;
    const initials = dispName.slice(0, 2).toUpperCase();

    const staffRec = (S.tpl.staff || []).find(
      (p) => (sess && p.id === sess.staffId) || (p.name || '').toLowerCase().startsWith((sess && sess.username ? sess.username : 'fadi').toLowerCase())
    );
    const hcDays = staffRec ? calcDaysLeft(staffRec.healthCertExpiry) : null;
    const hcTxt = hcDays === null
      ? '🏥 —'
      : hcDays < 0
      ? (ar ? '🏥 🚨 منتهية' : '🏥 🚨 Expired')
      : hcDays <= 30
      ? (ar ? '🏥 ⚠️ باقي ' + hcDays + 'ي' : '🏥 ⚠️ ' + hcDays + 'd left')
      : (ar ? '🏥 ✓ صالحة' : '🏥 ✓ Valid');

    const top = el('div', 'sb-prof-top');
    top.append(
      el('div', 'sb-prof-av', initials),
      Object.assign(el('div', 'sb-prof-meta'), {
        innerHTML: '<b>' + dispName + '</b><small>🪪 ' + roleLbl + ' · ' + hcTxt + '</small>',
      })
    );
    profBox.append(top);
    profBox.onclick = () => switchView('profile');
  }

  function createSidebarNavItem(v, badge, ar) {
    const isClosingNav = v === 'closing_sheet';
    const meta = isClosingNav
      ? {
          ico: '🌙',
          title: ar ? 'شيت الإغلاق و Last Order' : 'Closing Sheet & Last Order',
          sub: ar ? 'إغلاق البار والصالة والكاشير مع آخر زبون' : 'Dept closing & last-guest lockup',
        }
      : getSectionMeta(v);
    const isActive = isClosingNav
      ? (!S.editing && S.view === 'opening' && isClosingSheetActive())
      : (v === 'opening' ? (!S.editing && S.view === 'opening' && !isClosingSheetActive()) : (!S.editing && S.view === v));
    const b = el('button', 'sb-nav-btn' + (isActive ? ' on' : ''));
    b.type = 'button';
    b.append(
      el('span', 'sb-nav-ico', meta.ico),
      Object.assign(el('span', 'sb-nav-txt'), {
        innerHTML: '<b>' + meta.title + '</b><small>' + meta.sub + '</small>',
      })
    );
    if (badge) b.append(el('span', 'sb-nav-badge', badge));
    b.addEventListener('click', () => {
      if (isClosingNav) {
        closeSidebar();
        activateClosingSheet('all');
      } else if (v === 'opening') {
        if (isClosingSheetActive() && FOH.erpPwa && FOH.erpPwa.switchSheetType) {
          FOH.erpPwa.switchSheetType('opening');
        }
        switchView('opening');
      } else {
        switchView(v);
      }
    });
    return b;
  }

  function renderSidebarNavList(nav, isMgr, ar) {
    nav.replaceChildren();
    const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S.run.checked);
    const openLeft = all.total - all.done;
    const ordCount = $('badgeOrders') ? Number($('badgeOrders').textContent || '0') : 0;

    const items = [
      ['opening', openLeft > 0 ? String(openLeft) : '✓'],
      ['orders', ordCount > 0 ? String(ordCount) : ''],
      ['dayoff', '🏖️'],
      ['profile', '🏥'],
      ['dashboard', '📊'],
    ];
    if (isMgr) items.push(['settings', '⚙️']);

    const allowedViews = getAppRoleIdentity().allowedViews || [];
    items.forEach(([v, badge]) => {
      if (v === 'inv' && S.previewEmployee) return;
      if (allowedViews.length && !allowedViews.includes(v)) return;
      nav.append(createSidebarNavItem(v, badge, ar));
    });
    delete nav.dataset.v10Scoped;
    enhanceSidebarAndInventory();
  }

  function renderSidebarContent() {
    const ar = isAr();
    const gov = loadGov();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;

    if ($('sbRestaurantName')) {
      $('sbRestaurantName').textContent = '🍽 ' + (ar ? gov.restaurantNameAr : gov.restaurantName);
    }
    if ($('sbNavTitle')) {
      $('sbNavTitle').textContent = ar ? 'أقسام التطبيق · اختر للتركيز' : 'SECTIONS · TAP TO FOCUS';
    }

    const profBox = $('sbProfileCard');
    if (profBox) renderSidebarProfileCard(profBox, sess, ar);

    const nav = $('sbNavList');
    if (nav) renderSidebarNavList(nav, isMgr, ar);
  }




  // Security Hardening: Wrap switchView with strict allowedViews check
  const origSwitchView = switchView;
  function secureSwitchView(nextView) {
    const roleIdent = getAppRoleIdentity();
    const ar = isAr();
    if (roleIdent && roleIdent.allowedViews && !roleIdent.allowedViews.includes(nextView)) {
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '⚠️ ليس لديك صلاحية الوصول إلى هذه الصفحة' : '⚠️ Access restricted for your role');
      }
      return;
    }
    origSwitchView(nextView);
  }

  FOH.navigation = {
    enhanceChecklistContextAndRoleScope,
    enhanceSidebarAndInventory,
    openSidebar,
    closeSidebar,
    switchView: secureSwitchView,
    getSectionMeta,
    renderSidebarContent,
  };

  FOH.switchView = secureSwitchView;
  FOH.openSidebar = openSidebar;
  FOH.closeSidebar = closeSidebar;
})(window.FOH = window.FOH || {});
