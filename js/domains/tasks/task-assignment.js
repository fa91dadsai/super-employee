// foh-opening/js/domains/tasks/task-assignment.js
// Add & Assign Tasks to Specific Employees or Roles with Department Filtering
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function roleName(id) {
    return FOH.taskSheet && FOH.taskSheet.roleName ? FOH.taskSheet.roleName(id) : 'Staff';
  }

  function getActiveSheetType() {
    return FOH.threeShifts ? FOH.threeShifts.getActiveSheetType() : 'opening';
  }

  const roleScopeOnly = true;

  function notifyMobileOnNewTaskAdded(t) {
    if (FOH.realtime) FOH.realtime.notifyMobileOnNewTaskAdded(t);
  }

  function getScheduledSheetForNow() {
    return FOH.threeShifts ? FOH.threeShifts.getScheduledSheetForNow() : 'opening';
  }

  // ---- Add & Assign Task to Specific Employee or Role Modal ----
  function openAssignTaskToStaffOrRoleModal(defaultTargetSheet) {
    const ar = isAr();
    let dlg = $('assignTaskDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'assignTaskDialog';
      dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
      document.body.append(dlg);
    }
    dlg.replaceChildren();

    const curSheet = defaultTargetSheet || getActiveSheetType();
    const box = el('div', '');
    box.style.padding = '14px 16px 20px';

    box.innerHTML =
      '<div class="grab"></div>' +
      '<h2 style="margin:0 0 6px;font-size:1.08rem;">➕ ' +
      (ar ? 'إضافة مهمة وتعيينها لموظف أو منصب معين' : 'Add & Assign Task to Employee or Role') +
      '</h2>' +
      '<p style="margin:0 0 12px;font-size:0.78rem;color:var(--ink2);">' +
      (ar
        ? 'اختر الشيت (Opening / Mid-Shift / Closing)، وحدد المنصب أو اسم الموظف المسؤول، وسيصله إشعار فوري على الموبايل:'
        : 'Select the shift sheet, assign to a position or specific employee, and send an instant mobile alert:') +
      '</p>';

    // 1. Task Title Input
    const titleLbl = el('label', '', ar ? '📝 عنوان المهمة المطلوبة:' : '📝 Task Description:');
    const titleIn = el('input', 'in');
    titleIn.placeholder = ar ? 'مثال: تجهيز طاولة VIP رقم 8 وتلميع كؤوس العصير...' : 'e.g. Prepare VIP Table 8 & polish wine glasses...';
    titleIn.style.marginTop = '4px';
    titleLbl.append(titleIn);
    box.append(titleLbl);

    // 2. Target Sheet & Section
    const rowSheet = el('div', 'two');
    rowSheet.style.marginTop = '10px';

    const sheetLbl = el('label', '', ar ? '📋 ضمن أي شيت؟' : '📋 Target Shift Sheet:');
    const sheetSel = el('select', 'in');
    [
      ['opening', ar ? '☀️ Opening Sheet (12:00 ص – 3:00 م)' : '☀️ Opening Sheet (12AM–3PM)'],
      ['mid', ar ? '🌤️ Mid-Shift Sheet (3:00 م – 11:00 م)' : '🌤️ Mid-Shift Sheet (3PM–11PM)'],
      ['closing', ar ? '🌙 Closing Sheet (11:00 م – الإغلاق)' : '🌙 Closing Sheet (11PM–Close)'],
    ].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = val;
      o.selected = val === curSheet;
      sheetSel.append(o);
    });
    sheetLbl.append(sheetSel);

    const secLbl = el('label', '', ar ? '📂 القسم الفرعي:' : '📂 Section:');
    const secSel = el('select', 'in');
    secLbl.append(secSel);

    function populateSectionsForSheet(sType) {
      secSel.replaceChildren();
      let list = S.tpl.sections || [];
      if (sType !== getActiveSheetType()) {
        if (sType === 'mid' && FOH.erpPwa && FOH.erpPwa.loadMidSections) list = FOH.erpPwa.loadMidSections();
        else if (sType === 'closing' && FOH.erpPwa && FOH.erpPwa.loadClosingSections) list = FOH.erpPwa.loadClosingSections();
        else if (sType === 'opening' && FOH.erpPwa && FOH.erpPwa.getOpeningBackup && FOH.erpPwa.getOpeningBackup()) {
          list = FOH.erpPwa.getOpeningBackup();
        }
      }
      list.forEach((s) => {
        const o = el('option', '', (s.icon || '📌') + ' ' + (ar ? s.titleAr || s.title : s.title || s.titleAr));
        o.value = s.id;
        secSel.append(o);
      });
    }
    populateSectionsForSheet(sheetSel.value);
    sheetSel.addEventListener('change', () => populateSectionsForSheet(sheetSel.value));

    rowSheet.append(sheetLbl, secLbl);
    box.append(rowSheet);

    // 3. Assign to Position (Super Role) AND/OR Specific Employee
    const rowAssign = el('div', 'two');
    rowAssign.style.marginTop = '10px';

    const roleLbl = el('label', '', ar ? '🪪 تعيين لمنصب معين (Position):' : '🪪 Assign to Position (Role):');
    const roleSel = el('select', 'in');
    [
      ['super_waiter', ar ? '⭐ Super Waiter (منصب الويتر)' : '⭐ Super Waiter'],
      ['super_bartender', ar ? '🍸 Super Bartender (منصب البارتندر)' : '🍸 Super Bartender'],
      ['super_captain', ar ? '🎖️ Super Captain (منصب الكابتن)' : '🎖️ Super Captain'],
      ['super_manager', ar ? '👑 Super Manager (منصب المدير)' : '👑 Super Manager'],
      ['all', ar ? '👥 عام لكل المناصب (All Roles)' : '👥 All Positions'],
    ].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = val;
      roleSel.append(o);
    });
    roleLbl.append(roleSel);

    const empLbl = el('label', '', ar ? '👤 تعيين لموظف محدد بالاسم:' : '👤 Specific Employee (Optional):');
    const empSel = el('select', 'in');
    [
      ['', ar ? '— كل موظفي هذا المنصب —' : '— Any staff in this role —'],
      ['sara', ar ? '👤 سارة خوري (Sara · Waiter)' : '👤 Sara Khoury (Waiter)'],
      ['maher', ar ? '👤 ماهر زيد (Maher · Bartender)' : '👤 Maher Zaid (Bartender)'],
      ['ali', ar ? '👤 علي حسن (Ali · Captain)' : '👤 Ali Hassan (Captain)'],
      ['fadi', ar ? '👤 فادي المصري (Fadi · Manager)' : '👤 Fadi Al-Masri (Manager)'],
    ].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = val;
      empSel.append(o);
    });
    empSel.addEventListener('change', () => {
      const map = { sara: 'super_waiter', maher: 'super_bartender', ali: 'super_captain', fadi: 'super_manager' };
      if (empSel.value && map[empSel.value]) {
        roleSel.value = map[empSel.value];
      }
    });
    empLbl.append(empSel);

    rowAssign.append(roleLbl, empLbl);
    box.append(rowAssign);

    // 4. Due Time Input
    const dueRow = el('div', 'two');
    dueRow.style.marginTop = '10px';
    const dueLbl = el('label', '', ar ? '⏰ وقت التنفيذ المطلوب (اختياري):' : '⏰ Due Time (Optional):');
    const dueIn = el('input', 'in');
    dueIn.type = 'time';
    dueIn.value = FOH.time.nowHM();
    dueLbl.append(dueIn);
    dueRow.append(dueLbl);
    box.append(dueRow);

    // 5. Actions
    const acts = el('div', 'sheet-actions');
    acts.style.marginTop = '16px';
    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.addEventListener('click', () => dlg.close());

    const saveB = el('button', 'btn primary', ar ? '✅ حفظ المهمة وإرسال إشعار للموظف' : '✅ Save & Notify Staff');
    saveB.type = 'button';
    saveB.addEventListener('click', () => {
      const textVal = titleIn.value.trim();
      if (!textVal) return titleIn.focus();

      const targetSheet = sheetSel.value;
      const targetSecId = secSel.value;
      const rKey = roleSel.value;
      const empUser = empSel.value;
      const dueHM = dueIn.value || '';

      const roleBadgeMap = {
        super_waiter: '⭐ Super Waiter',
        super_bartender: '🍸 Super Bartender',
        super_captain: '🎖️ Super Captain',
        super_manager: '👑 Super Manager',
        all: ar ? '👥 الجميع' : '👥 All',
      };
      const empNameMap = {
        sara: ar ? 'سارة (Sara)' : 'Sara',
        maher: ar ? 'ماهر (Maher)' : 'Maher',
        ali: ar ? 'علي (Ali)' : 'Ali',
        fadi: ar ? 'فادي (Fadi)' : 'Fadi',
      };

      const assignedLabel = (empUser ? ('👤 ' + empNameMap[empUser] + ' · ') : '') + (roleBadgeMap[rKey] || '');

      const newItem = {
        id: 'asg_' + Date.now(),
        text: textVal,
        textAr: textVal,
        due: dueHM,
        role: '',
        assignedRoleKey: rKey,
        assignedUsername: empUser,
        assignedRoleLabel: assignedLabel,
        children: [],
      };

      if (targetSheet !== getActiveSheetType() && FOH.erpPwa && FOH.erpPwa.switchSheetType) {
        manualSheetOverride = targetSheet !== getScheduledSheetForNow();
        FOH.erpPwa.switchSheetType(targetSheet);
      }

      const secObj = (S.tpl.sections || []).find((s) => s.id === targetSecId) || S.tpl.sections[0];
      if (secObj) {
        secObj.items.unshift(newItem);
      }
      if (FOH.erpPwa && FOH.erpPwa.persistCurrentSheetState) {
        FOH.erpPwa.persistCurrentSheetState();
      }

      // Also add to Scheduled Tasks (S.tpl.tasks) so it shows in "📋 My Tasks" (#mine) too
      S.tpl.tasks.unshift({
        id: newItem.id,
        text: textVal,
        textAr: textVal,
        icon: targetSheet === 'opening' ? '☀️' : targetSheet === 'mid' ? '🌤️' : '🌙',
        rule: { type: 'once', date: S.date },
        start: S.date,
        time: dueHM || '14:00',
        lateAfter: 60,
        role: '',
        person: empUser ? empNameMap[empUser] : roleBadgeMap[rKey],
        assignedRoleKey: rKey,
        assignedUsername: empUser,
        assignedSheet: targetSheet,
        carry: true,
        paused: false,
      });
      FOH.store.saveTemplate(S.tpl);

      dlg.close();

      notifyMobileOnNewTaskAdded({
        titleEn: textVal,
        titleAr: textVal,
        dueHM,
        sectionLabel: (secObj ? (ar ? secObj.titleAr || secObj.title : secObj.title) : targetSheet),
        roleLabel: assignedLabel,
        remindBefore: 0,
      });

      if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
        FOH.cloudRealtime.broadcast('TASK_ASSIGNED', {
          senderName: (sess && sess.displayName) || 'Manager',
          targetSheet,
          dueHM,
          item: newItem,
        });
      }

      FOH.edit.toast(ar ? '✅ تم تعيين المهمة لـ (' + assignedLabel + ') وإرسال الإشعار!' : '✅ Task assigned to ' + assignedLabel + ' & notified!');
      FOH.app.render();
    });

    acts.append(cancelB, saveB);
    box.append(acts);
    dlg.append(box);
    dlg.showModal();
    titleIn.focus();
  }

  // Render Assignment Badges on Checklist Items & Filter Sections/Items by Assigned Employee/Role
  function renderAssignedTaskBadgesAndFilter() {
    const secEl = $('sections');
    if (!secEl || secEl.hidden || S.view !== 'opening' || S.editing) return;
    if (S.editing || S.view !== 'opening') return;
    const sess = getSession();
    const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
    const curRole = getCurrentSuperRoleKey();
    const isLeader = curRole === 'super_manager' || curRole === 'super_captain';

    // 1. Section-level department filtering for Mid-Shift & Opening when roleScopeOnly is active
    if (roleScopeOnly && !isLeader) {
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

    // 2. Item-level badges & filtering
    const flatItems = new Map();
    (S.tpl.sections || []).forEach((s) => {
      (s.items || []).forEach((it) => {
        flatItems.set(it.id, it);
        (it.children || []).forEach((ch) => flatItems.set(ch.id, ch));
      });
    });

    document.querySelectorAll('#sections li.item, #sections li.kid').forEach((li) => {
      const cb = li.querySelector('input.ck[data-id]');
      if (!cb) return;
      const itemId = cb.dataset.id;
      const itemObj = flatItems.get(itemId);
      if (!itemObj) return;

      const txtContainer = li.querySelector('.txt') || li.querySelector('label');
      if (txtContainer && itemObj.assignedRoleLabel && !txtContainer.querySelector('.assigned-task-pill')) {
        const pill = el('span', 'assigned-task-pill', '🎯 ' + itemObj.assignedRoleLabel);
        txtContainer.append(pill);
      }

      if (roleScopeOnly && !isLeader) {
        let visible = true;
        if (itemObj.assignedUsername && itemObj.assignedUsername !== curUser) {
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

  function injectAssignTaskBtnIntoToolbarAndMine() {
    const ar = isAr();
    const toolbar = document.querySelector('#checklistGovBar .unified-sec-toolbar');
    if (toolbar && !toolbar.querySelector('#toolbarAssignTaskBtn')) {
      const btn = el('button', 'u-pill primary-assign', ar ? '➕ إضافة وتعيين مهمة' : '➕ Assign Task');
      btn.type = 'button';
      btn.id = 'toolbarAssignTaskBtn';
      btn.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());
      toolbar.prepend(btn);
    }

    const mineRoot = $('mine');
    if (mineRoot && !mineRoot.hidden && !mineRoot.querySelector('#mineAssignTaskBar')) {
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





  FOH.taskAssignment = {
    openAssignTaskToStaffOrRoleModal,
    renderAssignedTaskBadgesAndFilter,
    injectAssignTaskBtnIntoToolbarAndMine,
  };
})(window.FOH = window.FOH || {});
