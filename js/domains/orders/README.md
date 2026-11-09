# Orders Domain (js/domains/orders)

## Overview
Front of House & Bar daily supply ordering system styled to CEEN 2 luxury bar orders design parity. Manages catalog seeds across Bar, Wine, Fresh Fruits, Dry Goods, Cleaning, and Packaging. Supports role-scoped item visibility, line item quantity mutations, WhatsApp/PDF dispatch generation, warehouse receiving modal, fast service 10-minute cooldown replenishment, and order lifecycle states (Draft, Sent, Received).

## Interface
- `FOH.ordersView.renderOrdersView`: Main view router and container for CEEN 2 orders flow `[orders-view.js:renderOrdersView]`
- `FOH.ordersViewHome.renderHomeGroups`: Renders welcome banner, draft card, 4 group cards with gold progress bars, and replenishment drawer `[orders-view-home.js:renderHomeGroups]`
- `FOH.ordersViewCategories.renderCategoryTypes`: Renders category breadcrumbs and 2-column type grid with check/skip indicators `[orders-view-categories.js:renderCategoryTypes]`
- `FOH.ordersViewStep.renderItemStepperCard`: Guided single-item stepper card with stock panel, ratio denominator (/ Stock), and floating bottom nav `[orders-view-step.js:renderItemStepperCard]`
- `FOH.ordersViewQuick.renderQuickListMode`: Compact quick list mode with inline quantity steppers and requested-only filter `[orders-view-quick.js:renderQuickListMode]`
- `FOH.ordersViewReview.renderOrderReview`: Comprehensive review screen with sidebar summary, WhatsApp/copy dispatch, and warehouse receiving modal `[orders-view-review.js:renderOrderReview]`
- `FOH.ordersStore.loadOrdersDB`: Loads orders database and active line items `[orders-store.js:loadOrdersDB]`
- `FOH.ordersStore.saveOrdersDB`: Persists order changes to local storage `[orders-store.js:saveOrdersDB]`
- `FOH.ordersCatalog.ORD_SEED`: Static seed catalog containing groups, categories, and items `[orders-catalog-data.js:ORD_SEED]`
- `FOH.ordersCatalogMutations.addNewItem`: Adds custom supply items to active catalog groups `[orders-catalog-mutations.js:addNewItem]`
- `FOH.ordersDispatch.buildOrdWhatsAppText`: Formats order summary into structured WhatsApp text `[orders-dispatch.js:buildOrdWhatsAppText]`
- `FOH.ordersLifecycleStore.setOrderStatus`: Advances order state from Draft to Sent or Received `[orders-lifecycle-store.js:setOrderStatus]`
- `FOH.ordersQuickReplenishStore.quickReplenishItem`: Debounced fast-cockpit 1-tap replenishment with 10-minute cooldown `[orders-quick-replenish-store.js:quickReplenishItem]`
- `FOH.ordersAddModals.openAddItemModal`: In-view modal for adding custom supply items `[orders-add-modals.js:openAddItemModal]`

## Invariants
- Scoping RBAC: Waiters see FOH supplies only; Bartenders see Bar, Wine, & Fresh; Captains see FOH & Wine; Managers see all `[orders-store.js:isGroupAllowedForUser]`
- Quantities must be positive numbers matching designated units (bottles, boxes, kg, pcs) `[orders-store.js:ordLine]`
- Default operational browsing mode is Quick List for high-throughput service `[orders-view.js:renderCategoryProducts]`

## Side Effects
- Mutates `foh-opening.ceenOrdersDB.v2` in `localStorage` `[orders-store.js:saveOrdersDB]`
- Opens external WhatsApp URI handler (`https://wa.me/?text=`) and broadcasts replenishment over Realtime `[orders-dispatch.js:openWhatsApp]`

## Verification
- Run: `node --test tests/*.test.mjs`
