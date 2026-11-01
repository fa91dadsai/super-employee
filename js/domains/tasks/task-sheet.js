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
