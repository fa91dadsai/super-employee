// foh-opening/js/domains/operations/hours-settings.js
// Operational Hours & Ordering Delegation Matrix Settings Form (< 350 lines)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;

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

  function makeTimeField(lblTxt, val) {
    const l = el('label', 'ops-time-field');
    const sp = el('span', '', lblTxt);
    const inp = el('input', 'in');
    inp.type = 'time';
    inp.value = val;
    l.append(sp, inp);
    return { l, inp };
  }

  function renderHoursSettingsCard(cfg, ar) {
    const h = cfg.hours || {};
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
    return hoursCard;
  }

  function renderStaffRoleRow(opts = {}) {
    const { uname, fullLabel, cfg, ar } = opts;
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

    row.append(el('b', '', '👤 ' + fullLabel), sel);
    if (FOH.modalPicker && FOH.modalPicker.enhanceSelect) {
      FOH.modalPicker.enhanceSelect(sel, {
        title: ar ? 'تغيير منصب الموظف' : 'Change Staff Role',
        subtitle: ar ? ('اختر المنصب الجديد لـ ' + fullLabel) : ('Select role for ' + fullLabel),
        icon: '👑',
      });
    }
    return row;
  }

  function renderRolePermissionCard(rKey, cfg, ar) {
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
    return rCard;
  }

  function renderSuperRolesSettingsCard(cfg, ar) {
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

    const assignBox = el('div', 'super-role-card');
    assignBox.innerHTML = '<div class="super-role-card-head"><b>👥 ' + (ar ? 'تعيين المناصب (Super Roles) للموظفين' : 'Assign Super Roles to Staff') + '</b></div>';
    const staffAccounts = [
      ['fadi', 'Fadi Al-Masri (فادي)'],
      ['ali', 'Ali Hassan (علي)'],
      ['maher', 'Maher Zaid (ماهر)'],
      ['sara', 'Sara Khoury (سارة)'],
    ];
    staffAccounts.forEach(([uname, fullLabel]) => {
      assignBox.append(renderStaffRoleRow({ uname, fullLabel, cfg, ar }));
    });
    rolesCard.append(assignBox);

    ['super_manager', 'super_captain', 'super_bartender', 'super_waiter'].forEach((rKey) => {
      rolesCard.append(renderRolePermissionCard(rKey, cfg, ar));
    });
    return rolesCard;
  }

  // Delegation card renderers provided by FOH.delegationSettings

  // ---- Inject Operational Hours & Super Roles Matrix into Settings (#settingsView) ----
  function appendHoursAndSuperRolesSettings(root) {
    if (!root || root.querySelector('#opsHoursSettingsCard')) return;
    const ar = isAr();
    const cfg = loadOpsConfig();
    const ds = FOH.delegationSettings || {};
    const staffList = ds.getOperationalStaffList ? ds.getOperationalStaffList(ar) : [];

    const hoursCard = renderHoursSettingsCard(cfg, ar);
    const rolesCard = renderSuperRolesSettingsCard(cfg, ar);
    const ordCard = ds.renderOrderingDelegationCard ? ds.renderOrderingDelegationCard(cfg, ar, staffList) : null;
    const taskAsgCard = ds.renderTaskDelegationCard ? ds.renderTaskDelegationCard(cfg, ar, staffList) : null;

    const cards = [hoursCard, rolesCard, ordCard, taskAsgCard].filter(Boolean);
    const firstCard = root.querySelector('section.card');
    if (firstCard && firstCard.nextSibling) {
      let ref = firstCard.nextSibling;
      cards.forEach((c) => {
        root.insertBefore(c, ref);
        ref = c.nextSibling;
      });
    } else {
      cards.forEach((c) => root.append(c));
    }
  }

  FOH.hoursSettings = {
    appendHoursAndSuperRolesSettings,
  };
})(window.FOH = window.FOH || {});
