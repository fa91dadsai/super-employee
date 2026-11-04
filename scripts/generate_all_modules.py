# foh-opening/scripts/generate_all_modules.py
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
print("Starting complete generation of modular architecture...")

import subprocess

def get_source(git_path, local_scratch):
    if os.path.exists(local_scratch):
        with open(local_scratch, 'r', encoding='utf-8') as f:
            return f.readlines()
    res = subprocess.run(['git', '-C', 'wt-foh-opening', 'show', f'63febf9:{git_path}'], capture_output=True, text=True, encoding='utf-8')
    return res.stdout.splitlines(keepends=True)

erp_lines = get_source('apps/foh-opening/js/domains/auth/erp-pwa-module.js', 'foh-opening/scratch_erp_pwa.js')
super_lines = get_source('apps/foh-opening/js/domains/shifts/super-employee-module.js', 'foh-opening/scratch_super_emp.js')

def get_lines(lines, start_1based, end_1based):
    return "".join(lines[start_1based - 1 : end_1based])

# =============================================================================
# PART 1: ERP PWA MODULES
# =============================================================================

# 1. AUTH: pending-approvals.js
pending_app_code = """// foh-opening/js/domains/auth/pending-approvals.js
// Governance: Pending staff name & nickname alteration requests requiring General Manager confirmation
(function (FOH) {
  'use strict';

  const PENDING_CHANGES_KEY = 'super-employee.pendingNameChanges.v1';

  function loadPendingNameChanges() {
    try {
      const list = FOH.safeJsonParse(localStorage.getItem(PENDING_CHANGES_KEY), '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function savePendingNameChanges(list) {
    try {
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(list));
    } catch {}
  }

  function getActivePendingNameChanges() {
    return loadPendingNameChanges().filter((r) => r.status === 'pending');
  }

  FOH.pendingApprovals = {
    loadPendingNameChanges,
    savePendingNameChanges,
    getActivePendingNameChanges,
  };

  FOH.loadPendingNameChanges = loadPendingNameChanges;
  FOH.savePendingNameChanges = savePendingNameChanges;
})(window.FOH = window.FOH || {});
"""
with open('foh-opening/js/domains/auth/pending-approvals.js', 'w', encoding='utf-8') as f:
    f.write(pending_app_code)
print("✓ Auth: pending-approvals.js")

# 2. AUTH: session-auth.js
raw_auth = get_lines(erp_lines, 7, 649)
raw_auth = re.sub(r'function loadPendingNameChanges[\s\S]*?FOH\.savePendingNameChanges = savePendingNameChanges;\n', '', raw_auth)
raw_auth = re.sub(r"(username:\s*'ali'[\s\S]*?isManager:\s*)true,", r"\g<1>false,\n      isCaptain: true,", raw_auth)

session_auth_code = f"""// foh-opening/js/domains/auth/session-auth.js
// Authentication, Session Storage & Oasis Staff Directory Access
(function (FOH) {{
  'use strict';

{raw_auth}

  FOH.sessionAuth = {{
    loadSession,
    saveSession,
    loadTheme,
    setTheme,
    bindSessionToStaff,
    authenticate,
    applyAuthUI,
    renderLoginScreen,
    DEMO_ACCOUNTS,
    getSession: () => session,
    showPreviewBar: () => showPreviewBar,
  }};

  FOH.loadSession = loadSession;
  FOH.saveSession = saveSession;
  FOH.setTheme = setTheme;
  FOH.applyAuthUI = applyAuthUI;

  try {{
    Object.defineProperty(window, 'session', {{
      get() {{
        return session || loadSession();
      }},
      set(val) {{
        session = val;
        if (val) saveSession(val);
      }},
      configurable: true,
    }});
  }} catch {{}}
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/auth/session-auth.js', 'w', encoding='utf-8') as f:
    f.write(session_auth_code)
print("✓ Auth: session-auth.js")

# 3. AUTH: profile-dialog.js
raw_profile = get_lines(erp_lines, 650, 1039)
raw_profile = raw_profile.replace("function openProfile() {\n    if (!session)", "function openProfile() {\n    const session = getSession();\n    if (!session)")
raw_profile = raw_profile.replace("function renderProfileBody(content) {", "function renderProfileBody(content) {\n    const session = getSession();")
profile_dialog_code = f"""// foh-opening/js/domains/auth/profile-dialog.js
// Employee Profile Sheet Dialog (PROF-01, Contact Info, Floor Nickname, Health Cert Lock)
(function (FOH) {{
  'use strict';

  const SUPABASE_URL = 'https://jncnbwwhjmouxptqfjaz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_82pr7lscQZiCiyxUT_TTEA_J9IhKuz1';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function loadPendingNameChanges() {{
    return FOH.pendingApprovals ? FOH.pendingApprovals.loadPendingNameChanges() : [];
  }}

  function savePendingNameChanges(list) {{
    if (FOH.pendingApprovals) FOH.pendingApprovals.savePendingNameChanges(list);
  }}

  function saveSession(next, remember = true) {{
    if (FOH.sessionAuth) FOH.sessionAuth.saveSession(next, remember);
  }}

  function applyAuthUI() {{
    if (FOH.sessionAuth) FOH.sessionAuth.applyAuthUI();
  }}

  function setTheme(mode) {{
    if (FOH.sessionAuth) FOH.sessionAuth.setTheme(mode);
  }}

  function buildDayOffSection(isCard = false) {{
    return FOH.dayOff ? FOH.dayOff.buildDayOffSection(isCard) : el('div', '');
  }}

{raw_profile}

  FOH.profileDialog = {{
    openProfile,
    renderProfileBody,
  }};

  FOH.openProfile = openProfile;
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/auth/profile-dialog.js', 'w', encoding='utf-8') as f:
    f.write(profile_dialog_code)
print("✓ Auth: profile-dialog.js")

# 4. INVENTORY: batch-tally.js
raw_batch = get_lines(erp_lines, 1040, 1129)
batch_tally_code = f"""// foh-opening/js/domains/inventory/batch-tally.js
// Blind Inventory Count: Batch Tally Calculator & Unit Summation
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const BATCH_KEY = 'foh-opening.batches.v1';

{raw_batch}

  FOH.batchTally = {{
    loadBatches,
    saveBatches,
    injectBatchCounter,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/inventory/batch-tally.js', 'w', encoding='utf-8') as f:
    f.write(batch_tally_code)
print("✓ Inventory: batch-tally.js")

# 5. SHIFTS: sheet-state.js
raw_sheet = get_lines(erp_lines, 1130, 1333)
sheet_state_code = f"""// foh-opening/js/domains/shifts/sheet-state.js
// Multi-Sheet Architecture (Opening, Mid-Shift, Closing State & Persistence)
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function syncFromCloud() {{
    if (FOH.cloudSync) FOH.cloudSync.syncFromCloud();
  }}

{raw_sheet}

  FOH.sheetState = {{
    getSheetType: () => sheetType,
    getOpeningBackup: () => openingSectionsBackup,
    setOpeningBackup: (b) => {{ openingSectionsBackup = b; }},
    loadClosingSections,
    loadClosingRun,
    saveClosingRun,
    loadMidSections,
    saveMidSections,
    loadMidRun,
    saveMidRun,
    persistCurrentSheetState,
    switchSheetType,
    renderSheetSwitcher,
  }};

  FOH.switchSheetType = switchSheetType;
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/shifts/sheet-state.js', 'w', encoding='utf-8') as f:
    f.write(sheet_state_code)
print("✓ Shifts: sheet-state.js")

# 6. SHIFTS: section-claims.js
raw_claims = get_lines(erp_lines, 1334, 1407)
raw_claims = re.sub(
    r'function injectSectionClaims\(\) \{',
    r'function injectSectionClaims() {\n    const sheetType = getSheetType();\n    const session = getSession();',
    raw_claims
)
section_claims_code = f"""// foh-opening/js/domains/shifts/section-claims.js
// Section Claim System & Supervisor Sign-off Gate
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const CLAIMS_KEY = 'foh-opening.claims.v1';
  const SIGNOFF_KEY = 'foh-opening.signoffs.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function getSheetType() {{
    return FOH.sheetState ? FOH.sheetState.getSheetType() : 'opening';
  }}

  function apiCall(u, m, d) {{
    return FOH.cloudSync ? FOH.cloudSync.apiCall(u, m, d) : Promise.resolve(null);
  }}

{raw_claims}

  FOH.sectionClaims = {{
    loadClaims,
    saveClaims,
    injectSectionClaims,
    loadSignoffs,
    saveSignoffs,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/shifts/section-claims.js', 'w', encoding='utf-8') as f:
    f.write(section_claims_code)
print("✓ Shifts: section-claims.js")

# 7. CLOUD: cloud-sync.js
raw_cloud = get_lines(erp_lines, 1408, 1481)
raw_cloud = raw_cloud.replace("async function apiCall(method, path, body) {\n    if (!session", "async function apiCall(method, path, body) {\n    const session = getSession();\n    if (!session")
raw_cloud = raw_cloud.replace("async function syncFromCloud() {\n    const boot", "async function syncFromCloud() {\n    const sheetType = getSheetType();\n    const boot")

cloud_sync_code = f"""// foh-opening/js/domains/cloud/cloud-sync.js
// Supabase Cloud Synchronizer & Operational Event Relay
(function (FOH) {{
  'use strict';

  const SUPABASE_URL = 'https://jncnbwwhjmouxptqfjaz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_82pr7lscQZiCiyxUT_TTEA_J9IhKuz1';
  const S = FOH.state;

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function getSheetType() {{
    return FOH.threeShifts ? FOH.threeShifts.getActiveSheetType() : 'opening';
  }}

  function saveClaims(c) {{
    if (FOH.sheetState) FOH.sheetState.saveClaims(c);
  }}

  function loadClaims() {{
    return FOH.sheetState ? FOH.sheetState.loadClaims() : {{}};
  }}

  function saveDayOffList(list) {{
    if (FOH.dayOff && FOH.dayOff.saveDayOffList) FOH.dayOff.saveDayOffList(list);
  }}

  function saveClosingRun(d, r) {{
    if (FOH.sheetState && FOH.sheetState.saveClosingRun) FOH.sheetState.saveClosingRun(d, r);
  }}

  function saveMidRun(d, r) {{
    if (FOH.sheetState && FOH.sheetState.saveMidRun) FOH.sheetState.saveMidRun(d, r);
  }}

{raw_cloud}

  FOH.cloudSync = {{
    apiCall,
    syncFromCloud,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/cloud/cloud-sync.js', 'w', encoding='utf-8') as f:
    f.write(cloud_sync_code)
print("✓ Cloud: cloud-sync.js")

# 8. TASKS: day-off.js
raw_dayoff = get_lines(erp_lines, 1482, 1682)
raw_dayoff = raw_dayoff.replace("function buildDayOffSection(inDialog) {", "function buildDayOffSection(inDialog) {\n    const session = getSession();")
day_off_code = f"""// foh-opening/js/domains/tasks/day-off.js
// Employee Day-Off & Schedule Availability Request System
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function apiCall(u, m, d) {{
    return FOH.cloudSync ? FOH.cloudSync.apiCall(u, m, d) : Promise.resolve(null);
  }}

  function renderProfileBody(el) {{
    if (FOH.profileDialog) FOH.profileDialog.renderProfileBody(el);
  }}

{raw_dayoff}

  FOH.dayOff = {{
    loadDayOffList,
    saveDayOffList,
    buildDayOffSection,
  }};

  FOH.buildDayOffSection = buildDayOffSection;
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/tasks/day-off.js', 'w', encoding='utf-8') as f:
    f.write(day_off_code)
print("✓ Tasks: day-off.js")

# 9. ORDERS: orders-view.js (Holds lines 1683 to 3080)
raw_orders = get_lines(erp_lines, 1683, 3080)
# Fix session references inside orders-view functions:
raw_orders = re.sub(r'function emptyOrderState\(\) \{', r'function emptyOrderState() {\n    const session = getSession();', raw_orders)
raw_orders = re.sub(r'function renderOrdersView\(container\) \{', r'function renderOrdersView(container) {\n    const session = getSession();', raw_orders)
raw_orders = re.sub(r'function visibleGroups\(\) \{', r'function visibleGroups() {\n    const session = getSession();', raw_orders)
raw_orders = re.sub(r'function submitOrder\(\) \{', r'function submitOrder() {\n    const session = getSession();', raw_orders)
raw_orders = re.sub(r'function renderOrderHistory\(\) \{', r'function renderOrderHistory() {\n    const session = getSession();', raw_orders)

orders_view_code = f"""// foh-opening/js/domains/orders/orders-view.js
// Warehouse & Bar Ordering Workflow (Item Selection, Stock Tally & WhatsApp Dispatch)
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function getCurrentSuperRoleKey() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }}

  function canCurrentUserAccessOrders() {{
    return FOH.roleIdentity ? FOH.roleIdentity.canCurrentUserAccessOrders() : true;
  }}

  function loadGov() {{
    return FOH.gov ? FOH.gov.loadGov() : {{}};
  }}

  function apiCall(u, m, d) {{
    return FOH.cloudSync ? FOH.cloudSync.apiCall(u, m, d) : Promise.resolve(null);
  }}

{raw_orders}

  FOH.ordersView = {{
    emptyOrderState,
    loadOrdersDB,
    saveOrdersDB,
    allowedGroupsForCurrentRole,
    updateOrderBadge,
    renderOrdersView,
    buildOrdWhatsAppText,
    ORD_SEED,
  }};

  FOH.renderOrdersView = renderOrdersView;
  FOH.updateOrderBadge = updateOrderBadge;
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/orders/orders-view.js', 'w', encoding='utf-8') as f:
    f.write(orders_view_code)
print("✓ Orders: orders-view.js")

# 10. SHIFTS: signoff-gate.js (Lines 3081 - 3338)
raw_signoff = get_lines(erp_lines, 3081, 3338)
raw_signoff = re.sub(
    r'function renderSignoffCard\(\) \{',
    r'function renderSignoffCard() {\n    const sheetType = getSheetType();\n    const session = getSession();',
    raw_signoff
)
raw_signoff = re.sub(
    r'function init\(\) \{',
    r'function init() {\n    const session = getSession();',
    raw_signoff
)
raw_signoff = re.sub(r'FOH\.erpPwa = \{[\s\S]*?\}\)\(window\.FOH = window\.FOH \|\| \{\}\);', '', raw_signoff)
raw_signoff = re.sub(r'document\.addEventListener\(\'DOMContentLoaded\', init\);', '', raw_signoff)

signoff_code = f"""// foh-opening/js/domains/shifts/signoff-gate.js
// Supervisor Sign-off Card and Initialization Orchestration
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const SIGNOFF_KEY = 'foh-opening.signoffs.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function getSheetType() {{
    return FOH.sheetState ? FOH.sheetState.getSheetType() : 'opening';
  }}

  function loadSignoffs() {{
    return FOH.sectionClaims ? FOH.sectionClaims.loadSignoffs() : {{}};
  }}

  function saveSignoffs(s) {{
    if (FOH.sectionClaims) FOH.sectionClaims.saveSignoffs(s);
  }}

  function openProfile() {{
    if (FOH.profileDialog) FOH.profileDialog.openProfile();
  }}

  function loadTheme() {{
    return FOH.sessionAuth ? FOH.sessionAuth.loadTheme() : 'light';
  }}

  function setTheme(m) {{
    if (FOH.sessionAuth) FOH.sessionAuth.setTheme(m);
  }}

  function applyAuthUI() {{
    if (FOH.sessionAuth) FOH.sessionAuth.applyAuthUI();
  }}

  function renderSheetSwitcher() {{
    if (FOH.sheetState) FOH.sheetState.renderSheetSwitcher();
  }}

  function injectSectionClaims() {{
    if (FOH.sectionClaims) FOH.sectionClaims.injectSectionClaims();
  }}

  function updateOrderBadge() {{
    if (FOH.ordersView) FOH.ordersView.updateOrderBadge();
  }}

  function syncFromCloud() {{
    if (FOH.cloudSync) FOH.cloudSync.syncFromCloud();
  }}

  function apiCall(u, m, d) {{
    return FOH.cloudSync ? FOH.cloudSync.apiCall(u, m, d) : Promise.resolve(null);
  }}

  function loadBatches() {{
    return FOH.batchTally ? FOH.batchTally.loadBatches() : [];
  }}

  function injectBatchCounter(el) {{
    if (FOH.batchTally) FOH.batchTally.injectBatchCounter(el);
  }}

  function buildDayOffSection(el) {{
    if (FOH.dayOff) FOH.dayOff.buildDayOffSection(el);
  }}

  function renderOrdersView(el) {{
    if (FOH.ordersView) FOH.ordersView.renderOrdersView(el);
  }}

  function renderLoginScreen() {{
    if (FOH.sessionAuth) FOH.sessionAuth.renderLoginScreen();
  }}

  function authenticate(c, p) {{
    return FOH.sessionAuth ? FOH.sessionAuth.authenticate(c, p) : null;
  }}

  function saveClosingRun(r) {{
    if (FOH.sheetState) FOH.sheetState.saveClosingRun(r);
  }}

{raw_signoff}

  FOH.signoffGate = {{
    renderSignoffCard,
    init,
  }};

  FOH.erpPwa = {{
    init,
    openProfile: () => (FOH.profileDialog && FOH.profileDialog.openProfile()),
    setTheme: (m) => (FOH.sessionAuth && FOH.sessionAuth.setTheme(m)),
    switchSheetType: (t) => (FOH.sheetState && FOH.sheetState.switchSheetType(t)),
    getSheetType: () => (FOH.sheetState && FOH.sheetState.getSheetType()),
    persistCurrentSheetState: () => (FOH.sheetState && FOH.sheetState.persistCurrentSheetState()),
    loadMidSections: () => (FOH.sheetState && FOH.sheetState.loadMidSections()),
    saveMidSections: (s) => (FOH.sheetState && FOH.sheetState.saveMidSections(s)),
    loadClosingSections: () => (FOH.sheetState && FOH.sheetState.loadClosingSections()),
    getOpeningBackup: () => (FOH.sheetState && FOH.sheetState.getOpeningBackup()),
    setOpeningBackup: (b) => (FOH.sheetState && FOH.sheetState.setOpeningBackup(b)),
    renderOrdersView: (r) => (FOH.ordersView && FOH.ordersView.renderOrdersView(r)),
    buildDayOffSection: (c) => (FOH.dayOff && FOH.dayOff.buildDayOffSection(c)),
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/shifts/signoff-gate.js', 'w', encoding='utf-8') as f:
    f.write(signoff_code)
print("✓ Shifts: signoff-gate.js")

# =============================================================================
# PART 2: SUPER EMPLOYEE MODULES
# =============================================================================

# 11. GOVERNANCE: restaurant-gov.js (Lines 38 - 259)
raw_gov = get_lines(super_lines, 38, 259)
gov_code = f"""// foh-opening/js/domains/governance/restaurant-gov.js
// Enterprise Restaurant Governance, Staff Seed Data & Health Certificate Engine
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const GOV_KEY = 'super-employee.gov.v1';
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function hasSuperPerm(p) {{
    return FOH.roleIdentity ? FOH.roleIdentity.hasSuperPerm(p) : true;
  }}

{raw_gov}

  FOH.gov = {{
    defaultGov,
    loadGov,
    saveGov,
    ensureStaffHealthAndPerms,
    canCurrentUserEditChecklist,
    calcDaysLeft,
    getHealthAlerts,
    renderHealthBanner,
  }};

  FOH.ensureStaffHealthAndPerms = ensureStaffHealthAndPerms;
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/governance/restaurant-gov.js', 'w', encoding='utf-8') as f:
    f.write(gov_code)
print("✓ Governance: restaurant-gov.js")

# 12. GOVERNANCE: suggestions.js (Lines 260 - 591)
raw_sug = get_lines(super_lines, 260, 591)
suggestions_code = f"""// foh-opening/js/domains/governance/suggestions.js
// Checklist Suggestions, Manager Lock Bar & Item-Level Floor Notes
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const SUG_KEY = 'super-employee.suggestions.v1';
  const NOTES_KEY = 'super-employee.itemNotes.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function loadGov() {{
    return FOH.gov ? FOH.gov.loadGov() : {{}};
  }}

  function saveGov(g) {{
    if (FOH.gov) FOH.gov.saveGov(g);
  }}

  function canCurrentUserEditChecklist() {{
    return FOH.gov ? FOH.gov.canCurrentUserEditChecklist() : false;
  }}

  function notifyMobileOnNewTaskAdded(t) {{
    if (FOH.realtime) FOH.realtime.notifyMobileOnNewTaskAdded(t);
  }}

{raw_sug}

  FOH.suggestions = {{
    loadSuggestions,
    saveSuggestions,
    loadItemNotes,
    saveItemNotes,
    renderChecklistGovBar,
    openSuggestionModal,
    injectChecklistItemNotes,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/governance/suggestions.js', 'w', encoding='utf-8') as f:
    f.write(suggestions_code)
print("✓ Governance: suggestions.js")

# 13. TIPS: tips-view.js (Lines 592 - 916)
raw_tips = get_lines(super_lines, 592, 916)
tips_code = f"""// foh-opening/js/domains/tips/tips-view.js
// Tip Manager Integration (Points, Worked Days, Gross/Net Share, Advances & Settings)
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const TIPS_KEY = 'super-employee.tips.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function loadGov() {{
    return FOH.gov ? FOH.gov.loadGov() : {{}};
  }}

{raw_tips}

  FOH.tipsView = {{
    defaultTipsData,
    loadTipsData,
    saveTipsData,
    renderTipsView,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/tips/tips-view.js', 'w', encoding='utf-8') as f:
    f.write(tips_code)
print("✓ Tips: tips-view.js")

# 14. DASHBOARD: dashboard-view.js (Lines 917 - 1034)
raw_dash = get_lines(super_lines, 917, 1034)
dashboard_code = f"""// foh-opening/js/domains/dashboard/dashboard-view.js
// Executive Operations Dashboard & Real-Time KPI Analytics (Manager RBAC Enforced)
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function loadGov() {{
    return FOH.gov ? FOH.gov.loadGov() : {{}};
  }}

  function getHealthAlerts() {{
    return FOH.gov ? FOH.gov.getHealthAlerts() : [];
  }}

  function getCurrentSuperRoleKey() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }}

  function getAppRoleIdentity() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {{}};
  }}

  function updateNotifBellUI() {{
    if (FOH.notifCenter && FOH.notifCenter.updateNotifBellUI) FOH.notifCenter.updateNotifBellUI();
  }}

  function loadSuggestions() {{
    return FOH.suggestions ? FOH.suggestions.loadSuggestions() : [];
  }}

  function ensureStaffHealthAndPerms() {{
    if (FOH.gov) FOH.gov.ensureStaffHealthAndPerms();
  }}

  function calcDaysLeft(d) {{
    return FOH.gov ? FOH.gov.calcDaysLeft(d) : 999;
  }}

{raw_dash}

  // Security Hardening: Wrap renderDashboardView with strict Manager RBAC Check
  const origRenderDashboardView = renderDashboardView;
  function secureRenderDashboardView(root) {{
    if (!root) return;
    const sess = getSession();
    const ar = isAr();
    if (!sess || !sess.isManager) {{
      root.replaceChildren();
      const card = el('section', 'card');
      card.style.padding = '32px 16px';
      card.style.textAlign = 'center';
      card.innerHTML =
        '<div style="font-size:2.5rem;margin-bottom:12px;">🔒</div>' +
        '<h3 style="margin:0 0 8px;">' + (ar ? 'لوحة التحليلات التنفيذية مخصصة للمدير العام فقط' : 'Executive Dashboard Access Restricted') + '</h3>' +
        '<p style="color:var(--ink2);font-size:0.85rem;margin:0 0 16px;">' +
        (ar ? 'هذه الصفحة تحتوي على تحليلات مالية وتقارير التالف وحصص التبس المخصصة للمدير.' : 'This view contains sensitive financial and inventory telemetry.') +
        '</p>' +
        '<button type="button" class="btn primary" onclick="FOH.navigation.switchView(\\'opening\\')">' +
        (ar ? 'الرجوع إلى شيت الشفت' : 'Back to Shift Sheet') +
        '</button>';
      root.append(card);
      return;
    }}
    origRenderDashboardView(root);
  }}

  FOH.dashboardView = {{
    renderDashboardView: secureRenderDashboardView,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/dashboard/dashboard-view.js', 'w', encoding='utf-8') as f:
    f.write(dashboard_code)
print("✓ Dashboard: dashboard-view.js")

# 15. PROFILE: health-profile-view.js (Lines 1035 - 1199)
raw_health_prof = get_lines(super_lines, 1035, 1199)
health_prof_code = f"""// foh-opening/js/domains/profile/health-profile-view.js
// Dedicated Employee Profile & Health Certificate View (#profilePageView)
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function ensureStaffHealthAndPerms() {{
    if (FOH.gov) FOH.gov.ensureStaffHealthAndPerms();
  }}

  function calcDaysLeft(exp) {{
    return FOH.gov ? FOH.gov.calcDaysLeft(exp) : null;
  }}

  function openProfile() {{
    if (FOH.profileDialog) FOH.profileDialog.openProfile();
  }}

{raw_health_prof}

  FOH.healthProfileView = {{
    renderProfilePageView,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/profile/health-profile-view.js', 'w', encoding='utf-8') as f:
    f.write(health_prof_code)
print("✓ Profile: health-profile-view.js")

# 16. SETTINGS: settings-view.js (Lines 1200 - 1459)
raw_set_view = get_lines(super_lines, 1200, 1459)
settings_view_code = f"""// foh-opening/js/domains/settings/settings-view.js
// Manager Settings & ERP Tenant Provisioning Identity (Manager RBAC Enforced)
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function loadGov() {{
    return FOH.gov ? FOH.gov.loadGov() : {{}};
  }}

  function saveGov(g) {{
    if (FOH.gov) FOH.gov.saveGov(g);
  }}

  function ensureStaffHealthAndPerms() {{
    if (FOH.gov) FOH.gov.ensureStaffHealthAndPerms();
  }}

{raw_set_view}

  // Security Hardening: Wrap renderSettingsView with strict Manager RBAC Check
  const origRenderSettingsView = renderSettingsView;
  function secureRenderSettingsView(root) {{
    if (!root) return;
    const sess = getSession();
    const ar = isAr();
    if (!sess || !sess.isManager) {{
      root.replaceChildren();
      const card = el('section', 'card');
      card.style.padding = '32px 16px';
      card.style.textAlign = 'center';
      card.innerHTML =
        '<div style="font-size:2.5rem;margin-bottom:12px;">🔒</div>' +
        '<h3 style="margin:0 0 8px;">' + (ar ? 'إعدادات المنشأة وترخيص ERP مخصصة للمدير العام فقط' : 'General Manager Settings Only') + '</h3>' +
        '<p style="color:var(--ink2);font-size:0.85rem;margin:0 0 16px;">' +
        (ar ? 'لا تملك صلاحية تعديل ترخيص سكيمة قاعدة البيانات أو هوية المطعم أو صلاحيات المناصب.' : 'You do not have administrative authority to alter restaurant configuration.') +
        '</p>' +
        '<button type="button" class="btn primary" onclick="FOH.navigation.switchView(\\'opening\\')">' +
        (ar ? 'الرجوع إلى شيت الشفت' : 'Back to Shift Sheet') +
        '</button>';
      root.append(card);
      return;
    }}
    origRenderSettingsView(root);
  }}

  FOH.settingsView = {{
    renderSettingsView: secureRenderSettingsView,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/settings/settings-view.js', 'w', encoding='utf-8') as f:
    f.write(settings_view_code)
print("✓ Settings: settings-view.js")

# 17. ACADEMY: academy-view.js (Lines 1460 - 2024)
raw_acad = get_lines(super_lines, 1460, 2024)
academy_code = f"""// foh-opening/js/domains/academy/academy-view.js
// Menu & Beverage Training Academy, Verification Quiz & Tip Point Bonus Sync
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const ACADEMY_CATALOG_KEY = 'super-employee.academy.catalog.v2';
  const ACADEMY_PROGRESS_KEY = 'super-employee.academy.progress.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function loadTipsData() {{
    return FOH.tipsView ? FOH.tipsView.loadTipsData() : null;
  }}

  function saveTipsData(d) {{
    if (FOH.tipsView) FOH.tipsView.saveTipsData(d);
  }}

  function injectNewTasksInboxIntoNotifCenter() {{
    if (FOH.taskInbox) FOH.taskInbox.injectNewTasksInboxIntoNotifCenter();
  }}

{raw_acad}

  FOH.academyView = {{
    loadAcademyCatalog,
    saveAcademyCatalog,
    loadAcadProgress,
    saveAcadProgress,
    getMyAcadRecord,
    syncAcademyBonusToTips,
    renderAcademyView,
    openQuizModal,
    openAddAcademyItemModal,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/academy/academy-view.js', 'w', encoding='utf-8') as f:
    f.write(academy_code)
print("✓ Academy: academy-view.js")

# 18. OPERATIONS: ops-lifecycle.js (Lines 2025 - 2939, minus roles logic at 2191-2220)
raw_ops_1 = get_lines(super_lines, 2025, 2190)
raw_ops_2 = get_lines(super_lines, 2221, 2939)

ops_code = f"""// foh-opening/js/domains/operations/ops-lifecycle.js
// Operational Hours, Lifecycle Bar & Closing Department Flow
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const OPS_CONFIG_KEY = 'super-employee.opsConfig.v2';
  const OPS_DAY_STATE_KEY = 'super-employee.opsDayState.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function loadGov() {{
    return FOH.gov ? FOH.gov.loadGov() : {{}};
  }}

  function getCurrentSuperRoleKey() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }}

  function getSheetType() {{
    return FOH.sheetState ? FOH.sheetState.getSheetType() : 'opening';
  }}

  function switchSheetType(t) {{
    if (FOH.sheetState) FOH.sheetState.switchSheetType(t);
  }}

  function loadTipsData() {{
    return FOH.tipsView ? FOH.tipsView.loadTipsData() : {{}};
  }}

  function saveTipsData(d) {{
    if (FOH.tipsView) FOH.tipsView.saveTipsData(d);
  }}

  function hasSuperPerm(p) {{
    return FOH.roleIdentity ? FOH.roleIdentity.hasSuperPerm(p) : true;
  }}

{raw_ops_1}
{raw_ops_2}

  FOH.opsLifecycle = {{
    defaultOpsConfig,
    loadOpsConfig,
    saveOpsConfig,
    toBizMinutes,
    formatTime12Ar,
    getEffectiveNowHM,
    loadOpsDayState,
    saveOpsDayState,
    ensureUpgradedClosingSections,
    isClosingSheetActive,
    activateClosingSheet,
    setActiveClosingDeptFilter: (d) => {{ activeClosingDeptFilter = d; }},
    getActiveClosingDeptFilter: () => activeClosingDeptFilter,
    renderClosingDeptFilterBar,
    SUPER_ROLES_META,
    PERM_LABELS,
    SUPER_ROLES_META,
    PERM_LABELS,
    renderOpsLifecycleBar,
    openCloseRestaurantDialog,
  }};
  FOH.SUPER_ROLES_META = SUPER_ROLES_META;
  FOH.PERM_LABELS = PERM_LABELS;
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/operations/ops-lifecycle.js', 'w', encoding='utf-8') as f:
    f.write(ops_code)
print("✓ Operations: ops-lifecycle.js")

# 19. OPERATIONS: hours-settings.js (Lines 2940 - 3257)
raw_hours_set = get_lines(super_lines, 2940, 3257)
hours_settings_code = f"""// foh-opening/js/domains/operations/hours-settings.js
// Operational Hours & Ordering Delegation Matrix Settings Form
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const PERM_LABELS = (FOH.opsLifecycle && FOH.opsLifecycle.PERM_LABELS) || (FOH.PERM_LABELS || []);
  const SUPER_ROLES_META = new Proxy({{}}, {{
    get(target, prop) {{
      const meta = (FOH.opsLifecycle && FOH.opsLifecycle.SUPER_ROLES_META) || (FOH.SUPER_ROLES_META || {{}});
      return meta[prop];
    }},
    ownKeys() {{
      const meta = (FOH.opsLifecycle && FOH.opsLifecycle.SUPER_ROLES_META) || (FOH.SUPER_ROLES_META || {{}});
      return Object.keys(meta);
    }},
    getOwnPropertyDescriptor(target, prop) {{
      return {{ enumerable: true, configurable: true, value: this.get(target, prop) }};
    }}
  }});

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function loadOpsConfig() {{
    return FOH.opsLifecycle ? FOH.opsLifecycle.loadOpsConfig() : {{}};
  }}

  function saveOpsConfig(c) {{
    if (FOH.opsLifecycle) FOH.opsLifecycle.saveOpsConfig(c);
  }}

  function roleName(id) {{
    return FOH.taskSheet && FOH.taskSheet.roleName ? FOH.taskSheet.roleName(id) : 'Staff';
  }}

{raw_hours_set}

  FOH.hoursSettings = {{
    appendHoursAndSuperRolesSettings,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/operations/hours-settings.js', 'w', encoding='utf-8') as f:
    f.write(hours_settings_code)
print("✓ Operations: hours-settings.js")

# 20. SHIFTS: role-identity.js (Lines 2191-2220 + Lines 3258-3420)
raw_roles_func = get_lines(super_lines, 2191, 2220)
raw_roles_data = get_lines(super_lines, 3258, 3420)
raw_roles_data = raw_roles_data.replace(
    "activeClosingDeptFilter = ident.closingDept || 'all';",
    "if (FOH.opsLifecycle && FOH.opsLifecycle.setActiveClosingDeptFilter) FOH.opsLifecycle.setActiveClosingDeptFilter(ident.closingDept || 'all');"
)

# Security Hardening: Never escalate unauthenticated/null session to manager!
raw_roles_func = re.sub(
    r"if \(!sess \|\| sess\.isManager\) return 'super_manager';",
    r"if (sess && sess.isManager) return 'super_manager';\n    if (sess && sess.isCaptain) return 'super_captain';\n    if (!sess) return 'staff';",
    raw_roles_func
)

role_identity_code = f"""// foh-opening/js/domains/shifts/role-identity.js
// Role Identities, Permission Matrix & Quick Account Switcher
(function (FOH) {{
  'use strict';

  const S = FOH.state;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function loadOpsConfig() {{
    return FOH.opsLifecycle ? FOH.opsLifecycle.loadOpsConfig() : {{}};
  }}

  function isClosingSheetActive() {{
    return (FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive)
      ? FOH.opsLifecycle.isClosingSheetActive()
      : ((FOH.threeShifts && FOH.threeShifts.getActiveSheetType) ? FOH.threeShifts.getActiveSheetType() === 'closing' : false);
  }}

{raw_roles_func}

{raw_roles_data}

  FOH.roleIdentity = {{
    ROLE_APP_IDENTITY,
    getCurrentSuperRoleKey,
    hasSuperPerm,
    canCurrentUserAccessOrders,
    getAppRoleIdentity,
    quickSwitchEmployeeAccount,
    isRoleScopeOnly: () => roleScopeOnly,
    setRoleScopeOnly: (v) => {{ roleScopeOnly = v; }},
  }};

  try {{
    Object.defineProperty(window, 'roleScopeOnly', {{
      get() {{ return roleScopeOnly; }},
      set(v) {{ roleScopeOnly = v; }},
      configurable: true,
    }});
  }} catch {{}}

  FOH.getCurrentSuperRoleKey = getCurrentSuperRoleKey;
  FOH.canCurrentUserAccessOrders = canCurrentUserAccessOrders;
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/shifts/role-identity.js', 'w', encoding='utf-8') as f:
    f.write(role_identity_code)
print("✓ Shifts: role-identity.js")

# 21. NOTIFICATIONS: snooze-engine.js (Lines 3421 - 3759)
raw_snooze = get_lines(super_lines, 3421, 3759)
snooze_code = f"""// foh-opening/js/domains/notifications/snooze-engine.js
// Precision Snooze Timer Engine & Native Lock-Screen Push Dispatcher
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  const SNOOZE_TIMERS_KEY = 'super-employee.snoozeTimers.v2';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function getHealthAlerts() {{
    return FOH.gov ? FOH.gov.getHealthAlerts() : [];
  }}

  function getCurrentSuperRoleKey() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }}

  function getAppRoleIdentity() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {{}};
  }}

  function updateNotifBellUI() {{
    if (FOH.notifCenter && FOH.notifCenter.updateNotifBellUI) FOH.notifCenter.updateNotifBellUI();
  }}

{raw_snooze}

  FOH.snoozeEngine = {{
    loadSnoozeTimers,
    saveSnoozeTimers,
    isAlertSnoozedNow,
    getActiveSnoozeTimersList,
    ensureNotificationPermission,
    fireNativeLockScreenNotification,
    scheduleServiceWorkerNotification,
    snoozeAlertWithTimer,
    checkExpiredSnoozeTimers,
    renderSmartAlertBanners,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/notifications/snooze-engine.js', 'w', encoding='utf-8') as f:
    f.write(snooze_code)
print("✓ Notifications: snooze-engine.js")

# 22. NOTIFICATIONS: notif-center.js (Lines 3760 - 4044)
raw_center = get_lines(super_lines, 3760, 4044)
notif_center_code = f"""// foh-opening/js/domains/notifications/notif-center.js
// Header Notification Bell & Operational Notification Center Modal
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function getActivePendingNameChanges() {{
    return FOH.pendingApprovals ? FOH.pendingApprovals.getActivePendingNameChanges() : [];
  }}

  function getAppRoleIdentity() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {{}};
  }}

  function isAlertSnoozedNow(id) {{
    return FOH.snoozeEngine ? FOH.snoozeEngine.isAlertSnoozedNow(id) : false;
  }}

  function snoozeAlertWithTimer(id, ms, lbl) {{
    if (FOH.snoozeEngine && FOH.snoozeEngine.snoozeAlertWithTimer) FOH.snoozeEngine.snoozeAlertWithTimer(id, ms, lbl);
  }}

  function loadSnoozeTimers() {{
    return FOH.snoozeEngine ? FOH.snoozeEngine.loadSnoozeTimers() : {{}};
  }}

  function saveSnoozeTimers(t) {{
    if (FOH.snoozeEngine && FOH.snoozeEngine.saveSnoozeTimers) FOH.snoozeEngine.saveSnoozeTimers(t);
  }}

  function ensureNotificationPermission() {{
    if (FOH.snoozeEngine && FOH.snoozeEngine.ensureNotificationPermission) FOH.snoozeEngine.ensureNotificationPermission();
  }}

  function scheduleServiceWorkerNotification(a, b, c) {{
    if (FOH.snoozeEngine && FOH.snoozeEngine.scheduleServiceWorkerNotification) FOH.snoozeEngine.scheduleServiceWorkerNotification(a, b, c);
  }}

  function fireNativeLockScreenNotification(t, b, tag) {{
    if (FOH.snoozeEngine && FOH.snoozeEngine.fireNativeLockScreenNotification) FOH.snoozeEngine.fireNativeLockScreenNotification(t, b, tag);
  }}

  function roleName(id) {{
    return FOH.taskSheet && FOH.taskSheet.roleName ? FOH.taskSheet.roleName(id) : 'Staff';
  }}

  function loadPendingNameChanges() {{
    return FOH.pendingApprovals ? FOH.pendingApprovals.loadPendingNameChanges() : [];
  }}

  function savePendingNameChanges(list) {{
    if (FOH.pendingApprovals) FOH.pendingApprovals.savePendingNameChanges(list);
  }}

  function getHealthAlerts() {{
    return FOH.gov ? FOH.gov.getHealthAlerts() : [];
  }}

  function getCurrentSuperRoleKey() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }}

  function getAppRoleIdentity() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {{}};
  }}

  function updateNotifBellUI() {{
    if (FOH.notifCenter && FOH.notifCenter.updateNotifBellUI) FOH.notifCenter.updateNotifBellUI();
  }}

  function loadSuggestions() {{
    return FOH.suggestions ? FOH.suggestions.loadSuggestions() : [];
  }}

  function saveSuggestions(s) {{
    if (FOH.suggestions) FOH.suggestions.saveSuggestions(s);
  }}

  function getActiveSnoozeTimersList() {{
    return FOH.snoozeEngine ? FOH.snoozeEngine.getActiveSnoozeTimersList() : [];
  }}

  function loadTaskInbox() {{
    return FOH.taskInbox ? FOH.taskInbox.loadTaskInbox() : [];
  }}

  function saveTaskInbox(ib) {{
    if (FOH.taskInbox) FOH.taskInbox.saveTaskInbox(ib);
  }}

{raw_center}

  FOH.notifCenter = {{
    ensureNotifBellInHeader,
    updateNotifBellUI,
    openNotificationCenterModal,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/notifications/notif-center.js', 'w', encoding='utf-8') as f:
    f.write(notif_center_code)
print("✓ Notifications: notif-center.js")

# 23. NAVIGATION: sidebar-nav.js (Lines 4045 - 4402)
raw_side = get_lines(super_lines, 4045, 4402)
side_code = f"""// foh-opening/js/domains/navigation/sidebar-nav.js
// Responsive Drawer Navigation, Role-Scoped Views & Contextual Controls (RBAC Enforced)
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;

  const PERM_LABELS = (FOH.opsLifecycle && FOH.opsLifecycle.PERM_LABELS) || (FOH.PERM_LABELS || []);
  const SUPER_ROLES_META = new Proxy({{}}, {{
    get(target, prop) {{
      const meta = (FOH.opsLifecycle && FOH.opsLifecycle.SUPER_ROLES_META) || (FOH.SUPER_ROLES_META || {{}});
      return meta[prop];
    }},
    ownKeys() {{
      const meta = (FOH.opsLifecycle && FOH.opsLifecycle.SUPER_ROLES_META) || (FOH.SUPER_ROLES_META || {{}});
      return Object.keys(meta);
    }},
    getOwnPropertyDescriptor(target, prop) {{
      return {{ enumerable: true, configurable: true, value: this.get(target, prop) }};
    }}
  }});
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function getCurrentSuperRoleKey() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }}

  function getAppRoleIdentity() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {{ allowedViews: ['opening', 'mine'] }};
  }}

  function canCurrentUserAccessOrders() {{
    return FOH.roleIdentity ? FOH.roleIdentity.canCurrentUserAccessOrders() : true;
  }}

  function loadGov() {{
    return FOH.gov ? FOH.gov.loadGov() : {{}};
  }}

  function saveGov(g) {{
    if (FOH.gov) FOH.gov.saveGov(g);
  }}

  function canCurrentUserEditChecklist() {{
    return FOH.gov ? FOH.gov.canCurrentUserEditChecklist() : false;
  }}

  function getActiveSheetType() {{
    return FOH.threeShifts ? FOH.threeShifts.getActiveSheetType() : 'opening';
  }}

  function calcDaysLeft(d) {{
    return FOH.gov ? FOH.gov.calcDaysLeft(d) : 999;
  }}

  function renderUnifiedThreeSheetNav() {{
    if (FOH.threeShifts) FOH.threeShifts.renderUnifiedThreeSheetNav();
  }}

  function collapseOpsLifecycleBarToOneLine() {{
    if (FOH.headerSubbars) FOH.headerSubbars.collapseOpsLifecycleBarToOneLine();
  }}

  function enforceTimeBasedSheetSchedule() {{
    if (FOH.threeShifts) FOH.threeShifts.enforceTimeBasedSheetSchedule();
  }}

  function activateClosingSheet() {{
    if (FOH.opsLifecycle && FOH.opsLifecycle.activateClosingSheet) FOH.opsLifecycle.activateClosingSheet();
  }}

  function injectAssignTaskBtnIntoToolbarAndMine() {{
    if (FOH.taskAssignment) FOH.taskAssignment.injectAssignTaskBtnIntoToolbarAndMine();
  }}

  function quickSwitchEmployeeAccount(u) {{
    if (FOH.roleIdentity && FOH.roleIdentity.quickSwitchEmployeeAccount) FOH.roleIdentity.quickSwitchEmployeeAccount(u);
  }}

  function relocateHeaderSubbarsToMain() {{
    if (FOH.headerSubbars) FOH.headerSubbars.relocateHeaderSubbarsToMain();
  }}

  function isClosingSheetActive() {{
    return (FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive)
      ? FOH.opsLifecycle.isClosingSheetActive()
      : ((FOH.threeShifts && FOH.threeShifts.getActiveSheetType) ? FOH.threeShifts.getActiveSheetType() === 'closing' : false);
  }}

  function renderUnifiedSingleRowChecklistBar() {{
    if (FOH.headerSubbars) FOH.headerSubbars.renderUnifiedSingleRowChecklistBar();
  }}

  function injectRoleSwitcherInSidebar() {{
    if (FOH.headerSubbars) FOH.headerSubbars.injectRoleSwitcherInSidebar();
  }}

  function renderAssignedTaskBadgesAndFilter() {{
    if (FOH.taskAssignment) FOH.taskAssignment.renderAssignedTaskBadgesAndFilter();
  }}

  function wireAutomaticTaskCreationNotifications() {{
    if (FOH.taskInbox) FOH.taskInbox.wireAutomaticTaskCreationNotifications();
  }}

  function renderCleanHeaderText() {{
    if (FOH.headerSubbars) FOH.headerSubbars.renderCleanHeaderText();
  }}

{raw_side}

  // Security Hardening: Wrap switchView with strict allowedViews check
  const origSwitchView = switchView;
  function secureSwitchView(nextView) {{
    const roleIdent = getAppRoleIdentity();
    const ar = isAr();
    if (roleIdent && roleIdent.allowedViews && !roleIdent.allowedViews.includes(nextView)) {{
      if (FOH.edit && FOH.edit.toast) {{
        FOH.edit.toast(ar ? '⚠️ ليس لديك صلاحية الوصول إلى هذه الصفحة' : '⚠️ Access restricted for your role');
      }}
      return;
    }}
    origSwitchView(nextView);
  }}

  FOH.navigation = {{
    enhanceChecklistContextAndRoleScope,
    enhanceSidebarAndInventory,
    openSidebar,
    closeSidebar,
    switchView: secureSwitchView,
    getSectionMeta,
    renderSidebarContent,
  }};

  FOH.switchView = secureSwitchView;
  FOH.openSidebar = openSidebar;
  FOH.closeSidebar = closeSidebar;
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/navigation/sidebar-nav.js', 'w', encoding='utf-8') as f:
    f.write(side_code)
print("✓ Navigation: sidebar-nav.js")

# 24. SHIFTS: header-subbars.js (Lines 4403 - 4650)
raw_bars = get_lines(super_lines, 4403, 4650)
bars_code = f"""// foh-opening/js/domains/shifts/header-subbars.js
// Header Subbars Layout & Single-Row Checklist Subbar
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function loadGov() {{
    return FOH.gov ? FOH.gov.loadGov() : {{}};
  }}

  function saveGov(g) {{
    if (FOH.gov) FOH.gov.saveGov(g);
  }}

  function canCurrentUserEditChecklist() {{
    return FOH.gov ? FOH.gov.canCurrentUserEditChecklist() : false;
  }}

  function getActiveSheetType() {{
    return FOH.threeShifts ? FOH.threeShifts.getActiveSheetType() : 'opening';
  }}

  function openSuggestionModal() {{
    if (FOH.suggestions) FOH.suggestions.openSuggestionModal();
  }}

  function getEffectiveNowHM() {{
    return FOH.opsLifecycle ? FOH.opsLifecycle.getEffectiveNowHM() : '12:00';
  }}

  function formatTime12Ar(hm) {{
    return FOH.opsLifecycle ? FOH.opsLifecycle.formatTime12Ar(hm) : hm;
  }}

  function getAppRoleIdentity() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {{}};
  }}

  function quickSwitchEmployeeAccount(u) {{
    if (FOH.roleIdentity && FOH.roleIdentity.quickSwitchEmployeeAccount) FOH.roleIdentity.quickSwitchEmployeeAccount(u);
  }}

  function hasSuperPerm(p) {{
    return FOH.roleIdentity ? FOH.roleIdentity.hasSuperPerm(p) : true;
  }}

  function closeSidebar() {{
    if (FOH.navigation) FOH.navigation.closeSidebar();
  }}

  function isClosingSheetActive() {{
    return (FOH.opsLifecycle && FOH.opsLifecycle.isClosingSheetActive)
      ? FOH.opsLifecycle.isClosingSheetActive()
      : ((FOH.threeShifts && FOH.threeShifts.getActiveSheetType) ? FOH.threeShifts.getActiveSheetType() === 'closing' : false);
  }}

  function toBizMinutes(hm) {{
    return FOH.opsLifecycle ? FOH.opsLifecycle.toBizMinutes(hm) : 0;
  }}

  function loadOpsConfig() {{
    return FOH.opsLifecycle ? FOH.opsLifecycle.loadOpsConfig() : {{}};
  }}

  function loadOpsDayState() {{
    return FOH.opsLifecycle ? FOH.opsLifecycle.loadOpsDayState() : {{}};
  }}

  function getCurrentSuperRoleKey() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }}

{raw_bars}

  FOH.headerSubbars = {{
    relocateHeaderSubbarsToMain,
    renderCleanHeaderText,
    collapseOpsLifecycleBarToOneLine,
    renderUnifiedSingleRowChecklistBar,
    injectRoleSwitcherInSidebar,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/shifts/header-subbars.js', 'w', encoding='utf-8') as f:
    f.write(bars_code)
print("✓ Shifts: header-subbars.js")

# 25. TASKS: task-inbox-notif.js (Lines 4651 - 4871)
raw_inbox = get_lines(super_lines, 4651, 4871)
task_inbox_code = f"""// foh-opening/js/domains/tasks/task-inbox-notif.js
// Automatic Task Creation Notifications & Staff Task Inbox
(function (FOH) {{
  'use strict';

  const S = FOH.state;

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function updateNotifBellUI() {{
    if (FOH.notifCenter) FOH.notifCenter.updateNotifBellUI();
  }}

  const $ = (id) => document.getElementById(id);
  const {{ el }} = FOH.view;

  function ensureNotificationPermission() {{
    if (FOH.snoozeEngine) FOH.snoozeEngine.ensureNotificationPermission();
  }}

  function openNotificationCenterModal() {{
    if (FOH.notifCenter && FOH.notifCenter.openNotificationCenterModal) FOH.notifCenter.openNotificationCenterModal();
  }}

  function scheduleServiceWorkerNotification(a, b, c) {{
    if (FOH.snoozeEngine) FOH.snoozeEngine.scheduleServiceWorkerNotification(a, b, c);
  }}

  function fireNativeLockScreenNotification(t, b, tag) {{
    if (FOH.snoozeEngine) FOH.snoozeEngine.fireNativeLockScreenNotification(t, b, tag);
  }}

{raw_inbox}

  FOH.taskInbox = {{
    loadTaskInbox,
    saveTaskInbox,
    computeDelayMsForHM,
    notifyMobileOnNewTaskAdded,
    wireAutomaticTaskCreationNotifications,
    injectNewTasksInboxIntoNotifCenter,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/tasks/task-inbox-notif.js', 'w', encoding='utf-8') as f:
    f.write(task_inbox_code)
print("✓ Tasks: task-inbox-notif.js")

# 26. SHIFTS: three-shifts-nav.js (Lines 4872 - 5024)
raw_three_shifts = get_lines(super_lines, 4872, 5024)
three_shifts_code = f"""// foh-opening/js/domains/shifts/three-shifts-nav.js
// Time-Based Sheet Schedule (Opening, Mid-Shift, Closing) & Segmented Control Nav
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function loadOpsConfig() {{
    return FOH.opsLifecycle ? FOH.opsLifecycle.loadOpsConfig() : {{}};
  }}

  function toBizMinutes(hm) {{
    return FOH.opsLifecycle ? FOH.opsLifecycle.toBizMinutes(hm) : 0;
  }}

  function getEffectiveNowHM() {{
    return FOH.opsLifecycle ? FOH.opsLifecycle.getEffectiveNowHM() : '12:00';
  }}

{raw_three_shifts}

  FOH.threeShifts = {{
    getActiveSheetType,
    getSheetScheduleWindows,
    getScheduledSheetForNow,
    enforceTimeBasedSheetSchedule,
    renderUnifiedThreeSheetNav,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/shifts/three-shifts-nav.js', 'w', encoding='utf-8') as f:
    f.write(three_shifts_code)
print("✓ Shifts: three-shifts-nav.js")

# 27. TASKS: task-assignment.js (Lines 5025 - 5367)
raw_task_assign = get_lines(super_lines, 5025, 5367)
task_assign_code = f"""// foh-opening/js/domains/tasks/task-assignment.js
// Add & Assign Tasks to Specific Employees or Roles with Department Filtering
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function getCurrentSuperRoleKey() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }}

  function roleName(id) {{
    return FOH.taskSheet && FOH.taskSheet.roleName ? FOH.taskSheet.roleName(id) : 'Staff';
  }}

  function getActiveSheetType() {{
    return FOH.threeShifts ? FOH.threeShifts.getActiveSheetType() : 'opening';
  }}

  const roleScopeOnly = true;

  function notifyMobileOnNewTaskAdded(t) {{
    if (FOH.realtime) FOH.realtime.notifyMobileOnNewTaskAdded(t);
  }}

  function getScheduledSheetForNow() {{
    return FOH.threeShifts ? FOH.threeShifts.getScheduledSheetForNow() : 'opening';
  }}

{raw_task_assign}

  FOH.taskAssignment = {{
    openAssignTaskToStaffOrRoleModal,
    renderAssignedTaskBadgesAndFilter,
    injectAssignTaskBtnIntoToolbarAndMine,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/tasks/task-assignment.js', 'w', encoding='utf-8') as f:
    f.write(task_assign_code)
print("✓ Tasks: task-assignment.js")

# 28. CLOUD: realtime-broadcast.js (Lines 5368 - 5643 directly)
raw_realtime = get_lines(super_lines, 5368, 5643)
realtime_helpers = """
    function getSession() {
      return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
    }
    function getCurrentSuperRoleKey() {
      return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
    }
    function loadMidSections() {
      return FOH.sheetState ? FOH.sheetState.loadMidSections() : [];
    }
    function loadClosingSections() {
      return FOH.sheetState ? FOH.sheetState.loadClosingSections() : [];
    }
    function saveMidSections(s) {
      if (FOH.sheetState) FOH.sheetState.saveMidSections(s);
    }
    function fireNativeLockScreenNotification(t, b, id) {
      if (FOH.snoozeEngine) FOH.snoozeEngine.fireNativeLockScreenNotification(t, b, id);
    }
    function notifyMobileOnNewTaskAdded(t) {
      if (FOH.notifCenter && FOH.notifCenter.notifyMobileOnNewTaskAdded) FOH.notifCenter.notifyMobileOnNewTaskAdded(t);
    }
"""
raw_realtime = raw_realtime.replace("'use strict';", "'use strict';" + realtime_helpers)
raw_realtime = raw_realtime.replace("FOH.cloudRealtime = {", "FOH.realtime = FOH.cloudRealtime = {")
with open('foh-opening/js/domains/cloud/realtime-broadcast.js', 'w', encoding='utf-8') as f:
    f.write(raw_realtime)
print("✓ Cloud: realtime-broadcast.js")

# 29. SHIFTS: landing-hero.js (Lines 5644 - 5887)
raw_hero = get_lines(super_lines, 5644, 5887)
landing_hero_code = f"""// foh-opening/js/domains/shifts/landing-hero.js
// Role-Tailored Landing Hero Card with High-Precision Progress KPI Badge
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const {{ t }} = FOH.i18n;
  const {{ el }} = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function getCurrentSuperRoleKey() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }}

  function canCurrentUserAccessOrders() {{
    return FOH.roleIdentity ? FOH.roleIdentity.canCurrentUserAccessOrders() : true;
  }}

  function switchView(v) {{
    if (FOH.navigation) FOH.navigation.switchView(v);
  }}

  function openAssignTaskToStaffOrRoleModal() {{
    if (FOH.taskAssignment) FOH.taskAssignment.openAssignTaskToStaffOrRoleModal();
  }}

  function saveSession(s) {{
    if (FOH.sessionAuth) FOH.sessionAuth.saveSession(s);
  }}

{raw_hero}

  FOH.landingHero = {{
    renderRoleSpecificLandingHero,
  }};
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/shifts/landing-hero.js', 'w', encoding='utf-8') as f:
    f.write(landing_hero_code)
print("✓ Shifts: landing-hero.js")

# 30. SHIFTS: super-employee-init.js (Lines 5888 - 6050)
raw_init = get_lines(super_lines, 5888, 6050)
raw_init = re.sub(r'FOH\.superEmployee = \{[\s\S]*?\}\)\(window\.FOH = window\.FOH \|\| \{\}\);', '', raw_init)
raw_init = re.sub(r'document\.addEventListener\(\'DOMContentLoaded\', init\);', '', raw_init)

super_init_code = f"""// foh-opening/js/domains/shifts/super-employee-init.js
// Master UI Synchronizer & Application Initialization
(function (FOH) {{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {{
    return FOH.i18n.lang === 'ar';
  }}

  function getSession() {{
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }}

  function loadGov() {{
    return FOH.gov ? FOH.gov.loadGov() : {{}};
  }}

  function saveGov(gov) {{
    if (FOH.gov && FOH.gov.saveGov) FOH.gov.saveGov(gov);
  }}

  function openSidebar() {{
    if (FOH.navigation && FOH.navigation.openSidebar) FOH.navigation.openSidebar();
  }}

  function closeSidebar() {{
    if (FOH.navigation && FOH.navigation.closeSidebar) FOH.navigation.closeSidebar();
  }}

  function switchView(v) {{
    if (FOH.navigation && FOH.navigation.switchView) FOH.navigation.switchView(v);
  }}

  function ensureStaffHealthAndPerms() {{
    if (FOH.gov) FOH.gov.ensureStaffHealthAndPerms();
  }}

  function canCurrentUserEditChecklist() {{
    return FOH.gov ? FOH.gov.canCurrentUserEditChecklist() : false;
  }}

  function getAppRoleIdentity() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {{ allowedViews: ['opening', 'mine'] }};
  }}

  function canCurrentUserAccessOrders() {{
    return FOH.roleIdentity ? FOH.roleIdentity.canCurrentUserAccessOrders() : true;
  }}

  function getHealthAlerts() {{
    return FOH.gov ? FOH.gov.getHealthAlerts() : [];
  }}

  function getCurrentSuperRoleKey() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }}

  function getAppRoleIdentity() {{
    return FOH.roleIdentity ? FOH.roleIdentity.getAppRoleIdentity() : {{}};
  }}

  function updateNotifBellUI() {{
    if (FOH.notifCenter && FOH.notifCenter.updateNotifBellUI) FOH.notifCenter.updateNotifBellUI();
  }}

  function loadSuggestions() {{
    return FOH.suggestions ? FOH.suggestions.loadSuggestions() : [];
  }}

  function ensureUpgradedClosingSections() {{
    if (FOH.opsLifecycle) FOH.opsLifecycle.ensureUpgradedClosingSections();
  }}

  function ensureNotifBellInHeader() {{
    if (FOH.notifCenter) FOH.notifCenter.ensureNotifBellInHeader();
  }}

  function renderHealthBanner() {{
    if (FOH.gov) FOH.gov.renderHealthBanner();
  }}

  function renderSmartAlertBanners() {{
    if (FOH.snoozeEngine) FOH.snoozeEngine.renderSmartAlertBanners();
  }}

  function renderOpsLifecycleBar() {{
    if (FOH.opsLifecycle) FOH.opsLifecycle.renderOpsLifecycleBar();
  }}

  function renderChecklistGovBar() {{
    if (FOH.suggestions) FOH.suggestions.renderChecklistGovBar();
  }}

  function enhanceChecklistContextAndRoleScope() {{
    if (FOH.navigation) FOH.navigation.enhanceChecklistContextAndRoleScope();
  }}

  function renderClosingDeptFilterBar() {{
    if (FOH.opsLifecycle) FOH.opsLifecycle.renderClosingDeptFilterBar();
  }}

  function injectChecklistItemNotes() {{
    if (FOH.suggestions) FOH.suggestions.injectChecklistItemNotes();
  }}

  function enhanceSidebarAndInventory() {{
    if (FOH.navigation) FOH.navigation.enhanceSidebarAndInventory();
  }}

  function wireAutomaticTaskCreationNotifications() {{
    if (FOH.taskInbox) FOH.taskInbox.wireAutomaticTaskCreationNotifications();
  }}

  function enforceTimeBasedSheetSchedule() {{
    if (FOH.threeShifts) FOH.threeShifts.enforceTimeBasedSheetSchedule();
  }}

  function relocateHeaderSubbarsToMain() {{
    if (FOH.headerSubbars) FOH.headerSubbars.relocateHeaderSubbarsToMain();
  }}

  function renderCleanHeaderText() {{
    if (FOH.headerSubbars) FOH.headerSubbars.renderCleanHeaderText();
  }}

  function collapseOpsLifecycleBarToOneLine() {{
    if (FOH.headerSubbars) FOH.headerSubbars.collapseOpsLifecycleBarToOneLine();
  }}

  function renderUnifiedSingleRowChecklistBar() {{
    if (FOH.headerSubbars) FOH.headerSubbars.renderUnifiedSingleRowChecklistBar();
  }}

  function renderUnifiedThreeSheetNav() {{
    if (FOH.threeShifts) FOH.threeShifts.renderUnifiedThreeSheetNav();
  }}

  function renderRoleSpecificLandingHero() {{
    if (FOH.landingHero) FOH.landingHero.renderRoleSpecificLandingHero();
  }}

  function renderAssignedTaskBadgesAndFilter() {{
    if (FOH.taskAssignment) FOH.taskAssignment.renderAssignedTaskBadgesAndFilter();
  }}

  function injectAssignTaskBtnIntoToolbarAndMine() {{
    if (FOH.taskAssignment) FOH.taskAssignment.injectAssignTaskBtnIntoToolbarAndMine();
  }}

  function injectRoleSwitcherInSidebar() {{
    if (FOH.headerSubbars) FOH.headerSubbars.injectRoleSwitcherInSidebar();
  }}

  function renderAcademyView(el) {{
    if (FOH.academyView) FOH.academyView.renderAcademyView(el);
  }}

  function renderTipsView(el) {{
    if (FOH.tipsView) FOH.tipsView.renderTipsView(el);
  }}

  function renderDashboardView(el) {{
    if (FOH.dashboardView) FOH.dashboardView.renderDashboardView(el);
  }}

  function renderProfilePageView(el) {{
    if (FOH.healthProfileView) FOH.healthProfileView.renderProfilePageView(el);
  }}

  function renderSettingsView(el) {{
    if (FOH.settingsView) FOH.settingsView.renderSettingsView(el);
  }}

  function appendHoursAndSuperRolesSettings(el) {{
    if (FOH.hoursSettings) FOH.hoursSettings.appendHoursAndSuperRolesSettings(el);
  }}

  function checkExpiredSnoozeTimers() {{
    if (FOH.snoozeEngine) FOH.snoozeEngine.checkExpiredSnoozeTimers();
  }}

{raw_init}

  FOH.superEmployee = {{
    init,
    openSidebar: () => (FOH.navigation && FOH.navigation.openSidebar()),
    closeSidebar: () => (FOH.navigation && FOH.navigation.closeSidebar()),
    switchView: (v) => (FOH.navigation && FOH.navigation.switchView(v)),
    syncSuperEmployeeUI,
  }};

  // Automatically initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {{
    if (FOH.signoffGate && FOH.signoffGate.init) FOH.signoffGate.init();
    init();
  }});
}})(window.FOH = window.FOH || {{}});
"""
with open('foh-opening/js/domains/shifts/super-employee-init.js', 'w', encoding='utf-8') as f:
    f.write(super_init_code)
print("✓ Shifts: super-employee-init.js")

print("✓ All 30 modular domain files generated cleanly!")
