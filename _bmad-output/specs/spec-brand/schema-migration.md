# Schema Migration — Export v1 → v2 and Live Data

## Envelope shapes

**v1 (current, unchanged as input):**

```json
{
  "version": 1,
  "exportedAt": "<ISO 8601>",
  "data": {
    "spools":     { "<id>": { "id", "name", "hex" } },
    "figures":    { "<id>": { "id", "name", "franchise", "size", "notes", "requiredColors" } },
    "queueItems": { "<id>": { "id", "figureId", "type", "completedColors", "completedAt" } }
  }
}
```

**v2 (target, only export output):**

```json
{
  "version": 2,
  "exportedAt": "<ISO 8601>",
  "data": {
    "spools":     { "<id>": { "id", "name", "hex" } },
    "brands":     { "<id>": { "id": "string", "name": "string" } },
    "figures":    { "<id>": { "id", "name", "brandId": "string | null", "size", "notes", "requiredColors" } },
    "queueItems": { "<id>": { "id", "figureId", "type", "completedColors", "completedAt" } }
  }
}
```

Changes: `data.brands` added; `figure.franchise` (string) replaced by `figure.brandId` (string | null). Spools and queue items are untouched.

## Derivation rule (single source of truth)

Applied identically in v1 import migration, live IndexedDB migration, and inline combobox create:

1. Trim the franchise/brand name.
2. Empty after trim → the figure gets `brandId: null`; no brand is created.
3. Dedup key is the lowercased trimmed name; the first occurrence's trimmed casing becomes the brand's `name`.
4. New brands get `crypto.randomUUID()` ids.
5. Creating a name whose dedup key already exists selects the existing brand — never a duplicate.
6. During migration (both paths), figures are processed in ascending figure-id order, so "first occurrence" is deterministic and import migration and live migration derive identical brand names.

"Lossless" throughout this spec means semantic equivalence: no spool, figure, or queue-item data is lost, and franchise strings are normalized by this rule — their original per-figure casing and whitespace are not preserved.

## Import version dispatch

- `version: 1` → validate v1 entity shapes (existing guards) → derive brands per the rule above → proceed as v2 data.
- `version: 2` → validate v2 entity shapes (brands record; figures with `brandId` string-or-null). A v2 figure carrying a stray `franchise` property is not an error: the field is stripped at import, never persisted or re-exported. *Amended 2026-08-28 by `../spec-brand-lifecycle/SPEC.md` CAP-6: v2 brand collections containing a blank/whitespace-only name, or two brands sharing a brandKey (trimmed lowercased name), are additionally rejected with the same invalid-format error.*
- Any other `version` → reject with the existing invalid-format error message.
- Both paths land via the same atomic full-replace transaction across all object stores; rollback on failure preserves current data.
- No referential-integrity validation: an unresolvable `brandId` is imported as-is and rendered as brandless.

## Live IndexedDB migration

The `print-flow` database is currently version 1 with `spools` / `figures` / `queueItems` object stores, created unconditionally in `getDB()`'s upgrade callback (see brownfield.md). Requirements (mechanism left to implementation):

- Bump the database version and add a `brands` object store. The upgrade callback must branch: a fresh install creates all four stores and migrates nothing; a v1 upgrade adds only `brands` and migrates rows — it must not attempt to recreate existing stores.
- Migrate existing figures' `franchise` values to brands via the derivation rule (ascending figure-id order) — atomically, with no user action.
- Idempotent: opening already-migrated data is a no-op; no figure retains a `franchise` field afterward.
- Migration code reads v1 rows through local legacy types at this boundary — the post-change `Figure` type has no `franchise`; strict TypeScript, no unsafe casts.
- Handle blocked/blocking connections (e.g. close the stale connection from an old tab) so an open pre-upgrade tab cannot stall the upgrade indefinitely.
- A migration failure must surface through the existing persistence-failure notification (story 4-3), never silently disable persistence — note `initApp()` currently has no error recovery (tracked in deferred-work.md).

**Test expectations:** a database seeded as v1 (three stores, figures with `franchise`) and reopened by the new build contains the derived brands and figures with `brandId` and no `franchise`; reopening again changes nothing. Fresh-install and v1-upgrade paths are both covered.

## Real-data test fixture

Copied into this spec folder as `fixtures/export-v1-2026-08-28.json` (original: `/Users/paolo/Downloads/3d-print-flow-export-2026-08-28.json`). A v1 export of Paolo's real data: 25 spools, 22 figures, 10 queue items, no empty and no case-variant franchise values.

Importing it must produce exactly these brands and figure links:

| Brand (name, casing as-is) | Figures |
|---|---|
| One Piece | Sanji, Jinbe, Nico Robin, Zoro, Chopper, Brook, Nami, Luffy, Franky, Usopp (10) |
| Pokemon | Charmander, Eevee, Pikachu, Squirtle, Venusaur (5) |
| Marvel | Spiderman, Venom (2) |
| Lilo & Stitch | Angel, Stitch (2) |
| Sonic | Sonic the Hedgehog (1) |
| Naruto | Kakashi (1) |
| Dragon Ball | Goku (1) |

7 brands total; every spool, queue item, `requiredColors` list, `completedColors` list, and `completedAt` value preserved exactly. (The one permitted normalization on import is the existing missing-`completedAt` → `null` backfill; this fixture does not exercise it — all its values are explicit.) Empty-franchise and case-variant dedup behavior is not exercised by this fixture either — cover those with synthetic unit-test data.
