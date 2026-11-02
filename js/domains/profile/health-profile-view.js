// foh-opening/js/domains/profile/health-profile-view.js
// Dedicated Employee Profile & Health Certificate View (#profilePageView)
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

  function ensureStaffHealthAndPerms() {
    if (FOH.gov) FOH.gov.ensureStaffHealthAndPerms();
  }

  function calcDaysLeft(exp) {
    return FOH.gov ? FOH.gov.calcDaysLeft(exp) : null;
  }

  function openProfile() {
    if (FOH.profileDialog) FOH.profileDialog.openProfile();
  }

  // ---- 7. Dedicated Employee Profile & Health Certificate View (#profilePageView) ----
  function renderProfilePageView(root) {
    if (!root) return;
    root.replaceChildren();
    const ar = isAr();
    const sess = getSession();
    const isMgr = !!(sess && sess.isManager);
    ensureStaffHealthAndPerms();
    const staffRec = (S.tpl.staff || []).find(
      (p) => p.id === (sess && sess.staffId) || (p.name || '').toLowerCase().startsWith(((sess && sess.username) || 'fadi').toLowerCase())
    ) || S.tpl.staff[0];

    const hcCard = el('section', 'card');
    hcCard.style.padding = '16px';
    hcCard.style.border = '1.5px solid var(--accent)';
    const days = staffRec ? calcDaysLeft(staffRec.healthCertExpiry) : null;
    const statusBadge = days === null
      ? (ar ? '⚪ لم يتم إدخال تاريخ الانتهاء' : '⚪ Expiry date not set')
      : days < 0
      ? (ar ? '🚨 منتهية منذ ' + Math.abs(days) + ' يوم!' : '🚨 Expired ' + Math.abs(days) + ' days ago!')
      : days <= 30
      ? (ar ? '⚠️ قاربت على الانتهاء · متبقي ' + days + ' يوم' : '⚠️ Expiring soon · ' + days + ' days left')
      : (ar ? '✅ صالحة · متبقي ' + days + ' يوم' : '✅ Valid · ' + days + ' days remaining');

    hcCard.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
      '<h3 style="margin:0;">🏥 ' + (ar ? 'الشهادة الصحية وتنبيه الانتهاء (Health Certificate)' : 'Health Certificate & Expiry Alert') + '</h3>' +
      '<span class="dayoff-badge ' + (days !== null && days < 0 ? 'rejected' : days !== null && days <= 30 ? 'pending' : 'approved') + '">' + statusBadge + '</span>' +
      '</div>';

    const row = el('div', 'two');
    const noLbl = el('label', '', ar ? 'رقم الشهادة الصحية' : 'Certificate Number');
    const noIn = el('input', 'in');
    noIn.value = (staffRec && staffRec.healthCertNo) || 'HC-2026-101';
    noLbl.append(noIn);

    const expLbl = el('label', '', ar ? 'تاريخ انتهاء الشهادة الصحية' : 'Expiry Date');
    const expIn = el('input', 'in');
    expIn.type = 'date';
    expIn.value = (staffRec && staffRec.healthCertExpiry) || '2027-06-30';
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

    if (!isMgr) {
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
    } else {
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
        (ar ? 'يمكنك تدقيق وتعديل تاريخ انتهاء الشهادة الصحية بعد فحص الشهادة الورقية/الرسمية.' : 'You can inspect and update health certificate expiry dates.');

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
        FOH.edit.toast(ar ? 'تم حفظ بيانات الشهادة الصحية وتحديث التنبيهات ✓' : 'Health certificate saved ✓');
        FOH.app.render();
      });

      hcCard.append(mgrBadge, row, leadLbl, saveHcBtn);
    }

    root.append(hcCard);

    // Quick button to open full Profile Dialog & Day-Off Section
    const openFullBtn = el('button', 'btn primary', ar ? '👤 تعديل البيانات، الـ Nickname وجهات الاتصال' : '👤 Edit Profile, Nickname & Contact Info');
    openFullBtn.type = 'button';
    openFullBtn.style.width = '100%';
    openFullBtn.style.marginBottom = '12px';
    openFullBtn.addEventListener('click', () => {
      openProfile();
    });
    root.append(openFullBtn);

    if (FOH.erpPwa && FOH.erpPwa.buildDayOffSection) {
      root.append(FOH.erpPwa.buildDayOffSection(true));
    }
  }



  FOH.healthProfileView = {
    renderProfilePageView,
  };
})(window.FOH = window.FOH || {});
