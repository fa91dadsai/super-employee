# ordUnitText()

> God node · 10 connections · [C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-store.js](file:///C:/Users/fadia/Downloads/erp-platform/foh-opening/js/domains/orders/orders-store.js#L237)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as ordUnitText()
    participant P1 as renderItemStepperCard()
    participant P2 as getDB()
    participant P3 as renderHomeGroups()
    participant P4 as renderCategoryProducts()
    participant P5 as getOrdDB()
    participant P6 as renderCategoryTypes()
    participant P7 as buildOrdBreadcrumbs()
    participant P8 as renderCategoryStepList()
    participant P9 as updateQuickItemQty()
    participant P10 as renderQuickListMode()
    participant P11 as getOrdDB()
    participant P12 as renderGroupConfigBody()
    participant P13 as openAddCategoryModal()
    participant P14 as buildOrdWhatsAppText()
    participant P15 as openOrdersSettingsModal()
    participant P16 as renderReviewSidebar()
    participant P17 as commitItemQty()
    participant P18 as buildAddCategoryForm()
    participant P19 as renderReviewLines()
    participant P20 as renderGroupSwitcher()
    participant P21 as ordCatItems()
    participant P22 as renderOrdersView()
    participant P23 as store()
    participant P24 as ordCat()
    participant P25 as ordLine()
    participant P26 as saveOrdersDB()
    participant P27 as buildItemProductPanel()
    participant P28 as ordStockLabel()
    participant P29 as appendBottomBar()
    participant P30 as buildItemStepperControls()
    participant P31 as ordById()
    participant P32 as buildOrdViewSwitch()
    participant P33 as appendItemBottomNav()
    participant P34 as getGroupIconSvg()
    participant P35 as isAr()
    participant P36 as ordGo()
    participant P37 as buildItemProgressRail()
    participant P38 as createProductPickRow()
    participant P39 as createQuickRow()
    participant P40 as ordStockRatioHint()
    participant P41 as getUnits()
    participant P42 as getPlurals()
    P0->>+ P1: calls
    P1-->>- P0: return
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
    P2->>+ P15: calls
    P15-->>- P2: return
    P2->>+ P16: calls
    P16-->>- P2: return
    P2->>+ P17: calls
    P17-->>- P2: return
    P2->>+ P18: calls
    P18-->>- P2: return
    P2->>+ P19: calls
    P19-->>- P2: return
    P2->>+ P20: calls
    P20-->>- P2: return
    P1->>+ P21: calls
    P21-->>- P1: return
    P1->>+ P7: calls
    P7-->>- P1: return
    P1->>+ P0: calls
    P0-->>- P1: return
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
    P1->>+ P32: calls
    P32-->>- P1: return
    P1->>+ P33: calls
    P33-->>- P1: return
    P1->>+ P34: calls
    P34-->>- P1: return
    P1->>+ P35: calls
    P35-->>- P1: return
    P1->>+ P36: calls
    P36-->>- P1: return
    P1->>+ P37: calls
    P37-->>- P1: return
    P0->>+ P9: calls
    P9-->>- P0: return
    P0->>+ P28: calls
    P28-->>- P0: return
    P0->>+ P38: calls
    P38-->>- P0: return
    P0->>+ P27: calls
    P27-->>- P0: return
    P0->>+ P39: calls
    P39-->>- P0: return
    P0->>+ P40: calls
    P40-->>- P0: return
    P0->>+ P41: calls
    P41-->>- P0: return
    P0->>+ P42: calls
    P42-->>- P0: return
```

## Connections by Relation

### calls
- [[renderItemStepperCard()]] `INFERRED`
- [[updateQuickItemQty()]] `INFERRED`
- [[ordStockLabel()]] `EXTRACTED`
- [[createProductPickRow()]] `INFERRED`
- [[buildItemProductPanel()]] `INFERRED`
- [[createQuickRow()]] `INFERRED`
- [[ordStockRatioHint()]] `EXTRACTED`
- [[getUnits()]] `EXTRACTED`
- [[getPlurals()]] `EXTRACTED`

### contains
- [[orders-store.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*