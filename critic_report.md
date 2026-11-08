# Goldfish Critic Review Report: FOH Fast-Service Cockpit & Tactile Shift Flow

**Target:** `c:/Users/fadia/Downloads/erp-platform/foh-opening/docs/designs/foh_fast_service_cockpit.md` (`Lines 1-232`)

## Reviewer Status

| Reviewer | Status | Focus / Lens |
| :--- | :--- | :--- |
| `egm-design` | completed | UX Ergonomics, Mobile Touch, Tactile POS & Operational Workflows |
| `egm-structural` | completed | Architectural Layout, Clean Code, Data Stores & State Machines |
| `egm-style` | completed | Specification Standards, Clarity, Consistency & Bilingual Ergonomics |

## Severity Summary

- 🔴 **Blocker**: 2 findings
- 🟡 **Major**: 5 findings
- 🟢 **Nit**: 4 findings
- **Total Findings**: 11

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Offline PIN Hash Brute-Force & Credential Exposure - Severity: Blocker
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** `Lines 36-37, 145-146` (Section: Open Questions & Dual-Mode Handshake Verification Protocol)
* **Discrepancy Description**: The document resolves Single-Device PIN Relay by caching employee 4-digit PIN hashes in `authAccountsData` within client local storage (`foh-opening.authAccountsData`) and validating against it offline. Standard browser PWA `localStorage` is unencrypted at the OS/file-system level. A 4-digit PIN has only $10^4$ (10,000) possible permutations; storing unsalted or simply hashed PINs allows any user with physical access or script inspection to crack every staff member's PIN within milliseconds using a rainbow table or client console loop.
* **Rationale & Recommendation**: 
  1. Mandate PBKDF2/Argon2 key derivation using the Web Crypto API (`crypto.subtle`) with a unique per-user salt and $\ge 100,000$ iterations.
  2. Implement a strict client-side lock-out invariant: after 3 consecutive invalid attempts on a single device, lock PIN relay for 5 minutes and require a Manager PIN or online sync.
  3. Never store unsalted hashes of low-entropy 4-digit PINs in client-accessible storage.

---

### 2. Multi-Station Key Collision & Overwrite in Handshake Log - Severity: Blocker
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** `Lines 181-199` (Section: Storage Schemas & Invariant Contracts - `foh-opening.handshakeLog.v1`)
* **Discrepancy Description**: In `foh-opening.handshakeLog.v1`, `HandshakeRecord` specifies `runKey: string; // e.g. "2026-11-08|opening"`. In a restaurant floor setup with multiple stations (`dining-room`, `terrace`, `bar`, `lounge`), multiple station handovers occur during the identical shift run. If `handshakeLog` is keyed solely by `runKey`, closing the second station will clobber and overwrite the first station's sealed handshake log, micro-audit record, and cryptographic receipt.
* **Rationale & Recommendation**: 
  1. Define the composite primary key as `${runKey}:${stationId}` (e.g. `2026-11-08|opening:dining-room`).
  2. Update the TypeScript interface to explicitly define a dictionary keyed by this composite identifier:
     ```typescript
     interface HandshakeLogRegistry {
       [compositeRunKey: string]: HandshakeRecord;
     }
     ```

---

### 3. Incomplete Opening Checklist Items Stranded upon Cockpit Transition - Severity: Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** `Lines 43-45, 87-93` (Section: CUJ 1 & Operational Lifecycle FSM)
* **Discrepancy Description**: CUJ 1 specifies that when all items marked `isCritical: true` are completed, the user taps "Open Station for Service", causing the UI to transition from `PRE_SERVICE` to `LIVE_COCKPIT` and "all opening task cards collapse". In live restaurant operations, non-critical opening tasks (e.g., polishing reserve glassware, restocking menus, wiping service station ledges) often remain incomplete when doors open. If all cards collapse completely with zero designated entrypoint, staff are blocked from completing or reviewing these chores during service.
* **Rationale & Recommendation**: 
  1. Follow the workspace's explicit UX invariant from `.agents/rules/lessons-learned.md` (Rule 1: Collapsible Management Accordions).
  2. Wrap remaining non-critical checklist items into a collapsible `<details>/<summary>` drawer or accordion with a compact summary pill ($<38\text{px}$ height when collapsed) positioned below the 42px header, allowing staff to access remaining items without cluttering live-service controls.

---

### 4. Real-Time Proxy Order Routing Breakdown in Disconnected Mode - Severity: Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** `Lines 26, 49` (Section: Goals & CUJ 2: Live Peak Service Emergency Replenishment)
* **Discrepancy Description**: Line 49 states: *"If a non-owner attempts the request, the UI routes it to the Station Owner for 1-tap proxy confirmation."* However, Goal 5 (Line 26) guarantees 100% offline functionality. When floor devices are operating offline (e.g., basement wine cellar, patio dead zone, or network dropouts), real-time push routing between two devices is impossible. The non-owner waiter will be trapped in an unresolvable waiting state or face silent order failure.
* **Rationale & Recommendation**: 
  1. Provide a tactile offline fallback: if peer-to-peer broadcast fails or network status is offline, permit an immediate "Enter Station Owner PIN" modal directly on the requesting device to authenticate the replenishment order locally.
  2. Clarify whether proxy ordering is an *ahead-of-time delegation* (as indicated by `proxyDelegatedTo` in line 177) or an *interactive real-time routing* system. Align CUJ 2 with the offline-first mandate.

---

### 5. Unhandled Dispute & Rejection Flow in Handshake State Machine - Severity: Major
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** `Lines 103-117, 188` (Section: Operational Lifecycle FSM & HandshakeRecord Schema)
* **Discrepancy Description**: In `HandshakeRecord`, the status union includes `'disputed'`, yet the FSM state diagram (`state POST_SERVICE_CLOSE`) and the Sequence Diagram contain zero transition paths or resolution logic for a disputed handover. If the incoming waiter inspects the station and discovers a cash drawer shortage or uncleaned section and rejects the handover, the application enters an undefined state: the outgoing waiter cannot finalize their shift, and their tip wallet remains locked indefinitely without a documented escalation mechanism.
* **Rationale & Recommendation**: 
  1. Add an explicit `disputed` transition branch in the FSM diagram from `HandshakePending` to `HandshakeDisputed`.
  2. Specify the resolution workflow: outgoing staff can either rectify the cited checklist deficiency and re-submit, or trigger a "Manager Mediation Signoff" which appends a mandatory `disputeResolutionNote` and allows shift finalization.

---

### 6. Split-Brain Station Lease Expiration During Disconnected Operations - Severity: Major
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** `Lines 169-180` (Section: Storage Schemas & Invariant Contracts - `foh-opening.stationLeases.v1`)
* **Discrepancy Description**: The 30-minute rolling lease is renewed locally via screen interaction (`lastInteractionAt`). In a multi-device offline scenario, if Device A (Station Owner) is servicing tables in an offline zone, Device B (online or on another side of the room) will see Device A's lease expire at $T+30\text{min}$. If Staff B claims the station on Device B, two divergent Station Owners will exist concurrently. The specification lacks a conflict resolution contract for how the outbox queue reconciles conflicting `STATION_LEASE_ACQUIRED` actions when Device A reconnects.
* **Rationale & Recommendation**: 
  1. Introduce a monotonic lease epoch/generation counter (`leaseEpoch: number`) in `StationLeaseRegistry`.
  2. Define an outbox reconciliation invariant: when reconnecting, the server/sync engine validates whether a lease was actively renewed by physical touch before re-assigning ownership, or prompts the floor supervisor if a split-brain condition is detected.

---

### 7. Undeclared View Route Registration in `ROLE_APP_IDENTITY.allowedViews` - Severity: Major
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** `Lines 60-70, 83-117` (Section: Component Architecture & Lifecycle FSM)
* **Discrepancy Description**: Rule 2 of `.agents/rules/lessons-learned.md` mandates: *"RBAC Allowed Views Whitelist: Every view route must be explicitly registered in `ROLE_APP_IDENTITY.allowedViews` across all authorized roles in `role-identity.js`."* The document defines `LIVE_FAST_COCKPIT` as an operational state, but fails to specify whether it represents a new router view (e.g., `#cockpit` or `#fast-cockpit`) or an internal state of `#opening`. If implemented as a separate view, omitting its explicit registration across `super_waiter`, `super_captain`, `super_bartender`, and `super_manager` will trigger navigation guard blocks in production.
* **Rationale & Recommendation**: 
  1. Explicitly document whether `cockpit` is a top-level route (e.g. `window.location.hash = '#cockpit'`) or a conditional sub-view within `sheet-state.js`.
  2. If it is a route, explicitly list the exact additions required in `ROLE_APP_IDENTITY.allowedViews` for all eligible roles in `role-identity.js`.

---

### 8. Interactive Touch Target Ergonomics in $\le 42\text{px}$ Bar - Severity: Nit
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** `Lines 22, 44, 66` (Section: Goals & Architecture)
* **Discrepancy Description**: The spec mandates that the operational header bar be strictly $\le 42\text{px}$ high. While this succeeds in eliminating vertical scroll fatigue, standard touch ergonomics guidelines (WCAG 2.2 Success Criterion 2.5.8 and POS tactile UI rules) require a minimum touch target size of $44\text{px} \times 44\text{px}$ or $48\text{px} \times 48\text{px}$. Interactive buttons embedded directly inside a 42px bar risk high error rates when pressed with wet or greasy fingers in a fast-paced dining room.
* **Rationale & Recommendation**: 
  1. Specify that while the visible container height is $\le 42\text{px}$, any embedded touch controls (e.g., station dropdown, drawer pull toggle) must utilize bleed margins or an invisible pseudo-element (`::after`) extending the effective hit target to $\ge 48\text{px}$.

---

### 9. Inflexible Cash Float Requirement for Cashless / Floor Stations - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** `Lines 53-54, 190-195` (Section: CUJ 3 & `HandshakeRecord` Schema)
* **Discrepancy Description**: CUJ 3 and `HandshakeRecord` hardcode `cashFloatFils: number` and `microAudit.floatVerified: boolean`. In modern restaurant layouts, floor waiters and runners frequently do not carry cash drawers (cash handling is restricted to dedicated cashier stations or the main bar). Enforcing cash float input and verification for dining floor stations creates unnecessary friction and forces staff to enter dummy zero values.
* **Rationale & Recommendation**: 
  1. Update `cashFloatFils` to `cashFloatFils?: number | null` and make `microAudit.floatVerified` optional or conditioned on station capability (`hasCashDrawer: boolean`).

---

### 10. Missing Delivery Metadata & Exponential Backoff in Outbox Schema - Severity: Nit
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** `Lines 200-209` (Section: Storage Schemas - `foh-opening.outbox.v1`)
* **Discrepancy Description**: `OutboxAction` defines `actionId`, `type`, `payload`, `createdAt`, `attempts`, but lacks delivery tracking fields (`lastAttemptAt`, `status`, `idempotencyKey`). Without an explicit idempotency key and exponential backoff retry policy, replaying actions (especially emergency orders or handshake completions) after intermittent network drops risks firing duplicate requests to the backend.
* **Rationale & Recommendation**: 
  1. Expand `OutboxAction` to include `idempotencyKey: string`, `lastAttemptAt?: string`, and `status: 'pending' | 'processing' | 'failed' | 'dead_letter'`.

---

### 11. Omission of Bilingual Arabic/English Labels for Tactile Drawer & Handshake - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** `Lines 43-54, 73` (Section: CUJs & Component Architecture)
* **Discrepancy Description**: In accordance with the workspace's bilingual requirements (`arabic-rtl-i18n` and CEEN/Oasis FOH operational standards), the specification references English UI strings ("Open Station for Service", "Runner Call", "Accept Handover", "Napkins", "+2 Packs") without specifying their Arabic counterparts or RTL considerations.
* **Rationale & Recommendation**: 
  1. Include a short bilingual dictionary in the specification for the fast cockpit:
     - "Open Station for Service" -> `فتح المحطة للخدمة`
     - "Runner Call" -> `نداء رانر`
     - "Accept Handover" -> `استلام الوردية`
     - "Emergency Replenishment" -> `طلب تعويض طارئ`
     - "Float Verified" -> `مطابقة العهدة النقدية`

