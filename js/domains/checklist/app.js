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
