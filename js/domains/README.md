# FOH Domains (js/domains)

## Overview
Modular functional domain modules powering Front of House (FOH) restaurant and bar operations. Each domain encapsulates its own state management, persistence stores, rendering routines, and business rule invariants while sharing the unified `window.FOH` application namespace.

## Subdirectories & Boundaries
- [Academy](./academy/README.md): Staff menu knowledge training, interactive quizzes, dish mastery, and XP rewards.
- [Auth](./auth/README.md): Authentication sessions, PIN logins, demo accounts, theme selection, and staff directory access.
- [Checklist](./checklist/README.md): Core opening and closing operational checklists, hierarchical tasks, and section assignments.
- [Cloud](./cloud/README.md): Supabase REST API synchronization and WebSocket realtime pub/sub message relay.
- [Dashboard](./dashboard/README.md): Executive operations dashboard, managerial KPI tiles, and health certificate compliance metrics.
- [Governance](./governance/README.md): Restaurant business identity, municipal health card tracking, and staff suggestion proposals.
- [Inventory](./inventory/README.md): Blind inventory count cycles, attribute variants, IndexedDB photo storage, and breakage logging.
- [Navigation](./navigation/README.md): Bottom tab bar, slide-out drawer, view switching routing, and role-based view whitelisting.
- [Notifications](./notifications/README.md): Notification center modal, top bar alert bell, background snooze engine, and Web Push notifications.
- [Operations](./operations/README.md): Operating hours, late-night business date calculations, service lifecycle stages, and closing workflows.
- [Orders](./orders/README.md): Daily bar and FOH supply orders, catalog categories, role-scoped order lines, and WhatsApp dispatch.
- [Profile](./profile/README.md): Dedicated employee personal profiles, health certificate inspection, and permission details.
- [Settings](./settings/README.md): Enterprise tenant provisioning settings, branding parameters, and manager administrative controls.
- [Shifts](./shifts/README.md): Three-shift lifecycle (Opening, Mid, Closing), role identities, and section claiming.
- [Tasks](./tasks/README.md): Recurring chore scheduler, personalized "My Tasks" filtering, and day-off request rosters.
- [Tips](./tips/README.md): Integer fils tip pool calculations, Hamilton largest-remainder splitter, and payout ledgers.

