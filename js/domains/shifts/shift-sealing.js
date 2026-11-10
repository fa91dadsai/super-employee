// foh-opening/js/domains/shifts/shift-sealing.js
// Asynchronous Optimistic Shift Sealing & Cash Float Reconciliation with Tamper-Evident SHA-256 Audit Digest
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const { el } = FOH.view;

  const SEALS_KEY = 'foh-opening.shiftSeals.v1';
  const GRACE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
  const DEFAULT_REFERENCE_FLOAT_FILS = 150000; // 150.000 JOD in integer fils

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  function getSession() {
    return (FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.getSession() : null);
  }

  function getSeals() {
    try {
      return (FOH.safeJsonParse ? FOH.safeJsonParse(localStorage.getItem(SEALS_KEY), '{}') : JSON.parse(localStorage.getItem(SEALS_KEY) || '{}')) || {};
    } catch (err) {
      /* Storage quota fallback */
      return {};
    }
  }

  function saveSeals(seals) {
    try {
      localStorage.setItem(SEALS_KEY, JSON.stringify(seals));
    } catch (err) {
      /* Storage quota fallback */
    }
  }

  function getLatestSealForStation(stationId) {
    const seals = Object.values(getSeals());
    const stationSeals = seals.filter((s) => s.stationId === stationId);
    if (!stationSeals.length) return null;
    stationSeals.sort((a, b) => new Date(b.sealedAt).getTime() - new Date(a.sealedAt).getTime());
    return stationSeals[0];
  }

  // Fast SHA-256 digest with synchronous hex fallback for non-crypto sandboxes
  async function computeSha256Digest(rawText) {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      try {
        const msgBuffer = new TextEncoder().encode(rawText);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        /* Fallback on subtle error */
      }
    }
    // Deterministic lightweight fallback hash for pure test sandboxes
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < rawText.length; i++) {
      const ch = rawText.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
  }

  async function sealShift(opts = {}) {
    const { stationId = 'floor', cashFloatFils = DEFAULT_REFERENCE_FLOAT_FILS, microAudit = {}, advanceFils = 0, advanceNote = '', managerName = '' } = opts;
    const session = getSession();
    const st = S();
    const outgoingUser = (session && session.displayName) || (st.me && st.me.name) || 'Staff';
    const runKey = (st.date || new Date().toISOString().slice(0, 10)) + '|' + ((FOH.sheetState && FOH.sheetState.getActiveSheetType) ? FOH.sheetState.getActiveSheetType() : 'opening');
    const sealedAt = new Date().toISOString();

    const variance = cashFloatFils - DEFAULT_REFERENCE_FLOAT_FILS;
    const rawPayload = JSON.stringify({ runKey, stationId, outgoingUser, cashFloatFils, variance, microAudit, sealedAt });
    const auditDigest = await computeSha256Digest(rawPayload);
    const sealId = 'seal_' + auditDigest.slice(0, 12);

    // If petty cash advance requested, record it cleanly against the weekly tips store
    if (advanceFils > 0 && FOH.tipsStore && FOH.tipsStore.addAdvance) {
      const staffKey = (session && session.username) ? session.username.toLowerCase() : outgoingUser.toLowerCase().replace(/\s+/g, '_');
      const amountJOD = advanceFils / 1000;
      FOH.tipsStore.addAdvance({
        staffKey,
        amountJOD,
        note: advanceNote || 'Shift Handover Petty Advance',
        recordedBy: managerName || 'Manager',
      });
    }

    const record = {
      sealId,
      runKey,
      stationId,
      outgoingUser,
      status: 'sealed',
      cashFloatFils,
      cashVarianceFils: variance,
      pettyCashAdvanceFils: advanceFils,
      microAudit: {
        floatVerified: !!microAudit.floatVerified,
        surfacesSanitized: !!microAudit.surfacesSanitized,
        trashEmptied: !!microAudit.trashEmptied,
      },
      sealedAt,
      auditDigest,
    };

    const seals = getSeals();
    seals[sealId] = record;
    saveSeals(seals);

    if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
      FOH.cloudRealtime.broadcast('SHIFT_SEALED', record);
    }
    return record;
  }

  function acknowledgeSeal(sealId, incomingUser) {
    const seals = getSeals();
    if (!seals[sealId]) return false;
    seals[sealId].status = 'acknowledged';
    seals[sealId].incomingUser = incomingUser || 'Staff';
    seals[sealId].acknowledgedAt = new Date().toISOString();
    saveSeals(seals);
    if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
      FOH.cloudRealtime.broadcast('SHIFT_SEAL_ACKNOWLEDGED', seals[sealId]);
    }
    return true;
  }

  function disputeSeal(sealId, incomingUser, reason) {
    const seals = getSeals();
    if (!seals[sealId]) return false;
    seals[sealId].status = 'disputed';
    seals[sealId].incomingUser = incomingUser || 'Staff';
    seals[sealId].disputeReason = reason || 'Unspecified discrepancy';
    seals[sealId].disputedAt = new Date().toISOString();
    saveSeals(seals);
    if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
      FOH.cloudRealtime.broadcast('SHIFT_SEAL_DISPUTED', seals[sealId]);
    }
    return true;
  }

  function isSealInGraceWindow(seal) {
    if (!seal || !seal.sealedAt) return false;
    const elapsed = Date.now() - new Date(seal.sealedAt).getTime();
    return elapsed <= GRACE_WINDOW_MS;
  }

  // ============================================================================
  // UI Sub-renderers (< 80 lines each)
  // ============================================================================

  function renderMicroAuditChecks(auditState, ar) {
    const box = el('div', 'micro-audit-box');
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.gap = '8px';
    box.style.margin = '10px 0';

    const checks = [
      { key: 'floatVerified', label: ar ? '💰 تم مطابقة رصيد كاش الدرج (Float)' : '💰 Cash Float Verified' },
      { key: 'surfacesSanitized', label: ar ? '✨ تم مسح وتعقيم الطاولات والكاونتر' : '✨ Surfaces Sanitized' },
      { key: 'trashEmptied', label: ar ? '🗑️ تم تفريغ سلات المهملات وتغيير الأكياس' : '🗑️ Trash Emptied' },
    ];

    checks.forEach((chk) => {
      const lbl = el('label', 'audit-chk-row');
      lbl.style.display = 'flex';
      lbl.style.alignItems = 'center';
      lbl.style.gap = '8px';
      lbl.style.fontSize = '0.84rem';
      lbl.style.cursor = 'pointer';

      const inp = el('input', '');
      inp.type = 'checkbox';
      inp.checked = !!auditState[chk.key];
      inp.addEventListener('change', () => { auditState[chk.key] = inp.checked; });
      lbl.append(inp, el('span', '', chk.label));
      box.append(lbl);
    });
    return box;
  }

  function renderCashFloatInputs(floatState, ar) {
    const row = el('div', 'float-inputs-row');
    row.style.background = 'var(--surface2, rgba(255,255,255,0.03))';
    row.style.padding = '8px 10px';
    row.style.borderRadius = '8px';
    row.style.margin = '8px 0';

    const lbl = el('div', '', ar ? '💵 رصيد الصندوق الفعلي (دينار):' : '💵 Actual Cash Float (JOD):');
    lbl.style.fontSize = '0.8rem';
    lbl.style.fontWeight = '700';

    const inFloat = el('input', 'in');
    inFloat.type = 'number';
    inFloat.step = '0.25';
    inFloat.value = (floatState.jod || 150).toFixed(3);
    inFloat.style.marginTop = '4px';
    inFloat.style.width = '100%';
    inFloat.addEventListener('input', () => {
      floatState.jod = parseFloat(inFloat.value) || 0;
      floatState.fils = Math.round(floatState.jod * 1000);
    });

    row.append(lbl, inFloat);
    return row;
  }

  function openShiftSealModal(opts = {}) {
    const ar = isAr();
    const stationId = opts.stationId || ((FOH.modeDeptPanels && FOH.modeDeptPanels.getActiveDept) ? FOH.modeDeptPanels.getActiveDept() : 'floor');
    const auditState = { floatVerified: true, surfacesSanitized: true, trashEmptied: true };
    const floatState = { jod: 150, fils: 150000 };

    const dlg = el('dialog', 'sheet shift-seal-dlg');
    dlg.style.maxWidth = '420px';
    dlg.style.width = '92%';
    dlg.style.padding = '16px';
    dlg.style.borderRadius = '16px';

    const head = el('div', 'seal-dlg-head');
    head.style.display = 'flex';
    head.style.justifyContent = 'space-between';
    head.style.alignItems = 'center';
    head.innerHTML = '<h3 style="margin:0;font-size:1.02rem;">🔒 ' +
      (ar ? 'تسليم الشفت والختم الرقمي' : 'Optimistic Shift Handover Seal') + '</h3>';
    const closeBtn = el('button', 'btn-close', '×');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => dlg.close());
    head.append(closeBtn);

    const desc = el('p', '', ar
      ? 'تحقق من مطابقة الصندوق ونظافة المحطة قبل الختم. يتيح الختم الرقمي المغادرة الفورية مع إشعار للمستلم.'
      : 'Verify cash float and cleanliness before sealing. Enables immediate departure with a tamper-evident audit receipt.');
    desc.style.fontSize = '0.78rem';
    desc.style.color = 'var(--ink2)';

    const btnSeal = el('button', 'btn primary', ar ? '🔒 ختم وتسليم الشفت' : '🔒 Seal Shift Handover');
    btnSeal.type = 'button';
    btnSeal.style.width = '100%';
    btnSeal.style.minHeight = '42px';
    btnSeal.style.marginTop = '12px';
    btnSeal.addEventListener('click', async () => {
      if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
      btnSeal.disabled = true;
      btnSeal.textContent = ar ? 'جاري الختم وتوليد الشيفرة...' : 'Computing seal hash...';
      const record = await sealShift({ stationId, cashFloatFils: floatState.fils, microAudit: auditState });
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '✓ تم ختم الشفت وتوليد إيصال التسليم: ' + record.sealId : '✓ Shift sealed: ' + record.sealId);
      }
      dlg.close();
      if (opts.onComplete) opts.onComplete(record);
    });

    dlg.append(head, desc, renderCashFloatInputs(floatState, ar), renderMicroAuditChecks(auditState, ar), btnSeal);
    document.body.append(dlg);
    dlg.showModal();
    dlg.addEventListener('close', () => dlg.remove());
  }

  function renderPendingHandoverPill(container, stationId) {
    if (!container) return;
    const latest = getLatestSealForStation(stationId);
    if (!latest || latest.status !== 'sealed' || !isSealInGraceWindow(latest)) return;

    const ar = isAr();
    const pill = el('div', 'pending-handover-pill');
    pill.style.background = 'rgba(39, 174, 96, 0.1)';
    pill.style.border = '1px solid #27ae60';
    pill.style.borderRadius = '10px';
    pill.style.padding = '8px 12px';
    pill.style.margin = '8px 0';
    pill.style.display = 'flex';
    pill.style.justifyContent = 'space-between';
    pill.style.alignItems = 'center';

    const info = el('div', '');
    info.innerHTML = '<span style="font-weight:700;font-size:0.82rem;color:#27ae60;">🤝 ' +
      (ar ? 'تسليم شفت معلّق من: ' : 'Pending Handover from: ') + FOH.escapeHtml(latest.outgoingUser) + '</span>' +
      '<small style="display:block;font-size:0.72rem;color:var(--ink2);">' +
      (ar ? 'رصيد الصندوق: ' + (latest.cashFloatFils / 1000).toFixed(3) + ' د.أ' : 'Float: ' + (latest.cashFloatFils / 1000).toFixed(3) + ' JOD') + '</small>';

    const acts = el('div', '');
    acts.style.display = 'flex';
    acts.style.gap = '6px';

    const ackBtn = el('button', 'btn sm primary', ar ? 'قبول ✓' : 'Accept ✓');
    ackBtn.type = 'button';
    ackBtn.addEventListener('click', () => {
      acknowledgeSeal(latest.sealId);
      pill.remove();
      if (FOH.edit && FOH.edit.toast) FOH.edit.toast(ar ? '✓ تم اعتماد استلام الشفت' : '✓ Shift handover accepted');
    });

    const dispBtn = el('button', 'btn sm danger', ar ? 'اعتراض' : 'Dispute');
    dispBtn.type = 'button';
    dispBtn.addEventListener('click', () => {
      const reason = prompt(ar ? 'يرجى كتابة سبب الاعتراض (مثال: نقص في رصيد الصندوق أو عدم نظافة الطاولات):' : 'Enter dispute reason:');
      if (reason) {
        disputeSeal(latest.sealId, null, reason);
        pill.remove();
        if (FOH.edit && FOH.edit.toast) FOH.edit.toast(ar ? '⚠️ تم رفع اعتراض للإدارة' : '⚠️ Handover disputed');
      }
    });

    acts.append(ackBtn, dispBtn);
    pill.append(info, acts);
    container.prepend(pill);
  }

  FOH.shiftSealing = {
    SEALS_KEY,
    GRACE_WINDOW_MS,
    DEFAULT_REFERENCE_FLOAT_FILS,
    getSeals,
    saveSeals,
    getLatestSealForStation,
    computeSha256Digest,
    sealShift,
    acknowledgeSeal,
    disputeSeal,
    isSealInGraceWindow,
    openShiftSealModal,
    renderPendingHandoverPill,
  };
})(window.FOH = window.FOH || {});

