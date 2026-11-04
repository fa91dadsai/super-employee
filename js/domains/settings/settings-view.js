// foh-opening/js/domains/settings/settings-view.js
// Manager Settings & ERP Tenant Provisioning Identity (Manager RBAC Enforced)
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

  function loadGov() {
    return FOH.gov ? FOH.gov.loadGov() : {};
  }

  function saveGov(g) {
    if (FOH.gov) FOH.gov.saveGov(g);
  }

  function ensureStaffHealthAndPerms() {
    if (FOH.gov) FOH.gov.ensureStaffHealthAndPerms();
  }

  function renderBrandAndTenantCard(gov, ar) {
    const brandCard = el('section', 'card');
    brandCard.style.padding = '16px';
    brandCard.append(
      el('h3', '', '🍽 ' + (ar ? 'هوية المطعم وترخيص نظام ERP (Enterprise Identity)' : 'Restaurant Identity & ERP Tenant Provisioning'))
    );

    const tenantBox = el('div', 'enterprise-tenant-box');
    tenantBox.innerHTML =
      '<div class="etb-badge">⚡ ' +
      (ar ? 'ترخيص المنشأة الموحد في نظام ERP (Enterprise Tenant Identity)' : 'Unified ERP Tenant License & Database Schema') +
      '</div>' +
      '<div class="etb-grid">' +
      '<div><small>' + (ar ? 'المطعم / المشترك:' : 'Tenant Name:') + '</small> <b>' + (gov.restaurantName || 'CEEN') + '</b></div>' +
      '<div><small>' + (ar ? 'السكيمة في قاعدة البيانات:' : 'DB Schema:') + '</small> <code>' + (gov.tenantSchema || 't_ceen') + '</code></div>' +
      '<div><small>' + (ar ? 'الفرع والموقع:' : 'Branch Code:') + '</small> <b>' + (gov.branchName || 'Amman Main') + ' (MAIN)</b></div>' +
      '<div><small>' + (ar ? 'حالة الحزمة:' : 'License Status:') + '</small> <span class="etb-status-pill">✓ ' + (ar ? 'مرخّص ومفعّل' : 'Active Provisioned') + '</span></div>' +
      '</div>' +
      '<p class="etb-note">' +
      (ar
        ? '💡 في نظام ERP وحزمة البرامج المرتبطة (Bottle Vault، Tip Manager، Schedule، PWA)، يتم استيراد اسم المطعم وهويته تلقائياً من سكيمة قاعدة البيانات المركزية (platform.tenants / t_[tenant]) المرتبطة بحزمة الاشتراك. يمكنك تخصيص الاسم محلياً أدناه للتجربة والتهيئة.'
        : '💡 Across the ERP suite (Bottle Vault, Tip Manager, Schedule, PWA), restaurant identity originates from the central database tenant schema (platform.tenants / t_[tenant]). Local edits below serve as an override for testing and site configuration.') +
      '</p>';
    brandCard.append(tenantBox);

    const prefToggle = el('label', 'tog');
    prefToggle.style.display = 'flex';
    prefToggle.style.justifyContent = 'space-between';
    prefToggle.style.alignItems = 'center';
    prefToggle.style.padding = '10px 0';
    prefToggle.style.marginTop = '10px';
    prefToggle.style.borderTop = '1px solid var(--line)';
    prefToggle.innerHTML =
      '<span><b>🔤 ' +
      (ar
        ? 'اعتماد الاسم الإنجليزي المختصر كاسم أساسي دائماً (أولوية 95%)'
        : 'Prefer Short English Brand Everywhere (95% Priority)') +
      '</b><br><small style="color:var(--ink2);">' +
      (ar
        ? 'إظهار اسم المطعم بالإنجليزي (مثل CEEN) في الهيدر والسايدبار حتى عند استخدام الواجهة بالعربي'
        : 'Display concise English brand (e.g. CEEN) even when Arabic UI language is active') +
      '</small></span>';
    const prefCb = el('input', 'sw');
    prefCb.type = 'checkbox';
    prefCb.checked = gov.preferEnglishBrand !== false;
    prefToggle.append(prefCb);
    brandCard.append(prefToggle);

    const bRow = el('div', 'two');
    const enLbl = el('label', '', ar ? 'اسم المطعم (إنجليزي مختصر - Recommended)' : 'Restaurant Name (Short EN)');
    const enIn = el('input', 'in');
    enIn.value = gov.restaurantName || 'CEEN';
    enLbl.append(enIn);

    const arLbl = el('label', '', ar ? 'اسم المطعم (عربي / تجاري ثانوي)' : 'Restaurant Name (Secondary AR)');
    const arIn = el('input', 'in');
    arIn.value = gov.restaurantNameAr || 'CEEN';
    arLbl.append(arIn);
    bRow.append(enLbl, arLbl);

    const saveBrandBtn = el('button', 'btn primary', ar ? '💾 حفظ هوية المطعم وتفضيل اللغة' : '💾 Save Restaurant Identity & Language Policy');
    saveBrandBtn.type = 'button';
    saveBrandBtn.style.marginTop = '10px';
    saveBrandBtn.style.width = '100%';
    saveBrandBtn.addEventListener('click', () => {
      gov.restaurantName = enIn.value.trim() || 'CEEN';
      gov.restaurantNameAr = arIn.value.trim() || gov.restaurantName;
      gov.preferEnglishBrand = prefCb.checked;
      saveGov(gov);
      FOH.edit.toast(ar ? 'تم تحديث هوية المطعم وتفضيل اللغة الإنجليزية ✓' : 'Restaurant identity and English preference saved ✓');
      FOH.app.render();
    });
    brandCard.append(bRow, saveBrandBtn);
    return brandCard;
  }

  function renderChecklistLockCard(gov, ar) {
    const permCard = el('section', 'card');
    permCard.style.padding = '16px';
    permCard.append(
      el('h3', '', '🔐 ' + (ar ? 'قفل الشيك ليست وتحديد الموظفين المسموح لهم بالتعديل' : 'Checklist Lock & Per-Employee Edit Permissions')),
      el('p', 'setting-note', ar ? 'تحكّم بمن يستطيع تعديل بنود الـ Checklist، أو اقفل القائمة بالكامل لمنع أي تعديل.' : 'Choose which specific employees can edit checklist items, or lock the checklist globally.')
    );

    const lockRow = el('label', 'tog');
    lockRow.style.display = 'flex';
    lockRow.style.justifyContent = 'space-between';
    lockRow.style.alignItems = 'center';
    lockRow.style.padding = '10px 0';
    lockRow.innerHTML = '<b>🔒 ' + (ar ? 'قفل الـ Checklist بالكامل (منع التعديل)' : 'Lock Checklist Globally') + '</b>';
    const lockCb = el('input', 'sw');
    lockCb.type = 'checkbox';
    lockCb.checked = !!gov.checklistLocked;
    lockCb.addEventListener('change', () => {
      gov.checklistLocked = lockCb.checked;
      if (gov.checklistLocked) S.editing = false;
      saveGov(gov);
      FOH.app.render();
    });
    lockRow.append(lockCb);
    permCard.append(lockRow);

    (S.tpl.staff || []).forEach((p) => {
      const r = el('label', 'tog');
      r.style.display = 'flex';
      r.style.justifyContent = 'space-between';
      r.style.alignItems = 'center';
      r.style.padding = '10px 0';
      r.style.borderTop = '1px solid var(--line)';
      const roleObj = (S.tpl.roles || []).find((x) => x.id === p.role);
      r.innerHTML = '<span>👤 <b>' + p.name + '</b> <small style="color:var(--ink2);">(' + (roleObj ? roleObj.name : 'Staff') + ')</small></span>';
      const cb = el('input', 'sw');
      cb.type = 'checkbox';
      cb.checked = !!p.canEditChecklist;
      cb.addEventListener('change', () => {
        p.canEditChecklist = cb.checked;
        const uname = (p.name || '').toLowerCase().split(' ')[0];
        if (cb.checked && !gov.editorUsernames.includes(uname)) gov.editorUsernames.push(uname);
        if (!cb.checked) gov.editorUsernames = gov.editorUsernames.filter((u) => u !== uname);
        saveGov(gov);
        FOH.store.saveTemplate(S.tpl);
        FOH.edit.toast(ar ? 'تم تحديث صلاحية التعديل لـ ' + p.name + ' ✓' : 'Updated edit permission for ' + p.name + ' ✓');
        FOH.app.render();
      });
      r.append(cb);
      permCard.append(r);
    });
    return permCard;
  }

  function renderTipsVisibilityCard(gov, ar) {
    const tipsCfgCard = el('section', 'card');
    tipsCfgCard.style.padding = '16px';
    tipsCfgCard.append(
      el('h3', '', '💰 ' + (ar ? 'تحكم المدير بظهور تفاصيل التبس للموظفين (Tips Manager Visibility)' : 'Tip Manager Visibility Controls for Employees')),
      el('p', 'setting-note', ar ? 'حدد بدقة ما يستطيع الموظف رؤيته في صفحة التبس والنقاط الخاصة به:' : 'Choose which Tip Manager details employees are allowed to see:')
    );

    const visOptions = [
      ['enabledForStaff', ar ? 'تفعيل قسم التبس والنقاط للموظفين' : 'Enable Tips & Points section for staff'],
      ['showPoints', ar ? 'إظهار نقاط التبس الخاصة بالموظف (Points)' : 'Show employee tip points'],
      ['showWorkedDays', ar ? 'إظهار الأيام والساعات التي عمل بها الموظف' : 'Show worked days & attendance'],
      ['showGrossShare', ar ? 'إظهار إجمالي حصة الموظف من التبس (Gross Share)' : 'Show gross tip share amount'],
      ['showWithdrawals', ar ? 'إظهار المسحوبات والسلف من التبس (Withdrawals)' : 'Show tip withdrawals & advances'],
      ['showNetRemaining', ar ? 'إظهار الصافي المتبقي للاستلام (Net Payout)' : 'Show net remaining payout'],
      ['showTotalPool', ar ? 'إظهار إجمالي صندوق التبس الكلي للمطعم' : 'Show total restaurant tip pool to staff'],
    ];

    visOptions.forEach(([key, label]) => {
      const r = el('label', 'tog');
      r.style.display = 'flex';
      r.style.justifyContent = 'space-between';
      r.style.alignItems = 'center';
      r.style.padding = '10px 0';
      r.style.borderTop = '1px solid var(--line)';
      r.append(el('span', '', label));
      const cb = el('input', 'sw');
      cb.type = 'checkbox';
      cb.checked = !!gov.tipsVisibility[key];
      cb.addEventListener('change', () => {
        gov.tipsVisibility[key] = cb.checked;
        saveGov(gov);
        FOH.edit.toast(ar ? 'تم حفظ إعدادات ظهور التبس ✓' : 'Tip visibility settings saved ✓');
      });
      r.append(cb);
      tipsCfgCard.append(r);
    });
    return tipsCfgCard;
  }

  function renderPendingNameChangeApprovals(pendingStaff, root, ar) {
    const pBlock = el('div', 'pending-approvals-card');
    pBlock.innerHTML =
      '<div class="pac-head"><b>📝 ' + (ar ? 'طلبات تعديل الأسماء بانتظار اعتمادك:' : 'Pending Name Change Approvals:') + '</b><span class="pac-badge">' + pendingStaff.length + '</span></div>';
    const pList = el('div', 'pac-list');

    pendingStaff.forEach((st) => {
      const req = st.pendingNameChange;
      const it = el('div', 'pac-item');
      it.innerHTML =
        '<div class="pac-item-info">' +
        '<b>' + st.name + '</b> (' + (st.role || 'Staff') + ')<br>' +
        (ar ? 'الاسم الجديد المطلوب:' : 'Requested Legal Name:') + ' <b style="color:var(--accent);">' + (FOH.escapeHtml(req.reqFullName || (req.reqFirstName + ' ' + req.reqLastName))) + '</b><br>' +
        (ar ? 'الـ Nickname المقترح:' : 'Requested Nickname:') + ' <b style="color:#10b981;">🏷️ ' + (FOH.escapeHtml(req.reqNickname || '—')) + '</b>' +
        '</div>';

      const aRow = el('div', 'pac-item-actions');
      const okB = el('button', 'pac-btn approve', ar ? '✓ اعتماد وتطبيق في كافة الأنظمة' : '✓ Approve & Sync');
      okB.type = 'button';
      okB.addEventListener('click', () => {
        st.name = req.reqFullName || ((req.reqFirstName + ' ' + req.reqLastName).trim()) || st.name;
        if (req.reqNickname) st.nickname = req.reqNickname;
        delete st.pendingNameChange;
        FOH.store.saveTemplate(S.tpl);
        if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
          FOH.cloudRealtime.broadcast('STAFF_NAME_CHANGE_APPROVED', { staffId: st.id, name: st.name, nickname: st.nickname });
        }
        FOH.edit.toast(ar ? '✓ تم اعتماد تعديل اسم ' + st.name + ' بنجاح' : 'Name change approved ✓');
        renderSettingsView(root);
      });

      const noB = el('button', 'pac-btn reject', ar ? '✕ رفض الطلب' : '✕ Reject');
      noB.type = 'button';
      noB.addEventListener('click', () => {
        delete st.pendingNameChange;
        FOH.store.saveTemplate(S.tpl);
        FOH.edit.toast(ar ? 'تم رفض طلب التعديل' : 'Request rejected');
        renderSettingsView(root);
      });

      aRow.append(okB, noB);
      it.append(aRow);
      pList.append(it);
    });
    pBlock.append(pList);
    return pBlock;
  }

  function renderStaffDirectoryItem(st, ar) {
    const it = el('div', 'pac-item');
    it.style.background = 'var(--card)';
    it.style.border = '1px solid var(--line)';
    const nickStr = st.nickname ? '<span class="tag role" style="margin-inline-start:6px;">🏷️ ' + st.nickname + '</span>' : '';
    const codeStr = st.inviteCode || 'CEEN-XXXX';
    it.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
      '<div><b>' + st.name + '</b>' + nickStr + '<br><small style="color:var(--ink2);">' + (st.email || 'No email') + ' · ' + (st.phone || 'No phone') + '</small></div>' +
      '<div style="display:flex;align-items:center;gap:6px;"><code class="st-code-pill">' + codeStr + '</code></div>' +
      '</div>';

    const copyBtn = el('button', 'btn small', ar ? '📋 نسخ كود التفعيل' : '📋 Copy Invite Code');
    copyBtn.type = 'button';
    copyBtn.style.marginTop = '8px';
    copyBtn.style.width = '100%';
    copyBtn.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(codeStr).then(() => {
          FOH.edit.toast(ar ? '✓ تم نسخ كود التفعيل: ' + codeStr : 'Copied: ' + codeStr);
        }).catch(() => {
          prompt(ar ? 'كود التفعيل للموظف:' : 'Invite code:', codeStr);
        });
      } else {
        prompt(ar ? 'كود التفعيل للموظف:' : 'Invite code:', codeStr);
      }
    });

    it.append(copyBtn);
    return it;
  }

  function renderStaffDirectoryCard(root, ar) {
    const staffDirCard = el('section', 'card');
    staffDirCard.style.padding = '16px';
    staffDirCard.append(
      el('h3', '', '👥 ' + (ar ? 'دليل الموظفين وأكواد التفعيل (Staff Directory & Activation Codes)' : 'Staff Directory & Activation Codes')),
      el('p', 'setting-note', ar ? 'أكواد التفعيل المخصصة لتسجيل دخول الموظفين الجدد وربط الـ Nicknames مع التبس وجدول الشفتات.' : 'Unique activation codes for staff onboarding, synced with tips and weekly roster.')
    );

    const pendingStaff = (S.tpl.staff || []).filter((p) => p.pendingNameChange && p.pendingNameChange.status === 'pending');
    if (pendingStaff.length > 0) {
      staffDirCard.append(renderPendingNameChangeApprovals(pendingStaff, root, ar));
    }

    const sList = el('div', 'pac-list');
    (S.tpl.staff || []).forEach((st) => {
      sList.append(renderStaffDirectoryItem(st, ar));
    });
    staffDirCard.append(sList);
    return staffDirCard;
  }

  // ---- 8. Manager Settings & Granular Permissions View (#settingsView) ----
  function renderSettingsView(root) {
    if (!root) return;
    root.replaceChildren();
    const ar = isAr();
    const gov = loadGov();
    ensureStaffHealthAndPerms();

    root.append(
      renderBrandAndTenantCard(gov, ar),
      renderChecklistLockCard(gov, ar),
      renderTipsVisibilityCard(gov, ar),
      renderStaffDirectoryCard(root, ar)
    );
  }

  // Security Hardening: Wrap renderSettingsView with strict Manager RBAC Check
  const origRenderSettingsView = renderSettingsView;
  function secureRenderSettingsView(root) {
    if (!root) return;
    const sess = getSession();
    const ar = isAr();
    if (!sess || !sess.isManager) {
      root.replaceChildren();
      const card = el('section', 'card');
      card.style.padding = '32px 16px';
      card.style.textAlign = 'center';
      card.innerHTML =
        '<div style="font-size:2.5rem;margin-bottom:12px;">🔒</div>' +
        '<h3 style="margin:0 0 8px;">' + (ar ? 'إعدادات المنشأة وترخيص ERP مخصصة للمدير العام فقط' : 'General Manager Settings Only') + '</h3>' +
        '<p style="color:var(--ink2);font-size:0.85rem;margin:0 0 16px;">' +
        (ar ? 'لا تملك صلاحية تعديل ترخيص سكيمة قاعدة البيانات أو هوية المطعم أو صلاحيات المناصب.' : 'You do not have administrative authority to alter restaurant configuration.') +
        '</p>';
      const backBtn = el('button', 'btn primary', ar ? 'الرجوع إلى شيت الشفت' : 'Back to Shift Sheet');
      backBtn.type = 'button';
      backBtn.addEventListener('click', () => {
        if (FOH.navigation && FOH.navigation.switchView) FOH.navigation.switchView('opening');
      });
      card.append(backBtn);
      root.append(card);
      return;
    }
    origRenderSettingsView(root);
  }

  FOH.settingsView = {
    renderSettingsView: secureRenderSettingsView,
  };
})(window.FOH = window.FOH || {});
