// foh-opening/js/domains/orders/orders-quick-replenish-store.js
// Fast Service Cockpit: 10-Minute Cooldown Debounced Replenishment Store
(function (FOH) {
  'use strict';

  const COOLDOWNS_KEY = 'foh-opening.quickReplenishCooldowns.v1';
  const COOLDOWN_DURATION_MS = 10 * 60 * 1000; // 10 minutes

  const S = () => FOH.state;
  const store = () => FOH.ordersStore;
  const getSession = () => ((FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.loadSession() : null));

  function getCooldowns() {
    try {
      return (FOH.safeJsonParse ? FOH.safeJsonParse(localStorage.getItem(COOLDOWNS_KEY), '{}') : JSON.parse(localStorage.getItem(COOLDOWNS_KEY) || '{}')) || {};
    } catch (err) {
      /* Storage quota fallback */
      return {};
    }
  }

  function saveCooldowns(cds) {
    try {
      localStorage.setItem(COOLDOWNS_KEY, JSON.stringify(cds));
    } catch (err) {
      /* Storage quota fallback */
    }
  }

  function canQuickReplenish(itemKey, stationId) {
    const cds = getCooldowns();
    const entry = cds[itemKey];
    if (!entry) return { allowed: true, cooldownRemainingSec: 0, lastOrderedBy: '', currentQty: 0 };
    const elapsed = Date.now() - (entry.orderedAt || 0);
    if (elapsed >= COOLDOWN_DURATION_MS) {
      return { allowed: true, cooldownRemainingSec: 0, lastOrderedBy: entry.orderedBy || '', currentQty: entry.lineQty || 0 };
    }
    const remainingSec = Math.ceil((COOLDOWN_DURATION_MS - elapsed) / 1000);
    return {
      allowed: false,
      cooldownRemainingSec: remainingSec,
      lastOrderedBy: entry.orderedBy || 'Staff',
      currentQty: entry.lineQty || 0,
    };
  }

  function quickReplenishItem(itemKey, stationId = 'floor', qtyToAdd = 1) {
    const it = store().ordById ? store().ordById(itemKey) : null;
    if (!it) return { success: false, reason: 'ITEM_NOT_FOUND' };

    const session = getSession();
    const st = S();
    const orderedBy = (session && session.displayName) || (st.me && st.me.name) || 'Staff';
    const ordDB = store().getDB();

    if (!ordDB.order.lines[itemKey]) {
      ordDB.order.lines[itemKey] = {
        qty: qtyToAdd,
        unit: it.unit || 'piece',
        note: 'Quick Replenish (' + stationId + ')',
        stock: it.stock || '',
      };
    } else {
      ordDB.order.lines[itemKey].qty = (Number(ordDB.order.lines[itemKey].qty) || 0) + qtyToAdd;
    }
    ordDB.order.visited[itemKey] = true;
    store().saveOrdersDB();

    const cds = getCooldowns();
    cds[itemKey] = {
      stationId,
      orderedBy,
      orderedAt: Date.now(),
      lineQty: ordDB.order.lines[itemKey].qty,
    };
    saveCooldowns(cds);

    if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
      FOH.cloudRealtime.broadcast('QUICK_REPLENISH_TRIGGERED', {
        itemKey,
        itemName: it.name,
        stationId,
        orderedBy,
        qty: qtyToAdd,
        totalQty: ordDB.order.lines[itemKey].qty,
        at: FOH.time ? FOH.time.nowHM() : new Date().toLocaleTimeString(),
      });
    }

    return {
      success: true,
      item: it,
      newQty: ordDB.order.lines[itemKey].qty,
      cooldownRemainingSec: Math.ceil(COOLDOWN_DURATION_MS / 1000),
    };
  }

  FOH.ordersQuickReplenishStore = {
    COOLDOWNS_KEY,
    COOLDOWN_DURATION_MS,
    getCooldowns,
    saveCooldowns,
    canQuickReplenish,
    quickReplenishItem,
  };
})(window.FOH = window.FOH || {});

