// foh-opening/js/domains/inventory/batch-tally.js
// Blind Inventory Count: Batch Tally Calculator & Unit Summation
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const BATCH_KEY = 'foh-opening.batches.v1';

  // ---- Batch Tally Counter inside #countSheet ----
  function loadBatches() {
    try {
      return FOH.safeJsonParse(localStorage.getItem(BATCH_KEY), '{}');
    } catch {
      return {};
    }
  }
  function saveBatches(map) {
    try {
      localStorage.setItem(BATCH_KEY, JSON.stringify(map));
    } catch (err) { /* Batch storage quota fallback */ }
  }

  function injectBatchCounter() {
    const countBody = $('countBody');
    if (!countBody) return;
    const goodInput = countBody.querySelector('input.count-in[data-field="good"]');
    if (!goodInput) return;

    const existing = countBody.querySelector('.batch-box');
    if (existing) existing.remove();

    const itemTitle = (countBody.querySelector('.iname') || {}).textContent || 'item';
    const weekKey = goodInput.dataset.week || (S && S.date) || 'today';
    const variantId = (goodInput.dataset && (goodInput.dataset.variant || goodInput.dataset.id)) || (goodInput.closest('[data-id]') || {}).dataset?.id || '';
    const bKey = weekKey + '|' + (variantId || itemTitle);
    const allBatches = loadBatches();
    const list = Array.isArray(allBatches[bKey]) ? allBatches[bKey] : [];

    const box = el('div', 'batch-box');
    const head = el('div', 'batch-head');
    head.append(el('span', '', t('batchTitle')));
    box.append(head);

    const chips = el('div', 'batch-chips');
    if (!list.length) {
      chips.append(el('span', '', t('batchEmpty')));
    } else {
      list.forEach((n, idx) => {
        chips.append(el('span', 'batch-chip', (idx ? '+ ' : '') + n));
      });
      const sum = list.reduce((a, b) => a + b, 0);
      chips.append(el('span', 'batch-chip', '= ' + sum));
    }
    box.append(chips);

    const btns = el('div', 'batch-btns');
    const applyBatch = (delta) => {
      const cur = Number(goodInput.value) || 0;
      const nextVal = Math.max(0, cur + delta);
      list.push(delta);
      allBatches[bKey] = list;
      saveBatches(allBatches);
      goodInput.value = String(nextVal);
      goodInput.dispatchEvent(new Event('change', { bubbles: true }));
      if (navigator.vibrate) navigator.vibrate(10);
      injectBatchCounter();
    };

    [6, 12, 24, 36].forEach((n) => {
      const b = el('button', 'btn', '+' + n);
      b.type = 'button';
      b.addEventListener('click', () => applyBatch(n));
      btns.append(b);
    });

    const customBtn = el('button', 'btn', t('batchCustom'));
    customBtn.type = 'button';
    customBtn.addEventListener('click', () => {
      const raw = prompt(t('batchPrompt'));
      const n = Math.floor(Number(raw));
      if (n > 0 && n <= 9999) applyBatch(n);
    });
    btns.append(customBtn);

    if (list.length) {
      const undoB = el('button', 'btn', t('batchUndo'));
      undoB.type = 'button';
      undoB.addEventListener('click', () => {
        const last = list.pop() || 0;
        allBatches[bKey] = list;
        saveBatches(allBatches);
        const cur = Number(goodInput.value) || 0;
        goodInput.value = String(Math.max(0, cur - last));
        goodInput.dispatchEvent(new Event('change', { bubbles: true }));
        if (navigator.vibrate) navigator.vibrate(10);
        injectBatchCounter();
      });
      btns.append(undoB);
    }

    box.append(btns);
    const bigRow = goodInput.closest('.cr.big');
    if (bigRow && bigRow.parentElement) {
      bigRow.parentElement.insertBefore(box, bigRow.nextSibling);
    }
  }



  FOH.batchTally = {
    loadBatches,
    saveBatches,
    injectBatchCounter,
  };
})(window.FOH = window.FOH || {});
