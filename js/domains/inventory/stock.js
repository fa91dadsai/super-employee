// Inventory → Stock: KPI summary strip, per-category stock levels
// (✅ good, 🔧 in repair, ❌ written off this month), and collapsible
// repair queue & monthly write-offs log.
(function (FOH) {
  'use strict';

  const S = FOH.state;
  const IS = FOH.invStore;
  const { t, pick } = FOH.i18n;
  const { el, btn } = FOH.view;
  const nm = (x) => pick(x.name, x.nameAr);
  const M = () => FOH.invManage;
  const month = () => S.date.slice(0, 7);
  const isAr = () => FOH.i18n && FOH.i18n.lang === 'ar';

  function label(id) {
    const f = IS.findVariant(S.inv, id);
    return f ? [nm(f.item), IS.variantLabel(f.item, f.variant)].filter(Boolean).join(' · ') : '—';
  }

  const sumBy = (arr, ids) => arr.filter((x) => ids.has(x.variantId)).reduce((s, x) => s + x.qty, 0);

  function renderKpiStrip(root) {
    const ar = isAr();
    const thisMonth = S.inv.writeoffs.filter((w) => (w.date || '').startsWith(month()));
    const anyBlind = S.inv.categories.some(
      (cat) => IS.hasPendingBlindCount && IS.hasPendingBlindCount(S.inv, S.tpl, S.date, S.me && S.me.staffId, cat.id)
    );
    const totalGood = anyBlind
      ? '🔒'
      : S.inv.categories.reduce(
          (sum, cat) => sum + cat.items.reduce((s2, it) => s2 + IS.active(it).reduce((s3, v) => s3 + (v.expected || 0), 0), 0),
          0
        );
    const totalRepair = S.inv.repairs.reduce((s, r) => s + r.qty, 0);
    const totalLost = thisMonth.reduce((s, w) => s + w.qty, 0);

    const strip = el('div', 'inv-kpi-strip');
    [
      ['kpi-good', '✅', String(totalGood), ar ? 'الرصيد الصالح' : 'Usable Stock'],
      ['kpi-repair', '🔧', String(totalRepair), t('inRepair')],
      ['kpi-lost', '❌', String(totalLost), t('writtenOff')],
    ].forEach(([cls, ico, val, lbl]) => {
      const tile = el('div', 'inv-kpi-tile ' + cls);
      const top = el('div', 'inv-kpi-top');
      top.append(el('span', 'inv-kpi-ico', ico), el('strong', 'inv-kpi-val', val));
      tile.append(top, el('span', 'inv-kpi-lbl', lbl));
      strip.append(tile);
    });
    root.append(strip);
  }

  function row(name, cells, cls) {
    const r = el('div', 'sk-row' + (cls ? ' ' + cls : ''));
    r.append(el('span', 'n', name), ...cells.map((x, idx) => el('span', 'sk-c' + idx, String(x))));
    return r;
  }

  function summary(root) {
    const ar = isAr();
    const thisMonth = S.inv.writeoffs.filter((w) => (w.date || '').startsWith(month()));
    S.inv.categories.forEach((cat) => {
      const isBlindForMe = IS.hasPendingBlindCount && IS.hasPendingBlindCount(S.inv, S.tpl, S.date, S.me && S.me.staffId, cat.id);
      const catGoodTotal = isBlindForMe
        ? '🔒'
        : cat.items.reduce((s, it) => s + IS.active(it).reduce((s2, v) => s2 + (v.expected || 0), 0), 0);
      const rightBadge = isBlindForMe
        ? '🔒 ' + (ar ? 'جرد معلق' : 'Count pending')
        : catGoodTotal + ' ' + (ar ? 'قطعة' : 'pcs');
      const c = M().card(cat.icon, nm(cat), rightBadge);
      c.append(row(ar ? 'الصنف' : 'Item', ['✅', '🔧', '❌'], 'h'));
      cat.items.forEach((item) => {
        const vs = IS.active(item);
        const ids = new Set(item.variants.map((v) => v.id));
        const good = isBlindForMe ? '🔒' : vs.reduce((s, v) => s + (v.expected || 0), 0);
        c.append(row(nm(item), [good, sumBy(S.inv.repairs, ids), sumBy(thisMonth, ids)], vs.length > 1 ? 'item-h' : ''));
        if (vs.length > 1) {
          vs.forEach((v) => {
            const one = new Set([v.id]);
            const expVal = isBlindForMe ? '🔒' : (v.expected === null ? '—' : v.expected);
            c.append(row('↳ ' + IS.variantLabel(item, v), [expVal, sumBy(S.inv.repairs, one), sumBy(thisMonth, one)], 'sub'));
          });
        }
      });
      root.append(c);
    });
  }

  function repairs(root) {
    const total = S.inv.repairs.reduce((s, r) => s + r.qty, 0);
    const det = el('details', 'card inv-card inv-accordion');
    if (total > 0) det.open = true;
    const sum = el('summary', 'head inv-head inv-acc-summary');
    const n = el('span', 'nm');
    n.append(el('span', 'ico', '🔧'), el('span', 'nm-t', t('inRepair')));
    sum.append(n, el('span', 'ct' + (total > 0 ? ' is-warn' : ''), String(total)));
    det.append(sum);

    const body = el('div', 'inv-acc-body');
    if (!S.inv.repairs.length) body.append(el('p', 'empty inv-empty-compact', t('nothingRepair')));
    S.inv.repairs.forEach((r) => {
      const line = el('div', 'rq');
      const txt = el('span', 't', label(r.variantId) + ' × ' + r.qty);
      txt.append(el('small', '', [t('since', { date: FOH.tasksView.fmtDay(r.since) }), r.by].filter(Boolean).join(' · ')));
      line.append(txt);
      if (M().can('manage')) {
        line.append(
          btn('mini-btn ok wide', '✓ ' + t('backBtn'), 'rep-back', { id: r.id }),
          btn('mini-btn no wide', '✕ ' + t('writeOffBtn'), 'rep-off', { id: r.id })
        );
      }
      body.append(line);
    });
    det.append(body);
    root.append(det);
  }

  function writeoffs(root) {
    const list = S.inv.writeoffs.filter((w) => (w.date || '').startsWith(month()));
    const total = list.reduce((s, w) => s + w.qty, 0);
    const det = el('details', 'card inv-card inv-accordion');
    if (total > 0) det.open = true;
    const sum = el('summary', 'head inv-head inv-acc-summary');
    const n = el('span', 'nm');
    n.append(el('span', 'ico', '❌'), el('span', 'nm-t', t('writtenOff')));
    sum.append(n, el('span', 'ct' + (total > 0 ? ' is-danger' : ''), String(total)));
    det.append(sum);

    const body = el('div', 'inv-acc-body');
    if (!list.length) body.append(el('p', 'empty inv-empty-compact', t('nothingWriteoff')));
    const src = { count: 'srcCount', report: 'srcReport', repair: 'srcRepair' };
    list
      .slice()
      .reverse()
      .forEach((w) => {
        const line = el('div', 'rq');
        const txt = el('span', 't', label(w.variantId) + ' × ' + w.qty);
        txt.append(el('small', '', [t(src[w.source] || 'srcCount'), FOH.tasksView.fmtDay(w.date), w.by, w.note].filter(Boolean).join(' · ')));
        line.append(txt);
        body.append(line);
      });
    det.append(body);
    root.append(det);
  }

  function render(root) {
    renderKpiStrip(root);
    summary(root);
    repairs(root);
    writeoffs(root);
  }

  // Returns true when the action was handled here.
  function onClick(act, b) {
    if (act !== 'rep-back' && act !== 'rep-off') return false;
    const r = S.inv.repairs.find((x) => x.id === b.dataset.id);
    if (!r) return true;
    if (act === 'rep-back') {
      const f = IS.findVariant(S.inv, r.variantId);
      if (f) f.variant.expected = (f.variant.expected || 0) + r.qty;
    } else {
      IS.writeOff(S.inv, r.variantId, r.qty, FOH.time.todayISO(), 'repair', S.me.name, '');
    }
    S.inv.repairs = S.inv.repairs.filter((x) => x !== r);
    IS.save(S.inv);
    FOH.app.render();
    return true;
  }

  FOH.invStock = { render, onClick };
})(window.FOH = window.FOH || {});
