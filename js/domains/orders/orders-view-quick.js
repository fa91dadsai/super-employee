// foh-opening/js/domains/orders/orders-view-quick.js
// Quick list matrix mode with CEEN 2 design parity: direct steppers, requested filter, and inline ratio
(function (FOH) {
  'use strict';

  const store = () => FOH.ordersStore;
  const { el } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  const getSession = () => ((FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.loadSession() : null));

  let quickQuery = '';
  let quickOnlyRequested = false;

  function ordGo(route) {
    if (FOH.ordersView && FOH.ordersView.go) FOH.ordersView.go(route);
  }

  function updateQuickItemQty(i, delta, row, ar) {
    const db = store().getDB();
    const l = store().ordLine(i.id);
    const newQty = Math.max(0, (l.qty || 0) + delta);
    db.order.lines[i.id] = { ...l, qty: newQty };
    db.order.visited[i.id] = true;
    if (newQty > 0) delete db.order.skipped[i.id];
    store().saveOrdersDB();

    row.classList.toggle('has-order', newQty > 0);
    const summary = row.querySelector('.quick-summary');
    if (summary) {
      summary.innerHTML =
        '<strong>' + newQty + '</strong> / ' + FOH.escapeHtml(store().ordStockDenominator(i)) + ' · ' +
        FOH.escapeHtml(store().ordUnitText(newQty, l.unit || i.unit));
    }
    if (navigator.vibrate) navigator.vibrate(10);
    if (FOH.ordersView && FOH.ordersView.updateOrderBadge) FOH.ordersView.updateOrderBadge();
  }

  function createQuickRow(i, ar, db) {
    const l = store().ordLine(i.id);
    const row = el('article', 'quick-row' + (l.qty > 0 ? ' has-order' : ''));
    row.dataset.quickrow = i.id;

    row.innerHTML =
      '<button type="button" class="review-edit" aria-label="Edit ' + FOH.escapeHtml(i.name) + '" title="Edit quantity and notes">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/></svg>' +
      '</button>' +
      '<div class="quick-heading">' +
        '<b>' + FOH.escapeHtml(ar && i.ar ? i.ar + ' · ' + i.name : i.name) + '</b>' +
        (i.packSize ? '<small>' + FOH.escapeHtml(i.packSize) + '</small>' : '') +
        '<div class="quick-summary">' +
          '<strong>' + (l.qty || 0) + '</strong> / ' + FOH.escapeHtml(store().ordStockDenominator(i)) + ' · ' +
          FOH.escapeHtml(store().ordUnitText(l.qty, l.unit || i.unit)) +
        '</div>' +
      '</div>' +
      '<div class="quick-stepper">' +
        '<button type="button" data-qminus="' + i.id + '" aria-label="Decrease">−</button>' +
        '<button type="button" data-qplus="' + i.id + '" aria-label="Increase">+</button>' +
      '</div>';

    const editBtn = row.querySelector('.review-edit');
    if (editBtn) editBtn.addEventListener('click', () => ordGo('item/' + i.id));
    const minusBtn = row.querySelector('[data-qminus]');
    if (minusBtn) minusBtn.addEventListener('click', () => updateQuickItemQty(i, -1, row, ar));
    const plusBtn = row.querySelector('[data-qplus]');
    if (plusBtn) plusBtn.addEventListener('click', () => updateQuickItemQty(i, 1, row, ar));

    return row;
  }

  function renderQuickToolbar(root, c, ar) {
    const sess = getSession();
    const isMgr = !sess || !!(sess.isManager || sess.roleId === 'manager');
    const roleKey = FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
    const uname = (sess && sess.username) || '';
    const canEditGroup = store().canUserEditGroup ? store().canUserEditGroup(c.group, { roleKey, username: uname, isManager: isMgr }) : isMgr;

    if (canEditGroup) {
      const toolRow = el('div', 'toolbar-row compact');
      const addBtn = el('button', 'ghost', ar ? '+ صنف جديد' : '+ Add item');
      addBtn.type = 'button';
      addBtn.addEventListener('click', () => {
        if (FOH.ordersSettingsModal && FOH.ordersSettingsModal.openAddItemModal) {
          FOH.ordersSettingsModal.openAddItemModal(c.id, () => {
            if (FOH.ordersView && FOH.ordersView.renderOrdersView) FOH.ordersView.renderOrdersView(root);
          });
        }
      });
      toolRow.append(addBtn);
      root.append(toolRow);
    }
  }

  function renderQuickSearchbar(root, items, ar, onFilter) {
    const searchbar = el('div', 'quick-searchbar');
    searchbar.innerHTML =
      '<div class="search">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
        '<input type="search" placeholder="' + (ar ? 'بحث في الأصناف...' : 'Search items...') + '" value="' + FOH.escapeHtml(quickQuery) + '">' +
      '</div>' +
      '<button type="button" id="quickFilter" class="' + (quickOnlyRequested ? 'primary' : '') + '" aria-pressed="' + quickOnlyRequested + '">' +
        (ar ? 'المطلوب فقط' : 'Requested only') +
      '</button>';

    const inS = searchbar.querySelector('input');
    const btnF = searchbar.querySelector('#quickFilter');

    if (inS) {
      inS.addEventListener('input', () => {
        quickQuery = inS.value;
        onFilter();
      });
    }
    if (btnF) {
      btnF.addEventListener('click', () => {
        quickOnlyRequested = !quickOnlyRequested;
        btnF.classList.toggle('primary', quickOnlyRequested);
        btnF.setAttribute('aria-pressed', String(quickOnlyRequested));
        onFilter();
      });
    }

    root.append(searchbar);
  }

  function renderQuickListMode(root, c, ar) {
    const db = store().getDB();
    const items = store().ordCatItems(c.id);

    renderQuickToolbar(root, c, ar);

    const listHead = el('div', 'list-head');
    root.append(listHead);

    const grid = el('div', 'quick-grid');
    root.append(grid);

    const refreshList = () => {
      const q = (quickQuery || '').toLowerCase().trim();
      const filtered = items.filter((i) => {
        const matchesQ = !q || (i.name + ' ' + (i.ar || '')).toLowerCase().includes(q);
        const matchesR = !quickOnlyRequested || store().ordLine(i.id).qty > 0;
        return matchesQ && matchesR;
      });

      listHead.innerHTML = '<span>' + filtered.length + ' ' + (ar ? 'معروض / ' : 'shown / ') + items.length + ' ' + (ar ? 'أصناف' : 'items') + '</span>';
      grid.replaceChildren();
      filtered.forEach((i) => grid.append(createQuickRow(i, ar, db)));
    };

    renderQuickSearchbar(root, items, ar, refreshList);
    refreshList();

    // Floating bottom bar
    if (FOH.ordersView && FOH.ordersView.appendBottomBar) {
      FOH.ordersView.appendBottomBar(root, (inner) => {
        const revBtn = el('button', 'prev', ar ? 'مراجعة الطلبية' : 'Review order');
        revBtn.type = 'button';
        revBtn.addEventListener('click', () => ordGo('review'));

        const doneBtn = el('button', 'primary', ar ? 'إنهاء التصنيف ←' : 'Done with category →');
        doneBtn.type = 'button';
        doneBtn.addEventListener('click', () => ordGo('complete/' + c.id));

        inner.append(revBtn, doneBtn);
      });
    }
  }

  FOH.ordersViewQuick = {
    renderQuickListMode,
    createQuickRow,
    updateQuickItemQty,
  };
})(window.FOH = window.FOH || {});
