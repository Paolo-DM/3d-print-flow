# Brownfield — What Exists and What This Touches

Revision 1 of this spec (rename + merge + delete) shipped in 35925cb with follow-ups bdb7375/2479cd4/632d7ee; the merge-removal revision was built on 2026-08-29 on top of 632d7ee. Where this differs from `../spec-brand/brownfield.md` (a pre-implementation snapshot), this file wins.

## Removed by the 2026-08-29 build

- `app/lib/store.ts` — `MergeBrandsResult` and `mergeBrands` deleted; `renameBrand`'s `collision` variant no longer carries `existingId` (it existed solely for the merge offer).
- `app/components/BrandManager.tsx` — the "Merge into…" target selector, the merge AlertDialog, and the rename-collision → merge wiring deleted; a rename collision now shows an inline "This name is already in use." rejection and keeps the row in edit mode with the typed text.
- The merge test suites; collision tests assert the inline rejection instead, and a negative test pins that rows offer only rename and delete.
- `twMerge` in `app/lib/utils.ts` is unrelated (tailwind-merge) and stays.

## Data layer (post-revision-1 state)

- `app/lib/store.ts` — four `Map`s plus `dataGeneration`; `createBrand(name)` returns the matched-or-minted id or null (trim, brandKey dedup, first-seen casing); `renameBrand` and `deleteBrand` stay exactly as shipped (discriminated results, one `set()` per command). The persistence subscriber writes per-store on map identity change — delete's brands+figures `set()` yields two `writeStore` transactions; `retryPersistence` covers all four stores.
- `app/lib/migration.ts` — exports `brandKey(name)` (= `name.trim().toLowerCase()`); reuse it, don't duplicate. Known limitation: no Unicode normalization (NFC/NFD "Pokémon" variants count as distinct) — tracked in `../../implementation-artifacts/deferred-work.md`, out of scope here.
- `app/lib/export-import.ts` — CAP-6 validation shipped: v2 brand collections with blank names or duplicate brandKeys are rejected with the standard invalid-format message; unaffected by merge removal.

## UI (post-revision-1 state)

- `app/components/BrandManager.tsx` — exists; Sheet/Drawer modal opened from the catalog header, mutually exclusive with the figure form by construction; rows live-derived with figure counts, inline rename, delete with destructive AlertDialog stacked over the open manager (deliberate divergence from the figure-delete precedent).
- `app/components/FigureForm.tsx` — CAP-7 save-guard shipped: `handleSave` re-resolves the selection via `brands.has` (line 62); untouched by merge removal.
- `app/routes/catalog.tsx` — deselected-id filter set, `dataGeneration` key-reset, `NO_BRAND` sentinel; untouched by merge removal.
- `app/components/BrandCombobox.tsx` — untouched.

## Established stances (all verified still current)

- Plain TypeScript type guards for validation — no validation libraries.
- Orphan tolerance: no referential-integrity validation; an unresolvable `brandId` renders as brandless and saves as null.
- Per-store `writeStore` persistence; a multi-store update is multiple transactions — accepted.
- Full replace wrapped in `startTransition`; no success toasts; AlertDialog for destructive confirmations; import errors shown inline with the dialog open.
- React Compiler (no manual memoization); minimal `useEffect` — derive during render, key-reset over Effects; Tailwind semantic tokens + `cn()`; alphabetical `localeCompare` ordering precedent (sections, chips, combobox).
- No new npm dependencies; fireEvent-style vitest tests co-located with sources (detailed conventions in `test-expectations.md`).
