(function (FOH) {
  'use strict';
  const S = FOH.state;
  const $ = (id) => document.getElementById(id);
  const { t } = FOH.i18n;
  let managerMe = null;
  let managerView = 'opening';
  let managerEditing = false;
  let managerEditTab = 'list';
  let previewStaffId = '';
  let originalInventory = null;
  let originalDate = null;
  let originalRun = null;
  const staff = () => S.tpl.staff.filter((p) => p.active);
  function isSectionAllowedForRole(sec, opts = {}) {
    const isObj = typeof opts === 'object' && opts !== null;
    const roleKey = isObj ? (opts.roleKey || 'staff') : (opts || 'staff');
    const isMgr = isObj ? !!opts.isMgr : !!arguments[2];
    const username = isObj ? (opts.username || '') : (arguments[3] || '');
    if (isMgr) return true;
    if (sec && Array.isArray(sec.allowedRoles) && sec.allowedRoles.length > 0) {
      if (sec.allowedRoles.includes('all')) return true;
      return sec.allowedRoles.includes(roleKey);
    }
    const sid = (sec.id || '').toLowerCase();
    const dept = (sec.dept || '').toLowerCase();
    const asgRole = (sec.assignedRoleKey || '').toLowerCase();
    const asgUser = (sec.assignedUsername || '').toLowerCase();
    const curUser = (username || '').toLowerCase();
    if (asgUser && curUser && asgUser === curUser) return true;

    if (roleKey === 'super_captain') {
      if (sid.includes('bar') || dept === 'bar' || sid.includes('cash') || dept === 'cash' || asgRole === 'super_bartender' || asgRole === 'super_manager') {
        return false;
      }
      return true;
    }
    if (roleKey === 'super_bartender') {
      return sid.includes('bar') || dept === 'bar' || asgRole === 'super_bartender';
    }
    if (roleKey === 'super_waiter' || roleKey === 'staff') {
      if (sid.includes('bar') || dept === 'bar' || sid.includes('cash') || dept === 'cash' || sid.includes('host') || dept === 'host' || asgRole === 'super_bartender' || asgRole === 'super_manager') {
        return false;
      }
      return sid.includes('floor') || dept === 'floor' || sid.includes('back') || dept === 'back' || asgRole === 'super_waiter' || asgRole === 'runner' || asgRole === 'all';
    }
    return true;
  }

  function sections() {
    const allSecs = (S.tpl && S.tpl.sections) ? S.tpl.sections : [];
    if (S.editing) return allSecs;

    const sess = FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    const isMgr = !sess || !!(sess.isManager || sess.roleId === 'manager');
    if (isMgr && !S.previewEmployee) return allSecs;

    const roleKey = FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : (S.me ? S.me.role : 'staff');
    const uname = (sess && sess.username) || (S.me ? S.me.name : '');

    return allSecs.filter((sec) => isSectionAllowedForRole(sec, roleKey, false, uname));
  }
  function choose(id) {
    const person = staff().find((p) => p.id === id);
    if (!person) return;
    stopCountDemo(false);
    previewStaffId = id;
    S.me = { staffId: id, role: person.role, name: person.name };
    S.view = 'mine'; S.editing = false;
    FOH.app.render();
  }
  function enter() {
    const people = staff();
    if (!people.length) return alert(t('noPreviewStaff'));
    managerMe = { ...S.me }; managerView = S.view; managerEditing = S.editing; managerEditTab = S.editTab;
    const assigned = new Set(Object.values(S.inv.weeks).filter((w) => w.published).flatMap((w) => Object.values(w.assign || {}).map((a) => a.staffId)));
    const person = people.find((p) => p.id === previewStaffId) || people.find((p) => p.inv && assigned.has(p.id)) || people.find((p) => p.inv) || people[0];
    S.previewEmployee = true;
    choose(person.id);
  }
  function leave() {
    stopCountDemo(false);
    S.previewEmployee = false;
    if (managerMe) S.me = managerMe;
    S.view = managerView; S.editing = managerEditing; S.editTab = managerEditTab; managerMe = null;
    FOH.app.render();
  }
  function stopCountDemo(renderNow = true) {
    if (originalInventory) { S.inv = originalInventory; S.date = originalDate; S.run = originalRun; }
    originalInventory = null; originalDate = null; originalRun = null; S.previewCountDemo = false;
    if (renderNow) FOH.app.render();
  }
  function startCountDemo() {
    if (!S.previewEmployee) enter();
    if (!S.previewEmployee || !S.me.staffId) return;
    stopCountDemo(false);
    originalInventory = S.inv; originalDate = S.date; originalRun = S.run;
    const inv = FOH.store.clone(S.inv);
    const uid = FOH.store.uid;
    const red = uid(), white = uid();
    const item = FOH.invStore.normItem({
      id: uid(), name: 'Wine glass', nameAr: 'كأس نبيذ', unit: 'pcs', location: 'Bar',
      hint: 'Count usable glasses only. Enter 0 if none are present.', hintAr: 'عُدّ الكؤوس الصالحة للاستخدام فقط. أدخل صفرًا إذا لم توجد قطع.',
      cond: { repair: false, writeoff: true },
      attrs: [{ id: uid(), name: 'Type', nameAr: 'النوع', values: [{ id: white, label: 'White wine glass', labelAr: 'كأس White wine' }, { id: red, label: 'Red wine glass', labelAr: 'كأس Red wine' }] }],
      variants: [{ id: uid(), a: [white, ''], expected: null }, { id: uid(), a: [red, ''], expected: null }],
    });
    const cat = { id: uid(), name: 'White & red wine glasses', nameAr: 'كؤوس White wine وRed wine', icon: '🍷', items: [item] };
    const today = FOH.time.todayISO();
    inv.categories = [cat]; inv.weeks = {}; inv.repairs = []; inv.writeoffs = []; inv.breakage = []; inv.history = {};
    inv.settings.countDay = FOH.schedule.weekday(today);
    inv.settings.deadline = '23:59';
    inv.weeks[today] = { published: true, assign: { [cat.id]: { staffId: S.me.staffId, pinned: true } }, counts: {}, recounts: {}, approved: {} };
    S.previewCountDemo = true; S.inv = inv; S.view = 'mine'; S.date = today;
    S.run = FOH.store.loadRun ? FOH.store.loadRun(today) : S.run;
    FOH.app.render();
    document.getElementById('mine').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function render() {
    document.body.classList.toggle('employee-preview', !!S.previewEmployee);
    $('previewModeLabel').textContent = t(S.previewEmployee ? 'previewEmployee' : 'previewManager');
    $('previewToggle').textContent = t(S.previewEmployee ? 'previewManagerButton' : 'previewEmployeeButton');
    $('previewPersonRow').hidden = !S.previewEmployee;
    $('previewHelp').hidden = !S.previewEmployee;
    $('previewHelp').textContent = t(S.previewCountDemo ? 'countDemoHelp' : 'previewEmployeeHelp');
    $('previewCountDemo').hidden = !S.previewEmployee;
    $('previewCountDemo').textContent = t(S.previewCountDemo ? 'countDemoStop' : 'countDemoButton');
    $('previewDemoNote').hidden = !S.previewCountDemo;
    if (!S.previewEmployee) return;
    const select = $('previewPerson');
    select.replaceChildren();
    staff().forEach((person) => {
      const role = S.tpl.roles.find((r) => r.id === person.role);
      const option = FOH.view.el('option', '', person.name + (role ? ' · ' + role.name : ''));
      option.value = person.id; option.selected = S.me.staffId === person.id; select.append(option);
    });
  }
  function init() {
    $('previewCountDemo').addEventListener('click', () => S.previewCountDemo ? stopCountDemo() : startCountDemo());
    document.addEventListener('click', (event) => { if (event.target.closest('button[data-act=demo-count]')) startCountDemo(); });
    $('previewToggle').addEventListener('click', () => S.previewEmployee ? leave() : enter());
    $('previewPerson').addEventListener('change', (event) => choose(event.target.value));
  }
  FOH.isSectionAllowedForRole = isSectionAllowedForRole;
  FOH.preview = { init, render, sections, enter, leave, choose, startCountDemo, stopCountDemo, isSectionAllowedForRole };
})(window.FOH = window.FOH || {});
