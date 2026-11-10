# Cloud & Realtime Domain (js/domains/cloud)

## Overview
Supabase cloud synchronization and WebSocket realtime pub/sub relay. Provides live cross-device sync for task ticks, shift claims, day-off requests, and restaurant operations announcements (e.g. Last Order and Restaurant Closed).

## Interface
- `FOH.cloudSync.apiCall`: Authenticated HTTP fetch client against Supabase REST endpoints `[cloud-sync.js:apiCall]`
- `FOH.cloudSync.syncFromCloud`: Reconciles remote cloud state with local checklist runs and claims `[cloud-sync.js:syncFromCloud]`
- `FOH.realtime.connect`: Establishes WebSocket connection to Supabase Realtime channel `oasis_ceen_shift_live` `[realtime-broadcast.js:connect]`
- `FOH.realtime.broadcast`: Dispatches operational events (`TASK_ASSIGNED`, `TASK_TICKED`, `LAST_ORDER_TRIGGERED`) to team devices `[realtime-broadcast.js:broadcast]`
- `FOH.realtime.isConnected`: Reports active WebSocket connection status `[realtime-broadcast.js:isConnected]`

## Invariants
- HTTP requests to cloud APIs require active session token, tenant ID, and branch ID `[cloud-sync.js:apiCall]`
- Incoming task broadcasts ignore self-generated events (`data.originUser === curUser`) `[realtime-handlers.js:handleIncomingBroadcast]`
- Live connection indicator updates visual status (`#cloudRealtimeIndicator`) based on WebSocket heartbeat `[realtime-broadcast.js:updateRealtimeIndicator]`

## Side Effects
- Opens persistent WebSocket connection to `wss://jncnbwwhjmouxptqfjaz.supabase.co/realtime/v1/websocket` `[realtime-broadcast.js:REALTIME_WS_URL]`
- Performs authenticated network HTTP requests against Supabase backend `[cloud-sync.js:apiCall]`
- Dispatches lock screen / push notifications via browser Notification API `[realtime-handlers.js:fireNativeLockScreenNotification]`

## Verification
- Run: `node --test tests/*.test.mjs`

