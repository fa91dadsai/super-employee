// Sub-renderers for Task Assignment Modal form inputs and cards.
(function (FOH) {
  'use strict';

  const { el } = FOH.view;

  function roleName(id) {
    return (FOH.staff && FOH.staff.roleName(id)) || id || '';
  }

  function getActiveSheetType() {
    return (FOH.sheetState && FOH.sheetState.getActiveSheetType) ? FOH.sheetState.getActiveSheetType() : 'opening';
  }

  function createAssignModalHeader(dlg, ar) {
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
    hTitle.innerHTML = '<span>➕</span><span>' + (ar ? 'إضافة وتعيين مهمة تشغيلية' : 'Add & Assign Operational Task') + '</span>';

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
      ? 'عيّن مهمة لمنصب أو موظف محدد، وحدد ما إذا كانت لمرة واحدة بتاريخ معين أو متكررة دورياً، مع إشعار فوري للموظف:'
      : 'Assign a task to a role or staff, choose single-date or recurring schedule, and notify instantly:';

    return { grab, headerRow, descP };
  }

  function createTaskTitleInput(ar) {
    const titleGroup = el('div', 'task-asg-group');
    titleGroup.style.marginBottom = '12px';
    const titleLbl = el('label', '');
    titleLbl.style.fontWeight = '700';
    titleLbl.style.fontSize = '0.82rem';
    titleLbl.style.display = 'flex';
    titleLbl.style.alignItems = 'center';
    titleLbl.style.gap = '6px';
    titleLbl.style.marginBottom = '4px';
    titleLbl.innerHTML = '<span>📝</span><span>' + (ar ? 'عنوان المهمة وملاحظات التنفيذ:' : 'Task Description & Details:') + '</span>';

    const titleIn = el('input', 'in');
    titleIn.placeholder = ar ? 'مثال: تجهيز طاولة VIP رقم 8 وتلميع كؤوس العصير...' : 'e.g. Prepare VIP Table 8 & polish wine glasses...';
    titleIn.style.width = '100%';
    titleIn.style.minHeight = '42px';
    titleIn.style.fontSize = '0.92rem';
    titleIn.style.fontWeight = '600';
    titleIn.style.padding = '8px 12px';
    titleIn.style.borderRadius = '12px';
    titleGroup.append(titleLbl, titleIn);
    return { titleGroup, titleIn };
  }

  function createSheetAndSectionCard(ar, curSheet) {
    const rowSheet = el('div', 'two');
    rowSheet.style.marginBottom = '12px';

    const sheetLbl = el('label', '');
    sheetLbl.style.flex = '1';
    sheetLbl.innerHTML =
      '<span style="font-size:0.78rem;font-weight:700;display:flex;align-items:center;gap:4px;margin-bottom:4px;"><span>📋</span><span>' +
      (ar ? 'الشيت المستهدف:' : 'Target Shift Sheet:') +
      '</span></span>';
    const sheetSel = el('select', 'in');
    sheetSel.style.minHeight = '42px';
    sheetSel.style.fontWeight = '600';
    sheetSel.style.fontSize = '0.84rem';
    sheetSel.style.width = '100%';
    [
      ['opening', ar ? '☀️ الافتتاح (12:00 ص – 3:00 م)' : '☀️ Opening (12AM–3PM)'],
      ['mid', ar ? '🌤️ المنتصف (3:00 م – 11:00 م)' : '🌤️ Mid-Shift (3PM–11PM)'],
      ['closing', ar ? '🌙 الإغلاق (11:00 م – الإغلاق)' : '🌙 Closing (11PM–Close)'],
    ].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = val;
      o.selected = val === curSheet;
      sheetSel.append(o);
    });
    sheetLbl.append(sheetSel);

    const secLbl = el('label', '');
    secLbl.style.flex = '1';
    secLbl.innerHTML =
      '<span style="font-size:0.78rem;font-weight:700;display:flex;align-items:center;gap:4px;margin-bottom:4px;"><span>📂</span><span>' +
      (ar ? 'القسم الفرعي:' : 'Section:') +
      '</span></span>';
    const secSel = el('select', 'in');
    secSel.style.minHeight = '42px';
    secSel.style.fontWeight = '600';
    secSel.style.fontSize = '0.84rem';
    secSel.style.width = '100%';
    secLbl.append(secSel);

    function populateSections(sType) {
      secSel.replaceChildren();
      let list = (FOH.state && FOH.state.tpl && FOH.state.tpl.sections) || [];
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

    populateSections(sheetSel.value);
    sheetSel.addEventListener('change', () => {
      populateSections(sheetSel.value);
      secSel.dispatchEvent(new Event('change', { bubbles: true }));
    });

    rowSheet.append(sheetLbl, secLbl);
    return { rowSheet, sheetSel, secSel };
  }

  function createAssigneeCard(ar) {
    const rowAssign = el('div', 'two');
    rowAssign.style.marginBottom = '14px';

    const roleLbl = el('label', '');
    roleLbl.style.flex = '1';
    roleLbl.innerHTML =
      '<span style="font-size:0.78rem;font-weight:700;display:flex;align-items:center;gap:4px;margin-bottom:4px;"><span>🪪</span><span>' +
      (ar ? 'المنصب (Position):' : 'Position (Role):') +
      '</span></span>';
    const roleSel = el('select', 'in');
    roleSel.style.minHeight = '42px';
    roleSel.style.fontWeight = '600';
    roleSel.style.fontSize = '0.84rem';
    roleSel.style.width = '100%';
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

    const empLbl = el('label', '');
    empLbl.style.flex = '1';
    empLbl.innerHTML =
      '<span style="font-size:0.78rem;font-weight:700;display:flex;align-items:center;gap:4px;margin-bottom:4px;"><span>👤</span><span>' +
      (ar ? 'الموظف المسؤول:' : 'Assignee Staff:') +
      '</span></span>';
    const empSel = el('select', 'in');
    empSel.style.minHeight = '42px';
    empSel.style.fontWeight = '600';
    empSel.style.fontSize = '0.84rem';
    empSel.style.width = '100%';

    const anyOpt = el('option', '', ar ? '— كل موظفي هذا المنصب —' : '— Any staff in role —');
    anyOpt.value = '';
    empSel.append(anyOpt);

    const staffList = (FOH.state && FOH.state.tpl && FOH.state.tpl.staff || []).filter((st) => st.active !== false);
    if (!staffList.length) {
      [
        { key: 'sara', name: 'Sara Khoury', roleName: 'Waiter' },
        { key: 'maher', name: 'Maher Zaid', roleName: 'Bartender' },
        { key: 'ali', name: 'Ali Hassan', roleName: 'Captain' },
        { key: 'fadi', name: 'Fadi Al-Masri', roleName: 'Manager' },
      ].forEach((d) => {
        const o = el('option', '', '👤 ' + d.name + ' (' + d.roleName + ')');
        o.value = d.key;
        empSel.append(o);
      });
    } else {
      staffList.forEach((st) => {
        const key = (st.name || '').toLowerCase().split(' ')[0];
        const roleLabel = roleName(st.role) || (st.nickname ? st.nickname : '');
        const o = el('option', '', '👤 ' + st.name + (roleLabel ? ' (' + roleLabel + ')' : ''));
        o.value = key;
        empSel.append(o);
      });
    }

    empSel.addEventListener('change', () => {
      const map = { sara: 'super_waiter', maher: 'super_bartender', ali: 'super_captain', fadi: 'super_manager' };
      if (empSel.value && map[empSel.value]) {
        roleSel.value = map[empSel.value];
        roleSel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    empLbl.append(empSel);

    rowAssign.append(roleLbl, empLbl);
    return { rowAssign, roleSel, empSel };
  }

  FOH.taskAssignInputs = {
    createAssignModalHeader,
    createTaskTitleInput,
    createSheetAndSectionCard,
    createAssigneeCard,
  };
})(window.FOH = window.FOH || {});

