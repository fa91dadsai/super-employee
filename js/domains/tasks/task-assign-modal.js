// Task Assignment Module
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  function getActiveSheetType() {
    return (FOH.sheetState && FOH.sheetState.getActiveSheetType) ? FOH.sheetState.getActiveSheetType() : 'opening';
  }

  function canCurrentUserAssignTasks() {
    if (FOH.taskAssignmentState && typeof FOH.taskAssignmentState.canCurrentUserAssignTasks === 'function') {
      return FOH.taskAssignmentState.canCurrentUserAssignTasks();
    }
    if (FOH.roleIdentity && typeof FOH.roleIdentity.canCurrentUserAssignTasks === 'function') {
      return FOH.roleIdentity.canCurrentUserAssignTasks();
    }
    return true;
  }

  function createRecurrenceCard(ar, today, nowHM) {
    if (FOH.taskRecurrenceCard && FOH.taskRecurrenceCard.createRecurrenceCard) {
      return FOH.taskRecurrenceCard.createRecurrenceCard(ar, today, nowHM);
    }
    const fallback = el('div', 'task-field-card');
    return { card: fallback, getRecurrenceData: () => ({ isRecurring: false }) };
  }

  function renderAssignModalActionButtons(dlg, title, opts = {}) {
    const isLegacy = typeof opts === 'object' && !('sheetSec' in opts);
    const sheetSec = isLegacy ? opts : (opts && opts.sheetSec);
    const assignee = isLegacy ? arguments[3] : (opts && opts.assignee);
    const recur = isLegacy ? arguments[4] : (opts && opts.recur);
    const ar = isLegacy ? arguments[5] : (opts && typeof opts.ar === 'boolean' ? opts.ar : isAr());
    const acts = el('div', 'sheet-actions');
    acts.style.marginTop = '16px';
    acts.style.display = 'flex';
    acts.style.gap = '10px';

    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.style.flex = '1';
    cancelB.style.minHeight = '48px';
    cancelB.style.fontWeight = '700';
    cancelB.style.borderRadius = '12px';
    cancelB.addEventListener('click', () => dlg.close());

    const saveB = el('button', 'btn primary', '');
    saveB.type = 'button';
    saveB.style.flex = '2';
    saveB.style.minHeight = '48px';
    saveB.style.fontWeight = '700';
    saveB.style.borderRadius = '12px';
    saveB.style.background = 'var(--accent)';
    saveB.style.color = '#fff';
    saveB.style.display = 'flex';
    saveB.style.alignItems = 'center';
    saveB.style.justifyContent = 'center';
    saveB.style.gap = '8px';
    saveB.innerHTML = '<span>✅</span><span>' + (ar ? 'حفظ المهمة وإرسال إشعار' : 'Save & Notify Staff') + '</span>';

    saveB.addEventListener('click', () => {
      const textVal = title.titleIn.value.trim();
      if (!textVal) return title.titleIn.focus();
      FOH.taskAssignmentState.saveAndNotifyTask({
        textVal,
        targetSheet: sheetSec.sheetSel.value,
        targetSecId: sheetSec.secSel.value,
        rKey: assignee.roleSel.value,
        empUser: assignee.empSel.value,
        recurData: recur.getRecurData(),
        ar,
        dlg,
      });
    });

    acts.append(cancelB, saveB);
    return acts;
  }

  function openAssignTaskToStaffOrRoleModal(defaultTargetSheet) {
    const ar = isAr();
    if (!canCurrentUserAssignTasks()) {
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '⚠️ صلاحية تعيين المهام مخصصة للمدير والمشرفين فقط أو لمن تم تفويضه بالإعدادات' : '⚠️ Task assignment is restricted to managers & authorized staff');
      }
      return;
    }
    let dlg = $('assignTaskDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'assignTaskDialog';
      dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
      document.body.append(dlg);
    }
    dlg.replaceChildren();

    const curSheet = defaultTargetSheet || getActiveSheetType();
    const today = (FOH.time && FOH.time.todayISO) ? FOH.time.todayISO() : (S.date || new Date().toISOString().slice(0, 10));
    const nowHM = (FOH.time && FOH.time.nowHM) ? FOH.time.nowHM() : '12:00';

    const box = el('div', 'task-asg-modal-box');
    box.style.padding = '14px 18px 24px';
    box.style.maxHeight = '88dvh';
    box.style.overflowY = 'auto';

    const inp = FOH.taskAssignInputs;
    const header = inp.createAssignModalHeader(dlg, ar);
    const title = inp.createTaskTitleInput(ar);
    const recur = createRecurrenceCard(ar, today, nowHM);
    const sheetSec = inp.createSheetAndSectionCard(ar, curSheet);
    const assignee = inp.createAssigneeCard(ar);

    if (FOH.modalPicker && FOH.modalPicker.enhanceSelect) {
      FOH.modalPicker.enhanceSelect(sheetSec.sheetSel, { title: ar ? 'الشيت المستهدف' : 'Target Shift Sheet', icon: '📋' });
      FOH.modalPicker.enhanceSelect(sheetSec.secSel, { title: ar ? 'القسم الفرعي' : 'Target Section', icon: '📂' });
      FOH.modalPicker.enhanceSelect(assignee.roleSel, { title: ar ? 'المنصب التشغيلي (Position)' : 'Position (Role)', icon: '🪪' });
      FOH.modalPicker.enhanceSelect(assignee.empSel, { title: ar ? 'الموظف المسؤول' : 'Assignee Staff', icon: '👤' });
    }

    const acts = renderAssignModalActionButtons(dlg, title, { sheetSec, assignee, recur, ar });
    box.append(header.grab, header.headerRow, header.descP, title.titleGroup, recur.recurCard, sheetSec.rowSheet, assignee.rowAssign, acts);
    dlg.append(box);
    dlg.showModal();
    title.titleIn.focus();
  }

  FOH.taskAssignModal = {
    openAssignTaskToStaffOrRoleModal,
  };
})(window.FOH = window.FOH || {});
