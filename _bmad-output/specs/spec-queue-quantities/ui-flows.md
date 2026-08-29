# UI Flows — Queue Quantities & Bulk Order Intake

## Queue card (figure view, `QueueItemCard`)

- Header gains a quantity badge `×N` next to the figure name when `quantity > 1`; nothing extra at 1.
- Each `ColorChip` shows its count as text (`1/2`) in addition to the completed visual state; full = current completed treatment, partial = distinct in-progress treatment that is not color-only (count text carries the state). At quantity 1 chips look and behave exactly as today.
- A compact stepper (− / ×N / +) on the card adjusts quantity (`setQuantity`, active entries only); − at 1 does nothing (removal stays the trash + AlertDialog flow), + at 99 is disabled. Stepper targets ≥ 44px on touch. When lowering completes the entry (`{ type: "updated", completed: true }`), the existing completion pulse/collapse cascade fires.
- Progress bar and `completed/total` label use copies × colors totals (e.g. 1/4 for ×2 with two colors).

## Color view rows (`ColorRankingEntry` expansion)

- A figure row under a spool shows the per-color count for *that* spool (`Kratos — 1/2`) and taps advance it, same cycle as the card chip.
- Ranking entry count = outstanding copies (CAP-3); completion pulse/collapse animations keep current behavior, firing when the last outstanding copy of a color completes.

## Catalog order mode (bulk intake, CAP-5)

1. Catalog header gains an "Add order" (order mode) toggle.
2. In order mode each figure card exposes a quantity control (tap to select = 1, + / − to adjust); − at 1 deselects the figure, + at 99 is disabled; figures with no required colors stay unselectable (current disabled rule).
3. A sticky summary bar shows selected count ("3 figures · 4 pieces"), a stock/order choice defaulting to **order**, Confirm and Cancel. Confirm is disabled at zero selections.
4. Confirm calls `addBatchToQueue` (one store update) and presents its result as one summary toast — piece total plus merge count when mixed ("15 pieces queued · 2 merged into existing entries") — then exits order mode and clears selection. Cancel/exit clears selection.
5. Merge rule (CAP-6) applies per entry: bulk-adding Buzz ×2 when Buzz (order) is already active makes that entry ×3; the merge is reported via the summary toast, not per-figure toasts.

## Completed section & requeue

- Completed cards show `×N`; `isCompletedToday` unchanged.
- "Print again" requeues at full quantity — the toast presents the `requeueCompleted` result ("Kratos ×2 back in queue" / "merged into queue: Kratos now ×3"). The completed source card stays in the Completed section as history.

## Feedback rules (PRODUCT.md)

- Every count change gives immediate redundant feedback: number text change + visual state + (existing) animation. Never hue alone.
- Cycling past full (reset to 0) is visually distinct from an increment so an accidental reset is noticed; it remains a single reversible tap.
- All new controls respect `prefers-reduced-motion` and keyboard focus visibility.
