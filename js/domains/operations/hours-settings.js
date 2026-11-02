// foh-opening/js/domains/operations/hours-settings.js
// Operational Hours & Ordering Delegation Matrix Settings Form
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const PERM_LABELS = (FOH.opsLifecycle && FOH.opsLifecycle.PERM_LABELS) || (FOH.PERM_LABELS || []);
  const SUPER_ROLES_META = new Proxy({}, {
    get(target, prop) {
      const meta = (FOH.opsLifecycle && FOH.opsLifecycle.SUPER_ROLES_META) || (FOH.SUPER_ROLES_META || {});
      return meta[prop];
    },
    ownKeys() {
      const meta = (FOH.opsLifecycle && FOH.opsLifecycle.SUPER_ROLES_META) || (FOH.SUPER_ROLES_META || {});
      return Object.keys(meta);
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true, value: this.get(target, prop) };
    }
  });

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function loadOpsConfig() {
    return FOH.opsLifecycle ? FOH.opsLifecycle.loadOpsConfig() : {};
  }

  function saveOpsConfig(c) {
    if (FOH.opsLifecycle) FOH.opsLifecycle.saveOpsConfig(c);
  }

  function roleName(id) {
    return FOH.taskSheet && FOH.taskSheet.roleName ? FOH.taskSheet.roleName(id) : 'Staff';
  }

  // ---- Inject Operational Hours & Super Roles Matrix into Settings (#settingsView) ----
  function appendHoursAndSuperRolesSettings(root) {
    if (!root || root.querySelector('#opsHoursSettingsCard')) return;
    const ar = isAr();
    const cfg = loadOpsConfig();
    const h = cfg.hours;

    // Card 1: Restaurant Operational Hours, Prep Start, Kitchen/Bar Last Order & Last Guest Close
    const hoursCard = el('section', 'card');
    hoursCard.id = 'opsHoursSettingsCard';
    hoursCard.style.padding = '16px';
    hoursCard.style.border = '1.5px solid var(--accent)';
    hoursCard.innerHTML =
      '<h3>🕒 ' +
      (ar
        ? 'ساعات عمل المطعم، دوام التحضير، الـ Last Order وإغلاق آخر زبون'
        : 'Restaurant Hours, Staff Prep Start, Last Order & Last-Guest Close') +
      '</h3>' +
      '<p class="setting-note">' +
      (ar
        ? 'حدد متى يبدأ دوام الموظفين للتحضير (مثلاً 12:00 ظهراً)، متى يفتح المطعم للزبائن (1:00 ظهراً)، مواعيد Last Order للمطبخ والبار، والحد الأدنى للإغلاق مع آخر زبون:'
        : 'Configure staff prep shift start, guest opening time, Kitchen/Bar Last Order, and minimum closing time:') +
      '</p>';

    const grid = el('div', 'ops-hours-grid');

    const makeTimeField = (lblTxt, val) => {
      const l = el('label', 'ops-time-field');
      const sp = el('span', '', lblTxt);
      const inp = el('input', 'in');
      inp.type = 'time';
      inp.value = val;
      l.append(sp, inp);
      return { l, inp };
    };

    const fPrep = makeTimeField(ar ? '☀️ بداية دوام التحضير (قبل الفتح)' : '☀️ Staff Shift & Prep Start', h.prepStart);
    const fOpen = makeTimeField(ar ? '🍽️ ساعة فتح المطعم للزبائن' : '🍽️ Restaurant Opens for Guests', h.doorsOpen);
    const fKitchenLO = makeTimeField(ar ? '🍳 آخر طلب للمطبخ (Kitchen LO)' : '🍳 Kitchen Last Order', h.kitchenLastOrder);
    const fBarLO = makeTimeField(ar ? '🍸 آخر طلب للبار (Bar LO)' : '🍸 Bar Last Order', h.barLastOrder);
    const fMinClose = makeTimeField(ar ? '🚪 الحد الأدنى لوقت إغلاق المطعم' : '🚪 Minimum Official Closing Time', h.minCloseTime);

    grid.append(fPrep.l, fOpen.l, fKitchenLO.l, fBarLO.l, fMinClose.l);
    hoursCard.append(grid);

    const lastGuestRow = el('label', 'tog');
    lastGuestRow.style.display = 'flex';
    lastGuestRow.style.justifyContent = 'space-between';
    lastGuestRow.style.alignItems = 'center';
    lastGuestRow.style.padding = '12px 0 6px';
    lastGuestRow.style.marginTop = '8px';
    lastGuestRow.style.borderTop = '1px solid var(--line)';
    lastGuestRow.innerHTML =
      '<span><b>⏳ ' +
      (ar
        ? 'الإغلاق مع مغادرة آخر زبون + منع الإغلاق المبكر إذا كان المطعم فارغاً (مثلاً 11:30 م)'
        : 'Close with Last Guest + Block Early Closing when empty (e.g. at 11:30 PM)') +
      '</b></span>';
    const lgCb = el('input', 'sw');
    lgCb.type = 'checkbox';
    lgCb.checked = h.closeWithLastGuest !== false;
    lastGuestRow.append(lgCb);
    hoursCard.append(lastGuestRow);

    const saveHoursBtn = el('button', 'btn primary', ar ? '💾 حفظ مواعيد الدوام والافتتاح والـ Last Order والإغلاق' : '💾 Save Operational Hours & Last Order Rules');
    saveHoursBtn.type = 'button';
    saveHoursBtn.style.width = '100%';
    saveHoursBtn.style.marginTop = '10px';
    saveHoursBtn.addEventListener('click', () => {
      cfg.hours = {
        prepStart: fPrep.inp.value || '12:00',
        doorsOpen: fOpen.inp.value || '13:00',
        kitchenLastOrder: fKitchenLO.inp.value || '00:00',
        barLastOrder: fBarLO.inp.value || '01:00',
        minCloseTime: fMinClose.inp.value || '02:00',
        closeWithLastGuest: lgCb.checked,
      };
      saveOpsConfig(cfg);
      FOH.edit.toast(ar ? 'تم حفظ ساعات عمل المطعم ومواعيد الـ Last Order ✓' : 'Operational hours & Last Order saved ✓');
      FOH.app.render();
    });
    hoursCard.append(saveHoursBtn);

    // Card 2: Super Roles Hierarchy & Permission Matrix
    const rolesCard = el('section', 'card');
    rolesCard.id = 'superRolesSettingsCard';
    rolesCard.style.padding = '16px';
    rolesCard.innerHTML =
      '<h3>👑 ' +
      (ar
        ? 'صلاحيات المناصب القيادية (Super Manager · Super Captain · Super Bartender · Super Waiter)'
        : 'Super Roles Hierarchy & Granular Permission Matrix') +
      '</h3>' +
      '<p class="setting-note">' +
      (ar
        ? 'حدد المنصب القيادي (Super Role) لكل موظف، وتَحكّم بالصلاحيات الممنوحة لكل منصب بدقة:'
        : 'Assign each employee a Super Role and customize the exact permissions granted to each role:') +
      '</p>';

    // Staff Super Role Assignment Box
    const assignBox = el('div', 'super-role-card');
    assignBox.innerHTML = '<div class="super-role-card-head"><b>👥 ' + (ar ? 'تعيين المناصب (Super Roles) للموظفين' : 'Assign Super Roles to Staff') + '</b></div>';
    const staffAccounts = [
      ['fadi', 'Fadi Al-Masri (فادي)'],
      ['ali', 'Ali Hassan (علي)'],
      ['maher', 'Maher Zaid (ماهر)'],
      ['sara', 'Sara Khoury (سارة)'],
    ];
    staffAccounts.forEach(([uname, fullLabel]) => {
      const row = el('div', '');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed var(--line)';

      const curRole = (cfg.staffSuperRoles && cfg.staffSuperRoles[uname]) || 'staff';
      const sel = el('select', 'in');
      sel.style.width = 'auto';
      sel.style.minHeight = '36px';
      Object.values(SUPER_ROLES_META).forEach((rm) => {
        const o = el('option', '', ar ? rm.labelAr : rm.labelEn);
        o.value = rm.id;
        o.selected = rm.id === curRole;
        sel.append(o);
      });
      sel.addEventListener('change', () => {
        cfg.staffSuperRoles[uname] = sel.value;
        saveOpsConfig(cfg);
        FOH.edit.toast(ar ? 'تم تحديث منصب ' + fullLabel + ' إلى ' + SUPER_ROLES_META[sel.value].badge + ' ✓' : 'Updated role for ' + fullLabel + ' ✓');
        FOH.app.render();
      });

      if (FOH.modalPicker && FOH.modalPicker.enhanceSelect) {
        FOH.modalPicker.enhanceSelect(sel, {
          title: ar ? 'تغيير منصب الموظف' : 'Change Staff Role',
          subtitle: ar ? ('اختر المنصب الجديد لـ ' + fullLabel) : ('Select role for ' + fullLabel),
          icon: '👑',
        });
      }
      row.append(el('b', '', '👤 ' + fullLabel), sel);
      assignBox.append(row);
    });
    rolesCard.append(assignBox);

    // Role Permissions Matrix Cards
    ['super_manager', 'super_captain', 'super_bartender', 'super_waiter'].forEach((rKey) => {
      const rm = SUPER_ROLES_META[rKey];
      const rPerms = cfg.rolePermissions[rKey] || {};
      const rCard = el('div', 'super-role-card');
      rCard.innerHTML =
        '<div class="super-role-card-head">' +
        '<b>' + (ar ? rm.labelAr : rm.labelEn) + '</b>' +
        '<span class="super-role-pill ' + rKey + '">' + rm.badge + '</span>' +
        '</div>';

      const pGrid = el('div', 'super-perm-grid');
      PERM_LABELS.forEach(([pKey, lblAr, lblEn]) => {
        const item = el('label', 'super-perm-item');
        const txt = el('span', '', ar ? lblAr : lblEn);
        const cb = el('input', 'sw');
        cb.type = 'checkbox';
        cb.checked = !!rPerms[pKey];
        cb.addEventListener('change', () => {
          if (!cfg.rolePermissions[rKey]) cfg.rolePermissions[rKey] = {};
          cfg.rolePermissions[rKey][pKey] = cb.checked;
          saveOpsConfig(cfg);
          FOH.edit.toast(ar ? 'تم تحديث صلاحيات ' + rm.badge + ' ✓' : 'Updated permissions for ' + rm.badge + ' ✓');
          FOH.app.render();
        });
        item.append(txt, cb);
        pGrid.append(item);
      });
      rCard.append(pGrid);
      rolesCard.append(rCard);
    });

    // Card 3: Warehouse & Bar Ordering Authority & Delegation (#orderingDelegationCard)
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

    // Section A: By Role
    const roleBox = el('div', 'super-role-card');
    roleBox.style.marginBottom = '12px';
    roleBox.innerHTML =
      '<div class="super-role-card-head">' +
      '<b>🏷️ ' + (ar ? '1. التوجيه حسب المنصب القيادي (Role / Position)' : '1. Authorize Entire Role / Position') + '</b>' +
      '</div>' +
      '<p style="font-size:0.75rem;color:var(--ink2);margin:4px 0 10px;">' +
      (ar ? 'أي موظف يحمل المنصب المفعّل سيتمكن تلقائياً من فتح قسم الطلبيات (مثلاً: كافة البارتندرية الأربعة لمستلزمات البار).' : 'Any employee in an active role can access the Orders section (e.g. all 4 bartenders for bar supply).') +
      '</p>';

    const delRoles = (cfg.orderingDelegation && Array.isArray(cfg.orderingDelegation.roles))
      ? cfg.orderingDelegation.roles
      : ['super_manager', 'super_bartender'];

    [
      ['super_bartender', ar ? '🍸 سوبر بارتندر (Super Bartender)' : '🍸 Super Bartender', ar ? 'تمكين كافة البارتندرية الأربعة من طلب بضاعة ومستلزمات البار' : 'Allow all bartenders to place bar beverage orders'],
      ['super_captain', ar ? '🎖️ سوبر كابتن (Super Captain)' : '🎖️ Super Captain', ar ? 'تمكين كافة الكباتن من إنشاء وإرسال الطلبيات' : 'Allow all captains to create orders'],
      ['super_waiter', ar ? '⭐ سوبر ويتر (Super Waiter)' : '⭐ Super Waiter', ar ? 'تمكين كافة الويترية من قسم الطلبيات (غير موصى به لكثرة العدد)' : 'Allow all waiters to create orders (not recommended)'],
    ].forEach(([rk, rkLabel, rkSub]) => {
      const row = el('label', 'tog');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed var(--line)';
      row.style.cursor = 'pointer';

      row.innerHTML = '<div><b>' + rkLabel + '</b><small style="display:block;color:var(--ink2);font-size:0.72rem;">' + rkSub + '</small></div>';
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
    ordCard.append(roleBox);

    // Section B: By Specific Staff Member by Name
    const staffBox = el('div', 'super-role-card');
    staffBox.innerHTML =
      '<div class="super-role-card-head">' +
      '<b>👤 ' + (ar ? '2. التخصيص بالاسم لموظف محدد (Specific Staff Delegation)' : '2. Specific Staff Member Delegation') + '</b>' +
      '</div>' +
      '<p style="font-size:0.75rem;color:var(--ink2);margin:4px 0 10px;">' +
      (ar ? 'إذا كان لديك موظف معين (مثل سارة) مكلّف بالطلبيات، يمكنك تفعيل الصلاحية لها بالاسم دون إظهارها لبقية الويترية أو الكباتن:' : 'Designate a specific staff member (e.g. Sara) for orders without granting access to other waiters or captains:') +
      '</p>';

    const delStaff = (cfg.orderingDelegation && Array.isArray(cfg.orderingDelegation.staffUsernames))
      ? cfg.orderingDelegation.staffUsernames
      : ['sara'];

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

    staffList.forEach(([uname, fullName, roleTag]) => {
      const row = el('label', 'tog');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed var(--line)';
      row.style.cursor = uname === 'fadi' ? 'default' : 'pointer';

      row.innerHTML = '<div><b>👤 ' + fullName + '</b><small style="display:block;color:var(--ink2);font-size:0.72rem;">' + (uname === 'fadi' ? (ar ? '👑 المدير العام (مفعل دائماً)' : '👑 General Manager (Always Active)') : (ar ? 'مهمة إدارة طلبيات الصالة والمستودع' : 'Floor & warehouse order mission')) + '</small></div>';

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
    ordCard.append(staffBox);

    // Insert at the top of #settingsView right after the Brand card
    const firstCard = root.querySelector('section.card');
    if (firstCard && firstCard.nextSibling) {
      root.insertBefore(hoursCard, firstCard.nextSibling);
      root.insertBefore(rolesCard, hoursCard.nextSibling);
      root.insertBefore(ordCard, rolesCard.nextSibling);
    } else {
      root.append(hoursCard, rolesCard, ordCard);
    }
  }




  FOH.hoursSettings = {
    appendHoursAndSuperRolesSettings,
  };
})(window.FOH = window.FOH || {});
