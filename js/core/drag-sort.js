// foh-opening/js/core/drag-sort.js
// Drag-to-reorder for lists driven by pointer events (< 350 lines)

(function (FOH) {
  'use strict';

  const EDGE = 60; // px from the visible edge that triggers auto-scroll

  // Scroll only in the direction the finger is moving; the sticky header
  // counts as part of the top edge.
  function autoScroll(y, dy) {
    const header = document.querySelector('.top');
    const top = header ? header.getBoundingClientRect().bottom : 0;
    if (dy < 0 && y < top + EDGE) window.scrollBy(0, -12);
    else if (dy > 0 && y > window.innerHeight - EDGE) window.scrollBy(0, 12);
  }

  function createDragHandlers(list, row, opts = {}) {
    const isLegacy = typeof opts === 'string';
    const startOrder = isLegacy ? opts : (opts && opts.startOrder);
    const ev = isLegacy ? arguments[3] : (opts && opts.ev);
    const onDrop = isLegacy ? arguments[4] : (opts && opts.onDrop);
    let finished = false;
    let lastY = ev.clientY;

    const move = (e) => {
      if (e.pointerId !== ev.pointerId) return;
      e.preventDefault();
      const y = e.clientY;
      let before = null;
      for (const li of list.children) {
        if (li === row) continue;
        const r = li.getBoundingClientRect();
        if (y < r.top + r.height / 2) {
          before = li;
          break;
        }
      }
      if (before !== row.nextElementSibling) list.insertBefore(row, before);
      autoScroll(y, y - lastY);
      lastY = y;
    };

    const end = (e) => {
      if (finished || e.pointerId !== ev.pointerId) return;
      finished = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      row.classList.remove('dragging');
      const ids = Array.from(list.children).map((li) => li.dataset.id);
      if (ids.join() !== startOrder) onDrop(ids);
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  function enable(list, onDrop) {
    list.addEventListener(
      'touchmove',
      (e) => {
        const handle = e.target.closest && e.target.closest('.handle');
        if (handle && handle.closest('ol') === list) e.preventDefault();
      },
      { passive: false }
    );
    list.addEventListener('pointerdown', (ev) => {
      const handle = ev.target.closest('.handle');
      if (!handle || handle.closest('ol') !== list) return;
      const row = handle.closest('li');
      const startOrder = Array.from(list.children).map((li) => li.dataset.id).join();
      ev.preventDefault();
      row.classList.add('dragging');
      createDragHandlers(list, row, { startOrder, ev, onDrop });
    });
  }

  FOH.drag = { enable };
})(window.FOH = window.FOH || {});

