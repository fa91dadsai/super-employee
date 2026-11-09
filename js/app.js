// Installable app (PWA): registers the service worker, asks the browser to
// keep this app's data, and shows an install guide until the app is installed:
// an "Install" button on Android, step-by-step help on iPhone/iPad.
(function (FOH) {
  'use strict';

  const { t } = FOH.i18n;
  const HIDE_KEY = 'foh-opening.installHiddenUntil';
  const HIDE_DAYS = 14;
  let deferred = null; // Android's install prompt, kept for the button

  FOH.i18n.extend({
    en: {
      installTitle: 'Install the app',
      installText: 'Opens full screen, works without internet, and later sends you reminders.',
      installBtn: 'Install',
      iosSteps: '1. Tap Share ⬆︎ at the bottom of Safari\n2. Choose “Add to Home Screen” ➕\n3. Open the app from its new icon',
      iosNotSafari: 'On iPhone, open this page in Safari to install it.',
      later: 'Later',
    },
    ar: {
      installTitle: 'ثبّت التطبيق',
      installText: 'يفتح بملء الشاشة، ويعمل بلا إنترنت، ويرسل لك التنبيهات لاحقًا.',
      installBtn: 'تثبيت',
      iosSteps: '1. اضغط زر المشاركة ⬆︎ أسفل Safari\n2. اختر «إضافة إلى الشاشة الرئيسية» ➕\n3. افتح التطبيق من أيقونته الجديدة',
      iosNotSafari: 'على iPhone افتح هذه الصفحة في Safari لتثبيتها.',
      later: 'لاحقًا',
    },
  });

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIOSSafari = () => isIOS() && !/crios|fxios|edgios|opios/i.test(navigator.userAgent);
  const hidden = () => Number(localStorage.getItem(HIDE_KEY) || 0) > Date.now();

  function card() {
    let box = document.getElementById('installCard');
    if (!box) {
      box = document.createElement('section');
      box.id = 'installCard';
      box.className = 'card install-card';
    }
    return box;
  }

  // Draw (or remove) the install guide for this device.
  function render() {
    const box = card();
    const showAndroid = !!deferred;
    const showIOS = isIOS() && !isStandalone();
    box.hidden = isStandalone() || hidden() || !(showAndroid || showIOS);
    if (box.hidden) return;
    const { el, btn } = FOH.view;
    box.replaceChildren();
    const head = el('div', 'install-head');
    const icon = el('img', 'install-icon');
    icon.src = 'icons/icon-192.png';
    icon.alt = '';
    const txt = el('div', 'install-txt');
    txt.append(el('b', '', t('installTitle')), el('span', '', t('installText')));
    head.append(icon, txt);
    box.append(head);
    if (showIOS) box.append(el('p', 'install-steps', isIOSSafari() ? t('iosSteps') : t('iosNotSafari')));
    const actions = el('div', 'install-actions');
    actions.append(btn('btn', t('later'), 'install-later', {}));
    if (showAndroid) actions.append(btn('btn primary', t('installBtn'), 'install-go', {}));
    box.append(actions);
  }

  async function onClick(e) {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    if (b.dataset.act === 'install-later') {
      localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 86400000));
    }
    if (b.dataset.act === 'install-go' && deferred) {
      deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
    }
    render();
  }

  function init() {
    // Service workers need http(s); opening the file directly skips this part.
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      if (window.caches) {
        caches.keys().then((ks) => ks.forEach((k) => {
          if (k !== 'super-employee-v21') caches.delete(k);
        })).catch(() => {});
      }
      navigator.serviceWorker.register('sw.js?v=18', { updateViaCache: 'none' }).then((reg) => {
        reg.update().catch(() => {});
      }).catch(() => {});
    }
    // Ask the browser not to clear this app's saved data (lists, counts, photos).
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      render();
    });
    window.addEventListener('appinstalled', () => {
      deferred = null;
      render();
    });
    card().addEventListener('click', onClick);
    render();
    document.getElementById('langBtn').addEventListener('click', () => setTimeout(render));
  }

  FOH.pwa = { init, render, isStandalone };
  document.addEventListener('DOMContentLoaded', init);
})(window.FOH = window.FOH || {});

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
  function sections() {
    if (!S.previewEmployee) return S.tpl.sections;
    const allowed = (role) => !role || role === S.me.role;
    return S.tpl.sections.map((sec) => ({ ...sec, items: sec.items.flatMap((it) => {
      if (!FOH.model.kids(it).length) return allowed(it.role) ? [it] : [];
      const children = it.children.filter((c) => allowed(c.role || it.role));
      return children.length ? [{ ...it, children }] : [];
    }) })).filter((sec) => sec.items.length);
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
  FOH.preview = { init, render, sections, enter, leave, choose, startCountDemo, stopCountDemo };
})(window.FOH = window.FOH || {});
