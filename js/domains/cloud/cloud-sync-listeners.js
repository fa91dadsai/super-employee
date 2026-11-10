// foh-opening/js/domains/cloud/cloud-sync-listeners.js
// DOM event listeners for checklist ticks, inventory counts, and login UI wiring (< 350 lines)

(function () {
  'use strict';

  window.FOH = window.FOH || {};

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n || { t: (k) => k };

  function getSheetType() {
    return (FOH.threeShifts && FOH.threeShifts.getActiveSheetType)
      ? FOH.threeShifts.getActiveSheetType()
      : ((FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive && FOH.opsLifecycle.isClosingSheetActive()) ? 'closing' : 'opening');
  }

  function saveClosingRun(d, r) {
    if (FOH.opsLifecycle && FOH.opsLifecycle.saveClosingRun) {
      FOH.opsLifecycle.saveClosingRun(d, r);
    }
  }

  function apiCall(u, m, d) {
    if (FOH.cloudSync && FOH.cloudSync.apiCall) {
      return FOH.cloudSync.apiCall(u, m, d);
    }
  }

  function loadBatches() {
    return FOH.batchTally && FOH.batchTally.loadBatches ? FOH.batchTally.loadBatches() : {};
  }

  function injectBatchCounter(el) {
    if (FOH.batchTally && FOH.batchTally.injectBatchCounter) {
      FOH.batchTally.injectBatchCounter(el);
    }
  }

  function authenticate(c, p, r) {
    return FOH.sessionAuth && FOH.sessionAuth.authenticate ? FOH.sessionAuth.authenticate(c, p, r) : Promise.reject(new Error('Auth not loaded'));
  }

  function applyAuthUI() {
    if (FOH.sessionAuth && FOH.sessionAuth.applyAuthUI) FOH.sessionAuth.applyAuthUI();
  }

  function syncFromCloud() {
    if (FOH.cloudSync && FOH.cloudSync.syncFromCloud) FOH.cloudSync.syncFromCloud();
  }

  function setTheme(m) {
    if (FOH.sessionAuth && FOH.sessionAuth.setTheme) FOH.sessionAuth.setTheme(m);
  }

  function renderLoginScreen() {
    if (FOH.sessionAuth && FOH.sessionAuth.renderLoginScreen) FOH.sessionAuth.renderLoginScreen();
  }

  function openProfile() {
    if (FOH.profileDialog && FOH.profileDialog.openProfile) FOH.profileDialog.openProfile();
  }

  function wireChecklistCloudSync(session) {
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
              sheetType,
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

    if ($('sections')) {
      $('sections').addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-act="checkall"]');
        if (!b || !b.dataset.id) return;
        const at = FOH.model.locate({ sections: FOH.preview.sections() }, b.dataset.id);
        if (!at || !at.item.children) return;
        const sheetType = getSheetType();
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
    }
  }

  function wireInventoryCloudSync(session) {
    if ($('breakSheet')) {
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
        if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
          FOH.cloudRealtime.broadcast('BREAKAGE_REPORTED', {
            reportId: last.id,
            byName: last.by || (session && session.displayName) || 'Staff',
            qty: last.qty,
            cond: last.cond,
          });
        }
      });
    }

    if ($('countSheet')) {
      $('countSheet').addEventListener('close', () => {
        if (!S.inv || !S.inv.weeks) return;
        Object.entries(S.inv.weeks).forEach(([weekKey, w]) => {
          if (!w) return;
          ['counts', 'recounts'].forEach((bucket) => {
            Object.entries(w[bucket] || {}).forEach(([catId, entry]) => {
              if (entry && entry.submittedAt && !entry._cloudSynced) {
                entry._cloudSynced = true;
                if (FOH.invStore && FOH.invStore.save) FOH.invStore.save(S.inv);
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
                if (FOH.cloudRealtime && FOH.cloudRealtime.broadcast) {
                  FOH.cloudRealtime.broadcast('INVENTORY_COUNT_SUBMITTED', {
                    weekKey,
                    catId,
                    mode: bucket === 'recounts' ? 'recount' : 'count',
                    byName: entry.by || (session && session.displayName) || 'Staff',
                  });
                }
              }
            });
          });
        });
      });
    }

    const countBody = $('countBody');
    if (countBody && window.MutationObserver) {
      const obs = new MutationObserver(() => injectBatchCounter());
      obs.observe(countBody, { childList: true });
    }
  }

  function wireAuthAndProfileUI(session) {
    if ($('loginForm')) {
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
    }

    if ($('loginEyeBtn')) {
      $('loginEyeBtn').addEventListener('click', () => {
        const p = $('loginPass');
        p.type = p.type === 'password' ? 'text' : 'password';
      });
    }

    if ($('loginThemeBtn')) {
      $('loginThemeBtn').addEventListener('click', () => {
        setTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
      });
    }

    if ($('loginLangBtn')) {
      $('loginLangBtn').addEventListener('click', () => {
        FOH.i18n.setLang(FOH.i18n.lang === 'ar' ? 'en' : 'ar');
        renderLoginScreen();
        FOH.app.render();
      });
    }

    if ($('profileBtn')) $('profileBtn').addEventListener('click', openProfile);
    if ($('profCloseBtn')) $('profCloseBtn').addEventListener('click', () => $('profileSheet').close());
    if ($('profileSheet')) {
      $('profileSheet').addEventListener('click', (e) => e.target === $('profileSheet') && $('profileSheet').close());
    }
  }

  FOH.cloudSyncListeners = {
    wireChecklistCloudSync,
    wireInventoryCloudSync,
    wireAuthAndProfileUI,
  };
})();

