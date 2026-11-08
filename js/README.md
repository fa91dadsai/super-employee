# FOH Client Application Layer (js)

## Overview
Client-side JavaScript architecture for Front of House (FOH) operations. Decomposed into shared foundational services (`core`) and domain-driven operational modules (`domains`). The root entry script (`app.js`) handles PWA lifecycle hooks and installation prompts.

## Local Interface & Invariants
- `FOH.pwa.isStandalone`: Detects whether app is running as installed standalone PWA `[app.js:isStandalone]`
- `FOH.pwa.render`: Renders platform-specific install instructions (Android prompt vs iOS Safari guide) `[app.js:render]`
- Invariant: Install prompt cards are suppressed if user previously clicked "Later" within the 14-day snooze window `[app.js:hidden]`
- Side Effect: Reads and writes dismissal timestamps to `localStorage` key `foh-opening.installHiddenUntil` `[app.js:render]`

## Subdirectories & Boundaries
- [Core](./core/README.md): Foundational runtime services including i18n localization, security escaping, safe JSON parsing, and state wrappers.
- [Domains](./domains/README.md): Domain-driven operational subsystems covering checklists, inventory, shifts, tasks, tips, orders, and cloud sync.

