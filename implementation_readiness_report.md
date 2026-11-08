# Stage 9 Implementation Readiness Review Report: `foh_fast_service_cockpit.md`

**Target:** `c:/Users/fadia/Downloads/erp-platform/foh-opening/docs/designs/foh_fast_service_cockpit.md` (`Lines 233-273`)

## Reviewer Status

| Reviewer | Status | Focus / Lens |
| :--- | :--- | :--- |
| `egm-implementation-readiness` | completed | Execution clarity, actionable instructions, ambiguity elimination |
| `egm-codebase-details` | completed | Codebase alignment, file references, API contracts, dependency order |
| `egm-style` | completed | Specification hygiene, clean-code function budgets, bilingual i18n |

---

## Executive Summary & Severity Breakdown

* 🔴 **Blocker**: 4 findings
* 🟡 **Major**: 4 findings
* 🟢 **Nit**: 3 findings
* **Total Prioritized Findings**: 11

### Implementation Readiness Evaluation

Lines 233–273 provide a clear high-level roadmap (File Changes Matrix & 4 Milestones), but suffer from **critical execution blockers**:
1. **Unimplemented Stage 8 Architectural Pruning**: The plan was never updated to reflect the Stage 8 Simplification Blueprint (`intermediate_zoom_out_report.md`). It directs implementers to build discarded subsystems (`station-ownership.js`, 30-min keepalive leases, synchronous P2P Realtime / PIN Relay locks, and tip distribution locks), creating severe secondary technical debt.
2. **Fictitious Domain Invariants in `tips-store.js`**: Instructs implementers to gate non-existent "tip runs" and a non-existent `distributed` status. In reality, tip calculation in `foh-opening/js/domains/tips/` is strictly a **weekly pool** (`super-employee.tips.v1`) evaluated at week close via Hamilton's largest-remainder apportionment.
3. **Script Dependency Inversion in `index.html`**: Instructs loading the new shift modules *before* `app.js` (line 27), which precedes foundational domain scripts (`orders-store.js`, `role-identity.js`, `tips-store.js`, `cloud-sync.js`, loaded at lines 488–535). This will trigger instant fatal runtime `TypeError: Cannot read properties of undefined` in browser parsing.
4. **Missing Contracts & Signatures in `orders-store.js`**: Leaves key function signatures, station context resolution, and error contracts completely undefined for the implementer.

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Unimplemented Stage 8 Architectural Pruning (Plan Mandates Rejected Subsystems) - Severity: Blocker
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 239–248, Lines 257–268 (Section 1: File Changes Matrix & Section 2: Milestones 1–3)
* **Discrepancy Description**: The detailed implementation plan (Lines 233–273) directly contradicts the Stage 8 Simplification Blueprint established in `intermediate_zoom_out_report.md`. It explicitly directs the implementer to create:
  - `cockpit-state.js` (isolated FSM with `foh-opening.cockpitPhase.v1`)
  - `station-ownership.js` (30-min keepalive leases & proxy authorization)
  - Synchronous P2P Realtime and single-device PIN Relay in `mutual-handshake.js`
  - Tip run distribution gating in `tips-store.js`
  Stage 8 proved that these components introduce catastrophic secondary technical debt, credential-theft vectors, staff gridlock, and domain corruption. An implementer following this plan will construct the exact flawed, rejected architecture.
* **Rationale & Recommendation**: Reconcile the File Changes Matrix and Milestones with Stage 8:
  1. Remove `cockpit-state.js` and `station-ownership.js` from the file creation list. Fold presentation mode toggling (`viewMode: 'checklist' | 'cockpit'`) into `ops-lifecycle.js` / `sheet-state.js`, and leverage existing `section-claims.js` (`foh-opening.claims.v1`).
  2. Refactor `mutual-handshake.js` from synchronous P2P/PIN relay to Asynchronous Optimistic Sealing with a tamper-evident SHA-256 audit digest and 30-minute dispute window.
  3. Remove `tips-store.js` tip run gating; shift the financial gate strictly to cash drawer float and mid-shift petty cash advances via `tips-store.js:addAdvance`.
  4. In `orders-store.js`, replace hard station owner exclusivity with 10-minute cooldown debouncing per item.

---

### 2. Fictitious Tip Run Gating in `tips-store.js` Violates Weekly Pool Codebase Reality - Severity: Blocker
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** Line 248, Line 267 (Section 1: File Changes Matrix & Milestone 3)
* **Discrepancy Description**: Line 248 specifies: *"Enforces that tip runs cannot transition to `distributed` unless `handshakeLog[runKey].status === 'accepted'` or an explicit manager override is present."* In `foh-opening/js/domains/tips/tips-store.js`, there is no `tip runs` entity, no `distributed` lifecycle state, and no per-shift distribution. Tips are tracked exclusively as a weekly pool (`super-employee.tips.v1`, e.g. `2026-W44`) using Hamilton largest-remainder apportionment calculated at week close. Instructing an implementer to modify `tips-store.js` to block `distributed` transitions leaves them with an impossible instruction: the state, status column, and transitions do not exist.
* **Rationale & Recommendation**: Delete the `tips-store.js` distribution status lock instruction. In its place:
  - Specify that `shift-handover.js` reconciliation records cash float variances and issues optional cash advances/withdrawals via `FOH.tipsStore.addAdvance(employeeId, amountJOD, note, managerName)` to deduct petty cash from the employee's weekly allocation.

---

### 3. Script Dependency Inversion & Fatal Early Loading in `index.html` - Severity: Blocker
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** Line 251, Line 270 (Section 1: File Changes Matrix & Milestone 4)
* **Discrepancy Description**: Line 251 instructs: *"Adds script tags for `cockpit-state.js`, `station-ownership.js`, and `mutual-handshake.js` before `app.js`."* In `foh-opening/index.html`, `app.js` is loaded at line 27 (early checklist bootstrapping). In contrast, all foundational domain modules that the new scripts depend on—`sheet-state.js` (line 488), `section-claims.js` (line 489), `cloud-sync.js` (line 492), `orders-store.js` (line 501), `role-identity.js` (line 511), and `tips-store.js` (line 517)—are loaded near the bottom of `index.html` (lines 488–535). Injecting scripts before line 27 means they will execute before `FOH.ordersStore`, `FOH.roleIdentity`, `FOH.sectionClaims`, or `FOH.cloudSync` are defined on `window.FOH`, causing immediate runtime `TypeError: Cannot read properties of undefined` during browser parsing.
* **Rationale & Recommendation**: Correct the script loading order:
  - Move the new script tags to the bottom of `index.html`, immediately following `shift-handover.js` (line 532) and preceding `super-employee-init.js` (line 535).
  - Require cache-busting version query parameters (`?v=v...`) matching the existing script tags.

---

### 4. Missing Function Signatures, Parameters, and Error Contracts for `orders-store.js` Order Guard - Severity: Blocker
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Line 245, Line 262 (Section 1: File Changes Matrix & Milestone 2)
* **Discrepancy Description**: Line 245 instructs: *"Injects `canUserOrderForStation()` check into `addItem()` and order line mutations to enforce single Station Owner order exclusivity."* In `foh-opening/js/domains/orders/orders-store.js`, the existing mutation method `addItem(catKey, itemKey, unitKey, qty, note)` does not accept `stationId` or `username`. The plan omits critical implementation details:
  1. Does `addItem()` accept two new arguments, or does it dynamically resolve station ownership from `sessionAuth` and `sectionClaims`?
  2. What does `addItem()` do when the check fails? Does it throw an exception, return `{ success: false, reason: 'NOT_OWNER' }`, or fail silently?
  3. How do the caller modules (`orders-view.js`, `orders-view-items.js`) catch this rejection and what feedback is displayed to the user?
  Leaving these core architectural and API design decisions to the implementer invites diverging contracts.
* **Rationale & Recommendation**: Provide explicit, unambiguous function signatures and behavior:
  - In alignment with Stage 8, replace hard exclusivity with Cooldown Debouncing:
    `FOH.ordersStore.canQuickReplenish(itemKey, stationId)` returning `{ allowed: boolean, cooldownRemainingSec: number, lastOrderedBy: string }`.
  - In `addItem()`, if an item is within cooldown, increment the existing line quantity (`qty += 1`) rather than throwing an error or creating a duplicate line.

---

### 5. DOM Layout Disruption & Touch Hit-Box Collision in Fixed 5-Tab `bottom-bar.js` - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` / `egm-codebase-details`
* **Affected Scope:** Line 249 (Section 1: File Changes Matrix)
* **Discrepancy Description**: Line 249 states: *"Injects the 1-tap 'Runner Call' emergency trigger into the mobile thumb zone and ensures safe-area offset padding: `calc(var(--tab-bar-height, 68px) + env(safe-area-inset-bottom, 16px))`."* In `bottom-bar.js`, the bottom bar is a strictly structured 5-tab layout (`mine`, `dayoff`, `opening`, `tips`, `academy`) tailored to standard mobile viewport widths (360px–412px). Injecting a 6th button into the bar breaks flex spacing, pushes tab items off-screen, and violates minimum touch target sizes ($48\text{px}$). Furthermore, the plan does not specify the DOM hierarchy or whether "Runner Call" is a new route, a modal trigger, or an emergency FAB.
* **Rationale & Recommendation**:
  - Do NOT inject "Runner Call" into `TABS` array in `bottom-bar.js`.
  - Place "Runner Call" either:
    a) Inside the live cockpit header bar (`header-subbars.js` / `landing-hero.js`), or
    b) As a floating action button (FAB) anchored above the tab bar: `bottom: calc(var(--tab-bar-height, 68px) + 16px); right: 16px; width: 48px; height: 48px;`.
  - Specify the dispatch target: broadcasts event `{ type: 'RUNNER_CALL', stationId, timestamp }` over Supabase Realtime channel `foh_runner_alerts`.

---

### 6. Catalog Bypass & Lack of Department Scoping in Emergency Replenishment Drawer - Severity: Major
* **Reviewer Lens:** `egm-codebase-details` / `egm-style`
* **Affected Scope:** Line 246, Line 263 (Section 1: File Changes Matrix & Milestone 2)
* **Discrepancy Description**: Line 246 directs modifying `orders-view.js` to *"Embeds the 2-tap Emergency Replenishment drawer for the top 8 depletion items (Napkins, Glasses, Ice, Citrus, Straws, Cutlery, Sanitizer, Paper)"*.
  1. Hardcoding these 8 item strings directly inside `orders-view.js` violates clean code separation and bypasses the data-driven architecture of `orders-catalog-data.js` and `orders-store.js`.
  2. It ignores restaurant department boundaries: floor waitstaff do not replenish "Ice" or "Citrus" (handled by the bar), while bartenders do not replenish "Table Cutlery".
  3. Rendering in `orders/` is modularized across `orders-view.js`, `orders-view-items.js`, and `orders-view-review.js`. Modifying `orders-view.js` without specifying sub-component integration leaves file architecture ambiguous.
* **Rationale & Recommendation**:
  - Add `isQuickReplenish: true` and `dept: 'floor' | 'bar' | 'both'` to item definitions in `orders-catalog-data.js`.
  - In `orders-view-items.js` (or a dedicated $<80$ line sub-renderer `orders-quick-replenish.js`), filter items dynamically: `catalog.items.filter(it => it.isQuickReplenish && (it.dept === activeStationDept || it.dept === 'both'))`.

---

### 7. Vague Test Execution Environment & Missing Browser API Mocks in `tests/cockpit-flow.test.mjs` - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness` / `egm-codebase-details`
* **Affected Scope:** Line 244, Lines 260, 268, 273 (Section 1 & Milestone Sequence)
* **Discrepancy Description**: The plan specifies creating `tests/cockpit-flow.test.mjs` and executing it via `node --test foh-opening/tests/*.test.mjs`. In this codebase, tests run in pure Node.js via `vm.runInContext(code, sandbox)`. The modules scheduled for testing rely on browser-only APIs: `navigator.vibrate`, `window.localStorage`, `document.createElement`, `crypto.subtle`, and Supabase Realtime WebSockets. Without explicit sandboxing and mock fixtures provided in the plan, any test executing these modules in Node.js will fail immediately with `ReferenceError: navigator is not defined` or `ReferenceError: localStorage is not defined`.
* **Rationale & Recommendation**:
  - Provide actionable test harness instructions specifying the sandbox structure:
    ```javascript
    const sandbox = {
      window: {},
      document: mockDom(),
      localStorage: mockLocalStorage(),
      navigator: { vibrate: () => true },
      crypto: { subtle: webcrypto.subtle }
    };
    ```
  - Alternatively, architect the new modules so that pure business logic (state transitions, cooldown checks, audit digest generation) is decoupled from DOM/browser APIs and directly testable without full DOM mocking.

---

### 8. Omission of Arabic/English Localization Matrix & Dictionary Updates - Severity: Major
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Lines 241, 243, 246, 249 (Section 1: File Changes Matrix)
* **Discrepancy Description**: The plan introduces multiple user-facing UI controls (the $\le 42$px header bar, the 3-point micro-audit checklist, the 8-item replenishment drawer, and the Runner Call trigger). However, the File Changes Matrix omits `foh-opening/js/core/i18n.js` (or domain i18n modules) from the modification list, and provides zero translation keys or Arabic equivalents. In a bilingual restaurant application (Jordanian Dinars, Arabic/English staff), leaving translation keys undefined forces the implementer to hardcode English strings, violating the `arabic-rtl-i18n` workspace standard.
* **Rationale & Recommendation**:
  - Add `foh-opening/js/core/i18n.js` to the File Changes Matrix.
  - Specify the required translation key pairs:
    - `cockpit_open_station`: En: "Open Station for Service" / Ar: "فتح المحطة للخدمة"
    - `runner_call`: En: "Call Runner" / Ar: "نداء مساعد الخدمة"
    - `quick_replenish`: En: "Emergency Replenish" / Ar: "طلب إمداد سريع"
    - `micro_audit_float`: En: "Cash Float Verified" / Ar: "مطابقة رصيد الصندوق"
    - `micro_audit_surfaces`: En: "Surfaces Sanitized" / Ar: "تعقيم وتجهيز الطاولات"
    - `micro_audit_trash`: En: "Trash Emptied" / Ar: "تفريغ سلات المهملات"

---

### 9. Missing Function Budget Enforcement (<80 Lines) Across New Sub-renderers - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Lines 241–243, Lines 258, 263, 266
* **Discrepancy Description**: While Milestone 1 notes `cockpit-state.js (<80 lines per sub-renderer)`, the File Changes Matrix and Milestones 2 and 3 omit function size budget constraints for `mutual-handshake.js` and the additions to `orders-view.js`. In `.agents/rules/lessons-learned.md`, functions exceeding 80 lines trigger `code_health.py` lint failures.
* **Rationale & Recommendation**: Explicitly mandate in Milestones 2 and 3 that UI renderers in `mutual-handshake.js` and `orders-view.js` must be decomposed into modular sub-renderers strictly $<80$ lines.

---

### 10. Incomplete Rollback Plan and Service Worker Cache Invalidation Verification - Severity: Nit
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Line 250, Line 271 (Section 1: File Changes Matrix & Milestone 4)
* **Discrepancy Description**: Line 250 specifies bumping the cache name to `super-employee-v54-fast-cockpit` and adding 3 new files to `PRECACHE`. If any of the new module paths contain a typo or 404s, the service worker install event will abort completely, leaving existing clients on stale caches without error reporting. The plan specifies no verification of cache installation.
* **Rationale & Recommendation**: Add a verification step to Milestone 4: verify that the service worker installs and activates cleanly with zero precache 404s, and document a rollback cache version (`super-employee-v53-orders-rbac`).

---

### 11. Ambiguous Test Execution Command on Windows Environments - Severity: Nit
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** Line 273 (Milestone 4)
* **Discrepancy Description**: Line 273 specifies: `node --test foh-opening/tests/*.test.mjs`. In Windows Command Prompt (`cmd.exe`), wildcard glob expansion (`*.test.mjs`) is not natively expanded for Node.js arguments, which can cause Node to look for a literal file named `*.test.mjs` and fail.
* **Rationale & Recommendation**: Use standard npm test script invocation (`npm test --prefix foh-opening`) or enumerate files explicitly: `node --test foh-opening/tests/tips-calc.test.mjs foh-opening/tests/cockpit-flow.test.mjs`.

---

## Actionable Instructions for Detailed Implementation Plan Revision

To achieve 100% Implementation Readiness, lines 233–273 must be updated with the following reconciled matrix and milestones:

```markdown
### 1. Reconciled File Changes Matrix

| File Path | Action | Exact Actionable Instructions |
| :--- | :--- | :--- |
| `foh-opening/js/domains/shifts/shift-sealing.js` | Create | Implements Asynchronous Optimistic Sealing with SHA-256 tamper-evident digest, renders the 3-point micro-audit drawer (<80 lines), and manages the 30-min incoming dispute window in `foh-opening.claims.v1`. |
| `foh-opening/tests/cockpit-flow.test.mjs` | Create | Node.js unit tests with in-memory storage/sandbox asserting optimistic sealing hash generation, dispute flagging, and order cooldown debouncing. |
| `foh-opening/js/domains/orders/orders-catalog-data.js` | Modify | Adds `isQuickReplenish: true` and `dept: 'floor' | 'bar' | 'both'` to top 8 emergency items (Napkins, Glasses, Ice, Citrus, Straws, Cutlery, Sanitizer, Paper). |
| `foh-opening/js/domains/orders/orders-store.js` | Modify | Implements `canQuickReplenish(itemKey, stationId)` with 10-minute cooldown tracking and auto-increment quantity modifier. |
| `foh-opening/js/domains/orders/orders-view.js` | Modify | Embeds the 2-tap tactile replenishment drawer populated dynamically from `isQuickReplenish` items matching the station department. |
| `foh-opening/js/domains/operations/ops-lifecycle.js` | Modify | Adds `viewMode: 'checklist' | 'cockpit'` toggle state to eliminate scroll fatigue without creating a parallel FSM. |
| `foh-opening/js/domains/navigation/landing-hero.js` | Modify | Renders ultra-compact $\le 42\text{px}$ operational header bar with $\ge 48\text{px}$ touch bleed hit-box and 1-tap Runner Call alert button. |
| `foh-opening/js/core/i18n.js` | Modify | Adds Arabic and English translations for cockpit toggle, quick replenishment items, runner call, and micro-audit checklist. |
| `foh-opening/index.html` | Modify | Appends `<script src="js/domains/shifts/shift-sealing.js?v=v54"></script>` at line 533 (after `shift-handover.js` and before `super-employee-init.js`). |
| `foh-opening/sw.js` | Modify | Bumps `CACHE` to `'super-employee-v54-fast-cockpit'` and adds `shift-sealing.js` to `PRECACHE`. |
| `foh-opening/js/domains/shifts/README.md` | Modify | Documents `shift-sealing.js` exports, invariants, and side effects. |
| `foh-opening/README.md` | Modify | Updates the system blueprint overview with fast cockpit ergonomics. |
```

