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
    if (FOH.modalPicker && FOH.modalPicker.enhanceSelect) {
      FOH.modalPicker.enhanceSelect(select, {
        title: (FOH.i18n && FOH.i18n.t) ? FOH.i18n.t('reminderLead') : 'وقت التنبيه المسبق',
        icon: '⏰',
      });
    }
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
