# Shifts Domain (js/domains/shifts)

## Overview
Shift lifecycle management across the three operational shifts (Opening, Mid-Shift, Closing). Manages role-based identity definitions, dynamic permissions matrix, department section claiming by on-duty staff, shift handovers, and manager sign-off gates.

## Interface
- `FOH.roleIdentity.getCurrentSuperRoleKey`: Resolves user's operational role (`super_manager`, `super_captain`, `super_bartender`, `super_waiter`, `staff`) `[role-identity.js:getCurrentSuperRoleKey]`
- `FOH.roleIdentity.hasSuperPerm`: Checks granular permission flags against active role matrix `[role-identity.js:hasSuperPerm]`
- `FOH.roleIdentity.canCurrentUserAccessOrders`: Evaluates ordering authorization based on role delegation `[role-identity.js:canCurrentUserAccessOrders]`
- `FOH.threeShifts.switchSheetType`: Switches active checklist view between `opening`, `mid`, and `closing` `[three-shifts-nav.js:switchSheetType]`
- `FOH.sectionClaims.injectSectionClaims`: Records and renders an employee claiming responsibility for a department during the shift `[section-claims.js:injectSectionClaims]`
- `FOH.signoffGate.renderSignoffCard`: Displays shift sign-off status and manager closure approvals `[signoff-gate.js:renderSignoffCard]`
- `FOH.shiftHandover.openHandoverModal`: Opens shift handover log dialog between departing and incoming teams `[shift-handover.js:openHandoverModal]`
- `FOH.shiftSealing.sealShift`: Asynchronously seals shift handover with tamper-evident SHA-256 audit digest, cash float reconciliation, and optional petty cash advances `[shift-sealing.js:sealShift]`
- `FOH.shiftSealing.acknowledgeSeal`: Incoming receiver acknowledges sealed shift within 30-minute grace window `[shift-sealing.js:acknowledgeSeal]`
- `FOH.shiftSealing.disputeSeal`: Records dispute alert on cash float or station cleanliness for managerial audit `[shift-sealing.js:disputeSeal]`

## Invariants
- Shift sheet switching resets checklist run state to the respective shift template `[sheet-state.js:switchSheetType]`
- Section claims are mutually exclusive per department for the duration of the operational shift `[section-claims.js:saveClaims]`
- Shift sign-off requires 100% completion of mandatory tasks or explicit managerial PIN override `[signoff-gate.js:renderSignoffCard]`
- Shift seals are tamper-evident with SHA-256 digest and 30-minute incoming dispute window `[shift-sealing.js:sealShift]`

## Side Effects
- Mutates `foh-opening.activeSheetType` and section claims in `localStorage` `[sheet-state.js:persistCurrentSheetState]`
- Mutates `foh-opening.signoffs.v1` upon completing shift sign-off `[signoff-gate.js:saveSignoffs]`
- Mutates `foh-opening.shiftSeals.v1` and broadcasts shift seal/dispute events over Realtime `[shift-sealing.js:sealShift]`

## Verification
- Run: `node --test tests/*.test.mjs`

