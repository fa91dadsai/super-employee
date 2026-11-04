// foh-opening/js/domains/tips/tips-modal.js
// Cash Advance Voucher Modal, Manager Step-Up & Receipt Generator
(function (FOH) {
  'use strict';

  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : true;
  }

  function buildVoucherText(opts = {}) {
    const { emp, amountJOD, note, recordedBy, date, timeHM } = opts;
    const lines = [
      '🧾 *CEEN & OASIS | سند سلفة من التبس*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      `👤 المستلم: ${emp.name} (${emp.role || 'Staff'})`,
      `💵 المبلغ: ${Number(amountJOD).toFixed(3)} JOD`,
      `📅 التاريخ: ${date} ${timeHM || ''}`,
      `📝 البيان: ${note || 'سلفة نقدية'}`,
      `✍️ اعتماد: ${recordedBy || 'Manager'}`,
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      'يرجى الاحتفاظ بالسند لتوثيق التسوية الأسبوعية.',
    ];
    return lines.join('\n');
  }

  function shareVoucherWhatsApp(opts = {}) {
    const text = buildVoucherText(opts);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => { /* Clipboard fallback */ });
    }
    const url = 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener');
  }

  function renderQuickChips(inputEl) {
    const chipRow = el('div', '');
    chipRow.style.display = 'flex';
    chipRow.style.gap = '8px';
    chipRow.style.flexWrap = 'wrap';
    chipRow.style.marginTop = '6px';
    chipRow.style.marginBottom = '12px';

    [5, 10, 15, 20, 50].forEach((amt) => {
      const chip = el('button', 'btn small', amt + ' JOD');
      chip.type = 'button';
      chip.style.padding = '4px 10px';
      chip.style.minHeight = '32px';
      chip.addEventListener('click', () => { inputEl.value = String(amt); });
      chipRow.append(chip);
    });
    return chipRow;
  }

  function renderReasonChips(inputEl) {
    const reasons = isAr()
      ? ['سلفة نقدية', 'مواصلات', 'طوارئ', 'سحبة من التبس']
      : ['Cash Advance', 'Transport', 'Emergency', 'Tip Draw'];
    const row = el('div', '');
    row.style.display = 'flex';
    row.style.gap = '6px';
    row.style.flexWrap = 'wrap';
    row.style.marginTop = '6px';
    row.style.marginBottom = '12px';

    reasons.forEach((r) => {
      const b = el('button', 'snooze-btn', r);
      b.type = 'button';
      b.style.fontSize = '12px';
      b.style.padding = '3px 8px';
      b.addEventListener('click', () => { inputEl.value = r; });
      row.append(b);
    });
    return row;
  }

  function createAdvanceDialogContent(opts = {}) {
    const { emp, staffKey, overlay, onSaved, ar, recorder } = opts;
    const dialog = el('div', 'modal-box');
    dialog.style.maxWidth = '460px';
    dialog.style.width = '92%';
    dialog.style.padding = '20px';

    const title = el('h3', '', '💸 ' + (ar ? 'تسجيل سلفة نقدية من التبس' : 'Record Tip Advance'));
    const sub = el('p', '', (ar ? 'الموظف: ' : 'Staff: ') + emp.name + ' · ' + (emp.role || ''));
    sub.style.color = 'var(--ink2)';
    sub.style.marginBottom = '14px';

    const amtLabel = el('label', '', ar ? 'قيمة السلفة بالدينار (JOD):' : 'Advance Amount in JOD:');
    const amtInput = el('input', 'in');
    amtInput.type = 'number';
    amtInput.step = '1';
    amtInput.min = '1';
    amtInput.value = '10';

    const quickChips = renderQuickChips(amtInput);
    const noteLabel = el('label', '', ar ? 'البيان / ملاحظة السلفة:' : 'Reason / Note:');
    const noteInput = el('input', 'in');
    noteInput.value = ar ? 'سلفة نقدية' : 'Cash Advance';
    const reasonChips = renderReasonChips(noteInput);

    const btnRow = createAdvanceActionButtons({ amtInput, noteInput, staffKey, recorder, overlay, onSaved, ar });
    dialog.append(title, sub, amtLabel, amtInput, quickChips, noteLabel, noteInput, reasonChips, btnRow);
    return { dialog, amtInput };
  }

  function createAdvanceActionButtons(opts = {}) {
    const { amtInput, noteInput, staffKey, recorder, overlay, onSaved, ar } = opts;
    const btnRow = el('div', '');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';
    btnRow.style.marginTop = '16px';

    const cancelBtn = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelBtn.type = 'button';
    cancelBtn.style.flex = '1';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const submitBtn = el('button', 'btn primary', ar ? '✓ تأكيد وحفظ السند' : '✓ Confirm & Save');
    submitBtn.type = 'button';
    submitBtn.style.flex = '1.5';
    submitBtn.addEventListener('click', () => {
      const amt = Number(amtInput.value);
      if (!Number.isFinite(amt) || amt <= 0) return;
      const note = noteInput.value.trim() || (ar ? 'سلفة نقدية' : 'Cash Advance');

      const entry = FOH.tipsStore.addAdvance({ staffKey, amountJOD: amt, note, recordedBy: recorder });
      overlay.remove();
      if (FOH.edit && FOH.edit.toast) FOH.edit.toast(ar ? 'تم توثيق السلفة وسند القبض ✓' : 'Advance recorded ✓');
      if (onSaved) onSaved(entry);
    });

    btnRow.append(cancelBtn, submitBtn);
    return btnRow;
  }

  function openTipAdvanceModal(opts = {}) {
    const { emp, staffKey, onSaved } = opts;
    const ar = isAr();
    const sess = (FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : null;
    const recorder = (sess && sess.displayName) || 'Supervisor';

    const overlay = el('div', 'modal-overlay');
    overlay.style.display = 'flex';
    overlay.style.zIndex = '9999';

    const { dialog, amtInput } = createAdvanceDialogContent({ emp, staffKey, overlay, onSaved, ar, recorder });
    overlay.append(dialog);
    document.body.append(overlay);
    amtInput.focus();
  }

  FOH.tipsModal = {
    buildVoucherText,
    shareVoucherWhatsApp,
    openTipAdvanceModal,
  };
})(window.FOH = window.FOH || {});
