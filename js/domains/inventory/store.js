// Inventory (blind count) data and rules. Kept apart from the checklist so
// expected quantities are never part of the checklist export.
//
// An item has id, names (en/ar), unit, location, photo, hints, and condition flags.
// Attributes (0 to 2) define variant values (such as size, type, or color).
// Variants hold id, attribute values, expected count, photo, and archived status.
// Counting happens per active variant, tracking good, repair, and writeoff quantities.
// Weekly records track publication status, staff assignments, counts, recounts, and approvals.
// Repairs track variantId, quantity, date, and logging staff member.
// Writeoffs track variantId, quantity, date, source reason, and staff note.
// Without a server this stays on the device; real blind counting (expected
// quantities never sent to staff phones) comes with the database.
(function (FOH) {
  'use strict';

  const KEY = 'foh-opening.inventory.v1';
  const list = (v) => (Array.isArray(v) ? v : []);
  const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 120) : '');
  const int = (v, min, max, dflt) => (Number.isInteger(v) && v >= min && v <= max ? v : dflt);
  const qty = (v) => (Number.isInteger(v) && v >= 0 ? v : null);
  const uid = () => FOH.store.uid();
  const UNITS = ['pcs', 'pairs', 'sets', 'boxes'];

  function normAttr(at) {
    return {
      id: text(at.id, 40) || uid(),
      name: text(at.name) || text(at.nameAr) || '—',
      nameAr: text(at.nameAr),
      values: list(at.values)
        .filter((v) => v && (text(v.label) || text(v.labelAr)))
        .map((v) => ({ id: text(v.id, 40) || uid(), label: text(v.label) || text(v.labelAr), labelAr: text(v.labelAr) })),
    };
  }

  // Any saved item (old: children = sub-items; new: attrs + variants) -> current shape.
  function normItem(it) {
    const base = {
      id: text(it.id, 40) || uid(),
      name: text(it.name) || text(it.nameAr) || '—',
      nameAr: text(it.nameAr || it.ar),
      unit: UNITS.includes(it.unit) ? it.unit : 'pcs',
      location: text(it.location),
      photo: text(it.photo, 60),
      hint: text(it.hint, 200),
      hintAr: text(it.hintAr, 200),
      cond: { repair: !!(it.cond && it.cond.repair), writeoff: !it.cond || it.cond.writeoff !== false },
    };
    if (!Array.isArray(it.variants)) {
      const kids = list(it.children).filter(Boolean);
      if (kids.length) {
        // Old sub-items become variants of one "Type" attribute; ids are kept.
        const values = kids.map((c) => ({ id: text(c.id, 40) + '_v', label: text(c.name), labelAr: text(c.nameAr) }));
        base.attrs = [normAttr({ name: 'Type', nameAr: 'النوع', values })];
        base.variants = kids.map((c, k) => ({ id: text(c.id, 40) || uid(), a: [values[k].id, ''], expected: qty(c.expected), photo: text(c.photo, 60), archived: false }));
        base.cond = { repair: true, writeoff: true };
        return base;
      }
      base.attrs = [];
      base.variants = [{ id: base.id, a: ['', ''], expected: qty(it.expected), photo: '', archived: false }];
      base.cond = { repair: true, writeoff: true };
      return base;
    }
    base.attrs = list(it.attrs).slice(0, 2).map(normAttr);
    const valueIds = base.attrs.map((at) => new Set(at.values.map((v) => v.id)));
    base.variants = it.variants.filter(Boolean).map((v) => ({
      id: text(v.id, 40) || uid(),
      a: [0, 1].map((k) => (valueIds[k] && valueIds[k].has(list(v.a)[k]) ? v.a[k] : '')),
      expected: qty(v.expected),
      photo: text(v.photo, 60),
      archived: v.archived === true,
    }));
    return base;
  }

  // Build an item from the compact example format in inv-data.js.
  function fromExample(x) {
    const attr = (a) => a && { name: a[0], nameAr: a[1], values: a[2].map(([label, labelAr]) => ({ id: uid(), label, labelAr })) };
    const attrs = [attr(x.a1), attr(x.a2)].filter(Boolean).map(normAttr);
    const variants = x.v
      ? x.v.map(([p, q, e]) => ({ id: uid(), a: [attrs[0].values[p].id, q >= 0 ? attrs[1].values[q].id : ''], expected: e }))
      : [{ id: uid(), a: ['', ''], expected: x.expected }];
    const cond = { repair: x.cond.includes('repair'), writeoff: x.cond.includes('writeoff') };
    return normItem({ ...x, nameAr: x.ar, attrs, variants, cond });
  }

  function defaults(tpl) {
    const roleId = (name) => (tpl.roles.find((r) => r.name === name) || {}).id;
    return {
      settings: {
        countDay: 4, // Thursday
        deadline: '18:00',
        flagPcs: 2,
        flagPct: 5,
        noRepeat: 3,
        results: [roleId('Supervisor'), roleId('Captain')].filter(Boolean),
        manage: [roleId('Supervisor')].filter(Boolean),
      },
      categories: FOH.DEFAULT_INVENTORY.map((c) => ({ id: uid(), name: c.name, nameAr: c.ar, icon: c.icon, items: c.items.map(fromExample) })),
      weeks: {},
      breakage: [],
      history: {},
      repairs: [],
      writeoffs: [],
    };
  }

  function normalize(raw, tpl) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.categories)) return defaults(tpl);
    const s = raw.settings || {};
    const roleIds = new Set(tpl.roles.map((r) => r.id));
    return {
      settings: {
        countDay: int(s.countDay, 0, 6, 4),
        deadline: FOH.store.TIME_RE.test(s.deadline) ? s.deadline : '18:00',
        flagPcs: int(s.flagPcs, 0, 9999, 2),
        flagPct: int(s.flagPct, 0, 100, 5),
        noRepeat: int(s.noRepeat, 0, 12, 3),
        results: list(s.results).filter((id) => roleIds.has(id)),
        manage: list(s.manage).filter((id) => roleIds.has(id)),
      },
      categories: raw.categories.filter(Boolean).map((c) => ({
        id: text(c.id, 40) || uid(),
        name: text(c.name) || text(c.nameAr) || '—',
        nameAr: text(c.nameAr),
        icon: text(c.icon, 8) || '📦',
        items: list(c.items).filter(Boolean).map(normItem),
      })),
      weeks: raw.weeks && typeof raw.weeks === 'object' ? raw.weeks : {},
      breakage: list(raw.breakage),
      history: raw.history && typeof raw.history === 'object' ? raw.history : {},
      repairs: list(raw.repairs),
      writeoffs: list(raw.writeoffs),
    };
  }

  function load(tpl) {
    let raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch (err) {
      /* Corrupt inventory state fallback */
      raw = null;
    }
    return normalize(raw, tpl);
  }

  function save(inv) {
    if (FOH.state && FOH.state.previewCountDemo) return true;
    try {
      localStorage.setItem(KEY, JSON.stringify(inv));
      return true;
    } catch (err) {
      /* Storage quota exceeded fallback */
      return false;
    }
  }

  // ---- lookups ----
  const active = (item) => item.variants.filter((v) => !v.archived);
  const leaves = (cat) => cat.items.flatMap(active);

  function findVariant(inv, id) {
    for (const cat of inv.categories) {
      for (const item of cat.items) {
        const variant = item.variants.find((v) => v.id === id);
        if (variant) return { cat, item, variant };
      }
    }
    return null;
  }

  const findItem = (inv, id) => {
    for (const cat of inv.categories) {
      const item = cat.items.find((it) => it.id === id);
      if (item) return { cat, item };
    }
    return null;
  };

  // ["Stainless", "Large · 5 L"]: attribute values of a variant, current language.
  function variantParts(item, v) {
    const pick = FOH.i18n.pick;
    return item.attrs
      .map((at, k) => at.values.find((x) => x.id === v.a[k]))
      .filter(Boolean)
      .map((x) => pick(x.label, x.labelAr));
  }

  const variantLabel = (item, v) => variantParts(item, v).join(' · ');

  // A count line, reading lines saved before conditions existed ({ qty, damaged }).
  function line(entry, id) {
    const l = entry && entry.lines && entry.lines[id];
    if (!l) return null;
    const good = Number.isInteger(l.good) ? l.good : Number.isInteger(l.qty) ? l.qty : null;
    return { good, repair: l.repair || 0, writeoff: Number.isInteger(l.writeoff) ? l.writeoff : l.damaged || 0, photo: l.photo || '', unsure: !!l.unsure };
  }

  // Everything found on site for a variant (good + repairable + write-off).
  const counted = (entry, id) => {
    const l = line(entry, id);
    return l && l.good !== null ? l.good + l.repair + l.writeoff : null;
  };

  function isFlagged(inv, expected, total) {
    if (expected === null || total === null) return false;
    const diff = Math.abs(total - expected);
    const pct = expected ? (diff * 100) / expected : diff ? 100 : 0;
    return diff > inv.settings.flagPcs || pct > inv.settings.flagPct;
  }

  // Count date of the week that contains `date`.
  function countDate(inv, tpl, date) {
    const first = FOH.schedule.weekStart(date, tpl.settings.weekStart);
    return FOH.schedule.addDays(first, (inv.settings.countDay - tpl.settings.weekStart + 7) % 7);
  }

  function week(inv, key) {
    if (!inv.weeks[key]) inv.weeks[key] = { published: false, assign: {}, counts: {}, recounts: {}, approved: {} };
    const w = inv.weeks[key];
    ['assign', 'counts', 'recounts', 'approved'].forEach((k) => (w[k] = w[k] || {}));
    return w;
  }

  function reference(inv, entry, v) {
    const base = entry && entry.expected && Object.prototype.hasOwnProperty.call(entry.expected, v.id) ? entry.expected[v.id] : v.expected;
    if (base === null) return null;
    const linked = new Set(entry && entry.damageReportIds || []);
    const damage = inv.breakage.filter((b) => linked.has(b.id) && b.variantId === v.id).reduce((n, b) => n + b.qty, 0);
    return base - damage;
  }

  // ---- stock changes ----
  const toRepair = (inv, variantId, n, since, by) => n > 0 && inv.repairs.push({ id: uid(), variantId, qty: n, since, by: by || '' });
  const writeOff = (inv, variantId, n, date, source, by, note) =>
    n > 0 && inv.writeoffs.push({ id: uid(), variantId, qty: n, date, source, by: by || '', note: note || '' });

  // Approve a category: good becomes the new expected, repairable go to
  // "in repair", write-offs leave stock. A submitted recount wins per variant.
  function approve(inv, key, opts = {}) {
    const isLegacy = opts && typeof opts === 'object' && !('cat' in opts) && !('category' in opts);
    const cat = isLegacy ? opts : (opts && (opts.cat || opts.category));
    const at = isLegacy ? (arguments[3] || '') : ((opts && opts.at) || '');
    if (!cat) return;
    const w = week(inv, key);
    if (w.approved[cat.id]) return;
    const first = w.counts[cat.id];
    const again = w.recounts[cat.id];
    const by = first && first.by;
    leaves(cat).forEach((v) => {
      const source = again && again.submittedAt && line(again, v.id) ? again : first;
      const l = line(source, v.id);
      if (!l || l.good === null) return;
      v.expected = l.good;
      toRepair(inv, v.id, l.repair, key, by);
      writeOff(inv, v.id, l.writeoff, key, 'count', by, '');
      (inv.history[v.id] = list(inv.history[v.id])).push({ date: key, qty: l.good });
    });
    w.approved[cat.id] = at;
  }

  FOH.invStore = {
    load,
    save,
    defaults,
    active,
    leaves,
    findVariant,
    findItem,
    variantLabel,
    variantParts,
    line,
    counted,
    isFlagged,
    countDate,
    week,
    approve,
    reference,
    toRepair,
    writeOff,
    normItem,
    UNITS,
  };
})(window.FOH = window.FOH || {});

