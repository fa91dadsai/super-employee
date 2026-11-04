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
    if (FOH.taskInbox && FOH.taskInbox.notifyMobileOnNewTaskAdded) {
      FOH.taskInbox.notifyMobileOnNewTaskAdded(t);
    } else if (FOH.notifCenter && FOH.notifCenter.notifyMobileOnNewTaskAdded) {
      FOH.notifCenter.notifyMobileOnNewTaskAdded(t);
    } else if (FOH.realtime && FOH.realtime.notifyMobileOnNewTaskAdded) {
      FOH.realtime.notifyMobileOnNewTaskAdded(t);
    }
  }

  function getScheduledSheetForNow() {
    return FOH.threeShifts ? FOH.threeShifts.getScheduledSheetForNow() : 'opening';
  }

  // ---- Add & Assign Task to Specific Employee or Role Modal ----
  // Helper for date math

  function canCurrentUserAssignTasks() {
    return (FOH.roleIdentity && FOH.roleIdentity.canCurrentUserAssignTasks)
      ? FOH.roleIdentity.canCurrentUserAssignTasks()
      : true;
  }

  function addDaysIso(iso, n) {
    if (FOH.schedule && FOH.schedule.addDays) return FOH.schedule.addDays(iso, n);
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  // ---- Add & Assign Task to Specific Employee or Role Modal ----
  // ============================================================================
  // Task Assignment Sub-Renderers & Modals (< 80 lines per function)
  // ============================================================================

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

  function createOncePanel(ar, today, nowHM) {
    const panelOnce = el('div', 'asg-once-panel');
    const quickDateRow = el('div', '');
    quickDateRow.style.display = 'flex';
    quickDateRow.style.gap = '6px';
    quickDateRow.style.flexWrap = 'wrap';
    quickDateRow.style.marginBottom = '10px';

    const dateChips = [
      { offset: 0, label: ar ? 'اليوم' : 'Today', date: today },
      { offset: 1, label: ar ? 'غداً' : 'Tomorrow', date: addDaysIso(today, 1) },
      { offset: 2, label: ar ? 'بعد غد' : '+2 Days', date: addDaysIso(today, 2) },
      { offset: 'custom', label: ar ? 'تاريخ مخصص 📅' : 'Custom Date 📅' },
    ];

    const onceRowInputs = el('div', 'two');
    const onceDateLbl = el('label', '');
    onceDateLbl.innerHTML = '<span style="font-size:0.76rem;font-weight:600;color:var(--muted);">' + (ar ? '📅 تاريخ تنفيذ المهمة:' : '📅 Task Date:') + '</span>';
    const onceDateIn = el('input', 'in');
    onceDateIn.type = 'date';
    onceDateIn.value = S.date || today;
    onceDateIn.style.minHeight = '42px';
    onceDateIn.style.fontWeight = '600';
    onceDateLbl.append(onceDateIn);

    const dueTimeLbl = el('label', '');
    dueTimeLbl.innerHTML = '<span style="font-size:0.76rem;font-weight:600;color:var(--muted);">' + (ar ? '⏰ وقت التنفيذ المطلوب (اختياري):' : '⏰ Due Time:') + '</span>';
    const dueTimeIn = el('input', 'in');
    dueTimeIn.type = 'time';
    dueTimeIn.value = nowHM;
    dueTimeIn.style.minHeight = '42px';
    dueTimeIn.style.fontWeight = '600';
    dueTimeLbl.append(dueTimeIn);

    onceRowInputs.append(onceDateLbl, dueTimeLbl);

    dateChips.forEach((dc) => {
      const chip = el('button', 'date-chip' + (dc.offset === 0 ? ' on' : ''), dc.label);
      chip.type = 'button';
      chip.addEventListener('click', () => {
        panelOnce.querySelectorAll('.date-chip').forEach((c) => c.classList.remove('on'));
        chip.classList.add('on');
        if (dc.offset === 'custom') {
          onceDateIn.focus();
          if (onceDateIn.showPicker) {
            try { onceDateIn.showPicker(); } catch (err) { /* showPicker unsupported */ }
          }
        } else {
          onceDateIn.value = dc.date;
        }
      });
      quickDateRow.append(chip);
    });

    onceDateIn.addEventListener('input', () => {
      panelOnce.querySelectorAll('.date-chip').forEach((c) => c.classList.remove('on'));
      const match = Array.from(quickDateRow.children).find((c, i) => dateChips[i].date === onceDateIn.value);
      if (match) match.classList.add('on');
      else {
        const lastChip = quickDateRow.children[quickDateRow.children.length - 1];
        if (lastChip) lastChip.classList.add('on');
      }
    });

    panelOnce.append(quickDateRow, onceRowInputs);
    return { panelOnce, onceDateIn, dueTimeIn };
  }

  function createRecurringIntervalStepper(initialEvery, intervalPresets, ar) {
    let currentEvery = initialEvery;
    const stepperBox = el('div', '');
    stepperBox.innerHTML = '<span style="font-size:0.76rem;font-weight:600;color:var(--muted);display:block;margin-bottom:4px;">' + (ar ? 'تحديد التكرار بالأيام:' : 'Interval Days:') + '</span>';

    const stepper = el('div', 'stepper');
    stepper.style.display = 'inline-flex';
    stepper.style.alignItems = 'center';
    stepper.style.background = 'var(--bg)';
    stepper.style.border = '1px solid var(--line)';
    stepper.style.borderRadius = '12px';
    stepper.style.padding = '4px 8px';
    stepper.style.minHeight = '42px';
    stepper.style.gap = '8px';

    const prefixSpan = el('span', '', ar ? 'كل' : 'Every');
    prefixSpan.style.fontSize = '0.8rem';
    prefixSpan.style.color = 'var(--muted)';

    const minusBtn = el('button', '', '−');
    minusBtn.type = 'button';
    minusBtn.style.width = '32px';
    minusBtn.style.height = '32px';
    minusBtn.style.borderRadius = '8px';
    minusBtn.style.border = '1px solid var(--line)';
    minusBtn.style.background = 'var(--card)';
    minusBtn.style.fontWeight = '700';
    minusBtn.style.cursor = 'pointer';

    const everyNumEl = el('b', '', String(currentEvery));
    everyNumEl.style.minWidth = '24px';
    everyNumEl.style.textAlign = 'center';
    everyNumEl.style.fontSize = '1.05rem';

    const plusBtn = el('button', '', '+');
    plusBtn.type = 'button';
    plusBtn.style.width = '32px';
    plusBtn.style.height = '32px';
    plusBtn.style.borderRadius = '8px';
    plusBtn.style.border = '1px solid var(--line)';
    plusBtn.style.background = 'var(--card)';
    plusBtn.style.fontWeight = '700';
    plusBtn.style.cursor = 'pointer';

    const suffixSpan = el('span', '', ar ? (currentEvery === 1 ? 'يوم' : 'أيام') : (currentEvery === 1 ? 'day' : 'days'));
    suffixSpan.style.fontSize = '0.8rem';
    suffixSpan.style.color = 'var(--muted)';

    stepper.append(prefixSpan, minusBtn, everyNumEl, plusBtn, suffixSpan);
    stepperBox.append(stepper);

    let onUpdateCallback = null;
    function updateEvery(val) {
      currentEvery = Math.max(1, Math.min(365, val));
      everyNumEl.textContent = String(currentEvery);
      suffixSpan.textContent = ar ? (currentEvery === 1 ? 'يوم' : 'أيام') : (currentEvery === 1 ? 'day' : 'days');
      if (onUpdateCallback) onUpdateCallback(currentEvery);
    }

    minusBtn.addEventListener('click', () => updateEvery(currentEvery - 1));
    plusBtn.addEventListener('click', () => updateEvery(currentEvery + 1));

    return {
      stepperBox,
      getEvery: () => currentEvery,
      setEvery: (v) => updateEvery(v),
      onUpdate: (cb) => { onUpdateCallback = cb; },
    };
  }

  function createRecurringDateRangeBox(ar, today) {
    const rangeBox = el('div', '');
    rangeBox.style.background = 'var(--card)';
    rangeBox.style.border = '1px solid var(--line)';
    rangeBox.style.borderRadius = '12px';
    rangeBox.style.padding = '10px 12px';

    const rangeInputsRow = el('div', 'two');
    const startLbl = el('label', '');
    startLbl.innerHTML = '<span style="font-size:0.76rem;font-weight:600;color:var(--muted);">' + (ar ? '🚀 تاريخ بدء التكرار:' : '🚀 Start Date:') + '</span>';
    const startDateIn = el('input', 'in');
    startDateIn.type = 'date';
    startDateIn.value = S.date || today;
    startDateIn.style.minHeight = '38px';
    startDateIn.style.fontWeight = '600';
    startLbl.append(startDateIn);

    const endLbl = el('label', '');
    endLbl.id = 'asgEndDateWrapper';
    endLbl.style.opacity = '0.45';
    endLbl.style.transition = 'opacity 0.2s';
    endLbl.innerHTML = '<span style="font-size:0.76rem;font-weight:600;color:var(--muted);">' + (ar ? '🏁 تاريخ نهاية التكرار:' : '🏁 End Date:') + '</span>';
    const endDateIn = el('input', 'in');
    endDateIn.type = 'date';
    endDateIn.value = addDaysIso(today, 30);
    endDateIn.disabled = true;
    endDateIn.style.minHeight = '38px';
    endDateIn.style.fontWeight = '600';
    endLbl.append(endDateIn);

    rangeInputsRow.append(startLbl, endLbl);

    const openEndedTog = el('label', 'tog');
    openEndedTog.style.marginTop = '10px';
    openEndedTog.style.display = 'flex';
    openEndedTog.style.alignItems = 'center';
    openEndedTog.style.justifyContent = 'space-between';
    openEndedTog.style.cursor = 'pointer';
    openEndedTog.style.background = 'var(--bg2, rgba(0,0,0,0.03))';
    openEndedTog.style.padding = '8px 10px';
    openEndedTog.style.borderRadius = '8px';

    const openEndedTitle = el('span', '');
    openEndedTitle.style.fontSize = '0.8rem';
    openEndedTitle.style.fontWeight = '700';
    openEndedTitle.style.display = 'flex';
    openEndedTitle.style.alignItems = 'center';
    openEndedTitle.style.gap = '6px';
    openEndedTitle.innerHTML = '<span>♾️</span><span>' + (ar ? 'مفتوحة للتاريخ (مستمرة بدون نهاية)' : 'Open-Ended (No End Date)') + '</span>';

    const openEndedCheck = el('input', 'sw');
    openEndedCheck.type = 'checkbox';
    openEndedCheck.checked = true;

    openEndedCheck.addEventListener('change', () => {
      const isIndefinite = openEndedCheck.checked;
      endDateIn.disabled = isIndefinite;
      endLbl.style.opacity = isIndefinite ? '0.45' : '1';
      if (!isIndefinite) {
        endDateIn.focus();
        if (endDateIn.showPicker) {
          try { endDateIn.showPicker(); } catch (err) { /* showPicker unsupported */ }
        }
      }
    });

    openEndedTog.append(openEndedTitle, openEndedCheck);
    rangeBox.append(rangeInputsRow, openEndedTog);
    return { rangeBox, startDateIn, endDateIn, openEndedCheck };
  }

  function createRecurringPanel(ar, today, nowHM) {
    const panelRecurring = el('div', 'asg-recurring-panel');
    panelRecurring.style.display = 'none';

    const recurFreqLbl = el('label', '');
    recurFreqLbl.style.display = 'block';
    recurFreqLbl.style.marginBottom = '6px';
    recurFreqLbl.innerHTML = '<span style="font-size:0.76rem;font-weight:600;color:var(--muted);">' + (ar ? '🔁 تتكرر هذه المهمة كل كم يوم؟' : '🔁 Repeat Every How Many Days?') + '</span>';

    const intervalChipsRow = el('div', '');
    intervalChipsRow.style.display = 'flex';
    intervalChipsRow.style.gap = '6px';
    intervalChipsRow.style.flexWrap = 'wrap';
    intervalChipsRow.style.marginBottom = '10px';

    const intervalPresets = [
      { days: 1, label: ar ? 'يومياً (كل يوم)' : 'Daily (1d)' },
      { days: 2, label: ar ? 'كل يومين' : 'Every 2d' },
      { days: 3, label: ar ? 'كل 3 أيام' : 'Every 3d' },
      { days: 7, label: ar ? 'أسبوعياً (كل 7 أيام)' : 'Weekly (7d)' },
      { days: 30, label: ar ? 'شهرياً (كل 30 يوم)' : 'Monthly (30d)' },
    ];

    const stepper = createRecurringIntervalStepper(3, intervalPresets, ar);

    const stepperRow = el('div', 'two');
    stepperRow.style.alignItems = 'flex-end';
    stepperRow.style.marginBottom = '12px';

    const recurTimeLbl = el('label', '');
    recurTimeLbl.style.flex = '1';
    recurTimeLbl.innerHTML = '<span style="font-size:0.76rem;font-weight:600;color:var(--muted);">' + (ar ? '⏰ وقت التنفيذ في يوم التكرار:' : '⏰ Recur Time:') + '</span>';
    const recurTimeIn = el('input', 'in');
    recurTimeIn.type = 'time';
    recurTimeIn.value = nowHM;
    recurTimeIn.style.minHeight = '42px';
    recurTimeIn.style.fontWeight = '600';
    recurTimeLbl.append(recurTimeIn);

    stepperRow.append(stepper.stepperBox, recurTimeLbl);

    intervalPresets.forEach((ip) => {
      const chip = el('button', 'interval-chip' + (ip.days === stepper.getEvery() ? ' on' : ''), ip.label);
      chip.type = 'button';
      chip.addEventListener('click', () => stepper.setEvery(ip.days));
      intervalChipsRow.append(chip);
    });

    stepper.onUpdate((cur) => {
      intervalChipsRow.querySelectorAll('.interval-chip').forEach((c, idx) => {
        c.classList.toggle('on', intervalPresets[idx].days === cur);
      });
    });

    const range = createRecurringDateRangeBox(ar, today);
    panelRecurring.append(recurFreqLbl, intervalChipsRow, stepperRow, range.rangeBox);
    return { panelRecurring, stepper, recurTimeIn, startDateIn: range.startDateIn, endDateIn: range.endDateIn, openEndedCheck: range.openEndedCheck };
  }

  function createRecurrenceSegment(ar, once, recur) {
    let recurType = 'once';
    const recurSeg = el('div', 'seg wide');
    recurSeg.style.display = 'flex';
    recurSeg.style.borderRadius = '12px';
    recurSeg.style.overflow = 'hidden';
    recurSeg.style.border = '1px solid var(--line)';
    recurSeg.style.marginBottom = '12px';

    const btnOnce = el('button', 'seg-btn on', ar ? '📌 مهمة لمرة واحدة (One-Time)' : '📌 One-Time Task');
    btnOnce.type = 'button';
    btnOnce.style.flex = '1';
    btnOnce.style.minHeight = '42px';
    btnOnce.style.fontWeight = '700';
    btnOnce.style.fontSize = '0.84rem';
    btnOnce.style.border = 'none';
    btnOnce.style.cursor = 'pointer';

    const btnRecur = el('button', 'seg-btn', ar ? '🔄 مهمة متكررة دورياً (Recurring)' : '🔄 Recurring Task');
    btnRecur.type = 'button';
    btnRecur.style.flex = '1';
    btnRecur.style.minHeight = '42px';
    btnRecur.style.fontWeight = '700';
    btnRecur.style.fontSize = '0.84rem';
    btnRecur.style.border = 'none';
    btnRecur.style.cursor = 'pointer';

    btnOnce.addEventListener('click', () => {
      recurType = 'once';
      btnOnce.classList.add('on');
      btnRecur.classList.remove('on');
      once.panelOnce.style.display = 'block';
      recur.panelRecurring.style.display = 'none';
    });

    btnRecur.addEventListener('click', () => {
      recurType = 'recurring';
      btnRecur.classList.add('on');
      btnOnce.classList.remove('on');
      once.panelOnce.style.display = 'none';
      recur.panelRecurring.style.display = 'block';
    });

    recurSeg.append(btnOnce, btnRecur);
    return { recurSeg, getRecurType: () => recurType };
  }

  function createRecurrenceCard(ar, today, nowHM) {
    const recurCard = el('div', 'task-asg-card');
    recurCard.style.background = 'var(--bg2, rgba(0,0,0,0.03))';
    recurCard.style.border = '1px solid var(--line)';
    recurCard.style.borderRadius = '16px';
    recurCard.style.padding = '12px 14px';
    recurCard.style.marginBottom = '12px';

    const recurTitleRow = el('div', '');
    recurTitleRow.style.display = 'flex';
    recurTitleRow.style.justifyContent = 'space-between';
    recurTitleRow.style.alignItems = 'center';
    recurTitleRow.style.marginBottom = '8px';
    recurTitleRow.innerHTML =
      '<span style="font-weight:700;font-size:0.82rem;display:flex;align-items:center;gap:6px;"><span>🗓️</span><span>' +
      (ar ? 'طبيعة التكرار والجدولة:' : 'Recurrence & Schedule:') +
      '</span></span>';
    recurCard.append(recurTitleRow);

    const once = createOncePanel(ar, today, nowHM);
    const recur = createRecurringPanel(ar, today, nowHM);
    const seg = createRecurrenceSegment(ar, once, recur);

    recurCard.append(seg.recurSeg, once.panelOnce, recur.panelRecurring);

    return {
      recurCard,
      getRecurData: () => ({
        recurType: seg.getRecurType(),
        currentEvery: recur.stepper.getEvery(),
        recurTimeHM: recur.recurTimeIn.value || '12:00',
        startDate: recur.startDateIn.value || S.date || today,
        endDate: recur.endDateIn.value || null,
        isOpenEnded: recur.openEndedCheck.checked,
        onceDate: once.onceDateIn.value || S.date || today,
        dueHM: once.dueTimeIn.value || '12:00',
      }),
    };
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

    const staffList = (S.tpl.staff || []).filter((st) => st.active !== false);
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

  function buildTaskRuleAndBadge(recurData, rKey, opts = {}) {
    const isLegacy = typeof opts === 'string';
    const empUser = isLegacy ? opts : ((opts && opts.empUser) || '');
    const ar = isLegacy ? !!arguments[3] : (opts && typeof opts.ar === 'boolean' ? opts.ar : isAr());
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
    (S.tpl.staff || []).forEach((st) => {
      const k = (st.name || '').toLowerCase().split(' ')[0];
      if (k && !empNameMap[k]) empNameMap[k] = st.name;
    });

    const assignedRoleLabel = (empUser ? ('👤 ' + (empNameMap[empUser] || empUser) + ' · ') : '') + (roleBadgeMap[rKey] || '');

    let taskRule, taskStart, taskEndDate, isOpenEnded, dueHM, scheduleDate;
    if (recurData.recurType === 'recurring') {
      dueHM = recurData.recurTimeHM;
      taskStart = recurData.startDate;
      isOpenEnded = recurData.isOpenEnded;
      taskEndDate = isOpenEnded ? null : recurData.endDate;
      taskRule = { type: 'interval', every: recurData.currentEvery };
      scheduleDate = null;
    } else {
      dueHM = recurData.dueHM;
      scheduleDate = recurData.onceDate;
      taskStart = scheduleDate;
      taskEndDate = null;
      isOpenEnded = false;
      taskRule = { type: 'once', date: scheduleDate };
    }

    const recurDesc = recurData.recurType === 'recurring'
      ? (recurData.currentEvery === 1
          ? (ar ? '🔄 يومياً' : '🔄 Daily')
          : recurData.currentEvery === 7
          ? (ar ? '🔄 أسبوعياً' : '🔄 Weekly')
          : (ar ? '🔄 كل ' + recurData.currentEvery + ' أيام' : '🔄 Every ' + recurData.currentEvery + 'd')) +
        (isOpenEnded ? '' : (ar ? ' (حتى ' + taskEndDate + ')' : ' (until ' + taskEndDate + ')'))
      : (scheduleDate ? '📅 ' + scheduleDate : '');

    const fullBadgeLabel = assignedRoleLabel + (recurDesc ? ' · ' + recurDesc : '');

    return {
      assignedRoleLabel,
      fullBadgeLabel,
      taskRule,
      taskStart,
      taskEndDate,
      isOpenEnded,
      dueHM,
      scheduleDate,
      empName: empUser ? (empNameMap[empUser] || empUser) : (roleBadgeMap[rKey] || 'Staff'),
    };
  }

  function assembleNewTaskItems(params, meta) {
    const { textVal, targetSheet, rKey, empUser, recurData } = params;
    const newItem = {
      id: 'asg_' + Date.now(),
      text: textVal,
      textAr: textVal,
      due: meta.dueHM,
      role: '',
      assignedRoleKey: rKey,
      assignedUsername: empUser,
      assignedRoleLabel: meta.fullBadgeLabel,
      isRecurring: recurData.recurType === 'recurring',
      scheduleDate: recurData.recurType === 'once' ? meta.scheduleDate : null,
      recurrence: recurData.recurType === 'recurring' ? {
        type: 'interval',
        every: recurData.currentEvery,
        start: meta.taskStart,
        endDate: meta.taskEndDate,
        isOpenEnded: meta.isOpenEnded,
      } : null,
      children: [],
    };
    const templateTask = {
      id: newItem.id,
      text: textVal,
      textAr: textVal,
      icon: targetSheet === 'opening' ? '☀️' : targetSheet === 'mid' ? '🌤️' : '🌙',
      rule: meta.taskRule,
      start: meta.taskStart,
      endDate: meta.taskEndDate,
      isOpenEnded: meta.isOpenEnded,
      time: meta.dueHM || '14:00',
      lateAfter: 60,
      role: '',
      person: meta.empName,
      assignedRoleKey: rKey,
      assignedUsername: empUser,
      assignedSheet: targetSheet,
      carry: true,
      paused: false,
    };
    return { newItem, templateTask };
  }

  function broadcastAssignedTask(sess, targetSheet, opts = {}) {
    const isLegacy = typeof opts === 'object' && !('meta' in opts);
    const meta = isLegacy ? opts : (opts && opts.meta);
    const newItem = isLegacy ? arguments[3] : (opts && opts.newItem);
    const recurData = isLegacy ? arguments[4] : (opts && opts.recurData);
    if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
      FOH.cloudRealtime.broadcast('TASK_ASSIGNED', {
        senderName: (sess && sess.displayName) || 'Manager',
        targetSheet,
        dueHM: meta.dueHM,
        item: newItem,
        schedule: {
          recurType: recurData.recurType,
          every: recurData.currentEvery,
          start: meta.taskStart,
          endDate: meta.taskEndDate,
          scheduleDate: meta.scheduleDate,
        },
      });
    }
  }

  function saveAndNotifyTask(params) {
    const { textVal, targetSheet, targetSecId, rKey, empUser, recurData, ar, dlg } = params;
    const sess = getSession();
    const meta = buildTaskRuleAndBadge(recurData, rKey, empUser, ar);
    const { newItem, templateTask } = assembleNewTaskItems(params, meta);

    if (targetSheet !== getActiveSheetType() && FOH.erpPwa && FOH.erpPwa.switchSheetType) {
      manualSheetOverride = targetSheet !== getScheduledSheetForNow();
      FOH.erpPwa.switchSheetType(targetSheet);
    }

    const secObj = (S.tpl.sections || []).find((s) => s.id === targetSecId) || S.tpl.sections[0];
    if (secObj) secObj.items.unshift(newItem);
    if (FOH.erpPwa && FOH.erpPwa.persistCurrentSheetState) FOH.erpPwa.persistCurrentSheetState();

    S.tpl.tasks.unshift(templateTask);
    FOH.store.saveTemplate(S.tpl);
    dlg.close();

    notifyMobileOnNewTaskAdded({
      titleEn: textVal,
      titleAr: textVal,
      dueHM: meta.dueHM,
      sectionLabel: (secObj ? (ar ? secObj.titleAr || secObj.title : secObj.title) : targetSheet),
      roleLabel: meta.fullBadgeLabel,
      remindBefore: 0,
    });

    broadcastAssignedTask(sess, targetSheet, { meta, newItem, recurData });
    FOH.edit.toast(ar ? '✅ تم حفظ المهمة وتعيينها لـ (' + meta.assignedRoleLabel + ')!' : '✅ Task assigned to ' + meta.assignedRoleLabel + ' & saved!');
    FOH.app.render();
  }

  function renderAssignModalActionButtons(dlg, title, opts = {}) {
    const isLegacy = typeof opts === 'object' && !('sheetSec' in opts);
    const sheetSec = isLegacy ? opts : (opts && opts.sheetSec);
    const assignee = isLegacy ? arguments[3] : (opts && opts.assignee);
    const recur = isLegacy ? arguments[4] : (opts && opts.recur);
    const ar = isLegacy ? arguments[5] : (opts && typeof opts.ar === 'boolean' ? opts.ar : isAr());
    const acts = el('div', 'sheet-actions');
    acts.style.marginTop = '16px';
    acts.style.display = 'flex';
    acts.style.gap = '10px';

    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.style.flex = '1';
    cancelB.style.minHeight = '48px';
    cancelB.style.fontWeight = '700';
    cancelB.style.borderRadius = '12px';
    cancelB.addEventListener('click', () => dlg.close());

    const saveB = el('button', 'btn primary', '');
    saveB.type = 'button';
    saveB.style.flex = '2';
    saveB.style.minHeight = '48px';
    saveB.style.fontWeight = '700';
    saveB.style.borderRadius = '12px';
    saveB.style.background = 'var(--accent)';
    saveB.style.color = '#fff';
    saveB.style.display = 'flex';
    saveB.style.alignItems = 'center';
    saveB.style.justifyContent = 'center';
    saveB.style.gap = '8px';
    saveB.innerHTML = '<span>✅</span><span>' + (ar ? 'حفظ المهمة وإرسال إشعار' : 'Save & Notify Staff') + '</span>';

    saveB.addEventListener('click', () => {
      const textVal = title.titleIn.value.trim();
      if (!textVal) return title.titleIn.focus();
      saveAndNotifyTask({
        textVal,
        targetSheet: sheetSec.sheetSel.value,
        targetSecId: sheetSec.secSel.value,
        rKey: assignee.roleSel.value,
        empUser: assignee.empSel.value,
        recurData: recur.getRecurData(),
        ar,
        dlg,
      });
    });

    acts.append(cancelB, saveB);
    return acts;
  }

  function openAssignTaskToStaffOrRoleModal(defaultTargetSheet) {
    const ar = isAr();
    if (!canCurrentUserAssignTasks()) {
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '⚠️ صلاحية تعيين المهام مخصصة للمدير والمشرفين فقط أو لمن تم تفويضه بالإعدادات' : '⚠️ Task assignment is restricted to managers & authorized staff');
      }
      return;
    }
    let dlg = $('assignTaskDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'assignTaskDialog';
      dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
      document.body.append(dlg);
    }
    dlg.replaceChildren();

    const curSheet = defaultTargetSheet || getActiveSheetType();
    const today = (FOH.time && FOH.time.todayISO) ? FOH.time.todayISO() : (S.date || new Date().toISOString().slice(0, 10));
    const nowHM = (FOH.time && FOH.time.nowHM) ? FOH.time.nowHM() : '12:00';

    const box = el('div', 'task-asg-modal-box');
    box.style.padding = '14px 18px 24px';
    box.style.maxHeight = '88dvh';
    box.style.overflowY = 'auto';

    const header = createAssignModalHeader(dlg, ar);
    const title = createTaskTitleInput(ar);
    const recur = createRecurrenceCard(ar, today, nowHM);
    const sheetSec = createSheetAndSectionCard(ar, curSheet);
    const assignee = createAssigneeCard(ar);

    if (FOH.modalPicker && FOH.modalPicker.enhanceSelect) {
      FOH.modalPicker.enhanceSelect(sheetSec.sheetSel, { title: ar ? 'الشيت المستهدف' : 'Target Shift Sheet', icon: '📋' });
      FOH.modalPicker.enhanceSelect(sheetSec.secSel, { title: ar ? 'القسم الفرعي' : 'Target Section', icon: '📂' });
      FOH.modalPicker.enhanceSelect(assignee.roleSel, { title: ar ? 'المنصب التشغيلي (Position)' : 'Position (Role)', icon: '🪪' });
      FOH.modalPicker.enhanceSelect(assignee.empSel, { title: ar ? 'الموظف المسؤول' : 'Assignee Staff', icon: '👤' });
    }



    const acts = renderAssignModalActionButtons(dlg, title, { sheetSec, assignee, recur, ar });
    box.append(header.grab, header.headerRow, header.descP, title.titleGroup, recur.recurCard, sheetSec.rowSheet, assignee.rowAssign, acts);
    dlg.append(box);
    dlg.showModal();
    title.titleIn.focus();
  }

  // ============================================================================
  // Assignment Badges & Filter Sub-Renderers (< 80 lines each)
  // ============================================================================

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

      const txtContainer = li.querySelector('.txt') || li.querySelector('label');
      if (txtContainer && itemObj.assignedRoleLabel && !txtContainer.querySelector('.assigned-task-pill')) {
        const pill = el('span', 'assigned-task-pill', '🎯 ' + itemObj.assignedRoleLabel);
        txtContainer.append(pill);
      }

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





  FOH.taskAssignment = {
    openAssignTaskToStaffOrRoleModal,
    renderAssignedTaskBadgesAndFilter,
    injectAssignTaskBtnIntoToolbarAndMine,
    canCurrentUserAssignTasks,
  };
})(window.FOH = window.FOH || {});
