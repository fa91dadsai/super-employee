// foh-opening/js/domains/academy/academy-view.js
// Menu & Beverage Training Academy, Verification Quiz & Tip Point Bonus Sync
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const ACADEMY_CATALOG_KEY = 'super-employee.academy.catalog.v2';
  const ACADEMY_PROGRESS_KEY = 'super-employee.academy.progress.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function loadTipsData() {
    return FOH.tipsView ? FOH.tipsView.loadTipsData() : null;
  }

  function saveTipsData(d) {
    if (FOH.tipsView) FOH.tipsView.saveTipsData(d);
  }

  function injectNewTasksInboxIntoNotifCenter() {
    if (FOH.taskInbox) FOH.taskInbox.injectNewTasksInboxIntoNotifCenter();
  }

  // ---- 10. Menu & Beverage Academy + 3-Choice Verification Quiz & Tip Bonus ----
  const ACAD_KEY = 'super-employee.academy.v1';
  const ACAD_PROG_KEY = 'super-employee.acadProgress.v1';

  const DEFAULT_ACADEMY_ITEMS = [
    {
      id: 'dish_wagyu',
      cat: 'food',
      catLabelAr: '🥩 الأطباق الرئيسية',
      catLabelEn: '🥩 Main Dishes',
      nameAr: 'ستيك واغيو تندرلوين (Wagyu Tenderloin 250g)',
      nameEn: 'Wagyu Tenderloin Steak (250g)',
      descAr: 'قطعة تندرلوين واغيو أسترالي فاخرة (درجة رخامية MB7+) تُشوى على فحم السنديان وتُقدّم مع بيوريه البطاطا بالكمأة السوداء وصوص الديمي غلاس.',
      descEn: 'Charcoal-grilled Australian Wagyu Tenderloin (MB7+), served with black truffle potato purée and rich demi-glace.',
      ingredientsAr: 'لحم واغيو 250 غرام، زبدة الأعشاب، بيوريه بطاطا بالكمأة، فطر بري، صوص ديمي غلاس.',
      allergensAr: '⚠️ الحليب ومشتقات الألبان (الزبدة والبيوريه)، الكرفس (في الديمي غلاس). خالٍ من المكسرات.',
      pairingAr: '💡 اقترح معه كأس نبيذ أحمر Cabernet Sauvignon أو كوكتيل Smoky Old Fashioned، درجة الاستواء الموصى بها: Medium Rare.',
      questions: [
        {
          qAr: 'ما هي درجة الاستواء الموصى بها والمكونات المرافقة لطبق الواغيو تندرلوين؟',
          qEn: 'What is the recommended doneness and side for the Wagyu Tenderloin?',
          options: [
            'Medium Rare مع بيوريه البطاطا بالكمأة السوداء وصوص الديمي غلاس',
            'Well Done مع بطاطا مقلية وصوص الفلفل الأبيض',
            'Rare مع أرز بسمتي وصوص الليمون والزبدة',
          ],
          correct: 0,
        },
        {
          qAr: 'ما هي مسببات الحساسية الموجودة في طبق الواغيو تندرلوين؟',
          qEn: 'Which allergens are present in the Wagyu Tenderloin dish?',
          options: [
            'الفول السوداني والسمسم والسمك',
            'مشتقات الألبان (الزبدة والبيوريه) والكرفس في صوص الديمي غلاس',
            'البيض والمحار البحري والصويا',
          ],
          correct: 1,
        },
      ],
    },
    {
      id: 'dish_burrata',
      cat: 'food',
      catLabelAr: '🥗 المقبلات والسلطات',
      catLabelEn: '🥗 Starters & Salads',
      nameAr: 'سلطة البوراتا الإيطالية مع التين والبيستو (Burrata & Fig)',
      nameEn: 'Artisanal Burrata with Fresh Figs & Pistachio Pesto',
      descAr: 'جبنة بوراتا إيطالية كريمية طازجة تُقدّم على طبقة من الطماطم الكرزية المشوية، التين الطازج، صوص البيستو بالفستق الحلبي، وبلسميك معتّق.',
      descEn: 'Creamy Italian Burrata over roasted cherry tomatoes, fresh figs, pistachio basil pesto, and aged balsamic glaze.',
      ingredientsAr: 'جبنة بوراتا 150 غ، تين طازج، طماطم كرزية، ريحان، فستق حلبي، زيت زيتون بكر، بلسميك.',
      allergensAr: '⚠️ الألبان (جبنة البوراتا) والمكسرات (الفستق الحلبي في صوص البيستو). مناسب للنباتيين (Vegetarian).',
      pairingAr: '💡 مثالي للمشاركة في بداية الوجبة مع نبيذ أبيض Pinot Grigio أو البروسيكو (Prosecco).',
      questions: [
        {
          qAr: 'أي نوع مكسرات يدخل في تحضير صوص البيستو في سلطة البوراتا (مهم لحساسية المكسرات)؟',
          qEn: 'Which nut is used in the Burrata salad pesto (critical for nut allergies)?',
          options: [
            'اللوز المحمص',
            'الفستق الحلبي (Pistachio)',
            'الكاجو والجوز',
          ],
          correct: 1,
        },
        {
          qAr: 'ما هو المشروب الأنسب لاقتراحه (Pairing) مع سلطة البوراتا الإيطالية؟',
          qEn: 'What is the best beverage pairing to recommend with the Burrata salad?',
          options: [
            'Pinot Grigio أو Prosecco بارد',
            'قهوة إسبريسو داكنة',
            'ستوت بيرة ثقيلة (Dark Stout)',
          ],
          correct: 0,
        },
      ],
    },
    {
      id: 'drink_ceen_mule',
      cat: 'drink',
      catLabelAr: '🍸 الكوكتيلات والمشروبات',
      catLabelEn: '🍸 Signature Cocktails & Bar',
      nameAr: 'كوكتيل سين سيجنتشر (CEEN Mediterranean Mule)',
      nameEn: 'CEEN Mediterranean Mule (Signature Cocktail)',
      descAr: 'كوكتيل منعش متوازن يجمع بين الفودكا الفاخرة، شراب التين والروزماري المحضّر منزلياً، عصير اللايم الطازج، وجنجر بير فوار.',
      descEn: 'Refreshing signature mule blending premium vodka, house-made fig & rosemary cordial, fresh lime juice, and spicy ginger beer.',
      ingredientsAr: '50 مل فودكا Tito’s، 20 مل شراب التين والروزماري، 15 مل عصير لايم طازج، يُستكمل بـ Ginger Beer في كأس نحاسي مع ثلج مجروش.',
      allergensAr: '⚠️ خالٍ من مسببات الحساسية الشائعة (يحتوي على كحول). متوفر بنسخة Virgin بدون كحول.',
      pairingAr: '💡 يُقدّم في الكأس النحاسي المبرد مع غصن روزماري مدخّن وشريحة تين مجفف.',
      questions: [
        {
          qAr: 'ما هي المقادير الأساسية لكوكتيل CEEN Mediterranean Mule؟',
          qEn: 'What are the core specs for the CEEN Mediterranean Mule?',
          options: [
            '50 مل فودكا + 20 مل شراب التين والروزماري + 15 مل لايم + جنجر بير',
            '60 مل جين + 30 مل فيرموث أحمر + كامباري',
            '45 مل تيكيلا + 30 مل تريبل سيك + عصير برتقال',
          ],
          correct: 0,
        },
        {
          qAr: 'كيف يُقدّم كوكتيل CEEN Mediterranean Mule وما هو الغارنيش المعتمد؟',
          qEn: 'How is the CEEN Mediterranean Mule served and garnished?',
          options: [
            'في كأس مارتيني زجاجي مع زيتونة خضراء',
            'في كأس نحاسي مبرد مع غصن روزماري مدخّن وشريحة تين',
            'في كأس نبيذ أحمر كبير بدون ثلج',
          ],
          correct: 1,
        },
      ],
    },
    {
      id: 'drink_smoky_negroni',
      cat: 'drink',
      catLabelAr: '🍸 الكوكتيلات والمشروبات',
      catLabelEn: '🍸 Signature Cocktails & Bar',
      nameAr: 'سموكي نيجروني المعتّق (CEEN Barrel-Aged Smoky Negroni)',
      nameEn: 'CEEN Barrel-Aged Smoky Negroni',
      descAr: 'نسخة CEEN الخاصة من كوكتيل النيجروني الكلاسيكي، معتّقة مع خشب البلوط المدخّن وقشر البرتقال المحروق.',
      descEn: 'Our signature twist on the classic Negroni, infused with toasted oak smoke and flamed orange peel.',
      ingredientsAr: '30 مل جين Hendrick’s، 30 مل Campari، 30 مل Sweet Vermouth، يُحرّك مع الثلج (Stirred) ويُقدّم فوق قالب ثلج صافي كبير (Clear Ice Cube).',
      allergensAr: '⚠️ يحتوي على الكبريتات (Sulfites) في الفيرموث.',
      pairingAr: '💡 مشروب مثالي قبل العشاء (Aperitif) أو بجانب أطباق اللحوم المشوية والواغيو.',
      questions: [
        {
          qAr: 'ما هي النسب الصحيحة وطريقة تحضير كوكتيل Smoky Negroni؟',
          qEn: 'What are the ratios and technique for the Smoky Negroni?',
          options: [
            'نسب متساوية (30 مل جين، 30 مل كامباري، 30 مل سويت فيرموث) ويُحرّك Stirred فوق ثلج صافي',
            '50 مل جين مع 100 مل تونيك ويُرجّ بالشاكر Shaken',
            '45 مل ويسكي مع بياض بيض وعصير ليمون',
          ],
          correct: 0,
        },
      ],
    },
  ];

  function loadAcademyCatalog() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(ACAD_KEY), 'null');
      if (Array.isArray(raw) && raw.length) return raw;
    } catch (err) { /* Storage read/write fallback */ }
    return DEFAULT_ACADEMY_ITEMS;
  }

  function saveAcademyCatalog(list) {
    try {
      localStorage.setItem(ACAD_KEY, JSON.stringify(list));
    } catch (err) { /* Storage read/write fallback */ }
  }

  function loadAcadProgress() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(ACAD_PROG_KEY), 'null');
      if (raw && typeof raw === 'object') return raw;
    } catch (err) { /* Storage read/write fallback */ }
    return {
      fadi: { xp: 140, masteredIds: ['dish_wagyu', 'dish_burrata', 'drink_ceen_mule'], studiedIds: ['dish_wagyu', 'dish_burrata', 'drink_ceen_mule'], quizAnswered: 14, quizCorrect: 13 },
      ali: { xp: 100, masteredIds: ['dish_wagyu', 'dish_burrata'], studiedIds: ['dish_wagyu', 'dish_burrata'], quizAnswered: 10, quizCorrect: 9 },
      sara: { xp: 60, masteredIds: ['dish_burrata'], studiedIds: ['dish_wagyu', 'dish_burrata'], quizAnswered: 6, quizCorrect: 5 },
      maher: { xp: 120, masteredIds: ['drink_ceen_mule', 'drink_smoky_negroni'], studiedIds: ['drink_ceen_mule', 'drink_smoky_negroni'], quizAnswered: 12, quizCorrect: 11 },
    };
  }

  function saveAcadProgress(prog) {
    try {
      localStorage.setItem(ACAD_PROG_KEY, JSON.stringify(prog));
    } catch (err) { /* Storage read/write fallback */ }
  }

  function getMyAcadRecord() {
    const sess = getSession();
    const uname = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
    const all = loadAcadProgress();
    if (!all[uname]) {
      all[uname] = { xp: 0, masteredIds: [], studiedIds: [], quizAnswered: 0, quizCorrect: 0 };
      saveAcadProgress(all);
    }
    return { uname, rec: all[uname], all };
  }

  // Sync Academy Bonus Tip Points into Tips DB (Every 100 XP = +5 Bonus Tip Points, up to +15 max)
  function syncAcademyBonusToTips(uname, xp) {
    const bonusPts = Math.min(15, Math.floor((xp || 0) / 100) * 5);
    const tipsDB = loadTipsData();
    if (tipsDB.staff && tipsDB.staff[uname]) {
      if (typeof tipsDB.staff[uname].basePoints !== 'number') {
        tipsDB.staff[uname].basePoints = tipsDB.staff[uname].points;
      }
      tipsDB.staff[uname].bonusPoints = bonusPts;
      tipsDB.staff[uname].points = tipsDB.staff[uname].basePoints + bonusPts;
      saveTipsData(tipsDB);
    }
    return bonusPts;
  }

  let acadCatFilter = 'all';

  // ============================================================================
  // Academy Sub-Renderers (< 80 lines each)
  // ============================================================================

  function renderAcademyHero(opts) {
    const { uname, rec, masteredCount, catalogLength, masteryPct, bonusPts, isMgr, ar, onPopQuiz, onAddItem } = opts;
    const hero = el('div', 'acad-hero');
    hero.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">' +
      '<div>' +
      '<h2>🎓 ' + (ar ? 'أكاديمية الأطباق والمشروبات والاختبار الذكي' : 'Menu & Beverage Academy + Quiz Arena') + '</h2>' +
      '<p>' + (ar ? 'ادرس تفاصيل ومكونات وحساسية كل صنف، ثم اجتز اختبار التحقق لكسب نقاط XP ونقاط تبس إضافية!' : 'Study dishes & cocktails, pass the 3-choice verification quiz, and earn XP + Bonus Tip Points!') + '</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<span class="dayoff-badge approved" style="font-size:0.82rem;padding:6px 12px;">⭐ ' + rec.xp + ' XP</span>' +
      '<span class="dayoff-badge pending" style="font-size:0.82rem;padding:6px 12px;">💰 +' + bonusPts + ' ' + (ar ? 'نقطة تبس مكافأة' : 'Bonus Tip Pts') + '</span>' +
      '</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-top:12px;font-weight:700;">' +
      '<span>' + (ar ? 'مرحلة اكتمال التعليم وإتقان المنيو:' : 'Menu Mastery Progress:') + '</span>' +
      '<span>' + masteredCount + ' / ' + catalogLength + ' (' + masteryPct + '%)</span>' +
      '</div>' +
      '<div class="acad-progress-bar"><div style="width:' + masteryPct + '%"></div></div>';

    const heroBtns = el('div', '');
    heroBtns.style.display = 'flex';
    heroBtns.style.flexWrap = 'wrap';
    heroBtns.style.gap = '8px';
    heroBtns.style.marginTop = '12px';

    const popQuizBtn = el('button', 'snooze-btn done-now', ar ? '⚡ ابدأ تحدي الأسئلة السريع (٣ خيارات + نقاط)' : '⚡ Start Quick 3-Choice Quiz (+XP)');
    popQuizBtn.type = 'button';
    popQuizBtn.style.minHeight = '38px';
    popQuizBtn.style.padding = '0 14px';
    popQuizBtn.style.fontSize = '0.82rem';
    popQuizBtn.addEventListener('click', onPopQuiz);
    heroBtns.append(popQuizBtn);

    if (isMgr) {
      const addDishBtn = el('button', 'snooze-btn', ar ? '➕ إضافة طبق أو مشروب جديد للأكاديمية' : '➕ Add New Dish / Drink');
      addDishBtn.type = 'button';
      addDishBtn.style.minHeight = '38px';
      addDishBtn.addEventListener('click', onAddItem);
      heroBtns.append(addDishBtn);
    }
    hero.append(heroBtns);
    return hero;
  }

  function renderAcademyFilterBar(opts) {
    const { catalogLength, masteredCount, onFilterChange, ar } = opts;
    const fBar = el('div', 'ord-view-switch');
    [
      ['all', ar ? 'الكل (' + catalogLength + ')' : 'All (' + catalogLength + ')'],
      ['food', ar ? '🍽 المأكولات والأطباق' : '🍽 Food Dishes'],
      ['drink', ar ? '🍸 المشروبات والبار' : '🍸 Drinks & Bar'],
      ['todo', ar ? '📖 غير مكتمل (' + (catalogLength - masteredCount) + ')' : '📖 To Master (' + (catalogLength - masteredCount) + ')'],
    ].forEach(([k, lbl]) => {
      const b = el('button', acadCatFilter === k ? 'on' : '', lbl);
      b.type = 'button';
      b.addEventListener('click', () => {
        acadCatFilter = k;
        onFilterChange();
      });
      fBar.append(b);
    });
    return fBar;
  }

  function renderAcademyCard(opts) {
    const { item, rec, all, onVerify, ar } = opts;
    const isMastered = rec.masteredIds.includes(item.id);
    const isStudied = rec.studiedIds.includes(item.id);
    const card = el('article', 'acad-item-card' + (isMastered ? ' mastered' : ''));

    const topRow = el('div', '');
    topRow.style.display = 'flex';
    topRow.style.justifyContent = 'space-between';
    topRow.style.alignItems = 'flex-start';
    topRow.style.gap = '8px';

    const statusBadge = isMastered
      ? '<span class="dayoff-badge approved">🎓 ' + (ar ? 'متقن ومعتمد ✓' : 'Mastered ✓') + '</span>'
      : isStudied
      ? '<span class="dayoff-badge pending">🎯 ' + (ar ? 'بانتظار اجتياز الاختبار' : 'Ready for Quiz') + '</span>'
      : '<span class="dayoff-badge">' + (ar ? '📖 قيد التعلم' : '📖 To Study') + '</span>';

    topRow.innerHTML =
      '<div><small style="color:var(--accent);font-weight:800;">' + (ar ? item.catLabelAr : item.catLabelEn) + '</small>' +
      '<h3 style="margin:2px 0;font-size:1.02rem;">' + (ar ? item.nameAr : item.nameEn) + '</h3></div>' +
      statusBadge;

    const desc = el('p', '');
    desc.style.margin = '2px 0';
    desc.style.fontSize = '0.84rem';
    desc.style.lineHeight = '1.5';
    desc.textContent = ar ? item.descAr : item.descEn;

    const meta = el('div', 'acad-meta-box');
    meta.innerHTML =
      '<div><b>🧾 ' + (ar ? 'المكونات والتحضير:' : 'Ingredients & Prep:') + '</b> ' + item.ingredientsAr + '</div>' +
      '<div style="margin-top:4px;"><b>' + item.allergensAr + '</b></div>' +
      '<div style="margin-top:4px;color:var(--accent);"><b>' + item.pairingAr + '</b></div>';

    const actRow = el('div', 'gov-actions');
    actRow.style.marginTop = 'auto';
    actRow.style.paddingTop = '6px';

    const verifyBtn = el(
      'button',
      'btn ' + (isMastered ? '' : 'primary'),
      isMastered
        ? (ar ? '🔄 إعادة اختبار الصنف (+XP)' : '🔄 Retake Item Quiz (+XP)')
        : (ar ? '✓ أتممت تعلّم هذا الصنف — اختبرني الآن!' : '✓ Mark Studied & Take Verification Quiz!')
    );
    verifyBtn.type = 'button';
    verifyBtn.style.width = '100%';
    verifyBtn.addEventListener('click', () => {
      if (!rec.studiedIds.includes(item.id)) {
        rec.studiedIds.push(item.id);
        saveAcadProgress(all);
      }
      onVerify(item);
    });
    actRow.append(verifyBtn);

    card.append(topRow, desc, meta, actRow);
    return card;
  }

  function renderAcademyView(root) {
    if (!root) return;
    root.replaceChildren();
    const ar = isAr();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const catalog = loadAcademyCatalog();
    const { uname, rec, all } = getMyAcadRecord();
    const masteredCount = catalog.filter((it) => rec.masteredIds.includes(it.id)).length;
    const masteryPct = catalog.length ? Math.round((masteredCount * 100) / catalog.length) : 0;
    const bonusPts = syncAcademyBonusToTips(uname, rec.xp);

    const onPopQuiz = () => openQuizModal(null);
    const onAddItem = () => openAddAcademyItemModal();
    const onFilterChange = () => renderAcademyView(root);
    const onVerify = (item) => openQuizModal(item);

    const hero = renderAcademyHero({
      uname,
      rec,
      masteredCount,
      catalogLength: catalog.length,
      masteryPct,
      bonusPts,
      isMgr,
      ar,
      onPopQuiz,
      onAddItem,
    });
    root.append(hero);

    const fBar = renderAcademyFilterBar({ catalogLength: catalog.length, masteredCount, onFilterChange, ar });
    root.append(fBar);

    const grid = el('div', 'acad-grid');
    const filtered = catalog.filter((it) => {
      if (acadCatFilter === 'food') return it.cat === 'food';
      if (acadCatFilter === 'drink') return it.cat === 'drink';
      if (acadCatFilter === 'todo') return !rec.masteredIds.includes(it.id);
      return true;
    });

    filtered.forEach((item) => {
      grid.append(renderAcademyCard({ item, rec, all, onVerify, ar }));
    });
    root.append(grid);
  }

  // ============================================================================
  // Interactive 3-Option Quiz Sub-Renderers (< 80 lines each)
  // ============================================================================

  function buildQuizPool(targetItem, catalog, ar) {
    if (targetItem && Array.isArray(targetItem.questions) && targetItem.questions.length) {
      return targetItem.questions.map((q) => ({
        ...q,
        itemId: targetItem.id,
        itemName: ar ? targetItem.nameAr : targetItem.nameEn,
      }));
    }
    const pool = [];
    catalog.forEach((it) => {
      (it.questions || []).forEach((q) => {
        pool.push({
          ...q,
          itemId: it.id,
          itemName: ar ? it.nameAr : it.nameEn,
        });
      });
    });
    return pool;
  }

  function renderQuizResultScreen(opts) {
    const { box, result, onDone, ar } = opts;
    const { passedAll, earnedXP, correctCount, poolLength, targetItem, rec, bonusPts } = result;
    box.innerHTML =
      '<div style="text-align:center;padding:12px 0;">' +
      '<div style="font-size:2.6rem;">' + (passedAll ? '🏆' : '💡') + '</div>' +
      '<h2 style="margin:8px 0;">' +
      (passedAll
        ? (ar ? 'أحسنت! اجتزت الاختبار بنجاح 100%' : 'Excellent! You passed 100%!')
        : (ar ? 'نتيجة الاختبار: ' + correctCount + ' من ' + poolLength : 'Score: ' + correctCount + ' / ' + poolLength)) +
      '</h2>' +
      '<p style="color:var(--ink2);font-size:0.88rem;">' +
      (targetItem && passedAll
        ? (ar ? 'تم اعتماد إتقانك لصنف (' + (ar ? targetItem.nameAr : targetItem.nameEn) + ') وإضافة +' + earnedXP + ' XP لرصيدك!' : 'Item marked as Mastered and +' + earnedXP + ' XP added!')
        : (ar ? 'حصلت على +' + earnedXP + ' XP (إجمالي رصيدك: ' + rec.xp + ' XP · مكافأة التبس: +' + bonusPts + ' نقطة)' : 'Earned +' + earnedXP + ' XP (Total: ' + rec.xp + ' XP · Bonus Tip Pts: +' + bonusPts + ')')) +
      '</p>' +
      '</div>';

    const doneB = el('button', 'btn primary', ar ? '✓ العودة للأكاديمية وتحديث الرصيد' : '✓ Back to Academy');
    doneB.type = 'button';
    doneB.style.width = '100%';
    doneB.addEventListener('click', onDone);
    box.append(doneB);
  }

  function renderQuizQuestionScreen(opts) {
    const { box, qData, onNext, onCancel, ar } = opts;
    const { cur, idx, total, onAnswerSelect } = qData;
    box.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '<span class="dayoff-badge pending">🎯 ' + (ar ? 'سؤال ' + (idx + 1) + ' من ' + total : 'Question ' + (idx + 1) + ' of ' + total) + '</span>' +
      '<small style="color:var(--ink2);font-weight:700;">' + cur.itemName + '</small>' +
      '</div>' +
      '<h3 style="margin:6px 0 12px;font-size:1.02rem;line-height:1.45;">' + (ar ? cur.qAr : cur.qEn || cur.qAr) + '</h3>';

    const optsWrap = el('div', '');
    const feedback = el('p', '');
    feedback.style.fontWeight = '700';
    feedback.style.fontSize = '0.84rem';
    feedback.style.marginTop = '10px';
    feedback.hidden = true;

    const nextBtn = el(
      'button',
      'btn primary',
      idx + 1 < total ? (ar ? 'السؤال التالي ←' : 'Next Question →') : (ar ? 'عرض النتيجة واعتماد النقاط 🏆' : 'See Result & Claim XP 🏆')
    );
    nextBtn.type = 'button';
    nextBtn.style.width = '100%';
    nextBtn.style.marginTop = '12px';
    nextBtn.hidden = true;
    nextBtn.addEventListener('click', onNext);

    let answered = false;
    (cur.options || []).slice(0, 3).forEach((optText, optIndex) => {
      const b = el('button', 'quiz-opt-btn', (optIndex + 1) + '. ' + optText);
      b.type = 'button';
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const isRight = optIndex === cur.correct;
        onAnswerSelect(isRight);
        if (isRight) {
          b.classList.add('correct');
          feedback.style.color = 'var(--accent)';
          feedback.textContent = ar ? '✅ إجابة صحيحة! (+15 XP)' : '✅ Correct answer! (+15 XP)';
        } else {
          b.classList.add('wrong');
          const allBtns = optsWrap.querySelectorAll('.quiz-opt-btn');
          if (allBtns[cur.correct]) allBtns[cur.correct].classList.add('correct');
          feedback.style.color = 'var(--danger)';
          feedback.textContent = ar ? '❌ إجابة غير دقيقة — راجع الخيار الصحيح باللون الأخضر.' : '❌ Not quite — check the highlighted correct option.';
        }
        feedback.hidden = false;
        nextBtn.hidden = false;
      });
      optsWrap.append(b);
    });

    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Close');
    cancelB.type = 'button';
    cancelB.style.width = '100%';
    cancelB.style.marginTop = '8px';
    cancelB.addEventListener('click', onCancel);

    box.append(optsWrap, feedback, nextBtn, cancelB);
  }

  function openQuizModal(targetItem) {
    const ar = isAr();
    const catalog = loadAcademyCatalog();
    const { uname, rec, all } = getMyAcadRecord();
    const pool = buildQuizPool(targetItem, catalog, ar);
    if (!pool.length) return;

    let idx = 0;
    let correctCount = 0;

    let dlg = $('acadQuizDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'acadQuizDialog';
      document.body.append(dlg);
    }

    function drawQuestion() {
      dlg.replaceChildren();
      const box = el('div', '');
      box.style.padding = '16px 18px 22px';

      if (idx >= pool.length) {
        const passedAll = correctCount === pool.length;
        const earnedXP = correctCount * 15 + (targetItem && passedAll ? 20 : 0);
        rec.xp = (rec.xp || 0) + earnedXP;
        rec.quizAnswered = (rec.quizAnswered || 0) + pool.length;
        rec.quizCorrect = (rec.quizCorrect || 0) + correctCount;
        if (targetItem && passedAll && !rec.masteredIds.includes(targetItem.id)) {
          rec.masteredIds.push(targetItem.id);
        }
        saveAcadProgress(all);
        const bonusPts = syncAcademyBonusToTips(uname, rec.xp);

        renderQuizResultScreen({
          box,
          result: { passedAll, earnedXP, correctCount, poolLength: pool.length, targetItem, rec, bonusPts },
          onDone: () => { dlg.close(); FOH.app.render(); },
          ar,
        });
        dlg.append(box);
        return;
      }

      renderQuizQuestionScreen({
        box,
        qData: {
          cur: pool[idx],
          idx,
          total: pool.length,
          onAnswerSelect: (isRight) => { if (isRight) correctCount++; },
        },
        onNext: () => { idx++; drawQuestion(); },
        onCancel: () => dlg.close(),
        ar,
      });
      dlg.append(box);
      if (typeof injectNewTasksInboxIntoNotifCenter === "function") injectNewTasksInboxIntoNotifCenter();
    }

    drawQuestion();
    dlg.showModal();
  }

  // ============================================================================
  // Add Academy Dish / Cocktail Sub-Renderers (< 80 lines each)
  // ============================================================================

  function buildAddAcademyFormFields(ar) {
    const catSel = el('select', 'in');
    catSel.innerHTML =
      '<option value="food">🍽 ' + (ar ? 'طبق طعام (Food)' : 'Food Dish') + '</option>' +
      '<option value="drink">🍸 ' + (ar ? 'مشروب / كوكتيل بار (Drink)' : 'Bar Drink / Cocktail') + '</option>';

    const nameIn = el('input', 'in');
    nameIn.placeholder = ar ? 'اسم الطبق أو المشروب (مثال: ريزوتو الفطر البري)' : 'Item Name';

    const descIn = el('textarea', 'in');
    descIn.rows = 2;
    descIn.placeholder = ar ? 'التوصيف القصصي وطريقة تقديمه للزبون...' : 'Description & selling pitch...';

    const ingIn = el('input', 'in');
    ingIn.placeholder = ar ? 'المكونات الأساسية ومسببات الحساسية...' : 'Ingredients & allergens...';

    const qIn = el('input', 'in');
    qIn.placeholder = ar ? 'سؤال الاختبار لهذا الصنف...' : 'Verification question...';

    const opt1 = el('input', 'in');
    opt1.placeholder = ar ? 'الخيار ١ (الإجابة الصحيحة ✓)' : 'Option 1 (Correct Answer ✓)';
    const opt2 = el('input', 'in');
    opt2.placeholder = ar ? 'الخيار ٢ (خاطئ)' : 'Option 2 (Wrong)';
    const opt3 = el('input', 'in');
    opt3.placeholder = ar ? 'الخيار ٣ (خاطئ)' : 'Option 3 (Wrong)';

    return { catSel, nameIn, descIn, ingIn, qIn, opt1, opt2, opt3 };
  }

  function saveNewAcademyItem(fields, ar) {
    const { catSel, nameIn, descIn, ingIn, qIn, opt1, opt2, opt3 } = fields;
    const list = loadAcademyCatalog();
    const isFood = catSel.value === 'food';
    list.unshift({
      id: 'acad_' + Date.now(),
      cat: catSel.value,
      catLabelAr: isFood ? '🍽 أطباق المنيو' : '🍸 مشروبات البار',
      catLabelEn: isFood ? '🍽 Menu Dishes' : '🍸 Bar Drinks',
      nameAr: nameIn.value.trim(),
      nameEn: nameIn.value.trim(),
      descAr: descIn.value.trim() || nameIn.value.trim(),
      descEn: descIn.value.trim() || nameIn.value.trim(),
      ingredientsAr: ingIn.value.trim() || 'حسب الوصفة المعتمدة',
      allergensAr: '⚠️ راجع دليل الحساسية مع الشيف / الكابتن',
      pairingAr: '💡 يُقدّم حسب معايير الخدمة المعتمدة في المطعم',
      questions: [
        {
          qAr: qIn.value.trim(),
          qEn: qIn.value.trim(),
          options: [opt1.value.trim(), opt2.value.trim() || 'خيار بديل ١', opt3.value.trim() || 'خيار بديل ٢'],
          correct: 0,
        },
      ],
    });
    saveAcademyCatalog(list);
    FOH.edit.toast(ar ? 'تمت إضافة الصنف وسؤال الاختبار إلى الأكاديمية ✓' : 'Item added to Academy ✓');
    FOH.app.render();
  }

  function openAddAcademyItemModal() {
    const ar = isAr();
    let dlg = $('addAcadDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'addAcadDialog';
      document.body.append(dlg);
    }
    dlg.replaceChildren();

    const form = el('form', '');
    form.method = 'dialog';
    form.innerHTML =
      '<div class="grab"></div>' +
      '<h2>➕ ' + (ar ? 'إضافة طبق أو مشروب جديد للأكاديمية مع سؤال الاختبار' : 'Add Dish / Drink & Verification Question') + '</h2>';

    const f = buildAddAcademyFormFields(ar);

    const actions = el('div', 'sheet-actions');
    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.addEventListener('click', () => dlg.close());

    const saveB = el('button', 'btn primary', ar ? '💾 حفظ الصنف وسؤال الاختبار' : '💾 Save Item & Quiz');
    saveB.type = 'button';
    saveB.addEventListener('click', () => {
      if (!f.nameIn.value.trim() || !f.qIn.value.trim() || !f.opt1.value.trim()) return f.nameIn.focus();
      saveNewAcademyItem(f, ar);
      dlg.close();
    });

    actions.append(cancelB, saveB);
    form.append(f.catSel, f.nameIn, f.descIn, f.ingIn, f.qIn, f.opt1, f.opt2, f.opt3, actions);
    dlg.append(form);
    dlg.showModal();
  }

  FOH.academyView = {
    loadAcademyCatalog,
    saveAcademyCatalog,
    loadAcadProgress,
    saveAcadProgress,
    getMyAcadRecord,
    syncAcademyBonusToTips,
    renderAcademyView,
    openQuizModal,
    openAddAcademyItemModal,
  };
})(window.FOH = window.FOH || {});
