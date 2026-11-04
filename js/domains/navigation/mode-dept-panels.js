// foh-opening/js/domains/navigation/mode-dept-panels.js
// 1. Mode Switcher (Checklist vs Tasks) Segmented Control
// 2. Department Bento Hub (All + Sections with Gear ⚙️ for RBAC & Customization)
// 3. Isolated Checklist Filter (Shows only the selected department)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  const { el } = FOH.view;

  let activeDept = 'all'; // 'all' | 'sec-bar' | 'sec-floor' | sectionId

  function getChecklistRemaining() {
    try {
      const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S().run.checked);
      return { total: all.total || 0, done: all.done || 0, left: Math.max(0, (all.total || 0) - (all.done || 0)) };
    } catch (err) {
      // Safe fallback when checklist model or preview is initializing
      return { total: 0, done: 0, left: 0 };
    }
  }

  function getTasksCount() {
    try {
      const states = FOH.tasksView ? FOH.tasksView.todayStates().filter((st) => FOH.tasksView.isMine(st.task)) : [];
      let pending = 0;
      states.forEach((st) => { if (!st.doneEntry) pending++; });
      return { total: states.length, pending };
    } catch (err) {
      // Safe fallback when tasks view is initializing
      return { total: 0, pending: 0 };
    }
  }

  function createChecklistModeTab(isChecklist, ckStats, ar) {
    const ckBtn = el('button', 'shift-nav-tab' + (isChecklist ? ' on' : ''));
    ckBtn.type = 'button';
    ckBtn.innerHTML =
      '<div class="shift-tab-top"><span class="shift-tab-ico">📋</span>' +
      '<b class="shift-tab-title">' + (ar ? 'الشيك ليست التشغيلي' : 'Shift Checklist') + '</b>' +
      (isChecklist ? '<span class="shift-now-dot-micro"></span>' : '') + '</div>' +
      '<div class="shift-tab-time-pill">' + (ar ? (ckStats.done + '/' + ckStats.total + ' منجز · ' + ckStats.left + ' متبقي') : (ckStats.done + '/' + ckStats.total + ' done · ' + ckStats.left + ' left')) + '</div>';
    ckBtn.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(10);
      if (FOH.superEmployee && FOH.superEmployee.switchView) FOH.superEmployee.switchView('opening');
      else if (FOH.navigation && FOH.navigation.switchView) FOH.navigation.switchView('opening');
      else { S().view = 'opening'; FOH.app.render(); }
    });
    return ckBtn;
  }

  function createTasksModeTab(isTasks, tkStats, ar) {
    const tkBtn = el('button', 'shift-nav-tab' + (isTasks ? ' on' : ''));
    tkBtn.type = 'button';
    tkBtn.innerHTML =
      '<div class="shift-tab-top"><span class="shift-tab-ico">🎯</span>' +
      '<b class="shift-tab-title">' + (ar ? 'المهام والتكليفات' : 'Assigned Tasks') + '</b>' +
      (isTasks ? '<span class="shift-now-dot-micro"></span>' : '') + '</div>' +
      '<div class="shift-tab-time-pill">' + (ar ? (tkStats.pending + ' مهمة مطلوبة اليوم') : (tkStats.pending + ' tasks due today')) + '</div>';
    tkBtn.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(10);
      if (FOH.superEmployee && FOH.superEmployee.switchView) FOH.superEmployee.switchView('mine');
      else if (FOH.navigation && FOH.navigation.switchView) FOH.navigation.switchView('mine');
      else { S().view = 'mine'; FOH.app.render(); }
    });
    return tkBtn;
  }

  // ---- 1. Mode Switcher (Checklist vs Tasks) ----
  function renderModeSwitcher() {
    const mainEl = $('appMain');
    if (!mainEl) return;

    let panel = $('opsModeSwitcher');
    if (!panel) {
      panel = el('div', 'ops-mode-panel run-only');
      panel.id = 'opsModeSwitcher';
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

    const head = el('div', 'shift-nav-head');
    head.innerHTML =
      '<div class="shift-nav-head-left">' +
      '<span class="shift-clock-chip">⚡ <b>' + (ar ? 'نمط العمليات' : 'Operations') + '</b></span>' +
      '<span class="shift-status-chip"><span class="shift-live-pulse-dot"></span>' +
      '<span>' + (isChecklist ? (ar ? 'شيت الشفت النشط' : 'Active Shift Sheet') : (ar ? 'مهام الموظف اليومية' : 'Personal Assigned Tasks')) + '</span>' +
      '</span></div>';
    panel.append(head);

    const grid = el('nav', 'shift-nav-grid ops-mode-grid');
    grid.setAttribute('aria-label', 'Switch Mode: Checklist vs Tasks');
    grid.append(createChecklistModeTab(isChecklist, ckStats, ar), createTasksModeTab(isTasks, tkStats, ar));
    panel.append(grid);
  }

  // ---- 2. Helpers for Department Tiles ----
  function createAllTile(ckStats, isAllActive, ar) {
    const tile = el('button', 'dept-tile dept-tile-all' + (isAllActive ? ' active on' : ''));
    tile.type = 'button';
    tile.innerHTML =
      '<div class="dept-tile-top">' +
      '<div class="dept-tile-left">' +
      '<span class="dept-tile-ico">✨</span>' +
      '<div class="dept-tile-info">' +
      '<b class="dept-tile-title">' + (ar ? '✨ كافة أقسام الشيك ليست' : '✨ All Checklist Sections') + '</b>' +
      '<small class="dept-tile-sub">' + (ar ? 'عرض شيت العمليات الشامل' : 'Display complete shift checklist') + '</small>' +
      '</div></div>' +
      '<span class="dept-tile-progress' + (ckStats.done === ckStats.total && ckStats.total > 0 ? ' complete' : '') + '">' +
      (ckStats.done + '/' + ckStats.total) + '</span>' +
      '</div>';
    tile.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(8);
      setActiveDept('all');
    });
    return tile;
  }

  function renderSectionGearButton(sec, ar) {
    const gearBtn = el('button', 'dept-tile-gear');
    gearBtn.type = 'button';
    gearBtn.title = ar ? 'تخصيص وإسناد الصلاحيات للقسم' : 'Customize & Assign Section Permissions';
    gearBtn.setAttribute('aria-label', ar ? 'إعدادات القسم' : 'Section Settings');
    gearBtn.innerHTML = '⚙️';
    gearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (FOH.sectionAssignment && FOH.sectionAssignment.openSectionModal) {
        FOH.sectionAssignment.openSectionModal(sec, false);
      }
    });
    return gearBtn;
  }

  function createSectionTile(sec, currentActive, ar) {
    const isSecActive = (currentActive === sec.id) || (currentActive === sec.dept) || (('sec-' + currentActive) === sec.id);
    const sTitle = ar ? (sec.titleAr || sec.title) : (sec.title || sec.titleAr);
    const sIcon = sec.icon || '🍽️';

    const leaves = FOH.model && FOH.model.sectionLeaves ? FOH.model.sectionLeaves(sec) : (sec.items || []);
    const p = FOH.model && FOH.model.progress ? FOH.model.progress(leaves, S().run.checked) : { total: (sec.items || []).length, done: 0 };
    const isComplete = p.total > 0 && p.done === p.total;

    let assigneeTxt = sec.assignedUsername ? ('👤 ' + sec.assignedUsername) : (sec.assignedRoleLabel || sec.assignedRoleKey || (ar ? '👥 مشترك' : '👥 Shared'));

    const tile = el('div', 'dept-tile' + (isSecActive ? ' active on' : ''));
    tile.setAttribute('role', 'button');
    tile.tabIndex = 0;

    const topRow = el('div', 'dept-tile-top');
    const leftBox = el('div', 'dept-tile-left');
    leftBox.append(
      el('span', 'dept-tile-ico', sIcon),
      Object.assign(el('div', 'dept-tile-info'), {
        innerHTML: '<b class="dept-tile-title">' + FOH.escapeHtml(sTitle) + '</b>',
      })
    );

    topRow.append(leftBox, renderSectionGearButton(sec, ar));

    const botRow = el('div', 'dept-tile-bottom');
    botRow.append(
      el('span', 'dept-tile-assignee', assigneeTxt),
      el('span', 'dept-tile-progress' + (isComplete ? ' complete' : ''), isComplete ? '✓ ' + p.done + '/' + p.total : p.done + '/' + p.total)
    );

    tile.append(topRow, botRow);
    tile.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(8);
      setActiveDept(sec.id);
    });
    return tile;
  }

  function renderDeptSegmentHeader(activeDept, secs, opts = {}) {
    const isLegacy = typeof opts === 'boolean';
    const isMgr = isLegacy ? opts : !!(opts && opts.isMgr);
    const ar = isLegacy ? !!arguments[3] : (opts && typeof opts.ar === 'boolean' ? opts.ar : isAr());
    let activeTitle = ar ? 'الكل' : 'All';
    let activeStatsText = '';
    if (activeDept !== 'all') {
      const targetSec = secs.find((s) => s.id === activeDept || s.dept === activeDept || ('sec-' + s.dept) === activeDept);
      if (targetSec) {
        activeTitle = ar ? (targetSec.titleAr || targetSec.title) : (targetSec.title || targetSec.titleAr);
        const leaves = FOH.model && FOH.model.sectionLeaves ? FOH.model.sectionLeaves(targetSec) : (targetSec.items || []);
        const p = FOH.model && FOH.model.progress ? FOH.model.progress(leaves, S().run.checked) : { total: (targetSec.items || []).length, done: 0 };
        activeStatsText = ' (' + p.done + '/' + p.total + ')';
      }
    }

    const head = el('div', 'shift-nav-head');
    const headLeft = el('div', 'shift-nav-head-left');
    headLeft.innerHTML =
      '<span class="shift-clock-chip">📁 <b>' + (ar ? 'أقسام المطعم' : 'Departments') + '</b></span>' +
      '<span class="shift-status-chip"><span class="shift-live-pulse-dot"></span>' +
      '<span>' + (ar ? 'عرض: ' : 'Viewing: ') + '<b>' + FOH.escapeHtml(activeTitle) + '</b>' + activeStatsText + '</span></span>';
    head.append(headLeft);

    if (isMgr) {
      const addDeptBtn = el('button', 'btn sm', ar ? '+ قسم جديد' : '+ New Dept');
      addDeptBtn.type = 'button';
      addDeptBtn.style.padding = '3px 10px';
      addDeptBtn.style.fontSize = '0.74rem';
      addDeptBtn.style.fontWeight = '700';
      addDeptBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (FOH.sectionAssignment && FOH.sectionAssignment.openSectionModal) {
          FOH.sectionAssignment.openSectionModal(null, true);
        }
      });
      head.append(addDeptBtn);
    }
    return head;
  }

  // ---- 3. Render Department Bento Hub ----
  function renderDeptSegmentPanel() {
    const mainEl = $('appMain');
    const sectionsEl = $('sections');
    if (!mainEl || !sectionsEl) return;

    let panel = $('deptSegmentPanel');
    if (!panel) {
      panel = el('div', 'dept-segment-panel run-only');
      panel.id = 'deptSegmentPanel';
      mainEl.insertBefore(panel, sectionsEl);
    }

    const isChecklistView = S().view === 'opening' && !S().editing;
    panel.hidden = !isChecklistView;
    if (panel.hidden) return;

    const chipsEl = $('chips');
    if (chipsEl) chipsEl.style.display = 'none';

    panel.replaceChildren();

    const ar = isAr();
    const secs = (S().tpl && Array.isArray(S().tpl.sections)) ? S().tpl.sections : [];
    const sess = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    const isMgr = !!(sess && (sess.isManager || sess.roleId === 'manager'));

    panel.append(renderDeptSegmentHeader(activeDept, secs, { isMgr, ar }));

    const grid = el('div', 'dept-bento-grid');
    grid.append(createAllTile(getChecklistRemaining(), activeDept === 'all', ar));
    secs.forEach((sec) => {
      grid.append(createSectionTile(sec, activeDept, ar));
    });
    panel.append(grid);
  }

  function renderDeptIsolatedBanner(secEl, activeDept, opts = {}) {
    const isLegacy = Array.isArray(opts);
    const secs = isLegacy ? opts : ((opts && opts.secs) || []);
    const ar = isLegacy ? !!arguments[3] : (opts && typeof opts.ar === 'boolean' ? opts.ar : isAr());
    let banner = $('deptIsolatedBanner');
    if (activeDept !== 'all') {
      const curSec = secs.find((s) => s.id === activeDept || s.dept === activeDept || ('sec-' + s.dept) === activeDept);
      const sTitle = curSec ? (ar ? (curSec.titleAr || curSec.title) : (curSec.title || curSec.titleAr)) : activeDept;
      const sIco = curSec ? (curSec.icon || '📌') : '📌';

      if (!banner) {
        banner = el('div', 'dept-isolated-banner');
        banner.id = 'deptIsolatedBanner';
        secEl.prepend(banner);
      }
      banner.style.display = 'flex';
      banner.innerHTML =
        '<div class="dib-txt">' +
        '<span>' + FOH.escapeHtml(sIco) + ' <b>' + (ar ? 'عرض شيك ليست: ' : 'Focused Checklist: ') + FOH.escapeHtml(sTitle) + '</b></span>' +
        '<small>' + (ar ? 'يتم الآن عرض بنود هذا القسم فقط دون بقية الأقسام' : 'Showing items for this station only') + '</small>' +
        '</div>';

      const resetBtn = el('button', 'btn sm', ar ? '✨ عرض جميع الأقسام' : '✨ Show All');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', () => setActiveDept('all'));
      banner.append(resetBtn);
    } else if (banner) {
      banner.style.display = 'none';
    }
  }

  // ---- 4. Apply Department Filter to Section Cards ----
  function applyDeptFilter() {
    const secEl = $('sections');
    if (!secEl || S().view !== 'opening' || S().editing) return;

    const chipsEl = $('chips');
    if (chipsEl) chipsEl.style.display = 'none';

    const cards = document.querySelectorAll('#sections > section.card');
    cards.forEach((card) => {
      const sid = (card.id || '').replace(/^sec-/, '');
      const secObj = (S().tpl && S().tpl.sections ? S().tpl.sections : []).find((x) => x.id === card.id || x.id === ('sec-' + sid) || x.id === sid);
      const sDept = (secObj && secObj.dept ? secObj.dept : sid).toLowerCase();

      if (activeDept === 'all') {
        card.style.display = '';
      } else {
        const targetClean = activeDept.replace(/^sec-/, '').toLowerCase();
        const matches = (card.id === activeDept) ||
                        (card.id === ('sec-' + activeDept)) ||
                        (sid.toLowerCase() === targetClean) ||
                        (sDept === targetClean);
        card.style.display = matches ? '' : 'none';
      }
    });

    const secs = (S().tpl && Array.isArray(S().tpl.sections)) ? S().tpl.sections : [];
    renderDeptIsolatedBanner(secEl, activeDept, { secs, ar: isAr() });
  }

  function setActiveDept(deptKey) {
    activeDept = deptKey;
    renderDeptSegmentPanel();
    applyDeptFilter();
    if (deptKey !== 'all') {
      const secEl = $('sections');
      if (secEl) secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
