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

  function normalizePickerItems(rawItems) {
    return (rawItems || []).map((it) => {
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
  }

  function renderPickerHeader(opts) {
    const { title, subtitle, icon, ar } = opts;
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
    return headRow;
  }

  function renderPickerItemCard(opts) {
    const { it, isSelected, onSelect } = opts;
    const card = el('button', 'modal-picker-item' + (isSelected ? ' selected' : ''));
    card.type = 'button';

    const itemContent = el('div', 'modal-picker-item-content');
    if (it.icon) {
      itemContent.append(el('span', 'modal-picker-item-icon', it.icon));
    }
    const textWrapper = el('div', 'modal-picker-item-texts');
    textWrapper.append(el('div', 'modal-picker-item-label', it.label));
    if (it.subtitle) {
      textWrapper.append(el('div', 'modal-picker-item-sub', it.subtitle));
    }
    itemContent.append(textWrapper);

    const trailing = el('div', 'modal-picker-item-trailing');
    if (it.badge) {
      trailing.append(el('span', 'dayoff-badge ' + (it.badgeClass || 'approved'), it.badge));
    }
    if (isSelected) {
      trailing.append(el('span', 'modal-picker-check', '✓'));
    }

    card.append(itemContent, trailing);
    card.addEventListener('click', () => {
      if (navigator.vibrate) {
        try { navigator.vibrate(10); } catch (err) { /* Vibration not supported */ }
      }
      close();
      if (onSelect) onSelect(it.value, it);
    });
    return card;
  }

  function renderPickerList(opts) {
    const { listContainer, listToRender, current, onSelect, ar } = opts;
    listContainer.replaceChildren();
    if (!listToRender.length) {
      listContainer.append(el('div', 'modal-picker-empty', ar ? 'لا توجد خيارات مطابقة' : 'No matching options'));
      return;
    }
    listToRender.forEach((it) => {
      const isSelected = String(it.value) === String(current);
      listContainer.append(renderPickerItemCard({ it, isSelected, onSelect }));
    });
  }

  function renderPickerSearchBox(opts) {
    const { normalizedItems, listContainer, current, onSelect, ar } = opts;
    const searchBox = el('div', 'modal-picker-search-box');
    const searchIn = el('input', 'in modal-picker-search-input');
    searchIn.type = 'search';
    searchIn.placeholder = ar ? '🔍 ابحث في الخيارات...' : '🔍 Search options...';
    searchIn.addEventListener('input', () => {
      const q = searchIn.value.trim().toLowerCase();
      const filtered = q
        ? normalizedItems.filter((it) =>
            (it.label || '').toLowerCase().includes(q) || (it.subtitle || '').toLowerCase().includes(q)
          )
        : normalizedItems;
      renderPickerList({ listContainer, listToRender: filtered, current, onSelect, ar });
    });
    searchBox.append(searchIn);
    return searchBox;
  }

  function renderPickerBottom(opts) {
    const { ar } = opts;
    const bottomRow = el('div', 'modal-picker-bottom');
    const cancelBtn = el('button', 'btn modal-picker-cancel', ar ? 'إلغاء' : 'Cancel');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', () => close());
    bottomRow.append(cancelBtn);
    return bottomRow;
  }

  /**
   * Opens an interactive bottom sheet modal window with rich option cards
   */
  function open(opts) {
    const { title, subtitle, icon, items = [], current = '', onSelect } = opts;
    const ar = isAr();
    const dlg = ensurePickerModal();
    dlg.replaceChildren();

    const box = el('div', 'modal-picker-box');
    box.append(el('div', 'grab'));
    box.append(renderPickerHeader({ title, subtitle, icon, ar }));

    const normalizedItems = normalizePickerItems(items);
    const listContainer = el('div', 'modal-picker-list');

    if (normalizedItems.length > 7) {
      box.append(renderPickerSearchBox({ normalizedItems, listContainer, current, onSelect, ar }));
    }

    renderPickerList({ listContainer, listToRender: normalizedItems, current, onSelect, ar });
    box.append(listContainer);
    box.append(renderPickerBottom({ ar }));

    dlg.append(box);
    dlg.showModal();
  }

  function bindSelectTriggerClick(opts) {
    const { trigger, selectEl, customConfig, updateTriggerText } = opts;
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
  }

  function insertTriggerElement(selectEl, trigger) {
    if (selectEl.parentNode) {
      selectEl.parentNode.insertBefore(trigger, selectEl.nextSibling);
    } else {
      setTimeout(() => {
        if (selectEl.parentNode && !trigger.parentNode) {
          selectEl.parentNode.insertBefore(trigger, selectEl.nextSibling);
        }
      }, 0);
    }
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
      const valWrapper = el('span', 'picker-trigger-val', text);
      const arrow = el('span', 'picker-trigger-arrow', '▾');
      trigger.append(valWrapper, arrow);
    };

    updateTriggerText();
    bindSelectTriggerClick({ trigger, selectEl, customConfig, updateTriggerText });

    selectEl.addEventListener('change', updateTriggerText);
    selectEl._updatePickerTrigger = updateTriggerText;

    if (window.MutationObserver) {
      const observer = new MutationObserver(() => updateTriggerText());
      observer.observe(selectEl, { childList: true, subtree: true });
    }

    insertTriggerElement(selectEl, trigger);
    return trigger;
  }

  FOH.modalPicker = {
    open,
    close,
    enhanceSelect,
  };
})(window.FOH = window.FOH || {});
