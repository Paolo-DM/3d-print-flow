# Story 3.4: Figure View — Queue as Figure Cards

Status: review

## Story

As a user,
I want to see my print queue organized by figure with all color chips and progress visible,
So that I can check on individual figure status and toggle chips from a figure-centric perspective.

## Acceptance Criteria

1. **Given** queue items exist
   **When** the user switches to the Figure View via the Tabs toggle
   **Then** all queued figures are displayed as cards (QueueItemCard), each showing: figure name, franchise tag, order/stock badge, all color chips (using ColorChip component), and a progress bar with numeric fraction (e.g., 3/6)

2. **Given** the queue layout route `_queue.tsx`
   **When** rendered
   **Then** it displays a StatCard row (4 cards: Queued figures, Colors needed, Orders pending in warm color, Completed today in primary color) and a Tabs toggle (Color View / Figure View) above the `<Outlet />`

3. **Given** the Tabs toggle
   **When** the user switches between Color View and Figure View
   **Then** navigation occurs via React Router URL change (/ and /figures), the active tab reflects the current route, and the same queue data is displayed in a different layout

4. **Given** the Figure View on desktop
   **When** rendered
   **Then** figure cards display in a 2-3 column grid

5. **Given** the Figure View on mobile
   **When** the layout adapts
   **Then** figure cards stack in a single column

6. **Given** all numeric displays (stat cards, progress fractions, ranking counts)
   **When** rendered
   **Then** they use `font-variant-numeric: tabular-nums` for vertical alignment

## Tasks / Subtasks

- [x] Task 1: Create QueueItemCard component (AC: #1, #6)
  - [x] 1.1 Create `app/components/QueueItemCard.tsx` — card component displaying a single queue item as a figure card
  - [x] 1.2 Props: `queueItem: QueueItem`, `figure: Figure`, `spools: Map<string, Spool>` — NO callbacks in props; select `toggleChip` from store inside the component (same pattern as ColorRankingEntry)
  - [x] 1.3 Card layout: figure name (`text-sm font-medium`), franchise tag (`text-xs text-muted-foreground`) if present, order/stock Badge, color chips row, progress bar with fraction
  - [x] 1.4 Order badge: use `<Badge variant="outline" className="text-orange-600 dark:text-orange-400">Order</Badge>` (matching ColorRankingEntry pattern). Stock items: `<Badge variant="outline" className="text-muted-foreground">Stock</Badge>`
  - [x] 1.5 Color chips: map `figure.requiredColors` to `ColorChip` components with `onClick={() => toggleChip(queueItem.id, spoolId)}` — NO `isCurrent` prop (that's Color View only)
  - [x] 1.6 Progress bar: `computeFigureProgress(queueItem, figure)` → `<Progress value={percentage} />` with `<span className="text-xs text-muted-foreground tabular-nums">{completed}/{total}</span>`
  - [x] 1.7 Use shadcn `Card`, `CardContent` — keep the same visual pattern as the inline cards in ColorRankingEntry's expanded list (`space-y-2 rounded-md border p-3`)

- [x] Task 2: Implement Figure View route (AC: #1, #3, #4, #5)
  - [x] 2.1 Replace the stub in `app/routes/_queue.figures.tsx` with full implementation
  - [x] 2.2 Select `spools`, `figures`, `queueItems` from store (same pattern as `_queue.home.tsx`)
  - [x] 2.3 Filter queue items to only incomplete ones: exclude items where `computeCompletionStatus(qi, figure)` is true
  - [x] 2.4 Sort: orders first, then stock (same `.toSorted()` as ColorRankingEntry)
  - [x] 2.5 Empty state handling — same priority cascade as Color View: no spools → no figures → no queue items → all complete
  - [x] 2.6 Responsive grid: `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3`
  - [x] 2.7 Render `QueueItemCard` for each filtered queue item

- [x] Task 3: Verify existing layout and tabs work correctly (AC: #2, #3)
  - [x] 3.1 Verify `_queue.tsx` already renders StatCard row and Tabs toggle — NO modifications needed
  - [x] 3.2 Verify route config in `app/routes.ts` already maps `/figures` to `_queue.figures.tsx` — NO modifications needed
  - [x] 3.3 Verify tab switching navigates between `/` and `/figures` — already implemented

- [x] Task 4: Write tests (AC: all)
  - [x] 4.1 Create `app/components/QueueItemCard.test.tsx` — unit tests for the card component
  - [x] 4.2 Test: renders figure name and franchise
  - [x] 4.3 Test: renders Order badge for order-type items, Stock badge for stock-type items
  - [x] 4.4 Test: renders all color chips with correct completed state
  - [x] 4.5 Test: renders progress bar with correct fraction
  - [x] 4.6 Test: clicking a chip calls toggleChip with correct args (integration with store)
  - [x] 4.7 Create `app/routes/_queue.figures.test.tsx` — route-level tests
  - [x] 4.8 Test: empty state cascade (no spools → no figures → no queue → all complete)
  - [x] 4.9 Test: renders QueueItemCards when queue items exist
  - [x] 4.10 Test: orders appear before stock items

## Dev Notes

### Story Intent

This story implements the **Figure View** — the second perspective on the same print queue data. Where Color View (story 3.2) groups queue items by color for "which spool do I load next?", Figure View groups by figure for "how is Naruto progressing?".

The implementation is straightforward:
1. Create `QueueItemCard` — a card component that displays a single queue item with chips and progress
2. Replace the `_queue.figures.tsx` stub with a grid of QueueItemCards
3. No changes to the layout route (`_queue.tsx`) — StatCards and Tabs already work

The `_queue.tsx` layout, route config, and tab navigation are **already fully implemented** from story 3.2. This story only needs to fill in the Figure View content.

### Architecture Requirements

**Derived state during render:** Figure progress is computed via `computeFigureProgress(qi, figure)` during render. Never store derived values in state. Never use useEffect for computation.

**View-agnostic chip toggle:** The `ColorChip` `onClick` handler calls `store.toggleChip(queueItemId, spoolId)` — identical behavior to Color View. The single store mutation triggers one React render cycle that updates chip state, progress bar, and stat cards simultaneously.

**No `isCurrent` prop:** In Figure View, there is no "current color" concept. ColorChip's `isCurrent` prop should be omitted (defaults to `undefined`/`false`), so no pulsing outline appears.

### Component: QueueItemCard

**File:** `app/components/QueueItemCard.tsx` — NEW

**Props interface:**
```tsx
interface QueueItemCardProps {
  queueItem: QueueItem
  figure: Figure
  spools: Map<string, Spool>
}
```

**Internal store access:** Select `toggleChip` mutation from store inside the component:
```tsx
const toggleChip = usePrintFlowStore((s) => s.toggleChip)
```

**Layout structure** (follow the inline card pattern from `ColorRankingEntry.tsx:109-149`):
```
┌─────────────────────────────────────┐
│ Figure Name              [Order]    │  ← name + type badge
│ Franchise                           │  ← franchise tag (if exists)
│                                     │
│ [Chip] [Chip] [Chip] [Chip]         │  ← color chips row
│                                     │
│ ████████░░░░░░░░░░░░  3/6           │  ← progress bar + fraction
└─────────────────────────────────────┘
```

**Key implementation patterns from ColorRankingEntry (lines 109-149):**

```tsx
// Card container — mirrors existing inline card style
<div className="space-y-2 rounded-md border p-3">

  // Header row — figure name + badge
  <div className="flex items-baseline justify-between gap-2">
    <div>
      <p className="text-sm font-medium">{figure.name}</p>
      {figure.franchise ? (
        <p className="text-xs text-muted-foreground">{figure.franchise}</p>
      ) : null}
    </div>
    // Badge — order or stock
  </div>

  // Color chips row
  <div className="flex flex-wrap gap-1.5">
    {figure.requiredColors.map((spoolId) => { ... })}
  </div>

  // Progress bar
  <div className="flex items-center gap-2">
    <Progress value={percentage} className="flex-1" />
    <span className="text-xs text-muted-foreground tabular-nums">
      {progress.completed}/{progress.total}
    </span>
  </div>
</div>
```

### Route: Figure View

**File:** `app/routes/_queue.figures.tsx` — REPLACE STUB

**Pattern to follow:** Mirror `_queue.home.tsx` exactly for store access, empty states, and rendering flow.

**Store selectors:**
```tsx
const spools = usePrintFlowStore((s) => s.spools)
const figures = usePrintFlowStore((s) => s.figures)
const queueItems = usePrintFlowStore((s) => s.queueItems)
```

**Filtering logic — show only incomplete queue items:**
```tsx
const incompleteItems = Array.from(queueItems.values())
  .filter((qi) => {
    const figure = figures.get(qi.figureId)
    return figure ? !computeCompletionStatus(qi, figure) : false
  })
  .toSorted((a, b) => {
    if (a.type === "order" && b.type !== "order") return -1
    if (a.type !== "order" && b.type === "order") return 1
    return 0
  })
```

**Empty state cascade** (same order as Color View in `_queue.home.tsx:25-101`):
1. `spools.size === 0` → "No filament spools yet" + "Add Your First Spool" CTA → navigate to `/spools`
2. `figures.size === 0` → "No figures in catalog" + "Create Your First Figure" CTA → navigate to `/catalog`
3. `queueItems.size === 0` → "Print queue is empty" + "Go to Catalog" CTA → navigate to `/catalog`
4. `incompleteItems.length === 0` (all complete) → "All figures complete!" message

**Grid layout:**
```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {incompleteItems.map((qi) => {
    const figure = figures.get(qi.figureId)
    if (!figure) return null
    return (
      <QueueItemCard
        key={qi.id}
        queueItem={qi}
        figure={figure}
        spools={spools}
      />
    )
  })}
</div>
```

**Icons for empty states** (same as Color View):
- No spools: `Disc3` from lucide-react
- No figures: `BookOpen` from lucide-react
- No queue: `ListPlus` from lucide-react
- All complete: `CheckCircle` from lucide-react

### Existing Files — DO NOT Modify

- `app/routes/_queue.tsx` — Layout with StatCard row and Tabs already works. AC #2 is already satisfied.
- `app/routes.ts` — Route config already maps `/figures` to `_queue.figures.tsx`.
- `app/lib/store.ts` — `toggleChip` mutation is production-tested.
- `app/lib/derived.ts` — `computeFigureProgress()`, `computeCompletionStatus()` exist and are tested.
- `app/lib/types.ts` — Entity interfaces are stable.
- `app/lib/color-utils.ts` — `getPerceivedLightness()`, `hexToContrast()` used by ColorChip.
- `app/components/ColorChip.tsx` — Fully implemented with toggle, accessibility, animation.

### Files to Create

| File | Purpose |
|------|---------|
| `app/components/QueueItemCard.tsx` | Figure card component for queue items |
| `app/components/QueueItemCard.test.tsx` | Unit tests for QueueItemCard |
| `app/routes/_queue.figures.test.tsx` | Route-level tests for Figure View |

### Files to Modify

| File | Change |
|------|--------|
| `app/routes/_queue.figures.tsx` | Replace stub with full implementation |

### Testing Requirements

**Framework:** Vitest + React Testing Library + fake-indexeddb

**Test file setup pattern** (from `_queue.home.test.tsx` and `ColorRankingEntry.test.tsx`):
```tsx
// @vitest-environment jsdom
import "fake-indexeddb/auto"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createRoutesStub } from "react-router"
import { store } from "~/lib/store"
import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"
```

**Store reset between tests:**
```tsx
beforeEach(() => {
  store.setState({
    spools: new Map(),
    figures: new Map(),
    queueItems: new Map(),
  })
})
```

**matchMedia mock** (required for shadcn components):
```tsx
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
})
```

**Route test render pattern** (for `_queue.figures.test.tsx`):
```tsx
function renderFigureView() {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: QueueLayout,
      children: [
        { path: "figures", Component: FigureView },
      ],
    },
  ])
  return render(<Stub initialEntries={["/figures"]} />)
}
```

**Component test render** (for `QueueItemCard.test.tsx` — no route stub needed, render directly):
```tsx
render(<QueueItemCard queueItem={qi} figure={figure} spools={spools} />)
```

### Existing Code Patterns to Follow

**Import ordering** (from project convention):
```
1. React / React Router (react, react-router)
2. Third-party (lucide-react)
3. ~/lib/ (store, derived, types, color-utils, utils)
4. ~/hooks/
5. ~/components/ui/* (badge, card, progress)
6. ~/components/* (ColorChip, QueueItemCard)
```

**Event handler naming:** `handle` prefix for component handlers, store mutations keep their verb+noun names (`toggleChip`).

**Conditional rendering:** Use ternary operators, not `&&`, when the condition could be 0 (e.g., `count > 0 ? <X /> : null`). For boolean/object checks, `&&` is acceptable (e.g., `figure.franchise ? <tag /> : null`).

**No manual memoization:** No `useMemo`, `useCallback`, `React.memo` — React Compiler handles it.

### Previous Story Intelligence

**Story 3.3 (ColorChip Toggle) established:**
- ColorChip is fully interactive with `role="switch"`, `aria-checked`, `aria-label`, CSS transitions (`transition-all duration-150 ease-out active:scale-95`)
- `toggleChip` wiring pattern: `onClick={() => toggleChip(qi.id, spoolId)}` — same pattern to reuse in QueueItemCard
- No `isCurrent` needed in Figure View context

**Story 3.2 (Color View) established:**
- Empty state cascade pattern in route component
- `ColorRankingEntry` inline card layout (lines 109-149) — exact template for QueueItemCard
- Store selector pattern: select individual maps, not the whole store
- Progress bar with fraction: `<Progress value={percentage} />` + `tabular-nums` fraction label
- Dark mode glow on swatches: `dark:[box-shadow:var(--swatch-glow)]` — not needed on QueueItemCard (chips handle their own styling)

**Story 3.1 (Queue Store) established:**
- `toggleChip(queueItemId, spoolId)` — toggles spoolId in/out of `queueItem.completedColors`
- `computeCompletionStatus(qi, figure)` — returns true when all requiredColors are in completedColors
- `computeFigureProgress(qi, figure)` — returns `{ completed, total }` using intersection of requiredColors and completedColors
- `.toSorted()` for immutable sorting (ES2023)

**Code review lessons from previous stories:**
- Import ordering violations are caught — follow convention from the start
- Dark mode conditional styling: use CSS custom properties + `dark:` variant, not JS branching
- Reset singleton store between test cases (`beforeEach` with `store.setState`)
- Use `createRoutesStub` for route component tests

### Implementation Guardrails

1. **Do NOT modify `_queue.tsx`.** The layout, stat cards, and tabs already work. AC #2 is already satisfied from story 3.2.
2. **Do NOT modify `store.ts` or `derived.ts`.** All needed mutations and computations exist.
3. **Do NOT use `useEffect`.** All state is derived during render.
4. **Do NOT use `useMemo`, `useCallback`, `React.memo`.** React Compiler handles memoization.
5. **Do NOT add success toasts.** Visual state change IS the feedback.
6. **Do NOT add completion cascade logic.** Story 3.5 handles figure completion animations. QueueItemCard just shows current state.
7. **Do NOT add remove/requeue actions.** Story 3.5 handles the completed section with requeue. This story is display + chip toggle only.
8. **Use `.toSorted()` not `.sort()`.** Immutable array sorting per architecture rules.
9. **Use ternary, not `&&`, for conditional rendering** when the condition could be falsy-but-not-false (e.g., `0`).
10. **`tabular-nums` on all numeric displays** — progress fractions, stat card values.
11. **No loading states.** All data is local (Zustand + IndexedDB). Renders are instant.
12. **Filter to incomplete items only.** Figure View shows the active queue, not completed items (Story 3.5 handles the completed section).

### Project Structure Notes

- Component file: `app/components/QueueItemCard.tsx` (PascalCase, matching component name)
- Test files co-located: `QueueItemCard.test.tsx` next to `QueueItemCard.tsx`
- Route file: `app/routes/_queue.figures.tsx` (lowercase, dot-separated nesting per React Router v7 convention)
- Route test: `app/routes/_queue.figures.test.tsx` next to route file

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Component Patterns, Route Structure, Derived State Rules, Testing Standards, Anti-Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Figure View card layout, responsive grid, chip toggle, progress indicators, empty states]
- [Source: _bmad-output/planning-artifacts/prd.md — FR19 (progress indicator), FR28 (view toggle), FR29 (figure view)]
- [Source: _bmad-output/project-context.md — React Compiler rules, useEffect minimization, Tailwind/shadcn patterns]
- [Source: _bmad-output/implementation-artifacts/3-3-colorchip-toggle-the-signature-interaction.md — Previous story learnings, ColorChip toggle wiring pattern]
- [Source: app/routes/_queue.tsx — Existing layout with StatCards and Tabs (no changes needed)]
- [Source: app/routes/_queue.home.tsx — Color View pattern to mirror for empty states and store access]
- [Source: app/components/ColorRankingEntry.tsx:109-149 — Inline card template for QueueItemCard layout]
- [Source: app/components/ColorChip.tsx — Chip component to reuse]
- [Source: app/lib/derived.ts — computeFigureProgress, computeCompletionStatus]
- [Source: app/lib/types.ts — QueueItem, Figure, Spool interfaces]
- [Source: app/routes/_queue.home.test.tsx — Test pattern to follow for route tests]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Created `QueueItemCard` component mirroring the inline card pattern from `ColorRankingEntry.tsx:109-149` with figure name, franchise tag, order/stock badge, interactive color chips, and progress bar with tabular-nums fraction
- Replaced `_queue.figures.tsx` stub with full Figure View implementation: store selectors, incomplete-only filtering via `computeCompletionStatus`, orders-first sorting via `.toSorted()`, 4-tier empty state cascade matching Color View, responsive 1/2/3 column grid
- Verified existing `_queue.tsx` layout (StatCards + Tabs) and route config require no changes
- 7 unit tests for QueueItemCard (name/franchise rendering, order/stock badges, chip completed states, progress fraction, tabular-nums, chip toggle integration with store)
- 6 route-level tests for Figure View (4 empty state cascade tests, card rendering, order-before-stock sorting)
- Full test suite: 203 tests pass, zero regressions
- No useEffect, no useMemo/useCallback/React.memo, no isCurrent prop, no modifications to store/derived/layout files

### Change Log

- 2026-03-31: Story 3.4 implemented — QueueItemCard component, Figure View route, 13 tests

### File List

- `app/components/QueueItemCard.tsx` (new)
- `app/components/QueueItemCard.test.tsx` (new)
- `app/routes/_queue.figures.tsx` (modified — replaced stub)
- `app/routes/_queue.figures.test.tsx` (new)
