// Orders Store Component
(function (FOH) {
  'use strict';
  const getOrdDB = () => (FOH.ordersStore && FOH.ordersStore.getDB ? FOH.ordersStore.getDB() : { catalog: { groups: {}, categories: [], items: [] }, order: {} });
  const saveOrdersDB = () => (FOH.ordersStore && FOH.ordersStore.saveOrdersDB ? FOH.ordersStore.saveOrdersDB() : null);


  const store = () => FOH.ordersStore;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  const getSession = () => ((FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.loadSession() : null));
  const getSelectedItems = () => (store().ordSelectedItems ? store().ordSelectedItems() : []);
  const createEmptyOrder = () => (store().emptyOrderState ? store().emptyOrderState() : { lines: {}, meta: {}, status: 'draft' });

  function promptStartNewOrder(onComplete) {
    const ar = FOH.i18n && FOH.i18n.lang === 'ar';
    const currentCount = getSelectedItems().length;

    const doReset = () => {
      const priorMeta = getOrdDB().order && getOrdDB().order.meta ? { ...getOrdDB().order.meta } : null;
      if (currentCount > 0) {
        getOrdDB().history = getOrdDB().history || [];
        getOrdDB().history.unshift({
          token: (getOrdDB().order && getOrdDB().order.orderToken) || ('ord-' + Date.now().toString(36)),
          date: (priorMeta && priorMeta.orderDate) || (FOH.time ? FOH.time.todayISO() : ''),
          itemsCount: currentCount,
          lines: JSON.parse(JSON.stringify((getOrdDB().order && getOrdDB().order.lines) || {})),
          meta: priorMeta,
          archivedAt: new Date().toISOString(),
          type: 'ARCHIVED_DRAFT',
        });
        if (getOrdDB().history.length > 30) getOrdDB().history.length = 30;
      }

      getOrdDB().order = createEmptyOrder();
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



  function getOrderStatus() {

    return (getOrdDB().order && getOrdDB().order.status) || 'DRAFT';

  }



  function setOrderStatus(st) {
    getOrdDB().order = getOrdDB().order || createEmptyOrder();
    getOrdDB().order.status = st;
    if (st === 'DISPATCHED') getOrdDB().order.dispatchedAt = Date.now();
    saveOrdersDB();
  }

  function addBreakageReplacement(opts = {}) {
    const { name, qty = 1, note = '' } = opts;
    if (!name) return;
    getOrdDB().order = getOrdDB().order || createEmptyOrder();
    getOrdDB().order.lines = getOrdDB().order.lines || {};
    const match = getOrdDB().catalog.items.find((i) =>
      i.name.toLowerCase().includes(name.toLowerCase()) || (i.nameAr && i.nameAr.includes(name))
    );
    let itemId = match ? match.id : null;
    if (!itemId) {
      itemId = 'break_' + Date.now().toString(36);
      getOrdDB().catalog.items.push({
        id: itemId,
        groupId: 'foh',
        categoryId: 'foh-supplies',
        typeId: 'custom',
        name,
        nameAr: name,
        unit: 'pcs',
        stockQty: 0,
        par: 0,
        quickTrack: true,
      });
    }
    const prev = getOrdDB().order.lines[itemId] ? getOrdDB().order.lines[itemId].qty : 0;
    getOrdDB().order.lines[itemId] = {
      qty: prev + Number(qty),
      unit: match ? match.unit : 'pcs',
      note: note || ((FOH.i18n && FOH.i18n.lang === 'ar') ? 'تعويض كسر زجاجي' : 'Breakage replacement'),
    };
    saveOrdersDB();
  }

  function confirmOrderReceiving(opts = {}) {
    const { receivedLines, receiverName, notes } = opts;
    const lines = receivedLines || (getOrdDB().order && getOrdDB().order.lines) || {};
    Object.entries(lines).forEach(([id, rec]) => {
      const q = typeof rec === 'object' && rec !== null ? Number(rec.qty || 0) : Number(rec || 0);
      const item = getOrdDB().catalog.items.find((i) => i.id === id);
      if (item && q > 0) {
        item.stockQty = (Number(item.stockQty) || 0) + q;
        item.stockUpdatedAt = Date.now();
      }
    });

    // Record shortages into persistent Backorders for the next order
    const reqLines = (getOrdDB().order && getOrdDB().order.lines) || {};
    getOrdDB().backorders = getOrdDB().backorders || {};
    Object.entries(reqLines).forEach(([id, line]) => {
      const requested = Number((line && line.qty) || 0);
      const rec = lines[id];
      const received = typeof rec === 'object' && rec !== null ? Number(rec.qty || 0) : Number(rec !== undefined ? rec : requested);
      if (requested > received) {
        getOrdDB().backorders[id] = {
          itemId: id,
          shortageQty: requested - received,
          unit: (line && line.unit) || 'bottle',
          date: FOH.time ? FOH.time.todayISO() : '',
          token: getOrdDB().order.orderToken || '',
        };
      } else if (getOrdDB().backorders[id]) {
        delete getOrdDB().backorders[id];
      }
    });

    getOrdDB().history = getOrdDB().history || [];
    getOrdDB().history.unshift({
      orderToken: getOrdDB().order.orderToken,
      orderDate: (getOrdDB().order.meta && getOrdDB().order.meta.orderDate) || (FOH.time ? FOH.time.todayISO() : ''),
      dispatchedAt: getOrdDB().order.dispatchedAt,
      receivedAt: Date.now(),
      receiverName: receiverName || 'Staff',
      requestedLines: JSON.parse(JSON.stringify(getOrdDB().order.lines || {})),
      receivedLines: receivedLines || JSON.parse(JSON.stringify(getOrdDB().order.lines || {})),
      notes: notes || '',
    });
    getOrdDB().order = createEmptyOrder();
    saveOrdersDB();
  }

  function getBackorders() {
    return getOrdDB().backorders || {};
  }

  function dismissBackorder(itemId) {
    if (getOrdDB().backorders && getOrdDB().backorders[itemId]) {
      delete getOrdDB().backorders[itemId];
      saveOrdersDB();
    }
  }

  function applyBackordersToCurrentOrder() {
    const bo = getBackorders();
    let count = 0;
    const db = getOrdDB();
    db.order = db.order || createEmptyOrder();
    db.order.lines = db.order.lines || {};
    Object.entries(bo).forEach(([id, item]) => {
      if (item && item.shortageQty > 0) {
        const prev = db.order.lines[id] ? Number(db.order.lines[id].qty || 0) : 0;
        const it = db.catalog.items.find((x) => x.id === id);
        db.order.lines[id] = {
          qty: prev + item.shortageQty,
          unit: (it && it.unit) || item.unit || 'bottle',
          note: (db.order.lines[id] && db.order.lines[id].note) || '',
          stock: '',
        };
        count++;
      }
    });
    db.backorders = {};
    saveOrdersDB();
    return count;
  }

  function getOrderHistory() {
    return getOrdDB().history || [];
  }

  FOH.ordersLifecycleStore = {
    promptStartNewOrder,
    getOrderStatus,
    setOrderStatus,
    addBreakageReplacement,
    confirmOrderReceiving,
    getBackorders,
    dismissBackorder,
    applyBackordersToCurrentOrder,
    getOrderHistory,
  };
})(window.FOH = window.FOH || {});
