// foh-opening/js/domains/orders/orders-view.js
// Warehouse & Bar Ordering Workflow (Item Selection, Stock Tally & WhatsApp Dispatch)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const store = () => FOH.ordersStore;
  const dispatch = () => FOH.ordersDispatch;
  const { el } = FOH.view;

  let ordRoute = 'home'; // 'home' | 'types/<group>' | 'products/<cat>' | 'item/<id>' | 'complete/<cat>' | 'review'
  let ordForceAllGroups = false;
  let ordProductSearch = '';
  let ordQuickSearch = '';
  let ordQuickOnlyRequested = false;
  let ordReturnToReview = false;
  let ordIncludeStockInMsg = false;

  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  const getSession = () => ((FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.getSession() : null));

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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function buildOrdBreadcrumbs(groupKey, catId, tailLabel) {
    const ar = isAr();
    const nav = el('nav', 'ord-crumbs');
    const homeBtn = el('button', '', ar ? 'الأقسام (Sections)' : 'Sections');
    homeBtn.type = 'button';
    homeBtn.addEventListener('click', () => ordGo('home'));
    nav.append(homeBtn);

    const db = store().getDB();
    if (groupKey && db.catalog.groups[groupKey]) {
      nav.append(el('span', '', '›'));
      const g = db.catalog.groups[groupKey];
      const gBtn = el('button', '', ar ? g.nameAr || g.name : g.name);
      gBtn.type = 'button';
      gBtn.addEventListener('click', () => ordGo('types/' + groupKey));
      nav.append(gBtn);
    }
    if (catId && store().ordCat(catId)) {
      nav.append(el('span', '', '›'));
      const c = store().ordCat(catId);
      const cBtn = el('button', '', ar ? c.nameAr || c.name : c.name);
      cBtn.type = 'button';
      cBtn.addEventListener('click', () => ordGo('products/' + catId));
      nav.append(cBtn);
    }
    if (tailLabel) {
      nav.append(el('span', '', '›'), el('span', '', tailLabel));
    }
    return nav;
  }

  function buildOrdViewSwitch(catId, activeMode) {
    const sw = el('div', 'ord-view-switch');
    const stepBtn = el('button', activeMode === 'step' ? 'on' : '', isAr() ? '▣ صنفًا بصنف (Step-by-step)' : '▣ Step-by-step');
    stepBtn.type = 'button';
    stepBtn.addEventListener('click', () => {
      const db = store().getDB();
      db.preferences.viewMode = 'step';
      store().saveOrdersDB();
      const pending = store().ordPendingItem(catId) || store().ordCatItems(catId)[0];
      ordGo(pending ? 'item/' + pending.id : 'products/' + catId);
    });

    const listBtn = el('button', activeMode === 'list' ? 'on' : '', isAr() ? '☷ القائمة السريعة (Quick list)' : '☷ Quick list');
    listBtn.type = 'button';
    listBtn.addEventListener('click', () => {
      const db = store().getDB();
      db.preferences.viewMode = 'list';
      store().saveOrdersDB();
      ordGo('products/' + catId);
    });

    sw.append(stepBtn, listBtn);
    return sw;
  }

  function appendBottomBar(root, buildFn) {
    const bar = el('nav', 'ord-bottom-bar');
    const inner = el('div', 'ord-bottom-inner');
    buildFn(inner);
    bar.append(inner);
    root.append(bar);
    root.style.paddingBottom = 'calc(146px + env(safe-area-inset-bottom, 16px))';
  }

  function appendGeneralBottomBar(root) {
    const selectedList = store().ordSelectedItems();
    appendBottomBar(root, (inner) => {
      const info = el('div', '');
      info.style.minWidth = '110px';
      info.append(
        el('strong', '', String(selectedList.length) + ' '),
        el('small', '', isAr() ? 'أصناف مختارة' : 'selected')
      );
      const revBtn = el('button', 'btn primary', isAr() ? 'مراجعة الطلبية الكاملة ←' : 'Review full order →');
      revBtn.type = 'button';
      revBtn.disabled = selectedList.length === 0;
      revBtn.addEventListener('click', () => ordGo('review'));
      inner.append(info, revBtn);
    });
  }

  // ---- Page 1: Home Groups ----
  function renderHomeGroups(root) {
    const ar = isAr();
    const db = store().getDB();
    const selectedList = store().ordSelectedItems();

    const headWrap = el('div', '');
    const topRow = el('div', '');
    topRow.style.display = 'flex';
    topRow.style.alignItems = 'center';
    topRow.style.justifyContent = 'space-between';
    topRow.style.gap = '8px';
    topRow.style.flexWrap = 'wrap';

    const kicker = el('div', 'ord-kicker', '01 / SECTION SELECT · أقسام الطلبيات');
    const startNewBtn = el('button', 'btn small', ar ? '✨ بدء طلبية جديدة' : '✨ Start new order');
    startNewBtn.type = 'button';
    startNewBtn.addEventListener('click', () => {
      store().promptStartNewOrder(() => renderOrdersView(root));
    });
    topRow.append(kicker, startNewBtn);

    headWrap.append(
      topRow,
      el('h2', 'ord-page-title', ar ? 'طلبيات البار ومستلزمات الصالة' : 'Bar & FOH Warehouse Orders'),
      el('p', 'ord-page-sub', ar ? 'اختر القسم المطلوب لإعداد طلبيته وتحديد الكميات المطلوبة للمستودع:' : 'Select a section to prepare warehouse requisition:')
    );
    root.append(headWrap);

    const secCards = el('div', 'ord-sec-grid');
    const allowed = store().allowedGroupsForCurrentRole(ordForceAllGroups);

    allowed.forEach(([gid, g]) => {
      const cats = db.catalog.categories.filter((c) => c.group === gid);
      const catCount = cats.length;
      let totalItems = 0;
      let doneItems = 0;
      let reqCount = 0;

      cats.forEach((c) => {
        const cItems = store().ordCatItems(c.id);
        totalItems += cItems.length;
        doneItems += store().ordCatDone(c.id);
        reqCount += cItems.filter((i) => store().ordLine(i.id).qty > 0).length;
      });

      const btn = el('button', 'ord-sec-card');
      btn.type = 'button';
      btn.append(
        el('div', 'ord-sec-ico', g.icon || '📦'),
        Object.assign(el('div', 'ord-sec-body'), {
          innerHTML:
            '<h3>' + FOH.escapeHtml(ar ? g.nameAr || g.name : g.name) + '</h3>' +
            '<p>' + FOH.escapeHtml(ar ? g.subAr || g.sub : g.sub) + '</p>' +
            '<div class="ord-sec-meta"><span>' + catCount + ' ' + (ar ? 'تصنيفات' : 'categories') + ' · ' + totalItems + ' ' + (ar ? 'أصناف' : 'items') + '</span>' +
            (reqCount > 0 ? '<strong class="ord-req-chip">✓ ' + reqCount + ' ' + (ar ? 'مطلوب' : 'requested') + '</strong>' : '') +
            '</div>',
        })
      );
      btn.addEventListener('click', () => ordGo('types/' + gid));
      secCards.append(btn);
    });

    root.append(secCards);
    appendGeneralBottomBar(root);
  }

  // ---- Page 2: Types in Group ----
  function renderCategoryTypes(root, groupKey) {
    const ar = isAr();
    const db = store().getDB();
    const g = db.catalog.groups[groupKey];
    if (!g) { ordGo('home'); return; }

    root.append(buildOrdBreadcrumbs(groupKey, null));
    root.append(
      el('div', 'ord-kicker', '02 / CATEGORY · تصنيفات القسم'),
      el('h2', 'ord-page-title', ar ? g.nameAr || g.name : g.name),
      el('p', 'ord-page-sub', ar ? 'اختر تصنيفًا للبدء بفحصه وتحديد الكميات المطلوبة:' : 'Pick a category to check and order items:')
    );

    const cats = db.catalog.categories.filter((c) => c.group === groupKey);
    const grid = el('div', 'ord-cat-grid');

    cats.forEach((c) => {
      const items = store().ordCatItems(c.id);
      const done = store().ordCatDone(c.id);
      const skipped = store().ordCatSkipped(c.id);
      const req = items.filter((i) => store().ordLine(i.id).qty > 0).length;
      const isComplete = items.length > 0 && done + skipped >= items.length;

      const card = el('button', 'ord-cat-card' + (isComplete ? ' complete' : ''));
      card.type = 'button';
      card.append(
        el('h4', '', ar ? c.nameAr || c.name : c.name),
        el('div', 'ord-cat-stat', `${items.length} ${ar ? 'أصناف' : 'items'} · ${done} ${ar ? 'تم فحصها' : 'done'}`),
        req > 0 ? el('span', 'ord-req-badge', `+${req} ${ar ? 'مطلوب' : 'picked'}`) : el('span', 'ord-req-badge zero', isComplete ? '✓ ' + (ar ? 'مكتمل' : 'done') : '—')
      );
      card.addEventListener('click', () => ordGo('products/' + c.id));
      grid.append(card);
    });

    root.append(grid);
    appendGeneralBottomBar(root);
  }

  // ---- Page 3: Products in Category ----
  function renderCategoryProducts(root, catId) {
    const ar = isAr();
    const db = store().getDB();
    const c = store().ordCat(catId);
    if (!c) { ordGo('home'); return; }

    const viewMode = (db.preferences && db.preferences.viewMode) || 'step';
    root.append(buildOrdBreadcrumbs(c.group, c.id));
    root.append(
      el('div', 'ord-kicker', '03 / PRODUCTS · قائمة الأصناف'),
      el('h2', 'ord-page-title', ar ? c.nameAr || c.name : c.name),
      buildOrdViewSwitch(c.id, viewMode)
    );

    const items = store().ordCatItems(c.id);
    if (viewMode === 'step') {
      renderStepModeList(root, c, items, ar);
    } else {
      renderQuickListMode(root, c, items, ar);
    }
  }

  function renderStepModeList(root, c, opts = {}) {
    const isLegacy = Array.isArray(opts);
    const items = isLegacy ? opts : ((opts && opts.items) || store().ordCatItems(c.id));
    const ar = isLegacy ? !!arguments[3] : (opts && typeof opts.ar === 'boolean' ? opts.ar : isAr());
    const db = store().getDB();
    const listWrap = el('div', 'ord-step-list');
    items.forEach((i, idx) => {
      const line = store().ordLine(i.id);
      const isVisited = !!db.order.visited[i.id];
      const isSkipped = !!db.order.skipped[i.id];

      const row = el('button', 'ord-step-row' + (isVisited ? ' visited' : isSkipped ? ' skipped' : ''));
      row.type = 'button';
      row.append(
        el('span', 'ord-step-num', String(idx + 1)),
        Object.assign(el('div', 'ord-step-info'), {
          innerHTML: '<strong>' + FOH.escapeHtml(ar && i.ar ? i.ar + ' · ' + i.name : i.name) + '</strong>' +
            '<small>' + FOH.escapeHtml(ar ? 'المخزون المسجّل: ' : 'Recorded stock: ') + store().ordStockLabel(i) + '</small>',
        }),
        el('span', 'ord-step-status', line.qty > 0 ? `+${line.qty} ${store().ordUnitText(line.qty, line.unit || i.unit)}` : isSkipped ? (ar ? 'تخطي' : 'skip') : isVisited ? '✓' : '—')
      );
      row.addEventListener('click', () => ordGo('item/' + i.id));
      listWrap.append(row);
    });
    root.append(listWrap);
    appendGeneralBottomBar(root);
  }

  function createQuickItemCard(i, db, ar) {
    const line = store().ordLine(i.id);
    const card = el('div', 'ord-quick-card' + (line.qty > 0 ? ' ordered' : ''));

    const head = el('div', 'ord-quick-head');
    head.append(
      Object.assign(el('div', ''), {
        innerHTML: '<b>' + FOH.escapeHtml(ar && i.ar ? i.ar + ' · ' + i.name : i.name) + '</b>' +
          '<small style="display:block;color:var(--ink2);">' + (ar ? 'المخزون: ' : 'Stock: ') + store().ordStockLabel(i) + '</small>',
      })
    );

    const stepper = el('div', 'ord-stepper-sm');
    const minus = el('button', '', '−');
    minus.type = 'button';
    const inVal = el('input', '');
    inVal.type = 'number';
    inVal.min = '0';
    inVal.max = '9999';
    inVal.value = String(line.qty || 0);

    const plus = el('button', '', '+');
    plus.type = 'button';

    const updateQty = (delta, direct) => {
      const cur = direct !== undefined ? Math.max(0, direct) : Math.max(0, Number(inVal.value || 0) + delta);
      inVal.value = String(cur);
      db.order.lines[i.id] = { ...line, qty: cur };
      db.order.visited[i.id] = true;
      store().saveOrdersDB();
      card.classList.toggle('ordered', cur > 0);
    };

    minus.addEventListener('click', () => updateQty(-1));
    plus.addEventListener('click', () => updateQty(1));
    inVal.addEventListener('change', () => updateQty(0, Number(inVal.value || 0)));

    stepper.append(minus, inVal, plus);
    card.append(head, stepper);
    return card;
  }

  function renderQuickListMode(root, c, opts = {}) {
    const isLegacy = Array.isArray(opts);
    const items = isLegacy ? opts : ((opts && opts.items) || store().ordCatItems(c.id));
    const ar = isLegacy ? !!arguments[3] : (opts && typeof opts.ar === 'boolean' ? opts.ar : isAr());
    const db = store().getDB();

    const toolbar = el('div', 'ord-toolbar');
    const qSearch = el('input', 'in ord-search-in');
    qSearch.placeholder = ar ? '🔍 تصفية في هذا التصنيف...' : '🔍 Search in this category...';
    qSearch.value = ordQuickSearch;
    qSearch.addEventListener('input', () => {
      ordQuickSearch = qSearch.value;
      renderOrdersView(root);
    });

    const skipRemBtn = el('button', 'btn small', ar ? '⏭ تخطي المتبقي' : '⏭ Skip rest');
    skipRemBtn.type = 'button';
    skipRemBtn.addEventListener('click', () => {
      store().ordSkipRemaining(c.id);
      store().saveOrdersDB();
      ordGo('complete/' + c.id);
    });
    toolbar.append(qSearch, skipRemBtn);
    root.append(toolbar);

    const qFilter = (ordQuickSearch || '').toLowerCase().trim();
    const visible = items.filter((i) => !qFilter || (i.name + ' ' + (i.ar || '')).toLowerCase().includes(qFilter));

    const grid = el('div', 'ord-quick-grid');
    visible.forEach((i) => grid.append(createQuickItemCard(i, db, ar)));
    root.append(grid);
    appendGeneralBottomBar(root);
  }

  // ---- Page 4: Single Item Stepper Card ----
  function buildItemStepperControls(card, i, opts = {}) {
    const isLegacy = typeof opts === 'object' && ('qty' in opts);
    const line = isLegacy ? opts : ((opts && opts.line) || store().ordLine(i.id));
    const root = isLegacy ? arguments[3] : (opts && opts.root);
    const ar = isAr();
    const db = store().getDB();
    const qtyRow = el('div', 'ord-qty-row');
    const stepper = el('div', 'ord-stepper-lg');
    const minus = el('button', '', '−');
    minus.type = 'button';
    const qtyIn = el('input', '');
    qtyIn.type = 'number';
    qtyIn.min = '0';
    qtyIn.max = '9999';
    qtyIn.value = String(line.qty);

    const denom = el('span', 'ord-denom');
    denom.append('/ ', el('b', '', store().ordStockDenominator(i)));
    const plus = el('button', '', '+');
    plus.type = 'button';
    stepper.append(minus, qtyIn, denom, plus);

    const unitSel = el('select', 'in ord-unit-sel');
    const units = (FOH.ordersCatalog && FOH.ordersCatalog.ORD_UNITS) || {};
    Object.entries(units).forEach(([uk, uLabel]) => {
      const opt = el('option', '', uLabel);
      opt.value = uk;
      opt.selected = uk === (line.unit || i.unit || 'bottle');
      unitSel.append(opt);
    });
    qtyRow.append(stepper, unitSel);
    card.append(qtyRow);

    const commitQty = (val) => {
      const q = Math.max(0, Number(val || 0));
      db.order.lines[i.id] = { ...line, qty: q, unit: unitSel.value };
      db.order.visited[i.id] = true;
      delete db.order.skipped[i.id];
      store().saveOrdersDB();
    };

    minus.addEventListener('click', () => {
      const cur = Math.max(0, Number(qtyIn.value || 0) - 1);
      qtyIn.value = String(cur);
      commitQty(cur);
    });
    plus.addEventListener('click', () => {
      const cur = Number(qtyIn.value || 0) + 1;
      qtyIn.value = String(cur);
      commitQty(cur);
    });
    qtyIn.addEventListener('change', () => commitQty(qtyIn.value));
    unitSel.addEventListener('change', () => commitQty(qtyIn.value));

    return { commitQty, qtyIn };
  }

  function buildItemStepperNav(opts) {
    const { card, i, catItems, curIdx, c, commitFn, qtyIn } = opts;
    const ar = isAr();
    const db = store().getDB();
    const actRow = el('div', 'ord-item-nav');
    if (curIdx > 0) {
      const prevBtn = el('button', 'btn', ar ? '← السابق' : '← Previous');
      prevBtn.type = 'button';
      prevBtn.addEventListener('click', () => ordGo('item/' + catItems[curIdx - 1].id));
      actRow.append(prevBtn);
    }

    const skipBtn = el('button', 'btn', ar ? 'تخطي الصنف' : 'Skip item');
    skipBtn.type = 'button';
    skipBtn.addEventListener('click', () => {
      db.order.skipped[i.id] = true;
      store().saveOrdersDB();
      navigateNextItem(catItems, curIdx, c);
    });

    const nextBtn = el('button', 'btn primary', ar ? 'التالي →' : 'Next →');
    nextBtn.type = 'button';
    nextBtn.addEventListener('click', () => {
      commitFn(qtyIn.value);
      navigateNextItem(catItems, curIdx, c);
    });

    actRow.append(skipBtn, nextBtn);
    card.append(actRow);
  }

  function renderItemStepperCard(root, itemId) {
    const ar = isAr();
    const i = store().ordById(itemId);
    if (!i) { ordGo('home'); return; }

    const c = store().ordCat(i.cat);
    const line = store().ordLine(i.id);
    const catItems = store().ordCatItems(i.cat);
    const curIdx = catItems.findIndex((it) => it.id === i.id);

    root.append(buildOrdBreadcrumbs(c ? c.group : null, c ? c.id : null, i.name));

    const card = el('section', 'card ord-stepper-card');
    const head = el('div', 'ord-item-head');
    head.append(
      Object.assign(el('div', 'ord-item-Title'), {
        innerHTML: '<small>' + FOH.escapeHtml(ar && c ? c.nameAr || c.name : (c ? c.name : '')) + '</small>' +
          '<h3>' + FOH.escapeHtml(ar && i.ar ? i.ar + ' · ' + i.name : i.name) + '</h3>' +
          '<small>' + FOH.escapeHtml(i.packSize || i.id.toUpperCase()) + '</small>',
      })
    );
    card.append(head);

    const stockBox = el('div', 'ord-stock-panel');
    const stockLeft = el('div', '');
    stockLeft.append(
      el('b', '', ar ? 'المخزون المسجّل' : 'Recorded stock'),
      el('small', '', ar ? 'مؤكد في الجرد' : 'Confirmed stock')
    );
    const editBtn = el('button', 'btn small', '✎ ' + (ar ? 'تحديث المخزون' : 'Edit stock'));
    editBtn.type = 'button';
    editBtn.addEventListener('click', () => {
      store().promptEditStock(i, () => renderOrdersView(root));
    });
    stockLeft.append(editBtn);

    const stockRight = el('div', 'ord-stock-val', store().ordStockLabel(i));
    stockBox.append(stockLeft, stockRight);
    card.append(stockBox);

    const { commitQty, qtyIn } = buildItemStepperControls(card, i, line, root);
    buildItemStepperNav({ card, i, catItems, curIdx, c, commitFn: commitQty, qtyIn });

    root.append(card);
    appendGeneralBottomBar(root);
  }

  function navigateNextItem(catItems, curIdx, c) {
    if (ordReturnToReview) {
      ordReturnToReview = false;
      ordGo('review');
      return;
    }
    if (curIdx < catItems.length - 1) {
      ordGo('item/' + catItems[curIdx + 1].id);
    } else {
      ordGo('complete/' + (c ? c.id : ''));
    }
  }

  // ---- Page 5: Category Complete ----
  function renderCategoryComplete(root, catId) {
    const ar = isAr();
    const c = store().ordCat(catId);
    if (!c) { ordGo('home'); return; }

    const list = store().ordCatItems(c.id);
    const done = store().ordCatDone(c.id);
    const skipped = store().ordCatSkipped(c.id);
    const pending = store().ordPendingItem(c.id);
    const reqCount = list.filter((i) => store().ordLine(i.id).qty > 0).length;

    root.append(buildOrdBreadcrumbs(c.group, c.id));
    const box = el('section', 'card');
    box.style.padding = '18px';
    box.style.textAlign = 'center';
    box.append(
      el('div', '', '✅'),
      el('h2', 'ord-page-title', pending ? (ar ? 'تم حفظ كمياتك' : 'Quantities saved') : (ar ? 'اكتمل فحص الكاتيجوري' : 'Category complete')),
      el('p', 'ord-page-sub', ar ? 'تم حفظ الأصناف المطلوبة. يمكنك مراجعة الطلبية أو اختيار قسم آخر.' : 'Requested items saved. Review order or choose another section.')
    );

    const stats = el('div', 'ord-stats-grid');
    [
      [reqCount, ar ? 'أصناف مطلوبة' : 'Requested items'],
      [done, ar ? 'تم فحصها' : 'Checked'],
      [skipped, ar ? 'تم تخطيها' : 'Skipped'],
    ].forEach(([val, lbl]) => {
      const s = el('div', 'ord-stat-box');
      s.append(el('strong', '', String(val)), el('span', '', lbl));
      stats.append(s);
    });
    box.append(stats);

    const actCol = el('div', '');
    actCol.style.display = 'flex';
    actCol.style.flexDirection = 'column';
    actCol.style.gap = '8px';

    const revBtn = el('button', 'btn primary', ar ? 'مراجعة الطلبية الكاملة وإرسال WhatsApp' : 'Review full order & send WhatsApp');
    revBtn.type = 'button';
    revBtn.addEventListener('click', () => ordGo('review'));

    const typesBtn = el('button', 'btn', ar ? 'اختيار كاتيجوري آخر' : 'Choose another category');
    typesBtn.type = 'button';
    typesBtn.addEventListener('click', () => ordGo('types/' + c.group));

    actCol.append(revBtn, typesBtn);
    box.append(actCol);
    root.append(box);
    appendGeneralBottomBar(root);
  }

  // ---- Page 6: Full Order Review ----
  function renderOrderReview(root) {
    const ar = isAr();
    const db = store().getDB();
    const selectedList = store().ordSelectedItems();

    root.append(buildOrdBreadcrumbs(null, null, ar ? 'مراجعة الطلبية' : 'Review order'));
    root.append(
      el('div', 'ord-kicker', '04 / REVIEW & SEND · مراجعة وإرسال الطلبية'),
      el('h2', 'ord-page-title', (ar ? 'مراجعة الطلبية الكاملة (' : 'Review full order (') + selectedList.length + ')')
    );

    const metaCard = el('section', 'card');
    metaCard.style.padding = '14px';
    const m = db.order.meta;
    const session = getSession();
    const requester = (session && session.displayName) || (S().me && S().me.name) || m.requester || 'Staff';
    const orderDate = S().date || (FOH.time ? FOH.time.todayISO() : '');

    const autoBanner = el('div', 'ord-meta-auto-banner');
    autoBanner.append(
      el('div', 'ord-meta-pill', `👤 ${requester}`),
      el('div', 'ord-meta-pill', `📅 ${orderDate}`),
      el('div', 'ord-meta-pill', `📦 ${ar ? 'المستودع الرئيسي' : 'Store Warehouse'}`)
    );

    const noteLbl = el('label', '', ar ? 'ملاحظة عامة على الطلبية (اختياري)' : 'General order note (optional)');
    noteLbl.style.display = 'block';
    noteLbl.style.marginTop = '10px';
    const noteIn = el('input', 'in');
    noteIn.value = m.orderNote || '';
    noteIn.addEventListener('input', () => {
      m.orderNote = noteIn.value;
      store().saveOrdersDB();
    });
    noteLbl.append(noteIn);
    metaCard.append(autoBanner, noteLbl);
    root.append(metaCard);

    if (!selectedList.length) {
      const emp = el('section', 'card');
      emp.append(el('p', 'empty', ar ? 'لم تقم بطلب أي صنف بعد.' : 'No items requested yet.'));
      root.append(emp);
    } else {
      renderReviewItemsList(root, selectedList, ar);
    }

    appendBottomBar(root, (inner) => {
      const addMoreB = el('button', 'btn', ar ? '+ إضافة أصناف' : '+ Add items');
      addMoreB.type = 'button';
      addMoreB.addEventListener('click', () => ordGo('home'));

      const waB = el('button', 'btn primary', ar ? '📲 إرسال عبر WhatsApp' : '📲 Send via WhatsApp');
      waB.type = 'button';
      waB.disabled = selectedList.length === 0;
      waB.addEventListener('click', () => {
        const msg = dispatch().buildOrdWhatsAppText(ordIncludeStockInMsg);
        dispatch().openWhatsApp(msg);
      });
      inner.append(addMoreB, waB);
    });
  }

  function renderReviewItemsList(root, selectedList, ar) {
    const db = store().getDB();
    const listCard = el('section', 'card');
    listCard.style.padding = '12px 14px';

    selectedList.forEach((i) => {
      const l = store().ordLine(i.id);
      const row = el('div', 'ord-review-row');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed var(--line)';

      const left = el('div', '');
      left.append(
        el('b', '', ar && i.ar ? `${i.ar} · ${i.name}` : i.name),
        el('small', '', `${l.note ? '📝 ' + l.note + ' · ' : ''}${ar ? 'المخزون' : 'Stock'}: ${store().ordStockLabel(i)}`)
      );
      left.querySelector('small').style.display = 'block';
      left.querySelector('small').style.color = 'var(--ink2)';

      const right = el('div', '');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '6px';
      right.append(el('strong', 'ord-picked-pill', `${l.qty} ${store().ordUnitText(l.qty, l.unit || i.unit)}`));

      const delBtn = el('button', 'btn danger small', '✕');
      delBtn.type = 'button';
      delBtn.addEventListener('click', () => {
        db.order.lines[i.id] = { ...l, qty: 0 };
        store().saveOrdersDB();
        renderOrdersView(root);
      });
      right.append(delBtn);

      row.append(left, right);
      listCard.append(row);
    });

    // WhatsApp Message Preview Box
    const msgText = dispatch().buildOrdWhatsAppText(ordIncludeStockInMsg);
    const ta = el('textarea', 'ord-msg-box');
    ta.readOnly = true;
    ta.value = msgText;
    listCard.append(ta);

    const actRow = el('div', '');
    actRow.style.display = 'flex';
    actRow.style.gap = '8px';
    actRow.style.marginTop = '10px';

    const copyBtn = el('button', 'btn', ar ? '📋 نسخ النص' : '📋 Copy text');
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', () => dispatch().copyOrderText(msgText));

    const resetBtn = el('button', 'btn danger', ar ? 'بدء طلبية جديدة' : 'Start new order');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', () => {
      store().promptStartNewOrder(() => ordGo('home'));
    });

    actRow.append(copyBtn, resetBtn);
    listCard.append(actRow);
    root.append(listCard);
  }

  // ---- Router ----
  function renderOrdersView(root) {
    if (!root) return;
    root.replaceChildren();

    const [page, param] = (ordRoute || 'home').split('/');
    if (page === 'home') renderHomeGroups(root);
    else if (page === 'types') renderCategoryTypes(root, param);
    else if (page === 'products') renderCategoryProducts(root, param);
    else if (page === 'item') renderItemStepperCard(root, param);
    else if (page === 'complete') renderCategoryComplete(root, param);
    else if (page === 'review') renderOrderReview(root);
    else renderHomeGroups(root);

    updateOrderBadge();
  }

  // Expose backwards-compatible API on FOH.ordersView
  FOH.ordersView = {
    emptyOrderState: () => store().emptyOrderState(),
    loadOrdersDB: () => store().loadOrdersDB(),
    saveOrdersDB: () => store().saveOrdersDB(),
    allowedGroupsForCurrentRole: (force) => store().allowedGroupsForCurrentRole(force),
    updateOrderBadge,
    renderOrdersView,
    buildOrdWhatsAppText: (inc) => dispatch().buildOrdWhatsAppText(inc),
    promptStartNewOrder: (cb) => store().promptStartNewOrder(cb),
    go: ordGo,
    get ORD_SEED() {
      return (FOH.ordersCatalog && FOH.ordersCatalog.ORD_SEED) || {};
    },
  };

  FOH.renderOrdersView = renderOrdersView;
  FOH.updateOrderBadge = updateOrderBadge;
})(window.FOH = window.FOH || {});
