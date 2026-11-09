// foh-opening/js/domains/orders/orders-view.js
// Warehouse & Bar Ordering Workflow (Router, Facade, Emergency Replenishment & Bottom Nav)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const store = () => FOH.ordersStore;
  const { el } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);

  let ordRoute = 'home'; // 'home' | 'types/<group>' | 'products/<cat>' | 'item/<id>' | 'complete/<cat>' | 'review'

  const ORD_ICONS = {
    bottle: '<svg viewBox="0 0 24 24" aria-hidden="true" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 3h4v5l3 4v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-8l3-4zM7 14h10M10 6h4"/></svg>',
    wine: '<svg viewBox="0 0 24 24" aria-hidden="true" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h10l1 6a6 6 0 0 1-12 0zM12 15v6m-4 0h8M6 8h12"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" aria-hidden="true" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 4C6 2 2 9 5 15s14 7 15-11ZM6 19 16 9m-5 5v-5m0 5h5"/></svg>',
    box: '<svg viewBox="0 0 24 24" aria-hidden="true" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 12v10"/></svg>',
  };

  function getGroupIconSvg(gid, iconKey) {
    if (iconKey === 'wine' || gid === 'wine') return ORD_ICONS.wine;
    if (iconKey === 'leaf' || gid === 'fresh') return ORD_ICONS.leaf;
    if (iconKey === 'box' || gid === 'foh') return ORD_ICONS.box;
    return ORD_ICONS.bottle;
  }

  function updateOrderBadge() {
    const count = store().ordSelectedItems().length;
    const badge = $('badgeOrders');
    if (badge) {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    }
    const lbl = $('ordersTabLbl');
    if (lbl && FOH.i18n && FOH.i18n.t) lbl.textContent = FOH.i18n.t('ordersTab');
  }

  function ordGo(nextRoute) {
    ordRoute = nextRoute || 'home';
    const root = $('ordersView');
    if (root) {
      renderOrdersView(root);
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* Ignore */ }
      }
    }
    if (FOH.bottomBar && FOH.bottomBar.syncBottomBar) FOH.bottomBar.syncBottomBar();
  }

  function buildOrdBreadcrumbs(groupKey, catId, tailLabel) {
    const ar = isAr();
    const nav = el('nav', 'breadcrumbs');
    const arrow = ar ? ' ‹ ' : ' › ';

    const homeBtn = el('button', '', ar ? 'الأقسام' : 'Sections');
    homeBtn.type = 'button';
    homeBtn.addEventListener('click', () => ordGo('home'));
    nav.append(homeBtn);

    const db = store().getDB();
    if (groupKey && db.catalog.groups[groupKey]) {
      nav.append(el('span', 'breadcrumb-sep', arrow));
      const g = db.catalog.groups[groupKey];
      const gBtn = el('button', '', ar ? g.nameAr || g.name : g.name);
      gBtn.type = 'button';
      gBtn.addEventListener('click', () => ordGo('types/' + groupKey));
      nav.append(gBtn);
    }
    if (catId && store().ordCat(catId)) {
      nav.append(el('span', 'breadcrumb-sep', arrow));
      const c = store().ordCat(catId);
      const isCurrent = !tailLabel;
      const cBtn = el('button', isCurrent ? 'crumb-active' : '', ar ? c.nameAr || c.name : c.name);
      cBtn.type = 'button';
      cBtn.setAttribute('aria-current', isCurrent ? 'page' : 'false');
      cBtn.addEventListener('click', () => ordGo('products/' + catId));
      nav.append(cBtn);
    }
    if (tailLabel) {
      nav.append(el('span', 'breadcrumb-sep', arrow), el('span', 'breadcrumb-tail', tailLabel));
    }
    return nav;
  }

  function buildOrdViewSwitch(catId, activeMode) {
    const sw = el('div', 'view-switch');
    const stepBtn = el('button', activeMode === 'step' ? 'on' : '', isAr() ? '▣ صنفاً بصنف' : '▣ Step-by-step');
    stepBtn.type = 'button';
    stepBtn.addEventListener('click', () => {
      store().getDB().preferences.viewMode = 'step';
      store().saveOrdersDB();
      const pending = store().ordPendingItem(catId) || store().ordCatItems(catId)[0];
      ordGo(pending ? 'item/' + pending.id : 'products/' + catId);
    });

    const listBtn = el('button', activeMode === 'list' ? 'on' : '', isAr() ? '☷ القائمة السريعة' : '☷ Quick list');
    listBtn.type = 'button';
    listBtn.addEventListener('click', () => {
      store().getDB().preferences.viewMode = 'list';
      store().saveOrdersDB();
      ordGo('products/' + catId);
    });

    sw.append(stepBtn, listBtn);
    return sw;
  }

  function appendBottomBar(root, buildFn) {
    const bar = el('nav', 'bottom');
    const inner = el('div', 'bottom-inner');
    buildFn(inner);
    bar.append(inner);
    root.append(bar);
  }

  function appendGeneralBottomBar() {
    // Redundant floating bar eliminated: #tabBar provides live Cart 🛒 and review routing
  }

  function createReplenishTile(it, dept, ar, drawerRef) {
    const tile = el('button', 'cockpit-replenish-tile');
    tile.type = 'button';
    const status = store().canQuickReplenish(it.id, dept);
    const inCooldown = !status.allowed;
    if (inCooldown) tile.classList.add('in-cooldown');

    const itName = ar ? (it.labelAr || it.ar || it.name) : (it.label || it.name);
    const badgeText = inCooldown
      ? (ar ? '🚀 بالطريق (' + Math.ceil(status.cooldownRemainingSec / 60) + 'د) · +1' : '🚀 En Route (' + Math.ceil(status.cooldownRemainingSec / 60) + 'm) · +1')
      : (ar ? '⚡ طلب سريع +' + (it.defaultQty || 1) : '⚡ Quick Order +' + (it.defaultQty || 1));

    tile.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;width:100%;">' +
      '<b style="font-size:0.86rem;color:var(--ink);">' + FOH.escapeHtml(itName) + '</b>' +
      (status.currentQty > 0 ? '<span style="font-size:0.75rem;font-weight:700;color:var(--accent);">' + status.currentQty + ' ' + (it.unit || '') + '</span>' : '') +
      '</div>' +
      '<small style="font-size:0.72rem;color:' + (inCooldown ? '#d97706' : 'var(--muted)') + ';">' + badgeText + '</small>';

    tile.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(15);
      const res = store().quickReplenishItem(it.id, dept, it.defaultQty || 1);
      if (res.success) {
        const msg = ar ? '📦 تم طلب ' + (it.labelAr || it.name) + ' (' + res.newQty + ')' : '📦 ' + it.name + ' ordered (' + res.newQty + ')';
        if (FOH.edit && FOH.edit.toast) FOH.edit.toast(msg);
        renderQuickReplenishDrawer(drawerRef && drawerRef.parentElement, dept);
      }
    });
    return tile;
  }

  function renderQuickReplenishDrawer(container, targetDept) {
    if (!container) return;
    const ar = isAr();
    const dept = targetDept || ((FOH.modeDeptPanels && FOH.modeDeptPanels.getActiveDept) ? FOH.modeDeptPanels.getActiveDept() : 'floor');
    const items = (FOH.ordersCatalog && FOH.ordersCatalog.getQuickReplenishItems) ? FOH.ordersCatalog.getQuickReplenishItems(dept) : [];
    if (!items.length) return;

    let drawer = $('cockpitQuickDrawer');
    if (!drawer) {
      drawer = el('section', 'cockpit-quick-drawer run-only');
      drawer.id = 'cockpitQuickDrawer';
      container.append(drawer);
    }
    drawer.replaceChildren();

    const head = el('div', 'cockpit-drawer-head');
    head.innerHTML = '<span style="font-weight:800;font-size:0.9rem;">⚡ ' +
      (ar ? 'الإمداد السريع للمحطة' : 'Station Emergency Replenishment') + '</span>';
    drawer.append(head);

    const grid = el('div', 'cockpit-replenish-grid');
    items.forEach((it) => grid.append(createReplenishTile(it, dept, ar, drawer)));
    drawer.append(grid);
  }

  function renderCategoryProducts(root, catId) {
    const ar = isAr();
    const db = store().getDB();
    const c = store().ordCat(catId);
    if (!c) { ordGo('home'); return; }

    const viewMode = (db.preferences && db.preferences.viewMode) || 'list';
    const itemsCount = store().ordCatItems(c.id).length;
    const catTitle = ar ? c.nameAr || c.name : c.name;

    // Category Breadcrumbs Top Header (in normal flow, frees upper viewport on scroll)
    const catHead = el('header', 'ord-cat-breadcrumbs-top');
    catHead.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;gap:8px;' +
      'margin:0 0 6px;padding:4px 0;';

    const bNav = buildOrdBreadcrumbs(c.group, c.id);
    bNav.style.cssText = 'margin:0;font-size:0.82rem;display:flex;align-items:center;flex-wrap:wrap;gap:4px;';

    const badge = el('span', 'ord-cat-count-pill', itemsCount + ' ' + (ar ? 'أصناف' : 'items'));
    badge.style.cssText = 'font-size:0.75rem;font-weight:700;color:var(--muted);background:var(--soft);padding:3px 9px;border-radius:12px;white-space:nowrap;';

    catHead.append(bNav, badge);
    root.append(catHead);

    const switchWrap = buildOrdViewSwitch(c.id, viewMode);
    switchWrap.style.cssText = 'margin:0 0 8px;';
    root.append(switchWrap);

    if (viewMode === 'list' && FOH.ordersViewQuick) {
      FOH.ordersViewQuick.renderQuickListMode(root, c, ar);
    } else if (FOH.ordersViewStep) {
      FOH.ordersViewStep.renderCategoryStepList(root, c, ar);
    }

    // Docked Thumb Navigation Bar at the Bottom (Docked above Tab Bar for easy 1-handed reach)
    const bottomNav = el('nav', 'ord-bottom-nav-bar');
    bottomNav.setAttribute('aria-label', ar ? 'التنقل السريع بين الأقسام' : 'Quick Category Navigation');

    const navLinks = el('div', 'ord-bottom-nav-links');
    const homeBtn = el('button', 'ord-bottom-nav-btn', ar ? '⌂ الأقسام' : '⌂ Sections');
    homeBtn.type = 'button';
    homeBtn.addEventListener('click', () => ordGo('home'));

    const g = db.catalog.groups[c.group];
    const groupName = ar ? (g && g.nameAr ? g.nameAr : g ? g.name : 'القسم') : (g ? g.name : 'Group');
    const groupBtn = el('button', 'ord-bottom-nav-btn', (ar ? '‹ ' : '‹ ') + groupName);
    groupBtn.type = 'button';
    groupBtn.addEventListener('click', () => ordGo('types/' + c.group));

    navLinks.append(homeBtn, groupBtn);

    const catPill = el('div', 'ord-bottom-nav-current');
    catPill.innerHTML = '<b>' + FOH.escapeHtml(catTitle) + '</b> <small>(' + itemsCount + ')</small>';

    bottomNav.append(navLinks, catPill);
    root.append(bottomNav);
  }

  function renderOrdersView(root) {
    if (!root) return;
    root.replaceChildren();
    root.classList.add('ord-ceen-scope');

    const [page, param] = (ordRoute || 'home').split('/');
    if (page === 'home' && FOH.ordersViewHome) FOH.ordersViewHome.renderHomeGroups(root);
    else if (page === 'types' && FOH.ordersViewCategories) FOH.ordersViewCategories.renderCategoryTypes(root, param);
    else if (page === 'products') renderCategoryProducts(root, param);
    else if (page === 'item' && FOH.ordersViewStep) FOH.ordersViewStep.renderItemStepperCard(root, param);
    else if (page === 'complete' && FOH.ordersViewReview) FOH.ordersViewReview.renderCategoryComplete(root, param);
    else if (page === 'review' && FOH.ordersViewReview) FOH.ordersViewReview.renderOrderReview(root);
    else if (FOH.ordersViewHome) FOH.ordersViewHome.renderHomeGroups(root);

    updateOrderBadge();
  }

  FOH.ordersView = {
    renderOrdersView,
    updateOrderBadge,
    go: ordGo,
    ordGo,
    getRoute: () => ordRoute,
    getGroupIconSvg,
    buildOrdBreadcrumbs,
    buildOrdViewSwitch,
    appendBottomBar,
    appendGeneralBottomBar,
    createReplenishTile,
    renderQuickReplenishDrawer,
    get ORD_SEED() {
      return (FOH.ordersCatalog && FOH.ordersCatalog.ORD_SEED) || {};
    },
  };

  FOH.erpPwa = FOH.ordersView;
  FOH.renderOrdersView = renderOrdersView;
  FOH.updateOrderBadge = updateOrderBadge;
})(window.FOH = window.FOH || {});
