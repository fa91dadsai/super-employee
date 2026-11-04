// "Something broke": anyone can report breakage at any time, without blame.
// The manager approves it in Results, which lowers the expected quantity.
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t, pick } = FOH.i18n;
  const { el } = FOH.view;
  let photoId = '';
  let context = null;
  let categoryId = '';
  let browsingItem = '';
  const searchText = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase().trim();
  function matches(cat, item, opts = {}) {
    const isLegacy = typeof opts === 'object' && opts !== null && !('query' in opts);
    const variant = isLegacy ? opts : opts.variant;
    const query = isLegacy ? arguments[3] : (opts.query || '');

    const values = item.attrs.flatMap((a, k) => a.values.filter((v) => v.id === (variant ? variant.a[k] : null)).flatMap((v) => [v.label, v.labelAr]));
    const text = searchText([cat.name, cat.nameAr, item.name, item.nameAr, item.location, ...values].join(' '));
    return searchText(query).split(/\s+/).filter(Boolean).every((token) => text.includes(token));
  }
  function actionButton(cls, label, data) {
    const button = el('button', cls, label); button.type = 'button'; Object.assign(button.dataset, data); return button;
  }
  function thumbnail(item, variant, opts = {}) {
    const isLegacy = typeof opts === 'object' && opts !== null && 'icon' in opts;
    const cat = isLegacy ? opts : (opts.cat || {});
    const cls = isLegacy ? arguments[3] : (opts.cls || '');

    const box = el('span', cls, cat.icon || '📦');
    const photo = variant && variant.photo || item.photo;
    if (photo) { box.textContent = ''; const img = el('img'); img.alt = ''; FOH.photos.show(img, photo); box.append(img); }
    return box;
  }
  function toolCard(cat, item, opts = {}) {
    const isLegacy = typeof opts === 'object' && opts !== null && ('id' in opts || 'a' in opts);
    const variant = isLegacy ? opts : opts.variant;
    const recent = isLegacy ? arguments[3] : opts.recent;

    const variants = FOH.invStore.active(item);
    const label = variant && FOH.invStore.variantLabel(item, variant);
    const button = actionButton('report-tool', '', variant ? { variant: variant.id } : { tool: item.id });
    const copy = el('span', 'report-tool-copy');
    copy.append(el('b', '', pick(item.name, item.nameAr) + (label ? ' · ' + label : '')));
    const other = FOH.i18n.lang === 'ar' ? item.name : item.nameAr;
    copy.append(el('small', '', [other, variant ? pick(cat.name, cat.nameAr) : variants.length > 1 ? t('typeCount', { n: variants.length }) : pick(cat.name, cat.nameAr)].filter(Boolean).join(' · ')));
    button.append(thumbnail(item, variant, { cat, cls: 'report-tool-icon' }), copy, el('span', 'tool-arrow', FOH.i18n.lang === 'ar' ? '‹' : '›'));
    return button;
  }
  function drawPicker() {
    const query = $('brSearch').value.trim();
    const searching = !!query;
    const categories = $('brCategories'); categories.replaceChildren();
    const root = $('brResults'); root.replaceChildren();
    $('brClearSearch').hidden = !searching;
    const cat = S.inv.categories.find((c) => c.id === categoryId);
    const item = cat && cat.items.find((i) => i.id === browsingItem);
    const home = !searching && !cat;
    categories.hidden = !home;
    $('brBack').hidden = home;
    $('brBack').textContent = t(item && !searching ? 'backTools' : 'backCategories');
    $('brBrowseTitle').textContent = searching ? t('searchResults') : item ? pick(item.name, item.nameAr) : cat ? (cat.icon || '') + ' ' + pick(cat.name, cat.nameAr) : t('pickCategory');
    $('brBrowseHint').textContent = t(searching ? 'searchAll' : item ? 'pickVariantHint' : cat ? 'pickToolHint' : 'pickCategoryHint');
    let n = 0;
    if (home) {
      S.inv.categories.forEach((c) => {
        const tools = c.items.filter((i) => FOH.invStore.active(i).length);
        if (!tools.length) return;
        const button = actionButton('report-category', '', { category: c.id });
        button.append(el('span', 'category-icon', c.icon || '📦'), el('b', '', pick(c.name, c.nameAr)), el('small', '', t('toolCount', { n: tools.length })));
        categories.append(button);
      });
      const ids = [...new Set(S.inv.breakage.slice().reverse().map((r) => r.variantId))].slice(0, 4);
      ids.forEach((id) => { const f = FOH.invStore.findVariant(S.inv, id); if (f && !f.variant.archived) { root.append(toolCard(f.cat, f.item, f.variant, true)); n++; } });
      $('brMatches').textContent = n ? t('recentTools') : '';
    } else if (item && !searching) {
      FOH.invStore.active(item).forEach((v) => {
        const button = toolCard(cat, item, v);
        const title = FOH.invStore.variantLabel(item, v);
        if (title) button.querySelector('b').textContent = title;
        root.append(button); n++;
      });
      $('brMatches').textContent = t('typeCount', { n });
    } else {
      S.inv.categories.filter((c) => searching || c.id === categoryId).forEach((c) => {
        c.items.forEach((i) => {
          const variants = FOH.invStore.active(i);
          if (!variants.length || searching && !variants.some((v) => matches(c, i, v, query))) return;
          root.append(toolCard(c, i, null)); n++;
        });
      });
      $('brMatches').textContent = t('toolCount', { n });
    }
    if (!home && !n) root.append(el('p', 'count-info', t('noTools') + ' ' + t('searchEmptyHint')));
  }
  function togglePicker(show) {
    $('brPicker').hidden = !show;
    $('brDetails').hidden = show;
    $('brSave').hidden = show;
    $('brReturnDetails').hidden = !show || !$('brItem').value;
    $('brStep1').classList.toggle('current', show);
    $('brStep2').classList.toggle('current', !show);
    if (show) drawPicker();
  }
  function selectedLabel() {
    const found = FOH.invStore.findVariant(S.inv, $('brItem').value);
    const label = found && FOH.invStore.variantLabel(found.item, found.variant);
    $('brSelected').textContent = found ? pick(found.item.name, found.item.nameAr) + (label ? ' · ' + label : '') : t('chooseTool');
    $('brSelectedMeta').textContent = found ? [pick(found.cat.name, found.cat.nameAr), found.item.location].filter(Boolean).join(' · ') : '';
    $('brSelectedImage').replaceChildren();
    if (found) $('brSelectedImage').append(thumbnail(found.item, found.variant, found.cat, 'report-tool-icon'));
    $('brChoose').hidden = !!context;
    $('brSave').disabled = !found || !$('brCond').value || !Number.isInteger(Number($('brQty').value)) || Number($('brQty').value) < 1 || Number($('brQty').value) > 9999;
  }
  function updateConditions() {
    const found = FOH.invStore.findVariant(S.inv, $('brItem').value);
    const repairable = !!(found && found.item.cond.repair);
    const repair = $('brCond').querySelector('[value=repair]'); repair.disabled = !repairable;
    if (!repairable) $('brCond').value = 'writeoff';
    const root = $('brConditionCards'); root.replaceChildren(); root.classList.toggle('single', !repairable);
    (repairable ? ['repair', 'writeoff'] : ['writeoff']).forEach((condition) => {
      const button = actionButton('report-condition', '', { condition });
      button.setAttribute('aria-pressed', String($('brCond').value === condition));
      button.append(el('span', '', condition === 'repair' ? '🔧' : '×'), el('b', '', t(condition === 'repair' ? 'condRepair' : 'condWriteoff')), el('small', '', t(condition === 'repair' ? 'repairExplain' : 'writeoffExplain')));
      if (!repairable) button.disabled = true;
      root.append(button);
    });
    selectedLabel();
  }
  function selectVariant(id) {
    const found = FOH.invStore.findVariant(S.inv, id);
    if (!found || found.variant.archived) return;
    const changed = $('brItem').value !== id;
    $('brItem').value = id;
    if (changed) $('brCond').value = found.item.cond.repair ? '' : 'writeoff';
    updateConditions(); togglePicker(false);
    $('brDetails').scrollTop = 0;
    $('brSelected').setAttribute('tabindex', '-1');
    $('brSelected').focus({ preventScroll: true });
  }
  function open(options) {
    context = options && options.entry ? options : null;
    const sel = $('brItem');
    sel.replaceChildren();
    const empty = el('option', '', t('chooseTool')); empty.value = ''; sel.append(empty);
    categoryId = ''; browsingItem = ''; $('brSearch').value = '';
    S.inv.categories.forEach((cat) => {
      const group = el('optgroup');
      group.label = cat.icon + ' ' + pick(cat.name, cat.nameAr);
      cat.items.forEach((item) =>
        FOH.invStore.active(item).forEach((v) => {
          const label = FOH.invStore.variantLabel(item, v);
          const o = el('option', '', pick(item.name, item.nameAr) + (label ? ' · ' + label : ''));
          o.value = v.id;
          group.append(o);
        })
      );
      sel.append(group);
    });
    $('brItem').value = '';
    $('brItem').disabled = !!context;
    $('brLinkInfo').textContent = t('reportLinked'); $('brLinkInfo').hidden = !context;
    $('brQty').value = '1'; $('brCond').value = '';
    $('brNote').value = ''; $('brExtra').open = false;
    $('brPhotoLbl').textContent = t('addPhoto'); $('brPhoto').value = '';
    $('brSearch').placeholder = t('searchExample');
    $('brSearch').setAttribute('aria-label', t('findItem'));
    $('brQty').setAttribute('aria-label', t('howMany'));
    photoId = '';
    if (context) selectVariant(context.variantId);
    else { selectedLabel(); togglePicker(true); }
    $('breakSheet').returnValue = '';
    $('breakSheet').showModal();
  }

  function save() {
    const qty = Number($('brQty').value);
    if (!Number.isInteger(qty) || qty < 1 || qty > 9999) { alert(t('quantityRequired')); $('breakSheet').showModal(); return; }
    if (!$('brCond').value) { alert(t('chooseDamage')); $('breakSheet').showModal(); return; }
    if (!$('brItem').value) { alert(t('itemRequired')); $('breakSheet').showModal(); togglePicker(true); return; }
    const reportId = FOH.store.uid();
    const report = {
      id: reportId,
      variantId: $('brItem').value,
      cond: $('brCond').value === 'repair' ? 'repair' : 'writeoff',
      qty,
      note: $('brNote').value.trim().slice(0, 200),
      photo: photoId,
      by: S.me.name || '',
      at: FOH.time.todayISO() + ' ' + FOH.time.nowHM(),
      approved: false,
      countKey: context ? context.key : '',
      countCat: context ? context.catId : '',
      countMode: context ? context.mode : '',
    };
    S.inv.breakage.push(report);
    if (context) context.entry.damageReportIds.push(reportId);
    if (!FOH.invStore.save(S.inv)) {
      S.inv.breakage.pop();
      if (context) context.entry.damageReportIds.pop();
      alert(t('saveFailed'));
      $('breakSheet').showModal();
      return;
    }
    if (context) context.onSaved();
    FOH.edit.toast(t('breakSaved'));
    FOH.app.render();
  }

  function init() {
    const sheet = $('breakSheet');
    $('brItem').addEventListener('change', updateConditions);
    $('brChoose').addEventListener('click', () => { categoryId = ''; browsingItem = ''; $('brSearch').value = ''; togglePicker(true); });
    $('brReturnDetails').addEventListener('click', () => togglePicker(false));
    $('brSearch').addEventListener('input', drawPicker);
    $('brClearSearch').addEventListener('click', () => { $('brSearch').value = ''; drawPicker(); $('brSearch').focus(); });
    $('brBack').addEventListener('click', () => {
      if ($('brSearch').value) { $('brSearch').value = ''; categoryId = ''; browsingItem = ''; }
      else if (browsingItem) browsingItem = '';
      else categoryId = '';
      drawPicker();
    });
    $('brCategories').addEventListener('click', (e) => {
      const button = e.target.closest('button[data-category]'); if (!button) return;
      categoryId = button.dataset.category; browsingItem = ''; $('brSearch').value = ''; drawPicker(); $('brPicker').scrollTop = 0;
    });
    $('brResults').addEventListener('click', (e) => {
      const variant = e.target.closest('button[data-variant]');
      if (variant) return selectVariant(variant.dataset.variant);
      const button = e.target.closest('button[data-tool]'); if (!button) return;
      const found = FOH.invStore.findItem(S.inv, button.dataset.tool); if (!found) return;
      const variants = FOH.invStore.active(found.item);
      if (variants.length === 1) return selectVariant(variants[0].id);
      categoryId = found.cat.id; browsingItem = found.item.id; $('brSearch').value = ''; drawPicker(); $('brPicker').scrollTop = 0;
    });
    $('brConditionCards').addEventListener('click', (e) => {
      const button = e.target.closest('button[data-condition]'); if (!button || button.disabled) return;
      $('brCond').value = button.dataset.condition; updateConditions();
    });
    $('brQty').addEventListener('input', selectedLabel);
    [['brMinus', -1], ['brPlus', 1]].forEach(([id, step]) => $(id).addEventListener('click', () => {
      const current = Number($('brQty').value);
      $('brQty').value = String(Math.max(1, Math.min(9999, (Number.isFinite(current) ? Math.floor(current) : 1) + step))); selectedLabel();
    }));
    $('brPhoto').addEventListener('change', async (e) => {
      const id = await FOH.photos.add(e.target.files[0]);
      if (id) {
        photoId = id;
        $('brPhotoLbl').textContent = t('changePhoto');
      }
    });
    $('breakForm').addEventListener('keydown', (e) => e.key === 'Enter' && e.target.tagName === 'INPUT' && e.preventDefault());
    sheet.addEventListener('click', (e) => e.target === sheet && sheet.close('cancel'));
    sheet.addEventListener('close', () => sheet.returnValue === 'save' && save());
    document.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act="break-open"]');
      if (b) open();
    });
  }

  FOH.invBreak = { init, open };
})(window.FOH = window.FOH || {});
