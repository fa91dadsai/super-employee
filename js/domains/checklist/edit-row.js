// foh-opening/js/domains/checklist/edit-row.js
// Checklist Edit Mode: Item rows, trays, sub-item nesting & reordering
(function (FOH) {
  'use strict';

  const { t } = FOH.i18n;
  const M = FOH.model;
  const S = () => FOH.state;
  const el = (tag, cls, text) => (FOH.view ? FOH.view.el(tag, cls, text) : null);
  const btn = (cls, text, act, data) => (FOH.view ? FOH.view.btn(cls, text, act, data) : null);
  const textBlock = (wrap, item, num) => (FOH.view && FOH.view.textBlock ? FOH.view.textBlock(wrap, item, num) : wrap);

  function tray(item, nums) {
    const at = M.locate(S().tpl, item.id);
    const box = el('div', 'tray');
    const data = { id: item.id };
    const up = btn('tb', '↑', 'up', data);
    const down = btn('tb', '↓', 'down', data);
    up.disabled = at.index === 0;
    down.disabled = at.index === at.list.length - 1;
    up.setAttribute('aria-label', t('moveUp'));
    down.setAttribute('aria-label', t('moveDown'));
    box.append(up, down);
    if (at.parent) box.append(btn('tb p', t('makeMain'), 'outdent', data));
    const target = M.indentTarget(S().tpl, item.id);
    if (target) box.append(btn('tb p', t('makeSub', { n: nums.get(target.id) }), 'indent', data));
    if (!at.parent) box.append(btn('tb', t('addSub'), 'addsub', data));
    box.append(btn('tb', t('editBtn'), 'edit', data), btn('tb d', t('delete'), 'delete', data));
    return box;
  }

  function editRow(item, nums, depth) {
    const li = el('li', depth ? 'item kid' : 'item');
    li.dataset.id = item.id;
    const open = S().tray === item.id;
    li.classList.toggle('sel', open);
    li.classList.toggle('parent', !depth && M.isParent(item));

    const row = el('div', 'row');
    const tx = textBlock(btn('tx', '', 'edit', { id: item.id }), item, nums.get(item.id));
    if (M.isParent(item)) tx.append(el('span', 'cnt', String(item.children.length)));
    const more = btn('more', '⋯', 'tray', { id: item.id });
    more.setAttribute('aria-label', t('more'));
    more.setAttribute('aria-expanded', String(open));
    row.append(el('span', 'handle', '⠿'), tx, more);
    li.append(row);

    if (open) li.append(tray(item, nums));

    if (!depth && M.isParent(item)) {
      const kids = el('ol', 'kids');
      item.children.forEach((c) => kids.append(editRow(c, nums, 1)));
      if (FOH.drag && FOH.drag.enable) {
        FOH.drag.enable(kids, (ids) => FOH.edit.applyOrder(item.id, ids));
      }
      li.append(kids, btn('addk', t('addSub'), 'addsub', { id: item.id }));
    }
    return li;
  }

  FOH.checklistEditRow = {
    tray,
    editRow,
  };
})(window.FOH = window.FOH || {});

