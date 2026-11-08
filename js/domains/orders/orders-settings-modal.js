// foh-opening/js/domains/orders/orders-settings-modal.js
// 1. Orders Group Permissions & Scoping Modal (RBAC by Department, Role & Employee)
// 2. In-View Category & Product Builder (Add/Edit Items from inside Orders)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const store = () => FOH.ordersStore;
  const { el } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);

  const SCOPE_ROLES = [
    { key: 'all', label: 'الجميع (All)', labelEn: 'All Roles' },
    { key: 'super_manager', label: '👑 سوبر مانجر', labelEn: '👑 Super Manager' },
    { key: 'super_captain', label: '🎖️ سوبر كابتن', labelEn: '🎖️ Super Captain' },
    { key: 'super_bartender', label: '🍸 سوبر بارتندر', labelEn: '🍸 Super Bartender' },
    { key: 'super_waiter', label: '⭐ سوبر ويتر', labelEn: '⭐ Super Waiter' },
  ];

  function getStaffList() {
    const list = (S().tpl && Array.isArray(S().tpl.staff)) ? S().tpl.staff.filter((s) => s.active !== false) : [];
    if (list.length) return list;
    if (FOH.roleIdentity && FOH.roleIdentity.getQuickSwitchAccounts) {
      return Object.values(FOH.roleIdentity.getQuickSwitchAccounts()).map((a) => ({
        id: a.username,
        name: a.nickname || a.firstName,
        username: a.username,
        role: a.roleName,
      }));
    }
    return [
      { id: 'fadi', username: 'fadi', name: 'Fadi (Manager)' },
      { id: 'ali', username: 'ali', name: 'Ali (Captain)' },
      { id: 'maher', username: 'maher', name: 'Maher (Bartender)' },
      { id: 'sara', username: 'sara', name: 'Sara (Waiter)' },
    ];
  }

  // ---- 1. Orders Settings & RBAC Modal ----
  function openOrdersSettingsModal(initialGid) {
    const ar = isAr();
    if (!store().canCurrentUserManageOrders()) {
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '⚠️ إعدادات وتخصيص الطلبيات متاحة للمدير فقط' : '⚠️ Orders settings restricted to managers');
      }
      return;
    }

    let dlg = $('ordersSettingsModal');
    if (!dlg) {
      dlg = el('dialog', 'sheet section-assign-dialog');
      dlg.id = 'ordersSettingsModal';
      document.body.append(dlg);
    }

    const db = store().getDB();
    const groupKeys = Object.keys(db.catalog.groups);
    let activeGid = initialGid && db.catalog.groups[initialGid] ? initialGid : groupKeys[0] || 'foh';

    function renderModal() {
      dlg.replaceChildren();
      renderModalHeader(dlg, () => dlg.close(), ar);
      renderGroupSwitcher(dlg, {
        groupKeys,
        activeGid,
        onSelect: (gid) => { activeGid = gid; renderModal(); },
        ar,
      });
      renderGroupConfigBody(dlg, {
        gid: activeGid,
        onSaved: () => {
          dlg.close();
          if (FOH.ordersView && FOH.ordersView.renderOrdersView) {
            FOH.ordersView.renderOrdersView($('ordersView'));
          }
        },
        ar,
      });
    }

    renderModal();
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  function renderModalHeader(dlg, onClose, ar) {
    const head = el('div', 'sec-modal-head');
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.justifyContent = 'space-between';
    head.style.padding = '14px 18px';
    head.style.borderBottom = '1px solid var(--line)';

    const titleBox = el('div', '');
    titleBox.innerHTML =
      '<b style="font-size:1.05rem;display:block;">⚙️ ' + (ar ? 'إعدادات وصلاحيات أقسام الطلبيات' : 'Orders Settings & Scoping') + '</b>' +
      '<small style="color:var(--ink2);">' + (ar ? 'تخصيص الرؤية، الأقسام، وصلاحيات الإضافة لكل قسم' : 'Assign roles, staff and item-editing rights per section') + '</small>';

    const closeBtn = el('button', 'btn sm', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', onClose);

    head.append(titleBox, closeBtn);
    dlg.append(head);
  }

  function renderGroupSwitcher(dlg, opts = {}) {
    const { groupKeys, activeGid, onSelect, ar } = opts;
    const bar = el('div', 'mgr-filter-bar');
    bar.style.padding = '10px 16px';
    bar.style.overflowX = 'auto';
    bar.style.background = 'var(--surface2, rgba(0,0,0,0.03))';

    const db = store().getDB();
    (groupKeys || []).forEach((gid) => {
      const g = db.catalog.groups[gid];
      if (!g) return;
      const gTitle = ar ? (g.nameAr || g.name) : g.name;
      const btn = el('button', 'mgr-filter-pill' + (activeGid === gid ? ' active' : ''));
      btn.type = 'button';
      btn.append(el('span', '', (g.icon || '📦') + ' ' + gTitle));
      btn.addEventListener('click', () => onSelect && onSelect(gid));
      bar.append(btn);
    });
    dlg.append(bar);
  }

  function buildGroupBanner(g, ar) {
    const banner = el('div', '');
    banner.style.padding = '12px 14px';
    banner.style.borderRadius = '12px';
    banner.style.background = 'var(--card, #fff)';
    banner.style.border = '1px solid var(--line)';
    banner.style.marginBottom = '16px';
    banner.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;">' +
      '<span style="font-size:1.6rem;">' + (g.icon || '📦') + '</span>' +
      '<div><strong style="font-size:1rem;display:block;">' + FOH.escapeHtml(ar ? (g.nameAr || g.name) : g.name) + '</strong>' +
      '<small style="color:var(--ink2);">' + FOH.escapeHtml(ar ? (g.subAr || g.sub) : g.sub) + '</small></div>' +
      '</div>';
    return banner;
  }

  function buildGroupActions(opts = {}) {
    const { gid, draft, onSaved, ar } = opts;
    const actRow = el('div', '');
    actRow.style.display = 'flex';
    actRow.style.gap = '8px';
    actRow.style.marginTop = '20px';

    const saveBtn = el('button', 'btn primary', ar ? '✓ حفظ إعدادات القسم' : '✓ Save Section Settings');
    saveBtn.type = 'button';
    saveBtn.style.flex = '1';
    saveBtn.addEventListener('click', () => {
      store().updateGroupConfig(gid, draft);
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '✨ تم حفظ صلاحيات وإعدادات القسم بنجاح' : '✨ Section settings saved');
      }
      if (typeof onSaved === 'function') onSaved();
    });

    actRow.append(saveBtn);
    return actRow;
  }

  function renderGroupConfigBody(dlg, opts = {}) {
    const { gid, onSaved, ar } = opts;
    const db = store().getDB();
    const g = db.catalog.groups[gid];
    if (!g) return;

    const wrap = el('div', 'sec-modal-body');
    wrap.style.padding = '16px';
    wrap.style.maxHeight = '65vh';
    wrap.style.overflowY = 'auto';

    wrap.append(buildGroupBanner(g, ar));

    const draft = {
      allowedRoles: [...(g.allowedRoles || ['all'])],
      assignedUsernames: [...(g.assignedUsernames || [])],
      canEditRoles: [...(g.canEditRoles || ['super_manager'])],
      canEditUsernames: [...(g.canEditUsernames || [])],
    };

    wrap.append(renderRolesSelector(draft.allowedRoles, ar ? '👀 الأدوار المسموح لها برؤية والطلب من هذا القسم:' : '👀 Roles allowed to view & order from this section:', ar));
    wrap.append(renderStaffSelector(draft.assignedUsernames, ar ? '👤 موظفون محددون مسؤولون عن هذا القسم (تخصيص بالاسم):' : '👤 Specific staff assigned to this section:', ar));
    wrap.append(renderRolesSelector(draft.canEditRoles, ar ? '✏️ أدوار مسموح لها بإضافة وتعديل أصناف وقوائم القسم:' : '✏️ Roles allowed to add/edit items & lists in this section:', ar));

    wrap.append(buildGroupActions({ gid, draft, onSaved, ar }));
    dlg.append(wrap);
  }

  function renderRolesSelector(selectedList, titleText, ar) {
    const box = el('div', 'sec-modal-field');
    box.style.marginBottom = '14px';
    box.append(Object.assign(el('label', ''), { innerText: titleText, style: 'display:block;font-weight:700;margin-bottom:6px;font-size:0.86rem;' }));

    const grid = el('div', '');
    grid.style.display = 'flex';
    grid.style.flexWrap = 'wrap';
    grid.style.gap = '6px';

    SCOPE_ROLES.forEach((r) => {
      const isSel = selectedList.includes(r.key);
      const chip = el('button', 'mgr-filter-pill' + (isSel ? ' active' : ''));
      chip.type = 'button';
      chip.style.fontSize = '0.78rem';
      chip.style.padding = '4px 10px';
      chip.innerText = (isSel ? '✓ ' : '+ ') + (ar ? r.label : r.labelEn);
      chip.addEventListener('click', () => {
        if (r.key === 'all') {
          selectedList.length = 0;
          if (!isSel) selectedList.push('all');
        } else {
          const allIdx = selectedList.indexOf('all');
          if (allIdx !== -1) selectedList.splice(allIdx, 1);
          const idx = selectedList.indexOf(r.key);
          if (idx !== -1) selectedList.splice(idx, 1);
          else selectedList.push(r.key);
        }
        updateChipsUI({ container: grid, selectedList, items: SCOPE_ROLES, ar });
      });
      grid.append(chip);
    });

    box.append(grid);
    return box;
  }

  function updateChipsUI(opts = {}) {
    const { container, selectedList, items, ar } = opts;
    const chips = container.querySelectorAll('button');
    chips.forEach((btn, idx) => {
      const it = items[idx];
      if (!it) return;
      const isSel = selectedList.includes(it.key || it.username || it.id);
      btn.classList.toggle('active', isSel);
      btn.innerText = (isSel ? '✓ ' : '+ ') + (ar ? (it.label || it.name) : (it.labelEn || it.name));
    });
  }

  function renderStaffSelector(selectedList, titleText, ar) {
    const box = el('div', 'sec-modal-field');
    box.style.marginBottom = '14px';
    box.append(Object.assign(el('label', ''), { innerText: titleText, style: 'display:block;font-weight:700;margin-bottom:6px;font-size:0.86rem;' }));

    const staff = getStaffList();
    const grid = el('div', '');
    grid.style.display = 'flex';
    grid.style.flexWrap = 'wrap';
    grid.style.gap = '6px';

    staff.forEach((st) => {
      const uname = (st.username || st.id || '').toLowerCase();
      const isSel = selectedList.includes(uname);
      const chip = el('button', 'mgr-filter-pill' + (isSel ? ' active' : ''));
      chip.type = 'button';
      chip.style.fontSize = '0.78rem';
      chip.style.padding = '4px 10px';
      chip.innerText = (isSel ? '✓ ' : '+ ') + (st.name || uname);
      chip.addEventListener('click', () => {
        const idx = selectedList.indexOf(uname);
        if (idx !== -1) selectedList.splice(idx, 1);
        else selectedList.push(uname);
        chip.classList.toggle('active', selectedList.includes(uname));
        chip.innerText = (selectedList.includes(uname) ? '✓ ' : '+ ') + (st.name || uname);
      });
      grid.append(chip);
    });

    box.append(grid);
    return box;
  }

  // ---- 2. In-View Add New Item Dialog ----
  function buildAddItemForm(opts = {}) {
    const { catId, onAdded, dlg, ar } = opts;
    const body = el('div', 'sec-modal-body');
    body.style.padding = '16px';

    const c = store().ordCat(catId);
    const catInfo = el('p', '', (ar ? 'إضافة صنف جديد إلى تصنيف: ' : 'Adding new item to: ') + '<b>' + FOH.escapeHtml(ar ? (c.nameAr || c.name) : c.name) + '</b>');
    catInfo.style.marginBottom = '14px';
    body.append(catInfo);

    const nameIn = Object.assign(el('input', 'in'), { placeholder: ar ? 'اسم الصنف بالإنجليزية' : 'Item name (English)' });
    nameIn.style.width = '100%'; nameIn.style.marginBottom = '10px';

    const nameArIn = Object.assign(el('input', 'in'), { placeholder: ar ? 'اسم الصنف بالعربية (اختياري)' : 'Item name (Arabic - optional)' });
    nameArIn.style.width = '100%'; nameArIn.style.marginBottom = '10px';

    const unitRow = el('div', '');
    unitRow.style.display = 'flex'; unitRow.style.gap = '8px'; unitRow.style.marginBottom = '10px';

    const unitSel = el('select', 'in'); unitSel.style.flex = '1';
    const units = (FOH.ordersCatalog && FOH.ordersCatalog.ORD_UNITS) || {};
    Object.entries(units).forEach(([uk, uLabel]) => unitSel.append(new Option(uLabel, uk)));

    const stockIn = Object.assign(el('input', 'in'), { type: 'number', placeholder: ar ? 'المخزون الحالي' : 'Stock count' });
    stockIn.style.flex = '1';
    unitRow.append(unitSel, stockIn);

    const packIn = Object.assign(el('input', 'in'), { placeholder: ar ? 'حجم العبوة (اختياري)' : 'Pack size (optional)' });
    packIn.style.width = '100%'; packIn.style.marginBottom = '16px';

    const saveBtn = el('button', 'btn primary', ar ? '✓ حفظ وإضافة الصنف' : '✓ Save Item');
    saveBtn.type = 'button'; saveBtn.style.width = '100%';
    saveBtn.addEventListener('click', () => {
      const name = nameIn.value.trim();
      if (!name) return alert(ar ? 'يرجى كتابة اسم الصنف.' : 'Please enter item name.');
      const rawStock = stockIn.value.trim() !== '' ? Number(stockIn.value) : null;
      store().addNewItem(catId, { name, ar: nameArIn.value.trim(), unit: unitSel.value, stockQty: rawStock, packSize: packIn.value.trim() });
      dlg.close();
      if (FOH.edit && FOH.edit.toast) FOH.edit.toast(ar ? '✨ تم إضافة الصنف بنجاح' : '✨ Item added successfully');
      if (typeof onAdded === 'function') onAdded();
    });

    body.append(nameIn, nameArIn, unitRow, packIn, saveBtn);
    return body;
  }

  function openAddItemModal(catId, onAdded) {
    const ar = isAr();
    const c = store().ordCat(catId);
    if (!c) return;

    let dlg = $('ordAddItemModal');
    if (!dlg) {
      dlg = el('dialog', 'sheet section-assign-dialog');
      dlg.id = 'ordAddItemModal';
      document.body.append(dlg);
    }
    dlg.replaceChildren();
    renderModalHeader(dlg, () => dlg.close(), ar);
    dlg.append(buildAddItemForm({ catId, onAdded, dlg, ar }));

    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  // ---- 3. In-View Add New Category Dialog ----
  function buildAddCategoryForm(opts = {}) {
    const { groupKey, onAdded, dlg, ar } = opts;
    const body = el('div', 'sec-modal-body');
    body.style.padding = '16px';

    const db = store().getDB();
    const g = db.catalog.groups[groupKey];
    const groupInfo = el('p', '', (ar ? 'إضافة تصنيف جديد إلى قسم: ' : 'Adding new category to: ') + '<b>' + FOH.escapeHtml(ar ? (g.nameAr || g.name) : g.name) + '</b>');
    groupInfo.style.marginBottom = '14px';
    body.append(groupInfo);

    const nameIn = Object.assign(el('input', 'in'), { placeholder: ar ? 'اسم التصنيف بالإنجليزية' : 'Category name (English)' });
    nameIn.style.width = '100%'; nameIn.style.marginBottom = '10px';

    const nameArIn = Object.assign(el('input', 'in'), { placeholder: ar ? 'اسم التصنيف بالعربية (اختياري)' : 'Category name (Arabic - optional)' });
    nameArIn.style.width = '100%'; nameArIn.style.marginBottom = '16px';

    const saveBtn = el('button', 'btn primary', ar ? '✓ حفظ وإضافة التصنيف' : '✓ Save Category');
    saveBtn.type = 'button'; saveBtn.style.width = '100%';
    saveBtn.addEventListener('click', () => {
      const name = nameIn.value.trim();
      if (!name) return alert(ar ? 'يرجى كتابة اسم التصنيف.' : 'Please enter category name.');
      store().addNewCategory(groupKey, { name, nameAr: nameArIn.value.trim() });
      dlg.close();
      if (FOH.edit && FOH.edit.toast) FOH.edit.toast(ar ? '✨ تم إضافة التصنيف بنجاح' : '✨ Category added successfully');
      if (typeof onAdded === 'function') onAdded();
    });

    body.append(nameIn, nameArIn, saveBtn);
    return body;
  }

  function openAddCategoryModal(groupKey, onAdded) {
    const ar = isAr();
    const db = store().getDB();
    const g = db.catalog.groups[groupKey];
    if (!g) return;

    let dlg = $('ordAddCatModal');
    if (!dlg) {
      dlg = el('dialog', 'sheet section-assign-dialog');
      dlg.id = 'ordAddCatModal';
      document.body.append(dlg);
    }
    dlg.replaceChildren();
    renderModalHeader(dlg, () => dlg.close(), ar);
    dlg.append(buildAddCategoryForm({ groupKey, onAdded, dlg, ar }));

    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  FOH.ordersSettingsModal = {
    open: openOrdersSettingsModal,
    openAddItemModal,
    openAddCategoryModal,
  };
})(window.FOH = window.FOH || {});
