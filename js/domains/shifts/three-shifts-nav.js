// foh-opening/js/domains/shifts/three-shifts-nav.js
// Time-Based Sheet Schedule (Opening, Mid-Shift, Closing) & Segmented Control Nav
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

  function loadOpsConfig() {
    return FOH.opsLifecycle ? FOH.opsLifecycle.loadOpsConfig() : {};
  }

  function toBizMinutes(hm) {
    return FOH.opsLifecycle ? FOH.opsLifecycle.toBizMinutes(hm) : 0;
  }

  function getEffectiveNowHM() {
    return FOH.opsLifecycle ? FOH.opsLifecycle.getEffectiveNowHM() : '12:00';
  }

  // ============================================================================
  // 15. SUPER EMPLOYEE v13: UNIFIED SHIFT SHEETS NAV (OPENING · MID · CLOSING)
  //     WITH TIME-WINDOW AUTO-SWITCH + ASSIGN TASK TO EMPLOYEE OR ROLE
  // ============================================================================
  let manualSheetOverride = false;
  let lastAutoSheetApplied = '';

  function getActiveSheetType() {
    return (FOH.erpPwa && FOH.erpPwa.getSheetType) ? FOH.erpPwa.getSheetType() : 'opening';
  }

  function getSheetScheduleWindows() {
    const cfg = loadOpsConfig();
    const w = (cfg && cfg.sheetWindows) || {};
    return {
      openingStart: w.openingStart || '00:00',
      openingEnd: w.openingEnd || '15:00', // 12:00 AM / 12:00 PM until 3:00 PM
      midStart: w.midStart || '15:00',     // 3:00 PM until 11:00 PM
      midEnd: w.midEnd || '23:00',
      closingStart: w.closingStart || '23:00', // 11:00 PM until Close
    };
  }

  // Determine which sheet should appear right now based on clock (or simulated shift time)
  function getScheduledSheetForNow() {
    const hm = getEffectiveNowHM();
    const [hh, mm] = (hm || '12:00').split(':').map(Number);
    const totalMins = (hh || 0) * 60 + (mm || 0);

    const win = getSheetScheduleWindows();
    const [mSH, mSM] = win.midStart.split(':').map(Number);
    const [cSH, cSM] = win.closingStart.split(':').map(Number);
    const midStartMins = (mSH || 15) * 60 + (mSM || 0);     // default 15:00 (3:00 PM)
    const closeStartMins = (cSH || 23) * 60 + (cSM || 0);   // default 23:00 (11:00 PM)

    // Between 23:00 and 04:30 AM -> Closing Sheet
    if (totalMins >= closeStartMins || totalMins < 270) {
      return 'closing';
    }
    // Between 15:00 (3:00 PM) and 23:00 (11:00 PM) -> Mid-Shift Sheet
    if (totalMins >= midStartMins && totalMins < closeStartMins) {
      return 'mid';
    }
    // From 04:30 AM / 12:00 PM until 15:00 (3:00 PM) -> Opening Sheet
    return 'opening';
  }

  function enforceTimeBasedSheetSchedule() {
    if (S.editing || S.view !== 'opening') return;
    const scheduled = getScheduledSheetForNow();
    const cur = getActiveSheetType();
    if (!manualSheetOverride && (cur !== scheduled || lastAutoSheetApplied !== scheduled)) {
      lastAutoSheetApplied = scheduled;
      if (FOH.erpPwa && FOH.erpPwa.switchSheetType && cur !== scheduled) {
        FOH.erpPwa.switchSheetType(scheduled);
      }
    }
  }

  function renderUnifiedThreeSheetNav() {
    const bar = $('sheetTypeBar');
    const mainEl = $('appMain');
    const govBar = $('checklistGovBar');
    if (!bar || !mainEl) return;

    // Place #sheetTypeBar right at the top of the checklist section (above #checklistGovBar)
    if (govBar && bar.nextElementSibling !== govBar) {
      mainEl.insertBefore(bar, govBar);
    }

    bar.hidden = S.editing || S.view !== 'opening';
    if (bar.hidden) return;
    bar.replaceChildren();

    const ar = isAr();
    const curType = getActiveSheetType();
    const scheduledType = getScheduledSheetForNow();
    const nowHM = getEffectiveNowHM();

    const head = el('div', 'shift-nav-head');
    const leftInfo = el('span', '');
    const schedNames = {
      opening: ar ? '☀️ شيت الافتتاح (12:00 ص – 3:00 م)' : '☀️ Opening (12:00 AM – 3:00 PM)',
      mid: ar ? '🌤️ شيت منتصف الشفت (3:00 م – 11:00 م)' : '🌤️ Mid-Shift (3:00 PM – 11:00 PM)',
      closing: ar ? '🌙 شيت الإغلاق (11:00 م – الإغلاق)' : '🌙 Closing (11:00 PM – Close)',
    };
    leftInfo.innerHTML =
      '🕒 ' + (ar ? 'الساعة ' : 'Clock ') + '<b>' + nowHM + '</b> · ' +
      (ar ? 'الفترة الحالية: ' : 'Current Window: ') +
      '<b style="color:var(--accent);">' + schedNames[scheduledType] + '</b>';
    head.append(leftInfo);

    if (manualSheetOverride && curType !== scheduledType) {
      const autoBtn = el('button', 'ops-compact-toggle', ar ? '🔄 عودة للشيت التلقائي (' + nowHM + ')' : '🔄 Auto by Clock');
      autoBtn.type = 'button';
      autoBtn.addEventListener('click', () => {
        manualSheetOverride = false;
        if (FOH.erpPwa && FOH.erpPwa.switchSheetType) {
          FOH.erpPwa.switchSheetType(scheduledType);
        }
      });
      head.append(autoBtn);
    }
    bar.append(head);

    const grid = el('nav', 'shift-nav-grid');
    grid.setAttribute('aria-label', 'Shift Sheets Navigation');

    const tabs = [
      {
        id: 'opening',
        titleAr: '☀️ الافتتاح',
        titleEn: '☀️ Opening',
        windowAr: '12:00 ص – 3:00 م',
        windowEn: '12:00 AM – 3:00 PM',
      },
      {
        id: 'mid',
        titleAr: '🌤️ منتصف الشفت',
        titleEn: '🌤️ Mid-Shift',
        windowAr: '3:00 م – 11:00 م',
        windowEn: '3:00 PM – 11:00 PM',
      },
      {
        id: 'closing',
        titleAr: '🌙 الإغلاق',
        titleEn: '🌙 Closing',
        windowAr: '11:00 م – الإغلاق',
        windowEn: '11:00 PM – Close',
      },
    ];

    tabs.forEach((tb) => {
      const isCur = curType === tb.id;
      const isNow = scheduledType === tb.id;
      const btn = el('button', 'shift-nav-tab' + (isCur ? ' on' : ''));
      btn.type = 'button';
      btn.innerHTML =
        '<b>' + (ar ? tb.titleAr : tb.titleEn) + '</b>' +
        '<small>' + (ar ? tb.windowAr : tb.windowEn) + '</small>' +
        (isNow ? '<span class="shift-now-dot">● ' + (ar ? 'الآن' : 'Now') + '</span>' : '');
      btn.addEventListener('click', () => {
        manualSheetOverride = tb.id !== scheduledType;
        if (FOH.erpPwa && FOH.erpPwa.switchSheetType) {
          FOH.erpPwa.switchSheetType(tb.id);
        }
      });
      grid.append(btn);
    });

    bar.append(grid);
  }



  FOH.threeShifts = {
    getActiveSheetType,
    getSheetScheduleWindows,
    getScheduledSheetForNow,
    enforceTimeBasedSheetSchedule,
    renderUnifiedThreeSheetNav,
  };
})(window.FOH = window.FOH || {});
