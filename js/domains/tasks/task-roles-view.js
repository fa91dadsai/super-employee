// Roles tab rendering and role usage calculation for task assignments.
(function (FOH) {
  'use strict';

  const { t } = FOH.i18n;
  const { el, btn, card } = FOH.view;
  const M = FOH.model;
  const S = () => FOH.state;

  function roleUses(id) {
    const st = S();
    let n = st.tpl.tasks.filter((tk) => tk.role === id).length;
    st.tpl.sections.forEach((s) =>
      s.items.forEach((it) => {
        if (it.role === id) n++;
        M.kids(it).forEach((c) => c.role === id && n++);
      })
    );
    return n;
  }

  // Edit mode, "Roles" tab.
  function roles(root) {
    root.replaceChildren();
    const c = card({ cls: '', icon: '👥', title: t('roles') });
    c.querySelector('.head').append(btn('link', t('addRole'), 'role-add', {}));
    const ul = el('ol', 'items');
    S().tpl.roles.forEach((r) => {
      const li = el('li', 'item rl');
      const del = btn('more danger', '✕', 'role-delete', { id: r.id });
      del.setAttribute('aria-label', t('delete'));
      li.append(btn('task-row', r.name, 'role-rename', { id: r.id }), el('span', 'c', t('roleUses', { n: roleUses(r.id) })), del);
      ul.append(li);
    });
    c.append(ul);
    root.append(c);
    FOH.staff.card(root);
  }

  FOH.taskRolesView = { roles, roleUses };
})(window.FOH = window.FOH || {});

