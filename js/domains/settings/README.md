# Settings Domain (js/domains/settings)

## Overview
Administrative configuration view for system parameters, ERP tenant provisioning metadata, restaurant branding, tips visibility policies, and staff directory management under strict Manager RBAC.

## Interface
- `FOH.settingsView.renderSettingsView`: Securely renders restaurant settings and tenant configuration into `#settingsView` `[settings-view.js:secureRenderSettingsView]`

## Invariants
- Access strictly restricted to managers (`sess.isManager === true`); unauthorized requests render an access gate `[settings-view.js:secureRenderSettingsView]`
- Tenant database schema (`tenantSchema`) and branch code (`branchName`) are read-only metadata fields displayed for verification `[settings-view.js:renderBrandAndTenantCard]`

## Side Effects
- Mutates restaurant governance settings in `super-employee.gov.v1` `[settings-view.js:saveGov]`
- Directly rewrites children of DOM container `#settingsView` `[settings-view.js:secureRenderSettingsView]`

## Verification
- Run: `node --test tests/*.test.mjs`

