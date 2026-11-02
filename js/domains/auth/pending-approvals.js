// foh-opening/js/domains/auth/pending-approvals.js
// Governance: Pending staff name & nickname alteration requests requiring General Manager confirmation
(function (FOH) {
  'use strict';

  const PENDING_CHANGES_KEY = 'super-employee.pendingNameChanges.v1';

  function loadPendingNameChanges() {
    try {
      const list = FOH.safeJsonParse(localStorage.getItem(PENDING_CHANGES_KEY), '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function savePendingNameChanges(list) {
    try {
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(list));
    } catch {}
  }

  function getActivePendingNameChanges() {
    return loadPendingNameChanges().filter((r) => r.status === 'pending');
  }

  FOH.pendingApprovals = {
    loadPendingNameChanges,
    savePendingNameChanges,
    getActivePendingNameChanges,
  };

  FOH.loadPendingNameChanges = loadPendingNameChanges;
  FOH.savePendingNameChanges = savePendingNameChanges;
})(window.FOH = window.FOH || {});
