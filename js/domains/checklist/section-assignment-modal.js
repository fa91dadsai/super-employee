// foh-opening/js/domains/checklist/section-assignment-modal.js
// Section Division, Role & Staff Assignment, and Custom Department Management (< 350 lines)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = () => FOH.state;
  const { pick } = FOH.i18n;
  const { el } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);

  const ROLE_OPTIONS = [
    { key: 'all', labelEn: '👥 All Positions (Shared)', labelAr: '👥 متاح للجميع (مشترك)' },
    { key: 'super_bartender', labelEn: '🍸 Super Bartender', labelAr: '🍸 سوبر بارتندر (Super Bartender)' },
    { key: 'super_waiter', labelEn: '⭐ Super Waiter', labelAr: '⭐ سوبر ويتر (Super Waiter)' },
    { key: 'super_captain', labelEn: '🎖️ Super Captain', labelAr: '🎖️ سوبر كابتن (Super Captain)' },
    { key: 'super_manager', labelEn: '👑 Super Manager', labelAr: '👑 سوبر مانجر (Super Manager)' },
    { key: 'host', labelEn: '🛎️ Host & Reception', labelAr: '🛎️ هوست واستقبال (Host)' },
    { key: 'runner', labelEn: '🏃 Runner / Support', labelAr: '🏃 رانر ومساعد (Runner)' },
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

  function persistCurrentSheet() {
    if (FOH.erpPwa && FOH.erpPwa.persistCurrentSheetState) {
      FOH.erpPwa.persistCurrentSheetState();
    } else {
      FOH.store.saveTemplate(S().tpl);
    }
  }

  const mf = () => FOH.sectionModalFields || {};

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
    if (typeof fields.getAllowedRoles === 'function') {
      sec.allowedRoles = fields.getAllowedRoles();
    }

    if (cascadeCheck.checked && mf().applyRoleCascade) {
      mf().applyRoleCascade(sec, { roleKey, roleLabel, empUser });
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
    const sess = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    const isMgr = !!(sess && (sess.isManager || sess.roleId === 'manager'));
    const canEdit = (FOH.gov && FOH.gov.canCurrentUserEditChecklist) ? FOH.gov.canCurrentUserEditChecklist() : isMgr;

    if (!isMgr && !canEdit) {
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '⚠️ إعدادات وتخصيص الأقسام متاحة للمدير فقط' : '⚠️ Section customization is restricted to managers');
      }
      return;
    }

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

    const fieldsModule = mf();
    const header = fieldsModule.renderSectionModalHeader ? fieldsModule.renderSectionModalHeader(dlg, isNew, ar) : el('div');
    const iconGroup = fieldsModule.renderSectionIconPicker ? fieldsModule.renderSectionIconPicker(selectedIcon, (ico) => { selectedIcon = ico; }, ar) : el('div');
    const titles = fieldsModule.renderSectionTitleInputs ? fieldsModule.renderSectionTitleInputs(sec, ar) : { wrap: el('div'), titleArIn: el('input'), titleEnIn: el('input') };
    const catAndRole = fieldsModule.renderSectionCategoryAndRole ? fieldsModule.renderSectionCategoryAndRole(sec, ar) : { gridRow: el('div'), deptSel: el('select'), roleSel: el('select') };
    const rolesVis = fieldsModule.renderSectionAllowedRolesCheckboxes ? fieldsModule.renderSectionAllowedRolesCheckboxes(sec, ar) : { group: el('div'), getAllowedRoles: () => ['all'] };
    const staff = fieldsModule.renderSectionStaffSelect ? fieldsModule.renderSectionStaffSelect(sec, ar, getStaffList()) : { staffGroup: el('div'), staffSel: el('select') };
    const cascade = fieldsModule.renderSectionCascadeToggle ? fieldsModule.renderSectionCascadeToggle(ar) : { cascadeBox: el('div'), cascadeCheck: { checked: true } };
    enhanceSectionSelects(catAndRole, staff, ar);

    const fields = {
      titleArIn: titles.titleArIn,
      titleEnIn: titles.titleEnIn,
      deptSel: catAndRole.deptSel,
      roleSel: catAndRole.roleSel,
      staffSel: staff.staffSel,
      cascadeCheck: cascade.cascadeCheck,
      getSelectedIcon: () => selectedIcon,
      getAllowedRoles: rolesVis.getAllowedRoles,
    };

    const actions = renderSectionActions({ sec, isNew, dlg, ar, fields });
    box.append(header, iconGroup, titles.wrap, catAndRole.gridRow, rolesVis.group, staff.staffGroup, cascade.cascadeBox, actions);
    dlg.append(box);
    dlg.showModal();
    (ar ? titles.titleArIn : titles.titleEnIn).focus();
  }

  FOH.sectionAssignmentModal = {
    openSectionModal,
    getStaffList,
    canCurrentUserAssign,
    ROLE_OPTIONS,
  };
})(window.FOH = window.FOH || {});
