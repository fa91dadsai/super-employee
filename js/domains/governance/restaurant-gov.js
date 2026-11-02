// foh-opening/js/domains/governance/restaurant-gov.js
// Enterprise Restaurant Governance, Staff Seed Data & Health Certificate Engine
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const GOV_KEY = 'super-employee.gov.v1';
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function hasSuperPerm(p) {
    return FOH.roleIdentity ? FOH.roleIdentity.hasSuperPerm(p) : true;
  }

  // ---- 1. Governance & Restaurant Settings ----
  function defaultGov() {
    return {
      restaurantName: 'CEEN',
      restaurantNameAr: 'CEEN',
      shortBrand: 'CEEN',
      preferEnglishBrand: true,
      tenantId: 'ceen',
      tenantSchema: 't_ceen',
      branchName: 'Amman Main',
      checklistLocked: false,
      lockedBy: '',
      lockedAt: '',
      editorUsernames: ['fadi', 'ali'],
      tipsVisibility: {
        enabledForStaff: true,
        showPoints: true,
        showGrossShare: true,
        showWithdrawals: true,
        showNetRemaining: true,
        showWorkedDays: true,
        showTotalPool: false,
      },
    };
  }

  function loadGov() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(GOV_KEY), 'null');
      const d = defaultGov();
      if (!raw || typeof raw !== 'object') return d;
      return {
        ...d,
        ...raw,
        preferEnglishBrand: raw.preferEnglishBrand !== undefined ? !!raw.preferEnglishBrand : true,
        restaurantName: raw.restaurantName || d.restaurantName,
        restaurantNameAr: raw.restaurantNameAr || raw.restaurantName || d.restaurantName,
        shortBrand: raw.shortBrand || raw.restaurantName || d.shortBrand,
        tenantId: raw.tenantId || d.tenantId,
        tenantSchema: raw.tenantSchema || d.tenantSchema,
        branchName: raw.branchName || d.branchName,
        tipsVisibility: { ...d.tipsVisibility, ...(raw.tipsVisibility || {}) },
        editorUsernames: Array.isArray(raw.editorUsernames) ? raw.editorUsernames : d.editorUsernames,
      };
    } catch {
      return defaultGov();
    }
  }

  function saveGov(gov) {
    try {
      localStorage.setItem(GOV_KEY, JSON.stringify(gov));
    } catch {}
  }

  // ---- 2. Seed Default Health Certificates & Permissions on Staff ----
  function ensureStaffHealthAndPerms() {
    const gov = loadGov();
    const defaultsByName = {
      fadi: { no: 'HC-2026-101', exp: '2027-06-30', edit: true, nickname: 'Fadi', phone: '+962 7 9000 1001', email: 'fadi.m@ceenlounge.com', inviteCode: 'CEEN-1001' },
      ali: { no: 'HC-2026-104', exp: '2027-04-15', edit: true, nickname: 'Ali', phone: '+962 7 9000 2002', email: 'ali.h@ceenlounge.com', inviteCode: 'CEEN-2002' },
      sara: { no: 'HC-2026-209', exp: '2026-11-12', edit: false, nickname: 'Sara', phone: '+962 7 9000 3003', email: 'sara.k@ceenlounge.com', inviteCode: 'CEEN-3003' },
      maher: { no: 'HC-2025-882', exp: '2026-10-25', edit: false, nickname: 'Leo', phone: '+962 7 9000 4004', email: 'maher.z@ceenlounge.com', inviteCode: 'CEEN-4004' },
    };
    let changed = false;
    (S.tpl.staff || []).forEach((p) => {
      const key = (p.name || '').toLowerCase().split(' ')[0];
      const def = defaultsByName[key];
      if (def) {
        if (!p.healthCertNo) { p.healthCertNo = def.no; changed = true; }
        if (!p.healthCertExpiry) { p.healthCertExpiry = def.exp; changed = true; }
        if (!p.nickname) { p.nickname = def.nickname; changed = true; }
        if (!p.phone) { p.phone = def.phone; changed = true; }
        if (!p.email) { p.email = def.email; changed = true; }
        if (!p.inviteCode) { p.inviteCode = def.inviteCode; changed = true; }
        if (typeof p.canEditChecklist !== 'boolean') {
          p.canEditChecklist = gov.editorUsernames.includes(key) || def.edit;
          changed = true;
        }
      } else {
        if (!p.inviteCode) {
          p.inviteCode = 'CEEN-' + Math.floor(1000 + Math.random() * 9000);
          changed = true;
        }
        if (!p.nickname && p.name) {
          p.nickname = p.name.split(' ')[0];
          changed = true;
        }
      }
    });
    if (changed) FOH.store.saveTemplate(S.tpl);
  }
  FOH.ensureStaffHealthAndPerms = ensureStaffHealthAndPerms;

  function canCurrentUserEditChecklist() {
    const sess = getSession();
    const gov = loadGov();
    if (S.previewEmployee) return false;
    const isMgr = !sess || !!sess.isManager;
    if (gov.checklistLocked && !isMgr) return false;
    if (isMgr) return !gov.checklistLocked;
    const uname = (sess.username || '').toLowerCase();
    const staffRec = (S.tpl.staff || []).find(
      (p) => p.id === sess.staffId || (p.name || '').toLowerCase().startsWith(uname)
    );
    return hasSuperPerm('canEditChecklist') || (staffRec && !!staffRec.canEditChecklist) || gov.editorUsernames.includes(uname);
  }

  // ---- 3. Health Certificate Expiry Engine & Proactive Banner ----
  function calcDaysLeft(isoDate) {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
    const today = FOH.time.todayISO();
    const d1 = new Date(isoDate + 'T00:00:00');
    const d0 = new Date(today + 'T00:00:00');
    return Math.ceil((d1 - d0) / 86400000);
  }

  function getHealthAlerts() {
    ensureStaffHealthAndPerms();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const alerts = [];
    const today = FOH.time.todayISO();
    const nowMin = Number(FOH.time.nowHM().slice(0, 2)) * 60 + Number(FOH.time.nowHM().slice(3));

    (S.tpl.staff || []).filter((p) => p.active !== false).forEach((p) => {
      const isMe = sess && (p.id === sess.staffId || (p.name || '').toLowerCase().startsWith((sess.username || '').toLowerCase()));
      if (!isMgr && !isMe) return;
      if (!p.healthCertExpiry) return;
      const snoozeId = 'hcert_' + p.id;
      if (FOH.reminders && FOH.reminders.isSnoozed && FOH.reminders.isSnoozed(snoozeId, today, nowMin)) return;
      const days = calcDaysLeft(p.healthCertExpiry);
      const lead = Number.isInteger(p.healthCertRemindDays) ? p.healthCertRemindDays : 30;
      if (days !== null && days <= lead) {
        alerts.push({
          staff: p,
          isMe: !!isMe,
          days,
          expired: days < 0,
          snoozeId,
        });
      }
    });
    alerts.sort((a, b) => a.days - b.days);
    return alerts;
  }

  function renderHealthBanner() {
    const box = $('healthAlertBanner');
    if (!box) return;
    if (S.editing) {
      box.hidden = true;
      return;
    }
    const alerts = getHealthAlerts();
    if (!alerts.length) {
      box.hidden = true;
      return;
    }
    const top = alerts[0];
    box.hidden = false;
    box.className = 'health-banner' + (top.expired ? ' expired' : '');
    box.replaceChildren();

    const ar = isAr();
    const msg = el('div', '');
    const statusTxt = top.expired
      ? (ar ? '🚨 تنبيه الشهادة الصحية: شهادة (' + top.staff.name + ') منتهية منذ ' + Math.abs(top.days) + ' يوم (' + top.staff.healthCertExpiry + ')!' : '🚨 Health Certificate Expired: ' + top.staff.name + ' expired ' + Math.abs(top.days) + 'd ago (' + top.staff.healthCertExpiry + ')!')
      : (ar ? '⚠️ تنبيه الشهادة الصحية: شهادة (' + top.staff.name + ') تنتهي خلال ' + top.days + ' يوم (' + top.staff.healthCertExpiry + ')' : '⚠️ Health Certificate Warning: ' + top.staff.name + ' expires in ' + top.days + ' days (' + top.staff.healthCertExpiry + ')');
    msg.innerHTML = '<b>' + statusTxt + '</b>' + (alerts.length > 1 ? (ar ? ' <small>(+' + (alerts.length - 1) + ' تنبيه آخر)</small>' : ' <small>(+' + (alerts.length - 1) + ' more)</small>') : '');

    const acts = el('div', 'health-banner-actions');
    const sess = getSession();
    const isMgr = !!(sess && sess.isManager);
    let actionBtn;
    if (isMgr) {
      const targetName = (top.staff && top.staff.name) || '';
      actionBtn = el(
        'button',
        'snooze-btn done-now',
        ar ? (targetName ? '📅 تحديث شهادة (' + targetName + ')' : '📅 تحديث الشهادة (مدير)') : (targetName ? '📅 Update (' + targetName + ')' : '📅 Update Expiry (Manager)')
      );
      actionBtn.type = 'button';
      actionBtn.addEventListener('click', () => {
        if (top.staff && top.staff.id) {
          S.selectedHealthStaffId = top.staff.id;
        }
        S.view = 'profile';
        FOH.app.render();
      });
    } else {
      actionBtn = el('button', 'snooze-btn done-now', ar ? '🏥 إشعار الإدارة بالتجديد' : '🏥 Notify Manager');
      actionBtn.type = 'button';
      actionBtn.addEventListener('click', () => {
        if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
          FOH.cloudRealtime.broadcast('HEALTH_CERT_RENEWAL_REQUEST', {
            by: (sess && sess.displayName) || S.me.name || 'Staff',
            at: FOH.time.nowHM(),
          });
        }
        FOH.edit.toast(ar ? 'تم إرسال إشعار لإدارة المطعم لمراجعة وتحديث الشهادة الصحية ✓' : 'Management notified of renewal request ✓');
        if (FOH.reminders && FOH.reminders.snoozeItems) {
          FOH.reminders.snoozeItems(alerts.map((a) => a.snoozeId), FOH.time.todayISO(), FOH.time.nowHM(), 1440);
        }
        renderHealthBanner();
      });
    }

    const snz1h = el('button', 'snooze-btn', ar ? '💤 تأجيل ١س' : '💤 +1h');
    snz1h.type = 'button';
    snz1h.addEventListener('click', () => {
      if (FOH.reminders && FOH.reminders.snoozeItems) {
        FOH.reminders.snoozeItems(alerts.map((a) => a.snoozeId), FOH.time.todayISO(), FOH.time.nowHM(), 60);
      }
      renderHealthBanner();
    });

    const snzDay = el('button', 'snooze-btn', ar ? '🔕 كتم اليوم' : '🔕 Mute Today');
    snzDay.type = 'button';
    snzDay.addEventListener('click', () => {
      if (FOH.reminders && FOH.reminders.snoozeItems) {
        FOH.reminders.snoozeItems(alerts.map((a) => a.snoozeId), FOH.time.todayISO(), FOH.time.nowHM(), 1440);
      }
      renderHealthBanner();
    });

    acts.append(actionBtn, snz1h, snzDay);
    box.append(msg, acts);
  }



  FOH.gov = {
    defaultGov,
    loadGov,
    saveGov,
    ensureStaffHealthAndPerms,
    canCurrentUserEditChecklist,
    calcDaysLeft,
    getHealthAlerts,
    renderHealthBanner,
  };

  FOH.ensureStaffHealthAndPerms = ensureStaffHealthAndPerms;
})(window.FOH = window.FOH || {});
