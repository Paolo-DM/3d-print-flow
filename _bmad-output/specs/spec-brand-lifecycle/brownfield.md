# Brownfield — What Exists and What This Touches

Verified against the working tree on 2026-08-28 at commit bdb7375. Where this differs from `../spec-brand/brownfield.md` (a pre-implementation snapshot), this file wins.

## Data layer

- `app/lib/store.ts` — Zustand store of four `Map`s (`spools`, `brands`, `figures`, `queueItems`) plus `dataGeneration` (incremented by `fromJSON` on every full replace; UI key-resets on it). `createBrand(name)` already returns the matched-or-minted id or null (trim, brandKey dedup, first-seen casing). **No brand update/delete actions exist yet.** The persistence subscriber (store.ts:220) writes per-store on map identity change — a one-`set()` brands+figures command therefore yields two `writeStore` transactions; `retryPersistence` already covers all four stores.
- `app/lib/migration.ts` — exports `brandKey(name)` (= `name.trim().toLowerCase()`); reuse it, don't duplicate. `migrateV1Figures` derives unique non-blank brands by construction, so the v1 import path needs no CAP-6 validation.
- `app/lib/export-import.ts` — `isValidBrand` currently checks only that `id`/`name` are strings: blank names and duplicate brandKeys pass today (the CAP-6 gap). `rebuildBrands`/`rebuildFigures` strip stray fields on v2 import. Invalid-format message (export-import.ts:210): `"Invalid file format. Please select a file exported from 3D Print Flow."` `importData` does snapshot-rollback with `setPersist(false)`, `startTransition(fromJSON)`, atomic `replaceAll`.

## UI

- `app/routes/catalog.tsx` — `NO_BRAND = "no-brand"` sentinel group id; `BrandGroupedCatalog` holds a **deselected-id** filter set (new groups visible by default) and is key-reset on `dataGeneration` (catalog.tsx:287). The header holds "Add Figure"; the figure form renders in Sheet/Drawer via `useIsMobile` with a single `open` state — the manager must join this modal arrangement so the two can never be open together.
- `app/components/FigureForm.tsx` — `brandSelection` is resolved against `brands.has` **at open** (FigureForm.tsx:30) but `handleSave` (FigureForm.tsx:61) trusts a stale `existing` brandId without re-checking — the exact gap CAP-7 closes. A staged `new` brand is committed via `createBrand` at save.
- `app/components/BrandCombobox.tsx` — built from Popover + Input + listbox (no Command primitive); untouched by this feature beyond reading the live brands map.
- `app/components/ui/` — `alert-dialog`, `sheet`, `drawer`, `button`, `input`, `popover`, `empty`, and the rest all present; the merge target selector and manager must compose from these (no new dependencies).

## Established stances (all verified still current)

- Plain TypeScript type guards for validation — no validation libraries.
- Orphan tolerance: no referential-integrity validation; an unresolvable `brandId` renders as brandless and saves as null.
- Per-store `writeStore` persistence; a multi-store update is multiple transactions — accepted.
- Full replace wrapped in `startTransition`; no success toasts; AlertDialog for destructive confirmations; import errors shown inline with the dialog open.
- React Compiler (no manual memoization); minimal `useEffect` — derive during render, key-reset over Effects; Tailwind semantic tokens + `cn()`; alphabetical `localeCompare` ordering precedent (sections, chips, combobox).
- No new npm dependencies — compose from the existing shadcn primitives.
- fireEvent-style vitest tests co-located with sources (detailed conventions in `test-expectations.md`).
