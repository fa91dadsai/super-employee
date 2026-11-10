// foh-opening/js/domains/operations/delegation-settings.js
// Ordering and Task Assignment Delegation Settings UI (< 350 lines)

(function () {
  'use strict';

  window.FOH = window.FOH || {};

  const $ = (id) => document.getElementById(id);
  const el = (...args) => (FOH.view && FOH.view.el ? FOH.view.el(...args) : document.createElement(args[0]));
  const S = () => FOH.state || {};

  function roleName(id) {
    const roles = (S() && S().tpl && S().tpl.roles) || [];
    const r = roles.find((x) => x.id === id);
    return r ? r.name : id;
  }

  function saveOpsConfig(c) {
    if (FOH.opsLifecycle && FOH.opsLifecycle.saveOpsConfig) {
      FOH.opsLifecycle.saveOpsConfig(c);
    }
  }

  function getOperationalStaffList(ar) {
    const staffList = [
      ['sara', ar ? 'سارة خوري (سوبر ويتر)' : 'Sara Khoury (Super Waiter)', '⭐ Waiter'],
      ['ali', ar ? 'علي حسن (سوبر كابتن)' : 'Ali Hassan (Super Captain)', '🎖️ Captain'],
      ['maher', ar ? 'ماهر زيد (سوبر بارتندر)' : 'Maher Zaid (Super Bartender)', '🍸 Bartender'],
      ['fadi', ar ? 'فادي المصري (سوبر مانجر)' : 'Fadi Al-Masri (Super Manager)', '👑 Manager'],
    ];
    const seenU = new Set(staffList.map((s) => s[0]));
    (S.tpl.staff || []).forEach((st) => {
      const u = (st.username || (st.name || '').split(' ')[0] || st.id || '').toLowerCase().trim();
      if (u && !seenU.has(u)) {
        seenU.add(u);
        const rName = roleName(st.role) || 'Staff';
        const disp = st.name + (st.nickname ? ' (' + st.nickname + ')' : '');
        staffList.push([u, disp, rName]);
      }
    });
    return staffList;
  }

  function renderOrderingRoleBox(cfg, ar) {
    const roleBox = el('div', 'super-role-card');
    roleBox.style.marginBottom = '12px';
    roleBox.innerHTML =
      '<div class="super-role-card-head">' +
      '<b>🏷️ ' + (ar ? '1. التوجيه حسب المنصب القيادي (Role / Position)' : '1. Authorize Entire Role / Position') + '</b>' +
      '</div>';

    const delRoles = (cfg.orderingDelegation && Array.isArray(cfg.orderingDelegation.roles))
      ? cfg.orderingDelegation.roles
      : ['super_manager', 'super_bartender'];

    const roleDefs = [
      ['super_bartender', ar ? '🍸 سوبر بارتندر (Super Bartender)' : '🍸 Super Bartender', ar ? 'تمكين كافة البارتندرية الأربعة من طلب بضاعة ومستلزمات البار' : 'Allow all bartenders to place bar beverage orders'],
      ['super_captain', ar ? '🎖️ سوبر كابتن (Super Captain)' : '🎖️ Super Captain', ar ? 'تمكين كافة الكباتن من إنشاء وإرسال الطلبيات' : 'Allow all captains to create orders'],
      ['super_waiter', ar ? '⭐ سوبر ويتر (Super Waiter)' : '⭐ Super Waiter', ar ? 'تمكين كافة الويترية من قسم الطلبيات (غير موصى به لكثرة العدد)' : 'Allow all waiters to create orders (not recommended)'],
    ];

    roleDefs.forEach(([rk, rkLabel, rkSub]) => {
      const row = el('label', 'tog');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed var(--line)';
      row.style.cursor = 'pointer';
      row.innerHTML = '<div><b>' + FOH.escapeHtml(rkLabel) + '</b><small style="display:block;color:var(--ink2);font-size:0.72rem;">' + FOH.escapeHtml(rkSub) + '</small></div>';
      const cb = el('input', 'sw');
      cb.type = 'checkbox';
      cb.checked = delRoles.includes(rk);
      cb.addEventListener('change', () => {
        if (!cfg.orderingDelegation) cfg.orderingDelegation = { roles: ['super_manager', 'super_bartender'], staffUsernames: ['sara'] };
        if (!Array.isArray(cfg.orderingDelegation.roles)) cfg.orderingDelegation.roles = ['super_manager', 'super_bartender'];
        if (cb.checked) {
          if (!cfg.orderingDelegation.roles.includes(rk)) cfg.orderingDelegation.roles.push(rk);
        } else {
          cfg.orderingDelegation.roles = cfg.orderingDelegation.roles.filter((r) => r !== rk);
        }
        if (!cfg.orderingDelegation.roles.includes('super_manager')) cfg.orderingDelegation.roles.push('super_manager');
        saveOpsConfig(cfg);
        FOH.edit.toast(ar ? 'تم تحديث صلاحية الطلبيات لمنصب ' + rkLabel + ' ✓' : 'Updated ordering authority for ' + rkLabel + ' ✓');
        FOH.app.render();
      });
      row.append(cb);
      roleBox.append(row);
    });
    return roleBox;
  }

  function renderOrderingStaffBox(cfg, ar, staffList) {
    const staffBox = el('div', 'super-role-card');
    staffBox.innerHTML =
      '<div class="super-role-card-head">' +
      '<b>👤 ' + (ar ? '2. التخصيص بالاسم لموظف محدد (Specific Staff Delegation)' : '2. Specific Staff Member Delegation') + '</b>' +
      '</div>';

    const delStaff = (cfg.orderingDelegation && Array.isArray(cfg.orderingDelegation.staffUsernames))
      ? cfg.orderingDelegation.staffUsernames
      : ['sara'];

    staffList.forEach(([uname, fullName]) => {
      const row = el('label', 'tog');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed var(--line)';
      row.style.cursor = uname === 'fadi' ? 'default' : 'pointer';
      row.innerHTML = '<div><b>👤 ' + FOH.escapeHtml(fullName) + '</b><small style="display:block;color:var(--ink2);font-size:0.72rem;">' + (uname === 'fadi' ? (ar ? '👑 المدير العام (مفعل دائماً)' : '👑 General Manager (Always Active)') : (ar ? 'مهمة إدارة طلبيات الصالة والمستودع' : 'Floor & warehouse order mission')) + '</small></div>';

      if (uname === 'fadi') {
        const badge = el('span', 'tag mine', ar ? 'مفعل دائماً' : 'Always Active');
        badge.style.fontSize = '0.72rem';
        row.append(badge);
      } else {
        const cb = el('input', 'sw');
        cb.type = 'checkbox';
        cb.checked = delStaff.map((s) => s.toLowerCase()).includes(uname);
        cb.addEventListener('change', () => {
          if (!cfg.orderingDelegation) cfg.orderingDelegation = { roles: ['super_manager', 'super_bartender'], staffUsernames: ['sara'] };
          if (!Array.isArray(cfg.orderingDelegation.staffUsernames)) cfg.orderingDelegation.staffUsernames = ['sara'];
          if (cb.checked) {
            if (!cfg.orderingDelegation.staffUsernames.includes(uname)) cfg.orderingDelegation.staffUsernames.push(uname);
          } else {
            cfg.orderingDelegation.staffUsernames = cfg.orderingDelegation.staffUsernames.filter((u) => u !== uname);
          }
          saveOpsConfig(cfg);
          FOH.edit.toast(ar ? 'تم تحديث صلاحية الطلبيات للموظف ' + fullName + ' ✓' : 'Updated ordering authority for ' + fullName + ' ✓');
          FOH.app.render();
        });
        row.append(cb);
      }
      staffBox.append(row);
    });
    return staffBox;
  }

  function renderOrderingDelegationCard(cfg, ar, staffList) {
    const ordCard = el('section', 'card');
    ordCard.id = 'orderingDelegationSettingsCard';
    ordCard.style.padding = '16px';
    ordCard.style.border = '1.5px solid #10b981';
    ordCard.innerHTML =
      '<h3>🛒 ' +
      (ar
        ? 'تفويض وإدارة صلاحيات طلبيات المستودع والبار (Ordering Delegation & Missions)'
        : 'Warehouse & Bar Ordering Authority & Delegation') +
      '</h3>' +
      '<p class="setting-note">' +
      (ar
        ? 'تحكّم بدقة بمن يرى قسم الطلبيات ويحق له إرسال طلبات المستودع والبار. يمكنك توجيه الطلبية لمنصب بالكامل (مثل البارتندر)، أو تخصيص ويتر أو كابتن محدد بالاسم دون فتحها لبقية الفريق منعاً للتشتت:'
        : 'Control who sees the Orders section and submits warehouse requisitions. Grant access to an entire role (e.g. Bartenders) or designate specific staff members by name:') +
      '</p>';

    ordCard.append(renderOrderingRoleBox(cfg, ar));
    ordCard.append(renderOrderingStaffBox(cfg, ar, staffList));
    return ordCard;
  }

  function renderTaskAsgRoleBox(cfg, ar) {
    const asgRoleBox = el('div', 'super-role-card');
    asgRoleBox.style.marginBottom = '12px';
    asgRoleBox.innerHTML =
      '<div class="super-role-card-head">' +
      '<b>🏷️ ' + (ar ? '1. التوجيه حسب المنصب القيادي (Role / Position)' : '1. Authorize Entire Role / Position') + '</b>' +
      '</div>';

    const delAsgRoles = (cfg.taskAssignmentDelegation && Array.isArray(cfg.taskAssignmentDelegation.roles))
      ? cfg.taskAssignmentDelegation.roles
      : ['super_manager', 'super_captain'];

    const roleDefs = [
      ['super_captain', ar ? '🎖️ سوبر كابتن (Super Captain)' : '🎖️ Super Captain', ar ? 'تمكين المشرفين والكباتن من تعيين المهام للويترية والبار (موصى به)' : 'Allow supervisors and captains to assign tasks (Recommended)'],
      ['super_bartender', ar ? '🍸 سوبر بارتندر (Super Bartender)' : '🍸 Super Bartender', ar ? 'تمكين البارتندرية من تعيين مهام للبار' : 'Allow bartenders to assign tasks'],
      ['super_waiter', ar ? '⭐ سوبر ويتر (Super Waiter)' : '⭐ Super Waiter', ar ? 'تمكين كافة الويترية من تعيين مهام (غير موصى به لكافة الفريق)' : 'Allow all waiters to assign tasks (Not recommended for whole team)'],
    ];

    roleDefs.forEach(([rk, rkLabel, rkSub]) => {
      const row = el('label', 'tog');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed var(--line)';
      row.style.cursor = 'pointer';
      row.innerHTML = '<div><b>' + FOH.escapeHtml(rkLabel) + '</b><small style="display:block;color:var(--ink2);font-size:0.72rem;">' + FOH.escapeHtml(rkSub) + '</small></div>';
      const cb = el('input', 'sw');
      cb.type = 'checkbox';
      cb.checked = delAsgRoles.includes(rk);
      cb.addEventListener('change', () => {
        if (!cfg.taskAssignmentDelegation) cfg.taskAssignmentDelegation = { roles: ['super_manager', 'super_captain'], staffUsernames: ['ali'] };
        if (!Array.isArray(cfg.taskAssignmentDelegation.roles)) cfg.taskAssignmentDelegation.roles = ['super_manager', 'super_captain'];
        if (cb.checked) {
          if (!cfg.taskAssignmentDelegation.roles.includes(rk)) cfg.taskAssignmentDelegation.roles.push(rk);
        } else {
          cfg.taskAssignmentDelegation.roles = cfg.taskAssignmentDelegation.roles.filter((r) => r !== rk);
        }
        if (!cfg.taskAssignmentDelegation.roles.includes('super_manager')) cfg.taskAssignmentDelegation.roles.push('super_manager');
        saveOpsConfig(cfg);
        FOH.edit.toast(ar ? 'تم تحديث صلاحية تعيين المهام لمنصب ' + rkLabel + ' ✓' : 'Updated task assignment authority for ' + rkLabel + ' ✓');
        FOH.app.render();
      });
      row.append(cb);
      asgRoleBox.append(row);
    });
    return asgRoleBox;
  }

  function renderTaskAsgStaffBox(cfg, ar, staffList) {
    const asgStaffBox = el('div', 'super-role-card');
    asgStaffBox.innerHTML =
      '<div class="super-role-card-head">' +
      '<b>👤 ' + (ar ? '2. التخصيص بالاسم لموظف محدد (Specific Staff Delegation)' : '2. Specific Staff Member Delegation') + '</b>' +
      '</div>';

    const delAsgStaff = (cfg.taskAssignmentDelegation && Array.isArray(cfg.taskAssignmentDelegation.staffUsernames))
      ? cfg.taskAssignmentDelegation.staffUsernames
      : ['ali'];

    staffList.forEach(([uname, fullName]) => {
      const row = el('label', 'tog');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed var(--line)';
      row.style.cursor = uname === 'fadi' ? 'default' : 'pointer';
      row.innerHTML = '<div><b>👤 ' + FOH.escapeHtml(fullName) + '</b><small style="display:block;color:var(--ink2);font-size:0.72rem;">' + (uname === 'fadi' ? (ar ? '👑 المدير العام (مفعل دائماً)' : '👑 General Manager (Always Active)') : (ar ? 'مهمة تفويض وإسناد المهام اليومية للفريق' : 'Delegation of daily team task assignments')) + '</small></div>';

      if (uname === 'fadi') {
        const badge = el('span', 'tag mine', ar ? 'مفعل دائماً' : 'Always Active');
        badge.style.fontSize = '0.72rem';
        row.append(badge);
      } else {
        const cb = el('input', 'sw');
        cb.type = 'checkbox';
        cb.checked = delAsgStaff.map((s) => s.toLowerCase()).includes(uname);
        cb.addEventListener('change', () => {
          if (!cfg.taskAssignmentDelegation) cfg.taskAssignmentDelegation = { roles: ['super_manager', 'super_captain'], staffUsernames: ['ali'] };
          if (!Array.isArray(cfg.taskAssignmentDelegation.staffUsernames)) cfg.taskAssignmentDelegation.staffUsernames = ['ali'];
          if (cb.checked) {
            if (!cfg.taskAssignmentDelegation.staffUsernames.includes(uname)) cfg.taskAssignmentDelegation.staffUsernames.push(uname);
          } else {
            cfg.taskAssignmentDelegation.staffUsernames = cfg.taskAssignmentDelegation.staffUsernames.filter((u) => u !== uname);
          }
          saveOpsConfig(cfg);
          FOH.edit.toast(ar ? 'تم تحديث صلاحية تعيين المهام للموظف ' + fullName + ' ✓' : 'Updated task assignment authority for ' + fullName + ' ✓');
          FOH.app.render();
        });
        row.append(cb);
      }
      asgStaffBox.append(row);
    });
    return asgStaffBox;
  }

  function renderTaskDelegationCard(cfg, ar, staffList) {
    const asgCard = el('section', 'card');
    asgCard.id = 'taskAssignmentDelegationSettingsCard';
    asgCard.style.padding = '16px';
    asgCard.style.border = '1.5px solid #6366f1';
    asgCard.innerHTML =
      '<h3>📋 ' +
      (ar
        ? 'تفويض وإدارة صلاحيات إنشاء وتعيين المهام (Task Assignment Delegation)'
        : 'Task Creation & Assignment Authority & Delegation') +
      '</h3>' +
      '<p class="setting-note">' +
      (ar
        ? 'تحكّم بمن يحق له تعيين وتوجيه مهام إضافية لزملائه في الشيفت. يمكنك تفويض منصب الكابتن بالكامل، أو تفويض شخص محدد بالاسم ليتولى التنسيق الميداني:'
        : 'Control who can assign extra operational tasks to team members during shifts. Grant authority to an entire role or specific staff members:') +
      '</p>';

    asgCard.append(renderTaskAsgRoleBox(cfg, ar));
    asgCard.append(renderTaskAsgStaffBox(cfg, ar, staffList));
    return asgCard;
  }

  FOH.delegationSettings = {
    getOperationalStaffList,
    renderOrderingDelegationCard,
    renderTaskDelegationCard,
  };
})();

