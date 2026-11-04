// foh-opening/scripts/make-modular-html.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const skeleton = fs.readFileSync(path.join(rootDir, 'index.skeleton.html'), 'utf8');

const CSS_FILES = [
  'css/base.css',
  'css/themes.css',
  'css/components.css',
  'css/checklist.css',
  'css/super-employee.css',
];

const JS_FILES = [
  'js/core/security.js',
  'js/core/i18n.js',
  'js/core/state.js',
  'js/domains/checklist/model.js',
  'js/core/time.js',
  'js/core/modal-picker.js',
  'js/domains/inventory/store.js',
  'js/domains/checklist/view.js',
  'js/domains/tasks/tasks-view.js',
  'js/domains/tasks/reminders.js',
  'js/domains/checklist/app.js',
  'js/domains/checklist/edit-sheet.js',
  'js/domains/tasks/task-sheet.js',
  'js/domains/tasks/task-actions.js',
  'js/domains/auth/staff.js',
  'js/domains/inventory/breakage.js',
  'js/domains/inventory/count.js',
  'js/domains/inventory/item-sheet.js',
  'js/domains/inventory/items.js',
  'js/domains/inventory/results.js',
  'js/domains/inventory/stock.js',
  'js/domains/inventory/manage.js',
  'js/domains/checklist/edit-actions.js',
  'js/core/pwa-install.js',
  'js/core/preview-demo.js',
  // Domain: Auth
  'js/domains/auth/pending-approvals.js',
  'js/domains/auth/session-auth.js',
  'js/domains/auth/profile-dialog.js',
  // Domain: Inventory
  'js/domains/inventory/batch-tally.js',
  // Domain: Shifts State & Claims
  'js/domains/shifts/sheet-state.js',
  'js/domains/shifts/section-claims.js',
  'js/domains/checklist/section-assignment.js',
  // Domain: Cloud & Sync
  'js/domains/cloud/cloud-sync.js',
  'js/domains/cloud/realtime-broadcast.js',
  // Domain: Tasks
  'js/domains/tasks/day-off.js',
  'js/domains/tasks/task-inbox-notif.js',
  'js/domains/tasks/task-assignment.js',
  // Domain: Orders
  'js/domains/orders/orders-catalog-data.js',
  'js/domains/orders/orders-store.js',
  'js/domains/orders/orders-dispatch.js',
  'js/domains/orders/orders-view.js',
  // Domain: Governance & Identity
  'js/domains/governance/restaurant-gov.js',
  'js/domains/governance/suggestions.js',
  'js/domains/shifts/role-identity.js',
  // Domain: Operations & Lifecycle
  'js/domains/operations/ops-lifecycle.js',
  'js/domains/operations/hours-settings.js',
  // Domain: Tips, Dashboard, Settings, Profile & Academy
  'js/domains/tips/tips-calc.js',
  'js/domains/tips/tips-store.js',
  'js/domains/tips/tips-modal.js',
  'js/domains/tips/tips-view.js',
  'js/domains/dashboard/dashboard-view.js',
  'js/domains/profile/health-profile-view.js',
  'js/domains/settings/settings-view.js',
  'js/domains/academy/academy-view.js',
  // Domain: Notifications & Navigation
  'js/domains/notifications/snooze-engine.js',
  'js/domains/notifications/notif-center.js',
  'js/domains/navigation/sidebar-nav.js',
  'js/domains/navigation/bottom-bar.js',
  'js/domains/navigation/mode-dept-panels.js',
  // Domain: UI Header, Navigation, Hero & Orchestration
  'js/domains/shifts/header-subbars.js',
  'js/domains/shifts/three-shifts-nav.js',
  'js/domains/shifts/landing-hero.js',
  'js/domains/shifts/signoff-gate.js',
  'js/domains/shifts/super-employee-init.js',
];

const BUILD_HASH = 'v' + Date.now();
const cssLinks = CSS_FILES.map(f => `    <link rel="stylesheet" href="${f}?v=${BUILD_HASH}">`).join('\n');
const jsScripts = JS_FILES.map(f => `    <script src="${f}?v=${BUILD_HASH}"></script>`).join('\n');

const modularHtml = skeleton
  .replace('<!-- CSS_PLACEHOLDER -->', `    <!-- Modular Clean CSS Architecture -->\n${cssLinks}`)
  .replace('<!-- JS_PLACEHOLDER -->', `    <!-- Modular Clean JS Architecture -->\n${jsScripts}`);

fs.writeFileSync(path.join(rootDir, 'index.modular.html'), modularHtml, 'utf8');
fs.writeFileSync(path.join(rootDir, 'index.html'), modularHtml, 'utf8');
console.log(`✓ Successfully generated foh-opening/index.html & index.modular.html with ${JS_FILES.length} clean modules`);
