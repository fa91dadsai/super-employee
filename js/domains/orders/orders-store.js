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

  function loadOrdersDB() {
    const seed = getCatalog();
    try {
      const raw = FOH.safeJsonParse ? FOH.safeJsonParse(localStorage.getItem(ORDERS_DB_KEY), 'null') : JSON.parse(localStorage.getItem(ORDERS_DB_KEY) || 'null');
      if (raw && raw.version === 2 && raw.catalog && raw.order) {
        Object.entries(seed.groups).forEach(([gid, g]) => {
          if (!raw.catalog.groups[gid]) raw.catalog.groups[gid] = JSON.parse(JSON.stringify(g));
        });
        const catIds = new Set(raw.catalog.categories.map((c) => c.id));
        seed.categories.forEach((c) => {
          if (!catIds.has(c.id)) raw.catalog.categories.unshift(JSON.parse(JSON.stringify(c)));
        });
        const itemIds = new Set(raw.catalog.items.map((i) => i.id));
        seed.items.forEach((i) => {
          if (!itemIds.has(i.id)) raw.catalog.items.push(JSON.parse(JSON.stringify(i)));
        });
        raw.preferences = raw.preferences || { viewMode: 'step' };
        raw.order.visited = raw.order.visited || {};
        raw.order.skipped = raw.order.skipped || {};
        raw.order.lines = raw.order.lines || {};
        return raw;
      }
    } catch (err) {
      // Safe fallback to fresh state when storage parse fails
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

  function allowedGroupsForCurrentRole(forceAll = false) {
    const entries = Object.entries(ordDB.catalog.groups);
    const session = getSession();
    if (forceAll || !session || session.isManager) return entries;
    const roleLower = String(session.roleName || '').toLowerCase();
    const matched = entries.filter(([, g]) => Array.isArray(g.roles) && g.roles.includes(roleLower));
    return matched.length ? matched : entries;
  }

  function promptEditStock(item, onSaved) {
    const ar = FOH.i18n && FOH.i18n.lang === 'ar';
    const rawQty = prompt(
      ar
        ? `تحديث المخزون الفعلي للصنف "${item.name}":\n(القيمة الحالية: ${ordStockLabel(item)})`
        : `Update recorded stock count for "${item.name}":\n(Current: ${ordStockLabel(item)})`,
      item.stockQty !== null && item.stockQty !== undefined ? String(item.stockQty) : item.stock || '0'
    );
    if (rawQty === null) return;
    const qty = Number(rawQty.trim());
    if (!Number.isFinite(qty) || qty < 0 || qty > 99999) {
      return alert(ar ? 'يرجى إدخال رقم صحيح للمخزون.' : 'Please enter a valid stock number.');
    }
    item.stockQty = Math.round(qty * 100) / 100;
    item.stockUnit = item.stockUnit || item.unit || 'bottle';
    item.stockUpdatedAt = new Date().toISOString();
    saveOrdersDB();
    if (typeof onSaved === 'function') onSaved(item);
  }

  function promptStartNewOrder(onComplete) {
    const ar = FOH.i18n && FOH.i18n.lang === 'ar';
    const currentCount = ordSelectedItems().length;

    const doReset = () => {
      const priorMeta = ordDB.order && ordDB.order.meta ? { ...ordDB.order.meta } : null;
      if (currentCount > 0) {
        ordDB.orderHistory = ordDB.orderHistory || [];
        ordDB.orderHistory.unshift({
          token: (ordDB.order && ordDB.order.orderToken) || ('ord-' + Date.now().toString(36)),
          date: (priorMeta && priorMeta.orderDate) || (FOH.time ? FOH.time.todayISO() : ''),
          itemsCount: currentCount,
          lines: JSON.parse(JSON.stringify((ordDB.order && ordDB.order.lines) || {})),
          meta: priorMeta,
          archivedAt: new Date().toISOString(),
        });
        if (ordDB.orderHistory.length > 20) ordDB.orderHistory.length = 20;
      }

      ordDB.order = emptyOrderState();
      saveOrdersDB();
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '✨ تم تصفير الطلبية وبدء طلبية جديدة بنجاح' : '✨ New order started. Quantities reset.');
      }
      if (typeof onComplete === 'function') onComplete();
    };

    if (currentCount > 0) {
      const confirmed = window.confirm(
        ar
          ? `✨ بدء طلبية جديدة (New Order)\n\nهل أنت متأكد من تصفير كميات الطلبية الحالية (${currentCount} صنف مطلوب) للبدء بطلبية جديدة فارغة؟\n(الكتالوج والمخزون سيبقيان كما هما دون تغيير).`
          : `✨ Start New Order\n\nReset current order (${currentCount} requested items) to 0 and start a fresh order?\n(Catalog and stock will remain unchanged).`
      );
      if (confirmed) doReset();
    } else {
      doReset();
    }
  }

  FOH.ordersStore = {
    ORDERS_DB_KEY,
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
  };
})(window.FOH = window.FOH || {});
