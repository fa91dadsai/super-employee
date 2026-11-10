// Builds the section cards for run mode and edit mode, and the section chips.

// User text is always inserted with textContent, never as HTML.

(function (FOH) {
  'use strict';

  const { t, pick } = FOH.i18n;

  const M = FOH.model;

  const PALETTE = ['#2F6B5E', '#3B6A8F', '#7A4E6E', '#8A6A2E', '#A0563B', '#6B6458'];

  const pad = (n) => String(n).padStart(2, '0');

  const time = (FOH.time = Object.assign(FOH.time || {}, {
    todayISO: () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    businessDateISO: (now = new Date()) => {
      const d = new Date(now);
      if (d.getHours() < 6) d.setDate(d.getDate() - 1);
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    nowHM: () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    minutesUntil: (hm) => {
      const [h, m] = hm.split(':').map(Number);
      const d = new Date();
      return h * 60 + m - (d.getHours() * 60 + d.getMinutes());
    },
  }));

  function el(tag, cls, text) {
    const node = document.createElement(tag);

    if (cls) node.className = cls;

    if (text !== undefined) node.textContent = text;

    return node;
  }

  function btn(cls, label, opts = {}) {
    const isLegacy = typeof opts === 'string';

    const act = isLegacy ? opts : ((opts && opts.act) || '');

    const data = isLegacy ? arguments[3] : ((opts && opts.data) || {});

    const b = el('button', cls, label);

    b.type = 'button';

    if (act) b.dataset.act = act;

    if (data && typeof data === 'object') Object.assign(b.dataset, data);

    return b;
  }

  const itemName = (it) => pick(it.text, it.textAr);

  const sectionName = (s) => pick(s.title, s.titleAr);

  const S = () => FOH.state;

  function textBlock(cls, item, num) {
    const tx = cls instanceof Node ? cls : el('div', cls);

    const titleRow = el('div', 'item-title-row');

    titleRow.append(el('span', 'n', num !== undefined && num !== null && String(num).length ? (num + '.') : ''), el('span', 't', itemName(item)));

    tx.append(titleRow);

    const hasDue = !!item.due;
    const session = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    const userRole = session ? session.role : '';
    const isSelfRole = item.role && (item.role === userRole);
    const role = (item.role && !isSelfRole && FOH.tasksView) ? FOH.tasksView.roleName(item.role) : '';
    if (hasDue || role) {
      const metaRow = el('div', 'item-meta-row');
      if (hasDue) metaRow.append(el('span', 'due', t('by') + ' ' + item.due));
      if (role) metaRow.append(el('span', 'due role', '👤 ' + role));
      tx.append(metaRow);
    }

    return tx;
  }

  function isLate(item, done) {
    return !!item.due && !done && S().date === time.todayISO() && time.minutesUntil(item.due) < 0;
  }

  // ---- run mode ----

  function runLeaf(item, num, cls) {
    const stamp = S().run.checked[item.id];

    const li = el('li', cls);

    li.dataset.id = item.id;

    li.classList.toggle('done', !!stamp);

    li.classList.toggle('late', isLate(item, stamp));

    const row = el('label', 'row');

    const cb = el('input', 'ck');

    cb.type = 'checkbox';

    cb.checked = !!stamp;

    cb.dataset.id = item.id;

    const tx = textBlock('tx', item, num);

    if (typeof stamp === 'string') {
      let metaRow = tx.querySelector('.item-meta-row');

      if (!metaRow) {
        metaRow = el('div', 'item-meta-row');

        tx.append(metaRow);
      }

      metaRow.append(el('span', 'stamp', '✓ ' + stamp));
    }

    row.append(cb, tx);

    li.append(row);

    return li;
  }

  function runParent(item, nums, onlyLeft) {
    const p = M.progress(item.children, S().run.checked);

    const open = S().toggled.has(item.id) ? p.complete : !p.complete;

    const li = el('li', 'item parent');

    li.dataset.id = item.id;

    li.classList.toggle('done', p.complete);

    li.classList.toggle('closed', !open);

    li.classList.toggle('late', isLate(item, p.complete));

    const row = el('div', 'row');

    const ring = el('span', 'mini', p.complete ? '✓' : '');

    ring.style.setProperty('--p', Math.round((p.done * 100) / p.total) + '%');

    const toggle = textBlock(btn('tx', '', 'ptoggle', { id: item.id }), item, nums.get(item.id));

    toggle.setAttribute('aria-expanded', String(open));

    row.append(ring, toggle, el('span', 'cnt', p.done + '/' + p.total));

    if (!p.complete) row.append(btn('all', t('checkAll'), 'checkall', { id: item.id }));

    const kids = el('ol', 'kids');

    item.children.forEach((c) => {
      if (onlyLeft && S().run.checked[c.id]) return;

      kids.append(runLeaf(c, nums.get(c.id), 'item kid'));
    });

    li.append(row, kids);

    return li;
  }

  // ---- edit mode delegated to checklistEditRow ----
  const editRow = (...a) => (FOH.checklistEditRow ? FOH.checklistEditRow.editRow(...a) : null);

// ---- sections ----

  function head(section, i, p) {
    const editing = S().editing;

    const h = el('div', 'head');

    const ico = el('span', 'ico', section.icon);

    ico.setAttribute('aria-hidden', 'true');

    if (editing) {
      const more = btn('more', '⋯', 'tray', { sid: section.id });

      more.setAttribute('aria-label', t('more'));

      h.append(ico, btn('nm', sectionName(section), 's-rename', { sid: section.id }), more);

      return h;
    }

    const mainRow = el('div', 'head-main-row');

    const toggle = btn('nm', '', 'collapse', { sid: section.id });

    toggle.append(ico, el('span', 'nm-t', sectionName(section)));

    toggle.setAttribute('aria-expanded', String(!S().collapsed.has(section.id)));

    mainRow.append(toggle, el('span', 'ct', p.done + ' / ' + p.total));

    const metaRow = el('div', 'head-meta-row');

    h.append(mainRow, metaRow);

    return h;
  }

  function sectionTray(section, i) {
    const box = el('div', 'tray');

    const data = { sid: section.id };

    const up = btn('tb', '↑', 's-up', data);

    const down = btn('tb', '↓', 's-down', data);

    up.disabled = i === 0;

    down.disabled = i === S().tpl.sections.length - 1;

    box.append(up, down, btn('tb', t('rename'), 's-rename', data), btn('tb d', t('delete'), 's-delete', data));

    return box;
  }

  function shouldDisplayRunItem(item, st, onlyLeft) {
    if (item.scheduleDate && !item.isRecurring && item.scheduleDate !== st.date) return false;
    if (item.isRecurring && item.recurrence) {
      if (item.recurrence.start && st.date < item.recurrence.start) return false;
      if (item.recurrence.endDate && st.date > item.recurrence.endDate) return false;
      const ev = item.recurrence.every || 1;
      if (ev > 1 && FOH.schedule && FOH.schedule.diffDays) {
        const diff = FOH.schedule.diffDays(st.date, item.recurrence.start || st.date);
        if (diff < 0 || (diff % ev !== 0)) return false;
      }
    }
    const done = M.progress(M.leaves(item), st.run.checked).complete;
    if (onlyLeft && done) return false;
    return true;
  }

  function section(sec, i, nums) {
    const st = S();
    const p = M.progress(M.sectionLeaves(sec), st.run.checked);
    const onlyLeft = !st.editing && st.filter === 'left';
    if (onlyLeft && p.complete) return null;

    const card = el('section', 'card');
    card.id = 'sec-' + sec.id;
    card.style.setProperty('--c', PALETTE[i % PALETTE.length]);
    card.classList.toggle('complete', !st.editing && p.complete);
    card.classList.toggle('collapsed', !st.editing && st.collapsed.has(sec.id));
    card.append(head(sec, i, p));

    if (st.editing && st.tray === sec.id) card.append(sectionTray(sec, i));
    if (!st.editing) {
      const bar = el('div', 'pbar');
      const fill = el('i');
      fill.style.width = (p.total ? Math.round((p.done * 100) / p.total) : 0) + '%';
      bar.append(fill);
      card.append(bar);
    }

    const list = el('ol', 'items');
    sec.items.forEach((item) => {
      if (st.editing) return list.append(editRow(item, nums, 0));
      if (!shouldDisplayRunItem(item, st, onlyLeft)) return;
      list.append(M.isParent(item) ? runParent(item, nums, onlyLeft) : runLeaf(item, nums.get(item.id), 'item'));
    });

    card.append(list);

    if (st.editing) {
      FOH.drag.enable(list, (ids) => FOH.edit.applyOrder(sec.id, ids));

      card.append(btn('adds', t('addItem'), 'add', { sid: sec.id }));
    }

    return card;
  }

  function sections(root) {
    const nums = M.numbering(S().tpl);

    root.replaceChildren();

    FOH.preview.sections().forEach((sec, i) => {
      const card = section(sec, i, nums);

      if (card) root.append(card);
    });

    if (!FOH.preview.sections().length) root.append(el('p', 'empty', t('empty')));

    else if (!root.children.length) root.append(el('p', 'empty', t('nothingLeft')));
  }

  function chips(root) {
    root.replaceChildren();

    const secs = FOH.preview.sections();

    if (secs.length <= 1) {
      root.hidden = true;

      return;
    }

    root.hidden = false;

    secs.forEach((sec) => {
      const p = M.progress(M.sectionLeaves(sec), S().run.checked);

      const c = btn('chip', '', 'jump', { sid: sec.id });

      c.classList.toggle('on', S().activeSection === sec.id);

      c.classList.toggle('complete', p.complete);

      c.append(el('span', '', sec.icon + ' ' + sectionName(sec)), el('i', '', p.done + '/' + p.total));

      root.append(c);
    });
  }

  FOH.view = { el, btn, sections, chips, itemName, sectionName };
})(window.FOH = window.FOH || {});

