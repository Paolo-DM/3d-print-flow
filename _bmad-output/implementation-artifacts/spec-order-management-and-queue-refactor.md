---
title: 'Order Management & Queue Refactor'
type: 'feature'
created: '2026-08-29'
status: 'done'
baseline_commit: '39b727fd9b1b327dea06ef191189c0a95af78b01'
review_loop_iteration: 0
context:
  - '{project-root}/PRODUCT.md'
  - '{project-root}/_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Customer batches lose identity after intake: unrelated orders merge, and Queue metrics describe rows rather than orders or remaining work.

**Approach:** Add first-class orders and connected Colors, Orders, and Figures views across persistence, history, and responsive UI.

## Boundaries & Constraints

**Always:** `Order` contains UUID `id`, unique trimmed `reference` (case-insensitive), optional trimmed `customerName`/`platform`, local `YYYY-MM-DD` `dueDate`, `notes`, and `createdAt`. Final v4 `QueueItem.orderId` is `null` for stock or an existing order ID and has no `type`; merge active rows only by `figureId + orderId`. Preserve quantity/count rules, live binding, local-first operation, and demand-first ranking. Show platform with identity; completed order lines are read-only. Retain accessibility, dark mode, and reduced motion.

| Derived state | Predicate |
|---|---|
| Draft | No linked rows; visible with Add items/Delete |
| Blocked | Any row has a missing figure, zero required colors, or missing required spool |
| Ready | At least one valid row and every row is complete |
| Active | At least one row and neither Blocked nor Ready |

Blocked work shows “Needs attention,” its line/reason, and Edit figure/Remove line; stock uses the same derivation. Overdue means a non-Ready due date precedes injected local `today`; undated orders sort last. A midnight-aware hook updates `today`. Live edits return Ready orders to Orders and announce affected references.

**Ask First:** Replacing live binding with job snapshots, or adding stored fulfillment/shipping state.

**Never:** Add commerce, CRM, marketplace integrations, Kanban, scheduling, or timelines. Never color-code order identity, due-date-rank default Color View, merge orders, auto-delete Drafts, or reuse historical orders.

## I/O & Edge-Case Matrix

| Scenario | Expected behavior | Failure/recovery |
|---|---|---|
| Create/edit/duplicate | Create and duplicate default to `ORD-NNN` where N is max numeric suffix + 1 (minimum three-digit padding); edit shares collision rules | Invalid input focuses first error and commits nothing |
| Legacy/hydration | Each v1-v3 row gets deterministic ID and unique `Imported · <figure> · <queueItemId>` reference; preserve progress | v4 import rejects bad references; hydration creates one collision-safe Recovered order per missing `orderId`, grouping shared IDs |
| Delete/cascade | Delete linked rows after impact confirmation; losing the last row leaves visible Draft | Cancel changes nothing; retry latest snapshot |
| Blocked work | Imported or live order/stock row cannot resolve printable colors | Needs attention count increments; UI names the cause and recovery action; never reports Ready |
| Completion/scope | Final chip completes the aggregate; stock uses Print Again, orders Duplicate; scopes preserve demand sorting | Missing scope uses All; zero-work explains completion; scope changes reset animation refs |

</frozen-after-approval>

## Code Map

- `app/lib/types.ts:21`, `migration.ts:18`, `test-utils.ts:32` -- v4 Order/QueueItem/snapshot types, legacy shapes, factories.
- `app/lib/store.ts:83,109,315,355,489,544` -- merge key, order commands, stock batching, duplication, persistence subscription.
- `app/lib/derived.ts:41,89,97`, new `app/hooks/use-today.ts` -- scope/ranking, order state/progress/urgency, injected clock.
- `app/lib/db.ts:18,41,150,193`, `init.ts:6` -- v4 store; chained `oldVersion < 4` conversion after prior migrations; hydration repair; transactional writes.
- `app/lib/export-import.ts:17,98,125,256,296` -- v4 envelope/order collection validation, v1-v3 conversion, five-map rollback.
- `app/routes/catalog.tsx:234,348,456`, `FigureCard.tsx:62` -- stock intake and new/existing order composer.
- `app/routes/_queue*.tsx`, new `_queue.orders.tsx`, `QueueItemCard.tsx:75`, `ColorRankingEntry.tsx:159` -- summary, scopes, identity, three views, animation reset.
- `completed.tsx:159`, `routes.ts`, `AppSidebar.tsx:34`, `root.tsx:106` -- ready aggregates, duplication, navigation; remove orphaned `StatCard.tsx`/test and unused accent tokens.

## Tasks & Acceptance

**Execution (sequential green-tree gates):**
- [x] 1. `types.ts`, `migration.ts`, `test-utils.ts`, v3 fixture -- expand with `orderId` beside deprecated `type`; add deterministic conversion; keep full tests/typecheck green.
- [x] 2. `db.ts`, `init.ts`, `export-import.ts`, persistence helpers -- promise-chain captured changed-map snapshots, one transaction per mutation without coalescing; drain before import, retry full latest state; pass DB/import tests.
- [x] 3. `store.ts`, `derived.ts`, `use-today.ts` -- commands, merge rules, lifecycle/issues/summary/sorting; test Blocked through import and stock paths.
- [x] 4. shared order/form/filter/queue-line components plus `catalog.tsx` -- deliver accessible intake/edit/add flows; pass component/catalog tests.
- [x] 5. queue routes, Completed, navigation, StatCard cleanup -- deliver views/scopes/aggregates, then contract away `type`; pass full verification.

**Acceptance Criteria:**
- Given the same figure enters one or multiple orders and stock, when queued, then only same-order rows merge; every context keeps independent identity and progress.
- Given an order scope, when opened by Work by color, then only its outstanding copies contribute without changing global ranking semantics.
- Given a Ready order is duplicated, then a new editable unique reference and zero-progress rows are created while history remains unchanged.
- Given broken order or stock work, when Queue opens, then Needs attention counts it and exposes the exact cause and recovery without marking it Ready.
- Given rapid linked mutations or an import failure, then persistence settles to one coherent latest snapshot with no dangling order links.
- Given desktop/mobile, keyboard, dark mode, midnight rollover, or reduced motion, then identity and state stay accurate and operable.

## Spec Change Log

## Design Notes

Keep filament colors as the only saturated content. Replace StatCards with a compact summary of work, colors, Active, Ready, and Needs attention. Sort orders by overdue, due date, creation, reference, ID; Ready is never overdue. Completed stock stays itemized; Ready orders aggregate.

## Verification

**Commands:**
- `npm test` -- pass after every gate.
- `npm run typecheck` -- strict types/routes pass after every gate.
- `npx prettier --check "app/**/*.{ts,tsx}"` -- formatted.
- `npm run build` -- production bundles succeed.

**Manual checks:** order intake/edit, midnight rollover, scopes, lifecycle transitions, duplication/deletion, v3 import, both themes, and phone width.

## Suggested Review Order

**Domain lifecycle and commands**

- Start with the aggregate lifecycle, ordering, scope, and summary rules.
  [`derived.ts:203`](../../app/lib/derived.ts#L203)

- Order commands preserve identity, isolate merge keys, and split oversized duplicates safely.
  [`store.ts:409`](../../app/lib/store.ts#L409)

- Batch intake merges only active rows sharing figure and order identity.
  [`store.ts:561`](../../app/lib/store.ts#L561)

**Persistence and compatibility**

- The v4 upgrade converts every legacy order row without consolidating progress.
  [`db.ts:142`](../../app/lib/db.ts#L142)

- Hydration repairs dangling or malformed links into collision-safe recovered orders.
  [`db.ts:200`](../../app/lib/db.ts#L200)

- Changed maps persist atomically through one multi-store transaction.
  [`db.ts:299`](../../app/lib/db.ts#L299)

- Import validation enforces canonical orders, matching record keys, and valid links.
  [`export-import.ts:280`](../../app/lib/export-import.ts#L280)

- Imports drain pending writes before an atomic five-store replacement and rollback.
  [`export-import.ts:374`](../../app/lib/export-import.ts#L374)

**Intake and queue experience**

- Catalog state binds new or existing orders to staged quantities and accessible panels.
  [`catalog.tsx:236`](../../app/routes/catalog.tsx#L236)

- Queue layout centralizes lifecycle summaries, view tabs, and durable scope selection.
  [`_queue.tsx:12`](../../app/routes/_queue.tsx#L12)

- Orders view presents Draft, Active, and blocked aggregates with recovery controls.
  [`_queue.orders.tsx:17`](../../app/routes/_queue.orders.tsx#L17)

- Completed aggregates Ready orders while keeping every historical line read-only.
  [`completed.tsx:173`](../../app/routes/completed.tsx#L173)

- Repeated live-edit announcements remount the polite region for assistive technology.
  [`root.tsx:114`](../../app/root.tsx#L114)

**Contracts and regression evidence**

- Final v4 types make order links explicit and remove legacy queue type.
  [`types.ts:21`](../../app/lib/types.ts#L21)

- Real IndexedDB v3 upgrade coverage proves deterministic, lossless conversion.
  [`db.test.ts:470`](../../app/lib/db.test.ts#L470)

- Persistence ordering coverage proves imports wait for pending mutations.
  [`export-import.test.ts:724`](../../app/lib/export-import.test.ts#L724)

- Scope coverage proves color demand excludes unrelated orders and stock.
  [`_queue.home.test.tsx:132`](../../app/routes/_queue.home.test.tsx#L132)
