# getOrdDB()

> God node · 10 connections · [C:\Users\fadia\Downloads\erp-platform\foh-opening\js\domains\orders\orders-catalog-mutations.js](file:///C:/Users/fadia/Downloads/erp-platform/foh-opening/js/domains/orders/orders-catalog-mutations.js#L4)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as getOrdDB()
    participant P1 as getDB()
    participant P2 as renderItemStepperCard()
    participant P3 as ordCatItems()
    participant P4 as buildOrdBreadcrumbs()
    participant P5 as ordUnitText()
    participant P6 as renderOrdersView()
    participant P7 as store()
    participant P8 as ordCat()
    participant P9 as ordLine()
    participant P10 as saveOrdersDB()
    participant P11 as buildItemProductPanel()
    participant P12 as ordStockLabel()
    participant P13 as appendBottomBar()
    participant P14 as buildItemStepperControls()
    participant P15 as ordById()
    participant P16 as buildOrdViewSwitch()
    participant P17 as appendItemBottomNav()
    participant P18 as getGroupIconSvg()
    participant P19 as isAr()
    participant P20 as ordGo()
    participant P21 as buildItemProgressRail()
    participant P22 as renderHomeGroups()
    participant P23 as renderCategoryProducts()
    participant P24 as renderCategoryTypes()
    participant P25 as renderCategoryStepList()
    participant P26 as updateQuickItemQty()
    participant P27 as renderQuickListMode()
    participant P28 as getOrdDB()
    participant P29 as renderGroupConfigBody()
    participant P30 as openAddCategoryModal()
    participant P31 as buildOrdWhatsAppText()
    participant P32 as openOrdersSettingsModal()
    participant P33 as renderReviewSidebar()
    participant P34 as commitItemQty()
    participant P35 as buildAddCategoryForm()
    participant P36 as renderReviewLines()
    participant P37 as renderGroupSwitcher()
    participant P38 as ordById()
    participant P39 as addNewItem()
    participant P40 as ordCat()
    participant P41 as allowedGroupsForCurrentRole()
    participant P42 as updateGroupConfig()
    participant P43 as addNewCategory()
    participant P44 as isGroupAllowedForUser()
    participant P45 as canUserEditGroup()
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
    P2->>+ P21: calls
    P21-->>- P2: return
    P1->>+ P22: calls
    P22-->>- P1: return
    P1->>+ P23: calls
    P23-->>- P1: return
    P1->>+ P0: calls
    P0-->>- P1: return
    P1->>+ P24: calls
    P24-->>- P1: return
    P1->>+ P4: calls
    P4-->>- P1: return
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
```

## Connections by Relation

### calls
- [[getDB()]] `INFERRED`
- [[ordById()]] `EXTRACTED`
- [[addNewItem()]] `EXTRACTED`
- [[ordCat()]] `EXTRACTED`
- [[allowedGroupsForCurrentRole()]] `EXTRACTED`
- [[updateGroupConfig()]] `EXTRACTED`
- [[addNewCategory()]] `EXTRACTED`
- [[isGroupAllowedForUser()]] `EXTRACTED`
- [[canUserEditGroup()]] `EXTRACTED`

### contains
- [[orders-catalog-mutations.js]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*