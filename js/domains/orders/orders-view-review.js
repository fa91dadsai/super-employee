// foh-opening/js/domains/orders/orders-view-review.js
// Order review layout, category completion, WhatsApp/Copy dispatch & warehouse receiving
(function (FOH) {
  'use strict';

  const store = () => FOH.ordersStore;
  const dispatch = () => FOH.ordersDispatch;
  const { el } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  const getSession = () => ((FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.loadSession() : null));

  let ordShowDetails = false;

  function ordGo(route) {
    if (FOH.ordersView && FOH.ordersView.go) FOH.ordersView.go(route);
  }

  function renderCategoryComplete(root, catId) {
    const ar = isAr();
    const c = store().ordCat(catId);
    if (!c) { ordGo('home'); return; }

    const list = store().ordCatItems(c.id);
    const done = store().ordCatDone(c.id);
    const skipped = store().ordCatSkipped(c.id);
    const pending = store().ordPendingItem(c.id);
    const n = list.filter((i) => store().ordLine(i.id).qty > 0).length;

    if (FOH.ordersView && FOH.ordersView.buildOrdBreadcrumbs) {
      root.append(FOH.ordersView.buildOrdBreadcrumbs(c.group, c.id));
    }

    const comp = el('div', 'completion');
    const compTitle = pending ? (ar ? 'تم حفظ كمياتك' : 'Your quantities are saved') : (ar ? 'اكتمل فحص الكاتيجوري' : 'Category finished');
    const compSub = pending ? (ar ? 'بعض الأصناف غير مفحوصة بعد.' : 'Some items are still unchecked.') : (ar ? 'تم حفظ الكميات وجاهزة في الطلبية.' : 'Your quantities are saved in the order.');
    comp.innerHTML = `<div class="complete-icon">✓</div><h1>${compTitle}</h1><p class="sub">${compSub}</p>`;
    root.append(comp);

    const stats = el('div', 'stats completion-stats');
    stats.innerHTML = `<div class="stat"><strong>${n}</strong><span>${ar ? 'مطلوب' : 'Requested'}</span></div><div class="stat"><strong>${done}</strong><span>${ar ? 'تم فحصها' : 'Checked'}</span></div><div class="stat"><strong>${skipped}</strong><span>${ar ? 'تخطي' : 'Skipped'}</span></div>`;
    root.append(stats);

    const acts = el('div', 'complete-actions');
    const revBtn = el('button', 'primary wide', ar ? 'مراجعة الطلبية الكاملة ←' : 'Review full order →');
    revBtn.type = 'button';
    revBtn.addEventListener('click', () => ordGo('review'));

    const anotherBtn = el('button', '', ar ? 'اختيار تصنيف آخر' : 'Choose another category');
    anotherBtn.type = 'button';
    anotherBtn.addEventListener('click', () => ordGo('types/' + c.group));

    acts.append(revBtn, anotherBtn);
    root.append(acts);

    if (FOH.ordersView && FOH.ordersView.appendGeneralBottomBar) {
      FOH.ordersView.appendGeneralBottomBar(root);
    }
  }

  function renderReviewSidebar(layout, list, ar) {
    const db = store().getDB();
    const m = db.order.meta;
    const session = getSession();
    const requester = (session && session.displayName) || m.requester || 'Staff';
    const catsCount = new Set(list.map((i) => i.cat)).size;
    const groupsCount = new Set(list.map((i) => i.group)).size;

    const aside = el('aside', 'review-sidebar');
    aside.innerHTML =
      '<div class="review-summary">' +
      '<span>🛍️</span>' +
      '<span>' + catsCount + ' ' + (ar ? 'تصنيفات' : 'categories') + ' · ' + groupsCount + ' ' + (ar ? 'أقسام' : 'sections') + '<br>' +
      (ar ? 'طلبية موحدة جاهزة لفريقك.' : 'One order, ready for your team.') + '</span>' +
      '</div>' +
      '<div class="share-actions">' +
      '<button type="button" class="primary" data-action="wa">' + (ar ? 'واتساب ↗' : 'WhatsApp ↗') + '</button>' +
      '<button type="button" data-action="copy">' + (ar ? 'نسخ الطلبية' : 'Copy order') + '</button>' +
      '</div>' +
      '<details class="review-meta" id="orderDetails">' +
      '<summary>' + (ar ? 'تفاصيل وملاحظات الطلبية' : 'Order details') + ' <span>' + FOH.escapeHtml(requester) + ' · ' + FOH.escapeHtml(m.orderDate || '') + '</span></summary>' +
      '<div class="review-meta-fields">' +
      '<div class="field">' +
      '<label for="requester">' + (ar ? 'معدّ الطلبية:' : 'Prepared by:') + '</label>' +
      '<input id="requester" value="' + FOH.escapeHtml(requester) + '">' +
      '</div>' +
      '<div class="field">' +
      '<label for="orderNote">' + (ar ? 'ملاحظة عامة على الطلبية:' : 'General note:') + '</label>' +
      '<textarea id="orderNote" rows="2" placeholder="' + (ar ? 'ملاحظات تسليم، وقت مطلوب...' : 'e.g. Please deliver before 5 pm') + '">' + FOH.escapeHtml(m.orderNote || '') + '</textarea>' +
      '</div>' +
      '</div>' +
      '</details>';

    const waBtn = aside.querySelector('[data-action=wa]');
    if (waBtn) {
      waBtn.addEventListener('click', () => {
        const msg = dispatch().buildOrdWhatsAppText(false);
        dispatch().openWhatsApp(msg);
      });
    }

    const copyBtn = aside.querySelector('[data-action=copy]');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const msg = dispatch().buildOrdWhatsAppText(false);
        dispatch().copyOrderText(msg);
      });
    }

    const taNote = aside.querySelector('#orderNote');
    if (taNote) {
      taNote.addEventListener('input', () => {
        m.orderNote = taNote.value;
        store().saveOrdersDB();
      });
    }

    layout.append(aside);
  }

  function renderReviewLines(container, list, ar) {
    const db = store().getDB();
    let currentCat = null;
    let secList = null;

    list.forEach((i) => {
      const l = store().ordLine(i.id);
      if (i.cat !== currentCat) {
        currentCat = i.cat;
        const c = store().ordCat(i.cat);
        const g = c && db.catalog.groups[c.group];
        const countInCat = list.filter((x) => x.cat === i.cat).length;

        const sec = el('section', 'review-group');
        sec.innerHTML =
          '<h2 class="review-section">' +
          '<span>' + FOH.escapeHtml((g ? (ar ? g.nameAr || g.name : g.name) : '') + ' / ' + (c ? (ar ? c.nameAr || c.name : c.name) : '')) + '</span>' +
          '<small>' + countInCat + '</small>' +
          '</h2>';
        secList = el('div', 'review-list');
        sec.append(secList);
        container.append(sec);
      }

      const art = el('article', 'review-line');
      art.innerHTML =
        '<div class="review-line-main">' +
        '<b class="review-name">' + FOH.escapeHtml(ar && i.ar ? i.ar + ' · ' + i.name : i.name) + (l.note ? ' <span class="note-mark" title="Note added">•</span>' : '') + '</b>' +
        '<div class="review-quantity">' +
        '<div><strong>' + l.qty + '</strong><span> / ' + FOH.escapeHtml(store().ordStockDenominator(i)) + '</span></div>' +
        '<small>' + FOH.escapeHtml(store().ordUnitText(l.qty, l.unit || i.unit)) + '</small>' +
        '</div>' +
        '<button type="button" class="review-edit" aria-label="Edit">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/></svg>' +
        '</button>' +
        '</div>' +
        '<div class="review-line-detail" style="display:' + (ordShowDetails ? 'block' : 'none') + '">' +
        (i.packSize ? '<p>' + (ar ? 'الحجم: ' : 'Size: ') + FOH.escapeHtml(i.packSize) + '</p>' : '') +
        (l.note ? '<p>' + (ar ? 'ملاحظة: ' : 'Note: ') + FOH.escapeHtml(l.note) + '</p>' : '') +
        '<p>' + (ar ? 'المخزون المسجل: ' : 'Stock: ') + FOH.escapeHtml(store().ordStockLabel(i)) + '</p>' +
        '<button type="button" class="danger-text">' + (ar ? 'إلغاء من الطلبية' : 'Remove from order') + '</button>' +
        '</div>';

      const editBtn = art.querySelector('.review-edit');
      if (editBtn) editBtn.addEventListener('click', () => ordGo('item/' + i.id));

      const delBtn = art.querySelector('.danger-text');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          db.order.lines[i.id] = { ...l, qty: 0 };
          store().saveOrdersDB();
          if (FOH.ordersView && FOH.ordersView.renderOrdersView) {
            FOH.ordersView.renderOrdersView(container.closest('#ordersView') || document.getElementById('ordersView'));
          }
          if (FOH.edit && FOH.edit.toast) {
            const itLabel = ar ? (i.ar || i.name) : i.name;
            FOH.edit.toast(ar ? '🗑 تم حذف ' + itLabel + ' من الطلبية' : '🗑 Removed ' + itLabel + ' from order');
          }
        });
      }

      secList.append(art);
    });
  }

  function renderOrderReview(root) {
    const ar = isAr();
    const list = store().ordSelectedItems();

    if (FOH.ordersView && FOH.ordersView.buildOrdBreadcrumbs) {
      root.append(FOH.ordersView.buildOrdBreadcrumbs(null, null, ar ? 'مراجعة الطلبية' : 'Review order'));
    }

    const compRev = el('section', 'compact-review');
    compRev.innerHTML =
      '<div class="review-title">' +
      '<h1>' + (ar ? 'مراجعة الطلبية' : 'Review order') + '</h1>' +
      '<span>' + list.length + ' ' + (ar ? 'أصناف' : 'items') + '</span>' +
      '</div>';

    const layout = el('div', 'review-layout');
    renderReviewSidebar(layout, list, ar);

    const ordersBox = el('div', 'review-orders');
    ordersBox.innerHTML =
      '<div class="review-list-tools">' +
      '<label><input type="checkbox" id="reviewDetails" ' + (ordShowDetails ? 'checked' : '') + '> ' + (ar ? 'إظهار التفاصيل والملاحظات' : 'Show item details') + '</label>' +
      '<span>' + (ar ? 'طلب / مخزون' : 'Order / Stock') + '</span>' +
      '</div>';

    const chk = ordersBox.querySelector('#reviewDetails');
    if (chk) {
      chk.addEventListener('change', () => {
        ordShowDetails = chk.checked;
        ordersBox.querySelectorAll('.review-line-detail').forEach((d) => {
          d.style.display = ordShowDetails ? 'block' : 'none';
        });
      });
    }

    if (list.length) {
      renderReviewLines(ordersBox, list, ar);
    } else {
      ordersBox.append(el('div', 'empty', ar ? 'لم تقم بطلب أي صنف بعد.' : 'No items requested yet.'));
    }

    layout.append(ordersBox);
    compRev.append(layout);
    root.append(compRev);
  }

  function openReceivingModal() {
    const ar = isAr();
    const list = store().ordSelectedItems();
    const overlay = el('div', 'modal-overlay');
    overlay.style.cssText = 'display:flex;z-index:9999;';

    const dialog = el('div', 'modal-box');
    dialog.style.cssText = 'max-width:520px;width:94%;padding:20px;';

    const title = el('h3', '', '📦 ' + (ar ? 'تأكيد استلام طلبية المستودع' : 'Confirm Order Receiving'));
    const sub = el('p', '', ar ? 'تأكيد وصول الأصناف وتوريدها لمخزون البار والصالة' : 'Verify delivered items & ingest into bar stock');
    sub.style.cssText = 'color:var(--muted);margin-bottom:12px;';

    const itemsBox = el('div', '');
    itemsBox.style.cssText = 'max-height:280px;overflow-y:auto;';

    const receivedMap = {};
    list.forEach((i) => {
      const line = store().ordLine(i.id);
      receivedMap[i.id] = line.qty;
      const row = el('div', 'ord-receiving-item');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin:6px 0;padding:8px 10px;border-radius:10px;background:var(--bg);border:1px solid var(--line);';
      const info = el('div', '');
      info.innerHTML = '<b>' + FOH.escapeHtml(ar && i.ar ? i.ar + ' · ' + i.name : i.name) + '</b><small style="display:block;color:var(--muted);">' +
        (ar ? 'المطلوب: ' : 'Requested: ') + line.qty + ' ' + FOH.escapeHtml(line.unit || i.unit || '') + '</small>';

      const ctr = el('div', '');
      ctr.style.cssText = 'display:flex;align-items:center;gap:6px;';
      const decBtn = el('button', 'btn tiny', '−');
      decBtn.type = 'button';
      decBtn.style.cssText = 'width:32px;height:32px;padding:0;min-height:unset;line-height:30px;';
      const qtyBadge = el('span', 'ord-receiving-qty-badge', String(line.qty));
      qtyBadge.style.cssText = 'min-width:32px;text-align:center;font-weight:700;';
      const incBtn = el('button', 'btn tiny', '+');
      incBtn.type = 'button';
      incBtn.style.cssText = 'width:32px;height:32px;padding:0;min-height:unset;line-height:30px;';

      decBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (receivedMap[i.id] > 0) {
          receivedMap[i.id]--;
          qtyBadge.textContent = String(receivedMap[i.id]);
          qtyBadge.style.color = receivedMap[i.id] < line.qty ? 'var(--danger)' : '';
        }
      });
      incBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        receivedMap[i.id]++;
        qtyBadge.textContent = String(receivedMap[i.id]);
        qtyBadge.style.color = receivedMap[i.id] < line.qty ? 'var(--danger)' : '';
      });

      ctr.append(decBtn, qtyBadge, incBtn);
      row.append(info, ctr);
      itemsBox.append(row);
    });

    const btnRow = el('div', '');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';

    const cancelBtn = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const confirmBtn = el('button', 'btn primary', ar ? '✓ تأكيد الاستلام والتوريد' : '✓ Confirm Receipt & Ingest');
    confirmBtn.type = 'button';
    confirmBtn.addEventListener('click', () => {
      store().confirmOrderReceiving({
        receivedLines: receivedMap,
        receiverName: (getSession() && getSession().displayName) || 'Staff',
      });
      overlay.remove();
      const hasShortages = Object.keys(store().getBackorders ? store().getBackorders() : {}).length > 0;
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(
          hasShortages
            ? (ar ? 'تم تأكيد الاستلام وترحيل النواقص لطلبية قادمة ⚠️' : 'Order received; shortages moved to backorder ⚠️')
            : (ar ? 'تم تأكيد استلام الطلبية والتوريد بنجاح ✓' : 'Order received & archived ✓')
        );
      }
      ordGo('home');
    });

    btnRow.append(cancelBtn, confirmBtn);
    dialog.append(title, sub, itemsBox, btnRow);
    overlay.append(dialog);
    document.body.append(overlay);
  }

  function renderReceivingBanner(ar) {
    const banner = el('div', 'ord-receiving-banner');
    banner.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(217, 119, 6, 0.24))';
    banner.style.border = '1px solid rgba(245, 158, 11, 0.4)';
    banner.style.borderRadius = '12px';
    banner.style.padding = '12px 16px';
    banner.style.marginBottom = '14px';
    banner.style.display = 'flex';
    banner.style.justifyContent = 'space-between';
    banner.style.alignItems = 'center';
    banner.style.gap = '10px';

    banner.innerHTML = '<div><strong>📦 ' + (ar ? 'طلبية المستودع قيد التوريد (Dispatched)' : 'Warehouse Delivery Dispatched') + '</strong>' +
      '<small style="display:block;color:var(--muted);">' + (ar ? 'تم إرسال الطلبية بنجاح. اضغط عند وصول البضاعة لتأكيد الاستلام.' : 'Order was sent. Tap when goods arrive to confirm.') + '</small></div>';

    const recvBtn = el('button', 'btn primary small', ar ? '✓ استلام الطلبية والتوريد' : '✓ Receive & Ingest');
    recvBtn.type = 'button';
    recvBtn.addEventListener('click', () => openReceivingModal());
    banner.append(recvBtn);
    return banner;
  }

  FOH.ordersViewReview = {
    renderOrderReview,
    renderCategoryComplete,
    openReceivingModal,
    renderReceivingBanner,
  };
})(window.FOH = window.FOH || {});
