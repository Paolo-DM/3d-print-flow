---
title: 'Queue Quantities & Bulk Order Intake'
type: 'feature'
created: '2026-08-29'
status: 'done'
review_loop_iteration: 0
baseline_commit: '2bbf989e7ab30c9cb0b499f1db95a7bc9c1b775e'
context:
  - '{project-root}/_bmad-output/specs/spec-queue-quantities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-queue-quantities/data-model.md'
  - '{project-root}/_bmad-output/specs/spec-queue-quantities/ui-flows.md'
  - '{project-root}/_bmad-output/specs/spec-queue-quantities/test-expectations.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** One `QueueItem` is one physical copy: "Buzz 2x" means duplicate disconnected cards, a 15-piece order takes 15 add actions, and the color ranking counts cards, not copies.

**Approach:** QueueItem v3 — integer `quantity` 1..99, `completedColors` → per-color `completedCounts`; quantity-aware derived helpers and queue UI (×N badge, chip counters, stepper); catalog bulk order mode via `addBatchToQueue`; IndexedDB v3 live migration; export envelope v3 with v1/v2 import compat; discriminated command results.

## Boundaries & Constraints

**Always:**
- The four `context:` files are the canonical, settled contract (CAP-1..8, data model, UI flows, test expectations); SPEC Assumptions accepted as-is.
- Canonical `completedAt` rule after every mutation touching counts, quantity, or `requiredColors`: `isComplete ? (existing.completedAt ?? now) : null`. Migration/import preserve `completedAt` verbatim.
- Derived computations iterate `requiredColors` only; missing count key = 0; stray keys tolerated, ignored.
- Store commands synchronous, one `set()` each.
- PRODUCT.md UI: counts as text (never color-only), single-tap reversible, ≥44px targets, reduced motion respected.

**Ask First:** Contradictions discovered inside the contract; any deviation from its settled decisions.

**Never:** No order entity, no free-text parsing, no per-copy identity, no quantity picker on single add, no migration-time consolidation of duplicates, no backend/async store.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Chip cycle | qty 2, repeated taps | 0→1→2→0; `completedAt` set when last color reaches qty, cleared past | Non-required spool/missing figure: no mutation |
| Merge on add | same figure+type active | qty +1, counts untouched, smallest id wins; 98+2→99 `clamped` | Missing/colorless figure → `rejected` |
| setQuantity | 1.5 / NaN / ∞ | `invalid`, no mutation; ints clamp 1..99; lowering clamps counts, may complete | Completed → `not-active`; missing → `not-found` |
| Bulk add | dup lines / empty / colorless | dups summed; empty → no-op; skipped ids reported; one `set()` | Result: `pieces/created/merged/skipped` |
| Legacy load | IDB v1/v2 rows; v1/v2 files | qty 1, completed colors → count 1, `completedAt` verbatim; guard-failing IDB rows deleted in tx | Invalid envelope rejected wholesale |

</frozen-after-approval>

## Code Map

- `app/lib/types.ts:21` — `QueueItem` → v3 here.
- `app/lib/migration.ts` — legacy shapes/guards precedent (`FigureV1` L4, `isValidFigureV1` L17, `migrateV1Figures` L43). Home for `QueueItemLegacy` + guard + shared legacy→v3 mapping.
- `app/lib/store.ts` — vanilla `createStore`. Result-type pattern L9-22 (`RenameBrandResult`). `addToQueue` L196, `toggleChip` L220, `requeueCompleted` L247, `updateFigure` L173. Persistence: `subscribe` L289, one `writeStore` per changed map. `fromJSON` L312 normalizes imports (extend for v3 defaults). Timestamps: `new Date().toISOString()`.
- `app/lib/derived.ts` — `computeColorRanking` L32 (add outstanding-copies weighting + name-then-id tie-break), `computeFigureProgress` L60, `computeCompletionStatus` L72. `ColorRankingEntry.hasOrders` is a field.
- `app/lib/db.ts:41` — `openDB("print-flow", 2, …)`; upgrade L42-97 in `oldVersion` blocks; v3 queue-row migration goes after L96, same `versionchange` tx.
- `app/lib/export-import.ts` — `ExportEnvelope` v2 L14, `ExportEnvelopeV1` L21, `isValidQueueItem` L110, `validateV1Envelope` L143, `validateExportEnvelope` L155, `rebuildBrands/rebuildFigures` L169-192 (pattern for `rebuildQueueItems`; queue items currently pass through raw), `importData` L209 (v1→v2→throw; snapshot rollback).
- `app/components/QueueItemCard.tsx` — badge slot L80-88 (×N), delete dialog L89-117 (unchanged), chips L120-133, progress L140.
- `app/components/ColorChip.tsx` — boolean `isCompleted`, `role="switch"`, aria-labels asserted in tests; needs third partial state with count text.
- `app/components/ColorRankingEntry.tsx` — big count L143 (→ outstanding copies), `matchingItems` L94-108, per-row chips L223-237.
- `app/routes/completed.tsx` — "Print Again" L104-111 → `requeueCompleted`; add ×N + result toast (sonner, mounted in root).
- `app/routes/catalog.tsx:306-314` — header cluster: order-mode toggle insertion point. `app/components/FigureCard.tsx` — `handleAddToQueue` L50 (raw `store.getState()`), disabled rule L79. Numeric clamp precedent: `FigureForm.tsx` L75/L126.
- `app/routes/_queue.tsx`, `_queue.home.tsx`, `_queue.figures.tsx` — consume helpers; mostly untouched.
- Tests: vitest 4, node env; per-file `// @vitest-environment jsdom` + `fake-indexeddb/auto`; co-located. Factories `app/lib/test-utils.ts` (`createQueueItem` L32). Fixture precedent `app/lib/fixtures/export-v1-2026-08-28.json` (JSON module import, 3 suites); mirror new fixtures into spec folder per `spec-brand`. 9 test + 7 source files reference `completedColors`.
- UI result handling: `BrandManager.tsx` L31-36/L117-133 — `switch (result.type)` + message map.

## Tasks & Acceptance

**Execution (dependency order):**
- [x] `app/lib/types.ts` — QueueItem v3 (`quantity`, `completedCounts`).
- [x] `app/lib/migration.ts` — `QueueItemLegacy`, guard, legacy→v3 mapping (shared by IDB + import).
- [x] `app/lib/derived.ts` — quantity-aware progress/completion/ranking, tie-break, `hasOrders` = outstanding > 0.
- [x] `app/lib/store.ts` — result types; `addToQueue(…, quantity=1)` merge rule; `toggleChip` cycle; new `setQuantity`, `addBatchToQueue`; `requeueCompleted` merge; `updateFigure` cascade; shared quantity guard + canonical `completedAt`; `fromJSON` v3.
- [x] `app/lib/db.ts` — version 3; `oldVersion 1` → figure/brand + queue mapping, `2` → queue only; delete guard-failing rows.
- [x] `app/lib/export-import.ts` — envelope v3, v2 import validator, v3 `isValidQueueItem`, `rebuildQueueItems`, import chain v1/v2/v3.
- [x] `app/lib/test-utils.ts` — v3 factory defaults.
- [x] `app/components/ColorChip.tsx` + `QueueItemCard.tsx` — chip count text, ×N badge, stepper (− noop at 1, + disabled at 99, ≥44px), copies×colors progress.
- [x] `app/components/ColorRankingEntry.tsx` — outstanding count, per-spool `n/qty` rows, keep animations.
- [x] `app/routes/completed.tsx` — ×N, requeue result toast.
- [x] `app/routes/catalog.tsx` + `FigureCard.tsx` — order mode: toggle, per-card qty controls, sticky summary bar (stock/order default order, Confirm/Cancel), `addBatchToQueue` + summary toast, exit clears selection.
- [x] `app/lib/fixtures/export-v2-*.json` — new v2 fixture (+ spec-folder mirror).
- [x] Test suites — parity updates in all `completedColors` suites + new coverage per test-expectations.md.

**Acceptance Criteria:**
- Given the sample order (12 figures, 15 pieces), when bulk-confirmed in order mode, then one store update yields 12 cards (three ×2) and the toast reports 15 pieces.
- Given Buzz ×2 + Woody ×1 active requiring Green, when ranking computes, then Green = 3; one Buzz green tap drops it to 2.
- Given a v1/v2 file, when imported, then items load qty 1 / counts 1 / `completedAt` verbatim; v2 fixture import→export ≡ v3; v3 export re-imports unchanged.
- Given a live v1/v2 IDB, when opened, then rows migrate in the upgrade tx (v1 incl. figure/brand); guard-failing rows deleted; duplicates unconsolidated.
- Given `npm run test` and `npm run typecheck`, when run, then both pass clean.

## Spec Change Log

## Design Notes

- Legacy shapes in `migration.ts` (symmetry with `FigureV1`) so v1/v2 envelope types don't inherit v3.
- Merge target = smallest-id *active* same-figure+type entry; active = derived, never `completedAt`.
- ColorChip partial state keeps redundant text (`1/2`) and a distinct reset-to-0 treatment; revisit asserted aria-labels deliberately.
- Batch "single store update" observable as one `writeStore` per changed map via existing subscribe.

**Build notes (2026-08-29):**
- ColorChip at quantity 1 keeps `role="switch"` + the asserted aria-labels verbatim; at quantity > 1 it is a plain button labeled `"{spool}: {n} of {q} copies printed"` — three states don't fit the switch role (the deliberate aria revisit flagged above).
- Reset-to-0 treatment: `chip-reset` keyframe (destructive-ring flash + scale dip), registered in the `prefers-reduced-motion` kill list; triggered by render-time prev-count tracking, no Effect. The flag is recomputed on every count change (not only cleared by `animationend`), so reduced-motion — where `animation: none` never fires `animationend` — cannot leave it stuck.
- `completed.test.tsx` "shows completion date" asserted an English month name and already failed at the baseline commit on non-English locales; the assertion now derives the expected string from the same `toLocaleDateString` call the component makes (intent unchanged).
- `addBatchToQueue` skips a `set()` (and the persistence write) when every entry was skipped — still reports `{ type: "queued", …, skipped }`. Its `pieces` counts copies actually applied: a clamped merge contributes only the delta that landed (98 + line of 5 → pieces 1), so the toast never overstates.
- Catalog order mode derives an effective selection each render (`figures.has(id)`) for the summary and the confirm payload; staged figures deleted before Confirm are counted into the toast's "skipped" total, and a confirmed batch that applied nothing gets a warning toast, not a success one.
- Steppers on the queue card are disabled while the entry is complete by derivation (the pulse/collapse window) — `setQuantity` would answer `not-active` anyway; − at 1 stays an enabled no-op per contract.
- ×N badge extracted to `QuantityBadge` (shared by queue card, ranking rows, completed archive); the completed card now uses the same Badge styling as the other two.
- Test-env quirk: jsdom has no `AnimationEvent`, so React 19 delegates `webkitAnimationEnd` — tests that need `onAnimationEnd` dispatch that event name directly.

## Verification

**Commands:**
- `npm run test` — expected: all suites pass incl. new coverage.
- `npm run typecheck` — expected: clean exit.

## Suggested Review Order

**Data model & canonical completion rule**

- Entry point: QueueItem v3 — integer quantity plus per-color counts replace the boolean color list.
  [`types.ts:32`](../../app/lib/types.ts#L32)

- The single canonical `completedAt` rule every mutation ends with.
  [`store.ts:70`](../../app/lib/store.ts#L70)

- One shared cap constant and quantity-input guard for every command.
  [`store.ts:54`](../../app/lib/store.ts#L54)

**Store commands & discriminated results**

- Result unions per the brand-command pattern: outcome in store, presentation in UI.
  [`store.ts:28`](../../app/lib/store.ts#L28)

- addToQueue: smallest-id active merge rule with clamp reporting.
  [`store.ts:315`](../../app/lib/store.ts#L315)

- addBatchToQueue: duplicate-summing pre-pass, applied-pieces accounting, one `set()` per batch.
  [`store.ts:355`](../../app/lib/store.ts#L355)

- setQuantity: active-only, clamps counts to the new quantity, reports completion.
  [`store.ts:421`](../../app/lib/store.ts#L421)

- toggleChip: `(count + 1) % (quantity + 1)` cycle behind a membership guard.
  [`store.ts:462`](../../app/lib/store.ts#L462)

- requeueCompleted: merge-or-create at full quantity; source stays as history.
  [`store.ts:489`](../../app/lib/store.ts#L489)

- updateFigure: `completedAt` cascade when requiredColors change, same `set()`.
  [`store.ts:276`](../../app/lib/store.ts#L276)

**Derivation (ranking & progress)**

- computeOutstandingCopies: the quantity-aware unit every view counts in.
  [`derived.ts:33`](../../app/lib/derived.ts#L33)

- Ranking weighted by outstanding copies; deterministic name-then-id tie-break.
  [`derived.ts:41`](../../app/lib/derived.ts#L41)

- Progress as copies × colors, iterating requiredColors only (stray keys inert).
  [`derived.ts:75`](../../app/lib/derived.ts#L75)

**Persistence & versioning**

- Legacy shape, guard, and the one legacy→v3 mapping shared by IDB and import.
  [`migration.ts:18`](../../app/lib/migration.ts#L18)

- IDB v3 upgrade: version-gated blocks, guard-failing rows deleted in the tx.
  [`db.ts:43`](../../app/lib/db.ts#L43)

- Envelope v3; v2 becomes import-only with its own validator.
  [`export-import.ts:18`](../../app/lib/export-import.ts#L18)

- v3 row validator: quantity and count bounds fully checkable per row.
  [`export-import.ts:131`](../../app/lib/export-import.ts#L131)

- rebuildQueueItems normalization and the v1→v2→v3 import chain.
  [`export-import.ts:256`](../../app/lib/export-import.ts#L256)

**Queue UI**

- Three-state chip with count text; reduced-motion-safe reset flag.
  [`ColorChip.tsx:32`](../../app/components/ColorChip.tsx#L32)

- Stepper frozen once complete-by-derivation; + disabled at the cap.
  [`QueueItemCard.tsx:160`](../../app/components/QueueItemCard.tsx#L160)

- Shared ×N badge, renders nothing at quantity 1.
  [`QuantityBadge.tsx:4`](../../app/components/QuantityBadge.tsx#L4)

- Color view filters and labels by outstanding copies, pluralized.
  [`ColorRankingEntry.tsx:102`](../../app/components/ColorRankingEntry.tsx#L102)

- Requeue result presented as a toast (created / merged / capped).
  [`completed.tsx:178`](../../app/routes/completed.tsx#L178)

**Catalog bulk intake**

- Order-mode state; selection derived against live figures each render.
  [`catalog.tsx:236`](../../app/routes/catalog.tsx#L236)

- Confirm: one batch call, honest success/warning summary toast.
  [`catalog.tsx:348`](../../app/routes/catalog.tsx#L348)

- Card select/stepper affordance; clamped merge shows no false "Added!".
  [`FigureCard.tsx:60`](../../app/components/FigureCard.tsx#L60)

**Peripherals**

- chip-reset keyframe, registered in the reduced-motion kill list.
  [`app.css:192`](../../app/app.css#L192)

- New v2 fixture backing the import-compat round-trip tests.
  [`export-v2-2026-08-29.json:1`](../../app/lib/fixtures/export-v2-2026-08-29.json#L1)

- Factory defaults for v3 queue items.
  [`test-utils.ts:37`](../../app/lib/test-utils.ts#L37)

- Batch command coverage incl. clamp and single-update assertions.
  [`store.test.ts:1038`](../../app/lib/store.test.ts#L1038)

- v2 fixture import and v3 round-trip equivalence.
  [`export-import.test.ts:797`](../../app/lib/export-import.test.ts#L797)
