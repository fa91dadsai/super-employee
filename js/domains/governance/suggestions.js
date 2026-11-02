// foh-opening/js/domains/governance/suggestions.js
// Checklist Suggestions, Manager Lock Bar & Item-Level Floor Notes
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const SUG_KEY = 'super-employee.suggestions.v1';
  const NOTES_KEY = 'super-employee.itemNotes.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
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

  function notifyMobileOnNewTaskAdded(t) {
    if (FOH.taskInbox && FOH.taskInbox.notifyMobileOnNewTaskAdded) {
      FOH.taskInbox.notifyMobileOnNewTaskAdded(t);
    } else if (FOH.notifCenter && FOH.notifCenter.notifyMobileOnNewTaskAdded) {
      FOH.notifCenter.notifyMobileOnNewTaskAdded(t);
    } else if (FOH.realtime && FOH.realtime.notifyMobileOnNewTaskAdded) {
      FOH.realtime.notifyMobileOnNewTaskAdded(t);
    }
  }

  // ---- 4. Checklist Suggestions & Item Notes ----
  function loadSuggestions() {
    try {
      const list = FOH.safeJsonParse(localStorage.getItem(SUG_KEY), 'null');
      if (Array.isArray(list)) return list;
    } catch {}
    return [
      {
        id: 'sug_demo_1',
        by: 'Sara (Waiter)',
        role: 'Waiter',
        kind: 'add',
        sectionId: (S.tpl.sections[0] && S.tpl.sections[0].id) || '',
        text: 'Check terrace heaters gas level before 16:00',
        textAr: 'فحص مستوى الغاز في دفايات التراس قبل الساعة 4:00 عصرًا',
        note: 'الطقس أصبح باردًا مساءً في التراس',
        at: FOH.time.todayISO() + ' 11:20',
        status: 'pending',
      },
    ];
  }

  function saveSuggestions(list) {
    try {
      localStorage.setItem(SUG_KEY, JSON.stringify(list));
    } catch {}
  }

  function loadItemNotes() {
    try {
      return FOH.safeJsonParse(localStorage.getItem(NOTES_KEY), '{}');
    } catch {
      return {};
    }
  }

  function saveItemNotes(map) {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(map));
    } catch {}
  }

  function renderChecklistGovBar() {
    const bar = $('checklistGovBar');
    if (!bar) return;
    if (S.editing || S.view !== 'opening') {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    bar.replaceChildren();

    const ar = isAr();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const gov = loadGov();
    const canEdit = canCurrentUserEditChecklist();
    const sugs = loadSuggestions().filter((s) => s.status === 'pending');

    const topWrap = el('div', '');
    topWrap.style.width = '100%';
    topWrap.style.display = 'flex';
    topWrap.style.alignItems = 'center';
    topWrap.style.justifyContent = 'space-between';
    topWrap.style.flexWrap = 'wrap';
    topWrap.style.gap = '8px';

    const status = el('div', 'gov-status');
    if (gov.checklistLocked) {
      status.innerHTML = ar
        ? '🔒 <span>الشيك ليست مقفلة من المدير (' + (gov.lockedBy || 'Supervisor') + ')</span>'
        : '🔒 <span>Checklist Locked by Manager (' + (gov.lockedBy || 'Supervisor') + ')</span>';
    } else if (canEdit) {
      status.innerHTML = ar
        ? '🔓 <span>الشيك ليست مفتوحة · لديك صلاحية التعديل المباشر</span>'
        : '🔓 <span>Checklist Unlocked · You have edit permission</span>';
    } else {
      status.innerHTML = ar
        ? '🛡️ <span>وضع التنفيذ للموظف · يمكنك إضافة ملاحظات أو اقتراح تعديل</span>'
        : '🛡️ <span>Staff Execution Mode · Add notes or suggest edits</span>';
    }

    const actions = el('div', 'gov-actions');

    const sugBtn = el('button', 'gov-btn primary', ar ? '💡 اقتراح تعديل / إضافة مهمة' : '💡 Suggest Checklist Edit');
    sugBtn.type = 'button';
    sugBtn.addEventListener('click', () => openSuggestionModal());
    actions.append(sugBtn);

    if (canEdit && !gov.checklistLocked) {
      const editBtn = el('button', 'gov-btn', ar ? '✎ تعديل بنود الشيك ليست' : '✎ Edit Checklist');
      editBtn.type = 'button';
      editBtn.addEventListener('click', () => {
        S.editing = true;
        FOH.app.render();
      });
      actions.append(editBtn);
    }

    if (isMgr) {
      const lockBtn = el(
        'button',
        'gov-btn' + (gov.checklistLocked ? ' warn' : ''),
        gov.checklistLocked
          ? (ar ? '🔓 فتح قفل الشيك ليست' : '🔓 Unlock Checklist')
          : (ar ? '🔒 قفل الشيك ليست' : '🔒 Lock Checklist')
      );
      lockBtn.type = 'button';
      lockBtn.addEventListener('click', () => {
        gov.checklistLocked = !gov.checklistLocked;
        gov.lockedBy = (sess && sess.displayName) || 'Supervisor';
        gov.lockedAt = FOH.time.nowHM();
        if (gov.checklistLocked) S.editing = false;
        saveGov(gov);
        FOH.edit.toast(
          gov.checklistLocked
            ? (ar ? 'تم قفل الشيك ليست بنجاح 🔒' : 'Checklist locked 🔒')
            : (ar ? 'تم فتح قفل الشيك ليست 🔓' : 'Checklist unlocked 🔓')
        );
        FOH.app.render();
      });
      actions.append(lockBtn);

      const permBtn = el('button', 'gov-btn', ar ? '⚙️ صلاحيات الموظفين' : '⚙️ Staff Permissions');
      permBtn.type = 'button';
      permBtn.addEventListener('click', () => {
        S.view = 'settings';
        FOH.app.render();
      });
      actions.append(permBtn);
    }

    topWrap.append(status, actions);
    bar.append(topWrap);

    if (sugs.length > 0 && isMgr) {
      const qBox = el('div', 'sug-card');
      qBox.style.width = '100%';
      qBox.style.marginTop = '8px';
      qBox.style.marginBottom = '0';
      qBox.append(
        el('b', '', ar ? '📥 اقتراحات وملاحظات الموظفين لتعديل الشيك ليست (' + sugs.length + ')' : '📥 Pending Staff Checklist Suggestions (' + sugs.length + ')')
      );
      sugs.forEach((sg) => {
        const row = el('div', 'sug-item');
        const info = el('div', '');
        info.style.flex = '1';
        const secObj = S.tpl.sections.find((s) => s.id === sg.sectionId) || S.tpl.sections[0];
        const secTitle = secObj ? FOH.view.sectionName(secObj) : '';
        info.innerHTML =
          '<b>' + (sg.kind === 'add' ? '➕ ' : '✏️ ') + (ar ? sg.textAr || sg.text : sg.text || sg.textAr) + '</b>' +
          '<small style="display:block;color:var(--ink2);margin-top:2px;">👤 ' + sg.by + ' · 📂 ' + secTitle + ' · 🕒 ' + sg.at + (sg.note ? ' · 💬 ' + sg.note : '') + '</small>';
        const btns = el('div', 'gov-actions');
        const appBtn = el('button', 'gov-btn primary', ar ? '✓ موافقة وإضافة للقائمة' : '✓ Approve & Add');
        appBtn.type = 'button';
        appBtn.addEventListener('click', () => {
          const targetSec = S.tpl.sections.find((s) => s.id === sg.sectionId) || S.tpl.sections[0];
          if (targetSec) {
            targetSec.items.push({
              id: FOH.store.uid(),
              text: sg.text || sg.textAr,
              textAr: sg.textAr || sg.text,
              due: '',
              remindBefore: null,
              role: '',
              children: [],
            });
            FOH.store.saveTemplate(S.tpl);
            if (typeof notifyMobileOnNewTaskAdded === "function") notifyMobileOnNewTaskAdded({ titleEn: sg.text || sg.textAr, titleAr: sg.textAr || sg.text, sectionLabel: secTitle, roleLabel: sg.by });
          }
          const allSugs = loadSuggestions();
          const found = allSugs.find((x) => x.id === sg.id);
          if (found) found.status = 'approved';
          saveSuggestions(allSugs);
          FOH.edit.toast(ar ? 'تمت الموافقة وإضافة المهمة إلى الشيك ليست ✓' : 'Suggestion approved and added to checklist ✓');
          FOH.app.render();
        });
        const rejBtn = el('button', 'gov-btn', ar ? '✕ رفض' : '✕ Reject');
        rejBtn.type = 'button';
        rejBtn.addEventListener('click', () => {
          const allSugs = loadSuggestions();
          const found = allSugs.find((x) => x.id === sg.id);
          if (found) found.status = 'rejected';
          saveSuggestions(allSugs);
          FOH.app.render();
        });
        btns.append(appBtn, rejBtn);
        row.append(info, btns);
        qBox.append(row);
      });
      bar.append(qBox);
    }
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

    const secLbl = el('label', '', ar ? 'القسم (Section)' : 'Section');
    const secSel = el('select', 'in');
    S.tpl.sections.forEach((s) => {
      const o = el('option', '', s.icon + ' ' + FOH.view.sectionName(s));
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

    const actions = el('div', 'sheet-actions');
    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.addEventListener('click', () => dlg.close());

    const submitB = el('button', 'btn primary', ar ? '📤 إرسال الاقتراح للمدير' : '📤 Submit Suggestion');
    submitB.type = 'button';
    submitB.addEventListener('click', () => {
      const val = txtArIn.value.trim();
      if (!val) return txtArIn.focus();
      const list = loadSuggestions();
      list.unshift({
        id: 'sug_' + Date.now(),
        by: (sess && sess.displayName) || S.me.name || 'Staff',
        role: (sess && sess.roleName) || 'Staff',
        kind: kindSel.value,
        sectionId: secSel.value,
        text: val,
        textAr: val,
        note: noteIn.value.trim(),
        at: FOH.time.todayISO() + ' ' + FOH.time.nowHM(),
        status: 'pending',
      });
      saveSuggestions(list);
      dlg.close();
      FOH.edit.toast(ar ? 'تم إرسال اقتراحك للمدير للمراجعة والاعتماد ✓' : 'Suggestion sent to Manager for review ✓');
      FOH.app.render();
    });

    actions.append(cancelB, submitB);
    form.append(secLbl, kindLbl, txtArLbl, noteLbl, actions);
    dlg.append(form);
    dlg.showModal();
  }

  function injectChecklistItemNotes() {
    if (S.editing || S.view !== 'opening') return;
    const notesMap = loadItemNotes();
    const dateKey = S.date;
    const ar = isAr();
    const sess = getSession();

    document.querySelectorAll('#sections li.item').forEach((li) => {
      const cb = li.querySelector('input.ck[data-id]');
      const tx = li.querySelector('.tx');
      if (!cb || !tx) return;
      const itemId = cb.dataset.id;
      const noteKey = dateKey + '|' + itemId;
      const existing = notesMap[noteKey];

      let chip = tx.querySelector('.item-note-chip');
      if (!chip) {
        chip = el('button', 'item-note-chip' + (existing ? ' has-note' : ''), existing ? (ar ? '💬 تعديل الملاحظة' : '💬 Edit note') : (ar ? '💬 +ملاحظة' : '💬 +Note'));
        chip.type = 'button';
        chip.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentTxt = (notesMap[noteKey] && notesMap[noteKey].text) || '';
          const input = prompt(ar ? 'أضف ملاحظة ميدانية على هذه المهمة (اتركها فارغة للمسح):' : 'Add a shift note for this task (leave empty to clear):', currentTxt);
          if (input === null) return;
          if (!input.trim()) {
            delete notesMap[noteKey];
          } else {
            notesMap[noteKey] = {
              text: input.trim(),
              by: (sess && sess.displayName) || S.me.name || 'Staff',
              at: FOH.time.nowHM(),
            };
          }
          saveItemNotes(notesMap);
          FOH.app.render();
        });
        tx.append(chip);
      }

      let disp = tx.querySelector('.item-note-display');
      if (existing && existing.text) {
        if (!disp) {
          disp = el('span', 'item-note-display');
          tx.append(disp);
        }
        disp.textContent = '💬 ' + existing.text + ' — (' + existing.by + ' · ' + existing.at + ')';
      } else if (disp) {
        disp.remove();
      }
    });
  }



  FOH.suggestions = {
    loadSuggestions,
    saveSuggestions,
    loadItemNotes,
    saveItemNotes,
    renderChecklistGovBar,
    openSuggestionModal,
    injectChecklistItemNotes,
  };
})(window.FOH = window.FOH || {});
