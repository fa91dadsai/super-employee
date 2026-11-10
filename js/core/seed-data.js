// foh-opening/js/core/seed-data.js
// Default FOH opening checklist, transcribed from the paper "Opening Sheet FOH",
// in English and Arabic. The original sheet number is kept in a comment per line.
// Words the staff use in English (Expeditor, Cash Float, Centerpiece, Terrace)
// stay in English inside the Arabic text. "was"/"wasAr" = earlier wording, so
// lists saved on a device pick up the fix. "children" = sub-items (one level).
(function (FOH) {
  'use strict';

  FOH.DEFAULT_SECTIONS = [
    {
      id: 'sec-bar',
      dept: 'bar',
      icon: '🍸',
      title: 'Bar & Beverage Station',
      titleAr: 'قسم البار والمشروبات',
      assignedRoleKey: 'super_bartender',
      assignedRoleLabel: '🍸 Super Bartender',
      assignedUsername: 'maher',
      items: [
        { text: 'Make sure the bar is clean, polished and service-ready', ar: 'التأكد من نظافة البار ومحطات التحضير وجاهزيتها للخدمة' },
        { text: 'Top up ice wells, draft lines & beverage coolers', ar: 'تعبئة أحواض الثلج وتبريد زجاجات المشروبات والنبيذ' },
        { text: 'Check espresso machine, steam wands & grinder hopper', ar: 'فحص ماكينة الإسبريسو ومطحنة القهوة والتأكد من نقاء البن' },
        { text: 'Cut fresh garnishes (lemon/lime/mint) & prep house syrups', ar: 'تقطيع وتجهيز الغارنيش الطازج والنعناع وفحص العصائر والـ Syrups' },
        { text: 'Wash, polish and inspect all cocktail and wine glasses', ar: 'تلميع وفحص كؤوس الكوكتيل والنبيذ وكاسات التقديم' },
      ],
    },
    {
      id: 'sec-floor',
      dept: 'floor',
      icon: '🍽️',
      title: 'Floor & Dining Tables',
      titleAr: 'قسم الصالة والطاولات',
      assignedRoleKey: 'super_waiter',
      assignedRoleLabel: '⭐ Super Waiter',
      assignedUsername: 'sara',
      items: [
        { text: 'Clean the table tops (Indoor & Outdoor)', ar: 'تنظيف أسطح الطاولات (داخلي وخارجي)' },
        {
          text: 'Set the table (service plate, cutlery, chopsticks, water glass, ashtray, table lamp, centerpiece)',
          ar: 'تجهيز الطاولة (صحن الخدمة، أدوات المائدة، العيدان، كأس الماء، منفضة السجائر، مصباح الطاولة، الـ Centerpiece)',
          children: [
            { text: 'Place the service plate on the table', ar: 'وضع صحن الخدمة على الطاولة' },
            { text: 'Arrange the cutlery (fork and knife in napkin, right of plate)', ar: 'ترتيب أدوات المائدة (الشوكة والسكين داخل المنديل يمين الصحن)' },
            { text: 'Position chopsticks to the right of cutlery', ar: 'وضع العيدان على يمين أدوات المائدة' },
            { text: 'Set the water glass above the cutlery', ar: 'وضع كأس الماء فوق أدوات المائدة' },
            { text: 'Place the centerpiece and table lamp in middle of table', ar: 'وضع الـ Centerpiece ومصباح الطاولة في منتصف الطاولة' },
            { text: 'Place the ashtray in the middle of single tables (1 per 2 guests)', ar: 'وضع منفضة السجائر في منتصف الطاولات المفردة (منفضة لكل شخصين)' },
          ],
        },
        { text: 'Double-check every table is positioned and aligned according to floor plan', ar: 'التأكد من أن كل طاولة في مكانها ومحاذاتها حسب مخطط الصالة' },
        { text: 'Check there is enough clearance for chairs & clean chair seats', ar: 'التأكد من وجود مسافة كافية للكراسي وتنظيف المقاعد' },
        { text: 'Ensure side tables and ice buckets are cleaned & positioned', ar: 'التأكد من أن الطاولات الجانبية ودلاء الثلج في مكانها الصحيح' },
        { text: 'Wipe and clean table bases (Indoor & Outdoor)', ar: 'مسح وتنظيف قواعد الطاولات (داخلي وخارجي)' },
        { text: 'Make sure the terrace is clean & outdoor cushions set', ar: 'التأكد من نظافة التراس وتجهيز الوسائد الخارجية' },
      ],
    },
    {
      id: 'sec-back',
      dept: 'back',
      icon: '🚪',
      title: 'Back Area & Service Station',
      titleAr: 'قسم المنطقة الخلفية والمحطات',
      assignedRoleKey: 'super_waiter',
      assignedRoleLabel: '⭐ Super Waiter / Runner',
      assignedUsername: '',
      items: [
        { text: 'Clean and prepare the expeditor station', ar: 'تنظيف وتجهيز محطة التنسيق (Expeditor)' },
        { text: 'Clean the back area and service corridors', ar: 'تنظيف وترتيب المنطقة الخلفية وممر الخدمة' },
        { text: 'Clean the stations & wipe condiment trays', ar: 'تنظيف المحطات ومسح صواني الإضافات' },
        { text: 'Clean soy sauce bottles, salt & pepper, then refill them', ar: 'تنظيف زجاجات الصويا صوص والملاحات ثم تعبئتها' },
        { text: 'Clean all service trays and bill folders', ar: 'تنظيف جميع صواني الخدمة وحافظات الفواتير' },
        { text: 'Clean tissue boxes and refill them', ar: 'تنظيف علب المناديل وتعبئتها' },
        { text: 'Make sure the W.C. restrooms are clean & stocked', ar: 'التأكد من نظافة دورات المياه وتعبئة الصابون والمحارم' },
        { text: 'Make sure window glass is clean', ar: 'التأكد من نظافة زجاج النوافذ' },
        { text: 'Bring the order from warehouse (ensure enough stock for 2 days)', ar: 'إحضار الطلبية من المستودع (التأكد من أن كل شيء يكفي ليومين)' },
      ],
    },
    {
      id: 'sec-host',
      dept: 'host',
      icon: '🛎️',
      title: 'Host & Reception Desk',
      titleAr: 'قسم الاستقبال والهوست',
      assignedRoleKey: 'super_captain',
      assignedRoleLabel: '🎖️ Super Captain / Host',
      assignedUsername: 'ali',
      items: [
        { text: 'Inspect and clean the Host Stand & welcome entrance', ar: 'فحص وتنظيف كاونتر الاستقبال (Host Stand) ومدخل الصالة' },
        { text: 'Review evening reservations, VIP notes & table plan with Floor Captain', ar: 'مراجعة حجوزات المساء وطلبات الـ VIP وتوزيع الطاولات مع الكابتن' },
        { text: 'Clean and sanitize all food, wine & cocktail menus', ar: 'تنظيف وتعقيم كافة قوائم الطعام والمشروبات والنبيذ' },
        { text: 'Turn on music playlist & adjust ambient lighting', ar: 'تشغيل الموسيقى وضبط الإضاءة الترحيبية والتكييف', due: '15:50' },
        { text: 'Wear uniform, inspect grooming & be ready for service', ar: 'ارتداء الزي الرسمي والجاهزية التامة لاستقبال الضيوف', due: '15:50' },
      ],
    },
    {
      id: 'sec-cash',
      dept: 'cash',
      icon: '💳',
      title: 'Cashier, POS & Tech',
      titleAr: 'قسم الكاشير والأجهزة',
      assignedRoleKey: 'super_manager',
      assignedRoleLabel: '👑 Super Manager',
      assignedUsername: 'fadi',
      items: [
        { text: 'Make sure all Visa machines and ordering tablets are charged', ar: 'التأكد من شحن جميع أجهزة الفيزا والتابلت' },
        { text: 'Verify and change the cash float in till drawer', ar: 'استلام وتبديل نقد الفكة (Cash Float) في درج الكاشير' },
        { text: 'Ensure POS terminals are online and printers ready', ar: 'التأكد من تشغيل نظام نقاط البيع (POS) وجاهزية الطابعات' },
        { text: 'Check the safe vault and set out the daily tip sheet', ar: 'التحقق من الخزنة ووضع ورقة التبس مع تاريخ اليوم' },
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

  const BREAKS = ['writeoff'];
  const ALL = ['repair', 'writeoff'];

  const i = (name, ar, expected, location, opts) => ({ name, ar, expected, location, cond: BREAKS, ...opts });
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

  FOH.DEFAULT_CLOSING_SECTIONS = [
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
        { id: 'c2', text: 'Collect food/drink menus, bill folders & table lamps to station', textAr: 'جمع قوائم الطعام والمشروبات وحافظات الفواتير وإعادتها للمحطة', due: '01:15', role: '', children: [] },
        { id: 'c3', text: 'Close terrace umbrellas, shut off gas heaters & secure cushions', textAr: 'إغلاق مظلات التراس وفصل دفايات الغاز وتأمين الوسائد الخارجية', due: '01:30', role: '', children: [] },
      ],
    },
    {
      id: 'cls-stations',
      dept: 'floor',
      icon: '☕',
      title: 'Waiter Stations & Linen Handover (Floor Dept)',
      titleAr: 'إغلاق محطات الويتر والبياضات (قسم الصالة)',
      items: [
        { id: 'c4', text: 'Send all remaining glassware, plates & cutlery to dishwashing area', textAr: 'إرسال جميع الكؤوس والصحون والشوك والسكاكين المتبقية لمنطقة الغسيل', due: '01:30', role: '', children: [] },
        { id: 'c5', text: 'Wipe condiment trays, refill station base & seal sugar/sauces', textAr: 'تنظيف صواني الإضافات وإغلاق علب السكر والصوصات وتجهيز أساس الصباح', due: '01:40', role: '', children: [] },
        { id: 'c6', text: 'Count dirty linen/napkins for laundry & stage clean morning set', textAr: 'فرز وعدّ المفارش والمناديل المتسخة للغسيل وتجهيز طقم الصباح', due: '01:50', role: '', children: [] },
      ],
    },
    {
      id: 'cls-lockup',
      dept: 'cash',
      icon: '💳',
      title: 'Cashier, Tip Box & Final Restaurant Lockup (At Last Guest 02:00+)',
      titleAr: 'إغلاق الكاشير وصندوق التبس والأمان النهائي (مع آخر زبون 2:00+ ص)',
      items: [
        { id: 'c7', text: 'Close POS terminals (Z-Report) & reconcile Visa slips and cash float', textAr: 'إغلاق أجهزة الكاشير (Z-Report) ومطابقة إيصالات الفيزا والكاش', due: '02:00', role: '', children: [] },
        { id: 'c8', text: 'Log daily tips into Tip Manager box & verify safe/vault is locked', textAr: 'توثيق وتسليم حصيلة التبس اليومي في صندوق Tip Manager وإقفال الخزنة', due: '02:05', role: '', children: [] },
        { id: 'c9', text: 'Switch off A/C units, kitchen pass warmers, sound system & exterior sign', textAr: 'إطفاء المكيفات وسخانات الباص ونظام الصوت واللافتة الخارجية', due: '02:10', role: '', children: [] },
        { id: 'c10', text: 'Inspect restrooms, lock terrace & main doors, set alarm after last guest', textAr: 'تفقد الحمامات وإقفال أبواب التراس والمدخل الرئيسي بعد مغادرة آخر زبون', due: '02:15', role: '', children: [] },
      ],
    },
  ];
})(window.FOH = window.FOH || {});
