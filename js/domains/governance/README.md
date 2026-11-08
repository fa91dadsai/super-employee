# Governance Domain (js/domains/governance)

## Overview
Enterprise restaurant governance, staff compliance tracking, and continuous improvement suggestions. Monitors municipal health certificate validity, triggers expiry warning banners, enforces checklist editing locks, and manages staff checklist improvement proposals.

## Interface
- `FOH.gov.loadGov`: Loads restaurant configuration, branch identity, and locking state `[restaurant-gov.js:loadGov]`
- `FOH.gov.saveGov`: Persists restaurant governance rules and lock flags `[restaurant-gov.js:saveGov]`
- `FOH.gov.getHealthAlerts`: Analyzes staff directory for expired or soon-to-expire health cards `[restaurant-gov.js:getHealthAlerts]`
- `FOH.gov.renderHealthBanner`: Renders top-of-screen regulatory compliance alert banner `[restaurant-gov.js:renderHealthBanner]`
- `FOH.gov.canCurrentUserEditChecklist`: Evaluates whether current user has administrative editing clearance `[restaurant-gov.js:canCurrentUserEditChecklist]`
- `FOH.suggestions.loadSuggestions`: Retrieves staff checklist feedback and change requests `[suggestions.js:loadSuggestions]`
- `FOH.suggestions.openSuggestionModal`: Launches proposal dialog for staff checklist suggestions `[suggestions.js:openSuggestionModal]`

## Invariants
- Health certificate alerts categorize into Expired (`<= 0` days) and Warning (`<= 30` days) `[restaurant-gov.js:getHealthAlerts]`
- If `gov.checklistLocked` is true, only authorized `editorUsernames` or managers can mutate templates `[restaurant-gov.js:canCurrentUserEditChecklist]`

## Side Effects
- Mutates `super-employee.gov.v1` in `localStorage` `[restaurant-gov.js:saveGov]`
- Mutates `super-employee.suggestions.v1` in `localStorage` `[suggestions.js:saveSuggestions]`
- Injects dismissable alert banners into DOM header `#healthBannerContainer` `[restaurant-gov.js:renderHealthBanner]`

## Verification
- Run: `node --test tests/*.test.mjs`

