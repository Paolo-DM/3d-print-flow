---
id: SPEC-brand-lifecycle
companions:
  - store-api.md
  - ui-flows.md
  - test-expectations.md
  - brownfield.md
  - ../spec-brand/SPEC.md
  - ../spec-brand/schema-migration.md
  - ../../project-context.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. There are no source documents: the design was decided and vetted in-session (see Why).

# Brand Lifecycle Management

## Why

A pain to solve. SPEC-brand shipped Brand as a first-class entity (commit b093db4) with a deliberately create-only lifecycle; the catalog now groups and filters by brand, so a mistyped brand ("naruto"), a duplicate that should be one brand, or an obsolete zero-figure brand is permanently visible — fixable only by re-editing every figure or by export-file surgery. Paolo (sole user) wants rename, merge, and delete, managed from the catalog. The design is decided and vetted by a second-model review; this spec encodes that contract for downstream implementation — it does not reopen it.

## Capabilities

- **CAP-1**
  - **intent:** The user can open a brand manager from the catalog to see and manage every brand in one place.
  - **success:** An always-visible "Manage brands" action in the catalog header opens a responsive modal manager (Sheet desktop / Drawer mobile, matching the figure form) — reachable when the catalog is empty and when brands have zero figures. It lists all brands, case-insensitively alphabetized, with figure counts (including zero); each row offers inline rename, "Merge into…", and delete. The catalog's "No brand" pseudo-group has no row. Flow detail in `ui-flows.md`.

- **CAP-2**
  - **intent:** The user can rename a brand in place, keeping its identity, so a casing or typo fix propagates everywhere the brand renders.
  - **success:** Input is trimmed; empty/whitespace is rejected without mutation; unchanged text is a no-op; the same brandKey with different casing is a plain rename ("naruto" → "Naruto"); a brandKey collision with a *different* brand is not an error — the UI offers merge into that brand. The brand id never changes, so catalog filter state, open combobox selections, and figure references stay valid.

- **CAP-3**
  - **intent:** The user can merge one brand into another so their figures unify under the surviving brand.
  - **success:** Both entry paths — explicit "Merge into…" (target-brand selector) and rename-collision — converge on one confirmation dialog naming source, target, and moved-figure count. Confirming rewires every source figure's `brandId` to the target and deletes the source brand in one store update; merging a brand into itself is rejected.

- **CAP-4**
  - **intent:** The user can delete a brand without losing figures — its figures become brandless.
  - **success:** A destructive AlertDialog states the referenced-figure count and that figures are kept and moved to "No brand". Confirming nulls every matching figure's `brandId` and removes the brand in one store update. Cascade-to-null, not spool-style reference blocking: brands are organizational metadata, and the app already renders an unresolvable `brandId` as brandless.

- **CAP-5**
  - **intent:** The store exposes brand lifecycle as separate synchronous commands with discriminated results that event handlers switch on — outcome decisions in the store, presentation decisions in the UI.
  - **success:** `renameBrand`, `mergeBrands`, and `deleteBrand` return exactly the variants in `store-api.md`; each command applies its brand+figure changes in a single `set()`; no toast/dialog/navigation logic lives in the store.

- **CAP-6**
  - **intent:** v2 import rejects brand collections that would break the uniqueness invariant rename and merge depend on.
  - **success:** A v2 file with a blank/whitespace-only brand name, or with two brands sharing a brandKey, is rejected with the existing invalid-format message. Brand names are otherwise imported verbatim — no trimming (see Assumptions). App-generated v2 exports still round-trip unchanged; v1 imports are unaffected (migration derives unique non-blank brands by construction).

- **CAP-7**
  - **intent:** Brand changes made while other brand-referencing UI is open cannot corrupt state — forms and manager stay coherent with the live store.
  - **success:** FigureForm re-resolves its selected brand id at save (`brands.has(id) ? id : null`), so the form's reference to a brand deleted or merged away since it opened is saved as null, never recreated as an orphan reference. This null-on-save deliberately overrides a merge's rewiring for the open figure — it lands in "No brand", not under the merge target. Manager rows derive from live store maps (reactive to concurrent changes); transient manager state (in-progress rename text, pending merge target) key-resets on `dataGeneration` like the catalog filter; manager and figure form remain mutually exclusive by construction (both modal over the catalog).

## Constraints

- No export schema change: still v2 with Brand as `{ id, name }`; no IndexedDB version bump or migration.
- Rename preserves the brand id — never delete-and-recreate.
- `brandKey` (trimmed lowercased name, `app/lib/migration.ts`) remains the single uniqueness rule; every lifecycle command leaves the brand set unique by brandKey with non-blank names.
- Brand+figure changes land in one Zustand `set()` per command; persistence stays per-store `writeStore` transactions and no new transactional mechanism is introduced (semantics and failure modes in `store-api.md` §Shared rules).
- Import-validation tightening is scoped to CAP-6 exactly: no record-key/embedded-id mismatch validation, no referential-integrity checks — the orphan-tolerance stance stands; the invalid-format error message is unchanged.
- Surface is the catalog's brand manager only: no new route, no management inside BrandCombobox, no section-header actions.
- Established project stances bind — the authoritative, verified list is `brownfield.md` §Established stances; project conventions in `../../project-context.md`.

## Non-goals

- Brand metadata beyond `name`.
- Undo for rename, merge, or delete.
- Bulk operations beyond a single source→target merge.
- Persisting catalog filter or manager state across sessions.
- Changes to spools/queueItems import validation.
- Brand management outside the catalog's brand manager (the binding surface rule lives in Constraints).

## Success signal

Paolo opens "Manage brands" over his real catalog: renames "naruto" to "Naruto" in place, merges a duplicate brand into its canonical one and watches its figures adopt the target's section and filter state, and deletes an obsolete brand whose figures drop into "No brand" — each change reflected instantly in the catalog and persisted across reload. `npm test` shows the new suites green with only the pre-existing locale failure remaining (see `test-expectations.md`).

## Assumptions

- Merge confirmation uses AlertDialog — the design said "confirmation dialog" without naming the primitive; the source brand is destroyed, matching the destructive-confirmation stance.
- The manager lists brand entities only; "No brand" is a catalog pseudo-group with nothing to rename, merge, or delete.
- Empty-rename rejection surfaces inline in the manager row; the presentation is implementation-defined — the store just returns `{ type: "invalid" }`.
- Stored data is assumed invariant-clean. A duplicate-brandKey or blank-name brand set persisted via a pre-lifecycle lax v2 import is out of scope: lifecycle commands do not repair it, `collision` may return either duplicate, and such data's own export will be rejected by CAP-6 import.
- v2 import accepts brand names verbatim (no trimming): only blank-after-trim names and duplicate-brandKey collections are rejected. The trimmed-name norm is guaranteed only for app-created brands; a rename to the same visible text heals imported whitespace (trim(input) ≠ stored name yields `renamed`).
