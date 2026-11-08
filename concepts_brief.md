# Concept Brief: FOH Fast-Service Cockpit & Tactile Shift Flow
Author: FadiAyoub
Date: 2026-11-08
Status: Reviewed

## Executive Summary
Front of House (FOH) service staff abandon opening and closing checklists during peak service hours because crowded multi-tab navigation, vertical scrolling, and detached forms impose excessive friction while handling guest tables. This proposal re-architects the mobile PWA interface into a tri-phase "Fast-Service Cockpit". It enforces strict operational separation between Pre-Service setup, Live-Service emergency replenishment, and Post-Service mutual handovers. By pairing station-scoped ordering rights with 1-tap incoming-receiver handshakes and instant tip calculations, the app transitions from a passive checklist into a tactile shift companion designed for single-handed mobile operation under heavy service volume.

## Analysis

### 1. Operational Contradictions & Empirical Field Failures
* **Primary Contradiction (Accountability vs. Service Velocity):**  
  Management mandates 100% itemized compliance on prep, cleanliness, inventory replenishment, and float balances. However, floor staff carrying drink trays under 40-table peak rushes abandon multi-step forms, leading to unilateral checklist spoofing and chaotic uncoordinated replenishment orders sent to the bar/store.
* **Secondary Contradiction (Exclusivity vs. Availability):**  
  Restricting live replenishment ordering to a single Station Owner eliminates duplicate requisitions, but introduces a single-point-of-failure bottleneck when that designated lead is pinned down serving high-touch VIP guests or taking a mandatory meal break.
* **Tertiary Contradiction (Verification Integrity vs. Shift Continuity):**  
  Gating shift close and tip distribution on an incoming receiver's mutual handshake eliminates fraudulent self-signoffs, but risks operational gridlock if the incoming staff member is delayed in transit, absent, or working offline in a dead-zone terrace.
* **Empirical Root Failures in `foh-opening`:**  
  1. *Vertical Stacking & Scroll Fatigue:* Checklist sections, scheduled tasks, operational lifecycle bars, and order catalogs currently stack into >1500px vertical scroll containers, forcing staff to scroll past morning prep items just to report depleted lemons or broken glassware during service.
  2. *Unilateral Rollover Spoofing:* In `js/domains/shifts/shift-handover.js`, the existing `rolloverTasksToNextShift()` allows an outgoing waiter to dump uncompleted duties into `foh-opening.midTemplate` or `foh-opening.closingTemplate` without incoming staff validation, unlocking exit without accountability.
  3. *Uncoordinated Order Spray:* Any user with role access in `js/domains/orders/orders-store.js` can independently submit replenishment lines, causing duplicate store runs during peak hours.

---

### 2. Multi-Lens Synthesis Across the 7 Specialized Lenses

#### Lens 1: UX, Ergonomics & Tactile Service Design (`egm-design`)
* **Cockpit Dimensioning & Control Footprint:**  
  - The Cockpit top bar must not exceed 42px height, preserving maximum screen area for live station alerts.
  - Must honor mobile safe areas: `padding-bottom: calc(var(--tab-bar-height, 68px) + env(safe-area-inset-bottom, 16px))` to eliminate tab-bar button occlusion.
* **Thumb-Zone Optimization for Single-Hand Operation:**  
  - Primary emergency action (Runner Call) positioned in the bottom-right tactile hot zone (bottom-left for Arabic RTL mode).
  - Emergency replenishment uses a 2-tap gesture: Tap 1 opens a drawer with top 8 depletion items (Napkins, Glassware, Ice, Citrus, Straws, Cutlery, Sanitizer, POS Paper); Tap 2 fires a fixed pre-configured replenishment unit (e.g., "+2 Trays Glasses").
* **Sensory Confirmation & Dim-Light Parity:**  
  - Incorporate distinct haptic feedback pulses: short click (`15ms`) on selection, confirmation buzz (`[20ms, 50ms, 20ms]`) on handshake acceptance, double error pulse (`[50ms, 100ms, 50ms]`) on rejected handover.
  - High-contrast visual tokens adhering to Obsidian Noir palette (`#0d1117` base, `#161b22` cards, `#e6edf3` typography, `#388bfd` / `#2ea043` accents) guaranteeing legibility under ambient restaurant lighting (<20 lux).

#### Lens 2: Codebase Architecture & Static Invariants (`egm-codebase-details`)
* **Module Allocation & Line Budgets:**  
  - Avoid bloating existing `section-claims.js` (130 lines) and `shift-handover.js` (285 lines). Introduce three focused modules under `foh-opening/js/domains/shifts/`:
    1. `cockpit-state.js` (<80 lines per sub-function): Implements the tri-phase state machine.
    2. `station-ownership.js` (<80 lines per sub-function): Manages station ownership claims, lease expiries, and proxy overrides.
    3. `mutual-handshake.js` (<80 lines per sub-function): Challenge-response handshake verification and tip ledger unlocking.
* **Storage Schema & Key Isolation:**  
  - State persisted locally under atomic keys with version suffixes:
    - `foh-opening.cockpitPhase.v1`: `{ phase: 'pre' | 'live' | 'post', stationId: string, timestamp: number }`
    - `foh-opening.stationLeases.v1`: `{ [stationId]: { ownerUsername: string, claimedAt: string, expiresAt: string, proxyDelegatedTo?: string } }`
    - `foh-opening.handshakeLog.v1`: `{ [runKey]: { outgoingUser: string, incomingUser: string, status: 'pending' | 'accepted' | 'overridden', timestamp: string, authType: 'p2p' | 'pin_relay' | 'manager_override' } }`
* **Zero Exception Silencing & Safe String Interpolation:**  
  - All dynamic data rendered via `FOH.escapeHtml()` or `el()` DOM factory.
  - Every `try/catch` block must explicitly document quota fallbacks (e.g., `/* Storage quota fallback: retain in-memory state */`).

#### Lens 3: Systems Thinking & Network Resilience (`egm-zoom-out`)
* **Offline-First PWA Resilience:**  
  - Handshake transactions and replenishment dispatches must execute optimistically against local CacheStorage and `localStorage`.
  - An outbox replay queue stores signed actions (`actionId: crypto.randomUUID()`) to be broadcast over Supabase Edge Functions (`/v1/foh-opening/runs/handshake`) once network reconnects.
* **Split-Shift & Multi-Station Reconciliation:**  
  - Tip calculations in `js/domains/tips/tips-calc.js` operate strictly on integer fils via the largest-remainder Hamilton method (`distributeFils`).
  - Outgoing shift tips cannot be paid out until the handshake is sealed; however, if a waiter worked across two stations, their accrued share is isolated into distinct station sub-ledgers to prevent cross-station dispute cascades.

#### Lens 4: Floor Psychology & Ergonomics (`egm-comprehension`)
* **Elimination of Input Friction:**  
  - Zero form typing during service. Station owner identity, station ID, active business date, and shift window are automatically bound from session context (`FOH.sessionAuth.getSession()`).
* **Mitigating Anti-Social Collusion & Exit Bullying:**  
  - Senior outgoing staff could coerce novice incoming staff into tapping "Accept Handover" without inspecting messy stations or uncounted floats.
  - *Countermeasure:* The incoming handshake screen displays an active 3-point micro-audit checklist (Cash Float Verified, Station Surfaces Sanitized, Trash Emptied) requiring 3 separate toggles before the handshake confirmation button becomes active.

#### Lens 5: Implementation Readiness & FSM State Transition Matrix (`egm-implementation-readiness`)
* **Finite State Machine (FSM) Lifecycle:**  
  ```
  [PRE_SERVICE_SETUP] 
         │
         ▼ (Gate: 100% Critical Opening Items Checked OR Manager Bypass)
  [LIVE_FAST_COCKPIT] 
         │
         ▼ (Gate: Operating Hours Past Last Order OR Active Station Tables Closed)
  [POST_SERVICE_CLOSE] 
         │
         ▼ (Gate: Mutual Handshake Accepted OR Manager Emergency Override)
  [SHIFT_FINALIZED_TIPS_UNLOCKED]
  ```
* **State Transition Predicates & Fallbacks:**  
  1. `PRE_SERVICE` -> `LIVE_COCKPIT`: Enforced by verifying `S.run.checked` covers all `isCritical === true` tasks in the claimed station.
  2. `LIVE_COCKPIT` -> `POST_SERVICE`: Activated automatically when `nowBiz >= kLastBiz` (Kitchen Last Order) from `FOH.opsLifecycle.toBizMinutes()`, or manually triggered by the Station Owner.
  3. `POST_SERVICE` -> `HANDOVER_COMPLETE`: Requires dual validation: incoming receiver confirmation token AND zero unacknowledged station rollover tasks.

#### Lens 6: Domain-Driven Architectural Integrity (`egm-structural`)
* **Strict Domain Decoupling:**  
  - Presentation views (`orders-view.js`, `checklist/view.js`) must never directly modify lease or handshake state.
  - `station-ownership.js` exposes pure query and command APIs:
    - `claimStation(stationId, username): { ok: boolean, error?: string }`
    - `getStationOwner(stationId): string | null`
    - `delegateProxy(stationId, proxyUsername, durationMinutes): boolean`
    - `canUserOrderForStation(stationId, username): boolean`
  - `orders-dispatch.js` must validate `canUserOrderForStation()` before queuing an order payload. Non-owners are greeted with an inline prompt: *"Order routed to Station Lead [Name] for 1-tap confirmation"*.

#### Lens 7: Inventive Contradiction Resolutions (TRIZ Innovations) (`egm-inventive-catalyst`)
* **TRIZ Principle 15 (Dynamism / Dynamic Leases & Proxy Delegation):**  
  *Problem:* Station Lead becomes unreachable or overwhelmed, blocking replenishment.  
  *Resolution:* Station ownership is managed as an active lease with a 30-minute keepalive heartbeat. If the lead does not interact with the cockpit for >20 minutes, floor captains receive an amber alert on their device allowing 1-tap proxy assumption of ordering rights.
* **TRIZ Principle 28 (Mechanics Substitution / Dual-Mode Handshake Protocol):**  
  *Problem:* Incoming shift receiver has no phone, dead battery, or is disconnected from WiFi.  
  *Resolution:* Dual-Path Verification:
  - *Path A (Device-to-Device P2P / Realtime):* Incoming receiver taps "Accept Handshake" on their own mobile app via Supabase Realtime broadcast.
  - *Path B (Single-Device PIN Relay):* If incoming receiver has no device, the outgoing waiter turns their phone around; incoming staff enters their personal 4-digit employee PIN directly into a shielded keypad on the outgoing device, cryptographically signing the local handshake receipt.
* **TRIZ Principle 10 (Prior Action / Incremental Station Handoff):**  
  *Problem:* Handover at 02:00 AM causes long delays while outgoing staff wait for incoming staff to inspect the entire floor.  
  *Resolution:* Pre-closing tasks (e.g. glassware polishing, side-station restocking) can be submitted for verification individually starting 45 minutes prior to shift end. When shift end arrives, only live floor status remains to be reviewed.

---

### 3. Risk Matrix, Failure Modes & Edge Case Safeguards

| Failure Mode / Edge Case | Likelihood | Impact | Architectural Mitigation Policy |
| :--- | :--- | :--- | :--- |
| **Incoming Receiver No-Show / Tardy** | High | Critical | **Manager Proxy Sign-off Gate:** If incoming staff has not checked in 15 minutes after shift change, `super_captain` or `super_manager` can execute a "Manager Handover Override". Outgoing tips are unlocked, but the action is flagged in `foh-opening.signoffs.v1` with mandatory reason logging. |
| **Station Owner Mid-Service Phone Failure** | Medium | High | **Captain Instant Revoke:** Any floor captain can revoke station lease from their master cockpit and reassign ownership to an alternate waiter in 1 tap. |
| **Offline Split Handshake (No Internet)** | High | Medium | **Cryptographic Local Token:** Handshake stored with local signature (`outgoingStaffId + incomingStaffId + timestamp + SHA256`). Replayed idempotently via `outbox` on next connection without delaying tip payout. |
| **Disputed Cash Float / Drawer Deficit** | Low | High | **Contested Handover State:** If incoming receiver flags a cash float discrepancy during handshake, the status enters `disputed`. Tips remain locked specifically for that station drawer while the manager is notified via local audible alarm. |

---

### 4. Direct Invariants for Next Implementation Step
1. **Header Footprint Invariant:** Total vertical header real-estate across all three phases must remain $\le 42\text{px}$.
2. **Order Exclusivity Invariant:** `orders-store.js` shall reject any line addition where `session.username !== stationOwner && !isManager && !isProxy`.
3. **Tip Distribution Invariant:** `tips-store.js` shall not transition a run key to `distributed` unless `handshakeLog[runKey].status === 'accepted'` or explicit `manager_override` exists.
4. **Clean Code Invariant:** No single sub-renderer function in new cockpit modules shall exceed 80 lines; all dynamic variables must pass through `FOH.escapeHtml()`.

## Goals vs. Non-Goals
* **In-Scope Goals:**
  - Strict tri-phase UI state machine: Pre-Service Opening -> Live-Service Cockpit -> Post-Service Close & Handover.
  - Station Ownership access control restricting live replenishment requests to designated section leads.
  - 1-tap mutual incoming-receiver handshake mechanism for shift handover and tip unlocking (P2P or PIN Relay).
  - Compact mobile cockpit layout (<42px control header footprint, safe-area offsets, no scroll fatigue).
  - Integer-fils tip ledger reconciliation with zero rounding drift across shift participants.
  - Full offline-first operation across Android and iOS devices via PWA CacheStorage and local replay queue.
* **Out-of-Scope Non-Goals:**
  - Kitchen production line recipe scaling or prep scheduling.
  - Direct credit card payment terminal processing at guest tables.
  - Central payroll ledger disbursement outside of restaurant shift accounting.

## Alternatives Weighed
- *Alternative 1: Unrestricted ordering for all on-duty waiters.* Rejected by author: Creates severe order duplication in the bar and store during rush hours when multiple staff notice depleted supplies simultaneously.
- *Alternative 2: Unilateral waiter self-signoff for shift handover.* Rejected by author: Incentivizes rushed, unverified sign-offs to unlock tip shares before catching transport home without checking cash float or cleanliness.
- *Alternative 3: Continuous single-page checklist during service hours.* Rejected by author: Waiters ignore phones entirely when forced to scroll through completed opening tasks to find live actions.

## Key Decisions & Staging for Next Steps
- Decision 1: Restrict live replenishment ordering to the single assigned station owner with 30-min keepalive leases.
- Decision 2: Mandate a dual-mode handshake confirmation (P2P real-time broadcast OR Single-Device PIN Relay) from the incoming shift receiver before finalizing handover and unlocking tip distribution.
- Decision 3: Segment the application interface into 3 discrete operational phases (Pre-Service, Live Cockpit, Post-Service Handover).
- Staging: Advance through `/egm-draft` to formalize the full technical specification under `docs/designs/foh_cockpit_flow.md`.
