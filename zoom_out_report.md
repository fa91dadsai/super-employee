# Stage 5 Initial Zoom Out Review Report: `foh_fast_service_cockpit.md`

**Target:** `c:/Users/fadia/Downloads/erp-platform/foh-opening/docs/designs/foh_fast_service_cockpit.md` (`Lines 1-273`)

## Reviewer Status

| Reviewer | Status |
| :--- | :--- |
| `egm-zoom-out` | completed |
| `egm-inventive-catalyst` | completed |

---

## Executive Summary & Severity Breakdown

* 🔴 **Blocker**: 2
* 🟡 **Major**: 3
* 🟢 **Nit**: 2

The design introduces a compelling operational focus for high-tempo restaurant service (<42px footprint, tactile emergency replenishment), but suffers from two systemic domain collisions:
1. Gating immediate daily shift tips against what is actually a weekly Hamilton-apportionment pool in the existing codebase (`super-employee.tips.v1`).
2. Introducing synchronous, multi-device P2P handshakes that inadvertently cause staff hostage situations at shift end and incentivize staff to share 4-digit PINs.
Furthermore, the proposal duplicates existing architectural components (creating a new rolling lease engine instead of leveraging `section-claims.js`, and creating an isolated FSM instead of extending `ops-lifecycle.js`).

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Weekly Tip Pool vs. Immediate Shift-Run Tip Distribution Mismatch - Severity: Blocker
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 25, 54, 109-115, 153-155, 248 (`tips-store.js` integration & CUJ 3)
* **Discrepancy Description**: The design dictates that completing a shift handshake *"immediately unlocks the outgoing waiter's exact integer-fils tip wallet"* (lines 25, 54, 113) and gates `tips-store.js` so tip runs cannot transition to `distributed` without an accepted handshake log (line 248). However, across the actual codebase (`foh-opening/js/domains/tips/tips-store.js` and `tips-calc.js`), tip management operates exclusively as a **weekly pool** (`super-employee.tips.v1`, `weekLabel: '2026-W44'`, points allocation, weekly advance ledgers) calculated at week close via Hamilton apportionment. There is no daily per-shift wallet payout or shift-run distribution state in `foh-opening`.
* **Rationale & Recommendation**: Gating weekly tip calculations on individual shift handovers creates an irreconcilable domain mismatch and breaks the tip calculation engine.
  * **Recommendation**: Reposition the handover gate strictly to **Shift Cash Drawer Float & Daily Advances** (e.g., verifying closing cash float reconciliation and automatically writing any mid-shift cash advance/withdrawal into `tips-store.js:addAdvance`). Tip pool distribution should remain bound to the weekly payroll cycle unless a full shift-based tip redesign is formally specified.

---

### 2. Synchronous P2P Handshake Gridlock & PIN-Sharing Anti-Pattern - Severity: Blocker
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Lines 123-155 (Sequence Diagram), Lines 142-150, Lines 181-199 (`foh-opening.handshakeLog.v1`)
* **Discrepancy Description**: Mandating synchronous real-time confirmation (Path A: P2P Supabase Realtime across 2 active phones) or synchronous single-device PIN entry (Path B), combined with a 15-minute tardy penalty before manager override (Path C), creates operational deadlock. In peak hospitality shifts, outgoing staff cannot wait 15 minutes for a busy manager when the incoming colleague is delayed in transit or changing uniform. Staff under pressure to catch transport will inevitably bypass the security barrier by verbally sharing their 4-digit personal PINs (*"Hey, enter my PIN so I can leave"*), destroying the security boundary.
* **Rationale & Recommendation**: Systemic contradiction between **fraud prevention** and **operational velocity**.
  * **Inventive Catalyst Resolution (Asynchronous Optimistic Sealing with Dispute Grace Period)**:
    1. Outgoing staff submits the 3-point micro-audit and closing float, immediately placing the shift run into an optimistically sealed state (`status: 'provisional_sealed'`) with a timestamped cryptographic hash.
    2. The incoming colleague (or floor captain) is granted a 30-minute grace period upon clocking in to audit the station and either tap "Acknowledge" or "Dispute Discrepancy" (e.g., float variance, unwashed glassware).
    3. If undisputed within 30 minutes, the state auto-transitions to `finalized`. If disputed, a manager alert is flagged with the exact audit delta. This eliminates shift-end hostage situations and renders PIN sharing unnecessary.

---

### 3. Duplicate Station Lease Engine vs. Existing Section Claims Architecture - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 24, 36, 67, 169-180, 242 (`station-ownership.js` & `foh-opening.stationLeases.v1`)
* **Discrepancy Description**: The proposal creates a brand new module `station-ownership.js` and storage key `foh-opening.stationLeases.v1` featuring 30-minute rolling leases, touch-heartbeat listeners, and proxy delegation. However, `foh-opening/js/domains/shifts/section-claims.js` already provides a production-tested section claiming engine (`foh-opening.claims.v1` and `/v1/foh-opening/runs/claim-section`) that binds on-duty staff to restaurant sections for the duration of the operational shift.
* **Rationale & Recommendation**: Violates YAGNI and codebase reuse. Running parallel 30-minute keepalive leases introduces timer overhead, risk of lease expiration while a waiter is actively engaged with guests, and redundant storage structures.
  * **Recommendation**: Drop `station-ownership.js` and `foh-opening.stationLeases.v1`. Extend the existing `section-claims.js` (`foh-opening.claims.v1`) by adding an `exclusiveOrderAuthority: boolean` flag to the section claim record. The section claim already represents station ownership.

---

### 4. Hard Order Exclusivity vs. Floor Replenishment Velocity - Severity: Major
* **Reviewer Lens:** `egm-inventive-catalyst`
* **Affected Scope:** Lines 24, 49, 72, 96, 245 (`canUserOrderForStation` guard in `orders-store.js`)
* **Discrepancy Description**: Restricting replenishment to the designated Station Owner and routing non-owner requests through a "1-tap proxy confirmation" creates severe service bottlenecks. If the Station Owner is occupied decanting wine or taking an extensive order at a 10-top table, a secondary waiter or barback who notices empty napkins or water carafes cannot place an emergency order without interrupting the owner. This trades duplicate orders for floor paralysis.
* **Rationale & Recommendation**: Systemic contradiction between **order deduplication** and **autonomous execution**.
  * **Inventive Catalyst Resolution (Item-Level Cooldown Debouncing over Hard Permission Locks)**:
    - Allow any authorized FOH staff member assigned to that section to trigger a 2-tap replenishment.
    - When an item is ordered (e.g., "+2 Napkins"), that item immediately enters a 10-minute "Dispatched / En Route" cooldown badge visible across all devices for that station (*"Dispatched 2m ago by Sara · Runner en route"*).
    - If another waiter taps the item within the cooldown window, the UI provides a "+1 Additional" modifier rather than generating a duplicate ticket. This solves duplicate orders at the data layer without blocking floor staff.

---

### 5. Orthogonal FSM Lifecycle Colliding with Existing Sheet & Ops Lifecycle - Severity: Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 22, 58-117, 160-168, 241 (`cockpit-state.js` & `foh-opening.cockpitPhase.v1`)
* **Discrepancy Description**: The proposed `cockpit-state.js` introduces a three-state machine (`PRE_SERVICE`, `LIVE_COCKPIT`, `POST_SERVICE`) stored in `foh-opening.cockpitPhase.v1`. However, `foh-opening` already tracks operational lifecycle through two distinct mechanisms: `sheet-state.js` (`opening`, `mid`, `closing`) and `ops-lifecycle.js` (`serviceStage`: pre-service, service, closing). Introducing a third independent lifecycle FSM creates synchronization hazards (e.g., when a user switches to mid-shift or opens the blind inventory sheet, does `cockpitPhase` conflict with `activeSheetType`?).
* **Rationale & Recommendation**: Avoid state proliferation. Unify the cockpit lifecycle into `ops-lifecycle.js` and `sheet-state.js`. Treat the "Fast Cockpit" as a presentation mode (`viewMode: 'checklist' | 'cockpit'`) within the existing service stage rather than an isolated top-level state machine.

---

### 6. Cryptographic Receipt Buzzword Claims - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 54, 68, 243 (`mutual-handshake.js`)
* **Discrepancy Description**: The document repeatedly claims to generate a *"cryptographic receipt"* upon handover completion. However, the data model specified in `foh-opening.handshakeLog.v1` is a standard JSON record with string timestamps and boolean audit flags, with no asymmetric key infrastructure or verification endpoints.
* **Rationale & Recommendation**: Eliminate speculative terminology. Replace "cryptographic receipt" with "tamper-evident audit record" using an idempotent hash (`SHA-256(runKey + timestamp + outgoingUser + incomingUser + cashFloatFils)`) written to the existing Supabase outbox queue.

---

### 7. Hardcoded Quick-Depletion Tiles vs. Dynamic Catalog Reuse - Severity: Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Line 246 (`orders-view.js` milestone 2)
* **Discrepancy Description**: The plan hardcodes 8 quick depletion items (Napkins, Glasses, Ice, Citrus, Straws, Cutlery, Sanitizer, Paper) directly into the view drawer, bypassing the dynamic catalog architecture in `orders-catalog-data.js` and `orders-store.js`.
* **Rationale & Recommendation**: Add a `isQuickReplenish: true` attribute to item definitions in `orders-catalog-data.js` rather than hardcoding static IDs into `orders-view.js`. This allows management to tailor quick-replenishment items per department (bar vs. floor) without modifying UI view code.

---

## Actionable Recommendations for Stage 6 Refinement

1. **Re-align Tips Integration**: Restrict shift handover verification to closing cash float and shift advance reconciliation in `tips-store.js:addAdvance`; do not attempt daily tip pool payouts.
2. **Shift to Asynchronous Handover**: Replace synchronous multi-device P2P/PIN gating with optimistic sealing and a 30-minute dispute grace window.
3. **Consolidate on Section Claims**: Drop `station-ownership.js` and leverage `section-claims.js` (`foh-opening.claims.v1`).
4. **Replace Proxy Locks with Cooldown Debouncing**: Debounce emergency replenishment items with station-wide en-route badges instead of hard user blocks.
5. **Merge Lifecycle States**: Fold cockpit presentation modes into `ops-lifecycle.js` rather than creating `cockpitPhase.v1`.

