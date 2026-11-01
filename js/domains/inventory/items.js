// Inventory → Items (categories and items; the item editor is in
// inv-item-sheet.js) and → Settings (count day, deadline, flag limits,
// no-repeat weeks, permissions by position, reset to the examples).
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const IS = FOH.invStore;
  const { t, pick } = FOH.i18n;
  const { el, btn } = FOH.view;
  const ICONS = ['📦', '🍷', '🍴', '🍽', '🥢', '🍸', '🧾', '🕯', '☕', '🧊', '🧺', '🧽'];
  const nm = (x) => pick(x.name, x.nameAr);
  const save = () => IS.save(S.inv);
  let editCat = null; // category id being edited, or null for new

  function itemRow(item) {
    const li = el('li', 'item inv-item');
    li.dataset.id = item.id;
    const row = el('div', 'row');
    const b = btn('tx', '', 'item-open', { id: item.id });
    const tags = el('span', 'tags');
    const vs = IS.active(item);
    const units = t('units').split(',');
    if (item.attrs.length) tags.append(el('span', 'tag', t('variantsN', { n: vs.length })));
    const total = vs.reduce((s, v) => s + (v.expected || 0), 0);
    tags.append(el('span', 'tag time', total + ' ' + units[IS.UNITS.indexOf(item.unit)]));
    tags.append(el('span', 'tag', t(item.cond.repair ? 'countReady' : 'countPresent') + (item.cond.repair ? ' + ' + t('condRepair') : '')));
    if (item.location) tags.append(el('span', 'tag', '📍 ' + item.location));
    b.append(el('span', 't', nm(item)), tags);
    row.append(el('span', 'handle', '⠿'), b);
    li.append(row);
    return li;
  }

  function reorder(arr, ids) {
    const byId = new Map(arr.map((x) => [x.id, x]));
    arr.splice(0, arr.length, ...ids.map((id) => byId.get(id)).filter(Boolean));
    save();
    FOH.app.render();
  }

  function items(root) {
    S.inv.categories.forEach((cat) => {
      const c = el('section', 'card');
      const h = el('div', 'head');
      const n = btn('nm', '', 'cat-open', { id: cat.id });
      n.append(el('span', 'ico', cat.icon), el('span', 'nm-t', nm(cat)));
      h.append(n, el('span', 'ct', String(IS.leaves(cat).length)));
      const list = el('ol', 'items');
      cat.items.forEach((it) => list.append(itemRow(it)));
      FOH.drag.enable(list, (ids) => reorder(cat.items, ids));
      c.append(h, list, btn('adds', t('addInvItem'), 'item-add', { cat: cat.id }));
      root.append(c);
    });
    root.append(btn('btn wide-btn', t('addCategory'), 'cat-add', {}));
  }

  // ---- settings ----
  function field(label, input) {
    const row = el('label', 'set');
    row.append(el('span', '', label), input);
    return row;
  }

  function numberInput(key, max) {
    const i = el('input', 'in small-in');
    i.type = 'number';
    i.min = '0';
    i.max = String(max);
    i.value = String(S.inv.settings[key]);
    i.dataset.setting = key;
    return i;
  }

  function settings(root) {
    const s = S.inv.settings;
    const c = el('section', 'card');
    const h = el('div', 'head');
    const n = el('span', 'nm');
    n.append(el('span', 'ico', '⚙'), el('span', 'nm-t', t('invSettings')));
    h.append(n);
    c.append(h);
    const day = el('select', 'in small-in');
    day.dataset.setting = 'countDay';
    t('daysLong').split(',').forEach((name, d) => {
      const o = el('option', '', name);
      o.value = d;
      o.selected = d === s.countDay;
      day.append(o);
    });
    const dl = el('input', 'in small-in');
    dl.type = 'time';
    dl.value = s.deadline;
    dl.dataset.setting = 'deadline';
    const flag = el('span', 'flag-in');
    flag.append(numberInput('flagPcs', 9999), t('pcsWord') + ' ' + t('orWord'), numberInput('flagPct', 100), '%');
    c.append(field(t('countDayOnly'), day), field(t('deadlineLbl'), dl), field(t('flagLbl'), flag));
    c.append(field(t('noRepeatLbl'), numberInput('noRepeat', 12)));
    [['results', 'canResults'], ['manage', 'canManage']].forEach(([key, label]) => {
      const box = el('div', 'perm');
      box.append(el('b', '', t(label)));
      S.tpl.roles.forEach((r) => box.append(btn('pc' + (s[key].includes(r.id) ? ' on' : ''), r.name, 'perm', { key, id: r.id })));
      c.append(box);
    });
    root.append(c, btn('btn danger wide-btn', t('resetExamples'), 'inv-reset', {}));
  }

  // ---- category sheet ----
  function openCat(id) {
    const cat = S.inv.categories.find((c) => c.id === id);
    editCat = cat ? cat.id : null;
    $('icTitle').textContent = cat ? t('editCategory') : t('newCategory');
    const sel = $('icIcon');
    sel.replaceChildren();
    ICONS.forEach((i) => {
      const o = el('option', '', i);
      o.value = i;
      o.selected = i === (cat ? cat.icon : '📦');
      sel.append(o);
    });
    $('icName').value = cat ? cat.name : '';
    $('icNameAr').value = cat ? cat.nameAr : '';
    $('icDelete').hidden = !cat;
    $('invCatSheet').returnValue = '';
    $('invCatSheet').showModal();
  }

  function saveCat() {
    const name = $('icName').value.trim().slice(0, 120);
    const nameAr = $('icNameAr').value.trim().slice(0, 120);
    if (!name && !nameAr) return;
    const data = { name: name || nameAr, nameAr, icon: $('icIcon').value };
    const cat = S.inv.categories.find((c) => c.id === editCat);
    if (cat) Object.assign(cat, data);
    else S.inv.categories.push({ id: FOH.store.uid(), items: [], ...data });
    save();
    FOH.app.render();
  }

  function deleteCat() {
    const cat = S.inv.categories.find((c) => c.id === editCat);
    if (!cat || !confirm(t('confirmDelCat', { name: nm(cat) }))) return;
    S.inv.categories = S.inv.categories.filter((c) => c !== cat);
    $('invCatSheet').close('deleted');
    save();
    FOH.app.render();
  }

  function onClick(e) {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const { act, id } = b.dataset;
    if (act === 'cat-open') return openCat(id);
    if (act === 'cat-add') return openCat(null);
    if (act === 'item-open') return FOH.invItemSheet.open(id);
    if (act === 'item-add') return FOH.invItemSheet.open(null, b.dataset.cat);
    if (act === 'inv-reset') {
      if (!confirm(t('confirmResetExamples'))) return;
      S.inv = IS.defaults(S.tpl);
    } else if (act === 'perm') {
      const arr = S.inv.settings[b.dataset.key];
      S.inv.settings[b.dataset.key] = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
    } else return;
    save();
    FOH.app.render();
  }

  function onChange(e) {
    const key = e.target.dataset.setting;
    if (!key) return;
    const v = e.target.value;
    if (key === 'deadline') {
      if (FOH.store.TIME_RE.test(v)) S.inv.settings.deadline = v;
    } else {
      const max = { countDay: 6, flagPcs: 9999, flagPct: 100, noRepeat: 12 }[key];
      S.inv.settings[key] = Math.max(0, Math.min(max, Math.floor(Number(v)) || 0));
    }
    save();
    FOH.app.render();
  }

  function init() {
    const sheet = $('invCatSheet');
    $('icDelete').addEventListener('click', deleteCat);
    sheet.addEventListener('click', (e) => e.target === sheet && sheet.close('cancel'));
    sheet.addEventListener('keydown', (e) => e.key === 'Enter' && e.target.tagName === 'INPUT' && e.preventDefault());
    sheet.addEventListener('close', () => sheet.returnValue === 'save' && saveCat());
    FOH.invItemSheet.init();
  }

  FOH.invItems = { init, items, settings, onClick, onChange };
})(window.FOH = window.FOH || {});
