// Sub-panels for Task Recurrence Card (Once panel, Interval stepper, Date range)
(function (FOH) {
  'use strict';

  const { el } = FOH.view;

  function addDaysIso(iso, n) {
    if (FOH.taskAssignmentState && FOH.taskAssignmentState.addDaysIso) {
      return FOH.taskAssignmentState.addDaysIso(iso, n);
    }
    if (FOH.schedule && FOH.schedule.addDays) {
      return FOH.schedule.addDays(iso, n);
    }
    const d = new Date((iso || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
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
    onceDateIn.value = (FOH.state && FOH.state.date) || today;
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
    startDateIn.value = (FOH.state && FOH.state.date) || today;
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

  FOH.taskRecurrencePanels = {
    addDaysIso,
    createOncePanel,
    createRecurringIntervalStepper,
    createRecurringDateRangeBox,
  };
})(window.FOH = window.FOH || {});
