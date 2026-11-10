// Inventory item editor: names, unit, location, hint, which damaged states
// apply, up to two attributes (e.g. Type × Size) and a grid where only the
// variants that really exist are switched on, each with its expected
// quantity and photo. Changes stay in a draft until Save.
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const IS = FOH.invStore;
  const { t, pick } = FOH.i18n;
  const { el, btn } = FOH.view;
  const uid = () => FOH.store.uid();
  let draft = null; // { catId, item, isNew, created:Set }

  // "English / عربي" in one prompt.
  function askValue(current) {
    const raw = prompt(t('valuePrompt'), current ? current.label + (current.labelAr ? ' / ' + current.labelAr : '') : '');
    if (raw === null) return null;
    const [label, labelAr] = raw.split('/').map((x) => x.trim().slice(0, 60));
    return { label: label || labelAr || '', labelAr: labelAr || '' };
  }

  const keyOf = (a) => a[0] + '|' + a[1];
  const findVariant = (a) => draft.item.variants.find((v) => keyOf(v.a) === keyOf(a));

  function switchOff(v) {
    if (draft.created.has(v.id)) draft.item.variants = draft.item.variants.filter((x) => x !== v);
    else v.archived = true; // keep its history
  }

  function attrsBox() {
    const box = $('iiAttrs');
    box.replaceChildren();
    draft.item.attrs.forEach((at, k) => {
      const wrap = el('div', 'attr');
      const head = el('div', 'attr-head');
      const en = el('input', 'in small-in');
      en.value = at.name;
      en.placeholder = t('attrName');
      en.dataset.attr = k;
      en.dataset.field = 'name';
      const ar = el('input', 'in small-in');
      ar.value = at.nameAr;
      ar.dir = 'rtl';
      ar.placeholder = t('attrNameAr');
      ar.dataset.attr = k;
      ar.dataset.field = 'nameAr';
      head.append(el('b', '', t('attrN', { n: k + 1 })), en, ar, btn('mini-btn no', '✕', 'attr-del', { k: String(k) }));
      const chips = el('div', 'chips-v');
      at.values.forEach((v) => chips.append(btn('chipv', pick(v.label, v.labelAr), 'val-edit', { k: String(k), id: v.id })));
      chips.append(btn('chipv add', t('addValue'), 'val-add', { k: String(k) }));
      wrap.append(head, chips);
      box.append(wrap);
    });
    if (draft.item.attrs.length < 2) box.append(btn('link', t('addAttr'), 'attr-add', {}));
  }

  function cell(a) {
    const v = findVariant(a);
    if (!v || v.archived) return btn('cell off', '+', 'cell-on', { a: a.join('|') });
    const c = el('div', 'cell on');
    const n = el('input', 'cell-in');
    n.type = 'number';
    n.min = '0';
    n.inputMode = 'numeric';
    n.value = v.expected === null ? '' : String(v.expected);
    n.dataset.vid = v.id;
    const cam = el('label', 'cell-cam', v.photo ? '📷✓' : '📷');
    const file = el('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    file.dataset.vphoto = v.id;
    cam.append(file);
    n.setAttribute('aria-label', t('qtyBaseline'));
    c.append(n);
    if (draft.item.attrs.length) c.append(cam);
    if (draft.item.attrs.length) c.append(btn('cell-x', '✕', 'cell-off', { id: v.id }));
    return c;
  }

  function grid() {
    const box = $('iiGrid');
    box.replaceChildren();
    const [a1, a2] = draft.item.attrs;
    const cols = a1 && a1.values.length ? a1.values : [{ id: '' }];
    const rows = a2 && a2.values.length ? a2.values : [{ id: '' }];
    box.classList.toggle('single', !a1);
    box.style.gridTemplateColumns = (a2 ? '72px ' : '') + 'repeat(' + cols.length + ', minmax(64px, 1fr))';
    if (a1) {
      if (a2) box.append(el('span'));
      cols.forEach((c) => box.append(el('span', 'hh', pick(c.label, c.labelAr))));
    }
    rows.forEach((r) => {
      if (a2) box.append(el('span', 'hh rowh', pick(r.label, r.labelAr)));
      cols.forEach((c) => box.append(cell([c.id || '', r.id || ''])));
    });
  }

  function draw() {
    attrsBox();
    grid();
    $('iiRepair').value = draft.item.cond.repair ? 'yes' : 'no';
    $('iiCountPreview').textContent = t(draft.item.cond.repair ? 'countPreviewYes' : 'countPreviewNo');
    $('iiQtyLabel').textContent = t(draft.item.attrs.length ? 'variantBaseline' : 'qtyBaseline');
    FOH.photos.show($('iiPhotoImg'), draft.item.photo);
    $('iiPhotoRemove').hidden = !draft.item.photo;
  }

  function open(id, catId) {
    const f = id ? IS.findItem(S.inv, id) : null;
    const cat = f ? f.cat : S.inv.categories.find((c) => c.id === catId);
    if (!cat) return;
    const item = f
      ? FOH.store.clone(f.item)
      : IS.normItem({ name: '', variants: [{ id: uid(), a: ['', ''], expected: null }], attrs: [], cond: { repair: false, writeoff: true } });
    draft = { catId: cat.id, item, isNew: !f, created: new Set(f ? [] : item.variants.map((v) => v.id)) };
    $('iiTitle').textContent = f ? t('editInvItem') : t('newInvItem');
    $('iiName').value = f ? item.name : '';
    $('iiNameAr').value = item.nameAr;
    $('iiHint').value = item.hint;
    $('iiHintAr').value = item.hintAr;
    $('iiLocation').value = item.location;
    const unit = $('iiUnit');
    unit.replaceChildren();
    IS.UNITS.forEach((u, k) => {
      const o = el('option', '', t('units').split(',')[k]);
      o.value = u;
      o.selected = u === item.unit;
      unit.append(o);
    });
    $('iiVariants').open = !!item.attrs.length;
    $('iiDelete').hidden = !f;
    draw();
    $('invItemSheet').returnValue = '';
    $('invItemSheet').showModal();
  }

  function onClick(e) {
    const b = e.target.closest('button[data-act]');
    if (!b || !draft) return;
    const it = draft.item;
    const { act } = b.dataset;
    const k = Number(b.dataset.k);
    if (act === 'attr-add') it.attrs.push({ id: uid(), name: '', nameAr: '', values: [] });
    if (act === 'attr-del') {
      if (!confirm(t('confirmDelAttr'))) return;
      it.variants.filter((v) => !v.archived).forEach(switchOff);
      it.attrs.splice(k, 1);
      it.variants.forEach((v) => (v.a = v.a.filter((_, i) => i !== k).concat([''])));
    }
    if (act === 'val-add') {
      const v = askValue(null);
      if (v && v.label) it.attrs[k].values.push({ id: uid(), ...v });
    }
    if (act === 'val-edit') {
      const val = it.attrs[k].values.find((x) => x.id === b.dataset.id);
      const v = askValue(val);
      if (v && v.label) Object.assign(val, v);
      else if (v) {
        it.variants.filter((x) => x.a[k] === val.id && !x.archived).forEach(switchOff);
        it.attrs[k].values = it.attrs[k].values.filter((x) => x !== val);
      }
    }
    if (act === 'cell-on') {
      const a = b.dataset.a.split('|');
      const v = findVariant(a);
      if (v) v.archived = false;
      else {
        const nv = { id: uid(), a, expected: null, photo: '', archived: false };
        it.variants.push(nv);
        draft.created.add(nv.id);
      }
    }
    if (act === 'cell-off') switchOff(it.variants.find((v) => v.id === b.dataset.id));
    if (act === 'cond') it.cond[b.dataset.cond] = !it.cond[b.dataset.cond];
    draw();
  }

  async function onChange(e) {
    if (!draft) return;
    const d = e.target.dataset;
    if (e.target.id === 'iiRepair') {
      draft.item.cond.repair = e.target.value === 'yes';
      draft.item.cond.writeoff = true;
      return draw();
    }
    if (d.vid) {
      const v = draft.item.variants.find((x) => x.id === d.vid);
      const n = Math.floor(Number(e.target.value));
      v.expected = e.target.value === '' || isNaN(n) ? null : Math.max(0, n);
    } else if (d.attr !== undefined) {
      draft.item.attrs[Number(d.attr)][d.field] = e.target.value.trim().slice(0, 60);
    } else if (d.vphoto) {
      const v = draft.item.variants.find((x) => x.id === d.vphoto);
      const oldPhoto = v && v.photo;
      const id = await FOH.photos.add(e.target.files[0]);
      if (id && v) {
        if (oldPhoto && FOH.photos && FOH.photos.remove) FOH.photos.remove(oldPhoto);
        v.photo = id;
      }
      draw();
    } else if (e.target.id === 'iiPhotoFile') {
      const oldPhoto = draft.item.photo;
      const id = await FOH.photos.add(e.target.files[0]);
      if (id) {
        if (oldPhoto && FOH.photos && FOH.photos.remove) FOH.photos.remove(oldPhoto);
        draft.item.photo = id;
      }
      draw();
    }
  }

  function save() {
    const it = draft.item;
    it.name = $('iiName').value.trim().slice(0, 120) || $('iiNameAr').value.trim().slice(0, 120);
    if (!it.name) { alert(t('nameEn') + ' / ' + t('nameAr')); return false; }
    Object.assign(it, {
      nameAr: $('iiNameAr').value.trim().slice(0, 120),
      hint: $('iiHint').value.trim().slice(0, 200),
      hintAr: $('iiHintAr').value.trim().slice(0, 200),
      location: $('iiLocation').value.trim().slice(0, 120),
      unit: $('iiUnit').value,
    });
    it.attrs.forEach((at, k) => (at.name = at.name || at.nameAr || t('attrN', { n: k + 1 })));
    if (!it.variants.some((v) => !v.archived) && !it.attrs.length) it.variants.push({ id: uid(), a: ['', ''], expected: null, photo: '', archived: false });
    const cat = S.inv.categories.find((c) => c.id === draft.catId);
    const clean = IS.normItem(it);
    const at = cat.items.findIndex((x) => x.id === it.id);
    const previous = cat.items.slice();
    if (at === -1) cat.items.push(clean);
    else cat.items[at] = clean;
    if (!IS.save(S.inv)) { cat.items = previous; alert(t('saveFailed')); return false; }
    FOH.app.render();
    return true;
  }

  function remove() {
    const f = IS.findItem(S.inv, draft.item.id);
    if (!f || !confirm(t('confirmDelItem', { name: pick(f.item.name, f.item.nameAr) }))) return;
    f.cat.items = f.cat.items.filter((x) => x !== f.item);
    if (f.item.photo && FOH.photos && FOH.photos.remove) {
      FOH.photos.remove(f.item.photo);
    }
    (f.item.variants || []).forEach((v) => {
      if (v.photo && FOH.photos && FOH.photos.remove) FOH.photos.remove(v.photo);
    });
    $('invItemSheet').close('deleted');
    IS.save(S.inv);
    FOH.app.render();
  }

  function init() {
    const sheet = $('invItemSheet');
    sheet.addEventListener('click', (e) => (e.target === sheet ? sheet.close('cancel') : onClick(e)));
    sheet.addEventListener('change', onChange);
    sheet.addEventListener('keydown', (e) => e.key === 'Enter' && e.target.tagName === 'INPUT' && e.preventDefault());
    sheet.querySelector('form').addEventListener('submit', (e) => {
      if (e.submitter && e.submitter.value === 'save') {
        e.preventDefault();
        if (save()) sheet.close('saved');
      }
    });
    sheet.addEventListener('close', () => { draft = null; });
    $('iiDelete').addEventListener('click', remove);
    $('iiPhotoRemove').addEventListener('click', () => {
      if (draft.item.photo && FOH.photos && FOH.photos.remove) {
        FOH.photos.remove(draft.item.photo);
      }
      draft.item.photo = '';
      draw();
    });
  }

  FOH.invItemSheet = { init, open };
})(window.FOH = window.FOH || {});
