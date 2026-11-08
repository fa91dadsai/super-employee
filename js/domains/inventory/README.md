# Inventory Domain (js/domains/inventory)

## Overview
Blind inventory counts, glassware/cutlery audit cycles, item attribute variants, breakage logging, and IndexedDB photo attachment storage. Enforces blind counting invariants where expected stock numbers are hidden from counting staff until recount or management approval.

## Interface
- `FOH.invStore.load`: Loads complete inventory template, variants, and historical counts `[store.js:load]`
- `FOH.invStore.save`: Persists inventory counts and variant definitions `[store.js:save]`
- `FOH.invBreak.open`: Opens modal to record broken glasses, plates, or items `[breakage.js:open]`
- `FOH.invCount.render`: Renders blind count sheets for assigned categories `[count.js:render]`
- `FOH.invResults.render`: Displays reconciliation report with variance, surplus, and deficits `[results.js:render]`
- `FOH.photos.add`: Stores item photos in browser IndexedDB `[store.js:add]`
- `FOH.photos.show`: Renders stored image blob into an `<img>` tag `[store.js:show]`
- `FOH.batchTally.injectBatchCounter`: Multi-item fast quantity tally counter `[batch-tally.js:injectBatchCounter]`

## Invariants
- Expected count quantities are omitted from staff counting screens to ensure genuine blind counts `[store.js:normItem]`
- Broken item logs require an item ID, variant, integer quantity, and logging staff name `[breakage.js:save]`
- Item drag-to-reorder requires pointer events with handle targeting `.handle` `[store.js:enable]`

## Side Effects
- Mutates `foh-opening.inventory.v1` in `localStorage` `[store.js:save]`
- Reads and writes image blobs in IndexedDB database `foh-opening.photos` `[store.js:tx]`

## Verification
- Run: `node --test tests/*.test.mjs`

