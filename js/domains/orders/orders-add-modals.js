// foh-opening/js/domains/orders/orders-add-modals.js
// In-View Add New Item & Add New Category Modals
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const store = () => FOH.ordersStore;
  const { el } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);

  function renderModalHeader(dlg, onClose, ar, titleText) {
    const head = el('div', 'sec-modal-head');
    head.style.display = 'flex';
    head.style.justifyContent = 'space-between';
    head.style.alignItems = 'center';
    head.style.padding = '14px 16px';
    head.style.borderBottom = '1px solid var(--line, rgba(0,0,0,0.08))';

    const h = el('h3', '', titleText || (ar ? 'إضافة إلى الكتالوج' : 'Add to Catalog'));
    h.style.margin = '0';
    h.style.fontSize = '1.05rem';

    const closeBtn = el('button', 'btn small', '✕');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', onClose);

    head.append(h, closeBtn);
    dlg.append(head);
  }

  // ---- 1. In-View Add New Item Dialog ----
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
    renderModalHeader(dlg, () => dlg.close(), ar, ar ? 'إضافة صنف جديد' : 'Add New Item');
    dlg.append(buildAddItemForm({ catId, onAdded, dlg, ar }));

    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  // ---- 2. In-View Add New Category Dialog ----
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
    renderModalHeader(dlg, () => dlg.close(), ar, ar ? 'إضافة تصنيف جديد' : 'Add New Category');
    dlg.append(buildAddCategoryForm({ groupKey, onAdded, dlg, ar }));

    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  FOH.ordersAddModals = {
    openAddItemModal,
    openAddCategoryModal,
  };
})(window.FOH = window.FOH || {});

