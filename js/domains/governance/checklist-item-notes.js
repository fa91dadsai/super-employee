// foh-opening/js/domains/governance/checklist-item-notes.js
// Operational field notes attached to checklist items (< 350 lines)

(function () {
  'use strict';

  window.FOH = window.FOH || {};

  const ITEM_NOTES_KEY = 'foh-opening.itemNotes.v1';
  const { el } = FOH.view || { el: (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; } };

  function isAr() {
    return FOH.i18n && FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth && FOH.sessionAuth.loadSession ? FOH.sessionAuth.loadSession() : null;
  }

  function loadItemNotes() {
    return FOH.safeJsonParse ? FOH.safeJsonParse(localStorage.getItem(ITEM_NOTES_KEY), '{}') : {};
  }

  function saveItemNotes(map) {
    try {
      localStorage.setItem(ITEM_NOTES_KEY, JSON.stringify(map || {}));
    } catch { /* Quota fallback */ }
  }

  function attachItemNoteChip(tx, opts = {}) {
    const { noteKey, existing, notesMap, ar, sess } = opts;
    let metaRow = tx.querySelector('.item-meta-row');
    if (!metaRow) {
      metaRow = el('div', 'item-meta-row');
      tx.append(metaRow);
    }
    let chip = metaRow.querySelector('.item-note-chip');
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
            by: (sess && sess.displayName) || (FOH.state && FOH.state.me && FOH.state.me.name) || 'Staff',
            at: FOH.time ? FOH.time.nowHM() : '00:00',
          };
        }
        saveItemNotes(notesMap);
        FOH.app.render();
      });
      metaRow.append(chip);
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
  }

  function injectChecklistItemNotes() {
    const S = FOH.state;
    if (!S || S.editing || S.view !== 'opening') return;
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
      attachItemNoteChip(tx, { noteKey, existing, notesMap, ar, sess });
    });
  }

  FOH.checklistItemNotes = {
    loadItemNotes,
    saveItemNotes,
    attachItemNoteChip,
    injectChecklistItemNotes,
  };
})();

