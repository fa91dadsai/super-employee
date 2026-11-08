// foh-opening/js/domains/orders/orders-view-home.js
// Home groups view with CEEN 2 design parity: welcome, draft card, group cards grid, and resume
(function (FOH) {
  'use strict';

  const store = () => FOH.ordersStore;
  const { el } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);

  function getGroupIconSvg(gid, iconKey) {
    if (FOH.ordersView && FOH.ordersView.getGroupIconSvg) {
      return FOH.ordersView.getGroupIconSvg(gid, iconKey);
    }
    return '';
  }

  function ordGo(route) {
    if (FOH.ordersView && FOH.ordersView.go) FOH.ordersView.go(route);
  }

  function renderWelcomeHeader(root, ar) {
    const hour = new Date().getHours();
    const greetingEn = hour < 12 ? 'Good morning.' : hour < 17 ? 'Good afternoon.' : 'Good evening.';
    const greetingAr = hour < 12 ? 'صباح الخير.' : 'مساء الخير.';

    const welcome = el('section', 'welcome');
    welcome.innerHTML =
      '<div class="kicker">' + (ar ? 'جاهز للخدمة · READY FOR SERVICE' : 'READY FOR SERVICE') + '</div>' +
      '<h1 class="title">' + (ar ? greetingAr + '<br>فلنبدأ طلبية الصالة والبار.' : greetingEn + '<br>Let\'s stock the bar.') + '</h1>' +
      '<p class="sub">' + (ar ? 'تحضير مسبق دقيق · خدمة أسهل وشفت بلا نواقص.' : 'A little prep. A smoother service.') + '</p>';
    root.append(welcome);
  }

  function renderDraftCard(root, ar, selectedList) {
    const draftCard = el('section', 'draft-card');
    draftCard.setAttribute('aria-label', ar ? 'الطلبية الحالية' : 'Current order');
    draftCard.innerHTML =
      '<div class="draft-count">' +
        '<strong>' + selectedList.length + '</strong>' +
        '<span>' + (ar ? 'أصناف مختارة<br>في طلبيتك' : 'items in<br>your order') + '</span>' +
      '</div>';

    const revBtn = el('button', 'primary', ar ? 'مراجعة الطلبية ←' : 'Review order →');
    revBtn.type = 'button';
    revBtn.disabled = selectedList.length === 0;
    revBtn.addEventListener('click', () => ordGo('review'));
    draftCard.append(revBtn);
    root.append(draftCard);
  }

  function createGroupCard(gid, g, db, ar) {
    const cats = db.catalog.categories.filter((c) => c.group === gid);
    let totalItems = 0;
    let doneItems = 0;
    let reqCount = 0;

    cats.forEach((c) => {
      const cItems = store().ordCatItems(c.id);
      totalItems += cItems.length;
      doneItems += store().ordCatDone(c.id);
      reqCount += cItems.filter((i) => store().ordLine(i.id).qty > 0).length;
    });

    const pct = totalItems ? Math.round((100 * doneItems) / totalItems) : 0;
    const gCard = el('button', 'group-card');
    gCard.type = 'button';
    gCard.innerHTML =
      '<span class="glyph">' + getGroupIconSvg(gid, g.icon) + '</span>' +
      '<span class="label">' +
        '<b>' + FOH.escapeHtml(ar ? g.nameAr || g.name : g.name) + '</b>' +
        '<small>' + FOH.escapeHtml(ar ? g.subAr || g.sub : g.sub) + '</small>' +
        '<span class="section-progress">' +
          '<span>' + doneItems + ' / ' + totalItems + ' ' + (ar ? 'تم فحصها' : 'checked') + (reqCount > 0 ? ' · ' + reqCount + (ar ? ' مطلوب' : ' ordered') : '') + '</span>' +
          '<span>' + cats.length + ' ' + (ar ? 'تصنيفات' : 'categories') + '</span>' +
        '</span>' +
        '<span class="progress-rail" style="display:block" role="progressbar" aria-valuenow="' + doneItems + '" aria-valuemax="' + totalItems + '">' +
          '<span style="display:block;height:100%;background:var(--gold);border-radius:10px;width:' + pct + '%"></span>' +
        '</span>' +
      '</span>' +
      '<span class="arrow">' + (ar ? '↖' : '↗') + '</span>';

    gCard.addEventListener('click', () => ordGo('types/' + gid));
    return gCard;
  }

  function renderGroupCardsGrid(root, ar, db) {
    const allItems = db.catalog.items || [];
    const checkedCount = allItems.filter((i) => db.order && db.order.visited && db.order.visited[i.id]).length;

    const secHeading = el('div', 'section-heading');
    secHeading.innerHTML =
      '<h2>' + (ar ? 'أقسام الصالة والبار' : 'Explore your bar') + '</h2>' +
      '<span>' + checkedCount + ' / ' + allItems.length + ' ' + (ar ? 'تم فحصها' : 'checked') + '</span>';
    root.append(secHeading);

    const secCards = el('div', 'section-cards');
    const allowed = store().allowedGroupsForCurrentRole();
    allowed.forEach(([gid, g]) => secCards.append(createGroupCard(gid, g, db, ar)));
    root.append(secCards);
  }

  function renderLastItemResume(root, ar, db) {
    const lastItemId = db.order && db.order.lastItem;
    const allItems = db.catalog.items || [];
    const lastItemObj = lastItemId && (allItems.find((x) => x.id === lastItemId) || store().ordItem(lastItemId));
    if (!lastItemObj) return;

    const resume = el('div', 'resume');
    resume.innerHTML =
      '<span>' + (ar ? 'متابعة من حيث توقفت:' : 'Pick up where you left off') + '<br><b>' +
      FOH.escapeHtml(ar && lastItemObj.ar ? lastItemObj.ar + ' · ' + lastItemObj.name : lastItemObj.name) + '</b></span>';

    const contBtn = el('button', 'btn small', ar ? 'متابعة ←' : 'Continue →');
    contBtn.type = 'button';
    contBtn.addEventListener('click', () => ordGo('item/' + lastItemId));
    resume.append(contBtn);
    root.append(resume);
  }

  function renderHomeToolbarAndNotes(root, ar) {
    const toolRow = el('div', 'toolbar-row');
    const startNewBtn = el('button', 'ghost', ar ? '+ بدء طلبية جديدة' : '+ Start new order');
    startNewBtn.type = 'button';
    startNewBtn.addEventListener('click', () => {
      store().promptStartNewOrder(() => {
        if (FOH.ordersView && FOH.ordersView.renderOrdersView) FOH.ordersView.renderOrdersView(root);
      });
    });
    toolRow.append(startNewBtn);

    const canManage = store().canCurrentUserManageOrders && store().canCurrentUserManageOrders();
    if (canManage) {
      const setBtn = el('button', 'btn', ar ? '⚙️ إدارة الكتالوج والصلاحيات' : '⚙️ Manage catalog & stock');
      setBtn.type = 'button';
      setBtn.addEventListener('click', () => {
        if (FOH.ordersSettingsModal && FOH.ordersSettingsModal.open) {
          FOH.ordersSettingsModal.open();
        }
      });
      toolRow.append(setBtn);
    }
    root.append(toolRow);

    const note = el('p', 'small-note');
    note.innerHTML =
      '<span>' + (ar ? 'اطلب فقط ما تحتاجه للخدمة. رصيد المخزون لا يتغير إلا عند التوريد الفعلي.' : 'Request only what you need. Your stock stays unchanged until you update it.') + '</span>';
    root.append(note);
  }

  function renderHomeGroups(root) {
    const ar = isAr();
    const db = store().getDB();
    const selectedList = store().ordSelectedItems();

    renderWelcomeHeader(root, ar);
    renderDraftCard(root, ar, selectedList);

    if (store().getOrderStatus() === 'DISPATCHED' && FOH.ordersViewReview && FOH.ordersViewReview.renderReceivingBanner) {
      root.append(FOH.ordersViewReview.renderReceivingBanner(ar));
    }

    renderGroupCardsGrid(root, ar, db);
    renderLastItemResume(root, ar, db);

    // Fast Cockpit replenishment drawer
    if (FOH.ordersView && FOH.ordersView.renderQuickReplenishDrawer) {
      FOH.ordersView.renderQuickReplenishDrawer(root);
    }

    renderHomeToolbarAndNotes(root, ar);
  }

  FOH.ordersViewHome = {
    renderHomeGroups,
    renderWelcomeHeader,
    renderDraftCard,
    renderGroupCardsGrid,
    renderLastItemResume,
  };
})(window.FOH = window.FOH || {});

