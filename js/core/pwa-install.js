// foh-opening/js/core/pwa-install.js
// Installable App (PWA) Core: Registers Service Worker and manages install state.
// Decoupled from page flow: Renders in Profile Dialog, Notification Center, or modal on-demand.
(function (FOH) {
  'use strict';

  let deferredPrompt = null; // Stored beforeinstallprompt event

  if (FOH.i18n && FOH.i18n.extend) {
    FOH.i18n.extend({
      en: {
        installTitle: 'Install App on Device',
        installText: 'Run full-screen, offline-ready, and receive instant push updates.',
        installBtn: '📲 Install App',
        installInstalled: '✅ App is installed & running full-screen',
        installGenericGuide: 'To install: Tap your browser menu (⋮ or Share) and select “Add to Home Screen” ➕.',
        iosSteps: '1. Tap Share ⬆︎ at the bottom of Safari\n2. Choose “Add to Home Screen” ➕\n3. Open the app from its new home screen icon',
        iosNotSafari: 'On iPhone, open this page in Safari to install it to your home screen.',
        later: 'Later',
        close: 'Close',
      },
      ar: {
        installTitle: 'تثبيت التطبيق على الجهاز',
        installText: 'يعمل بملء الشاشة، بلا إنترنت، مع استقبال الإشعارات الفورية.',
        installBtn: '📲 تثبيت التطبيق الآن',
        installInstalled: '✅ التطبيق مثبت على الشاشة الرئيسية ويعمل بلا إنترنت',
        installGenericGuide: 'للتثبيت: من قائمة المتصفح (⋮ أو المشاركة) اختر «إضافة إلى الشاشة الرئيسية» ➕.',
        iosSteps: '1. اضغط زر المشاركة ⬆︎ أسفل متصفح Safari\n2. اختر «إضافة إلى الشاشة الرئيسية» ➕\n3. افتح التطبيق من أيقونته الجديدة على الشاشة',
        iosNotSafari: 'على iPhone افتح هذه الصفحة في Safari لتثبيتها على الشاشة الرئيسية.',
        later: 'لاحقًا',
        close: 'إغلاق',
      },
    });
  }

  const isStandalone = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true);
  const isIOS = () =>
    typeof navigator !== 'undefined' &&
    (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const isIOSSafari = () => isIOS() && !/crios|fxios|edgios|opios/i.test(navigator.userAgent);
  const canInstall = () => !isStandalone() && (!!deferredPrompt || isIOS());

  // Removes legacy intrusive card from <main> if present
  function removeIntrusiveCardFromMain() {
    const old = document.getElementById('installCard');
    if (old && old.parentElement && old.parentElement.tagName.toLowerCase() === 'main') {
      old.remove();
    }
  }

  // Renders the install section inside a dedicated container (e.g. Profile or Notif Center)
  function renderInstallSection(container) {
    if (!container) return;
    const { el } = FOH.view;
    const { t } = FOH.i18n;

    const wrap = el('div', 'pwa-install-section-wrap');
    wrap.id = 'pwaInstallSection';

    if (isStandalone()) {
      const okCard = el('div', 'install-standalone-badge');
      okCard.style.cssText =
        'display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--card, #fff);border:1.5px solid #10b981;border-radius:12px;margin:10px 0;font-size:0.84rem;color:#059669;font-weight:600;';
      okCard.innerHTML = '<span>📱</span> <span>' + t('installInstalled') + '</span>';
      wrap.append(okCard);
      container.append(wrap);
      return;
    }

    const card = el('div', 'card install-card');
    card.style.margin = '10px 0';

    const head = el('div', 'install-head');
    const icon = el('img', 'install-icon');
    icon.src = 'icons/icon-192.png';
    icon.alt = 'App Icon';
    icon.onerror = () => { icon.style.display = 'none'; };

    const txt = el('div', 'install-txt');
    txt.append(el('b', '', t('installTitle')), el('span', '', t('installText')));
    head.append(icon, txt);
    card.append(head);

    if (isIOS()) {
      const guideText = isIOSSafari() ? t('iosSteps') : t('iosNotSafari');
      card.append(el('p', 'install-steps', guideText));
    } else if (deferredPrompt) {
      const actRow = el('div', 'install-actions');
      const instBtn = el('button', 'btn primary', t('installBtn'));
      instBtn.type = 'button';
      instBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice.catch(() => null);
        deferredPrompt = null;
        render();
      });
      actRow.append(instBtn);
      card.append(actRow);
    } else {
      card.append(el('p', 'install-steps', t('installGenericGuide')));
    }

    wrap.append(card);
    container.append(wrap);
  }

  // Opens a clean dedicated modal on demand
  function openInstallModal() {
    let dlg = document.getElementById('pwaInstallModal');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'pwaInstallModal';
      dlg.className = 'sheet';
      dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
      document.body.append(dlg);
    }
    dlg.replaceChildren();

    const box = document.createElement('div');
    box.style.padding = '16px 18px 24px';
    const grab = document.createElement('div');
    grab.className = 'grab';
    box.append(grab);

    renderInstallSection(box);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.style.cssText = 'width:100%;margin-top:12px;';
    closeBtn.textContent = FOH.i18n.t('close');
    closeBtn.addEventListener('click', () => dlg.close());
    box.append(closeBtn);

    dlg.append(box);
    dlg.showModal();
  }

  async function promptInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => null);
      deferredPrompt = null;
      render();
    } else {
      openInstallModal();
    }
  }

  function render() {
    removeIntrusiveCardFromMain();
    const existing = document.getElementById('pwaInstallSection');
    if (existing && existing.parentElement) {
      const parent = existing.parentElement;
      existing.remove();
      renderInstallSection(parent);
    }
  }

  function init() {
    removeIntrusiveCardFromMain();

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      if (window.caches) {
        caches.keys().then((ks) => ks.forEach((k) => {
          if (!k.startsWith('super-employee-')) caches.delete(k);
        })).catch(() => {});
      }
      navigator.serviceWorker.register('sw.js?v=20', { updateViaCache: 'none' }).then((reg) => {
        reg.update().catch(() => {});
      }).catch(() => {});
    }

    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      render();
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      render();
    });

    const langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.addEventListener('click', () => setTimeout(render, 50));
  }

  FOH.pwa = {
    init,
    render,
    isStandalone,
    canInstall,
    prompt: promptInstall,
    promptInstall,
    renderInstallSection,
    openInstallModal,
  };

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window.FOH = window.FOH || {});
