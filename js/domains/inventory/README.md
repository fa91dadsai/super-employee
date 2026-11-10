# Inventory Domain (js/domains/inventory)

## Overview
Blind inventory counts, glassware/cutlery audit cycles, item attribute variants, breakage logging, IndexedDB photo attachment storage with garbage collection, and automated order replenishment upon managerial approval. Enforces blind counting invariants where expected stock numbers are hidden from counting staff until recount or management approval.

## Interface
- `FOH.invStore.load`: Loads complete inventory template, variants, and historical counts `[store.js:load]`
- `FOH.invStore.save`: Persists inventory counts and variant definitions `[store.js:save]`
- `FOH.invStore.approve`: Reconciles counts, transitions repairs/write-offs, and returns replenishments `[store.js:approve]`
- `FOH.invStore.hasPendingBlindCount`: Checks if staff member has an unsubmitted count/recount for category `[store.js:hasPendingBlindCount]`
- `FOH.invBreak.open`: Opens modal to record broken glasses, plates, or tools `[breakage.js:open]`
- `FOH.invCount.render`: Renders blind count sheets for assigned categories `[count.js:render]`
- `FOH.invResults.render`: Displays reconciliation report with variance, surplus, and deficits `[results.js:render]`
- `FOH.photos.add`: Stores compressed item photos in browser IndexedDB `[inventory-photos.js:add]`
- `FOH.photos.show`: Renders stored image blob into an `<img>` tag `[inventory-photos.js:show]`
- `FOH.photos.gc`: Purges unreferenced photo blobs from IndexedDB `[inventory-photos.js:gc]`
- `FOH.batchTally.injectBatchCounter`: Multi-item fast quantity tally counter `[batch-tally.js:injectBatchCounter]`

## Invariants
- Pre-submission blindness masks expected quantities (`🔒`) in Stock and Results for counters with pending unsubmitted counts `[store.js:hasPendingBlindCount]`, `[stock.js:summary]`
- Double-deduction prevention: unapproved breakage is deducted from reference expectations exactly once and marked `deductedFromExpected` upon manager approval `[store.js:reference]`, `[store.js:approve]`
- Segregation of duties: sole counting staff cannot approve their own inventory count unless authorized as manager/super `[results.js:handleApprove]`
- Auto-replenishment on approval: manager count approval and write-off approval automatically route deficit quantities into `ordersStore` drafts with proper group and category `[results.js:handleApprove]`
- Broken item logs require an item ID, variant, integer quantity, and logging staff name `[breakage.js:save]`
- Transitioning damaged items into repair or write-off maintains reference quantity totals `[store.js:toRepair]`

## Side Effects
- Mutates `foh-opening.inventory.v1` in `localStorage` `[store.js:save]`
- Dispatches replenishment items to `ordersStore` upon count and writeoff approval `[results.js:handleApprove]`
- Reads, writes, and purges image blobs in IndexedDB database `foh-opening.photos` `[inventory-photos.js:tx]`
- Closes count and breakage modals triggering cloud synchronization `[breakage.js:save]`

## Verification
- Run: `node --test foh-opening/tests/*.test.mjs`
