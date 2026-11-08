# Stage 6 Comprehension Test Report: `foh_fast_service_cockpit.md`

## What the Document Proposes
The document proposes re-architecting the `foh-opening` Front of House mobile web application into a tri-phase operational state machine (`PRE_SERVICE`, `LIVE_COCKPIT`, and `POST_SERVICE`) featuring an ultra-compact status bar under 42px to eliminate scroll fatigue during peak restaurant service. During live service, floor replenishment ordering is restricted to designated Station Owners holding rolling 30-minute keepalive leases to prevent duplicate orders. At shift close, the system enforces a mutual two-party handshake (via Supabase Realtime broadcast or offline PIN relay on a single device) verifying cash float, surfaces, and trash before sealing the shift run and releasing integer-fils tip distribution.

## How the Existing System Works
Per this document, the existing `foh-opening` progressive web app renders opening checklists, closing chores, operational lifecycle controls, and large inventory catalogs into a single, continuous vertical scroll column exceeding 1500px. Under peak service pressure, waitstaff experience severe scroll fatigue and cognitive friction, leading them to abandon the app and place duplicate supply orders. Furthermore, outgoing staff can unilaterally roll over incomplete chores to the next shift and leave without two-party verification of station cleanliness, trash disposal, or cash drawer floats.

---

## Comprehension Findings

### 🔴 Blocker

1. **Architectural Contradiction on Non-Owner Order Handling & Undefined Proxy Confirmation Workflow**
   - **Affected Scope**: Lines 49, 96, 245, 262
   - **Discrepancy Description & Rationale**: Line 49 states: *"If a non-owner attempts the request, the UI routes it to the Station Owner for 1-tap proxy confirmation."* However, Line 96 states the drawer is *"Owner Only"*, Line 245 states `orders-store.js` injects `canUserOrderForStation()` to *"enforce single Station Owner order exclusivity"*, and Line 262 instructs to *"reject non-owner order mutations"*. A reader cannot know whether the drawer is hidden/disabled for non-owners, rejected outright on submission, or routed to the Station Owner. If routed, there is zero specification of the data contract, storage key, notification channel, or UI interaction for that proxy confirmation.
   - **Recommendation**: Reconcile this behavior. If replenishment ordering is strictly disabled/rejected for non-owners, remove the claim that requests are routed for proxy confirmation. If proxy confirmation is supported, define the pending request lifecycle, data contract, and channel.

2. **Unspecified Cross-Device Station Lease Synchronization and Offline Collision Model**
   - **Affected Scope**: Lines 24-26, Lines 169-180, Line 242, Line 259
   - **Discrepancy Description & Rationale**: The document states staff use personal mobile devices (Lines 230-231) and that the system guarantees 100% offline-first functionality (Line 26). However, `foh-opening.stationLeases.v1` is specified only as a client `localStorage` dictionary (Lines 169-180). There is no explanation of how Device B learns that Device A claimed a station, what happens when two offline waiters claim the same station, or how leases are synchronized across devices. Without a multi-device lease synchronization and conflict resolution protocol, station exclusivity cannot function.
   - **Recommendation**: Define how station lease claims and keepalives are broadcast between devices (e.g., Supabase Realtime channel for leases) and specify the offline conflict rule (e.g., earliest timestamp wins, or station ownership requires online verification).

3. **Inconsistent FSM State Lifecycle Names and Missing Terminal Phase in Storage Schema**
   - **Affected Scope**: Lines 84-117, Lines 159-168, Line 241
   - **Discrepancy Description & Rationale**: The state diagram (Lines 84-117) defines four states: `PRE_SERVICE_SETUP`, `LIVE_FAST_COCKPIT`, `POST_SERVICE_CLOSE`, and `SHIFT_FINALIZED`. In contrast, the TypeScript interface `CockpitPhaseState` (Line 162) and the implementation matrix (Line 241) define only three: `'PRE_SERVICE' | 'LIVE_COCKPIT' | 'POST_SERVICE'`. The terminal state `SHIFT_FINALIZED` is completely absent from the persistence schema, and the state string constants diverge between the diagram and the code contracts.
   - **Recommendation**: Harmonize state names across the document (diagram, types, and file matrix). If `SHIFT_FINALIZED` is a persistent state, add it to the `CockpitPhaseState.phase` union type; if it is transient, document how the state machine resets or transitions back to `PRE_SERVICE`.

---

### 🟡 Major

4. **Vague Cryptographic Handshake Receipt Specification**
   - **Affected Scope**: Lines 54, 68, Lines 181-199, Line 243
   - **Discrepancy Description & Rationale**: The document states that upon acceptance, the system *"writes the cryptographic receipt"* (Lines 54, 243) and Line 140 references a `signature`. However, `HandshakeRecord` in Section 4 (Lines 181-199) has no `receipt`, `signature`, or `hash` field. There is no explanation of what cryptographic primitive is used (e.g., HMAC-SHA256, asymmetric Web Crypto signature, or SHA-256 digest), what data is signed, or how it is validated offline.
   - **Recommendation**: Define the receipt field within `HandshakeRecord` (e.g., `receiptHash: string` or `signature: string`) and document the hashing algorithm and payload schema.

5. **Undefined Runner Call Trigger Behavior and Outbox Contract Omission**
   - **Affected Scope**: Line 45, Line 97, Lines 201-209, Line 249
   - **Discrepancy Description & Rationale**: The document highlights a 1-tap "Runner Call" emergency trigger in the live cockpit. Line 97 indicates it produces a 15ms haptic alert, but does not define who receives the alert or how. Furthermore, in `OutboxAction.type` (Line 204: `'HANDSHAKE_COMPLETED' | 'ORDER_EMERGENCY' | 'STATION_LEASE_ACQUIRED'`), there is no `RUNNER_CALL` action type. A developer cannot know if this is a networked alert or an inert button with local vibration.
   - **Recommendation**: Define the recipient, delivery mechanism (e.g., Supabase Realtime broadcast or outbox action), and add `RUNNER_CALL` to `OutboxAction.type` if it must be queued for sync.

6. **Assumed Prerequisites and Security Gaps in Single-Device Offline PIN Relay**
   - **Affected Scope**: Lines 37-38, Line 146
   - **Discrepancy Description & Rationale**: The document states that the incoming employee's 4-digit PIN hash is validated offline against cached hashes in `foh-opening.authAccountsData` within "client encrypted local storage" (Lines 37, 146). Standard browser PWAs do not provide encrypted `localStorage`. Furthermore, caching all staff PIN hashes on peer personal devices poses brute-force risks for 4-digit PINs (10,000 combinations) unless salt and key derivation are specified, and the document never explains how peer PIN hashes are provisioned or updated.
   - **Recommendation**: Explain how peer accounts data is populated on the device and reference the encryption/hashing mechanism used to safeguard PINs in offline storage.

7. **Undefined "Disputed" Handshake Flow and Manager Authentication Protocols**
   - **Affected Scope**: Line 92, Lines 147-150, Line 188, Line 197
   - **Discrepancy Description & Rationale**: `HandshakeRecord.status` lists `'disputed'` as a possible state (Line 188), but there is zero description of how an incoming receiver disputes a handover, what UI exists for it, or what happens to the shift run and tips when disputed. Additionally, "Manager Bypass" and "Manager Emergency Override" are described without explaining how manager authentication is verified on a waiter's device (e.g., manager PIN, role token, or password).
   - **Recommendation**: Document the dispute path and describe the authentication mechanism required for manager overrides.

---

### 🟢 Nit

8. **Undefined Domain Terms: "CEEN / Oasis", "Super Waiter", and "Captain Proxy"**
   - **Affected Scope**: Lines 11, 42, 177, 244
   - **Discrepancy Description & Rationale**: The document introduces "CEEN / Oasis", "Super Waiter", and "Captain proxy" without definition. In Line 244, the test plan mentions testing "lease expiration auto-proxy", but the document never specifies how the system resolves which Captain receives the automatic proxy delegation.
   - **Recommendation**: Add a brief inline note defining CEEN / Oasis (operating venue), clarify whether "Super Waiter" is an official role or senior staff member, and describe how captain proxy assignment is resolved.

9. **Incomplete Section 1 Component Directory Tree vs File Changes Matrix**
   - **Affected Scope**: Lines 62-77, Lines 249-254
   - **Discrepancy Description & Rationale**: Section 1's architecture tree only shows files under `shifts/`, `orders/`, `tips/`, and `sw.js`. It omits `foh-opening/js/domains/navigation/bottom-bar.js` and `foh-opening/index.html`, which are listed as modified in the implementation matrix.
   - **Recommendation**: Add `navigation/bottom-bar.js` and `index.html` to the Section 1 tree diagram for full structural alignment.

10. **Undefined Global Context in Code Snippet (`S.date`)**
    - **Affected Scope**: Line 153
    - **Discrepancy Description & Rationale**: Line 153 references `runKey: S.date + '|' + shiftType`. For a new reader, `S` is an unstated global variable.
    - **Recommendation**: Clarify what `S` represents (e.g., `window.FOH_STATE` or `activeShift.date`).

