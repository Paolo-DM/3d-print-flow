# Story 3.1: Add to Queue & Queue Store Mutations

Status: done

## Story

As a user,
I want to add figures from my catalog to the print queue as stock or order items,
so that I can start tracking what needs to be printed.

## Acceptance Criteria

1. **Given** the user is in the Figure Catalog and clicks "Add to Queue" on a figure
   **When** the add-to-queue action is triggered
   **Then** a prompt or toggle allows the user to select Stock or Order type before confirming

2. **Given** the user confirms adding a figure to the queue
   **When** the queue item is created
   **Then** a new QueueItem is added to the Zustand store with `crypto.randomUUID()` ID, the figure's ID as `figureId`, selected type (stock/order), empty `completedColors` array, and is persisted to IndexedDB

3. **Given** a figure is already in the queue
   **When** the user adds the same figure again
   **Then** a second, independent queue item is created (multiple instances of the same figure are allowed)

4. **Given** the Zustand store
   **When** queue mutations are defined
   **Then** `addToQueue`, `removeFromQueue`, `toggleChip`, and `requeueCompleted` mutations exist and work correctly

5. **Given** the derived state module `app/lib/derived.ts`
   **When** derived functions are implemented
   **Then** `computeColorRanking(spools, figures, queueItems)`, `computeFigureProgress(queueItem, figure)`, and `computeCompletionStatus(queueItem, figure)` exist as pure functions, tested with unit tests

## Tasks / Subtasks

- [x] Task 1: Add queue mutations to Zustand store (AC: #4)
  - [x] 1.1 Add `addToQueue(figureId: string, type: "stock" | "order")` mutation
  - [x] 1.2 Add `removeFromQueue(id: string)` mutation
  - [x] 1.3 Add `toggleChip(queueItemId: string, spoolId: string)` mutation
  - [x] 1.4 Add `requeueCompleted(queueItemId: string)` mutation
  - [x] 1.5 Update the `PrintFlowState` interface to include the four new mutations
- [x] Task 2: Add derived state functions to `app/lib/derived.ts` (AC: #5)
  - [x] 2.1 Implement `computeColorRanking(spools, figures, queueItems)` — returns ranked spool list sorted by count of queued figures with incomplete chips
  - [x] 2.2 Implement `computeFigureProgress(queueItem, figure)` — returns `{ completed: number, total: number }` intersecting `completedColors` with current `requiredColors`
  - [x] 2.3 Implement `computeCompletionStatus(queueItem, figure)` — returns boolean (all required colors completed)
- [x] Task 3: Add "Add to Queue" UI in the catalog view (AC: #1, #2, #3)
  - [x] 3.1 Add "Add to Queue" button to `FigureCard` (disabled if figure has zero `requiredColors`)
  - [x] 3.2 Implement type selection — a DropdownMenu on the "Add to Queue" button with "Stock" and "Order" menu items; selecting either immediately creates the queue item (no additional confirmation)
  - [x] 3.3 After adding, show a brief visual confirmation on the card (e.g., a transient "Added!" state) — not a toast
- [x] Task 4: Write unit tests for store mutations (AC: #4)
  - [x] 4.1 Test `addToQueue` creates QueueItem with correct fields and UUID
  - [x] 4.2 Test `addToQueue` allows duplicate figureId entries
  - [x] 4.3 Test `removeFromQueue` removes the correct item
  - [x] 4.4 Test `removeFromQueue` is no-op for non-existent ID
  - [x] 4.5 Test `toggleChip` adds spool ID to completedColors when absent
  - [x] 4.6 Test `toggleChip` removes spool ID from completedColors when present (un-toggle)
  - [x] 4.7 Test `toggleChip` is no-op for non-existent queue item
  - [x] 4.8 Test `requeueCompleted` creates new queue item from catalog's current `requiredColors` with empty completedColors
- [x] Task 5: Write unit tests for derived state functions (AC: #5)
  - [x] 5.1 Test `computeColorRanking` sorts by incomplete chip count descending
  - [x] 5.2 Test `computeColorRanking` excludes colors with zero incomplete chips
  - [x] 5.3 Test `computeColorRanking` returns empty array for empty queue
  - [x] 5.4 Test `computeFigureProgress` intersects completedColors with current requiredColors (stale entries ignored)
  - [x] 5.5 Test `computeCompletionStatus` returns true only when all required colors are completed
  - [x] 5.6 Test `computeCompletionStatus` returns false for figure with zero requiredColors

## Dev Notes

### Story Intent

This story establishes the queue data mutation layer and derived state computations that all subsequent Epic 3 stories depend on. The queue UI views (Color View, Figure View, completion cascade) are NOT part of this story — only the store mutations, derived functions, and the catalog-side "Add to Queue" entry point.

### Architecture Requirements

**QueueItem type already exists** in `app/lib/types.ts`:

```ts
export interface QueueItem {
  id: string
  figureId: string
  type: "stock" | "order"
  completedColors: string[]
}
```

Do not modify this interface. It is already correct per the architecture spec.

**Store mutations follow existing patterns** in `app/lib/store.ts`:

- Mutations are defined inside the `createStore` callback, not exported separately
- Always use functional `set()`: `set(state => ({ ... }))`
- Never mutate Maps in place — create `new Map(prev)` then `.set()` or `.delete()`
- Every mutation that changes entity data is atomic — update all affected maps in a single `set()` call

**`_persist` is a module-level variable**, not in store state. The subscribe callback already handles `queueItems` persistence:

```ts
if (state.queueItems !== prevState.queueItems)
  writeStore("queueItems", state.queueItems)
```

No persistence changes needed — adding queue mutations automatically triggers IndexedDB writes.

**Derived state must be pure functions** in `app/lib/derived.ts`:

- Accept store state as arguments, return derived values
- Called during render, never stored in Zustand or useState
- React Compiler will memoize these automatically
- Must handle stale `completedColors` entries: a spool ID in `completedColors` that is no longer in `figure.requiredColors` is ignored (intersection semantics)

### Mutation Specifications

**`addToQueue(figureId: string, type: "stock" | "order")`**
- Creates a new QueueItem with `crypto.randomUUID()` ID
- Sets `completedColors: []` (empty — all chips start incomplete)
- Does NOT check if figureId exists in figures — the catalog UI only offers "Add to Queue" on existing figures
- Multiple queue items with the same figureId are allowed

**`removeFromQueue(id: string)`**
- Removes the queue item from the queueItems Map
- No-op if ID doesn't exist (defensive, no error thrown)
- Does NOT show a confirmation — the calling UI handles that (story 3.5)

**`toggleChip(queueItemId: string, spoolId: string)`**
- If spoolId is in `completedColors`, remove it (un-toggle)
- If spoolId is NOT in `completedColors`, add it (toggle)
- No-op if queueItemId doesn't exist
- Does NOT check if spoolId is in figure's requiredColors — the UI only renders chips for required colors

**`requeueCompleted(queueItemId: string)`**
- Reads the existing queue item's `figureId`
- Looks up the figure in the figures Map to get its current `requiredColors`
- Creates a NEW queue item (new UUID) with the same `figureId`, same `type`, and `completedColors: []`
- Does NOT remove the original completed item — the calling UI handles archive management (story 3.5)
- If the original queue item or figure doesn't exist, no-op

### Derived Function Specifications

**`computeColorRanking(spools, figures, queueItems)`**

Returns an array of ranking entries sorted descending by count of queued figures with an incomplete chip for each color:

```ts
interface ColorRankingEntry {
  spool: Spool
  count: number        // number of queue items with this color incomplete
  hasOrders: boolean   // true if any order-type queue items need this color
}
```

Algorithm:
1. Iterate all queue items
2. For each queue item, look up its figure's `requiredColors`
3. For each required color, check if it's NOT in the queue item's `completedColors`
4. Accumulate counts per spool ID
5. Filter out spools with count === 0
6. Sort descending by count (use `.toSorted()`, not `.sort()`)
7. Map spool IDs to full Spool objects from the spools Map
8. Track `hasOrders` by checking if any contributing queue item has `type === "order"`

Performance: single pass over queue items, O(Q * C) where Q = queue items and C = average colors per figure. At 30 queue items x 6 colors = trivial.

**`computeFigureProgress(queueItem, figure)`**

```ts
interface FigureProgress {
  completed: number
  total: number
}
```

- `total` = `figure.requiredColors.length`
- `completed` = count of `figure.requiredColors` entries that are also in `queueItem.completedColors`
- Stale entries in `completedColors` (spool IDs not in current `requiredColors`) are ignored via intersection
- If figure is null/undefined (orphaned queue item), return `{ completed: 0, total: 0 }`

**`computeCompletionStatus(queueItem, figure)`**

- Returns `true` if `completed === total` AND `total > 0`
- A figure with zero requiredColors is never "complete" (cannot complete if there's nothing to do)

### Existing Codebase Context

**Files to modify:**

- `app/lib/store.ts` — Add 4 queue mutations and update `PrintFlowState` interface
- `app/lib/derived.ts` — Add 3 derived functions (keep existing `getReferencingFigures` and `computeAffectedQueueItems`)
- `app/components/FigureCard.tsx` — Add "Add to Queue" button with stock/order DropdownMenu
- `app/routes/catalog.tsx` — Import and provide `addToQueue` if needed (FigureCard may call store directly)

**Files to create:**

- `app/lib/derived.test.ts` — Unit tests for all derived functions (if not already present with adequate coverage)

**Files that already exist and work correctly — do not modify:**

- `app/lib/types.ts` — QueueItem interface is already correct
- `app/lib/db.ts` — Already handles queueItems persistence
- `app/lib/init.ts` — Already hydrates queueItems on app load
- `app/lib/test-utils.ts` — Already has `createQueueItem()` factory

**Existing derived functions to preserve:**

```ts
// Already in derived.ts — do NOT remove or modify
export function getReferencingFigures(spoolId, figures): Figure[]
export function computeAffectedQueueItems(figureId, queueItems): QueueItem[]
```

### UI Implementation Notes

**"Add to Queue" button on FigureCard:**

- Use shadcn `DropdownMenu` with the button as trigger
- Two menu items: "Stock" and "Order" — selecting either immediately calls `store.getState().addToQueue(figureId, type)`
- Disable the button if `figure.requiredColors.length === 0` (can't queue a figure with no colors)
- After adding, briefly show "Added!" text on the button (use local component state with a setTimeout to reset — this is a UI timer, not state sync, so it's an acceptable use of setTimeout)
- Use Lucide `ListPlus` icon for the button

**No confirmation dialog for add-to-queue:** Adding to queue is an additive, non-destructive action. Per project conventions, only destructive actions require confirmation.

**Import ordering to follow:**

```
1. React / React Router
2. Third-party (zustand, lucide-react)
3. ~/lib/ (store, derived, types)
4. ~/hooks/
5. ~/components/ (ui/*)
```

### Testing Requirements

- Framework: Vitest + React Testing Library + `fake-indexeddb`
- Use `store.setState()` to seed test state directly
- Use factory functions from `app/lib/test-utils.ts`: `createSpool()`, `createFigure()`, `createQueueItem()`
- Store mutation tests go in `app/lib/store.test.ts` (append to existing test file)
- Derived function tests go in `app/lib/derived.test.ts` (append to existing test file)
- UI tests for FigureCard's "Add to Queue" button go in a new `app/components/FigureCard.test.tsx` or in existing `catalog.test.tsx`
- Reuse the existing `matchMedia` mock pattern from `FigureForm.test.tsx`

### Implementation Guardrails

1. **Do not build queue views.** `_queue.home.tsx` and `_queue.figures.tsx` remain stubs. This story only adds the store layer and catalog entry point.
2. **Do not denormalize colors into queue items.** QueueItem.completedColors stores spool IDs that have been marked complete. The full color set is always derived from `figure.requiredColors` at render time.
3. **Do not add success toasts.** The visual confirmation on the "Add to Queue" button is sufficient. No Sonner toasts for additive actions.
4. **Do not use `useMemo`, `useCallback`, or `React.memo`.** React Compiler handles memoization.
5. **Do not use `useEffect` for state derivation.** Derived values are computed during render.
6. **Use `.toSorted()` not `.sort()`** for the ranking array.
7. **Handle stale completedColors via intersection.** If a spool was removed from a figure's requiredColors, any matching entry in completedColors is simply ignored — never scrubbed from the array.

### Previous Story Intelligence

Story 2.4 (catalog-to-queue live binding) established critical foundations:

- `computeAffectedQueueItems()` exists in `derived.ts` and is production-used in FigureForm's affected-items warning
- The normalized data model is locked in: QueueItem references Figure by ID, colors are derived at render time, no denormalization
- `deleteFigure()` already cascades to remove queue items — the store already handles figure-queue relationships
- FigureForm already displays affected queue item count when editing a queued figure

Git history shows the project follows these conventions:
- Commits use `feat:`, `fix:`, `merge:` prefixes
- Code review is done in passes (pass 1, pass 2)
- Store tests verify state transitions via `store.getState()` assertions

### Project Structure Notes

- All files align with the architecture spec's directory structure
- New derived functions go in the existing `app/lib/derived.ts` — do not create a separate file
- New store mutations go inside the existing `createStore` callback in `app/lib/store.ts`
- FigureCard component at `app/components/FigureCard.tsx` is the integration point for the "Add to Queue" button

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — State Management Patterns, Derived State, Mutation Naming]
- [Source: _bmad-output/planning-artifacts/prd.md — FR14, FR15, FR16, FR24-FR27]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Queue addition UX, type selection pattern]
- [Source: _bmad-output/project-context.md — TypeScript patterns, React patterns, file organization]
- [Source: app/lib/store.ts — Existing store structure and mutation patterns]
- [Source: app/lib/types.ts — QueueItem interface already defined]
- [Source: app/lib/derived.ts — Existing derived functions to preserve]
- [Source: app/components/FigureCard.tsx — Integration point for "Add to Queue"]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Added 4 queue mutations to Zustand store: `addToQueue`, `removeFromQueue`, `toggleChip`, `requeueCompleted`
- Updated `PrintFlowState` interface with all 4 new mutation signatures
- Added 3 derived pure functions to `app/lib/derived.ts`: `computeColorRanking`, `computeFigureProgress`, `computeCompletionStatus`
- Exported `ColorRankingEntry` and `FigureProgress` interfaces from derived.ts
- Added "Add to Queue" DropdownMenu button with Stock/Order options to FigureCard, with transient "Added!" confirmation
- Button disabled when figure has zero requiredColors
- Uses `.toSorted()` per spec guardrail #6 (ES2023.Array added to tsconfig lib)
- 10 new store mutation tests, 12 new derived function tests — all 153 tests pass, zero regressions
- TypeScript compiles cleanly with `--noEmit`

### Review Findings

- [x] [Review][Patch] `.sort()` replaced with `.toSorted()` per guardrail #6 [app/lib/derived.ts:53] — fixed, added ES2023.Array to tsconfig lib
- [x] [Review][Defer] No validation in `fromJSON` deserialization [app/lib/store.ts:166] — deferred, pre-existing
- [x] [Review][Patch] setTimeout cleanup missing in FigureCard handleAddToQueue [app/components/FigureCard.tsx:34] — fixed, added useRef timer + cleanup useEffect
- [x] [Review][Patch] Missing Add to Queue UI tests [app/components/FigureCard.test.tsx] — fixed, added 3 tests for disabled state, stock/order dispatch
- [x] [Review][Patch] Import ordering in catalog.tsx violates spec convention [app/routes/catalog.tsx:4-6] — fixed, reordered to store → derived → types
- [x] [Review][Defer] deleteFigure creates spurious queueItems Map reference [app/lib/store.ts:88] — deferred, pre-existing
- [x] [Review][Defer] FigureForm saved guard / double-submit risk [app/components/FigureForm.tsx] — deferred, pre-existing
- [x] [Review][Defer] catalog.tsx stale editingFigure during sheet close animation [app/routes/catalog.tsx] — deferred, pre-existing
- [x] [Review][Defer] getPerceivedLightness NaN for malformed hex strings [app/lib/color-utils.ts] — deferred, pre-existing
- [x] [Review][Defer] FigureForm selectedColors initialized by reference [app/components/FigureForm.tsx] — deferred, pre-existing
- [x] [Review][Patch] Redundant `.filter(([, count]) => count > 0)` dead code [app/lib/derived.ts:52] — fixed, counts are always >= 1
- [x] [Review][Patch] Missing test for computeColorRanking with orphaned spool references [app/lib/derived.test.ts] — fixed, added edge case test

### File List

- `app/lib/store.ts` — modified (added 4 queue mutations, updated PrintFlowState interface)
- `app/lib/derived.ts` — modified (added 3 derived functions, 2 exported interfaces)
- `app/components/FigureCard.tsx` — modified (added Add to Queue DropdownMenu button)
- `app/lib/store.test.ts` — modified (added 10 queue mutation tests)
- `app/lib/derived.test.ts` — modified (added 12 derived function tests)
- `app/components/ui/dropdown-menu.tsx` — created (shadcn DropdownMenu component)
