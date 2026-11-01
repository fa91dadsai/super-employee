// Inventory → Stock: per item ✅ good (expected), 🔧 in repair, ❌ written off
// this month; the repair queue ("Back ✓" or "Write off") and this month's
// write-offs with where they came from.
(function (FOH) {
  'use strict';

  const S = FOH.state;
  const IS = FOH.invStore;
  const { t, pick } = FOH.i18n;
  const { el, btn } = FOH.view;
  const nm = (x) => pick(x.name, x.nameAr);
  const M = () => FOH.invManage;
  const month = () => S.date.slice(0, 7);

  function label(id) {
    const f = IS.findVariant(S.inv, id);
    return f ? [nm(f.item), IS.variantLabel(f.item, f.variant)].filter(Boolean).join(' · ') : '—';
  }

  const sumBy = (arr, ids) => arr.filter((x) => ids.has(x.variantId)).reduce((s, x) => s + x.qty, 0);

  function summary(root) {
    const thisMonth = S.inv.writeoffs.filter((w) => (w.date || '').startsWith(month()));
    S.inv.categories.forEach((cat) => {
      const c = M().card(cat.icon, nm(cat));
      c.append(row('', ['✅', '🔧', '❌'], 'h'));
      cat.items.forEach((item) => {
        const vs = IS.active(item);
        const ids = new Set(item.variants.map((v) => v.id));
        const good = vs.reduce((s, v) => s + (v.expected || 0), 0);
        c.append(row(nm(item), [good, sumBy(S.inv.repairs, ids), sumBy(thisMonth, ids)], vs.length > 1 ? 'item-h' : ''));
        if (vs.length > 1) {
          vs.forEach((v) => {
            const one = new Set([v.id]);
            c.append(row(IS.variantLabel(item, v), [v.expected === null ? '—' : v.expected, sumBy(S.inv.repairs, one), sumBy(thisMonth, one)], 'sub'));
          });
        }
      });
      root.append(c);
    });
  }

  function row(name, cells, cls) {
    const r = el('div', 'sk-row' + (cls ? ' ' + cls : ''));
    r.append(el('span', 'n', name), ...cells.map((x) => el('span', '', String(x))));
    return r;
  }

  function repairs(root) {
    const c = M().card('🔧', t('inRepair'), String(S.inv.repairs.reduce((s, r) => s + r.qty, 0)));
    if (!S.inv.repairs.length) c.append(el('p', 'empty', t('nothingRepair')));
    S.inv.repairs.forEach((r) => {
      const line = el('div', 'rq');
      const txt = el('span', 't', label(r.variantId) + ' × ' + r.qty);
      txt.append(el('small', '', [t('since', { date: FOH.tasksView.fmtDay(r.since) }), r.by].filter(Boolean).join(' · ')));
      line.append(txt);
      if (M().can('manage')) line.append(btn('mini-btn ok wide', t('backBtn'), 'rep-back', { id: r.id }), btn('mini-btn no wide', t('writeOffBtn'), 'rep-off', { id: r.id }));
      c.append(line);
    });
    root.append(c);
  }

  function writeoffs(root) {
    const list = S.inv.writeoffs.filter((w) => (w.date || '').startsWith(month()));
    const c = M().card('❌', t('writtenOff'), String(list.reduce((s, w) => s + w.qty, 0)));
    if (!list.length) c.append(el('p', 'empty', t('nothingWriteoff')));
    const src = { count: 'srcCount', report: 'srcReport', repair: 'srcRepair' };
    list
      .slice()
      .reverse()
      .forEach((w) => {
        const line = el('div', 'rq');
        const txt = el('span', 't', label(w.variantId) + ' × ' + w.qty);
        txt.append(el('small', '', [t(src[w.source] || 'srcCount'), FOH.tasksView.fmtDay(w.date), w.by, w.note].filter(Boolean).join(' · ')));
        line.append(txt);
        c.append(line);
      });
    root.append(c);
  }

  function render(root) {
    repairs(root);
    writeoffs(root);
    summary(root);
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
