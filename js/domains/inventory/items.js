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
  const isAr = () => FOH.i18n && FOH.i18n.lang === 'ar';

  let editCat = null;
  let activeCatFilter = 'all';
  let itemSearchQuery = '';

  function itemRow(item) {
    const li = el('li', 'item inv-item');
    li.dataset.id = item.id;
    const row = el('div', 'row inv-item-row');
    const b = btn('tx inv-item-btn', '', 'item-open', { id: item.id });
    const vs = IS.active(item);
    const units = t('units').split(',');
    const unitLbl = units[IS.UNITS.indexOf(item.unit)] || item.unit || 'pcs';
    const total = vs.reduce((s, v) => s + (v.expected || 0), 0);

    const leftCopy = el('div', 'inv-item-copy');
    leftCopy.append(el('span', 't inv-item-title', nm(item)));

    const metaParts = [];
    if (item.location) metaParts.push('📍 ' + item.location);
    if (item.attrs.length) metaParts.push(t('variantsN', { n: vs.length }));
    metaParts.push(t(item.cond.repair ? 'countReady' : 'countPresent') + (item.cond.repair ? ' · 🔧' : ''));
    leftCopy.append(el('small', 'inv-item-sub', metaParts.join(' · ')));

    const rightSide = el('div', 'inv-item-right');
    rightSide.append(
      el('span', 'inv-qty-badge', total + ' ' + unitLbl),
      el('span', 'inv-item-arrow', isAr() ? '‹' : '›')
    );

    b.append(leftCopy, rightSide);
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

  function renderItemsToolbar(root) {
    const ar = isAr();
    const bar = el('div', 'inv-items-toolbar');
    const searchRow = el('div', 'inv-search-row');
    const searchWrap = el('div', 'inv-search-wrap');
    const searchIn = el('input', 'in inv-search-in');
    searchIn.type = 'search';
    searchIn.placeholder = ar ? '🔍 ابحث عن صنف أو موقع...' : '🔍 Search item or location...';
    searchIn.value = itemSearchQuery;
    searchIn.addEventListener('input', (e) => {
      itemSearchQuery = e.target.value;
      FOH.app.render();
      const restored = root.querySelector('.inv-search-in');
      if (restored) {
        restored.focus();
        restored.setSelectionRange(itemSearchQuery.length, itemSearchQuery.length);
      }
    });
    searchWrap.append(searchIn);
    const addCatBtn = btn('btn inv-add-cat-btn', t('addCategory'), 'cat-add', {});
    searchRow.append(searchWrap, addCatBtn);

    const pills = el('div', 'inv-cat-pills');
    const allCount = S.inv.categories.reduce((s, c) => s + c.items.length, 0);
    const allPill = btn('inv-cat-pill' + (activeCatFilter === 'all' ? ' on' : ''), (ar ? 'الكل' : 'All') + ` (${allCount})`, 'inv-filter-cat', { cat: 'all' });
    pills.append(allPill);
    S.inv.categories.forEach((c) => {
      const p = btn(
        'inv-cat-pill' + (activeCatFilter === c.id ? ' on' : ''),
        `${c.icon || '📦'} ${nm(c)} (${c.items.length})`,
        'inv-filter-cat',
        { cat: c.id }
      );
      pills.append(p);
    });
    bar.append(searchRow, pills);
    root.append(bar);
  }

  function items(root) {
    if (activeCatFilter !== 'all' && !S.inv.categories.some((c) => c.id === activeCatFilter)) {
      activeCatFilter = 'all';
    }
    renderItemsToolbar(root);
    const q = itemSearchQuery.trim().toLowerCase();
    const visibleCats = S.inv.categories.filter((c) => activeCatFilter === 'all' || c.id === activeCatFilter);

    visibleCats.forEach((cat) => {
      const filteredItems = q
        ? cat.items.filter((it) => [it.name, it.nameAr, it.location].filter(Boolean).join(' ').toLowerCase().includes(q))
        : cat.items;
      if (q && !filteredItems.length) return;

      const c = el('section', 'card inv-card');
      const h = el('div', 'head inv-head');
      const n = btn('nm', '', 'cat-open', { id: cat.id });
      n.append(el('span', 'ico', cat.icon), el('span', 'nm-t', nm(cat)), el('span', 'inv-edit-pen', '✎'));
      const rightBox = el('div', 'inv-head-actions');
      rightBox.append(
        el('span', 'ct', String(IS.leaves(cat).length)),
        btn('inv-head-add-btn', '+ ' + (isAr() ? 'صنف' : 'Item'), 'item-add', { cat: cat.id })
      );
      h.append(n, rightBox);
      const list = el('ol', 'items');
      filteredItems.forEach((it) => list.append(itemRow(it)));
      if (!q) FOH.drag.enable(list, (ids) => reorder(cat.items, ids));
      c.append(h, list, btn('adds', t('addInvItem'), 'item-add', { cat: cat.id }));
      root.append(c);
    });
  }

  // ---- settings ----
  function field(label, input, hintText) {
    const row = el('label', 'set inv-set-row');
    const txt = el('div', 'inv-set-lbl');
    txt.append(el('span', '', label));
    if (hintText) txt.append(el('small', '', hintText));
    row.append(txt, input);
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
    const ar = isAr();
    const s = S.inv.settings;
    const c = el('section', 'card inv-card');
    const h = el('div', 'head inv-head');
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
    flag.append(numberInput('flagPcs', 9999), el('span', 'flag-sep', t('pcsWord') + ' ' + t('orWord')), numberInput('flagPct', 100), el('span', 'flag-sep', '%'));

    c.append(
      field(t('countDayOnly'), day, ar ? 'اليوم الأسبوعي المعتمد للجرد' : 'Weekly scheduled inventory day'),
      field(t('deadlineLbl'), dl, ar ? 'آخر موعد لتسليم الجرد' : 'Cut-off time for submitting counts'),
      field(t('flagLbl'), flag, ar ? 'تنبيه عند تجاوز الفرق' : 'Trigger variance alert when exceeded'),
      field(t('noRepeatLbl'), numberInput('noRepeat', 12), ar ? 'تدوير الفئات بين الموظفين' : 'Minimum weeks before repeating same category')
    );

    [['results', 'canResults'], ['manage', 'canManage']].forEach(([key, label]) => {
      const box = el('div', 'perm inv-perm-box');
      box.append(el('b', '', t(label)));
      const chips = el('div', 'inv-perm-chips');
      S.tpl.roles.forEach((r) => chips.append(btn('pc' + (s[key].includes(r.id) ? ' on' : ''), r.name, 'perm', { key, id: r.id })));
      box.append(chips);
      c.append(box);
    });
    root.append(c, btn('btn danger wide-btn inv-reset-btn', '⚠️ ' + t('resetExamples'), 'inv-reset', {}));
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
    if (act === 'inv-filter-cat') {
      activeCatFilter = b.dataset.cat || 'all';
      return FOH.app.render();
    }
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
