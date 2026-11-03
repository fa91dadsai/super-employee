// foh-opening/js/domains/navigation/bottom-bar.js
// 5-Icon Tactile Mobile Bottom Bar with Center Hero Anchor (Home / Shift Checklist)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  const { el } = FOH.view;

  const TABS = [
    {
      id: 'mine',
      view: 'mine',
      ico: '📋',
      labelAr: 'مهامي',
      labelEn: 'My Tasks',
      badgeId: 'botBadgeMine',
    },
    {
      id: 'inv',
      view: 'inv',
      ico: '📦',
      labelAr: 'الكسر والجرد',
      labelEn: 'Inventory',
      badgeId: 'botBadgeInv',
    },
    {
      id: 'opening',
      view: 'opening',
      ico: '🏠',
      labelAr: 'الرئيسية',
      labelEn: 'Home',
      isCenter: true,
      badgeId: 'botBadgeOpening',
    },
    {
      id: 'tips',
      view: 'tips',
      ico: '💰',
      labelAr: 'التبس',
      labelEn: 'Tips',
      badgeId: 'botBadgeTips',
    },
    {
      id: 'academy',
      view: 'academy',
      ico: '🎓',
      labelAr: 'الأكاديمية',
      labelEn: 'Academy',
      badgeId: 'botBadgeAcademy',
    },
  ];

  function getUnfinishedChecklistCount() {
    try {
      const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S().run.checked);
      return Math.max(0, (all.total || 0) - (all.done || 0));
    } catch {
      return 0;
    }
  }

  function getMyTasksRemainingCount() {
    try {
      const sess = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
      const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
      const curRole = FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
      let remaining = 0;

      // 1. Scheduled tasks
      const states = FOH.tasksView ? FOH.tasksView.todayStates().filter((st) => FOH.tasksView.isMine(st.task)) : [];
      states.forEach((st) => {
        if (!st.doneEntry) remaining++;
      });

      // 2. Assigned checklist items
      (S().tpl.sections || []).forEach((sec) => {
        (sec.items || []).forEach((it) => {
          const isDone = !!(S().run && S().run.checked && S().run.checked[it.id]);
          if (!isDone) {
            if (it.assignedUsername && it.assignedUsername.toLowerCase() === curUser) {
              remaining++;
            } else if (!it.assignedUsername && it.assignedRoleKey && it.assignedRoleKey === curRole) {
              remaining++;
            }
          }
        });
      });

      return remaining;
    } catch {
      return 0;
    }
  }

  function getInventoryDamageBadgeCount() {
    try {
      // Pending blind counts
      const counts = FOH.invCount && FOH.invCount.pending ? FOH.invCount.pending() : 0;
      return counts;
    } catch {
      return 0;
    }
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

    TABS.forEach((tb) => {
      const isCur = curView === tb.view;
      const btn = el('button', 'tab-item' + (tb.isCenter ? ' center-hero' : '') + (isCur ? ' on' : ''));
      btn.type = 'button';
      btn.dataset.view = tb.view;
      btn.setAttribute('aria-label', ar ? tb.labelAr : tb.labelEn);

      if (tb.isCenter) {
        // Center Elevated Hero FAB
        const bubble = el('div', 'center-hero-bubble');
        const ico = el('span', 'hero-ico', tb.ico);
        const b = el('b', 'tab-badge hero-badge');
        b.id = tb.badgeId;
        b.hidden = true;
        bubble.append(ico, b);

        const lbl = el('span', 'tab-label center-label', ar ? tb.labelAr : tb.labelEn);
        btn.append(bubble, lbl);
      } else {
        // Standard Tab Item
        const wrap = el('div', 'tab-icon-wrap');
        const ico = el('span', 'tab-ico', tb.ico);
        const b = el('b', 'tab-badge');
        b.id = tb.badgeId;
        b.hidden = true;
        wrap.append(ico, b);

        const lbl = el('span', 'tab-label', ar ? tb.labelAr : tb.labelEn);
        const dot = el('span', 'tab-active-dot');
        btn.append(wrap, lbl, dot);
      }

      btn.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(12);
        if (FOH.superEmployee && FOH.superEmployee.switchView) {
          FOH.superEmployee.switchView(tb.view);
        } else if (FOH.navigation && FOH.navigation.switchView) {
          FOH.navigation.switchView(tb.view);
        } else {
          S().view = tb.view;
          FOH.app.render();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      bar.append(btn);
    });

    updateBadges();
  }

  function updateBadges() {
    const bar = $('appBottomBar');
    if (!bar) return;

    // 1. My tasks badge
    const bMine = $('botBadgeMine');
    if (bMine) {
      const cnt = getMyTasksRemainingCount();
      bMine.textContent = String(cnt);
      bMine.hidden = cnt <= 0;
    }

    // 2. Home / Opening checklist badge
    const bOpen = $('botBadgeOpening');
    if (bOpen) {
      const left = getUnfinishedChecklistCount();
      bOpen.textContent = String(left);
      bOpen.hidden = left <= 0;
    }

    // 3. Inventory / Breakage badge
    const bInv = $('botBadgeInv');
    if (bInv) {
      const cnt = getInventoryDamageBadgeCount();
      bInv.textContent = String(cnt);
      bInv.hidden = cnt <= 0;
    }
  }

  function syncBottomBar() {
    const loginScr = $('loginScreen');
    const isLoggedOut = document.body.classList.contains('login-open') || (loginScr && !loginScr.hidden);
    let bar = $('appBottomBar');

    if (isLoggedOut || S().editing) {
      if (bar) bar.hidden = true;
      document.body.classList.remove('has-bottom-bar');
      return;
    }

    if (!bar) {
      buildBottomBar();
      bar = $('appBottomBar');
    }
    bar.hidden = false;
    document.body.classList.add('has-bottom-bar');

    const ar = isAr();
    const curView = S().view;

    // Update active class & labels
    TABS.forEach((tb) => {
      const btn = bar.querySelector(`.tab-item[data-view="${tb.view}"]`);
      if (!btn) return;
      const isCur = curView === tb.view;
      btn.classList.toggle('on', isCur);

      const lbl = btn.querySelector('.tab-label');
      if (lbl) {
        lbl.textContent = ar ? tb.labelAr : tb.labelEn;
      }
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
    TABS,
  };
})(window.FOH = window.FOH || {});
