# Stage 8 Intermediate Zoom Out Review Report: `foh_fast_service_cockpit.md`

**Target:** `c:/Users/fadia/Downloads/erp-platform/foh-opening/docs/designs/foh_fast_service_cockpit.md` (`Lines 1-273`)

## Reviewer Status

| Reviewer | Status | Focus / Lens |
| :--- | :--- | :--- |
| `egm-zoom-out` | completed | High-Level Architecture, YAGNI, Complexity Drift & Secondary Technical Debt |

---

## Executive Summary & Severity Breakdown

* 🔴 **Blocker**: 2 findings
* 🟡 **Major**: 4 findings
* 🟢 **Nit**: 3 findings
* **Total Prioritized Findings**: 9

### Executive Architectural Evaluation

The design specification (`foh_fast_service_cockpit.md`) targets a genuine operational pain point: FOH waitstaff carrying trays during peak service abandon a >1500px checklist page and place duplicate supply orders. The core ergonomics proposed—an ultra-compact $\le 42\text{px}$ status header, 2-tap tactile emergency replenishment, and 1-tap haptic confirmation—are well-targeted.

However, when evaluated against the existing codebase (`foh-opening/`) and previous review stages (Stage 5 Zoom Out, Stage 6 Comprehension, and Critic), the design exhibits severe **systemic complexity drift** and has accumulated **secondary technical debt**:

1. **The Distributed Systems Trap**: In attempting to solve edge cases (duplicate orders, staff leaving early), the document specified a complex distributed consensus engine (30-minute rolling keepalive leases, touch listeners, peer-to-peer Supabase Realtime broadcast between personal mobile phones, single-device offline PIN relay, and proxy authorization queues). Reviewers in Stages 6 and 7 responded by layering on even more distributed complexity: PBKDF2/Argon2 key derivation in WebCrypto, 100,000 hash iterations, monotonic lease epoch counters, split-brain reconciliation, and manager mediation tokens. For an offline-first PWA running on the personal smartphones of high-turnover restaurant waitstaff, this introduces catastrophic operational brittleness.
2. **Fundamental Domain Collisions**: The document repeatedly predicates shift closure on *"immediately unlocking the outgoing waiter's exact integer-fils tip wallet"*. In the actual codebase (`tips-store.js`, `tips-calc.js`), tip management is strictly a **weekly pool** (`super-employee.tips.v1`) calculated at week close via Hamilton largest-remainder apportionment. Daily shift payouts do not exist.
3. **Architectural Duplication (YAGNI)**: The design invents `station-ownership.js` and `foh-opening.stationLeases.v1` despite the fact that `foh-opening/js/domains/shifts/section-claims.js` (`foh-opening.claims.v1`) already handles section claiming and multi-device persistence. Similarly, it introduces `cockpit-state.js` as an orthogonal 3-state FSM (`foh-opening.cockpitPhase.v1`) when the system already maintains `sheet-state.js` and `ops-lifecycle.js`.

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Weekly Hamilton Tip Apportionment vs. Immediate Shift Payout Domain Collision - Severity: Blocker
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 25, 54, 109-115, 153-155, 248 (`tips-store.js` integration, FSM diagram, and CUJ 3)
* **Discrepancy Description**: The design dictates that a completed shift handover *"immediately unlocks the outgoing waiter's exact integer-fils tip wallet"* (Lines 25, 54, 113) and gates `tips-store.js` such that tip runs cannot transition to `distributed` without an accepted handshake log (Line 248). However, throughout `foh-opening/js/domains/tips/` (`tips-store.js`, `tips-calc.js`, `tips-view.js`), tip distribution operates exclusively as a **weekly pool** (`super-employee.tips.v1`, `weekLabel: '2026-W44'`, points allocation, hours aggregation, and mid-week withdrawals) calculated and audited at week close via Hamilton's largest-remainder apportionment algorithm. There is no daily per-shift wallet payout or shift-run tip distribution state in the platform.
* **Rationale & Recommendation**: Attempting to execute integer-fils tip distribution at the end of each shift creates an irreconcilable domain conflict:
  1. The total weekly tip pool, total worked hours, and staff attendance points are unknown mid-week; mathematical apportionment cannot be computed for a single shift in isolation.
  2. Gating weekly distribution on a single shift handover breaks weekly accounting audits.
  * **Recommendation**: Fully decouple shift handover from tip pool distribution. Restrict the shift handover financial gate exclusively to:
    a) **Cash Drawer Float Reconciliation**: Verifying that the base operational float (e.g., 100.000 JOD) matches the counted drawer cash.
    b) **Shift Cash Advances/Withdrawals**: If outgoing staff receive petty cash or a mid-shift transport advance, log it directly as a withdrawal via `tips-store.js:addAdvance` / `withdrawals`, which deducts from their final weekly allocation.

---

### 2. Synchronous Two-Party Handshake Gridlock & PIN Sharing Anti-Pattern - Severity: Blocker
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 123-155 (Sequence Diagram), Lines 142-150, Lines 181-199 (`foh-opening.handshakeLog.v1`)
* **Discrepancy Description**: The specification mandates synchronous dual-party verification: either Path A (P2P Supabase Realtime broadcast between two active smartphones) or Path B (Single-Device PIN Relay on the outgoing phone), with Path C imposing a 15-minute tardy penalty before permitting manager override. In live restaurant operations at 1:00 AM (after Last Order), outgoing staff have finished service and need to catch late-night public transport or ride-shares. If the incoming colleague is delayed in transit, changing uniform in the locker room, or has a dead battery, outgoing staff are held hostage. Under real-world pressure, staff will simply bypass the barrier by verbally sharing their personal 4-digit PINs (*"Enter 1234 for me so I can leave"*), completely destroying the security model. Furthermore, caching peer PIN hashes in client browser storage creates severe credential exposure on personal devices.
* **Rationale & Recommendation**: The mitigation attempted to solve unverified task rollover by introducing synchronous distributed locks, creating severe operational friction.
  * **Recommendation (Asynchronous Optimistic Sealing with 30-Minute Dispute Window)**:
    1. **Optimistic Sealing**: Outgoing staff submit the 3-point micro-audit and closing float, immediately placing the shift into `status: 'provisional_sealed'` with a local SHA-256 tamper-evident digest. Outgoing staff are freed to depart immediately.
    2. **Grace-Period Verification**: When incoming staff (or floor supervisor) clock in, the station displays a prominent acknowledgment banner with a 30-minute countdown window.
    3. **Resolution**: If incoming staff tap "Acknowledge" (or 30 minutes elapse with zero disputes), the shift auto-finalizes. If incoming staff detect a discrepancy (e.g., cash float short by 10 JOD, dirty terrace), tapping "Dispute" immediately flags an audit delta directly to the Manager's shift dashboard with both employee timestamps. This eliminates staff gridlock and removes all incentives for PIN sharing.

---

### 3. Redundant Station Lease Engine vs. Existing Section Claims Architecture - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 24, 36, 67, 169-180, 242 (`station-ownership.js` & `foh-opening.stationLeases.v1`)
* **Discrepancy Description**: The proposal specifies a brand new module `station-ownership.js` and storage key `foh-opening.stationLeases.v1` featuring 30-minute rolling leases, touch-heartbeat listeners, and proxy delegation. However, `foh-opening/js/domains/shifts/section-claims.js` already provides an operational, tested section claiming system (`foh-opening.claims.v1` and endpoint `/v1/foh-opening/runs/claim-section`) that binds on-duty staff to restaurant departments/sections for the duration of the operational shift.
* **Rationale & Recommendation**: Violates YAGNI and codebase reuse. Introducing parallel 30-minute keepalive leases creates timer overhead, battery drain on mobile devices, risk of lease expiration while a waiter is actively taking a guest's order, and synchronization split-brain when offline.
  * **Recommendation**: Prune `station-ownership.js` and `foh-opening.stationLeases.v1`. Leverage the existing `section-claims.js` (`foh-opening.claims.v1`). A section claim already designates the station lead for the shift.

---

### 4. Floor Replenishment Lockout Bottleneck vs. High-Velocity Service - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 24, 49, 72, 96, 245 (`canUserOrderForStation` guard in `orders-store.js`)
* **Discrepancy Description**: Restricting replenishment orders strictly to the designated Station Owner and routing non-owner requests through a "1-tap proxy confirmation" creates severe floor paralysis during rush service. If the Station Owner is occupied decanting wine or taking an extensive order at a 10-top VIP table, a secondary waiter, runner, or barback who notices empty napkins or water carafes is blocked from ordering. Waiting for proxy confirmation interrupts the lead and stalls service.
* **Rationale & Recommendation**: Systemic over-correction. Duplicate orders do not require hard user permission locks; they require visual state awareness and cooldown debouncing at the data layer.
  * **Recommendation (Item-Level Cooldown Debouncing over Hard Permission Locks)**:
    - Allow any authorized staff assigned to that section/department to trigger a 2-tap replenishment.
    - When an item is ordered (e.g., "+2 Napkins"), that item immediately enters a 10-minute "En Route" cooldown badge visible across all devices for that station (*"Dispatched 2m ago by Sara · Runner en route"*).
    - If another waiter taps the item within the 10-minute window, the UI provides a "+1 More" modifier rather than generating a duplicate order ticket. This eliminates duplicate orders at the data layer without blocking floor staff.

---

### 5. Triple State-Machine Proliferation (`cockpitPhase` vs `sheetState` vs `opsLifecycle`) - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 22, 58-117, 160-168, 241 (`cockpit-state.js` & `foh-opening.cockpitPhase.v1`)
* **Discrepancy Description**: The proposed `cockpit-state.js` introduces a three-state machine (`PRE_SERVICE`, `LIVE_COCKPIT`, `POST_SERVICE`) stored in `foh-opening.cockpitPhase.v1`. However, `foh-opening` already tracks operational lifecycle through two distinct mechanisms:
  1. `sheet-state.js`: `activeSheetType` (`opening`, `mid`, `closing`).
  2. `ops-lifecycle.js`: `super-employee.opsDayState.v1` (`serviceStage`: pre-service, service, closing).
  Introducing a third independent lifecycle FSM creates synchronization hazards: when a user switches to mid-shift or opens the blind inventory sheet, does `cockpitPhase` conflict with `activeSheetType`?
* **Rationale & Recommendation**: Avoid state proliferation. The "Fast Cockpit" is not an independent lifecycle entity; it is a **presentation view mode** (`viewMode: 'checklist' | 'cockpit'`) within the existing service stage.
  * **Recommendation**: Prune `cockpit-state.js` as an independent FSM. Fold the cockpit presentation mode into `ops-lifecycle.js` and `sheet-state.js`.

---

### 6. Inflexible Cash Float Invariant on Cashless Floor Stations - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 53-54, Lines 190-195 (`HandshakeRecord` Schema and CUJ 3)
* **Discrepancy Description**: CUJ 3 and `HandshakeRecord` hardcode `cashFloatFils: number` and `microAudit.floatVerified: boolean` as mandatory invariants for all station handovers. In modern restaurant layouts (and specifically Oasis/CEEN dining floor and terrace stations), floor waiters do not carry cash drawers. Cash handling is strictly consolidated at the central cashier desk or main bar terminal.
* **Rationale & Recommendation**: Forcing dining room and terrace waitstaff to verify cash floats forces staff to enter dummy zero values, desensitizing them to audit accuracy.
  * **Recommendation**: Make cash float verification conditional based on station metadata: `cashFloatFils?: number | null` and `microAudit.floatVerified` required only when `section.hasCashDrawer === true`.

---

### 7. Hardcoded Depletion Items vs. Catalog-Driven `isQuickReplenish` Metadata - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Line 246 (`orders-view.js` milestone 2)
* **Discrepancy Description**: The plan hardcodes 8 quick depletion items (Napkins, Glasses, Ice, Citrus, Straws, Cutlery, Sanitizer, Paper) directly into the view drawer, bypassing the catalog architecture in `orders-catalog-data.js` and `orders-store.js`.
* **Rationale & Recommendation**: Violates domain boundaries and clean code separation.
  * **Recommendation**: Add an `isQuickReplenish: true` flag to item objects in `orders-catalog-data.js`. The drawer will then dynamically render quick tiles filtered by department (bar vs. floor) without hardcoding IDs in UI presentation components.

---

### 8. Speculative "Cryptographic Receipt" Terminology vs. Idempotent Outbox Hash - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 54, 68, 243 (`mutual-handshake.js`)
* **Discrepancy Description**: The document uses the buzzword *"cryptographic receipt"*, but specifies only standard JSON objects with string timestamps and booleans. There is no asymmetric PKI or client public-key infrastructure in the PWA.
* **Rationale & Recommendation**: Speculative terminology confuses implementers.
  * **Recommendation**: Replace "cryptographic receipt" with "tamper-evident audit digest", defined as:
    `auditHash = SHA-256(`${runKey}:${stationId}:${sealedAt}:${outgoingUser}:${cashFloatFils}`)`
    stored in the audit log and queued in the existing Supabase outbox.

---

### 9. Minimum Touch Target Hit-Box Bleed on $\le 42\text{px}$ Container - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 22, 44, 66 (`<42px Footprint`)
* **Discrepancy Description**: The spec mandates that the operational header bar be strictly $\le 42\text{px}$ high. While excellent for eliminating vertical scroll fatigue, WCAG 2.2 Success Criterion 2.5.8 and tactile POS standards recommend touch targets $\ge 44\text{px} \times 44\text{px}$ or $\ge 48\text{px} \times 48\text{px}$ for wet or fast-moving restaurant environments.
* **Rationale & Recommendation**:
  * **Recommendation**: Specify that while the visual height of the bar container is $\le 42\text{px}$, any embedded touch buttons must use CSS pseudo-elements (`::after`) or bleed margins to ensure an effective interactive touch hit-box of $\ge 48\text{px}$.

---

## Secondary Technical Debt Analysis (Mitigations vs. New Fragilities Matrix)

| Original Problem | Proposed Mitigation (Design / Stage 5-7) | Secondary Technical Debt Introduced | Right-Sized Architectural Resolution (Stage 8) |
| :--- | :--- | :--- | :--- |
| **Duplicate Supply Orders** | 30-min keepalive leases, touch listeners, hard Station Owner exclusive ordering guard, proxy authorization routing. | Battery drain on mobile devices; accidental lease expiry during guest table service; floor paralysis when lead is busy decanting wine; proxy queue complexity. | **Item-Level Cooldown Debouncing**: Any on-duty section staff can order. Dispatched items display a 10-min "En Route" cooldown badge with "+1 More" modifier. No distributed locks. |
| **Unverified Task Rollover at Shift Close** | Synchronous P2P Realtime Handshake or Single-Device PIN Relay with 15-min tardy wait for manager override. | Shift-end gridlock; staff held hostage at 1:00 AM; staff sharing 4-digit PINs; caching peer PIN hashes in browser storage; Rainbow table attack vector. | **Asynchronous Optimistic Sealing**: Outgoing staff seal shift run with 3-point audit hash. Incoming staff (or supervisor) review within a 30-minute grace window; dispute flags audit delta directly to Manager. |
| **Weekly Tip Pool vs. Shift Close** | Gating `tips-store.js` distribution on handshake acceptance; "unlocking integer-fils tip wallet". | Complete domain breakage. Mid-week tip pool apportionment is mathematically impossible before total weekly hours and points are known. | **Decouple Tips from Shift Handover**: Restrict handover financial check to Cash Drawer Float and Petty Cash Advances/Withdrawals (`addAdvance`). Tip pool remains weekly. |
| **Scroll Fatigue (>1500px page)** | Independent 3-state FSM (`cockpitPhase.v1`) and dedicated `cockpit-state.js` coordinator module. | Triple-FSM desynchronization with existing `sheet-state.js` and `ops-lifecycle.js`; router/RBAC whitelist collisions. | **Tactile Presentation Mode**: Fold cockpit view toggle (`viewMode: 'checklist' | 'cockpit'`) into `ops-lifecycle.js` and `sheet-state.js`. Zero new storage keys. |
| **Offline Exclusivity Collisions** | Proposed Supabase Realtime channel arbitration, monotonic lease epochs, and split-brain resolution protocols. | High cognitive and maintenance overhead; distributed consensus logic in client PWA; fragile across mobile networks. | **YAGNI Prune**: Eliminate rolling leases entirely. Rely on existing `section-claims.js` for section accountability and data-layer cooldown for ordering. |

---

## Architectural Right-Sizing & Simplification Blueprint

### What to PRUNE (Eliminate Over-Engineering)
1. ❌ **Prune `station-ownership.js` & `foh-opening.stationLeases.v1`**: Completely redundant with `section-claims.js`.
2. ❌ **Prune 30-minute rolling keepalive timers and touch listeners**: Eliminates mobile timer drift and battery drain.
3. ❌ **Prune proxy confirmation queues for emergency orders**: Prevents floor service bottlenecks.
4. ❌ **Prune synchronous P2P Realtime Handshakes and client-side peer PIN caching**: Eliminates staff hostage situations and credential exposure.
5. ❌ **Prune shift-based tip pool payouts**: Preserves mathematical integrity of weekly Hamilton apportionment.
6. ❌ **Prune independent `cockpitPhase.v1` FSM**: Eliminates triple-state synchronization hazards.

### What to RETAIN & REFINE (High-Value Ergonomics)
1. ✅ **Ultra-Compact Status Bar ($\le 42\text{px}$ height)**: With $\ge 48\text{px}$ touch bleed hit-boxes for FOH speed.
2. ✅ **2-Tap Emergency Replenishment Drawer**: Dynamic catalog rendering via `isQuickReplenish: true` in `orders-catalog-data.js`.
3. ✅ **Tactile Haptic Feedback**: 1-tap confirmation with `navigator.vibrate(15)` and `navigator.vibrate([20, 50, 20])`.
4. ✅ **Collapsible Opening Checklist Drawer**: Wrapping non-critical opening items into a compact `<details>/<summary>` accordion so unfinished chores remain accessible without crowding the live service cockpit.
5. ✅ **Asynchronous Optimistic Shift Sealing**: Tamper-evident SHA-256 audit digest stored in `foh-opening.claims.v1` / outbox with a 30-minute incoming dispute window.

---

## Actionable Recommendations for Stage 9 Design Revision

1. **Update Architecture Diagram & Directory Tree**:
   - Remove `station-ownership.js` and `cockpit-state.js` from the file creation matrix.
   - Retain `mutual-handshake.js` (simplified to asynchronous optimistic sealing + dispute logging).
   - Add `isQuickReplenish: boolean` to `orders-catalog-data.js`.
2. **Re-align Shift Handover Contract**:
   - Change `HandshakeRecord` to `ShiftSealingRecord` keyed by `${runKey}:${stationId}`.
   - Make `cashFloatFils` nullable for cashless stations.
   - Replace synchronous P2P sequence diagram with Asynchronous Optimistic Sealing sequence diagram.
3. **Harmonize Lifecycle States**:
   - Replace `cockpitPhase.v1` with a `viewMode: 'checklist' | 'cockpit'` toggle managed within `ops-lifecycle.js`.
4. **Clean Code & Workspace Rules Compliance**:
   - Ensure all sub-renderers in `mutual-handshake.js` and `orders-view.js` remain strictly $<80$ lines.
   - Register any new route or view toggle in `ROLE_APP_IDENTITY.allowedViews`.
   - Ensure mobile bottom drawer reserves safe-area offset padding: `calc(var(--tab-bar-height, 68px) + env(safe-area-inset-bottom, 16px))`.

