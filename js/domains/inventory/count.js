// Staff side of the blind count: the "My tasks" card, the counting screen
// (one item at a time, shuffled, no expected or previous numbers) and
// reporting breakage at any time.
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const IS = FOH.invStore;
  const { t, pick } = FOH.i18n;
  const { el, btn } = FOH.view;
  let C = null; // open count: { key, cat, mode, order, i, entry }

  const save = () => IS.save(S.inv);
  const nowStamp = () => FOH.time.todayISO() + ' ' + FOH.time.nowHM();
  const nm = (x) => pick(x.name, x.nameAr);

  // Stable shuffle per week + category + person: same order when reopened.
  function shuffled(ids, seedText) {
    let h = 2166136261;
    for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
    const out = ids.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  // Counts this device's person must do now (from count day, once published).
  function myCounts() {
    const me = S.me.staffId;
    if (!me) return [];
    const current = IS.countDate(S.inv, S.tpl, S.date);
    const out = [];
    Object.keys(S.inv.weeks).filter((key) => key <= FOH.schedule.addDays(S.date, 7)).sort().forEach((key) => {
      const w = S.inv.weeks[key];
      if (!w.published || key !== current && Object.keys(w.approved || {}).length === S.inv.categories.length) return;
      S.inv.categories.forEach((cat) => {
        const approved = !!(w.approved && w.approved[cat.id]);
        const upcoming = key > S.date;
        if (!IS.leaves(cat).length) return;
        if (approved && key !== current) return;
        const a = w.assign && w.assign[cat.id];
        const entry = w.counts && w.counts[cat.id];
        const late = (entry) => !approved && !(entry && entry.submittedAt) && (S.date > key || FOH.time.nowHM() > S.inv.settings.deadline);
        if (a && a.staffId === me && (!entry || entry.staffId === me)) out.push({ key, cat, mode: 'count', ids: IS.leaves(cat).map((x) => x.id), entry, late: !upcoming && late(entry), approved, upcoming });
        const re = w.recounts && w.recounts[cat.id];
        if (re && re.staffId === me) out.push({ key, cat, mode: 'recount', ids: re.items.filter((id) => IS.findVariant(S.inv, id)), entry: re, late: !upcoming && late(re), approved, upcoming });
      });
    });
    return out;
  }

  const pending = () => myCounts().filter((c) => !c.upcoming && !c.approved && !(c.entry && c.entry.submittedAt)).length;

  function mineCard(root) {
    const counts = myCounts();
    if (!counts.length) return;
    const c = el('section', 'card sched');
    const h = el('div', 'head');
    const title = el('span', 'nm');
    title.append(el('span', 'ico', '📦'), el('span', 'nm-t', t('assignedCounts')));
    h.append(title); c.append(h, el('p', 'count-status-note', t('countExplanation')));
    const ul = el('ol', 'items');
    counts.forEach((x) => {
      const submitted = !!(x.entry && x.entry.submittedAt);
      const doneN = x.ids.filter((id) => { const l = IS.line(x.entry, id); return l && l.good !== null; }).length;
      const state = x.upcoming ? 'countScheduled' : x.approved ? 'countApproved' : submitted ? 'countWaiting' : x.mode === 'recount' ? 'countRecount' : doneN ? 'countResume' : 'countStart';
      const li = el('li', 'item' + (x.approved ? ' done' : x.late ? ' late' : ''));
      const b = btn('task-row', '', 'count-open', { cat: x.cat.id, mode: x.mode, key: x.key });
      b.disabled = submitted || x.approved || x.upcoming;
      const text = el('span', 't', x.cat.icon + ' ' + t('countTask', { cat: nm(x.cat) }));
      text.append(el('span', 'count-action', t(state)));
      const tags = el('span', 'tags');
      tags.append(el('span', 'tag', t('countProgress', { done: doneN, total: x.ids.length })));
      tags.append(el('span', x.late ? 'tag late' : 'tag time', t('countDeadline', { date: FOH.tasksView.fmtDay(x.key), time: S.inv.settings.deadline })));
      if (submitted) tags.append(el('span', 'stamp', t('sentAt', { time: x.entry.submittedAt.slice(11) })));
      b.append(text, tags); li.append(b); ul.append(li);
    });
    c.append(ul); root.append(c);
  }

  // ---- counting screen ----
  function open(catId, mode, key) {
    const x = myCounts().find((c) => c.cat.id === catId && c.mode === mode && (!key || c.key === key));
    if (!x || x.approved || x.upcoming) return;
    if (x.entry && x.entry.submittedAt) return FOH.edit.toast(t('sent'));
    const w = IS.week(S.inv, x.key);
    let entry = x.entry;
    if (!entry) entry = w.counts[catId] = { staffId: S.me.staffId, key: x.key, catId, lines: {}, submittedAt: null };
    entry.key = x.key;
    entry.catId = catId;
    if (!entry.expected) entry.expected = Object.fromEntries(IS.leaves(x.cat).map((v) => [v.id, v.expected]));
    if (!entry.damageReportIds) entry.damageReportIds = [];
    C = { key: x.key, cat: x.cat, mode, order: shuffled(x.ids, x.key + catId + S.me.staffId + mode), i: 0, entry };
    const next = C.order.findIndex((id) => !IS.line(entry, id) || IS.line(entry, id).good === null);
    C.i = next < 0 ? C.order.length : next;
    draw();
    $('countSheet').showModal();
  }

  // The raw line of the current variant (created on first touch).
  const raw = (id) => C.entry.lines[id] || (C.entry.lines[id] = { good: null, repair: 0, writeoff: 0, photo: '', unsure: false });

  function stepper(value, field, big) {
    const box = el('div', big ? 'counter' : 'mini-step');
    const input = el('input', big ? 'count-in' : 'dmg-in');
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = '0';
    input.value = value === null ? '' : String(value);
    input.dataset.field = field;
    if (C && C.order && C.order[C.i]) {
      input.dataset.variant = C.order[C.i];
      input.dataset.week = C.key;
    }
    box.append(btn('step', '−', 'dec', { field }), input, btn('step', '+', 'inc', { field }));
    return box;
  }

  function photoButton(label, field) {
    const cam = el('label', 'camera', label);
    const file = el('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.setAttribute('capture', 'environment');
    file.hidden = true;
    file.dataset.field = field;
    cam.append(file);
    return cam;
  }

  function conditionRow(icon, label, opts = {}) {
    const isLegacy = typeof opts === 'string';
    const small = isLegacy ? opts : opts.small;
    const field = isLegacy ? arguments[3] : opts.field;
    const value = isLegacy ? arguments[4] : opts.value;

    const row = el('div', 'cr');
    const l = el('span', 'l', icon + ' ' + label);
    l.append(el('small', '', small));
    row.append(l, stepper(value, field, false));
    return row;
  }

  function draw() {
    const body = $('countBody');
    body.replaceChildren();
    $('countTitle').textContent = C.cat.icon + ' ' + t('countTask', { cat: nm(C.cat) });
    if (C.i >= C.order.length) return review(body);
    const f = IS.findVariant(S.inv, C.order[C.i]);
    if (!f) return review(body);
    const { item, variant } = f;
    const l = IS.line(C.entry, variant.id) || { good: null, repair: 0, writeoff: 0, photo: '', unsure: false };
    const prog = el('div', 'prog');
    const fill = el('i');
    fill.style.width = Math.round((C.i * 100) / C.order.length) + '%';
    prog.append(fill);
    body.append(el('p', 'cnt-head', t('itemOf', { i: C.i + 1, n: C.order.length })), prog);
    const img = el('img', 'ref-photo');
    img.alt = '';
    FOH.photos.show(img, variant.photo || item.photo);
    body.append(img, el('h3', 'iname', nm(item)));
    const parts = IS.variantParts(item, variant);
    if (parts.length) {
      const chips = el('div', 'vattrs');
      parts.forEach((x, k) => chips.append(el('span', k ? 'va s' : 'va', x)));
      body.append(chips);
    }
    if (item.location) body.append(el('p', 'iloc', '📍 ' + item.location));
    const hint = pick(item.hint, item.hintAr);
    if (hint) body.append(el('p', 'hint', '💡 ' + hint));
    const units = t('units').split(',');
    const cond = el('div', 'cond');
    const good = el('div', 'cr big');
    good.append(el('span', 'l', t(item.cond.repair ? 'countReady' : 'countPresent')), stepper(l.good, 'good', true));
    cond.append(good);
    if (item.cond.repair) cond.append(conditionRow('🔧', t('newRepair'), t('newRepairHelp'), 'repair', l.repair));
    const held = S.inv.repairs.filter((r) => r.variantId === variant.id).reduce((n, r) => n + r.qty, 0);
    if (held) body.append(el('p', 'count-info', t('existingRepair', { n: held })));
    body.append(el('p', 'count-info', t('countRules')));
    body.append(btn('btn count-report', t('reportFromCount'), 'count-damage', {}));
    const linked = S.inv.breakage.filter((b) => (C.entry.damageReportIds || []).includes(b.id) && b.variantId === variant.id);
    if (linked.length) body.append(el('p', 'count-info', t('reportsLinked', { n: linked.reduce((n, b) => n + b.qty, 0) })));
    body.append(cond, el('p', 'unit', units[IS.UNITS.indexOf(item.unit)] + ' · ' + t('tapType')));
    if (item.attrs.length) body.append(photoButton(l.unsure ? '🤔 ' + t('unsureSaved') : '🤔 ' + t('unsure'), 'unsure'));
    body.append(photoButton(l.photo ? t('changePhoto') : t('addPhoto'), 'photo'), el('p', 'blind', t('blindNote')));
    const nav = el('div', 'count-nav');
    const back = btn('btn', t('back'), 'prev', {});
    back.disabled = C.i === 0;
    nav.append(back, btn('btn primary', C.i === C.order.length - 1 ? t('review') : t('nextItem'), 'next', {}));
    body.append(nav);
    if (FOH.batchTally && FOH.batchTally.injectBatchCounter) {
      FOH.batchTally.injectBatchCounter();
    }
  }

  function review(body) {
    body.append(el('p', 'cnt-head', t('review')));
    const ul = el('ol', 'items review');
    C.order.forEach((id, i) => {
      const f = IS.findVariant(S.inv, id);
      if (!f) return;
      const l = IS.line(C.entry, id) || {};
      const b = btn('task-row', '', 'goto', { i: String(i) });
      const label = [nm(f.item), IS.variantLabel(f.item, f.variant)].filter(Boolean).join(' · ');
      const parts = [Number.isInteger(l.good) ? '✅ ' + l.good : '—'];
      if (l.repair) parts.push('🔧 ' + l.repair);
      if (l.writeoff) parts.push('❌ ' + l.writeoff);
      if (l.unsure) parts.push('🤔');
      b.append(el('span', 't', label), el('span', 'tags', parts.join('  ')));
      const li = el('li', 'item');
      li.append(b);
      ul.append(li);
    });
    const nav = el('div', 'count-nav');
    nav.append(btn('btn', t('back'), 'prev', {}), btn('btn primary', t('countLocalSend'), 'send', {}));
    body.append(ul, el('p', 'blind', t('blindNote')), nav);
  }

  function setField(field, value) {
    const l = raw(C.order[C.i]);
    const n = Math.max(0, Math.min(99999, Math.floor(Number(value))));
    l[field] = value === '' || isNaN(n) ? (field === 'good' ? null : 0) : n;
    save();
  }

  function onClick(e) {
    const b = e.target.closest('button[data-act]');
    if (!b || !C) return;
    const { act, field } = b.dataset;
    if (act === 'inc' || act === 'dec') {
      const l = IS.line(C.entry, C.order[C.i]) || {};
      setField(field, Math.max(0, (l[field] || 0) + (act === 'inc' ? 1 : -1)));
      return draw();
    }
    if (act === 'count-damage') return FOH.invBreak.open({ variantId: C.order[C.i], key: C.key, catId: C.cat.id, mode: C.mode, entry: C.entry, onSaved: draw });
    if (act === 'next') C.i = Math.min(C.order.length, C.i + 1);
    if (act === 'prev') C.i = Math.max(0, C.i - 1);
    if (act === 'goto') C.i = Number(b.dataset.i);
    if (act === 'send') return send();
    draw();
  }

  async function onChange(e) {
    const field = e.target.dataset.field;
    if (!C || !field) return;
    if (field !== 'photo' && field !== 'unsure') return setField(field, e.target.value);
    const id = await FOH.photos.add(e.target.files[0]);
    if (!id) return;
    const l = raw(C.order[C.i]);
    l.photo = id;
    if (field === 'unsure') l.unsure = true;
    save();
    draw();
  }

  function findSuspiciousVariance(entry, order) {
    if (!entry || !Array.isArray(order)) return null;
    const ar = FOH.i18n ? FOH.i18n.lang === 'ar' : true;
    for (let idx = 0; idx < order.length; idx++) {
      const vid = order[idx];
      const l = IS.line(entry, vid);
      if (!l || l.good === null) continue;
      const total = IS.counted(entry, vid);
      const f = IS.findVariant(S.inv, vid);
      if (!f) continue;
      const expected = IS.reference(S.inv, entry, f.variant);
      if (expected !== null && IS.isFlagged(S.inv, expected, total)) {
        const diff = Math.abs(total - expected);
        if (diff >= (S.inv && S.inv.settings ? S.inv.settings.flagPcs : 2)) {
          const vLabel = IS.variantLabel(f.item, f.variant);
          const label = [nm(f.item), vLabel].filter(Boolean).join(' · ');
          return {
            idx,
            label,
            counted: total,
            promptMsg: ar
              ? `⚠️ يرجى إعادة التأكد من عد الصنف "${label}" فقط للتأكد من الرقم المدخل (${total}). هل أنت متأكد من دقة هذا الرقم؟`
              : `⚠️ Please double-check your count for "${label}" (${total}). Are you certain this count is accurate?`,
          };
        }
      }
    }
    return null;
  }

  function send() {
    if (C.order.some((id) => !IS.line(C.entry, id) || IS.line(C.entry, id).good === null)) return alert(t('countMissing'));

    // TRIZ Zero-Knowledge Variance Oracle
    const susp = findSuspiciousVariance(C.entry, C.order, C.cat && C.cat.id);
    if (susp && !C._oracleVerified) {
      const ar = FOH.i18n ? FOH.i18n.lang === 'ar' : true;
      const ok = confirm(susp.promptMsg + (ar ? '\n\nاضغط "موافق" لتأكيد الرقم، أو "إلغاء" للعودة للصنف وتعديله.' : '\n\nPress "OK" if accurate, or "Cancel" to go back and recount.'));
      if (!ok) {
        C.i = susp.idx;
        draw();
        return;
      }
      C._oracleVerified = true;
    }

    if (!confirm(t('confirmSend'))) return;
    C.entry.submittedAt = nowStamp();
    C.entry.by = S.me.name;
    if (!save()) { C.entry.submittedAt = null; return alert(t('saveFailed')); }
    $('countSheet').close();
    FOH.app.render();
    FOH.edit.toast(t('localCountSaved'));
  }

  function init() {
    $('countBody').addEventListener('click', onClick);
    $('countBody').addEventListener('change', onChange);
    $('countBody').addEventListener('keydown', (e) => e.key === 'Enter' && e.target.blur());
    $('countClose').addEventListener('click', () => $('countSheet').close());
    $('countSheet').addEventListener('close', () => {
      C = null;
      FOH.app.render();
    });
    FOH.invBreak.init();
  }

  FOH.invCount = { init, mineCard, myCounts, pending, open };
})(window.FOH = window.FOH || {});
