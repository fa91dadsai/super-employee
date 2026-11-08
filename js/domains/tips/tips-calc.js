// foh-opening/js/domains/tips/tips-calc.js
// Integer Fils Math, Largest-Remainder Splitter & Hamilton Algorithm
(function (FOH) {
  'use strict';

  function toFils(jod) {
    const n = Number(jod);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 1000);
  }

  function formatJod(fils) {
    const f = Number(fils);
    if (!Number.isFinite(f)) return '0.000';
    return (f / 1000).toFixed(3);
  }

  function distributeFils(totalFils, weights) {
    const total = Math.max(0, Math.floor(totalFils || 0));
    const n = weights.length;
    if (total === 0 || n === 0) return new Array(n).fill(0);

    const sumW = weights.reduce((acc, w) => acc + Math.max(0, w), 0);
    if (sumW === 0) return new Array(n).fill(0);

    const quotas = weights.map((w) => (Math.max(0, w) / sumW) * total);
    const floors = quotas.map((q) => Math.floor(q));
    const remainders = quotas.map((q, idx) => ({ idx, rem: q - floors[idx] }));

    const allocated = floors.reduce((acc, v) => acc + v, 0);
    const leftover = total - allocated;

    // Stable sort: highest remainder first, tie broken by lower index
    remainders.sort((a, b) => b.rem - a.rem || a.idx - b.idx);

    const result = [...floors];
    for (let i = 0; i < leftover && i < remainders.length; i++) {
      result[remainders[i].idx] += 1;
    }
    return result;
  }

  function calculateStaffShares(opts = {}) {
    const totalPoolJOD = Number(opts.totalPoolJOD || 0);
    const staff = opts.staff || {};
    const poolFils = toFils(totalPoolJOD);
    const keys = Object.keys(staff);

    const weights = keys.map((k) => {
      const emp = staff[k];
      const pts = Number(emp.points || 100);
      const days = Array.isArray(emp.workedDays) ? emp.workedDays.length : 0;
      return pts * days;
    });

    const grossFilsList = distributeFils(poolFils, weights);
    const results = {};

    keys.forEach((k, idx) => {
      const emp = staff[k];
      const grossFils = grossFilsList[idx];
      const advances = Array.isArray(emp.withdrawals) ? emp.withdrawals : [];
      const withdrawnFils = advances.reduce((s, w) => s + toFils(w.amountJOD), 0);
      const netFils = Math.max(0, grossFils - withdrawnFils);
      const isDeficit = withdrawnFils > grossFils;
      const deficitFils = isDeficit ? withdrawnFils - grossFils : 0;

      results[k] = {
        weight: weights[idx],
        grossFils,
        withdrawnFils,
        netFils,
        isDeficit,
        deficitFils,
        grossJOD: formatJod(grossFils),
        withdrawnJOD: formatJod(withdrawnFils),
        netJOD: formatJod(netFils),
        deficitJOD: formatJod(deficitFils),
      };
    });

    return {
      poolFils,
      poolJOD: formatJod(poolFils),
      results,
    };
  }

  FOH.tipsCalc = {
    toFils,
    formatJod,
    distributeFils,
    calculateStaffShares,
  };
})(window.FOH = window.FOH || {});

