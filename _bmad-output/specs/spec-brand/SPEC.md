---
id: SPEC-brand
companions:
  - schema-migration.md
  - brownfield.md
  - ../../project-context.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Brand

## Why

A pain to solve, with a mandate attached. Figures carry a free-text `franchise` field, so the same brand is retyped on every figure — typo-prone, never validated, and unusable for organizing a catalog that has grown past 20 figures rendered as one flat grid. Paolo (sole user) wants brand as a real entity: picked, not typed, and driving grouping/filtering in the catalog. Promoting the field changes the persisted data shape, which mandates an export schema v2 plus migrations so existing v1 export files and live pre-upgrade IndexedDB data survive losslessly.

## Capabilities

- **CAP-1**
  - **intent:** The system models Brand as a first-class entity (`{ id, name }`); a figure references at most one brand by id, replacing the free-text `franchise` field everywhere (types, store, persistence, forms, display).
  - **success:** `Figure` carries `brandId: string | null` and no `franchise` field; brands persist across reloads exactly like spools, figures, and queue items.

- **CAP-2**
  - **intent:** When creating or editing a figure, the user assigns its brand by selecting an existing brand or creating a new one on the spot (combobox-style select-or-create), or clears it to none.
  - **success:** Typing a name not in the list offers a create action that mints the brand and selects it; picking an existing brand links its id; the field can be cleared to no-brand; no save path stores a raw brand-name string on the figure. Inline creation is staged: the brand is committed only when the figure saves — cancelling the form persists nothing.

- **CAP-3**
  - **intent:** The figure catalog groups figures into sections by brand and lets the user select/deselect brands to filter which figures are shown.
  - **success:** The catalog renders one section per brand that has figures, plus a "No brand" section when brandless figures exist; "No brand" is selectable in the filter like any brand; deselecting a group hides its section, reselecting restores it; default state shows all. Deselecting every group shows an empty filtered state with a one-action "show all" reset. Brands appearing after mount (inline create or import) are visible by default, and import resets the filter.

- **CAP-4**
  - **intent:** JSON export emits schema version 2, carrying brands and figures' brand references.
  - **success:** An export produces `version: 2` with `data.brands` and `brandId`-bearing figures (no `franchise`); importing that file reproduces the exact same state (lossless round-trip).

- **CAP-5**
  - **intent:** Existing v1 export files still import: brands are derived from the distinct non-empty `franchise` values and figures are rewired to them by id.
  - **success:** Importing the real-data fixture (see `schema-migration.md`) yields exactly 7 brands — One Piece, Pokemon, Marvel, Lilo & Stitch, Sonic, Naruto, Dragon Ball — with all 22 figures linked to the right brand and 25 spools / 10 queue items untouched; a v1 figure whose `franchise` is empty imports with `brandId: null`.

- **CAP-6**
  - **intent:** Live local data written before this feature (IndexedDB without brands) migrates in place on first load after upgrade — no user action, no data loss.
  - **success:** Opening the upgraded app over a pre-brand database shows the same figures now linked to brands derived by the same rule as import migration, and the next export is v2.

## Constraints

- Import remains atomic full-replace for v1 and v2 files alike: one IndexedDB transaction spanning all object stores (now including brands); any failure rolls back and leaves current data untouched (extends the story 4-2 contract).
- One derivation/dedup rule governs import migration, live-data migration, and inline create: trim the name, match case-insensitively, first-seen casing becomes the brand's name, empty/whitespace maps to `brandId: null`; inline-creating a name that already exists selects the existing brand instead of duplicating it.
- Export files whose `version` is neither 1 nor 2 are rejected with the existing invalid-format error — no silent best-effort import.
- The no-referential-integrity-validation stance is preserved: import does not verify `brandId` resolves; the UI renders a figure with an unresolvable `brandId` as brandless, and the edit form persists what it shows — saving such a figure writes `brandId: null`.

## Non-goals

- Brand management UI: no rename, delete, or merge (create-only lifecycle; a zero-figure brand stays selectable in the combobox and simply has no catalog section). *Superseded 2026-08-28 by `../spec-brand-lifecycle/SPEC.md`, which adds rename/merge/delete and tightens v2 import brand validation.*
- Brand metadata beyond `name` (no color, logo, notes).
- Brand grouping or filtering outside the catalog — queue, color, and completed views only swap the franchise text for the brand name.
- Exporting v1 (export always writes v2).
- Persisting the catalog filter selection across sessions.
- Downgrade compatibility: a pre-brand build reopening the upgraded database is out of scope — a v1 export file taken before upgrading is the backout path.

## Success signal

Paolo imports his real 2026-08-28 v1 export into the upgraded app: the catalog shows 22 figures under 7 brand sections, deselecting brands trims the view, adding a figure offers those brands or mints a new one inline, and a fresh export is a v2 file that re-imports to the identical state.

## Assumptions

- Brand sections, filter controls, and the combobox list sort alphabetically by name (precedent: alphabetical spool library, commit 30e1bfb).
- The catalog brand filter is ephemeral UI state; it resets on reload.
- Display continuity: everywhere franchise text renders today (FigureCard, QueueItemCard, ColorRankingEntry, completed view) now renders the referenced brand's name, conditionally as today.
- Brand ids are minted with `crypto.randomUUID()` like other entities; v2 import validation extends the existing plain type guards (no validation library).
