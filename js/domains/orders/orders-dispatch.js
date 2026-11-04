// foh-opening/js/domains/orders/orders-dispatch.js
// WhatsApp Text Generator, Clipboard Copy & Automatic Checklist Ticking
(function (FOH) {
  'use strict';

  const S = () => FOH.state;
  const store = () => FOH.ordersStore;

  function isAr() {
    return FOH.i18n ? FOH.i18n.lang === 'ar' : false;
  }

  function getSession() {
    return (FOH.auth && FOH.auth.getSession) ? FOH.auth.getSession() : (FOH.sessionAuth ? FOH.sessionAuth.getSession() : null);
  }

  function apiCall(u, m, d) {
    return FOH.cloudSync ? FOH.cloudSync.apiCall(u, m, d) : Promise.resolve(null);
  }

  function buildOrdWhatsAppText(includeStock = false) {
    const session = getSession();
    const db = store().getDB();
    const m = db.order.meta;
    const st = S();
    const requester = (session && session.displayName) || (st.me && st.me.name) || m.requester || 'Staff';
    const orderDate = st.date || (FOH.time ? FOH.time.todayISO() : '');
    const list = store().ordSelectedItems();

    const lines = [
      '*CEEN & OASIS | WAREHOUSE & BAR ORDER*',
      '',
      `Date: ${orderDate}`,
      `Prepared by: ${requester}`,
      `Destination: Store Warehouse`,
      `Requested items: ${list.length}`,
    ];

    let lastCat = '';
    let idx = 0;
    list.forEach((i) => {
      const l = store().ordLine(i.id);
      if (lastCat !== i.cat) {
        const gName = (db.catalog.groups[i.group] && db.catalog.groups[i.group].name) || i.group;
        const cName = (store().ordCat(i.cat) && store().ordCat(i.cat).name) || i.cat;
        lines.push(`\n*${(gName + ' / ' + cName).toUpperCase()}*`);
        lastCat = i.cat;
      }
      lines.push(`${++idx}. ${i.name}${i.ar ? ' (' + i.ar + ')' : ''} — *${l.qty} ${store().ordUnitText(l.qty, l.unit || i.unit)}*`);
      if (i.packSize) lines.push(`   Size / pack: ${i.packSize}`);
      if (l.note) lines.push(`   Note: ${l.note}`);
      if (includeStock) {
        lines.push(`   Stock: ${store().ordStockLabel(i)}`);
      }
    });

    if (m.orderNote) {
      lines.push('\n*ORDER NOTE*\n' + m.orderNote);
    }
    lines.push('\nPlease confirm availability and any shortages.');
    return lines.join('\n');
  }

  function markWarehouseChecklistItemDone() {
    let targetId = null;
    const st = S();
    if (!st.tpl || !st.tpl.sections) return;

    st.tpl.sections.forEach((sec) => {
      (sec.items || []).forEach((it) => {
        if (/warehouse|المستودع/i.test(it.text + ' ' + (it.textAr || ''))) targetId = it.id;
      });
    });

    if (targetId && st.run && st.run.checked && !st.run.checked[targetId]) {
      const timeStr = FOH.time ? FOH.time.nowHM() : '';
      st.run.checked[targetId] = timeStr;
      if (FOH.store && FOH.store.saveRun) FOH.store.saveRun(st.date, st.run);

      const session = getSession();
      apiCall('POST', '/v1/foh-opening/runs/tick', {
        business_date: st.date,
        sheet_type: 'opening',
        item_ids: [targetId],
        checked: true,
        at_hm: timeStr,
        by_name: (session && session.displayName) || (st.me && st.me.name) || 'Staff',
      });
      if (FOH.edit && FOH.edit.toast && FOH.i18n && FOH.i18n.t) {
        FOH.edit.toast(FOH.i18n.t('ordAutoTickNote'));
      }
    }
  }

  async function copyOrderText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch (err) {
      // Clipboard write permission denied fallback
    }
    markWarehouseChecklistItemDone();
    if (store() && store().setOrderStatus) {
      store().setOrderStatus('DISPATCHED');
    }
    if (FOH.edit && FOH.edit.toast && FOH.i18n && FOH.i18n.t) {
      FOH.edit.toast(FOH.i18n.t('ordCopied'));
    }
  }

  function openWhatsApp(text) {
    copyOrderText(text);
    const url = 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener');
  }

  FOH.ordersDispatch = {
    buildOrdWhatsAppText,
    markWarehouseChecklistItemDone,
    copyOrderText,
    openWhatsApp,
  };
})(window.FOH = window.FOH || {});
