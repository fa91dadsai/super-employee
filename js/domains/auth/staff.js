// Staff (people by name) and "I am …" on this device. Until accounts exist,
// choosing your name stands in for logging in; your position sets what you can see.
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el, btn } = FOH.view;
  const isAr = () => (FOH.i18n ? FOH.i18n.lang === 'ar' : false);
  let editing = null; // staff id being edited, or '' for a new person

  const roleName = (id) => (S.tpl.roles.find((r) => r.id === id) || {}).name || '';
  const byId = (id) => S.tpl.staff.find((p) => p.id === id);

  // Keep the device profile in step with the staff list (renames, new position).
  function syncMe() {
    const p = byId(S.me.staffId);
    if (p) Object.assign(S.me, { role: p.role, name: p.name });
  }

  function label() {
    const p = byId(S.me.staffId);
    return p ? p.name + (p.role ? ' · ' + roleName(p.role) : '') : t('chooseName');
  }

  async function chooseMe() {
    const list = [['', t('chooseName')], ...S.tpl.staff.filter((p) => p.active).map((p) => [p.id, p.name + (p.role ? ' · ' + roleName(p.role) : '')])];
    const res = await FOH.taskSheet.pick({ title: t('whoAreYou'), list, value: S.me.staffId });
    if (!res) return;
    const p = byId(res.value);
    S.me = p ? { staffId: p.id, role: p.role, name: p.name } : { staffId: '', role: '', name: '' };
    FOH.store.saveMe(S.me);
    FOH.app.render();
  }

  // Staff card under the positions list (edit mode → Positions).
  function card(root) {
    const c = el('section', 'card');
    const h = el('div', 'head');
    const nm = el('span', 'nm');
    nm.append(el('span', 'ico', '🧑‍🍳'), el('span', 'nm-t', t('staffTitle')));
    h.append(nm, btn('link', t('addStaff'), 'staff-add', {}));
    c.append(h);
    const ul = el('ol', 'items');
    S.tpl.staff.forEach((p) => {
      const li = el('li', 'item rl');
      const b = btn('task-row', '', 'staff-open', { id: p.id });
      const tags = el('span', 'tags');
      if (p.role) tags.append(el('span', 'tag role', roleName(p.role)));
      if (p.canEditChecklist) tags.append(el('span', 'tag mine', '✎ مسموح بالتعديل'));
      if (p.healthCertExpiry) {
        const days = Math.ceil((new Date(p.healthCertExpiry + 'T00:00:00') - new Date(FOH.time.todayISO() + 'T00:00:00')) / 86400000);
        const cls = days < 0 ? 'tag late' : days <= 30 ? 'tag time' : 'tag mine';
        const txt = days < 0 ? '🏥 منتهية (' + p.healthCertExpiry + ')' : days <= 30 ? '🏥 ⚠️ باقي ' + days + ' يوم' : '🏥 ✓ ' + p.healthCertExpiry;
        tags.append(el('span', cls, txt));
      }
      if (p.inv) tags.append(el('span', 'tag mine', '📦 ' + t('inCounts')));
      if (p.inviteCode) tags.append(el('span', 'tag', '🔑 ' + p.inviteCode));
      if (p.pendingNameChange && p.pendingNameChange.status === 'pending') tags.append(el('span', 'tag late', '⏳ طلب تعديل معلق'));
      if (!p.active) tags.append(el('span', 'tag', t('inactive')));
      const dispTitle = p.nickname && p.nickname !== p.name ? `${p.name} (${p.nickname})` : p.name;
      b.append(el('span', 't', dispTitle), tags);
      li.append(b);
      ul.append(li);
    });
    c.append(ul);
    root.append(c);
  }

  function open(id) {
    const p = id ? byId(id) : null;
    editing = p ? p.id : '';
    $('staffTitle').textContent = t('editStaff');
    $('stName').value = p ? p.name : '';
    if ($('stNickname')) $('stNickname').value = (p && p.nickname) || '';
    if ($('stPhone')) $('stPhone').value = (p && p.phone) || '';
    if ($('stEmail')) $('stEmail').value = (p && p.email) || '';
    const code = (p && p.inviteCode) ? p.inviteCode : ('CEEN-' + Math.floor(1000 + Math.random() * 9000));
    if ($('stInviteCodeDisplay')) $('stInviteCodeDisplay').textContent = code;
    const sel = $('stRole');
    sel.replaceChildren();
    FOH.taskSheet.roleOptions().forEach(([v, name]) => {
      const o = el('option', '', name);
      o.value = v;
      o.selected = v === (p ? p.role : '');
      sel.append(o);
    });
    if ($('stHealthNo')) $('stHealthNo').value = (p && p.healthCertNo) || '';
    if ($('stHealthExp')) $('stHealthExp').value = (p && p.healthCertExpiry) || '';
    if ($('stCanEdit')) $('stCanEdit').checked = !!(p && p.canEditChecklist);
    $('stInv').checked = p ? p.inv : true;
    $('stActive').checked = p ? p.active : true;
    $('stDelete').hidden = !p;
    $('staffSheet').returnValue = '';
    $('staffSheet').showModal();
  }

  function save() {
    const name = $('stName').value.trim().slice(0, 60);
    if (!name) return;
    const nickname = $('stNickname') ? $('stNickname').value.trim().slice(0, 30) : '';
    const phone = $('stPhone') ? $('stPhone').value.trim().slice(0, 30) : '';
    const email = $('stEmail') ? $('stEmail').value.trim().slice(0, 80) : '';
    const inviteCode = $('stInviteCodeDisplay') ? $('stInviteCodeDisplay').textContent.trim() : ('CEEN-' + Math.floor(1000 + Math.random() * 9000));
    FOH.edit.checkpoint();
    const data = {
      name,
      nickname: nickname || name.split(' ')[0],
      phone,
      email,
      inviteCode,
      role: $('stRole').value,
      inv: $('stInv').checked,
      active: $('stActive').checked,
      canEditChecklist: $('stCanEdit') ? $('stCanEdit').checked : false,
      healthCertNo: $('stHealthNo') ? $('stHealthNo').value.trim().slice(0, 60) : '',
      healthCertExpiry: $('stHealthExp') ? $('stHealthExp').value : '',
    };
    const p = byId(editing);
    if (p) Object.assign(p, data);
    else S.tpl.staff.push({ id: FOH.store.uid(), ...data });
    FOH.edit.commit(t('saved'));
  }

  function remove() {
    const p = byId(editing);
    if (!p || !confirm(t('confirmDelStaff', { name: p.name }))) return;
    FOH.edit.checkpoint();
    S.tpl.staff = S.tpl.staff.filter((x) => x !== p);
    $('staffSheet').close('deleted');
    FOH.edit.commit(t('saved'));
  }

  function init() {
    const sheet = $('staffSheet');
    $('stDelete').addEventListener('click', remove);
    if ($('stCopyInviteBtn')) {
      $('stCopyInviteBtn').addEventListener('click', () => {
        const code = $('stInviteCodeDisplay') ? $('stInviteCodeDisplay').textContent.trim() : '';
        if (code) {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
              FOH.toast ? FOH.toast('✓ تم نسخ كود التفعيل: ' + code) : alert('Copied: ' + code);
            }).catch(() => {
              prompt('كود التفعيل:', code);
            });
          } else {
            prompt('كود التفعيل:', code);
          }
        }
      });
    }
    $('staffForm').addEventListener('keydown', (e) => e.key === 'Enter' && e.target.tagName === 'INPUT' && e.preventDefault());
    sheet.addEventListener('click', (e) => e.target === sheet && sheet.close('cancel'));
    sheet.addEventListener('close', () => sheet.returnValue === 'save' && save());
    $('rolesView').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (b && b.dataset.act === 'staff-add') open(null);
      if (b && b.dataset.act === 'staff-open') open(b.dataset.id);
    });
  }

  FOH.staff = { init, card, chooseMe, syncMe, label, byId };
})(window.FOH = window.FOH || {});
