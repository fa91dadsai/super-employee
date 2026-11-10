# Front of House (FOH) Opening & Operations Blueprint

## System Overview
Mobile-first Progressive Web Application (PWA) designed for high-tempo restaurant and bar front-of-house operations at CEEN / Oasis. Provides offline-first opening/closing checklists, blind inventory counts, daily supply orders with role-scoped catalogs, integer-fils tip pool distribution, live multi-device shift synchronization via Supabase Realtime, and municipal health certificate governance.

## Local Interface & Invariants
- `sw.js`: Service Worker caching application shell and domain modules `[sw.js:CACHE]`
- `index.html`: Entrypoint shell providing Fluent / Material 3 styling tokens, bilingual viewport configuration, and root DOM containers `[index.html]`
- Invariant: Service worker cache version (`CACHE = 'super-employee-v65-cloud-outbox-and-seed-decomp'`) must be incremented whenever CSS or JS distribution assets are modified to prevent stale asset serving `[sw.js:CACHE]`
- Invariant: App shell precaches all core scripts and domain modules to ensure 100% offline functionality `[sw.js:PRECACHE]`
- Invariant: Fast Service Cockpit provides $\le 42\text{px}$ compact bar, 10-minute debounced 2-tap emergency replenishment, and Asynchronous Optimistic Shift Sealing with SHA-256 audit digests `[js/domains/shifts/shift-sealing.js]`
- Side Effect: Caches static responses in browser `CacheStorage` and intercepts fetch requests with network-first API bypass and cache-first static strategy `[sw.js:handleFetch]`

## Subdirectories & System Boundaries
- [Client Application Layer (js)](./js/README.md): Shared foundational services (`core`) and 16 modular operational domains (`domains`).

## Global Invariants
- **Role-Based Access Control (RBAC)**: View transitions and sensitive management actions are strictly bounded by `ROLE_APP_IDENTITY.allowedViews` and active role permissions (`super_manager`, `super_captain`, `super_bartender`, `super_waiter`, `staff`) `[js/domains/shifts/role-identity.js]`.
- **DOM XSS Sanitization**: All dynamic data rendered into the DOM must pass through `FOH.security.escapeHtml` or DOM node creation methods `[js/core/security.js]`.
- **Integer Currency Math**: All tip calculations, advances, and payouts are calculated in integer fils (`1 JOD = 1000 fils`) using Hamilton's largest-remainder apportionment with zero rounding drift `[js/domains/tips/tips-calc.js]`.
- **Asia/Amman Timezone & Late-Night Business Dates**: Service shifts crossing midnight are unified under the opening business date until operational close `[js/core/time.js, js/domains/operations/ops-lifecycle.js]`.
- **Mobile Touch Containment**: Interactive buttons nested inside clickable cards must call `e.stopPropagation()`, and mobile bottom containers must observe safe-area offsets `[js/domains/navigation/sidebar-nav.js]`.

## Global Side Effects
- **Client Storage**: Persists application state, session tokens, audit logs, and photo blobs across `localStorage`, `sessionStorage`, and `IndexedDB`.
- **Cloud Synchronization**: Connects to Supabase REST endpoints (`https://jncnbwwhjmouxptqfjaz.supabase.co`) and maintains persistent WebSocket realtime connection for cross-device event broadcasting.
- **Hardware & OS APIs**: Interacts with `Notification` Web API for push alerts and `navigator.vibrate` for 1-tap haptic responses.

## System Verification
- Run: `node --test tests/*.test.mjs`

