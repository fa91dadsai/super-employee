// foh-opening/js/domains/navigation/mode-dept-panels.js
// 1. Mode Switcher (Checklist vs Tasks) Segmented Control
// 2. Department Switcher (Bar, Floor, Back Area, Host, Cashier, All) Segmented Rail
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  const { el } = FOH.view;

  let activeDept = 'all'; // 'all' | 'bar' | 'floor' | 'back' | 'host' | 'cash' | customId

  const DEPT_MAP = [
    { key: 'all', icon: '✨', labelAr: 'الكل', labelEn: 'All' },
    { key: 'bar', icon: '🍸', labelAr: 'البار', labelEn: 'Bar' },
    { key: 'floor', icon: '🍽️', labelAr: 'الصالة', labelEn: 'Floor' },
    { key: 'back', icon: '🚪', labelAr: 'الخلفية', labelEn: 'Back Area' },
    { key: 'host', icon: '🛎️', labelAr: 'الهوست', labelEn: 'Host' },
    { key: 'cash', icon: '💳', labelAr: 'الكاشير', labelEn: 'Cashier' },
  ];

  function getChecklistRemaining() {
    try {
      const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S().run.checked);
      return { total: all.total || 0, done: all.done || 0, left: Math.max(0, (all.total || 0) - (all.done || 0)) };
    } catch {
      return { total: 0, done: 0, left: 0 };
    }
  }

  function getTasksCount() {
    try {
      const states = FOH.tasksView ? FOH.tasksView.todayStates().filter((st) => FOH.tasksView.isMine(st.task)) : [];
      let pending = 0;
      states.forEach((st) => { if (!st.doneEntry) pending++; });
      return { total: states.length, pending };
    } catch {
      return { total: 0, pending: 0 };
    }
  }

  // 1. Render Mode Switcher (Checklist vs Tasks)
  function renderModeSwitcher() {
    const mainEl = $('appMain');
    if (!mainEl) return;

    let panel = $('opsModeSwitcher');
    if (!panel) {
      panel = el('div', 'ops-mode-panel run-only');
      panel.id = 'opsModeSwitcher';
      // Insert at the very top of #appMain
      mainEl.prepend(panel);
    }

    const loginScr = $('loginScreen');
    const isLoggedOut = document.body.classList.contains('login-open') || (loginScr && !loginScr.hidden);
    if (isLoggedOut || S().editing) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    panel.replaceChildren();

    const ar = isAr();
    const curView = S().view;
    const isChecklist = curView === 'opening';
    const isTasks = curView === 'mine';

    const ckStats = getChecklistRemaining();
    const tkStats = getTasksCount();

    // Header Meta Row
    const head = el('div', 'shift-nav-head');
    head.innerHTML =
      '<div class="shift-nav-head-left">' +
      '<span class="shift-clock-chip">⚡ <b>' + (ar ? 'نمط العمليات' : 'Operations') + '</b></span>' +
      '<span class="shift-status-chip">' +
      '<span class="shift-live-pulse-dot"></span>' +
      '<span>' + (isChecklist ? (ar ? 'شيت الشفت النشط' : 'Active Shift Sheet') : (ar ? 'مهام الموظف اليومية' : 'Personal Assigned Tasks')) + '</span>' +
      '</span>' +
      '</div>';
    panel.append(head);

    // Segmented Grid (2 items matching the screenshot style)
    const grid = el('nav', 'shift-nav-grid ops-mode-grid');
    grid.setAttribute('aria-label', 'Switch Mode: Checklist vs Tasks');

    // Tab 1: Checklist
    const ckBtn = el('button', 'shift-nav-tab' + (isChecklist ? ' on' : ''));
    ckBtn.type = 'button';
    ckBtn.innerHTML =
      '<div class="shift-tab-top">' +
      '<span class="shift-tab-ico">📋</span>' +
      '<b class="shift-tab-title">' + (ar ? 'الشيك ليست التشغيلي' : 'Shift Checklist') + '</b>' +
      (isChecklist ? '<span class="shift-now-dot-micro"></span>' : '') +
      '</div>' +
      '<div class="shift-tab-time-pill">' + (ar ? (ckStats.done + '/' + ckStats.total + ' منجز · ' + ckStats.left + ' متبقي') : (ckStats.done + '/' + ckStats.total + ' done · ' + ckStats.left + ' left')) + '</div>';

    ckBtn.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(10);
      if (FOH.superEmployee && FOH.superEmployee.switchView) {
        FOH.superEmployee.switchView('opening');
      } else if (FOH.navigation && FOH.navigation.switchView) {
        FOH.navigation.switchView('opening');
      } else {
        S().view = 'opening';
        FOH.app.render();
      }
    });

    // Tab 2: Tasks
    const tkBtn = el('button', 'shift-nav-tab' + (isTasks ? ' on' : ''));
    tkBtn.type = 'button';
    tkBtn.innerHTML =
      '<div class="shift-tab-top">' +
      '<span class="shift-tab-ico">🎯</span>' +
      '<b class="shift-tab-title">' + (ar ? 'المهام والتكليفات' : 'Assigned Tasks') + '</b>' +
      (isTasks ? '<span class="shift-now-dot-micro"></span>' : '') +
      '</div>' +
      '<div class="shift-tab-time-pill">' + (ar ? (tkStats.pending + ' مهمة مطلوبة اليوم') : (tkStats.pending + ' tasks due today')) + '</div>';

    tkBtn.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(10);
      if (FOH.superEmployee && FOH.superEmployee.switchView) {
        FOH.superEmployee.switchView('mine');
      } else if (FOH.navigation && FOH.navigation.switchView) {
        FOH.navigation.switchView('mine');
      } else {
        S().view = 'mine';
        FOH.app.render();
      }
    });

    grid.append(ckBtn, tkBtn);
    panel.append(grid);
  }

  // 2. Render Department Switcher (Bar, Floor, Back, Host, Cashier, All)
  function renderDeptSegmentPanel() {
    const mainEl = $('appMain');
    const sectionsEl = $('sections');
    if (!mainEl || !sectionsEl) return;

    let panel = $('deptSegmentPanel');
    if (!panel) {
      panel = el('div', 'dept-segment-panel run-only');
      panel.id = 'deptSegmentPanel';
      // Insert right before #sections
      mainEl.insertBefore(panel, sectionsEl);
    }

    const isChecklistView = S().view === 'opening' && !S().editing;
    panel.hidden = !isChecklistView;
    if (panel.hidden) return;

    panel.replaceChildren();

    const ar = isAr();
    const secs = (S().tpl && Array.isArray(S().tpl.sections)) ? S().tpl.sections : [];

    // Header Meta Row
    const activeDeptObj = DEPT_MAP.find((d) => d.key === activeDept) || DEPT_MAP[0];
    const head = el('div', 'shift-nav-head');
    head.innerHTML =
      '<div class="shift-nav-head-left">' +
      '<span class="shift-clock-chip">📁 <b>' + (ar ? 'أقسام المطعم' : 'Departments') + '</b></span>' +
      '<span class="shift-status-chip">' +
      '<span class="shift-live-pulse-dot"></span>' +
      '<span>' + (ar ? 'عرض: ' : 'Viewing: ') + '<b>' + (ar ? activeDeptObj.labelAr : activeDeptObj.labelEn) + '</b></span>' +
      '</span>' +
      '</div>';
    panel.append(head);

    // Segmented Grid / Rail (Horizontal scrollable or grid matching the screenshot)
    const grid = el('nav', 'shift-nav-grid dept-nav-rail');
    grid.setAttribute('aria-label', 'Filter Checklist by Department');

    // Build tabs dynamically from available sections
    DEPT_MAP.forEach((d) => {
      let totalItems = 0;
      let doneItems = 0;

      if (d.key === 'all') {
        const stats = getChecklistRemaining();
        totalItems = stats.total;
        doneItems = stats.done;
      } else {
        const matched = secs.filter((s) => (s.dept || '').toLowerCase() === d.key.toLowerCase());
        matched.forEach((sec) => {
          (sec.items || []).forEach((it) => {
            totalItems++;
            if (S().run && S().run.checked && S().run.checked[it.id]) doneItems++;
          });
        });
        // If this department doesn't exist on this sheet, skip it
        if (totalItems === 0 && matched.length === 0) return;
      }

      const isCur = activeDept === d.key;
      const btn = el('button', 'shift-nav-tab dept-nav-tab' + (isCur ? ' on' : ''));
      btn.type = 'button';
      btn.dataset.dept = d.key;

      btn.innerHTML =
        '<div class="shift-tab-top">' +
        '<span class="shift-tab-ico">' + d.icon + '</span>' +
        '<b class="shift-tab-title">' + (ar ? d.labelAr : d.labelEn) + '</b>' +
        (isCur ? '<span class="shift-now-dot-micro"></span>' : '') +
        '</div>' +
        '<div class="shift-tab-time-pill">' + (doneItems + '/' + totalItems) + '</div>';

      btn.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(8);
        setActiveDept(d.key);
      });

      grid.append(btn);
    });

    panel.append(grid);
  }

  // 3. Apply Department Filter to Section Cards
  function applyDeptFilter() {
    const secEl = $('sections');
    if (!secEl || S().view !== 'opening' || S().editing) return;

    const cards = document.querySelectorAll('#sections > section.card');
    cards.forEach((card) => {
      const sid = (card.id || '').replace(/^sec-/, '');
      const secObj = (S().tpl.sections || []).find((x) => x.id === sid);
      const sDept = (secObj && secObj.dept ? secObj.dept : 'floor').toLowerCase();

      if (activeDept === 'all') {
        card.style.display = '';
      } else {
        const matches = sDept === activeDept.toLowerCase() || sid.toLowerCase().includes(activeDept.toLowerCase());
        card.style.display = matches ? '' : 'none';
      }
    });

    // Also sync old chips if present
    document.querySelectorAll('#chips .chip').forEach((chip) => {
      const card = $('sec-' + chip.dataset.sid);
      if (card) chip.style.display = card.style.display;
    });
  }

  function setActiveDept(deptKey) {
    activeDept = deptKey;
    renderDeptSegmentPanel();
    applyDeptFilter();
  }

  function syncPanels() {
    renderModeSwitcher();
    renderDeptSegmentPanel();
    applyDeptFilter();
  }

  function init() {
    syncPanels();
  }

  FOH.modeDeptPanels = {
    init,
    syncPanels,
    renderModeSwitcher,
    renderDeptSegmentPanel,
    setActiveDept,
    applyDeptFilter,
    getActiveDept: () => activeDept,
  };
})(window.FOH = window.FOH || {});
