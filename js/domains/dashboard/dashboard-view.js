// foh-opening/js/domains/dashboard/dashboard-view.js
// Executive Operations Dashboard & Real-Time KPI Analytics (Manager RBAC Enforced)
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

  function loadGov() {
    return FOH.gov ? FOH.gov.loadGov() : {};
  }

  function getHealthAlerts() {
    return FOH.gov ? FOH.gov.getHealthAlerts() : [];
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function getAppRoleIdentity() {
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {};
  }

  function updateNotifBellUI() {
    if (FOH.notifCenter && FOH.notifCenter.updateNotifBellUI) FOH.notifCenter.updateNotifBellUI();
  }

  function loadSuggestions() {
    return FOH.suggestions ? FOH.suggestions.loadSuggestions() : [];
  }

  function ensureStaffHealthAndPerms() {
    if (FOH.gov) FOH.gov.ensureStaffHealthAndPerms();
  }

  function calcDaysLeft(d) {
    return FOH.gov ? FOH.gov.calcDaysLeft(d) : 999;
  }

  // ---- 6. Executive Dashboard & Analytics (#dashboardView) ----
  function renderDashboardView(root) {
    if (!root) return;
    root.replaceChildren();
    const ar = isAr();
    const gov = loadGov();
    const all = FOH.model.progress(FOH.model.allLeaves({ sections: S.tpl.sections }), S.run.checked);
    const pct = all.total ? Math.round((all.done * 100) / all.total) : 0;
    const schedStates = FOH.tasksView.todayStates();
    const schedDone = schedStates.filter((s) => s.status === 'done').length;
    const sugs = loadSuggestions().filter((s) => s.status === 'pending');
    const healthAlerts = getHealthAlerts();
    const breakageCount = (S.inv && S.inv.breakage ? S.inv.breakage.length : 0);
    const badgeOrd = $('badgeOrders') ? Number($('badgeOrders').textContent || '0') : 0;

    const hero = el('div', 'ord-hero');
    hero.innerHTML =
      '<div><div class="ord-kicker">' + (ar ? gov.restaurantNameAr : gov.restaurantName) + '</div>' +
      '<h2 style="margin:2px 0;font-size:1.25rem;">📊 ' + (ar ? 'لوحة التحكم والتحليلات التشغيلية' : 'Operations Dashboard & Analytics') + '</h2>' +
      '<small style="color:var(--ink2);">' + S.date + ' · ' + (ar ? 'نظرة شاملة على الشيك ليست، الطلبيات، الجرد، التبس والشهادات الصحية' : 'Real-time overview of checklists, orders, inventory, tips & compliance') + '</small></div>';
    root.append(hero);

    const kpiGrid = el('div', 'dash-kpi-grid');
    [
      [
        ar ? 'جاهزية الشيك ليست (Opening)' : 'Checklist Readiness',
        pct + '%',
        all.done + ' / ' + all.total + ' ' + (ar ? 'مكتمل' : 'completed'),
        'opening',
      ],
      [
        ar ? 'المهام المجدولة اليوم' : 'Scheduled Tasks Today',
        schedDone + ' / ' + schedStates.length,
        schedStates.length - schedDone === 0 ? (ar ? '✓ مكتملة بالكامل' : '✓ All done') : (ar ? 'متبقي ' + (schedStates.length - schedDone) : (schedStates.length - schedDone) + ' remaining'),
        'mine',
      ],
      [
        ar ? 'طلبيات البار والصالة' : 'Active Order Lines',
        String(badgeOrd),
        ar ? 'اضغط لفتح قسم الطلبيات' : 'Tap to open Orders',
        'orders',
      ],
      [
        ar ? 'الشهادات الصحية' : 'Health Certificates',
        healthAlerts.length ? '⚠️ ' + healthAlerts.length : '✅ 100%',
        healthAlerts.length ? (ar ? 'شهادات تحتاج تجديد!' : 'Certificates need renewal!') : (ar ? 'جميع الشهادات سارية' : 'All certificates valid'),
        'profile',
      ],
      [
        ar ? 'اقتراحات الموظفين' : 'Staff Suggestions',
        String(sugs.length),
        ar ? 'اقتراحات لتعديل الـ Checklist' : 'Pending checklist edits',
        'opening',
      ],
      [
        ar ? 'بلاغات الكسر والتالف' : 'Breakage Reports',
        String(breakageCount),
        ar ? 'في سجل الجرد' : 'Logged in Inventory',
        'inv',
      ],
    ].forEach(([lbl, val, sub, targetView]) => {
      const card = el('div', 'dash-kpi-card');
      card.style.cursor = 'pointer';
      card.append(el('small', '', lbl), el('strong', '', val), el('span', '', sub));
      card.addEventListener('click', () => {
        S.view = targetView;
        FOH.app.render();
      });
      kpiGrid.append(card);
    });
    root.append(kpiGrid);

    const panels = el('div', 'dash-panels-grid');

    const p1 = el('section', 'dash-panel');
    p1.append(el('h3', '', ar ? '📈 نسبة الإنجاز حسب أقسام المطعم والبار' : '📈 Readiness by Section'));
    S.tpl.sections.forEach((sec) => {
      const pr = FOH.model.progress(FOH.model.sectionLeaves(sec), S.run.checked);
      const spct = pr.total ? Math.round((pr.done * 100) / pr.total) : 0;
      const row = el('div', 'dash-bar-row');
      const top = el('div', 'dash-bar-top');
      top.append(el('span', '', sec.icon + ' ' + FOH.view.sectionName(sec)), el('span', '', pr.done + '/' + pr.total + ' (' + spct + '%)'));
      const track = el('div', 'dash-bar-track');
      const fill = el('div', 'dash-bar-fill');
      fill.style.width = spct + '%';
      track.append(fill);
      row.append(top, track);
      p1.append(row);
    });
    panels.append(p1);

    const p2 = el('section', 'dash-panel');
    p2.append(el('h3', '', ar ? '🏥 حالة الشهادات الصحية وصلاحيات الموظفين' : '🏥 Staff Health Certificates & Edit Access'));
    ensureStaffHealthAndPerms();
    (S.tpl.staff || []).forEach((st) => {
      const days = calcDaysLeft(st.healthCertExpiry);
      const badgeCls = days === null ? 'pending' : days < 0 ? 'rejected' : days <= 30 ? 'pending' : 'approved';
      const badgeTxt = days === null
        ? (ar ? 'غير محدد' : 'Not set')
        : days < 0
        ? (ar ? 'منتهية منذ ' + Math.abs(days) + ' يوم' : 'Expired ' + Math.abs(days) + 'd ago')
        : days <= 30
        ? (ar ? 'تنتهي خلال ' + days + ' يوم' : 'Expires in ' + days + 'd')
        : (ar ? 'صالحة (' + st.healthCertExpiry + ')' : 'Valid (' + st.healthCertExpiry + ')');

      const item = el('div', 'dayoff-item');
      item.style.marginBottom = '8px';
      item.innerHTML =
        '<div><b>👤 ' + st.name + '</b>' +
        '<small style="display:block;color:var(--ink2);">' + (st.healthCertNo || 'HC-—') + ' · ' + (st.canEditChecklist ? (ar ? '✎ مسموح بتعديل الشيك ليست' : '✎ Can edit checklist') : (ar ? '🔒 تنفيذ فقط' : '🔒 Run only')) + '</small></div>' +
        '<span class="dayoff-badge ' + badgeCls + '">' + badgeTxt + '</span>';
      p2.append(item);
    });
    panels.append(p2);

    root.append(panels);
  }



  // Security Hardening: Wrap renderDashboardView with strict Manager RBAC Check
  const origRenderDashboardView = renderDashboardView;
  function secureRenderDashboardView(root) {
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
        '<h3 style="margin:0 0 8px;">' + (ar ? 'لوحة التحليلات التنفيذية مخصصة للمدير العام فقط' : 'Executive Dashboard Access Restricted') + '</h3>' +
        '<p style="color:var(--ink2);font-size:0.85rem;margin:0 0 16px;">' +
        (ar ? 'هذه الصفحة تحتوي على تحليلات مالية وتقارير التالف وحصص التبس المخصصة للمدير.' : 'This view contains sensitive financial and inventory telemetry.') +
        '</p>' +
        '<button type="button" class="btn primary" onclick="FOH.navigation.switchView(\'opening\')">' +
        (ar ? 'الرجوع إلى شيت الشفت' : 'Back to Shift Sheet') +
        '</button>';
      root.append(card);
      return;
    }
    origRenderDashboardView(root);
  }

  FOH.dashboardView = {
    renderDashboardView: secureRenderDashboardView,
  };
})(window.FOH = window.FOH || {});
