// foh-opening/js/domains/checklist/section-assignment.js
// Section Division, Role & Staff Assignment, and Custom Department Management
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const { t, pick } = FOH.i18n;
  const { el } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);

  const ICONS = ['🍸', '🍽️', '🚪', '🛎️', '💳', '📦', '☕', '🧹', '🧽', '👥', '✨'];

  const ROLE_OPTIONS = [
    { key: 'all', labelEn: '👥 All Positions (Shared)', labelAr: '👥 متاح للجميع (مشترك)' },
    { key: 'super_bartender', labelEn: '🍸 Super Bartender', labelAr: '🍸 سوبر بارتندر (Super Bartender)' },
    { key: 'super_waiter', labelEn: '⭐ Super Waiter', labelAr: '⭐ سوبر ويتر (Super Waiter)' },
    { key: 'super_captain', labelEn: '🎖️ Super Captain', labelAr: '🎖️ سوبر كابتن (Super Captain)' },
    { key: 'super_manager', labelEn: '👑 Super Manager', labelAr: '👑 سوبر مانجر (Super Manager)' },
    { key: 'host', labelEn: '🛎️ Host & Reception', labelAr: '🛎️ هوست واستقبال (Host)' },
    { key: 'runner', labelEn: '🏃 Runner / Support', labelAr: '🏃 رانر ومساعد (Runner)' },
  ];

  const SCOPE_ROLES = [
    { key: 'all', labelEn: 'All Positions', labelAr: 'الجميع (مشترك)' },
    { key: 'super_captain', labelEn: 'Super Captain', labelAr: 'سوبر كابتن' },
    { key: 'super_waiter', labelEn: 'Super Waiter', labelAr: 'سوبر ويتر' },
    { key: 'super_bartender', labelEn: 'Super Bartender', labelAr: 'سوبر بارتندر' },
    { key: 'super_manager', labelEn: 'Super Manager', labelAr: 'سوبر مانجر' },
  ];

  const DEPT_OPTIONS = [
    { key: 'bar', labelEn: '🍸 Bar Department', labelAr: '🍸 قسم البار والمشروبات' },
    { key: 'floor', labelEn: '🍽️ Floor & Dining Area', labelAr: '🍽️ قسم الصالة والطاولات' },
    { key: 'back', labelEn: '🚪 Back Area & Stations', labelAr: '🚪 قسم المنطقة الخلفية والمحطات' },
    { key: 'host', labelEn: '🛎️ Host & Reception Area', labelAr: '🛎️ قسم الاستقبال والهوست' },
    { key: 'cash', labelEn: '💳 Cashier, POS & Tech', labelAr: '💳 قسم الكاشير والأجهزة' },
    { key: 'general', labelEn: '🏢 General Operations', labelAr: '🏢 تشغيل عام' },
  ];

  function getStaffList() {
    const ar = isAr();
    const list = [
      { uname: '', label: ar ? '— أي موظف في هذا المنصب —' : '— Any staff in this role —' },
      { uname: 'sara', label: ar ? '👤 سارة خوري (سوبر ويتر)' : '👤 Sara Khoury (Super Waiter)' },
      { uname: 'maher', label: ar ? '👤 ماهر زيد (سوبر بارتندر)' : '👤 Maher Zaid (Super Bartender)' },
      { uname: 'ali', label: ar ? '👤 علي حسن (سوبر كابتن)' : '👤 Ali Hassan (Super Captain)' },
      { uname: 'fadi', label: ar ? '👑 فادي المصري (سوبر مانجر)' : '👑 Fadi Al-Masri (Super Manager)' },
    ];
    const seen = new Set(list.map((s) => s.uname));
    const st = S();
    ((st && st.tpl && st.tpl.staff) || []).forEach((p) => {
      const u = (p.username || (p.name || '').split(' ')[0] || p.id || '').toLowerCase().trim();
      if (u && !seen.has(u)) {
        seen.add(u);
        list.push({ uname: u, label: '👤 ' + p.name });
      }
    });
    return list;
  }

  function canCurrentUserAssign() {
    if (FOH.roleIdentity && FOH.roleIdentity.canCurrentUserAssignTasks) {
      return FOH.roleIdentity.canCurrentUserAssignTasks();
    }
    const sess = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    return !!(sess && (sess.isManager || sess.isCaptain));
  }

  function getActiveSheetType() {
    return (FOH.threeShifts && FOH.threeShifts.getActiveSheetType)
      ? FOH.threeShifts.getActiveSheetType()
      : ((FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive && FOH.opsLifecycle.isClosingSheetActive()) ? 'closing' : 'opening');
  }

  function persistCurrentSheet() {
    if (FOH.erpPwa && FOH.erpPwa.persistCurrentSheetState) {
      FOH.erpPwa.persistCurrentSheetState();
    } else {
      FOH.store.saveTemplate(S().tpl);
    }
  }


  function openSectionModal(targetSec, opts = {}) {
    if (FOH.sectionAssignmentModal && FOH.sectionAssignmentModal.openSectionModal) {
      return FOH.sectionAssignmentModal.openSectionModal(targetSec, opts);
    }
  }

  function decorateSectionCard(sec, opts = {}) {
    const { staffNameMap, canAssign, ar } = opts;
    const card = $('sec-' + sec.id);
    if (!card) return;
    const head = card.querySelector('.head');
    if (!head) return;
    const metaRow = head.querySelector('.head-meta-row');
    if (!metaRow) return;

    let pill = metaRow.querySelector('.sec-asg-pill');
    const session = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    const curSuperRole = FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : '';
    const isSelfSection = session && (
      (sec.assignedUsername && sec.assignedUsername.toLowerCase() === (session.username || '').toLowerCase()) ||
      (sec.assignedRoleKey && (sec.assignedRoleKey === curSuperRole || sec.assignedRoleKey === session.role))
    );

    // Regular staff viewing their own section don't need redundant self-role badges
    if (!canAssign && isSelfSection) {
      if (pill) pill.remove();
    } else {
      if (!pill) {
        pill = el('span', 'sec-asg-pill');
        metaRow.prepend(pill);
      }
      const roleKey = sec.assignedRoleKey || 'all';
      const roleMeta = ROLE_OPTIONS.find((r) => r.key === roleKey);
      const roleLabel = roleMeta ? (ar ? roleMeta.labelAr.split('(')[0].trim() : roleMeta.labelEn.split('(')[0].trim()) : (ar ? 'مشترك' : 'All');
      const assignedPerson = sec.assignedUsername ? (staffNameMap[sec.assignedUsername] || sec.assignedUsername) : '';
      const cleanPerson = assignedPerson.replace(/\s*\([^)]*\)/g, '').trim();

      pill.innerHTML = '<span>🎯</span> <b>' + FOH.escapeHtml(roleLabel) + '</b>' +
        (cleanPerson ? '<span style="opacity:0.85;margin-inline-start:4px;">· 👤 ' + cleanPerson + '</span>' : '');
    }

    let editBtn = metaRow.querySelector('.sec-asg-btn');
    if (!canAssign) {
      if (editBtn) editBtn.remove();
    } else if (!editBtn) {
      editBtn = el('button', 'sec-asg-btn', ar ? '⚙️ تخصيص وإسناد' : '⚙️ Assign Section');
      editBtn.type = 'button';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSectionModal(sec, { isNew: false });
      });
      metaRow.append(editBtn);
    }
  }

  function injectSectionControls() {
    const secContainer = $('sections');
    if (!secContainer || secContainer.hidden || S().view !== 'opening') return;

    const ar = isAr();
    const canAssign = canCurrentUserAssign();
    const staffList = getStaffList();
    const staffNameMap = {};
    staffList.forEach((s) => {
      if (s.uname) staffNameMap[s.uname] = s.label.replace('👤 ', '').replace('👑 ', '');
    });

    const toolbar = document.querySelector('#checklistGovBar .unified-sec-toolbar');
    if (toolbar) {
      let addSecBtn = toolbar.querySelector('#toolbarAddSectionBtn');
      if (!canAssign) {
        if (addSecBtn) addSecBtn.remove();
      } else if (!addSecBtn) {
        addSecBtn = el('button', 'u-pill sec-add-pill', ar ? '📑 إضافة قسم جديد' : '📑 + Add Section');
        addSecBtn.id = 'toolbarAddSectionBtn';
        addSecBtn.type = 'button';
        addSecBtn.addEventListener('click', () => openSectionModal(null, { isNew: true }));
        toolbar.append(addSecBtn);
      }
    }

    (S().tpl.sections || []).forEach((sec) => {
      decorateSectionCard(sec, { staffNameMap, canAssign, ar });
    });
  }

  function getLegacyBarAndHostItems() {
    const barItems = [
      { id: 'sb1', text: 'Make sure the bar is clean, polished and service-ready', textAr: 'التأكد من نظافة البار ومحطات التحضير وجاهزيتها للخدمة', due: '15:30', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
      { id: 'sb2', text: 'Top up ice wells, draft lines & beverage coolers', textAr: 'تعبئة أحواض الثلج وتبريد زجاجات المشروبات والنبيذ', due: '15:40', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
      { id: 'sb3', text: 'Check espresso machine, steam wands & grinder hopper', textAr: 'فحص ماكينة الإسبريسو ومطحنة القهوة والتأكد من نقاء البن', due: '15:45', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
      { id: 'sb4', text: 'Cut fresh garnishes (lemon/lime/mint) & prep house syrups', textAr: 'تقطيع وتجهيز الغارنيش الطازج والنعناع وفحص العصائر والـ Syrups', due: '15:50', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
      { id: 'sb5', text: 'Wash, polish and inspect all cocktail and wine glasses', textAr: 'تلميع وفحص كؤوس الكوكتيل والنبيذ وكاسات التقديم', due: '15:55', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
    ];
    const hostItems = [
      { id: 'sh1', text: 'Inspect and clean the Host Stand & welcome entrance', textAr: 'فحص وتنظيف كاونتر الاستقبال (Host Stand) ومدخل الصالة', due: '15:30', role: '', assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain', children: [] },
      { id: 'sh2', text: 'Review evening reservations, VIP notes & table plan with Floor Captain', textAr: 'مراجعة حجوزات المساء وطلبات الـ VIP وتوزيع الطاولات مع الكابتن', due: '15:45', role: '', assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain', children: [] },
      { id: 'sh3', text: 'Clean and sanitize all food, wine & cocktail menus', textAr: 'تنظيف وتعقيم كافة قوائم الطعام والمشروبات والنبيذ', due: '15:50', role: '', assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain', children: [] },
      { id: 'sh4', text: 'Turn on music playlist & adjust ambient lighting', textAr: 'تشغيل الموسيقى وضبط الإضاءة الترحيبية والتكييف', due: '15:50', role: '', assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain', children: [] },
    ];
    return { barItems, hostItems };
  }

  function createDefaultLegacySections() {
    const { barItems, hostItems } = getLegacyBarAndHostItems();
    const barSec = {
      id: 'sec-bar', dept: 'bar', icon: '🍸',
      title: 'Bar & Beverage Station', titleAr: 'قسم البار والمشروبات',
      assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', assignedUsername: 'maher',
      items: barItems,
    };
    const floorSec = {
      id: 'sec-floor', dept: 'floor', icon: '🍽️',
      title: 'Floor & Dining Tables', titleAr: 'قسم الصالة والطاولات',
      assignedRoleKey: 'super_waiter', assignedRoleLabel: '⭐ Super Waiter', assignedUsername: 'sara',
      items: [],
    };
    const backSec = {
      id: 'sec-back', dept: 'back', icon: '🚪',
      title: 'Back Area & Service Station', titleAr: 'قسم المنطقة الخلفية والمحطات',
      assignedRoleKey: 'super_waiter', assignedRoleLabel: '⭐ Super Waiter / Runner', assignedUsername: '',
      items: [],
    };
    const hostSec = {
      id: 'sec-host', dept: 'host', icon: '🛎️',
      title: 'Host & Reception Desk', titleAr: 'قسم الاستقبال والهوست',
      assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain / Host', assignedUsername: 'ali',
      items: hostItems,
    };
    const cashSec = {
      id: 'sec-cash', dept: 'cash', icon: '💳',
      title: 'Cashier, POS & Tech', titleAr: 'قسم الكاشير والأجهزة',
      assignedRoleKey: 'super_manager', assignedRoleLabel: '👑 Super Manager', assignedUsername: 'fadi',
      items: [
        { id: 'sc1', text: 'Make sure all Visa machines and ordering tablets are charged', textAr: 'التأكد من شحن جميع أجهزة الفيزا والتابلت', due: '15:30', role: '', assignedRoleKey: 'super_manager', assignedRoleLabel: '👑 Super Manager', children: [] },
        { id: 'sc2', text: 'Verify and change the cash float in till drawer', textAr: 'استلام وتبديل نقد الفكة (Cash Float) في درج الكاشير', due: '15:40', role: '', assignedRoleKey: 'super_manager', assignedRoleLabel: '👑 Super Manager', children: [] },
        { id: 'sc3', text: 'Ensure the POS system is online and tables synced', textAr: 'التأكد من تشغيل نظام نقاط البيع (POS) وجاهزية الطابعات', due: '15:45', role: '', assignedRoleKey: 'super_manager', assignedRoleLabel: '👑 Super Manager', children: [] },
        { id: 'sc4', text: 'Check the safe vault and set out the daily tip sheet', textAr: 'التحقق من الخزنة ووضع ورقة التبس مع تاريخ اليوم', due: '15:50', role: '', assignedRoleKey: 'super_manager', assignedRoleLabel: '👑 Super Manager', children: [] },
      ],
    };
    return { barSec, floorSec, backSec, hostSec, cashSec };
  }

  function categorizeLegacyItems(oldSections, depts) {
    const { barSec, floorSec, backSec, hostSec, cashSec } = depts;
    oldSections.forEach((oldSec) => {
      (oldSec.items || []).forEach((it) => {
        const tStr = (it.text + ' ' + (it.textAr || '')).toLowerCase();
        if (tStr.includes('bar') || tStr.includes('بار')) {
          barSec.items.push(it);
        } else if (tStr.includes('back area') || tStr.includes('expeditor') || tStr.includes('w.c.') || tStr.includes('دورات') || tStr.includes('station') || tStr.includes('محط') || tStr.includes('منطقة خلفية') || tStr.includes('مستودع') || tStr.includes('store') || tStr.includes('order from') || tStr.includes('tray') || tStr.includes('صواني') || tStr.includes('soy sauce') || tStr.includes('salt & pepper')) {
          backSec.items.push(it);
        } else if (tStr.includes('menu') || tStr.includes('منيو') || tStr.includes('قوائم') || tStr.includes('music') || tStr.includes('موسيقى') || tStr.includes('uniform') || tStr.includes('زي')) {
          hostSec.items.push(it);
        } else if (tStr.includes('visa') || tStr.includes('pos') || tStr.includes('float') || tStr.includes('خزنة') || tStr.includes('vault') || tStr.includes('tip sheet')) {
          cashSec.items.push(it);
        } else {
          floorSec.items.push(it);
        }
      });
    });
  }

  // Smart Migration: Upgrade legacy unorganized sections into the 5 core restaurant departments
  function upgradeLegacySectionsOnce() {
    const st = S();
    if (!st || !st.tpl || !Array.isArray(st.tpl.sections)) return;

    const hasModernDepts = st.tpl.sections.some((s) => ['sec-bar', 'sec-floor', 'sec-back', 'sec-host', 'sec-cash'].includes(s.id));
    if (hasModernDepts) return;

    const depts = createDefaultLegacySections();
    categorizeLegacyItems(st.tpl.sections, depts);
    st.tpl.sections = [depts.barSec, depts.floorSec, depts.backSec, depts.hostSec, depts.cashSec];
    persistCurrentSheet();
  }

  function init() {
    upgradeLegacySectionsOnce();
  }

  FOH.sectionAssignment = {
    init,
    openSectionModal,
    injectSectionControls,
    upgradeLegacySectionsOnce,
    ROLE_OPTIONS,
    DEPT_OPTIONS,
  };
})(window.FOH = window.FOH || {});
