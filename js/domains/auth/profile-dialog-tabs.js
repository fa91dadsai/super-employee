// foh-opening/js/domains/auth/profile-dialog-tabs.js
// Shift & Duty and Tips & Wallet tabs for Profile Dialog (< 350 lines)

(function () {
  'use strict';

  window.FOH = window.FOH || {};

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { el } = FOH.view || { el: (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; } };
  const { t } = FOH.i18n || { t: (k) => k };

  function renderShiftBentoCard(opts = {}) {
    const { session, staffRec, hcMeta, ar } = opts;
    const secSched = el('section', 'prof-section');
    secSched.append(el('h4', '', '🗓 ' + t('profScheduleHead')));
    const kv = el('div', 'prof-kv');
    const hcStatusTxt = staffRec.healthCertExpiry
      ? (staffRec.healthCertExpiry + ' (' + (hcMeta.hcDays !== null && hcMeta.hcDays <= 30 ? (ar ? '⚠️ تجديد' : '⚠️ Renew') : (ar ? 'صالحة ✓' : 'Valid ✓')) + ')')
      : (session.healthCert || 'Valid ✓');

    [
      [t('profShiftToday'), session.shift || '09:00 – 17:30'],
      [t('profLocker'), session.locker || '#B-04'],
      [t('profUniform'), session.uniform || 'M · Complete'],
      [t('profHealthCert'), hcStatusTxt],
    ].forEach(([k, v]) => {
      const cell = el('div', 'prof-kv-cell');
      cell.append(el('small', '', k), el('b', '', v));
      kv.append(cell);
    });
    secSched.append(kv);
    return secSched;
  }

  function renderShiftShortcuts(ar) {
    const secActs = el('section', 'prof-section');
    secActs.append(el('h4', '', ar ? '⚡ اختصارات سريعة للموظف' : '⚡ Quick Shortcuts'));
    const actsGrid = el('div', 'prof-shortcuts-grid');

    const dayOffBtn = el('button', 'prof-shortcut-btn');
    dayOffBtn.type = 'button';
    dayOffBtn.innerHTML =
      '<div class="psb-icon">🏖️</div>' +
      '<div class="psb-txt"><b>' + (ar ? 'الانتقال إلى قسم طلب إجازة / عطلة (Day-Off)' : 'Request Day-Off & Leave') + '</b><small>' + (ar ? 'تقديم طلب العطلة الأسبوعية للربط مع جدول الشفتات' : 'Submit leave request directly to roster') + '</small></div>' +
      '<div class="psb-arr">' + (ar ? '←' : '→') + '</div>';
    dayOffBtn.addEventListener('click', () => {
      const ps = $('profileSheet');
      if (ps && ps.close) ps.close();
      if (FOH.navigation && FOH.navigation.switchView) FOH.navigation.switchView('dayoff');
      else if (FOH.switchView) FOH.switchView('dayoff');
    });

    const dmgBtn = el('button', 'prof-shortcut-btn');
    dmgBtn.type = 'button';
    dmgBtn.innerHTML =
      '<div class="psb-icon">🔧</div>' +
      '<div class="psb-txt"><b>' + (ar ? 'تسجيل كسر أو عطل بالمعدات (Damage / Repair)' : 'Report Breakage / Repair') + '</b><small>' + (ar ? 'تبليغ فوري عن تلف كأس أو صحن أو طلب صيانة' : 'Log broken glassware or equipment repair') + '</small></div>' +
      '<div class="psb-arr">' + (ar ? '←' : '→') + '</div>';
    dmgBtn.addEventListener('click', () => {
      const ps = $('profileSheet');
      if (ps && ps.close) ps.close();
      if (FOH.invBreak && FOH.invBreak.open) FOH.invBreak.open();
    });

    actsGrid.append(dayOffBtn, dmgBtn);
    secActs.append(actsGrid);
    return secActs;
  }

  function renderShiftTab(container, opts = {}) {
    const { session, staffRec, hcMeta, ar } = opts;
    const myDoneOpening = FOH.tasksView ? FOH.tasksView.myOpeningItems().filter((it) => S.run && S.run.checked && S.run.checked[it.id]).length : 0;
    const myDoneSched = FOH.tasksView ? FOH.tasksView.todayStates().filter((st) => FOH.tasksView.isMine(st.task) && st.status === 'done').length : 0;
    const myCountsTotal = FOH.invCount ? FOH.invCount.myCounts().length : 0;
    const myBreakage = (S.inv && S.inv.breakage) ? S.inv.breakage.filter((b) => (b.by || '').toLowerCase() === (session.displayName || '').toLowerCase()).length : 0;

    const stats = el('div', 'prof-stats');
    [
      [String(myDoneOpening + myDoneSched), t('profTasksDone')],
      [String(myCountsTotal), t('profAssignedCounts')],
      [String(myBreakage), t('profReportedBreak')],
    ].forEach(([num, lbl]) => {
      const box = el('div', 'prof-stat');
      box.append(el('b', '', num), el('small', '', lbl));
      stats.append(box);
    });
    container.append(stats);
    container.append(renderShiftBentoCard({ session, staffRec, hcMeta, ar }));

    if (hcMeta.hcDays !== null && hcMeta.hcDays <= 30) {
      const warnCard = el('div', 'prof-hc-banner ' + (hcMeta.hcDays < 0 ? 'critical' : 'warning'));
      const expiryDateSafe = FOH.escapeHtml ? FOH.escapeHtml(staffRec.healthCertExpiry || '') : (staffRec.healthCertExpiry || '');
      warnCard.innerHTML =
        '<b>' + (hcMeta.hcDays < 0 ? '🚨 ' + (ar ? 'الشهادة الصحية منتهية الصلاحية!' : 'Health Certificate Expired!') : '⚠️ ' + (ar ? 'تنبيه: الشهادة الصحية تقترب من الانتهاء' : 'Health Certificate Expiring Soon')) + '</b>' +
        '<p>' + (ar ? ('شهادتك الصحية تنتهي في تاريخ (' + expiryDateSafe + '). يرجى مراجعة إدارة المطعم لتجديد الشهادة فوراً.') : ('Your certificate expires on ' + expiryDateSafe + '. Please renew with HR immediately.')) + '</p>';
      container.append(warnCard);
    }

    container.append(renderShiftShortcuts(ar));
  }

  function computeTipsMetrics(session) {
    const tipsDB = FOH.tipsView && FOH.tipsView.loadTipsData ? FOH.tipsView.loadTipsData() : null;
    const myKey = (session.username || '').toLowerCase();
    const emp = (tipsDB && tipsDB.staff && (tipsDB.staff[myKey] || tipsDB.staff.sara)) || {
      name: session.displayName || 'Sara',
      points: 100,
      workedDays: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'],
      withdrawals: [{ amountJOD: 10.0 }, { amountJOD: 10.0 }],
    };

    const pointsVal = emp.points || 100;
    const multVal = (pointsVal / 100).toFixed(1) + 'x';
    const workedDaysCount = emp.workedDays ? emp.workedDays.length : 5;
    const totalPool = (tipsDB && tipsDB.totalPoolJOD) || 420.0;
    const totalWeight = tipsDB && tipsDB.staff
      ? Object.values(tipsDB.staff).reduce((sum, st) => sum + (st.points || 100) * (st.workedDays ? st.workedDays.length : 5), 0)
      : 500;
    const empWeight = pointsVal * workedDaysCount;
    const grossShare = ((empWeight / (totalWeight || 1)) * totalPool).toFixed(3);
    const withdrawnTotal = ((emp.withdrawals || []).reduce((s, w) => s + Number(w.amountJOD || 0), 0)).toFixed(3);
    const netPayout = Math.max(0, grossShare - withdrawnTotal).toFixed(3);

    return { multVal, pointsVal, workedDaysCount, withdrawnTotal, netPayout };
  }

  function renderTipsTab(container, opts = {}) {
    const { session, ar } = opts;
    const m = computeTipsMetrics(session);

    const bento = el('div', 'prof-bento-grid');
    const b1 = el('div', 'prof-bento-card');
    b1.append(el('small', '', ar ? '⭐ نقاط التبس (Points Multiplier)' : '⭐ Tip Multiplier'), el('b', '', m.multVal + ' (' + m.pointsVal + ' pts)'));
    const b2 = el('div', 'prof-bento-card');
    b2.append(el('small', '', ar ? '📅 أيام العمل بالشفت' : '📅 Worked Days'), el('b', '', m.workedDaysCount + ' / 7 ' + (ar ? 'أيام' : 'days')));
    const b3 = el('div', 'prof-bento-card');
    b3.append(el('small', '', ar ? '💵 السلف والمسحوبات' : '💵 Advances'), el('b', '', m.withdrawnTotal + ' JOD'));
    const b4 = el('div', 'prof-bento-card highlight');
    b4.append(el('small', '', ar ? '💰 الصافي المقدر للمغلف' : '💰 Net Estimated'), el('b', '', m.netPayout + ' JOD'));
    bento.append(b1, b2, b3, b4);
    container.append(bento);

    const infoCard = el('div', 'prof-info-banner');
    infoCard.innerHTML =
      '<div class="pib-head">⚖️ <b>' + (ar ? 'شفافية احتساب التبس في CEEN Lounge:' : 'Tip Distribution Governance:') + '</b></div>' +
      '<div class="pib-body">' +
      (ar
        ? 'يتم توزيع التبس وفق خوارزمية <b>Largest-Remainder</b> الرسمية بالأفلاس الدقيقة وبدون أي اقتطاعات إدارية. نقاطك تُحسب تلقائياً حسب المسمى الوظيفي وساعات الدوام الفعلية الموثقة.'
        : 'Tips are split with exact integer fils precision via the Largest-Remainder rule without administrative deductions. Points reflect your logged role & shift hours.') +
      '</div>';
    container.append(infoCard);

    const openTipsBtn = el('button', 'btn primary prof-action-btn');
    openTipsBtn.type = 'button';
    openTipsBtn.innerHTML = '<span>💰 ' + (ar ? 'فتح شاشة التبس والمغلفات الكاملة (Tip Manager)' : 'Open Full Tip Manager Wallet') + '</span> <span>' + (ar ? '←' : '→') + '</span>';
    openTipsBtn.addEventListener('click', () => {
      const ps = $('profileSheet');
      if (ps && ps.close) ps.close();
      if (FOH.navigation && FOH.navigation.switchView) FOH.navigation.switchView('tips');
      else if (FOH.switchView) FOH.switchView('tips');
    });
    container.append(openTipsBtn);
  }

  FOH.profileDialogTabs = {
    renderShiftTab,
    renderTipsTab,
    computeTipsMetrics,
  };
})();

