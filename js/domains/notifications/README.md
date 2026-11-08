# Notifications Domain (js/domains/notifications)

## Overview
Notification center modal, header notification bell, and background snooze engine. Delivers urgent operational alerts, new task assignments, health certificate reminders, and system notifications with background timer snoozing and lock-screen Web Push.

## Interface
- `FOH.notifCenter.openNotificationCenterModal`: Opens full modal listing all unread and historical notifications `[notif-center.js:openNotificationCenterModal]`
- `FOH.notifCenter.updateNotifBellUI`: Updates unread counter badge on the top header bell `[notif-center.js:updateNotifBellUI]`
- `FOH.notifCenter.ensureNotifBellInHeader`: Injects notification bell into top application bar `[notif-center.js:ensureNotifBellInHeader]`
- `FOH.snoozeEngine.snoozeAlertWithTimer`: Snoozes an active alert for a specified duration in minutes `[snooze-engine.js:snoozeAlertWithTimer]`
- `FOH.snoozeEngine.fireNativeLockScreenNotification`: Requests permission and triggers OS lock-screen push notification `[snooze-engine.js:fireNativeLockScreenNotification]`

## Invariants
- Snoozed alerts must suppress repeated audio/visual alerts until expiration of the stored timestamp `[snooze-engine.js:isAlertSnoozedNow]`
- Notifications badge count must accurately match unread, non-snoozed notifications for the active user role `[notif-center.js:updateNotifBellUI]`

## Side Effects
- Mutates `super-employee.snoozeTimers.v1` in `localStorage` `[snooze-engine.js:saveSnoozeTimers]`
- Calls browser `Notification.requestPermission()`, Service Worker `showNotification`, and Realtime broadcast sync `[snooze-engine.js:fireNativeLockScreenNotification]`

## Verification
- Run: `node --test tests/*.test.mjs`

