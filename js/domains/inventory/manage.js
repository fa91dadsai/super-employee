// Inventory tab for managers: the sub-tab shell and "This week" (rotation,
// pins, publish). Results, Stock, Items and Settings live in their own files.
// Who sees what is set by position in Inventory → Settings.
(function (FOH) {
  'use strict';

  const S = FOH.state;
  const IS = FOH.invStore;
  const R = FOH.rotate;
  const { t, pick } = FOH.i18n;
  const { el, btn } = FOH.view;
  const nm = (x) => pick(x.name, x.nameAr);
  const save = () => IS.save(S.inv);

  const can = (perm) => !S.previewEmployee && !!S.me.role && S.inv.settings[perm].includes(S.me.role);
  const canSee = () => can('results') || can('manage');
  const TABS = [['week', 'manage'], ['results', 'see'], ['stock', 'see'], ['items', 'manage'], ['settings', 'manage']];
  const tabs = () => TABS.filter(([, p]) => (p === 'see' ? canSee() : can(p)));
  const visible = () => tabs().length > 0;
  const weekKey = () => IS.countDate(S.inv, S.tpl, FOH.schedule.addDays(S.date, 7 * S.invWeekOffset));
  const staffName = (id) => (FOH.staff.byId(id) || {}).name || '—';

  function card(icon, title, right) {
    const c = el('section', 'card');
    const h = el('div', 'head');
    const n = el('span', 'nm');
    n.append(el('span', 'ico', icon), el('span', 'nm-t', title));
    h.append(n);
    if (right) h.append(typeof right === 'string' ? el('span', 'ct', right) : right);
    c.append(h);
    return c;
  }

  function weekNav(key) {
    const bar = el('div', 'week-bar');
    const nav = el('span', 'week-nav');
    nav.append(btn('icon-btn', '‹', 'inv-prev', {}), btn('link', t('backToday'), 'inv-today', {}), btn('icon-btn', '›', 'inv-next', {}));
    bar.append(nav, el('span', 'ct', t('until', { time: S.inv.settings.deadline })));
    return bar;
  }

  // Who counted this category most recently before `key`.
  function lastCounter(key, catId) {
    const prev = Object.keys(S.inv.weeks).filter((k) => k < key).sort().reverse();
    for (const k of prev) {
      const w = S.inv.weeks[k];
      const who = (w.counts[catId] && w.counts[catId].staffId) || (w.assign[catId] && w.assign[catId].staffId);
      if (who) return staffName(who);
    }
    return '';
  }

  function status(entry) {
    if (entry && entry.submittedAt) return el('span', 'stamp', t('sentAt', { time: entry.submittedAt.slice(11) }));
    return el('span', 'tag', entry && Object.keys(entry.lines).length ? t('statusProgress') : t('statusNot'));
  }

  function weekView(root) {
    const key = weekKey();
    const w = IS.week(S.inv, key);
    const people = R.participants(S.tpl);
    if (!Object.keys(w.assign).length && people.length) {
      R.distribute(S.inv, S.tpl, key);
      save();
    }
    const c = card('🗓', t('countDayLbl', { day: FOH.tasksView.fmtDay(key) }));
    c.classList.add('sched');
    c.append(weekNav(key));
    if (!people.length) c.append(el('p', 'empty', t('noParticipants')));
    S.inv.categories.forEach((cat) => {
      const a = w.assign[cat.id] || {};
      const row = el('div', 'asg');
      const info = el('span', 'cat');
      const last = lastCounter(key, cat.id);
      info.append(el('b', '', cat.icon + ' ' + nm(cat)), el('span', '', t('itemsN', { n: IS.leaves(cat).length }) + ' · ' + (last ? t('lastBy', { name: last }) : t('nobody'))));
      const sel = el('select', 'in who');
      sel.dataset.cat = cat.id;
      [['', '—'], ...people.map((p) => [p.id, p.name])].forEach(([v, label]) => {
        const o = el('option', '', label);
        o.value = v;
        o.selected = v === (a.staffId || '');
        sel.append(o);
      });
      const pin = btn('pin' + (a.pinned ? ' on' : ''), '📌', 'inv-pin', { cat: cat.id });
      pin.setAttribute('aria-pressed', String(!!a.pinned));
      row.append(info, sel, pin);
      const ago = a.staffId ? R.weeksSince(S.inv, key, cat.id, a.staffId) : Infinity;
      if (ago <= S.inv.settings.noRepeat) row.append(el('span', 'warn', t('sameRecent', { n: ago })));
      if (w.published) row.append(status(w.counts[cat.id]));
      c.append(row);
    });
    const bar = el('div', 'bar2');
    bar.append(btn('btn', t('redistribute'), 'inv-redistribute', {}), btn('btn primary', w.published ? t('unpublish') : t('publish'), 'inv-publish', {}));
    c.append(bar);
    root.append(c, el('p', 'note', w.published ? t('published') : t('pinNote')));
  }

  function render(root) {
    root.replaceChildren();
    const allowed = tabs().map(([k]) => k);
    if (!allowed.length) return root.append(el('p', 'empty', t('noAccess')));
    if (!allowed.includes(S.invTab)) S.invTab = allowed[0];
    const sub = el('nav', 'subtabs');
    const label = { week: 'invWeek', results: 'invResults', stock: 'invStock', items: 'invItems', settings: 'invSettings' };
    allowed.forEach((k) => sub.append(btn(k === S.invTab ? 'on' : '', t(label[k]), 'inv-tab', { tab: k })));
    root.append(sub);
    if (S.invTab === 'week') weekView(root);
    if (S.invTab === 'results') FOH.invResults.render(root);
    if (S.invTab === 'stock') FOH.invStock.render(root);
    if (S.invTab === 'items') FOH.invItems.items(root);
    if (S.invTab === 'settings') FOH.invItems.settings(root);
  }

  function onClick(e) {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const { act, cat } = b.dataset;
    const key = weekKey();
    const w = IS.week(S.inv, key);
    if (act === 'inv-tab') S.invTab = b.dataset.tab;
    else if (act === 'inv-prev' || act === 'inv-next') S.invWeekOffset += act === 'inv-next' ? 1 : -1;
    else if (act === 'inv-today') S.invWeekOffset = 0;
    else if (act === 'inv-pin') w.assign[cat] = { ...(w.assign[cat] || {}), pinned: !(w.assign[cat] || {}).pinned };
    else if (act === 'inv-redistribute') R.distribute(S.inv, S.tpl, key);
    else if (act === 'inv-publish') w.published = !w.published;
    else if (FOH.invResults.onClick(act, b, key)) return;
    else if (FOH.invStock.onClick(act, b)) return;
    else return FOH.invItems.onClick(e);
    save();
    FOH.app.render();
  }

  function onChange(e) {
    const sel = e.target;
    if (sel.classList.contains('who') && sel.dataset.cat) {
      const w = IS.week(S.inv, weekKey());
      w.assign[sel.dataset.cat] = { staffId: sel.value, pinned: true }; // a manual choice is kept
      save();
      return FOH.app.render();
    }
    FOH.invItems.onChange(e);
  }

  FOH.invManage = { render, visible, can, onClick, onChange, card, weekNav, weekKey, staffName };
})(window.FOH = window.FOH || {});
