// foh-opening/js/domains/inventory/inventory-rotate.js
// Weekly rotation of inventory categories between staff (< 350 lines)

(function (FOH) {
  'use strict';

  const IS = FOH.invStore;

  // Staff who take part in counts.
  const participants = (tpl) => (tpl && tpl.staff ? tpl.staff.filter((p) => p.active && p.inv) : []);

  // How many weeks ago staff counted category before week key (Infinity = never).
  function weeksSince(inv, key, opts = {}) {
    const isLegacy = typeof opts === 'string' || typeof opts !== 'object' || opts === null;
    const catId = isLegacy ? opts : (opts && (opts.catId || opts.cat));
    const staffId = isLegacy ? arguments[3] : (opts && opts.staffId);
    if (!inv || !inv.weeks) return Infinity;
    const before = Object.keys(inv.weeks)
      .filter((k) => k < key)
      .sort()
      .reverse();
    for (let i = 0; i < before.length; i++) {
      const w = inv.weeks[before[i]];
      const who = (w.counts && w.counts[catId] && w.counts[catId].staffId) || (w.assign && w.assign[catId] && w.assign[catId].staffId);
      if (who === staffId) return i + 1;
    }
    return Infinity;
  }

  const tooSoon = (inv, key, catId, staffId) => weeksSince(inv, key, catId, staffId) <= ((inv && inv.settings && inv.settings.noRepeat) || 0);

  // Fill or refill the week's assignments (pinned ones stay).
  function distribute(inv, tpl, key) {
    const w = FOH.invStore.week(inv, key);
    const people = participants(tpl);
    if (!people.length) return false;
    const size = (cat) => FOH.invStore.leaves(cat).length;
    const load = new Map(people.map((p) => [p.id, 0]));
    inv.categories.forEach((cat) => {
      const a = w.assign[cat.id];
      if (a && a.pinned && load.has(a.staffId)) load.set(a.staffId, load.get(a.staffId) + size(cat));
    });
    inv.categories
      .slice()
      .sort((a, b) => size(b) - size(a))
      .forEach((cat) => {
        const a = w.assign[cat.id];
        if (a && a.pinned) return;
        const ranked = people
          .map((p) => ({ p, ok: !tooSoon(inv, key, cat.id, p.id), ago: weeksSince(inv, key, cat.id, p.id), r: Math.random() }))
          .sort((x, y) => y.ok - x.ok || load.get(x.p.id) - load.get(y.p.id) || y.ago - x.ago || x.r - y.r);
        const pick = ranked[0].p;
        w.assign[cat.id] = { staffId: pick.id, pinned: false };
        load.set(pick.id, load.get(pick.id) + size(cat));
      });
    return true;
  }

  // Someone other than exclude for a recount, preferring who has not counted it lately.
  function recounter(inv, tpl, opts = {}) {
    const isLegacy = typeof opts === 'string' || typeof opts !== 'object' || opts === null;
    const key = isLegacy ? opts : (opts && opts.key);
    const catId = isLegacy ? arguments[3] : (opts && opts.catId);
    const exclude = isLegacy ? arguments[4] : (opts && opts.exclude);
    const people = participants(tpl).filter((p) => p.id !== exclude);
    if (!people.length) return '';
    people.sort((a, b) => weeksSince(inv, key, catId, b.id) - weeksSince(inv, key, catId, a.id) || Math.random() - 0.5);
    return people[0].id;
  }

  FOH.rotate = { participants, weeksSince, tooSoon, distribute, recounter };
})(window.FOH = window.FOH || {});

