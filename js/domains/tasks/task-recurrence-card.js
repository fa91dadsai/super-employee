// Task Recurrence Card Component
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
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


  FOH.taskRecurrenceCard = {
    createRecurrenceCard,
  };
})(window.FOH = window.FOH || {});
