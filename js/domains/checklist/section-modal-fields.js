// foh-opening/js/domains/checklist/section-modal-fields.js
// Sub-renderers and field components for section assignment modal (< 350 lines)

(function () {
  'use strict';

  window.FOH = window.FOH || {};

  const { el } = FOH.view || { el: (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; } };

  const ICONS = ['🍳', '🍸', '🍷', '🌿', '📦', '🧼', '🧹', '📋', '🚪', '☕', '🧾', '❄️', '🔥', '✨'];

  const DEPT_OPTIONS = [
    { key: 'floor', labelAr: '🍽️ الصالة وتجهيز الطاولات (Floor)', labelEn: '🍽️ Dining Floor & Tables' },
    { key: 'bar', labelAr: '🍸 البار والمشروبات (Bar)', labelEn: '🍸 Bar & Beverages' },
    { key: 'host', labelAr: '🛎️ الاستقبال والترحيب (Host/Reception)', labelEn: '🛎️ Host & Reception' },
    { key: 'back', labelAr: '📦 المستودع والخدمات الخلفية (Back Area)', labelEn: '📦 Back Area & Storage' },
    { key: 'hygiene', labelAr: '🧼 النظافة والتعقيم (Hygiene)', labelEn: '🧼 Hygiene & Sanitation' },
    { key: 'closing', labelAr: '🔒 إغلاق وتأمين الشفت (Shift Close)', labelEn: '🔒 Shift Close & Lock' },
  ];

  const ROLE_OPTIONS = [
    { key: 'all', labelAr: '👥 متاح للجميع (Shared / Common)', labelEn: '👥 Shared / Common' },
    { key: 'waiter', labelAr: '⭐ ويتر الصالة (Floor Waiter)', labelEn: '⭐ Floor Waiter' },
    { key: 'bartender', labelAr: '🍸 بارتندر (Bartender)', labelEn: '🍸 Bartender' },
    { key: 'captain', labelAr: '🎖️ كابتن ومسؤول صالة (Captain)', labelEn: '🎖️ Captain / Floor Leader' },
    { key: 'supervisor', labelAr: '👑 مشرف الوردية (Shift Supervisor)', labelEn: '👑 Shift Supervisor' },
    { key: 'manager', labelAr: '👔 مدير التشغيل (Ops Manager)', labelEn: '👔 Ops Manager' },
  ];

  const SCOPE_ROLES = [
    { key: 'all', labelAr: '👥 الكل (عام)', labelEn: '👥 All (Public)' },
    { key: 'waiter', labelAr: '⭐ ويتر', labelEn: '⭐ Waiter' },
    { key: 'bartender', labelAr: '🍸 بارتندر', labelEn: '🍸 Bartender' },
    { key: 'captain', labelAr: '🎖️ كابتن', labelEn: '🎖️ Captain' },
    { key: 'supervisor', labelAr: '👑 مشرف', labelEn: '👑 Supervisor' },
    { key: 'manager', labelAr: '👔 مدير', labelEn: '👔 Manager' },
  ];

  function renderSectionModalHeader(dlg, isNew, ar) {
    const grab = el('div', 'grab');
    const headerRow = el('div', '');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'center';
    headerRow.style.marginBottom = '6px';

    const hTitle = el('h2', '');
    hTitle.style.margin = '0';
    hTitle.style.fontSize = '1.14rem';
    hTitle.style.fontWeight = '800';
    hTitle.style.display = 'flex';
    hTitle.style.alignItems = 'center';
    hTitle.style.gap = '8px';
    hTitle.innerHTML = '<span>⚙️</span><span>' +
      (isNew
        ? (ar ? 'إضافة قسم تشغيلي جديد للـ Checklist' : 'Add New Checklist Section')
        : (ar ? 'تخصيص وإسناد القسم التشغيلي' : 'Customize & Assign Section')) +
      '</span>';

    const closeBtn = el('button', '');
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '1.25rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = 'var(--muted)';
    closeBtn.style.padding = '4px 8px';
    closeBtn.addEventListener('click', () => dlg.close());

    headerRow.append(hTitle, closeBtn);

    const descP = el('p', '');
    descP.style.margin = '0 0 14px';
    descP.style.fontSize = '0.78rem';
    descP.style.color = 'var(--ink2)';
    descP.style.lineHeight = '1.45';
    descP.textContent = ar
      ? 'تحكّم باسم القسم، أيقونته، والمنصب أو الموظف المكلّف به (مثل البار للبارتندر، الصالة للويتر، أو الهوست للكابتن):'
      : 'Configure section title, icon, and assigned position or staff member (e.g. Bar, Floor, Back Area, Host):';

    const headerWrap = el('div', '');
    headerWrap.append(grab, headerRow, descP);
    return headerWrap;
  }

  function renderSectionIconPicker(currentIcon, onSelect, ar) {
    const iconGroup = el('div', 'task-asg-group');
    iconGroup.style.marginBottom = '12px';
    const iconLbl = el('label', '');
    iconLbl.style.fontWeight = '700';
    iconLbl.style.fontSize = '0.82rem';
    iconLbl.style.display = 'block';
    iconLbl.style.marginBottom = '6px';
    iconLbl.textContent = ar ? 'أيقونة القسم:' : 'Section Icon:';
    iconGroup.append(iconLbl);

    const iconRow = el('div', 'icon-picker-row');
    iconRow.style.display = 'flex';
    iconRow.style.gap = '6px';
    iconRow.style.flexWrap = 'wrap';

    ICONS.forEach((ico) => {
      const b = el('button', 'icon-chip-btn' + (ico === currentIcon ? ' active' : ''), ico);
      b.type = 'button';
      b.style.fontSize = '1.18rem';
      b.style.padding = '5px 9px';
      b.style.borderRadius = '8px';
      b.style.border = '1.5px solid ' + (ico === currentIcon ? 'var(--accent)' : 'var(--line)');
      b.style.background = ico === currentIcon ? 'rgba(47, 107, 94, 0.12)' : 'var(--card)';
      b.style.cursor = 'pointer';
      b.addEventListener('click', () => {
        onSelect(ico);
        iconRow.querySelectorAll('.icon-chip-btn').forEach((btnEl) => {
          btnEl.style.borderColor = 'var(--line)';
          btnEl.style.background = 'var(--card)';
        });
        b.style.borderColor = 'var(--accent)';
        b.style.background = 'rgba(47, 107, 94, 0.12)';
      });
      iconRow.append(b);
    });
    iconGroup.append(iconRow);
    return iconGroup;
  }

  function renderSectionTitleInputs(sec, ar) {
    const titleArGroup = el('div', 'task-asg-group');
    titleArGroup.style.marginBottom = '10px';
    const titleArLbl = el('label', '');
    titleArLbl.style.fontWeight = '700';
    titleArLbl.style.fontSize = '0.82rem';
    titleArLbl.style.display = 'block';
    titleArLbl.style.marginBottom = '4px';
    titleArLbl.textContent = ar ? 'اسم القسم (عربي):' : 'Section Name (Arabic):';
    const titleArIn = el('input', 'in');
    titleArIn.type = 'text';
    titleArIn.dir = 'rtl';
    titleArIn.value = sec.titleAr || sec.title || '';
    titleArIn.placeholder = ar ? 'مثال: قسم البار والمشروبات' : 'e.g. Bar & Beverage';
    titleArIn.style.width = '100%';
    titleArGroup.append(titleArLbl, titleArIn);

    const titleEnGroup = el('div', 'task-asg-group');
    titleEnGroup.style.marginBottom = '12px';
    const titleEnLbl = el('label', '');
    titleEnLbl.style.fontWeight = '700';
    titleEnLbl.style.fontSize = '0.82rem';
    titleEnLbl.style.display = 'block';
    titleEnLbl.style.marginBottom = '4px';
    titleEnLbl.textContent = ar ? 'اسم القسم (إنجليزي):' : 'Section Name (English):';
    const titleEnIn = el('input', 'in');
    titleEnIn.type = 'text';
    titleEnIn.dir = 'ltr';
    titleEnIn.value = sec.title || '';
    titleEnIn.placeholder = 'e.g. Bar & Beverage Station';
    titleEnIn.style.width = '100%';
    titleEnGroup.append(titleEnLbl, titleEnIn);

    const wrap = el('div', '');
    wrap.append(titleArGroup, titleEnGroup);
    return { wrap, titleArIn, titleEnIn };
  }

  function renderSectionCategoryAndRole(sec, ar) {
    const gridRow = el('div', 'asg-grid-2col');
    gridRow.style.display = 'grid';
    gridRow.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    gridRow.style.gap = '10px';
    gridRow.style.marginBottom = '12px';

    const deptBox = el('div', 'task-asg-group');
    const deptLbl = el('label', '');
    deptLbl.style.fontWeight = '700';
    deptLbl.style.fontSize = '0.82rem';
    deptLbl.style.display = 'block';
    deptLbl.style.marginBottom = '4px';
    deptLbl.textContent = ar ? '📁 نوع القسم التشغيلي:' : '📁 Department Type:';
    const deptSel = el('select', 'in');
    deptSel.style.width = '100%';
    DEPT_OPTIONS.forEach((d) => {
      const opt = el('option', '', ar ? d.labelAr : d.labelEn);
      opt.value = d.key;
      opt.selected = (sec.dept || 'floor') === d.key;
      deptSel.append(opt);
    });
    deptBox.append(deptLbl, deptSel);

    const roleBox = el('div', 'task-asg-group');
    const roleLbl = el('label', '');
    roleLbl.style.fontWeight = '700';
    roleLbl.style.fontSize = '0.82rem';
    roleLbl.style.display = 'block';
    roleLbl.style.marginBottom = '4px';
    roleLbl.textContent = ar ? '🎯 إسناد القسم لمنصب:' : '🎯 Assigned Role:';
    const roleSel = el('select', 'in');
    roleSel.style.width = '100%';
    ROLE_OPTIONS.forEach((r) => {
      const opt = el('option', '', ar ? r.labelAr : r.labelEn);
      opt.value = r.key;
      opt.selected = (sec.assignedRoleKey || 'all') === r.key;
      roleSel.append(opt);
    });
    roleBox.append(roleLbl, roleSel);

    gridRow.append(deptBox, roleBox);
    return { gridRow, deptSel, roleSel };
  }

  function toggleScopeRole(currentRoles, roleKey) {
    if (roleKey === 'all') {
      currentRoles.clear();
      currentRoles.add('all');
      return;
    }
    currentRoles.delete('all');
    if (currentRoles.has(roleKey)) currentRoles.delete(roleKey);
    else currentRoles.add(roleKey);
    if (currentRoles.size === 0) currentRoles.add('all');
  }

  function updateRoleChipsUI(buttons, currentRoles, ar) {
    buttons.forEach(({ btnEl, roleItem }) => {
      const act = currentRoles.has(roleItem.key);
      btnEl.className = 'btn sm role-chip-btn' + (act ? ' primary' : '');
      btnEl.textContent = (act ? '✓ ' : '') + (ar ? roleItem.labelAr : roleItem.labelEn);
    });
  }

  function renderSectionAllowedRolesCheckboxes(sec, ar) {
    const group = el('div', 'task-asg-group');
    group.style.marginBottom = '12px';
    const lbl = el('label', '');
    lbl.style.fontWeight = '700';
    lbl.style.fontSize = '0.82rem';
    lbl.style.display = 'block';
    lbl.style.marginBottom = '6px';
    lbl.textContent = ar ? '🔐 صلاحيات الرؤية (من يرى هذا القسم):' : '🔐 Section Visibility (Allowed Roles):';
    group.append(lbl);

    const row = el('div', 'allowed-roles-row');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.gap = '6px';

    const currentRoles = new Set(
      Array.isArray(sec.allowedRoles) && sec.allowedRoles.length
        ? sec.allowedRoles
        : (sec.assignedRoleKey ? [sec.assignedRoleKey] : ['all'])
    );

    const buttons = [];
    SCOPE_ROLES.forEach((r) => {
      const isSel = currentRoles.has(r.key);
      const b = el('button', 'btn sm role-chip-btn' + (isSel ? ' primary' : ''));
      b.type = 'button';
      b.style.fontSize = '0.74rem';
      b.style.padding = '4px 8px';
      b.style.borderRadius = '6px';
      b.textContent = (isSel ? '✓ ' : '') + (ar ? r.labelAr : r.labelEn);
      b.addEventListener('click', () => {
        toggleScopeRole(currentRoles, r.key);
        updateRoleChipsUI(buttons, currentRoles, ar);
      });
      buttons.push({ btnEl: b, roleItem: r });
      row.append(b);
    });
    group.append(row);
    return { group, getAllowedRoles: () => Array.from(currentRoles) };
  }

  function renderSectionStaffSelect(sec, ar, staffList = []) {
    const staffGroup = el('div', 'task-asg-group');
    staffGroup.style.marginBottom = '14px';
    const staffLbl = el('label', '');
    staffLbl.style.fontWeight = '700';
    staffLbl.style.fontSize = '0.82rem';
    staffLbl.style.display = 'block';
    staffLbl.style.marginBottom = '4px';
    staffLbl.textContent = ar ? '👤 تعيين موظف محدد بالاسم (اختياري):' : '👤 Specific Employee (Optional):';
    const staffSel = el('select', 'in');
    staffSel.style.width = '100%';
    staffList.forEach((st) => {
      const opt = el('option', '', st.label);
      opt.value = st.uname;
      opt.selected = (sec.assignedUsername || '').toLowerCase() === st.uname.toLowerCase();
      staffSel.append(opt);
    });
    staffGroup.append(staffLbl, staffSel);
    return { staffGroup, staffSel };
  }

  function renderSectionCascadeToggle(ar) {
    const cascadeBox = el('label', 'tog');
    cascadeBox.style.display = 'flex';
    cascadeBox.style.alignItems = 'center';
    cascadeBox.style.gap = '8px';
    cascadeBox.style.padding = '8px 10px';
    cascadeBox.style.borderRadius = '8px';
    cascadeBox.style.background = 'rgba(47, 107, 94, 0.06)';
    cascadeBox.style.marginBottom = '18px';
    cascadeBox.style.cursor = 'pointer';

    const cascadeCheck = el('input', 'sw');
    cascadeCheck.type = 'checkbox';
    cascadeCheck.checked = true;
    cascadeBox.innerHTML =
      '<div><b>' + (ar ? '🔄 توريث التعيين لكافة بنود القسم' : '🔄 Apply to all items in this section') + '</b>' +
      '<small style="display:block;color:var(--ink2);font-size:0.72rem;">' +
      (ar ? 'تحديث كافة بنود هذا القسم تلقائياً لتتبع نفس المنصب والموظف المختار فوراً' : 'Automatically sync all items inside to match this assigned role & employee') +
      '</small></div>';
    cascadeBox.prepend(cascadeCheck);
    return { cascadeBox, cascadeCheck };
  }

  function applyRoleCascade(sec, opts = {}) {
    const { roleKey, roleLabel, empUser } = opts;
    if (!Array.isArray(sec.items)) return;
    sec.items.forEach((it) => {
      it.assignedRoleKey = roleKey;
      it.assignedRole = roleLabel;
      it.assignedUsername = empUser;
      if (it.assignedStaff) delete it.assignedStaff;
    });
  }

  FOH.sectionModalFields = {
    renderSectionModalHeader,
    renderSectionIconPicker,
    renderSectionTitleInputs,
    renderSectionCategoryAndRole,
    renderSectionAllowedRolesCheckboxes,
    renderSectionStaffSelect,
    renderSectionCascadeToggle,
    applyRoleCascade,
  };
})();

