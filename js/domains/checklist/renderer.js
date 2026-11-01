// Builds the section cards for run mode and edit mode, and the section chips.
// User text is always inserted with textContent, never as HTML.
(function (FOH) {
  'use strict';

  const { t, pick } = FOH.i18n;
  const M = FOH.model;
  const PALETTE = ['#2F6B5E', '#3B6A8F', '#7A4E6E', '#8A6A2E', '#A0563B', '#6B6458'];
  const pad = (n) => String(n).padStart(2, '0');

  const time = (FOH.time = {
    todayISO() {
      const d = new Date();
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    nowHM() {
      const d = new Date();
      return pad(d.getHours()) + ':' + pad(d.getMinutes());
    },
    // Minutes from now until "HH:MM" today (negative when past).
    minutesUntil(hm) {
      const [h, m] = hm.split(':').map(Number);
      const d = new Date();
      return h * 60 + m - (d.getHours() * 60 + d.getMinutes());
    },
  });

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function btn(cls, label, act, data) {
    const b = el('button', cls, label);
    b.type = 'button';
    b.dataset.act = act;
    Object.assign(b.dataset, data);
    return b;
  }

  const itemName = (it) => pick(it.text, it.textAr);
  const sectionName = (s) => pick(s.title, s.titleAr);
  const S = () => FOH.state;

  function textBlock(cls, item, num) {
    const tx = cls instanceof Node ? cls : el('span', cls);
    tx.append(el('span', 'n', num), el('span', 't', itemName(item)));
    if (item.due) tx.append(el('span', 'due', t('by') + ' ' + item.due));
    const role = item.role && FOH.tasksView && FOH.tasksView.roleName(item.role);
    if (role) tx.append(el('span', FOH.tasksView.isMine(item) ? 'due mine' : 'due role', '👤 ' + role));
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
    if (typeof stamp === 'string') tx.append(el('span', 'stamp', '✓ ' + stamp));
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

  // ---- edit mode ----
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
      FOH.drag.enable(kids, (ids) => FOH.edit.applyOrder(item.id, ids));
      li.append(kids, btn('addk', t('addSub'), 'addsub', { id: item.id }));
    }
    return li;
  }

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
    const toggle = btn('nm', '', 'collapse', { sid: section.id });
    toggle.append(ico, el('span', 'nm-t', sectionName(section)));
    toggle.setAttribute('aria-expanded', String(!S().collapsed.has(section.id)));
    h.append(toggle, el('span', 'ct', p.done + ' / ' + p.total));
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
      const done = M.progress(M.leaves(item), st.run.checked).complete;
      if (onlyLeft && done) return;
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
    FOH.preview.sections().forEach((sec) => {
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

(function (FOH) {
  'use strict';
  const { t } = FOH.i18n;
  const normalize = FOH.store.cleanReminder;
  const presets = [0, 5, 10, 15, 30, 60, 120];
  function control(owner) {
    owner.remindBefore = normalize(owner.remindBefore);
    const { el } = FOH.view;
    const root = el('div', 'reminder-setting');
    const label = el('label', '', t('reminderLead'));
    const select = el('select', 'in');
    const initial = owner.remindBefore === null ? 'off' : presets.includes(owner.remindBefore) ? String(owner.remindBefore) : 'custom';
    [['off', t('reminderOff')], ...presets.map((n) => [String(n), t(n ? 'reminderMinutes' : 'reminderAt', { n })]), ['custom', t('reminderCustom')]].forEach(([value, text]) => {
      const option = el('option', '', text); option.value = value; option.selected = value === initial; select.append(option);
    });
    select.value = initial;
    label.append(select);
    const customLabel = el('label', '', t('reminderCustomLabel'));
    const input = el('input', 'in'); input.type = 'number'; input.min = '0'; input.max = '1440'; input.step = '1'; input.inputMode = 'numeric'; input.required = true; input.value = String(owner.remindBefore === null ? 30 : owner.remindBefore);
    customLabel.append(input);
    const visibility = () => { customLabel.hidden = select.value !== 'custom'; input.disabled = customLabel.hidden; };
    select.addEventListener('change', () => {
      visibility();
      owner.remindBefore = select.value === 'off' ? null : select.value === 'custom' ? normalize(Number(input.value)) : Number(select.value);
    });
    input.addEventListener('input', () => {
      const n = Number(input.value);
      if (input.value !== '' && Number.isInteger(n) && n >= 0 && n <= 1440) owner.remindBefore = n;
    });
    visibility();
    root.append(label, customLabel, el('p', 'setting-note', t('reminderHelp')));
    return root;
  }
  const SNOOZE_KEY = 'foh-opening.snoozes.v1';
  function loadSnoozes() {
    try {
      return JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}');
    } catch {
      return {};
    }
  }
  function saveSnoozes(map) {
    try {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(map));
    } catch {}
  }
  function isSnoozed(id, date, nowMin) {
    const map = loadSnoozes();
    const entry = map[date + '|' + id];
    if (!entry) return false;
    return entry.untilMin > nowMin;
  }
  function snoozeItems(ids, date, nowHM, addMin) {
    const nowMin = Number(nowHM.slice(0, 2)) * 60 + Number(nowHM.slice(3));
    const untilMin = addMin >= 1440 ? 24 * 60 + 1 : nowMin + addMin;
    const map = loadSnoozes();
    ids.forEach((id) => {
      if (id) map[date + '|' + id] = { untilMin, at: nowHM };
    });
    saveSnoozes(map);
  }
  function clearSnoozesForDate(date) {
    const map = loadSnoozes();
    Object.keys(map).forEach((k) => {
      if (k.startsWith(date + '|')) delete map[k];
    });
    saveSnoozes(map);
  }
  function activeSnoozeCount(date, nowHM) {
    const nowMin = Number(nowHM.slice(0, 2)) * 60 + Number(nowHM.slice(3));
    const map = loadSnoozes();
    return Object.entries(map).filter(([k, v]) => k.startsWith(date + '|') && v && v.untilMin > nowMin).length;
  }

  function next(sections, checked, states, date, nowHM) {
    const minutes = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
    const nowMin = minutes(nowHM);
    const pending = [];
    const add = (item, due, status, kind) => {
      if (isSnoozed(item.id, date, nowMin)) return;
      const lead = normalize(item.remindBefore);
      if (lead === null || !FOH.store.TIME_RE.test(due)) return;
      const delta = minutes(due) - nowMin;
      if (delta > lead) return;
      pending.push({ item, due, delta, min: status === 'due' ? 0 : delta, kind: kind || 'item' });
    };
    sections.forEach((section) => section.items.forEach((item) => {
      if (!FOH.model.progress(FOH.model.leaves(item), checked).complete) add(item, item.due, undefined, 'item');
      FOH.model.kids(item).forEach((child) => { if (!checked[child.id]) add(child, child.due, undefined, 'item'); });
    }));
    states.filter((st) => st.status !== 'done' && st.occ === date).forEach((st) => add(st.task, st.task.time, st.status, 'task'));
    if (!pending.length) return null;
    pending.sort((a, b) => a.delta - b.delta);
    const first = pending[0];
    const short = (name) => name.length > 34 ? name.slice(0, 32).trim() + '…' : name;
    const matched = pending.filter((p) => p.delta === first.delta);
    return {
      at: first.due,
      names: matched.map((p) => short(FOH.view.itemName(p.item))),
      ids: matched.map((p) => p.item.id),
      items: matched,
      min: first.min,
    };
  }
  FOH.reminders = { control, next, snoozeItems, clearSnoozesForDate, activeSnoozeCount, isSnoozed };
})(window.FOH = window.FOH || {});

// App state, the header (progress ring, due banner, section chips), the
// meta panel (date and names) and run-mode actions (ticks, filters).
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { t } = FOH.i18n;
  const M = FOH.model;
  const time = FOH.time;

  const S = (FOH.state = {
    tpl: FOH.store.loadTemplate(),
    date: time.todayISO(),
    run: null,
    editing: false,
    filter: 'all', // 'all' | 'left'
    collapsed: new Set(), // section ids folded in run mode
    toggled: new Set(), // parent items opened/closed against their default
    tray: null, // id of the item or section whose action tray is open
    activeSection: null,
    view: 'opening', // run mode: 'opening' | 'mine'
    editTab: 'list', // edit mode: 'list' | 'sched' | 'roles'
    log: FOH.store.loadLog(), // scheduled-task history
    me: FOH.store.loadMe(), // who uses this device
    weekOffset: 0, // week shown in the Scheduled tab, relative to the current one
  });
  S.run = FOH.store.loadRun(S.date);
  S.inv = FOH.invStore.load(S.tpl); // blind inventory (separate storage)
  S.invTab = 'week';
  S.invWeekOffset = 0;

  function duration(min) {
    const m = Math.abs(min);
    return m < 60 ? t('min', { m }) : t('hour', { h: Math.floor(m / 60), m: m % 60 });
  }

  const short = (text) => (text.length > 34 ? text.slice(0, 32).trim() + '…' : text);

  // Earliest due time among unfinished items today, with the items due then.
  function nextDue() {
    if (S.date !== time.todayISO()) return null;
    const states = FOH.tasksView.todayStates().filter((st) => !S.previewEmployee || FOH.tasksView.isMine(st.task));
    return FOH.reminders.next(FOH.preview.sections(), S.run.checked, states, S.date, time.nowHM());
  }

  function renderBanner(all) {
    const banner = $('banner');
    const due = nextDue();
    banner.className = 'banner';
    if (S.editing || (!due && !all.complete)) {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    if (all.complete && !due) {
      banner.classList.add('ready');
      banner.textContent = t('ready');
      return;
    }
    const when = due.min > 0 ? t('dueIn', { d: duration(due.min) }) : due.min === 0 ? t('dueNow') : t('dueLate', { d: duration(due.min) });
    banner.classList.toggle('late', due.min < 0);

    const mainRow = FOH.view.el('div', 'banner-main');
    const txtSpan = FOH.view.el('span', '');
    txtSpan.append('⏰ ', FOH.view.el('b', '', due.at), ' · ' + due.names.join('، ') + ' — ' + when);
    mainRow.append(txtSpan);

    const actions = FOH.view.el('div', 'banner-actions');
    const makeSnoozeBtn = (labelKey, mins) => {
      const b = FOH.view.el('button', 'snooze-btn', t(labelKey));
      b.type = 'button';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        FOH.reminders.snoozeItems(due.ids || [], S.date, time.nowHM(), mins);
        FOH.edit.toast(mins >= 1440 ? t('snoozedTodayToast') : t('snoozedToast', { m: mins }));
        render();
      });
      return b;
    };

    // Quick "Done Now" button directly inside the alert banner
    const doneNowBtn = FOH.view.el('button', 'snooze-btn done-now', t('snoozeDoneNow'));
    doneNowBtn.type = 'button';
    doneNowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const now = time.nowHM();
      (due.items || []).forEach((entry) => {
        if (entry.kind === 'task') {
          const st = FOH.schedule.stateOn(entry.item, S.log, S.date, time.todayISO(), now);
          if (st && !st.doneEntry) {
            FOH.schedule.toggle(S.log, st, S.date, now, S.me.name);
            FOH.store.saveLog(S.log);
          }
        } else {
          M.leaves(entry.item).forEach((lf) => {
            S.run.checked[lf.id] = now;
          });
          saveRun();
        }
      });
      buzz();
      render();
    });

    actions.append(
      doneNowBtn,
      makeSnoozeBtn('snooze15', 15),
      makeSnoozeBtn('snooze30', 30),
      makeSnoozeBtn('snooze60', 60),
      makeSnoozeBtn('snoozeToday', 1440)
    );
    banner.replaceChildren(mainRow, actions);
  }

  function renderHeader() {
    const all = M.progress(M.allLeaves({ sections: FOH.preview.sections() }), S.run.checked);
    const pct = all.total ? Math.round((all.done * 100) / all.total) : 0;
    document.body.classList.toggle('editing', S.editing);
    const ident = typeof getAppRoleIdentity === 'function' ? getAppRoleIdentity() : null;
    if (ident) {
      $('title').textContent = S.editing
        ? t('editTitle')
        : (FOH.i18n.lang === 'ar' ? ident.titleAr.split('·')[0].trim() : ident.titleEn);
    } else {
      $('title').textContent = S.editing ? t('editTitle') : t('title');
    }
    $('ring').style.setProperty('--p', pct + '%');
    $('ring').classList.toggle('complete', all.complete);
    $('ringText').textContent = all.complete ? '✓' : pct + '%';
    $('doneOf').textContent = t('doneOf', { done: all.done, total: all.total });
    $('modeBtn').textContent = S.editing ? t('done') : '✎';
    $('modeBtn').setAttribute('aria-label', S.editing ? t('done') : t('editList'));
    $('langBtn').setAttribute('aria-label', FOH.i18n.lang === 'ar' ? 'English' : 'العربية');
    document.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('on', b.dataset.filter === S.filter));
    const names = [S.run.supervisor, S.run.captain, S.run.assistant].filter(Boolean);
    const day = new Date(S.date + 'T00:00:00');
    const dateLabel = isNaN(day)
      ? S.date
      : day.toLocaleDateString(FOH.i18n.locale, { weekday: 'short', day: 'numeric', month: 'short' });
    $('metaBtn').textContent = dateLabel + ' · ' + (names.length ? names.join(' · ') : t('addNames')) + ' ▾';
    renderBanner(all);
    FOH.view.chips($('chips'));
    renderTabs(all);
  }

  // Tabs: Opening / My tasks in run mode; Checklist / Scheduled / Roles in edit mode.
  function renderTabs(all) {
    const TV = FOH.tasksView;
    document.body.classList.toggle('view-mine', !S.editing && S.view !== 'opening'); // hides opening-only parts
    document.body.classList.toggle('view-orders', !S.editing && S.view === 'orders');
    $('invTab').hidden = !!S.previewEmployee || !FOH.invManage.visible();
    document.querySelector('[data-view=opening] [data-i18n]').textContent = t(S.previewEmployee ? 'employeeChecklist' : 'tabOpening');
    document.body.classList.toggle('etab-other', S.editing && S.editTab !== 'list');
    document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    document.querySelectorAll('[data-etab]').forEach((b) => b.classList.toggle('on', b.dataset.etab === S.editTab));
    const mineLeft =
      TV.todayStates().filter((st) => TV.isMine(st.task) && st.status !== 'done').length +
      TV.myOpeningItems().filter((it) => !S.run.checked[it.id]).length +
      FOH.invCount.pending();
    $('badgeOpening').textContent = String(all.total - all.done);
    $('badgeMine').textContent = String(mineLeft);
    $('badgeMine').hidden = !mineLeft;
  }

  function render() {
    FOH.staff.syncMe();
    FOH.preview.render();
    if (S.previewEmployee) { S.editing = false; if (S.view === 'inv') S.view = 'mine'; }
    if (S.view === 'inv' && !FOH.invManage.visible()) S.view = 'opening';
    renderHeader();
    const run = !S.editing;
    const show = {
      sections: run ? S.view === 'opening' : S.editTab === 'list',
      today: run && S.view === 'opening',
      mine: run && S.view === 'mine',
      ordersView: run && S.view === 'orders',
      academyView: run && S.view === 'academy',
      tipsView: run && S.view === 'tips',
      dashboardView: run && S.view === 'dashboard',
      profilePageView: run && S.view === 'profile',
      settingsView: run && S.view === 'settings',
      inv: run && S.view === 'inv',
      sched: S.editing && S.editTab === 'sched',
      rolesView: S.editing && S.editTab === 'roles',
    };
    Object.keys(show).forEach((id) => ($(id).hidden = !show[id]));
    if (show.sections) FOH.view.sections($('sections'));
    if (show.today) FOH.tasksView.today($('today'));
    if (show.mine) FOH.tasksView.mine($('mine'));
    if (show.ordersView && FOH.erpPwa && FOH.erpPwa.renderOrdersView) FOH.erpPwa.renderOrdersView($('ordersView'));
    if (show.inv) FOH.invManage.render($('inv'));
    if (show.sched) FOH.tasksView.schedule($('sched'));
    if (show.rolesView) FOH.tasksView.roles($('rolesView'));
    const h = document.querySelector('.top').offsetHeight;
    document.documentElement.style.setProperty('--top-h', h + 'px');
  }

  const saveRun = () => FOH.store.saveRun(S.date, S.run);
  const buzz = () => navigator.vibrate && navigator.vibrate(8);

  function loadDate(date) {
    S.date = date || time.todayISO();
    S.run = FOH.store.loadRun(S.date);
    $('date').value = S.date;
    const day = new Date(S.date + 'T00:00:00');
    $('day').textContent = isNaN(day) ? '' : day.toLocaleDateString(FOH.i18n.locale, { weekday: 'long' });
    ['supervisor', 'captain', 'assistant'].forEach((k) => ($(k).value = S.run[k]));
    render();
  }

  // Run-mode actions; everything else goes to the editor.
  function onClick(ev) {
    const b = ev.target.closest('button[data-act]');
    if (!b) return;
    const { act, id, sid } = b.dataset;
    if (act === 'ptoggle' || act === 'collapse') {
      const set = act === 'ptoggle' ? S.toggled : S.collapsed;
      const key = id || sid;
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return render();
    }
    if (act === 'checkall') {
      const at = M.locate({ sections: FOH.preview.sections() }, id);
      const now = time.nowHM();
      if (at) at.item.children.forEach((c) => S.run.checked[c.id] || (S.run.checked[c.id] = now));
      S.toggled.delete(id);
      saveRun();
      buzz();
      return render();
    }
    if (act === 'jump') return jump(sid);
    FOH.edit.handle(act, id, sid);
  }

  function onCheck(ev) {
    const cb = ev.target;
    if (cb.type !== 'checkbox' || !cb.dataset.id) return;
    if (cb.checked) S.run.checked[cb.dataset.id] = time.nowHM();
    else delete S.run.checked[cb.dataset.id];
    const at = M.locate(S.tpl, cb.dataset.id);
    if (at && at.parent) S.toggled.delete(at.parent.id); // back to auto open/close
    saveRun();
    if (cb.checked) buzz();
    render();
  }

  function jump(sid) {
    S.collapsed.delete(sid);
    S.activeSection = sid;
    render();
    const card = $('sec-' + sid);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Highlight the chip of the section under the header while scrolling.
  let scrollQueued = false;
  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      const limit = document.querySelector('.top').getBoundingClientRect().bottom + 12;
      let active = null;
      document.querySelectorAll('#sections .card').forEach((c) => {
        if (c.getBoundingClientRect().top <= limit) active = c.id.slice(4);
      });
      if (active === S.activeSection) return;
      S.activeSection = active;
      document.querySelectorAll('#chips .chip').forEach((c) => {
        const on = c.dataset.sid === active;
        c.classList.toggle('on', on);
        if (on) c.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      });
    });
  }

  function init() {
    FOH.i18n.apply();
    $('sections').addEventListener('click', onClick);
    $('sections').addEventListener('change', onCheck);
    $('chips').addEventListener('click', onClick);
    ['today', 'mine'].forEach((id) => $(id).addEventListener('change', onCheck)); // opening items in "My tasks"
    FOH.taskActions.init(['today', 'mine', 'sched', 'rolesView'].map($));
    document.querySelectorAll('[data-view]').forEach((b) =>
      b.addEventListener('click', () => {
        S.view = b.dataset.view;
        window.scrollTo(0, 0);
        render();
      })
    );
    document.querySelectorAll('[data-etab]').forEach((b) =>
      b.addEventListener('click', () => {
        S.editTab = b.dataset.etab;
        S.tray = null;
        window.scrollTo(0, 0);
        render();
      })
    );
    window.addEventListener('scroll', onScroll, { passive: true });
    $('modeBtn').addEventListener('click', () => {
      if (S.previewEmployee) return;
      S.editing = !S.editing;
      S.tray = null;
      render();
    });
    $('langBtn').addEventListener('click', () => {
      FOH.i18n.setLang(FOH.i18n.lang === 'ar' ? 'en' : 'ar');
      loadDate(S.date);
    });
    $('metaBtn').addEventListener('click', () => {
      $('metaPanel').hidden = !$('metaPanel').hidden;
      render();
    });
    document.querySelectorAll('[data-filter]').forEach((b) =>
      b.addEventListener('click', () => {
        S.filter = b.dataset.filter;
        render();
      })
    );
    $('date').addEventListener('change', (e) => loadDate(e.target.value));
    ['supervisor', 'captain', 'assistant'].forEach((k) =>
      $(k).addEventListener('input', (e) => {
        S.run[k] = e.target.value.slice(0, 300);
        saveRun();
        renderHeader();
      })
    );
    $('printBtn').addEventListener('click', () => {
      S.editing = false;
      S.filter = 'all';
      S.collapsed.clear();
      render();
      window.print();
    });
    $('clearDayBtn').addEventListener('click', () => {
      if (!confirm(t('confirmClear', { date: S.date }))) return;
      S.run.checked = {};
      S.toggled.clear();
      saveRun();
      render();
    });
    window.addEventListener('resize', render);
    FOH.edit.init();
    FOH.taskSheet.init();
    FOH.staff.init();
    FOH.preview.init();
    FOH.invCount.init();
    FOH.invItems.init();
    $('inv').addEventListener('click', FOH.invManage.onClick);
    $('inv').addEventListener('change', FOH.invManage.onChange);
    loadDate(time.todayISO());
    if ($('metaPanel')) $('metaPanel').hidden = true;
    // Refresh the due banner and late items once a minute.
    setInterval(() => {
      if (!S.editing && !document.querySelector('dialog[open]')) render();
    }, 60000);
  }

  FOH.app = { render, renderHeader };
  document.addEventListener('DOMContentLoaded', init);
})(window.FOH = window.FOH || {});
