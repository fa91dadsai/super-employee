// Task Assignment Module
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.loadSession() : null;
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function roleName(id) {
    return (FOH.staff && FOH.staff.roleName(id)) || id || '';
  }

  function getActiveSheetType() {
    return (FOH.sheetState && FOH.sheetState.getActiveSheetType) ? FOH.sheetState.getActiveSheetType() : 'opening';
  }

  function applyRoleScopeCardFilter(curRole) {
    document.querySelectorAll('#sections > section.card').forEach((card) => {
      const sid = (card.id || '').replace(/^sec-/, '');
      const secObj = (S.tpl.sections || []).find((x) => x.id === sid);
      const dept = secObj && secObj.dept;
      if (dept) {
        if (curRole === 'super_waiter' && (dept === 'bar' || dept === 'cash')) {
          card.style.display = 'none';
        } else if (curRole === 'super_bartender' && (dept === 'floor' || dept === 'cash')) {
          card.style.display = 'none';
        } else {
          card.style.display = '';
        }
      }
    });
    document.querySelectorAll('#chips .chip').forEach((chip) => {
      const card = $('sec-' + chip.dataset.sid);
      if (card) chip.style.display = card.style.display;
    });
  }

  function applyItemBadgesAndScope(flatItems, curUser, opts = {}) {
    const isLegacy = typeof opts === 'string';
    const curRole = isLegacy ? opts : ((opts && opts.curRole) || '');
    const isLeader = isLegacy ? !!arguments[3] : !!(opts && opts.isLeader);
    const sess = isLegacy ? arguments[4] : (opts && opts.sess);
    document.querySelectorAll('#sections li.item, #sections li.kid').forEach((li) => {
      const cb = li.querySelector('input.ck[data-id]');
      if (!cb) return;
      const itemId = cb.dataset.id;
      const itemObj = flatItems.get(itemId);
      if (!itemObj) return;

      // Remove redundant assigned-task-pill if present (role is already known by section context)
      const existingPill = li.querySelector('.assigned-task-pill');
      if (existingPill) existingPill.remove();

      if (roleScopeOnly && !isLeader) {
        let visible = true;
        const dispName = (sess && sess.displayName ? sess.displayName.toLowerCase() : '');
        if (itemObj.assignedUsername && itemObj.assignedUsername.toLowerCase() !== curUser) {
          visible = false;
        } else if (itemObj.person && itemObj.person !== 'Staff' && itemObj.person !== 'الكل' && itemObj.person !== 'all' && itemObj.person.toLowerCase() !== curUser && itemObj.person.toLowerCase() !== dispName) {
          visible = false;
        } else if (itemObj.assignedRoleKey && itemObj.assignedRoleKey !== 'all' && itemObj.assignedRoleKey !== curRole) {
          visible = false;
        }
        li.style.display = visible ? '' : 'none';
      } else {
        li.style.display = '';
      }
    });
  }

  function hideEmptyRoleScopeCards() {
    document.querySelectorAll('#sections > section.card').forEach((card) => {
      const items = card.querySelectorAll('li.item, li.kid');
      if (items.length > 0) {
        const hasVisible = Array.from(items).some((li) => li.style.display !== 'none');
        if (!hasVisible) card.style.display = 'none';
      }
    });
    document.querySelectorAll('#chips .chip').forEach((chip) => {
      const card = $('sec-' + chip.dataset.sid);
      if (card) chip.style.display = card.style.display;
    });
  }

  // Render Assignment Badges on Checklist Items & Filter Sections/Items by Assigned Employee/Role
  function renderAssignedTaskBadgesAndFilter() {
    const secEl = $('sections');
    if (!secEl || secEl.hidden || S.view !== 'opening' || S.editing) return;
    const sess = getSession();
    const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
    const curRole = getCurrentSuperRoleKey();
    const isLeader = curRole === 'super_manager' || curRole === 'super_captain';

    // 1. Department-level filtering
    if (roleScopeOnly && !isLeader) {
      applyRoleScopeCardFilter(curRole);
    }

    // 2. Build flat items map & apply badges/filtering
    const flatItems = new Map();
    (S.tpl.sections || []).forEach((s) => {
      (s.items || []).forEach((it) => {
        flatItems.set(it.id, it);
        (it.children || []).forEach((ch) => flatItems.set(ch.id, ch));
      });
    });

    applyItemBadgesAndScope(flatItems, curUser, curRole, isLeader, sess);

    // 3. Hide empty cards
    if (roleScopeOnly && !isLeader) {
      hideEmptyRoleScopeCards();
    }
  }

  function injectAssignTaskBtnIntoToolbarAndMine() {
    const canAssign = canCurrentUserAssignTasks();
    const ar = isAr();

    const toolbar = document.querySelector('#checklistGovBar .unified-sec-toolbar');
    const existingToolbarBtn = toolbar && toolbar.querySelector('#toolbarAssignTaskBtn');
    if (!canAssign) {
      if (existingToolbarBtn) existingToolbarBtn.remove();
    } else if (toolbar && !existingToolbarBtn) {
      const btn = el('button', 'u-pill primary-assign', ar ? '➕ إضافة وتعيين مهمة' : '➕ Assign Task');
      btn.type = 'button';
      btn.id = 'toolbarAssignTaskBtn';
      btn.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());
      toolbar.prepend(btn);
    }

    const mineRoot = $('mine');
    const existingMineCard = mineRoot && mineRoot.querySelector('#mineAssignTaskBar');
    if (!canAssign) {
      if (existingMineCard) existingMineCard.remove();
    } else if (mineRoot && !mineRoot.hidden && !existingMineCard) {
      const card = el('div', 'sec-context-bar');
      card.id = 'mineAssignTaskBar';
      card.style.border = '1.5px solid var(--accent)';
      card.innerHTML =
        '<div><b>🎯 ' + (ar ? 'تعيين المهام للموظفين والمناصب' : 'Task Assignment by Staff & Position') + '</b>' +
        '<small style="display:block;color:var(--ink2);">' +
        (ar ? 'أضف مهمة جديدة وعيّنها لـ Waiter / Bartender / Captain أو لموظف بالاسم' : 'Create a task and assign it to a specific role or employee') +
        '</small></div>';
      const addB = el('button', 'btn primary', ar ? '➕ إضافة وتعيين مهمة' : '➕ Add & Assign Task');
      addB.type = 'button';
      addB.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());
      card.append(addB);
      mineRoot.prepend(card);
    }
  }





  function openAssignTaskToStaffOrRoleModal(...args) {
    if (FOH.taskAssignModal && FOH.taskAssignModal.openAssignTaskToStaffOrRoleModal) {
      return FOH.taskAssignModal.openAssignTaskToStaffOrRoleModal(...args);
    }
  }

  function canCurrentUserAssignTasks() {
    return FOH.taskAssignmentState ? FOH.taskAssignmentState.canCurrentUserAssignTasks() : false;
  }

  FOH.taskAssignment = {
    openAssignTaskToStaffOrRoleModal,
    renderAssignedTaskBadgesAndFilter,
    injectAssignTaskBtnIntoToolbarAndMine,
    canCurrentUserAssignTasks,
  };
})(window.FOH = window.FOH || {});