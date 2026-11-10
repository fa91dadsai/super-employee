// Operations Lifecycle Component
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  function getSession() {
    return (FOH.sessionAuth && FOH.sessionAuth.loadSession) ? FOH.sessionAuth.loadSession() : null;
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  const configHelper = () => FOH.opsConfigStore || {};
  const formatTime12Ar = (hm) => (FOH.opsConfigStore && FOH.opsConfigStore.formatTime12Ar ? FOH.opsConfigStore.formatTime12Ar(hm) : hm);
  const saveOpsDayState = (d, st) => (FOH.opsConfigStore && FOH.opsConfigStore.saveOpsDayState ? FOH.opsConfigStore.saveOpsDayState(d, st) : null);
  const loadOpsDayState = (d) => (FOH.opsConfigStore && FOH.opsConfigStore.loadOpsDayState ? FOH.opsConfigStore.loadOpsDayState(d) : {});
  const loadOpsConfig = () => (FOH.opsConfigStore && FOH.opsConfigStore.loadOpsConfig ? FOH.opsConfigStore.loadOpsConfig() : (FOH.opsConfigStore && FOH.opsConfigStore.DEFAULT_OPS_CONFIG) || {});
  const toBizMinutes = (hm) => (FOH.opsConfigStore && FOH.opsConfigStore.toBizMinutes ? FOH.opsConfigStore.toBizMinutes(hm) : 0);
  const renderOpsLifecycleBar = () => (FOH.opsLifecycle && FOH.opsLifecycle.renderOpsLifecycleBar ? FOH.opsLifecycle.renderOpsLifecycleBar() : null);
  const loadTipsData = () => (FOH.tipsStore && FOH.tipsStore.loadTipsData ? FOH.tipsStore.loadTipsData() : null);
  const saveTipsData = (d) => (FOH.tipsStore && FOH.tipsStore.saveTipsData ? FOH.tipsStore.saveTipsData(d) : null);
  const activateClosingSheet = (d) => (FOH.opsLifecycle && FOH.opsLifecycle.activateClosingSheet ? FOH.opsLifecycle.activateClosingSheet(d) : null);
  const ensureUpgradedClosingSections = () => (FOH.opsLifecycle && FOH.opsLifecycle.ensureUpgradedClosingSections ? FOH.opsLifecycle.ensureUpgradedClosingSections() : null);
  const isClosingSheetActive = () => (FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive ? FOH.opsLifecycle.isClosingSheetActive() : false);
  const hasSuperPerm = (p) => (FOH.roleIdentity && FOH.roleIdentity.hasSuperPerm ? FOH.roleIdentity.hasSuperPerm(p) : false);
  const getSuperRoleMeta = (k) => ((FOH.roleIdentity && FOH.roleIdentity.SUPER_ROLES_META && FOH.roleIdentity.SUPER_ROLES_META[k]) || { badge: 'Staff' });

  function renderClosePermissionDenied(dlg, roleMeta, ar) {
    const box = el('div', '');
    box.style.padding = '16px 18px 22px';
    box.innerHTML =
      '<div class="grab"></div>' +
      '<h2 style="color:var(--danger);">🔒 ' + (ar ? 'صلاحية إغلاق المطعم غير متوفرة لمنصبك' : 'Permission Required to Close Restaurant') + '</h2>' +
      '<p style="font-size:0.88rem;color:var(--ink2);line-height:1.5;">' +
      (ar ? 'منصبك الحالي هو <b>' + roleMeta.badge + '</b>. إغلاق المطعم رسمياً في نهاية الشفت مخصص لـ <b>👑 Super Manager</b> أو <b>🎖️ Super Captain</b> (يمكن للمدير تعديل هذه الصلاحية من ⚙️ الإعدادات).' : 'Your current role is ' + roleMeta.badge + '. Super Manager or Super Captain permission required.') +
      '</p>';
    const okB = el('button', 'btn primary', ar ? 'حسناً' : 'OK');
    okB.type = 'button';
    okB.style.width = '100%';
    okB.addEventListener('click', () => dlg.close());
    box.append(okB);
    dlg.append(box);
    dlg.showModal();
  }

  function renderEmergencyOverrideSection(dlg, opts, ar) {
    const { nowHM, daySt, myName, roleMeta } = opts;
    const ovWrap = el('div', '');
    ovWrap.style.marginTop = '10px';
    ovWrap.style.paddingTop = '10px';
    ovWrap.style.borderTop = '1px dashed var(--line)';
    const ovLbl = el('label', '', ar ? '👑 تجاوز استثنائي بأمر Super Manager فقط (أدخل سبب الإغلاق المبكر الإلزامي):' : '👑 Super Manager Emergency Override:');
    ovLbl.style.fontSize = '0.8rem';
    ovLbl.style.fontWeight = '700';
    const ovIn = el('input', 'in');
    ovIn.placeholder = ar ? 'مثال: صيانة طارئة للكهرباء / ظرف جوي استثنائي...' : 'Emergency reason...';
    ovIn.style.marginTop = '6px';
    const ovBtn = el('button', 'btn danger', ar ? '⚠️ فرض الإغلاق المبكر بأمر السوبر مانجر' : '⚠️ Force Early Close');
    ovBtn.type = 'button';
    ovBtn.style.width = '100%';
    ovBtn.style.marginTop = '8px';
    ovBtn.addEventListener('click', () => {
      if (!ovIn.value.trim()) return ovIn.focus();
      daySt.closedAt = nowHM;
      daySt.closedBy = myName;
      daySt.closedRole = roleMeta.badge;
      daySt.extensionMins = 0;
      daySt.earlyOverrideReason = ovIn.value.trim();
      saveOpsDayState(S.date, daySt);
      dlg.close();
      FOH.edit.toast(ar ? '🔒 تم إغلاق المطعم استثنائياً بأمر السوبر مانجر' : '🔒 Restaurant closed via override');
      FOH.app.render();
    });
    ovWrap.append(ovLbl, ovIn, ovBtn);
    return ovWrap;
  }

  function renderEarlyCloseWarning(dlg, box, opts = {}) {
    const isLegacy = typeof opts === 'object' && ('h' in opts);
    const options = isLegacy ? opts : (opts && opts.options) || {};
    const ar = (opts && typeof opts.ar === 'boolean') ? opts.ar : (isLegacy ? !!arguments[3] : isAr());
    const { h, nowHM, minCloseBiz, canOverrideEarly } = options;

    box.innerHTML =
      '<div class="grab"></div>' +
      '<div style="padding:12px;border-radius:12px;background:var(--danger-soft);border:1.5px solid var(--danger);margin-bottom:12px;">' +
      '<h3 style="margin:0 0 6px;color:var(--danger);">⛔ ' + (ar ? 'منع الإغلاق المبكر للمطعم (الساعة الآن ' + formatTime12Ar(nowHM) + ')' : 'Early Closing Blocked (' + formatTime12Ar(nowHM) + ')') + '</h3>' +
      '<p style="margin:0;font-size:0.84rem;line-height:1.5;">' + (ar ? 'الحد الأدنى الرسمي لإغلاق المطعم هو <b>' + formatTime12Ar(h.minCloseTime) + '</b>. حسب قوانين المطعم، <b>لا يُغلق المطعم مبكراً (مثلاً الساعة 11:30 مساءً) حتى لو كانت الصالة فارغة من الزبائن</b>.' : 'Minimum closing time is ' + formatTime12Ar(h.minCloseTime) + '. Early close is blocked.') + '</p>' +
      '</div>';

    const simHint = el('button', 'btn', ar ? '⏱ تجربة محاكاة الساعة 02:30 ص (بعد مغادرة آخر زبون)' : '⏱ Simulate 02:30 AM (Last Guest Left)');
    simHint.type = 'button';
    simHint.style.width = '100%';
    simHint.style.marginBottom = '10px';
    simHint.addEventListener('click', () => {
      if (FOH.opsConfigStore && FOH.opsConfigStore.setSimulatedShiftTime) {
        FOH.opsConfigStore.setSimulatedShiftTime('02:30');
      }
      dlg.close();
      renderOpsLifecycleBar();
      openCloseRestaurantDialog('02:30', toBizMinutes('02:30'), minCloseBiz);
    });
    box.append(simHint);

    if (canOverrideEarly) {
      box.append(renderEmergencyOverrideSection(dlg, options, ar));
    }

    const closeDlgB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    closeDlgB.type = 'button';
    closeDlgB.style.width = '100%';
    closeDlgB.style.marginTop = '8px';
    closeDlgB.addEventListener('click', () => dlg.close());
    box.append(closeDlgB);
    dlg.append(box);
    dlg.showModal();
  }

  function submitOfficialRestaurantClose(dlg, opts, ar) {
    const { h, nowHM, extMins, daySt, myName, roleMeta } = opts;
    daySt.closedAt = nowHM;
    daySt.closedBy = myName;
    daySt.closedRole = roleMeta.badge;
    daySt.extensionMins = extMins;
    if (!daySt.kitchenLastOrderAt) daySt.kitchenLastOrderAt = h.kitchenLastOrder;
    if (!daySt.barLastOrderAt) daySt.barLastOrderAt = h.barLastOrder;

    if (extMins > 0 && !daySt.overtimeCredited) {
      const extraHours = Math.round((extMins / 60) * 10) / 10;
      const tipsDB = loadTipsData();
      if (tipsDB && tipsDB.staff) {
        Object.values(tipsDB.staff).forEach((st) => {
          st.hours = Math.round(((Number(st.hours) || 40) + extraHours) * 10) / 10;
        });
        saveTipsData(tipsDB);
      }
      daySt.overtimeCredited = true;
    }
    saveOpsDayState(S.date, daySt);
    dlg.close();
    FOH.edit.toast(ar ? '🚪 تم إغلاق المطعم رسمياً الساعة ' + formatTime12Ar(nowHM) + (extMins > 0 ? ' واحتساب +' + extMins + ' دقيقة تمديد ✓' : ' ✓') : '🚪 Closed at ' + formatTime12Ar(nowHM) + ' ✓');
    FOH.app.render();
  }

  function renderOfficialCloseConfirmation(dlg, box, opts = {}) {
    const isLegacy = typeof opts === 'object' && ('h' in opts);
    const options = isLegacy ? opts : (opts && opts.options) || {};
    const ar = (opts && typeof opts.ar === 'boolean') ? opts.ar : (isLegacy ? !!arguments[3] : isAr());
    const { h, nowHM, extMins, doneClosingCount, allClosingLeaves, leftClosingCount } = options;

    box.innerHTML =
      '<div class="grab"></div>' +
      '<h2>🚪 ' + (ar ? 'تأكيد إغلاق المطعم رسمياً (مع مغادرة آخر زبون)' : 'Confirm Official Restaurant Closing') + '</h2>' +
      '<div style="padding:12px;border-radius:12px;background:var(--accent-soft);border:1px solid var(--accent);margin-bottom:12px;font-size:0.84rem;line-height:1.55;">' +
      '<div>🕒 <b>' + (ar ? 'وقت الإغلاق الفعلي:' : 'Closing Time:') + '</b> ' + formatTime12Ar(nowHM) + (extMins > 0 ? (ar ? ' (تمديد +' + extMins + ' دقيقة بعد الـ ' + formatTime12Ar(h.minCloseTime) + ')' : ' (+' + extMins + 'm extension)') : '') + '</div>' +
      '<div>🌙 <b>' + (ar ? 'إنجاز شيت الإغلاق:' : 'Closing Sheet:') + '</b> ' + doneClosingCount + ' / ' + allClosingLeaves.length + (leftClosingCount === 0 ? ' ✅' : (ar ? ' (متبقي ' + leftClosingCount + ' مهام)' : ' (' + leftClosingCount + ' left)')) + '</div>' +
      '<div>💰 <b>' + (ar ? 'ربط الساعات مع Tip Manager:' : 'Tip Manager Sync:') + '</b> ' + (extMins > 0 ? (ar ? 'سيتم احتساب +' + (extMins / 60).toFixed(1) + ' س إضافية تلقائياً' : '+' + (extMins / 60).toFixed(1) + 'h overtime logged') : (ar ? 'ساعات الشفت القياسية مكتملة' : 'Standard hours')) + '</div>' +
      '</div>';

    if (leftClosingCount > 0) {
      const openClsBtn = el('button', 'btn', ar ? '🌙 مراجعة واستكمال مهام الـ Closing Sheet المتبقية (' + leftClosingCount + ')' : '🌙 Review Remaining Items (' + leftClosingCount + ')');
      openClsBtn.type = 'button';
      openClsBtn.style.width = '100%';
      openClsBtn.style.marginBottom = '10px';
      openClsBtn.addEventListener('click', () => { dlg.close(); activateClosingSheet('all'); });
      box.append(openClsBtn);
    }

    const confirmCloseBtn = el('button', 'btn primary', ar ? '✅ تأكيد مغادرة آخر زبون وإغلاق المطعم الآن (' + formatTime12Ar(nowHM) + ')' : '✅ Confirm Close (' + formatTime12Ar(nowHM) + ')');
    confirmCloseBtn.type = 'button';
    confirmCloseBtn.style.width = '100%';
    confirmCloseBtn.addEventListener('click', () => submitOfficialRestaurantClose(dlg, options, ar));

    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.style.width = '100%';
    cancelB.style.marginTop = '8px';
    cancelB.addEventListener('click', () => dlg.close());

    box.append(confirmCloseBtn, cancelB);
    dlg.append(box);
    dlg.showModal();
  }

  function openCloseRestaurantDialog(nowHM, nowBiz, minCloseBiz) {
    const ar = isAr();
    const cfg = loadOpsConfig();
    const h = cfg.hours;
    const daySt = loadOpsDayState(S.date);
    const sess = getSession();
    const myName = (sess && sess.displayName) || S.me.name || 'Supervisor';
    const roleKey = getCurrentSuperRoleKey();
    const roleMeta = getSuperRoleMeta(roleKey);
    const canClose = hasSuperPerm('canCloseRestaurant');
    const canOverrideEarly = hasSuperPerm('canEarlyCloseOverride');

    let dlg = $('closeRestaurantDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'closeRestaurantDialog';
      document.body.append(dlg);
    }
    dlg.replaceChildren();

    if (!canClose) {
      renderClosePermissionDenied(dlg, roleMeta, ar);
      return;
    }

    const box = el('div', '');
    box.style.padding = '16px 18px 22px';

    if (nowBiz < minCloseBiz) {
      renderEarlyCloseWarning(dlg, box, { h, nowHM, minCloseBiz, canOverrideEarly, daySt, myName, roleMeta }, ar);
      return;
    }

    ensureUpgradedClosingSections();
    const closingSecs = FOH.safeJsonParse(localStorage.getItem('foh-opening.closingSections.v1'), 'null') || ((FOH.opsLifecycle && FOH.opsLifecycle.DEPT_CLOSING_SECTIONS) || []);
    const closingRun = FOH.safeJsonParse(localStorage.getItem('foh-opening.closingRun.' + S.date), '{"checked":{}}');
    const checkedMap = (isClosingSheetActive() ? S.run.checked : closingRun.checked) || {};
    const allClosingLeaves = closingSecs.flatMap((s) => s.items || []);
    const doneClosingCount = allClosingLeaves.filter((it) => checkedMap[it.id]).length;
    const leftClosingCount = allClosingLeaves.length - doneClosingCount;
    const extMins = Math.max(0, nowBiz - minCloseBiz);

    renderOfficialCloseConfirmation(dlg, box, { h, nowHM, extMins, doneClosingCount, allClosingLeaves, leftClosingCount, daySt, myName, roleMeta }, ar);
  }

  FOH.opsCloseDialog = {
    openCloseRestaurantDialog,
  };
})(window.FOH = window.FOH || {});
