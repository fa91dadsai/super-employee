// foh-opening/js/core/state.js
// Local persistence: the editable template and one "run" (ticks + names) per date.
// Seed catalogs (DEFAULT_SECTIONS, DEFAULT_ROLES, etc.) are loaded from seed-data.js.
//
// Template v2: sections[] -> items[] -> children[] (sub-items, one level only).
// A v1 list (no sub-items) is upgraded on load: see migrateV1 / fillDefaults.
(function (FOH) {
  'use strict';

  const TPL_KEY = 'foh-opening.template.v1'; // key kept so saved lists are found
  const RUN_PREFIX = 'foh-opening.run.v1.';
  const VERSION = 3; // 3 = roles + scheduled tasks
  const LOG_KEY = 'foh-opening.tasklog.v1';
  const ME_KEY = 'foh-opening.me.v1';
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const MAX_TEXT = 300;
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const DEFAULT_ICON = '📋';

  function uid() {
    return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      /* Corrupt JSON or storage unavailable; return null */
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      /* Storage quota exceeded or disabled; return false */
      return false;
    }
  }

  const cleanReminder = (value) => value === null ? null : Number.isInteger(value) && value >= 0 && value <= 1440 ? value : 30;

  function cleanText(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max || MAX_TEXT) : '';
  }

  const hasText = (it) => it && (cleanText(it.text) || cleanText(it.textAr));
  const list = (value) => (Array.isArray(value) ? value : []);

  // Accepts any parsed JSON and returns a safe template, or null if unusable.
  function normalize(input) {
    if (!input || !Array.isArray(input.sections)) return null;
    const seen = new Set();
    const freshId = (id) => {
      const ok = typeof id === 'string' && /^[\w-]{1,40}$/.test(id) && !seen.has(id);
      const next = ok ? id : uid();
      seen.add(next);
      return next;
    };
    const roles = list(input.roles)
      .map((r) => (typeof r === 'string' ? { name: r } : r))
      .filter((r) => r && cleanText(r.name, 60))
      .map((r) => ({ id: freshId(r.id), name: cleanText(r.name, 60) }));
    const roleIds = new Set(roles.map((r) => r.id));
    const item = (it, depth) => {
      const out = {
        id: freshId(it.id),
        text: cleanText(it.text),
        textAr: cleanText(it.textAr),
        due: TIME_RE.test(it.due) ? it.due : '',
        remindBefore: cleanReminder(it.remindBefore),
      };
      if (typeof it.role === 'string' && roleIds.has(it.role)) out.role = it.role;
      if (typeof it.assignedRoleKey === 'string') out.assignedRoleKey = cleanText(it.assignedRoleKey, 50);
      if (typeof it.assignedRoleLabel === 'string') out.assignedRoleLabel = cleanText(it.assignedRoleLabel, 100);
      if (typeof it.assignedUsername === 'string') out.assignedUsername = cleanText(it.assignedUsername, 50);
      if (typeof it.isRecurring === 'boolean') out.isRecurring = it.isRecurring;
      if (it.scheduleDate) out.scheduleDate = it.scheduleDate;
      if (it.recurrence && typeof it.recurrence === 'object') out.recurrence = it.recurrence;
      if (depth === 0) out.children = list(it.children).filter(hasText).map((c) => item(c, 1));
      return out;
    };
    const sections = input.sections
      .filter((s) => s && typeof s === 'object')
      .map((s) => {
        const title = cleanText(s.title);
        const titleAr = cleanText(s.titleAr);
        const secOut = {
          id: freshId(s.id),
          title: title || (titleAr ? '' : 'Untitled section'),
          titleAr,
          icon: cleanText(s.icon, 8) || DEFAULT_ICON,
          items: list(s.items).filter(hasText).map((it) => item(it, 0)),
        };
        if (typeof s.dept === 'string') secOut.dept = cleanText(s.dept, 40);
        if (typeof s.assignedRoleKey === 'string') secOut.assignedRoleKey = cleanText(s.assignedRoleKey, 50);
        if (typeof s.assignedRoleLabel === 'string') secOut.assignedRoleLabel = cleanText(s.assignedRoleLabel, 100);
        if (typeof s.assignedUsername === 'string') secOut.assignedUsername = cleanText(s.assignedUsername, 50);
        return secOut;
      });
    const tasks = list(input.tasks).filter(hasText).map((tk) => task(tk, freshId, roleIds));
    // Staff: people by name, with a position; inv = takes part in inventory counts.
    const staff = list(input.staff)
      .filter((p) => p && cleanText(p.name, 60))
      .map((p) => ({
        id: freshId(p.id),
        name: cleanText(p.name, 60),
        role: typeof p.role === 'string' && roleIds.has(p.role) ? p.role : '',
        inv: p.inv !== false,
        active: p.active !== false,
        canEditChecklist: !!p.canEditChecklist,
        healthCertNo: cleanText(p.healthCertNo, 60),
        healthCertExpiry: DATE_RE.test(p.healthCertExpiry) ? p.healthCertExpiry : '',
        healthCertRemindDays: Number.isInteger(p.healthCertRemindDays) ? p.healthCertRemindDays : 30,
      }));
    const ws = input.settings && input.settings.weekStart;
    const settings = { weekStart: Number.isInteger(ws) && ws >= 0 && ws <= 6 ? ws : 0 };
    return { version: VERSION, sections, roles, tasks, settings, staff };
  }

  // A scheduled task: repeats by days of the week or every N days.
  function task(tk, freshId, roleIds) {
    const r = tk.rule || {};
    const days = [...new Set(list(r.days).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    const every = Number.isInteger(r.every) && r.every >= 1 && r.every <= 60 ? r.every : 3;
    let rule = { type: 'weekly', days: days.length ? days : [0] };
    if (r.type === 'interval') rule = { type: 'interval', every };
    if (r.type === 'once') rule = { type: 'once', date: DATE_RE.test(r.date) ? r.date : '' };
    const late = Number.isInteger(tk.lateAfter) && tk.lateAfter >= 0 && tk.lateAfter <= 1440 ? tk.lateAfter : 120;
    return {
      id: freshId(tk.id),
      text: cleanText(tk.text),
      textAr: cleanText(tk.textAr),
      icon: cleanText(tk.icon, 8) || '🗓',
      rule,
      start: DATE_RE.test(tk.start) ? tk.start : '',
      time: TIME_RE.test(tk.time) ? tk.time : '10:00',
      lateAfter: late,
      remindBefore: cleanReminder(tk.remindBefore),
      role: typeof tk.role === 'string' && roleIds.has(tk.role) ? tk.role : '',
      person: cleanText(tk.person, 60),
      carry: tk.carry !== false,
      paused: tk.paused === true,
    };
  }

  // Default positions and example tasks (tasks name their role by name).
  function defaultRolesAndTasks() {
    const roles = FOH.DEFAULT_ROLES.map((name) => ({ id: uid(), name }));
    const byName = new Map(roles.map((r) => [r.name, r.id]));
    const tasks = FOH.DEFAULT_TASKS.map((tk) => ({
      text: tk.text,
      textAr: tk.ar,
      icon: tk.icon,
      rule: tk.rule,
      time: tk.time,
      role: byName.get(tk.role) || '',
    }));
    const staff = FOH.DEFAULT_STAFF.map((p) => ({ ...p, role: byName.get(p.role) || '' }));
    return { roles, tasks, staff };
  }

  // Example staff for lists saved before staff existed (matched by position name).
  function defaultStaff(roles) {
    const byName = new Map(roles.map((r) => [r.name, r.id]));
    return FOH.DEFAULT_STAFF.map((p) => ({ ...p, role: byName.get(p.role) || '' }));
  }

  function fromDefaults() {
    const conv = (it) => ({
      text: it.text,
      textAr: it.ar,
      due: it.due,
      children: list(it.children).map(conv),
    });
    return normalize({
      ...defaultRolesAndTasks(),
      sections: FOH.DEFAULT_SECTIONS.map((s) => ({
        id: s.id,
        title: s.title,
        titleAr: s.titleAr || s.ar || '',
        icon: s.icon,
        dept: s.dept || '',
        assignedRoleKey: s.assignedRoleKey || '',
        assignedRoleLabel: s.assignedRoleLabel || '',
        assignedUsername: s.assignedUsername || '',
        items: s.items.map(conv),
      })),
    });
  }

  const asList = (v) => (v === undefined ? [] : [].concat(v));

  // Index of the original sheet: English text (current or earlier) -> definition.
  function defaultsIndex() {
    const items = new Map();
    const sections = new Map();
    const add = (def) => {
      items.set(def.text, def);
      asList(def.was).forEach((w) => items.set(w, def));
      list(def.children).forEach(add);
    };
    FOH.DEFAULT_SECTIONS.forEach((s) => {
      sections.set(s.title, s);
      s.items.forEach(add);
    });
    return { items, sections };
  }

  // v1 had no sub-items: move the original sheet's sub-items (by English text)
  // under their parent. Item ids are kept, so the day's ticks are not lost.
  function migrateV1(tpl) {
    const idx = defaultsIndex();
    tpl.sections.forEach((section) => {
      section.items.slice().forEach((parent) => {
        const def = idx.items.get(parent.text);
        if (!def || !list(def.children).length || parent.children.length) return;
        def.children.forEach((childDef) => {
          const at = section.items.findIndex(
            (it) => it !== parent && !it.children.length && it.text === childDef.text
          );
          if (at === -1) return;
          const [child] = section.items.splice(at, 1);
          delete child.children;
          parent.children.push(child);
        });
      });
    });
    return tpl;
  }

  // Fill missing Arabic/icons from the original sheet and apply wording fixes
  // ("was", "wasAr"). Text the user edited never matches, so it is left alone.
  function fillDefaults(tpl) {
    const idx = defaultsIndex();
    const fix = (it) => {
      const def = idx.items.get(it.text);
      if (def) {
        if (asList(def.was).includes(it.text)) it.text = def.text;
        if (!it.textAr || asList(def.wasAr).includes(it.textAr)) it.textAr = def.ar;
      }
      list(it.children).forEach(fix);
    };
    tpl.sections.forEach((s) => {
      const def = idx.sections.get(s.title);
      if (def && !s.titleAr) s.titleAr = def.titleAr || def.ar || '';
      if (def && !s.id && def.id) s.id = def.id;
      if (def && !s.dept && def.dept) s.dept = def.dept;
      if (def && !s.assignedRoleKey && def.assignedRoleKey) s.assignedRoleKey = def.assignedRoleKey;
      if (def && s.icon === DEFAULT_ICON) s.icon = def.icon;
      s.items.forEach(fix);
    });
    return tpl;
  }

  // Raw JSON (saved or imported, any version) -> current template, or null.
  function upgrade(raw) {
    if (raw && !Array.isArray(raw.roles)) raw = { ...raw, ...defaultRolesAndTasks() }; // before v3
    if (raw && Array.isArray(raw.roles) && !Array.isArray(raw.staff)) {
      raw = { ...raw, staff: defaultStaff(raw.roles.filter((r) => r && r.id)) };
    }
    const tpl = normalize(raw);
    if (!tpl) return null;
    if (!(raw.version >= VERSION)) {
      fillDefaults(tpl); // fixes old wording first so texts match the sheet
      migrateV1(tpl);
    }
    return fillDefaults(tpl);
  }

  function emptyRun() {
    return { supervisor: '', captain: '', assistant: '', checked: {} };
  }

  FOH.store = {
    uid,
    clone,
    upgrade,
    TIME_RE,
    cleanReminder,
    DEFAULT_ICON,
    loadTemplate() {
      const raw = read(TPL_KEY);
      const tpl = upgrade(raw);
      if (!tpl) {
        // Save the default list at once: positions, staff and tasks need stable ids.
        const fresh = fromDefaults();
        write(TPL_KEY, fresh);
        return fresh;
      }
      if (raw.version !== VERSION) write(TPL_KEY, tpl); // keep the upgraded form
      return tpl;
    },
    saveTemplate(tpl) {
      if (FOH.sheetState && FOH.sheetState.getSheetType && FOH.sheetState.getSheetType() !== 'opening') {
        const raw = read(TPL_KEY);
        const openingBackup = (FOH.sheetState.getOpeningBackup && FOH.sheetState.getOpeningBackup()) || (raw && raw.sections) || tpl.sections;
        const safeTpl = { ...tpl, sections: openingBackup };
        return write(TPL_KEY, safeTpl);
      }
      return write(TPL_KEY, tpl);
    },
    defaultTemplate: fromDefaults,
    loadRun(date) {
      const run = read(RUN_PREFIX + date);
      if (!run || typeof run !== 'object') return emptyRun();
      return {
        supervisor: cleanText(run.supervisor),
        captain: cleanText(run.captain),
        assistant: cleanText(run.assistant),
        checked: run.checked && typeof run.checked === 'object' ? run.checked : {},
      };
    },
    saveRun(date, run) {
      return write(RUN_PREFIX + date, run);
    },
    // Scheduled-task history: { taskId: [{ occ, done, at, by }] }, newest last.
    loadLog() {
      const log = read(LOG_KEY);
      return log && typeof log === 'object' && !Array.isArray(log) ? log : {};
    },
    saveLog(log) {
      Object.keys(log).forEach((k) => (log[k] = list(log[k]).slice(-40)));
      return write(LOG_KEY, log);
    },
    // Who uses this device: { role: roleId, name }.
    loadMe() {
      const me = read(ME_KEY) || {};
      return {
        staffId: typeof me.staffId === 'string' ? me.staffId : '',
        role: typeof me.role === 'string' ? me.role : '',
        name: cleanText(me.name, 60),
      };
    },
    saveMe(me) {
      return write(ME_KEY, me);
    },
  };
})(window.FOH = window.FOH || {});
