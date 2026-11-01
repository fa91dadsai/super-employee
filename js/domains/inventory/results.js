// Inventory → Results: per item and variant, expected vs counted by condition
// (✅ good, 🔧 repairable, ❌ write-off), flags, likely size mix-ups, blind
// recount of flagged variants, approve, and reported breakage.
(function (FOH) {
  'use strict';

  const S = FOH.state;
  const IS = FOH.invStore;
  const R = FOH.rotate;
  const { t, pick } = FOH.i18n;
  const { el, btn } = FOH.view;
  const nm = (x) => pick(x.name, x.nameAr);
  const M = () => FOH.invManage;
  const fmt = (n) => (n === null || n === undefined ? '—' : String(n));

  // One row per active variant (a submitted recount wins), plus mix-up check:
  // variants off in opposite directions while the item total is fine.
  function itemRows(item, first, again) {
    const rows = IS.active(item).map((v) => {
      const fromAgain = !!(again && again.submittedAt && IS.line(again, v.id));
      const src = fromAgain ? again : first;
      const l = IS.line(src, v.id);
      const total = IS.counted(src, v.id);
      const expected = IS.reference(S.inv, src, v);
      const diff = total === null || expected === null ? null : total - expected;
      return { v, l, total, expected, diff, fromAgain, flagged: IS.isFlagged(S.inv, expected, total) };
    });
    const exp = rows.reduce((s, r) => s + (r.expected || 0), 0);
    const tot = rows.reduce((s, r) => s + (r.total || 0), 0);
    const mix =
      rows.length > 1 &&
      rows.some((r) => r.diff > 0) &&
      rows.some((r) => r.diff < 0) &&
      rows.some((r) => r.flagged) &&
      !IS.isFlagged(S.inv, exp, tot);
    rows.forEach((r) => (r.mix = mix && r.flagged)); // only the variants that cancel out
    return { rows, mix, exp, tot };
  }

  function row(name, sub, cells, cls) {
    const r = el('div', 'rv' + (cls ? ' ' + cls : ''));
    const n = el('span', 'n', name);
    if (sub) n.append(el('small', '', sub));
    r.append(n, ...cells);
    return r;
  }

  function diffCell(r) {
    if (r.diff === null) return el('span', '', '—');
    const cls = r.mix ? 'dpur' : r.flagged ? 'dbad' : r.diff ? 'dmid' : 'd0';
    return el('span', cls, (r.diff > 0 ? '+' : '') + r.diff);
  }

  // Table for one category; returns the flagged/mixed variant ids.
  function categoryTable(c, cat, first, again, sums) {
    c.append(row(t('variantCol'), '', [t('exp'), '✅', '🔧', '❌', t('diff')].map((x) => el('span', '', x)), 'h'));
    const flagged = [];
    cat.items.forEach((item) => {
      const { rows, mix, exp, tot } = itemRows(item, first, again);
      if (!rows.length) return;
      const multi = rows.length > 1;
      if (multi) c.append(row(nm(item), '', [], 'item-h'));
      rows.forEach((r) => {
        const l = r.l || {};
        const notes = [r.fromAgain ? '↻ ' + t('again') : '', l.unsure ? '🤔' : '', l.photo ? '📷' : ''].filter(Boolean).join(' ');
        const label = multi ? IS.variantLabel(item, r.v) : nm(item);
        const cells = [r.expected, l.good, l.repair, l.writeoff].map((x) => el('span', '', fmt(x)));
        const line = row(label, notes, [...cells, diffCell(r)], r.mix ? 'mix' : r.flagged ? 'flagrow' : '');
        if (l.photo) {
          const img = el('img', 'thumb');
          FOH.photos.show(img, l.photo);
          line.firstChild.append(img);
        }
        c.append(line);
        if (r.flagged || r.mix) flagged.push(r.v.id);
        sums.good += l.good || 0;
        sums.repair += l.repair || 0;
        sums.writeoff += l.writeoff || 0;
      });
      if (multi) {
        const tdiff = { diff: tot - exp, flagged: IS.isFlagged(S.inv, exp, tot), mix: false };
        const sum = (k) => rows.reduce((s, r) => s + ((r.l && r.l[k]) || 0), 0);
        c.append(row(t('totalLbl'), '', [exp, sum('good'), sum('repair'), sum('writeoff')].map((x) => el('span', '', fmt(x))).concat(diffCell(tdiff)), 'tot'));
      }
      if (mix) c.append(el('span', 'mixtag', t('mixTag')));
    });
    return flagged;
  }

  function render(root) {
    const key = M().weekKey();
    const w = IS.week(S.inv, key);
    const top = M().card('📊', t('countDayLbl', { day: FOH.tasksView.fmtDay(key) }));
    top.append(M().weekNav(key));
    root.append(top);
    let any = false;
    S.inv.categories.forEach((cat) => {
      const first = w.counts[cat.id];
      if (!first || !first.submittedAt) return;
      any = true;
      const again = w.recounts[cat.id];
      const c = M().card(cat.icon, nm(cat) + ' · ' + M().staffName(first.staffId), first.submittedAt.slice(11));
      const sums = { good: 0, repair: 0, writeoff: 0 };
      const flagged = categoryTable(c, cat, first, again, sums);
      const s3 = el('div', 'sum3');
      [['g', sums.good, 'goodLbl'], ['rp', sums.repair, 'repairLbl'], ['wo', sums.writeoff, 'writeoffLbl']].forEach(([cls, n, k]) => {
        const box = el('div', cls);
        box.append(el('b', '', String(n)), t(k));
        s3.append(box);
      });
      c.append(s3);
      const bar = el('div', 'bar2');
      if (w.approved[cat.id]) bar.append(el('span', 'stamp', t('approved')));
      else if (M().can('manage')) {
        if (again && !again.submittedAt) bar.append(el('span', 'tag', t('recountPending', { name: M().staffName(again.staffId) })));
        else if (flagged.length && !again) {
          const who = R.recounter(S.inv, S.tpl, key, cat.id, first.staffId);
          if (who) bar.append(btn('btn', t('recountBtn', { n: flagged.length, name: M().staffName(who) }), 'inv-recount', { cat: cat.id, who, items: flagged.join(',') }));
        }
        bar.append(btn('btn primary', t('approveBtn'), 'inv-approve', { cat: cat.id }));
      }
      c.append(bar);
      root.append(c);
    });
    if (!any) root.append(el('p', 'empty', t('noCounts')));
    breakage(root);
  }

  function breakage(root) {
    const c = M().card('⚠', t('breakageTitle'), String(S.inv.breakage.filter((b) => !b.approved).length));
    const list = S.inv.breakage.slice(-15).reverse();
    if (!list.length) c.append(el('p', 'empty', t('noBreakage')));
    list.forEach((b) => {
      const f = IS.findVariant(S.inv, b.variantId || b.itemId);
      const label = f ? [nm(f.item), IS.variantLabel(f.item, f.variant)].filter(Boolean).join(' · ') : '—';
      const r = el('div', 'rs brk');
      const name = el('span', 'n', (b.cond === 'repair' ? '🔧 ' : '❌ ') + label);
      name.append(el('small', '', [b.by, b.at, b.note].filter(Boolean).join(' · ')));
      if (b.photo) {
        const img = el('img', 'thumb');
        FOH.photos.show(img, b.photo);
        name.append(img);
      }
      r.append(name, el('span', '', String(b.qty)));
      if (b.approved) r.append(el('span', 'd0', '✓'));
      else if (M().can('manage')) r.append(btn('mini-btn ok', '✓', 'brk-ok', { id: b.id }), btn('mini-btn no', '✕', 'brk-no', { id: b.id }));
      c.append(r);
    });
    root.append(c);
  }

  // Returns true when the action was handled here.
  function onClick(act, b, key) {
    const w = IS.week(S.inv, key);
    const { cat } = b.dataset;
    if (act === 'inv-recount') {
      w.recounts[cat] = { staffId: b.dataset.who, items: b.dataset.items.split(','), lines: {}, submittedAt: null };
    } else if (act === 'inv-approve') {
      const c = S.inv.categories.find((x) => x.id === cat);
      if (c) IS.approve(S.inv, key, c, FOH.time.todayISO() + ' ' + FOH.time.nowHM());
    } else if (act === 'brk-ok' || act === 'brk-no') {
      const br = S.inv.breakage.find((x) => x.id === b.dataset.id);
      if (br && !br.approved && act === 'brk-ok') {
        const id = br.variantId || br.itemId;
        const f = IS.findVariant(S.inv, id);
        const countWeek = S.inv.weeks[br.countKey];
        const incorporated = countWeek && countWeek.approved[br.countCat];
        if (!incorporated && f && f.variant.expected !== null) f.variant.expected = Math.max(0, f.variant.expected - br.qty);
        const day = br.at.slice(0, 10);
        if (br.cond === 'repair') IS.toRepair(S.inv, id, br.qty, day, br.by);
        else IS.writeOff(S.inv, id, br.qty, day, 'report', br.by, br.note);
        br.approved = true;
      }
      if (br && !br.approved && act === 'brk-no') {
        const cw = S.inv.weeks[br.countKey];
        if (cw && cw.approved[br.countCat]) return alert(t('approved'));
        S.inv.breakage = S.inv.breakage.filter((x) => x !== br);
      }
    } else return false;
    IS.save(S.inv);
    FOH.app.render();
    return true;
  }

  FOH.invResults = { render, onClick, itemRows };
})(window.FOH = window.FOH || {});
