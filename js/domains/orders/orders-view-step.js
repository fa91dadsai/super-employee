// foh-opening/js/domains/orders/orders-view-step.js
// Guided step-by-step product list and single item stepper card with CEEN 2 design parity
(function (FOH) {
  'use strict';

  const store = () => FOH.ordersStore;
  const { el } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  const getSession = () => ((FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.loadSession() : null));

  let ordStepSearch = '';
  let ordReturnToReview = false;

  function ordGo(route) {
    if (FOH.ordersView && FOH.ordersView.go) FOH.ordersView.go(route);
  }

  function createProductPickRow(i, ar, db, c) {
    const l = store().ordLine(i.id);
    const catItems = store().ordCatItems(c.id);
    const idx = catItems.findIndex((x) => x.id === i.id);
    const isVisited = !!db.order.visited[i.id];
    const isSkipped = !!db.order.skipped[i.id];

    const btn = el('button', 'product-pick');
    btn.type = 'button';
    const numClass = 'number' + (isVisited ? ' check' : '');
    const numText = isVisited ? '✓' : isSkipped ? '↷' : String(idx + 1);

    btn.innerHTML =
      '<span class="' + numClass + '">' + numText + '</span>' +
      '<span class="name">' +
        '<b>' + FOH.escapeHtml(ar && i.ar ? i.ar + ' · ' + i.name : i.name) + '</b>' +
        '<small>' + (ar ? 'المخزون المسجّل: ' : 'Stock: ') + FOH.escapeHtml(store().ordStockLabel(i)) + '</small>' +
      '</span>' +
      (l.qty > 0
        ? '<span class="requested">' + l.qty + '<br><small>' + FOH.escapeHtml(store().ordUnitText(l.qty, l.unit || i.unit)) + '</small></span>'
        : '<span>→</span>');

    btn.addEventListener('click', () => ordGo('item/' + i.id));
    return btn;
  }

  function renderCategoryStepList(root, c, ar) {
    const db = store().getDB();
    const items = store().ordCatItems(c.id);
    const pending = store().ordPendingItem(c.id) || items[0];
    const done = store().ordCatDone(c.id);
    const skipped = store().ordCatSkipped(c.id);

    if (items.length) {
      const startBtn = el('button', 'primary wide start', (ar ? 'بدء فحص الأصناف' : 'Start checking items') + ' →');
      startBtn.type = 'button';
      startBtn.addEventListener('click', () => ordGo('item/' + pending.id));
      root.append(startBtn);

      const searchBox = el('div', 'search');
      searchBox.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
        '<input type="search" placeholder="' + (ar ? 'بحث في هذا التصنيف...' : 'Search this category...') + '" value="' + FOH.escapeHtml(ordStepSearch) + '">';
    const sIn = searchBox.querySelector('input');
    if (sIn) {
      sIn.addEventListener('input', () => {
        ordStepSearch = sIn.value;
        const qFilter = (ordStepSearch || '').toLowerCase().trim();
        const listContainer = root.querySelector('.product-list');
        if (listContainer) {
          listContainer.replaceChildren();
          items
            .filter((i) => !qFilter || (i.name + ' ' + (i.ar || '')).toLowerCase().includes(qFilter))
            .forEach((i) => listContainer.append(createProductPickRow(i, ar, db, c)));
        }
      });
    }
      root.append(searchBox);

      const listHead = el('div', 'list-head');
      listHead.innerHTML =
        '<span>' + items.length + ' ' + (ar ? 'أصناف' : 'items') + '</span>' +
        '<span>' + done + ' ' + (ar ? 'تم فحصها' : 'checked') + ' · ' + skipped + ' ' + (ar ? 'تخطي' : 'skipped') + '</span>';
      root.append(listHead);

      const prodList = el('div', 'product-list');
      const qFilter = (ordStepSearch || '').toLowerCase().trim();
      items
        .filter((i) => !qFilter || (i.name + ' ' + (i.ar || '')).toLowerCase().includes(qFilter))
        .forEach((i) => prodList.append(createProductPickRow(i, ar, db, c)));
      root.append(prodList);
    } else {
      const emp = el('div', 'empty', ar ? 'هذا التصنيف جاهز. أضف صنفاً للبدء.' : 'This category is ready. Add an item to start ordering.');
      root.append(emp);
    }

    if (FOH.ordersView && FOH.ordersView.appendGeneralBottomBar) {
      FOH.ordersView.appendGeneralBottomBar(root);
    }
  }

  function commitItemQty(i, qtyVal, unitVal, noteVal) {
    const db = store().getDB();
    const q = Math.max(0, Number(qtyVal || 0));
    const line = store().ordLine(i.id);
    db.order.lines[i.id] = { ...line, qty: q, unit: unitVal || line.unit, note: noteVal !== undefined ? noteVal : line.note };
    db.order.visited[i.id] = true;
    if (q > 0) delete db.order.skipped[i.id];
    store().saveOrdersDB();
  }

  function buildItemStepperControls(card, i, line, root, ar) {
    const denom = store().ordStockDenominator(i);
    const orderBox = el('div', 'item-order');
    const orderLabel = el('div', 'order-label');
    orderLabel.innerHTML =
      '<label for="quantity">' + (ar ? 'كمية الطلب المطلوبة' : 'Order quantity') + '</label>' +
      '<select id="unit" aria-label="' + (ar ? 'وحدة القياس' : 'Order unit') + '"></select>';

    const uSel = orderLabel.querySelector('select');
    const units = (FOH.ordersCatalog && FOH.ordersCatalog.ORD_UNITS) || {};
    Object.entries(units).forEach(([uk, uLabel]) => {
      const opt = el('option', '', uLabel);
      opt.value = uk;
      opt.selected = uk === (line.unit || i.unit || 'bottle');
      uSel.append(opt);
    });

    const qtyRow = el('div', 'qty-row');
    qtyRow.innerHTML =
      '<div class="stepper">' +
        '<button type="button" data-action="minus" aria-label="Decrease">−</button>' +
        '<input id="quantity" type="number" min="0" max="9999" step="0.01" inputmode="decimal" value="' + line.qty + '">' +
        '<span class="ratio-denominator">/ <b>' + FOH.escapeHtml(denom) + '</b></span>' +
        '<button type="button" data-action="plus" aria-label="Increase">+</button>' +
      '</div>';

    const qIn = qtyRow.querySelector('#quantity');
    const qMinus = qtyRow.querySelector('[data-action=minus]');
    const qPlus = qtyRow.querySelector('[data-action=plus]');

    const qtyHelp = el('p', 'qty-help', line.qty > 0 ? (ar ? 'هذا الصنف مدرج في طلبيتك.' : 'This item is included in your order.') : (ar ? 'اتركه صفراً إذا لم تكن بحاجة إليه.' : 'Leave at zero if not needed, then tap Next.'));

    const optDetails = el('details', 'optional');
    optDetails.innerHTML =
      '<summary>' + (ar ? 'المزيد / إضافة ملاحظة' : 'More / Add note') + ' <span>' + (line.note ? (ar ? 'ملاحظة مضافة' : 'Note added') : (ar ? 'اختياري ▾' : 'Optional ▾')) + '</span></summary>' +
      '<div class="item-more-panel">' +
        '<div class="field">' +
          '<label for="itemNote">' + (ar ? 'ملاحظة أو تعليمات خاصة (الحجم، النكهة):' : 'Size, packaging or special instructions') + '</label>' +
          '<textarea id="itemNote" rows="2" maxlength="500" placeholder="' + (ar ? 'مثال: زجاجة 750 مل...' : 'e.g. 750 ml bottles') + '">' + FOH.escapeHtml(line.note || '') + '</textarea>' +
        '</div>' +
        '<p class="ratio-caption">' + FOH.escapeHtml(store().ordStockRatioHint ? store().ordStockRatioHint(i, line.unit) : '') + '</p>' +
      '</div>';

    const taNote = optDetails.querySelector('textarea');

    const updateControls = () => {
      const q = Math.max(0, Number(qIn.value || 0));
      commitItemQty(i, q, uSel.value, taNote.value);
      qtyHelp.textContent = q > 0 ? (ar ? 'هذا الصنف مدرج في طلبيتك.' : 'This item is included in your order.') : (ar ? 'اتركه صفراً إذا لم تكن بحاجة إليه.' : 'Leave at zero if not needed, then tap Next.');
    };

    if (qMinus) {
      qMinus.addEventListener('click', () => {
        if (qIn) qIn.value = String(Math.max(0, Number(qIn.value || 0) - 1));
        if (navigator.vibrate) navigator.vibrate(10);
        updateControls();
      });
    }
    if (qPlus) {
      qPlus.addEventListener('click', () => {
        if (qIn) qIn.value = String(Number(qIn.value || 0) + 1);
        if (navigator.vibrate) navigator.vibrate(10);
        updateControls();
      });
    }
    if (qIn) qIn.addEventListener('change', updateControls);
    if (uSel) uSel.addEventListener('change', updateControls);
    if (taNote) taNote.addEventListener('input', updateControls);

    orderBox.append(orderLabel, qtyRow, qtyHelp, optDetails);
    card.append(orderBox);
    return { qIn, uSel, taNote };
  }

  function buildItemProgressRail(curIdx, totalItems, ar, onChooseOther) {
    const progHead = el('div', 'progress-head');
    progHead.innerHTML =
      '<span>' + (ar ? 'صنف <strong>' + (curIdx + 1) + '</strong> من <strong>' + totalItems + '</strong>' : 'Item <strong>' + (curIdx + 1) + '</strong> of <strong>' + totalItems + '</strong>') + '</span>';
    const chooseOther = el('button', '', ar ? 'اختر صنفاً آخر ☷' : 'Choose another item ☷');
    chooseOther.type = 'button';
    chooseOther.addEventListener('click', onChooseOther);
    progHead.append(chooseOther);

    const progRail = el('div', 'progress-rail item-progress');
    const pct = totalItems ? Math.round((100 * (curIdx + 1)) / totalItems) : 0;
    progRail.innerHTML = '<div style="width:' + pct + '%;height:100%;background:var(--gold);border-radius:10px;"></div>';
    return [progHead, progRail];
  }

  function buildItemProductPanel(i, c, ar, onEditStock) {
    const prodHead = el('div', 'item-product');
    prodHead.innerHTML =
      '<div class="product-heading">' +
        '<span class="glyph">' + (FOH.ordersView ? FOH.ordersView.getGroupIconSvg(c ? c.group : 'bar') : '') + '</span>' +
        '<div class="text">' +
          '<div class="cat">' + FOH.escapeHtml(ar && c ? c.nameAr || c.name : (c ? c.name : '')) + '</div>' +
          '<h1 class="product-name">' + FOH.escapeHtml(ar && i.ar ? i.ar + ' · ' + i.name : i.name) + '</h1>' +
          '<div class="item-code">' + FOH.escapeHtml(i.packSize || i.id.toUpperCase()) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="stock-panel">' +
        '<div>' +
          '<b>' + (ar ? 'المخزون المسجّل' : 'Recorded stock') + '</b>' +
          '<small>' + (ar ? 'مؤكد في الجرد · عمان' : 'Confirmed count · Amman') + '</small>' +
          '<button type="button" class="stock-edit">' + (ar ? 'تحديث المخزون' : 'Edit stock') + '</button>' +
        '</div>' +
        '<div class="stock-right">' +
          '<div class="stock-value">' + FOH.escapeHtml(store().ordStockLabel(i)) + '</div>' +
          (i.unit ? '<div class="stock-unit">' + FOH.escapeHtml(store().ordUnitText(1, i.unit)) + '</div>' : '') +
        '</div>' +
      '</div>';

    const stockEditBtn = prodHead.querySelector('.stock-edit');
    if (stockEditBtn) {
      stockEditBtn.addEventListener('click', onEditStock);
    }
    return prodHead;
  }

  function appendItemBottomNav(root, i, c, catItems, curIdx, ctrl, ar) {
    if (!FOH.ordersView || !FOH.ordersView.appendBottomBar) return;
    FOH.ordersView.appendBottomBar(root, (inner) => {
      const prevBtn = el('button', 'prev', ar ? '← السابق' : '← Previous');
      prevBtn.type = 'button';
      prevBtn.disabled = curIdx === 0;
      prevBtn.addEventListener('click', () => {
        if (curIdx > 0) ordGo('item/' + catItems[curIdx - 1].id);
      });

      const isLast = curIdx === catItems.length - 1;
      const nextBtn = el('button', 'primary', ordReturnToReview ? (ar ? 'حفظ والعودة للمراجعة ←' : 'Save & return →') : isLast ? (ar ? 'إنهاء التصنيف ←' : 'Finish category →') : (ar ? 'التالي ←' : 'Next →'));
      nextBtn.type = 'button';
      nextBtn.addEventListener('click', () => {
        commitItemQty(i, ctrl.qIn.value, ctrl.uSel.value, ctrl.taNote.value);
        if (ordReturnToReview) {
          ordReturnToReview = false;
          ordGo('review');
        } else if (isLast) {
          ordGo('complete/' + c.id);
        } else {
          ordGo('item/' + catItems[curIdx + 1].id);
        }
      });

      const skipBtn = el('button', 'skip-rest', ar ? 'تخطي المتبقي' : 'Skip remaining');
      skipBtn.type = 'button';
      skipBtn.addEventListener('click', () => {
        store().ordSkipRemaining(c.id);
        ordGo('complete/' + c.id);
      });

      inner.append(prevBtn, nextBtn, skipBtn);
    });
  }

  function renderItemStepperCard(root, itemId) {
    const ar = isAr();
    const i = store().ordById(itemId);
    if (!i) { ordGo('home'); return; }

    const c = store().ordCat(i.cat);
    const line = store().ordLine(i.id);
    const catItems = store().ordCatItems(i.cat);
    const curIdx = catItems.findIndex((it) => it.id === i.id);

    const db = store().getDB();
    db.order.lastItem = i.id;
    store().saveOrdersDB();

    if (FOH.ordersView && FOH.ordersView.buildOrdBreadcrumbs) {
      root.append(FOH.ordersView.buildOrdBreadcrumbs(c ? c.group : null, c ? c.id : null, i.name));
    }
    if (FOH.ordersView && FOH.ordersView.buildOrdViewSwitch) {
      root.append(FOH.ordersView.buildOrdViewSwitch(c ? c.id : null, 'step'));
    }

    const [progHead, progRail] = buildItemProgressRail(curIdx, catItems.length, ar, () => ordGo('products/' + i.cat));
    root.append(progHead, progRail);

    const card = el('article', 'item-card');
    const onEdit = () => store().promptEditStock(i, () => renderItemStepperCard(root, itemId));
    const prodHead = buildItemProductPanel(i, c, ar, onEdit);
    card.append(prodHead);

    const ctrl = buildItemStepperControls(card, i, line, root, ar);
    root.append(card);

    appendItemBottomNav(root, i, c, catItems, curIdx, ctrl, ar);
  }

  FOH.ordersViewStep = {
    renderCategoryStepList,
    renderItemStepperCard,
    createProductPickRow,
    commitItemQty,
  };
})(window.FOH = window.FOH || {});
