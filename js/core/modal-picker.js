// foh-opening/js/core/modal-picker.js
// Custom Modal Picker Bottom Sheet Window replacing native desktop dropdowns
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function isAr() {
    return FOH.i18n && FOH.i18n.lang === 'ar';
  }

  function ensurePickerModal() {
    let dlg = $('customModalPickerDlg');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'customModalPickerDlg';
      dlg.className = 'sheet modal-picker-sheet';
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg) close();
      });
      document.body.append(dlg);
    }
    return dlg;
  }

  function close() {
    const dlg = $('customModalPickerDlg');
    if (dlg && dlg.open) {
      dlg.close();
    }
  }

  /**
   * Opens an interactive bottom sheet modal window with rich option cards
   */
  function open({ title, subtitle, icon, items = [], current = '', onSelect }) {
    const ar = isAr();
    const dlg = ensurePickerModal();
    dlg.replaceChildren();

    const box = el('div', 'modal-picker-box');

    // 1. Grab Bar
    const grab = el('div', 'grab');

    // 2. Header
    const headRow = el('div', 'modal-picker-head');
    const titleBox = el('div', 'modal-picker-title-box');
    const h3 = el('h3', 'modal-picker-title');
    h3.innerHTML = (icon ? `<span class="picker-head-icon">${icon}</span> ` : '') + (title || (ar ? 'اختر من القائمة' : 'Select an Option'));
    titleBox.append(h3);
    if (subtitle) {
      const sub = el('p', 'modal-picker-sub', subtitle);
      titleBox.append(sub);
    }

    const closeBtn = el('button', 'modal-picker-close', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', ar ? 'إغلاق' : 'Close');
    closeBtn.addEventListener('click', () => close());

    headRow.append(titleBox, closeBtn);
    box.append(grab, headRow);

    // 3. Normalize items
    const normalizedItems = items.map((it) => {
      if (Array.isArray(it)) {
        return { value: String(it[0]), label: String(it[1]), subtitle: '', icon: '' };
      }
      let label = String(it.label || '');
      let icon = String(it.icon || '');
      if (icon && label.startsWith(icon)) {
        label = label.slice(icon.length).trim();
      } else if (!icon) {
        const emojiMatch = label.match(/^(\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*|\p{Emoji_Presentation})\s*/u);
        if (emojiMatch) {
          icon = emojiMatch[1];
          label = label.slice(emojiMatch[0].length).trim();
        }
      }
      return { ...it, value: String(it.value), label, icon };
    });

    const listContainer = el('div', 'modal-picker-list');

    function renderList(listToRender) {
      listContainer.replaceChildren();
      if (!listToRender.length) {
        const empty = el('div', 'modal-picker-empty', ar ? 'لا توجد خيارات مطابقة' : 'No matching options');
        listContainer.append(empty);
        return;
      }

      listToRender.forEach((it) => {
        const isSelected = String(it.value) === String(current);
        const card = el('button', 'modal-picker-item' + (isSelected ? ' selected' : ''));
        card.type = 'button';

        const itemContent = el('div', 'modal-picker-item-content');
        if (it.icon) {
          const iconSpan = el('span', 'modal-picker-item-icon', it.icon);
          itemContent.append(iconSpan);
        }
        const textWrapper = el('div', 'modal-picker-item-texts');
        const mainLabel = el('div', 'modal-picker-item-label', it.label);
        textWrapper.append(mainLabel);
        if (it.subtitle) {
          const subLabel = el('div', 'modal-picker-item-sub', it.subtitle);
          textWrapper.append(subLabel);
        }
        itemContent.append(textWrapper);

        const trailing = el('div', 'modal-picker-item-trailing');
        if (it.badge) {
          const b = el('span', 'dayoff-badge ' + (it.badgeClass || 'approved'), it.badge);
          trailing.append(b);
        }
        if (isSelected) {
          const check = el('span', 'modal-picker-check', '✓');
          trailing.append(check);
        }

        card.append(itemContent, trailing);

        card.addEventListener('click', () => {
          if (navigator.vibrate) {
            try { navigator.vibrate(10); } catch (e) {}
          }
          close();
          if (onSelect) onSelect(it.value, it);
        });

        listContainer.append(card);
      });
    }

    // Search bar if list is long
    if (normalizedItems.length > 7) {
      const searchBox = el('div', 'modal-picker-search-box');
      const searchIn = el('input', 'in modal-picker-search-input');
      searchIn.type = 'search';
      searchIn.placeholder = ar ? '🔍 ابحث في الخيارات...' : '🔍 Search options...';
      searchIn.addEventListener('input', () => {
        const q = searchIn.value.trim().toLowerCase();
        if (!q) {
          renderList(normalizedItems);
        } else {
          const filtered = normalizedItems.filter((it) =>
            (it.label || '').toLowerCase().includes(q) || (it.subtitle || '').toLowerCase().includes(q)
          );
          renderList(filtered);
        }
      });
      searchBox.append(searchIn);
      box.append(searchBox);
    }

    renderList(normalizedItems);
    box.append(listContainer);

    // Cancel Button
    const bottomRow = el('div', 'modal-picker-bottom');
    const cancelBtn = el('button', 'btn modal-picker-cancel', ar ? 'إلغاء' : 'Cancel');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', () => close());
    bottomRow.append(cancelBtn);
    box.append(bottomRow);

    dlg.append(box);
    dlg.showModal();
  }

  /**
   * Enhances any standard <select> element so clicking it opens the Modal Window Picker!
   */
  function enhanceSelect(selectEl, customConfig = {}) {
    if (!selectEl) return null;
    if (selectEl.dataset.modalPickerEnhanced) {
      const oldTrigger = selectEl.nextElementSibling;
      if (oldTrigger && oldTrigger.classList.contains('modal-picker-trigger')) {
        return oldTrigger;
      }
    }
    selectEl.dataset.modalPickerEnhanced = '1';
    selectEl.style.display = 'none';

    const trigger = el('button', 'in modal-picker-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'dialog');

    const updateTriggerText = () => {
      const selOpt = selectEl.options[selectEl.selectedIndex];
      const text = selOpt ? selOpt.textContent : (customConfig.placeholder || 'Select...');
      trigger.replaceChildren();

      const valWrapper = el('span', 'picker-trigger-val');
      valWrapper.textContent = text;

      const arrow = el('span', 'picker-trigger-arrow', '▾');
      trigger.append(valWrapper, arrow);
    };

    updateTriggerText();

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const items = Array.from(selectEl.options).map((opt) => ({
        value: opt.value,
        label: opt.textContent,
        subtitle: opt.dataset.subtitle || '',
        icon: opt.dataset.icon || '',
        badge: opt.dataset.badge || '',
        badgeClass: opt.dataset.badgeClass || '',
      }));

      let title = customConfig.title;
      if (!title) {
        const lbl = selectEl.closest('label');
        if (lbl) {
          const firstSpan = lbl.querySelector('span');
          title = firstSpan ? firstSpan.textContent.replace(/[:：]/g, '').trim() : '';
        }
      }

      open({
        title: title || (isAr() ? 'اختر من القائمة' : 'Select Option'),
        subtitle: customConfig.subtitle || '',
        icon: customConfig.icon || '📌',
        items,
        current: selectEl.value,
        onSelect: (val) => {
          selectEl.value = val;
          updateTriggerText();
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          if (customConfig.onSelect) customConfig.onSelect(val);
        },
      });
    });

    selectEl.addEventListener('change', updateTriggerText);
    selectEl._updatePickerTrigger = updateTriggerText;

    if (window.MutationObserver) {
      const observer = new MutationObserver(() => updateTriggerText());
      observer.observe(selectEl, { childList: true, subtree: true });
    }

    selectEl.parentNode.insertBefore(trigger, selectEl.nextSibling);

    return trigger;
  }

  FOH.modalPicker = {
    open,
    close,
    enhanceSelect,
  };
})(window.FOH = window.FOH || {});
