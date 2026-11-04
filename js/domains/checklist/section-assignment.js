// foh-opening/js/domains/checklist/section-assignment.js
// Section Division, Role & Staff Assignment, and Custom Department Management
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const { t, pick } = FOH.i18n;
  const { el } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);

  const ICONS = ['🍸', '🍽️', '🚪', '🛎️', '💳', '📦', '☕', '🧹', '🧽', '👥', '✨'];

  const ROLE_OPTIONS = [
    { key: 'all', labelEn: '👥 All Positions (Shared)', labelAr: '👥 متاح للجميع (مشترك)' },
    { key: 'super_bartender', labelEn: '🍸 Super Bartender', labelAr: '🍸 سوبر بارتندر (Super Bartender)' },
    { key: 'super_waiter', labelEn: '⭐ Super Waiter', labelAr: '⭐ سوبر ويتر (Super Waiter)' },
    { key: 'super_captain', labelEn: '🎖️ Super Captain', labelAr: '🎖️ سوبر كابتن (Super Captain)' },
    { key: 'super_manager', labelEn: '👑 Super Manager', labelAr: '👑 سوبر مانجر (Super Manager)' },
    { key: 'host', labelEn: '🛎️ Host & Reception', labelAr: '🛎️ هوست واستقبال (Host)' },
    { key: 'runner', labelEn: '🏃 Runner / Support', labelAr: '🏃 رانر ومساعد (Runner)' },
  ];

  const DEPT_OPTIONS = [
    { key: 'bar', labelEn: '🍸 Bar Department', labelAr: '🍸 قسم البار والمشروبات' },
    { key: 'floor', labelEn: '🍽️ Floor & Dining Area', labelAr: '🍽️ قسم الصالة والطاولات' },
    { key: 'back', labelEn: '🚪 Back Area & Stations', labelAr: '🚪 قسم المنطقة الخلفية والمحطات' },
    { key: 'host', labelEn: '🛎️ Host & Reception Area', labelAr: '🛎️ قسم الاستقبال والهوست' },
    { key: 'cash', labelEn: '💳 Cashier, POS & Tech', labelAr: '💳 قسم الكاشير والأجهزة' },
    { key: 'general', labelEn: '🏢 General Operations', labelAr: '🏢 تشغيل عام' },
  ];

  function getStaffList() {
    const ar = isAr();
    const list = [
      { uname: '', label: ar ? '— أي موظف في هذا المنصب —' : '— Any staff in this role —' },
      { uname: 'sara', label: ar ? '👤 سارة خوري (سوبر ويتر)' : '👤 Sara Khoury (Super Waiter)' },
      { uname: 'maher', label: ar ? '👤 ماهر زيد (سوبر بارتندر)' : '👤 Maher Zaid (Super Bartender)' },
      { uname: 'ali', label: ar ? '👤 علي حسن (سوبر كابتن)' : '👤 Ali Hassan (Super Captain)' },
      { uname: 'fadi', label: ar ? '👑 فادي المصري (سوبر مانجر)' : '👑 Fadi Al-Masri (Super Manager)' },
    ];
    const seen = new Set(list.map((s) => s.uname));
    const st = S();
    ((st && st.tpl && st.tpl.staff) || []).forEach((p) => {
      const u = (p.username || (p.name || '').split(' ')[0] || p.id || '').toLowerCase().trim();
      if (u && !seen.has(u)) {
        seen.add(u);
        list.push({ uname: u, label: '👤 ' + p.name });
      }
    });
    return list;
  }

  function canCurrentUserAssign() {
    if (FOH.roleIdentity && FOH.roleIdentity.canCurrentUserAssignTasks) {
      return FOH.roleIdentity.canCurrentUserAssignTasks();
    }
    const sess = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    return !!(sess && (sess.isManager || sess.isCaptain));
  }

  function getActiveSheetType() {
    return (FOH.threeShifts && FOH.threeShifts.getActiveSheetType)
      ? FOH.threeShifts.getActiveSheetType()
      : ((FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive && FOH.opsLifecycle.isClosingSheetActive()) ? 'closing' : 'opening');
  }

  function persistCurrentSheet() {
    if (FOH.erpPwa && FOH.erpPwa.persistCurrentSheetState) {
      FOH.erpPwa.persistCurrentSheetState();
    } else {
      FOH.store.saveTemplate(S().tpl);
    }
  }

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

  function renderSectionStaffSelect(sec, ar) {
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
    getStaffList().forEach((st) => {
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
      it.assignedRoleLabel = roleLabel;
      it.assignedUsername = empUser;
      if (Array.isArray(it.children)) {
        it.children.forEach((ch) => {
          ch.assignedRoleKey = roleKey;
          ch.assignedRoleLabel = roleLabel;
          ch.assignedUsername = empUser;
        });
      }
    });
  }

  function handleSectionSave(opts = {}) {
    const { sec, isNew, fields, dlg, ar } = opts;
    const { titleArIn, titleEnIn, roleSel, deptSel, staffSel, cascadeCheck, getSelectedIcon } = fields;
    const tAr = titleArIn.value.trim();
    const tEn = titleEnIn.value.trim();
    if (!tAr && !tEn) {
      titleArIn.focus();
      FOH.edit.toast(ar ? '⚠️ الرجاء كتابة اسم للقسم' : '⚠️ Please enter a section name');
      return;
    }

    const roleKey = roleSel.value;
    const roleMeta = ROLE_OPTIONS.find((r) => r.key === roleKey) || ROLE_OPTIONS[0];
    const roleLabel = ar ? roleMeta.labelAr : roleMeta.labelEn;
    const empUser = staffSel.value || null;

    sec.title = tEn || tAr;
    sec.titleAr = tAr || tEn;
    sec.icon = getSelectedIcon();
    sec.dept = deptSel.value || 'floor';
    sec.assignedRoleKey = roleKey;
    sec.assignedRoleLabel = roleLabel;
    sec.assignedUsername = empUser;

    if (cascadeCheck.checked) {
      applyRoleCascade(sec, { roleKey, roleLabel, empUser });
    }

    const st = S();
    if (isNew) {
      if (!Array.isArray(st.tpl.sections)) st.tpl.sections = [];
      st.tpl.sections.push(sec);
    }

    persistCurrentSheet();
    dlg.close();
    FOH.app.render();
    FOH.edit.toast(ar ? '✅ تم حفظ وتخصيص القسم بنجاح!' : '✅ Section customized & saved!');
  }

  function handleSectionDelete(sec, dlg, ar) {
    const titleStr = pick(sec.title, sec.titleAr) || 'Section';
    if (!confirm(ar ? `هل أنت متأكد من حذف قسم "${titleStr}" بالكامل مع بنوده؟` : `Delete section "${titleStr}" and all its items?`)) {
      return;
    }
    const st = S();
    st.tpl.sections = (st.tpl.sections || []).filter((s) => s.id !== sec.id);
    persistCurrentSheet();
    dlg.close();
    FOH.app.render();
    FOH.edit.toast(ar ? '🗑️ تم حذف القسم بنجاح' : '🗑️ Section deleted');
  }

  function renderSectionActions(opts = {}) {
    const { sec, isNew, dlg, ar, fields } = opts;
    const acts = el('div', 'task-asg-actions');
    acts.style.display = 'flex';
    acts.style.justifyContent = 'space-between';
    acts.style.alignItems = 'center';
    acts.style.gap = '8px';
    acts.style.marginTop = '16px';

    const leftActs = el('div', '');
    leftActs.style.display = 'flex';
    leftActs.style.gap = '8px';

    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.addEventListener('click', () => dlg.close());

    if (!isNew) {
      const delB = el('button', 'btn danger', ar ? '🗑️ حذف القسم' : '🗑️ Delete Section');
      delB.type = 'button';
      delB.style.fontSize = '0.78rem';
      delB.addEventListener('click', () => handleSectionDelete(sec, dlg, ar));
      leftActs.append(delB);
    }
    leftActs.append(cancelB);

    const saveB = el('button', 'btn primary', ar ? '💾 حفظ وتطبيق التعيين' : '💾 Save & Assign Section');
    saveB.type = 'button';
    saveB.addEventListener('click', () => handleSectionSave({ sec, isNew, fields, dlg, ar }));

    acts.append(leftActs, saveB);
    return acts;
  }

  function enhanceSectionSelects(catAndRole, staff, ar) {
    if (!FOH.modalPicker || !FOH.modalPicker.enhanceSelect) return;
    FOH.modalPicker.enhanceSelect(catAndRole.deptSel, { title: ar ? 'نوع القسم التشغيلي' : 'Department Type', icon: '📁' });
    FOH.modalPicker.enhanceSelect(catAndRole.roleSel, { title: ar ? 'إسناد القسم لمنصب' : 'Assign to Role', icon: '🎯' });
    FOH.modalPicker.enhanceSelect(staff.staffSel, { title: ar ? 'تعيين موظف محدد بالاسم' : 'Assign to Staff', icon: '👤' });
  }

  function openSectionModal(targetSec, opts = {}) {
    const isNew = typeof opts === 'boolean' ? opts : !!(opts && opts.isNew);
    const ar = isAr();
    let dlg = $('sectionAssignModal');
    if (!dlg) {
      dlg = el('dialog', 'sheet section-assign-dialog');
      dlg.id = 'sectionAssignModal';
      dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
      document.body.append(dlg);
    }
    dlg.replaceChildren();

    const sec = targetSec || {
      id: 'sec_' + Date.now(),
      title: '',
      titleAr: '',
      icon: '🍽️',
      dept: 'floor',
      assignedRoleKey: 'all',
      assignedRoleLabel: '👥 ' + (ar ? 'متاح للجميع' : 'All Staff'),
      assignedUsername: '',
      items: [],
    };

    let selectedIcon = sec.icon || '🍽️';
    const box = el('div', 'task-asg-modal-box');
    box.style.padding = '14px 18px 24px';
    box.style.maxHeight = '88dvh';
    box.style.overflowY = 'auto';

    const header = renderSectionModalHeader(dlg, isNew, ar);
    const iconGroup = renderSectionIconPicker(selectedIcon, (ico) => { selectedIcon = ico; }, ar);
    const titles = renderSectionTitleInputs(sec, ar);
    const catAndRole = renderSectionCategoryAndRole(sec, ar);
    const staff = renderSectionStaffSelect(sec, ar);
    const cascade = renderSectionCascadeToggle(ar);
    enhanceSectionSelects(catAndRole, staff, ar);

    const fields = {
      titleArIn: titles.titleArIn,
      titleEnIn: titles.titleEnIn,
      deptSel: catAndRole.deptSel,
      roleSel: catAndRole.roleSel,
      staffSel: staff.staffSel,
      cascadeCheck: cascade.cascadeCheck,
      getSelectedIcon: () => selectedIcon,
    };

    const actions = renderSectionActions({ sec, isNew, dlg, ar, fields });
    box.append(header, iconGroup, titles.wrap, catAndRole.gridRow, staff.staffGroup, cascade.cascadeBox, actions);
    dlg.append(box);
    dlg.showModal();
    (ar ? titles.titleArIn : titles.titleEnIn).focus();
  }

  function decorateSectionCard(sec, opts = {}) {
    const { staffNameMap, canAssign, ar } = opts;
    const card = $('sec-' + sec.id);
    if (!card) return;
    const head = card.querySelector('.head');
    if (!head) return;
    const metaRow = head.querySelector('.head-meta-row');
    if (!metaRow) return;

    let pill = metaRow.querySelector('.sec-asg-pill');
    if (!pill) {
      pill = el('span', 'sec-asg-pill');
      metaRow.prepend(pill);
    }

    const roleKey = sec.assignedRoleKey || 'all';
    const roleMeta = ROLE_OPTIONS.find((r) => r.key === roleKey);
    const roleLabel = roleMeta ? (ar ? roleMeta.labelAr.split('(')[0].trim() : roleMeta.labelEn.split('(')[0].trim()) : (ar ? 'مشترك' : 'All');
    const assignedPerson = sec.assignedUsername ? (staffNameMap[sec.assignedUsername] || sec.assignedUsername) : '';

    pill.innerHTML = '<span>🎯</span> <b>' + roleLabel + '</b>' +
      (assignedPerson ? '<span style="opacity:0.85;margin-inline-start:4px;">· 👤 ' + assignedPerson + '</span>' : '');

    let editBtn = metaRow.querySelector('.sec-asg-btn');
    if (!canAssign) {
      if (editBtn) editBtn.remove();
    } else if (!editBtn) {
      editBtn = el('button', 'sec-asg-btn', ar ? '⚙️ تخصيص وإسناد' : '⚙️ Assign Section');
      editBtn.type = 'button';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSectionModal(sec, { isNew: false });
      });
      metaRow.append(editBtn);
    }
  }

  function injectSectionControls() {
    const secContainer = $('sections');
    if (!secContainer || secContainer.hidden || S().view !== 'opening') return;

    const ar = isAr();
    const canAssign = canCurrentUserAssign();
    const staffList = getStaffList();
    const staffNameMap = {};
    staffList.forEach((s) => {
      if (s.uname) staffNameMap[s.uname] = s.label.replace('👤 ', '').replace('👑 ', '');
    });

    const toolbar = document.querySelector('#checklistGovBar .unified-sec-toolbar');
    if (toolbar) {
      let addSecBtn = toolbar.querySelector('#toolbarAddSectionBtn');
      if (!canAssign) {
        if (addSecBtn) addSecBtn.remove();
      } else if (!addSecBtn) {
        addSecBtn = el('button', 'u-pill sec-add-pill', ar ? '📑 إضافة قسم جديد' : '📑 + Add Section');
        addSecBtn.id = 'toolbarAddSectionBtn';
        addSecBtn.type = 'button';
        addSecBtn.addEventListener('click', () => openSectionModal(null, { isNew: true }));
        toolbar.append(addSecBtn);
      }
    }

    (S().tpl.sections || []).forEach((sec) => {
      decorateSectionCard(sec, { staffNameMap, canAssign, ar });
    });
  }

  function getLegacyBarAndHostItems() {
    const barItems = [
      { id: 'sb1', text: 'Make sure the bar is clean, polished and service-ready', textAr: 'التأكد من نظافة البار ومحطات التحضير وجاهزيتها للخدمة', due: '15:30', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
      { id: 'sb2', text: 'Top up ice wells, draft lines & beverage coolers', textAr: 'تعبئة أحواض الثلج وتبريد زجاجات المشروبات والنبيذ', due: '15:40', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
      { id: 'sb3', text: 'Check espresso machine, steam wands & grinder hopper', textAr: 'فحص ماكينة الإسبريسو ومطحنة القهوة والتأكد من نقاء البن', due: '15:45', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
      { id: 'sb4', text: 'Cut fresh garnishes (lemon/lime/mint) & prep house syrups', textAr: 'تقطيع وتجهيز الغارنيش الطازج والنعناع وفحص العصائر والـ Syrups', due: '15:50', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
      { id: 'sb5', text: 'Wash, polish and inspect all cocktail and wine glasses', textAr: 'تلميع وفحص كؤوس الكوكتيل والنبيذ وكاسات التقديم', due: '15:55', role: '', assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', children: [] },
    ];
    const hostItems = [
      { id: 'sh1', text: 'Inspect and clean the Host Stand & welcome entrance', textAr: 'فحص وتنظيف كاونتر الاستقبال (Host Stand) ومدخل الصالة', due: '15:30', role: '', assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain', children: [] },
      { id: 'sh2', text: 'Review evening reservations, VIP notes & table plan with Floor Captain', textAr: 'مراجعة حجوزات المساء وطلبات الـ VIP وتوزيع الطاولات مع الكابتن', due: '15:45', role: '', assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain', children: [] },
      { id: 'sh3', text: 'Clean and sanitize all food, wine & cocktail menus', textAr: 'تنظيف وتعقيم كافة قوائم الطعام والمشروبات والنبيذ', due: '15:50', role: '', assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain', children: [] },
      { id: 'sh4', text: 'Turn on music playlist & adjust ambient lighting', textAr: 'تشغيل الموسيقى وضبط الإضاءة الترحيبية والتكييف', due: '15:50', role: '', assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain', children: [] },
    ];
    return { barItems, hostItems };
  }

  function createDefaultLegacySections() {
    const { barItems, hostItems } = getLegacyBarAndHostItems();
    const barSec = {
      id: 'sec-bar', dept: 'bar', icon: '🍸',
      title: 'Bar & Beverage Station', titleAr: 'قسم البار والمشروبات',
      assignedRoleKey: 'super_bartender', assignedRoleLabel: '🍸 Super Bartender', assignedUsername: 'maher',
      items: barItems,
    };
    const floorSec = {
      id: 'sec-floor', dept: 'floor', icon: '🍽️',
      title: 'Floor & Dining Tables', titleAr: 'قسم الصالة والطاولات',
      assignedRoleKey: 'super_waiter', assignedRoleLabel: '⭐ Super Waiter', assignedUsername: 'sara',
      items: [],
    };
    const backSec = {
      id: 'sec-back', dept: 'back', icon: '🚪',
      title: 'Back Area & Service Station', titleAr: 'قسم المنطقة الخلفية والمحطات',
      assignedRoleKey: 'super_waiter', assignedRoleLabel: '⭐ Super Waiter / Runner', assignedUsername: '',
      items: [],
    };
    const hostSec = {
      id: 'sec-host', dept: 'host', icon: '🛎️',
      title: 'Host & Reception Desk', titleAr: 'قسم الاستقبال والهوست',
      assignedRoleKey: 'super_captain', assignedRoleLabel: '🎖️ Super Captain / Host', assignedUsername: 'ali',
      items: hostItems,
    };
    const cashSec = {
      id: 'sec-cash', dept: 'cash', icon: '💳',
      title: 'Cashier, POS & Tech', titleAr: 'قسم الكاشير والأجهزة',
      assignedRoleKey: 'super_manager', assignedRoleLabel: '👑 Super Manager', assignedUsername: 'fadi',
      items: [
        { id: 'sc1', text: 'Make sure all Visa machines and ordering tablets are charged', textAr: 'التأكد من شحن جميع أجهزة الفيزا والتابلت', due: '15:30', role: '', assignedRoleKey: 'super_manager', assignedRoleLabel: '👑 Super Manager', children: [] },
        { id: 'sc2', text: 'Verify and change the cash float in till drawer', textAr: 'استلام وتبديل نقد الفكة (Cash Float) في درج الكاشير', due: '15:40', role: '', assignedRoleKey: 'super_manager', assignedRoleLabel: '👑 Super Manager', children: [] },
        { id: 'sc3', text: 'Ensure the POS system is online and tables synced', textAr: 'التأكد من تشغيل نظام نقاط البيع (POS) وجاهزية الطابعات', due: '15:45', role: '', assignedRoleKey: 'super_manager', assignedRoleLabel: '👑 Super Manager', children: [] },
        { id: 'sc4', text: 'Check the safe vault and set out the daily tip sheet', textAr: 'التحقق من الخزنة ووضع ورقة التبس مع تاريخ اليوم', due: '15:50', role: '', assignedRoleKey: 'super_manager', assignedRoleLabel: '👑 Super Manager', children: [] },
      ],
    };
    return { barSec, floorSec, backSec, hostSec, cashSec };
  }

  function categorizeLegacyItems(oldSections, depts) {
    const { barSec, floorSec, backSec, hostSec, cashSec } = depts;
    oldSections.forEach((oldSec) => {
      (oldSec.items || []).forEach((it) => {
        const tStr = (it.text + ' ' + (it.textAr || '')).toLowerCase();
        if (tStr.includes('bar') || tStr.includes('بار')) {
          barSec.items.push(it);
        } else if (tStr.includes('back area') || tStr.includes('expeditor') || tStr.includes('w.c.') || tStr.includes('دورات') || tStr.includes('station') || tStr.includes('محط') || tStr.includes('منطقة خلفية') || tStr.includes('مستودع') || tStr.includes('store') || tStr.includes('order from') || tStr.includes('tray') || tStr.includes('صواني') || tStr.includes('soy sauce') || tStr.includes('salt & pepper')) {
          backSec.items.push(it);
        } else if (tStr.includes('menu') || tStr.includes('منيو') || tStr.includes('قوائم') || tStr.includes('music') || tStr.includes('موسيقى') || tStr.includes('uniform') || tStr.includes('زي')) {
          hostSec.items.push(it);
        } else if (tStr.includes('visa') || tStr.includes('pos') || tStr.includes('float') || tStr.includes('خزنة') || tStr.includes('vault') || tStr.includes('tip sheet')) {
          cashSec.items.push(it);
        } else {
          floorSec.items.push(it);
        }
      });
    });
  }

  // Smart Migration: Upgrade legacy unorganized sections into the 5 core restaurant departments
  function upgradeLegacySectionsOnce() {
    const st = S();
    if (!st || !st.tpl || !Array.isArray(st.tpl.sections)) return;

    const hasModernDepts = st.tpl.sections.some((s) => ['sec-bar', 'sec-floor', 'sec-back', 'sec-host', 'sec-cash'].includes(s.id));
    if (hasModernDepts) return;

    const depts = createDefaultLegacySections();
    categorizeLegacyItems(st.tpl.sections, depts);
    st.tpl.sections = [depts.barSec, depts.floorSec, depts.backSec, depts.hostSec, depts.cashSec];
    persistCurrentSheet();
  }

  function init() {
    upgradeLegacySectionsOnce();
  }

  FOH.sectionAssignment = {
    init,
    openSectionModal,
    injectSectionControls,
    upgradeLegacySectionsOnce,
    ROLE_OPTIONS,
    DEPT_OPTIONS,
  };
})(window.FOH = window.FOH || {});
