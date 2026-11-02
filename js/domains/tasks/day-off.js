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
    [
      ['off', t('dayOffKindOff')],
      ['comp_off', t('dayOffKindComp')],
      ['leave', t('dayOffKindLeave')],
    ].forEach(([v, txt]) => {
      const o = el('option', '', txt);
      o.value = v;
      kindSel.append(o);
    });
    kindLbl.append(kindSel);
    row1.append(dateLbl, kindLbl);

    const dowLbl = el('label', '', t('dayOffPrefDowLbl'));
    const dowSel = el('select', 'in');
    const daysLong = t('daysLong').split(',');
    daysLong.forEach((dName, idx) => {
      const o = el('option', '', dName);
      o.value = String(idx);
      if (idx === 5) o.selected = true;
      dowSel.append(o);
    });
    dowLbl.append(dowSel);

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
