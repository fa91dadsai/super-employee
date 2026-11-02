// foh-opening/js/domains/shifts/signoff-gate.js
// Supervisor Sign-off Card and Initialization Orchestration
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const SIGNOFF_KEY = 'foh-opening.signoffs.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function getSheetType() {
    return FOH.sheetState ? FOH.sheetState.getSheetType() : 'opening';
  }

  function loadSignoffs() {
    return FOH.sectionClaims ? FOH.sectionClaims.loadSignoffs() : {};
  }

  function saveSignoffs(s) {
    if (FOH.sectionClaims) FOH.sectionClaims.saveSignoffs(s);
  }

  function openProfile() {
    if (FOH.profileDialog) FOH.profileDialog.openProfile();
  }

  function loadTheme() {
    return FOH.sessionAuth ? FOH.sessionAuth.loadTheme() : 'light';
  }

  function setTheme(m) {
    if (FOH.sessionAuth) FOH.sessionAuth.setTheme(m);
  }

  function applyAuthUI() {
    if (FOH.sessionAuth) FOH.sessionAuth.applyAuthUI();
  }

  function renderSheetSwitcher() {
    if (FOH.sheetState) FOH.sheetState.renderSheetSwitcher();
  }

  function injectSectionClaims() {
    if (FOH.sectionClaims) FOH.sectionClaims.injectSectionClaims();
  }

  function updateOrderBadge() {
    if (FOH.ordersView) FOH.ordersView.updateOrderBadge();
  }

  function syncFromCloud() {
    if (FOH.cloudSync) FOH.cloudSync.syncFromCloud();
  }

  function apiCall(u, m, d) {
    return FOH.cloudSync ? FOH.cloudSync.apiCall(u, m, d) : Promise.resolve(null);
  }

  function loadBatches() {
    return FOH.batchTally ? FOH.batchTally.loadBatches() : [];
  }

  function injectBatchCounter(el) {
    if (FOH.batchTally) FOH.batchTally.injectBatchCounter(el);
  }

  function buildDayOffSection(inDialog) {
    return FOH.dayOff ? FOH.dayOff.buildDayOffSection(inDialog) : null;
  }

  function renderOrdersView(el) {
    if (FOH.ordersView) FOH.ordersView.renderOrdersView(el);
  }

  function renderLoginScreen() {
    if (FOH.sessionAuth) FOH.sessionAuth.renderLoginScreen();
  }

  function authenticate(c, p) {
    return FOH.sessionAuth ? FOH.sessionAuth.authenticate(c, p) : null;
  }

  function saveClosingRun(r) {
    if (FOH.sheetState) FOH.sheetState.saveClosingRun(r);
  }


  function renderSignoffCard() {
    const sheetType = getSheetType();
    const session = getSession();
    const box = $('signoffBox');
    if (!box) return;
    if (S.editing || S.view !== 'opening') {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    box.replaceChildren();

    const signoffs = loadSignoffs();
    const signKey = sheetType === 'closing' ? S.date + '|closing' : S.date;
    const record = signoffs[signKey];
    const all = FOH.model.progress(FOH.model.allLeaves({ sections: FOH.preview.sections() }), S.run.checked);
    const left = all.total - all.done;

    box.classList.toggle('signed', !!record);
    const row = el('div', 'signoff-row');
    const info = el('div', 'signoff-info');
    info.append(el('h3', '', '🛡 ' + t(sheetType === 'closing' ? 'signoffClosingTitle' : 'signoffReadyTitle')));

    if (record) {
      info.append(el('p', '', t('signoffSignedBy', { by: record.by, at: record.at })));
      if (record.reason) {
        info.append(el('p', '', '⚠ ' + t('signoffOverrideNote', { reason: record.reason })));
      }
      row.append(info);
      if (!session || session.isManager) {
        const unlock = el('button', 'btn', t('signoffReopenBtn'));
        unlock.type = 'button';
        unlock.addEventListener('click', () => {
          delete signoffs[signKey];
          saveSignoffs(signoffs);
          apiCall('POST', '/v1/foh-opening/runs/signoff', {
            business_date: S.date,
            sheet_type: sheetType,
            signed_off: false,
            by_name: (session && session.displayName) || 'Supervisor',
            incomplete_count: left,
          });
          renderSignoffCard();
        });
        row.append(unlock);
      }
    } else {
      info.append(el('p', '', t('signoffReadySub')));
      row.append(info);
      if (!session || session.isManager) {
        const signBtn = el('button', 'btn primary', t(sheetType === 'closing' ? 'signoffClosingBtn' : 'signoffBtn'));
        signBtn.type = 'button';
        signBtn.addEventListener('click', () => {
          let reason = '';
          if (left > 0) {
            const input = prompt(t('signoffReasonPrompt', { left }));
            if (input === null) return;
            reason = input.trim();
            if (!reason) return alert(t('signoffNeedReason'));
          }
          signoffs[signKey] = {
            by: (session && session.displayName) || S.run.supervisor || 'Supervisor',
            at: FOH.time.nowHM(),
            reason,
          };
          saveSignoffs(signoffs);
          apiCall('POST', '/v1/foh-opening/runs/signoff', {
            business_date: S.date,
            sheet_type: sheetType,
            signed_off: true,
            by_name: signoffs[signKey].by,
            incomplete_count: left,
            override_reason: reason || null,
          });
          renderSignoffCard();
        });
        row.append(signBtn);
      }
    }
    box.append(row);
  }

  function init() {
    const session = getSession();
    setTheme(loadTheme());

    // Hook into FOH.app.render so Sign-off card, Sheet Switcher, Section Claims, Orders badge, Day-off card, and Auth header stay in sync
    const origRender = FOH.app.render;
    FOH.app.render = function () {
      origRender();
      applyAuthUI();
      renderSheetSwitcher();
      injectSectionClaims();
      renderSignoffCard();
      updateOrderBadge();
      if (!S.editing && S.view === 'mine' && $('mine') && !$('mine').querySelector('.dayoff-form')) {
        const sec = buildDayOffSection(false);
        if (sec) $('mine').append(sec);
      }
      if (!S.editing && S.view === 'orders' && $('ordersView')) {
        renderOrdersView($('ordersView'));
      }
    };

    // Cloud Sync Hook 1: Checklist Ticks & Scheduled Task Toggles
    ['sections', 'today', 'mine', 'sched'].forEach((cid) => {
      const node = $(cid);
      if (!node) return;
      node.addEventListener('change', (ev) => {
        const cb = ev.target;
        if (cb.type !== 'checkbox') return;
        const myName = (session && session.displayName) || S.me.name || 'Staff';
        const sheetType = getSheetType();
        if (cb.dataset.id) {
          if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
            FOH.cloudRealtime.broadcast('TASK_TICKED', {
              itemId: cb.dataset.id,
              checked: !!cb.checked,
              byName: myName,
              sheetType: sheetType,
              at: FOH.time.nowHM(),
            });
          }
          if (sheetType === 'closing') saveClosingRun(S.date, S.run);
          apiCall('POST', '/v1/foh-opening/runs/tick', {
            business_date: S.date,
            sheet_type: sheetType,
            item_ids: [cb.dataset.id],
            checked: !!cb.checked,
            at: FOH.time.nowHM(),
            by_name: myName,
            supervisor: S.run.supervisor || undefined,
            captain: S.run.captain || undefined,
            assistant: S.run.assistant || undefined,
          });
        } else if (cb.dataset.task) {
          apiCall('POST', '/v1/foh-opening/task-logs/toggle', {
            task_id: cb.dataset.task,
            occ_date: S.date,
            done: !!cb.checked,
            done_date: S.date,
            at_time: FOH.time.nowHM(),
            by_name: myName,
            staff_id: S.me.staffId || undefined,
          });
        }
      });
    });

    // Cloud Sync Hook 2: Check-All on Parent Items
    $('sections').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-act="checkall"]');
      if (!b || !b.dataset.id) return;
      const at = FOH.model.locate({ sections: FOH.preview.sections() }, b.dataset.id);
      if (!at || !at.item.children) return;
      if (sheetType === 'closing') saveClosingRun(S.date, S.run);
      apiCall('POST', '/v1/foh-opening/runs/tick', {
        business_date: S.date,
        sheet_type: sheetType,
        item_ids: at.item.children.map((c) => c.id),
        checked: true,
        at: FOH.time.nowHM(),
        by_name: (session && session.displayName) || S.me.name || 'Staff',
      });
    });

    // Cloud Sync Hook 3: Breakage Report Creation
    $('breakSheet').addEventListener('close', () => {
      if ($('breakSheet').returnValue !== 'save') return;
      const last = S.inv.breakage[S.inv.breakage.length - 1];
      if (!last) return;
      apiCall('POST', '/v1/foh-opening/inventory/breakage', {
        report_id: last.id,
        variant_id: last.variantId,
        condition: last.cond,
        qty: last.qty,
        note: last.note || '',
        photo_url: null,
        by_name: last.by || (session && session.displayName) || 'Staff',
        count_week_key: last.countKey || null,
        count_category_id: last.countCat || null,
      });
    });

    // Cloud Sync Hook 4: Blind Count Submission
    $('countSheet').addEventListener('close', () => {
      const weekKey = FOH.invStore.countDate(S.inv, S.tpl, S.date);
      const w = S.inv.weeks[weekKey];
      if (!w) return;
      ['counts', 'recounts'].forEach((bucket) => {
        Object.entries(w[bucket] || {}).forEach(([catId, entry]) => {
          if (entry && entry.submittedAt && !entry._cloudSynced) {
            entry._cloudSynced = true;
            apiCall('POST', '/v1/foh-opening/inventory/blind-count', {
              week_key: weekKey,
              category_id: catId,
              mode: bucket === 'recounts' ? 'recount' : 'count',
              staff_id: entry.staffId || S.me.staffId || 'staff',
              by_name: entry.by || (session && session.displayName) || 'Staff',
              lines: entry.lines || {},
              batches: loadBatches(),
              damage_report_ids: entry.damageReportIds || [],
            });
          }
        });
      });
    });

    // Observe #countBody to inject Batch Tally Counter whenever a blind count item is drawn
    const countBody = $('countBody');
    if (countBody && window.MutationObserver) {
      const obs = new MutationObserver(() => injectBatchCounter());
      obs.observe(countBody, { childList: true });
    }

    // Login Form Events
    $('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      $('loginError').hidden = true;
      try {
        await authenticate($('loginUser').value, $('loginPass').value, $('loginRemember').checked);
        applyAuthUI();
        if (session && !session.isManager) S.view = 'mine';
        FOH.app.render();
        syncFromCloud();
      } catch (err) {
        $('loginError').textContent = err.message || t('loginInvalid');
        $('loginError').hidden = false;
      }
    });

    $('loginEyeBtn').addEventListener('click', () => {
      const p = $('loginPass');
      p.type = p.type === 'password' ? 'text' : 'password';
    });

    $('loginThemeBtn').addEventListener('click', () => {
      setTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
    });

    $('loginLangBtn').addEventListener('click', () => {
      FOH.i18n.setLang(FOH.i18n.lang === 'ar' ? 'en' : 'ar');
      renderLoginScreen();
      FOH.app.render();
    });

    // Profile Button Events
    $('profileBtn').addEventListener('click', openProfile);
    $('profCloseBtn').addEventListener('click', () => $('profileSheet').close());
    $('profileSheet').addEventListener('click', (e) => e.target === $('profileSheet') && $('profileSheet').close());

    applyAuthUI();
    renderSheetSwitcher();
    injectSectionClaims();
    renderSignoffCard();
    updateOrderBadge();
    if (session && session.accessToken) syncFromCloud();
  }

  


  FOH.signoffGate = {
    renderSignoffCard,
    init,
  };

  FOH.erpPwa = {
    init,
    openProfile: () => (FOH.profileDialog && FOH.profileDialog.openProfile()),
    setTheme: (m) => (FOH.sessionAuth && FOH.sessionAuth.setTheme(m)),
    switchSheetType: (t) => (FOH.sheetState && FOH.sheetState.switchSheetType(t)),
    getSheetType: () => (FOH.sheetState && FOH.sheetState.getSheetType()),
    persistCurrentSheetState: () => (FOH.sheetState && FOH.sheetState.persistCurrentSheetState()),
    loadMidSections: () => (FOH.sheetState && FOH.sheetState.loadMidSections()),
    saveMidSections: (s) => (FOH.sheetState && FOH.sheetState.saveMidSections(s)),
    loadClosingSections: () => (FOH.sheetState && FOH.sheetState.loadClosingSections()),
    getOpeningBackup: () => (FOH.sheetState && FOH.sheetState.getOpeningBackup()),
    setOpeningBackup: (b) => (FOH.sheetState && FOH.sheetState.setOpeningBackup(b)),
    renderOrdersView: (r) => (FOH.ordersView && FOH.ordersView.renderOrdersView(r)),
    buildDayOffSection: (c) => (FOH.dayOff && FOH.dayOff.buildDayOffSection(c)),
  };
})(window.FOH = window.FOH || {});
