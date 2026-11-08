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

  // ---- 1. Mode Switcher (Checklist vs Tasks) ----
  // Removed per FOH Touch UX & Navigation standards:
  // Switching between Shift Checklist and My Tasks is handled exclusively by the dedicated #tabBar ('Home' & 'My Tasks').
  function renderModeSwitcher() {
    const panel = document.getElementById('opsModeSwitcher');
    if (panel) {
      panel.remove();
    }
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
    const sess = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    const isMgr = !!(sess && (sess.isManager || sess.roleId === 'manager'));
    const canEdit = (FOH.gov && FOH.gov.canCurrentUserEditChecklist) ? FOH.gov.canCurrentUserEditChecklist() : isMgr;
    if (!isMgr && !canEdit) return el('span', '');

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

  // ---- Helper: Manager Top Segmented Filter Pills ----
  function createFilterPill(opts = {}) {
    const { label, icon, key, isActive } = opts;
    const pill = el('button', 'mgr-filter-pill' + (isActive ? ' active' : ''));
    pill.type = 'button';
    pill.append(el('span', '', icon + ' ' + label));
    pill.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(8);
      setActiveDept(key);
    });
    return pill;
  }

  function renderManagerTopFilterBar(curActive, secs, ar) {
    const wrap = el('div', 'mgr-filter-bar');
    wrap.setAttribute('aria-label', ar ? 'تصفية سريعة للأقسام' : 'Quick Department Filter');
    wrap.append(createFilterPill({ label: ar ? 'الكل' : 'All', icon: '✨', key: 'all', isActive: curActive === 'all' }));
    secs.forEach((sec) => {
      const sTitle = ar ? (sec.titleAr || sec.title) : (sec.title || sec.titleAr);
      const sIco = sec.icon || '📌';
      const isSecActive = (curActive === sec.id) || (curActive === sec.dept) || (('sec-' + curActive) === sec.id);
      wrap.append(createFilterPill({ label: sTitle, icon: sIco, key: sec.id, isActive: isSecActive }));
    });
    return wrap;
  }

  // ---- 3. Render Department Bento Hub & Manager Filter Bar ----
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

    const loginScr = $('loginScreen');
    const isLoggedOut = document.body.classList.contains('login-open') || (loginScr && !loginScr.hidden);
    const curView = S().view;
    const isChecklistView = curView === 'opening' && !isLoggedOut && !S().editing;

    const sess = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    const isMgr = !!(sess && (sess.isManager || sess.roleId === 'manager'));
    const canEdit = (FOH.gov && FOH.gov.canCurrentUserEditChecklist) ? FOH.gov.canCurrentUserEditChecklist() : isMgr;

    // Strict Governance: Bento Hub is shown ONLY inside checklist view for Manager or staff with edit delegation
    const shouldShow = isChecklistView && (isMgr || canEdit);
    panel.hidden = !shouldShow;
    panel.style.setProperty('display', shouldShow ? 'flex' : 'none', 'important');
    if (!shouldShow) return;

    const chipsEl = $('chips');
    if (chipsEl) chipsEl.style.display = 'none';

    const ar = isAr();
    const allSecs = (S().tpl && Array.isArray(S().tpl.sections)) ? S().tpl.sections : [];
    const roleKey = FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
    const uname = (sess && sess.username) || '';
    const isAllowed = FOH.isSectionAllowedForRole || ((s) => true);
    const visibleSecs = isMgr ? allSecs : allSecs.filter((s) => isAllowed(s, roleKey, false, uname));

    populateDeptPanel(panel, { visibleSecs, allSecs, isMgr, ar });
  }

  function populateDeptPanel(panel, opts = {}) {
    const { visibleSecs, allSecs, isMgr, ar } = opts;
    panel.replaceChildren();
    if (isMgr) {
      panel.append(renderManagerTopFilterBar(activeDept, allSecs, ar));
    }
    panel.append(renderDeptSegmentHeader(activeDept, visibleSecs, { isMgr, ar }));
    const grid = el('div', 'dept-bento-grid');
    grid.append(createAllTile(getChecklistRemaining(), activeDept === 'all', ar));
    visibleSecs.forEach((sec) => grid.append(createSectionTile(sec, activeDept, ar)));
    panel.append(grid);
  }

  function renderDeptIsolatedBanner(secEl, activeDept, opts = {}) {
    const isLegacy = Array.isArray(opts);
    const secs = isLegacy ? opts : ((opts && opts.secs) || []);
    const ar = isLegacy ? !!arguments[3] : (opts && typeof opts.ar === 'boolean' ? opts.ar : isAr());
    let banner = $('deptIsolatedBanner');
    if (activeDept !== 'all' && S().view === 'opening') {
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

  // ---- 4. Apply Department Filter to Section Cards with Strict Scoping ----
  function applyDeptFilter() {
    const secEl = $('sections');
    if (!secEl || S().view !== 'opening' || S().editing) return;

    const chipsEl = $('chips');
    if (chipsEl) chipsEl.style.display = 'none';

    const sess = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    const isMgr = !!(sess && (sess.isManager || sess.roleId === 'manager'));
    const roleKey = FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
    const uname = (sess && sess.username) || '';
    const isAllowed = FOH.isSectionAllowedForRole || ((s) => true);

    const cards = document.querySelectorAll('#sections > section.card');
    cards.forEach((card) => {
      const sid = (card.id || '').replace(/^sec-/, '');
      const secObj = (S().tpl && S().tpl.sections ? S().tpl.sections : []).find((x) => x.id === card.id || x.id === ('sec-' + sid) || x.id === sid);

      // Strict Scoping: If user is not manager and section is not allowed, unconditionally hide!
      if (!isMgr && secObj && !isAllowed(secObj, roleKey, false, uname)) {
        card.style.display = 'none';
        return;
      }

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
