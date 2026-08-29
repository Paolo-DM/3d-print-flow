# Data Model — Queue Quantities (schema v3)

## QueueItem v3

```ts
export interface QueueItem {
  id: string
  figureId: string
  type: "stock" | "order"
  quantity: number // integer, 1..99
  completedCounts: Record<string, number> // spoolId -> copies printed, 0..quantity
  completedAt: string | null
}

/** Legacy shape (schema v1/v2) — used only by legacy envelopes and the IDB guard. */
export interface QueueItemLegacy {
  id: string
  figureId: string
  type: "stock" | "order"
  completedColors: string[]
  completedAt?: string | null
}
```

The shared `QueueItem` interface becomes v3; `QueueItemLegacy` exists so `ExportEnvelopeV1`/v2 types and the IDB migration guard don't silently inherit the new shape.

- `completedCounts`: a missing key reads as 0. Keys outside the figure's `requiredColors` are tolerated on read and **ignored by every derived computation** — `computeFigureProgress`, `computeCompletionStatus`, and `computeColorRanking` iterate `requiredColors` only (never `Object.values/keys(completedCounts)`).
- **Definitions.** *Complete* = figure exists, has ≥ 1 required color, and every required color's count ≥ `quantity` (derived, `computeCompletionStatus`). *Active* = not complete. Every view derives status from counts, as today; `completedAt` is display metadata (date shown, Completed-section sort).
- **Canonical `completedAt` rule** — applied after every mutation that touches counts, quantity, or a figure's `requiredColors`:

  ```
  completedAt = isComplete ? (existing.completedAt ?? now) : null
  ```

  Migration and import preserve stored `completedAt` verbatim (legacy data may disagree with counts; the rule self-heals on the next mutation).
- Derived helpers: `computeFigureProgress` returns `{ completed, total }` with `total = requiredColors.length × quantity` and `completed = Σ over requiredColors of min(count, quantity)`; `computeColorRanking` sums `quantity − min(count, quantity)` per spool over entries whose figure requires it. `hasOrders` keeps current semantics: any order-type entry with outstanding copies for the spool flags it. Ranking ties (equal counts) break by spool name ascending, then id.

## Store command changes

Quantity input guard (all quantity-taking commands): non-finite or non-integer → `{ type: "invalid" }`, no mutation; integers clamp to 1..99. All commands apply their changes in one `set()` and end with the canonical `completedAt` rule.

- `addToQueue(figureId, type, quantity = 1): AddToQueueResult` — rejects a missing figure or one with no `requiredColors` (`{ type: "rejected" }`). Merge rule: if ≥ 1 *active* entry with same `figureId` + `type` exists, increment the one with the smallest id (existing counts untouched), clamping quantity at 99; else create with `completedCounts: {}`. Result: `{ type: "created" } | { type: "merged"; quantity: number; clamped: boolean } | { type: "rejected" } | { type: "invalid" }`.
- `toggleChip(queueItemId, spoolId): void` — guard: entry exists, its figure exists, and `figure.requiredColors.includes(spoolId)`; otherwise no mutation. Cycle: `count = (count + 1) % (quantity + 1)`.
- `setQuantity(queueItemId, quantity): SetQuantityResult` — active entries only (`{ type: "not-active" }` on completed, `{ type: "not-found" }` on missing). Clamps each count to the new quantity. Result: `{ type: "updated"; completed: boolean } | { type: "not-active" } | { type: "not-found" } | { type: "invalid" }` (`completed: true` when the clamp made the entry complete).
- `addBatchToQueue(entries: { figureId; quantity }[], type): AddBatchResult` — pre-pass: sum duplicate `figureId` lines; empty batch → `{ type: "empty" }`, no mutation. Per entry apply the `addToQueue` merge rule; entries with a missing/colorless figure or invalid quantity are skipped. One `set()` for the whole batch. Result: `{ type: "queued"; pieces: number; created: number; merged: number; skipped: string[] }` (`skipped` = figureIds).
- `requeueCompleted(queueItemId): RequeueResult` — source entry must be complete; it stays untouched (history). Restores its full quantity via the merge rule (merge into smallest-id active same-figure+type entry, counts untouched, clamp 99; else create fresh with empty counts). Result: `{ type: "requeued"; merged: boolean; quantity: number; clamped: boolean } | { type: "not-found" }`.
- `updateFigure(id, updates)` — when `requiredColors` changes, re-derive `completedAt` for every referencing queue item in the same `set()` (a removed color can complete an entry; an added one un-completes it).

## Migration mapping (one rule, both paths)

Legacy queue item → v3:

```
quantity        = 1
completedCounts = Object.fromEntries(completedColors.map(id => [id, 1]))
completedAt     = completedAt ?? null   (verbatim; never re-derived here)
```

Applied in:

1. **IDB live migration** — `openDB("print-flow", 3)`. In the `versionchange` transaction: `oldVersion 1` runs the existing figure/brand migration *plus* the queue mapping; `oldVersion 2` runs the queue mapping only. Rows are read as `unknown` and narrowed with the `QueueItemLegacy` guard; **rows failing the guard are deleted** in the transaction — never left in old shape to hydrate as v3. Pre-existing duplicate rows (same figure+type) are preserved one-for-one, never consolidated.
2. **Import** — v1 envelopes keep the existing figure/brand migration and additionally map queue items; v2 envelopes map queue items only. Envelope validation stays all-or-nothing (an invalid file is rejected wholesale, as today). Exported envelopes are always `version: 3`.

## Export validators & normalization

- v3 `isValidQueueItem`: `quantity` integer 1..99; `completedCounts` a record of string → integer with `0 <= count <= quantity` (quantity is on the same row — fully checkable per row); `completedAt` string | null | absent. Required-color membership is *not* validated (orphan tolerance, figures may legitimately drift).
- The legacy validator (array `completedColors`, per `QueueItemLegacy`) remains for the v1/v2 import paths only.
- `rebuildQueueItems` — v3 import normalization, sibling of `rebuildBrands`/`rebuildFigures`: rebuild each item with explicit fields (stray properties stripped), drop non-integer count entries, clamp counts to 0..quantity. Stale non-required keys are kept (ignored by derivation).
