// foh-opening/js/domains/navigation/bottom-bar.js
// Tactile Mobile Bottom Bar with Adaptive Modes (FOH Checklist & Focused Orders Flow)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  const { el } = FOH.view;

  const FOH_TABS = [
    { id: 'mine', view: 'mine', ico: '📋', labelAr: 'مهامي', labelEn: 'My Tasks', badgeId: 'botBadgeMine' },
    { id: 'dayoff', view: 'dayoff', ico: '📅', labelAr: 'الدوام', labelEn: 'Schedule', badgeId: 'botBadgeDayoff' },
    { id: 'opening', view: 'opening', ico: '🏠', labelAr: 'الرئيسية', labelEn: 'Home', isCenter: true, badgeId: 'botBadgeOpening' },
    { id: 'tips', view: 'tips', ico: '💰', labelAr: 'التبس', labelEn: 'Tips', badgeId: 'botBadgeTips' },
    { id: 'academy', view: 'academy', ico: '🎓', labelAr: 'الأكاديمية', labelEn: 'Academy', badgeId: 'botBadgeAcademy' },
  ];

  const ORDERS_TABS = [
    { id: 'ord_catalog', ordAction: 'catalog', ico: '📦', labelAr: 'الأقسام', labelEn: 'Catalog' },
    { id: 'ord_quick', ordAction: 'quick', ico: '⚡', labelAr: 'سريع', labelEn: 'Quick' },
    { id: 'ord_review', ordAction: 'review', ico: '🛒', labelAr: 'المراجعة', labelEn: 'Review', isCenter: true, badgeId: 'botBadgeOrdCart' },
    { id: 'ord_receiving', ordAction: 'receiving', ico: '📥', labelAr: 'الاستلام', labelEn: 'Receiving' },
    { id: 'ord_home', ordAction: 'exit_home', ico: '🏠', labelAr: 'الرئيسية', labelEn: 'Home', isExitAnchor: true },
  ];

  let currentBarMode = 'foh'; // 'foh' | 'orders'

  function getUnfinishedChecklistCount() {
    try {
      const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S().run.checked);
      return Math.max(0, (all.total || 0) - (all.done || 0));
    } catch { return 0; }
  }

  function getMyTasksRemainingCount() {
    try {
      const sess = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
      const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
      const curRole = FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
      const states = FOH.tasksView ? FOH.tasksView.todayStates().filter((st) => FOH.tasksView.isMine(st.task) && !st.doneEntry) : [];
      let rem = states.length;
      const checked = (S().run && S().run.checked) || {};
      (S().tpl.sections || []).forEach((sec) => {
        (sec.items || []).forEach((it) => {
          if (!checked[it.id] && ((it.assignedUsername && it.assignedUsername.toLowerCase() === curUser) || (!it.assignedUsername && it.assignedRoleKey === curRole))) rem++;
        });
      });
      return rem;
    } catch { return 0; }
  }

  function getDayOffBadgeCount() {
    try {
      if (!FOH.dayOff || !FOH.dayOff.loadDayOffList) return 0;
      const list = FOH.dayOff.loadDayOffList() || [];
      const sess = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
      if (!sess || !!sess.isManager) return list.filter((r) => r.status === 'pending').length;
      const myName = (sess && sess.displayName) || (FOH.state && FOH.state.me && FOH.state.me.name) || '';
      return list.filter((r) => r.status === 'pending' && (!myName || (r.staffName || '').toLowerCase().includes(myName.toLowerCase()))).length;
    } catch { return 0; }
  }

  function getOrdersCartCount() {
    try {
      const db = FOH.ordersStore ? FOH.ordersStore.getDB() : null;
      return (db && db.order && db.order.lines) ? Object.values(db.order.lines).filter((l) => Number(l.qty || 0) > 0).length : 0;
    } catch { return 0; }
  }

  function handleOrdersTabClick(action) {
    const OV = FOH.ordersView;
    if (action === 'catalog') {
      if (OV && OV.go) OV.go('home');
    } else if (action === 'quick') {
      const db = FOH.ordersStore ? FOH.ordersStore.getDB() : null;
      if (db) {
        db.preferences = db.preferences || {};
        db.preferences.viewMode = 'list';
        if (FOH.ordersStore.saveOrdersDB) FOH.ordersStore.saveOrdersDB();
      }
      const cat = (db && db.order && db.order.lastCat) || 'bar-0';
      if (OV && OV.go) OV.go('products/' + cat);
    } else if (action === 'review') {
      if (OV && OV.go) OV.go('review');
    } else if (action === 'receiving') {
      if (FOH.ordersViewReview && FOH.ordersViewReview.openReceivingModal) FOH.ordersViewReview.openReceivingModal();
      else if (OV && OV.go) OV.go('review');
    } else if (action === 'exit_home') {
      if (FOH.superEmployee && FOH.superEmployee.switchView) FOH.superEmployee.switchView('opening');
      else if (FOH.navigation && FOH.navigation.switchView) FOH.navigation.switchView('opening');
      else { S().view = 'opening'; FOH.app.render(); }
    }
  }

  function isOrdersTabActive(tb) {
    const route = (FOH.ordersView && FOH.ordersView.getRoute) ? FOH.ordersView.getRoute() : 'home';
    const db = FOH.ordersStore ? FOH.ordersStore.getDB() : null;
    const viewMode = (db && db.preferences && db.preferences.viewMode) || 'step';
    if (tb.ordAction === 'catalog') {
      return viewMode !== 'list' && (route === 'home' || route.startsWith('types') || route.startsWith('products') || route.startsWith('item'));
    }
    if (tb.ordAction === 'quick') {
      return viewMode === 'list' && (route.startsWith('products') || route === 'quick');
    }
    if (tb.ordAction === 'review') {
      return route === 'review' || route.startsWith('complete');
    }
    return false;
  }

  function renderBottomTabItem(tb, isOrdersMode, curView, ar) {
    const isCur = isOrdersMode ? isOrdersTabActive(tb) : curView === tb.view;
    const classes = ['tab-item'];
    if (tb.isCenter) classes.push('center-hero');
    if (tb.isExitAnchor) classes.push('exit-anchor');
    if (isCur) classes.push('on');

    const btn = el('button', classes.join(' '));
    btn.type = 'button';
    if (tb.view) btn.dataset.view = tb.view;
    if (tb.ordAction) btn.dataset.ordAction = tb.ordAction;
    btn.setAttribute('aria-label', ar ? tb.labelAr : tb.labelEn);

    if (tb.isCenter) {
      const bubble = el('div', 'center-hero-bubble');
      const ico = el('span', 'hero-ico', tb.ico);
      const b = el('b', 'tab-badge hero-badge');
      if (tb.badgeId) b.id = tb.badgeId;
      b.hidden = true;
      bubble.append(ico, b);
      btn.append(bubble, el('span', 'tab-label center-label', ar ? tb.labelAr : tb.labelEn));
    } else {
      const wrap = el('div', 'tab-icon-wrap');
      const ico = el('span', 'tab-ico', tb.ico);
      const b = el('b', 'tab-badge');
      if (tb.badgeId) b.id = tb.badgeId;
      b.hidden = true;
      wrap.append(ico, b);
      btn.append(wrap, el('span', 'tab-label', ar ? tb.labelAr : tb.labelEn), el('span', 'tab-active-dot'));
    }

    btn.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(12);
      if (isOrdersMode) {
        handleOrdersTabClick(tb.ordAction);
      } else {
        if (FOH.superEmployee && FOH.superEmployee.switchView) {
          FOH.superEmployee.switchView(tb.view);
        } else if (FOH.navigation && FOH.navigation.switchView) {
          FOH.navigation.switchView(tb.view);
        } else {
          S().view = tb.view;
          FOH.app.render();
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return btn;
  }

  function buildBottomBar() {
    let bar = $('appBottomBar');
    if (!bar) {
      bar = el('nav', 'app-bottom-bar run-only');
      bar.id = 'appBottomBar';
      bar.setAttribute('aria-label', 'Employee Bottom Navigation Bar');
      document.body.append(bar);
    }
    bar.replaceChildren();

    const ar = isAr();
    const curView = S().view;
    const isOrdersMode = curView === 'orders';
    currentBarMode = isOrdersMode ? 'orders' : 'foh';

    bar.classList.toggle('orders-mode', isOrdersMode);
    const activeTabs = isOrdersMode ? ORDERS_TABS : FOH_TABS;

    activeTabs.forEach((tb) => {
      bar.append(renderBottomTabItem(tb, isOrdersMode, curView, ar));
    });

    updateBadges();
  }

  function updateBadges() {
    const bar = $('appBottomBar');
    if (!bar) return;

    const bMine = $('botBadgeMine');
    if (bMine) {
      const cnt = getMyTasksRemainingCount();
      bMine.textContent = String(cnt);
      bMine.hidden = cnt <= 0;
    }

    const bOpen = $('botBadgeOpening');
    if (bOpen) {
      const left = getUnfinishedChecklistCount();
      bOpen.textContent = String(left);
      bOpen.hidden = left <= 0;
    }

    const bDayoff = $('botBadgeDayoff');
    if (bDayoff) {
      const cnt = getDayOffBadgeCount();
      bDayoff.textContent = String(cnt);
      bDayoff.hidden = cnt <= 0;
    }

    const bCart = $('botBadgeOrdCart');
    if (bCart) {
      const cartCount = getOrdersCartCount();
      bCart.textContent = String(cartCount);
      bCart.hidden = cartCount <= 0;
    }
  }

  function syncBottomBar() {
    const loginScr = $('loginScreen');
    const isLoggedOut = document.body.classList.contains('login-open') || (loginScr && !loginScr.hidden);
    let bar = $('appBottomBar');

    if (isLoggedOut || S().editing) {
      if (bar) {
        bar.hidden = true;
        if (bar.style) {
          if (typeof bar.style.setProperty === 'function') bar.style.setProperty('display', 'none', 'important');
          else bar.style.display = 'none';
        }
      }
      document.body.classList.remove('has-bottom-bar');
      return;
    }

    const curView = S().view;
    const targetMode = curView === 'orders' ? 'orders' : 'foh';

    if (!bar || currentBarMode !== targetMode) {
      buildBottomBar();
      bar = $('appBottomBar');
    }
    bar.hidden = false;
    if (bar.style) {
      if (typeof bar.style.removeProperty === 'function') bar.style.removeProperty('display');
      else bar.style.display = '';
    }
    document.body.classList.add('has-bottom-bar');

    const ar = isAr();
    const isOrdersMode = targetMode === 'orders';
    const activeTabs = isOrdersMode ? ORDERS_TABS : FOH_TABS;

    activeTabs.forEach((tb) => {
      const sel = isOrdersMode ? `.tab-item[data-ord-action="${tb.ordAction}"]` : `.tab-item[data-view="${tb.view}"]`;
      const btn = bar.querySelector(sel);
      if (!btn) return;
      const isCur = isOrdersMode ? isOrdersTabActive(tb) : curView === tb.view;
      btn.classList.toggle('on', isCur);

      const lbl = btn.querySelector('.tab-label');
      if (lbl) lbl.textContent = ar ? tb.labelAr : tb.labelEn;
    });

    updateBadges();
  }

  function init() {
    buildBottomBar();
  }

  FOH.bottomBar = {
    init,
    syncBottomBar,
    updateBadges,
    buildBottomBar,
    TABS: FOH_TABS,
    FOH_TABS,
    ORDERS_TABS,
  };
})(window.FOH = window.FOH || {});
