# FOH Core Services (js/core)

## Overview
Foundational runtime infrastructure for the Front of House (FOH) opening application. Provides reactive bilingual localization (Arabic/English), safe JSON parsing and XSS escaping, centralized local storage abstractions, mobile modal selection dialogs, time and schedule calculations in Asia/Amman timezone, and PWA installation prompts.

## Interface
- `FOH.security.escapeHtml`: HTML control character escaping preventing XSS injection `[security.js:escapeHtml]`
- `FOH.security.safeJsonParse`: Crash-proof JSON parser with strict fallback resolution `[security.js:safeJsonParse]`
- `FOH.security.debounce`: Function call debouncing utility for search inputs `[security.js:debounce]`
- `FOH.i18n.t`: Translation lookup with parameter interpolation and fallback `[i18n.js:t]`
- `FOH.i18n.extend`: Dictionary registration for lazy-loaded module translations `[i18n.js:extend]`
- `FOH.i18n.setLang`: Language switching between Arabic (`ar`) and English (`en`) updating document dir `[i18n.js:setLang]`
- `FOH.store`: LocalStorage wrapper managing schema keys, migrations, and cache busting `[state.js:FOH.store]`
- `FOH.DEFAULT_SECTIONS`: Default checklist sections (Bar, Floor, Back area) `[state.js:DEFAULT_SECTIONS]`
- `FOH.modalPicker.open`: Full-screen/sheet mobile picker dialog `[modal-picker.js:open]`
- `FOH.schedule`: Time formatting, shift boundary calculations, and Amman date resolution `[time.js:schedule]`
- `FOH.pwa`: Service worker registration and deferred installation prompt hooks `[pwa-install.js:pwa]`
- `FOH.preview`: Interactive preview and role-permission scoping evaluator `[preview-demo.js:preview]`

## Invariants
- All dynamic strings rendered into innerHTML must pass through `FOH.security.escapeHtml` `[security.js:escapeHtml]`
- Safe JSON parse never throws exceptions, always returning structured fallbacks on corrupted storage `[security.js:safeJsonParse]`
- Language toggle must synchronously update `document.documentElement.lang` and `document.documentElement.dir` (`rtl` vs `ltr`) `[i18n.js:setLang]`
- Operational timestamps and business dates must resolve to Jordanian local time (`Asia/Amman`) `[time.js:toIso]`

## Side Effects
- Mutates `document.documentElement.dir` and `document.documentElement.lang` on language switch `[i18n.js:setLang]`
- Reads and writes application state in browser `localStorage` and `sessionStorage` `[state.js:store]`
- Registers Service Worker `/sw.js` and listens to `beforeinstallprompt` `[pwa-install.js:init]`

## Verification
- Run: `node --test tests/*.test.mjs`

