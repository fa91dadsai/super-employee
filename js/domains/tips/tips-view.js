// foh-opening/js/domains/tips/tips-view.js
// Tip Manager UI View, Hamilton Shares Display & Cash Advances Ledger
(function (FOH) {
  'use strict';

  const S = FOH.state;
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : true;
  }

  function getSession() {
    return (FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.getSession() : null);
  }

  function loadGov() {
    return FOH.gov ? FOH.gov.loadGov() : {};
  }

  let selectedTipsUser = '';

  function createManagerEmployeeSelector(opts) {
    const { entries, activeKey, ar, onSelectUser } = opts;
    const selWrap = el('div', '');
    selWrap.style.display = 'flex';
    selWrap.style.gap = '8px';
    selWrap.style.alignItems = 'center';

    const empSel = el('select', 'in');
    empSel.style.minHeight = '38px';
    empSel.style.width = 'auto';
    empSel.style.background = 'rgba(255,255,255,0.14)';
    empSel.style.color = '#fff';
    empSel.style.borderColor = 'rgba(255,255,255,0.3)';

    entries.forEach(([k, st]) => {
      const o = el('option', '', '👤 ' + st.name);
      o.value = k;
      o.selected = k === activeKey;
      o.style.color = '#1d2733';
      empSel.append(o);
    });
    empSel.addEventListener('change', () => onSelectUser(empSel.value));

    if (FOH.modalPicker && FOH.modalPicker.enhanceSelect) {
      FOH.modalPicker.enhanceSelect(empSel, {
        title: ar ? 'عرض تبس الموظف' : 'Select Staff Tips View',
        subtitle: ar ? 'اختر الموظف لعرض حصته وسجل إكرامياته' : 'Select employee to view tips allocation',
        icon: '💰',
      });
    }

    const cfgBtn = el('button', 'snooze-btn', ar ? '⚙️ الإعدادات' : '⚙️ Settings');
    cfgBtn.type = 'button';
    cfgBtn.addEventListener('click', () => {
      S.view = 'settings';
      FOH.app.render();
    });
    selWrap.append(empSel, cfgBtn);
    return selWrap;
  }

  function renderTipsHero(opts) {
    const { emp, tipsDB, activeKey, entries, isMgr, ar, onSelectUser } = opts;
    const hero = el('div', 'tips-hero');
    const heroTop = el('div', 'tips-hero-top');
    const heroLeft = el('div', '');
    heroLeft.append(
      el('h2', '', '💰 ' + (ar ? 'محفظة التبس والنقاط الميدانية' : 'Tips, Points & Advances Wallet')),
      el('p', '', (ar ? 'الأسبوع المالي: ' : 'Tip Week: ') + tipsDB.weekLabel + ' · ' + emp.name)
    );
    heroTop.append(heroLeft);

    if (isMgr) {
      heroTop.append(createManagerEmployeeSelector({ entries, activeKey, ar, onSelectUser }));
    }
    hero.append(heroTop);
    return hero;
  }

  function createKpiPill(smallText, strongText, extraClass = '') {
    const c = el('div', 'tips-kpi' + (extraClass ? ' ' + extraClass : ''));
    c.append(el('small', '', smallText), el('strong', '', strongText));
    return c;
  }

  function renderTipsKpiCards(opts) {
    const { emp, vis, isMgr, calc, tipsDB, ar } = opts;
    const kpiGrid = el('div', 'tips-kpi-grid');

    if (isMgr || vis.showPoints) {
      kpiGrid.append(createKpiPill(ar ? '⭐ نقاط التبس وحصتي' : '⭐ My Tip Points', emp.points + ' pts (' + (emp.points / 100).toFixed(2) + 'x)'));
    }
    if (isMgr || vis.showWorkedDays) {
      kpiGrid.append(createKpiPill(ar ? '🗓️ أيام وساعات العمل' : '🗓️ Worked Days & Hours', emp.workedDays.length + ' ' + (ar ? 'أيام' : 'days') + ' · ' + emp.hours + 'h'));
    }
    if (isMgr || vis.showGrossShare) {
      kpiGrid.append(createKpiPill(ar ? '💵 إجمالي الحصة (Hamilton)' : '💵 Gross Tip Share', calc.grossJOD + ' JOD'));
    }
    if (isMgr || vis.showWithdrawals) {
      kpiGrid.append(createKpiPill(ar ? '📤 السلف المسحوبة' : '📤 Withdrawn Advances', calc.withdrawnJOD + ' JOD', 'warn'));
    }
    if (isMgr || vis.showNetRemaining) {
      const label = calc.isDeficit ? (ar ? '⚠️ عجز بالسلف' : '⚠️ Advance Deficit') : (ar ? '✅ الصافي للاستلام' : '✅ Net Remaining');
      const val = (calc.isDeficit ? '-' + calc.deficitJOD : calc.netJOD) + ' JOD';
      kpiGrid.append(createKpiPill(label, val, calc.isDeficit ? 'warn' : 'net'));
    }
    if (isMgr || vis.showTotalPool) {
      kpiGrid.append(createKpiPill(ar ? '🏦 إجمالي صندوق التبس' : '🏦 Total Weekly Pool', Number(tipsDB.totalPoolJOD).toFixed(3) + ' JOD'));
    }
    return kpiGrid;
  }

  function renderWorkedDaysCard(opts) {
    const { emp, isMgr, activeKey, onRefresh, ar } = opts;
    const daysCard = el('section', 'card');
    daysCard.style.padding = '14px 16px';
    daysCard.append(
      el('h3', '', ar ? '📅 أيام العمل المحتسبة بالتبس (حضور فعلي مؤتمت)' : '📅 Eligible Worked Days (Auto-Synced Attendance)')
    );

    const allDays = [
      ['Sat', ar ? 'السبت' : 'Sat'],
      ['Sun', ar ? 'الأحد' : 'Sun'],
      ['Mon', ar ? 'الإثنين' : 'Mon'],
      ['Tue', ar ? 'الثلاثاء' : 'Tue'],
      ['Wed', ar ? 'الأربعاء' : 'Wed'],
      ['Thu', ar ? 'الخميس' : 'Thu'],
      ['Fri', ar ? 'الجمعة' : 'Fri'],
    ];

    const strip = el('div', 'tips-days-grid');
    allDays.forEach(([code, label]) => {
      const worked = emp.workedDays.includes(code);
      const pill = el('button', 'tips-day-pill' + (worked ? ' worked' : ''));
      pill.type = 'button';
      pill.innerHTML = '<b>' + label + '</b><span>' + (worked ? (ar ? '✓ عمل' : '✓ Worked') : (ar ? '— عطلة' : '— Off')) + '</span>';
      if (isMgr) {
        pill.title = ar ? 'اضغط لتبديل حالة يوم العمل' : 'Click to toggle worked day';
        pill.addEventListener('click', () => {
          FOH.tipsStore.toggleWorkedDay({ staffKey: activeKey, dayCode: code });
          onRefresh();
        });
      }
      strip.append(pill);
    });
    daysCard.append(strip);

    if (isMgr) {
      const hint = el('small', '', ar ? '💡 يتم احتساب الحضور تلقائياً عند إنجاز الشيك ليست، أو يمكنك الضغط على أي يوم للتعديل اليدوي.' : '💡 Attendance auto-syncs on checklist activity, or tap any day to adjust manually.');
      hint.style.display = 'block';
      hint.style.marginTop = '8px';
      hint.style.color = 'var(--ink2)';
      daysCard.append(hint);
    }
    return daysCard;
  }

  function createWithdrawalRow(opts) {
    const { w, emp, isMgr, activeKey, onRefresh, ar } = opts;
    const row = el('div', 'dayoff-item');
    row.style.marginTop = '8px';
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';

    const left = el('div', '');
    left.innerHTML = '<b>💸 ' + Number(w.amountJOD).toFixed(3) + ' JOD</b><small style="display:block;color:var(--ink2);">' +
      w.date + ' ' + (w.timeHM || '') + ' · ' + (w.note || (ar ? 'سلفة نقدية' : 'Advance')) + '</small>';

    const actions = el('div', '');
    actions.style.display = 'flex';
    actions.style.gap = '6px';

    const shareBtn = el('button', 'snooze-btn', '🧾 ' + (ar ? 'سند' : 'Receipt'));
    shareBtn.type = 'button';
    shareBtn.title = ar ? 'مشاركة سند السلفة' : 'Share receipt voucher';
    shareBtn.addEventListener('click', () => {
      FOH.tipsModal.shareVoucherWhatsApp({
        emp,
        amountJOD: w.amountJOD,
        note: w.note,
        recordedBy: w.recordedBy,
        date: w.date,
        timeHM: w.timeHM,
      });
    });
    actions.append(shareBtn);

    if (isMgr) {
      const delB = el('button', 'gov-btn', '✕');
      delB.type = 'button';
      delB.title = ar ? 'حذف السلفة' : 'Delete advance';
      delB.addEventListener('click', () => {
        if (confirm(ar ? 'هل أنت متأكد من حذف هذه السلفة؟' : 'Delete this advance?')) {
          FOH.tipsStore.deleteAdvance({ staffKey: activeKey, advanceId: w.id });
          onRefresh();
        }
      });
      actions.append(delB);
    }
    row.append(left, actions);
    return row;
  }

  function renderWithdrawalsCard(opts) {
    const { emp, isMgr, activeKey, onRefresh, ar } = opts;
    const wCard = el('section', 'card');
    wCard.style.padding = '14px 16px';

    const wHead = el('div', '');
    wHead.style.display = 'flex';
    wHead.style.justifyContent = 'space-between';
    wHead.style.alignItems = 'center';
    wHead.style.flexWrap = 'wrap';
    wHead.style.gap = '8px';
    wHead.append(el('h3', '', ar ? '🧾 سجل السحوبات وسندات السلف النقدية' : '🧾 Tip Advances & Vouchers Ledger'));

    if (isMgr) {
      const addWBtn = el('button', 'gov-btn primary', ar ? '+ تسجيل سلفة نقدية' : '+ Record Cash Advance');
      addWBtn.type = 'button';
      addWBtn.addEventListener('click', () => {
        FOH.tipsModal.openTipAdvanceModal({
          emp,
          staffKey: activeKey,
          onSaved: () => onRefresh(),
        });
      });
      wHead.append(addWBtn);
    }
    wCard.append(wHead);

    const withdrawals = emp.withdrawals || [];
    if (!withdrawals.length) {
      wCard.append(el('p', 'empty', ar ? 'لا توجد أي سحوبات من التبس هذا الأسبوع ✓' : 'No advances recorded this week ✓'));
    } else {
      withdrawals.forEach((w) => {
        wCard.append(createWithdrawalRow({ w, emp, isMgr, activeKey, onRefresh, ar }));
      });
    }
    return wCard;
  }

  function renderManagerControlsCard(opts) {
    const { emp, tipsDB, activeKey, onRefresh, ar } = opts;
    const mgrCard = el('section', 'card');
    mgrCard.style.padding = '14px 16px';
    mgrCard.append(el('h3', '', ar ? '🛠️ تحكم المدير بنقاط الموظف وصندوق التبس' : '🛠️ Manager Controls (Points & Pool)'));

    const row = el('div', 'two');
    const ptLbl = el('label', '', ar ? 'نقاط ' + emp.name : emp.name + ' Points');
    const ptIn = el('input', 'in');
    ptIn.type = 'number';
    ptIn.value = String(emp.points);
    ptLbl.append(ptIn);

    const poolLbl = el('label', '', ar ? 'إجمالي صندوق التبس للأسبوع (JOD)' : 'Total Weekly Tip Pool (JOD)');
    const poolIn = el('input', 'in');
    poolIn.type = 'number';
    poolIn.step = '0.5';
    poolIn.value = String(tipsDB.totalPoolJOD);
    poolLbl.append(poolIn);
    row.append(ptLbl, poolLbl);

    const saveB = el('button', 'btn primary', ar ? 'حفظ وتحديث الحسابات (Hamilton Algorithm)' : 'Save & Recalculate (Hamilton)');
    saveB.type = 'button';
    saveB.style.marginTop = '10px';
    saveB.style.width = '100%';
    saveB.addEventListener('click', () => {
      FOH.tipsStore.updateStaffPoints({ staffKey: activeKey, points: ptIn.value });
      FOH.tipsStore.updateTotalPool({ totalPoolJOD: poolIn.value });
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? 'تم تحديث صندوق التبس ونقاط الموظف ✓' : 'Tip pool and points updated ✓');
      }
      onRefresh();
    });
    mgrCard.append(row, saveB);
    return mgrCard;
  }

  function renderTipsView(root) {
    if (!root) return;
    root.replaceChildren();
    const ar = isAr();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const gov = loadGov();
    const vis = gov.tipsVisibility || {};
    const tipsDB = FOH.tipsStore.loadTipsData();

    if (!isMgr && !vis.enabledForStaff) {
      const lockedCard = el('section', 'card');
      lockedCard.append(el('p', 'empty', ar ? '🔒 عرض تفاصيل التبس غير مفعّل حاليًا من قِبل الإدارة.' : '🔒 Tip details visibility is disabled by Management.'));
      root.append(lockedCard);
      return;
    }

    const myKey = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
    const activeKey = isMgr && selectedTipsUser && tipsDB.staff[selectedTipsUser] ? selectedTipsUser : (tipsDB.staff[myKey] ? myKey : 'fadi');
    const emp = tipsDB.staff[activeKey];

    // Auto-sync attendance only for active logged-in employee (not arbitrary user selected by manager)
    if (myKey && !isMgr) {
      FOH.tipsStore.syncAttendanceFromRuns(myKey);
    }

    // Pure Hamilton / Largest-Remainder calculation
    const split = FOH.tipsCalc.calculateStaffShares({ totalPoolJOD: tipsDB.totalPoolJOD, staff: tipsDB.staff });
    const calc = split.results[activeKey] || { grossJOD: '0.000', withdrawnJOD: '0.000', netJOD: '0.000', isDeficit: false };

    const onRefresh = () => renderTipsView(root);
    const onSelectUser = (userKey) => { selectedTipsUser = userKey; renderTipsView(root); };

    const entries = Object.entries(tipsDB.staff);
    root.append(renderTipsHero({ emp, tipsDB, activeKey, entries, isMgr, ar, onSelectUser }));
    root.append(renderTipsKpiCards({ emp, vis, isMgr, calc, tipsDB, ar }));

    if (isMgr || vis.showWorkedDays) {
      root.append(renderWorkedDaysCard({ emp, isMgr, activeKey, onRefresh, ar }));
    }
    if (isMgr || vis.showWithdrawals) {
      root.append(renderWithdrawalsCard({ emp, isMgr, activeKey, onRefresh, ar }));
    }
    if (isMgr) {
      root.append(renderManagerControlsCard({ emp, tipsDB, activeKey, onRefresh, ar }));
    }
  }

  FOH.tipsView = {
    renderTipsView,
  };
})(window.FOH = window.FOH || {});
