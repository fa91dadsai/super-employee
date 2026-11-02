// foh-opening/js/domains/shifts/sheet-state.js
// Multi-Sheet Architecture (Opening, Mid-Shift, Closing State & Persistence)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function syncFromCloud() {
    if (FOH.cloudSync) FOH.cloudSync.syncFromCloud();
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



  FOH.sheetState = {
    getSheetType: () => sheetType,
    getOpeningBackup: () => openingSectionsBackup,
    setOpeningBackup: (b) => { openingSectionsBackup = b; },
    loadClosingSections,
    loadClosingRun,
    saveClosingRun,
    loadMidSections,
    saveMidSections,
    loadMidRun,
    saveMidRun,
    persistCurrentSheetState,
    switchSheetType,
    renderSheetSwitcher,
  };

  FOH.switchSheetType = switchSheetType;
})(window.FOH = window.FOH || {});
