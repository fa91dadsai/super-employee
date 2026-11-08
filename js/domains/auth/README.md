# Auth & Profile Domain (js/domains/auth)

## Overview
Authentication, user sessions, role profiles, and staff directory management. Connects local sessions with Supabase credentials or local demo accounts, enforces role-based identity properties, handles theme persistence, and manages approval workflows for employee profile modifications.

## Interface
- `FOH.sessionAuth.loadSession`: Loads active user session from `localStorage` or `sessionStorage` `[session-auth.js:loadSession]`
- `FOH.sessionAuth.saveSession`: Persists user authentication state with remember-me support `[session-auth.js:saveSession]`
- `FOH.sessionAuth.setTheme`: Toggles UI theme (`dark` / `light`) and persists to `localStorage` `[session-auth.js:setTheme]`
- `FOH.sessionAuth.authenticate`: Verifies credentials or PIN and establishes session `[session-auth.js:authenticate]`
- `FOH.staff.list`: Retrieves the full active staff directory `[staff.js:list]`
- `FOH.profileDialog.open`: Displays the user profile modal for shift details and health cards `[profile-dialog.js:open]`
- `FOH.pendingApprovals.save`: Stores employee profile change requests awaiting manager approval `[pending-approvals.js:savePendingNameChanges]`

## Invariants
- Role display strings must be sanitized of parenthesis noise (`cleanRoleParens`) `[session-auth.js:cleanRoleParens]`
- Sessions default to `localStorage` if `remember` is true; otherwise isolated to `sessionStorage` `[session-auth.js:saveSession]`
- Theme switching immediately reflects on `document.documentElement.setAttribute('data-theme', theme)` `[session-auth.js:setTheme]`

## Side Effects
- Mutates `foh-opening.erpSession.v1` in `localStorage` or `sessionStorage` `[session-auth.js:saveSession]`
- Mutates `foh-opening.theme` and sets `data-theme` attribute on `<html>` `[session-auth.js:setTheme]`
- Dispatches UI re-renders via `FOH.applyAuthUI()` and broadcasts profile/name-change notifications over Realtime `[profile-dialog.js:submitStaffNameChangeRequest]`

## Verification
- Run: `node --test tests/*.test.mjs`

