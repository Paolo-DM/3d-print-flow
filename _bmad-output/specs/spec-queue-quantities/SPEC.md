---
id: SPEC-queue-quantities
companions:
  - data-model.md
  - ui-flows.md
  - test-expectations.md
  - ../../project-context.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. There are no source documents: the intent arrived in-session (see Why) and the design decisions were made with Paolo. Revision 1 folds in the findings of a Codex readiness review (thread 01a04eaf-328e-7770-a746-b42df1c944eb).

# Queue Quantities & Bulk Order Intake

## Why

A pain to solve. Paolo (sole user) receives customer orders that repeat figures — a real order: Hagrid, Silente, Dobby, Minnie, Ash, Misty, Brok, Hulk, Batman, Buzz 2x, Woody 2x, Kratos 2x (12 figures, 15 pieces). Today one `QueueItem` is one physical copy, so "Buzz 2x" means adding Buzz twice from the catalog and getting two disconnected identical cards; that 15-piece order takes 15 separate add actions. Copies are interchangeable in the color-first workflow (with the green spool loaded, Buzz's green part is simply printed twice), so the queue should carry a quantity per figure and the catalog should let a whole order in at once.

## Capabilities

- **CAP-1**
  - **intent:** The user can queue N copies of a figure as a single queue entry so multi-copy orders stay legible.
  - **success:** A queue entry carries an integer quantity ≥ 1 and renders as one card showing ×N (no badge at quantity 1); each required color shows completed-copies/quantity; card progress is total completed color-copies over colors × quantity, summed over `requiredColors` only. The example order yields 12 cards, three of them ×2 — never 15 cards.

- **CAP-2**
  - **intent:** The user can record one more copy printed in a color with the same single reversible tap as today.
  - **success:** Tapping a color chip advances that color's count by one copy (0/2 → 1/2 → 2/2); a tap past full cycles back to 0/2. Taps on a spool outside the figure's `requiredColors` (or with the figure missing) are rejected without mutation. At quantity 1 the interaction is identical to the current toggle. Active/completed status everywhere derives from counts (as every view does today); `completedAt` follows the single canonical rule in `data-model.md` after every mutation.

- **CAP-3**
  - **intent:** The color ranking reflects true outstanding demand so the next-spool decision counts copies, not cards.
  - **success:** A spool's ranking count is Σ over active entries of (quantity − completed count) for entries whose figure requires it. Buzz ×2 + Woody ×1 both needing Green rank Green at 3; completing one Buzz green drops it to 2. `hasOrders` keeps its current semantics (any order-type entry with outstanding copies flags the spool); count ties break deterministically by spool name, then id.

- **CAP-4**
  - **intent:** The user can adjust the quantity of an active queue entry when an order changes.
  - **success:** Quantity can be raised or lowered from the queue card on *active* entries only (completed entries are historical; requeue is the path back). Integer input clamps to 1…99; non-integer or non-finite input is rejected without mutation. Lowering clamps any completed count above the new quantity; `completedAt` is re-derived after the change (an entry whose counts now all equal quantity completes). Removal of the whole entry stays the existing confirm-then-delete flow.

- **CAP-5**
  - **intent:** The user can enqueue a whole order from the catalog in one action.
  - **success:** An order mode in the catalog lets the user select multiple figures, set a per-figure quantity, choose stock/order once for the batch, and confirm; the whole batch lands in one store update. Duplicate figure lines in a batch are summed before applying; an empty batch is a no-op; entries whose figure is missing or has no required colors are skipped and reported in the command result (the UI also keeps them unselectable, as with the current single add).

- **CAP-6**
  - **intent:** Adding a figure that is already actively queued must strengthen the existing entry, not spawn a duplicate card.
  - **success:** Single add and bulk add both merge into an existing *active* entry (active = not complete by derivation) of the same figure and type by incrementing its quantity, existing color counts untouched; quantity clamps at 99 and the result reports the final quantity and whether it clamped. When legacy data holds several active candidates, the entry with the smallest id receives the merge (deterministic); migration never consolidates pre-existing duplicates. Completed entries are never merged into; distinct types (stock vs order) stay separate cards.

- **CAP-7**
  - **intent:** Existing data — live IndexedDB and previously exported files — loads losslessly under the new model.
  - **success:** IDB upgrades to version 3: `oldVersion 1` runs the existing figure/brand migration plus the queue mapping, `oldVersion 2` the queue mapping only; rows failing the legacy queue guard are deleted in the upgrade transaction, never left in old shape. Export envelope bumps to version 3 with its own validator; v1 and v2 files remain importable (all-or-nothing validation as today), each prior item becoming quantity 1 with completed colors preserved as count 1 and `completedAt` verbatim. Import → export of the v2 fixture produces equivalent v3 data. Mapping and normalization in `data-model.md`.

- **CAP-8**
  - **intent:** Queue commands report what they did so the UI can present outcomes without guessing.
  - **success:** `addToQueue`, `addBatchToQueue`, `setQuantity`, and `requeueCompleted` return discriminated results (created/merged/clamped/skipped/invalid variants per `data-model.md`), following the established brand-command pattern: outcome decided in the store, presentation in the UI. `toggleChip` stays void — its feedback is the chip itself.

## Constraints

- Local-first architecture unchanged: zustand store + IndexedDB persistence + JSON export/import, no backend. Store commands stay synchronous; each command applies its changes in a single `set()`.
- `completedColors: string[]` is replaced by per-color counts. Invariants: quantity is an integer 1…99; every count satisfies 0 ≤ count ≤ quantity — enforced by store guards on write and by the v3 validator per row (quantity lives on the same row); count keys outside the figure's `requiredColors` are tolerated on read and ignored by every derived computation, which iterate `requiredColors` only.
- One canonical `completedAt` rule after every mutation that touches counts, quantity, or a figure's `requiredColors`: `isComplete ? (existing.completedAt ?? now) : null`. Editing a figure's colors re-derives `completedAt` for referencing queue items in the same `set()`. Migration and import preserve stored `completedAt` verbatim; the rule self-heals mismatches on the next mutation.
- Versioning discipline follows the established pattern (`migration.ts`, `export-import.ts`, `db.ts`): the legacy queue shape gets its own type and guard, v1/v2 accepted on import only, v3 gets a distinct validator, and import normalizes queue items through an explicit rebuild (`data-model.md`).
- PRODUCT.md principles bind the new UI: progress unmistakable and redundant (never color-only — counts are text, not just fill), single-tap reversible actions, ≥ 44px touch targets, `prefers-reduced-motion` respected.

## Non-goals

- No named "order" entity: no order id, customer, or per-order grouping/view — an order is just the batch you enqueue.
- No free-text order parsing (pasting "Buzz 2x" as text).
- No per-copy identity: copies are interchangeable; there is no "copy 1 vs copy 2" state.
- No printer scheduling or print-time management.
- No quantity picker on the single-add action; single add stays quantity 1 (merge via CAP-6 covers repeats).
- No migration-time consolidation of pre-existing duplicate rows.

## Success signal

Paolo enqueues the sample order (12 figures, 15 pieces) from the catalog in one bulk action; the queue shows 12 cards with Buzz, Woody, Kratos at ×2; loading any spool shows outstanding copy counts per figure, and tapping through them empties that color from the ranking exactly when the last copy is printed — with no duplicate cards, and an export/import round-trip (including old v1/v2 files) losing nothing.

## Assumptions

- Chip reversibility is by cycling: a tap past full returns that color to 0. No separate decrement affordance; at quantity 1 this is today's toggle.
- Requeue of a completed entry restores its full quantity, merging into an existing active same-figure+type entry when present (clamped at 99); the completed source entry stays in the Completed section as history.
- Bulk add asks stock/order once for the whole batch, defaulting to order.
- Quantity is capped at 99 to keep counters legible.
