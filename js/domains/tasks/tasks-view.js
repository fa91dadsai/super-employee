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
    const me = S().me;
    if (!me.role || x.role !== me.role) return false;
    return !x.person || !me.name || x.person.toLowerCase() === me.name.toLowerCase();
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
    const states = todayStates().filter((st) => !S().previewEmployee || isMine(st.task));
    if (!states.length) return;
    const bar = el('div', 'me-row');
    bar.append(el('span', '', fmtDay(S().date)), iAmButton());
    const done = states.filter((s) => s.status === 'done').length;
    const c = card('sched', '🗓', t('todayTasks'), done + ' / ' + states.length);
    const list = el('ol', 'items');
    states.forEach((st) => list.append(stateRow(st, true)));
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
    if (!next.length) return;
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
