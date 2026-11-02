// foh-opening/js/domains/tasks/day-off.js
// Employee Day-Off & Schedule Availability Request System
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

  function apiCall(u, m, d) {
    return FOH.cloudSync ? FOH.cloudSync.apiCall(u, m, d) : Promise.resolve(null);
  }

  function renderProfileBody(el) {
    if (FOH.profileDialog) FOH.profileDialog.renderProfileBody(el);
  }

  // ---- Day-Off Requests Linked to OpsFlow Schedule (`duty-roster`) ----
  const DAYOFF_KEY = 'foh-opening.dayOffRequests.v1';

  function loadDayOffList() {
    try {
      const raw = localStorage.getItem(DAYOFF_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const tomorrow = FOH.schedule.addDays(FOH.time.todayISO(), 2);
    const seed = [
      {
        id: 'do_seed_1',
        staffId: 'staff_sara',
        staffName: 'Sara',
        date: tomorrow,
        kind: 'off',
        preferredDow: 4,
        reason: 'موعد عائلي / Family appointment',
        status: 'pending',
        syncedToSchedule: false,
        reviewedBy: '',
      },
    ];
    saveDayOffList(seed);
    return seed;
  }

  function saveDayOffList(list) {
    try {
      localStorage.setItem(DAYOFF_KEY, JSON.stringify(list));
    } catch {}
  }

  function buildDayOffSection(inDialog) {
    const session = getSession();
    const sec = el('section', inDialog ? 'prof-section' : 'card');
    if (!inDialog) sec.style.padding = '14px';
    sec.append(el('h4', '', t('dayOffHead')));
    sec.append(el('p', 'setting-note', t('dayOffSub')));

    const form = el('div', 'dayoff-form');
    const row1 = el('div', 'two');

    const dateLbl = el('label', '', t('dayOffDateLbl'));
    const dateIn = el('input', 'in');
    dateIn.type = 'date';
    dateIn.value = FOH.schedule.addDays(S.date, 1);
    dateLbl.append(dateIn);

    const kindLbl = el('label', '', t('dayOffKindLbl'));
    const kindSel = el('select', 'in');
    const ar = isAr();
    [
      ['off', t('dayOffKindOff'), ar ? 'اليوم الأسبوعي المعتاد للراحة' : 'Official weekly rest day', '🏖️'],
      ['comp_off', t('dayOffKindComp'), ar ? 'عطلة تعويضية مقابل ساعات عمل إضافية' : 'In lieu of extra worked hours', '🔄'],
      ['leave', t('dayOffKindLeave'), ar ? 'طلب إجازة سنوية أو ظرف شخصي' : 'Annual or personal leave request', '🌴'],
    ].forEach(([v, txt, sub, ic]) => {
      const o = el('option', '', ic + ' ' + txt);
      o.value = v;
      o.dataset.subtitle = sub;
      o.dataset.icon = ic;
      kindSel.append(o);
    });
    kindLbl.append(kindSel);
    row1.append(dateLbl, kindLbl);

    const dowLbl = el('label', '', t('dayOffPrefDowLbl'));
    const dowSel = el('select', 'in');
    const dayIcons = ['☀️', '🌙', '⚡', '🌿', '🌤️', '🕌', '⭐'];
    const daysLong = t('daysLong').split(',');
    daysLong.forEach((dName, idx) => {
      const o = el('option', '', (dayIcons[idx] || '📅') + ' ' + dName);
      o.value = String(idx);
      o.dataset.icon = dayIcons[idx] || '📅';
      if (idx === 5) o.selected = true;
      dowSel.append(o);
    });
    dowLbl.append(dowSel);

    // Quick Day-of-Week selector chips
    const dowPillsRow = el('div', 'dow-quick-pills');
    dowPillsRow.style.display = 'flex';
    dowPillsRow.style.gap = '4px';
    dowPillsRow.style.flexWrap = 'wrap';
    dowPillsRow.style.marginTop = '6px';
    dowPillsRow.style.marginBottom = '6px';

    const shortDays = (ar ? 'أحد,اثنين,ثلاثاء,أربعاء,خميس,جمعة,سبت' : 'Sun,Mon,Tue,Wed,Thu,Fri,Sat').split(',');
    shortDays.forEach((sd, idx) => {
      const isSel = idx === 5;
      const chip = el('button', 'date-chip' + (isSel ? ' on' : ''), (dayIcons[idx] || '') + ' ' + sd);
      chip.type = 'button';
      chip.style.padding = '4px 8px';
      chip.style.fontSize = '0.74rem';
      chip.addEventListener('click', () => {
        dowPillsRow.querySelectorAll('.date-chip').forEach(c => c.classList.remove('on'));
        chip.classList.add('on');
        dowSel.value = String(idx);
        dowSel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      dowPillsRow.append(chip);
    });
    dowSel.addEventListener('change', () => {
      dowPillsRow.querySelectorAll('.date-chip').forEach((c, idx) => {
        c.classList.toggle('on', String(idx) === String(dowSel.value));
      });
    });
    dowLbl.append(dowPillsRow);

    if (FOH.modalPicker && FOH.modalPicker.enhanceSelect) {
      FOH.modalPicker.enhanceSelect(kindSel, {
        title: ar ? 'اختر نوع طلب العطلة' : 'Select Request Type',
        subtitle: ar ? 'حدد طبيعة العطلة المطلوبة لتثبيتها في الجدول' : 'Select category to sync with OpsFlow Schedule',
        icon: '🏖️',
      });
      FOH.modalPicker.enhanceSelect(dowSel, {
        title: ar ? 'اختر يوم العطلة الأسبوعي المفضل' : 'Select Preferred Off Day',
        subtitle: ar ? 'اليوم المفضل لك للاستراحة الأسبوعية' : 'Your preferred weekly rest day',
        icon: '🗓️',
      });
    }

    const reasonIn = el('input', 'in');
    reasonIn.placeholder = t('dayOffReasonPlaceholder');

    const submitBtn = el('button', 'btn primary', t('dayOffSubmitBtn'));
    submitBtn.type = 'button';
    submitBtn.addEventListener('click', async () => {
      const reqDate = dateIn.value || FOH.schedule.addDays(S.date, 1);
      const staffId = (session && session.staffId) || S.me.staffId || 'staff_me';
      const staffName = (session && session.displayName) || S.me.name || 'Staff';
      const kind = kindSel.value || 'off';
      const prefDow = Number(dowSel.value);
      const reason = reasonIn.value.trim();

      const list = loadDayOffList();
      const newReq = {
        id: 'do_' + Date.now(),
        staffId,
        staffName,
        date: reqDate,
        kind,
        preferredDow: Number.isInteger(prefDow) ? prefDow : null,
        reason,
        status: 'pending',
        syncedToSchedule: false,
        reviewedBy: '',
      };
      const existingIdx = list.findIndex((r) => r.staffId === staffId && r.date === reqDate);
      if (existingIdx >= 0) list[existingIdx] = newReq;
      else list.unshift(newReq);
      saveDayOffList(list);

      const created = await apiCall('POST', '/v1/foh-opening/schedule/day-off', {
        staff_id: staffId,
        staff_name: staffName,
        business_date: reqDate,
        request_kind: kind,
        preferred_dow: Number.isInteger(prefDow) ? prefDow : null,
        reason,
      });
      if (created && created.id) {
        newReq.id = created.id;
        saveDayOffList(list);
      }

      reasonIn.value = '';
      FOH.edit.toast(t('dayOffSentToast'));
      if (inDialog && !$('profileSheet').hidden && $('profileSheet').open) renderProfileBody();
      FOH.app.render();
    });

    form.append(row1, dowLbl, reasonIn, submitBtn);
    sec.append(form);

    // List of requests (Supervisor sees all staff requests to approve/reject; Staff sees their own)
    const allReqs = loadDayOffList();
    const isMgr = !!(session && session.isManager) && !S.previewEmployee;
    const myStaffId = (session && session.staffId) || S.me.staffId;
    const visibleReqs = isMgr
      ? allReqs
      : allReqs.filter((r) => r.staffId === myStaffId || r.staffName === ((session && session.displayName) || S.me.name));

    const listEl = el('div', 'dayoff-list');
    visibleReqs.slice(0, 8).forEach((req) => {
      const row = el('div', 'dayoff-item');
      const info = el('div', '');
      const kindMap = { off: t('dayOffKindOff'), comp_off: t('dayOffKindComp'), leave: t('dayOffKindLeave') };
      info.append(
        el('b', '', `👤 ${req.staffName} · 📅 ${req.date}`),
        el('div', '', `${kindMap[req.kind] || req.kind}${req.reason ? ' — ' + req.reason : ''}`)
      );
      row.append(info);

      const right = el('div', '');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '6px';

      const stLabel =
        req.status === 'approved'
          ? t('dayOffStatusApproved')
          : req.status === 'rejected'
          ? t('dayOffStatusRejected')
          : t('dayOffStatusPending');
      right.append(el('span', 'dayoff-badge ' + req.status, stLabel));

      if (isMgr && req.status === 'pending') {
        const okB = el('button', 'mini-btn ok wide', t('dayOffApproveBtn'));
        okB.type = 'button';
        okB.addEventListener('click', async () => {
          req.status = 'approved';
          req.syncedToSchedule = true;
          req.reviewedBy = (session && session.displayName) || 'Supervisor';
          saveDayOffList(allReqs);
          if (/^[0-9a-f-]{36}$/i.test(req.id)) {
            await apiCall('PATCH', `/v1/foh-opening/schedule/day-off/${req.id}`, {
              status: 'approved',
              reviewed_by_name: req.reviewedBy,
            });
          }
          if (inDialog && $('profileSheet').open) renderProfileBody();
          FOH.app.render();
        });
        const noB = el('button', 'mini-btn no wide', t('dayOffRejectBtn'));
        noB.type = 'button';
        noB.addEventListener('click', async () => {
          req.status = 'rejected';
          req.syncedToSchedule = false;
          req.reviewedBy = (session && session.displayName) || 'Supervisor';
          saveDayOffList(allReqs);
          if (/^[0-9a-f-]{36}$/i.test(req.id)) {
            await apiCall('PATCH', `/v1/foh-opening/schedule/day-off/${req.id}`, {
              status: 'rejected',
              reviewed_by_name: req.reviewedBy,
            });
          }
          if (inDialog && $('profileSheet').open) renderProfileBody();
          FOH.app.render();
        });
        right.append(okB, noB);
      }
      row.append(right);
      listEl.append(row);
    });

    sec.append(listEl);
    return sec;
  }



  FOH.dayOff = {
    loadDayOffList,
    saveDayOffList,
    buildDayOffSection,
  };

  FOH.buildDayOffSection = buildDayOffSection;
})(window.FOH = window.FOH || {});
