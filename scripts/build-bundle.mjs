// foh-opening/scripts/build-bundle.mjs
// Compiles all modular CSS and JS files into standalone single-file distribution
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

console.log(`Building standalone single-file distribution from ${JS_FILES.length} clean modules...`);

const skeletonPath = path.join(rootDir, 'index.skeleton.html');
const rawSkeleton = fs.readFileSync(skeletonPath, 'utf8');

// Compile CSS
let compiledCSS = '/* Bundled CSS from foh-opening/css/ */\n';
for (const file of CSS_FILES) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    compiledCSS += `\n/* --- ${file} --- */\n` + fs.readFileSync(filePath, 'utf8');
  }
}

// Compile JS
let compiledJS = '';
for (const file of JS_FILES) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    compiledJS += `\n<script>\n// --- ${file} ---\n` + fs.readFileSync(filePath, 'utf8') + `\n</script>\n`;
  }
}

const finalHtml = rawSkeleton
  .replace('<!-- CSS_PLACEHOLDER -->', `<style>\n${compiledCSS}\n</style>`)
  .replace('<!-- JS_PLACEHOLDER -->', compiledJS);

// 1. Write to downloads standalone bundle
const outPath = path.resolve('C:/Users/fadia/Downloads/foh-opening-checklist-6.html');
fs.writeFileSync(outPath, finalHtml, 'utf8');
console.log(`✓ Standalone file: ${outPath} (${(finalHtml.length / 1024).toFixed(1)} KB)`);

// 2. Write to foh-opening/dist/index.html
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'index.html'), finalHtml, 'utf8');
console.log(`✓ Dist bundle: ${path.join(distDir, 'index.html')}`);

// 3. Write to gh-pages-deploy/index.html
const ghPagesPath = path.resolve('C:/Users/fadia/.gemini/antigravity/brain/f6d3cbe1-721a-41a5-86f4-bc87cbabb4d2/scratch/gh-pages-deploy/index.html');
if (fs.existsSync(path.dirname(ghPagesPath))) {
  fs.writeFileSync(ghPagesPath, finalHtml, 'utf8');
  console.log(`✓ gh-pages-deploy bundle: ${ghPagesPath}`);
}

// 4. Write to wt-foh-opening/apps/foh-opening/index.html
const wtPath = path.resolve('wt-foh-opening/apps/foh-opening/index.html');
if (fs.existsSync(path.dirname(wtPath))) {
  fs.writeFileSync(wtPath, finalHtml, 'utf8');
  console.log(`✓ wt-foh-opening bundle: ${wtPath}`);
}
