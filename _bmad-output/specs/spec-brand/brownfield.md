# Brownfield Notes — What Exists and What This Touches

## `franchise` touchpoints (all must migrate to brand)

| Site | Current behavior |
|---|---|
| `app/lib/types.ts:10` | `Figure.franchise: string` |
| `app/components/FigureForm.tsx` | Free-text `Input` for franchise; saves `franchise.trim()` |
| `app/components/FigureCard.tsx:49-50` | Renders franchise as muted subtitle, only if non-empty |
| `app/components/QueueItemCard.tsx:69-70` | Same conditional subtitle |
| `app/components/ColorRankingEntry.tsx:197-199` | Same conditional subtitle |
| `app/routes/completed.tsx:37-67,193` | Subtitle via a `franchise` prop (`string \| null \| undefined`) |
| `app/lib/test-utils.ts:16` | `createFigure()` factory defaults `franchise: "Naruto"` |
| Tests | `store.test.ts`, `export-import.test.ts`, `FigureForm/FigureCard/QueueItemCard` tests and route tests assert on franchise. `ColorRankingEntry.test.tsx` only supplies franchise in fixtures (line 63) without asserting the subtitle — that display surface currently has no regression coverage |

## Data layer facts

- `app/lib/db.ts` — idb database `print-flow`, **version 1**, object stores `spools`/`figures`/`queueItems` (keyPath `id`). `hydrate()` reads all three; `writeStore()` persists one store per mutation; `replaceAll()` clears+writes all stores in a single transaction (the atomic-import primitive). Adding brands means a fourth object store in all of these.
- `app/lib/store.ts` — Zustand store of three `Map`s with CRUD actions; module-level `_persist` flag (not store state) suppresses IndexedDB writes during import; `toJSON()`/`fromJSON()` snapshot/replace all state. Brands need a `Map`, a create action, and `toJSON()`/`fromJSON()` inclusion — create-only, no update/delete actions (SPEC non-goal). Unlike the existing `void`-returning creates, brand creation must expose the minted-or-matched id so the figure form can link it; with staged creation (SPEC CAP-2) the commit happens at figure save.
- `app/lib/init.ts` — `initApp()` sets `initialized = true` and `_persist = false` before awaiting `hydrate()`, with no catch/finally reset; a hydrate/migration error currently leaves persistence silently disabled (recovery gaps tracked in `deferred-work.md`, story 4-3 is the notification surface).
- `app/lib/export-import.ts` — `ExportEnvelope` (`version: 1`), `buildExportData()`, `validateExportEnvelope()` type guard (checks `version` is a number and per-entity shapes, including `franchise` on figures), `importData()` with pre-import `toJSON()` snapshot for rollback. This is the **only runtime-validation site in the app**.

## Established stances (from stories 4-1/4-2, keep them)

- Plain TypeScript type guards for validation — no Zod or any validation library.
- Import does not validate referential integrity; the app tolerates orphaned references gracefully. This stance extends to brand references: normal persistence is one transaction per object store (`writeStore()` fired independently per store by the subscriber), so a staged brand+figure save spans two stores non-atomically — accepted, no new transactional mechanism.
- Full data replace is wrapped in `startTransition()`.
- No success toasts — the visible state change is the feedback; `AlertDialog` for destructive confirmations.
- Import errors keep the dialog open with an inline message; current data untouched.

## UI inventory

- `app/components/ui/` has `popover` but **no `command`/combobox primitive** — the select-or-create combobox needs one added (shadcn combobox = Popover + Command) or an equivalent built from existing primitives.
- Catalog (`app/routes/catalog.tsx`) renders a flat responsive grid of `FigureCard`s; form opens in a `Sheet` (desktop) / `Drawer` (mobile).
- Test suite: 268 tests passing as of story 4-2; co-located `*.test.tsx`, vitest + fake-indexeddb, `// @vitest-environment jsdom` for component tests, `fireEvent` (no `user-event`).
