// foh-opening/js/domains/shifts/section-claims.js
// Section Claim System & Supervisor Sign-off Gate
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const CLAIMS_KEY = 'foh-opening.claims.v1';
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

  function apiCall(u, m, d) {
    return FOH.cloudSync ? FOH.cloudSync.apiCall(u, m, d) : Promise.resolve(null);
  }

  function loadClaims() {
    try {
      return FOH.safeJsonParse(localStorage.getItem(CLAIMS_KEY), '{}');
    } catch {
      return {};
    }
  }
  function saveClaims(map) {
    try {
      localStorage.setItem(CLAIMS_KEY, JSON.stringify(map));
    } catch {}
  }

  function injectSectionClaims() {
    const sheetType = getSheetType();
    const session = getSession();
    if (S.editing || S.view !== 'opening') return;
    const claims = loadClaims();
    const runKey = S.date + '|' + sheetType;
    const dayClaims = claims[runKey] || {};
    const myName = (session && session.displayName) || S.me.name || 'Staff';

    document.querySelectorAll('#sections > section.card').forEach((card) => {
      const sid = (card.id || '').replace(/^sec-/, '');
      const head = card.querySelector('.head');
      if (!sid || !head || head.querySelector('.sec-claim-btn')) return;

      const cur = dayClaims[sid];
      const isMine = cur && cur.by === myName;
      const b = el(
        'button',
        'sec-claim-btn' + (cur ? ' claimed' : '') + (isMine ? ' mine' : ''),
        !cur ? t('claimSectionBtn') : isMine ? t('claimedByMe', { name: cur.by }) : t('claimedByOther', { name: cur.by })
      );
      b.type = 'button';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextClaim = !(cur && isMine);
        if (cur && isMine && !confirm(t('unclaimConfirm'))) return;
        if (!claims[runKey]) claims[runKey] = {};
        if (nextClaim) {
          claims[runKey][sid] = { by: myName, at: FOH.time.nowHM() };
        } else {
          delete claims[runKey][sid];
        }
        saveClaims(claims);
        apiCall('POST', '/v1/foh-opening/runs/claim-section', {
          business_date: S.date,
          sheet_type: sheetType,
          section_id: sid,
          claim: nextClaim,
          by_name: myName,
        });
        FOH.app.render();
      });

      const metaRow = head.querySelector('.head-meta-row');
      if (metaRow) {
        metaRow.append(b);
      } else {
        const ct = head.querySelector('.ct');
        if (ct) head.insertBefore(b, ct);
        else head.append(b);
      }
    });
  }

  // ---- Supervisor Sign-off Card on Opening / Closing View ----
  function loadSignoffs() {
    try {
      return FOH.safeJsonParse(localStorage.getItem(SIGNOFF_KEY), '{}');
    } catch {
      return {};
    }
  }
  function saveSignoffs(map) {
    try {
      localStorage.setItem(SIGNOFF_KEY, JSON.stringify(map));
    } catch {}
  }



  FOH.sectionClaims = {
    loadClaims,
    saveClaims,
    injectSectionClaims,
    loadSignoffs,
    saveSignoffs,
  };
})(window.FOH = window.FOH || {});
