// Pure helpers over the template: locate items, progress, nesting.
// A top-level item with sub-items is a "parent": it is never ticked itself.
// its state comes from its sub-items. Progress counts leaves only.
(function (FOH) {
  'use strict';

  const kids = (item) => item.children || [];
  const isParent = (item) => kids(item).length > 0;

  // The tickable items behind an item: its sub-items, or itself.
  const leaves = (item) => (isParent(item) ? kids(item) : [item]);

  function sectionLeaves(section) {
    return section.items.flatMap(leaves);
  }

  function allLeaves(tpl) {
    return tpl.sections.flatMap(sectionLeaves);
  }

  function progress(leafList, checked) {
    const done = leafList.filter((it) => checked[it.id]).length;
    return { done, total: leafList.length, complete: leafList.length > 0 && done === leafList.length };
  }

  // Where an item lives: { section, list, index, item, parent } or null.
  function locate(tpl, id) {
    for (const section of tpl.sections) {
      for (let i = 0; i < section.items.length; i++) {
        const item = section.items[i];
        if (item.id === id) return { section, list: section.items, index: i, item, parent: null };
        const k = kids(item).findIndex((c) => c.id === id);
        if (k !== -1) return { section, list: item.children, index: k, item: item.children[k], parent: item };
      }
    }
    return null;
  }

  function move(arr, from, to) {
    if (from < 0 || to < 0 || to >= arr.length || from === to) return false;
    const [x] = arr.splice(from, 1);
    arr.splice(to, 0, x);
    return true;
  }

  // The item just above a top-level item, which it would be nested under.
  function indentTarget(tpl, id) {
    const at = locate(tpl, id);
    if (!at || at.parent || at.index === 0 || isParent(at.item)) return null;
    return at.list[at.index - 1];
  }

  // Make a top-level item a sub-item of the item above it.
  function indent(tpl, id) {
    const target = indentTarget(tpl, id);
    if (!target) return false;
    const at = locate(tpl, id);
    at.list.splice(at.index, 1);
    delete at.item.children;
    if (!target.children) target.children = [];
    target.children.push(at.item);
    return true;
  }

  // Make a sub-item a top-level item, placed right after its old parent.
  function outdent(tpl, id) {
    const at = locate(tpl, id);
    if (!at || !at.parent) return false;
    at.list.splice(at.index, 1);
    at.item.children = [];
    const pIndex = at.section.items.indexOf(at.parent);
    at.section.items.splice(pIndex + 1, 0, at.item);
    return true;
  }

  // Number shown for every item id: "3" for top-level, "3.2" for sub-items.
  function numbering(tpl) {
    const map = new Map();
    let n = 0;
    tpl.sections.forEach((s) =>
      s.items.forEach((it) => {
        n += 1;
        map.set(it.id, String(n));
        kids(it).forEach((c, i) => map.set(c.id, n + '.' + (i + 1)));
      })
    );
    return map;
  }

  FOH.model = {
    kids,
    isParent,
    leaves,
    sectionLeaves,
    allLeaves,
    progress,
    locate,
    move,
    indentTarget,
    indent,
    outdent,
    numbering,
  };
})(window.FOH = window.FOH || {});
