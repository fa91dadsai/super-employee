// Modal dialog and form fields for adding new dishes/drinks to Academy.
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { el } = FOH.view;

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
    const list = FOH.academyView.loadAcademyCatalog();
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
    FOH.academyView.saveAcademyCatalog(list);
    if (FOH.edit && FOH.edit.toast) {
      FOH.edit.toast(ar ? 'تمت إضافة الصنف وسؤال الاختبار إلى الأكاديمية ✓' : 'Item added to Academy ✓');
    }
    if (FOH.app && FOH.app.render) FOH.app.render();
  }

  function openAddAcademyItemModal() {
    const ar = FOH.i18n ? FOH.i18n.lang === 'ar' : false;
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

  FOH.academyAddModal = {
    openAddAcademyItemModal,
  };
})(window.FOH = window.FOH || {});

