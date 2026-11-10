// foh-opening/js/domains/governance/suggestion-modal.js
// Modal for submitting staff suggestions and improvements (< 350 lines)

(function () {
  'use strict';

  window.FOH = window.FOH || {};

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const { el } = FOH.view || { el: (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; } };

  function isAr() {
    return FOH.i18n && FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth && FOH.sessionAuth.loadSession ? FOH.sessionAuth.loadSession() : null;
  }

  function loadSuggestions() {
    return FOH.suggestions && FOH.suggestions.loadSuggestions ? FOH.suggestions.loadSuggestions() : [];
  }

  function saveSuggestions(list) {
    if (FOH.suggestions && FOH.suggestions.saveSuggestions) {
      FOH.suggestions.saveSuggestions(list);
    }
  }

  function buildSuggestionInputs(ar) {
    const st = S();
    const secLbl = el('label', '', ar ? 'القسم (Section)' : 'Section');
    const secSel = el('select', 'in');
    ((st && st.tpl && st.tpl.sections) || []).forEach((s) => {
      const o = el('option', '', s.icon + ' ' + (FOH.view ? FOH.view.sectionName(s) : s.title));
      o.value = s.id;
      secSel.append(o);
    });
    secLbl.append(secSel);

    const kindLbl = el('label', '', ar ? 'نوع الاقتراح' : 'Suggestion Type');
    const kindSel = el('select', 'in');
    [
      ['add', ar ? '➕ اقتراح إضافة مهمة جديدة للشيك ليست' : '➕ Suggest adding a new checklist task'],
      ['edit', ar ? '✏️ اقتراح تعديل مهمة حالية' : '✏️ Suggest modifying an existing task'],
      ['note', ar ? '💬 ملاحظة ميدانية للمدير حول الشفت' : '💬 General shift note for Manager'],
    ].forEach(([v, txt]) => {
      const o = el('option', '', txt);
      o.value = v;
      kindSel.append(o);
    });
    kindLbl.append(kindSel);

    if (FOH.modalPicker && FOH.modalPicker.enhanceSelect) {
      FOH.modalPicker.enhanceSelect(secSel, {
        title: ar ? 'اختر القسم المقترح' : 'Select Target Section',
        icon: '📂',
      });
      FOH.modalPicker.enhanceSelect(kindSel, {
        title: ar ? 'اختر نوع الاقتراح' : 'Select Suggestion Type',
        icon: '💡',
      });
    }

    const txtArLbl = el('label', '', ar ? 'نص المهمة المقترحة / التعديل (عربي أو إنجليزي)' : 'Suggested Task / Change Text');
    const txtArIn = el('textarea', 'in');
    txtArIn.rows = 2;
    txtArIn.placeholder = ar ? 'مثال: التأكد من تشغيل دفايات التراس قبل الساعة 4:00...' : 'e.g. Check terrace heaters before 16:00...';
    txtArLbl.append(txtArIn);

    const noteLbl = el('label', '', ar ? 'السبب أو ملاحظة إضافية للمدير' : 'Reason or Additional Note');
    const noteIn = el('input', 'in');
    noteIn.placeholder = ar ? 'لماذا تقترح هذا التعديل؟' : 'Why is this helpful?';
    noteLbl.append(noteIn);

    return { secLbl, secSel, kindLbl, kindSel, txtArLbl, txtArIn, noteLbl, noteIn };
  }

  function handleSuggestionSubmit(opts = {}) {
    const { dlg, sess, ar, secSel, kindSel, txtArIn, noteIn } = opts;
    const val = txtArIn.value.trim();
    if (!val) return txtArIn.focus();
    const list = loadSuggestions();
    const st = S();
    list.unshift({
      id: 'sug_' + Date.now(),
      by: (sess && sess.displayName) || (st && st.me && st.me.name) || 'Staff',
      role: (sess && sess.roleName) || 'Staff',
      kind: kindSel.value,
      sectionId: secSel.value,
      text: val,
      textAr: val,
      note: noteIn.value.trim(),
      at: (FOH.time ? FOH.time.todayISO() : '') + ' ' + (FOH.time ? FOH.time.nowHM() : ''),
      status: 'pending',
    });
    saveSuggestions(list);
    dlg.close();
    FOH.edit.toast(ar ? 'تم إرسال اقتراحك للمدير للمراجعة والاعتماد ✓' : 'Suggestion sent to Manager for review ✓');
    FOH.app.render();
  }

  function openSuggestionModal() {
    const ar = isAr();
    const sess = getSession();
    let dlg = $('suggestDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'suggestDialog';
      document.body.append(dlg);
    }
    dlg.replaceChildren();
    const form = el('form', '');
    form.method = 'dialog';
    form.append(
      el('div', 'grab'),
      el('h2', '', ar ? '💡 اقتراح تعديل أو إضافة ملاحظة للشيك ليست' : '💡 Suggest Checklist Change or Note')
    );

    const inputs = buildSuggestionInputs(ar);

    const actions = el('div', 'sheet-actions');
    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.addEventListener('click', () => dlg.close());

    const submitB = el('button', 'btn primary', ar ? '📤 إرسال الاقتراح للمدير' : '📤 Submit Suggestion');
    submitB.type = 'button';
    submitB.addEventListener('click', () => handleSuggestionSubmit({
      dlg,
      sess,
      ar,
      secSel: inputs.secSel,
      kindSel: inputs.kindSel,
      txtArIn: inputs.txtArIn,
      noteIn: inputs.noteIn,
    }));

    actions.append(cancelB, submitB);
    form.append(inputs.secLbl, inputs.kindLbl, inputs.txtArLbl, inputs.noteLbl, actions);
    dlg.append(form);
    dlg.showModal();
  }

  FOH.suggestionModal = {
    buildSuggestionInputs,
    handleSuggestionSubmit,
    openSuggestionModal,
  };
})();

