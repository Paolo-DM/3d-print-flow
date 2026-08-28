---
title: 'Brand entity with catalog grouping and schema v2 migration'
type: 'feature'
created: '2026-08-28'
status: 'done'
review_loop_iteration: 0
baseline_commit: '30e1bfb7a01a95f9b80ffb2841fee27683cec138'
context:
  - '{project-root}/_bmad-output/specs/spec-brand/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-brand/schema-migration.md'
  - '{project-root}/_bmad-output/specs/spec-brand/brownfield.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `Figure.franchise` is free text — retyped per figure, typo-prone, useless for organizing a 20+ figure catalog rendered as one flat grid.

**Approach:** Promote brand to a first-class entity (`{id, name}`); figures carry `brandId: string | null`. Assign via select-or-create combobox (staged — inline brand commits only on figure save). Catalog groups by brand with select/deselect filtering. Export moves to schema v2; v1 exports still import and live IndexedDB migrates in place, both via one shared derivation rule.

## Boundaries & Constraints

**Always:**
- The canonical contract is `_bmad-output/specs/spec-brand/SPEC.md` + its companions (`schema-migration.md`, `brownfield.md`, `project-context.md`). Where this spec is terser, the contract governs.
- One derivation rule everywhere (import migration, live migration, inline create): trim; empty → `brandId: null`; dedup key = lowercased trimmed name; first-seen casing wins; migration processes figures in ascending figure-id order; ids via `crypto.randomUUID()`.
- Import stays atomic full-replace: one transaction over all four stores, rollback on failure.
- Plain type guards (no validation libs); orphan `brandId` tolerated (renders brandless; edit form saves what it shows → `null`); `startTransition` on full replace; React Compiler — no manual memoization; minimal `useEffect`.
- Importing `fixtures/export-v1-2026-08-28.json` must yield exactly the 7-brand/22-figure table in `schema-migration.md`, spools/queueItems untouched.

**Ask First:**
- Adding any new npm dependency (combobox is built from existing primitives — Popover + Input + Button).
- Any change to v1 envelope acceptance beyond what `schema-migration.md` defines.

**Never:**
- Brand rename/delete/merge UI, brand metadata beyond `name`, v1 export output, persisting the catalog filter, brand grouping outside the catalog, downgrade compatibility, referential-integrity validation on import.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| v1 import (fixture) | real 2026-08-28 export | 7 brands, 22 figures linked per table; 25 spools / 10 queue items byte-identical | N/A |
| v1 empty franchise | `franchise: "  "` | figure `brandId: null`, no brand minted | N/A |
| v1 case variants | `"Naruto"` then `"naruto"` (asc id order) | one brand named `Naruto`, both figures linked | N/A |
| v2 round-trip | export then import same file | identical state (lossless) | N/A |
| v2 stray `franchise` | v2 figure with extra `franchise` key | accepted; field stripped, never persisted | N/A |
| Unknown version | `version: 3` (or non-number) | rejected | existing invalid-format message; dialog stays open, data untouched |
| Live v1 DB upgrade | idb `print-flow` v1 with franchise figures | brands store added, figures rewired, no `franchise` remains; next export is v2; reopen is no-op | failure surfaces persistence-failure toast path, never silent |
| Fresh install | no existing DB | four stores created, no migration | N/A |
| Inline create, staged | type new name → Create → Cancel form | nothing persisted (no brand, no figure) | N/A |
| Inline create, dup name | type existing name (any case) → Create/save | existing brand selected, no duplicate | N/A |
| Orphan brandId | figure references missing brand | card shows no subtitle; edit form shows none; save writes `null` | N/A |
| Filter all deselected | deselect every brand group | empty filtered state with one-action "show all" reset | N/A |
| Import while catalog mounted | import from sidebar | filter resets to all-visible | N/A |

</frozen-after-approval>

## Code Map

- `app/lib/types.ts` — `Figure.franchise: string` at :10 → `brandId: string | null`; add `Brand { id; name }`.
- `app/lib/migration.ts` — NEW; shared by db.ts and export-import.ts (both import it; no cycle — it imports only types). Holds `FigureV1` interface (legacy shape with `franchise`), `isRecord`, `isValidFigureV1` (move/adapt current `isValidFigure` from export-import.ts:58), `brandKey(name)`, and `migrateV1Figures(figures: Record<string, FigureV1>): { brands: Record<string, Brand>; figures: Record<string, Figure> }` — sorts ids ascending (JS string sort = IDB key order), builds fresh objects with explicit fields (drops `franchise`).
- `app/lib/db.ts` — idb `print-flow` opened at version 1 (:26) with unconditional store creation (:27-31). Bump to 2; branch upgrade: `oldVersion < 1` → create spools/figures/queueItems; `< 2` → create `brands`; `oldVersion === 1` → read figure rows off the versionchange `tx` as `unknown`, narrow via `isValidFigureV1`, run `migrateV1Figures`, write brands + rewritten figures in the same tx. Add `blocked`/`blocking`/`terminated` handlers (`blocking`: close connection, null out `dbPromise`). Extend `PrintFlowDB`, `StoreName`, `hydrate()` (:37), `replaceAll()` (:75) to four stores.
- `app/lib/store.ts` — add `brands: Map<string, Brand>`; `createBrand(name): string | null` (derivation rule; returns matched-or-minted id — unlike void creates, form needs the id); persist subscriber (:191) + `retryPersistence` (:181) + `toJSON`/`fromJSON` (:202-231) gain brands; add `dataGeneration: number` incremented inside `fromJSON` (full-replace signal; not persisted).
- `app/lib/export-import.ts` — `ExportEnvelope` → `version: 2` with `data.brands`; `buildExportData` (:12) emits 2. `importData`/validation dispatch on version: 1 → v1 guards then `migrateV1Figures`; 2 → new guards (`isValidBrand`, `isValidFigure` checking `brandId` string-or-null) then explicit-field rebuild (strips stray `franchise`); else existing error (:131). Rollback snapshot via `toJSON()` already covers brands once store does.
- `app/lib/init.ts` — no change needed (hydrate/fromJSON carry brands through).
- `app/components/BrandCombobox.tsx` — NEW; Popover + Input + option buttons. Props: `brands: Map<string, Brand>`, `value: BrandSelection`, `onChange`. `BrandSelection` discriminated union: `{ kind: "none" } | { kind: "existing"; brandId } | { kind: "new"; name }` (export from here). Alphabetical list, case-insensitive filter, "No brand" clear row, create row when query non-empty and no `brandKey` match.
- `app/components/FigureForm.tsx` — franchise Input (:90-99) → BrandCombobox; initial selection resolves `figure.brandId` against brands map (unresolvable → none); `handleSave` (:48) maps selection → `brandId` (`new` → `createBrand` first). Staging = keeping `kind:"new"` purely in form state until save.
- `app/routes/catalog.tsx` — flat grid (:129-139) → sections grouped by brand (alphabetical, "No brand" last) + filter chips (all-visible default; deselected-id set). Reset-on-import: `key={dataGeneration}` on the component owning filter state (project rule: key-reset, not Effects). Empty-filtered state (all deselected) with "Show all" button.
- `app/components/FigureCard.tsx` (:49-50), `app/components/QueueItemCard.tsx` (:69-70), `app/components/ColorRankingEntry.tsx` (:197-199) — add `brands: Map<string, Brand>` prop (matches existing map-prop pattern); render `brands.get(figure.brandId)?.name` with same conditional subtitle. Orphan tolerance falls out of `Map.get`.
- `app/routes/completed.tsx` — `franchise` prop (:37,46,193) → `brandName: string | null`; parent resolves via brands map.
- `app/routes/_queue.figures.tsx` (:166), `app/routes/_queue.home.tsx` (:218,:255) — subscribe brands, pass to cards.
- `app/lib/test-utils.ts` — `createFigure` default `brandId: null`; add `createBrand` factory.
- `app/lib/fixtures/export-v1-2026-08-28.json` — copy of the spec fixture (JSON import works; `resolveJsonModule` on).
- Tests — new `migration.test.ts` (derivation edges + fixture table); update `export-import.test.ts`, `store.test.ts`, `db.test.ts` (seed v1 via raw `openDB("print-flow", 1)` then reopen — fake-indexeddb), `FigureForm/FigureCard/QueueItemCard/ColorRankingEntry` tests, `catalog/completed/_queue.*` route tests. Add `BrandCombobox.test.tsx` and catalog grouping/filter coverage.

## Tasks & Acceptance

**Execution:**
- [x] `app/lib/types.ts` -- Brand entity, Figure.brandId -- foundation
- [x] `app/lib/migration.ts` -- derivation rule + v1 types/guards + tests -- single source of truth both migrations share
- [x] `app/lib/db.ts` -- v2 schema, branched upgrade with in-place migration, blocked/blocking handlers, 4-store hydrate/replaceAll + tests -- live-data migration (CAP-6)
- [x] `app/lib/store.ts` -- brands map, createBrand, persistence, dataGeneration + tests -- state layer (CAP-1)
- [x] `app/lib/export-import.ts` -- v2 envelope, version dispatch, v1 migration path + fixture test -- CAP-4/5
- [x] `app/components/BrandCombobox.tsx` -- select-or-create combobox + tests -- CAP-2 UI
- [x] `app/components/FigureForm.tsx` -- staged brand selection + tests -- CAP-2
- [x] `app/components/FigureCard.tsx`, `QueueItemCard.tsx`, `ColorRankingEntry.tsx`, `app/routes/completed.tsx` -- brand-name display + tests -- display continuity
- [x] `app/routes/catalog.tsx` -- brand sections + filter + tests -- CAP-3
- [x] `app/routes/_queue.figures.tsx`, `_queue.home.tsx` -- pass brands -- wiring
- [x] `app/lib/test-utils.ts`, `app/lib/fixtures/` -- factories + fixture copy -- test infra

**Acceptance Criteria:**
- Given the real v1 fixture, when imported, then the catalog shows 22 figures under 7 brand sections exactly per the `schema-migration.md` table, and a fresh export is v2 re-importing to identical state.
- Given a pre-brand IndexedDB, when the app loads, then figures are linked to derived brands with no user action; reopening changes nothing.
- Given the full test suite, when run, then only the pre-existing `completed.test.tsx` "shows completion date" locale failure remains (baseline 1 failed / 276 passed — no new failures).
- Given `grep -r franchise app/`, when run post-implementation, then hits exist only in migration-boundary code (`migration.ts`, v1 guards/tests/fixture).

## Design Notes

- Combobox from existing primitives (Popover/Input/Button), not shadcn `command` — avoids a new dep (`cmdk`); interaction is small (filter + pick + create + clear). Brownfield notes bless "an equivalent built from existing primitives".
- `dataGeneration` in-store counter: ImportDialog lives in the persistent `AppSidebar`, so catalog can stay mounted through an import; a `key`-reset on this counter is the Effect-free way to satisfy "import resets the filter". `fromJSON` increments it (init + import + rollback all full-replace — harmless resets).
- Staged brand+figure save = two `set()` calls = two `writeStore` transactions — accepted non-atomicity per brownfield stance; no new transactional mechanism.
- Upgrade-callback migration reads rows as `unknown` and narrows with `isValidFigureV1` — satisfies "local legacy types, no unsafe casts" under strict TS.

## Spec Change Log

## Verification

**Commands:**
- `npm test` -- expected: 1 pre-existing failure only (`completed.test.tsx` locale issue); all new/updated tests pass
- `npm run typecheck` -- expected: clean
- `npx prettier --check <changed files>` -- expected: clean on the files this spec touched (the repo was not prettier-clean at baseline; do not blanket-format unrelated files)

## Suggested Review Order

**Domain model & the single derivation rule**

- Entry point: one function derives brands for import migration AND live-DB migration — determinism via ascending-id order.
  [`migration.ts:43`](../../app/lib/migration.ts#L43)

- Dedup key (lowercased trimmed name) shared with inline create.
  [`migration.ts:31`](../../app/lib/migration.ts#L31)

- `Brand` entity; `Figure.franchise` replaced by nullable `brandId`.
  [`types.ts:7`](../../app/lib/types.ts#L7)

**Live IndexedDB migration (v1 → v2)**

- Branched upgrade: fresh install vs v1-upgrade; rows narrowed from `unknown` via the v1 guard, migrated in the versionchange tx.
  [`db.ts:37`](../../app/lib/db.ts#L37)

- `blocked` surfaces a toast; `blocking` closes this connection so future upgrades aren't stalled.
  [`db.ts:67`](../../app/lib/db.ts#L67)

- A rejected open is evicted from the cache so persistence Retry can reopen fresh.
  [`db.ts:91`](../../app/lib/db.ts#L91)

**Export/import schema v2**

- Version dispatch: v1 validates-then-migrates, v2 validates-then-rebuilds, anything else rejects.
  [`export-import.ts:189`](../../app/lib/export-import.ts#L189)

- v1 envelope guard reuses the legacy figure guard; kept import-only.
  [`export-import.ts:123`](../../app/lib/export-import.ts#L123)

- Explicit-field rebuild strips stray `franchise` from v2 figures — never persisted.
  [`export-import.ts:157`](../../app/lib/export-import.ts#L157)

**Store: brands, staged create, generation counter**

- `createBrand` returns matched-or-minted id (dedup rule); no state churn on match.
  [`store.ts:61`](../../app/lib/store.ts#L61)

- `dataGeneration` bumps on every full replace — the Effect-free import-resets-filter signal.
  [`store.ts:264`](../../app/lib/store.ts#L264)

**Brand assignment UI (staged select-or-create)**

- `BrandSelection` discriminated union — a `kind:"new"` brand lives only in form state until save.
  [`BrandCombobox.tsx:15`](../../app/components/BrandCombobox.tsx#L15)

- Save maps selection → `brandId`; inline brand commits here, so Cancel persists nothing.
  [`FigureForm.tsx:61`](../../app/components/FigureForm.tsx#L61)

- Unresolvable `brandId` initializes to none — the form persists what it shows.
  [`FigureForm.tsx:30`](../../app/components/FigureForm.tsx#L30)

**Catalog grouping & filter**

- Grouping: alphabetical brand sections, orphans and null under "No brand" last.
  [`catalog.tsx:52`](../../app/routes/catalog.tsx#L52)

- Deselected-id set keeps new brands visible by default; all-deselected empty state resets in one action.
  [`catalog.tsx:103`](../../app/routes/catalog.tsx#L103)

- `key`-reset on `dataGeneration` — import resets the filter without Effects.
  [`catalog.tsx:287`](../../app/routes/catalog.tsx#L287)

**Display continuity**

- Cards take a `brands` map (same pattern as `spools`); `Map.get` gives orphan tolerance for free.
  [`FigureCard.tsx:48`](../../app/components/FigureCard.tsx#L48)

**Peripherals: tests & fixture**

- Real-data fixture must reproduce the exact 7-brand/22-figure table.
  [`migration.test.ts:155`](../../app/lib/migration.test.ts#L155)

- Connection-lifecycle coverage: blocking yield, blocked toast, failed-open cache eviction.
  [`db.test.ts:225`](../../app/lib/db.test.ts#L225)
