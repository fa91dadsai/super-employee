// foh-opening/js/domains/checklist/checklist-search.js
// Ultra-fast Arabic/English fuzzy instant search for checklist items
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const getState = () => FOH.state || {};
  const { el } = FOH.view;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  /**
   * Normalizes Arabic text for tolerant fuzzy matching
   * Strips Tashkeel, normalizes Alef variants, Ta Marbuta, and Yaa.
   */
  function normalizeArabic(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '') // remove diacritics
      .replace(/[إأآاٱ]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[يى]/g, 'ي')
      .replace(/[ؤئ]/g, 'ء')
      .trim();
  }

  let searchQuery = '';

  function applySearchFilter(query) {
    searchQuery = (query || '').trim();
    const cleanQ = normalizeArabic(searchQuery);

    const sectionsEl = $('sections');
    if (!sectionsEl) return;

    const cards = sectionsEl.querySelectorAll('section.card');
    if (!cleanQ) {
      // Clear search: restore normal item display
      cards.forEach((card) => {
        card.querySelectorAll('li.item, li.kid').forEach((li) => {
          li.style.display = '';
        });
      });
      // Let normal scoping handle card visibility
      if (FOH.taskAssignment && FOH.taskAssignment.renderAssignedTaskBadgesAndFilter) {
        FOH.taskAssignment.renderAssignedTaskBadgesAndFilter();
      }
      return;
    }

    // Filter active items
    cards.forEach((card) => {
      let matchedInCard = 0;
      card.querySelectorAll('li.item, li.kid').forEach((li) => {
        const text = li.textContent || '';
        const normText = normalizeArabic(text);
        if (normText.includes(cleanQ)) {
          li.style.display = '';
          matchedInCard++;
        } else {
          li.style.display = 'none';
        }
      });

      // Show card only if it has matches
      if (matchedInCard > 0) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  function renderChecklistSearchBar() {
    const mainEl = $('appMain');
    const sectionsEl = $('sections');
    if (!mainEl || !sectionsEl) return;

    const S = getState();
    if (S.editing || S.view !== 'opening') {
      const existing = $('checklistSearchBar');
      if (existing) existing.hidden = true;
      return;
    }

    let bar = $('checklistSearchBar');
    if (!bar) {
      bar = el('div', 'checklist-search-bar run-only');
      bar.id = 'checklistSearchBar';
      sectionsEl.parentNode.insertBefore(bar, sectionsEl);
    }
    bar.hidden = false;
    bar.replaceChildren();

    const ar = isAr();
    const icon = el('span', 'chk-search-icon', '🔍');
    const input = el('input', 'chk-search-input');
    input.type = 'search';
    input.id = 'checklistSearchInput';
    input.value = searchQuery;
    input.placeholder = ar ? 'بحث سريع في مهام الشيك ليست (مثال: تنظيف، بار، فحص)...' : 'Quick search checklist items (e.g. clean, bar, check)...';
    input.autocomplete = 'off';

    const clearBtn = el('button', 'chk-search-clear', '×');
    clearBtn.type = 'button';
    clearBtn.title = ar ? 'مسح البحث' : 'Clear search';
    clearBtn.hidden = !searchQuery;

    input.addEventListener('input', (e) => {
      const val = e.target.value;
      clearBtn.hidden = !val;
      applySearchFilter(val);
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.hidden = true;
      applySearchFilter('');
      input.focus();
    });

    bar.append(icon, input, clearBtn);
  }

  FOH.checklistSearch = {
    render: renderChecklistSearchBar,
    applyFilter: applySearchFilter,
    normalizeArabic,
  };
})(window.FOH = window.FOH || {});
