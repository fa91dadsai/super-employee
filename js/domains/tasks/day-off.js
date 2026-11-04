// foh-opening/js/domains/tasks/day-off.js
// Employee Day-Off & Schedule Availability Request System Linked to OpsFlow Schedule
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : true;
  }

  function getSession() {
    return (FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.getSession() : null);
  }

  function apiCall(u, m, d) {
    return FOH.cloudSync ? FOH.cloudSync.apiCall(u, m, d) : Promise.resolve(null);
  }

  function renderProfileBody(root) {
    if (FOH.profileDialog && FOH.profileDialog.renderProfileBody) {
      FOH.profileDialog.renderProfileBody(root);
    }
  }

  // ---- Day-Off Requests Linked to OpsFlow Schedule (`duty-roster`) ----
  const DAYOFF_KEY = 'foh-opening.dayOffRequests.v1';

  function loadDayOffList() {
    try {
      const raw = localStorage.getItem(DAYOFF_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) { /* Storage read/write fallback */ }
    const tomorrow = FOH.schedule ? FOH.schedule.addDays(FOH.time.todayISO(), 2) : '2026-11-06';
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
    } catch (err) { /* Storage read/write fallback */ }
  }

  function checkDateCoverage(reqDate, currentStaffId) {
    const list = loadDayOffList();
    const concurrent = list.filter((r) => r.date === reqDate && r.staffId !== currentStaffId && r.status !== 'rejected');
    return {
      hasConflict: concurrent.length > 0,
      conflictNames: concurrent.map((c) => c.staffName),
    };
  }

  function isStaffOffToday(staffId) {
    const today = FOH.time ? FOH.time.todayISO() : new Date().toISOString().slice(0, 10);
    const list = loadDayOffList();
    return list.some((r) => r.staffId === staffId && r.date === today && r.status === 'approved');
  }

  function buildDowSelector(opts) {
    const { ar, dowSel, dowLbl } = opts;
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
        dowPillsRow.querySelectorAll('.date-chip').forEach((c) => c.classList.remove('on'));
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
  }

  async function handleDayOffSubmit(opts) {
    const { dateIn, kindSel, dowSel, reasonIn, inDialog, session } = opts;
    const reqDate = dateIn.value || (FOH.schedule ? FOH.schedule.addDays(S.date, 1) : S.date);
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
    if (inDialog && $('profileSheet') && !$('profileSheet').hidden && $('profileSheet').open) renderProfileBody();
    FOH.app.render();
  }

  function createDayOffKindSelector(ar) {
    const kindLbl = el('label', '', t('dayOffKindLbl'));
    const kindSel = el('select', 'in');
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
    return { kindLbl, kindSel };
  }

  function renderDayOffForm(opts) {
    const { inDialog, session, ar } = opts;
    const form = el('div', 'dayoff-form');
    const row1 = el('div', 'two');

    const dateLbl = el('label', '', t('dayOffDateLbl'));
    const dateIn = el('input', 'in');
    dateIn.type = 'date';
    dateIn.value = FOH.schedule ? FOH.schedule.addDays(S.date, 1) : S.date;
    dateLbl.append(dateIn);

    const { kindLbl, kindSel } = createDayOffKindSelector(ar);
    row1.append(dateLbl, kindLbl);

    const dowLbl = el('label', '', t('dayOffPrefDowLbl'));
    const dowSel = el('select', 'in');
    buildDowSelector({ ar, dowSel, dowLbl });

    const reasonIn = el('input', 'in');
    reasonIn.placeholder = t('dayOffReasonPlaceholder');

    const submitBtn = el('button', 'btn primary', t('dayOffSubmitBtn'));
    submitBtn.type = 'button';
    submitBtn.addEventListener('click', async () => {
      await handleDayOffSubmit({ dateIn, kindSel, dowSel, reasonIn, inDialog, session });
    });

    form.append(row1, dowLbl, reasonIn, submitBtn);
    return form;
  }

  async function updateDayOffStatus(opts) {
    const { req, allReqs, status, session, inDialog } = opts;
    req.status = status;
    req.syncedToSchedule = status === 'approved';
    req.reviewedBy = (session && session.displayName) || 'Supervisor';
    saveDayOffList(allReqs);
    if (/^[0-9a-f-]{36}$/i.test(req.id)) {
      await apiCall('PATCH', `/v1/foh-opening/schedule/day-off/${req.id}`, {
        status,
        reviewed_by_name: req.reviewedBy,
      });
    }
    if (inDialog && $('profileSheet') && $('profileSheet').open) renderProfileBody();
    FOH.app.render();
  }

  function renderDayOffActions(opts) {
    const { req, allReqs, session, inDialog } = opts;
    const actions = el('div', '');
    actions.style.display = 'flex';
    actions.style.alignItems = 'center';
    actions.style.gap = '6px';

    const okB = el('button', 'mini-btn ok wide', t('dayOffApproveBtn'));
    okB.type = 'button';
    okB.addEventListener('click', async () => {
      await updateDayOffStatus({ req, allReqs, status: 'approved', session, inDialog });
    });

    const noB = el('button', 'mini-btn no wide', t('dayOffRejectBtn'));
    noB.type = 'button';
    noB.addEventListener('click', async () => {
      await updateDayOffStatus({ req, allReqs, status: 'rejected', session, inDialog });
    });

    actions.append(okB, noB);
    return actions;
  }

  function renderDayOffRequestItem(opts) {
    const { req, isMgr, allReqs, session, inDialog } = opts;
    const row = el('div', 'dayoff-item');
    const info = el('div', '');
    const kindMap = { off: t('dayOffKindOff'), comp_off: t('dayOffKindComp'), leave: t('dayOffKindLeave') };
    
    // Check coverage conflicts
    const coverage = checkDateCoverage(req.date, req.staffId);
    const coverageWarning = coverage.hasConflict ? ` · ⚠️ تغطية: ${coverage.conflictNames.join(', ')}` : '';

    info.append(
      el('b', '', `👤 ${req.staffName} · 📅 ${req.date}`),
      el('div', '', `${kindMap[req.kind] || req.kind}${req.reason ? ' — ' + req.reason : ''}${coverageWarning}`)
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
      right.append(renderDayOffActions({ req, allReqs, session, inDialog }));
    }
    row.append(right);
    return row;
  }

  function renderDayOffList(opts) {
    const { session, inDialog } = opts;
    const allReqs = loadDayOffList();
    const isMgr = !!(session && session.isManager) && !S.previewEmployee;
    const myStaffId = (session && session.staffId) || S.me.staffId;
    const visibleReqs = isMgr
      ? allReqs
      : allReqs.filter((r) => r.staffId === myStaffId || r.staffName === ((session && session.displayName) || S.me.name));

    const listEl = el('div', 'dayoff-list');
    visibleReqs.slice(0, 8).forEach((req) => {
      listEl.append(renderDayOffRequestItem({ req, isMgr, allReqs, session, inDialog }));
    });
    return listEl;
  }

  function buildDayOffSection(inDialog) {
    const session = getSession();
    const sec = el('section', inDialog ? 'prof-section' : 'card');
    if (!inDialog) sec.style.padding = '14px';
    sec.append(el('h4', '', t('dayOffHead')));
    sec.append(el('p', 'setting-note', t('dayOffSub')));

    const form = renderDayOffForm({ inDialog, session, ar: isAr() });
    const list = renderDayOffList({ session, inDialog });
    sec.append(form, list);
    return sec;
  }

  FOH.dayOff = {
    loadDayOffList,
    saveDayOffList,
    checkDateCoverage,
    isStaffOffToday,
    buildDayOffSection,
  };

  FOH.buildDayOffSection = buildDayOffSection;
})(window.FOH = window.FOH || {});
