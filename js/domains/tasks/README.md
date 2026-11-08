# Tasks Domain (js/domains/tasks)

## Overview
Dynamic task scheduling, recurring chore management, personalized "My Tasks" (`#mine`) views, custom task assignments, and employee day-off requests. Filters tasks by active employee username or role, calculates recurrence intervals, and tracks individual task completion.

## Interface
- `FOH.tasksView.mine`: Renders personalized tasks list filtered for the logged-in staff member `[tasks-view.js:mine]`
- `FOH.tasksView.today`: Compiles all operational chores scheduled for the current business date `[tasks-view.js:today]`
- `FOH.tasksView.isMine`: Evaluates whether a task or checklist item belongs to the active user `[tasks-view.js:isMine]`
- `FOH.taskAssignModal.openAssignTaskToStaffOrRoleModal`: Opens the interactive assignment modal to delegate chores to staff `[task-assign-modal.js:openAssignTaskToStaffOrRoleModal]`
- `FOH.taskRecurrenceCard.createRecurrenceCard`: Renders schedule recurrence settings (daily, weekly, specific days) `[task-recurrence-card.js:createRecurrenceCard]`
- `FOH.dayOff.buildDayOffSection`: Renders staff weekly day-off requests and roster synchronization `[day-off.js:buildDayOffSection]`

## Invariants
- Task resolution precedence: 1) Direct username match (`assignedUsername`), 2) Display name match (`person`), 3) Role key match (`assignedRoleKey`) `[tasks-view.js:isMine]`
- Day-off requests are validated against maximum allowable concurrent leave per department `[day-off.js:saveDayOffList]`

## Side Effects
- Mutates recurring chore configurations in `foh-opening.tasks.v1` and broadcasts assigned tasks over Realtime `[task-assignment-state.js:broadcastAssignedTask]`
- Mutates day-off rosters in `super-employee.dayOff.v1` `[day-off.js:saveDayOffList]`
- Triggers 1-tap haptic feedback (`navigator.vibrate(15)`) on completion `[task-actions.js:tick]`

## Verification
- Run: `node --test tests/*.test.mjs`

