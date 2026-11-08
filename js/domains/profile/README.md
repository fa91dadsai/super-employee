# Profile Domain (js/domains/profile)

## Overview
Employee personal profile, health certificate compliance details, emergency contact information, and role permission inspection view. Allows staff to review their official credentials and submit amendment requests.

## Interface
- `FOH.healthProfile.renderProfilePageView`: Renders employee profile, certificate validity status, and permissions into `#profilePageView` `[health-profile-view.js:renderProfilePageView]`

## Invariants
- Expiry badge calculations strictly match municipal health compliance limits (Expired `< 0`, Warning `<= 30`, Valid `> 30` days) `[health-profile-view.js:renderStaffPickerOption]`
- Staff can switch view targets only if granted administrative clearance or viewing their own assigned profile `[health-profile-view.js:renderProfilePageView]`

## Side Effects
- Mutates DOM contents of container `#profilePageView` `[health-profile-view.js:renderProfilePageView]`

## Verification
- Run: `node --test tests/*.test.mjs`

