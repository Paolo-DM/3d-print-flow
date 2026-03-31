# Story 3.2: Color View — Ranked Color List & Expandable Figure Lists

Status: done

## Story

As a user,
I want to see a ranked list of filament colors showing which spool has the most queued figures waiting,
so that I can instantly decide which spool to load next.

## Acceptance Criteria

1. **Given** queue items exist with incomplete color chips
   **When** the user views the Color View (home/default route)
   **Then** a ranked list of filament colors is displayed, sorted descending by the count of queued figures with incomplete chips for each color

2. **Given** the Color View
   **When** rendered
   **Then** each ColorRankingEntry shows: rank position (tabular-nums), 32px color swatch (spool hex), spool name, figure count label, figure count number (text-2xl bold right-aligned), and an order badge if any order-flagged items need that color

3. **Given** order-flagged queue items exist alongside stock items
   **When** the ranking is displayed
   **Then** within each color entry, order-flagged figures appear above stock figures in the expandable list

4. **Given** a color entry in the ranking
   **When** the user clicks/taps to expand it
   **Then** a Collapsible section reveals all queued figures with an incomplete chip for that color, showing each figure's name, franchise, all color chips (with the current color's chip highlighted via pulsing outline), and progress bar

5. **Given** the expanded figure list for a color
   **When** a figure has already completed that color
   **Then** it does NOT appear in the list (filtered to actionable items only)

6. **Given** the queue is empty
   **When** the user views the Color View
   **Then** an empty state is displayed with contextual CTA guiding them to add figures to the queue (aware of whether spools/figures exist)

7. **Given** dark mode is active
   **When** color swatches are rendered
   **Then** swatches display with a subtle glow effect

## Tasks / Subtasks

- [x] Task 1: Install required shadcn components (AC: #2, #3, #4)
  - [x] 1.1 Install `collapsible` component from shadcn registry
  - [x] 1.2 Install `badge` component from shadcn registry
  - [x] 1.3 Install `tabs` component from shadcn registry
  - [x] 1.4 Install `progress` component from shadcn registry
- [x] Task 2: Create `StatCard` component (AC: #1)
  - [x] 2.1 Implement `StatCard` with value/label/optional color variant
  - [x] 2.2 Use tabular-nums for numeric values
- [x] Task 3: Build the queue layout `_queue.tsx` (AC: #1, #2)
  - [x] 3.1 Add StatCard row: Queued figures, Colors needed, Orders pending (warm), Completed (primary)
  - [x] 3.2 Add Tabs toggle (Color View / Figure View) using React Router navigation
  - [x] 3.3 Keep `<Outlet />` below the tabs
- [x] Task 4: Create `ColorChip` display component (AC: #4)
  - [x] 4.1 Implement visual-only ColorChip showing pending/completed state via saturation-as-state
  - [x] 4.2 Accept optional `isCurrent` prop for pulsing outline highlight
  - [x] 4.3 Minimum 44px height, pill shape (rounded-full)
  - [x] 4.4 Apply conditional visibility borders for near-white/near-black spool colors
- [x] Task 5: Create `ColorRankingEntry` component (AC: #2, #3, #4, #5, #7)
  - [x] 5.1 Implement rank position, 32px swatch, spool name, count, order badge layout
  - [x] 5.2 Wrap expansion in shadcn Collapsible — reveal figure list on click
  - [x] 5.3 Render expanded figures with name, franchise, ColorChip row (current color highlighted), and Progress bar
  - [x] 5.4 Sort figures: orders above stock within the expanded list
  - [x] 5.5 Filter: only show figures with an INCOMPLETE chip for this color
  - [x] 5.6 Apply dark mode glow effect to color swatches
- [x] Task 6: Implement Color View route `_queue.home.tsx` (AC: #1, #6)
  - [x] 6.1 Select store state (spools, figures, queueItems) and compute ranking via `computeColorRanking()`
  - [x] 6.2 Render ranked list of `ColorRankingEntry` components
  - [x] 6.3 Implement context-aware empty state using shadcn Empty component
- [x] Task 7: Write tests (AC: all)
  - [x] 7.1 StatCard: renders value and label correctly
  - [x] 7.2 ColorRankingEntry: renders swatch, name, count; expands on click; shows figure list
  - [x] 7.3 ColorRankingEntry: orders appear above stock in expanded list
  - [x] 7.4 ColorRankingEntry: excludes figures that completed this color
  - [x] 7.5 ColorChip: renders pending and completed visual states correctly
  - [x] 7.6 _queue.tsx layout: renders stat cards and tabs with active state
  - [x] 7.7 _queue.home.tsx: renders ranked list, shows empty state when no queue items

### Review Findings

- [x] [Review][Patch] Dark mode glow applied unconditionally — AC#7 violation [app/components/ColorRankingEntry.tsx:68] — FIXED: moved boxShadow to dark-only via CSS custom property + `dark:` variant
- [x] [Review][Defer] `deleteFigure` always creates new `queueItems` Map even when no items reference the deleted figure [app/lib/store.ts] — deferred, pre-existing
- [x] [Review][Defer] `getPerceivedLightness` produces NaN for non-standard hex strings [app/lib/color-utils.ts] — deferred, pre-existing

## Dev Notes

### Story Intent

This story builds the **Color View** — the home/default route and the app's primary value proposition. It renders the color frequency ranking (already computed by `computeColorRanking()` from story 3.1) as an interactive expandable list, and upgrades the queue layout with stat cards and a view toggle.

The ColorChip component created here is a **visual display component** — it shows pending/completed state through saturation-as-state styling but does NOT implement the toggle onClick handler. Story 3.3 adds the toggle interaction, animation, and `role="switch"` accessibility.

### Architecture Requirements

**Queue layout route `_queue.tsx` must become the shared layout for Color View and Figure View:**

```
┌────────────────────────────────────────┐
│  StatCard row (4 cards in a row)       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Queued│ │Colors│ │Orders│ │ Done │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
├────────────────────────────────────────┤
│  Tabs [Color View] [Figure View]       │
├────────────────────────────────────────┤
│  <Outlet /> (child route content)      │
└────────────────────────────────────────┘
```

**View toggle is URL-based**, not client state:
- `"/"` → Color View tab active
- `"/figures"` → Figure View tab active
- Use `useLocation()` to determine active tab, `useNavigate()` to switch

**Stat card computations** (all derived during render, never stored):
- **Queued figures:** `queueItems.size` minus completed count
- **Colors needed:** `ranking.length` (number of distinct colors with incomplete chips)
- **Orders pending:** count of order-type queue items with at least one incomplete chip
- **Completed:** count of queue items where `computeCompletionStatus()` returns true

### Component Specifications

**StatCard (`app/components/StatCard.tsx`):**

```tsx
interface StatCardProps {
  label: string
  value: number
  className?: string // for color variants (warm for orders, primary for completed)
}
```

- shadcn `Card` with `CardContent`
- Value: `text-2xl font-bold tabular-nums`
- Label: `text-sm text-muted-foreground`
- Compact: `p-4` padding
- Responsive: 4 across on desktop (`grid-cols-4`), 2x2 on mobile (`grid-cols-2`)

**ColorChip (`app/components/ColorChip.tsx`) — VISUAL ONLY for this story:**

```tsx
interface ColorChipProps {
  spool: Spool
  isCompleted: boolean
  isCurrent?: boolean // pulsing outline for the color being worked on
  onClick?: () => void // optional — wired up in story 3.3
}
```

Anatomy:
- Container: pill shape (`rounded-full`), min 44px height, `px-3 py-1.5`, flex row with gap
- Color dot: 18px circle with spool hex as background color
- Spool name: `text-sm`

States (saturation-as-state encoding):
- **Pending:** `bg-muted` background, dot at 40% opacity, name in `text-muted-foreground`
- **Completed:** spool hex as background color, dot as `rgba(255,255,255,0.35)`, name in computed contrast color (use `hexToContrast()`)
- **Current (isCurrent + pending):** same as pending but with pulsing outline animation (`animate-pulse` on the border/ring)

Visibility rules (use `getPerceivedLightness()`):
- Light mode: dots with perceived lightness > 0.85 → `border border-border`
- Dark mode: dots with perceived lightness < 0.15 → `dark:border dark:border-border`

**ColorRankingEntry (`app/components/ColorRankingEntry.tsx`):**

```tsx
interface ColorRankingEntryProps {
  entry: ColorRankingEntry // from derived.ts
  rank: number
  figures: Map<string, Figure>
  queueItems: Map<string, QueueItem>
  spools: Map<string, Spool>
  currentSpoolId: string // the spool this entry represents (for isCurrent highlight)
}
```

Layout (collapsed state):
```
┌─────────────────────────────────────────────┐
│  1   ██  White PLA    figures   [Order]   8 │
│      32px                                   │
│      swatch                                 │
└─────────────────────────────────────────────┘
```

- Rank position: `text-sm text-muted-foreground tabular-nums` left column
- Color swatch: 32px rounded square (`rounded-md`), spool hex as background, dark mode glow effect via `shadow-[0_0_8px_<hex>40]`
- Spool name: `text-sm font-semibold`
- "figures" label: `text-xs text-muted-foreground` (hidden on very narrow screens)
- Order badge: shadcn `Badge` with warm styling, only shown if `entry.hasOrders`
- Figure count: `text-2xl font-bold tabular-nums` right-aligned
- Entire row is clickable to toggle Collapsible

Expanded state (inside `CollapsibleContent`):
- Show all queue items that have an INCOMPLETE chip for this spool's color
- Sort: order-type items first, then stock
- Each figure row shows:
  - Figure name + franchise tag
  - Row of ColorChip components (all the figure's required colors)
  - The chip for this entry's spool has `isCurrent={true}` (pulsing outline)
  - shadcn `Progress` bar with numeric fraction label (`3/6`)

**Filtering logic (AC #5):** For each entry, the expanded list must only include queue items where `!queueItem.completedColors.includes(entry.spool.id)`. This is already inherent in how `computeColorRanking` counts — but the figure list rendering must apply the same filter.

### Empty State Logic (AC #6)

The Color View empty state is context-aware. Check prerequisites in order:

1. **No spools exist** (`spools.size === 0`):
   - Icon: `Disc3` (spool icon from sidebar)
   - Title: "No filament spools yet"
   - Description: "Add your filament spools first, then create figures and queue them for printing."
   - CTA Button: "Add Your First Spool" → navigate to `/spools`

2. **Spools exist, no figures** (`figures.size === 0`):
   - Icon: `BookOpen` (catalog icon)
   - Title: "No figures in catalog"
   - Description: "Create figure designs and assign colors from your spool library."
   - CTA Button: "Create Your First Figure" → navigate to `/catalog`

3. **Figures exist, queue is empty** (`queueItems.size === 0`):
   - Icon: `ListPlus`
   - Title: "Print queue is empty"
   - Description: "Add figures from your catalog to start tracking production."
   - CTA Button: "Go to Catalog" → navigate to `/catalog`

4. **Queue items exist but all completed** (ranking is empty, queueItems.size > 0):
   - Icon: `CheckCircle`
   - Title: "All colors complete!"
   - Description: "Every queued figure has all colors printed. Add more figures or check the completed section."
   - No CTA button needed

Use shadcn `Empty`, `EmptyHeader`, `EmptyMedia` (variant="icon"), `EmptyTitle`, `EmptyDescription`, `EmptyContent` with `Button`.

### Existing Codebase Context

**Files to modify:**

- `app/routes/_queue.tsx` — Upgrade from bare `<Outlet />` to full layout with StatCard row + Tabs + Outlet
- `app/routes/_queue.home.tsx` — Replace stub with full Color View implementation
- `app/routes/_queue.test.tsx` — Update tests for new layout behavior

**Files to create:**

- `app/components/StatCard.tsx` — Summary stat card component
- `app/components/ColorChip.tsx` — Visual chip display component (toggle added in story 3.3)
- `app/components/ColorRankingEntry.tsx` — Ranked row with Collapsible figure list

**shadcn components to install (via `npx shadcn@latest add`):**

- `collapsible` → `app/components/ui/collapsible.tsx`
- `badge` → `app/components/ui/badge.tsx`
- `tabs` → `app/components/ui/tabs.tsx`
- `progress` → `app/components/ui/progress.tsx`

**Existing files used — do NOT modify:**

- `app/lib/derived.ts` — `computeColorRanking()`, `computeFigureProgress()`, `computeCompletionStatus()` already exist and work correctly
- `app/lib/types.ts` — `Spool`, `Figure`, `QueueItem` interfaces are stable
- `app/lib/store.ts` — Zustand store with all queue mutations
- `app/lib/color-utils.ts` — `getPerceivedLightness()`, `hexToContrast()` already exist
- `app/lib/utils.ts` — `cn()` utility
- `app/components/ui/empty.tsx` — Empty state components already installed
- `app/components/ui/card.tsx` — Card components already installed
- `app/components/ui/button.tsx` — Button with all variants already installed

**Existing patterns to follow:**

- `FigureCard.tsx` — reference for card layout, spool dot rendering, and import ordering
- `app/routes/catalog.tsx` — reference for route component pattern with store selectors
- `app/routes/spools.tsx` — reference for route component pattern

### Import Ordering (enforced by project convention)

```
1. React / React Router (react, react-router)
2. Third-party (lucide-react)
3. ~/lib/ (store, derived, types, color-utils, utils)
4. ~/hooks/ (use-mobile)
5. ~/components/ui/* (button, card, badge, collapsible, etc.)
6. ~/components/* (ColorChip, ColorRankingEntry, StatCard)
```

### Testing Requirements

- Framework: Vitest + React Testing Library
- Use `createRoutesStub` from `react-router` for route component tests (pattern from `_queue.test.tsx`)
- Use `store.setState()` to seed test state directly
- Use factory functions from `app/lib/test-utils.ts`: `createSpool()`, `createFigure()`, `createQueueItem()`
- Test files co-located next to source: `ColorRankingEntry.test.tsx`, `StatCard.test.tsx`, `ColorChip.test.tsx`
- Layout tests go in existing `app/routes/_queue.test.tsx`
- Color View tests go in a new `app/routes/_queue.home.test.tsx`
- Reuse existing `matchMedia` mock pattern from other test files if needed

### Implementation Guardrails

1. **ColorChip is DISPLAY-ONLY in this story.** Do not implement onClick toggle logic, animation, or `role="switch"`. The `onClick` prop is optional and not wired up. Story 3.3 adds the full interactive behavior.
2. **Do not use `useMemo`, `useCallback`, or `React.memo`.** React Compiler handles memoization.
3. **Do not use `useEffect` for state derivation.** Ranking, progress, and stats are computed during render as pure function calls.
4. **Derive all stats during render.** The stat card values are computed from store state each render — never stored in useState or Zustand.
5. **Use `.toSorted()` not `.sort()`** if any local sorting is needed (e.g., sorting figures by order/stock within the expanded list).
6. **View toggle is URL-based.** Tab state is the current route path, not React state. Use `useLocation()` to read and `useNavigate()` or `<NavLink>` to change.
7. **Handle stale/orphaned data gracefully.** If a queue item references a figureId that no longer exists in the figures Map, skip it — don't crash.
8. **No success toasts.** Visual state changes are the feedback.
9. **Use ternary operators, not `&&`, for conditional rendering** when the condition value could be 0 (e.g., count values).
10. **tabular-nums on all numeric displays.** Ranking positions, stat card values, progress fractions.

### Previous Story Intelligence

Story 3.1 established all the data layer foundations this story depends on:

- `computeColorRanking()` returns `ColorRankingEntry[]` sorted by count descending, excluding completed colors, with `hasOrders` flag — production-tested with 12 unit tests
- `computeFigureProgress()` returns `{ completed, total }` with intersection semantics for stale entries — handles orphaned queue items by returning `{ 0, 0 }`
- `computeCompletionStatus()` returns boolean — false for zero-color figures
- Store mutations (`toggleChip`, `addToQueue`, `removeFromQueue`, `requeueCompleted`) are all working and tested
- `FigureCard.tsx` shows the pattern for resolving spools from figure.requiredColors and rendering spool dots with visibility borders
- Import ordering convention is `store → derived → types` for `~/lib/` imports
- `ES2023.Array` was added to tsconfig lib for `.toSorted()` support

**Code review findings from 3.1 to learn from:**
- Timer cleanup requires `useRef` + cleanup `useEffect` (don't forget cleanup)
- Redundant filter conditions are dead code — `computeColorRanking` only produces entries with count >= 1
- Import ordering violations are caught in review — follow the convention from the start

### Git Intelligence

Recent commits show:
- `feat:` prefix for new feature implementations
- `fix:` prefix for code review fixes
- `merge:` prefix for branch merges
- Code review runs in passes (pass 1, pass 2, pass 3)
- TypeScript compiles cleanly checked with `--noEmit`

### Project Structure Notes

- All new components go in `app/components/` (PascalCase): `StatCard.tsx`, `ColorChip.tsx`, `ColorRankingEntry.tsx`
- shadcn components installed to `app/components/ui/` (lowercase)
- Route files in `app/routes/` use React Router v7 convention
- Route config in `app/routes.ts` — no changes needed (routes already configured)
- Test files co-located: `ComponentName.test.tsx` next to `ComponentName.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure, Component Boundaries, State Management Patterns, Data Flow]
- [Source: _bmad-output/planning-artifacts/prd.md — FR24-FR29 (Color-First Planning), FR38-FR41 (Empty States)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — ColorRankingEntry anatomy, ColorChip anatomy, StatCard anatomy, Color View interaction flow, Empty state patterns, Responsive strategy]
- [Source: _bmad-output/project-context.md — TypeScript patterns, React patterns, file organization, React Compiler rules]
- [Source: app/lib/derived.ts — computeColorRanking, computeFigureProgress, computeCompletionStatus]
- [Source: app/lib/types.ts — Spool, Figure, QueueItem interfaces]
- [Source: app/lib/color-utils.ts — getPerceivedLightness, hexToContrast]
- [Source: app/components/FigureCard.tsx — Spool dot rendering pattern, import ordering]
- [Source: app/routes/_queue.tsx — Current layout stub to upgrade]
- [Source: app/routes/_queue.test.tsx — Test pattern with createRoutesStub]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- Installed shadcn components: collapsible, badge, tabs, progress
- Created StatCard component with tabular-nums, Card wrapper, and optional className for color variants
- Upgraded _queue.tsx layout with 4 stat cards (queued figures, colors needed, orders pending, completed), URL-based Tabs toggle, and Outlet
- Created ColorChip display-only component with saturation-as-state encoding, isCurrent pulsing outline, visibility borders for near-white/near-black
- Created ColorRankingEntry with Collapsible expansion, order badge, 32px swatch with glow, figure list sorted orders-first, filtered to incomplete chips only, progress bars
- Implemented Color View route with ranked list rendering and 4-level context-aware empty state (no spools → no figures → empty queue → all complete)
- All stats derived during render — no useEffect, no useState for derived data
- 181 tests passing, 0 regressions, TypeScript compiles cleanly

### File List

- app/components/ui/collapsible.tsx (new — shadcn)
- app/components/ui/badge.tsx (new — shadcn)
- app/components/ui/tabs.tsx (new — shadcn)
- app/components/ui/progress.tsx (new — shadcn)
- app/components/StatCard.tsx (new)
- app/components/StatCard.test.tsx (new)
- app/components/ColorChip.tsx (new)
- app/components/ColorChip.test.tsx (new)
- app/components/ColorRankingEntry.tsx (new)
- app/components/ColorRankingEntry.test.tsx (new)
- app/routes/_queue.tsx (modified)
- app/routes/_queue.test.tsx (modified)
- app/routes/_queue.home.tsx (modified)
- app/routes/_queue.home.test.tsx (new)

### Change Log

- 2026-03-31: Implemented story 3.2 — Color View with ranked color list, expandable figure lists, stat cards, view toggle tabs, and context-aware empty states
