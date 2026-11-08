# Navigation Domain (js/domains/navigation)

## Overview
Responsive mobile and tablet application navigation architecture. Coordinates the bottom tab bar (`#tabBar`), the slide-out navigation drawer (`#sidebarDrawer`), department filtering pill bento grids, and view routing with strict RBAC whitelist protection.

## Interface
- `FOH.navigation.switchView`: Secure view switcher routing between checklists, mine, orders, tips, inventory, and academy `[sidebar-nav.js:secureSwitchView]`
- `FOH.navigation.openSidebar`: Opens the off-canvas hamburger navigation drawer `[sidebar-nav.js:openSidebar]`
- `FOH.navigation.closeSidebar`: Dismisses the off-canvas navigation drawer `[sidebar-nav.js:closeSidebar]`
- `FOH.bottomBar.render`: Renders the mobile bottom tab navigation bar `[bottom-bar.js:render]`
- `FOH.modeDeptPanels.renderDeptSegmentPanel`: Renders department selector bento grid and operational mode filters `[mode-dept-panels.js:renderDeptSegmentPanel]`

## Invariants
- Navigation whitelist: view transitions are strictly guarded against `ROLE_APP_IDENTITY.allowedViews` for the active user role `[sidebar-nav.js:secureSwitchView]`
- Items pinned to the bottom tab bar must not be duplicated inside the drawer navigation `[bottom-bar.js:render]`
- Nested interactive actions inside clickable navigation tiles must invoke `e.stopPropagation()` `[sidebar-nav.js:enhanceSidebarAndInventory]`

## Side Effects
- Mutates CSS classes and visibility styles across view containers (`#checklistRoot`, `#ordersView`, `#inventoryRoot`, etc.) `[sidebar-nav.js:secureSwitchView]`
- Modifies `document.body` classes (`drawer-open`) `[sidebar-nav.js:openSidebar]`

## Verification
- Run: `node --test tests/*.test.mjs`

