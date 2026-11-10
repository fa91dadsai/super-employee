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
    } catch (err) { /* Suggestions storage read fallback */ }
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
    } catch (err) { /* Suggestions storage write fallback */ }
  }

  function loadItemNotes() {
    try {
      return FOH.safeJsonParse(localStorage.getItem(NOTES_KEY), '{}');
    } catch (err) {
      /* Item notes storage read fallback */
      return {};
    }
  }

  function saveItemNotes(map) {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(map));
    } catch (err) { /* Notes storage quota fallback */ }
  }

  function renderGovStatusBadge(gov, canEdit, ar) {
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
    return status;
  }

  function appendManagerGovButtons(actions, opts = {}) {
    const { gov, sess, ar } = opts;
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

  function renderGovActionButtons(opts = {}) {
    const { gov, canEdit, isMgr, sess, ar } = opts;
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
      appendManagerGovButtons(actions, { gov, sess, ar });
    }
    return actions;
  }

  function handleApproveSuggestion(sg, secTitle, ar) {
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
      if (typeof notifyMobileOnNewTaskAdded === 'function') {
        notifyMobileOnNewTaskAdded({
          titleEn: sg.text || sg.textAr,
          titleAr: sg.textAr || sg.text,
          sectionLabel: secTitle,
          roleLabel: sg.by,
        });
      }
    }
    const allSugs = loadSuggestions();
    const found = allSugs.find((x) => x.id === sg.id);
    if (found) found.status = 'approved';
    saveSuggestions(allSugs);
    FOH.edit.toast(ar ? 'تمت الموافقة وإضافة المهمة إلى الشيك ليست ✓' : 'Suggestion approved and added to checklist ✓');
    FOH.app.render();
  }

  function renderSuggestionRow(sg, ar) {
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
    appBtn.addEventListener('click', () => handleApproveSuggestion(sg, secTitle, ar));

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
    return row;
  }

  function renderSuggestionsAccordion(sugs, ar) {
    const qBox = el('details', 'sug-card sug-accordion');
    qBox.style.width = '100%';
    qBox.style.marginTop = '8px';
    qBox.style.marginBottom = '0';

    const summary = el('summary', 'sug-summary');
    summary.style.display = 'flex';
    summary.style.alignItems = 'center';
    summary.style.justifyContent = 'space-between';
    summary.style.cursor = 'pointer';
    summary.style.padding = '4px 0';
    summary.style.fontWeight = '700';
    summary.style.fontSize = '0.84rem';
    summary.innerHTML =
      '<span style="display:inline-flex;align-items:center;gap:6px;">' +
      '<span>💡</span>' +
      '<b>' + (ar ? 'اقتراحات وملاحظات الموظفين المعلقة (' + sugs.length + ')' : 'Pending Staff Suggestions (' + sugs.length + ')') + '</b>' +
      '</span>' +
      '<span style="font-size:0.75rem;padding:2px 8px;border-radius:12px;background:var(--accent);color:#fff;">' + (ar ? 'مراجعة ▾' : 'Review ▾') + '</span>';
    qBox.append(summary);

    const itemsWrap = el('div', 'sug-items-wrap');
    itemsWrap.style.marginTop = '8px';
    sugs.forEach((sg) => {
      itemsWrap.append(renderSuggestionRow(sg, ar));
    });
    qBox.append(itemsWrap);
    return qBox;
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

    const status = renderGovStatusBadge(gov, canEdit, ar);
    const actions = renderGovActionButtons({ gov, canEdit, isMgr, sess, ar });
    topWrap.append(status, actions);
    bar.append(topWrap);

    if (sugs.length > 0 && isMgr) {
      bar.append(renderSuggestionsAccordion(sugs, ar));
    }
  }

  function openSuggestionModal() {
    if (FOH.suggestionModal && FOH.suggestionModal.openSuggestionModal) {
      return FOH.suggestionModal.openSuggestionModal();
    }
  }

  function injectChecklistItemNotes() {
    if (FOH.checklistItemNotes && FOH.checklistItemNotes.injectChecklistItemNotes) {
      return FOH.checklistItemNotes.injectChecklistItemNotes();
    }
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
