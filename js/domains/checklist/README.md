# Checklist Domain (js/domains/checklist)

## Overview
Core operational checklists engine for Front of House staff. Manages section-based opening/closing checklists, hierarchical parent-child tasks, progress calculation over leaf items, custom role/user section assignments, search filtering, and editing sheets.

## Interface
- `FOH.model.progress`: Calculates completion progress across leaf tasks `[model.js:progress]`
- `FOH.model.leaves`: Extracts all checkable leaf items from a section or task `[model.js:leaves]`
- `FOH.model.locate`: Returns position, parent, and section of a checklist item by ID `[model.js:locate]`
- `FOH.app.render`: Primary render function updating checklist cards, progress bars, and filters `[app.js:render]`
- `FOH.sectionAssignment.injectSectionControls`: Injects assignment controls and resolves responsible staff member for a department `[section-assignment.js:injectSectionControls]`
- `FOH.sectionAssignmentModal.openSectionModal`: Opens the interactive dialog to reassign sections to staff `[section-assignment-modal.js:openSectionModal]`
- `FOH.checklistSearch.applySearchFilter`: Real-time text search filtering across checklist items `[checklist-search.js:applySearchFilter]`
- `FOH.edit.handle`: Handles checklist template editing actions and mode transitions `[edit-actions.js:handle]`

## Invariants
- Parent items with sub-items are never ticked directly; their completion state derives strictly from leaf items `[model.js:isParent]`
- Progress calculation counts leaf items only (`progress.done / progress.total`) `[model.js:progress]`
- Only users with managerial or authorized roles may edit checklist templates or reassign sections `[section-assignment-modal.js:openSectionModal]`

## Side Effects
- Mutates checklist completion states in `localStorage` under active date keys `[app.js:saveRun]`
- Mutates section assignment mappings in `foh-opening.sectionAssignments.v1` `[section-assignment.js:persistCurrentSheet]`
- Direct DOM replacement of checklist container `#checklistRoot` `[app.js:render]`

## Verification
- Run: `node --test tests/*.test.mjs`

