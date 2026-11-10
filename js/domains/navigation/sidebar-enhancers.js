// foh-opening/js/domains/navigation/sidebar-enhancers.js
// Sidebar branding, language toggles, damage injection, and checklist role-scoping (< 350 lines)

(function () {
  'use strict';

  window.FOH = window.FOH || {};

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { el } = FOH.view || { el: (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; } };

  function isAr() {
    return FOH.i18n && FOH.i18n.lang === 'ar';
  }

  function getAppRoleIdentity() {
    return FOH.roleIdentity && FOH.roleIdentity.getAppRoleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {};
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity && FOH.roleIdentity.getCurrentSuperRoleKey ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function isClosingSheetActive() {
    return FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive ? FOH.opsLifecycle.isClosingSheetActive() : false;
  }

  function closeSidebar() {
    if (FOH.sidebarNav && FOH.sidebarNav.closeSidebar) {
      FOH.sidebarNav.closeSidebar();
    }
  }

  function enhanceChecklistContextAndRoleScope(roleScopeOnly) {
    if (!S || S.editing || S.view !== 'opening') return;

    const ident = getAppRoleIdentity();
    const rKey = getCurrentSuperRoleKey();

    if (!isClosingSheetActive() && ident.openingKeywords && roleScopeOnly) {
      const kwList = ident.openingKeywords;
      document.querySelectorAll('#sections > section.card').forEach((card) => {
        const sid = (card.id || '').replace(/^sec-/, '');
        const secObj = (S.tpl.sections || []).find((x) => x.id === sid);
        const titleCombo = ((secObj && (secObj.title + ' ' + secObj.titleAr)) || card.textContent || '').toLowerCase();
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

  function enhanceSidebarBrandAndLang(ar, ident) {
    const sbBrandStrong = document.querySelector('#appSidebar .sb-brand-txt strong');
    if (sbBrandStrong) {
      sbBrandStrong.textContent = ar ? ident.titleAr : ident.titleEn;
    }
    const themeBtn = $('sbThemeToggle');
    if (themeBtn) {
      const isDark = document.body.classList.contains('dark');
      themeBtn.textContent = isDark
        ? (ar ? '☀️ نهاري' : '☀️ Light')
        : (ar ? '🌙 ليلي' : '🌙 Dark');
    }
    const logoutBtn = $('sbLogoutBtn');
    if (logoutBtn) {
      logoutBtn.setAttribute('title', ar ? 'تسجيل الخروج' : 'Log out');
      logoutBtn.setAttribute('aria-label', ar ? 'تسجيل الخروج' : 'Log out');
    }
    const sbFoot = document.querySelector('#appSidebar .sb-foot');
    if (sbFoot && !$('sbLangToggle')) {
      const langBtn = el('button', 'btn sb-foot-btn', ar ? '🌐 EN' : '🌐 عربي');
      langBtn.type = 'button';
      langBtn.id = 'sbLangToggle';
      langBtn.addEventListener('click', () => {
        if ($('langBtn')) $('langBtn').click();
        langBtn.textContent = isAr() ? '🌐 EN' : '🌐 عربي';
        if (FOH.sidebarNav && FOH.sidebarNav.renderSidebarContent) FOH.sidebarNav.renderSidebarContent();
      });
      sbFoot.insertBefore(langBtn, $('sbLogoutBtn'));
    } else if ($('sbLangToggle')) {
      $('sbLangToggle').textContent = ar ? '🌐 EN' : '🌐 عربي';
    }
  }

  function injectSidebarDamageButton(nav, ar) {
    if (!nav || nav.dataset.v10Scoped) return;
    nav.dataset.v10Scoped = '1';
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

  function injectInventoryDamageCard(ar) {
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

  function enhanceSidebarAndInventory() {
    const ar = isAr();
    const ident = getAppRoleIdentity();
    enhanceSidebarBrandAndLang(ar, ident);
    injectSidebarDamageButton($('sbNavList'), ar);
    injectInventoryDamageCard(ar);
  }

  FOH.sidebarEnhancers = {
    enhanceChecklistContextAndRoleScope,
    enhanceSidebarAndInventory,
  };
})();

