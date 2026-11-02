// foh-opening/js/domains/shifts/three-shifts-nav.js
// Time-Based Sheet Schedule (Opening, Mid-Shift, Closing) & Segmented Control Nav
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function loadOpsConfig() {
    return FOH.opsLifecycle ? FOH.opsLifecycle.loadOpsConfig() : {};
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

    // 1. Sleek Modern Header (Live Clock Chip + Current Window Status Pill)
    const head = el('div', 'shift-nav-head');
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.justifyContent = 'space-between';
    head.style.gap = '8px';
    head.style.flexWrap = 'wrap';
    head.style.width = '100%';

    const leftInfo = el('div', 'shift-nav-head-left');
    leftInfo.style.display = 'flex';
    leftInfo.style.alignItems = 'center';
    leftInfo.style.gap = '8px';
    leftInfo.style.flexWrap = 'wrap';

    const schedShortNames = {
      opening: ar ? '☀️ الافتتاح' : '☀️ Opening',
      mid: ar ? '🌤️ المنتصف' : '🌤️ Mid-Shift',
      closing: ar ? '🌙 الإغلاق' : '🌙 Closing',
    };
    const schedWindows = {
      opening: ar ? '12 – 3 م' : '12 – 3 PM',
      mid: ar ? '3 – 11 م' : '3 – 11 PM',
      closing: ar ? '11 م+' : '11 PM+',
    };

    leftInfo.innerHTML =
      '<span class="shift-clock-chip">🕒 <b>' + nowHM + '</b></span>' +
      '<span class="shift-status-chip">' +
      '<span class="shift-live-pulse-dot"></span>' +
      '<span>' + (ar ? 'شفت الآن: ' : 'Now: ') + '<b>' + schedShortNames[scheduledType] + '</b> <small style="opacity:0.85;">(' + schedWindows[scheduledType] + ')</small></span>' +
      '</span>';
    head.append(leftInfo);

    if (manualSheetOverride && curType !== scheduledType) {
      const autoBtn = el('button', 'shift-auto-btn', ar ? '🔄 عودة للتلقائي' : '🔄 Auto Reset');
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

    // 2. High-Precision Segmented Control Grid
    const grid = el('nav', 'shift-nav-grid');
    grid.setAttribute('aria-label', 'Shift Sheets Navigation');

    const tabs = [
      {
        id: 'opening',
        icon: '☀️',
        titleAr: 'الافتتاح',
        titleEn: 'Opening',
        windowAr: '12 – 3 م',
        windowEn: '12 – 3 PM',
      },
      {
        id: 'mid',
        icon: '🌤️',
        titleAr: 'المنتصف',
        titleEn: 'Mid-Shift',
        windowAr: '3 – 11 م',
        windowEn: '3 – 11 PM',
      },
      {
        id: 'closing',
        icon: '🌙',
        titleAr: 'الإغلاق',
        titleEn: 'Closing',
        windowAr: '11 م – الإغلاق',
        windowEn: '11 PM – Late',
      },
    ];

    tabs.forEach((tb) => {
      const isCur = curType === tb.id;
      const isNow = scheduledType === tb.id;
      const btn = el('button', 'shift-nav-tab' + (isCur ? ' on' : '') + (isNow ? ' is-now' : ''));
      btn.type = 'button';
      btn.innerHTML =
        '<div class="shift-tab-top">' +
        '<span class="shift-tab-ico">' + tb.icon + '</span>' +
        '<b class="shift-tab-title">' + (ar ? tb.titleAr : tb.titleEn) + '</b>' +
        (isNow ? '<span class="shift-now-dot-micro" title="' + (ar ? 'الشفت الفعلي الآن' : 'Current active shift') + '"></span>' : '') +
        '</div>' +
        '<div class="shift-tab-time-pill">' + (ar ? tb.windowAr : tb.windowEn) + '</div>';

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
