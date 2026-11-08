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


  function openQuizModal(targetItem) {
    if (FOH.academyQuiz && FOH.academyQuiz.openQuizModal) {
      return FOH.academyQuiz.openQuizModal(targetItem);
    }
  }

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
