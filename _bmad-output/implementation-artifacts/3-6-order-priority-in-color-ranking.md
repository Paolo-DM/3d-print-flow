# Story 3.6: Order Priority in Color Ranking

Status: done

## Story

As a user fulfilling customer orders,
I want order-flagged figures to always appear before stock items in the color ranking,
So that I prioritize customer orders during every color run.

## Acceptance Criteria

1. **Given** the color ranking computation **When** both order and stock queue items need the same color **Then** order-flagged items appear above stock items within that color's expanded figure list

2. **Given** a color entry in the ranking **When** it contains order-flagged items **Then** an order badge (warm Badge variant) is displayed on the ranking entry indicating orders are present

3. **Given** the ranking sort algorithm **When** computing the ranked list **Then** the overall color sort is by total incomplete count (orders + stock), but within each color's figure list, orders sort above stock; within each tier, figures are unsorted (stable order)

4. **Given** the Figure View **When** displaying queue items **Then** order items show a warm-colored order Badge and stock items show a neutral muted Badge

## Implementation Status: Mostly Complete

**Critical context for the dev agent:** Most of this story's ACs were implemented organically across Stories 3.2, 3.4, and 3.5. This story is primarily a **verification, visual polish, and test hardening** task.

### What Already Exists (DO NOT Rebuild)

| AC | Implementation | Where | Status |
|----|---------------|-------|--------|
| AC1 | `matchingItems.toSorted()` — orders above stock in expanded list | `app/components/ColorRankingEntry.tsx:101-105` | Done |
| AC2 | `entry.hasOrders` → orange `Badge` on ranking entry | `app/components/ColorRankingEntry.tsx:138-142` | Done |
| AC3 | `computeColorRanking` sorts by total count; within-color list sorts orders first | `app/lib/derived.ts:51-57` + `ColorRankingEntry.tsx:101-105` | Done |
| AC4 | Order badge (orange/warm), Stock badge (muted) on `QueueItemCard` | `app/components/QueueItemCard.tsx:74-85` | Done |

### What Needs Work

1. **Visual separator between orders and stock** within the expanded figure list in `ColorRankingEntry.tsx` — the UX spec calls for a `Separator` between ranking sections (orders vs. stock). Currently both tiers render back-to-back with no visual divider.

2. **Missing test coverage in Color View route** — `app/routes/_queue.home.test.tsx` has ZERO order-related tests. Need tests verifying that order badges appear on ranking entries and that the order priority behavior works at the route level.

3. **Stock badge missing in Color View expanded list** — `QueueItemCard.tsx` shows both Order and Stock badges, but `ColorRankingEntry.tsx:198-205` only renders a badge for order items. For consistency per UX-DR16 ("Order badge in warm color, stock badge in neutral muted"), add a neutral stock badge to expanded-list figure items.

## Tasks / Subtasks

- [x] Task 1: Add visual separator between orders and stock in expanded figure list (AC: 1)
  - [x] 1.1 In `ColorRankingEntry.tsx`, after the sorted `matchingItems`, determine the boundary index where orders end and stock begins
  - [x] 1.2 Render a `Separator` component (from `app/components/ui/separator.tsx`) between the last order item and first stock item — only when BOTH orders and stock exist for that color
  - [x] 1.3 Test: separator renders when mixed types, absent when all-order or all-stock

- [x] Task 2: Add stock badge to Color View expanded figure items (AC: 4)
  - [x] 2.1 In `ColorRankingEntry.tsx:198-205`, add a neutral muted `Badge variant="outline"` for stock items (matching `QueueItemCard.tsx:82-84` pattern)
  - [x] 2.2 Test: stock badge renders in expanded list items

- [x] Task 3: Add order priority tests to Color View route (AC: 1, 2, 3)
  - [x] 3.1 In `_queue.home.test.tsx`, add test: ranking entry shows Order badge when `hasOrders` is true
  - [x] 3.2 Add test: ranking entry does NOT show Order badge when only stock items
  - [x] 3.3 Add test: expanded list shows order items above stock items (verify DOM order)

- [x] Task 4: Verify existing tests and add any missing edge cases (AC: 1, 2, 3, 4)
  - [x] 4.1 Run full test suite — verify zero regressions from changes
  - [x] 4.2 Verify `derived.test.ts` covers: mixed order+stock ranking entry has `hasOrders: true`; stock-only has `hasOrders: false` — already exists, confirm passing
  - [x] 4.3 Verify `ColorRankingEntry.test.tsx` covers: orders above stock, order badge shown — already exists, confirm passing
  - [x] 4.4 Verify `_queue.figures.test.tsx` covers: orders before stock — already exists, confirm passing

## Dev Notes

### Existing Infrastructure — DO NOT Recreate

| What | Where | Notes |
|------|-------|-------|
| `computeColorRanking(spools, figures, queueItems)` | `app/lib/derived.ts:32` | Returns `ColorRankingEntry[]` sorted by count desc. Already tracks `hasOrders` per spool |
| `ColorRankingEntry` interface | `app/lib/derived.ts:3-7` | `{ spool: Spool, count: number, hasOrders: boolean }` |
| Order/stock sort in expanded list | `app/components/ColorRankingEntry.tsx:101-105` | `.toSorted()` placing orders first |
| Order badge on ranking entry | `app/components/ColorRankingEntry.tsx:138-142` | Orange Badge with `bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400` |
| Order/Stock badges on QueueItemCard | `app/components/QueueItemCard.tsx:74-85` | Order: orange outline; Stock: muted outline |
| Badge component | `app/components/ui/badge.tsx` | shadcn Badge with variant support |
| Separator component | `app/components/ui/separator.tsx` | shadcn Separator — Radix-based, horizontal/vertical |
| QueueItem type | `app/lib/types.ts:19` | `type: "stock" \| "order"` — discriminated union |
| Test utils | `app/lib/test-utils.ts` | `createSpool()`, `createFigure()`, `createQueueItem()` factory functions |
| Existing order tests in ColorRankingEntry | `app/components/ColorRankingEntry.test.tsx:81,131` | "orders appear above stock" and "shows order badge" |
| Existing order tests in Figure View | `app/routes/_queue.figures.test.tsx:141` | "orders appear before stock items" |

### Separator Implementation Pattern

In `ColorRankingEntry.tsx`, within the `matchingItems.map()` block, detect the boundary:

```tsx
// Find the index where orders end and stock begins
const orderEndIndex = matchingItems.findIndex(qi => qi.type !== "order")
const hasOrderStockBoundary = orderEndIndex > 0 && orderEndIndex < matchingItems.length

// In the map, after rendering an order item at orderEndIndex - 1:
{index === orderEndIndex - 1 && hasOrderStockBoundary && <Separator />}
```

Alternative: split `matchingItems` into two arrays and render with a separator between. Choose whichever produces cleaner JSX.

### Badge Styling Reference

Order badge (warm — used on both ranking entry and expanded items):
```tsx
<Badge variant="outline" className="text-orange-600 dark:text-orange-400">Order</Badge>
```

Stock badge (neutral muted — used in QueueItemCard, to be added to expanded items):
```tsx
<Badge variant="outline" className="text-muted-foreground">Stock</Badge>
```

Ranking entry level (filled, not outline):
```tsx
<Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Order</Badge>
```

### Key Architectural Rules

- **No `useEffect` for state derivation** — derive during render
- **No `useMemo` / `useCallback` / `React.memo`** — React Compiler handles memoization
- **Immutable sorts** — `.toSorted()` not `.sort()`
- **Store selectors** — select minimum needed from store
- **`tabular-nums`** — use on ALL numeric displays
- **Co-located tests** — test files next to source files
- **Import order** — React/Router > third-party > `~/lib/` > `~/components/` > relative

### Project Structure Notes

Files to modify:
- `app/components/ColorRankingEntry.tsx` — add Separator between orders/stock, add stock badge to expanded items
- `app/components/ColorRankingEntry.test.tsx` — add separator and stock badge tests
- `app/routes/_queue.home.test.tsx` — add order priority route-level tests

Files NOT to modify:
- `app/lib/derived.ts` — ranking computation with `hasOrders` already complete
- `app/lib/derived.test.ts` — existing `hasOrders` tests already cover this
- `app/lib/types.ts` — QueueItem already has `type: "stock" | "order"`
- `app/lib/store.ts` — no store mutations needed
- `app/components/QueueItemCard.tsx` — order/stock badges already correct
- `app/routes/_queue.figures.tsx` — order sorting already implemented
- `app/routes/_queue.home.tsx` — passes data to ColorRankingEntry which handles sorting

### Testing Strategy

Test setup patterns (reuse from existing tests):
- Store reset in `beforeEach`
- Factory functions from `app/lib/test-utils.ts`
- `createRoutesStub` for route-level tests in `_queue.home.test.tsx`

Key test scenarios:
1. **Separator**: renders between order and stock items; absent when all one type
2. **Stock badge in expanded list**: stock items show neutral badge
3. **Color View route**: ranking entry shows Order badge; order items above stock in expanded list
4. **Regressions**: all existing 229+ tests remain passing

### Previous Story Intelligence

From Story 3.5 (Figure Completion):
- 229 tests passing at completion
- `QueueItemCard` has `CompletionPhase` animation support — don't break animation props when adding separator logic
- `ColorRankingEntry` has completion tracking via refs — separator logic should not interfere with animation state
- `completionPhases.has(qi.id)` filter in `matchingItems` keeps animating items visible — separator index must account for these items

From Story 3.4 (Figure View):
- Order/stock sort: `.toSorted()` with `a.type === "order"` comparison
- `QueueItemCard` order badge pattern: `variant="outline"` with `text-orange-600 dark:text-orange-400`
- Stock badge: `variant="outline"` with `text-muted-foreground`

From Story 3.2 (Color View):
- `ColorRankingEntry` expanded list already sorts orders above stock
- Order badge on ranking entry already uses filled (non-outline) warm Badge variant
- The `hasOrders` flag in `computeColorRanking` was added in this story

### Git Intelligence

Recent commits show Story 3.5 was the last completed work:
- `adc64d8` feat: enhance queue item completion animations and add completed items management
- `cd879de` feat: add completedAt tracking for queue items and update UI accordingly
- All changes followed patterns: CSS animations, store selectors, co-located tests

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.6, lines 622-644]
- [Source: _bmad-output/planning-artifacts/architecture.md — Color-First Planning FR24-FR29, Derived State as Pure Functions]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR16 Order Priority, Badge styling line 883, Separator line 690]
- [Source: _bmad-output/planning-artifacts/prd.md — FR25 Order priority surfacing, Journey 3 Order Fulfillment]
- [Source: app/lib/derived.ts — computeColorRanking with hasOrders tracking]
- [Source: app/components/ColorRankingEntry.tsx — order sort, order badge, expanded figure list]
- [Source: app/components/QueueItemCard.tsx — order/stock Badge pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Added visual separator (Radix Separator) between order and stock items in ColorRankingEntry expanded figure list. Separator only renders when both order and stock items exist for that color.
- Added stock badge (`Badge variant="outline"` with `text-muted-foreground`) to expanded list items, replacing the previous null for stock items. Now both order and stock items show their type badge.
- Added 4 new component-level tests in ColorRankingEntry.test.tsx: separator present for mixed, absent for all-order, absent for all-stock, stock badge renders.
- Added 3 new route-level tests in _queue.home.test.tsx: Order badge on ranking entry, no Order badge for stock-only, order items above stock in expanded list.
- Verified all pre-existing order priority tests pass: derived.test.ts hasOrders (2 tests), ColorRankingEntry.test.tsx orders above stock + order badge (2 tests), _queue.figures.test.tsx orders before stock (1 test).
- Full test suite: 239 tests passing, zero regressions.

### Change Log

- 2026-03-31: Implemented story 3-6 — separator, stock badge, route-level order tests (7 new tests total)

### File List

- `app/components/ColorRankingEntry.tsx` — added Separator import, order/stock boundary detection, separator rendering, stock badge for non-order items
- `app/components/ColorRankingEntry.test.tsx` — added 4 tests (separator mixed/all-order/all-stock, stock badge)
- `app/routes/_queue.home.test.tsx` — added 3 tests (Order badge present/absent, order above stock in expanded list)
