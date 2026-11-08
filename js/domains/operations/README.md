# Operations Lifecycle Domain (js/domains/operations)

## Overview
Restaurant business hours, service lifecycle stages, operational day states, and closing department workflows. Computes late-night business dates crossing midnight in Amman time, coordinates Last Order triggers, and controls formal shift closing procedures.

## Interface
- `FOH.opsLifecycle.loadOpsConfig`: Retrieves business hours, shift periods, and Last Order offsets `[ops-lifecycle.js:loadOpsConfig]`
- `FOH.opsLifecycle.saveOpsConfig`: Saves updated operating schedule and shift configurations `[ops-lifecycle.js:saveOpsConfig]`
- `FOH.opsLifecycle.toBizMinutes`: Normalizes 24-hour clock times into continuous business minutes relative to opening `[ops-lifecycle.js:toBizMinutes]`
- `FOH.opsCloseDialog.openCloseRestaurantDialog`: Launches the restaurant closing checklist and sign-off dialog `[ops-close-dialog.js:openCloseRestaurantDialog]`
- `FOH.hoursSettings.render`: Administrative interface to configure opening, closing, and service buffer hours `[hours-settings.js:render]`

## Invariants
- Late night service crossing midnight belongs to the previous calendar date's business day until service close `[ops-lifecycle.js:toBizMinutes]`
- Restaurant closing requires completion of mandatory closing department checklists or managerial override `[ops-close-dialog.js:openCloseRestaurantDialog]`

## Side Effects
- Mutates `super-employee.opsConfig.v2` in `localStorage` `[ops-lifecycle.js:saveOpsConfig]`
- Mutates `super-employee.opsDayState.v1` in `localStorage` `[ops-lifecycle.js:saveOpsDayState]`
- Broadcasts operational lifecycle events (`LAST_ORDER_TRIGGERED`, `RESTAURANT_CLOSED`) via Supabase Realtime `[ops-lifecycle.js:createLastOrderButtons]`

## Verification
- Run: `node --test tests/*.test.mjs`

