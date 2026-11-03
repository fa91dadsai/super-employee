// Scheduled tasks on screen: "Today's tasks" on the opening page, the
// "My tasks" tab, and in edit mode the week grid, task list and positions.
(function (FOH) {
  'use strict';

  const { t, pick } = FOH.i18n;
  const { el, btn } = FOH.view;
  const SC = FOH.schedule;
  const M = FOH.model;
  const S = () => FOH.state;

  const roleName = (id) => (S().tpl.roles.find((r) => r.id === id) || {}).name || '';
  const taskName = (tk) => pick(tk.text, tk.textAr);
  const dayNames = () => t('daysShort').split(',');
  const fmtDay = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString(FOH.i18n.locale, { weekday: 'short', day: 'numeric', month: 'short' });

  // Is this task or opening item for the person using this device?
  function isMine(x) {
    if (!x) return false;
    const me = S().me || {};
    const sess = (FOH.sessionAuth && FOH.sessionAuth.getSession) ? FOH.sessionAuth.getSession() : null;
    const curUname = ((sess && sess.username) || (me.name ? me.name.split(' ')[0] : '')).toLowerCase().trim();
    const curDispName = ((sess && (sess.displayName || sess.firstName)) || me.name || '').toLowerCase().trim();
    const curSuperRole = (FOH.roleIdentity && FOH.roleIdentity.getCurrentSuperRoleKey) ? FOH.roleIdentity.getCurrentSuperRoleKey() : '';
    const curRoleId = me.role || '';

    // 1. Direct username match takes highest priority
    if (x.assignedUsername) {
      return x.assignedUsername.toLowerCase().trim() === curUname;
    }

    // 2. Person name match
    if (x.person && x.person !== 'Staff' && x.person !== 'الكل' && x.person !== 'all') {
      const p = x.person.toLowerCase().trim();
      if (p === curUname || p === curDispName) return true;
      if (curDispName && curDispName.includes(p)) return true;
      if (p.includes(curUname)) return true;
      return false;
    }

    // 3. Assigned super role match
    if (x.assignedRoleKey) {
      if (x.assignedRoleKey === 'all') return true;
      if (curSuperRole && x.assignedRoleKey === curSuperRole) return true;
      if (x.assignedRoleKey === 'super_waiter' && (curRoleId === 'waiter' || curSuperRole === 'super_waiter')) return true;
      if (x.assignedRoleKey === 'super_bartender' && (curRoleId === 'bar' || curSuperRole === 'super_bartender')) return true;
      if (x.assignedRoleKey === 'super_captain' && (curRoleId === 'captain' || curSuperRole === 'super_captain')) return true;
      if (x.assignedRoleKey === 'super_manager' && (curRoleId === 'manager' || curSuperRole === 'super_manager')) return true;
      return false;
    }

    // 4. Fallback for template items with legacy x.role
    if (x.role) {
      if (curRoleId && x.role === curRoleId) return true;
      if (x.role === 'waiter' && curSuperRole === 'super_waiter') return true;
      if (x.role === 'bar' && curSuperRole === 'super_bartender') return true;
      if (x.role === 'captain' && curSuperRole === 'super_captain') return true;
      if (x.role === 'manager' && curSuperRole === 'super_manager') return true;
      return false;
    }

    return false;
  }

  function addMinutes(hm, add) {
    const m = Math.min(23 * 60 + 59, Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3)) + add);
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  function ruleText(tk) {
    const r = tk.rule;
    const first = S().tpl.settings.weekStart;
    const order = (d) => (d - first + 7) % 7;
    let when = t('everyN', { n: r.every });
    if (r.type === 'weekly') when = r.days.slice().sort((a, b) => order(a) - order(b)).map((d) => dayNames()[d]).join(' · ');
    if (r.type === 'once') when = t('onceOn', { date: r.date ? fmtDay(r.date) : '—' });
    if (tk.endDate) when += (FOH.i18n && FOH.i18n.lang === 'ar' ? ' (حتى ' + tk.endDate + ')' : ' (until ' + tk.endDate + ')');
    return when + ' · ' + tk.time;
  }

  function todayStates() {
    const st = S();
    const today = FOH.time.todayISO();
    return st.tpl.tasks
      .map((tk) => SC.stateOn(tk, st.log, st.date, today, FOH.time.nowHM()))
      .filter(Boolean)
      .sort((a, b) => isMine(b.task) - isMine(a.task) || a.task.time.localeCompare(b.task.time));
  }

  function roleTag(tk) {
    if (!tk.role) return null;
    if (isMine(tk)) return el('span', 'tag mine', '👤 ' + t('you') + ' · ' + roleName(tk.role));
    return el('span', 'tag role', roleName(tk.role) + (tk.person ? ' · ' + tk.person : ''));
  }

  function stateRow(st, showRole) {
    const tk = st.task;
    const li = el('li', 'item st ' + st.status);
    li.classList.toggle('done', st.status === 'done');
    li.classList.toggle('other', showRole && !!tk.role && !isMine(tk));
    const row = el('label', 'row');
    const cb = el('input', 'ck');
    cb.type = 'checkbox';
    cb.checked = st.status === 'done';
    cb.dataset.task = tk.id;
    const tx = el('span', 'tx');
    tx.append(el('span', 't', tk.icon + ' ' + taskName(tk)));
    const tags = el('span', 'tags');
    if (st.status === 'late' && st.occ < S().date) tags.append(el('span', 'tag late', t('lateFromBefore', { day: fmtDay(st.occ) })));
    else if (st.status === 'late') tags.append(el('span', 'tag late', t('lateNow') + ' · ' + tk.time));
    else if (st.status !== 'done') tags.append(el('span', 'tag time', tk.time + ' – ' + addMinutes(tk.time, tk.lateAfter)));
    if (st.doneEntry) tags.append(el('span', 'stamp', '✓ ' + st.doneEntry.at + (st.doneEntry.by ? ' · ' + st.doneEntry.by : '')));
    const rt = showRole && roleTag(tk);
    if (rt) tags.append(rt);
    if (st.status !== 'done' && (st.status === 'late' || st.status === 'due') && FOH.reminders && FOH.reminders.snoozeItems) {
      const snzBtn = el('button', 'row-snooze-chip', t('rowSnoozeBtn') || '💤 30m');
      snzBtn.type = 'button';
      snzBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        FOH.reminders.snoozeItems([tk.id], S().date, FOH.time.nowHM(), 30);
        FOH.edit.toast(t('snoozedToast', { m: 30 }));
        FOH.app.render();
      });
      tags.append(snzBtn);
    }
    const last = SC.lastDone(S().log, tk);
    const lastTxt = last && !st.doneEntry ? t('lastDone', { when: fmtDay(last.done) + ' ' + last.at + (last.by ? ' · ' + last.by : '') }) : '';
    tx.append(tags, el('span', 'last', [lastTxt, ruleText(tk)].filter(Boolean).join(' · ')));
    row.append(cb, tx);
    li.append(row);
    return li;
  }

  function card(cls, icon, title, count) {
    const c = el('section', 'card ' + cls);
    const h = el('div', 'head');
    const nm = el('span', 'nm');
    nm.append(el('span', 'ico', icon), el('span', 'nm-t', title));
    h.append(nm);
    if (count !== undefined) h.append(el('span', 'ct', count));
    c.append(h);
    return c;
  }

  function iAmButton() {
    const label = S().me.staffId ? FOH.staff.label() : S().me.role ? t('iAm', { role: roleName(S().me.role) || '—' }) : t('chooseName');
    return btn('pick', '👤 ' + label + ' ▾', 'iam', {});
  }

  // "Today's tasks" card at the top of the opening page.
  function today(root) {
    root.replaceChildren();
    const curRole = (FOH.roleIdentity && FOH.roleIdentity.getCurrentSuperRoleKey) ? FOH.roleIdentity.getCurrentSuperRoleKey() : '';
    const isLeader = curRole === 'super_manager' || curRole === 'super_captain';
    const states = todayStates().filter((st) => (!isLeader || S().previewEmployee) ? isMine(st.task) : true);
    if (!states.length) return;
    const bar = el('div', 'me-row');
    bar.append(el('span', '', fmtDay(S().date)), iAmButton());
    const done = states.filter((s) => s.status === 'done').length;
    const c = card('sched', '🗓', t('todayTasks'), done + ' / ' + states.length);
    const list = el('ol', 'items');
    states.forEach((st) => list.append(stateRow(st, isLeader)));
    c.append(list);
    root.append(bar, c);
  }

  // Opening-list items (leaves) assigned to my position.
  function myOpeningItems() {
    const out = [];
    (S().previewEmployee ? FOH.preview.sections() : S().tpl.sections).forEach((s) =>
      s.items.forEach((it) => {
        if (isMine(it)) return out.push(...M.leaves(it));
        M.kids(it).forEach((c) => isMine(c) && out.push(c));
      })
    );
    return out;
  }

  // The "My tasks" tab.
  function mine(root) {
    root.replaceChildren();
    const bar = el('div', 'me-row');
    bar.append(el('span', '', fmtDay(S().date)), iAmButton());
    root.append(bar);
    if (!S().me.role && !S().me.staffId) return root.append(el('p', 'empty', t('pickRoleFirst')));
    const nums = M.numbering(S().tpl);
    const states = todayStates().filter((s) => isMine(s.task));
    const items = myOpeningItems();
    const c = card('sched', '👤', t('today'));
    const list = el('ol', 'items');
    states.forEach((st) => list.append(stateRow(st, false)));
    items.forEach((it) => {
      const stamp = S().run.checked[it.id];
      const li = el('li', 'item' + (stamp ? ' done' : ''));
      const row = el('label', 'row');
      const cb = el('input', 'ck');
      cb.type = 'checkbox';
      cb.checked = !!stamp;
      cb.dataset.id = it.id;
      const tx = el('span', 'tx');
      tx.append(el('span', 'n', nums.get(it.id)), el('span', 't', pick(it.text, it.textAr)));
      const tags = el('span', 'tags');
      if (it.due) tags.append(el('span', 'tag time', it.due));
      tags.append(el('span', 'tag', t('fromOpening')));
      if (typeof stamp === 'string') tags.append(el('span', 'stamp', '✓ ' + stamp));
      tx.append(tags);
      row.append(cb, tx);
      li.append(row);
      list.append(li);
    });
    if (list.children.length) { c.append(list); root.append(c); }
    else if (!FOH.invCount.myCounts().length) {
      c.append(el('p', 'empty', t('nothingMine')));
      if (S().previewEmployee) c.append(btn('btn demo-count-cta', t('countDemoButton'), 'demo-count', {}));
      root.append(c);
    }
    FOH.invCount.mineCard(root); // assigned inventory counts only
    const today = FOH.time.todayISO();
    const next = [];
    S().tpl.tasks.filter(isMine).forEach((tk) =>
      SC.upcoming(tk, S().log, S().date, today, 7, 7).forEach((d) => next.push({ d, tk }))
    );
    if (next.length) {
      next.sort((a, b) => a.d.localeCompare(b.d) || a.tk.time.localeCompare(b.tk.time));
      const up = card('', '📅', t('comingUp'));
      const ul = el('ol', 'items');
      next.forEach(({ d, tk }) => {
        const li = el('li', 'item up');
        const day = el('span', 'd', dayNames()[SC.weekday(d)]);
        day.append(el('b', '', String(Number(d.slice(8)))));
        const tags = el('span', 'tags');
        tags.append(el('span', 'tag time', tk.time));
        li.append(day, el('span', 'up-t', tk.icon + ' ' + taskName(tk)), tags);
        ul.append(li);
      });
      up.append(ul, el('p', 'note', t('movesNote')));
      root.append(up);
    }

    // Always append Day-Off & Leave Card to My Tasks
    if (FOH.dayOff && FOH.dayOff.buildDayOffSection) {
      root.append(FOH.dayOff.buildDayOffSection(false));
    }
  }

  // Edit mode, "Scheduled" tab: week grid + list of tasks.
  function schedule(root) {
    root.replaceChildren();
    const st = S();
    const today = FOH.time.todayISO();
    const first = SC.addDays(SC.weekStart(st.date, st.tpl.settings.weekStart), 7 * st.weekOffset);
    const wk = card('sched', '🗓', st.weekOffset ? t('weekOf', { from: fmtDay(first), to: fmtDay(SC.addDays(first, 6)) }) : t('thisWeek'));
    wk.querySelector('.head').append(btn('link', t('addTask'), 'task-add', {}));
    wk.append(weekBar());
    SC.week(st.tpl.tasks, st.log, first, today, FOH.time.nowHM()).forEach((day) => {
      const row = el('div', 'wk' + (day.date === today ? ' is-today' : ''));
      const dn = el('span', 'dn', dayNames()[SC.weekday(day.date)]);
      dn.append(el('b', '', String(Number(day.date.slice(8)))));
      const cells = el('div', 'cells');
      day.cells.forEach((c) => {
        const mark =
          c.status === 'done' ? ' ✓' : c.status === 'missed' ? ' · ' + t('missed') : c.status === 'late' ? ' · ' + t('lateNow') : '';
        const label = c.task.icon + ' ' + c.task.time + ' ' + (roleName(c.task.role) || '') + mark;
        cells.append(btn('pill ' + c.status, label, 'task-open', { id: c.task.id }));
      });
      row.append(dn, cells);
      wk.append(row);
    });
    const lc = card('', '📋', t('tabScheduled'), String(st.tpl.tasks.length));
    const ul = el('ol', 'items');
    st.tpl.tasks.forEach((tk) => {
      const li = el('li', 'item');
      const b = btn('task-row', '', 'task-open', { id: tk.id });
      const tags = el('span', 'tags');
      tags.append(el('span', 'tag time', ruleText(tk)));
      if (tk.role) tags.append(el('span', 'tag role', roleName(tk.role) + (tk.person ? ' · ' + tk.person : '')));
      if (tk.paused) tags.append(el('span', 'tag', t('pausedTag')));
      if (tk.rule.type === 'once' && (st.log[tk.id] || []).some((e) => e.occ === tk.rule.date)) {
        tags.append(el('span', 'tag mine', t('doneTag')));
      }
      b.append(el('span', 't', tk.icon + ' ' + taskName(tk)), tags);
      li.append(b);
      ul.append(li);
    });
    if (!st.tpl.tasks.length) ul.append(el('li', 'empty', t('noTasks')));
    lc.append(ul, btn('adds', t('addTask'), 'task-add', {}));
    root.append(wk, lc);
  }

  // Week navigation and the "week starts on" setting.
  function weekBar() {
    const bar = el('div', 'week-bar');
    const prev = btn('icon-btn', '‹', 'week-prev', {});
    const next = btn('icon-btn', '›', 'week-next', {});
    prev.setAttribute('aria-label', t('prevWeek'));
    next.setAttribute('aria-label', t('nextWeek'));
    const nav = el('span', 'week-nav');
    nav.append(prev, btn('link', t('backToday'), 'week-today', {}), next);
    const label = el('label', 'week-start');
    const sel = el('select', 'in');
    sel.id = 'weekStartSel';
    t('daysLong').split(',').forEach((name, d) => {
      const o = el('option', '', name);
      o.value = d;
      o.selected = d === S().tpl.settings.weekStart;
      sel.append(o);
    });
    label.append(el('span', '', t('weekStartsOn')), sel);
    bar.append(nav, label);
    return bar;
  }

  function roleUses(id) {
    const st = S();
    let n = st.tpl.tasks.filter((tk) => tk.role === id).length;
    st.tpl.sections.forEach((s) =>
      s.items.forEach((it) => {
        if (it.role === id) n++;
        M.kids(it).forEach((c) => c.role === id && n++);
      })
    );
    return n;
  }

  // Edit mode, "Roles" tab.
  function roles(root) {
    root.replaceChildren();
    const c = card('', '👥', t('roles'));
    c.querySelector('.head').append(btn('link', t('addRole'), 'role-add', {}));
    const ul = el('ol', 'items');
    S().tpl.roles.forEach((r) => {
      const li = el('li', 'item rl');
      const del = btn('more danger', '✕', 'role-delete', { id: r.id });
      del.setAttribute('aria-label', t('delete'));
      li.append(btn('task-row', r.name, 'role-rename', { id: r.id }), el('span', 'c', t('roleUses', { n: roleUses(r.id) })), del);
      ul.append(li);
    });
    c.append(ul);
    root.append(c);
    FOH.staff.card(root);
  }

  FOH.tasksView = { today, mine, schedule, roles, todayStates, isMine, roleName, roleUses, fmtDay, taskName, myOpeningItems };
})(window.FOH = window.FOH || {});

// Dialogs for scheduled tasks: the task editor (repeat, time, responsible)
// and a small picker used for "I am …" and for replacing a deleted position.
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const SC = FOH.schedule;
  const { t } = FOH.i18n;
  const ICONS = ['🗓', '💧', '🥢', '🧹', '🧽', '🌿', '☕', '🧊', '🍸', '🔧', '🗑', '📦'];
  const LATE = [30, 60, 120, 180, 240, 1440];
  let draft = null;

  function options(select, list, value) {
    select.replaceChildren();
    list.forEach(([v, label]) => {
      const o = FOH.view.el('option', '', label);
      o.value = v;
      o.selected = String(v) === String(value);
      select.append(o);
    });
  }

  const roleOptions = () => [['', t('noRole')], ...S.tpl.roles.map((r) => [r.id, r.name])];

  // ---- picker: resolves { value, name } or null ----
  let pickResolve = null;
  function pick({ title, message, list, value, name }) {
    $('pickTitle').textContent = title;
    $('pickMsg').textContent = message || '';
    $('pickMsg').hidden = !message;
    options($('pickSelect'), list, value);
    $('pickNameRow').hidden = name === undefined;
    $('pickName').value = name || '';
    $('pickDialog').returnValue = '';
    $('pickDialog').showModal();
    return new Promise((resolve) => (pickResolve = resolve));
  }

  // ---- task editor ----
  function readDraft() {
    const every = Math.max(1, Math.min(60, Number($('tkEvery').textContent) || 3));
    const rules = {
      weekly: { type: 'weekly', days: draft.days.slice().sort() },
      interval: { type: 'interval', every },
      once: { type: 'once', date: $('tkOnce').value },
    };
    draft.rule = rules[draft.type];
    Object.assign(draft, {
      text: $('tkText').value.trim().slice(0, 300),
      textAr: $('tkTextAr').value.trim().slice(0, 300),
      icon: $('tkIcon').value,
      start: $('tkStart').value,
      time: FOH.store.TIME_RE.test($('tkTime').value) ? $('tkTime').value : '10:00',
      lateAfter: Number($('tkLate').value),
      role: $('tkRole').value,
      person: $('tkPerson').value.trim().slice(0, 60),
      carry: $('tkCarry').checked,
      paused: $('tkPaused').checked,
    });
  }

  function refresh() {
    $('tkText').setCustomValidity(''); // any change clears the last "missing …" message
    readDraft();
    const weekly = draft.type === 'weekly';
    document.querySelectorAll('#tkType [data-rt]').forEach((b) => b.classList.toggle('on', b.dataset.rt === draft.type));
    $('tkDays').hidden = !weekly;
    $('tkIntervalRow').hidden = draft.type !== 'interval';
    $('tkOnceRow').hidden = draft.type !== 'once';
    document.querySelectorAll('#tkDays button').forEach((b) => b.classList.toggle('on', draft.days.includes(Number(b.dataset.d))));
    const today = FOH.time.todayISO();
    const probe = { ...draft, id: draft.id || '_new', paused: false };
    const st = SC.stateOn(probe, S.log, today, today, FOH.time.nowHM());
    const dates = (st && st.status !== 'done' ? [st.occ < today ? today : st.occ] : []).concat(
      SC.upcoming(probe, S.log, today, today, 60, 4)
    );
    const shown = dates.slice(0, 4).map((d) => FOH.tasksView.fmtDay(d)).join(' · ');
    $('tkNext').textContent = shown ? t('next', { dates: shown + ' · ' + draft.time }) : t('noNext');
  }

  function open(id) {
    const tk = id ? S.tpl.tasks.find((x) => x.id === id) : null;
    const today = FOH.time.todayISO();
    draft = tk
      ? { ...FOH.store.clone(tk), type: tk.rule.type, days: tk.rule.days ? tk.rule.days.slice() : [SC.weekday(today)] }
      : { id: null, type: 'weekly', days: [SC.weekday(today)], rule: { every: 3 }, start: today, time: '10:00',
          lateAfter: 120, role: S.me.role || '', person: '', carry: true, paused: false, icon: '🗓', text: '', textAr: '' };
    $('taskTitle').textContent = tk ? t('editTask') : t('newTask');
    $('tkText').value = draft.text;
    $('tkTextAr').value = draft.textAr;
    options($('tkIcon'), ICONS.map((i) => [i, i]), draft.icon);
    $('tkEvery').textContent = String((tk && tk.rule.every) || 3);
    $('tkStart').value = draft.start || today;
    $('tkOnce').value = (tk && tk.rule.date) || today;
    $('tkTime').value = draft.time;
    $('tkReminder').replaceChildren(FOH.reminders.control(draft));
    options($('tkLate'), LATE.map((m) => [m, m === 1440 ? t('endOfDay') : m < 60 ? t('min30') : t('hours', { h: m / 60 })]), draft.lateAfter);
    options($('tkRole'), roleOptions(), draft.role);
    $('tkPerson').value = draft.person;
    $('tkCarry').checked = draft.carry;
    $('tkPaused').checked = draft.paused;
    $('tkDelete').hidden = !tk;
    $('tkText').setCustomValidity('');
    const days = $('tkDays');
    days.replaceChildren();
    const names = t('daysShort').split(',');
    const first = S.tpl.settings.weekStart; // buttons start on the chosen first day
    names.forEach((_, i) => {
      const d = (first + i) % 7;
      const name = names[d];
      const b = FOH.view.btn('', name, 'day', {});
      b.dataset.d = d;
      days.append(b);
    });
    refresh();
    $('taskSheet').returnValue = '';
    $('taskSheet').showModal();
  }

  function save() {
    readDraft();
    const fields = ['text', 'textAr', 'icon', 'rule', 'start', 'time', 'lateAfter', 'remindBefore', 'role', 'person', 'carry', 'paused'];
    const clean = Object.fromEntries(fields.map((k) => [k, draft[k]]));
    FOH.edit.checkpoint();
    const tk = draft.id && S.tpl.tasks.find((x) => x.id === draft.id);
    if (tk) Object.assign(tk, clean);
    else S.tpl.tasks.push({ id: FOH.store.uid(), ...clean });
    FOH.edit.commit(t('taskSaved'));
  }

  function remove() {
    const tk = S.tpl.tasks.find((x) => x.id === draft.id);
    if (!tk || !confirm(t('confirmDelTask', { name: FOH.tasksView.taskName(tk) }))) return;
    FOH.edit.checkpoint();
    S.tpl.tasks = S.tpl.tasks.filter((x) => x !== tk);
    $('taskSheet').close('deleted');
    FOH.edit.commit(t('taskDeleted'));
  }

  function init() {
    const sheet = $('taskSheet');
    $('tkType').addEventListener('click', (e) => {
      const b = e.target.closest('[data-rt]');
      if (b) draft.type = b.dataset.rt;
      refresh();
    });
    $('tkDays').addEventListener('click', (e) => {
      const b = e.target.closest('[data-d]');
      if (!b) return;
      const d = Number(b.dataset.d);
      draft.days = draft.days.includes(d) ? draft.days.filter((x) => x !== d) : [...draft.days, d];
      refresh();
    });
    const step = (n) => () => {
      $('tkEvery').textContent = String(Math.max(1, Math.min(60, Number($('tkEvery').textContent) + n)));
      refresh();
    };
    $('tkMinus').addEventListener('click', step(-1));
    $('tkPlus').addEventListener('click', step(1));
    $('taskForm').addEventListener('input', refresh);
    $('taskForm').addEventListener('change', refresh);
    $('tkDelete').addEventListener('click', remove);
    $('taskForm').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
    });
    $('taskForm').addEventListener('submit', (e) => {
      if (!e.submitter || e.submitter.value !== 'save') return;
      const noText = !$('tkText').value.trim() && !$('tkTextAr').value.trim();
      const noDay = draft.type === 'weekly' && !draft.days.length;
      const noDate = draft.type === 'once' && !$('tkOnce').value;
      if (!noText && !noDay && !noDate) return;
      e.preventDefault();
      $('tkText').setCustomValidity(noText ? t('needText') : noDay ? t('needDay') : t('needDate'));
      $('tkText').reportValidity();
    });
    sheet.addEventListener('click', (e) => e.target === sheet && sheet.close('cancel'));
    sheet.addEventListener('close', () => {
      if (sheet.returnValue === 'save') save();
      draft = null;
    });
    const pd = $('pickDialog');
    pd.addEventListener('click', (e) => e.target === pd && pd.close('cancel'));
    pd.addEventListener('close', () => {
      const ok = pd.returnValue === 'ok';
      if (pickResolve) pickResolve(ok ? { value: $('pickSelect').value, name: $('pickName').value.trim().slice(0, 60) } : null);
      pickResolve = null;
    });
  }

  FOH.taskSheet = { init, open, pick, roleOptions };
})(window.FOH = window.FOH || {});

// Actions for scheduled tasks and positions: tick/untick, "I am …",
// open the task editor, add / rename / delete positions.
(function (FOH) {
  'use strict';

  const S = FOH.state;
  const { t } = FOH.i18n;
  const TV = FOH.tasksView;

  function tick(taskId) {
    const st = TV.todayStates().find((s) => s.task.id === taskId);
    if (!st) return FOH.app.render();
    const by = S.me.name || TV.roleName(S.me.role) || '';
    FOH.schedule.toggle(S.log, st, S.date, FOH.time.nowHM(), by);
    FOH.store.saveLog(S.log);
    if (!st.doneEntry && navigator.vibrate) navigator.vibrate(8);
    FOH.app.render();
  }

  function addRole() {
    const name = prompt(t('newRoleName'));
    if (!name || !name.trim()) return;
    FOH.edit.checkpoint();
    S.tpl.roles.push({ id: FOH.store.uid(), name: name.trim().slice(0, 60) });
    FOH.edit.commit(t('roleAdded'));
  }

  function renameRole(id) {
    const role = S.tpl.roles.find((r) => r.id === id);
    const name = role && prompt(t('roleName'), role.name);
    if (!name || !name.trim()) return;
    FOH.edit.checkpoint();
    role.name = name.trim().slice(0, 60);
    FOH.edit.commit();
  }

  // Everything that points at a position: tasks and opening items.
  function eachUser(fn) {
    S.tpl.tasks.forEach(fn);
    S.tpl.sections.forEach((s) =>
      s.items.forEach((it) => {
        fn(it);
        FOH.model.kids(it).forEach(fn);
      })
    );
  }

  async function deleteRole(id) {
    const role = S.tpl.roles.find((r) => r.id === id);
    if (!role) return;
    const uses = TV.roleUses(id);
    let replacement = '';
    if (uses) {
      const list = FOH.taskSheet.roleOptions().filter(([v]) => v !== id);
      const res = await FOH.taskSheet.pick({
        title: t('delete') + ': ' + role.name,
        message: t('roleInUse', { name: role.name, n: uses }),
        list,
        value: list[1] ? list[1][0] : '',
      });
      if (!res) return;
      replacement = res.value;
    } else if (!confirm(t('delete') + ': ' + role.name + '?')) return;
    FOH.edit.checkpoint();
    eachUser((x) => {
      if (x.role === id) x.role = replacement; // '' = nobody in particular
    });
    S.tpl.roles = S.tpl.roles.filter((r) => r.id !== id);
    if (S.me.role === id) {
      S.me.role = replacement;
      FOH.store.saveMe(S.me);
    }
    FOH.edit.commit(t('roleDeleted'));
  }

  function onClick(ev) {
    const b = ev.target.closest('button[data-act]');
    if (!b) return;
    const { act, id } = b.dataset;
    if (act === 'iam' && !S.previewEmployee) return FOH.staff.chooseMe();
    if (act === 'count-open') return FOH.invCount.open(b.dataset.cat, b.dataset.mode, b.dataset.key);
    if (act.startsWith('week-')) {
      S.weekOffset = act === 'week-today' ? 0 : S.weekOffset + (act === 'week-next' ? 1 : -1);
      return FOH.app.render();
    }
    if (act === 'task-open') return FOH.taskSheet.open(id);
    if (act === 'task-add') return FOH.taskSheet.open(null);
    if (act === 'role-add') return addRole();
    if (act === 'role-rename') return renameRole(id);
    if (act === 'role-delete') return deleteRole(id);
  }

  function onChange(ev) {
    const cb = ev.target;
    if (cb.type === 'checkbox' && cb.dataset.task) tick(cb.dataset.task);
    if (cb.id === 'weekStartSel') {
      FOH.edit.checkpoint();
      S.tpl.settings.weekStart = Number(cb.value);
      FOH.edit.commit();
    }
  }

  function init(containers) {
    containers.forEach((c) => {
      c.addEventListener('click', onClick);
      c.addEventListener('change', onChange);
    });
  }

  FOH.taskActions = { init };
})(window.FOH = window.FOH || {});
