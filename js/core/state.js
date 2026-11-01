// Default FOH opening checklist, transcribed from the paper "Opening Sheet FOH",
// in English and Arabic. The original sheet number is kept in a comment per line.
// Words the staff use in English (Expeditor, Cash Float, Centerpiece, Terrace)
// stay in English inside the Arabic text. "was"/"wasAr" = earlier wording, so
// lists saved on a device pick up the fix. "children" = sub-items (one level).
(function (FOH) {
  'use strict';

  FOH.DEFAULT_SECTIONS = [
    {
      title: 'Tables Setup',
      icon: '🍽',
      ar: 'تجهيز الطاولات',
      items: [
        { text: 'Clean the table tops (Indoor & Outdoor)', ar: 'تنظيف أسطح الطاولات (داخلي وخارجي)' }, // 1
        {
          text: 'Set the table',
          ar: 'تجهيز الطاولة',
          was: 'Set the table (service plate, cutlery, chopsticks, water glass, ashtray, table lamp, centerpiece)',
          wasAr: [
            'تجهيز الطاولة (صحن الخدمة، أدوات المائدة، العيدان، كأس الماء، منفضة السجائر، مصباح الطاولة، الـ Centerpiece)',
            'تجهيز الطاولة (صحن الخدمة، أدوات المائدة، العيدان، كأس الماء، منفضة السجائر، مصباح الطاولة، القطعة الوسطى)',
          ],
          children: [
            { text: 'Place the service plate on the table', ar: 'وضع صحن الخدمة على الطاولة' }, // 3
            {
              text: 'Arrange the cutlery (fork and knife in the napkin, right of the plate)',
              ar: 'ترتيب أدوات المائدة (الشوكة والسكين داخل المنديل يمين الصحن)',
            }, // 4
            { text: 'Position the chopsticks to the right of the cutlery', ar: 'وضع العيدان على يمين أدوات المائدة' }, // 5
            { text: 'Set the water glass above the cutlery', ar: 'وضع كأس الماء فوق أدوات المائدة' }, // 6
            {
              text: 'Place the centerpiece and table lamp in the middle of the table',
              ar: 'وضع الـ Centerpiece ومصباح الطاولة في منتصف الطاولة',
              wasAr: 'وضع القطعة الوسطى ومصباح الطاولة في منتصف الطاولة',
            }, // 7
            {
              text: 'Place the ashtray in the middle of single tables (1 ashtray per 2 guests)',
              ar: 'وضع منفضة السجائر في منتصف الطاولات المفردة (منفضة لكل شخصين)',
            }, // 8
          ],
        }, // 2 (sub-items = sheet items 3-8)
        {
          text: 'Double-check every table is positioned and aligned according to the floor plan',
          ar: 'التأكد من أن كل طاولة في مكانها ومحاذاتها حسب مخطط الصالة',
        }, // 9
        { text: 'Check there is enough clearance for the chairs', ar: 'التأكد من وجود مسافة كافية للكراسي' }, // 10
        {
          text: 'Ensure the side tables and ice buckets are correctly positioned',
          ar: 'التأكد من أن الطاولات الجانبية ودلاء الثلج في مكانها الصحيح',
        }, // 11
      ],
    },
    {
      title: 'Cleaning',
      icon: '🧽',
      ar: 'التنظيف',
      items: [
        {
          text: 'Clean the menus (food, drinks, wine, cocktails)',
          ar: 'تنظيف قوائم الطعام (الطعام، المشروبات، النبيذ، الكوكتيلات)',
        }, // 12
        { text: 'Clean the tissue boxes and refill them', ar: 'تنظيف علب المناديل وتعبئتها' }, // 13
        { text: 'Wipe and clean the table bases (Indoor & Outdoor)', ar: 'مسح وتنظيف قواعد الطاولات (داخلي وخارجي)' }, // 14
        { text: 'Wipe and clean the chairs (Indoor & Outdoor)', ar: 'مسح وتنظيف الكراسي (داخلي وخارجي)' }, // 15
        { text: 'Clean the ice buckets', ar: 'تنظيف دلاء الثلج' }, // 16
        { text: 'Clean the side tables', ar: 'تنظيف الطاولات الجانبية' }, // 17
        { text: 'Clean the stations', ar: 'تنظيف المحطات' }, // 18
        { text: 'Clean the back area', ar: 'تنظيف المنطقة الخلفية' }, // 19
        { text: 'Clean the soy sauce bottles, then refill them', ar: 'تنظيف زجاجات صلصة الصويا ثم تعبئتها' }, // 20
        { text: 'Clean the salt & pepper, then refill them', ar: 'تنظيف الملح والفلفل ثم تعبئتها' }, // 21
        { text: 'Clean the bill folders', ar: 'تنظيف ملفات الفواتير' }, // 22
        { text: 'Clean all the trays', ar: 'تنظيف جميع الصواني' }, // 25
        { text: 'Make sure the terrace is clean', ar: 'التأكد من نظافة الـ Terrace', wasAr: 'التأكد من نظافة التراس' }, // 26
        { text: 'Make sure the W.C. is clean', ar: 'التأكد من نظافة دورات المياه' }, // 27
        { text: 'Make sure the window glass is clean', ar: 'التأكد من نظافة زجاج النوافذ' }, // 35
      ],
    },
    {
      title: 'Stations & Bar',
      icon: '🍸',
      ar: 'المحطات والبار',
      items: [
        {
          text: 'Clean and prepare the expeditor station',
          ar: 'تنظيف وتجهيز محطة الـ Expeditor',
          wasAr: 'تنظيف وتجهيز محطة التنسيق (Expeditor)',
        }, // 23
        { text: 'Make sure the bar is clean and ready', ar: 'التأكد من نظافة البار وجاهزيته' }, // 36
      ],
    },
    {
      title: 'Tech & Cash',
      icon: '💳',
      ar: 'الأجهزة والنقد',
      items: [
        {
          text: 'Make sure all Visa machines and the tablet are charged',
          ar: 'التأكد من شحن جميع أجهزة الفيزا والتابلت',
        }, // 28
        { text: 'Change the cash float', ar: 'تبديل الـ Cash Float', wasAr: 'تبديل نقد الفكّة (Float)' }, // 29
        { text: 'Make sure the POS is on and working', ar: 'التأكد من أن نظام نقاط البيع (POS) يعمل' }, // 33
        { text: 'Check the vault', ar: 'التحقق من الخزنة' }, // 34
      ],
    },
    {
      title: 'Staff & Music',
      icon: '👥',
      ar: 'الطاقم والموسيقى',
      items: [
        { text: 'Turn on the music', ar: 'تشغيل الموسيقى', due: '15:50' }, // 24
        { text: 'Wear the uniform and be ready', ar: 'ارتداء الزي الرسمي والجاهزية', due: '15:50' }, // 31
        {
          text: 'Put out the tip sheet and write the date and day',
          ar: 'وضع ورقة الإكراميات وكتابة التاريخ واليوم',
        }, // 32
      ],
    },
    {
      title: 'Store',
      icon: '📦',
      ar: 'المستودع',
      items: [
        {
          text: 'Bring the order from the warehouse (make sure everything is enough for two days)',
          ar: 'إحضار الطلبية من المستودع (التأكد من أن كل شيء يكفي ليومين)',
          // Earlier prototype wording; lets lists saved before the fix pick up the Arabic text.
          was: 'Bring the order from the store (make sure everything is enough for two days)',
        }, // 30
      ],
    },
  ];

  // Positions; the owner can add, rename and remove them.
  FOH.DEFAULT_ROLES = [
    'Supervisor',
    'Captain',
    'Assistant Captain',
    'Waiter',
    'Bartender',
    'Host',
    'Runner',
    'Steward',
  ];

  // Example scheduled tasks; every field can be changed from edit mode.
  // rule.type: 'weekly' (days: 0 = Sunday … 6 = Saturday) or 'interval'
  // (every N days, counted from the last time the task was done).
  FOH.DEFAULT_TASKS = [
    {
      text: 'Water the trees (terrace & entrance)',
      ar: 'سقاية الأشجار (التراس والمدخل)',
      icon: '💧',
      rule: { type: 'weekly', days: [0, 3] },
      time: '10:00',
      role: 'Steward',
    },
    {
      text: 'Change & clean the soy sauce bottles',
      ar: 'تبديل وتنظيف زجاجات الصويا',
      icon: '🥢',
      rule: { type: 'interval', every: 3 },
      time: '14:00',
      role: 'Captain',
    },
  ];
})(window.FOH = window.FOH || {});

// Example staff and restaurant equipment for the blind inventory count.
// Everything here can be changed in the app; these are only starting points.
//
// An item is counted per variant. Variants come from up to two attributes
// (e.g. Type × Size); only the combinations that really exist are listed.
// cond: which damaged states apply ('repair' = can be repaired, 'writeoff').
(function (FOH) {
  'use strict';

  // role = position name from FOH.DEFAULT_ROLES; inv = takes part in counts.
  FOH.DEFAULT_STAFF = [
    { name: 'Fadi', role: 'Supervisor', inv: false },
    { name: 'Ali', role: 'Captain', inv: true },
    { name: 'Omar', role: 'Assistant Captain', inv: true },
    { name: 'Sara', role: 'Waiter', inv: true },
    { name: 'Lina', role: 'Waiter', inv: true },
    { name: 'Maher', role: 'Bartender', inv: true },
    { name: 'Rami', role: 'Runner', inv: true },
    { name: 'Yousef', role: 'Host', inv: true },
  ];

  const BREAKS = ['writeoff']; // glass and china: good or write-off
  const ALL = ['repair', 'writeoff'];

  // Simple item: one variant. [en, ar, expected, location, opts]
  const i = (name, ar, expected, location, opts) => ({ name, ar, expected, location, cond: BREAKS, ...opts });

  // Item with attributes: a1/a2 = [en, ar, [[valueEn, valueAr], …]];
  // v = [[index in a1, index in a2 (or -1), expected], …]
  const iv = (name, ar, location, a1, a2, v, opts) => ({ name, ar, location, a1, a2, v, cond: BREAKS, ...opts });

  FOH.DEFAULT_INVENTORY = [
    {
      name: 'Glassware',
      ar: 'الكاسات',
      icon: '🍷',
      items: [
        i('Water glass', 'كأس ماء', 120, 'Bar · glass racks'),
        iv('Wine glass', 'كأس نبيذ', 'Bar · top shelf', ['Type', 'النوع', [['Red', 'أحمر'], ['White', 'أبيض'], ['Rosé', 'روزيه']]], null, [
          [0, -1, 48],
          [1, -1, 48],
        ]),
        i('Champagne flute', 'كأس شمبانيا', 24, 'Bar · top shelf'),
        i('Highball', 'كأس هاي بول', 60, 'Bar · back counter'),
        i('Rocks glass', 'كأس روكس', 40, 'Bar · back counter'),
        i('Martini glass', 'كأس مارتيني', 24, 'Bar · freezer shelf'),
      ],
    },
    {
      name: 'Cutlery',
      ar: 'أدوات المائدة',
      icon: '🍴',
      items: [
        i('Dinner fork', 'شوكة', 150, 'Station 1 & 2'),
        i('Dinner knife', 'سكين', 150, 'Station 1 & 2'),
        i('Steak knife', 'سكين ستيك', 60, 'Station 1'),
        i('Dessert spoon', 'ملعقة حلويات', 100, 'Station 2'),
        i('Teaspoon', 'ملعقة شاي', 100, 'Coffee station'),
      ],
    },
    {
      name: 'Plates & bowls',
      ar: 'الصحون والأوعية',
      icon: '🍽',
      items: [
        i('Service plate', 'صحن خدمة', 80, 'Store · shelf A'),
        i('Main plate', 'صحن رئيسي', 120, 'Kitchen pass'),
        i('Side plate', 'صحن جانبي', 120, 'Kitchen pass'),
        i('Sushi board', 'لوح سوشي', 40, 'Sushi counter', { cond: ALL }),
        iv(
          'Soy ramekin',
          'رامكين صويا',
          'Kitchen pass',
          ['Shape', 'الشكل', [['Round', 'دائري'], ['Square', 'مربع']]],
          ['Size', 'القياس', [['2 oz', '2 أونصة'], ['3 oz', '3 أونصة'], ['4 oz', '4 أونصة']]],
          [
            [0, 0, 60],
            [0, 1, 40],
            [0, 2, 30],
            [1, 1, 30],
          ],
          { hint: '2 oz fits in a closed hand · 4 oz is as wide as a teacup', hintAr: '2 أونصة بحجم قبضة اليد · 4 أونصة بعرض فنجان الشاي' }
        ),
        i('Rice bowl', 'وعاء أرز', 80, 'Kitchen pass'),
      ],
    },
    {
      name: 'Chopsticks & rests',
      ar: 'العيدان ومساندها',
      icon: '🥢',
      items: [
        i('Chopsticks', 'عيدان', 200, 'Station 1 & 2', { unit: 'pairs' }),
        i('Chopstick rest', 'مسند عيدان', 150, 'Station 1 & 2'),
      ],
    },
    {
      name: 'Bar tools',
      ar: 'أدوات البار',
      icon: '🍸',
      items: [
        i('Shaker', 'شيكر', 8, 'Bar', { cond: ALL }),
        i('Jigger', 'جيغر', 10, 'Bar', { cond: ALL }),
        i('Bar spoon', 'ملعقة بار', 10, 'Bar', { cond: ALL }),
        i('Strainer', 'مصفاة', 8, 'Bar', { cond: ALL }),
        iv(
          'Ice bucket',
          'دلو ثلج',
          'Bar · under counter',
          ['Type', 'النوع', [['Stainless', 'ستانلس'], ['Acrylic', 'أكريليك'], ['Wooden', 'خشب']]],
          ['Size', 'الحجم', [['Small · 3 L', 'صغير · 3 لتر'], ['Large · 5 L', 'كبير · 5 لتر']]],
          [
            [0, 0, 4],
            [0, 1, 6],
            [1, 1, 2],
            [2, 1, 3],
          ],
          { cond: ALL, hint: 'Large = 5 L with two handles · Small has no handles', hintAr: 'الكبير 5 لتر وله مقبضان · الصغير بلا مقابض' }
        ),
        i('Ice tongs', 'ملقط ثلج', 12, 'Bar · under counter', { cond: ALL }),
      ],
    },
    {
      name: 'Table décor',
      ar: 'ديكور الطاولات',
      icon: '🕯',
      items: [
        iv(
          'Centerpiece',
          'Centerpiece',
          'Store · décor shelf',
          ['Type', 'النوع', [['Lamp', 'مصباح'], ['Vase', 'مزهرية'], ['Candle holder', 'حامل شموع']]],
          ['Finish', 'التشطيب', [['Brass', 'نحاسي'], ['Glass', 'زجاج'], ['Black', 'أسود']]],
          [
            [0, 0, 30],
            [1, 1, 20],
            [2, 2, 25],
          ],
          { cond: ALL, hint: 'Count the complete set; candles are not counted', hintAr: 'عُدّ الطقم كاملًا؛ الشموع لا تُعدّ' }
        ),
        i('Ashtray', 'منفضة سجائر', 40, 'Terrace station'),
      ],
    },
    {
      name: 'Bill folders & menus',
      ar: 'ملفات الفواتير والقوائم',
      icon: '🧾',
      items: [
        i('Bill folder', 'ملف فاتورة', 30, 'Cashier', { cond: ALL }),
        i('Food menu', 'قائمة الطعام', 40, 'Host stand', { cond: ALL }),
        i('Drinks menu', 'قائمة المشروبات', 40, 'Host stand', { cond: ALL }),
        i('Wine list', 'قائمة النبيذ', 20, 'Host stand', { cond: ALL }),
      ],
    },
  ];
})(window.FOH = window.FOH || {});

// Local persistence: the editable template and one "run" (ticks + names) per date.
// Everything stays in this browser's localStorage; nothing is sent anywhere.
//
// Template v2: sections[] -> items[] -> children[] (sub-items, one level only).
// A v1 list (no sub-items) is upgraded on load: see migrateV1 / fillDefaults.
(function (FOH) {
  'use strict';

  const TPL_KEY = 'foh-opening.template.v1'; // key kept so saved lists are found
  const RUN_PREFIX = 'foh-opening.run.v1.';
  const VERSION = 3; // 3 = roles + scheduled tasks
  const LOG_KEY = 'foh-opening.tasklog.v1';
  const ME_KEY = 'foh-opening.me.v1';
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const MAX_TEXT = 300;
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const DEFAULT_ICON = '📋';

  function uid() {
    return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  const cleanReminder = (value) => value === null ? null : Number.isInteger(value) && value >= 0 && value <= 1440 ? value : 30;

  function cleanText(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max || MAX_TEXT) : '';
  }

  const hasText = (it) => it && (cleanText(it.text) || cleanText(it.textAr));
  const list = (value) => (Array.isArray(value) ? value : []);

  // Accepts any parsed JSON and returns a safe template, or null if unusable.
  function normalize(input) {
    if (!input || !Array.isArray(input.sections)) return null;
    const seen = new Set();
    const freshId = (id) => {
      const ok = typeof id === 'string' && /^[\w-]{1,40}$/.test(id) && !seen.has(id);
      const next = ok ? id : uid();
      seen.add(next);
      return next;
    };
    const roles = list(input.roles)
      .map((r) => (typeof r === 'string' ? { name: r } : r))
      .filter((r) => r && cleanText(r.name, 60))
      .map((r) => ({ id: freshId(r.id), name: cleanText(r.name, 60) }));
    const roleIds = new Set(roles.map((r) => r.id));
    const item = (it, depth) => {
      const out = {
        id: freshId(it.id),
        text: cleanText(it.text),
        textAr: cleanText(it.textAr),
        due: TIME_RE.test(it.due) ? it.due : '',
        remindBefore: cleanReminder(it.remindBefore),
      };
      if (typeof it.role === 'string' && roleIds.has(it.role)) out.role = it.role;
      if (depth === 0) out.children = list(it.children).filter(hasText).map((c) => item(c, 1));
      return out;
    };
    const sections = input.sections
      .filter((s) => s && typeof s === 'object')
      .map((s) => {
        const title = cleanText(s.title);
        const titleAr = cleanText(s.titleAr);
        return {
          id: freshId(s.id),
          title: title || (titleAr ? '' : 'Untitled section'),
          titleAr,
          icon: cleanText(s.icon, 8) || DEFAULT_ICON,
          items: list(s.items).filter(hasText).map((it) => item(it, 0)),
        };
      });
    const tasks = list(input.tasks).filter(hasText).map((tk) => task(tk, freshId, roleIds));
    // Staff: people by name, with a position; inv = takes part in inventory counts.
    const staff = list(input.staff)
      .filter((p) => p && cleanText(p.name, 60))
      .map((p) => ({
        id: freshId(p.id),
        name: cleanText(p.name, 60),
        role: typeof p.role === 'string' && roleIds.has(p.role) ? p.role : '',
        inv: p.inv !== false,
        active: p.active !== false,
        canEditChecklist: !!p.canEditChecklist,
        healthCertNo: cleanText(p.healthCertNo, 60),
        healthCertExpiry: DATE_RE.test(p.healthCertExpiry) ? p.healthCertExpiry : '',
        healthCertRemindDays: Number.isInteger(p.healthCertRemindDays) ? p.healthCertRemindDays : 30,
      }));
    const ws = input.settings && input.settings.weekStart;
    const settings = { weekStart: Number.isInteger(ws) && ws >= 0 && ws <= 6 ? ws : 0 };
    return { version: VERSION, sections, roles, tasks, settings, staff };
  }

  // A scheduled task: repeats by days of the week or every N days.
  function task(tk, freshId, roleIds) {
    const r = tk.rule || {};
    const days = [...new Set(list(r.days).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    const every = Number.isInteger(r.every) && r.every >= 1 && r.every <= 60 ? r.every : 3;
    let rule = { type: 'weekly', days: days.length ? days : [0] };
    if (r.type === 'interval') rule = { type: 'interval', every };
    if (r.type === 'once') rule = { type: 'once', date: DATE_RE.test(r.date) ? r.date : '' };
    const late = Number.isInteger(tk.lateAfter) && tk.lateAfter >= 0 && tk.lateAfter <= 1440 ? tk.lateAfter : 120;
    return {
      id: freshId(tk.id),
      text: cleanText(tk.text),
      textAr: cleanText(tk.textAr),
      icon: cleanText(tk.icon, 8) || '🗓',
      rule,
      start: DATE_RE.test(tk.start) ? tk.start : '',
      time: TIME_RE.test(tk.time) ? tk.time : '10:00',
      lateAfter: late,
      remindBefore: cleanReminder(tk.remindBefore),
      role: typeof tk.role === 'string' && roleIds.has(tk.role) ? tk.role : '',
      person: cleanText(tk.person, 60),
      carry: tk.carry !== false,
      paused: tk.paused === true,
    };
  }

  // Default positions and example tasks (tasks name their role by name).
  function defaultRolesAndTasks() {
    const roles = FOH.DEFAULT_ROLES.map((name) => ({ id: uid(), name }));
    const byName = new Map(roles.map((r) => [r.name, r.id]));
    const tasks = FOH.DEFAULT_TASKS.map((tk) => ({
      text: tk.text,
      textAr: tk.ar,
      icon: tk.icon,
      rule: tk.rule,
      time: tk.time,
      role: byName.get(tk.role) || '',
    }));
    const staff = FOH.DEFAULT_STAFF.map((p) => ({ ...p, role: byName.get(p.role) || '' }));
    return { roles, tasks, staff };
  }

  // Example staff for lists saved before staff existed (matched by position name).
  function defaultStaff(roles) {
    const byName = new Map(roles.map((r) => [r.name, r.id]));
    return FOH.DEFAULT_STAFF.map((p) => ({ ...p, role: byName.get(p.role) || '' }));
  }

  function fromDefaults() {
    const conv = (it) => ({
      text: it.text,
      textAr: it.ar,
      due: it.due,
      children: list(it.children).map(conv),
    });
    return normalize({
      ...defaultRolesAndTasks(),
      sections: FOH.DEFAULT_SECTIONS.map((s) => ({
        title: s.title,
        titleAr: s.ar,
        icon: s.icon,
        items: s.items.map(conv),
      })),
    });
  }

  const asList = (v) => (v === undefined ? [] : [].concat(v));

  // Index of the original sheet: English text (current or earlier) -> definition.
  function defaultsIndex() {
    const items = new Map();
    const sections = new Map();
    const add = (def) => {
      items.set(def.text, def);
      asList(def.was).forEach((w) => items.set(w, def));
      list(def.children).forEach(add);
    };
    FOH.DEFAULT_SECTIONS.forEach((s) => {
      sections.set(s.title, s);
      s.items.forEach(add);
    });
    return { items, sections };
  }

  // v1 had no sub-items: move the original sheet's sub-items (by English text)
  // under their parent. Item ids are kept, so the day's ticks are not lost.
  function migrateV1(tpl) {
    const idx = defaultsIndex();
    tpl.sections.forEach((section) => {
      section.items.slice().forEach((parent) => {
        const def = idx.items.get(parent.text);
        if (!def || !list(def.children).length || parent.children.length) return;
        def.children.forEach((childDef) => {
          const at = section.items.findIndex(
            (it) => it !== parent && !it.children.length && it.text === childDef.text
          );
          if (at === -1) return;
          const [child] = section.items.splice(at, 1);
          delete child.children;
          parent.children.push(child);
        });
      });
    });
    return tpl;
  }

  // Fill missing Arabic/icons from the original sheet and apply wording fixes
  // ("was", "wasAr"). Text the user edited never matches, so it is left alone.
  function fillDefaults(tpl) {
    const idx = defaultsIndex();
    const fix = (it) => {
      const def = idx.items.get(it.text);
      if (def) {
        if (asList(def.was).includes(it.text)) it.text = def.text;
        if (!it.textAr || asList(def.wasAr).includes(it.textAr)) it.textAr = def.ar;
      }
      list(it.children).forEach(fix);
    };
    tpl.sections.forEach((s) => {
      const def = idx.sections.get(s.title);
      if (def && !s.titleAr) s.titleAr = def.ar;
      if (def && s.icon === DEFAULT_ICON) s.icon = def.icon;
      s.items.forEach(fix);
    });
    return tpl;
  }

  // Raw JSON (saved or imported, any version) -> current template, or null.
  function upgrade(raw) {
    if (raw && !Array.isArray(raw.roles)) raw = { ...raw, ...defaultRolesAndTasks() }; // before v3
    if (raw && Array.isArray(raw.roles) && !Array.isArray(raw.staff)) {
      raw = { ...raw, staff: defaultStaff(raw.roles.filter((r) => r && r.id)) };
    }
    const tpl = normalize(raw);
    if (!tpl) return null;
    if (!(raw.version >= VERSION)) {
      fillDefaults(tpl); // fixes old wording first so texts match the sheet
      migrateV1(tpl);
    }
    return fillDefaults(tpl);
  }

  function emptyRun() {
    return { supervisor: '', captain: '', assistant: '', checked: {} };
  }

  FOH.store = {
    uid,
    clone,
    upgrade,
    TIME_RE,
    cleanReminder,
    DEFAULT_ICON,
    loadTemplate() {
      const raw = read(TPL_KEY);
      const tpl = upgrade(raw);
      if (!tpl) {
        // Save the default list at once: positions, staff and tasks need stable ids.
        const fresh = fromDefaults();
        write(TPL_KEY, fresh);
        return fresh;
      }
      if (raw.version !== VERSION) write(TPL_KEY, tpl); // keep the upgraded form
      return tpl;
    },
    saveTemplate(tpl) {
      return write(TPL_KEY, tpl);
    },
    defaultTemplate: fromDefaults,
    loadRun(date) {
      const run = read(RUN_PREFIX + date);
      if (!run || typeof run !== 'object') return emptyRun();
      return {
        supervisor: cleanText(run.supervisor),
        captain: cleanText(run.captain),
        assistant: cleanText(run.assistant),
        checked: run.checked && typeof run.checked === 'object' ? run.checked : {},
      };
    },
    saveRun(date, run) {
      return write(RUN_PREFIX + date, run);
    },
    // Scheduled-task history: { taskId: [{ occ, done, at, by }] }, newest last.
    loadLog() {
      const log = read(LOG_KEY);
      return log && typeof log === 'object' && !Array.isArray(log) ? log : {};
    },
    saveLog(log) {
      Object.keys(log).forEach((k) => (log[k] = list(log[k]).slice(-40)));
      return write(LOG_KEY, log);
    },
    // Who uses this device: { role: roleId, name }.
    loadMe() {
      const me = read(ME_KEY) || {};
      return {
        staffId: typeof me.staffId === 'string' ? me.staffId : '',
        role: typeof me.role === 'string' ? me.role : '',
        name: cleanText(me.name, 60),
      };
    },
    saveMe(me) {
      return write(ME_KEY, me);
    },
  };
})(window.FOH = window.FOH || {});
