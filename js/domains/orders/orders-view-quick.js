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

  function formatStockSummaryHtml(qty, i, l) {
    const denom = FOH.escapeHtml(store().ordStockDenominator(i));
    const unitText = FOH.escapeHtml(store().ordUnitText(qty, l.unit || i.unit));
    return '<strong>' + qty + '</strong> / ' + denom + ' · ' + unitText;
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
      summary.innerHTML = formatStockSummaryHtml(newQty, i, l);
    }
    if (navigator.vibrate) navigator.vibrate(10);
    if (FOH.ordersView && FOH.ordersView.updateOrderBadge) FOH.ordersView.updateOrderBadge();
  }

  function createQuickRow(i, ar, db) {
    const l = store().ordLine(i.id);
    const row = el('article', 'quick-row' + (l.qty > 0 ? ' has-order' : ''));
    row.dataset.quickrow = i.id;

    const titleMarkup = ar && i.ar
      ? '<bdi>' + FOH.escapeHtml(i.ar) + '</bdi> <span class="dot-sep" style="opacity:0.4;">·</span> <bdi dir="ltr">' + FOH.escapeHtml(i.name) + '</bdi>'
      : FOH.escapeHtml(i.name);

    row.innerHTML =
      '<button type="button" class="review-edit" aria-label="Edit ' + FOH.escapeHtml(i.name) + '" title="Edit quantity and notes">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/></svg>' +
      '</button>' +
      '<div class="quick-heading">' +
        '<b>' + titleMarkup + '</b>' +
        (i.packSize ? '<small>' + FOH.escapeHtml(i.packSize) + '</small>' : '') +
        '<div class="quick-summary">' +
          formatStockSummaryHtml(l.qty || 0, i, l) +
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

  function renderQuickSearchbar(root, c, items, ar, onFilter) {
    const sess = getSession();
    const isMgr = !sess || !!(sess.isManager || sess.roleId === 'manager');
    const roleKey = FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
    const uname = (sess && sess.username) || '';
    const canEditGroup = store().canUserEditGroup ? store().canUserEditGroup(c.group, { roleKey, username: uname, isManager: isMgr }) : isMgr;

    const searchbar = el('div', 'quick-searchbar compact');
    searchbar.style.cssText = 'display:flex;align-items:center;gap:6px;margin:0 0 10px;padding:0;';
    searchbar.innerHTML =
      '<div class="search" style="flex:1;min-width:0;margin:0;">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
        '<input type="search" placeholder="' + (ar ? 'بحث بالاسم...' : 'Search item...') + '" value="' + FOH.escapeHtml(quickQuery) + '" style="font-size:0.85rem;height:44px;">' +
      '</div>' +
      '<button type="button" id="quickFilter" class="' + (quickOnlyRequested ? 'primary' : '') + '" aria-pressed="' + quickOnlyRequested + '" style="font-size:0.75rem;padding:8px 14px;min-height:44px;white-space:nowrap;border-radius:12px;">' +
        (ar ? 'المطلوب' : 'Requested') +
      '</button>';

    if (canEditGroup) {
      const addBtn = el('button', 'ghost', ar ? '+ صنف' : '+ Add');
      addBtn.type = 'button';
      addBtn.style.cssText = 'font-size:0.75rem;padding:8px 14px;min-height:44px;white-space:nowrap;border-radius:12px;border:1px dashed var(--line);';
      addBtn.addEventListener('click', () => {
        if (FOH.ordersSettingsModal && FOH.ordersSettingsModal.openAddItemModal) {
          FOH.ordersSettingsModal.openAddItemModal(c.id, () => {
            if (FOH.ordersView && FOH.ordersView.renderOrdersView) FOH.ordersView.renderOrdersView(root);
          });
        }
      });
      searchbar.append(addBtn);
    }

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

    const grid = el('div', 'quick-grid');
    const refreshList = () => {
      const q = (quickQuery || '').toLowerCase().trim();
      const filtered = items.filter((i) => {
        const matchesQ = !q || (i.name + ' ' + (i.ar || '')).toLowerCase().includes(q);
        const matchesR = !quickOnlyRequested || store().ordLine(i.id).qty > 0;
        return matchesQ && matchesR;
      });
      grid.replaceChildren();
      filtered.forEach((i) => grid.append(createQuickRow(i, ar, db)));
    };

    renderQuickSearchbar(root, c, items, ar, refreshList);
    root.append(grid);
    refreshList();

    // Natural inline list footer: never fixed or occluding tab bar
    const foot = el('div', 'quick-list-footer');
    foot.style.cssText = 'padding:16px 4px 12px;text-align:center;';
    const doneBtn = el('button', 'primary', ar ? 'إنهاء التصنيف ومراجعة الطلبية ←' : 'Done with category & review →');
    doneBtn.type = 'button';
    doneBtn.style.cssText = 'width:100%;max-width:440px;min-height:48px;font-weight:700;font-size:0.95rem;border-radius:14px;box-shadow:0 4px 14px rgba(16,185,129,0.3);';
    doneBtn.addEventListener('click', () => ordGo('complete/' + c.id));
    foot.append(doneBtn);
    root.append(foot);
  }

  FOH.ordersViewQuick = {
    renderQuickListMode,
    createQuickRow,
    updateQuickItemQty,
  };
})(window.FOH = window.FOH || {});
