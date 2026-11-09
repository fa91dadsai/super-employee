# Graph Report - C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders  (2026-11-08)

## Corpus Check
- 12 files · ~12,281 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 199 nodes · 439 edges · 12 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 105 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `renderItemStepperCard()` - 21 edges
2. `getDB()` - 20 edges
3. `renderHomeGroups()` - 14 edges
4. `renderCategoryComplete()` - 12 edges
5. `ordCatItems()` - 11 edges
6. `renderCategoryProducts()` - 11 edges
7. `getOrdDB()` - 10 edges
8. `ordUnitText()` - 10 edges
9. `renderCategoryTypes()` - 10 edges
10. `buildOrdBreadcrumbs()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `getQuickReplenishItems()` --calls--> `renderQuickReplenishDrawer()`  [INFERRED]
  C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-catalog-data.js → C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-view.js
- `renderHomeGroups()` --calls--> `renderReceivingBanner()`  [INFERRED]
  C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-view-home.js → C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-view-review.js
- `getOrdDB()` --calls--> `getDB()`  [INFERRED]
  C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-catalog-mutations.js → C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-store.js
- `promptEditStock()` --calls--> `ordStockLabel()`  [INFERRED]
  C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-catalog-mutations.js → C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-store.js
- `buildOrdWhatsAppText()` --calls--> `getDB()`  [INFERRED]
  C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-dispatch.js → C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-store.js

## Communities

### Community 0 - "Community 0"
_Handles creation, editing, quick reordering, UI rendering, and database persistence for orders._
Cohesion: 0.14
Nodes (27): getPlurals(), getUnits(), ordById(), ordLine(), ordStockDenominator(), ordStockLabel(), ordStockRatioHint(), ordUnitText() (+19 more)

### Community 1 - "Community 1"

Cohesion: 0.1
Nodes (14): canQuickReplenish(), COOLDOWN_DURATION_MS, COOLDOWNS_KEY, getCatalog(), getCooldowns(), getSession(), loadOrdersDB(), ordDB (+6 more)

### Community 2 - "Community 2"

Cohesion: 0.21
Nodes (20): $(), buildAddCategoryForm(), buildAddItemForm(), buildGroupActions(), buildGroupBanner(), { el }, getStaffList(), isAr() (+12 more)

### Community 3 - "Community 3"

Cohesion: 0.24
Nodes (15): addNewCategory(), addNewItem(), allowedGroupsForCurrentRole(), canCurrentUserManageOrders(), canUserEditGroup(), deleteItem(), getOrdDB(), getSession() (+7 more)

### Community 4 - "Community 4"

Cohesion: 0.25
Nodes (15): ordCat(), $(), buildOrdBreadcrumbs(), buildOrdViewSwitch(), createReplenishTile(), { el }, isAr(), ORD_ICONS (+7 more)

### Community 5 - "Community 5"

Cohesion: 0.25
Nodes (15): ordCatDone(), ordCatItems(), ordCatSkipped(), ordPendingItem(), ordSkipRemaining(), appendGeneralBottomBar(), createCategoryCard(), { el } (+7 more)

### Community 6 - "Community 6"

Cohesion: 0.22
Nodes (14): allowedGroupsForCurrentRole(), canCurrentUserManageOrders(), getOrderStatus(), createGroupCard(), { el }, getGroupIconSvg(), isAr(), renderDraftCard() (+6 more)

### Community 7 - "Community 7"
_Handles creation, tracking, and persistence of orders including status updates, replacements, and history._
Cohesion: 0.23
Nodes (13): promptStartNewOrder(), ordSelectedItems(), { el }, getSession(), isAr(), openReceivingModal(), ordGo(), ordShowDetails (+5 more)

### Community 8 - "Community 8"

Cohesion: 0.32
Nodes (8): addBreakageReplacement(), confirmOrderReceiving(), getOrdDB(), getOrderHistory(), getOrderStatus(), saveOrdersDB(), setOrderStatus(), emptyOrderState()

### Community 9 - "Community 9"

Cohesion: 0.24
Nodes (8): canUserEditGroup(), { el }, getSession(), quickOnlyRequested, quickQuery, renderQuickListMode(), renderQuickSearchbar(), renderQuickToolbar()

### Community 10 - "Community 10"
_Manages order lifecycle events, such as status updates and warehouse checklist marking, while constructing and sending order information via WhatsApp._
Cohesion: 0.35
Nodes (9): apiCall(), buildOrdWhatsAppText(), copyOrderText(), getSession(), markWarehouseChecklistItemDone(), openWhatsApp(), S(), store() (+1 more)

### Community 11 - "Community 11"

Cohesion: 0.33
Nodes (5): getQuickReplenishItems(), ORD_PLURALS, ORD_SEED, ORD_UNITS, QUICK_REPLENISH_CONFIG

## Knowledge Gaps
- **23 isolated node(s):** `ORD_UNITS`, `ORD_PLURALS`, `ORD_SEED`, `QUICK_REPLENISH_CONFIG`, `{ el }` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.