---
title: 'Seed a starter catalog for new users'
type: 'feature'
created: '2026-08-29'
status: 'done'
review_loop_iteration: 0
baseline_commit: '46a4be2df2d8ac2a7c48d99b324b53e0637a78b8'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A genuinely new user currently starts with empty local storage and must recreate even the common filament colors before seeing a useful catalog. The supplied version-2 export contains the desired 25-color baseline and suitable figures for a lightweight example catalog.

**Approach:** Initialize only a newly created IndexedDB database with all 25 exported spools plus Pikachu, Spiderman, and Stitch and their three brands. Keep the print queue empty and leave every existing, upgraded, deleted, or imported user state untouched.

## Boundaries & Constraints

**Always:** Preserve the exported spool IDs, names, and hex values exactly. Preserve the three selected figures' exported IDs, names, brand links, size, notes, and required-color order. Seed atomically during first database creation, maintain referential integrity, and expose the seeded entities through normal hydration.

**Ask First:** Changing the three example figures, adding example queue work, changing the database version, or modifying data for an existing installation requires user approval.

**Never:** Infer a new user from empty collections; merge starter records into an existing database; seed a v1-to-v2 upgrade; reseed after deletion or an empty import; alter import/export semantics, entity schemas, or unrelated onboarding UI.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Fresh install | No `print-flow` database exists | Hydration returns 25 exact spools, 3 linked brands, 3 linked figures, and 0 queue items | A failed seed aborts database creation; never expose a partial starter catalog |
| Existing v2 user | Database already contains custom or empty collections | Hydration returns the stored state exactly, with no starter additions | Existing connection/open behavior remains unchanged |
| Existing v1 user | Legacy database upgrades to v2 | Existing migration runs without starter additions | Existing atomic migration and retry behavior remains unchanged |
| Empty replacement | Starter data was deleted or replaced by an empty valid import | Later hydration remains empty | Do not interpret emptiness as first use |

</frozen-after-approval>

## Code Map

- `app/lib/starter-data.ts` -- new typed, runtime starter catalog; source values come from the supplied v2 export. Keep queue data out of this module.
- `app/lib/db.ts:34` -- `getDB()` owns schema creation and its version-change transaction. Seed after all four stores exist only for `oldVersion === 0`; keep database version 2 and leave `hydrate()`, `replaceAll()`, and v1 migration behavior unchanged.
- `app/lib/db.test.ts:65` -- persistence and schema-upgrade coverage. Fresh-database expectations must reflect starter data; add existing/empty v2 and empty-replacement regressions.
- `app/lib/fixtures/export-v1-2026-08-28.json` -- read-only evidence: its 25 spools match the supplied v2 export and can detect transcription drift.
- `app/lib/init.ts:6` -- read-only startup orchestrator. Do not add emptiness-based seeding here.
- `app/lib/export-import.ts:209` -- read-only atomic import path. Empty valid imports must continue replacing all data without later reseeding.

## Tasks & Acceptance

**Execution:**
- [x] `app/lib/starter-data.ts` -- define the exact 25-spool starter set and the exported Pikachu, Spiderman, and Stitch records with only their Pokemon, Marvel, and Lilo & Stitch brands.
- [x] `app/lib/db.ts` -- write starter entities within the fresh database's existing version-change transaction after all stores are created; do not bump the schema version.
- [x] `app/lib/db.test.ts` -- verify exact seed contents and references, transaction-visible hydration, non-seeding upgrades/existing databases, and persistence of an intentionally empty replacement.

**Acceptance Criteria:**
- Given a browser with no app database, when the app hydrates for the first time, then the spool library contains exactly the export's 25 colors and the catalog contains exactly the 3 selected figures under 3 valid brands.
- Given the fresh starter catalog, when its relationships are inspected, then every required color resolves to a seeded spool and every figure brand resolves to a seeded brand.
- Given the fresh starter catalog, when the queue is inspected, then it contains no active or completed example items.
- Given any existing v1 or v2 database, when the updated app opens it, then no starter entity is added and existing data remains unchanged except for the established v1 brand migration.
- Given a valid empty replacement has been persisted, when the app opens again, then all four collections remain empty.

## Spec Change Log

## Design Notes

IndexedDB calls the current upgrade callback with `oldVersion === 0` only when creating the database. Seeding in that transaction distinguishes installation identity from data emptiness without a marker store or version bump. The examples intentionally cover three recognizable brands and ten distinct standard colors while keeping the initial catalog small enough to understand and delete.

## Verification

**Commands:**
- `npm test -- app/lib/db.test.ts` -- all seed, upgrade, replacement, and persistence tests pass.
- `npm test` -- the full test suite passes with updated fresh-install assumptions.
- `npm run typecheck` -- strict TypeScript passes.

## Suggested Review Order

**Fresh-install boundary**

- Gate seeding on database creation and keep all writes in the upgrade transaction.
  [`db.ts:51`](../../app/lib/db.ts#L51)

**Starter catalog**

- Review the exact 25 exported spool identities, names, and hex values.
  [`starter-data.ts:3`](../../app/lib/starter-data.ts#L3)

- Review the three linked brands and compact example-figure selection.
  [`starter-data.ts:59`](../../app/lib/starter-data.ts#L59)

**Regression coverage**

- Centralize exact-content and referential-integrity assertions for fresh and recovered catalogs.
  [`db.test.ts:91`](../../app/lib/db.test.ts#L91)

- Prove existing empty and populated v2 databases never receive starter additions.
  [`db.test.ts:251`](../../app/lib/db.test.ts#L251)

- Prove partial seed progress rolls back before an exact successful retry.
  [`db.test.ts:316`](../../app/lib/db.test.ts#L316)
