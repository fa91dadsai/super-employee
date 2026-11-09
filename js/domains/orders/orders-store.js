// foh-opening/js/domains/orders/orders-store.js

// Order Lines State, IndexedDB/LocalStorage Persistence & Stock Query Helpers

(function (FOH) {

  'use strict';

  const ORDERS_DB_KEY = 'foh-opening.ceenOrdersDB.v2';

  const S = () => FOH.state;

  const getCatalog = () => (FOH.ordersCatalog && FOH.ordersCatalog.ORD_SEED) || { groups: {}, categories: [], items: [] };
  const getUnits = () => (FOH.ordersCatalog && FOH.ordersCatalog.ORD_UNITS) || {};
  const getPlurals = () => (FOH.ordersCatalog && FOH.ordersCatalog.ORD_PLURALS) || {};
  const getSession = () => ((FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.getSession() : null));

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
        raw.preferences = raw.preferences || { viewMode: 'list' };
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
      preferences: { viewMode: 'list' },
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

  const ORD_AR_UNITS = {
    bottle: ['قنينة', 'قناني'], piece: ['حبة', 'حبات'], kg: ['كيلو', 'كيلو'],
    g: ['غم', 'غم'], liter: ['لتر', 'لتر'], pack: ['باكيت', 'باكيتات'],
    box: ['كرتونة', 'كراتين'], bunch: ['ضمة', 'ضمات'], tray: ['صينية', 'صواني'],
    bag: ['كيس', 'أكياس'], roll: ['رول', 'رولات'],
  };

  function ordUnitText(n, u) {
    if (!u) return FOH.i18n && FOH.i18n.lang === 'ar' ? 'اختر الوحدة' : 'unit not set';
    if (FOH.i18n && FOH.i18n.lang === 'ar') {
      const pair = ORD_AR_UNITS[String(u).toLowerCase()];
      if (pair) return n === 1 ? pair[0] : pair[1];
    }
    const units = getUnits();
    const plurals = getPlurals();
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
  const mut = () => FOH.ordersCatalogMutations;
  const isGroupAllowedForUser = (...a) => (mut() ? mut().isGroupAllowedForUser(...a) : false);
  const canUserEditGroup = (...a) => (mut() ? mut().canUserEditGroup(...a) : false);
  const canCurrentUserManageOrders = (...a) => (mut() ? mut().canCurrentUserManageOrders(...a) : false);
  const allowedGroupsForCurrentRole = (...a) => (mut() ? mut().allowedGroupsForCurrentRole(...a) : []);
  const updateGroupConfig = (...a) => (mut() ? mut().updateGroupConfig(...a) : null);
  const addNewCategory = (...a) => (mut() ? mut().addNewCategory(...a) : null);
  const addNewItem = (...a) => (mut() ? mut().addNewItem(...a) : null);
  const updateItem = (...a) => (mut() ? mut().updateItem(...a) : null);
  const deleteItem = (...a) => (mut() ? mut().deleteItem(...a) : null);
  const promptEditStock = (...a) => (mut() ? mut().promptEditStock(...a) : null);

  // Delegate to ordersLifecycleStore
  const life = () => FOH.ordersLifecycleStore;
  const promptStartNewOrder = (...a) => (life() ? life().promptStartNewOrder(...a) : null);
  const getOrderStatus = (...a) => (life() ? life().getOrderStatus(...a) : 'draft');
  const setOrderStatus = (...a) => (life() ? life().setOrderStatus(...a) : null);
  const addBreakageReplacement = (...a) => (life() ? life().addBreakageReplacement(...a) : null);
  const confirmOrderReceiving = (...a) => (life() ? life().confirmOrderReceiving(...a) : null);
  const getOrderHistory = (...a) => (life() ? life().getOrderHistory(...a) : []);

  // ---- Fast Service Cockpit: 10-Minute Cooldown Debounced Replenishment ----
  const COOLDOWNS_KEY = 'foh-opening.quickReplenishCooldowns.v1';
  const COOLDOWN_DURATION_MS = 10 * 60 * 1000;

  const quickStore = () => FOH.ordersQuickReplenishStore;
  const getCooldowns = () => (quickStore() ? quickStore().getCooldowns() : {});
  const saveCooldowns = (cds) => (quickStore() ? quickStore().saveCooldowns(cds) : null);
  const canQuickReplenish = (k, s) => (quickStore() ? quickStore().canQuickReplenish(k, s) : { allowed: true, cooldownRemainingSec: 0 });
  const quickReplenishItem = (k, s, q) => (quickStore() ? quickStore().quickReplenishItem(k, s, q) : { success: false });

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
