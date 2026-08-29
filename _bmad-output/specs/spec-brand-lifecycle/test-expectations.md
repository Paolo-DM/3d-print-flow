# Test Expectations

## Verification baseline

`npm test` currently reports **411 passed / 1 failed of 412** (verified by a run on 2026-08-29 after the merge-removal build and its review fixes). The sole failure is the pre-existing locale-dependent `app/routes/completed.test.tsx` "shows completion date", documented in `_bmad-output/implementation-artifacts/deferred-work.md` — it is **not** a regression signal. `mergeBrands`, `MergeBrandsResult`, and the "Merge into…" label have no references left in `app/` (verified by grep; the negative-assertion test targets `brand-merge-` testids, and the `twMerge` import in `app/lib/utils.ts` is unrelated tailwind-merge).

Conventions: vitest, fireEvent (no user-event), co-located `*.test.ts(x)`, fake-indexeddb, `// @vitest-environment jsdom` for component tests.

## Store commands (CAP-2, CAP-4, CAP-5)

- `renameBrand`: casing-only rename → `renamed`, name updated, id preserved; unchanged text → `unchanged`; empty and whitespace-only → `invalid`, no mutation; collision with another brand → `collision`, no mutation; missing id → `not-found`.
- `deleteBrand`: with zero and with many references — every matching figure's `brandId` nulled (cascade verified **both** in store state and in persisted IndexedDB contents), brand removed, `detachedFigureCount` correct; `not-found`.
- Persistence: delete triggers `writeStore` for **both** `brands` and `figures` (observe both calls / both stores' contents).
- Invariant: after each command the brand set is unique by brandKey with non-blank names.
- Orphan tolerance: delete leaves a figure whose `brandId` resolves to no brand untouched (not nulled).
- Persistence failure: a delete whose `figures` `writeStore` rejects surfaces the persistence-failure toast, and retry converges to the deleted state.

## Manager UI (CAP-1, CAP-2, CAP-4)

- Opens from the catalog header with an empty catalog; lists zero-figure brands with count 0; case-insensitive alphabetization.
- Rename collision → inline rejection: no mutation, row stays in edit mode with typed text preserved, no dialog offered.
- Collision recovery: typing clears the inline error; a corrected retype then renames and exits edit mode.
- No merge affordance anywhere: rows render only rename and delete actions.
- Delete dialog wording for 0 and N referenced figures; figures kept.
- Confirming a delete whose brand vanished concurrently mutates nothing, and the open dialog never renders a literal "undefined".
- Cancelling the delete dialog leaves the manager open, focusable, and scrollable — verified on both the Sheet and Drawer variants.

## Consistency (CAP-7)

- Stale open-form selection: a brand deleted while FigureForm is open → save writes `brandId: null`.

## Catalog behavior (CAP-1, CAP-2, CAP-4)

- After rename: section header and filter chip show the new name; filter selection state intact (id stable).
- After delete: detached figures render under "No brand" respecting that group's current filter state (hidden if `no-brand` is deselected).

## Import validation (CAP-6)

- v2 file with a blank/whitespace-only brand name → rejected with the existing invalid-format message.
- v2 file with two brands sharing a brandKey → rejected with the same message.
- App-generated v2 export round-trips unchanged.
- v1 import unaffected.
