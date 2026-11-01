// Actions for scheduled tasks and positions: tick/untick, "I am …",
// open the task editor, add / rename / delete positions.
(function (FOH) {
  'use strict';

  const S = FOH.state;
  const { t } = FOH.i18n;
  const TV = FOH.tasksView;

  function tick(taskId) {
    const st = TV.todayStates().find((s) => s.task.id === taskId);
    if (!st) return FOH.app.render();
    const by = S.me.name || TV.roleName(S.me.role) || '';
    FOH.schedule.toggle(S.log, st, S.date, FOH.time.nowHM(), by);
    FOH.store.saveLog(S.log);
    if (!st.doneEntry && navigator.vibrate) navigator.vibrate(8);
    FOH.app.render();
  }

  function addRole() {
    const name = prompt(t('newRoleName'));
    if (!name || !name.trim()) return;
    FOH.edit.checkpoint();
    S.tpl.roles.push({ id: FOH.store.uid(), name: name.trim().slice(0, 60) });
    FOH.edit.commit(t('roleAdded'));
  }

  function renameRole(id) {
    const role = S.tpl.roles.find((r) => r.id === id);
    const name = role && prompt(t('roleName'), role.name);
    if (!name || !name.trim()) return;
    FOH.edit.checkpoint();
    role.name = name.trim().slice(0, 60);
    FOH.edit.commit();
  }

  // Everything that points at a position: tasks and opening items.
  function eachUser(fn) {
    S.tpl.tasks.forEach(fn);
    S.tpl.sections.forEach((s) =>
      s.items.forEach((it) => {
        fn(it);
        FOH.model.kids(it).forEach(fn);
      })
    );
  }

  async function deleteRole(id) {
    const role = S.tpl.roles.find((r) => r.id === id);
    if (!role) return;
    const uses = TV.roleUses(id);
    let replacement = '';
    if (uses) {
      const list = FOH.taskSheet.roleOptions().filter(([v]) => v !== id);
      const res = await FOH.taskSheet.pick({
        title: t('delete') + ': ' + role.name,
        message: t('roleInUse', { name: role.name, n: uses }),
        list,
        value: list[1] ? list[1][0] : '',
      });
      if (!res) return;
      replacement = res.value;
    } else if (!confirm(t('delete') + ': ' + role.name + '?')) return;
    FOH.edit.checkpoint();
    eachUser((x) => {
      if (x.role === id) x.role = replacement; // '' = nobody in particular
    });
    S.tpl.roles = S.tpl.roles.filter((r) => r.id !== id);
    if (S.me.role === id) {
      S.me.role = replacement;
      FOH.store.saveMe(S.me);
    }
    FOH.edit.commit(t('roleDeleted'));
  }

  function onClick(ev) {
    const b = ev.target.closest('button[data-act]');
    if (!b) return;
    const { act, id } = b.dataset;
    if (act === 'iam' && !S.previewEmployee) return FOH.staff.chooseMe();
    if (act === 'count-open') return FOH.invCount.open(b.dataset.cat, b.dataset.mode, b.dataset.key);
    if (act.startsWith('week-')) {
      S.weekOffset = act === 'week-today' ? 0 : S.weekOffset + (act === 'week-next' ? 1 : -1);
      return FOH.app.render();
    }
    if (act === 'task-open') return FOH.taskSheet.open(id);
    if (act === 'task-add') return FOH.taskSheet.open(null);
    if (act === 'role-add') return addRole();
    if (act === 'role-rename') return renameRole(id);
    if (act === 'role-delete') return deleteRole(id);
  }

  function onChange(ev) {
    const cb = ev.target;
    if (cb.type === 'checkbox' && cb.dataset.task) tick(cb.dataset.task);
    if (cb.id === 'weekStartSel') {
      FOH.edit.checkpoint();
      S.tpl.settings.weekStart = Number(cb.value);
      FOH.edit.commit();
    }
  }

  function init(containers) {
    containers.forEach((c) => {
      c.addEventListener('click', onClick);
      c.addEventListener('change', onChange);
    });
  }

  FOH.taskActions = { init };
})(window.FOH = window.FOH || {});
