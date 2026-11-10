// foh-opening/js/domains/cloud/cloud-sync.js
// Supabase Cloud Synchronizer & Operational Event Relay
(function (FOH) {
  'use strict';

  const SUPABASE_URL = 'https://jncnbwwhjmouxptqfjaz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_82pr7lscQZiCiyxUT_TTEA_J9IhKuz1';
  const S = FOH.state;

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function getSheetType() {
    return FOH.threeShifts ? FOH.threeShifts.getActiveSheetType() : 'opening';
  }

  function saveClaims(c) {
    if (FOH.sheetState) FOH.sheetState.saveClaims(c);
  }

  function loadClaims() {
    return FOH.sheetState ? FOH.sheetState.loadClaims() : {};
  }

  function saveDayOffList(list) {
    if (FOH.dayOff && FOH.dayOff.saveDayOffList) FOH.dayOff.saveDayOffList(list);
  }

  function saveClosingRun(d, r) {
    if (FOH.sheetState && FOH.sheetState.saveClosingRun) FOH.sheetState.saveClosingRun(d, r);
  }

  function saveMidRun(d, r) {
    if (FOH.sheetState && FOH.sheetState.saveMidRun) FOH.sheetState.saveMidRun(d, r);
  }

  // ---- Cloud API Client (/v1/foh-opening/*) ----
  async function apiCall(method, path, body, enqueueIfOffline = true) {
    const session = getSession();
    if (!session || !session.accessToken || !session.tenantId || !session.branchId) {
      if (method !== 'GET' && enqueueIfOffline && FOH.cloudOutbox && typeof FOH.cloudOutbox.enqueue === 'function') {
        FOH.cloudOutbox.enqueue({ method, path, body });
      }
      return null;
    }
    try {
      const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'x-tenant-id': session.tenantId,
        'x-branch-id': session.branchId,
      };
      if (method !== 'GET') {
        headers['Content-Type'] = 'application/json';
        headers['Idempotency-Key'] =
          (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
          'foh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/api${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        if (method !== 'GET' && enqueueIfOffline && res.status >= 500 && FOH.cloudOutbox) {
          FOH.cloudOutbox.enqueue({ method, path, body });
        }
        return null;
      }
      const json = await res.json();
      return json.data || json;
    } catch {
      if (method !== 'GET' && enqueueIfOffline && FOH.cloudOutbox && typeof FOH.cloudOutbox.enqueue === 'function') {
        FOH.cloudOutbox.enqueue({ method, path, body });
      }
      return null;
    }
  }

  async function syncFromCloud() {
    const sheetType = getSheetType();
    const boot = await apiCall('GET', `/v1/foh-opening/bootstrap?date=${encodeURIComponent(S.date)}&sheet_type=${encodeURIComponent(sheetType)}`);
    if (!boot) return;
    if (Array.isArray(boot.day_off_requests)) {
      saveDayOffList(
        boot.day_off_requests.map((r) => ({
          id: r.id,
          staffId: r.staff_id,
          staffName: r.staff_name,
          date: r.business_date,
          kind: r.request_kind,
          preferredDow: r.preferred_dow,
          reason: r.reason || '',
          status: r.status,
          syncedToSchedule: !!r.synced_to_schedule,
          reviewedBy: r.reviewed_by_name || '',
        }))
      );
    }
    if (!boot.run) {
      FOH.app.render();
      return;
    }
    if (boot.run.checked && typeof boot.run.checked === 'object') {
      Object.entries(boot.run.checked).forEach(([itemId, val]) => {
        S.run.checked[itemId] = typeof val === 'object' && val !== null ? val.at || FOH.time.nowHM() : String(val);
      });
      if (sheetType === 'closing') saveClosingRun(S.date, S.run); else if (sheetType === 'mid') saveMidRun(S.date, S.run);
      else FOH.store.saveRun(S.date, S.run);
    }
    const remoteClaims = boot.run.section_claims || boot.run.claimed_sections;
    if (remoteClaims && typeof remoteClaims === 'object') {
      const claims = loadClaims();
      const runKey = S.date + '|' + sheetType;
      claims[runKey] = claims[runKey] || {};
      Object.entries(remoteClaims).forEach(([sid, val]) => {
        const who = val && (val.user_name || val.by_name);
        const at = val && (val.claimed_at || val.at || '');
        if (who) claims[runKey][sid] = { by: who, at: at.slice(11, 16) };
      });
      saveClaims(claims);
    }
    FOH.app.render();
  }



  FOH.cloudSync = {
    apiCall,
    syncFromCloud,
  };
})(window.FOH = window.FOH || {});
