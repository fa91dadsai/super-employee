// foh-opening/js/domains/profile/health-profile-view.js
// Dedicated Employee Profile & Health Certificate View (#profilePageView)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function ensureStaffHealthAndPerms() {
    if (FOH.gov) FOH.gov.ensureStaffHealthAndPerms();
  }

  function calcDaysLeft(exp) {
    return FOH.gov ? FOH.gov.calcDaysLeft(exp) : null;
  }

  function openProfile() {
    if (FOH.profileDialog) FOH.profileDialog.openProfile();
  }

  function renderStaffPickerOption(st, opts = {}) {
    const { currentStaffId, sess, ar } = opts;
    const d = calcDaysLeft(st.healthCertExpiry);
    const tag = d === null
      ? ''
      : d < 0
        ? (ar ? ` [🚨 منتهية (${st.healthCertExpiry})]` : ` [🚨 Expired (${st.healthCertExpiry})]`)
        : d <= 30
          ? (ar ? ` [⚠️ تنتهي قريباً (${st.healthCertExpiry})]` : ` [⚠️ Expiring soon (${st.healthCertExpiry})]`)
          : (ar ? ` [✓ سارية (${st.healthCertExpiry})]` : ` [✓ Valid (${st.healthCertExpiry})]`);

    const isMeTag = sess && (st.id === sess.staffId || (st.name || '').toLowerCase().startsWith((sess.username || '').toLowerCase()))
      ? (ar ? ' (حسابي الحالي)' : ' (My Profile)')
      : '';

    const opt = el('option', '', `${st.name}${isMeTag}${tag}`);
    opt.value = st.id;
    opt.selected = st.id === currentStaffId;
    return opt;
  }

  function renderManagerStaffPicker(currentStaffId, opts = {}) {
    const { root, ar, sess } = opts;
    const pickerBox = el('div', 'hc-staff-picker-box');
    pickerBox.style.background = 'var(--bg2, rgba(0, 0, 0, 0.04))';
    pickerBox.style.border = '1px solid var(--line)';
    pickerBox.style.borderRadius = '12px';
    pickerBox.style.padding = '10px 12px';
    pickerBox.style.marginBottom = '14px';

    const pickerHead = el('div', '');
    pickerHead.style.display = 'flex';
    pickerHead.style.justifyContent = 'space-between';
    pickerHead.style.alignItems = 'center';
    pickerHead.style.marginBottom = '6px';
    pickerHead.innerHTML =
      '<span style="font-size:0.82rem;font-weight:700;">👥 ' +
      (ar ? 'اختيار الموظف لتدقيق وتحديث شهادته الصحية:' : 'Select Employee to View & Update Certificate:') +
      '</span>';

    const sel = el('select', 'in');
    sel.style.fontWeight = '600';
    (S.tpl.staff || []).forEach((st) => {
      sel.append(renderStaffPickerOption(st, { currentStaffId, sess, ar }));
    });

    sel.addEventListener('change', () => {
      S.selectedHealthStaffId = sel.value;
      renderProfilePageView(root);
    });

    pickerBox.append(pickerHead, sel);
    if (FOH.modalPicker && FOH.modalPicker.enhanceSelect) {
      FOH.modalPicker.enhanceSelect(sel, {
        title: ar ? 'اختيار الموظف لتدقيق وتحديث الشهادة' : 'Select Employee to View & Update Certificate',
        subtitle: ar ? 'اختر موظفاً من طاقم المطعم لمراجعة شهادته الصحية وتعديل تاريخها' : 'Choose staff member to inspect and update certificate',
        icon: '👥',
      });
    }
    return pickerBox;
  }

  function renderHealthStatusHeader(staffRec, days, ar) {
    const statusBadge = days === null
      ? (ar ? '⚪ لم يتم إدخال تاريخ الانتهاء' : '⚪ Expiry date not set')
      : days < 0
        ? (ar ? '🚨 منتهية منذ ' + Math.abs(days) + ' يوم!' : '🚨 Expired ' + Math.abs(days) + ' days ago!')
        : days <= 30
          ? (ar ? '⚠️ قاربت على الانتهاء · متبقي ' + days + ' يوم' : '⚠️ Expiring soon · ' + days + ' days left')
          : (ar ? '✅ صالحة · متبقي ' + days + ' يوم' : '✅ Valid · ' + days + ' days remaining');

    const topHeader = el('div', '');
    topHeader.style.display = 'flex';
    topHeader.style.justifyContent = 'space-between';
    topHeader.style.alignItems = 'center';
    topHeader.style.flexWrap = 'wrap';
    topHeader.style.gap = '8px';
    topHeader.style.marginBottom = '12px';
    topHeader.innerHTML =
      '<h3 style="margin:0;">🏥 ' +
      (ar ? 'الشهادة الصحية وتنبيه الانتهاء (' + (staffRec ? staffRec.name : '') + ')' : 'Health Certificate: ' + (staffRec ? staffRec.name : '')) +
      '</h3>' +
      '<span class="dayoff-badge ' + (days !== null && days < 0 ? 'rejected' : days !== null && days <= 30 ? 'pending' : 'approved') + '">' + statusBadge + '</span>';
    return topHeader;
  }

  function createHealthFormInputs(staffRec, ar) {
    const row = el('div', 'two');
    const noLbl = el('label', '', ar ? 'رقم الشهادة الصحية' : 'Certificate Number');
    const noIn = el('input', 'in');
    noIn.value = (staffRec && staffRec.healthCertNo) || '';
    noLbl.append(noIn);

    const expLbl = el('label', '', ar ? 'تاريخ انتهاء الشهادة الصحية' : 'Expiry Date');
    const expIn = el('input', 'in');
    expIn.type = 'date';
    expIn.value = (staffRec && staffRec.healthCertExpiry) || '';
    expLbl.append(expIn);
    row.append(noLbl, expLbl);

    const leadLbl = el('label', '', ar ? 'التنبيه قبل انتهاء الشهادة بـ' : 'Alert me before expiry by');
    leadLbl.style.marginTop = '10px';
    leadLbl.style.display = 'block';
    const leadSel = el('select', 'in');
    [
      [7, ar ? '7 أيام قبل الانتهاء' : '7 days before expiry'],
      [14, ar ? '14 يوم قبل الانتهاء' : '14 days before expiry'],
      [30, ar ? '30 يوم (شهر) قبل الانتهاء' : '30 days before expiry'],
      [60, ar ? '60 يوم (شهرين) قبل الانتهاء' : '60 days before expiry'],
    ].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = String(val);
      o.selected = ((staffRec && staffRec.healthCertRemindDays) || 30) === val;
      leadSel.append(o);
    });
    leadLbl.append(leadSel);

    if (FOH.modalPicker && FOH.modalPicker.enhanceSelect) {
      FOH.modalPicker.enhanceSelect(leadSel, {
        title: ar ? 'التنبيه المسبق قبل الانتهاء بـ' : 'Alert Me Before Expiry By',
        subtitle: ar ? 'تحديد فترة الإشعار الاستباقي قبل تاريخ انتهاء الشهادة' : 'Lead time notification before certificate expires',
        icon: '⏰',
      });
    }

    return { row, noIn, expIn, leadLbl, leadSel };
  }

  function appendRenewalRequestButton(hcCard, opts = {}) {
    const { staffRec, sess, ar } = opts;
    const reqRenewalBtn = el('button', 'btn primary', ar ? '🏥 إشعار الإدارة بطلب اعتماد وتجديد الشهادة' : '🏥 Send Renewal Request to Management');
    reqRenewalBtn.type = 'button';
    reqRenewalBtn.style.width = '100%';
    reqRenewalBtn.style.marginTop = '8px';
    reqRenewalBtn.addEventListener('click', () => {
      if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
        FOH.cloudRealtime.broadcast('HEALTH_CERT_RENEWAL_REQUEST', {
          staffName: (staffRec && staffRec.name) || (sess && sess.displayName) || 'Staff',
          currentExpiry: (staffRec && staffRec.healthCertExpiry) || '',
          at: FOH.time.nowHM(),
        });
      }
      FOH.edit.toast(ar ? 'تم إشعار إدارة المطعم بطلب مراجعة واعتماد الشهادة الصحية ✓' : 'Management notified of renewal request ✓');
    });
    hcCard.append(reqRenewalBtn);
  }

  function renderStaffCertActions(hcCard, opts = {}) {
    const { staffRec, sess, ar, inputs, days } = opts;
    const { row, noIn, expIn, leadLbl, leadSel } = inputs;
    noIn.disabled = true;
    noIn.style.opacity = '0.75';
    noIn.style.cursor = 'not-allowed';
    expIn.disabled = true;
    expIn.style.opacity = '0.75';
    expIn.style.cursor = 'not-allowed';

    const secNotice = el('div', 'health-sec-notice');
    secNotice.style.background = 'rgba(217, 130, 43, 0.12)';
    secNotice.style.border = '1px solid rgba(217, 130, 43, 0.4)';
    secNotice.style.borderRadius = '8px';
    secNotice.style.padding = '8px 12px';
    secNotice.style.margin = '10px 0';
    secNotice.style.fontSize = '0.76rem';
    secNotice.style.color = 'var(--ink)';
    secNotice.innerHTML =
      '🔒 <b>' +
      (ar ? 'تاريخ الشهادة محمي بواسطة الإدارة:' : 'Expiry Date Protected by Management:') +
      '</b> ' +
      (ar
        ? 'منعاً للتلاعب، لا يمكن تعديل تاريخ الانتهاء إلا بواسطة المدير العام بعد معاينة الشهادة الرسمية الأصلية.'
        : 'To prevent tampering, health certificate expiry dates can only be updated by General Manager upon physical verification.');

    const savePrefBtn = el('button', 'btn', ar ? '💾 حفظ تفضيل التنبيه المسبق فقط' : '💾 Save Reminder Lead Time');
    savePrefBtn.type = 'button';
    savePrefBtn.style.width = '100%';
    savePrefBtn.style.marginTop = '10px';
    savePrefBtn.addEventListener('click', () => {
      if (staffRec) {
        staffRec.healthCertRemindDays = Number(leadSel.value) || 30;
        FOH.store.saveTemplate(S.tpl);
      }
      FOH.edit.toast(ar ? 'تم حفظ تفضيل التنبيه المسبق بنجاح ✓' : 'Reminder lead-time saved ✓');
    });

    hcCard.append(secNotice, row, leadLbl, savePrefBtn);

    if (days !== null && days <= 30) {
      appendRenewalRequestButton(hcCard, { staffRec, sess, ar });
    }
  }

  function renderManagerCertActions(hcCard, opts = {}) {
    const { staffRec, ar, inputs } = opts;
    const { row, noIn, expIn, leadLbl, leadSel } = inputs;

    const mgrBadge = el('div', 'health-mgr-notice');
    mgrBadge.style.background = 'rgba(16, 185, 129, 0.12)';
    mgrBadge.style.border = '1px solid rgba(16, 185, 129, 0.4)';
    mgrBadge.style.borderRadius = '8px';
    mgrBadge.style.padding = '8px 12px';
    mgrBadge.style.margin = '10px 0';
    mgrBadge.style.fontSize = '0.76rem';
    mgrBadge.style.color = 'var(--ink)';
    mgrBadge.innerHTML =
      '👑 <b>' +
      (ar ? 'بصلاحية المدير العام:' : 'Super Manager Permission:') +
      '</b> ' +
      (ar
        ? 'يمكنك تدقيق وتعديل تاريخ انتهاء الشهادة الصحية للموظف (' + (staffRec ? staffRec.name : '') + ') بعد فحص الشهادة الورقية/الرسمية.'
        : 'You can inspect and update health certificate expiry dates for (' + (staffRec ? staffRec.name : '') + ').');

    const saveHcBtn = el('button', 'btn primary', ar ? '💾 حفظ بيانات الشهادة الصحية وتفعيل التنبيه (كمدير)' : '💾 Save Health Certificate (Manager)');
    saveHcBtn.type = 'button';
    saveHcBtn.style.width = '100%';
    saveHcBtn.style.marginTop = '12px';
    saveHcBtn.addEventListener('click', () => {
      if (staffRec) {
        staffRec.healthCertNo = noIn.value.trim();
        staffRec.healthCertExpiry = expIn.value;
        staffRec.healthCertRemindDays = Number(leadSel.value) || 30;
        FOH.store.saveTemplate(S.tpl);
      }
      FOH.edit.toast(ar ? 'تم حفظ بيانات الشهادة الصحية للموظف وتحديث التنبيهات ✓' : 'Health certificate saved ✓');
      FOH.app.render();
    });

    hcCard.append(mgrBadge, row, leadLbl, saveHcBtn);
  }

  // ---- 7. Dedicated Employee Profile & Health Certificate View (#profilePageView) ----
  function renderProfilePageView(root) {
    if (!root) return;
    root.replaceChildren();
    const ar = isAr();
    const sess = getSession();
    const isMgr = !!(sess && sess.isManager);
    ensureStaffHealthAndPerms();

    const selectedId = (isMgr && S.selectedHealthStaffId) ? S.selectedHealthStaffId : (sess && sess.staffId);
    const staffRec = (S.tpl.staff || []).find((p) => p.id === selectedId) ||
      (S.tpl.staff || []).find((p) => (p.name || '').toLowerCase().startsWith(((sess && sess.username) || 'fadi').toLowerCase())) ||
      (S.tpl.staff && S.tpl.staff[0]);

    const hcCard = el('section', 'card');
    hcCard.style.padding = '16px';
    hcCard.style.border = '1.5px solid var(--accent)';

    if (isMgr && Array.isArray(S.tpl.staff) && S.tpl.staff.length > 0) {
      hcCard.append(renderManagerStaffPicker(staffRec && staffRec.id, { root, ar, sess }));
    }

    const days = staffRec ? calcDaysLeft(staffRec.healthCertExpiry) : null;
    hcCard.append(renderHealthStatusHeader(staffRec, days, ar));

    const inputs = createHealthFormInputs(staffRec, ar);
    if (!isMgr) {
      renderStaffCertActions(hcCard, { staffRec, sess, ar, inputs, days });
    } else {
      renderManagerCertActions(hcCard, { staffRec, ar, inputs });
    }

    root.append(hcCard);

    const openFullBtn = el('button', 'btn primary', ar ? '👤 تعديل البيانات، الـ Nickname وجهات الاتصال' : '👤 Edit Profile, Nickname & Contact Info');
    openFullBtn.type = 'button';
    openFullBtn.style.width = '100%';
    openFullBtn.style.marginBottom = '12px';
    openFullBtn.addEventListener('click', () => openProfile());
    root.append(openFullBtn);

    if (FOH.erpPwa && FOH.erpPwa.buildDayOffSection) {
      root.append(FOH.erpPwa.buildDayOffSection(true));
    }
  }

  FOH.healthProfile = {
    renderProfilePageView,
  };
  FOH.healthProfileView = FOH.healthProfile;
})(window.FOH = window.FOH || {});
