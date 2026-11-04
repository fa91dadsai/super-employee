// Edit mode: item and section actions, the edit sheet (with its sub-items),
// Data synchronization and exchange. Every change can be undone once from the toast.
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const M = FOH.model;
  const { t, pick } = FOH.i18n;
  let undoSnapshot = null;
  let toastTimer = 0;

  function commit(message) {
    if (!FOH.store.saveTemplate(S.tpl)) alert(t('saveFailed'));
    FOH.app.render();
    if (message) toast(message);
  }

  // Snapshot before a change, so the toast can offer Undo afterwards.
  function checkpoint() {
    undoSnapshot = FOH.store.clone(S.tpl);
  }

  function toast(message) {
    $('toastMsg').textContent = message;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($('toast').hidden = true), 6000);
  }

  function undo() {
    if (!undoSnapshot) return;
    S.tpl = undoSnapshot;
    undoSnapshot = null;
    $('toast').hidden = true;
    commit();
  }

  const findSection = (sid) => S.tpl.sections.find((s) => s.id === sid);

  // New order of a section's items or of a parent's sub-items, after a drag.
  function applyOrder(containerId, ids) {
    const sec = findSection(containerId);
    const at = sec ? null : M.locate(S.tpl, containerId);
    const owner = sec ? sec.items : at && at.item.children;
    if (!owner) return;
    checkpoint();
    const byId = new Map(owner.map((it) => [it.id, it]));
    const next = ids.map((id) => byId.get(id)).filter(Boolean);
    owner.splice(0, owner.length, ...next);
    commit(t('orderChanged'));
  }

  function deleteItem(id) {
    const at = M.locate(S.tpl, id);
    if (!at) return false;
    const n = M.kids(at.item).length;
    if (n && !confirm(t('confirmDelParent', { name: FOH.view.itemName(at.item), n }))) return false;
    checkpoint();
    at.list.splice(at.index, 1);
    S.tray = null;
    commit(t('itemDeleted'));
    return true;
  }

  function sectionAction(act, sid) {
    const sec = findSection(sid);
    if (!sec) return;
    const i = S.tpl.sections.indexOf(sec);
    if (act === 's-rename') {
      const field = FOH.i18n.lang === 'ar' ? 'titleAr' : 'title';
      const title = prompt(t('sectionName'), pick(sec.title, sec.titleAr));
      if (!title || !title.trim()) return;
      checkpoint();
      sec[field] = title.trim().slice(0, 300);
      return commit();
    }
    if (act === 's-delete') {
      const n = M.sectionLeaves(sec).length;
      if (n && !confirm(t('confirmDelSection', { title: FOH.view.sectionName(sec), n }))) return;
      checkpoint();
      S.tpl.sections.splice(i, 1);
      return commit(t('sectionDeleted'));
    }
    checkpoint();
    if (M.move(S.tpl.sections, i, act === 's-up' ? i - 1 : i + 1)) commit();
  }

  function handle(act, id, sid) {
    if (act === 'tray') {
      const key = id || sid;
      S.tray = S.tray === key ? null : key;
      return FOH.app.render();
    }
    if (act === 'add') return FOH.sheet.open({ sid });
    if (act === 'edit') return FOH.sheet.open({ id });
    if (act === 'addsub') return FOH.sheet.open({ parentId: id });
    if (act === 'delete') return deleteItem(id);
    if (act && act.startsWith('s-')) return sectionAction(act, sid);
    const at = M.locate(S.tpl, id);
    if (!at) return;
    checkpoint();
    let changed = false;
    if (act === 'up') changed = M.move(at.list, at.index, at.index - 1);
    else if (act === 'down') changed = M.move(at.list, at.index, at.index + 1);
    else if (act === 'indent') changed = M.indent(S.tpl, id);
    else if (act === 'outdent') changed = M.outdent(S.tpl, id);
    if (changed) commit(act === 'indent' || act === 'outdent' ? t('moved') : '');
  }

  function addSection() {
    const title = prompt(t('newSectionName'));
    if (!title || !title.trim()) return;
    checkpoint();
    const clean = title.trim().slice(0, 300);
    const ar = FOH.i18n.lang === 'ar';
    S.tpl.sections.push({
      id: FOH.store.uid(),
      title: ar ? '' : clean,
      titleAr: ar ? clean : '',
      icon: FOH.store.DEFAULT_ICON,
      items: [],
    });
    commit(t('sectionAdded'));
  }

  function exportJson() {
    const payload = { app: 'foh-opening-checklist', exportedAt: new Date().toISOString(), template: S.tpl };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'foh-opening-checklist.json';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importJson(file) {
    if (!file) return;
    if (file.size > 1024 * 1024) return alert(t('fileTooLarge'));
    file.text().then((raw) => {
      let tpl = null;
      try {
        const parsed = JSON.parse(raw);
        tpl = FOH.store.upgrade(parsed.template || parsed);
      } catch (err) {
        tpl = null;
      }
      if (!tpl) return alert(t('badFile'));
      checkpoint();
      S.tpl = tpl;
      commit(t('imported'));
    });
  }

  function init() {
    $('addSectionBtn').addEventListener('click', addSection);
    $('exportBtn').addEventListener('click', exportJson);
    $('importInput').addEventListener('change', (e) => {
      importJson(e.target.files[0]);
      e.target.value = '';
    });
    $('resetTplBtn').addEventListener('click', () => {
      if (!confirm(t('confirmRestore'))) return;
      checkpoint();
      S.tpl = FOH.store.defaultTemplate();
      commit(t('restored'));
    });
    $('toastUndo').addEventListener('click', undo);
    FOH.sheet.init();
  }

  FOH.edit = { init, handle, applyOrder, deleteItem, checkpoint, commit, toast };
})(window.FOH = window.FOH || {});
