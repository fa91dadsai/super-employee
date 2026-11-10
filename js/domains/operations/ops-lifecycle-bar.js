// foh-opening/js/domains/operations/ops-lifecycle-bar.js
// Presentation layer for the Operational Lifecycle Bar (< 350 lines)

(function () {
  'use strict';

  window.FOH = window.FOH || {};

  const $ = (id) => document.getElementById(id);
  const el = (...args) => (FOH.view && FOH.view.el ? FOH.view.el(...args) : document.createElement(args[0]));
  const S = FOH.state;

  function isAr() {
    return FOH.i18n && FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth && FOH.sessionAuth.loadSession ? FOH.sessionAuth.loadSession() : null;
  }

  function hasSuperPerm(perm) {
    return FOH.opsLifecycle && FOH.opsLifecycle.hasSuperPerm ? FOH.opsLifecycle.hasSuperPerm(perm) : false;
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity && FOH.roleIdentity.getCurrentSuperRoleKey ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function formatTime12Ar(hm) {
    return FOH.time && FOH.time.formatTime12Ar ? FOH.time.formatTime12Ar(hm) : hm;
  }

  function toBizMinutes(hm) {
    return FOH.time && FOH.time.toBizMinutes ? FOH.time.toBizMinutes(hm) : 0;
  }

  function getEffectiveNowHM() {
    return FOH.opsLifecycle && FOH.opsLifecycle.getEffectiveNowHM ? FOH.opsLifecycle.getEffectiveNowHM() : (FOH.time ? FOH.time.nowHM() : '00:00');
  }

  function getSimulatedShiftTime() {
    return FOH.opsLifecycle && FOH.opsLifecycle.getSimulatedShiftTime ? FOH.opsLifecycle.getSimulatedShiftTime() : '';
  }

  function setSimulatedShiftTime(v) {
    if (FOH.opsLifecycle && FOH.opsLifecycle.setSimulatedShiftTime) {
      FOH.opsLifecycle.setSimulatedShiftTime(v);
    }
  }

  function loadOpsConfig() {
    return FOH.opsLifecycle && FOH.opsLifecycle.loadOpsConfig ? FOH.opsLifecycle.loadOpsConfig() : { hours: {} };
  }

  function loadOpsDayState(d) {
    return FOH.opsLifecycle && FOH.opsLifecycle.loadOpsDayState ? FOH.opsLifecycle.loadOpsDayState(d) : {};
  }

  function saveOpsDayState(d, s) {
    if (FOH.opsLifecycle && FOH.opsLifecycle.saveOpsDayState) {
      FOH.opsLifecycle.saveOpsDayState(d, s);
    }
  }

  function computeOpsPhase(opts) {
    return FOH.opsLifecycle && FOH.opsLifecycle.computeOpsPhase ? FOH.opsLifecycle.computeOpsPhase(opts) : { key: 'idle', icon: '⏳', title: '', sub: '' };
  }

  function activateClosingSheet(dept) {
    if (FOH.opsLifecycle && FOH.opsLifecycle.activateClosingSheet) {
      FOH.opsLifecycle.activateClosingSheet(dept);
    }
  }

  function openCloseRestaurantDialog(nowHM, nowBiz, minCloseBiz) {
    if (FOH.opsLifecycle && FOH.opsLifecycle.openCloseRestaurantDialog) {
      FOH.opsLifecycle.openCloseRestaurantDialog(nowHM, nowBiz, minCloseBiz);
    }
  }

  function renderOpsTopRow(phase, roleKey, opts = {}) {
    const isLegacy = typeof opts === 'object' && !('roleMeta' in opts) && !('badge' in opts);
    const superMeta = window.SUPER_ROLES_META || {};
    const roleMeta = (opts && opts.roleMeta) || (isLegacy ? opts : (superMeta[roleKey] || superMeta.staff || { badge: 'Staff' }));
    const ar = (opts && typeof opts.ar === 'boolean') ? opts.ar : (isLegacy ? !!arguments[3] : isAr());
    const topRow = el('div', 'ops-top-row');
    const leftBox = el('div', '');
    leftBox.innerHTML =
      '<div class="ops-phase-title">' +
      '<span>' + phase.icon + ' ' + phase.title + '</span>' +
      '<span class="super-role-pill ' + roleKey + '">' + (roleMeta.badge || 'Staff') + '</span>' +
      '</div>' +
      '<div class="ops-phase-sub">' + phase.sub + '</div>';

    const simWrap = el('div', 'ops-sim-wrap');
    const simSel = el('select', 'ops-sim-select');
    simSel.title = ar ? 'محاكاة وقت الشفت لتجربة سيناريوهات الفتح والـ Last Order والإغلاق' : 'Simulate shift time';
    [
      ['', ar ? '🕒 وقت الساعة الفعلي (' + FOH.time.nowHM() + ')' : '🕒 Real Clock (' + FOH.time.nowHM() + ')'],
      ['12:15', ar ? '☀️ محاكاة 12:15 ظهراً (بداية دوام التحضير)' : '☀️ Sim 12:15 PM (Staff Prep)'],
      ['13:30', ar ? '☀️ محاكاة 01:30 ظهراً (شيت الافتتاح 12–3 م)' : '☀️ Sim 1:30 PM (Opening Sheet)'],
      ['15:30', ar ? '🌤️ محاكاة 03:30 عصراً (شيت منتصف الشفت)' : '🌤️ Sim 3:30 PM (Mid-Shift)'],
      ['23:30', ar ? '🚫 محاكاة 11:30 ليلاً (يُمنع الإغلاق المبكر)' : '🚫 Sim 11:30 PM (Early Close Blocked)'],
      ['00:00', ar ? '🍳 محاكاة 12:00 منتصف الليل (Last Order المطبخ)' : '🍳 Sim 12:00 AM (Kitchen LO)'],
      ['01:00', ar ? '🍸 محاكاة 01:00 فجراً (Last Order البار)' : '🍸 Sim 01:00 AM (Bar LO)'],
      ['02:30', ar ? '⏳ محاكاة 02:30 فجراً (جاهز للإغلاق مع آخر زبون)' : '⏳ Sim 02:30 AM (Last Guest Left)'],
    ].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = val;
      o.selected = getSimulatedShiftTime() === val;
      simSel.append(o);
    });
    simSel.addEventListener('change', () => {
      setSimulatedShiftTime(simSel.value);
      if (FOH.threeShifts && FOH.threeShifts.setManualSheetOverride) {
        FOH.threeShifts.setManualSheetOverride(false);
      }
      FOH.app.render();
    });
    simWrap.append(simSel);
    topRow.append(leftBox, simWrap);
    return topRow;
  }

  function renderOpsTimelineGrid(h, daySt, opts = {}) {
    const isLegacy = opts && typeof opts === 'object' && ('nowBiz' in opts);
    const times = isLegacy ? opts : ((opts && opts.times) || {});
    const ar = (opts && typeof opts.ar === 'boolean') ? opts.ar : (isLegacy ? !!arguments[3] : isAr());
    const { nowBiz = 0, openBiz = 0, prepBiz = 0, kLastBiz = 0, bLastBiz = 0, minCloseBiz = 0 } = times;
    const timeline = el('div', 'ops-timeline-grid');
    const stages = [
      { label: ar ? '١. دوام التحضير' : '1. Staff Prep', time: formatTime12Ar(h.prepStart), done: nowBiz >= openBiz || !!daySt.closedAt, active: !daySt.closedAt && nowBiz >= prepBiz && nowBiz < openBiz, status: ar ? 'قبل الفتح بـ ١س' : '1h pre-open' },
      { label: ar ? '٢. فتح المطعم' : '2. Doors Open', time: formatTime12Ar(h.doorsOpen), done: nowBiz >= kLastBiz || !!daySt.closedAt, active: !daySt.closedAt && nowBiz >= openBiz && nowBiz < kLastBiz, status: ar ? 'استقبال الزبائن' : 'Guest service' },
      { label: ar ? '٣. Last Order المطبخ' : '3. Kitchen L.O.', time: formatTime12Ar(h.kitchenLastOrder), done: !!daySt.kitchenLastOrderAt || nowBiz >= bLastBiz || !!daySt.closedAt, active: !daySt.closedAt && nowBiz >= kLastBiz - 15 && nowBiz < bLastBiz, status: daySt.kitchenLastOrderAt ? ('✓ ' + daySt.kitchenLastOrderAt) : (ar ? 'إغلاق المطبخ' : 'Kitchen cutoff') },
      { label: ar ? '٤. Last Order البار' : '4. Bar L.O.', time: formatTime12Ar(h.barLastOrder), done: !!daySt.barLastOrderAt || nowBiz >= minCloseBiz || !!daySt.closedAt, active: !daySt.closedAt && nowBiz >= bLastBiz - 15 && nowBiz < minCloseBiz, status: daySt.barLastOrderAt ? ('✓ ' + daySt.barLastOrderAt) : (ar ? 'إغلاق البار' : 'Bar cutoff') },
      { label: ar ? '٥. إغلاق المطعم' : '5. Close (Last Guest)', time: formatTime12Ar(h.minCloseTime) + '+', done: !!daySt.closedAt, active: !daySt.closedAt && nowBiz >= minCloseBiz, status: daySt.closedAt ? ('🔒 ' + formatTime12Ar(daySt.closedAt)) : (ar ? 'مع آخر زبون' : 'With last guest') },
    ];
    stages.forEach((st) => {
      const card = el('div', 'ops-step-card' + (st.done ? ' done' : st.active ? ' active' : ''));
      card.innerHTML = '<small>' + st.label + '</small><strong>' + st.time + '</strong><span>' + st.status + '</span>';
      timeline.append(card);
    });
    return timeline;
  }

  function createLastOrderButtons(opts) {
    const { daySt, h, nowHM, ar, myName, canLO } = opts;
    const btns = el('div', 'gov-actions');

    const kBtn = el('button', 'gov-btn' + (daySt.kitchenLastOrderAt ? '' : ' primary'), daySt.kitchenLastOrderAt ? (ar ? '🍳 Last Order المطبخ (' + daySt.kitchenLastOrderAt + ')' : '🍳 Kitchen L.O. (' + daySt.kitchenLastOrderAt + ')') : (ar ? '🍳 إعلان Last Order المطبخ (' + formatTime12Ar(h.kitchenLastOrder) + ')' : '🍳 Trigger Kitchen LO'));
    kBtn.type = 'button';
    kBtn.addEventListener('click', () => {
      if (!canLO) return FOH.edit.toast(ar ? '🔒 صلاحية إعلان Last Order مخصصة لـ Super Waiter / Captain / Manager' : '🔒 Permission required');
      daySt.kitchenLastOrderAt = nowHM;
      daySt.kitchenLastOrderBy = myName;
      saveOpsDayState(S.date, daySt);
      if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) FOH.cloudRealtime.broadcast('LAST_ORDER_TRIGGERED', { kind: 'kitchen', byName: myName, at: nowHM });
      FOH.edit.toast(ar ? '🍳 تم إعلان Last Order المطبخ الساعة ' + nowHM + ' وفتح شيت إغلاق الصالة ✓' : '🍳 Kitchen LO logged ✓');
      activateClosingSheet('floor');
    });
    btns.append(kBtn);

    const bBtn = el('button', 'gov-btn' + (daySt.barLastOrderAt ? '' : ' primary'), daySt.barLastOrderAt ? (ar ? '🍸 Last Order البار (' + daySt.barLastOrderAt + ')' : '🍸 Bar L.O. (' + daySt.barLastOrderAt + ')') : (ar ? '🍸 إعلان Last Order البار (' + formatTime12Ar(h.barLastOrder) + ')' : '🍸 Trigger Bar LO'));
    bBtn.type = 'button';
    bBtn.addEventListener('click', () => {
      if (!canLO) return FOH.edit.toast(ar ? '🔒 صلاحية إعلان Last Order البار مخصصة لـ Super Bartender / Captain / Manager' : '🔒 Permission required');
      daySt.barLastOrderAt = nowHM;
      daySt.barLastOrderBy = myName;
      saveOpsDayState(S.date, daySt);
      if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) FOH.cloudRealtime.broadcast('LAST_ORDER_TRIGGERED', { kind: 'bar', byName: myName, at: nowHM });
      FOH.edit.toast(ar ? '🍸 تم إعلان Last Order البار الساعة ' + nowHM + ' وفتح شيت إغلاق البار ✓' : '🍸 Bar LO logged ✓');
      activateClosingSheet('bar');
    });
    btns.append(bBtn);
    return btns;
  }

  function renderOpsActionButtons(opts) {
    const { daySt, h, nowHM, nowBiz, minCloseBiz, ar } = opts;
    const actRow = el('div', 'ops-actions-row');
    const sess = getSession();
    const myName = (sess && sess.displayName) || S.me.name || 'Supervisor';
    const canLO = hasSuperPerm('canTriggerLastOrder');
    const canCloseRest = hasSuperPerm('canCloseRestaurant');

    const leftBtns = createLastOrderButtons({ daySt, h, nowHM, ar, myName, canLO });
    actRow.append(leftBtns);

    if (daySt.closedAt && canCloseRest) {
      const reopenBtn = el('button', 'gov-btn', ar ? '🔓 إعادة فتح المطعم (إلغاء الإغلاق)' : '🔓 Reopen Restaurant');
      reopenBtn.type = 'button';
      reopenBtn.addEventListener('click', () => {
        if (!confirm(ar ? 'هل أنت متأكد من إلغاء حالة الإغلاق وإعادة فتح المطعم؟' : 'Are you sure you want to reopen?')) return;
        daySt.closedAt = '';
        daySt.closedBy = '';
        saveOpsDayState(S.date, daySt);
        FOH.edit.toast(ar ? '🔓 تم إلغاء الإغلاق وإعادة فتح المطعم' : '🔓 Restaurant reopened');
        FOH.app.render();
      });
      actRow.append(reopenBtn);
    } else if (!daySt.closedAt) {
      const closeRestBtn = el('button', 'gov-btn primary', ar ? '🚪 تأكيد إغلاق المطعم رسمياً (مع آخر زبون)' : '🚪 Close Restaurant (Last Guest)');
      closeRestBtn.type = 'button';
      closeRestBtn.addEventListener('click', () => openCloseRestaurantDialog(nowHM, nowBiz, minCloseBiz));
      actRow.append(closeRestBtn);
    }
    return actRow;
  }

  function renderOpsLifecycleBar() {
    let bar = $('opsLifecycleBar');
    const mainEl = $('appMain');
    const govBar = $('checklistGovBar');
    if (!mainEl) return;
    if (!bar) {
      bar = el('div', 'ops-lifecycle-bar run-only');
      bar.id = 'opsLifecycleBar';
      if (govBar) mainEl.insertBefore(bar, govBar);
      else mainEl.prepend(bar);
    }

    const rKey = getCurrentSuperRoleKey();
    if (S.editing || (S.view !== 'opening' && S.view !== 'dashboard') || rKey !== 'super_manager') {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    bar.replaceChildren();

    const ar = isAr();
    const cfg = loadOpsConfig();
    const h = cfg.hours;
    const daySt = loadOpsDayState(S.date);
    const nowHM = getEffectiveNowHM();
    const nowBiz = toBizMinutes(nowHM);
    const prepBiz = toBizMinutes(h.prepStart);
    const openBiz = toBizMinutes(h.doorsOpen);
    const kLastBiz = toBizMinutes(h.kitchenLastOrder);
    const bLastBiz = toBizMinutes(h.barLastOrder);
    const minCloseBiz = toBizMinutes(h.minCloseTime);

    const phase = computeOpsPhase({ daySt, nowBiz, openBiz, prepBiz, kLastBiz, minCloseBiz, h, ar });
    bar.className = 'ops-lifecycle-bar run-only status-' + phase.key;

    const superMeta = window.SUPER_ROLES_META || {};
    const roleMeta = superMeta[rKey] || superMeta.staff;
    const topRow = renderOpsTopRow(phase, rKey, roleMeta, ar);
    const timeline = renderOpsTimelineGrid(h, daySt, { nowBiz, openBiz, prepBiz, kLastBiz, bLastBiz, minCloseBiz }, ar);
    const actRow = renderOpsActionButtons({ daySt, h, nowHM, nowBiz, minCloseBiz, ar });

    bar.append(topRow, timeline, actRow);
  }

  FOH.opsLifecycleBar = {
    renderOpsLifecycleBar,
    renderOpsTopRow,
    renderOpsTimelineGrid,
    createLastOrderButtons,
    renderOpsActionButtons,
  };
})();

