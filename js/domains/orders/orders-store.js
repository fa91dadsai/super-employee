// foh-opening/js/domains/orders/orders-store.js

// Order Lines State, IndexedDB/LocalStorage Persistence & Stock Query Helpers

(function (FOH) {

  'use strict';



  const ORDERS_DB_KEY = 'foh-opening.ceenOrdersDB.v2';

  const S = () => FOH.state;



  function getCatalog() {

    return (FOH.ordersCatalog && FOH.ordersCatalog.ORD_SEED) || { groups: {}, categories: [], items: [] };

  }



  function getUnits() {

    return (FOH.ordersCatalog && FOH.ordersCatalog.ORD_UNITS) || {};

  }



  function getPlurals() {

    return (FOH.ordersCatalog && FOH.ordersCatalog.ORD_PLURALS) || {};

  }



  function getSession() {

    return (FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.getSession() : null);

  }



  function emptyOrderState() {

    const session = getSession();

    const st = S();

    return {

      orderToken: 'ord-' + Date.now().toString(36),

      meta: {

        requester: (session && session.displayName) || (st.me && st.me.name) || '',

        orderDate: st.date || (FOH.time ? FOH.time.todayISO() : new Date().toISOString().slice(0, 10)),

        shift: 'Morning',

        destination: 'Store',

        priority: 'Normal',

        orderNote: '',

      },

      lines: {},

      visited: {},

      skipped: {},

      lastItem: null,

    };

  }



  function reconcileSeedCatalog(catalog, seed) {
    Object.entries(seed.groups).forEach(([gid, g]) => {
      if (!catalog.groups[gid]) {
        catalog.groups[gid] = JSON.parse(JSON.stringify(g));
      } else {
        const curG = catalog.groups[gid];
        if (!curG.allowedRoles) curG.allowedRoles = g.allowedRoles ? [...g.allowedRoles] : ['all'];
        if (!curG.assignedUsernames) curG.assignedUsernames = g.assignedUsernames ? [...g.assignedUsernames] : [];
        if (!curG.canEditRoles) curG.canEditRoles = g.canEditRoles ? [...g.canEditRoles] : ['super_manager'];
        if (!curG.canEditUsernames) curG.canEditUsernames = g.canEditUsernames ? [...g.canEditUsernames] : [];
        if (!curG.dept) curG.dept = g.dept || 'foh';
      }
    });

    const catIds = new Set(catalog.categories.map((c) => c.id));
    seed.categories.forEach((c) => {
      if (!catIds.has(c.id)) catalog.categories.unshift(JSON.parse(JSON.stringify(c)));
    });

    const itemIds = new Set(catalog.items.map((i) => i.id));
    seed.items.forEach((i) => {
      if (!itemIds.has(i.id)) catalog.items.push(JSON.parse(JSON.stringify(i)));
    });
  }

  function loadOrdersDB() {
    const seed = getCatalog();
    try {
      const raw = FOH.safeJsonParse ? FOH.safeJsonParse(localStorage.getItem(ORDERS_DB_KEY), 'null') : JSON.parse(localStorage.getItem(ORDERS_DB_KEY) || 'null');
      if (raw && raw.version === 2 && raw.catalog && raw.order) {
        reconcileSeedCatalog(raw.catalog, seed);
        raw.preferences = raw.preferences || { viewMode: 'step' };
        raw.order.visited = raw.order.visited || {};
        raw.order.skipped = raw.order.skipped || {};
        raw.order.lines = raw.order.lines || {};
        return raw;
      }
    } catch (err) {
      /* Safe fallback to fresh state when storage parse fails */
    }
    return {
      version: 2,
      catalog: JSON.parse(JSON.stringify(seed)),
      order: emptyOrderState(),
      preferences: { viewMode: 'step' },
    };
  }



  let ordDB = loadOrdersDB();



  function saveOrdersDB() {

    try {

      localStorage.setItem(ORDERS_DB_KEY, JSON.stringify(ordDB));

    } catch (err) {

      // Storage quota or privacy lock fallback

    }

    if (FOH.ordersView && FOH.ordersView.updateOrderBadge) {

      FOH.ordersView.updateOrderBadge();

    }

  }



  function getDB() { return ordDB; }

  function setDB(db) { ordDB = db; saveOrdersDB(); }



  function ordById(id) {

    return ordDB.catalog.items.find((i) => i.id === id);

  }



  function ordCat(cid) {

    return ordDB.catalog.categories.find((c) => c.id === cid);

  }



  function ordCatItems(cid) {

    return ordDB.catalog.items.filter((i) => i.cat === cid && !i.deletedAt);

  }



  function ordLine(id) {

    const it = ordById(id);

    return ordDB.order.lines[id] || { qty: 0, unit: (it && it.unit) || 'bottle', note: '', stock: '' };

  }



  function ordSelectedItems() {

    return ordDB.catalog.items.filter((i) => !i.deletedAt && ordLine(i.id).qty > 0);

  }



  function ordCatDone(cid) {

    return ordCatItems(cid).filter((i) => ordDB.order.visited[i.id]).length;

  }



  function ordCatSkipped(cid) {

    return ordCatItems(cid).filter((i) => ordDB.order.skipped[i.id]).length;

  }



  function ordPendingItem(cid) {

    return ordCatItems(cid).find((i) => !ordDB.order.visited[i.id] && !ordDB.order.skipped[i.id]);

  }



  function ordUnitText(n, u) {

    const units = getUnits();

    const plurals = getPlurals();

    if (!u) return FOH.i18n && FOH.i18n.lang === 'ar' ? 'اختر الوحدة' : 'unit not set';

    return n === 1 ? (units[u] || u).toLowerCase() : plurals[u] || u + 's';

  }



  function ordStockDenominator(i) {

    if (i.stockQty !== null && i.stockQty !== undefined) return String(i.stockQty);

    return /^\d+(\.\d+)?$/.test(i.stock || '') ? i.stock + '*' : '—';

  }



  function ordStockLabel(i) {

    if (i.stockQty !== null && i.stockQty !== undefined) {

      return i.stockQty + ' ' + ordUnitText(i.stockQty, i.stockUnit || i.unit);

    }

    return i.stock || (FOH.i18n && FOH.i18n.lang === 'ar' ? 'غير مسجّل' : 'Not recorded');

  }



  function ordStockRatioHint(i, u) {

    const ar = FOH.i18n && FOH.i18n.lang === 'ar';

    if (i.stockQty === null || i.stockQty === undefined) {

      if (/^\d+(\.\d+)?$/.test(i.stock || '')) {

        return ar ? '* مخزون مرجعي من ملف البار · الوحدة غير مؤكدة.' : '* File stock reference; unit/date unconfirmed.';

      }

      return i.stock

        ? (ar ? 'قيمة مخزون غير واضحة (' + i.stock + ') · يرجى التأكد.' : 'Unclear file value: ' + i.stock + '. Verify stock.')

        : (ar ? 'المخزون غير مسجّل بعد.' : 'Stock has not been recorded.');

    }

    return ar

      ? 'الكمية المطلوبة / المخزون المسجّل · لا يتم خصم المخزون تلقائيًا.'

      : 'Order / stock · ' + ordUnitText(2, u || i.unit) + '. Preparing an order does not deduct stock.';

  }



  function ordSkipRemaining(cid, afterId = null) {

    const list = ordCatItems(cid);

    const start = afterId ? list.findIndex((i) => i.id === afterId) + 1 : 0;

    list.slice(start).forEach((i) => {

      if (!ordDB.order.visited[i.id] && ordLine(i.id).qty === 0) {

        ordDB.order.skipped[i.id] = true;

      }

    });

  }



  // Delegate to ordersCatalogMutations
  function isGroupAllowedForUser(...args) {
    return FOH.ordersCatalogMutations.isGroupAllowedForUser(...args);
  }
  function canUserEditGroup(...args) {
    return FOH.ordersCatalogMutations.canUserEditGroup(...args);
  }
  function canCurrentUserManageOrders(...args) {
    return FOH.ordersCatalogMutations.canCurrentUserManageOrders(...args);
  }
  function allowedGroupsForCurrentRole(...args) {
    return FOH.ordersCatalogMutations.allowedGroupsForCurrentRole(...args);
  }
  function updateGroupConfig(...args) {
    return FOH.ordersCatalogMutations.updateGroupConfig(...args);
  }
  function addNewCategory(...args) {
    return FOH.ordersCatalogMutations.addNewCategory(...args);
  }
  function addNewItem(...args) {
    return FOH.ordersCatalogMutations.addNewItem(...args);
  }
  function updateItem(...args) {
    return FOH.ordersCatalogMutations.updateItem(...args);
  }
  function deleteItem(...args) {
    return FOH.ordersCatalogMutations.deleteItem(...args);
  }
  function promptEditStock(...args) {
    return FOH.ordersCatalogMutations.promptEditStock(...args);
  }

  // Delegate to ordersLifecycleStore
  function promptStartNewOrder(...args) {
    return FOH.ordersLifecycleStore.promptStartNewOrder(...args);
  }
  function getOrderStatus(...args) {
    return FOH.ordersLifecycleStore.getOrderStatus(...args);
  }
  function setOrderStatus(...args) {
    return FOH.ordersLifecycleStore.setOrderStatus(...args);
  }
  function addBreakageReplacement(...args) {
    return FOH.ordersLifecycleStore.addBreakageReplacement(...args);
  }
  function confirmOrderReceiving(...args) {
    return FOH.ordersLifecycleStore.confirmOrderReceiving(...args);
  }
  function getOrderHistory(...args) {
    return FOH.ordersLifecycleStore.getOrderHistory(...args);
  }

  // ---- Fast Service Cockpit: 10-Minute Cooldown Debounced Replenishment ----
  const COOLDOWNS_KEY = 'foh-opening.quickReplenishCooldowns.v1';
  const COOLDOWN_DURATION_MS = 10 * 60 * 1000; // 10 minutes

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
    const it = ordById(itemKey);
    if (!it) return { success: false, reason: 'ITEM_NOT_FOUND' };

    const session = getSession();
    const st = S();
    const orderedBy = (session && session.displayName) || (st.me && st.me.name) || 'Staff';

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
    saveOrdersDB();

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

  FOH.ordersStore = {
    ORDERS_DB_KEY,
    COOLDOWNS_KEY,
    COOLDOWN_DURATION_MS,
    emptyOrderState,
    loadOrdersDB,
    saveOrdersDB,
    getDB,
    setDB,
    ordById,
    ordCat,
    ordCatItems,
    ordLine,
    ordSelectedItems,
    ordCatDone,
    ordCatSkipped,
    ordPendingItem,
    ordUnitText,
    ordStockDenominator,
    ordStockLabel,
    ordStockRatioHint,
    ordSkipRemaining,
    allowedGroupsForCurrentRole,
    promptEditStock,
    promptStartNewOrder,
    getOrderStatus,
    setOrderStatus,
    addBreakageReplacement,
    confirmOrderReceiving,
    getOrderHistory,
    isGroupAllowedForUser,
    canUserEditGroup,
    canCurrentUserManageOrders,
    updateGroupConfig,
    addNewCategory,
    addNewItem,
    updateItem,
    deleteItem,
    getCooldowns,
    saveCooldowns,
    canQuickReplenish,
    quickReplenishItem,
  };

})(window.FOH = window.FOH || {});
