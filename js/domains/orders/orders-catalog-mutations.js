// Orders Store Component
(function (FOH) {
  'use strict';
  const getOrdDB = () => (FOH.ordersStore && FOH.ordersStore.getDB ? FOH.ordersStore.getDB() : { catalog: { groups: {}, categories: [], items: [] }, order: {} });
  const saveOrdersDB = () => (FOH.ordersStore && FOH.ordersStore.saveOrdersDB ? FOH.ordersStore.saveOrdersDB() : null);
  const ordCat = (cid) => (FOH.ordersStore && FOH.ordersStore.ordCat ? FOH.ordersStore.ordCat(cid) : getOrdDB().catalog.categories.find((c) => c.id === cid));
  const ordById = (id) => (FOH.ordersStore && FOH.ordersStore.ordById ? FOH.ordersStore.ordById(id) : getOrdDB().catalog.items.find((i) => i.id === id));


  const store = () => FOH.ordersStore;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  const getSession = () => ((FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.loadSession() : null));

  function isGroupAllowedForUser(gid, opts = {}) {
    const isObj = typeof opts === 'object' && opts !== null;
    const roleKey = isObj ? (opts.roleKey || 'staff') : (opts || 'staff');
    const username = isObj ? (opts.username || '') : (arguments[2] || '');
    const isManager = isObj ? !!opts.isManager : !!arguments[3];

    if (isManager) return true;

    const g = getOrdDB().catalog.groups[gid];

    if (!g) return false;

    const u = (username || '').toLowerCase().trim();

    if (Array.isArray(g.assignedUsernames) && g.assignedUsernames.map((s) => (s || '').toLowerCase().trim()).includes(u)) {

      return true;

    }

    const r = (roleKey || 'staff').toLowerCase().trim();

    if (Array.isArray(g.allowedRoles) && g.allowedRoles.length > 0) {
      if (g.allowedRoles.includes('all')) return true;
      return g.allowedRoles.includes(r);
    }

    // Fallback legacy support for g.roles

    if (Array.isArray(g.roles)) {

      const legacyRoles = g.roles.map((x) => (x || '').toLowerCase());

      if (r === 'super_bartender' && legacyRoles.includes('bartender')) return true;

      if (r === 'super_waiter' && (legacyRoles.includes('waiter') || legacyRoles.includes('runner'))) return true;

      if (r === 'super_captain' && (legacyRoles.includes('captain') || legacyRoles.includes('supervisor'))) return true;

    }

    return false;

  }



  function canUserEditGroup(gid, opts = {}) {
    const isObj = typeof opts === 'object' && opts !== null;
    const roleKey = isObj ? (opts.roleKey || 'staff') : (opts || 'staff');
    const username = isObj ? (opts.username || '') : (arguments[2] || '');
    const isManager = isObj ? !!opts.isManager : !!arguments[3];

    if (isManager) return true;

    const g = getOrdDB().catalog.groups[gid];

    if (!g) return false;

    const u = (username || '').toLowerCase().trim();

    if (Array.isArray(g.canEditUsernames) && g.canEditUsernames.map((s) => (s || '').toLowerCase().trim()).includes(u)) {

      return true;

    }

    const r = (roleKey || 'staff').toLowerCase().trim();

    if (Array.isArray(g.canEditRoles)) {

      if (g.canEditRoles.includes('all')) return true;

      if (g.canEditRoles.includes(r)) return true;

    }

    return false;

  }



  function canCurrentUserManageOrders() {
    const session = getSession();
    if (!session) return false;
    if (session.isManager || session.roleId === 'manager') return true;
    const rKey = FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
    if (rKey === 'super_manager') return true;
    if (FOH.gov && FOH.gov.canCurrentUserEditChecklist && FOH.gov.canCurrentUserEditChecklist()) return true;
    return false;
  }



  function allowedGroupsForCurrentRole(forceAll = false) {
    const entries = Object.entries(getOrdDB().catalog.groups);
    const session = getSession();
    const hasAuth = !!(FOH.sessionAuth && typeof FOH.sessionAuth.loadSession === 'function');
    const isMgr = (!hasAuth && !session) || !!(session && (session.isManager || session.roleId === 'manager'));
    if (forceAll || isMgr) return entries;
    const rKey = FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
    const uname = (session && session.username) || '';
    return entries.filter(([gid]) => isGroupAllowedForUser(gid, rKey, uname, false));
  }



  function updateGroupConfig(gid, updates = {}) {

    const g = getOrdDB().catalog.groups[gid];

    if (!g) return false;

    if (Array.isArray(updates.allowedRoles)) g.allowedRoles = [...updates.allowedRoles];

    if (Array.isArray(updates.assignedUsernames)) g.assignedUsernames = [...updates.assignedUsernames];

    if (Array.isArray(updates.canEditRoles)) g.canEditRoles = [...updates.canEditRoles];

    if (Array.isArray(updates.canEditUsernames)) g.canEditUsernames = [...updates.canEditUsernames];

    if (updates.name) g.name = updates.name.trim();

    if (updates.nameAr) g.nameAr = updates.nameAr.trim();

    if (updates.icon) g.icon = updates.icon.trim();

    if (updates.dept) g.dept = updates.dept.trim();

    saveOrdersDB();

    return true;

  }



  function addNewCategory(groupKey, data = {}) {

    const g = getOrdDB().catalog.groups[groupKey];

    if (!g) return null;

    const cid = groupKey + '-' + Date.now().toString(36);

    const cat = {

      id: cid,

      group: groupKey,

      name: (data.name || 'New Category').trim(),

      nameAr: (data.nameAr || data.name || 'تصنيف جديد').trim(),

    };

    getOrdDB().catalog.categories.push(cat);

    saveOrdersDB();

    return cat;

  }



  function addNewItem(catId, data = {}) {

    const c = ordCat(catId);

    if (!c) return null;

    const iid = catId + '-' + Date.now().toString(36);

    const rawQty = data.stockQty !== undefined && data.stockQty !== null && data.stockQty !== '' ? Number(data.stockQty) : null;

    const item = {

      id: iid,

      group: c.group,

      cat: catId,

      name: (data.name || 'New Item').trim(),

      ar: (data.ar || '').trim(),

      stock: rawQty !== null ? String(rawQty) : '',

      stockQty: rawQty,

      unit: data.unit || 'bottle',

      stockUnit: data.unit || 'bottle',

      packSize: (data.packSize || '').trim(),

      stockUpdatedAt: new Date().toISOString(),

    };

    getOrdDB().catalog.items.push(item);

    saveOrdersDB();

    return item;

  }



  function updateItem(itemId, updates = {}) {

    const item = ordById(itemId);

    if (!item) return false;

    if (updates.name) item.name = updates.name.trim();

    if (updates.ar !== undefined) item.ar = updates.ar.trim();

    if (updates.unit) { item.unit = updates.unit; item.stockUnit = updates.unit; }

    if (updates.packSize !== undefined) item.packSize = updates.packSize.trim();

    if (updates.stockQty !== undefined) {

      item.stockQty = updates.stockQty;

      item.stock = updates.stockQty !== null ? String(updates.stockQty) : '';

      item.stockUpdatedAt = new Date().toISOString();

    }

    saveOrdersDB();

    return true;

  }



  function deleteItem(itemId) {

    const item = ordById(itemId);

    if (!item) return false;

    item.deletedAt = Date.now();

    saveOrdersDB();

    return true;

  }



  function promptEditStock(item, onSaved) {
    const ar = FOH.i18n && FOH.i18n.lang === 'ar';
    const currentStock = (store().ordStockLabel ? store().ordStockLabel(item) : (item.stock || '0'));
    const rawQty = prompt(
      ar
        ? `تحديث المخزون الفعلي للصنف "${item.name}":\n(القيمة الحالية: ${currentStock})`
        : `Update recorded stock count for "${item.name}":\n(Current: ${currentStock})`,
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




  FOH.ordersCatalogMutations = {
    isGroupAllowedForUser,
    canUserEditGroup,
    canCurrentUserManageOrders,
    allowedGroupsForCurrentRole,
    updateGroupConfig,
    addNewCategory,
    addNewItem,
    updateItem,
    deleteItem,
    promptEditStock,
  };
})(window.FOH = window.FOH || {});
