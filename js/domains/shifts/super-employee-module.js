// ============================================================================
// SUPER EMPLOYEE MODULE (v8):
// - Hamburger ☰ Sidebar Drawer + Focused Single-Section Navigation
// - Restaurant Branding ("CEEN Restaurant & Lounge" — customizable)
// - Health Certificate Expiry Tracking & Proactive Alert Banner with Snooze
// - Checklist Governance: Manager Lock, Per-Employee Edit Permission,
//   Employee Checklist Suggestions & Item-Level Notes
// - Tip Manager Integration: Points, Worked Days, Gross/Net Share, Advances,
//   and Manager Visibility Controls in Settings
// - Executive Dashboard & Analytics (Mobile + Laptop Wide View)
// ============================================================================
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { el } = FOH.view;

  const GOV_KEY = 'super-employee.gov.v1';
  const SUG_KEY = 'super-employee.suggestions.v1';
  const NOTES_KEY = 'super-employee.itemNotes.v1';
  const TIPS_KEY = 'super-employee.tips.v1';
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
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
      actionBtn = el('button', 'snooze-btn done-now', ar ? '📅 تحديث التاريخ (مدير)' : '📅 Update Expiry (Manager)');
      actionBtn.type = 'button';
      actionBtn.addEventListener('click', () => {
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

  // ---- 4. Checklist Suggestions & Item Notes ----
  function loadSuggestions() {
    try {
      const list = FOH.safeJsonParse(localStorage.getItem(SUG_KEY), 'null');
      if (Array.isArray(list)) return list;
    } catch {}
    return [
      {
        id: 'sug_demo_1',
        by: 'Sara (Waiter)',
        role: 'Waiter',
        kind: 'add',
        sectionId: (S.tpl.sections[0] && S.tpl.sections[0].id) || '',
        text: 'Check terrace heaters gas level before 16:00',
        textAr: 'فحص مستوى الغاز في دفايات التراس قبل الساعة 4:00 عصرًا',
        note: 'الطقس أصبح باردًا مساءً في التراس',
        at: FOH.time.todayISO() + ' 11:20',
        status: 'pending',
      },
    ];
  }

  function saveSuggestions(list) {
    try {
      localStorage.setItem(SUG_KEY, JSON.stringify(list));
    } catch {}
  }

  function loadItemNotes() {
    try {
      return FOH.safeJsonParse(localStorage.getItem(NOTES_KEY), '{}');
    } catch {
      return {};
    }
  }

  function saveItemNotes(map) {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(map));
    } catch {}
  }

  function renderChecklistGovBar() {
    const bar = $('checklistGovBar');
    if (!bar) return;
    if (S.editing || S.view !== 'opening') {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    bar.replaceChildren();

    const ar = isAr();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const gov = loadGov();
    const canEdit = canCurrentUserEditChecklist();
    const sugs = loadSuggestions().filter((s) => s.status === 'pending');

    const topWrap = el('div', '');
    topWrap.style.width = '100%';
    topWrap.style.display = 'flex';
    topWrap.style.alignItems = 'center';
    topWrap.style.justifyContent = 'space-between';
    topWrap.style.flexWrap = 'wrap';
    topWrap.style.gap = '8px';

    const status = el('div', 'gov-status');
    if (gov.checklistLocked) {
      status.innerHTML = ar
        ? '🔒 <span>الشيك ليست مقفلة من المدير (' + (gov.lockedBy || 'Supervisor') + ')</span>'
        : '🔒 <span>Checklist Locked by Manager (' + (gov.lockedBy || 'Supervisor') + ')</span>';
    } else if (canEdit) {
      status.innerHTML = ar
        ? '🔓 <span>الشيك ليست مفتوحة · لديك صلاحية التعديل المباشر</span>'
        : '🔓 <span>Checklist Unlocked · You have edit permission</span>';
    } else {
      status.innerHTML = ar
        ? '🛡️ <span>وضع التنفيذ للموظف · يمكنك إضافة ملاحظات أو اقتراح تعديل</span>'
        : '🛡️ <span>Staff Execution Mode · Add notes or suggest edits</span>';
    }

    const actions = el('div', 'gov-actions');

    const sugBtn = el('button', 'gov-btn primary', ar ? '💡 اقتراح تعديل / إضافة مهمة' : '💡 Suggest Checklist Edit');
    sugBtn.type = 'button';
    sugBtn.addEventListener('click', () => openSuggestionModal());
    actions.append(sugBtn);

    if (canEdit && !gov.checklistLocked) {
      const editBtn = el('button', 'gov-btn', ar ? '✎ تعديل بنود الشيك ليست' : '✎ Edit Checklist');
      editBtn.type = 'button';
      editBtn.addEventListener('click', () => {
        S.editing = true;
        FOH.app.render();
      });
      actions.append(editBtn);
    }

    if (isMgr) {
      const lockBtn = el(
        'button',
        'gov-btn' + (gov.checklistLocked ? ' warn' : ''),
        gov.checklistLocked
          ? (ar ? '🔓 فتح قفل الشيك ليست' : '🔓 Unlock Checklist')
          : (ar ? '🔒 قفل الشيك ليست' : '🔒 Lock Checklist')
      );
      lockBtn.type = 'button';
      lockBtn.addEventListener('click', () => {
        gov.checklistLocked = !gov.checklistLocked;
        gov.lockedBy = (sess && sess.displayName) || 'Supervisor';
        gov.lockedAt = FOH.time.nowHM();
        if (gov.checklistLocked) S.editing = false;
        saveGov(gov);
        FOH.edit.toast(
          gov.checklistLocked
            ? (ar ? 'تم قفل الشيك ليست بنجاح 🔒' : 'Checklist locked 🔒')
            : (ar ? 'تم فتح قفل الشيك ليست 🔓' : 'Checklist unlocked 🔓')
        );
        FOH.app.render();
      });
      actions.append(lockBtn);

      const permBtn = el('button', 'gov-btn', ar ? '⚙️ صلاحيات الموظفين' : '⚙️ Staff Permissions');
      permBtn.type = 'button';
      permBtn.addEventListener('click', () => {
        S.view = 'settings';
        FOH.app.render();
      });
      actions.append(permBtn);
    }

    topWrap.append(status, actions);
    bar.append(topWrap);

    if (sugs.length > 0 && isMgr) {
      const qBox = el('div', 'sug-card');
      qBox.style.width = '100%';
      qBox.style.marginTop = '8px';
      qBox.style.marginBottom = '0';
      qBox.append(
        el('b', '', ar ? '📥 اقتراحات وملاحظات الموظفين لتعديل الشيك ليست (' + sugs.length + ')' : '📥 Pending Staff Checklist Suggestions (' + sugs.length + ')')
      );
      sugs.forEach((sg) => {
        const row = el('div', 'sug-item');
        const info = el('div', '');
        info.style.flex = '1';
        const secObj = S.tpl.sections.find((s) => s.id === sg.sectionId) || S.tpl.sections[0];
        const secTitle = secObj ? FOH.view.sectionName(secObj) : '';
        info.innerHTML =
          '<b>' + (sg.kind === 'add' ? '➕ ' : '✏️ ') + (ar ? sg.textAr || sg.text : sg.text || sg.textAr) + '</b>' +
          '<small style="display:block;color:var(--ink2);margin-top:2px;">👤 ' + sg.by + ' · 📂 ' + secTitle + ' · 🕒 ' + sg.at + (sg.note ? ' · 💬 ' + sg.note : '') + '</small>';
        const btns = el('div', 'gov-actions');
        const appBtn = el('button', 'gov-btn primary', ar ? '✓ موافقة وإضافة للقائمة' : '✓ Approve & Add');
        appBtn.type = 'button';
        appBtn.addEventListener('click', () => {
          const targetSec = S.tpl.sections.find((s) => s.id === sg.sectionId) || S.tpl.sections[0];
          if (targetSec) {
            targetSec.items.push({
              id: FOH.store.uid(),
              text: sg.text || sg.textAr,
              textAr: sg.textAr || sg.text,
              due: '',
              remindBefore: null,
              role: '',
              children: [],
            });
            FOH.store.saveTemplate(S.tpl);
            if (typeof notifyMobileOnNewTaskAdded === "function") notifyMobileOnNewTaskAdded({ titleEn: sg.text || sg.textAr, titleAr: sg.textAr || sg.text, sectionLabel: secTitle, roleLabel: sg.by });
          }
          const allSugs = loadSuggestions();
          const found = allSugs.find((x) => x.id === sg.id);
          if (found) found.status = 'approved';
          saveSuggestions(allSugs);
          FOH.edit.toast(ar ? 'تمت الموافقة وإضافة المهمة إلى الشيك ليست ✓' : 'Suggestion approved and added to checklist ✓');
          FOH.app.render();
        });
        const rejBtn = el('button', 'gov-btn', ar ? '✕ رفض' : '✕ Reject');
        rejBtn.type = 'button';
        rejBtn.addEventListener('click', () => {
          const allSugs = loadSuggestions();
          const found = allSugs.find((x) => x.id === sg.id);
          if (found) found.status = 'rejected';
          saveSuggestions(allSugs);
          FOH.app.render();
        });
        btns.append(appBtn, rejBtn);
        row.append(info, btns);
        qBox.append(row);
      });
      bar.append(qBox);
    }
  }

  function openSuggestionModal() {
    const ar = isAr();
    const sess = getSession();
    let dlg = $('suggestDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'suggestDialog';
      document.body.append(dlg);
    }
    dlg.replaceChildren();
    const form = el('form', '');
    form.method = 'dialog';
    form.append(
      el('div', 'grab'),
      el('h2', '', ar ? '💡 اقتراح تعديل أو إضافة ملاحظة للشيك ليست' : '💡 Suggest Checklist Change or Note')
    );

    const secLbl = el('label', '', ar ? 'القسم (Section)' : 'Section');
    const secSel = el('select', 'in');
    S.tpl.sections.forEach((s) => {
      const o = el('option', '', s.icon + ' ' + FOH.view.sectionName(s));
      o.value = s.id;
      secSel.append(o);
    });
    secLbl.append(secSel);

    const kindLbl = el('label', '', ar ? 'نوع الاقتراح' : 'Suggestion Type');
    const kindSel = el('select', 'in');
    [
      ['add', ar ? '➕ اقتراح إضافة مهمة جديدة للشيك ليست' : '➕ Suggest adding a new checklist task'],
      ['edit', ar ? '✏️ اقتراح تعديل مهمة حالية' : '✏️ Suggest modifying an existing task'],
      ['note', ar ? '💬 ملاحظة ميدانية للمدير حول الشفت' : '💬 General shift note for Manager'],
    ].forEach(([v, txt]) => {
      const o = el('option', '', txt);
      o.value = v;
      kindSel.append(o);
    });
    kindLbl.append(kindSel);

    const txtArLbl = el('label', '', ar ? 'نص المهمة المقترحة / التعديل (عربي أو إنجليزي)' : 'Suggested Task / Change Text');
    const txtArIn = el('textarea', 'in');
    txtArIn.rows = 2;
    txtArIn.placeholder = ar ? 'مثال: التأكد من تشغيل دفايات التراس قبل الساعة 4:00...' : 'e.g. Check terrace heaters before 16:00...';
    txtArLbl.append(txtArIn);

    const noteLbl = el('label', '', ar ? 'السبب أو ملاحظة إضافية للمدير' : 'Reason or Additional Note');
    const noteIn = el('input', 'in');
    noteIn.placeholder = ar ? 'لماذا تقترح هذا التعديل؟' : 'Why is this helpful?';
    noteLbl.append(noteIn);

    const actions = el('div', 'sheet-actions');
    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.addEventListener('click', () => dlg.close());

    const submitB = el('button', 'btn primary', ar ? '📤 إرسال الاقتراح للمدير' : '📤 Submit Suggestion');
    submitB.type = 'button';
    submitB.addEventListener('click', () => {
      const val = txtArIn.value.trim();
      if (!val) return txtArIn.focus();
      const list = loadSuggestions();
      list.unshift({
        id: 'sug_' + Date.now(),
        by: (sess && sess.displayName) || S.me.name || 'Staff',
        role: (sess && sess.roleName) || 'Staff',
        kind: kindSel.value,
        sectionId: secSel.value,
        text: val,
        textAr: val,
        note: noteIn.value.trim(),
        at: FOH.time.todayISO() + ' ' + FOH.time.nowHM(),
        status: 'pending',
      });
      saveSuggestions(list);
      dlg.close();
      FOH.edit.toast(ar ? 'تم إرسال اقتراحك للمدير للمراجعة والاعتماد ✓' : 'Suggestion sent to Manager for review ✓');
      FOH.app.render();
    });

    actions.append(cancelB, submitB);
    form.append(secLbl, kindLbl, txtArLbl, noteLbl, actions);
    dlg.append(form);
    dlg.showModal();
  }

  function injectChecklistItemNotes() {
    if (S.editing || S.view !== 'opening') return;
    const notesMap = loadItemNotes();
    const dateKey = S.date;
    const ar = isAr();
    const sess = getSession();

    document.querySelectorAll('#sections li.item').forEach((li) => {
      const cb = li.querySelector('input.ck[data-id]');
      const tx = li.querySelector('.tx');
      if (!cb || !tx) return;
      const itemId = cb.dataset.id;
      const noteKey = dateKey + '|' + itemId;
      const existing = notesMap[noteKey];

      let chip = tx.querySelector('.item-note-chip');
      if (!chip) {
        chip = el('button', 'item-note-chip' + (existing ? ' has-note' : ''), existing ? (ar ? '💬 تعديل الملاحظة' : '💬 Edit note') : (ar ? '💬 +ملاحظة' : '💬 +Note'));
        chip.type = 'button';
        chip.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentTxt = (notesMap[noteKey] && notesMap[noteKey].text) || '';
          const input = prompt(ar ? 'أضف ملاحظة ميدانية على هذه المهمة (اتركها فارغة للمسح):' : 'Add a shift note for this task (leave empty to clear):', currentTxt);
          if (input === null) return;
          if (!input.trim()) {
            delete notesMap[noteKey];
          } else {
            notesMap[noteKey] = {
              text: input.trim(),
              by: (sess && sess.displayName) || S.me.name || 'Staff',
              at: FOH.time.nowHM(),
            };
          }
          saveItemNotes(notesMap);
          FOH.app.render();
        });
        tx.append(chip);
      }

      let disp = tx.querySelector('.item-note-display');
      if (existing && existing.text) {
        if (!disp) {
          disp = el('span', 'item-note-display');
          tx.append(disp);
        }
        disp.textContent = '💬 ' + existing.text + ' — (' + existing.by + ' · ' + existing.at + ')';
      } else if (disp) {
        disp.remove();
      }
    });
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

  // ---- 8. Manager Settings & Granular Permissions View (#settingsView) ----
  function renderSettingsView(root) {
    if (!root) return;
    root.replaceChildren();
    const ar = isAr();
    const gov = loadGov();
    ensureStaffHealthAndPerms();

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
    root.append(brandCard);

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
    root.append(permCard);

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
    root.append(tipsCfgCard);

    // Staff Directory & Activation Codes Card
    const staffDirCard = el('section', 'card');
    staffDirCard.style.padding = '16px';
    staffDirCard.append(
      el('h3', '', '👥 ' + (ar ? 'دليل الموظفين وأكواد التفعيل (Staff Directory & Activation Codes)' : 'Staff Directory & Activation Codes')),
      el('p', 'setting-note', ar ? 'أكواد التفعيل المخصصة لتسجيل دخول الموظفين الجدد وربط الـ Nicknames مع التبس وجدول الشفتات.' : 'Unique activation codes for staff onboarding, synced with tips and weekly roster.')
    );

    const pendingStaff = (S.tpl.staff || []).filter((p) => p.pendingNameChange && p.pendingNameChange.status === 'pending');
    if (pendingStaff.length > 0) {
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
      staffDirCard.append(pBlock);
    }

    const sList = el('div', 'pac-list');
    (S.tpl.staff || []).forEach((st) => {
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
      sList.append(it);
    });
    staffDirCard.append(sList);
    root.append(staffDirCard);
  }

  
  // ---- 10. Menu & Beverage Academy + 3-Choice Verification Quiz & Tip Bonus ----
  const ACAD_KEY = 'super-employee.academy.v1';
  const ACAD_PROG_KEY = 'super-employee.acadProgress.v1';

  const DEFAULT_ACADEMY_ITEMS = [
    {
      id: 'dish_wagyu',
      cat: 'food',
      catLabelAr: '🥩 الأطباق الرئيسية',
      catLabelEn: '🥩 Main Dishes',
      nameAr: 'ستيك واغيو تندرلوين (Wagyu Tenderloin 250g)',
      nameEn: 'Wagyu Tenderloin Steak (250g)',
      descAr: 'قطعة تندرلوين واغيو أسترالي فاخرة (درجة رخامية MB7+) تُشوى على فحم السنديان وتُقدّم مع بيوريه البطاطا بالكمأة السوداء وصوص الديمي غلاس.',
      descEn: 'Charcoal-grilled Australian Wagyu Tenderloin (MB7+), served with black truffle potato purée and rich demi-glace.',
      ingredientsAr: 'لحم واغيو 250 غرام، زبدة الأعشاب، بيوريه بطاطا بالكمأة، فطر بري، صوص ديمي غلاس.',
      allergensAr: '⚠️ الحليب ومشتقات الألبان (الزبدة والبيوريه)، الكرفس (في الديمي غلاس). خالٍ من المكسرات.',
      pairingAr: '💡 اقترح معه كأس نبيذ أحمر Cabernet Sauvignon أو كوكتيل Smoky Old Fashioned، درجة الاستواء الموصى بها: Medium Rare.',
      questions: [
        {
          qAr: 'ما هي درجة الاستواء الموصى بها والمكونات المرافقة لطبق الواغيو تندرلوين؟',
          qEn: 'What is the recommended doneness and side for the Wagyu Tenderloin?',
          options: [
            'Medium Rare مع بيوريه البطاطا بالكمأة السوداء وصوص الديمي غلاس',
            'Well Done مع بطاطا مقلية وصوص الفلفل الأبيض',
            'Rare مع أرز بسمتي وصوص الليمون والزبدة',
          ],
          correct: 0,
        },
        {
          qAr: 'ما هي مسببات الحساسية الموجودة في طبق الواغيو تندرلوين؟',
          qEn: 'Which allergens are present in the Wagyu Tenderloin dish?',
          options: [
            'الفول السوداني والسمسم والسمك',
            'مشتقات الألبان (الزبدة والبيوريه) والكرفس في صوص الديمي غلاس',
            'البيض والمحار البحري والصويا',
          ],
          correct: 1,
        },
      ],
    },
    {
      id: 'dish_burrata',
      cat: 'food',
      catLabelAr: '🥗 المقبلات والسلطات',
      catLabelEn: '🥗 Starters & Salads',
      nameAr: 'سلطة البوراتا الإيطالية مع التين والبيستو (Burrata & Fig)',
      nameEn: 'Artisanal Burrata with Fresh Figs & Pistachio Pesto',
      descAr: 'جبنة بوراتا إيطالية كريمية طازجة تُقدّم على طبقة من الطماطم الكرزية المشوية، التين الطازج، صوص البيستو بالفستق الحلبي، وبلسميك معتّق.',
      descEn: 'Creamy Italian Burrata over roasted cherry tomatoes, fresh figs, pistachio basil pesto, and aged balsamic glaze.',
      ingredientsAr: 'جبنة بوراتا 150 غ، تين طازج، طماطم كرزية، ريحان، فستق حلبي، زيت زيتون بكر، بلسميك.',
      allergensAr: '⚠️ الألبان (جبنة البوراتا) والمكسرات (الفستق الحلبي في صوص البيستو). مناسب للنباتيين (Vegetarian).',
      pairingAr: '💡 مثالي للمشاركة في بداية الوجبة مع نبيذ أبيض Pinot Grigio أو البروسيكو (Prosecco).',
      questions: [
        {
          qAr: 'أي نوع مكسرات يدخل في تحضير صوص البيستو في سلطة البوراتا (مهم لحساسية المكسرات)؟',
          qEn: 'Which nut is used in the Burrata salad pesto (critical for nut allergies)?',
          options: [
            'اللوز المحمص',
            'الفستق الحلبي (Pistachio)',
            'الكاجو والجوز',
          ],
          correct: 1,
        },
        {
          qAr: 'ما هو المشروب الأنسب لاقتراحه (Pairing) مع سلطة البوراتا الإيطالية؟',
          qEn: 'What is the best beverage pairing to recommend with the Burrata salad?',
          options: [
            'Pinot Grigio أو Prosecco بارد',
            'قهوة إسبريسو داكنة',
            'ستوت بيرة ثقيلة (Dark Stout)',
          ],
          correct: 0,
        },
      ],
    },
    {
      id: 'drink_ceen_mule',
      cat: 'drink',
      catLabelAr: '🍸 الكوكتيلات والمشروبات',
      catLabelEn: '🍸 Signature Cocktails & Bar',
      nameAr: 'كوكتيل سين سيجنتشر (CEEN Mediterranean Mule)',
      nameEn: 'CEEN Mediterranean Mule (Signature Cocktail)',
      descAr: 'كوكتيل منعش متوازن يجمع بين الفودكا الفاخرة، شراب التين والروزماري المحضّر منزلياً، عصير اللايم الطازج، وجنجر بير فوار.',
      descEn: 'Refreshing signature mule blending premium vodka, house-made fig & rosemary cordial, fresh lime juice, and spicy ginger beer.',
      ingredientsAr: '50 مل فودكا Tito’s، 20 مل شراب التين والروزماري، 15 مل عصير لايم طازج، يُستكمل بـ Ginger Beer في كأس نحاسي مع ثلج مجروش.',
      allergensAr: '⚠️ خالٍ من مسببات الحساسية الشائعة (يحتوي على كحول). متوفر بنسخة Virgin بدون كحول.',
      pairingAr: '💡 يُقدّم في الكأس النحاسي المبرد مع غصن روزماري مدخّن وشريحة تين مجفف.',
      questions: [
        {
          qAr: 'ما هي المقادير الأساسية لكوكتيل CEEN Mediterranean Mule؟',
          qEn: 'What are the core specs for the CEEN Mediterranean Mule?',
          options: [
            '50 مل فودكا + 20 مل شراب التين والروزماري + 15 مل لايم + جنجر بير',
            '60 مل جين + 30 مل فيرموث أحمر + كامباري',
            '45 مل تيكيلا + 30 مل تريبل سيك + عصير برتقال',
          ],
          correct: 0,
        },
        {
          qAr: 'كيف يُقدّم كوكتيل CEEN Mediterranean Mule وما هو الغارنيش المعتمد؟',
          qEn: 'How is the CEEN Mediterranean Mule served and garnished?',
          options: [
            'في كأس مارتيني زجاجي مع زيتونة خضراء',
            'في كأس نحاسي مبرد مع غصن روزماري مدخّن وشريحة تين',
            'في كأس نبيذ أحمر كبير بدون ثلج',
          ],
          correct: 1,
        },
      ],
    },
    {
      id: 'drink_smoky_negroni',
      cat: 'drink',
      catLabelAr: '🍸 الكوكتيلات والمشروبات',
      catLabelEn: '🍸 Signature Cocktails & Bar',
      nameAr: 'سموكي نيجروني المعتّق (CEEN Barrel-Aged Smoky Negroni)',
      nameEn: 'CEEN Barrel-Aged Smoky Negroni',
      descAr: 'نسخة CEEN الخاصة من كوكتيل النيجروني الكلاسيكي، معتّقة مع خشب البلوط المدخّن وقشر البرتقال المحروق.',
      descEn: 'Our signature twist on the classic Negroni, infused with toasted oak smoke and flamed orange peel.',
      ingredientsAr: '30 مل جين Hendrick’s، 30 مل Campari، 30 مل Sweet Vermouth، يُحرّك مع الثلج (Stirred) ويُقدّم فوق قالب ثلج صافي كبير (Clear Ice Cube).',
      allergensAr: '⚠️ يحتوي على الكبريتات (Sulfites) في الفيرموث.',
      pairingAr: '💡 مشروب مثالي قبل العشاء (Aperitif) أو بجانب أطباق اللحوم المشوية والواغيو.',
      questions: [
        {
          qAr: 'ما هي النسب الصحيحة وطريقة تحضير كوكتيل Smoky Negroni؟',
          qEn: 'What are the ratios and technique for the Smoky Negroni?',
          options: [
            'نسب متساوية (30 مل جين، 30 مل كامباري، 30 مل سويت فيرموث) ويُحرّك Stirred فوق ثلج صافي',
            '50 مل جين مع 100 مل تونيك ويُرجّ بالشاكر Shaken',
            '45 مل ويسكي مع بياض بيض وعصير ليمون',
          ],
          correct: 0,
        },
      ],
    },
  ];

  function loadAcademyCatalog() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(ACAD_KEY), 'null');
      if (Array.isArray(raw) && raw.length) return raw;
    } catch {}
    return DEFAULT_ACADEMY_ITEMS;
  }

  function saveAcademyCatalog(list) {
    try {
      localStorage.setItem(ACAD_KEY, JSON.stringify(list));
    } catch {}
  }

  function loadAcadProgress() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(ACAD_PROG_KEY), 'null');
      if (raw && typeof raw === 'object') return raw;
    } catch {}
    return {
      fadi: { xp: 140, masteredIds: ['dish_wagyu', 'dish_burrata', 'drink_ceen_mule'], studiedIds: ['dish_wagyu', 'dish_burrata', 'drink_ceen_mule'], quizAnswered: 14, quizCorrect: 13 },
      ali: { xp: 100, masteredIds: ['dish_wagyu', 'dish_burrata'], studiedIds: ['dish_wagyu', 'dish_burrata'], quizAnswered: 10, quizCorrect: 9 },
      sara: { xp: 60, masteredIds: ['dish_burrata'], studiedIds: ['dish_wagyu', 'dish_burrata'], quizAnswered: 6, quizCorrect: 5 },
      maher: { xp: 120, masteredIds: ['drink_ceen_mule', 'drink_smoky_negroni'], studiedIds: ['drink_ceen_mule', 'drink_smoky_negroni'], quizAnswered: 12, quizCorrect: 11 },
    };
  }

  function saveAcadProgress(prog) {
    try {
      localStorage.setItem(ACAD_PROG_KEY, JSON.stringify(prog));
    } catch {}
  }

  function getMyAcadRecord() {
    const sess = getSession();
    const uname = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
    const all = loadAcadProgress();
    if (!all[uname]) {
      all[uname] = { xp: 0, masteredIds: [], studiedIds: [], quizAnswered: 0, quizCorrect: 0 };
      saveAcadProgress(all);
    }
    return { uname, rec: all[uname], all };
  }

  // Sync Academy Bonus Tip Points into Tips DB (Every 100 XP = +5 Bonus Tip Points, up to +15 max)
  function syncAcademyBonusToTips(uname, xp) {
    const bonusPts = Math.min(15, Math.floor((xp || 0) / 100) * 5);
    const tipsDB = loadTipsData();
    if (tipsDB.staff && tipsDB.staff[uname]) {
      if (typeof tipsDB.staff[uname].basePoints !== 'number') {
        tipsDB.staff[uname].basePoints = tipsDB.staff[uname].points;
      }
      tipsDB.staff[uname].bonusPoints = bonusPts;
      tipsDB.staff[uname].points = tipsDB.staff[uname].basePoints + bonusPts;
      saveTipsData(tipsDB);
    }
    return bonusPts;
  }

  let acadCatFilter = 'all';

  function renderAcademyView(root) {
    if (!root) return;
    root.replaceChildren();
    const ar = isAr();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const catalog = loadAcademyCatalog();
    const { uname, rec, all } = getMyAcadRecord();
    const masteredCount = catalog.filter((it) => rec.masteredIds.includes(it.id)).length;
    const masteryPct = catalog.length ? Math.round((masteredCount * 100) / catalog.length) : 0;
    const bonusPts = syncAcademyBonusToTips(uname, rec.xp);

    // Hero Card
    const hero = el('div', 'acad-hero');
    hero.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">' +
      '<div>' +
      '<h2>🎓 ' + (ar ? 'أكاديمية الأطباق والمشروبات والاختبار الذكي' : 'Menu & Beverage Academy + Quiz Arena') + '</h2>' +
      '<p>' + (ar ? 'ادرس تفاصيل ومكونات وحساسية كل صنف، ثم اجتز اختبار التحقق (٣ خيارات) لكسب نقاط XP ونقاط تبس إضافية!' : 'Study dishes & cocktails, pass the 3-choice verification quiz, and earn XP + Bonus Tip Points!') + '</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<span class="dayoff-badge approved" style="font-size:0.82rem;padding:6px 12px;">⭐ ' + rec.xp + ' XP</span>' +
      '<span class="dayoff-badge pending" style="font-size:0.82rem;padding:6px 12px;">💰 +' + bonusPts + ' ' + (ar ? 'نقطة تبس مكافأة' : 'Bonus Tip Pts') + '</span>' +
      '</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-top:12px;font-weight:700;">' +
      '<span>' + (ar ? 'مرحلة اكتمال التعليم وإتقان المنيو:' : 'Menu Mastery Progress:') + '</span>' +
      '<span>' + masteredCount + ' / ' + catalog.length + ' (' + masteryPct + '%)</span>' +
      '</div>' +
      '<div class="acad-progress-bar"><div style="width:' + masteryPct + '%"></div></div>';

    const heroBtns = el('div', '');
    heroBtns.style.display = 'flex';
    heroBtns.style.flexWrap = 'wrap';
    heroBtns.style.gap = '8px';
    heroBtns.style.marginTop = '12px';

    const popQuizBtn = el('button', 'snooze-btn done-now', ar ? '⚡ ابدأ تحدي الأسئلة السريع (٣ خيارات + نقاط)' : '⚡ Start Quick 3-Choice Quiz (+XP)');
    popQuizBtn.type = 'button';
    popQuizBtn.style.minHeight = '38px';
    popQuizBtn.style.padding = '0 14px';
    popQuizBtn.style.fontSize = '0.82rem';
    popQuizBtn.addEventListener('click', () => openQuizModal(null));
    heroBtns.append(popQuizBtn);

    if (isMgr) {
      const addDishBtn = el('button', 'snooze-btn', ar ? '➕ إضافة طبق أو مشروب جديد للأكاديمية' : '➕ Add New Dish / Drink');
      addDishBtn.type = 'button';
      addDishBtn.style.minHeight = '38px';
      addDishBtn.addEventListener('click', () => openAddAcademyItemModal());
      heroBtns.append(addDishBtn);
    }
    hero.append(heroBtns);
    root.append(hero);

    // Filter Bar (All / Food / Drinks / Unfinished)
    const fBar = el('div', 'ord-view-switch');
    [
      ['all', ar ? 'الكل (' + catalog.length + ')' : 'All (' + catalog.length + ')'],
      ['food', ar ? '🍽 المأكولات والأطباق' : '🍽 Food Dishes'],
      ['drink', ar ? '🍸 المشروبات والبار' : '🍸 Drinks & Bar'],
      ['todo', ar ? '📖 غير مكتمل (' + (catalog.length - masteredCount) + ')' : '📖 To Master (' + (catalog.length - masteredCount) + ')'],
    ].forEach(([k, lbl]) => {
      const b = el('button', acadCatFilter === k ? 'on' : '', lbl);
      b.type = 'button';
      b.addEventListener('click', () => {
        acadCatFilter = k;
        renderAcademyView(root);
      });
      fBar.append(b);
    });
    root.append(fBar);

    // Dishes & Drinks Grid
    const grid = el('div', 'acad-grid');
    const filtered = catalog.filter((it) => {
      if (acadCatFilter === 'food') return it.cat === 'food';
      if (acadCatFilter === 'drink') return it.cat === 'drink';
      if (acadCatFilter === 'todo') return !rec.masteredIds.includes(it.id);
      return true;
    });

    filtered.forEach((item) => {
      const isMastered = rec.masteredIds.includes(item.id);
      const isStudied = rec.studiedIds.includes(item.id);
      const card = el('article', 'acad-item-card' + (isMastered ? ' mastered' : ''));

      const topRow = el('div', '');
      topRow.style.display = 'flex';
      topRow.style.justifyContent = 'space-between';
      topRow.style.alignItems = 'flex-start';
      topRow.style.gap = '8px';

      const statusBadge = isMastered
        ? '<span class="dayoff-badge approved">🎓 ' + (ar ? 'متقن ومعتمد ✓' : 'Mastered ✓') + '</span>'
        : isStudied
        ? '<span class="dayoff-badge pending">🎯 ' + (ar ? 'بانتظار اجتياز الاختبار' : 'Ready for Quiz') + '</span>'
        : '<span class="dayoff-badge">' + (ar ? '📖 قيد التعلم' : '📖 To Study') + '</span>';

      topRow.innerHTML =
        '<div><small style="color:var(--accent);font-weight:800;">' + (ar ? item.catLabelAr : item.catLabelEn) + '</small>' +
        '<h3 style="margin:2px 0;font-size:1.02rem;">' + (ar ? item.nameAr : item.nameEn) + '</h3></div>' +
        statusBadge;

      const desc = el('p', '');
      desc.style.margin = '2px 0';
      desc.style.fontSize = '0.84rem';
      desc.style.lineHeight = '1.5';
      desc.textContent = ar ? item.descAr : item.descEn;

      const meta = el('div', 'acad-meta-box');
      meta.innerHTML =
        '<div><b>🧾 ' + (ar ? 'المكونات والتحضير:' : 'Ingredients & Prep:') + '</b> ' + item.ingredientsAr + '</div>' +
        '<div style="margin-top:4px;"><b>' + item.allergensAr + '</b></div>' +
        '<div style="margin-top:4px;color:var(--accent);"><b>' + item.pairingAr + '</b></div>';

      const actRow = el('div', 'gov-actions');
      actRow.style.marginTop = 'auto';
      actRow.style.paddingTop = '6px';

      const verifyBtn = el(
        'button',
        'btn ' + (isMastered ? '' : 'primary'),
        isMastered
          ? (ar ? '🔄 إعادة اختبار الصنف (+XP)' : '🔄 Retake Item Quiz (+XP)')
          : (ar ? '✓ أتممت تعلّم هذا الصنف — اختبرني الآن!' : '✓ Mark Studied & Take Verification Quiz!')
      );
      verifyBtn.type = 'button';
      verifyBtn.style.width = '100%';
      verifyBtn.addEventListener('click', () => {
        if (!rec.studiedIds.includes(item.id)) {
          rec.studiedIds.push(item.id);
          saveAcadProgress(all);
        }
        openQuizModal(item);
      });
      actRow.append(verifyBtn);

      card.append(topRow, desc, meta, actRow);
      grid.append(card);
    });
    root.append(grid);
  }

  // Interactive 3-Option Quiz Modal (either for a specific item or general random challenge)
  function openQuizModal(targetItem) {
    const ar = isAr();
    const catalog = loadAcademyCatalog();
    const { uname, rec, all } = getMyAcadRecord();

    // Gather questions (3 choices each)
    let pool = [];
    if (targetItem && Array.isArray(targetItem.questions) && targetItem.questions.length) {
      pool = targetItem.questions.map((q) => ({ ...q, itemId: targetItem.id, itemName: ar ? targetItem.nameAr : targetItem.nameEn }));
    } else {
      catalog.forEach((it) => {
        (it.questions || []).forEach((q) => {
          pool.push({ ...q, itemId: it.id, itemName: ar ? it.nameAr : it.nameEn });
        });
      });
    }
    if (!pool.length) return;

    let idx = 0;
    let correctCount = 0;

    let dlg = $('acadQuizDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'acadQuizDialog';
      document.body.append(dlg);
    }

    function drawQuestion() {
      dlg.replaceChildren();
      const box = el('div', '');
      box.style.padding = '16px 18px 22px';

      if (idx >= pool.length) {
        const passedAll = correctCount === pool.length;
        const earnedXP = correctCount * 15 + (targetItem && passedAll ? 20 : 0);
        rec.xp = (rec.xp || 0) + earnedXP;
        rec.quizAnswered = (rec.quizAnswered || 0) + pool.length;
        rec.quizCorrect = (rec.quizCorrect || 0) + correctCount;
        if (targetItem && passedAll && !rec.masteredIds.includes(targetItem.id)) {
          rec.masteredIds.push(targetItem.id);
        }
        saveAcadProgress(all);
        const bonusPts = syncAcademyBonusToTips(uname, rec.xp);

        box.innerHTML =
          '<div style="text-align:center;padding:12px 0;">' +
          '<div style="font-size:2.6rem;">' + (passedAll ? '🏆' : '💡') + '</div>' +
          '<h2 style="margin:8px 0;">' +
          (passedAll
            ? (ar ? 'أحسنت! اجتزت الاختبار بنجاح 100%' : 'Excellent! You passed 100%!')
            : (ar ? 'نتيجة الاختبار: ' + correctCount + ' من ' + pool.length : 'Score: ' + correctCount + ' / ' + pool.length)) +
          '</h2>' +
          '<p style="color:var(--ink2);font-size:0.88rem;">' +
          (targetItem && passedAll
            ? (ar ? 'تم اعتماد إتقانك لصنف (' + (ar ? targetItem.nameAr : targetItem.nameEn) + ') وإضافة +' + earnedXP + ' XP لرصيدك!' : 'Item marked as Mastered and +' + earnedXP + ' XP added!')
            : (ar ? 'حصلت على +' + earnedXP + ' XP (إجمالي رصيدك: ' + rec.xp + ' XP · مكافأة التبس: +' + bonusPts + ' نقطة)' : 'Earned +' + earnedXP + ' XP (Total: ' + rec.xp + ' XP · Bonus Tip Pts: +' + bonusPts + ')')) +
          '</p>' +
          '</div>';

        const doneB = el('button', 'btn primary', ar ? '✓ العودة للأكاديمية وتحديث الرصيد' : '✓ Back to Academy');
        doneB.type = 'button';
        doneB.style.width = '100%';
        doneB.addEventListener('click', () => {
          dlg.close();
          FOH.app.render();
        });
        box.append(doneB);
        dlg.append(box);
        return;
      }

      const cur = pool[idx];
      box.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<span class="dayoff-badge pending">🎯 ' + (ar ? 'سؤال ' + (idx + 1) + ' من ' + pool.length : 'Question ' + (idx + 1) + ' of ' + pool.length) + '</span>' +
        '<small style="color:var(--ink2);font-weight:700;">' + cur.itemName + '</small>' +
        '</div>' +
        '<h3 style="margin:6px 0 12px;font-size:1.02rem;line-height:1.45;">' + (ar ? cur.qAr : cur.qEn || cur.qAr) + '</h3>';

      const optsWrap = el('div', '');
      const feedback = el('p', '');
      feedback.style.fontWeight = '700';
      feedback.style.fontSize = '0.84rem';
      feedback.style.marginTop = '10px';
      feedback.hidden = true;

      let answered = false;
      (cur.options || []).slice(0, 3).forEach((optText, optIndex) => {
        const b = el('button', 'quiz-opt-btn', (optIndex + 1) + '. ' + optText);
        b.type = 'button';
        b.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          const isRight = optIndex === cur.correct;
          if (isRight) {
            correctCount++;
            b.classList.add('correct');
            feedback.style.color = 'var(--accent)';
            feedback.textContent = ar ? '✅ إجابة صحيحة! (+15 XP)' : '✅ Correct answer! (+15 XP)';
          } else {
            b.classList.add('wrong');
            const allBtns = optsWrap.querySelectorAll('.quiz-opt-btn');
            if (allBtns[cur.correct]) allBtns[cur.correct].classList.add('correct');
            feedback.style.color = 'var(--danger)';
            feedback.textContent = ar ? '❌ إجابة غير دقيقة — راجع الخيار الصحيح باللون الأخضر.' : '❌ Not quite — check the highlighted correct option.';
          }
          feedback.hidden = false;
          nextBtn.hidden = false;
        });
        optsWrap.append(b);
      });

      const nextBtn = el('button', 'btn primary', idx + 1 < pool.length ? (ar ? 'السؤال التالي ←' : 'Next Question →') : (ar ? 'عرض النتيجة واعتماد النقاط 🏆' : 'See Result & Claim XP 🏆'));
      nextBtn.type = 'button';
      nextBtn.style.width = '100%';
      nextBtn.style.marginTop = '12px';
      nextBtn.hidden = true;
      nextBtn.addEventListener('click', () => {
        idx++;
        drawQuestion();
      });

      const cancelB = el('button', 'btn', ar ? 'إغلاق' : 'Close');
      cancelB.type = 'button';
      cancelB.style.width = '100%';
      cancelB.style.marginTop = '8px';
      cancelB.addEventListener('click', () => dlg.close());

      box.append(optsWrap, feedback, nextBtn, cancelB);
      dlg.append(box);
      if (typeof injectNewTasksInboxIntoNotifCenter === "function") injectNewTasksInboxIntoNotifCenter();
    }

    drawQuestion();
    dlg.showModal();
  }

  function openAddAcademyItemModal() {
    const ar = isAr();
    let dlg = $('addAcadDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'addAcadDialog';
      document.body.append(dlg);
    }
    dlg.replaceChildren();
    const form = el('form', '');
    form.method = 'dialog';
    form.innerHTML =
      '<div class="grab"></div>' +
      '<h2>➕ ' + (ar ? 'إضافة طبق أو مشروب جديد للأكاديمية مع سؤال الاختبار' : 'Add Dish / Drink & Verification Question') + '</h2>';

    const catSel = el('select', 'in');
    catSel.innerHTML =
      '<option value="food">🍽 ' + (ar ? 'طبق طعام (Food)' : 'Food Dish') + '</option>' +
      '<option value="drink">🍸 ' + (ar ? 'مشروب / كوكتيل بار (Drink)' : 'Bar Drink / Cocktail') + '</option>';

    const nameIn = el('input', 'in');
    nameIn.placeholder = ar ? 'اسم الطبق أو المشروب (مثال: ريزوتو الفطر البري)' : 'Item Name';

    const descIn = el('textarea', 'in');
    descIn.rows = 2;
    descIn.placeholder = ar ? 'التوصيف القصصي وطريقة تقديمه للزبون...' : 'Description & selling pitch...';

    const ingIn = el('input', 'in');
    ingIn.placeholder = ar ? 'المكونات الأساسية ومسببات الحساسية...' : 'Ingredients & allergens...';

    const qIn = el('input', 'in');
    qIn.placeholder = ar ? 'سؤال الاختبار لهذا الصنف...' : 'Verification question...';

    const opt1 = el('input', 'in');
    opt1.placeholder = ar ? 'الخيار ١ (الإجابة الصحيحة ✓)' : 'Option 1 (Correct Answer ✓)';
    const opt2 = el('input', 'in');
    opt2.placeholder = ar ? 'الخيار ٢ (خاطئ)' : 'Option 2 (Wrong)';
    const opt3 = el('input', 'in');
    opt3.placeholder = ar ? 'الخيار ٣ (خاطئ)' : 'Option 3 (Wrong)';

    const actions = el('div', 'sheet-actions');
    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.addEventListener('click', () => dlg.close());

    const saveB = el('button', 'btn primary', ar ? '💾 حفظ الصنف وسؤال الاختبار' : '💾 Save Item & Quiz');
    saveB.type = 'button';
    saveB.addEventListener('click', () => {
      if (!nameIn.value.trim() || !qIn.value.trim() || !opt1.value.trim()) return nameIn.focus();
      const list = loadAcademyCatalog();
      const isFood = catSel.value === 'food';
      list.unshift({
        id: 'acad_' + Date.now(),
        cat: catSel.value,
        catLabelAr: isFood ? '🍽 أطباق المنيو' : '🍸 مشروبات البار',
        catLabelEn: isFood ? '🍽 Menu Dishes' : '🍸 Bar Drinks',
        nameAr: nameIn.value.trim(),
        nameEn: nameIn.value.trim(),
        descAr: descIn.value.trim() || nameIn.value.trim(),
        descEn: descIn.value.trim() || nameIn.value.trim(),
        ingredientsAr: ingIn.value.trim() || 'حسب الوصفة المعتمدة',
        allergensAr: '⚠️ راجع دليل الحساسية مع الشيف / الكابتن',
        pairingAr: '💡 يُقدّم حسب معايير الخدمة المعتمدة في المطعم',
        questions: [
          {
            qAr: qIn.value.trim(),
            qEn: qIn.value.trim(),
            options: [opt1.value.trim(), opt2.value.trim() || 'خيار بديل ١', opt3.value.trim() || 'خيار بديل ٢'],
            correct: 0,
          },
        ],
      });
      saveAcademyCatalog(list);
      dlg.close();
      FOH.edit.toast(ar ? 'تمت إضافة الصنف وسؤال الاختبار إلى الأكاديمية ✓' : 'Item added to Academy ✓');
      FOH.app.render();
    });

    actions.append(cancelB, saveB);
    form.append(catSel, nameIn, descIn, ingIn, qIn, opt1, opt2, opt3, actions);
    dlg.append(form);
    dlg.showModal();
  }

    // ============================================================================
  // 11. Operational Hours, Shift Prep, Department Last Order, Closing Sheet
  //     by Department, "Close Restaurant (Last Guest)" Gate & Super Roles (v9)
  // ============================================================================
  const OPS_CFG_KEY = 'super-employee.opsConfig.v1';
  const OPS_DAY_PREFIX = 'super-employee.opsDay.v1.';

  const SUPER_ROLES_META = {
    super_manager: {
      id: 'super_manager',
      badge: '👑 Super Manager',
      labelAr: '👑 سوبر مانجر (Super Manager · مدير المطعم)',
      labelEn: '👑 Super Manager (Restaurant Manager)',
      dept: 'all',
    },
    super_captain: {
      id: 'super_captain',
      badge: '🎖️ Super Captain',
      labelAr: '🎖️ سوبر كابتن (Super Captain · كابتن الصالة)',
      labelEn: '🎖️ Super Captain (Floor Captain)',
      dept: 'floor',
    },
    super_bartender: {
      id: 'super_bartender',
      badge: '🍸 Super Bartender',
      labelAr: '🍸 سوبر بارتندر (Super Bartender · مسؤول البار)',
      labelEn: '🍸 Super Bartender (Head Bartender)',
      dept: 'bar',
    },
    super_waiter: {
      id: 'super_waiter',
      badge: '⭐ Super Waiter',
      labelAr: '⭐ سوبر ويتر (Super Waiter · ويتر متقدم)',
      labelEn: '⭐ Super Waiter (Senior Waiter)',
      dept: 'floor',
    },
    staff: {
      id: 'staff',
      badge: '👤 Staff',
      labelAr: '👤 موظف صالة / بار (Waiter / Bartender)',
      labelEn: '👤 Waiter / Bartender (Standard Staff)',
      dept: 'floor',
    },
  };

  const PERM_LABELS = [
    ['canCloseRestaurant', '🚪 إغلاق المطعم رسمياً (بعد الحد الأدنى / مع آخر زبون)', '🚪 Official Restaurant Close (After Min Time / Last Guest)'],
    ['canEarlyCloseOverride', '⚠️ كسر قفل الإغلاق المبكر قبل 2:00 ص (بسبب إلزامي)', '⚠️ Override Early-Close Lock before 02:00 AM (with reason)'],
    ['canTriggerLastOrder', '🔔 إعلان وتوثيق Last Order للمطبخ والبار', '🔔 Trigger & Log Kitchen / Bar Last Order'],
    ['canSignoffDeptClosing', '🌙 اعتماد وإغلاق الـ Closing Sheet الخاص بالقسم', '🌙 Sign off Department Closing Sheet'],
    ['canEditChecklist', '✎ تعديل وإضافة بنود الشيك ليست (Opening / Closing)', '✎ Edit Opening & Closing Checklist Items'],
    ['canSubmitOrders', '🛒 إنشاء وإرسال طلبيات البار والصالة', '🛒 Create & Submit Bar / FOH Orders'],
    ['canManageAcademy', '🎓 إضافة وتعديل أصناف وأسئلة الأكاديمية', '🎓 Add & Edit Menu Academy Items & Quizzes'],
    ['canViewTeamTips', '💰 الاطلاع على جدول التبس الكامل للفريق', '💰 View Full Team Tip Pool & Shares'],
  ];

  function defaultOpsConfig() {
    return {
      hours: {
        prepStart: '12:00',        // 12:00 PM Staff shift & prep start (1h before opening)
        doorsOpen: '13:00',        // 1:00 PM Restaurant opens for guests
        kitchenLastOrder: '00:00', // 12:00 Midnight Kitchen Last Order
        barLastOrder: '01:00',     // 1:00 AM Bar Last Order
        minCloseTime: '02:00',     // 2:00 AM Minimum official closing time
        closeWithLastGuest: true,  // Close with last guest (never early even if empty at 11:30 PM)
      },
      staffSuperRoles: {
        fadi: 'super_manager',
        ali: 'super_captain',
        maher: 'super_bartender',
        sara: 'super_waiter',
      },
      orderingDelegation: {
        roles: ['super_manager', 'super_bartender'],
        staffUsernames: ['sara'],
      },
      rolePermissions: {
        super_manager: {
          canCloseRestaurant: true,
          canEarlyCloseOverride: true,
          canTriggerLastOrder: true,
          canSignoffDeptClosing: true,
          canEditChecklist: true,
          canSubmitOrders: true,
          canManageAcademy: true,
          canViewTeamTips: true,
        },
        super_captain: {
          canCloseRestaurant: true,
          canEarlyCloseOverride: false,
          canTriggerLastOrder: true,
          canSignoffDeptClosing: true,
          canEditChecklist: true,
          canSubmitOrders: true,
          canManageAcademy: true,
          canViewTeamTips: true,
        },
        super_bartender: {
          canCloseRestaurant: false,
          canEarlyCloseOverride: false,
          canTriggerLastOrder: true,
          canSignoffDeptClosing: true,
          canEditChecklist: true,
          canSubmitOrders: true,
          canManageAcademy: true,
          canViewTeamTips: false,
        },
        super_waiter: {
          canCloseRestaurant: false,
          canEarlyCloseOverride: false,
          canTriggerLastOrder: true,
          canSignoffDeptClosing: true,
          canEditChecklist: true,
          canSubmitOrders: true,
          canManageAcademy: false,
          canViewTeamTips: false,
        },
        staff: {
          canCloseRestaurant: false,
          canEarlyCloseOverride: false,
          canTriggerLastOrder: false,
          canSignoffDeptClosing: false,
          canEditChecklist: false,
          canSubmitOrders: false,
          canManageAcademy: false,
          canViewTeamTips: false,
        },
      },
    };
  }

  function loadOpsConfig() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(OPS_CFG_KEY), 'null');
      const d = defaultOpsConfig();
      if (!raw || typeof raw !== 'object') return d;
      const mergedPerms = { ...d.rolePermissions };
      Object.keys(d.rolePermissions).forEach((rk) => {
        if (raw.rolePermissions && raw.rolePermissions[rk]) {
          mergedPerms[rk] = { ...d.rolePermissions[rk], ...raw.rolePermissions[rk] };
        }
      });
      return {
        hours: { ...d.hours, ...(raw.hours || {}) },
        staffSuperRoles: { ...d.staffSuperRoles, ...(raw.staffSuperRoles || {}) },
        orderingDelegation: {
          roles: (raw.orderingDelegation && Array.isArray(raw.orderingDelegation.roles))
            ? raw.orderingDelegation.roles
            : d.orderingDelegation.roles,
          staffUsernames: (raw.orderingDelegation && Array.isArray(raw.orderingDelegation.staffUsernames))
            ? raw.orderingDelegation.staffUsernames
            : d.orderingDelegation.staffUsernames,
        },
        rolePermissions: mergedPerms,
      };
    } catch {
      return defaultOpsConfig();
    }
  }

  function saveOpsConfig(cfg) {
    try {
      localStorage.setItem(OPS_CFG_KEY, JSON.stringify(cfg));
    } catch {}
  }

  function getCurrentSuperRoleKey() {
    const sess = getSession();
    const cfg = loadOpsConfig();
    const uname = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
    if (cfg.staffSuperRoles && cfg.staffSuperRoles[uname]) {
      return cfg.staffSuperRoles[uname];
    }
    if (!sess || sess.isManager) return 'super_manager';
    return 'staff';
  }

  function hasSuperPerm(permKey) {
    const cfg = loadOpsConfig();
    const roleKey = getCurrentSuperRoleKey();
    const rolePerms = (cfg.rolePermissions && cfg.rolePermissions[roleKey]) || cfg.rolePermissions.staff;
    return !!(rolePerms && rolePerms[permKey]);
  }

  function canCurrentUserAccessOrders() {
    const sess = getSession();
    if (!sess) return true;
    if (sess.isManager) return true;
    const cfg = loadOpsConfig();
    const del = cfg.orderingDelegation || { roles: ['super_manager', 'super_bartender'], staffUsernames: ['sara'] };
    const rKey = getCurrentSuperRoleKey();
    if (Array.isArray(del.roles) && del.roles.includes(rKey)) return true;
    const uname = (sess.username || '').toLowerCase().trim();
    if (Array.isArray(del.staffUsernames) && del.staffUsernames.map((s) => (s || '').toLowerCase().trim()).includes(uname)) return true;
    return false;
  }

  // Convert HH:MM to operational business-day minutes (06:00..29:59 so 00:00=24:00, 02:30=26:30)
  function toBizMinutes(hm) {
    if (!hm || typeof hm !== 'string' || !/^\d{2}:\d{2}$/.test(hm)) return 780;
    const h = Number(hm.slice(0, 2));
    const m = Number(hm.slice(3, 5));
    const adjH = h < 6 ? h + 24 : h;
    return adjH * 60 + m;
  }

  function formatTime12Ar(hm) {
    if (!hm || !/^\d{2}:\d{2}$/.test(hm)) return hm || '';
    const h = Number(hm.slice(0, 2));
    const m = hm.slice(3, 5);
    const ar = isAr();
    const suffix = h < 12 ? (ar ? 'ص' : 'AM') : (ar ? 'م' : 'PM');
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + m + ' ' + suffix;
  }

  let simulatedShiftTime = ''; // '' means real clock FOH.time.nowHM()

  function getEffectiveNowHM() {
    return simulatedShiftTime || FOH.time.nowHM();
  }

  function loadOpsDayState(dateStr) {
    const key = OPS_DAY_PREFIX + (dateStr || S.date);
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(key), 'null');
      if (raw && typeof raw === 'object') return raw;
    } catch {}
    return {
      kitchenLastOrderAt: '',
      kitchenLastOrderBy: '',
      barLastOrderAt: '',
      barLastOrderBy: '',
      closedAt: '',
      closedBy: '',
      closedRole: '',
      extensionMins: 0,
      earlyOverrideReason: '',
      overtimeCredited: false,
    };
  }

  function saveOpsDayState(dateStr, st) {
    const key = OPS_DAY_PREFIX + (dateStr || S.date);
    try {
      localStorage.setItem(key, JSON.stringify(st));
    } catch {}
  }

  // ---- Department-Specific Closing Sheet Sections ----
  const DEPT_CLOSING_SECTIONS = [
    {
      id: 'cls-bar',
      dept: 'bar',
      icon: '🍸',
      title: 'Bar Department Closing (After 01:00 AM Last Order)',
      titleAr: 'إغلاق قسم البار (بعد Last Order البار 1:00 ص)',
      items: [
        { id: 'cb1', text: 'Backflush espresso machine, clean steam wands & empty grinder hopper', textAr: 'تنظيف ماكينة الإسبريسو وعمل Backflush وتفريغ مطحنة القهوة', due: '01:05', role: '', children: [] },
        { id: 'cb2', text: 'Wrap & date-label all garnishes, fresh juices, syrups & purées in chiller', textAr: 'تغطية وتغليف الفواكه والغارنيش والعصائر والـ Syrups مع ملصق التاريخ', due: '01:15', role: '', children: [] },
        { id: 'cb3', text: 'Wipe speed rail bottles, lock premium bottle vault & bar fridges', textAr: 'مسح زجاجات الـ Speed Rail وإقفال ثلاجات البار وخزنة الزجاجات الفاخرة', due: '01:25', role: '', children: [] },
        { id: 'cb4', text: 'Burn/melt ice wells, sanitize bar counter, mats & floor drains', textAr: 'تذويب وتفريغ أحواض الثلج وتعقيم كاونتر البار والأرضيات والمصافي', due: '01:40', role: '', children: [] },
      ],
    },
    {
      id: 'cls-tables',
      dept: 'floor',
      icon: '🍽️',
      title: 'Floor & Terrace Closing (After 00:00 Kitchen Last Order)',
      titleAr: 'إغلاق قسم الصالة والتراس (بعد Last Order المطبخ 12:00 ص)',
      items: [
        { id: 'c1', text: 'Clear and sanitize all indoor & terrace tables after guests depart', textAr: 'تنظيف وتعقيم جميع طاولات الصالة والتراس بعد مغادرة الزبائن', due: '01:00', role: '', children: [] },
        { id: 'c2', text: 'Collect food/drink menus, bill folders & table lamps to station', textAr: 'جمع قوائم الطعام والمشروبات وحافظات الفواتير وإعادتها للمحطة', due: '01:15', role: '', children: [] },
        { id: 'c3', text: 'Close terrace umbrellas, shut off gas heaters & secure cushions', textAr: 'إغلاق مظلات التراس وفصل دفايات الغاز وتأمين الوسائد الخارجية', due: '01:30', role: '', children: [] },
      ],
    },
    {
      id: 'cls-stations',
      dept: 'floor',
      icon: '☕',
      title: 'Waiter Stations & Linen Handover (Floor Dept)',
      titleAr: 'إغلاق محطات الويتر والبياضات (قسم الصالة)',
      items: [
        { id: 'c4', text: 'Send all remaining glassware, plates & cutlery to dishwashing area', textAr: 'إرسال جميع الكؤوس والصحون والشوك والسكاكين المتبقية لمنطقة الغسيل', due: '01:30', role: '', children: [] },
        { id: 'c5', text: 'Wipe condiment trays, refill station base & seal sugar/sauces', textAr: 'تنظيف صواني الإضافات وإغلاق علب السكر والصوصات وتجهيز أساس الصباح', due: '01:40', role: '', children: [] },
        { id: 'c6', text: 'Count dirty linen/napkins for laundry & stage clean morning set', textAr: 'فرز وعدّ المفارش والمناديل المتسخة للغسيل وتجهيز طقم الصباح', due: '01:50', role: '', children: [] },
      ],
    },
    {
      id: 'cls-lockup',
      dept: 'cash',
      icon: '💳',
      title: 'Cashier, Tip Box & Final Restaurant Lockup (At Last Guest 02:00+)',
      titleAr: 'إغلاق الكاشير وصندوق التبس والأمان النهائي (مع آخر زبون 2:00+ ص)',
      items: [
        { id: 'c7', text: 'Close POS terminals (Z-Report) & reconcile Visa slips and cash float', textAr: 'إغلاق أجهزة الكاشير (Z-Report) ومطابقة إيصالات الفيزا والكاش', due: '02:00', role: '', children: [] },
        { id: 'c8', text: 'Log daily tips into Tip Manager box & verify safe/vault is locked', textAr: 'توثيق وتسليم حصيلة التبس اليومي في صندوق Tip Manager وإقفال الخزنة', due: '02:05', role: '', children: [] },
        { id: 'c9', text: 'Switch off A/C units, kitchen pass warmers, sound system & exterior sign', textAr: 'إطفاء المكيفات وسخانات الباص ونظام الصوت واللافتة الخارجية', due: '02:10', role: '', children: [] },
        { id: 'c10', text: 'Inspect restrooms, lock terrace & main doors, set alarm after last guest', textAr: 'تفقد الحمامات وإقفال أبواب التراس والمدخل الرئيسي بعد مغادرة آخر زبون', due: '02:15', role: '', children: [] },
      ],
    },
  ];

  let activeClosingDeptFilter = 'all'; // 'all' | 'bar' | 'floor' | 'cash'

  function ensureUpgradedClosingSections() {
    const CLOSING_KEY = 'foh-opening.closingSections.v1';
    try {
      const existing = FOH.safeJsonParse(localStorage.getItem(CLOSING_KEY), 'null');
      const hasBarSec = Array.isArray(existing) && existing.some((s) => s.id === 'cls-bar' || s.dept === 'bar');
      if (!hasBarSec) {
        localStorage.setItem(CLOSING_KEY, JSON.stringify(DEPT_CLOSING_SECTIONS));
      }
    } catch {}
  }

  function isClosingSheetActive() {
    const bar = $('sheetTypeBar');
    if (!bar) return false;
    const btns = bar.querySelectorAll('.seg button');
    if (btns.length >= 2 && btns[1].classList.contains('on')) return true;
    return (S.tpl.sections || []).some((s) => s.id && s.id.startsWith('cls-'));
  }

  function activateClosingSheet(targetDept) {
    ensureUpgradedClosingSections();
    if (targetDept) activeClosingDeptFilter = targetDept;
    if (S.view !== 'opening') S.view = 'opening';
    S.editing = false;
    if (FOH.erpPwa && FOH.erpPwa.switchSheetType) {
      FOH.erpPwa.switchSheetType('closing');
      // Ensure upgraded sections are loaded in S.tpl.sections
      const hasBar = (S.tpl.sections || []).some((s) => s.id === 'cls-bar');
      if (!hasBar) {
        S.tpl.sections = JSON.parse(JSON.stringify(DEPT_CLOSING_SECTIONS));
      }
    }
    FOH.app.render();
  }

  function renderClosingDeptFilterBar() {
    let deptBar = $('closingDeptBar');
    const sheetBar = $('sheetTypeBar');
    if (!sheetBar) return;
    if (!deptBar) {
      deptBar = el('div', 'closing-dept-bar run-only');
      deptBar.id = 'closingDeptBar';
      sheetBar.insertAdjacentElement('afterend', deptBar);
    }

    const inClosing = !S.editing && S.view === 'opening' && isClosingSheetActive();
    deptBar.hidden = !inClosing;
    if (!inClosing) {
      // Make sure all sections are visible in opening mode
      document.querySelectorAll('#sections > section.card').forEach((c) => {
        c.style.display = '';
      });
      return;
    }

    // Ensure S.tpl.sections has dept tags
    (S.tpl.sections || []).forEach((s) => {
      if (!s.dept) {
        if (s.id === 'cls-bar') s.dept = 'bar';
        else if (s.id === 'cls-lockup') s.dept = 'cash';
        else s.dept = 'floor';
      }
    });

    deptBar.replaceChildren();
    const ar = isAr();
    const roleKey = getCurrentSuperRoleKey();
    const roleMeta = SUPER_ROLES_META[roleKey] || SUPER_ROLES_META.staff;

    const label = el('span', '');
    label.style.fontSize = '0.78rem';
    label.style.fontWeight = '800';
    label.style.color = 'var(--ink2)';
    label.style.marginInlineEnd = '4px';
    label.textContent = ar ? '🌙 فلترة شيت الإغلاق حسب القسم:' : '🌙 Closing Sheet by Dept:';
    deptBar.append(label);

    const depts = [
      ['all', ar ? '📋 كل الأقسام (٤)' : '📋 All Depts (4)'],
      ['bar', ar ? '🍸 قسم البار (Bar Closing)' : '🍸 Bar Closing'],
      ['floor', ar ? '🍽️ الصالة والتراس (Floor & Stations)' : '🍽️ Floor & Terrace'],
      ['cash', ar ? '💳 الكاشير والأمان (Cash & Lockup)' : '💳 Cash & Lockup'],
    ];

    depts.forEach(([k, txt]) => {
      const chip = el('button', 'closing-dept-chip' + (activeClosingDeptFilter === k ? ' on' : ''), txt);
      chip.type = 'button';
      chip.addEventListener('click', () => {
        activeClosingDeptFilter = k;
        renderClosingDeptFilterBar();
      });
      deptBar.append(chip);
    });

    const myDeptBtn = el('button', 'gov-btn', ar ? '🎯 قسمي (' + roleMeta.badge + ')' : '🎯 My Dept (' + roleMeta.badge + ')');
    myDeptBtn.type = 'button';
    myDeptBtn.style.marginInlineStart = 'auto';
    myDeptBtn.addEventListener('click', () => {
      activeClosingDeptFilter = roleMeta.dept || 'all';
      renderClosingDeptFilterBar();
    });
    deptBar.append(myDeptBtn);

    // Filter visible section cards in DOM and inject department badge
    document.querySelectorAll('#sections > section.card').forEach((card) => {
      const sid = (card.id || '').replace(/^sec-/, '');
      const secObj = (S.tpl.sections || []).find((x) => x.id === sid);
      const secDept = (secObj && secObj.dept) || (sid === 'cls-bar' ? 'bar' : sid === 'cls-lockup' ? 'cash' : 'floor');
      const show = activeClosingDeptFilter === 'all' || activeClosingDeptFilter === secDept;
      card.style.display = show ? '' : 'none';

      const head = card.querySelector('.head');
      if (head && !head.querySelector('.dept-closing-tag')) {
        const tag = el('span', 'super-role-pill dept-closing-tag');
        tag.style.fontSize = '0.68rem';
        tag.textContent = secDept === 'bar'
          ? (ar ? '🍸 مختص بقسم البار' : '🍸 Bar Dept')
          : secDept === 'cash'
          ? (ar ? '💳 الكاشير والمشرف' : '💳 Cash & Manager')
          : (ar ? '🍽️ مختص بقسم الصالة' : '🍽️ Floor Dept');
        head.append(tag);
      }
    });
  }

  // ---- Operational Hours & Lifecycle Bar (#opsLifecycleBar) ----
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

    // Determine operational phase
    let phaseKey = 'open';
    let phaseIcon = '🍽️';
    let phaseTitle = '';
    let phaseSub = '';

    if (daySt.closedAt) {
      phaseKey = 'closed';
      phaseIcon = '🔒';
      phaseTitle = ar
        ? 'تم إغلاق المطعم رسمياً الساعة ' + formatTime12Ar(daySt.closedAt) + (daySt.extensionMins > 0 ? ' (تمديد مع آخر زبون +' + daySt.extensionMins + ' دقيقة)' : '')
        : 'Restaurant Officially Closed at ' + formatTime12Ar(daySt.closedAt) + (daySt.extensionMins > 0 ? ' (+' + daySt.extensionMins + 'm with last guest)' : '');
      phaseSub = ar
        ? 'تم الإغلاق بواسطة: ' + (daySt.closedBy || 'Supervisor') + (daySt.earlyOverrideReason ? ' · سبب استثنائي: ' + daySt.earlyOverrideReason : ' · اكتمل يوم العمل وتم تحديث الساعات في Tip Manager ✓')
        : 'Closed by: ' + (daySt.closedBy || 'Supervisor');
    } else if (nowBiz < openBiz) {
      phaseKey = 'prep';
      phaseIcon = '☀️';
      const minsToOpen = Math.max(0, openBiz - nowBiz);
      phaseTitle = ar
        ? 'فترة دوام التحضير للموظفين (' + formatTime12Ar(h.prepStart) + ' – ' + formatTime12Ar(h.doorsOpen) + ') · متبقي ' + minsToOpen + ' دقيقة لفتح المطعم'
        : 'Staff Shift & Prep (' + formatTime12Ar(h.prepStart) + ' – ' + formatTime12Ar(h.doorsOpen) + ') · ' + minsToOpen + 'm until Doors Open';
      phaseSub = ar
        ? 'بدأ دوام الموظفين الساعة ' + formatTime12Ar(h.prepStart) + ' لتجهيز الصالة والبار قبل استقبال الزبائن الساعة ' + formatTime12Ar(h.doorsOpen)
        : 'Staff shift started at ' + formatTime12Ar(h.prepStart) + ' to finish Opening Sheet before ' + formatTime12Ar(h.doorsOpen);
    } else if (nowBiz < kLastBiz - 15) {
      phaseKey = 'open';
      phaseIcon = '🟢';
      phaseTitle = ar
        ? 'المطعم مفتوح ويستقبل الزبائن (منذ ' + formatTime12Ar(h.doorsOpen) + ')'
        : 'Restaurant Open for Service (since ' + formatTime12Ar(h.doorsOpen) + ')';
      phaseSub = ar
        ? '🛡️ قاعدة عدم الإغلاق المبكر مفعّلة: لا يُغلق المطعم قبل ' + formatTime12Ar(h.minCloseTime) + ' حتى لو كانت الصالة فارغة (مثلاً 11:30 م).'
        : '🛡️ Anti-Early-Close Active: Restaurant cannot close before ' + formatTime12Ar(h.minCloseTime) + ' even if empty.';
    } else if (nowBiz < minCloseBiz) {
      phaseKey = 'last-order';
      phaseIcon = '🔔';
      phaseTitle = ar
        ? 'مرحلة الـ Last Order وتجهيز الإغلاق التدرّجي للأقسام'
        : 'Last Order Phase & Staged Department Closing';
      phaseSub = ar
        ? 'آخر طلب للمطبخ: ' + formatTime12Ar(h.kitchenLastOrder) + ' · آخر طلب للبار: ' + formatTime12Ar(h.barLastOrder) + ' · الحد الأدنى للإغلاق: ' + formatTime12Ar(h.minCloseTime)
        : 'Kitchen Last Order: ' + formatTime12Ar(h.kitchenLastOrder) + ' · Bar Last Order: ' + formatTime12Ar(h.barLastOrder);
    } else {
      phaseKey = 'extended';
      phaseIcon = '⏳';
      const extMins = Math.max(0, nowBiz - minCloseBiz);
      phaseTitle = ar
        ? 'وضع الإغلاق مع آخر زبون (بعد ' + formatTime12Ar(h.minCloseTime) + (extMins > 0 ? ' · تمديد +' + extMins + ' دقيقة' : '') + ')'
        : 'Until Last Guest Leaves Mode (Past ' + formatTime12Ar(h.minCloseTime) + (extMins > 0 ? ' · +' + extMins + 'm extension' : '') + ')';
      phaseSub = ar
        ? 'تجاوزنا الساعة ' + formatTime12Ar(h.minCloseTime) + ' — بمجرد مغادرة آخر زبون واكتمال الـ Closing Sheet اضغط (🚪 تأكيد إغلاق المطعم).'
        : 'Past minimum close time — once the last guest leaves and Closing Sheet is done, tap Close Restaurant.';
    }

    bar.className = 'ops-lifecycle-bar run-only status-' + phaseKey;

    // Top Row: Phase Title + Quick Time Simulator
    const topRow = el('div', 'ops-top-row');
    const leftBox = el('div', '');
    const roleKey = getCurrentSuperRoleKey();
    const roleMeta = SUPER_ROLES_META[roleKey] || SUPER_ROLES_META.staff;
    leftBox.innerHTML =
      '<div class="ops-phase-title">' +
      '<span>' + phaseIcon + ' ' + phaseTitle + '</span>' +
      '<span class="super-role-pill ' + roleKey + '">' + roleMeta.badge + '</span>' +
      '</div>' +
      '<div class="ops-phase-sub">' + phaseSub + '</div>';

    const simWrap = el('div', 'ops-sim-wrap');
    const simSel = el('select', 'ops-sim-select');
    simSel.title = ar ? 'محاكاة وقت الشفت لتجربة سيناريوهات الفتح والـ Last Order والإغلاق' : 'Simulate shift time to test Opening, Last Order & Closing scenarios';
    [
      ['', ar ? '🕒 وقت الساعة الفعلي (' + FOH.time.nowHM() + ')' : '🕒 Real Clock (' + FOH.time.nowHM() + ')'],
      ['12:15', ar ? '☀️ محاكاة 12:15 ظهراً (بداية دوام الموظفين قبل الفتح)' : '☀️ Sim 12:15 PM (Staff Prep before 1:00 PM Open)'],
      ['13:30', ar ? '☀️ محاكاة 01:30 ظهراً (شيت الافتتاح 12:00–3:00 م)' : '☀️ Sim 1:30 PM (Opening Sheet 12–3 PM)'],
      ['15:30', ar ? '🌤️ محاكاة 03:30 عصراً (شيت منتصف الشفت Mid-Shift)' : '🌤️ Sim 3:30 PM (Mid-Shift Sheet 3–11 PM)'],
      ['23:30', ar ? '🚫 محاكاة 11:30 ليلاً (المطعم فارغ مبكراً — يُمنع الإغلاق)' : '🚫 Sim 11:30 PM (Empty Floor — Early Close Blocked)'],
      ['00:00', ar ? '🍳 محاكاة 12:00 منتصف الليل (Last Order المطبخ)' : '🍳 Sim 12:00 AM (Kitchen Last Order)'],
      ['01:00', ar ? '🍸 محاكاة 01:00 فجراً (Last Order البار + شيت إغلاق البار)' : '🍸 Sim 01:00 AM (Bar Last Order + Bar Closing)'],
      ['02:30', ar ? '⏳ محاكاة 02:30 فجراً (تأخر آخر زبون + جاهز للإغلاق)' : '⏳ Sim 02:30 AM (Last Guest Left at 2:30 AM)'],
    ].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = val;
      o.selected = simulatedShiftTime === val;
      simSel.append(o);
    });
    simSel.addEventListener('change', () => {
      simulatedShiftTime = simSel.value;
      manualSheetOverride = false;
      FOH.app.render();
    });
    simWrap.append(simSel);
    topRow.append(leftBox, simWrap);
    bar.append(topRow);

    // 5-Stage Timeline Strip
    const timeline = el('div', 'ops-timeline-grid');
    const stages = [
      {
        label: ar ? '١. دوام التحضير' : '1. Staff Prep',
        time: formatTime12Ar(h.prepStart),
        done: nowBiz >= openBiz || !!daySt.closedAt,
        active: !daySt.closedAt && nowBiz >= prepBiz && nowBiz < openBiz,
        status: ar ? 'قبل الفتح بـ ١س' : '1h pre-open',
      },
      {
        label: ar ? '٢. فتح المطعم' : '2. Doors Open',
        time: formatTime12Ar(h.doorsOpen),
        done: nowBiz >= kLastBiz || !!daySt.closedAt,
        active: !daySt.closedAt && nowBiz >= openBiz && nowBiz < kLastBiz,
        status: ar ? 'استقبال الزبائن' : 'Guest service',
      },
      {
        label: ar ? '٣. Last Order المطبخ' : '3. Kitchen L.O.',
        time: formatTime12Ar(h.kitchenLastOrder),
        done: !!daySt.kitchenLastOrderAt || nowBiz >= bLastBiz || !!daySt.closedAt,
        active: !daySt.closedAt && nowBiz >= kLastBiz - 15 && nowBiz < bLastBiz,
        status: daySt.kitchenLastOrderAt ? ('✓ ' + daySt.kitchenLastOrderAt) : (ar ? 'إغلاق المطبخ' : 'Kitchen cutoff'),
      },
      {
        label: ar ? '٤. Last Order البار' : '4. Bar L.O.',
        time: formatTime12Ar(h.barLastOrder),
        done: !!daySt.barLastOrderAt || nowBiz >= minCloseBiz || !!daySt.closedAt,
        active: !daySt.closedAt && nowBiz >= bLastBiz - 15 && nowBiz < minCloseBiz,
        status: daySt.barLastOrderAt ? ('✓ ' + daySt.barLastOrderAt) : (ar ? 'إغلاق البار' : 'Bar cutoff'),
      },
      {
        label: ar ? '٥. إغلاق المطعم' : '5. Close (Last Guest)',
        time: formatTime12Ar(h.minCloseTime) + '+',
        done: !!daySt.closedAt,
        active: !daySt.closedAt && nowBiz >= minCloseBiz,
        status: daySt.closedAt
          ? ('🔒 ' + formatTime12Ar(daySt.closedAt))
          : (h.closeWithLastGuest ? (ar ? 'مع آخر زبون' : 'With last guest') : (ar ? 'الحد الأدنى' : 'Min close')),
      },
    ];

    stages.forEach((st) => {
      const card = el('div', 'ops-step-card' + (st.done ? ' done' : st.active ? ' active' : ''));
      card.innerHTML =
        '<small>' + st.label + '</small>' +
        '<strong>' + st.time + '</strong>' +
        '<span>' + st.status + '</span>';
      timeline.append(card);
    });
    bar.append(timeline);

    // Bottom Actions Row
    const actRow = el('div', 'ops-actions-row');
    const leftBtns = el('div', 'gov-actions');

    const sess = getSession();
    const myName = (sess && sess.displayName) || S.me.name || 'Supervisor';
    const canLO = hasSuperPerm('canTriggerLastOrder');
    const canCloseRest = hasSuperPerm('canCloseRestaurant');

    // Button 1: Kitchen Last Order
    const kBtn = el(
      'button',
      'gov-btn' + (daySt.kitchenLastOrderAt ? '' : ' primary'),
      daySt.kitchenLastOrderAt
        ? (ar ? '🍳 Last Order المطبخ (تم ' + daySt.kitchenLastOrderAt + ')' : '🍳 Kitchen L.O. (' + daySt.kitchenLastOrderAt + ')')
        : (ar ? '🍳 إعلان Last Order المطبخ (' + formatTime12Ar(h.kitchenLastOrder) + ')' : '🍳 Trigger Kitchen Last Order')
    );
    kBtn.type = 'button';
    kBtn.addEventListener('click', () => {
      if (!canLO) {
        return FOH.edit.toast(ar ? '🔒 صلاحية إعلان Last Order مخصصة لـ Super Waiter / Captain / Manager' : '🔒 Permission required to trigger Last Order');
      }
      daySt.kitchenLastOrderAt = nowHM;
      daySt.kitchenLastOrderBy = myName;
      saveOpsDayState(S.date, daySt);
      if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
        FOH.cloudRealtime.broadcast('LAST_ORDER_TRIGGERED', { kind: 'kitchen', byName: myName, at: nowHM });
      }
      FOH.edit.toast(ar ? '🍳 تم إعلان Last Order المطبخ الساعة ' + nowHM + ' وفتح شيت إغلاق الصالة ✓' : '🍳 Kitchen Last Order logged at ' + nowHM + ' ✓');
      activateClosingSheet('floor');
    });
    leftBtns.append(kBtn);

    // Button 2: Bar Last Order
    const bBtn = el(
      'button',
      'gov-btn' + (daySt.barLastOrderAt ? '' : ' primary'),
      daySt.barLastOrderAt
        ? (ar ? '🍸 Last Order البار (تم ' + daySt.barLastOrderAt + ')' : '🍸 Bar L.O. (' + daySt.barLastOrderAt + ')')
        : (ar ? '🍸 إعلان Last Order البار (' + formatTime12Ar(h.barLastOrder) + ')' : '🍸 Trigger Bar Last Order')
    );
    bBtn.type = 'button';
    bBtn.addEventListener('click', () => {
      if (!canLO) {
        return FOH.edit.toast(ar ? '🔒 صلاحية إعلان Last Order البار مخصصة لـ Super Bartender / Captain / Manager' : '🔒 Permission required to trigger Bar Last Order');
      }
      daySt.barLastOrderAt = nowHM;
      daySt.barLastOrderBy = myName;
      saveOpsDayState(S.date, daySt);
      if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
        FOH.cloudRealtime.broadcast('LAST_ORDER_TRIGGERED', { kind: 'bar', byName: myName, at: nowHM });
      }
      FOH.edit.toast(ar ? '🍸 تم إعلان Last Order البار الساعة ' + nowHM + ' وفتح شيت إغلاق البار ✓' : '🍸 Bar Last Order logged at ' + nowHM + ' ✓');
      activateClosingSheet('bar');
    });
    leftBtns.append(bBtn);

    // Button 3: Open Closing Sheet by Department
    const inClosing = isClosingSheetActive();
    const sheetBtn = el(
      'button',
      'gov-btn',
      inClosing
        ? (ar ? '☀️ العودة لشيت الافتتاح (Opening)' : '☀️ Switch to Opening Sheet')
        : (ar ? '🌙 فتح شيت الإغلاق للأقسام (Closing Sheet)' : '🌙 Open Department Closing Sheet')
    );
    sheetBtn.type = 'button';
    sheetBtn.addEventListener('click', () => {
      if (inClosing) {
        if (FOH.erpPwa && FOH.erpPwa.switchSheetType) FOH.erpPwa.switchSheetType('opening');
      } else {
        activateClosingSheet('all');
      }
    });
    leftBtns.append(sheetBtn);

    actRow.append(leftBtns);

    // Right Button: Close Restaurant Gate (or Reopen if already closed)
    if (daySt.closedAt) {
      const reopenBtn = el('button', 'gov-btn warn', ar ? '🔓 إعادة فتح اليوم التشغيلي' : '🔓 Reopen Operational Day');
      reopenBtn.type = 'button';
      reopenBtn.addEventListener('click', () => {
        if (!hasSuperPerm('canEarlyCloseOverride') && !canCloseRest) {
          return FOH.edit.toast(ar ? '🔒 إعادة فتح المطعم تتطلب صلاحية Super Manager / Captain' : '🔒 Requires Super Manager / Captain');
        }
        daySt.closedAt = '';
        daySt.closedBy = '';
        daySt.extensionMins = 0;
        daySt.earlyOverrideReason = '';
        saveOpsDayState(S.date, daySt);
        FOH.edit.toast(ar ? '🔓 تمت إعادة فتح اليوم التشغيلي' : '🔓 Operational day reopened');
        FOH.app.render();
      });
      actRow.append(reopenBtn);
    } else {
      const isBeforeMinClose = nowBiz < minCloseBiz;
      const closeRestBtn = el(
        'button',
        'ops-close-rest-btn ' + (isBeforeMinClose ? 'blocked' : 'ready'),
        isBeforeMinClose
          ? (ar ? '🚪 إغلاق المطعم (مقفل قبل ' + formatTime12Ar(h.minCloseTime) + ')' : '🚪 Close Restaurant (Locked before ' + formatTime12Ar(h.minCloseTime) + ')')
          : (ar ? '🚪 تأكيد إغلاق المطعم (مع مغادرة آخر زبون · ' + formatTime12Ar(nowHM) + ')' : '🚪 Confirm Restaurant Closed (Last Guest Left · ' + formatTime12Ar(nowHM) + ')')
      );
      closeRestBtn.type = 'button';
      closeRestBtn.addEventListener('click', () => openCloseRestaurantDialog(nowHM, nowBiz, minCloseBiz));
      actRow.append(closeRestBtn);
    }

    bar.append(actRow);
  }

  // Modal Gate for Closing the Restaurant (Enforces Anti-Early-Close + Closing Sheet Check + Late Guest Overtime)
  function openCloseRestaurantDialog(nowHM, nowBiz, minCloseBiz) {
    const ar = isAr();
    const cfg = loadOpsConfig();
    const h = cfg.hours;
    const daySt = loadOpsDayState(S.date);
    const sess = getSession();
    const myName = (sess && sess.displayName) || S.me.name || 'Supervisor';
    const roleKey = getCurrentSuperRoleKey();
    const roleMeta = SUPER_ROLES_META[roleKey] || SUPER_ROLES_META.staff;
    const canClose = hasSuperPerm('canCloseRestaurant');
    const canOverrideEarly = hasSuperPerm('canEarlyCloseOverride');

    let dlg = $('closeRestaurantDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'closeRestaurantDialog';
      document.body.append(dlg);
    }
    dlg.replaceChildren();

    const box = el('div', '');
    box.style.padding = '16px 18px 22px';

    if (!canClose) {
      box.innerHTML =
        '<div class="grab"></div>' +
        '<h2 style="color:var(--danger);">🔒 ' + (ar ? 'صلاحية إغلاق المطعم غير متوفرة لمنصبك' : 'Permission Required to Close Restaurant') + '</h2>' +
        '<p style="font-size:0.88rem;color:var(--ink2);line-height:1.5;">' +
        (ar
          ? 'منصبك الحالي هو <b>' + roleMeta.badge + '</b>. إغلاق المطعم رسمياً في نهاية الشفت مخصص لـ <b>👑 Super Manager</b> أو <b>🎖️ Super Captain</b> (يمكن للمدير تعديل هذه الصلاحية من ⚙️ الإعدادات).'
          : 'Your current role is ' + roleMeta.badge + '. Only Super Manager or Super Captain can officially close the restaurant.') +
        '</p>';
      const okB = el('button', 'btn primary', ar ? 'حسناً' : 'OK');
      okB.type = 'button';
      okB.style.width = '100%';
      okB.addEventListener('click', () => dlg.close());
      box.append(okB);
      dlg.append(box);
      dlg.showModal();
      return;
    }

    const isEarly = nowBiz < minCloseBiz;
    const extMins = Math.max(0, nowBiz - minCloseBiz);

    // Calculate Closing Sheet progress across departments
    ensureUpgradedClosingSections();
    const closingSecs = FOH.safeJsonParse(localStorage.getItem('foh-opening.closingSections.v1'), 'null') || DEPT_CLOSING_SECTIONS;
    const closingRun = FOH.safeJsonParse(localStorage.getItem('foh-opening.closingRun.' + S.date), '{"checked":{}}');
    const checkedMap = (isClosingSheetActive() ? S.run.checked : closingRun.checked) || {};
    const allClosingLeaves = closingSecs.flatMap((s) => s.items || []);
    const doneClosingCount = allClosingLeaves.filter((it) => checkedMap[it.id]).length;
    const leftClosingCount = allClosingLeaves.length - doneClosingCount;

    if (isEarly) {
      box.innerHTML =
        '<div class="grab"></div>' +
        '<div style="padding:12px;border-radius:12px;background:var(--danger-soft);border:1.5px solid var(--danger);margin-bottom:12px;">' +
        '<h3 style="margin:0 0 6px;color:var(--danger);">⛔ ' +
        (ar ? 'منع الإغلاق المبكر للمطعم (الساعة الآن ' + formatTime12Ar(nowHM) + ')' : 'Early Closing Blocked (Current Time: ' + formatTime12Ar(nowHM) + ')') +
        '</h3>' +
        '<p style="margin:0;font-size:0.84rem;line-height:1.5;">' +
        (ar
          ? 'الحد الأدنى الرسمي لإغلاق المطعم هو <b>' + formatTime12Ar(h.minCloseTime) + '</b>. حسب قوانين المطعم، <b>لا يُغلق المطعم مبكراً (مثلاً الساعة 11:30 مساءً) حتى لو كانت الصالة فارغة من الزبائن</b>.'
          : 'Official minimum closing time is ' + formatTime12Ar(h.minCloseTime) + '. The restaurant cannot be closed early even if the floor is empty.') +
        '</p>' +
        '</div>';

      const simHint = el('button', 'btn', ar ? '⏱ تجربة محاكاة الساعة 02:30 ص (بعد مغادرة آخر زبون)' : '⏱ Simulate 02:30 AM (After Last Guest Leaves)');
      simHint.type = 'button';
      simHint.style.width = '100%';
      simHint.style.marginBottom = '10px';
      simHint.addEventListener('click', () => {
        simulatedShiftTime = '02:30';
        dlg.close();
        renderOpsLifecycleBar();
        openCloseRestaurantDialog('02:30', toBizMinutes('02:30'), minCloseBiz);
      });
      box.append(simHint);

      if (canOverrideEarly) {
        const ovWrap = el('div', '');
        ovWrap.style.marginTop = '10px';
        ovWrap.style.paddingTop = '10px';
        ovWrap.style.borderTop = '1px dashed var(--line)';
        const ovLbl = el('label', '', ar ? '👑 تجاوز استثنائي بأمر Super Manager فقط (أدخل سبب الإغلاق المبكر الإلزامي):' : '👑 Super Manager Emergency Override Reason:');
        ovLbl.style.fontSize = '0.8rem';
        ovLbl.style.fontWeight = '700';
        const ovIn = el('input', 'in');
        ovIn.placeholder = ar ? 'مثال: صيانة طارئة للكهرباء / ظرف جوي استثنائي...' : 'Emergency reason...';
        ovIn.style.marginTop = '6px';

        const ovBtn = el('button', 'btn danger', ar ? '⚠️ فرض الإغلاق المبكر بأمر السوبر مانجر' : '⚠️ Force Early Close (Super Manager)');
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
          FOH.edit.toast(ar ? '🔒 تم إغلاق المطعم استثنائياً بأمر السوبر مانجر' : '🔒 Restaurant closed via Manager Override');
          FOH.app.render();
        });
        ovWrap.append(ovLbl, ovIn, ovBtn);
        box.append(ovWrap);
      }

      const closeDlgB = el('button', 'btn', ar ? 'إغلاق النافذة' : 'Cancel');
      closeDlgB.type = 'button';
      closeDlgB.style.width = '100%';
      closeDlgB.style.marginTop = '8px';
      closeDlgB.addEventListener('click', () => dlg.close());
      box.append(closeDlgB);
      dlg.append(box);
      dlg.showModal();
      return;
    }

    // Valid Closing Time (>= 02:00 AM, e.g. 02:30 AM with Last Guest)
    box.innerHTML =
      '<div class="grab"></div>' +
      '<h2>🚪 ' + (ar ? 'تأكيد إغلاق المطعم رسمياً (مع مغادرة آخر زبون)' : 'Confirm Official Restaurant Closing (Last Guest Left)') + '</h2>' +
      '<div style="padding:12px;border-radius:12px;background:var(--accent-soft);border:1px solid var(--accent);margin-bottom:12px;font-size:0.84rem;line-height:1.55;">' +
      '<div>🕒 <b>' + (ar ? 'وقت الإغلاق الفعلي:' : 'Actual Closing Time:') + '</b> ' + formatTime12Ar(nowHM) + (extMins > 0 ? (ar ? ' (تمديد مع آخر زبون +' + extMins + ' دقيقة بعد الـ ' + formatTime12Ar(h.minCloseTime) + ')' : ' (+' + extMins + 'm past ' + formatTime12Ar(h.minCloseTime) + ')') : '') + '</div>' +
      '<div>🌙 <b>' + (ar ? 'إنجاز شيت الإغلاق (Closing Sheet):' : 'Closing Sheet Completion:') + '</b> ' + doneClosingCount + ' / ' + allClosingLeaves.length + (leftClosingCount === 0 ? ' ✅' : (ar ? ' (متبقي ' + leftClosingCount + ' مهام)' : ' (' + leftClosingCount + ' left)')) + '</div>' +
      '<div>💰 <b>' + (ar ? 'ربط الساعات مع Tip Manager:' : 'Tip Manager Sync:') + '</b> ' + (extMins > 0 ? (ar ? 'سيتم إضافة +' + (extMins / 60).toFixed(1) + ' ساعة عمل إضافية تلقائياً للموظفين المناوبين' : '+' + (extMins / 60).toFixed(1) + 'h overtime will be added to Tip Manager') : (ar ? 'ساعات الشفت القياسية مكتملة' : 'Standard shift hours logged')) + '</div>' +
      '</div>';

    if (leftClosingCount > 0) {
      const openClsBtn = el('button', 'btn', ar ? '🌙 مراجعة واستكمال مهام الـ Closing Sheet المتبقية (' + leftClosingCount + ')' : '🌙 Review Remaining Closing Sheet Items (' + leftClosingCount + ')');
      openClsBtn.type = 'button';
      openClsBtn.style.width = '100%';
      openClsBtn.style.marginBottom = '10px';
      openClsBtn.addEventListener('click', () => {
        dlg.close();
        activateClosingSheet('all');
      });
      box.append(openClsBtn);
    }

    const confirmCloseBtn = el('button', 'btn primary', ar ? '✅ تأكيد مغادرة آخر زبون وإغلاق المطعم الآن (' + formatTime12Ar(nowHM) + ')' : '✅ Confirm Last Guest Left & Close Restaurant (' + formatTime12Ar(nowHM) + ')');
    confirmCloseBtn.type = 'button';
    confirmCloseBtn.style.width = '100%';
    confirmCloseBtn.addEventListener('click', () => {
      daySt.closedAt = nowHM;
      daySt.closedBy = myName;
      daySt.closedRole = roleMeta.badge;
      daySt.extensionMins = extMins;
      if (!daySt.kitchenLastOrderAt) daySt.kitchenLastOrderAt = h.kitchenLastOrder;
      if (!daySt.barLastOrderAt) daySt.barLastOrderAt = h.barLastOrder;

      // Credit late-guest extension hours into Tip Manager if not already credited today
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
      FOH.edit.toast(
        ar
          ? '🚪 تم إغلاق المطعم رسمياً الساعة ' + formatTime12Ar(nowHM) + (extMins > 0 ? ' واحتساب +' + extMins + ' دقيقة تمديد مع آخر زبون ✓' : ' ✓')
          : '🚪 Restaurant officially closed at ' + formatTime12Ar(nowHM) + ' ✓'
      );
      FOH.app.render();
    });

    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.style.width = '100%';
    cancelB.style.marginTop = '8px';
    cancelB.addEventListener('click', () => dlg.close());

    box.append(confirmCloseBtn, cancelB);
    dlg.append(box);
    dlg.showModal();
  }

  // ---- Inject Operational Hours & Super Roles Matrix into Settings (#settingsView) ----
  function appendHoursAndSuperRolesSettings(root) {
    if (!root || root.querySelector('#opsHoursSettingsCard')) return;
    const ar = isAr();
    const cfg = loadOpsConfig();
    const h = cfg.hours;

    // Card 1: Restaurant Operational Hours, Prep Start, Kitchen/Bar Last Order & Last Guest Close
    const hoursCard = el('section', 'card');
    hoursCard.id = 'opsHoursSettingsCard';
    hoursCard.style.padding = '16px';
    hoursCard.style.border = '1.5px solid var(--accent)';
    hoursCard.innerHTML =
      '<h3>🕒 ' +
      (ar
        ? 'ساعات عمل المطعم، دوام التحضير، الـ Last Order وإغلاق آخر زبون'
        : 'Restaurant Hours, Staff Prep Start, Last Order & Last-Guest Close') +
      '</h3>' +
      '<p class="setting-note">' +
      (ar
        ? 'حدد متى يبدأ دوام الموظفين للتحضير (مثلاً 12:00 ظهراً)، متى يفتح المطعم للزبائن (1:00 ظهراً)، مواعيد Last Order للمطبخ والبار، والحد الأدنى للإغلاق مع آخر زبون:'
        : 'Configure staff prep shift start, guest opening time, Kitchen/Bar Last Order, and minimum closing time:') +
      '</p>';

    const grid = el('div', 'ops-hours-grid');

    const makeTimeField = (lblTxt, val) => {
      const l = el('label', 'ops-time-field');
      const sp = el('span', '', lblTxt);
      const inp = el('input', 'in');
      inp.type = 'time';
      inp.value = val;
      l.append(sp, inp);
      return { l, inp };
    };

    const fPrep = makeTimeField(ar ? '☀️ بداية دوام التحضير (قبل الفتح)' : '☀️ Staff Shift & Prep Start', h.prepStart);
    const fOpen = makeTimeField(ar ? '🍽️ ساعة فتح المطعم للزبائن' : '🍽️ Restaurant Opens for Guests', h.doorsOpen);
    const fKitchenLO = makeTimeField(ar ? '🍳 آخر طلب للمطبخ (Kitchen LO)' : '🍳 Kitchen Last Order', h.kitchenLastOrder);
    const fBarLO = makeTimeField(ar ? '🍸 آخر طلب للبار (Bar LO)' : '🍸 Bar Last Order', h.barLastOrder);
    const fMinClose = makeTimeField(ar ? '🚪 الحد الأدنى لوقت إغلاق المطعم' : '🚪 Minimum Official Closing Time', h.minCloseTime);

    grid.append(fPrep.l, fOpen.l, fKitchenLO.l, fBarLO.l, fMinClose.l);
    hoursCard.append(grid);

    const lastGuestRow = el('label', 'tog');
    lastGuestRow.style.display = 'flex';
    lastGuestRow.style.justifyContent = 'space-between';
    lastGuestRow.style.alignItems = 'center';
    lastGuestRow.style.padding = '12px 0 6px';
    lastGuestRow.style.marginTop = '8px';
    lastGuestRow.style.borderTop = '1px solid var(--line)';
    lastGuestRow.innerHTML =
      '<span><b>⏳ ' +
      (ar
        ? 'الإغلاق مع مغادرة آخر زبون + منع الإغلاق المبكر إذا كان المطعم فارغاً (مثلاً 11:30 م)'
        : 'Close with Last Guest + Block Early Closing when empty (e.g. at 11:30 PM)') +
      '</b></span>';
    const lgCb = el('input', 'sw');
    lgCb.type = 'checkbox';
    lgCb.checked = h.closeWithLastGuest !== false;
    lastGuestRow.append(lgCb);
    hoursCard.append(lastGuestRow);

    const saveHoursBtn = el('button', 'btn primary', ar ? '💾 حفظ مواعيد الدوام والافتتاح والـ Last Order والإغلاق' : '💾 Save Operational Hours & Last Order Rules');
    saveHoursBtn.type = 'button';
    saveHoursBtn.style.width = '100%';
    saveHoursBtn.style.marginTop = '10px';
    saveHoursBtn.addEventListener('click', () => {
      cfg.hours = {
        prepStart: fPrep.inp.value || '12:00',
        doorsOpen: fOpen.inp.value || '13:00',
        kitchenLastOrder: fKitchenLO.inp.value || '00:00',
        barLastOrder: fBarLO.inp.value || '01:00',
        minCloseTime: fMinClose.inp.value || '02:00',
        closeWithLastGuest: lgCb.checked,
      };
      saveOpsConfig(cfg);
      FOH.edit.toast(ar ? 'تم حفظ ساعات عمل المطعم ومواعيد الـ Last Order ✓' : 'Operational hours & Last Order saved ✓');
      FOH.app.render();
    });
    hoursCard.append(saveHoursBtn);

    // Card 2: Super Roles Hierarchy & Permission Matrix
    const rolesCard = el('section', 'card');
    rolesCard.id = 'superRolesSettingsCard';
    rolesCard.style.padding = '16px';
    rolesCard.innerHTML =
      '<h3>👑 ' +
      (ar
        ? 'صلاحيات المناصب القيادية (Super Manager · Super Captain · Super Bartender · Super Waiter)'
        : 'Super Roles Hierarchy & Granular Permission Matrix') +
      '</h3>' +
      '<p class="setting-note">' +
      (ar
        ? 'حدد المنصب القيادي (Super Role) لكل موظف، وتَحكّم بالصلاحيات الممنوحة لكل منصب بدقة:'
        : 'Assign each employee a Super Role and customize the exact permissions granted to each role:') +
      '</p>';

    // Staff Super Role Assignment Box
    const assignBox = el('div', 'super-role-card');
    assignBox.innerHTML = '<div class="super-role-card-head"><b>👥 ' + (ar ? 'تعيين المناصب (Super Roles) للموظفين' : 'Assign Super Roles to Staff') + '</b></div>';
    const staffAccounts = [
      ['fadi', 'Fadi Al-Masri (فادي)'],
      ['ali', 'Ali Hassan (علي)'],
      ['maher', 'Maher Zaid (ماهر)'],
      ['sara', 'Sara Khoury (سارة)'],
    ];
    staffAccounts.forEach(([uname, fullLabel]) => {
      const row = el('div', '');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed var(--line)';

      const curRole = (cfg.staffSuperRoles && cfg.staffSuperRoles[uname]) || 'staff';
      const sel = el('select', 'in');
      sel.style.width = 'auto';
      sel.style.minHeight = '36px';
      Object.values(SUPER_ROLES_META).forEach((rm) => {
        const o = el('option', '', ar ? rm.labelAr : rm.labelEn);
        o.value = rm.id;
        o.selected = rm.id === curRole;
        sel.append(o);
      });
      sel.addEventListener('change', () => {
        cfg.staffSuperRoles[uname] = sel.value;
        saveOpsConfig(cfg);
        FOH.edit.toast(ar ? 'تم تحديث منصب ' + fullLabel + ' إلى ' + SUPER_ROLES_META[sel.value].badge + ' ✓' : 'Updated role for ' + fullLabel + ' ✓');
        FOH.app.render();
      });

      row.append(el('b', '', '👤 ' + fullLabel), sel);
      assignBox.append(row);
    });
    rolesCard.append(assignBox);

    // Role Permissions Matrix Cards
    ['super_manager', 'super_captain', 'super_bartender', 'super_waiter'].forEach((rKey) => {
      const rm = SUPER_ROLES_META[rKey];
      const rPerms = cfg.rolePermissions[rKey] || {};
      const rCard = el('div', 'super-role-card');
      rCard.innerHTML =
        '<div class="super-role-card-head">' +
        '<b>' + (ar ? rm.labelAr : rm.labelEn) + '</b>' +
        '<span class="super-role-pill ' + rKey + '">' + rm.badge + '</span>' +
        '</div>';

      const pGrid = el('div', 'super-perm-grid');
      PERM_LABELS.forEach(([pKey, lblAr, lblEn]) => {
        const item = el('label', 'super-perm-item');
        const txt = el('span', '', ar ? lblAr : lblEn);
        const cb = el('input', 'sw');
        cb.type = 'checkbox';
        cb.checked = !!rPerms[pKey];
        cb.addEventListener('change', () => {
          if (!cfg.rolePermissions[rKey]) cfg.rolePermissions[rKey] = {};
          cfg.rolePermissions[rKey][pKey] = cb.checked;
          saveOpsConfig(cfg);
          FOH.edit.toast(ar ? 'تم تحديث صلاحيات ' + rm.badge + ' ✓' : 'Updated permissions for ' + rm.badge + ' ✓');
          FOH.app.render();
        });
        item.append(txt, cb);
        pGrid.append(item);
      });
      rCard.append(pGrid);
      rolesCard.append(rCard);
    });

    // Card 3: Warehouse & Bar Ordering Authority & Delegation (#orderingDelegationCard)
    const ordCard = el('section', 'card');
    ordCard.id = 'orderingDelegationSettingsCard';
    ordCard.style.padding = '16px';
    ordCard.style.border = '1.5px solid #10b981';
    ordCard.innerHTML =
      '<h3>🛒 ' +
      (ar
        ? 'تفويض وإدارة صلاحيات طلبيات المستودع والبار (Ordering Delegation & Missions)'
        : 'Warehouse & Bar Ordering Authority & Delegation') +
      '</h3>' +
      '<p class="setting-note">' +
      (ar
        ? 'تحكّم بدقة بمن يرى قسم الطلبيات ويحق له إرسال طلبات المستودع والبار. يمكنك توجيه الطلبية لمنصب بالكامل (مثل البارتندر)، أو تخصيص ويتر أو كابتن محدد بالاسم دون فتحها لبقية الفريق منعاً للتشتت:'
        : 'Control who sees the Orders section and submits warehouse requisitions. Grant access to an entire role (e.g. Bartenders) or designate specific staff members by name:') +
      '</p>';

    // Section A: By Role
    const roleBox = el('div', 'super-role-card');
    roleBox.style.marginBottom = '12px';
    roleBox.innerHTML =
      '<div class="super-role-card-head">' +
      '<b>🏷️ ' + (ar ? '1. التوجيه حسب المنصب القيادي (Role / Position)' : '1. Authorize Entire Role / Position') + '</b>' +
      '</div>' +
      '<p style="font-size:0.75rem;color:var(--ink2);margin:4px 0 10px;">' +
      (ar ? 'أي موظف يحمل المنصب المفعّل سيتمكن تلقائياً من فتح قسم الطلبيات (مثلاً: كافة البارتندرية الأربعة لمستلزمات البار).' : 'Any employee in an active role can access the Orders section (e.g. all 4 bartenders for bar supply).') +
      '</p>';

    const delRoles = (cfg.orderingDelegation && Array.isArray(cfg.orderingDelegation.roles))
      ? cfg.orderingDelegation.roles
      : ['super_manager', 'super_bartender'];

    [
      ['super_bartender', ar ? '🍸 سوبر بارتندر (Super Bartender)' : '🍸 Super Bartender', ar ? 'تمكين كافة البارتندرية الأربعة من طلب بضاعة ومستلزمات البار' : 'Allow all bartenders to place bar beverage orders'],
      ['super_captain', ar ? '🎖️ سوبر كابتن (Super Captain)' : '🎖️ Super Captain', ar ? 'تمكين كافة الكباتن من إنشاء وإرسال الطلبيات' : 'Allow all captains to create orders'],
      ['super_waiter', ar ? '⭐ سوبر ويتر (Super Waiter)' : '⭐ Super Waiter', ar ? 'تمكين كافة الويترية من قسم الطلبيات (غير موصى به لكثرة العدد)' : 'Allow all waiters to create orders (not recommended)'],
    ].forEach(([rk, rkLabel, rkSub]) => {
      const row = el('label', 'tog');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed var(--line)';
      row.style.cursor = 'pointer';

      row.innerHTML = '<div><b>' + rkLabel + '</b><small style="display:block;color:var(--ink2);font-size:0.72rem;">' + rkSub + '</small></div>';
      const cb = el('input', 'sw');
      cb.type = 'checkbox';
      cb.checked = delRoles.includes(rk);
      cb.addEventListener('change', () => {
        if (!cfg.orderingDelegation) cfg.orderingDelegation = { roles: ['super_manager', 'super_bartender'], staffUsernames: ['sara'] };
        if (!Array.isArray(cfg.orderingDelegation.roles)) cfg.orderingDelegation.roles = ['super_manager', 'super_bartender'];
        if (cb.checked) {
          if (!cfg.orderingDelegation.roles.includes(rk)) cfg.orderingDelegation.roles.push(rk);
        } else {
          cfg.orderingDelegation.roles = cfg.orderingDelegation.roles.filter((r) => r !== rk);
        }
        if (!cfg.orderingDelegation.roles.includes('super_manager')) cfg.orderingDelegation.roles.push('super_manager');
        saveOpsConfig(cfg);
        FOH.edit.toast(ar ? 'تم تحديث صلاحية الطلبيات لمنصب ' + rkLabel + ' ✓' : 'Updated ordering authority for ' + rkLabel + ' ✓');
        FOH.app.render();
      });
      row.append(cb);
      roleBox.append(row);
    });
    ordCard.append(roleBox);

    // Section B: By Specific Staff Member by Name
    const staffBox = el('div', 'super-role-card');
    staffBox.innerHTML =
      '<div class="super-role-card-head">' +
      '<b>👤 ' + (ar ? '2. التخصيص بالاسم لموظف محدد (Specific Staff Delegation)' : '2. Specific Staff Member Delegation') + '</b>' +
      '</div>' +
      '<p style="font-size:0.75rem;color:var(--ink2);margin:4px 0 10px;">' +
      (ar ? 'إذا كان لديك موظف معين (مثل سارة) مكلّف بالطلبيات، يمكنك تفعيل الصلاحية لها بالاسم دون إظهارها لبقية الويترية أو الكباتن:' : 'Designate a specific staff member (e.g. Sara) for orders without granting access to other waiters or captains:') +
      '</p>';

    const delStaff = (cfg.orderingDelegation && Array.isArray(cfg.orderingDelegation.staffUsernames))
      ? cfg.orderingDelegation.staffUsernames
      : ['sara'];

    const staffList = [
      ['sara', ar ? 'سارة خوري (سوبر ويتر)' : 'Sara Khoury (Super Waiter)', '⭐ Waiter'],
      ['ali', ar ? 'علي حسن (سوبر كابتن)' : 'Ali Hassan (Super Captain)', '🎖️ Captain'],
      ['maher', ar ? 'ماهر زيد (سوبر بارتندر)' : 'Maher Zaid (Super Bartender)', '🍸 Bartender'],
      ['fadi', ar ? 'فادي المصري (سوبر مانجر)' : 'Fadi Al-Masri (Super Manager)', '👑 Manager'],
    ];
    const seenU = new Set(staffList.map((s) => s[0]));
    (S.tpl.staff || []).forEach((st) => {
      const u = (st.username || (st.name || '').split(' ')[0] || st.id || '').toLowerCase().trim();
      if (u && !seenU.has(u)) {
        seenU.add(u);
        const rName = roleName(st.role) || 'Staff';
        const disp = st.name + (st.nickname ? ' (' + st.nickname + ')' : '');
        staffList.push([u, disp, rName]);
      }
    });

    staffList.forEach(([uname, fullName, roleTag]) => {
      const row = el('label', 'tog');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px dashed var(--line)';
      row.style.cursor = uname === 'fadi' ? 'default' : 'pointer';

      row.innerHTML = '<div><b>👤 ' + fullName + '</b><small style="display:block;color:var(--ink2);font-size:0.72rem;">' + (uname === 'fadi' ? (ar ? '👑 المدير العام (مفعل دائماً)' : '👑 General Manager (Always Active)') : (ar ? 'مهمة إدارة طلبيات الصالة والمستودع' : 'Floor & warehouse order mission')) + '</small></div>';

      if (uname === 'fadi') {
        const badge = el('span', 'tag mine', ar ? 'مفعل دائماً' : 'Always Active');
        badge.style.fontSize = '0.72rem';
        row.append(badge);
      } else {
        const cb = el('input', 'sw');
        cb.type = 'checkbox';
        cb.checked = delStaff.map((s) => s.toLowerCase()).includes(uname);
        cb.addEventListener('change', () => {
          if (!cfg.orderingDelegation) cfg.orderingDelegation = { roles: ['super_manager', 'super_bartender'], staffUsernames: ['sara'] };
          if (!Array.isArray(cfg.orderingDelegation.staffUsernames)) cfg.orderingDelegation.staffUsernames = ['sara'];
          if (cb.checked) {
            if (!cfg.orderingDelegation.staffUsernames.includes(uname)) cfg.orderingDelegation.staffUsernames.push(uname);
          } else {
            cfg.orderingDelegation.staffUsernames = cfg.orderingDelegation.staffUsernames.filter((u) => u !== uname);
          }
          saveOpsConfig(cfg);
          FOH.edit.toast(ar ? 'تم تحديث صلاحية الطلبيات للموظف ' + fullName + ' ✓' : 'Updated ordering authority for ' + fullName + ' ✓');
          FOH.app.render();
        });
        row.append(cb);
      }
      staffBox.append(row);
    });
    ordCard.append(staffBox);

    // Insert at the top of #settingsView right after the Brand card
    const firstCard = root.querySelector('section.card');
    if (firstCard && firstCard.nextSibling) {
      root.insertBefore(hoursCard, firstCard.nextSibling);
      root.insertBefore(rolesCard, hoursCard.nextSibling);
      root.insertBefore(ordCard, rolesCard.nextSibling);
    } else {
      root.append(hoursCard, rolesCard, ordCard);
    }
  }


    // ============================================================================
  // 12. SUPER EMPLOYEE v10 UPGRADE:
  //     - Clean Header (☰ + Dynamic Role App Name + 🔔 Notification Bell + Avatar)
  //     - Contextual Lock/Edit/Date/Progress inside Checklist Section
  //     - Relocated "Report Damage / Repair" to Inventory & Sidebar
  //     - Role-Scoped Workspace (Super Waiter / Super Bartender / Super Captain / Super Manager)
  //     - Precision Disappear-and-Reappear Snooze Engine + Lock-Screen Push
  // ============================================================================
  const SNOOZE_TIMERS_KEY = 'super-employee.snoozeTimers.v2';
  let roleScopeOnly = true; // Automatically scopes checklist & tasks to employee's role

  const ROLE_APP_IDENTITY = {
    super_manager: {
      titleEn: '👑 Super Manager',
      titleAr: '👑 Super Manager · سوبر مانجر',
      subEn: 'Full Restaurant & Bar Management Workspace',
      subAr: 'منصة الإدارة الشاملة للمطعم والبار والتحليلات',
      allowedViews: ['opening', 'closing_sheet', 'mine', 'orders', 'inv', 'academy', 'tips', 'dashboard', 'profile', 'settings'],
      openingKeywords: null, // all sections
      closingDept: 'all',
    },
    super_captain: {
      titleEn: '🎖️ Super Captain',
      titleAr: '🎖️ Super Captain · سوبر كابتن',
      subEn: 'Floor Leadership, Last Order & Closing Sign-off',
      subAr: 'قيادة الصالة، إعلان الـ Last Order واعتماد الإغلاق',
      allowedViews: ['opening', 'closing_sheet', 'mine', 'orders', 'inv', 'academy', 'tips', 'profile'],
      openingKeywords: null, // all floor & station sections
      closingDept: 'all',
    },
    super_bartender: {
      titleEn: '🍸 Super Bartender',
      titleAr: '🍸 Super Bartender · سوبر بارتندر',
      subEn: 'Bar Prep, Cocktails, Beverage Orders & Bar Closing',
      subAr: 'واجهة ومهام البار المخصصة · المشروبات، الطلبيات وإغلاق البار',
      allowedViews: ['opening', 'closing_sheet', 'mine', 'orders', 'inv', 'academy', 'tips', 'profile'],
      openingKeywords: ['bar', 'station', 'clean', 'staff', 'music', 'بار', 'محطات', 'نظافة', 'موظف'],
      closingDept: 'bar',
    },
    super_waiter: {
      titleEn: '⭐ Super Waiter',
      titleAr: '⭐ Super Waiter · سوبر ويتر',
      subEn: 'Floor Tables, Terrace, Waiter Stations & Menu Academy',
      subAr: 'واجهة ومهام الويتر المخصصة · تجهيز الطاولات، الصالة والأكاديمية',
      allowedViews: ['opening', 'closing_sheet', 'mine', 'orders', 'academy', 'tips', 'profile'],
      openingKeywords: ['table', 'floor', 'terrace', 'clean', 'staff', 'music', 'station', 'طاولات', 'صالة', 'تراس', 'نظافة', 'محطات'],
      closingDept: 'floor',
    },
    staff: {
      titleEn: '⭐ Super Waiter',
      titleAr: '⭐ Super Waiter · سوبر ويتر',
      subEn: 'Assigned Shift Tasks, Tables & Menu Academy',
      subAr: 'مهام الشفت الموكلة لك، الصالة والأكاديمية',
      allowedViews: ['opening', 'closing_sheet', 'mine', 'academy', 'tips', 'profile'],
      openingKeywords: ['table', 'floor', 'terrace', 'clean', 'staff', 'طاولات', 'صالة', 'نظافة'],
      closingDept: 'floor',
    },
  };

  function getAppRoleIdentity() {
    const rKey = getCurrentSuperRoleKey();
    const base = ROLE_APP_IDENTITY[rKey] || ROLE_APP_IDENTITY.super_waiter;
    const copy = { ...base, allowedViews: [...(base.allowedViews || [])] };
    if (!canCurrentUserAccessOrders()) {
      copy.allowedViews = copy.allowedViews.filter((v) => v !== 'orders');
    }
    return copy;
  }

  // Switch active employee account in 1 tap (for testing & quick terminal handoff)
  function quickSwitchEmployeeAccount(username) {
    const ar = isAr();
    const accounts = {
      fadi: {
        username: 'fadi',
        firstName: 'Fadi',
        lastName: 'Al-Masri',
        nickname: 'Fadi',
        phone: '+962 7 9000 1001',
        email: 'fadi.m@ceenlounge.com',
        inviteCode: 'CEEN-1001',
        displayName: ar ? 'فادي (سوبر مانجر)' : 'Fadi (Super Manager)',
        roleName: '👑 Super Manager',
        roleAr: '👑 سوبر مانجر',
        isManager: true,
        shift: '12:00 – 02:00 · Restaurant Manager',
      },
      ali: {
        username: 'ali',
        firstName: 'Ali',
        lastName: 'Hassan',
        nickname: 'Ali',
        phone: '+962 7 9000 2002',
        email: 'ali.h@ceenlounge.com',
        inviteCode: 'CEEN-2002',
        displayName: ar ? 'علي (سوبر كابتن)' : 'Ali (Super Captain)',
        roleName: '🎖️ Super Captain',
        roleAr: '🎖️ سوبر كابتن',
        isManager: false,
        isCaptain: true,
        shift: '12:00 – 02:00 · Floor Captain',
      },
      maher: {
        username: 'maher',
        firstName: 'Maher',
        lastName: 'Zaid',
        nickname: 'Leo',
        phone: '+962 7 9000 4004',
        email: 'maher.z@ceenlounge.com',
        inviteCode: 'CEEN-4004',
        displayName: ar ? 'ماهر (سوبر بارتندر)' : 'Maher (Super Bartender)',
        roleName: '🍸 Super Bartender',
        roleAr: '🍸 سوبر بارتندر',
        isManager: false,
        shift: '12:00 – 02:00 · Main Bar Lead',
      },
      sara: {
        username: 'sara',
        firstName: 'Sara',
        lastName: 'Khoury',
        nickname: 'Sara',
        phone: '+962 7 9000 3003',
        email: 'sara.k@ceenlounge.com',
        inviteCode: 'CEEN-3003',
        displayName: ar ? 'سارة (سوبر ويتر)' : 'Sara (Super Waiter)',
        roleName: '⭐ Super Waiter',
        roleAr: '⭐ سوبر ويتر',
        isManager: false,
        shift: '12:00 – 02:00 · Indoor & Terrace Waiter',
      },
    };
    const target = accounts[username] || accounts.fadi;
    const prevSess = getSession() || {};
    const nextSess = {
      ...prevSess,
      ...target,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSess));
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}

    // Bind S.me to the matching staff & role in S.tpl
    const targetRoleName = username === 'fadi' ? 'Supervisor' : username === 'ali' ? 'Captain' : username === 'maher' ? 'Bartender' : 'Waiter';
    let roleObj = (S.tpl.roles || []).find((r) => (r.name || '').toLowerCase().includes(targetRoleName.toLowerCase())) || S.tpl.roles[0];
    let person = (S.tpl.staff || []).find((p) => (p.name || '').toLowerCase().startsWith(username));
    if (person && roleObj) {
      person.role = roleObj.id;
      S.me = { staffId: person.id, role: roleObj.id, name: person.name };
      FOH.store.saveMe(S.me);
    }

    roleScopeOnly = username === 'sara' || username === 'maher';
    const ident = ROLE_APP_IDENTITY[getCurrentSuperRoleKey()] || ROLE_APP_IDENTITY.super_waiter;
    if (isClosingSheetActive()) {
      activeClosingDeptFilter = ident.closingDept || 'all';
    }
    if (!ident.allowedViews.includes(S.view)) {
      S.view = 'opening';
    }
    location.reload();
  }

  // ---- Precision Disappear-and-Reappear Snooze Timer Engine ----
  function loadSnoozeTimers() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(SNOOZE_TIMERS_KEY), '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }

  function saveSnoozeTimers(map) {
    try {
      localStorage.setItem(SNOOZE_TIMERS_KEY, JSON.stringify(map));
    } catch {}
  }

  function isAlertSnoozedNow(alertKey) {
    const map = loadSnoozeTimers();
    const entry = map[alertKey];
    if (!entry || !entry.wakeAtMs) return false;
    return Date.now() < entry.wakeAtMs;
  }

  function getActiveSnoozeTimersList() {
    const map = loadSnoozeTimers();
    const now = Date.now();
    return Object.entries(map)
      .filter(([, v]) => v && v.wakeAtMs > now)
      .map(([k, v]) => ({ key: k, ...v, remainingSec: Math.max(1, Math.ceil((v.wakeAtMs - now) / 1000)) }))
      .sort((a, b) => a.wakeAtMs - b.wakeAtMs);
  }

  async function ensureNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'default') {
      try {
        return await Notification.requestPermission();
      } catch {
        return Notification.permission;
      }
    }
    return Notification.permission;
  }

  async function fireNativeLockScreenNotification(title, body, tag) {
    try {
      if (navigator.vibrate) navigator.vibrate([220, 100, 220]);
    } catch {}
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            tag: tag || 'super-emp-alert',
            renotify: true,
            requireInteraction: true,
            vibrate: [220, 100, 220, 100, 300],
            data: './',
          });
          return;
        }
      }
      new Notification(title, { body, icon: './icons/icon-192.png', tag: tag || 'super-emp-alert' });
    } catch {}
  }

  async function scheduleServiceWorkerNotification(id, title, body, delayMs) {
    await ensureNotificationPermission();
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const targetSW = (navigator.serviceWorker && navigator.serviceWorker.controller) || (reg && (reg.active || reg.waiting || reg.installing));
        if (targetSW) {
          targetSW.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            id,
            title,
            body,
            delayMs,
            tag: id,
          });
        }
      }
    } catch {}
  }

  function snoozeAlertWithTimer({ ids, bannerGroup, title, body, minutes }) {
    const ar = isAr();
    const now = Date.now();
    const delayMs = Math.max(5000, Math.round(Number(minutes) * 60000));
    const wakeAtMs = now + delayMs;
    const wakeDate = new Date(wakeAtMs);
    const wakeHM = String(wakeDate.getHours()).padStart(2, '0') + ':' + String(wakeDate.getMinutes()).padStart(2, '0');

    const map = loadSnoozeTimers();
    const targetIds = Array.isArray(ids) && ids.length ? ids : [bannerGroup || 'general_alert'];
    targetIds.forEach((id) => {
      map[id] = {
        wakeAtMs,
        title: title || (ar ? 'تنبيه Super Employee' : 'Super Employee Alert'),
        body: body || '',
        minutes,
        atHM: FOH.time.nowHM(),
        wakeHM,
        notified: false,
      };
    });
    if (bannerGroup) {
      map['__group_' + bannerGroup] = {
        wakeAtMs,
        title: title || (ar ? 'تنبيه Super Employee' : 'Super Employee Alert'),
        body: body || '',
        minutes,
        atHM: FOH.time.nowHM(),
        wakeHM,
        notified: false,
      };
    }
    saveSnoozeTimers(map);

    // Also sync with FOH.reminders for compatibility
    if (FOH.reminders && FOH.reminders.snoozeItems && minutes >= 1) {
      FOH.reminders.snoozeItems(targetIds, S.date, FOH.time.nowHM(), Math.ceil(minutes));
    }

    // Immediately hide the banner in the DOM!
    if (bannerGroup === 'task_banner' && $('banner')) $('banner').hidden = true;
    if (bannerGroup === 'health_banner' && $('healthAlertBanner')) $('healthAlertBanner').hidden = true;

    // Schedule background / lock-screen notification via Service Worker
    const notifId = 'snooze_' + (bannerGroup || targetIds[0]);
    const ident = getAppRoleIdentity();
    const notifTitle = (ar ? ident.titleAr : ident.titleEn) + ' · 🔔 ' + (title || (ar ? 'تذكير مهمة' : 'Task Reminder'));
    const notifBody = body || (ar ? 'انتهى وقت التأجيل — يرجى إنجاز المهمة الآن!' : 'Snooze time ended — please complete this task now!');
    scheduleServiceWorkerNotification(notifId, notifTitle, notifBody, delayMs);

    const minsLabel = minutes < 1 ? (Math.round(minutes * 60) + (ar ? ' ثانية' : 's')) : minutes >= 1440 ? (ar ? 'بقية اليوم' : 'today') : (minutes + (ar ? ' دقيقة' : 'm'));
    FOH.edit.toast(
      ar
        ? '💤 اختفى التنبيه وتم تأجيله لمدة (' + minsLabel + ') · سيظهر ويرسل إشعاراً الساعة ' + wakeHM
        : '💤 Alert hidden & snoozed for ' + minsLabel + ' · Will reappear & push at ' + wakeHM
    );

    updateNotifBellUI();
  }

  // Background watcher every 2 seconds to wake up expired snoozes & re-show banner + push notification
  function checkExpiredSnoozeTimers() {
    const map = loadSnoozeTimers();
    const now = Date.now();
    let wokeAny = false;
    let wokeEntry = null;

    Object.keys(map).forEach((k) => {
      const entry = map[k];
      if (!entry || !entry.wakeAtMs) return;
      if (now >= entry.wakeAtMs) {
        if (!entry.notified && !k.startsWith('__group_')) {
          wokeEntry = entry;
        }
        delete map[k];
        wokeAny = true;
      }
    });

    if (wokeAny) {
      saveSnoozeTimers(map);
      if (FOH.reminders && FOH.reminders.clearSnoozesForDate) {
        FOH.reminders.clearSnoozesForDate(S.date);
      }
      if (wokeEntry) {
        const ar = isAr();
        const ident = getAppRoleIdentity();
        fireNativeLockScreenNotification(
          (ar ? ident.titleAr : ident.titleEn) + ' · ⏰ ' + (wokeEntry.title || ''),
          wokeEntry.body || (ar ? 'انتهى وقت التأجيل وحان موعد التنبيه!' : 'Snooze ended — reminder is due now!'),
          'wake_' + Date.now()
        );
        FOH.edit.toast(
          ar
            ? '🔔 حان موعد التنبيه المؤجل: ' + (wokeEntry.body || wokeEntry.title)
            : '🔔 Snoozed alert is due now: ' + (wokeEntry.body || wokeEntry.title)
        );
      }
      FOH.app.render();
    }
  }

  // ---- Upgrade Both Alert Banners so Snooze Hides Immediately & Never Stacks Clutter ----
  function renderSmartAlertBanners() {
    const ar = isAr();
    const hBox = $('healthAlertBanner');
    const tBox = $('banner');

    // 1. Check if Task Banner is snoozed as a group
    if (tBox && !tBox.hidden) {
      if (isAlertSnoozedNow('__group_task_banner')) {
        tBox.hidden = true;
      } else {
        // Add +1m Quick Test Snooze & wire all snooze buttons to snoozeAlertWithTimer
        const mainTxt = (tBox.querySelector('.banner-main') || tBox).textContent || '';
        const acts = tBox.querySelector('.banner-actions');
        if (acts && !acts.dataset.v10Wired) {
          acts.dataset.v10Wired = '1';
          acts.replaceChildren();

          const doneBtn = el('button', 'snooze-btn done-now', ar ? '✓ أُنجزت الآن' : '✓ Done Now');
          doneBtn.type = 'button';
          doneBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const due = FOH.reminders.next(FOH.preview.sections(), S.run.checked, FOH.tasksView.todayStates(), S.date, FOH.time.nowHM());
            const now = FOH.time.nowHM();
            if (due && due.items) {
              due.items.forEach((entry) => {
                if (entry.kind === 'task') {
                  const st = FOH.schedule.stateOn(entry.item, S.log, S.date, FOH.time.todayISO(), now);
                  if (st && !st.doneEntry) {
                    FOH.schedule.toggle(S.log, st, S.date, now, S.me.name);
                    FOH.store.saveLog(S.log);
                  }
                } else {
                  FOH.model.leaves(entry.item).forEach((lf) => {
                    S.run.checked[lf.id] = now;
                  });
                  FOH.store.saveRun(S.date, S.run);
                }
              });
            }
            FOH.app.render();
          });
          acts.append(doneBtn);

          [
            [1, ar ? '💤 +1د (تجربة)' : '💤 +1m'],
            [15, ar ? '💤 +15د' : '💤 +15m'],
            [30, ar ? '💤 +30د' : '💤 +30m'],
            [60, ar ? '💤 +1س' : '💤 +1h'],
            [1440, ar ? '🔕 كتم اليوم' : '🔕 Mute Today'],
          ].forEach(([mins, lbl]) => {
            const b = el('button', 'snooze-btn', lbl);
            b.type = 'button';
            b.addEventListener('click', (e) => {
              e.stopPropagation();
              const due = FOH.reminders.next(FOH.preview.sections(), S.run.checked, FOH.tasksView.todayStates(), S.date, FOH.time.nowHM());
              snoozeAlertWithTimer({
                ids: (due && due.ids) || ['task_due'],
                bannerGroup: 'task_banner',
                title: ar ? 'تذكير مهمة مستحقة' : 'Due Task Reminder',
                body: mainTxt.trim(),
                minutes: mins,
              });
            });
            acts.append(b);
          });
        }
      }
    }

    // 2. Check Health Banner snooze & prevent double-banner stacking on mobile
    if (hBox) {
      if (isAlertSnoozedNow('__group_health_banner')) {
        hBox.hidden = true;
      } else if (!hBox.hidden) {
        // Wire health banner snooze buttons to snoozeAlertWithTimer
        const hTxt = (hBox.querySelector('b') || hBox).textContent || '';
        const hActs = hBox.querySelector('.health-banner-actions');
        if (hActs && !hActs.dataset.v10Wired) {
          hActs.dataset.v10Wired = '1';
          hActs.replaceChildren();

          const isMgr = getCurrentSuperRoleKey() === 'super_manager';
          let actionBtn;
          if (isMgr) {
            actionBtn = el('button', 'snooze-btn done-now', ar ? '📅 تحديث التاريخ (مدير)' : '📅 Update Expiry (Manager)');
            actionBtn.type = 'button';
            actionBtn.addEventListener('click', () => {
              S.view = 'profile';
              FOH.app.render();
            });
          } else {
            actionBtn = el('button', 'snooze-btn done-now', ar ? '🏥 إشعار الإدارة بالتجديد' : '🏥 Notify Manager');
            actionBtn.type = 'button';
            actionBtn.addEventListener('click', () => {
              const sess = getSession();
              if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
                FOH.cloudRealtime.broadcast('HEALTH_CERT_RENEWAL_REQUEST', {
                  by: (sess && sess.displayName) || S.me.name || 'Staff',
                  at: FOH.time.nowHM(),
                });
              }
              FOH.edit.toast(ar ? 'تم إرسال إشعار لإدارة المطعم لمراجعة وتحديث الشهادة الصحية ✓' : 'Management notified of renewal request ✓');
              const alerts = getHealthAlerts();
              snoozeAlertWithTimer({
                ids: alerts.map((a) => a.snoozeId),
                bannerGroup: 'health_banner',
                title: ar ? 'طلب تجديد الشهادة الصحية' : 'Health Certificate Renewal',
                body: hTxt.trim(),
                minutes: 1440,
              });
            });
          }
          hActs.append(actionBtn);

          [
            [1, ar ? '💤 +1د (تجربة)' : '💤 +1m'],
            [60, ar ? '💤 +1س' : '💤 +1h'],
            [1440, ar ? '🔕 كتم اليوم' : '🔕 Mute Today'],
          ].forEach(([mins, lbl]) => {
            const b = el('button', 'snooze-btn', lbl);
            b.type = 'button';
            b.addEventListener('click', () => {
              const alerts = getHealthAlerts();
              snoozeAlertWithTimer({
                ids: alerts.map((a) => a.snoozeId),
                bannerGroup: 'health_banner',
                title: ar ? 'تنبيه الشهادة الصحية' : 'Health Certificate Alert',
                body: hTxt.trim(),
                minutes: mins,
              });
            });
            hActs.append(b);
          });
        }
      }
    }

    // If BOTH banners are visible simultaneously on mobile, keep only the task banner in the header and put the second inside 🔔 Notification Center so header stays compact!
    if (hBox && tBox && !hBox.hidden && !tBox.hidden) {
      hBox.hidden = true;
    }

    updateNotifBellUI();
  }

  // ---- Notification Bell 🔔 in Header & Notification Center Modal ----
  function ensureNotifBellInHeader() {
    let bellBtn = $('notifBellBtn');
    if (!bellBtn) {
      const cluster = document.querySelector('.top-right-actions');
      const bar = document.querySelector('header.top .bar');
      const profBtn = $('profileBtn');
      bellBtn = el('button', 'notif-bell-btn');
      bellBtn.type = 'button';
      bellBtn.id = 'notifBellBtn';
      bellBtn.setAttribute('aria-label', 'Notifications');
      bellBtn.innerHTML = '🔔<span id="notifCountBadge" class="notif-bell-badge" hidden>0</span>';
      if (cluster && profBtn) cluster.insertBefore(bellBtn, profBtn);
      else if (bar && profBtn) bar.insertBefore(bellBtn, profBtn);
    }
    if (bellBtn && !bellBtn.dataset.v18Wired) {
      bellBtn.dataset.v18Wired = '1';
      bellBtn.addEventListener('click', openNotificationCenterModal);
    }
  }

  function getActivePendingNameChanges() {
    const fromStorage = typeof loadPendingNameChanges === 'function' ? loadPendingNameChanges() : (typeof FOH.loadPendingNameChanges === 'function' ? FOH.loadPendingNameChanges() : []);
    const fromStaff = (S.tpl.staff || []).map((p) => p.pendingNameChange).filter((p) => p && p.status === 'pending');
    const map = new Map();
    fromStorage.concat(fromStaff).forEach((it) => {
      if (it && it.status === 'pending') {
        const key = it.staffId || it.staffUsername || it.id;
        if (!map.has(key) || (it.requestedAt && (!map.get(key).requestedAt || it.requestedAt > map.get(key).requestedAt))) {
          map.set(key, it);
        }
      }
    });
    return Array.from(map.values());
  }

  function updateNotifBellUI() {
    ensureNotifBellInHeader();
    const badge = $('notifCountBadge');
    if (!badge) return;
    const hAlerts = isAlertSnoozedNow('__group_health_banner') ? [] : getHealthAlerts();
    const due = !isAlertSnoozedNow('__group_task_banner')
      ? FOH.reminders.next(FOH.preview.sections(), S.run.checked, FOH.tasksView.todayStates(), S.date, FOH.time.nowHM())
      : null;
    const activeCount = hAlerts.length + (due && due.ids ? due.ids.length : 0);
    const snoozedList = getActiveSnoozeTimersList().filter((x) => !x.key.startsWith('__group_'));
    const unreadTasks = (typeof loadTaskInbox === "function" ? loadTaskInbox().length : 0);
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const pendingChanges = isMgr ? getActivePendingNameChanges() : [];
    const total = activeCount + snoozedList.length + unreadTasks + pendingChanges.length;

    badge.hidden = total === 0;
    badge.textContent = String(total);
    badge.classList.toggle('snoozed-only', activeCount === 0 && snoozedList.length > 0 && pendingChanges.length === 0);
  }

  let notifCenterInterval = 0;

  function openNotificationCenterModal() {
    const ar = isAr();
    let dlg = $('notifCenterDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'notifCenterDialog';
      dlg.addEventListener('close', () => clearInterval(notifCenterInterval));
      dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
      document.body.append(dlg);
    }

    function drawCenter() {
      dlg.replaceChildren();
      const box = el('div', '');
      box.style.padding = '14px 16px 20px';

      const perm = 'Notification' in window ? Notification.permission : 'unsupported';
      const ident = getAppRoleIdentity();
      const sess = getSession();
      const isMgr = !sess || !!sess.isManager;
      const pendingChanges = isMgr ? getActivePendingNameChanges() : [];

      box.innerHTML =
        '<div class="grab"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">' +
        '<h2 style="margin:0;font-size:1.08rem;">🔔 ' + (ar ? 'مركز الإشعارات والتنبيهات المؤجلة' : 'Notification Center & Snoozed Alerts') + '</h2>' +
        '<span class="super-role-pill">' + (ar ? ident.titleAr : ident.titleEn) + '</span>' +
        '</div>';

      // Section 0: Manager Pending Approvals if any
      if (pendingChanges.length > 0) {
        const pac = el('div', 'pending-approvals-card');
        pac.innerHTML =
          '<div class="pac-head"><b>📝 ' + (ar ? 'طلبات تعديل الأسماء بانتظار اعتمادك:' : 'Pending Staff Name Change Approvals:') + '</b><span class="pac-badge">' + pendingChanges.length + '</span></div>';
        const pacList = el('div', 'pac-list');
        pendingChanges.forEach((req) => {
          let st = (S.tpl.staff || []).find((p) => p.id === req.staffId || (req.staffUsername && (p.name || '').toLowerCase().startsWith(req.staffUsername.toLowerCase())));
          const it = el('div', 'pac-item');
          it.innerHTML =
            '<div class="pac-item-info">' +
            '<b>' + (FOH.escapeHtml(req.currentName || (st && st.name) || 'Staff')) + '</b> (' + (st ? roleName(st.role) : 'Staff') + ')<br>' +
            (ar ? 'الاسم الجديد المطلوب:' : 'Requested Legal Name:') + ' <b style="color:var(--accent);">' + (FOH.escapeHtml(req.reqFullName || (req.reqFirstName + ' ' + req.reqLastName))) + '</b><br>' +
            (ar ? 'الـ Nickname المقترح:' : 'Requested Nickname:') + ' <b style="color:#10b981;">🏷️ ' + (FOH.escapeHtml(req.reqNickname || '—')) + '</b>' +
            '</div>';
          const aRow = el('div', 'pac-item-actions');
          const okB = el('button', 'pac-btn approve', ar ? '✓ اعتماد وتطبيق' : '✓ Approve');
          okB.type = 'button';
          okB.addEventListener('click', () => {
            if (!st) {
              st = { id: req.staffId, name: req.reqFullName, nickname: req.reqNickname, role: 'staff', active: true, inv: true };
              S.tpl.staff.push(st);
            } else {
              st.name = req.reqFullName || ((req.reqFirstName + ' ' + req.reqLastName).trim()) || st.name;
              if (req.reqNickname) st.nickname = req.reqNickname;
              delete st.pendingNameChange;
            }
            const allReqs = (typeof FOH.loadPendingNameChanges === 'function' ? FOH.loadPendingNameChanges() : []).filter((r) => r.id !== req.id && r.staffId !== req.staffId && r.staffUsername !== req.staffUsername);
            if (typeof FOH.savePendingNameChanges === 'function') FOH.savePendingNameChanges(allReqs);
            FOH.store.saveTemplate(S.tpl);
            if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
              FOH.cloudRealtime.broadcast('STAFF_NAME_CHANGE_APPROVED', { staffId: st.id, name: st.name, nickname: st.nickname });
            }
            FOH.edit.toast(ar ? '✓ تم اعتماد تعديل اسم ' + st.name + ' بنجاح' : 'Approved ✓');
            drawCenter();
            updateNotifBellUI();
            FOH.app.render();
          });
          const noB = el('button', 'pac-btn reject', ar ? '✕ رفض' : '✕ Reject');
          noB.type = 'button';
          noB.addEventListener('click', () => {
            if (st) delete st.pendingNameChange;
            const allReqs = (typeof FOH.loadPendingNameChanges === 'function' ? FOH.loadPendingNameChanges() : []).filter((r) => r.id !== req.id && r.staffId !== req.staffId && r.staffUsername !== req.staffUsername);
            if (typeof FOH.savePendingNameChanges === 'function') FOH.savePendingNameChanges(allReqs);
            FOH.store.saveTemplate(S.tpl);
            FOH.edit.toast(ar ? 'تم رفض طلب التعديل' : 'Rejected');
            drawCenter();
            updateNotifBellUI();
            FOH.app.render();
          });
          aRow.append(okB, noB);
          it.append(aRow);
          pacList.append(it);
        });
        pac.append(pacList);
        box.append(pac);
      }

      // Section 1: Lock-Screen & Background Push Test Card
      const pushCard = el('div', 'notif-center-card');
      pushCard.style.border = '1.5px solid var(--accent)';
      pushCard.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">' +
        '<b>📲 ' + (ar ? 'إشعارات الهاتف والشاشة مغلقة (Lock-Screen Push)' : 'Lock-Screen & Background Notifications') + '</b>' +
        '<span class="dayoff-badge ' + (perm === 'granted' ? 'approved' : 'pending') + '">' +
        (perm === 'granted' ? (ar ? '✅ مفعّلة' : '✅ Active') : (ar ? '⚠️ تحتاج تفعيل' : '⚠️ Needs Permission')) +
        '</span>' +
        '</div>' +
        '<p style="margin:6px 0 10px;font-size:0.78rem;color:var(--ink2);line-height:1.45;">' +
        (ar
          ? 'اضغط الزر بالأسفل ثم اقفل شاشة موبايلك فوراً — سيصلك إشعار حقيقي مع اهتزاز وصوت بعد 5 ثوانٍ حتى والشاشة مغلقة!'
          : 'Tap the button below and lock your phone screen immediately — a real OS notification will arrive in 5 seconds while locked!') +
        '</p>';

      const testLockBtn = el(
        'button',
        'btn primary',
        ar ? '🔔 أرسل إشعاراً بعد 5 ثوانٍ (اقفل شاشة الهاتف الآن للتجربة!)' : '🔔 Send Lock-Screen Notification in 5s (Lock Phone Now!)'
      );
      testLockBtn.type = 'button';
      testLockBtn.style.width = '100%';
      testLockBtn.addEventListener('click', async () => {
        const status = await ensureNotificationPermission();
        if (status !== 'granted') {
          return alert(ar ? 'يرجى السماح بالإشعارات (Allow Notifications) من المتصفح أولاً.' : 'Please allow notifications in your browser prompt.');
        }
        const title = (ar ? ident.titleAr : ident.titleEn) + ' · 🍽 CEEN';
        const body = ar
          ? '✅ إشعار قفل الشاشة يعمل بنجاح! لديك مهام جاهزة في قسمك.'
          : '✅ Lock-screen notification works! Check your assigned tasks.';
        await scheduleServiceWorkerNotification('lock_test_' + Date.now(), title, body, 5000);
        setTimeout(() => {
          fireNativeLockScreenNotification(title, body, 'lock_test_fallback');
        }, 5200);
        FOH.edit.toast(ar ? '⏳ تم جدولة الإشعار! اقفل شاشة هاتفك الآن — سيصلك خلال 5 ثوانٍ 📲' : '⏳ Scheduled! Lock your phone screen now — arriving in 5s 📲');
      });
      pushCard.append(testLockBtn);
      box.append(pushCard);

      // Section 2: Currently Snoozed Alerts with Live Countdown
      const snoozedList = getActiveSnoozeTimersList();
      const snzCard = el('div', 'notif-center-card');
      snzCard.innerHTML = '<b>💤 ' + (ar ? 'التنبيهات المؤجلة حالياً (ستعود للظهور تلقائياً):' : 'Snoozed Alerts (Will auto-reappear):') + '</b>';

      if (!snoozedList.length) {
        snzCard.append(el('p', 'empty', ar ? 'لا توجد تنبيهات مؤجلة حالياً ✓' : 'No snoozed alerts right now ✓'));
      } else {
        snoozedList.forEach((item) => {
          const mins = Math.floor(item.remainingSec / 60);
          const secs = item.remainingSec % 60;
          const timeStr = mins > 0 ? (mins + (ar ? 'د و ' : 'm ') + secs + (ar ? 'ث' : 's')) : (secs + (ar ? ' ثانية' : 's'));
          const row = el('div', 'notif-item-row');
          row.innerHTML =
            '<div style="flex:1;min-width:180px;">' +
            '<b>' + (item.title || '🔔 تنبيه') + '</b>' +
            '<small style="display:block;color:var(--ink2);margin-top:2px;">' + (item.body || '') + '</small>' +
            '</div>' +
            '<span class="notif-countdown-pill">⏳ ' + (ar ? 'يظهر بعد ' : 'In ') + timeStr + ' (' + (item.wakeHM || '') + ')</span>';

          const wakeNowBtn = el('button', 'gov-btn primary', ar ? '🔔 إظهار الآن' : '🔔 Wake Now');
          wakeNowBtn.type = 'button';
          wakeNowBtn.addEventListener('click', () => {
            const map = loadSnoozeTimers();
            delete map[item.key];
            delete map['__group_task_banner'];
            delete map['__group_health_banner'];
            saveSnoozeTimers(map);
            if (FOH.reminders && FOH.reminders.clearSnoozesForDate) {
              FOH.reminders.clearSnoozesForDate(S.date);
            }
            FOH.app.render();
            drawCenter();
          });
          row.append(wakeNowBtn);
          snzCard.append(row);
        });
      }
      box.append(snzCard);

      // Section 3: Active Alerts Right Now
      const actCard = el('div', 'notif-center-card');
      actCard.innerHTML = '<b>⚡ ' + (ar ? 'التنبيهات النشطة الآن:' : 'Active Alerts Now:') + '</b>';
      const hAlerts = getHealthAlerts();
      const due = FOH.reminders.next(FOH.preview.sections(), S.run.checked, FOH.tasksView.todayStates(), S.date, FOH.time.nowHM());

      if (!hAlerts.length && !due) {
        actCard.append(el('p', 'empty', ar ? 'جميع المهام والشهادات على ما يرام ✅' : 'All tasks and certificates are on track ✅'));
      } else {
        if (due) {
          const r = el('div', 'notif-item-row');
          r.innerHTML =
            '<div><b>⏰ ' + due.at + ' · ' + due.names.join('، ') + '</b>' +
            '<small style="display:block;color:var(--ink2);">' + (ar ? 'مهمة مستحقة في الشفت' : 'Shift task due') + '</small></div>';
          const snz1m = el('button', 'gov-btn', ar ? '💤 تأجيل ١د' : '💤 +1m');
          snz1m.type = 'button';
          snz1m.addEventListener('click', () => {
            snoozeAlertWithTimer({
              ids: due.ids,
              bannerGroup: 'task_banner',
              title: ar ? 'تذكير مهمة' : 'Task Reminder',
              body: due.at + ' · ' + due.names.join('، '),
              minutes: 1,
            });
            drawCenter();
          });
          r.append(snz1m);
          actCard.append(r);
        }
        hAlerts.forEach((ha) => {
          const r = el('div', 'notif-item-row');
          r.innerHTML =
            '<div><b>🏥 ' + FOH.escapeHtml(ha.staff.name) + ' (' + ha.staff.healthCertExpiry + ')</b>' +
            '<small style="display:block;color:var(--danger);">' +
            (ha.expired ? (ar ? 'منتهية منذ ' + Math.abs(ha.days) + ' يوم' : 'Expired ' + Math.abs(ha.days) + 'd ago') : (ar ? 'تنتهي خلال ' + ha.days + ' يوم' : 'Expires in ' + ha.days + 'd')) +
            '</small></div>';
          actCard.append(r);
        });
      }
      box.append(actCard);

      const closeB = el('button', 'btn', ar ? 'إغلاق' : 'Close');
      closeB.type = 'button';
      closeB.style.width = '100%';
      closeB.addEventListener('click', () => dlg.close());
      box.append(closeB);

      dlg.append(box);
    }

    drawCenter();
    clearInterval(notifCenterInterval);
    notifCenterInterval = setInterval(() => {
      if (dlg.open) drawCenter();
    }, 1000);
    dlg.showModal();
  }

  // ---- Contextual Checklist Bar (Date, Shift Leaders, Progress %, Lock & Edit) + Role Scope ----
  function enhanceChecklistContextAndRoleScope() {
    const govBar = $('checklistGovBar');
    if (!govBar || S.editing || S.view !== 'opening') return;

    const ar = isAr();
    const ident = getAppRoleIdentity();
    const rKey = getCurrentSuperRoleKey();
    const sess = getSession();
    const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');

    // 1. Prepend Role Workspace Bar & Quick Role Switcher at top of #checklistGovBar
    if (!govBar.querySelector('.role-workspace-bar')) {
      const roleBar = el('div', 'role-workspace-bar');
      roleBar.style.width = '100%';

      const leftInfo = el('div', '');
      leftInfo.innerHTML =
        '<b>' + (ar ? ident.titleAr : ident.titleEn) + '</b>' +
        '<span style="display:block;font-size:0.72rem;color:var(--ink2);">' +
        (ar ? ident.subAr : ident.subEn) +
        '</span>';

      const rightControls = el('div', 'role-switch-pills');
      if (ident.openingKeywords && !isClosingSheetActive()) {
        const scopeBtn = el(
          'button',
          'role-switch-pill' + (roleScopeOnly ? ' on' : ''),
          roleScopeOnly
            ? (ar ? '🎯 مهام قسمي فقط ✓' : '🎯 My Role Only ✓')
            : (ar ? '👁 كل أقسام المطعم' : '👁 All Sections')
        );
        scopeBtn.type = 'button';
        scopeBtn.addEventListener('click', () => {
          roleScopeOnly = !roleScopeOnly;
          FOH.app.render();
        });
        rightControls.append(scopeBtn);
      }

      // Quick Role Switcher pills so user can test Super Waiter / Bartender / Captain / Manager
      [
        ['sara', '⭐ Super Waiter'],
        ['maher', '🍸 Super Bartender'],
        ['ali', '🎖️ Super Captain'],
        ['fadi', '👑 Super Manager'],
      ].forEach(([uname, label]) => {
        const pill = el('button', 'role-switch-pill' + (curUser === uname ? ' on' : ''), label);
        pill.type = 'button';
        pill.title = ar ? 'معاينة التطبيق بهذا المنصب' : 'Switch to this role view';
        pill.addEventListener('click', () => quickSwitchEmployeeAccount(uname));
        rightControls.append(pill);
      });

      roleBar.append(leftInfo, rightControls);
      govBar.prepend(roleBar);
    }

    // 2. Inject Contextual Date / Supervisor / Progress % Bar inside #checklistGovBar (replacing top header clutter)
    if (!govBar.querySelector('.sec-context-bar')) {
      const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S.run.checked);
      const pct = all.total ? Math.round((all.done * 100) / all.total) : 0;
      const names = [S.run.supervisor, S.run.captain, S.run.assistant].filter(Boolean);
      const day = new Date(S.date + 'T00:00:00');
      const dateLabel = isNaN(day)
        ? S.date
        : day.toLocaleDateString(FOH.i18n.locale, { weekday: 'short', day: 'numeric', month: 'short' });

      const ctxBar = el('div', 'sec-context-bar');
      ctxBar.style.width = '100%';

      const left = el('div', 'sec-ctx-left');
      const progPill = el('span', 'sec-progress-pill', '📊 ' + pct + '% (' + all.done + '/' + all.total + ')');
      const metaToggleBtn = el(
        'button',
        'sec-meta-btn',
        '📅 ' + dateLabel + ' · ' + (names.length ? names.slice(0, 2).join(' · ') : (ar ? 'تحديد المشرف والكابتن' : 'Set Shift Leaders')) + ' ▾'
      );
      metaToggleBtn.type = 'button';
      metaToggleBtn.addEventListener('click', () => {
        if ($('metaPanel')) $('metaPanel').hidden = !$('metaPanel').hidden;
      });
      left.append(progPill, metaToggleBtn);

      const right = el('div', 'gov-actions');
      const breakBtn = el('button', 'gov-btn', ar ? '🔧 تسجيل كسر / صيانة' : '🔧 Report Damage / Repair');
      breakBtn.type = 'button';
      breakBtn.addEventListener('click', () => {
        if (FOH.invBreak && FOH.invBreak.open) FOH.invBreak.open();
      });
      right.append(breakBtn);

      ctxBar.append(left, right);
      govBar.insertBefore(ctxBar, govBar.firstChild ? govBar.firstChild.nextSibling : null);
    }

    // 3. Filter Opening Checklist Sections & Chips when roleScopeOnly is active for Super Waiter / Super Bartender
    if (!isClosingSheetActive() && ident.openingKeywords && roleScopeOnly) {
      const kwList = ident.openingKeywords;
      document.querySelectorAll('#sections > section.card').forEach((card) => {
        const sid = (card.id || '').replace(/^sec-/, '');
        const secObj = (S.tpl.sections || []).find((x) => x.id === sid);
        const titleCombo = ((secObj && (secObj.title + ' ' + secObj.titleAr)) || card.textContent || '').toLowerCase();
        // Waiter excludes Bar-only & Tech/Cash vault sections; Bartender focuses on Bar & Stations
        let match = kwList.some((kw) => titleCombo.includes(kw));
        if (rKey === 'super_waiter' && (titleCombo.includes('stations & bar') || titleCombo.includes('tech & cash') || titleCombo.includes('الكاشير'))) {
          match = false;
        }
        if (rKey === 'super_bartender' && (titleCombo.includes('tables setup') || titleCombo.includes('tech & cash') || titleCombo.includes('الطاولات'))) {
          match = false;
        }
        card.style.display = match ? '' : 'none';
      });
      document.querySelectorAll('#chips .chip').forEach((chip) => {
        const sid = chip.dataset.sid;
        const card = $('sec-' + sid);
        if (card) chip.style.display = card.style.display;
      });
    } else if (!isClosingSheetActive()) {
      document.querySelectorAll('#sections > section.card, #chips .chip').forEach((node) => {
        node.style.display = '';
      });
    }
  }

  // ---- Enhance Sidebar with Language Toggle, Report Damage Button & Role-Scoped Navigation ----
  function enhanceSidebarAndInventory() {
    const ar = isAr();
    const ident = getAppRoleIdentity();

    // Update Sidebar Brand Title to match Employee's Super Role
    const sbBrandStrong = document.querySelector('#appSidebar .sb-brand-txt strong');
    if (sbBrandStrong) {
      sbBrandStrong.textContent = ar ? ident.titleAr : ident.titleEn;
    }

    // Filter Sidebar nav buttons to only those allowed for this role
    const nav = $('sbNavList');
    if (nav && !nav.dataset.v10Scoped) {
      nav.dataset.v10Scoped = '1';
      // Add Quick Damage / Repair button inside Sidebar
      const dmgBtn = el('button', 'sb-nav-btn');
      dmgBtn.type = 'button';
      dmgBtn.append(
        el('span', 'sb-nav-ico', '🔧'),
        Object.assign(el('span', 'sb-nav-txt'), {
          innerHTML:
            '<b>' + (ar ? 'تسجيل كسر أو طلب صيانة' : 'Report Damage / Repair') + '</b>' +
            '<small>' + (ar ? 'تبليغ فوري عن كسر أو عطل بالمعدات' : 'Log broken glassware or equipment repair') + '</small>',
        })
      );
      dmgBtn.addEventListener('click', () => {
        closeSidebar();
        if (FOH.invBreak && FOH.invBreak.open) FOH.invBreak.open();
      });
      nav.append(dmgBtn);
    }

    // Add Language Switcher button inside Sidebar Footer (#sbFoot)
    const sbFoot = document.querySelector('#appSidebar .sb-foot');
    if (sbFoot && !$('sbLangToggle')) {
      const langBtn = el('button', 'btn sb-foot-btn', ar ? '🌐 EN' : '🌐 عربي');
      langBtn.type = 'button';
      langBtn.id = 'sbLangToggle';
      langBtn.addEventListener('click', () => {
        if ($('langBtn')) $('langBtn').click();
        langBtn.textContent = isAr() ? '🌐 EN' : '🌐 عربي';
        renderSidebarContent();
      });
      sbFoot.insertBefore(langBtn, $('sbLogoutBtn'));
    } else if ($('sbLangToggle')) {
      $('sbLangToggle').textContent = ar ? '🌐 EN' : '🌐 عربي';
    }

    // Inject prominent "Report Damage / Request Repair" card at the top of #inv (Inventory section)
    const invRoot = $('inv');
    if (invRoot && !invRoot.hidden && !invRoot.querySelector('#invDamageReportCard')) {
      const dmgCard = el('div', 'sec-context-bar');
      dmgCard.id = 'invDamageReportCard';
      dmgCard.style.border = '1.5px solid var(--accent)';
      dmgCard.innerHTML =
        '<div><b>🔧 ' + (ar ? 'بلاغات الكسر والتالف وطلبات الصيانة' : 'Breakage & Equipment Repair Reports') + '</b>' +
        '<small style="display:block;color:var(--ink2);">' + (ar ? 'سجّل أي كسر في الكؤوس أو الصحون أو عطل بحاجة لصيانة' : 'Report broken items or request equipment repair') + '</small></div>';
      const openBrkBtn = el('button', 'btn primary', ar ? '+ تسجيل كسر / طلب صيانة' : '+ Report Damage / Repair');
      openBrkBtn.type = 'button';
      openBrkBtn.addEventListener('click', () => {
        if (FOH.invBreak && FOH.invBreak.open) FOH.invBreak.open();
      });
      dmgCard.append(openBrkBtn);
      invRoot.prepend(dmgCard);
    }
  }


  // ---- 9. Hamburger ☰ Sidebar Drawer & Header Sync ----
  function openSidebar() {
    if ($('sidebarBackdrop')) $('sidebarBackdrop').hidden = false;
    if ($('appSidebar')) $('appSidebar').hidden = false;
    renderSidebarContent();
  }

  function closeSidebar() {
    if ($('sidebarBackdrop')) $('sidebarBackdrop').hidden = true;
    if ($('appSidebar')) $('appSidebar').hidden = true;
  }

  function switchView(nextView) {
    if (nextView === 'orders' && !canCurrentUserAccessOrders()) {
      const ar = isAr();
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '⚠️ ليس لديك صلاحية الوصول إلى قسم الطلبيات والمستودع' : '⚠️ You do not have permission to access Bar & FOH Orders');
      }
      return;
    }
    S.editing = false;
    S.view = nextView;
    closeSidebar();
    window.scrollTo(0, 0);
    FOH.app.render();
  }

  function getSectionMeta(view) {
    const ar = isAr();
    const map = {
      opening: { ico: '📋', title: ar ? 'شيتات الشفت (Opening · Mid · Closing)' : 'Shift Sheets (Opening · Mid · Closing)', sub: ar ? 'افتتاح (12–3) · منتصف الشفت (3–11) · إغلاق (11+)' : 'Time-scheduled: Opening · Mid-Shift · Closing' },
      mine: { ico: '📋', title: ar ? 'مهامي وطلب الإجازة' : 'My Tasks & Day-Off', sub: ar ? 'مهامك اليومية وطلب عطلة' : 'Personal tasks & schedule leave' },
      orders: { ico: '🛒', title: ar ? 'طلبيات البار والصالة' : 'Bar & FOH Orders', sub: ar ? 'Step-by-step و Quick list' : 'Step-by-step & Quick list' },
      inv: { ico: '📦', title: ar ? 'الجرد وبلاغات التالف' : 'Inventory & Breakage', sub: ar ? 'الجرد الأعمى وإدارة الأصناف' : 'Blind counts & breakage reports' },
      academy: { ico: '🎓', title: ar ? 'أكاديمية المنيو والاختبارات' : 'Menu Academy & Quiz', sub: ar ? 'تعلّم الأطباق والمشروبات واكسب نقاطاً' : 'Learn dishes & drinks + 3-choice quiz' },
      tips: { ico: '💰', title: ar ? 'التبس والنقاط وأيام العمل' : 'Tips, Points & Days', sub: ar ? 'حصتك، المسحوبات وأيام الدوام' : 'Your share, advances & worked days' },
      dashboard: { ico: '📊', title: ar ? 'لوحة التحكم والتحليلات' : 'Dashboard & Analytics', sub: ar ? 'إحصائيات الشفت والامتثال' : 'Shift KPIs & compliance analytics' },
      profile: { ico: '👤', title: ar ? 'البروفايل والشهادة الصحية' : 'Profile & Health Cert', sub: ar ? 'بياناتك وتنبيه الشهادة الصحية' : 'Personal info & health certificate' },
      settings: { ico: '⚙️', title: ar ? 'إعدادات المدير والصلاحيات' : 'Settings & Permissions', sub: ar ? 'قفل الشيك ليست وصلاحيات التبس' : 'Checklist lock & tip visibility' },
    };
    return map[view] || map.opening;
  }

  function renderSidebarContent() {
    const ar = isAr();
    const gov = loadGov();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;

    if ($('sbRestaurantName')) {
      $('sbRestaurantName').textContent = '🍽 ' + (ar ? gov.restaurantNameAr : gov.restaurantName);
    }
    if ($('sbNavTitle')) {
      $('sbNavTitle').textContent = ar ? 'أقسام التطبيق · اختر للتركيز' : 'SECTIONS · TAP TO FOCUS';
    }

    const profBox = $('sbProfileCard');
    if (profBox) {
      profBox.replaceChildren();
      const dispName = (sess && (ar ? sess.displayNameAr || sess.displayName : sess.displayName)) || S.me.name || 'Fadi (Supervisor)';
      const srKey = getCurrentSuperRoleKey();
      const srMeta = SUPER_ROLES_META[srKey] || SUPER_ROLES_META.staff;
      const roleLbl = srMeta.badge;
      const initials = dispName.slice(0, 2).toUpperCase();

      const staffRec = (S.tpl.staff || []).find(
        (p) => (sess && p.id === sess.staffId) || (p.name || '').toLowerCase().startsWith((sess && sess.username ? sess.username : 'fadi').toLowerCase())
      );
      const hcDays = staffRec ? calcDaysLeft(staffRec.healthCertExpiry) : null;
      const hcTxt = hcDays === null
        ? '🏥 —'
        : hcDays < 0
        ? (ar ? '🏥 🚨 منتهية' : '🏥 🚨 Expired')
        : hcDays <= 30
        ? (ar ? '🏥 ⚠️ باقي ' + hcDays + 'ي' : '🏥 ⚠️ ' + hcDays + 'd left')
        : (ar ? '🏥 ✓ صالحة' : '🏥 ✓ Valid');

      const top = el('div', 'sb-prof-top');
      top.append(
        el('div', 'sb-prof-av', initials),
        Object.assign(el('div', 'sb-prof-meta'), {
          innerHTML: '<b>' + dispName + '</b><small>🪪 ' + roleLbl + ' · ' + hcTxt + '</small>',
        })
      );
      profBox.append(top);
      profBox.onclick = () => switchView('profile');
    }

    const nav = $('sbNavList');
    if (nav) {
      nav.replaceChildren();
      const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S.run.checked);
      const openLeft = all.total - all.done;
      const mineLeft = $('badgeMine') ? Number($('badgeMine').textContent || '0') : 0;
      const ordCount = $('badgeOrders') ? Number($('badgeOrders').textContent || '0') : 0;

      const items = [
        ['opening', openLeft > 0 ? String(openLeft) : '✓'],
        ['mine', mineLeft > 0 ? String(mineLeft) : ''],
        ['orders', ordCount > 0 ? String(ordCount) : ''],
        ['inv', ''],
        ['academy', '🎓 +XP'],
        ['tips', 'JOD'],
        ['dashboard', '📊'],
        ['profile', '🏥'],
      ];
      if (isMgr) items.push(['settings', '⚙️']);

      const allowedViews = getAppRoleIdentity().allowedViews || [];
      items.forEach(([v, badge]) => {
        if (v === 'inv' && S.previewEmployee) return;
        if (allowedViews.length && !allowedViews.includes(v)) return;
        const isClosingNav = v === 'closing_sheet';
        const meta = isClosingNav
          ? {
              ico: '🌙',
              title: ar ? 'شيت الإغلاق و Last Order' : 'Closing Sheet & Last Order',
              sub: ar ? 'إغلاق البار والصالة والكاشير مع آخر زبون' : 'Dept closing & last-guest lockup',
            }
          : getSectionMeta(v);
        const isActive = isClosingNav
          ? (!S.editing && S.view === 'opening' && isClosingSheetActive())
          : (v === 'opening' ? (!S.editing && S.view === 'opening' && !isClosingSheetActive()) : (!S.editing && S.view === v));
        const b = el('button', 'sb-nav-btn' + (isActive ? ' on' : ''));
        b.type = 'button';
        b.append(
          el('span', 'sb-nav-ico', meta.ico),
          Object.assign(el('span', 'sb-nav-txt'), {
            innerHTML: '<b>' + meta.title + '</b><small>' + meta.sub + '</small>',
          })
        );
        if (badge) b.append(el('span', 'sb-nav-badge', badge));
        b.addEventListener('click', () => {
          if (isClosingNav) {
            closeSidebar();
            activateClosingSheet('all');
          } else if (v === 'opening') {
            if (isClosingSheetActive() && FOH.erpPwa && FOH.erpPwa.switchSheetType) {
              FOH.erpPwa.switchSheetType('opening');
            }
            switchView('opening');
          } else {
            switchView(v);
          }
        });
        nav.append(b);
      });
      delete nav.dataset.v10Scoped;
      enhanceSidebarAndInventory();
      injectRoleSwitcherInSidebar();
    wireAutomaticTaskCreationNotifications();
    enforceTimeBasedSheetSchedule();
    renderUnifiedThreeSheetNav();
    renderAssignedTaskBadgesAndFilter();
    injectAssignTaskBtnIntoToolbarAndMine();
    relocateHeaderSubbarsToMain();
    renderCleanHeaderText();
    collapseOpsLifecycleBarToOneLine();
    renderUnifiedSingleRowChecklistBar();
    injectRoleSwitcherInSidebar();
    }
  }


  // ============================================================================
  // 13. SUPER EMPLOYEE v11 ULTRA-CLEAN HEADER & SINGLE-ROW TOOLBAR OVERRIDES
  // ============================================================================
  let opsBarExpanded = false;

  function relocateHeaderSubbarsToMain() {
    const mainEl = $('appMain');
    if (!mainEl) return;
    const chips = $('chips');
    const sections = $('sections');
    if (chips && chips.parentElement !== mainEl && sections && sections.parentElement === mainEl) {
      mainEl.insertBefore(chips, sections);
    }
    const hBanner = $('healthAlertBanner');
    const tBanner = $('banner');
    if (tBanner && tBanner.parentElement !== mainEl) {
      mainEl.prepend(tBanner);
    }
    if (hBanner && hBanner.parentElement !== mainEl) {
      mainEl.prepend(hBanner);
    }
  }

  function renderCleanHeaderText() {
    const ar = isAr();
    const gov = loadGov();
    const ident = getAppRoleIdentity();

    if ($('title')) {
      $('title').textContent = S.editing
        ? (ar ? '✎ تعديل الشيك ليست' : '✎ Edit Checklist')
        : (ar ? ident.titleAr.split('·')[0].trim() : ident.titleEn);
    }
    if ($('restaurantBadge')) {
      $('restaurantBadge').textContent = '🍽 ' + (ar ? (gov.restaurantNameAr || 'مطعم سين') : (gov.restaurantName || 'CEEN Restaurant & Lounge'));
    }
    if ($('checklistLockPill')) $('checklistLockPill').style.display = 'none';
    if ($('activeSectionBadge')) $('activeSectionBadge').style.display = 'none';
  }

  function collapseOpsLifecycleBarToOneLine() {
    const bar = $('opsLifecycleBar');
    if (!bar) return;
    const rKey = getCurrentSuperRoleKey();
    if (rKey !== 'super_manager') {
      bar.hidden = true;
      return;
    }
    if (bar.hidden) return;
    const ar = isAr();
    const cfg = loadOpsConfig();
    const h = cfg.hours;
    const daySt = loadOpsDayState(S.date);
    const nowHM = getEffectiveNowHM();
    const nowBiz = toBizMinutes(nowHM);
    const openBiz = toBizMinutes(h.doorsOpen);
    const kLastBiz = toBizMinutes(h.kitchenLastOrder);
    const minCloseBiz = toBizMinutes(h.minCloseTime);

    let statusText = '';
    if (daySt.closedAt) {
      statusText = '🔒 ' + (ar ? 'مغلق (' + formatTime12Ar(daySt.closedAt) + ')' : 'Closed (' + formatTime12Ar(daySt.closedAt) + ')');
    } else if (nowBiz < openBiz) {
      statusText = '☀️ ' + (ar ? 'دوام التحضير ' + formatTime12Ar(h.prepStart) + ' · يفتح ' + formatTime12Ar(h.doorsOpen) : 'Prep ' + formatTime12Ar(h.prepStart) + ' · Opens ' + formatTime12Ar(h.doorsOpen));
    } else if (nowBiz < kLastBiz - 15) {
      statusText = '🟢 ' + (ar ? 'مفتوح (' + formatTime12Ar(h.doorsOpen) + '–' + formatTime12Ar(h.minCloseTime) + '+)' : 'Open (' + formatTime12Ar(h.doorsOpen) + '–' + formatTime12Ar(h.minCloseTime) + '+)');
    } else if (nowBiz < minCloseBiz) {
      statusText = '🔔 ' + (ar ? 'مرحلة Last Order (' + formatTime12Ar(h.kitchenLastOrder) + ' / ' + formatTime12Ar(h.barLastOrder) + ')' : 'Last Order (' + formatTime12Ar(h.kitchenLastOrder) + ' / ' + formatTime12Ar(h.barLastOrder) + ')');
    } else {
      statusText = '⏳ ' + (ar ? 'بعد ' + formatTime12Ar(h.minCloseTime) + ' · يغلق مع آخر زبون' : 'Past ' + formatTime12Ar(h.minCloseTime) + ' · Last Guest Mode');
    }

    const existingChildren = Array.from(bar.children);
    bar.replaceChildren();

    const summaryRow = el('div', 'ops-compact-summary');
    const left = el('div', 'ops-compact-left');
    left.textContent = statusText;

    const right = el('div', '');
    right.style.display = 'flex';
    right.style.gap = '5px';
    right.style.alignItems = 'center';

    const toggleBtn = el(
      'button',
      'ops-compact-toggle',
      opsBarExpanded
        ? (ar ? 'إخفاء الأوقات ▲' : 'Hide Hours ▲')
        : (ar ? '🕐 Last Order / إغلاق ▾' : '🕐 Hours & Close ▾')
    );
    toggleBtn.type = 'button';
    toggleBtn.addEventListener('click', () => {
      opsBarExpanded = !opsBarExpanded;
      FOH.app.render();
    });
    right.append(toggleBtn);
    summaryRow.append(left, right);
    bar.append(summaryRow);

    if (opsBarExpanded) {
      const drawer = el('div', 'ops-details-drawer');
      existingChildren.forEach((ch) => drawer.append(ch));
      bar.append(drawer);
    }
  }

  function renderUnifiedSingleRowChecklistBar() {
    const govBar = $('checklistGovBar');
    if (!govBar || S.editing || S.view !== 'opening') return;

    const ar = isAr();
    const gov = loadGov();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const canEdit = canCurrentUserEditChecklist();
    const ident = getAppRoleIdentity();

    const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S.run.checked);
    const pct = all.total ? Math.round((all.done * 100) / all.total) : 0;
    const names = [S.run.supervisor, S.run.captain, S.run.assistant].filter(Boolean);
    const day = new Date(S.date + 'T00:00:00');
    const dateLabel = isNaN(day)
      ? S.date
      : day.toLocaleDateString(FOH.i18n.locale, { weekday: 'short', day: 'numeric', month: 'short' });

    // Preserve pending suggestions box if any
    const sugBox = govBar.querySelector('.sug-card');
    govBar.replaceChildren();

    const row = el('div', 'unified-sec-toolbar');

    // 1. Progress Pill
    row.append(el('span', 'u-pill accent', '📊 ' + pct + '% (' + all.done + '/' + all.total + ')'));

    // 2. Date & Shift Leaders Toggle
    const metaBtn = el(
      'button',
      'u-pill',
      '📅 ' + dateLabel + (names.length ? ' · ' + names[0] : '') + ' ▾'
    );
    metaBtn.type = 'button';
    metaBtn.addEventListener('click', () => {
      if ($('metaPanel')) $('metaPanel').hidden = !$('metaPanel').hidden;
    });
    row.append(metaBtn);

    // 3. Role Scope Toggle (for Waiter / Bartender)
    if (ident.openingKeywords && !isClosingSheetActive()) {
      const scopeBtn = el(
        'button',
        'u-pill' + (roleScopeOnly ? ' accent' : ''),
        roleScopeOnly ? (ar ? '🎯 مهام قسمي ✓' : '🎯 My Dept ✓') : (ar ? '👁 كل الأقسام' : '👁 All Depts')
      );
      scopeBtn.type = 'button';
      scopeBtn.addEventListener('click', () => {
        roleScopeOnly = !roleScopeOnly;
        FOH.app.render();
      });
      row.append(scopeBtn);
    }

    // 4. Lock / Unlock Button (for Manager / Captain) or Lock Status
    if (isMgr || hasSuperPerm('canLockChecklist')) {
      const lockB = el(
        'button',
        'u-pill' + (gov.checklistLocked ? ' warn' : ''),
        gov.checklistLocked ? (ar ? '🔒 مقفلة' : '🔒 Locked') : (ar ? '🔓 مفتوحة' : '🔓 Unlocked')
      );
      lockB.type = 'button';
      lockB.addEventListener('click', () => {
        gov.checklistLocked = !gov.checklistLocked;
        gov.lockedBy = (sess && sess.displayName) || 'Supervisor';
        if (gov.checklistLocked) S.editing = false;
        saveGov(gov);
        FOH.app.render();
      });
      row.append(lockB);
    } else if (gov.checklistLocked) {
      row.append(el('span', 'u-pill warn', ar ? '🔒 مقفلة' : '🔒 Locked'));
    }

    // 5. Edit Checklist Button (or Suggest Edit for staff)
    if (canEdit && !gov.checklistLocked) {
      const editB = el('button', 'u-pill', ar ? '✎ تعديل' : '✎ Edit');
      editB.type = 'button';
      editB.addEventListener('click', () => {
        S.editing = true;
        FOH.app.render();
      });
      row.append(editB);
    } else {
      const sugB = el('button', 'u-pill', ar ? '💡 اقتراح' : '💡 Suggest');
      sugB.type = 'button';
      sugB.addEventListener('click', () => openSuggestionModal());
      row.append(sugB);
    }

    // 6. Report Damage / Repair Button
    const dmgB = el('button', 'u-pill', ar ? '🔧 كسر/صيانة' : '🔧 Damage');
    dmgB.type = 'button';
    dmgB.addEventListener('click', () => {
      if (FOH.invBreak && FOH.invBreak.open) FOH.invBreak.open();
    });
    row.append(dmgB);

    govBar.append(row);
    if (sugBox) govBar.append(sugBox);
  }

  function injectRoleSwitcherInSidebar() {
    const sb = $('appSidebar');
    const profCard = $('sbProfileCard');
    if (!sb || !profCard) return;
    let switcher = $('sbRoleQuickSwitcher');
    if (!switcher) {
      switcher = el('div', '');
      switcher.id = 'sbRoleQuickSwitcher';
      switcher.style.marginBottom = '10px';
      profCard.insertAdjacentElement('afterend', switcher);
    }
    switcher.replaceChildren();
    const ar = isAr();
    const sess = getSession();
    const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');

    const lbl = el('div', 'sb-sec-label', ar ? 'معاينة التطبيق حسب المنصب (تجربة فورية)' : 'SWITCH ROLE VIEW (1-TAP)');
    switcher.append(lbl);

    const pills = el('div', 'role-switch-pills');
    [
      ['sara', '⭐ Waiter'],
      ['maher', '🍸 Bartender'],
      ['ali', '🎖️ Captain'],
      ['fadi', '👑 Manager'],
    ].forEach(([uname, label]) => {
      const b = el('button', 'role-switch-pill' + (curUser === uname ? ' on' : ''), label);
      b.type = 'button';
      b.addEventListener('click', () => {
        quickSwitchEmployeeAccount(uname);
        closeSidebar();
      });
      pills.append(b);
    });
    switcher.append(pills);
  }


  // ============================================================================
  // 14. SUPER EMPLOYEE v12: INSTANT MOBILE NOTIFICATION ON TASK ADDITION
  //     + AUTOMATIC DUE-TIME LOCK-SCREEN ALARM SCHEDULER + LIVE INBOX
  // ============================================================================
  const TASK_INBOX_KEY = 'super-employee.taskInbox.v1';
  const liveChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('super-employee-live-tasks') : null;

  function loadTaskInbox() {
    try {
      const arr = FOH.safeJsonParse(localStorage.getItem(TASK_INBOX_KEY), '[]');
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveTaskInbox(list) {
    try {
      localStorage.setItem(TASK_INBOX_KEY, JSON.stringify(list.slice(0, 50)));
    } catch {}
  }

  function computeDelayMsForHM(hm, remindBeforeMins) {
    if (!hm || !/^\d{2}:\d{2}$/.test(hm)) return 0;
    const now = new Date();
    const [hh, mm] = hm.split(':').map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    const offsetMs = (Number(remindBeforeMins) || 0) * 60 * 1000;
    let diff = target.getTime() - offsetMs - now.getTime();
    // If due time already passed today by more than 1 minute, don't schedule negative delay
    if (diff < -60000) return 0;
    return Math.max(3000, diff);
  }

  async function notifyMobileOnNewTaskAdded(taskMeta) {
    const ar = isAr();
    await ensureNotificationPermission();

    const title = ar
      ? '🆕 مهمة جديدة: ' + (taskMeta.titleAr || taskMeta.titleEn || 'مهمة شفت')
      : '🆕 New Task: ' + (taskMeta.titleEn || taskMeta.titleAr || 'Shift Task');

    const roleTxt = taskMeta.roleLabel ? (' · 👤 ' + taskMeta.roleLabel) : '';
    const dueTxt = taskMeta.dueHM ? (' · ⏰ ' + taskMeta.dueHM) : '';
    const body = (ar ? 'تمت إضافتها إلى ' : 'Added to ') + (taskMeta.sectionLabel || (ar ? 'مهام المطعم' : 'Checklist')) + roleTxt + dueTxt;

    // 1. Save to Task Notification Inbox so 🔔 Bell badge increments & shows it
    const inbox = loadTaskInbox();
    const entry = {
      id: 'tnotif_' + Date.now(),
      title,
      body,
      dueHM: taskMeta.dueHM || '',
      roleLabel: taskMeta.roleLabel || '',
      createdAtHM: FOH.time.nowHM(),
      unread: true,
    };
    inbox.unshift(entry);
    saveTaskInbox(inbox);

    // 2. Fire Immediate Native Mobile Notification (works in foreground & background via Service Worker)
    await fireNativeLockScreenNotification(title, body, entry.id);
    await scheduleServiceWorkerNotification(entry.id + '_imm', title, body, 800);

    // 3. If task has a Due Time (⏰), automatically schedule a Lock-Screen Notification for its Due Time!
    if (taskMeta.dueHM) {
      const delayMs = computeDelayMsForHM(taskMeta.dueHM, taskMeta.remindBefore);
      if (delayMs > 0) {
        const dueTitle = ar
          ? '⏰ حان موعد المهمة (' + taskMeta.dueHM + '): ' + (taskMeta.titleAr || taskMeta.titleEn)
          : '⏰ Task Due Now (' + taskMeta.dueHM + '): ' + (taskMeta.titleEn || taskMeta.titleAr);
        await scheduleServiceWorkerNotification(entry.id + '_due', dueTitle, body, delayMs);
      }
    }

    // 4. Broadcast to any other open tabs/devices on same browser
    if (liveChannel) {
      try {
        liveChannel.postMessage({ type: 'NEW_TASK_ADDED', entry });
      } catch {}
    }

    updateNotifBellUI();
  }

  function wireAutomaticTaskCreationNotifications() {
    // 1. Hook Checklist Item Sheet (#sheet) save
    const sheet = $('sheet');
    if (sheet && !sheet.dataset.v12NotifWired) {
      sheet.dataset.v12NotifWired = '1';
      sheet.addEventListener('close', () => {
        if (sheet.returnValue !== 'save') return;
        const txtEn = ($('dlgText') && $('dlgText').value.trim()) || '';
        const txtAr = ($('dlgTextAr') && $('dlgTextAr').value.trim()) || '';
        if (!txtEn && !txtAr) return;
        const dueHM = ($('dlgDue') && $('dlgDue').value) || '';
        const secSel = $('dlgSection');
        const secLabel = secSel && secSel.selectedOptions[0] ? secSel.selectedOptions[0].textContent : '';
        const roleSel = $('dlgRole');
        const roleLabel = roleSel && roleSel.value && roleSel.selectedOptions[0] ? roleSel.selectedOptions[0].textContent : '';

        notifyMobileOnNewTaskAdded({
          titleEn: txtEn || txtAr,
          titleAr: txtAr || txtEn,
          dueHM,
          sectionLabel: secLabel,
          roleLabel,
          remindBefore: 0,
        });
      });
    }

    // 2. Hook Scheduled / Personal Task Sheet (#taskSheet) save
    const taskSheet = $('taskSheet');
    if (taskSheet && !taskSheet.dataset.v12NotifWired) {
      taskSheet.dataset.v12NotifWired = '1';
      taskSheet.addEventListener('close', () => {
        if (taskSheet.returnValue !== 'save') return;
        const txtEn = ($('tkText') && $('tkText').value.trim()) || '';
        const txtAr = ($('tkTextAr') && $('tkTextAr').value.trim()) || '';
        if (!txtEn && !txtAr) return;
        const dueHM = ($('tkTime') && $('tkTime').value) || '';
        const roleSel = $('tkRole');
        const personIn = ($('tkPerson') && $('tkPerson').value.trim()) || '';
        const roleLabel = personIn || (roleSel && roleSel.value && roleSel.selectedOptions[0] ? roleSel.selectedOptions[0].textContent : '');

        notifyMobileOnNewTaskAdded({
          titleEn: txtEn || txtAr,
          titleAr: txtAr || txtEn,
          dueHM,
          sectionLabel: isAr() ? '📋 المهام المجدولة (My Tasks)' : '📋 Scheduled Tasks',
          roleLabel,
          remindBefore: 0,
        });
      });
    }

    // 3. Listen to cross-tab BroadcastChannel
    if (liveChannel && !window.__v12LiveChannelWired) {
      window.__v12LiveChannelWired = true;
      liveChannel.addEventListener('message', (ev) => {
        if (ev.data && ev.data.type === 'NEW_TASK_ADDED' && ev.data.entry) {
          fireNativeLockScreenNotification(ev.data.entry.title, ev.data.entry.body, ev.data.entry.id);
          FOH.app.render();
        }
      });
    }
  }

  function injectNewTasksInboxIntoNotifCenter() {
    const dlg = $('notifCenterDialog');
    if (!dlg || !dlg.open) return;
    if (dlg.querySelector('#notifNewTasksInboxCard')) return;

    const ar = isAr();
    const inbox = loadTaskInbox();
    const card = el('div', 'notif-center-card');
    card.id = 'notifNewTasksInboxCard';
    card.style.border = '1.5px solid var(--accent)';

    const head = el('div', '');
    head.style.display = 'flex';
    head.style.justifyContent = 'space-between';
    head.style.alignItems = 'center';
    head.style.gap = '8px';
    head.style.flexWrap = 'wrap';
    head.innerHTML =
      '<b>🆕 ' + (ar ? 'إشعارات المهام المضافة حديثاً (' + inbox.length + ')' : 'Newly Added Task Notifications (' + inbox.length + ')') + '</b>';

    const quickAddBtn = el('button', 'gov-btn primary', ar ? '+ إضافة مهمة سريعة مع إشعار فوري' : '+ Quick Task & Push Alert');
    quickAddBtn.type = 'button';
    quickAddBtn.addEventListener('click', () => {
      dlg.close();
      if (FOH.taskSheet && FOH.taskSheet.open) {
        FOH.taskSheet.open(null);
      } else if (FOH.sheet && FOH.sheet.open && S.tpl.sections[0]) {
        FOH.sheet.open({ sid: S.tpl.sections[0].id });
      }
    });
    head.append(quickAddBtn);
    card.append(head);

    if (!inbox.length) {
      card.append(
        el(
          'p',
          'empty',
          ar
            ? 'عند إضافة أي مهمة جديدة (من زر + إضافة مهمة أو تعديل الشيك ليست) سيصلك إشعار موبايل فوري وتظهر هنا ✓'
            : 'Whenever any task is added, an instant mobile notification is sent and logged here ✓'
        )
      );
    } else {
      inbox.slice(0, 5).forEach((item) => {
        const r = el('div', 'notif-item-row');
        r.innerHTML =
          '<div style="flex:1;min-width:170px;">' +
          '<b>' + item.title + '</b>' +
          '<small style="display:block;color:var(--ink2);margin-top:2px;">' + item.body + ' · 🕒 ' + item.createdAtHM + '</small>' +
          '</div>';
        card.append(r);
      });
      const clearBtn = el('button', 'gov-btn', ar ? '✓ مسح سجل المهام المضافة' : '✓ Clear History');
      clearBtn.type = 'button';
      clearBtn.style.marginTop = '8px';
      clearBtn.addEventListener('click', () => {
        saveTaskInbox([]);
        dlg.close();
        openNotificationCenterModal();
        updateNotifBellUI();
      });
      card.append(clearBtn);
    }

    const firstCard = dlg.querySelector('.notif-center-card');
    if (firstCard && firstCard.parentElement) {
      firstCard.parentElement.insertBefore(card, firstCard.nextSibling);
    }
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

  // ---- Add & Assign Task to Specific Employee or Role Modal ----
  function openAssignTaskToStaffOrRoleModal(defaultTargetSheet) {
    const ar = isAr();
    let dlg = $('assignTaskDialog');
    if (!dlg) {
      dlg = el('dialog', 'sheet');
      dlg.id = 'assignTaskDialog';
      dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
      document.body.append(dlg);
    }
    dlg.replaceChildren();

    const curSheet = defaultTargetSheet || getActiveSheetType();
    const box = el('div', '');
    box.style.padding = '14px 16px 20px';

    box.innerHTML =
      '<div class="grab"></div>' +
      '<h2 style="margin:0 0 6px;font-size:1.08rem;">➕ ' +
      (ar ? 'إضافة مهمة وتعيينها لموظف أو منصب معين' : 'Add & Assign Task to Employee or Role') +
      '</h2>' +
      '<p style="margin:0 0 12px;font-size:0.78rem;color:var(--ink2);">' +
      (ar
        ? 'اختر الشيت (Opening / Mid-Shift / Closing)، وحدد المنصب أو اسم الموظف المسؤول، وسيصله إشعار فوري على الموبايل:'
        : 'Select the shift sheet, assign to a position or specific employee, and send an instant mobile alert:') +
      '</p>';

    // 1. Task Title Input
    const titleLbl = el('label', '', ar ? '📝 عنوان المهمة المطلوبة:' : '📝 Task Description:');
    const titleIn = el('input', 'in');
    titleIn.placeholder = ar ? 'مثال: تجهيز طاولة VIP رقم 8 وتلميع كؤوس العصير...' : 'e.g. Prepare VIP Table 8 & polish wine glasses...';
    titleIn.style.marginTop = '4px';
    titleLbl.append(titleIn);
    box.append(titleLbl);

    // 2. Target Sheet & Section
    const rowSheet = el('div', 'two');
    rowSheet.style.marginTop = '10px';

    const sheetLbl = el('label', '', ar ? '📋 ضمن أي شيت؟' : '📋 Target Shift Sheet:');
    const sheetSel = el('select', 'in');
    [
      ['opening', ar ? '☀️ Opening Sheet (12:00 ص – 3:00 م)' : '☀️ Opening Sheet (12AM–3PM)'],
      ['mid', ar ? '🌤️ Mid-Shift Sheet (3:00 م – 11:00 م)' : '🌤️ Mid-Shift Sheet (3PM–11PM)'],
      ['closing', ar ? '🌙 Closing Sheet (11:00 م – الإغلاق)' : '🌙 Closing Sheet (11PM–Close)'],
    ].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = val;
      o.selected = val === curSheet;
      sheetSel.append(o);
    });
    sheetLbl.append(sheetSel);

    const secLbl = el('label', '', ar ? '📂 القسم الفرعي:' : '📂 Section:');
    const secSel = el('select', 'in');
    secLbl.append(secSel);

    function populateSectionsForSheet(sType) {
      secSel.replaceChildren();
      let list = S.tpl.sections || [];
      if (sType !== getActiveSheetType()) {
        if (sType === 'mid' && FOH.erpPwa && FOH.erpPwa.loadMidSections) list = FOH.erpPwa.loadMidSections();
        else if (sType === 'closing' && FOH.erpPwa && FOH.erpPwa.loadClosingSections) list = FOH.erpPwa.loadClosingSections();
        else if (sType === 'opening' && FOH.erpPwa && FOH.erpPwa.getOpeningBackup && FOH.erpPwa.getOpeningBackup()) {
          list = FOH.erpPwa.getOpeningBackup();
        }
      }
      list.forEach((s) => {
        const o = el('option', '', (s.icon || '📌') + ' ' + (ar ? s.titleAr || s.title : s.title || s.titleAr));
        o.value = s.id;
        secSel.append(o);
      });
    }
    populateSectionsForSheet(sheetSel.value);
    sheetSel.addEventListener('change', () => populateSectionsForSheet(sheetSel.value));

    rowSheet.append(sheetLbl, secLbl);
    box.append(rowSheet);

    // 3. Assign to Position (Super Role) AND/OR Specific Employee
    const rowAssign = el('div', 'two');
    rowAssign.style.marginTop = '10px';

    const roleLbl = el('label', '', ar ? '🪪 تعيين لمنصب معين (Position):' : '🪪 Assign to Position (Role):');
    const roleSel = el('select', 'in');
    [
      ['super_waiter', ar ? '⭐ Super Waiter (منصب الويتر)' : '⭐ Super Waiter'],
      ['super_bartender', ar ? '🍸 Super Bartender (منصب البارتندر)' : '🍸 Super Bartender'],
      ['super_captain', ar ? '🎖️ Super Captain (منصب الكابتن)' : '🎖️ Super Captain'],
      ['super_manager', ar ? '👑 Super Manager (منصب المدير)' : '👑 Super Manager'],
      ['all', ar ? '👥 عام لكل المناصب (All Roles)' : '👥 All Positions'],
    ].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = val;
      roleSel.append(o);
    });
    roleLbl.append(roleSel);

    const empLbl = el('label', '', ar ? '👤 تعيين لموظف محدد بالاسم:' : '👤 Specific Employee (Optional):');
    const empSel = el('select', 'in');
    [
      ['', ar ? '— كل موظفي هذا المنصب —' : '— Any staff in this role —'],
      ['sara', ar ? '👤 سارة خوري (Sara · Waiter)' : '👤 Sara Khoury (Waiter)'],
      ['maher', ar ? '👤 ماهر زيد (Maher · Bartender)' : '👤 Maher Zaid (Bartender)'],
      ['ali', ar ? '👤 علي حسن (Ali · Captain)' : '👤 Ali Hassan (Captain)'],
      ['fadi', ar ? '👤 فادي المصري (Fadi · Manager)' : '👤 Fadi Al-Masri (Manager)'],
    ].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = val;
      empSel.append(o);
    });
    empSel.addEventListener('change', () => {
      const map = { sara: 'super_waiter', maher: 'super_bartender', ali: 'super_captain', fadi: 'super_manager' };
      if (empSel.value && map[empSel.value]) {
        roleSel.value = map[empSel.value];
      }
    });
    empLbl.append(empSel);

    rowAssign.append(roleLbl, empLbl);
    box.append(rowAssign);

    // 4. Due Time Input
    const dueRow = el('div', 'two');
    dueRow.style.marginTop = '10px';
    const dueLbl = el('label', '', ar ? '⏰ وقت التنفيذ المطلوب (اختياري):' : '⏰ Due Time (Optional):');
    const dueIn = el('input', 'in');
    dueIn.type = 'time';
    dueIn.value = FOH.time.nowHM();
    dueLbl.append(dueIn);
    dueRow.append(dueLbl);
    box.append(dueRow);

    // 5. Actions
    const acts = el('div', 'sheet-actions');
    acts.style.marginTop = '16px';
    const cancelB = el('button', 'btn', ar ? 'إلغاء' : 'Cancel');
    cancelB.type = 'button';
    cancelB.addEventListener('click', () => dlg.close());

    const saveB = el('button', 'btn primary', ar ? '✅ حفظ المهمة وإرسال إشعار للموظف' : '✅ Save & Notify Staff');
    saveB.type = 'button';
    saveB.addEventListener('click', () => {
      const textVal = titleIn.value.trim();
      if (!textVal) return titleIn.focus();

      const targetSheet = sheetSel.value;
      const targetSecId = secSel.value;
      const rKey = roleSel.value;
      const empUser = empSel.value;
      const dueHM = dueIn.value || '';

      const roleBadgeMap = {
        super_waiter: '⭐ Super Waiter',
        super_bartender: '🍸 Super Bartender',
        super_captain: '🎖️ Super Captain',
        super_manager: '👑 Super Manager',
        all: ar ? '👥 الجميع' : '👥 All',
      };
      const empNameMap = {
        sara: ar ? 'سارة (Sara)' : 'Sara',
        maher: ar ? 'ماهر (Maher)' : 'Maher',
        ali: ar ? 'علي (Ali)' : 'Ali',
        fadi: ar ? 'فادي (Fadi)' : 'Fadi',
      };

      const assignedLabel = (empUser ? ('👤 ' + empNameMap[empUser] + ' · ') : '') + (roleBadgeMap[rKey] || '');

      const newItem = {
        id: 'asg_' + Date.now(),
        text: textVal,
        textAr: textVal,
        due: dueHM,
        role: '',
        assignedRoleKey: rKey,
        assignedUsername: empUser,
        assignedRoleLabel: assignedLabel,
        children: [],
      };

      if (targetSheet !== getActiveSheetType() && FOH.erpPwa && FOH.erpPwa.switchSheetType) {
        manualSheetOverride = targetSheet !== getScheduledSheetForNow();
        FOH.erpPwa.switchSheetType(targetSheet);
      }

      const secObj = (S.tpl.sections || []).find((s) => s.id === targetSecId) || S.tpl.sections[0];
      if (secObj) {
        secObj.items.unshift(newItem);
      }
      if (FOH.erpPwa && FOH.erpPwa.persistCurrentSheetState) {
        FOH.erpPwa.persistCurrentSheetState();
      }

      // Also add to Scheduled Tasks (S.tpl.tasks) so it shows in "📋 My Tasks" (#mine) too
      S.tpl.tasks.unshift({
        id: newItem.id,
        text: textVal,
        textAr: textVal,
        icon: targetSheet === 'opening' ? '☀️' : targetSheet === 'mid' ? '🌤️' : '🌙',
        rule: { type: 'once', date: S.date },
        start: S.date,
        time: dueHM || '14:00',
        lateAfter: 60,
        role: '',
        person: empUser ? empNameMap[empUser] : roleBadgeMap[rKey],
        assignedRoleKey: rKey,
        assignedUsername: empUser,
        assignedSheet: targetSheet,
        carry: true,
        paused: false,
      });
      FOH.store.saveTemplate(S.tpl);

      dlg.close();

      notifyMobileOnNewTaskAdded({
        titleEn: textVal,
        titleAr: textVal,
        dueHM,
        sectionLabel: (secObj ? (ar ? secObj.titleAr || secObj.title : secObj.title) : targetSheet),
        roleLabel: assignedLabel,
        remindBefore: 0,
      });

      if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
        FOH.cloudRealtime.broadcast('TASK_ASSIGNED', {
          senderName: (sess && sess.displayName) || 'Manager',
          targetSheet,
          dueHM,
          item: newItem,
        });
      }

      FOH.edit.toast(ar ? '✅ تم تعيين المهمة لـ (' + assignedLabel + ') وإرسال الإشعار!' : '✅ Task assigned to ' + assignedLabel + ' & notified!');
      FOH.app.render();
    });

    acts.append(cancelB, saveB);
    box.append(acts);
    dlg.append(box);
    dlg.showModal();
    titleIn.focus();
  }

  // Render Assignment Badges on Checklist Items & Filter Sections/Items by Assigned Employee/Role
  function renderAssignedTaskBadgesAndFilter() {
    const secEl = $('sections');
    if (!secEl || secEl.hidden || S.view !== 'opening' || S.editing) return;
    if (S.editing || S.view !== 'opening') return;
    const sess = getSession();
    const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
    const curRole = getCurrentSuperRoleKey();
    const isLeader = curRole === 'super_manager' || curRole === 'super_captain';

    // 1. Section-level department filtering for Mid-Shift & Opening when roleScopeOnly is active
    if (roleScopeOnly && !isLeader) {
      document.querySelectorAll('#sections > section.card').forEach((card) => {
        const sid = (card.id || '').replace(/^sec-/, '');
        const secObj = (S.tpl.sections || []).find((x) => x.id === sid);
        const dept = secObj && secObj.dept;
        if (dept) {
          if (curRole === 'super_waiter' && (dept === 'bar' || dept === 'cash')) {
            card.style.display = 'none';
          } else if (curRole === 'super_bartender' && (dept === 'floor' || dept === 'cash')) {
            card.style.display = 'none';
          } else {
            card.style.display = '';
          }
        }
      });
      document.querySelectorAll('#chips .chip').forEach((chip) => {
        const card = $('sec-' + chip.dataset.sid);
        if (card) chip.style.display = card.style.display;
      });
    }

    // 2. Item-level badges & filtering
    const flatItems = new Map();
    (S.tpl.sections || []).forEach((s) => {
      (s.items || []).forEach((it) => {
        flatItems.set(it.id, it);
        (it.children || []).forEach((ch) => flatItems.set(ch.id, ch));
      });
    });

    document.querySelectorAll('#sections li.item, #sections li.kid').forEach((li) => {
      const cb = li.querySelector('input.ck[data-id]');
      if (!cb) return;
      const itemId = cb.dataset.id;
      const itemObj = flatItems.get(itemId);
      if (!itemObj) return;

      const txtContainer = li.querySelector('.txt') || li.querySelector('label');
      if (txtContainer && itemObj.assignedRoleLabel && !txtContainer.querySelector('.assigned-task-pill')) {
        const pill = el('span', 'assigned-task-pill', '🎯 ' + itemObj.assignedRoleLabel);
        txtContainer.append(pill);
      }

      if (roleScopeOnly && !isLeader) {
        let visible = true;
        if (itemObj.assignedUsername && itemObj.assignedUsername !== curUser) {
          visible = false;
        } else if (itemObj.assignedRoleKey && itemObj.assignedRoleKey !== 'all' && itemObj.assignedRoleKey !== curRole) {
          visible = false;
        }
        li.style.display = visible ? '' : 'none';
      } else {
        li.style.display = '';
      }
    });
  }

  function injectAssignTaskBtnIntoToolbarAndMine() {
    const ar = isAr();
    const toolbar = document.querySelector('#checklistGovBar .unified-sec-toolbar');
    if (toolbar && !toolbar.querySelector('#toolbarAssignTaskBtn')) {
      const btn = el('button', 'u-pill primary-assign', ar ? '➕ إضافة وتعيين مهمة' : '➕ Assign Task');
      btn.type = 'button';
      btn.id = 'toolbarAssignTaskBtn';
      btn.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());
      toolbar.prepend(btn);
    }

    const mineRoot = $('mine');
    if (mineRoot && !mineRoot.hidden && !mineRoot.querySelector('#mineAssignTaskBar')) {
      const card = el('div', 'sec-context-bar');
      card.id = 'mineAssignTaskBar';
      card.style.border = '1.5px solid var(--accent)';
      card.innerHTML =
        '<div><b>🎯 ' + (ar ? 'تعيين المهام للموظفين والمناصب' : 'Task Assignment by Staff & Position') + '</b>' +
        '<small style="display:block;color:var(--ink2);">' +
        (ar ? 'أضف مهمة جديدة وعيّنها لـ Waiter / Bartender / Captain أو لموظف بالاسم' : 'Create a task and assign it to a specific role or employee') +
        '</small></div>';
      const addB = el('button', 'btn primary', ar ? '➕ إضافة وتعيين مهمة' : '➕ Add & Assign Task');
      addB.type = 'button';
      addB.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());
      card.append(addB);
      mineRoot.prepend(card);
    }
  }



  // ============================================================================
  // 17. SUPER EMPLOYEE v15: SUPABASE REALTIME MULTI-DEVICE CLOUD SYNC ENGINE
  //     Instant cross-device push notifications, live task ticks & Last Order
  // ============================================================================
  (function (FOH) {
    'use strict';

    const REALTIME_WS_URL = 'wss://jncnbwwhjmouxptqfjaz.supabase.co/realtime/v1/websocket?apikey=sb_publishable_82pr7lscQZiCiyxUT_TTEA_J9IhKuz1&vsn=1.0.0';
    const REALTIME_TOPIC = 'realtime:oasis_ceen_shift_live';

    let ws = null;
    let wsConnected = false;
    let wsConnecting = false;
    let heartbeatInterval = 0;
    let reconnectTimeout = 0;
    let msgRef = 0;

    function nextRef() {
      return String(++msgRef);
    }

    function updateRealtimeIndicator(status) {
      const el = document.getElementById('cloudRealtimeIndicator');
      if (!el) return;
      const ar = FOH.i18n ? FOH.i18n.lang === 'ar' : true;
      el.className = 'realtime-status-pill ' + status;
      if (status === 'online') {
        el.innerHTML = '<span class="realtime-dot"></span> ' + (ar ? '⚡ متصل لحظياً' : '⚡ Live Cloud');
        el.title = ar ? 'متصل لحظياً بالسحابة مع جميع هواتف الفريق (Supabase Realtime)' : 'Connected live to all staff devices';
      } else if (status === 'connecting') {
        el.innerHTML = '<span class="realtime-dot"></span> ' + (ar ? '⏳ جاري الاتصال...' : '⏳ Connecting...');
        el.title = ar ? 'جاري الاتصال بالسحابة...' : 'Connecting to cloud...';
      } else {
        el.innerHTML = '<span class="realtime-dot"></span> ' + (ar ? '📡 وضع أوفلاين' : '📡 Offline Mode');
        el.title = ar ? 'يعمل دون إنترنت وسيتم المزامنة تلقائياً عند الاتصال' : 'Working offline; auto-reconnects when online';
      }
    }

    function connect() {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
      wsConnecting = true;
      updateRealtimeIndicator('connecting');

      try {
        ws = new WebSocket(REALTIME_WS_URL);
      } catch (err) {
        wsConnecting = false;
        wsConnected = false;
        updateRealtimeIndicator('offline');
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        wsConnecting = false;
        wsConnected = true;
        updateRealtimeIndicator('online');

        // Join the CEEN Restaurant live shift broadcast topic
        ws.send(JSON.stringify({
          topic: REALTIME_TOPIC,
          event: 'phx_join',
          payload: { config: { broadcast: { self: false } } },
          ref: nextRef(),
        }));

        clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              topic: 'phoenix',
              event: 'heartbeat',
              payload: {},
              ref: nextRef(),
            }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'broadcast' && msg.payload && msg.payload.payload) {
            handleIncomingRealtimeBroadcast(msg.payload.payload);
          }
        } catch {}
      };

      ws.onerror = () => {
        wsConnected = false;
        updateRealtimeIndicator('offline');
      };

      ws.onclose = () => {
        wsConnected = false;
        wsConnecting = false;
        updateRealtimeIndicator('offline');
        clearInterval(heartbeatInterval);
        scheduleReconnect();
      };
    }

    function scheduleReconnect() {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => {
        if (!wsConnected) connect();
      }, 5000);
    }

    function broadcast(eventType, payloadData) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        connect();
      }
      const pkt = {
        topic: REALTIME_TOPIC,
        event: 'broadcast',
        payload: {
          type: 'broadcast',
          event: eventType,
          payload: Object.assign({}, payloadData, {
            _sentAt: Date.now(),
            _senderUsername: (FOH.state && FOH.state.me && FOH.state.me.name) || 'Staff',
          }),
        },
        ref: nextRef(),
      };
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(pkt));
      }
    }

    // Handle messages received live from other phones
    function handleIncomingRealtimeBroadcast(data) {
      if (!data || !data.type) return;
      const ar = FOH.i18n ? FOH.i18n.lang === 'ar' : true;
      const sess = typeof getSession === 'function' ? getSession() : null;
      const curUser = (sess && sess.username ? sess.username.toLowerCase() : 'fadi');
      const curRole = typeof getCurrentSuperRoleKey === 'function' ? getCurrentSuperRoleKey() : 'staff';
      const S = FOH.state;

      // 1. New Task Assigned by Manager / Captain from their phone
      if (data.type === 'TASK_ASSIGNED' && data.item) {
        const item = data.item;
        const targetSheet = data.targetSheet || 'opening';
        const isForMe = !item.assignedUsername || item.assignedUsername === curUser ||
                        item.assignedRoleKey === 'all' || item.assignedRoleKey === curRole ||
                        curRole === 'super_manager' || curRole === 'super_captain';

        // Add to local target template
        let targetSections = S.tpl.sections;
        if (targetSheet === 'mid' && typeof loadMidSections === 'function') {
          targetSections = loadMidSections();
        } else if (targetSheet === 'closing' && typeof loadClosingSections === 'function') {
          targetSections = loadClosingSections();
        }

        const sec = targetSections.find((s) => s.id === item.sectionId) || targetSections[0];
        if (sec && !sec.items.some((it) => it.id === item.id)) {
          sec.items.unshift(item);
          if (targetSheet === 'mid' && typeof saveMidSections === 'function') saveMidSections(targetSections);
          else if (targetSheet === 'closing') localStorage.setItem('foh-opening.closingSections.v1', JSON.stringify(targetSections));
          else FOH.store.saveTemplate(S.tpl);
        }

        // Add to scheduled tasks if for this user
        if (isForMe && !S.tpl.tasks.some((tk) => tk.id === item.id)) {
          S.tpl.tasks.unshift({
            id: item.id,
            text: item.text,
            textAr: item.textAr || item.text,
            icon: targetSheet === 'opening' ? '☀️' : targetSheet === 'mid' ? '🌤️' : '🌙',
            rule: { type: 'once', date: S.date },
            start: S.date,
            time: item.due || '14:00',
            lateAfter: 60,
            role: '',
            person: item.assignedRoleLabel || '',
            assignedRoleKey: item.assignedRoleKey,
            assignedUsername: item.assignedUsername,
            assignedSheet: targetSheet,
            carry: true,
            paused: false,
          });
          FOH.store.saveTemplate(S.tpl);
        }

        if (isForMe) {
          const alertTitle = ar
            ? '📲 مهمة جديدة موكلة لك من ' + (data.senderName || 'المدير')
            : '📲 New Task from ' + (data.senderName || 'Manager');
          const alertBody = (item.textAr || item.text) + (item.due ? (' · ⏰ ' + item.due) : '');

          if (typeof fireNativeLockScreenNotification === 'function') {
            fireNativeLockScreenNotification(alertTitle, alertBody, item.id);
          }
          if (typeof notifyMobileOnNewTaskAdded === 'function') {
            notifyMobileOnNewTaskAdded({
              titleEn: item.text,
              titleAr: item.textAr || item.text,
              dueHM: item.due,
              sectionLabel: targetSheet,
              roleLabel: item.assignedRoleLabel,
            });
          }
          if (FOH.edit && FOH.edit.toast) {
            FOH.edit.toast('📲 ' + alertTitle + ': ' + alertBody);
          }
        }

        if (FOH.app && FOH.app.render) FOH.app.render();
      }

      // 2. Task Ticked in Real Time on another device
      if (data.type === 'TASK_TICKED' && data.itemId) {
        if (data.checked) {
          S.run.checked[data.itemId] = data.at || FOH.time.nowHM();
        } else {
          delete S.run.checked[data.itemId];
        }
        if (data.sheetType === 'closing') {
          try {
            const cr = FOH.safeJsonParse(localStorage.getItem('foh-opening.closingRun.' + S.date), '{}');
            cr.checked = cr.checked || {};
            if (data.checked) cr.checked[data.itemId] = S.run.checked[data.itemId];
            else delete cr.checked[data.itemId];
            localStorage.setItem('foh-opening.closingRun.' + S.date, JSON.stringify(cr));
          } catch {}
        } else {
          FOH.store.saveRun(S.date, S.run);
        }
        if (FOH.app && FOH.app.render) FOH.app.render();
      }

      // 3. Last Order Declared by Manager or Captain
      if (data.type === 'LAST_ORDER_TRIGGERED') {
        const title = ar
          ? '🔔 إعلان Last Order ' + (data.kind === 'kitchen' ? 'المطبخ 🍳' : 'البار 🍸') + ' من ' + data.byName
          : '🔔 Last Order Declared for ' + data.kind + ' by ' + data.byName;
        const body = ar
          ? 'الساعة ' + data.at + ' · يرجى البدء بإجراءات إغلاق القسم.'
          : 'At ' + data.at + ' · Please initiate department closing.';

        if (typeof fireNativeLockScreenNotification === 'function') {
          fireNativeLockScreenNotification(title, body, 'lo_' + Date.now());
        }
        if (FOH.edit && FOH.edit.toast) {
          FOH.edit.toast(title);
        }
        if (FOH.app && FOH.app.render) FOH.app.render();
      }

      // 4. Restaurant Closed
      if (data.type === 'RESTAURANT_CLOSED') {
        const title = ar
          ? '🔒 تم إغلاق المطعم رسمياً من ' + data.closedBy
          : '🔒 Restaurant Officially Closed by ' + data.closedBy;
        if (typeof fireNativeLockScreenNotification === 'function') {
          fireNativeLockScreenNotification(title, ar ? 'اكتمل يوم العمل بنجاح ✓' : 'Shift day completed ✓', 'rc_' + Date.now());
        }
        if (FOH.edit && FOH.edit.toast) {
          FOH.edit.toast(title);
        }
        if (FOH.app && FOH.app.render) FOH.app.render();
      }
    }

    FOH.cloudRealtime = {
      connect,
      broadcast,
      isConnected: () => wsConnected,
      updateRealtimeIndicator,
    };

    document.addEventListener('DOMContentLoaded', connect);
  })(window.FOH = window.FOH || {});

  // ============================================================================
  // 16. SUPER EMPLOYEE v14: ROLE-SPECIFIC LANDING PAGE COCKPIT
  // ============================================================================
  function renderRoleSpecificLandingHero() {
    const mainEl = $('appMain');
    if (!mainEl) return;
    let hero = $('roleLandingHero');
    if (S.editing || S.view !== 'opening') {
      if (hero) hero.hidden = true;
      return;
    }
    if (!hero) {
      hero = el('section', 'role-landing-hero run-only');
      hero.id = 'roleLandingHero';
      mainEl.prepend(hero);
    }
    hero.hidden = false;
    hero.replaceChildren();

    const ar = isAr();
    const rKey = getCurrentSuperRoleKey();
    const sess = getSession();
    const dispName = (sess && (ar ? sess.displayNameAr || sess.displayName : sess.displayName)) || S.me.name || 'Staff';
    const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S.run.checked);
    const pct = all.total ? Math.round((all.done * 100) / all.total) : 0;
    const leftCount = all.total - all.done;

    hero.className = 'role-landing-hero run-only role-' + rKey;

    // Hide the administrative #opsLifecycleBar for Waiters & Bartenders & Captains so only Manager sees restaurant open/close lifecycle!
    const opsBar = $('opsLifecycleBar');
    if (opsBar) {
      if (rKey !== 'super_manager') {
        opsBar.hidden = true;
      }
    }

    const headerRow = el('div', 'rlh-header-row');
    const titleBlock = el('div', 'rlh-title-block');
    let titleHtml = '';
    let subHtml = '';

    if (rKey === 'super_waiter' || rKey === 'staff') {
      titleHtml = '⭐ ' + (ar ? 'أهلاً ' + dispName + ' · مساحة عمل الويتر' : 'Welcome ' + dispName + ' · Waiter Station');
      subHtml = ar ? 'لديك ' + leftCount + ' مهام متبقية في شيك ليست هذا الشفت' : leftCount + ' tasks remaining in current shift';
    } else if (rKey === 'super_bartender') {
      titleHtml = '🍸 ' + (ar ? 'أهلاً ' + dispName + ' · محطة عمليات البار' : 'Welcome ' + dispName + ' · Bar Operations');
      subHtml = ar ? 'لديك ' + leftCount + ' مهام متبقية لتجهيز البار والطلبيات' : leftCount + ' tasks left for bar prep & orders';
    } else if (rKey === 'super_captain') {
      titleHtml = '🎖️ ' + (ar ? 'قيادة الصالة والشفت · الكابتن ' + dispName : 'Floor Captain Cockpit · ' + dispName);
      subHtml = ar ? 'جاهزية الصالة ' + pct + '% · إدارة وتعيين مهام الويترية' : 'Floor readiness ' + pct + '% · Manage waitstaff tasks';
    } else {
      titleHtml = '👑 ' + (ar ? 'لوحة القيادة التنفيذية · المدير ' + dispName : 'Executive Manager Pulse · ' + dispName);
      subHtml = ar ? 'إشراف كامل على الشيتات الثلاثة، التبس وجاهزية المطعم' : 'Full oversight of shift sheets, tips & readiness';
    }

    titleBlock.innerHTML =
      '<h3 class="rlh-title">' + titleHtml + '</h3>' +
      '<p class="rlh-sub">' + subHtml + '</p>';

    // Sleek KPI Badge in Corner - NEVER crushed or wrapped
    const kpiBadge = el('div', 'rlh-kpi-badge');
    kpiBadge.innerHTML =
      '<div class="rlh-kpi-num">' + pct + '<small>%</small></div>' +
      '<div class="rlh-kpi-sub">' + all.done + '/' + all.total + ' ' + (ar ? 'منجز' : 'Done') + '</div>';

    headerRow.append(titleBlock, kpiBadge);

    // Sleek Linear Progress Track
    const progressTrack = el('div', 'rlh-progress-track');
    const progressBar = el('div', 'rlh-progress-fill');
    progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    progressTrack.append(progressBar);

    const actions = el('div', 'rlh-actions');

    if (rKey === 'super_waiter' || rKey === 'staff') {
      const bMine = el('button', 'rlh-btn primary', ar ? '📋 مهامي الخاصة بهذا الشفت' : '📋 My Shift Tasks');
      bMine.type = 'button';
      bMine.addEventListener('click', () => switchView('mine'));

      const bDayOff = el('button', 'rlh-btn', ar ? '🏖️ طلب يوم عطلة / أوف' : '🏖️ Request Day-Off');
      bDayOff.type = 'button';
      bDayOff.addEventListener('click', () => {
        switchView('mine');
        setTimeout(() => {
          const el = document.querySelector('.dayoff-form') || document.getElementById('mine');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      });

      actions.append(bMine, bDayOff);

      if (canCurrentUserAccessOrders()) {
        const bOrd = el('button', 'rlh-btn', ar ? '🛒 طلبيات الصالة والمستودع' : '🛒 Store Orders');
        bOrd.type = 'button';
        bOrd.addEventListener('click', () => switchView('orders'));
        actions.append(bOrd);
      }

      const bAcad = el('button', 'rlh-btn', ar ? '🎓 منيو أكاديمي (+XP)' : '🎓 Menu Academy (+XP)');
      bAcad.type = 'button';
      bAcad.addEventListener('click', () => switchView('academy'));

      const bDmg = el('button', 'rlh-btn', ar ? '🔧 تبليغ كسر / صيانة' : '🔧 Report Breakage');
      bDmg.type = 'button';
      bDmg.addEventListener('click', () => FOH.invBreak && FOH.invBreak.open && FOH.invBreak.open());

      actions.append(bAcad, bDmg);
    } else if (rKey === 'super_bartender') {
      if (canCurrentUserAccessOrders()) {
        const bOrd = el('button', 'rlh-btn primary', ar ? '🛒 طلبيات البار من المستودع' : '🛒 Bar Warehouse Orders');
        bOrd.type = 'button';
        bOrd.addEventListener('click', () => switchView('orders'));
        actions.append(bOrd);
      }

      const bMine = el('button', 'rlh-btn' + (!canCurrentUserAccessOrders() ? ' primary' : ''), ar ? '📋 مهام البار الخاصة بي' : '📋 My Bar Tasks');
      bMine.type = 'button';
      bMine.addEventListener('click', () => switchView('mine'));

      const bDayOff = el('button', 'rlh-btn', ar ? '🏖️ طلب يوم عطلة / أوف' : '🏖️ Request Day-Off');
      bDayOff.type = 'button';
      bDayOff.addEventListener('click', () => {
        switchView('mine');
        setTimeout(() => {
          const el = document.querySelector('.dayoff-form') || document.getElementById('mine');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      });

      const bInv = el('button', 'rlh-btn', ar ? '📦 جرد البار وتسجيل التالف' : '📦 Bar Inventory & Breakage');
      bInv.type = 'button';
      bInv.addEventListener('click', () => switchView('inv'));

      actions.append(bMine, bDayOff, bInv);
    } else if (rKey === 'super_captain') {
      const bAsg = el('button', 'rlh-btn primary', ar ? '➕ تعيين مهمة لويتر / بارتندر' : '➕ Assign Task to Staff');
      bAsg.type = 'button';
      bAsg.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());

      const bMine = el('button', 'rlh-btn', ar ? '📋 مهامي الخاصة' : '📋 My Tasks');
      bMine.type = 'button';
      bMine.addEventListener('click', () => switchView('mine'));

      if (canCurrentUserAccessOrders()) {
        const bOrd = el('button', 'rlh-btn', ar ? '🛒 مراجعة طلبيات الصالة' : '🛒 Review Orders');
        bOrd.type = 'button';
        bOrd.addEventListener('click', () => switchView('orders'));
        actions.append(bOrd);
      }

      const bDayOff = el('button', 'rlh-btn', ar ? '🏖️ طلب يوم عطلة / أوف' : '🏖️ Request Day-Off');
      bDayOff.type = 'button';
      bDayOff.addEventListener('click', () => {
        switchView('mine');
        setTimeout(() => {
          const el = document.querySelector('.dayoff-form') || document.getElementById('mine');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      });

      actions.append(bAsg, bMine, bDayOff);
    } else {
      const bAsg = el('button', 'rlh-btn primary', ar ? '➕ إضافة وتعيين مهمة' : '➕ Assign Task to Staff');
      bAsg.type = 'button';
      bAsg.addEventListener('click', () => openAssignTaskToStaffOrRoleModal());

      const bDash = el('button', 'rlh-btn', ar ? '📊 لوحة التحليلات والتقارير' : '📊 Analytics Dashboard');
      bDash.type = 'button';
      bDash.addEventListener('click', () => switchView('dashboard'));

      const bSet = el('button', 'rlh-btn', ar ? '⚙️ الإعدادات والصلاحيات' : '⚙️ Settings & Permissions');
      bSet.type = 'button';
      bSet.addEventListener('click', () => switchView('settings'));

      actions.append(bAsg, bDash, bSet);
    }

    hero.append(headerRow, progressTrack, actions);

    // If Manager and there are pending staff name/nickname change requests, display pending approvals card
    if (rKey === 'super_manager') {
      const pendingChanges = (S.tpl.staff || []).filter(
        (p) => p.pendingNameChange && p.pendingNameChange.status === 'pending'
      );
      if (pendingChanges.length > 0) {
        const pac = el('div', 'pending-approvals-card');
        pac.innerHTML =
          '<div class="pac-head">' +
          '<span><b>📝 ' + (ar ? 'طلبات اعتماد تعديل أسماء الموظفين والـ Nicknames' : 'Pending Staff Name Change Approvals') + '</b></span>' +
          '<span class="pac-badge">' + pendingChanges.length + ' ' + (ar ? 'طلب جديد' : 'New') + '</span>' +
          '</div>';
        const pacList = el('div', 'pac-list');
        pendingChanges.forEach((st) => {
          const req = st.pendingNameChange;
          const it = el('div', 'pac-item');
          it.innerHTML =
            '<div class="pac-item-info">' +
            '<b>' + st.name + '</b> (' + (st.role || 'Staff') + ')<br>' +
            (ar ? 'الاسم الرسمي الجديد المطلوب:' : 'Requested Legal Name:') + ' <b style="color:var(--accent);">' + (FOH.escapeHtml(req.reqFullName || (req.reqFirstName + ' ' + req.reqLastName))) + '</b><br>' +
            (ar ? 'الـ Nickname المقترح (للتبس والجدول):' : 'Requested Nickname:') + ' <b style="color:#10b981;">🏷️ ' + (FOH.escapeHtml(req.reqNickname || '—')) + '</b>' +
            '</div>';
          const actDiv = el('div', 'pac-item-actions');
          const appBtn = el('button', 'pac-btn approve', ar ? '✓ اعتماد وتطبيق في كافة الأنظمة' : '✓ Approve & Sync');
          appBtn.type = 'button';
          appBtn.addEventListener('click', () => {
            st.name = req.reqFullName || ((req.reqFirstName + ' ' + req.reqLastName).trim()) || st.name;
            if (req.reqNickname) st.nickname = req.reqNickname;
            delete st.pendingNameChange;
            FOH.store.saveTemplate(S.tpl);
            if (sess && (sess.staffId === st.id || (sess.username || '').toLowerCase() === (st.name || '').toLowerCase())) {
              sess.firstName = req.reqFirstName;
              sess.lastName = req.reqLastName;
              sess.displayName = st.name;
              sess.nickname = st.nickname;
              saveSession(sess, true);
            }
            if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
              FOH.cloudRealtime.broadcast('STAFF_NAME_CHANGE_APPROVED', { staffId: st.id, name: st.name, nickname: st.nickname });
            }
            FOH.edit.toast(ar ? ('✓ تم اعتماد تعديل اسم ' + st.name + ' ولقب ' + (st.nickname || '') + ' بنجاح') : 'Approved and synced across all apps ✓');
            FOH.app.render();
          });

          const rejBtn = el('button', 'pac-btn reject', ar ? '✕ رفض الطلب' : '✕ Reject');
          rejBtn.type = 'button';
          rejBtn.addEventListener('click', () => {
            delete st.pendingNameChange;
            FOH.store.saveTemplate(S.tpl);
            FOH.edit.toast(ar ? 'تم رفض طلب التعديل' : 'Request rejected');
            FOH.app.render();
          });

          actDiv.append(appBtn, rejBtn);
          it.append(actDiv);
          pacList.append(it);
        });
        pac.append(pacList);
        hero.append(pac);
      }
    }
  }

  function syncSuperEmployeeUI() {
    ensureStaffHealthAndPerms();
    const ar = isAr();
    const gov = loadGov();
    const sess = getSession();
    const isMgr = !sess || !!sess.isManager;
    const canEdit = canCurrentUserEditChecklist();
    const restName = ar ? gov.restaurantNameAr : gov.restaurantName;

    if ($('loginTitle')) $('loginTitle').textContent = 'Super Employee';
    if ($('loginSubtitle')) $('loginSubtitle').textContent = restName + ' · ' + (ar ? 'منصة العمليات الذكية للمطعم والبار' : 'Smart Restaurant & Bar Operations');
    const brandPill = document.querySelector('.login-brand-pill');
    if (brandPill) brandPill.textContent = '🍽 ' + restName;

    const ident = getAppRoleIdentity();
    if ($('title')) {
      $('title').textContent = S.editing
        ? (ar ? 'تعديل الشيك ليست' : 'Edit Checklist')
        : (ar ? ident.titleAr : ident.titleEn);
    }
    document.title = (ar ? ident.titleAr : ident.titleEn) + ' · ' + restName;
    if ($('restaurantBadge')) $('restaurantBadge').textContent = '🍽 ' + restName;
    if ($('activeSectionBadge')) {
      $('activeSectionBadge').style.display = 'none';
    }

    if ($('checklistLockPill')) {
      $('checklistLockPill').style.display = 'none';
    }

    if ($('ordersTab')) {
      $('ordersTab').hidden = !canCurrentUserAccessOrders();
    }
    if ($('lockBtn')) {
      $('lockBtn').hidden = !isMgr || S.editing;
      $('lockBtn').textContent = gov.checklistLocked ? '🔒' : '🔓';
      $('lockBtn').title = gov.checklistLocked ? (ar ? 'فتح قفل الشيك ليست' : 'Unlock Checklist') : (ar ? 'قفل الشيك ليست' : 'Lock Checklist');
    }
    if ($('modeBtn')) {
      $('modeBtn').style.display = (canEdit || S.editing) ? '' : 'none';
    }

    document.body.classList.toggle('focused-non-opening', !S.editing && S.view !== 'opening');

    const alerts = getHealthAlerts();
    const pendingSugs = loadSuggestions().filter((s) => s.status === 'pending');
    if ($('sbAlertDot')) {
      $('sbAlertDot').hidden = !(alerts.length > 0 || (isMgr && pendingSugs.length > 0));
    }

    ensureUpgradedClosingSections();
    ensureNotifBellInHeader();
    renderHealthBanner();
    renderSmartAlertBanners();
    renderOpsLifecycleBar();
    renderChecklistGovBar();
    enhanceChecklistContextAndRoleScope();
    renderClosingDeptFilterBar();
    injectChecklistItemNotes();
    enhanceSidebarAndInventory();
    wireAutomaticTaskCreationNotifications();
    enforceTimeBasedSheetSchedule();
    relocateHeaderSubbarsToMain();
    renderCleanHeaderText();
    collapseOpsLifecycleBarToOneLine();
    renderUnifiedSingleRowChecklistBar();
    renderUnifiedThreeSheetNav();
    renderRoleSpecificLandingHero();
    renderAssignedTaskBadgesAndFilter();
    injectAssignTaskBtnIntoToolbarAndMine();
    injectRoleSwitcherInSidebar();

    if (!S.editing) {
      if (S.view === 'academy' && $('academyView')) renderAcademyView($('academyView'));
      if (S.view === 'tips' && $('tipsView')) renderTipsView($('tipsView'));
      if (S.view === 'dashboard' && $('dashboardView')) renderDashboardView($('dashboardView'));
      if (S.view === 'profile' && $('profilePageView')) renderProfilePageView($('profilePageView'));
      if (S.view === 'settings' && $('settingsView')) {
        renderSettingsView($('settingsView'));
        appendHoursAndSuperRolesSettings($('settingsView'));
      }
    }
  }

  function init() {
    ensureStaffHealthAndPerms();

    const prevRender = FOH.app.render;
    FOH.app.render = function () {
      prevRender();
      syncSuperEmployeeUI();
    };

    if ($('sidebarToggleBtn')) $('sidebarToggleBtn').addEventListener('click', openSidebar);
    if ($('sbCloseBtn')) $('sbCloseBtn').addEventListener('click', closeSidebar);
    if ($('sidebarBackdrop')) $('sidebarBackdrop').addEventListener('click', closeSidebar);

    if ($('sbThemeToggle')) {
      $('sbThemeToggle').addEventListener('click', () => {
        if (FOH.erpPwa && FOH.erpPwa.setTheme) {
          FOH.erpPwa.setTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
        }
      });
    }
    if ($('sbLogoutBtn')) {
      $('sbLogoutBtn').addEventListener('click', () => {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        closeSidebar();
        location.reload();
      });
    }

    if ($('lockBtn')) {
      $('lockBtn').addEventListener('click', () => {
        const gov = loadGov();
        const sess = getSession();
        gov.checklistLocked = !gov.checklistLocked;
        gov.lockedBy = (sess && sess.displayName) || 'Supervisor';
        if (gov.checklistLocked) S.editing = false;
        saveGov(gov);
        FOH.edit.toast(gov.checklistLocked ? (isAr() ? 'تم قفل الشيك ليست 🔒' : 'Checklist locked 🔒') : (isAr() ? 'تم فتح قفل الشيك ليست 🔓' : 'Checklist unlocked 🔓'));
        FOH.app.render();
      });
    }

    ['sections', 'today', 'mine'].forEach((cid) => {
      const node = $(cid);
      if (!node) return;
      node.addEventListener(
        'click',
        (ev) => {
          const cb = ev.target.closest('input.ck[data-id]');
          if (!cb) return;
          const gov = loadGov();
          const sess = getSession();
          if (gov.checklistLocked && sess && !sess.isManager) {
            ev.preventDefault();
            ev.stopPropagation();
            FOH.edit.toast(isAr() ? '🔒 الشيك ليست مقفلة حاليًا من قِبل المدير' : '🔒 Checklist is currently locked by Manager');
          }
        },
        true
      );
    });

    setInterval(checkExpiredSnoozeTimers, 2000);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (ev) => {
        if (ev.data && ev.data.type === 'SNOOZE_WOKE_UP') {
          checkExpiredSnoozeTimers();
          FOH.app.render();
        }
      });
    }
    // Keep #metaPanel collapsed by default so it doesn't clutter the opening screen
    if ($('metaPanel')) $('metaPanel').hidden = true;
    syncSuperEmployeeUI();
  }

  FOH.superEmployee = { init, openSidebar, closeSidebar, switchView, syncSuperEmployeeUI };
  document.addEventListener('DOMContentLoaded', init);
})(window.FOH = window.FOH || {});
