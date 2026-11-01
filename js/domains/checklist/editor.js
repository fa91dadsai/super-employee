// The edit sheet (bottom sheet on phones): one item's English and Arabic
// text, section, due time and, for a main item, its sub-items. Changes are
// kept in a draft and written only on Save; Cancel discards them.
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const M = FOH.model;
  const { t, pick } = FOH.i18n;
  const MAX = 300;

  // { id|null, sid, parentId|null, children: [], openSub: id|null }
  let draft = null;

  const clean = (v) => v.trim().slice(0, MAX);
  const hasText = (it) => it.text.trim() || it.textAr.trim();

  function renderSubs() {
    const list = $('subList');
    list.replaceChildren();
    draft.children.forEach((c) => {
      const li = FOH.view.el('li', 'sub');
      li.dataset.id = c.id;
      const row = FOH.view.el('div', 'sub-row');
      const label = FOH.view.btn('sub-label', pick(c.text, c.textAr) || '…', 'sub-open', { id: c.id });
      const del = FOH.view.btn('sub-x', '✕', 'sub-del', { id: c.id });
      del.setAttribute('aria-label', t('delete'));
      row.append(FOH.view.el('span', 'handle', '⠿'), label, del);
      li.append(row);
      if (draft.openSub === c.id) {
        const fields = FOH.view.el('div', 'sub-fields');
        const en = input(c, 'text', 'ltr', 'en', t('taskEn'));
        const ar = input(c, 'textAr', 'rtl', 'ar', t('taskAr'));
        const dueLabel = FOH.view.el('label', '', t('dueBy'));
        const due = FOH.view.el('input', 'in'); due.type = 'time'; due.value = c.due || '';
        due.addEventListener('change', () => { c.due = due.value; }); dueLabel.append(due);
        fields.append(en, ar, dueLabel, FOH.reminders.control(c));
        li.append(fields);
      }
      list.append(li);
    });
    $('subCount').textContent = draft.children.length ? ' (' + draft.children.length + ')' : '';
  }

  function input(child, field, dir, lang, placeholder) {
    const box = document.createElement('input');
    box.className = 'in';
    box.value = child[field];
    box.dir = dir;
    box.lang = lang;
    box.maxLength = MAX;
    box.placeholder = placeholder;
    box.addEventListener('input', () => {
      child[field] = box.value;
      const label = box.closest('li').querySelector('.sub-label');
      label.textContent = pick(child.text, child.textAr) || '…';
    });
    return box;
  }

  function fillSections(selected) {
    const select = $('dlgSection');
    select.replaceChildren();
    S.tpl.sections.forEach((s) => {
      const opt = FOH.view.el('option', '', s.icon + ' ' + FOH.view.sectionName(s));
      opt.value = s.id;
      opt.selected = s.id === selected;
      select.append(opt);
    });
  }

  // target: { id } edit an item | { sid } new item | { parentId } new sub-item
  function open(target) {
    const at = target.id ? M.locate(S.tpl, target.id) : null;
    const parentAt = target.parentId ? M.locate(S.tpl, target.parentId) : null;
    const parent = at ? at.parent : parentAt && parentAt.item;
    const item = at ? at.item : null;
    draft = {
      id: item ? item.id : null,
      sid: (at || parentAt || {}).section?.id || target.sid,
      parentId: parent ? parent.id : null,
      children: item && !parent ? FOH.store.clone(M.kids(item)) : [],
      openSub: null,
      remindBefore: FOH.store.cleanReminder(item ? item.remindBefore : undefined),
    };
    $('sheetTitle').textContent = item ? t('editItem') : parent ? t('newSub') : t('newItem');
    $('dlgText').value = item ? item.text : '';
    $('dlgTextAr').value = item ? item.textAr : '';
    $('dlgDue').value = item ? item.due : '';
    $('dlgReminder').replaceChildren(FOH.reminders.control(draft));
    const roleSel = $('dlgRole');
    roleSel.replaceChildren();
    FOH.taskSheet.roleOptions().forEach(([v, label]) => {
      const o = FOH.view.el('option', '', label);
      o.value = v;
      o.selected = v === ((item && item.role) || '');
      roleSel.append(o);
    });
    $('dlgText').setCustomValidity('');
    $('dlgDelete').hidden = !item;
    $('subOf').hidden = !parent;
    if (parent) $('subOf').textContent = t('subOf', { name: FOH.view.itemName(parent) });
    $('sectionField').hidden = !!parent;
    $('subsBlock').hidden = !!parent;
    fillSections(draft.sid);
    renderSubs();
    $('sheet').returnValue = ''; // Esc must not repeat the previous "save"
    $('sheet').showModal();
    $(FOH.i18n.lang === 'ar' ? 'dlgTextAr' : 'dlgText').focus();
  }

  function save() {
    const text = clean($('dlgText').value);
    const textAr = clean($('dlgTextAr').value);
    const due = FOH.store.TIME_RE.test($('dlgDue').value) ? $('dlgDue').value : '';
    const role = $('dlgRole').value;
    if ((!text && !textAr) || !draft) return;
    FOH.edit.checkpoint();
    const children = draft.children.filter(hasText).map((c) => ({
      id: c.id,
      text: clean(c.text),
      textAr: clean(c.textAr),
      due: c.due || '',
      remindBefore: FOH.store.cleanReminder(c.remindBefore),
      role: c.role || '',
    }));
    const at = draft.id ? M.locate(S.tpl, draft.id) : null;
    if (at) {
      Object.assign(at.item, { text, textAr, due, role, remindBefore: draft.remindBefore });
      if (!at.parent) {
        at.item.children = children;
        const target = S.tpl.sections.find((s) => s.id === $('dlgSection').value);
        if (target && target !== at.section) {
          at.list.splice(at.index, 1);
          target.items.push(at.item);
        }
      }
      return FOH.edit.commit(t('itemUpdated'));
    }
    const fresh = { id: FOH.store.uid(), text, textAr, due, role, remindBefore: draft.remindBefore };
    const parentAt = draft.parentId ? M.locate(S.tpl, draft.parentId) : null;
    if (parentAt) {
      if (!parentAt.item.children) parentAt.item.children = [];
      parentAt.item.children.push(fresh);
      S.toggled.delete(parentAt.item.id);
    } else {
      const target = S.tpl.sections.find((s) => s.id === $('dlgSection').value);
      if (!target) return;
      target.items.push(Object.assign(fresh, { children }));
    }
    FOH.edit.commit(t('itemAdded'));
  }

  function onSubClick(ev) {
    const b = ev.target.closest('button[data-act]');
    if (!b) return;
    const { act, id } = b.dataset;
    if (act === 'sub-open') draft.openSub = draft.openSub === id ? null : id;
    if (act === 'sub-del') draft.children = draft.children.filter((c) => c.id !== id);
    renderSubs();
  }

  function init() {
    const sheet = $('sheet');
    $('subList').addEventListener('click', onSubClick);
    FOH.drag.enable($('subList'), (ids) => {
      const byId = new Map(draft.children.map((c) => [c.id, c]));
      draft.children = ids.map((id) => byId.get(id)).filter(Boolean);
      renderSubs();
    });
    $('addSubBtn').addEventListener('click', () => {
      const c = { id: FOH.store.uid(), text: '', textAr: '', due: '' };
      draft.children.push(c);
      draft.openSub = c.id;
      renderSubs();
      $('subList').querySelector('li:last-child input' + (FOH.i18n.lang === 'ar' ? ':last-child' : '')).focus();
    });
    $('dlgDelete').addEventListener('click', () => {
      if (FOH.edit.deleteItem(draft.id)) sheet.close('deleted');
    });
    // A task needs text in at least one language.
    $('sheetForm').addEventListener('submit', (e) => {
      const saving = e.submitter && e.submitter.value === 'save';
      if (!saving || $('dlgText').value.trim() || $('dlgTextAr').value.trim()) return;
      e.preventDefault();
      $('dlgText').setCustomValidity(t('needText'));
      $('dlgText').reportValidity();
    });
    ['dlgText', 'dlgTextAr'].forEach((id) => $(id).addEventListener('input', () => $('dlgText').setCustomValidity('')));
    // Enter in a one-line field must not trigger the first button (Cancel).
    $('sheetForm').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
    });
    // Tapping the dimmed backdrop closes the sheet without saving.
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet) sheet.close('cancel');
    });
    sheet.addEventListener('close', () => {
      if (sheet.returnValue === 'save') save();
      draft = null;
    });
  }

  FOH.sheet = { init, open };
})(window.FOH = window.FOH || {});

// Edit mode: item and section actions, the edit sheet (with its sub-items),
// import/export. Every change can be undone once from the toast.
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
