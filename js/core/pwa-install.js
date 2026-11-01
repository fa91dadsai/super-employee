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
      document.querySelector('main').prepend(box);
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
