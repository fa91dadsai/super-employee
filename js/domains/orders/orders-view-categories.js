// foh-opening/js/domains/orders/orders-view-categories.js
// Category types selection grid with CEEN 2 design parity
(function (FOH) {
  'use strict';

  const store = () => FOH.ordersStore;
  const { el } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  const getSession = () => ((FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.loadSession() : null));

  function ordGo(route) {
    if (FOH.ordersView && FOH.ordersView.go) FOH.ordersView.go(route);
  }

  function createCategoryCard(c, ar) {
    const list = store().ordCatItems(c.id);
    const done = store().ordCatDone(c.id);
    const skipped = store().ordCatSkipped(c.id);
    const n = list.filter((i) => store().ordLine(i.id).qty > 0).length;
    const isComplete = list.length > 0 && done + skipped === list.length;
    const pct = list.length ? Math.round((100 * done) / list.length) : 0;

    const card = el('button', 'type-card');
    card.type = 'button';
    card.innerHTML =
      '<div class="type-card-main">' +
        '<span class="type-icon">' + (isComplete ? '✓' : '◦') + '</span>' +
        '<div class="type-card-info">' +
          '<b>' + FOH.escapeHtml(ar ? c.nameAr || c.name : c.name) + '</b>' +
          '<small>' + list.length + ' ' + (ar ? 'أصناف' : 'items') + (skipped ? ' · ' + skipped + (ar ? ' تخطي' : ' skipped') : '') + '</small>' +
        '</div>' +
      '</div>' +
      '<div class="type-card-side">' +
        (n > 0 ? '<span class="picked">' + n + ' ' + (ar ? 'مطلوب' : 'ordered') + '</span>' : '') +
        '<span class="type-arrow">' + (ar ? '←' : '→') + '</span>' +
      '</div>' +
      (pct > 0 ? '<div class="progress-rail"><div style="width:' + pct + '%;height:100%;background:var(--gold);border-radius:10px;"></div></div>' : '');

    card.addEventListener('click', () => ordGo('products/' + c.id));
    return card;
  }

  function renderCategoryTypes(root, groupKey) {
    const ar = isAr();
    const db = store().getDB();
    const g = db.catalog.groups[groupKey];
    if (!g) { ordGo('home'); return; }

    if (FOH.ordersView && FOH.ordersView.buildOrdBreadcrumbs) {
      root.append(FOH.ordersView.buildOrdBreadcrumbs(groupKey, null));
    }

    const sess = getSession();
    const isMgr = !sess || !!(sess.isManager || sess.roleId === 'manager');
    const roleKey = FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
    const uname = (sess && sess.username) || '';
    const canEditGroup = store().canUserEditGroup ? store().canUserEditGroup(groupKey, { roleKey, username: uname, isManager: isMgr }) : isMgr;

    const welcome = el('section', 'welcome');
    welcome.style.margin = '4px 0 16px';
    welcome.innerHTML =
      '<div class="kicker">02 / CHOOSE A CATEGORY · ' + (ar ? 'اختر التصنيف' : 'CHOOSE A CATEGORY') + '</div>' +
      '<h1 class="title">' + (ar ? 'ما الذي سنطلبه اليوم؟' : 'What are we ordering?') + '</h1>' +
      '<p class="sub">' + (ar ? 'اختر تصنيفاً من قسم ' + FOH.escapeHtml(g.nameAr || g.name) : 'Pick a category in ' + FOH.escapeHtml(g.name)) + '.</p>';
    root.append(welcome);

    if (canEditGroup) {
      const toolRow = el('div', 'toolbar-row');
      toolRow.style.margin = '0 0 16px';
      const addCatBtn = el('button', 'ghost', ar ? '+ تصنيف جديد' : '+ Add category');
      addCatBtn.type = 'button';
      addCatBtn.addEventListener('click', () => {
        if (FOH.ordersSettingsModal && FOH.ordersSettingsModal.openAddCategoryModal) {
          FOH.ordersSettingsModal.openAddCategoryModal(groupKey, () => {
            if (FOH.ordersView && FOH.ordersView.renderOrdersView) FOH.ordersView.renderOrdersView(root);
          });
        }
      });
      toolRow.append(addCatBtn);
      root.append(toolRow);
    }

    const cats = db.catalog.categories.filter((c) => c.group === groupKey);
    const grid = el('div', 'type-grid');
    cats.forEach((c) => grid.append(createCategoryCard(c, ar)));
    root.append(grid);

    if (FOH.ordersView && FOH.ordersView.appendGeneralBottomBar) {
      FOH.ordersView.appendGeneralBottomBar(root);
    }
  }

  FOH.ordersViewCategories = {
    renderCategoryTypes,
    createCategoryCard,
  };
})(window.FOH = window.FOH || {});

