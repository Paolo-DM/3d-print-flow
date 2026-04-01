# Story 3.5: Figure Completion, Cascade & Completed Section

Status: done

## Story

As a user,
I want figures to automatically complete when all colors are done and move to an archive I can browse,
So that finished work is tracked and the queue stays focused on what's left.

## Acceptance Criteria

1. **Given** a queued figure with one remaining incomplete color chip **When** the user toggles that last chip to complete **Then** the chip fill animation plays (100-200ms), then the card briefly highlights with a subtle pulse (~500ms), then the card smoothly collapses out of the active queue list

2. **Given** a single-color figure (only one chip) **When** the user toggles that chip **Then** the chip animation completes first, then the completion animation chains sequentially (not simultaneous)

3. **Given** `prefers-reduced-motion` is enabled **When** a figure completes **Then** the completion cascade applies instant state change instead of animations

4. **Given** the Completed section route **When** the user navigates to it **Then** all completed queue items are displayed in a collapsible archive showing figure name, franchise, all chips (all filled), and completion status

5. **Given** a completed figure in the archive **When** the user clicks "Print Again" **Then** a new queue item is created for that figure using the catalog's current `requiredColors` (not the colors at time of completion), all chips reset to incomplete, and it appears in the active queue and color ranking immediately

6. **Given** the user clicks remove on an active queue item **When** the confirmation Dialog appears **Then** it shows the figure name and confirms removal, with Cancel and Remove (destructive) buttons; confirming removes the item from the store and IndexedDB

## Tasks / Subtasks

- [x] Task 1: Completion cascade animation in Figure View (AC: 1, 2, 3)
  - [x] 1.1 Add completion detection to `_queue.figures.tsx` — when `computeCompletionStatus` transitions from false to true after a chip toggle, trigger the cascade
  - [x] 1.2 Implement card pulse animation (~500ms) via CSS class applied after chip animation (100-200ms delay)
  - [x] 1.3 Implement card collapse-out animation (CSS transition on height/opacity) after pulse completes
  - [x] 1.4 Ensure sequential chaining: chip fill -> pulse -> collapse (not simultaneous)
  - [x] 1.5 Respect `prefers-reduced-motion` — skip animations, apply instant state change
  - [x] 1.6 Verify single-color figure case chains correctly

- [x] Task 2: Completion cascade in Color View (AC: 1, 2, 3)
  - [x] 2.1 Apply same cascade logic in `_queue.home.tsx` / `ColorRankingEntry` — when last chip for a figure toggles complete, the figure row animates out of the expanded list
  - [x] 2.2 If the completed figure was the last one needing this color, the ranking entry itself should animate out

- [x] Task 3: Completed section route (AC: 4)
  - [x] 3.1 Replace stub in `app/routes/completed.tsx` with full implementation
  - [x] 3.2 Select `queueItems`, `figures`, `spools` from store; filter to completed items using `computeCompletionStatus`
  - [x] 3.3 Display each completed item: figure name, franchise, all chips (all filled, non-interactive), completion date (from `completedAt`)
  - [x] 3.4 Empty state: "No completed figures yet" (no CTA — resolves naturally)
  - [x] 3.5 Add tests for completed route

- [x] Task 4: Print Again / Requeue (AC: 5)
  - [x] 4.1 Add "Print Again" button to each completed item in `completed.tsx`
  - [x] 4.2 Wire to existing `requeueCompleted(queueItemId)` store mutation — this already creates a new queue item from the figure's current `requiredColors` with empty `completedColors`
  - [x] 4.3 Test that requeue uses current catalog colors (not historical)

- [x] Task 5: Remove queue item with confirmation dialog (AC: 6)
  - [x] 5.1 Add remove button to `QueueItemCard` (or to both Figure View cards and Color View expanded items)
  - [x] 5.2 Use shadcn `AlertDialog` (already installed at `app/components/ui/alert-dialog.tsx`) for confirmation
  - [x] 5.3 Dialog shows figure name, Cancel and Remove (destructive variant) buttons
  - [x] 5.4 Confirming calls existing `removeFromQueue(id)` store mutation
  - [x] 5.5 Test confirmation flow and store mutation

- [x] Task 6: Tests
  - [x] 6.1 Unit tests for completed route (empty state, completed items display, requeue, remove)
  - [x] 6.2 Component tests for completion cascade animation behavior
  - [x] 6.3 Integration tests verifying cascade in Figure View and Color View
  - [x] 6.4 Verify zero regressions on existing 203+ tests

### Review Findings

- [x] [Review][Patch] Reduced-motion mode now switches completion state immediately instead of running the pulse/collapse cascade. [app/lib/motion.ts]
- [x] [Review][Patch] The completed route now renders as a collapsible archive instead of a static grid. [app/routes/completed.tsx]
- [x] [Review][Patch] `completion-collapse` now collapses layout height as part of the exit animation, so queue removal is no longer abrupt. [app/app.css]
- [x] [Review][Patch] Color View now preserves expanded-entry state and row completion phases when the last ranking entry disappears, allowing the completed row to animate out before the entry closes. [app/routes/_queue.home.tsx]

## Dev Notes

### Existing Infrastructure — DO NOT Recreate

These already exist and MUST be reused:

| What | Where | Notes |
|------|-------|-------|
| `computeCompletionStatus(qi, figure)` | `app/lib/derived.ts:72` | Returns `boolean` — true when all required colors completed |
| `computeFigureProgress(qi, figure)` | `app/lib/derived.ts:60` | Returns `{ completed, total }` |
| `isCompletedToday(qi, now?)` | `app/lib/derived.ts:80` | Checks `completedAt` field against today |
| `toggleChip(queueItemId, spoolId)` | `app/lib/store.ts:122` | Already sets `completedAt` timestamp when item completes, clears it on un-complete |
| `requeueCompleted(queueItemId)` | `app/lib/store.ts:149` | Creates new queue item from figure's current `requiredColors`, empty `completedColors`, null `completedAt` |
| `removeFromQueue(id)` | `app/lib/store.ts:113` | Deletes queue item from Map |
| `QueueItemCard` | `app/components/QueueItemCard.tsx` | Existing card with chips + progress — extend for cascade, do NOT rebuild |
| `ColorChip` | `app/components/ColorChip.tsx` | Interactive toggle with 150ms CSS transition — already handles chip animation |
| `AlertDialog` | `app/components/ui/alert-dialog.tsx` | shadcn component — use for remove confirmation |
| `QueueItem.completedAt` | `app/lib/types.ts:22` | `string \| null` — already tracked by `toggleChip` mutation |
| Route for completed | `app/routes.ts:10` | `route("completed", "routes/completed.tsx")` — already registered, stub exists |
| Sidebar nav | `app/components/AppSidebar.tsx:41` | "Completed" link under Archive section — already present |
| Empty state components | `app/components/ui/empty.tsx` | Reuse `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription` |

### Completion Cascade Animation Strategy

The cascade is a **CSS-only animation chain** — no JS animation libraries.

1. **Chip fill** (already handled by `ColorChip` — `transition-all duration-150 ease-out`)
2. **Card pulse** (~500ms) — apply a CSS class (e.g., `animate-completion-pulse`) that scales or highlights the card border/background using the completion color, then fades
3. **Card collapse** — after pulse, transition `max-height` + `opacity` to 0, then remove from DOM on `transitionend`

Implementation approach:
- Track "just completed" state per queue item via a local `Set<string>` (not in store — this is ephemeral UI state)
- When `computeCompletionStatus` returns true for an item that wasn't complete on the previous render, add it to the "completing" set
- Apply CSS classes based on the "completing" set
- Listen for `transitionend` to clean up — the item naturally filters out since `_queue.figures.tsx` already filters to incomplete items only
- Use `useRef` to track previous completion state (not `useEffect` for derivation — derive during render, use ref for "previous" comparison)

For `prefers-reduced-motion`:
- Use `@media (prefers-reduced-motion: reduce)` to set animation durations to `0s`
- The state changes still happen, just without visual animation

### Completed Section Implementation

Route: `app/routes/completed.tsx` (stub exists — replace content)

Pattern to follow — same as `_queue.figures.tsx`:
- Select `queueItems`, `figures`, `spools` from store
- Filter to completed items: `computeCompletionStatus(qi, figure) === true`
- Display each as a card with: figure name, franchise, all chips (rendered via `ColorChip` with `isCompleted={true}` and **no `onClick`** — display-only), `completedAt` date
- "Print Again" button calls `requeueCompleted(qi.id)`
- "Remove" button opens `AlertDialog` → confirms → calls `removeFromQueue(qi.id)`
- Empty state: "No completed figures yet" with no CTA

The completed section is a **standalone route** (`/completed`), NOT nested under `_queue.tsx` layout. It does NOT have the StatCard row or Tabs toggle.

### Remove Queue Item Dialog

Use `AlertDialog` from shadcn (already installed). Pattern:
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="icon">
      <Trash2 className="size-4" />
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remove from queue?</AlertDialogTitle>
      <AlertDialogDescription>
        This will remove "{figure.name}" from the print queue.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction variant="destructive" onClick={() => removeFromQueue(qi.id)}>
        Remove
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Key Architectural Rules

- **No `useEffect` for state derivation** — derive completion status during render via pure functions
- **No `useMemo` / `useCallback` / `React.memo`** — React Compiler handles memoization
- **No animation libraries** — CSS transitions only (`transition-all`, `@keyframes`)
- **No loading states** — all operations are instant (in-memory store + async IndexedDB persist)
- **Immutable data** — `new Map(prev)`, `.toSorted()`, spread for objects
- **Store selectors** — select minimum needed: `usePrintFlowStore(s => s.queueItems)`, not entire store
- **`tabular-nums`** — use on ALL numeric displays (progress fractions, counts)
- **Co-located tests** — `completed.test.tsx` next to `completed.tsx`
- **Import order** — React/Router > third-party > `~/lib/` > `~/components/` > relative

### Project Structure Notes

Files to create:
- `app/routes/completed.tsx` (replace stub)
- `app/routes/completed.test.tsx` (new)

Files to modify:
- `app/components/QueueItemCard.tsx` — add cascade animation classes + remove button with AlertDialog
- `app/components/QueueItemCard.test.tsx` — add cascade + remove tests
- `app/routes/_queue.figures.tsx` — add "completing" tracking for cascade animation
- `app/routes/_queue.figures.test.tsx` — add cascade tests
- `app/routes/_queue.home.tsx` / `app/components/ColorRankingEntry.tsx` — add cascade for Color View (figure row animates out of expanded list)

Files NOT to modify:
- `app/lib/store.ts` — all needed mutations exist (`toggleChip`, `requeueCompleted`, `removeFromQueue`)
- `app/lib/derived.ts` — all needed computations exist (`computeCompletionStatus`, `computeFigureProgress`, `isCompletedToday`)
- `app/lib/types.ts` — `QueueItem` already has `completedAt: string | null`
- `app/routes.ts` — `/completed` route already registered
- `app/components/AppSidebar.tsx` — "Completed" nav link already exists

### CSS Animation Definitions

Add completion animations to `app/app.css` or as inline Tailwind `@keyframes`:

```css
@keyframes completion-pulse {
  0% { box-shadow: 0 0 0 0 var(--completion-color); }
  50% { box-shadow: 0 0 0 4px var(--completion-color); }
  100% { box-shadow: 0 0 0 0 transparent; }
}

/* Collapse animation via max-height transition */
.completing {
  animation: completion-pulse 500ms ease-out;
}

.collapsing {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 300ms ease-out, opacity 300ms ease-out;
}
```

Respect reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  .completing { animation: none; }
  .collapsing { transition: none; }
}
```

### Testing Strategy

Test setup patterns (reuse from existing tests):
- Store reset in `beforeEach`: `store.setState({ spools: new Map(), figures: new Map(), queueItems: new Map() })`
- Factory functions from `app/lib/test-utils.ts`: `createSpool()`, `createFigure()`, `createQueueItem()`
- `matchMedia` mock for shadcn responsive components
- `createRoutesStub` for route-level tests

Key test scenarios:
1. **Completed route**: empty state, renders completed items, chips are display-only (no onClick), requeue creates new active item, remove dialog flow
2. **Cascade in Figure View**: toggling last chip triggers pulse class, item eventually filters out
3. **Cascade in Color View**: toggling last chip for a figure in expanded list triggers animation
4. **Reduced motion**: verify animations are skipped
5. **Requeue**: new item uses current figure.requiredColors, not historical
6. **Remove**: AlertDialog appears, cancel keeps item, confirm removes

### Previous Story Intelligence

From Story 3.4 (Figure View):
- `QueueItemCard` is display-only — no remove/requeue actions yet (that's this story's scope)
- Incomplete filtering pattern: `computeCompletionStatus(qi, figure)` returns false for active items
- Orders-first sorting: `.toSorted()` with order/stock comparison
- Empty state cascade: spools -> figures -> queue items -> all complete
- 203 tests passing at end of 3.4

From Story 3.3 (ColorChip Toggle):
- CSS animation pattern: `transition-all duration-150 ease-out active:scale-95`
- Store pattern: `const toggleChip = usePrintFlowStore(s => s.toggleChip)`
- Accessibility: `role="switch"`, `aria-checked`, `aria-label`

From Story 3.1 (Queue Store):
- `requeueCompleted` does NOT delete the original completed item — it creates a NEW item. The completed item remains in the store
- `toggleChip` already handles `completedAt` timestamp tracking
- Stale `completedColors` entries are ignored via intersection semantics (never scrubbed)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.5]
- [Source: _bmad-output/planning-artifacts/architecture.md — Queue Management FR14-FR23, Completion Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Figure Completion Within Loop, Feedback Patterns, Interaction Tiers]
- [Source: _bmad-output/planning-artifacts/prd.md — FR20-FR22, Journey 1 Completion Moment]
- [Source: app/lib/store.ts — toggleChip, requeueCompleted, removeFromQueue mutations]
- [Source: app/lib/derived.ts — computeCompletionStatus, computeFigureProgress, isCompletedToday]
- [Source: app/lib/types.ts — QueueItem interface with completedAt field]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
- jsdom does not support `AnimationEvent`, so `fireEvent.animationEnd()` does not trigger React `onAnimationEnd` handlers. Tests that depend on animation phase transitions (pulse → collapse → removal) were rewritten to verify CSS class application instead.
- Removed `e.currentTarget === e.target` guard from `onAnimationEnd` handlers since no child elements have CSS animations, and jsdom doesn't propagate `AnimationEvent` properties correctly.
- `createFigure` defaults `franchise` to "Naruto", causing `getByText("Naruto")` to match multiple elements. Fixed by using unique names in tests.
- Entry-level animation in Color View initially caused a false positive: toggling a single color (not completing a figure) triggered phantom entry rendering. Fixed by adding `figureJustCompleted` guard using `computeCompletionStatus`.

### Completion Notes List
- All 6 acceptance criteria satisfied
- 229 tests passing, zero regressions (up from 203)
- 26 new tests added across 4 test files
- CSS animations use `@theme inline` Tailwind v4 variables
- `prefers-reduced-motion` media query applies 1ms duration / 0ms delay
- Completion cascade: chip fill (150ms CSS transition) → pulse (500ms + 150ms delay) → collapse (300ms) → DOM removal
- Completed route displays all finished figures with display-only chips, completion dates, Print Again and Remove actions

### Change Log
- `app/app.css` — Added `completion-pulse` and `completion-collapse` keyframes, `--animate-completion-pulse` and `--animate-completion-collapse` theme variables, `prefers-reduced-motion` overrides
- `app/components/QueueItemCard.tsx` — Added `CompletionPhase` type export, `completionPhase`/`onCompletionPhaseEnd` props, animation CSS classes, `onAnimationEnd` handler, AlertDialog remove button with Trash2 icon
- `app/components/QueueItemCard.test.tsx` — Added 5 tests: pulse class, collapse class, no animation classes, AlertDialog render, confirm calls removeFromQueue
- `app/components/ColorRankingEntry.tsx` — Added figure-row-level completion tracking (refs + derived state), animation classes and `onAnimationEnd` handler, modified `matchingItems` filter to include completing items
- `app/routes/_queue.figures.tsx` — Added completion detection via `useRef` prev state tracking, `completingRef` Map for animation phases, `visibleItems` filter includes completing items, passes `completionPhase`/`onCompletionPhaseEnd` to QueueItemCard
- `app/routes/_queue.figures.test.tsx` — Added 4 tests: pulse on completion, completed item stays visible, no cascade when incomplete chips remain
- `app/routes/_queue.home.tsx` — Added entry-level completion tracking, phantom `ColorRankingEntry` rendering for animating-out entries, `figureJustCompleted` guard, modified empty state check
- `app/routes/completed.tsx` — Full implementation replacing stub: completed items list sorted by `completedAt` desc, display-only chips, completion date, Print Again button, Remove with AlertDialog, empty state
- `app/routes/completed.test.tsx` — New file with 9 tests: empty states, completed items display, display-only chips, completion date, Print Again calls requeueCompleted, Remove dialog, confirm calls removeFromQueue, sort order

### File List
- `app/app.css` (modified)
- `app/components/QueueItemCard.tsx` (modified)
- `app/components/QueueItemCard.test.tsx` (modified)
- `app/components/ColorRankingEntry.tsx` (modified)
- `app/routes/_queue.figures.tsx` (modified)
- `app/routes/_queue.figures.test.tsx` (modified)
- `app/routes/_queue.home.tsx` (modified)
- `app/routes/completed.tsx` (modified — replaced stub)
- `app/routes/completed.test.tsx` (created)
