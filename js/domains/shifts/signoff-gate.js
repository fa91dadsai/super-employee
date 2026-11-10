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

  function authenticate(c, p, r) {
    return FOH.sessionAuth ? FOH.sessionAuth.authenticate(c, p, r) : null;
  }

  function saveClosingRun(d, r) {
    if (FOH.sheetState) FOH.sheetState.saveClosingRun(d, r);
  }

  function renderSignedCard(opts) {
    const { signKey, record, signoffs, sheetType, session, left, row } = opts;
    const info = el('div', 'signoff-info');
    info.append(el('h3', '', '🛡 ' + t(sheetType === 'closing' ? 'signoffClosingTitle' : 'signoffReadyTitle')));
    info.append(el('p', '', t('signoffSignedBy', { by: record.by, at: record.at })));
    if (record.reason) {
      info.append(el('p', '', '⚠ ' + t('signoffOverrideNote', { reason: record.reason })));
    }
    row.append(info);

    if (session && session.isManager) {
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
  }

  function renderUnsignedCard(opts) {
    const { signKey, signoffs, sheetType, session, left, row } = opts;
    const info = el('div', 'signoff-info');
    info.append(el('h3', '', '🛡 ' + t(sheetType === 'closing' ? 'signoffClosingTitle' : 'signoffReadyTitle')));
    info.append(el('p', '', t('signoffReadySub')));
    row.append(info);

    if (session && session.isManager) {
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
    const opts = { signKey, record, signoffs, sheetType, session, left, row };
    if (record) {
      renderSignedCard(opts);
    } else {
      renderUnsignedCard(opts);
    }
    box.append(row);
  }

  function hookAppRender() {
    const origRender = FOH.app.render;
    FOH.app.render = function () {
      origRender();
      applyAuthUI();
      renderSheetSwitcher();
      injectSectionClaims();
      renderSignoffCard();
      updateOrderBadge();
      if (!S.editing && S.view === 'dayoff' && $('dayoffView')) {
        $('dayoffView').replaceChildren();
        const sec = buildDayOffSection(false);
        if (sec) $('dayoffView').append(sec);
      }
      if (!S.editing && S.view === 'orders' && $('ordersView')) {
        renderOrdersView($('ordersView'));
      }
    };
  }

  function wireChecklistCloudSync(sess) {
    if (FOH.cloudSyncListeners && FOH.cloudSyncListeners.wireChecklistCloudSync) {
      FOH.cloudSyncListeners.wireChecklistCloudSync(sess);
    }
  }

  function wireInventoryCloudSync(sess) {
    if (FOH.cloudSyncListeners && FOH.cloudSyncListeners.wireInventoryCloudSync) {
      FOH.cloudSyncListeners.wireInventoryCloudSync(sess);
    }
  }

  function wireAuthAndProfileUI(sess) {
    if (FOH.cloudSyncListeners && FOH.cloudSyncListeners.wireAuthAndProfileUI) {
      FOH.cloudSyncListeners.wireAuthAndProfileUI(sess);
    }
  }

  function init() {
    const session = getSession();
    setTheme(loadTheme());

    hookAppRender();
    wireChecklistCloudSync(session);
    wireInventoryCloudSync(session);
    wireAuthAndProfileUI(session);

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
