// foh-opening/scripts/generate_orders_ceen_css.mjs
// Extracts and scopes CEEN 2 Bar Orders CSS into foh-opening/css/orders-ceen.css
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ceenHtml = fs.readFileSync('C:/Users/fadia/Downloads/erp-platform/ceen-bar-orders-v2/index.html', 'utf8');
const rawCss = ceenHtml.match(/<style>([\s\S]*?)<\/style>/)[1];

// Parse top-level CSS tokens and blocks
function parseCSS(input) {
  const items = [];
  let i = 0;
  let inComment = false;

  while (i < input.length) {
    if (!inComment && input[i] === '/' && input[i + 1] === '*') {
      inComment = true;
      i += 2;
      continue;
    }
    if (inComment && input[i] === '*' && input[i + 1] === '/') {
      inComment = false;
      i += 2;
      continue;
    }
    if (inComment) {
      i++;
      continue;
    }

    // Skip whitespace
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }

    // Find next block
    let header = '';
    while (i < input.length && input[i] !== '{') {
      header += input[i];
      i++;
    }
    header = header.trim();
    if (i >= input.length) break;

    // input[i] === '{'
    i++;
    let depth = 1;
    let body = '';
    while (i < input.length && depth > 0) {
      if (input[i] === '{') depth++;
      else if (input[i] === '}') depth--;
      if (depth > 0) body += input[i];
      i++;
    }

    items.push({ header, body: body.trim() });
  }
  return items;
}

const topItems = parseCSS(rawCss);

function scopeSelectorList(selector) {
  const parts = selector.split(',').map(s => s.trim()).filter(Boolean);
  const scoped = [];

  for (const p of parts) {
    // Ignore global elements
    if (['*', 'html', 'body', ':root', 'header', '.header', '.top', '.brand', '.logo', '.version', '.header-status', '.tabs', '.tab', '.tab-inner', 'dialog'].includes(p)) {
      continue;
    }
    if (p.startsWith(':root') || p.startsWith('html') || p.startsWith('body') || p.startsWith('.header') || p.startsWith('.tabs') || p.startsWith('.brand') || p.startsWith('#install') || p.startsWith('#about') || p.startsWith('#delete') || p.startsWith('#reset') || p.startsWith('#message') || p.startsWith('#importFile')) {
      continue;
    }

    if (p.startsWith('#ordersView')) {
      scoped.push(p);
    } else if (p.startsWith('.')) {
      scoped.push(`#ordersView ${p}`, `.ord-ceen-scope ${p}`);
    } else if (p.startsWith('#')) {
      scoped.push(`#ordersView ${p}`);
    } else {
      scoped.push(`#ordersView ${p}`);
    }
  }

  return scoped;
}

function processBodyRules(body) {
  const rules = parseCSS(body);
  const out = [];
  for (const r of rules) {
    const scopedList = scopeSelectorList(r.header);
    if (scopedList.length > 0) {
      out.push(`  ${scopedList.join(',\n  ')} {\n    ${r.body.replace(/;/g, ';\n    ')}\n  }`);
    }
  }
  return out.join('\n');
}

let generated = `/* =========================================================================
   CEEN 2 Bar Orders Scoped Stylesheet for FOH Opening App
   Generated from ceen-bar-orders-v2 with strict #ordersView encapsulation,
   Obsidian Noir & Imperial Alabaster theme parity, and RTL support.
   ========================================================================= */

#ordersView,
.ord-ceen-scope {
  --bg: var(--bg-primary, #f5f6f0);
  --paper: var(--card, #ffffff);
  --raised: var(--accent-soft, #eaf1e7);
  --ink: var(--ink, #24392e);
  --muted: var(--muted, #69776e);
  --green: var(--accent, #245b48);
  --action: var(--accent, #245b48);
  --on-action: #ffffff;
  --soft: var(--accent-soft, #eaf1e7);
  --line: var(--line, #dfe6db);
  --control: var(--control, #ced9cb);
  --gold: var(--amber, #bc9762);
  --brass: #bc9762;
  --warn: #87562b;
  --danger: var(--danger, #a33f2e);
  --danger-soft: var(--danger-soft, #faece7);
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  --tab-height: var(--tab-bar-height, 68px);
  --header-height: 56px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--ink);
  padding-bottom: calc(140px + env(safe-area-inset-bottom, 16px)) !important;
  box-sizing: border-box;
}

body.dark #ordersView,
body.dark .ord-ceen-scope {
  --bg: var(--bg, #0e1311);
  --paper: var(--card, #161d1a);
  --raised: #1d2622;
  --ink: var(--ink, #eef2ee);
  --muted: var(--muted, #a3b1a8);
  --green: var(--accent, #8cc8aa);
  --action: #3f8f6f;
  --on-action: #07100b;
  --soft: #23382d;
  --line: var(--line, #303e35);
  --control: #708679;
  --gold: #c9a46a;
  --brass: #c9a46a;
  --warn: #e3bc7d;
  --danger: var(--danger, #ed917b);
  --danger-soft: #36251f;
  --shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

/* --- Responsive Floating Action Bar (Positioned safely above FOH Bottom Nav) --- */
#ordersView .bottom,
.ord-ceen-scope .bottom {
  position: fixed !important;
  bottom: calc(var(--tab-bar-height, 68px) + env(safe-area-inset-bottom, 16px)) !important;
  left: 0 !important;
  right: 0 !important;
  max-width: 680px !important;
  margin: 0 auto !important;
  z-index: 850 !important;
  background: rgba(255, 255, 255, 0.94) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid var(--line) !important;
  border-bottom: 0 !important;
  border-radius: 20px 20px 0 0 !important;
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.1) !important;
  padding: 10px 16px !important;
  display: block !important;
}

body.dark #ordersView .bottom,
body.dark .ord-ceen-scope .bottom {
  background: rgba(22, 29, 26, 0.94) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.5) !important;
}

#ordersView .bottom-inner,
.ord-ceen-scope .bottom-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 640px;
  margin: 0 auto;
}

#ordersView .bottom-info {
  font-size: 13px;
  color: var(--muted);
}
#ordersView .bottom-info strong {
  font-size: 18px;
  color: var(--ink);
  font-weight: 800;
  margin-inline-end: 4px;
}
#ordersView .bottom-info small {
  display: block;
  font-size: 11px;
}

/* --- Scoped CEEN 2 Rules --- */
`;

for (const item of topItems) {
  if (item.header.startsWith('@keyframes')) {
    generated += `\n${item.header} {\n  ${item.body}\n}\n`;
  } else if (item.header.startsWith('@media')) {
    if (item.header.includes('prefers-color-scheme') || item.header.includes('print')) continue;
    const scopedBody = processBodyRules(item.body);
    if (scopedBody.trim()) {
      generated += `\n${item.header} {\n${scopedBody}\n}\n`;
    }
  } else {
    const scopedList = scopeSelectorList(item.header);
    if (scopedList.length > 0) {
      generated += `\n${scopedList.join(',\n')} {\n  ${item.body.replace(/;/g, ';\n  ')}\n}\n`;
    }
  }
}

// Add RTL overrides
generated += `\n/* --- RTL & Logical Properties Overrides --- */
[dir="rtl"] #ordersView .search input,
html[lang="ar"] #ordersView .search input {
  padding-inline-start: 44px;
  padding-inline-end: 14px;
}
[dir="rtl"] #ordersView .search svg,
html[lang="ar"] #ordersView .search svg {
  inset-inline-start: 14px;
  inset-inline-end: auto;
}
[dir="rtl"] #ordersView .group-card .arrow,
html[lang="ar"] #ordersView .group-card .arrow {
  transform: scaleX(-1);
}
[dir="rtl"] #ordersView .breadcrumbs span,
html[lang="ar"] #ordersView .breadcrumbs span {
  display: inline-block;
  transform: scaleX(-1);
}
`;

const targetPath = path.join(rootDir, 'css/orders-ceen.css');
fs.writeFileSync(targetPath, generated, 'utf8');
console.log(`✓ Clean Scoped orders-ceen.css created: ${targetPath} (${(generated.length / 1024).toFixed(1)} KB)`);
