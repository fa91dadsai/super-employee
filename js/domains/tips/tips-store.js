// foh-opening/js/domains/tips/tips-store.js
// State Store, Attendance Auto-Sync & Advances Ledger Persistence
(function (FOH) {
  'use strict';

  const TIPS_KEY = 'super-employee.tips.v1';

  function defaultTipsData() {
    return {
      weekLabel: '2026-W44 (26 Oct – 01 Nov)',
      totalPoolJOD: 420.0,
      staff: {
        fadi: {
          name: 'Fadi (Supervisor)',
          role: 'Supervisor',
          points: 150,
          workedDays: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Fri'],
          hours: 48,
          withdrawals: [
            { id: 'w1', date: '2026-10-28', amountJOD: 25.0, note: 'سلفة نقدية منتصف الأسبوع', recordedBy: 'Supervisor' },
          ],
        },
        ali: {
          name: 'Ali (Captain)',
          role: 'Captain',
          points: 120,
          workedDays: ['Sat', 'Sun', 'Mon', 'Tue', 'Thu', 'Fri'],
          hours: 46,
          withdrawals: [
            { id: 'w2', date: '2026-10-29', amountJOD: 15.0, note: 'سلفة نقدية', recordedBy: 'Supervisor' },
          ],
        },
        sara: {
          name: 'Sara (Waiter)',
          role: 'Waiter',
          points: 100,
          workedDays: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'],
          hours: 40,
          withdrawals: [
            { id: 'w3', date: '2026-10-27', amountJOD: 10.0, note: 'سلفة مواصلات', recordedBy: 'Supervisor' },
            { id: 'w4', date: '2026-10-30', amountJOD: 10.0, note: 'سحبة من التبس', recordedBy: 'Supervisor' },
          ],
        },
        maher: {
          name: 'Maher (Bartender)',
          role: 'Bartender',
          points: 110,
          workedDays: ['Sat', 'Sun', 'Tue', 'Wed', 'Thu', 'Fri'],
          hours: 45,
          withdrawals: [],
        },
      },
    };
  }

  function loadTipsData() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(TIPS_KEY), 'null');
      if (raw && raw.staff) return raw;
    } catch (err) { /* Tips storage read fallback */ }
    return defaultTipsData();
  }

  function saveTipsData(data) {
    try {
      localStorage.setItem(TIPS_KEY, JSON.stringify(data));
    } catch (err) { /* Tips storage write fallback */ }
  }

  function getTodayDayCode() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date().getDay()];
  }

  function addAdvance(opts = {}) {
    const { staffKey, amountJOD, note, recordedBy } = opts;
    const db = loadTipsData();
    if (!db.staff || !db.staff[staffKey]) return null;
    const emp = db.staff[staffKey];
    emp.withdrawals = emp.withdrawals || [];
    const entry = {
      id: 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      date: FOH.time ? FOH.time.todayISO() : new Date().toISOString().slice(0, 10),
      timeHM: FOH.time ? FOH.time.nowHM() : '',
      amountJOD: Number(amountJOD),
      note: note || '',
      recordedBy: recordedBy || 'Manager',
    };
    emp.withdrawals.push(entry);
    saveTipsData(db);
    return entry;
  }

  function deleteAdvance(opts = {}) {
    const { staffKey, advanceId } = opts;
    const db = loadTipsData();
    if (!db.staff || !db.staff[staffKey]) return false;
    const emp = db.staff[staffKey];
    const prevLen = (emp.withdrawals || []).length;
    emp.withdrawals = (emp.withdrawals || []).filter((w) => w.id !== advanceId);
    saveTipsData(db);
    return emp.withdrawals.length < prevLen;
  }

  function toggleWorkedDay(opts = {}) {
    const { staffKey, dayCode } = opts;
    const db = loadTipsData();
    if (!db.staff || !db.staff[staffKey]) return false;
    const emp = db.staff[staffKey];
    emp.workedDays = Array.isArray(emp.workedDays) ? emp.workedDays : [];
    if (emp.workedDays.includes(dayCode)) {
      emp.workedDays = emp.workedDays.filter((d) => d !== dayCode);
    } else {
      emp.workedDays.push(dayCode);
    }
    emp.hours = emp.workedDays.length * 8;
    saveTipsData(db);
    return true;
  }

  function syncAttendanceFromRuns(staffKey) {
    const st = FOH.state;
    if (!st || !st.run || !st.run.checked) return false;
    const hasActivity = Object.keys(st.run.checked).length > 0;
    if (!hasActivity) return false;

    const todayCode = getTodayDayCode();
    const db = loadTipsData();
    if (!db.staff || !db.staff[staffKey]) return false;
    const emp = db.staff[staffKey];
    emp.workedDays = Array.isArray(emp.workedDays) ? emp.workedDays : [];
    if (!emp.workedDays.includes(todayCode)) {
      emp.workedDays.push(todayCode);
      emp.hours = emp.workedDays.length * 8;
      saveTipsData(db);
      return true;
    }
    return false;
  }

  function updateStaffPoints(opts = {}) {
    const { staffKey, points } = opts;
    const db = loadTipsData();
    if (!db.staff || !db.staff[staffKey]) return false;
    db.staff[staffKey].points = Math.max(0, Number(points) || 100);
    saveTipsData(db);
    return true;
  }

  function updateTotalPool(opts = {}) {
    const { totalPoolJOD } = opts;
    const db = loadTipsData();
    db.totalPoolJOD = Math.max(0, Number(totalPoolJOD) || 0);
    saveTipsData(db);
    return true;
  }

  FOH.tipsStore = {
    defaultTipsData,
    loadTipsData,
    saveTipsData,
    addAdvance,
    deleteAdvance,
    toggleWorkedDay,
    syncAttendanceFromRuns,
    updateStaffPoints,
    updateTotalPool,
  };
})(window.FOH = window.FOH || {});
