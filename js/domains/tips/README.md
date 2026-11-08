# Tips Domain (js/domains/tips)

## Overview
Weekly tip pool distribution, integer fils math engine, staff eligibility points calculation, advances/withdrawals ledger, and individual staff payout wallet view. Guarantees zero-fils rounding drift using Hamilton's largest-remainder apportionment algorithm.

## Interface
- `FOH.tipsCalc.toFils`: Converts Jordan Dinar decimal amounts to integer fils (`1 JOD = 1000 fils`) `[tips-calc.js:toFils]`
- `FOH.tipsCalc.formatJod`: Formats integer fils into stable 3-decimal JOD currency string `[tips-calc.js:formatJod]`
- `FOH.tipsCalc.distributeFils`: Hamilton / Largest Remainder proportional splitter allocating exact integer fils `[tips-calc.js:distributeFils]`
- `FOH.tipsCalc.calculateStaffShares`: Computes gross fils, deductions, deficits, and net payouts per employee `[tips-calc.js:calculateStaffShares]`
- `FOH.tipsView.render`: Renders the staff tip ledger, weekly pool inputs, and payout cards `[tips-view.js:render]`
- `FOH.tipsModal.open`: Opens the manager tip configuration and withdrawal recording modal `[tips-modal.js:open]`

## Invariants
- Zero Rounding Drift: Sum of distributed employee shares must equal the exact pool fils (`∑ shares === totalFils`) `[tips-calc.js:distributeFils]`
- Integer Math: All monetary calculations are performed in integer fils; floating point division is never stored `[tips-calc.js:toFils]`
- Staff visibility of total restaurant tip pool is governed by `gov.tipsVisibility.showTotalPool` `[tips-view.js:render]`

## Side Effects
- Mutates `super-employee.tipsData.v1` in `localStorage` `[tips-store.js:saveTipsData]`
- Mutates tip advances and weekly pool calculations in storage `[tips-store.js:addAdvance]`

## Verification
- Run: `node --test tests/*.test.mjs`

