// foh-opening/js/domains/tips/tips-view.js
// Tip Manager Integration (Points, Worked Days, Gross/Net Share, Advances & Settings)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const TIPS_KEY = 'super-employee.tips.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function loadGov() {
    return FOH.gov ? FOH.gov.loadGov() : {};
  }

  // ---- 5. Tip Manager Integration (#tipsView) ----
  function defaultTipsData() {
    return {
      weekLabel: '2026-W44 (26 Oct – 01 Nov)',
      totalPoolJOD: 420.0,
      staff: {
        fadi: {
          name: 'Fadi (Supervisor)',
          role: 'Supervisor',
          points: 150,
          workedDays: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Fri'],
          hours: 48,
          withdrawals: [
            { id: 'w1', date: '2026-10-28', amountJOD: 25.0, note: 'سلفة نقدية منتصف الأسبوع' },
          ],
        },
        ali: {
          name: 'Ali (Captain)',
          role: 'Captain',
          points: 120,
          workedDays: ['Sat', 'Sun', 'Mon', 'Tue', 'Thu', 'Fri'],
          hours: 46,
          withdrawals: [
            { id: 'w2', date: '2026-10-29', amountJOD: 15.0, note: 'سلفة نقدية' },
          ],
        },
        sara: {
          name: 'Sara (Waiter)',
          role: 'Waiter',
          points: 100,
          workedDays: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'],
          hours: 40,
          withdrawals: [
            { id: 'w3', date: '2026-10-27', amountJOD: 10.0, note: 'سلفة مواصلات' },
            { id: 'w4', date: '2026-10-30', amountJOD: 10.0, note: 'سحبة من التبس' },
          ],
        },
        maher: {
          name: 'Maher (Bartender)',
          role: 'Bartender',
          points: 110,
          workedDays: ['Sat', 'Sun', 'Tue', 'Wed', 'Thu', 'Fri'],
          hours: 45,
          withdrawals: [],
        },
      },
    };
  }

  function loadTipsData() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(TIPS_KEY), 'null');
      if (raw && raw.staff) return raw;
    } catch {}
    return defaultTipsData();
  }

  function saveTipsData(data) {
    try {
      localStorage.setItem(TIPS_KEY, JSON.stringify(data));
    } catch {}
  }

  let selectedTipsUser = '';

  function renderTipsView(root) {
    if (!root) return;
    root.replaceChildren();
    const ar = isAr();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const gov = loadGov();
    const vis = gov.tipsVisibility;
    const tipsDB = loadTipsData();

    if (!isMgr && !vis.enabledForStaff) {
      const lockedCard = el('section', 'card');
      lockedCard.append(
        el('p', 'empty', ar ? '🔒 عرض تفاصيل التبس غير مفعّل حاليًا من قِبل الإدارة.' : '🔒 Tip details visibility is currently disabled by Management.')
      );
      root.append(lockedCard);
      return;
    }

    const myKey = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
    const activeKey = isMgr && selectedTipsUser && tipsDB.staff[selectedTipsUser] ? selectedTipsUser : (tipsDB.staff[myKey] ? myKey : 'fadi');
    const emp = tipsDB.staff[activeKey];

    const entries = Object.entries(tipsDB.staff);
    const totalWeight = entries.reduce((sum, [, st]) => sum + st.points * st.workedDays.length, 0) || 1;
    const empWeight = emp.points * emp.workedDays.length;
    const grossShare = (empWeight / totalWeight) * tipsDB.totalPoolJOD;
    const withdrawnTotal = (emp.withdrawals || []).reduce((s, w) => s + Number(w.amountJOD || 0), 0);
    const netRemaining = Math.max(0, grossShare - withdrawnTotal);

    const hero = el('div', 'tips-hero');
    const heroTop = el('div', 'tips-hero-top');
    const heroLeft = el('div', '');
    heroLeft.append(
      el('h2', '', '💰 ' + (ar ? 'محفظة التبس والنقاط (Tip Manager Sync)' : 'Tips, Points & Attendance Wallet')),
      el('p', '', (ar ? 'الأسبوع المالي: ' : 'Tip Week: ') + tipsDB.weekLabel + ' · ' + emp.name)
    );
    heroTop.append(heroLeft);

    if (isMgr) {
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
      empSel.addEventListener('change', () => {
        selectedTipsUser = empSel.value;
        renderTipsView(root);
      });
      if (FOH.modalPicker && FOH.modalPicker.enhanceSelect) {
        FOH.modalPicker.enhanceSelect(empSel, {
          title: ar ? 'عرض تبس الموظف' : 'Select Staff Tips View',
          subtitle: ar ? 'اختر الموظف لعرض حصته وسجل إكرامياته' : 'Select employee to view tips allocation',
          icon: '💰',
        });
      }
      const cfgBtn = el('button', 'snooze-btn', ar ? '⚙️ إعدادات ظهور التبس' : '⚙️ Visibility Settings');
      cfgBtn.type = 'button';
      cfgBtn.addEventListener('click', () => {
        S.view = 'settings';
        FOH.app.render();
      });
      selWrap.append(empSel, cfgBtn);
      heroTop.append(selWrap);
    }
    hero.append(heroTop);
    root.append(hero);

    const kpiGrid = el('div', 'tips-kpi-grid');
    if (isMgr || vis.showPoints) {
      const c = el('div', 'tips-kpi');
      c.append(
        el('small', '', ar ? '⭐ نقاط التبس الخاصة بي' : '⭐ My Tip Points'),
        el('strong', '', emp.points + ' pts (' + (emp.points / 100).toFixed(2) + 'x)')
      );
      kpiGrid.append(c);
    }
    if (isMgr || vis.showWorkedDays) {
      const c = el('div', 'tips-kpi');
      c.append(
        el('small', '', ar ? '🗓️ أيام وساعات العمل' : '🗓️ Worked Days & Hours'),
        el('strong', '', emp.workedDays.length + ' ' + (ar ? 'أيام' : 'days') + ' · ' + emp.hours + 'h')
      );
      kpiGrid.append(c);
    }
    if (isMgr || vis.showGrossShare) {
      const c = el('div', 'tips-kpi');
      c.append(
        el('small', '', ar ? '💵 إجمالي حصتي من التبس' : '💵 Gross Tip Share'),
        el('strong', '', grossShare.toFixed(3) + ' JOD')
      );
      kpiGrid.append(c);
    }
    if (isMgr || vis.showWithdrawals) {
      const c = el('div', 'tips-kpi warn');
      c.append(
        el('small', '', ar ? '📤 المسحوب من التبس (السلف)' : '📤 Withdrawn / Advances'),
        el('strong', '', withdrawnTotal.toFixed(3) + ' JOD')
      );
      kpiGrid.append(c);
    }
    if (isMgr || vis.showNetRemaining) {
      const c = el('div', 'tips-kpi net');
      c.append(
        el('small', '', ar ? '✅ الصافي المتبقي للاستلام' : '✅ Net Remaining Payout'),
        el('strong', '', netRemaining.toFixed(3) + ' JOD')
      );
      kpiGrid.append(c);
    }
    if (isMgr || vis.showTotalPool) {
      const c = el('div', 'tips-kpi');
      c.append(
        el('small', '', ar ? '🏦 إجمالي صندوق التبس للأسبوع' : '🏦 Total Weekly Tip Pool'),
        el('strong', '', tipsDB.totalPoolJOD.toFixed(3) + ' JOD')
      );
      kpiGrid.append(c);
    }
    root.append(kpiGrid);

    if (isMgr || vis.showWorkedDays) {
      const daysCard = el('section', 'card');
      daysCard.style.padding = '14px 16px';
      daysCard.append(
        el('h3', '', ar ? '📅 الأيام التي عمل بها الموظف هذا الأسبوع (المحتسبة في التبس)' : '📅 Days Worked This Week (Eligible for Tip Pool)')
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
            if (worked) emp.workedDays = emp.workedDays.filter((d) => d !== code);
            else emp.workedDays.push(code);
            emp.hours = emp.workedDays.length * 8;
            saveTipsData(tipsDB);
            renderTipsView(root);
          });
        }
        strip.append(pill);
      });
      daysCard.append(strip);
      if (isMgr) {
        const hint = el('small', '', ar ? '💡 كمدير: يمكنك الضغط على أي يوم أعلاه لتعديل أيام حضور الموظف، أو تعديل النقاط والسلف بالأسفل.' : '💡 Manager: Tap any day above to toggle attendance, or adjust points & advances below.');
        hint.style.display = 'block';
        hint.style.marginTop = '8px';
        hint.style.color = 'var(--ink2)';
        daysCard.append(hint);
      }
      root.append(daysCard);
    }

    if (isMgr || vis.showWithdrawals) {
      const wCard = el('section', 'card');
      wCard.style.padding = '14px 16px';
      const wHead = el('div', '');
      wHead.style.display = 'flex';
      wHead.style.justifyContent = 'space-between';
      wHead.style.alignItems = 'center';
      wHead.style.flexWrap = 'wrap';
      wHead.style.gap = '8px';
      wHead.append(el('h3', '', ar ? '🧾 سجل السحوبات والسلف من التبس' : '🧾 Tip Withdrawals & Advances Ledger'));

      if (isMgr) {
        const addWBtn = el('button', 'gov-btn primary', ar ? '+ تسجيل سحبة / سلفة تبس' : '+ Record Tip Advance');
        addWBtn.type = 'button';
        addWBtn.addEventListener('click', () => {
          const amtStr = prompt(ar ? 'أدخل قيمة السحبة / السلفة لـ ' + emp.name + ' بالدينار (JOD):' : 'Enter advance amount in JOD for ' + emp.name + ':', '10');
          if (!amtStr) return;
          const amt = Number(amtStr);
          if (!Number.isFinite(amt) || amt <= 0) return;
          const note = prompt(ar ? 'ملاحظة السحبة (مثال: سلفة نقدية):' : 'Advance note:', ar ? 'سحبة من التبس' : 'Tip advance') || '';
          emp.withdrawals.push({
            id: 'w_' + Date.now(),
            date: FOH.time.todayISO(),
            amountJOD: amt,
            note,
          });
          saveTipsData(tipsDB);
          FOH.edit.toast(ar ? 'تم تسجيل السحبة من التبس ✓' : 'Tip advance recorded ✓');
          renderTipsView(root);
        });
        wHead.append(addWBtn);
      }
      wCard.append(wHead);

      if (!emp.withdrawals || !emp.withdrawals.length) {
        wCard.append(el('p', 'empty', ar ? 'لا توجد أي سحوبات من التبس هذا الأسبوع ✓' : 'No withdrawals recorded this week ✓'));
      } else {
        emp.withdrawals.forEach((w) => {
          const row = el('div', 'dayoff-item');
          row.style.marginTop = '8px';
          row.innerHTML = '<div><b>💸 ' + Number(w.amountJOD).toFixed(3) + ' JOD</b><small style="display:block;color:var(--ink2);">' + w.date + ' · ' + (w.note || '') + '</small></div>';
          if (isMgr) {
            const delB = el('button', 'gov-btn', '✕');
            delB.type = 'button';
            delB.addEventListener('click', () => {
              emp.withdrawals = emp.withdrawals.filter((x) => x.id !== w.id);
              saveTipsData(tipsDB);
              renderTipsView(root);
            });
            row.append(delB);
          }
          wCard.append(row);
        });
      }
      root.append(wCard);
    }

    if (isMgr) {
      const mgrCard = el('section', 'card');
      mgrCard.style.padding = '14px 16px';
      mgrCard.append(el('h3', '', ar ? '🛠️ تحكم المدير السريع بنقاط الموظف وصندوق التبس' : '🛠️ Manager Quick Controls (Points & Pool)'));
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

      const saveB = el('button', 'btn primary', ar ? 'حفظ وتحديث حسابات التبس' : 'Save & Recalculate Tips');
      saveB.type = 'button';
      saveB.style.marginTop = '10px';
      saveB.style.width = '100%';
      saveB.addEventListener('click', () => {
        emp.points = Math.max(0, Number(ptIn.value) || 100);
        tipsDB.totalPoolJOD = Math.max(0, Number(poolIn.value) || 0);
        saveTipsData(tipsDB);
        FOH.edit.toast(ar ? 'تم تحديث نقاط وحصة التبس ✓' : 'Tip points and pool updated ✓');
        renderTipsView(root);
      });
      mgrCard.append(row, saveB);
      root.append(mgrCard);
    }
  }



  FOH.tipsView = {
    defaultTipsData,
    loadTipsData,
    saveTipsData,
    renderTipsView,
  };
})(window.FOH = window.FOH || {});
