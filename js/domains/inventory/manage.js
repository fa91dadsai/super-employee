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
  const isAr = () => FOH.i18n && FOH.i18n.lang === 'ar';

  const can = (perm) => !S.previewEmployee && !!S.me.role && S.inv.settings[perm].includes(S.me.role);
  const canSee = () => can('results') || can('manage');
  const TABS = [['week', 'manage'], ['results', 'see'], ['stock', 'see'], ['items', 'manage'], ['settings', 'manage']];
  const TAB_ICONS = { week: '🗓', results: '📊', stock: '📦', items: '🗂', settings: '⚙' };
  const tabs = () => TABS.filter(([, p]) => (p === 'see' ? canSee() : can(p)));
  const visible = () => tabs().length > 0;
  const weekKey = () => IS.countDate(S.inv, S.tpl, FOH.schedule.addDays(S.date, 7 * S.invWeekOffset));
  const staffName = (id) => (FOH.staff.byId(id) || {}).name || '—';

  function card(icon, title, right) {
    const c = el('section', 'card inv-card');
    const h = el('div', 'head inv-head');
    const n = el('span', 'nm');
    n.append(el('span', 'ico', icon), el('span', 'nm-t', title));
    h.append(n);
    if (right !== undefined && right !== null && right !== '') {
      h.append(typeof right === 'string' ? el('span', 'ct', right) : right);
    }
    c.append(h);
    return c;
  }

  function weekNav(key) {
    const bar = el('div', 'week-bar inv-week-bar');
    const nav = el('span', 'week-nav');
    nav.append(btn('icon-btn', '‹', 'inv-prev', {}), btn('link inv-today-btn', t('backToday'), 'inv-today', {}), btn('icon-btn', '›', 'inv-next', {}));
    const dlPill = el('span', 'inv-deadline-pill', '⏰ ' + t('until', { time: S.inv.settings.deadline }));
    bar.append(nav, dlPill);
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
    if (entry && entry.submittedAt) return el('span', 'stamp', '✓ ' + t('sentAt', { time: entry.submittedAt.slice(11) }));
    return el('span', 'tag', entry && Object.keys(entry.lines).length ? '⏳ ' + t('statusProgress') : t('statusNot'));
  }

  function renderHeroBar(root) {
    const ar = isAr();
    const hero = el('div', 'inv-hero-bar');
    const left = el('div', 'inv-hero-copy');
    const totalCats = S.inv.categories.length;
    const totalItems = S.inv.categories.reduce((acc, c) => acc + c.items.length, 0);
    const pendingBrk = (S.inv.breakage || []).filter((b) => !b.approved).length;
    const titleRow = el('div', 'inv-hero-title');
    titleRow.append(
      el('span', 'inv-hero-ico', '📦'),
      el('div', 'inv-hero-txt', '')
    );
    titleRow.lastChild.append(
      el('strong', '', ar ? 'إدارة الجرد والمعدات' : 'Inventory & Equipment'),
      el('small', '', (ar ? `${totalCats} فئات · ${totalItems} صنف` : `${totalCats} categories · ${totalItems} items`) + (pendingBrk ? (ar ? ` · ⚠️ ${pendingBrk}` : ` · ⚠️ ${pendingBrk}`) : ''))
    );
    left.append(titleRow);
    const reportBtn = btn('btn primary inv-report-cta', ar ? '🔧 + بلاغ كسر' : '🔧 + Breakage', 'break-open', {});
    hero.append(left, reportBtn);
    root.append(hero);
  }

  function buildAssignmentRow(cat, w, key, people) {
    const a = w.assign[cat.id] || {};
    const row = el('div', 'asg inv-asg-row');
    const left = el('div', 'inv-asg-left');
    const ico = el('span', 'inv-asg-ico', cat.icon || '📦');
    const info = el('span', 'cat');
    const last = lastCounter(key, cat.id);
    info.append(
      el('b', '', nm(cat)),
      el('span', '', t('itemsN', { n: IS.leaves(cat).length }) + ' · ' + (last ? t('lastBy', { name: last }) : t('nobody')))
    );
    const ago = a.staffId ? R.weeksSince(S.inv, key, cat.id, a.staffId) : Infinity;
    const hasWarn = ago <= S.inv.settings.noRepeat;
    if (hasWarn || w.published) {
      const meta = el('div', 'inv-asg-meta');
      if (hasWarn) meta.append(el('span', 'warn', '⚠️ ' + t('sameRecent', { n: ago })));
      if (w.published) meta.append(status(w.counts[cat.id]));
      info.append(meta);
    }
    left.append(ico, info);

    const controls = el('div', 'inv-asg-controls');
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
    pin.title = isAr() ? 'تثبيت الموظف' : 'Pin staff';
    controls.append(sel, pin);
    row.append(left, controls);
    return row;
  }

  function weekView(root) {
    const ar = isAr();
    const key = weekKey();
    const w = IS.week(S.inv, key);
    const people = R.participants(S.tpl);
    if (!Object.keys(w.assign).length && people.length) {
      R.distribute(S.inv, S.tpl, key);
      save();
    }
    const pubBadge = el(
      'span',
      'inv-status-pill ' + (w.published ? 'is-pub' : 'is-draft'),
      w.published ? (ar ? '🟢 منشور' : '🟢 Published') : (ar ? '⚪ مسودة' : '⚪ Draft')
    );
    const c = card('🗓', t('countDayLbl', { day: FOH.tasksView.fmtDay(key) }), pubBadge);
    c.classList.add('sched');
    c.append(weekNav(key));
    if (!people.length) c.append(el('p', 'empty', t('noParticipants')));
    const listWrap = el('div', 'inv-asg-list');
    S.inv.categories.forEach((cat) => listWrap.append(buildAssignmentRow(cat, w, key, people)));
    c.append(listWrap);
    const bar = el('div', 'bar2 inv-action-bar');
    bar.append(
      btn('btn inv-btn-sec', '🔄 ' + t('redistribute'), 'inv-redistribute', {}),
      btn('btn primary inv-btn-pri', (w.published ? '🔒 ' + t('unpublish') : '🚀 ' + t('publish')), 'inv-publish', {})
    );
    c.append(bar);
    root.append(c, el('p', 'note inv-foot-note', w.published ? t('published') : t('pinNote')));
  }

  function render(root) {
    root.replaceChildren();
    const allowed = tabs().map(([k]) => k);
    if (!allowed.length) return root.append(el('p', 'empty', t('noAccess')));
    if (!allowed.includes(S.invTab)) S.invTab = allowed[0];

    renderHeroBar(root);

    const sub = el('nav', 'subtabs inv-subtabs');
    const label = { week: 'invWeek', results: 'invResults', stock: 'invStock', items: 'invItems', settings: 'invSettings' };
    const pendingBrk = (S.inv.breakage || []).filter((b) => !b.approved).length;
    const repairCnt = (S.inv.repairs || []).reduce((s, r) => s + (r.qty || 0), 0);

    allowed.forEach((k) => {
      const b = btn(k === S.invTab ? 'on' : '', '', 'inv-tab', { tab: k });
      b.append(el('span', 'subtab-ico', TAB_ICONS[k] || ''), el('span', 'subtab-lbl', t(label[k])));
      if (k === 'results' && pendingBrk > 0) b.append(el('span', 'subtab-badge warn', String(pendingBrk)));
      if (k === 'stock' && repairCnt > 0) b.append(el('span', 'subtab-badge', String(repairCnt)));
      sub.append(b);
    });
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
    if (act === 'break-open') return FOH.invBreak && FOH.invBreak.open && FOH.invBreak.open();
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
      w.assign[sel.dataset.cat] = { staffId: sel.value, pinned: true };
      save();
      return FOH.app.render();
    }
    FOH.invItems.onChange(e);
  }

  FOH.invManage = { render, visible, can, onClick, onChange, card, weekNav, weekKey, staffName };
})(window.FOH = window.FOH || {});
