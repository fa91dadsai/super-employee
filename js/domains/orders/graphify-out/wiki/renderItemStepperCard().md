# renderItemStepperCard()

> God node · 21 connections · [C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-view-step.js](file:///C:/Users/fadia/Downloads/erp-platform/foh-opening/js/domains/orders/orders-view-step.js#L264)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as renderItemStepperCard()
    participant P1 as getDB()
    participant P2 as renderHomeGroups()
    participant P3 as renderOrdersView()
    participant P4 as ordSelectedItems()
    participant P5 as store()
    participant P6 as renderQuickReplenishDrawer()
    participant P7 as renderGroupCardsGrid()
    participant P8 as renderHomeToolbarAndNotes()
    participant P9 as renderLastItemResume()
    participant P10 as isAr()
    participant P11 as renderWelcomeHeader()
    participant P12 as renderDraftCard()
    participant P13 as getOrderStatus()
    participant P14 as renderReceivingBanner()
    participant P15 as renderCategoryProducts()
    participant P16 as getOrdDB()
    participant P17 as renderCategoryTypes()
    participant P18 as buildOrdBreadcrumbs()
    participant P19 as renderCategoryStepList()
    participant P20 as updateQuickItemQty()
    participant P21 as renderQuickListMode()
    participant P22 as getOrdDB()
    participant P23 as renderGroupConfigBody()
    participant P24 as openAddCategoryModal()
    participant P25 as buildOrdWhatsAppText()
    participant P26 as openOrdersSettingsModal()
    participant P27 as renderReviewSidebar()
    participant P28 as commitItemQty()
    participant P29 as buildAddCategoryForm()
    participant P30 as renderReviewLines()
    participant P31 as renderGroupSwitcher()
    participant P32 as ordCatItems()
    participant P33 as ordUnitText()
    participant P34 as store()
    participant P35 as ordCat()
    participant P36 as ordLine()
    participant P37 as saveOrdersDB()
    participant P38 as buildItemProductPanel()
    participant P39 as ordStockLabel()
    participant P40 as appendBottomBar()
    participant P41 as buildItemStepperControls()
    participant P42 as ordById()
    participant P43 as buildOrdViewSwitch()
    participant P44 as appendItemBottomNav()
    participant P45 as getGroupIconSvg()
    participant P46 as isAr()
    participant P47 as ordGo()
    participant P48 as buildItemProgressRail()
    P0->>+ P1: calls
    P1-->>- P0: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P2: calls
    P2-->>- P1: return
    P2->>+ P1: calls
    P1-->>- P2: return
    P2->>+ P3: calls
    P3-->>- P2: return
    P2->>+ P4: calls
    P4-->>- P2: return
    P2->>+ P5: calls
    P5-->>- P2: return
    P2->>+ P6: calls
    P6-->>- P2: return
    P2->>+ P7: calls
    P7-->>- P2: return
    P2->>+ P8: calls
    P8-->>- P2: return
    P2->>+ P9: calls
    P9-->>- P2: return
    P2->>+ P10: calls
    P10-->>- P2: return
    P2->>+ P11: calls
    P11-->>- P2: return
    P2->>+ P12: calls
    P12-->>- P2: return
    P2->>+ P13: calls
    P13-->>- P2: return
    P2->>+ P14: calls
    P14-->>- P2: return
    P1->>+ P15: calls
    P15-->>- P1: return
    P1->>+ P16: calls
    P16-->>- P1: return
    P1->>+ P17: calls
    P17-->>- P1: return
    P1->>+ P18: calls
    P18-->>- P1: return
    P1->>+ P19: calls
    P19-->>- P1: return
    P1->>+ P20: calls
    P20-->>- P1: return
    P1->>+ P21: calls
    P21-->>- P1: return
    P1->>+ P22: calls
    P22-->>- P1: return
    P1->>+ P23: calls
    P23-->>- P1: return
    P1->>+ P24: calls
    P24-->>- P1: return
    P1->>+ P25: calls
    P25-->>- P1: return
    P1->>+ P26: calls
    P26-->>- P1: return
    P1->>+ P27: calls
    P27-->>- P1: return
    P1->>+ P28: calls
    P28-->>- P1: return
    P1->>+ P29: calls
    P29-->>- P1: return
    P1->>+ P30: calls
    P30-->>- P1: return
    P1->>+ P31: calls
    P31-->>- P1: return
    P0->>+ P32: calls
    P32-->>- P0: return
    P0->>+ P18: calls
    P18-->>- P0: return
    P0->>+ P33: calls
    P33-->>- P0: return
    P0->>+ P3: calls
    P3-->>- P0: return
    P0->>+ P34: calls
    P34-->>- P0: return
    P0->>+ P35: calls
    P35-->>- P0: return
    P0->>+ P36: calls
    P36-->>- P0: return
    P0->>+ P37: calls
    P37-->>- P0: return
    P0->>+ P38: calls
    P38-->>- P0: return
    P0->>+ P39: calls
    P39-->>- P0: return
    P0->>+ P40: calls
    P40-->>- P0: return
    P0->>+ P41: calls
    P41-->>- P0: return
    P0->>+ P42: calls
    P42-->>- P0: return
    P0->>+ P43: calls
    P43-->>- P0: return
    P0->>+ P44: calls
    P44-->>- P0: return
    P0->>+ P45: calls
    P45-->>- P0: return
    P0->>+ P46: calls
    P46-->>- P0: return
    P0->>+ P47: calls
    P47-->>- P0: return
    P0->>+ P48: calls
    P48-->>- P0: return
```

## Connections by Relation

### calls
- [[getDB()]] `INFERRED`
- [[ordCatItems()]] `INFERRED`
- [[buildOrdBreadcrumbs()]] `INFERRED`
- [[ordUnitText()]] `INFERRED`
- [[renderOrdersView()]] `INFERRED`
- [[store()]] `EXTRACTED`
- [[ordCat()]] `INFERRED`
- [[ordLine()]] `INFERRED`
- [[saveOrdersDB()]] `INFERRED`
- [[buildItemProductPanel()]] `EXTRACTED`
- [[ordStockLabel()]] `INFERRED`
- [[appendBottomBar()]] `INFERRED`
- [[buildItemStepperControls()]] `EXTRACTED`
- [[ordById()]] `INFERRED`
- [[buildOrdViewSwitch()]] `INFERRED`
- [[appendItemBottomNav()]] `EXTRACTED`
- [[getGroupIconSvg()]] `INFERRED`
- [[isAr()]] `EXTRACTED`
- [[ordGo()]] `EXTRACTED`
- [[buildItemProgressRail()]] `EXTRACTED`

### contains
- [[orders-view-step.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*