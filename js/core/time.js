// Scheduled tasks: when each one is due, and its state on a given day.
// Pure functions over (task, log, date); dates are "YYYY-MM-DD" strings.
//
// weekly   : due on the chosen weekdays.
// interval : due every N days counted from the last time it was DONE (or from
//            its start date if never done), so a late soy change is never
//            followed by an early one.
// once     : a single date.
// carry    : a missed occurrence stays on the list, marked late, until done.
(function (FOH) {
  'use strict';

  const DAY = 86400000;
  const toDate = (iso) => new Date(iso + 'T00:00:00Z');
  const toIso = (d) => d.toISOString().slice(0, 10);
  const addDays = (iso, n) => toIso(new Date(toDate(iso).getTime() + n * DAY));
  const diffDays = (a, b) => Math.round((toDate(a) - toDate(b)) / DAY);
  const weekday = (iso) => toDate(iso).getUTCDay();
  const minutes = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

  const entries = (log, task) => (Array.isArray(log[task.id]) ? log[task.id] : []);
  const lastDone = (log, task) => entries(log, task).reduce((m, e) => (!m || e.done > m.done ? e : m), null);

  // Latest weekly occurrence on or before `date` (looks back one week).
  function lastWeekly(task, date) {
    for (let i = 0; i < 7; i++) {
      const d = addDays(date, -i);
      if (task.rule.days.includes(weekday(d))) return d;
    }
    return null;
  }

  // Next date the interval task is due (may be in the past = overdue).
  function intervalDue(task, log, today) {
    const last = lastDone(log, task);
    if (last) return addDays(last.done, task.rule.every);
    return task.start || today;
  }

  // State of a task on `date`: null (nothing to show) or
  // { task, occ, late, doneEntry, status } where status is
  // 'done' | 'upcoming' | 'due' | 'late'.
  function stateOn(task, log, date, today, nowHM) {
    if (task.paused) return null;
    const doneToday = entries(log, task).find((e) => e.done === date);
    if (doneToday) return { task, occ: doneToday.occ, doneEntry: doneToday, status: 'done' };
    let occ = null;
    if (task.rule.type !== 'interval') {
      occ = task.rule.type === 'once' ? task.rule.date : lastWeekly(task, date);
      if (!occ || occ > date) return null;
      const handled = entries(log, task).some((e) => e.occ === occ);
      if (handled || (occ !== date && !task.carry)) return null;
    } else {
      occ = intervalDue(task, log, today);
      if (occ > date || (occ < date && !task.carry)) return null;
    }
    // Looking ahead: an occurrence that has not happened yet cannot be "late".
    if (occ < date && date > today && occ >= today) return null;
    let status = 'due';
    if (occ < date) status = 'late';
    else if (date === today) {
      const now = minutes(nowHM);
      if (now < minutes(task.time)) status = 'upcoming';
      else if (now > minutes(task.time) + task.lateAfter) status = 'late';
    } else if (date < today) status = 'late';
    return { task, occ, doneEntry: null, status };
  }

  // Projected due dates after `date` (up to `count`, within `days` days).
  function upcoming(task, log, date, today, days, count) {
    if (task.paused) return [];
    const out = [];
    const end = addDays(date, days);
    if (task.rule.type === 'once') {
      const d = task.rule.date;
      const handled = entries(log, task).some((e) => e.occ === d);
      return d && d > date && d <= end && !handled ? [d] : [];
    }
    if (task.rule.type === 'weekly') {
      for (let d = addDays(date, 1); d <= end && out.length < count; d = addDays(d, 1)) {
        if (task.rule.days.includes(weekday(d))) out.push(d);
      }
      return out;
    }
    // Interval: if due on/before `date`, assume it gets done on `date`.
    const due = intervalDue(task, log, today);
    let d = due > date ? due : addDays(date, task.rule.every);
    for (; d <= end && out.length < count; d = addDays(d, task.rule.every)) out.push(d);
    return out;
  }

  // Week grid: for each of 7 days from `weekStart`, the tasks on that day.
  // Past days show what was done (or missed); today shows live state;
  // later days show projected dates.
  function week(tasks, log, weekStart, today, nowHM) {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const cells = [];
      tasks.forEach((task) => {
        if (date === today) {
          const st = stateOn(task, log, date, today, nowHM);
          if (st) cells.push({ task, status: st.status });
        } else if (date < today) {
          const done = entries(log, task).find((e) => e.done === date);
          if (done) cells.push({ task, status: 'done' });
          else if (!task.paused && scheduledOn(task, date)) {
            const handled = entries(log, task).some((e) => e.occ === date);
            if (!handled) cells.push({ task, status: 'missed' });
          }
        } else if (upcoming(task, log, today, today, diffDays(date, today), 99).includes(date)) {
          cells.push({ task, status: 'planned' });
        }
      });
      return { date, cells };
    });
  }

  // Fixed-date occurrence on `date` (weekly or one-time; not interval).
  const scheduledOn = (task, date) =>
    task.rule.type === 'once' ? task.rule.date === date : task.rule.type === 'weekly' && task.rule.days.includes(weekday(date));

  // First day of the week containing `iso`; `first` = 0 Sunday … 6 Saturday.
  const weekStart = (iso, first) => addDays(iso, -((weekday(iso) - (first || 0) + 7) % 7));

  // Mark done / undo for `date`.
  function toggle(log, st, date, at, by) {
    const list = Array.isArray(log[st.task.id]) ? log[st.task.id] : (log[st.task.id] = []);
    if (st.doneEntry) {
      log[st.task.id] = list.filter((e) => e !== st.doneEntry && !(e.done === date && e.occ === st.doneEntry.occ));
    } else {
      list.push({ occ: st.occ, done: date, at, by: by || '' });
    }
  }

  FOH.schedule = { stateOn, upcoming, week, weekStart, toggle, lastDone, addDays, weekday, diffDays };
})(window.FOH = window.FOH || {});
