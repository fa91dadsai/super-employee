// Task Recurrence Card Component
(function (FOH) {
  'use strict';

  const { el } = FOH.view;

  function createRecurringPanel(ar, today, nowHM) {
    const P = FOH.taskRecurrencePanels;
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

    const stepper = P.createRecurringIntervalStepper(3, intervalPresets, ar);

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

    const range = P.createRecurringDateRangeBox(ar, today);
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
    const P = FOH.taskRecurrencePanels;
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

    const once = P.createOncePanel(ar, today, nowHM);
    const recur = createRecurringPanel(ar, today, nowHM);
    const seg = createRecurrenceSegment(ar, once, recur);

    recurCard.append(seg.recurSeg, once.panelOnce, recur.panelRecurring);

    return {
      recurCard,
      getRecurData: () => ({
        recurType: seg.getRecurType(),
        currentEvery: recur.stepper.getEvery(),
        recurTimeHM: recur.recurTimeIn.value || '12:00',
        startDate: recur.startDateIn.value || (FOH.state && FOH.state.date) || today,
        endDate: recur.endDateIn.value || null,
        isOpenEnded: recur.openEndedCheck.checked,
        onceDate: once.onceDateIn.value || (FOH.state && FOH.state.date) || today,
        dueHM: once.dueTimeIn.value || '12:00',
      }),
    };
  }

  FOH.taskRecurrenceCard = {
    createRecurrenceCard,
  };
})(window.FOH = window.FOH || {});
