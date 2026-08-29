# Test Expectations

## Verification baseline

`npm test` currently reports **364 passed / 1 failed of 365** (verified by a run on 2026-08-28). The sole failure is the pre-existing locale-dependent `app/routes/completed.test.tsx` "shows completion date", documented in `_bmad-output/implementation-artifacts/deferred-work.md` — it is **not** a regression signal. New work keeps every other test green.

Conventions: vitest, fireEvent (no user-event), co-located `*.test.ts(x)`, fake-indexeddb, `// @vitest-environment jsdom` for component tests.

## Store commands (CAP-2, CAP-3, CAP-4, CAP-5)

- `renameBrand`: casing-only rename → `renamed`, name updated, id preserved; unchanged text → `unchanged`; empty and whitespace-only → `invalid`, no mutation; collision with another brand → `collision` carrying `existingId`, no mutation; missing id → `not-found`.
- `mergeBrands`: rewires every source figure to the target and deletes the source, `movedFigureCount` correct; `same-brand` rejection; zero-figure source; `not-found`; `mergeBrands(x, x)` for a missing `x` → `same-brand` (check order).
- `deleteBrand`: with zero and with many references — every matching figure's `brandId` nulled (cascade verified **both** in store state and in persisted IndexedDB contents), brand removed, `detachedFigureCount` correct; `not-found`.
- Persistence: merge and delete each trigger `writeStore` for **both** `brands` and `figures` (observe both calls / both stores' contents).
- Invariant: after each command the brand set is unique by brandKey with non-blank names.
- Orphan tolerance: merge and delete leave a figure whose `brandId` resolves to no brand untouched (neither rewired nor nulled).
- Persistence failure: a merge whose `figures` `writeStore` rejects surfaces the persistence-failure toast, and retry converges to the merged state.

## Manager UI (CAP-1, CAP-3, CAP-4)

- Opens from the catalog header with an empty catalog; lists zero-figure brands with count 0; case-insensitive alphabetization.
- Rename collision → cancel (no mutation, edit text preserved) and → merge (converged dialog, then merged). After a collision-merge the target keeps its own name — typed casing is discarded.
- Explicit merge: dialog names source, target, and moved-figure count; the source is not offered as its own target; with a lone brand in the store the action is disabled.
- Delete dialog wording for 0 and N referenced figures; figures kept.
- Cancelling the merge and delete dialogs leaves the manager open, focusable, and scrollable — verified on both the Sheet and Drawer variants.

## Consistency (CAP-7)

- Stale open-form selection: a brand deleted or merged away while FigureForm is open → save writes `brandId: null` (verified for both delete and merge of the selected brand).

## Catalog behavior (CAP-1, CAP-3, CAP-4)

- After rename: section header and filter chip show the new name; filter selection state intact (id stable).
- After merge: moved figures render under the target and adopt the target's current filter state; source chip/section gone.
- After delete: detached figures render under "No brand" respecting that group's current filter state (hidden if `no-brand` is deselected).

## Import validation (CAP-6)

- v2 file with a blank/whitespace-only brand name → rejected with the existing invalid-format message.
- v2 file with two brands sharing a brandKey → rejected with the same message.
- App-generated v2 export round-trips unchanged.
- v1 import unaffected.
