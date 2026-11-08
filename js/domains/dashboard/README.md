# Dashboard Domain (js/domains/dashboard)

## Overview
Executive operations dashboard and real-time KPI analytics for restaurant management. Aggregates live checklist progress, pending supply orders, inventory breakage count, health certificate expiries, and staff suggestions under strict Manager RBAC enforcement.

## Interface
- `FOH.dashboardView.renderDashboardView`: Securely renders the executive dashboard into `#dashboardView` `[dashboard-view.js:secureRenderDashboardView]`

## Invariants
- Access is strictly restricted to users with `isManager: true` in their session; unauthorized access renders an access-denied gate `[dashboard-view.js:secureRenderDashboardView]`
- KPI tiles summarize live metrics across checklists, scheduled tasks, orders, breakage, health alerts, and suggestions `[dashboard-view.js:renderDashboardKpis]`

## Side Effects
- Mutates DOM children of `#dashboardView` root element `[dashboard-view.js:secureRenderDashboardView]`

## Verification
- Run: `node --test tests/*.test.mjs`

