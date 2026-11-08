// foh-opening/js/domains/shifts/shift-handover.js
// Smart Shift Handover Cockpit, Continuity & Task Rollover between Shifts
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  function getCurShiftType() {
    return (FOH.sheetState && FOH.sheetState.getActiveSheetType) ? FOH.sheetState.getActiveSheetType() : 'opening';
  }

  function getNextShiftType(cur) {
    if (cur === 'opening') return 'mid';
    if (cur === 'mid') return 'closing';
    return 'opening';
  }

  function getShiftName(type, ar) {
    const names = {
      opening: ar ? '☀️ شفت الافتتاح (Opening)' : '☀️ Opening Shift',
      mid: ar ? '🌤️ شفت المنتصف (Mid-Shift)' : '🌤️ Mid-Shift',
      closing: ar ? '🌙 شفت الإغلاق (Closing)' : '🌙 Closing Shift',
    };
    return names[type] || type;
  }

  function collectUncompletedTasks() {
    const all = FOH.model.allLeaves({ sections: S.tpl.sections || [] });
    return all.filter((it) => !S.run.checked[it.id]);
  }

  function collectBreakageCount() {
    try {
      const raw = localStorage.getItem('foh-opening.breakage.v1');
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.length : 0;
    } catch {
      /* Safe storage fallback */
      return 0;
    }
  }

  function collectPendingOrdersCount() {
    try {
      const db = (FOH.ordersStore && FOH.ordersStore.getDB) ? FOH.ordersStore.getDB() : null;
      if (!db || !db.order || !db.order.lines) return 0;
      return Object.values(db.order.lines).filter((l) => Number(l.qty) > 0).length;
    } catch {
      /* Safe storage fallback */
      return 0;
    }
  }

  function rolloverTasksToNextShift(tasks, targetShift) {
    if (!tasks || !tasks.length) return false;
    const ar = isAr();
    const tplKey = targetShift === 'closing' ? 'foh-opening.closingTemplate' : 'foh-opening.midTemplate';
    let targetTpl = null;
    try {
      const raw = localStorage.getItem(tplKey);
      targetTpl = raw ? JSON.parse(raw) : null;
    } catch {
      /* Safe storage fallback */
      targetTpl = null;
    }

    if (!targetTpl || !Array.isArray(targetTpl.sections) || !targetTpl.sections.length) {
      targetTpl = JSON.parse(JSON.stringify(S.tpl));
    }

    let rolloverSec = targetTpl.sections.find((s) => s.id === 'sec-rollover');
    if (!rolloverSec) {
      rolloverSec = {
        id: 'sec-rollover',
        title: 'Pending Shift Rollover',
        titleAr: 'مهام مُرحّلة من الشفت السابق',
        dept: 'floor',
        items: [],
      };
      targetTpl.sections.unshift(rolloverSec);
    }

    const tag = ar ? ' [مُرحّل من الشفت السابق]' : ' [Shift Rollover]';
    tasks.forEach((t) => {
      const newId = 'roll_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      rolloverSec.items.push({
        id: newId,
        text: (t.text || '') + tag,
        textAr: (t.textAr || t.text || '') + tag,
        due: t.due || '',
        isCritical: !!t.isCritical,
        children: [],
      });
    });

    try {
      localStorage.setItem(tplKey, JSON.stringify(targetTpl));
      return true;
    } catch {
      /* Storage quota fallback */
      return false;
    }
  }

  function renderHandoverStatsGrid(stats, ar) {
    const grid = el('div', 'handover-stats-grid');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    grid.style.gap = '8px';
    grid.style.margin = '12px 0';

    const items = [
      { num: stats.uncompleted.length, label: ar ? 'مهام متبقية' : 'Tasks Left', color: stats.uncompleted.length ? '#e74c3c' : '#27ae60', icon: '📋' },
      { num: stats.pendingOrders, label: ar ? 'أصناف طلبيات' : 'Order Items', color: '#f39c12', icon: '🛒' },
      { num: stats.breakage, label: ar ? 'حالات كسر' : 'Breakages', color: '#e67e22', icon: '💥' },
    ];

    items.forEach((it) => {
      const tile = el('div', 'handover-stat-tile');
      tile.style.background = 'var(--surface)';
      tile.style.border = '1px solid var(--line)';
      tile.style.borderRadius = '10px';
      tile.style.padding = '10px 6px';
      tile.style.textAlign = 'center';
      tile.innerHTML = '<span style="font-size:1.2rem;display:block;">' + it.icon + '</span>' +
        '<b style="font-size:1.25rem;color:' + it.color + ';display:block;margin:4px 0;">' + it.num + '</b>' +
        '<small style="font-size:0.72rem;color:var(--ink2);">' + it.label + '</small>';
      grid.append(tile);
    });
    return grid;
  }

  function renderHandoverHeader(dlg, ar) {
    const header = el('div', 'handover-modal-head');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.borderBottom = '1px solid var(--line)';
    header.style.paddingBottom = '10px';

    const title = el('h3', '', ar ? '🤝 تسليم الشفت والتقرير التشغيلي' : '🤝 Shift Handover & Operational Log');
    title.style.margin = '0';
    title.style.fontSize = '1.05rem';
    const closeBtn = el('button', 'btn-close', '×');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => dlg.close());
    header.append(title, closeBtn);
    return header;
  }

  function renderHandoverTasksPreview(uncompleted, ar) {
    const tasksBox = el('div', 'handover-tasks-box');
    tasksBox.style.maxHeight = '140px';
    tasksBox.style.overflowY = 'auto';
    tasksBox.style.background = 'var(--bg)';
    tasksBox.style.borderRadius = '8px';
    tasksBox.style.padding = '8px';
    tasksBox.style.margin = '10px 0';

    if (uncompleted.length === 0) {
      tasksBox.innerHTML = '<p style="margin:4px;color:#27ae60;font-size:0.82rem;text-align:center;">' +
        (ar ? '🎉 ممتاز! تم إنجاز جميع مهام الشيك ليست بنسبة 100%' : '🎉 All checklist tasks 100% completed!') + '</p>';
      return tasksBox;
    }

    const heading = el('small', '', ar ? 'المهام المعلقة التي سيتم تسليمها:' : 'Pending tasks to hand over:');
    heading.style.fontWeight = 'bold';
    heading.style.display = 'block';
    heading.style.marginBottom = '6px';
    tasksBox.append(heading);
    uncompleted.slice(0, 10).forEach((t, i) => {
      const row = el('div', 'handover-item-row');
      row.style.fontSize = '0.78rem';
      row.style.padding = '3px 0';
      row.style.borderBottom = '1px dashed var(--line)';
      row.textContent = `${i + 1}. ${ar && t.textAr ? t.textAr : t.text}`;
      tasksBox.append(row);
    });
    if (uncompleted.length > 10) {
      tasksBox.append(el('small', '', ar ? `... و ${uncompleted.length - 10} مهام أخرى` : `... and ${uncompleted.length - 10} more`));
    }
    return tasksBox;
  }

  function renderHandoverActionButtons(dlg, opts = {}) {
    const { uncompleted, nextShift, ar } = opts;
    const actionRow = el('div', 'handover-actions');
    actionRow.style.display = 'flex';
    actionRow.style.flexWrap = 'wrap';
    actionRow.style.gap = '8px';
    actionRow.style.marginTop = '14px';

    const sealBtn = el('button', 'btn primary', ar ? '🔒 ختم وتسليم الشفت (Seal)' : '🔒 Seal Shift Handover');
    sealBtn.type = 'button';
    sealBtn.style.flex = '1';
    sealBtn.addEventListener('click', () => {
      dlg.close();
      if (FOH.shiftSealing && FOH.shiftSealing.openShiftSealModal) {
        FOH.shiftSealing.openShiftSealModal();
      }
    });
    actionRow.append(sealBtn);

    if (uncompleted.length > 0) {
      const rollBtn = el('button', 'btn', ar ? '🔁 ترحيل المهام' : '🔁 Rollover');
      rollBtn.type = 'button';
      rollBtn.addEventListener('click', () => {
        const ok = rolloverTasksToNextShift(uncompleted, nextShift);
        if (ok) {
          if (navigator.vibrate) navigator.vibrate([15, 60, 15]);
          FOH.edit.toast(ar ? 'تم ترحيل المهام بنجاح إلى شفت ' + getShiftName(nextShift, ar) + ' ✓' : 'Rolled over tasks to ' + getShiftName(nextShift, ar) + ' ✓');
          dlg.close();
          if (FOH.erpPwa && FOH.erpPwa.switchSheetType) {
            FOH.erpPwa.switchSheetType(nextShift);
          }
        }
      });
      actionRow.append(rollBtn);
    }

    const doneBtn = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    doneBtn.type = 'button';
    doneBtn.style.minWidth = '70px';
    doneBtn.addEventListener('click', () => dlg.close());
    actionRow.append(doneBtn);
    return actionRow;
  }

  function openShiftHandoverModal() {
    const ar = isAr();
    const curShift = getCurShiftType();
    const nextShift = getNextShiftType(curShift);
    const uncompleted = collectUncompletedTasks();
    const breakage = collectBreakageCount();
    const pendingOrders = collectPendingOrdersCount();

    const dlg = el('dialog', 'sheet shift-handover-dlg');
    dlg.style.maxWidth = '460px';
    dlg.style.width = '94%';
    dlg.style.padding = '16px';
    dlg.style.borderRadius = '16px';

    const header = renderHandoverHeader(dlg, ar);
    const shiftNotice = el('div', 'handover-notice');
    shiftNotice.style.margin = '10px 0';
    shiftNotice.style.fontSize = '0.85rem';
    shiftNotice.innerHTML = ar
      ? 'تسليم العمل من: <b>' + getShiftName(curShift, ar) + '</b> إلى <b>' + getShiftName(nextShift, ar) + '</b>'
      : 'Handoff from: <b>' + getShiftName(curShift, ar) + '</b> to <b>' + getShiftName(nextShift, ar) + '</b>';

    const statsGrid = renderHandoverStatsGrid({ uncompleted, breakage, pendingOrders }, ar);
    const tasksBox = renderHandoverTasksPreview(uncompleted, ar);
    const actionRow = renderHandoverActionButtons(dlg, { uncompleted, nextShift, ar });

    dlg.append(header, shiftNotice, statsGrid, tasksBox, actionRow);
    document.body.append(dlg);
    dlg.showModal();
    dlg.addEventListener('close', () => dlg.remove());
  }

  function injectHandoverButtonIntoShiftNav() {
    const navHead = document.querySelector('.shift-nav-head');
    if (!navHead) return;
    let b = navHead.querySelector('#btnShiftHandover');
    if (!b) {
      const ar = isAr();
      b = el('button', 'btn shift-handover-btn', ar ? '🤝 تسليم الشفت' : '🤝 Handover');
      b.id = 'btnShiftHandover';
      b.type = 'button';
      b.style.fontSize = '0.75rem';
      b.style.padding = '4px 10px';
      b.style.borderRadius = '20px';
      b.style.background = 'var(--surface)';
      b.style.border = '1.5px solid var(--accent)';
      b.style.color = 'var(--ink)';
      b.style.fontWeight = 'bold';
      b.style.cursor = 'pointer';
      b.addEventListener('click', openShiftHandoverModal);
      navHead.append(b);
    }
  }

  FOH.shiftHandover = {
    openHandoverModal: openShiftHandoverModal,
    injectButton: injectHandoverButtonIntoShiftNav,
    collectUncompletedTasks,
    collectBreakageCount,
    collectPendingOrdersCount,
  };
})(window.FOH = window.FOH || {});
