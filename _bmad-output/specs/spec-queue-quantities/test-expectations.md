# Test Expectations — Queue Quantities

Beyond parity of the existing suites (which must pass with `completedColors` → `completedCounts` updates), the build must cover:

## Store commands

- `toggleChip` cycle at quantity 2: 0 → 1 → 2 → 0; `completedAt` set exactly when the last color reaches quantity, cleared when it cycles past; quantity 1 behaves as the current toggle tests expect.
- `toggleChip` guard: unknown spoolId, spoolId not in `requiredColors`, missing figure → no mutation.
- `addToQueue` merge: same figure+type active → quantity increments, counts untouched; different type or completed-by-derivation entry → new row; multiple active candidates → smallest id receives it; 98 + 2 → 99 with `clamped: true`.
- `setQuantity`: clamp to 1..99; `NaN`/`Infinity`/1.5 → `invalid`, no mutation; completed entry → `not-active`; lowering 2→1 with counts {red:2, gold:1} clamps red to 1 and reports `completed: true` iff all colors now equal 1, setting `completedAt`.
- `addBatchToQueue`: duplicate figureId lines summed; empty batch → `empty`; colorless/missing figures land in `skipped`; result `pieces`/`created`/`merged` totals match; single store update (one persistence write per map).
- `requeueCompleted`: source stays; merge vs create; clamp at 99; result reports final quantity.
- `updateFigure` cascade: removing the only incomplete color sets `completedAt` on referencing items; adding a color clears it — both in the same update.

## Derivation

- `computeFigureProgress`/`computeCompletionStatus` sum over `requiredColors` only — stale count keys never inflate progress.
- `computeColorRanking` weights by outstanding copies; `hasOrders` flags on any order entry with outstanding > 0; equal counts order by spool name, then id.

## Migration & export/import

- Live IDB v2 → v3: legacy rows map to `quantity: 1`, counts of 1, `completedAt` verbatim; a row failing the legacy guard is deleted.
- Live IDB v1 → v3: figure/brand migration *and* queue mapping both applied in one upgrade.
- Duplicate active rows survive migration unconsolidated.
- v3 validator: rejects non-integer quantity, quantity 0 or 100, count > quantity, negative counts; accepts absent `completedAt`.
- `rebuildQueueItems`: strips stray props, drops non-integer counts, clamps counts to quantity.
- Fixtures: existing v1 fixture imports; new v2 fixture (add `export-v2-*.json`) imports; v2 fixture import → export round-trips to equivalent v3 data; a v3 export re-imports unchanged.
