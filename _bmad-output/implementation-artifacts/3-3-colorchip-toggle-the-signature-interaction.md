# Story 3.3: ColorChip Toggle — The Signature Interaction

Status: done

## Story

As a user,
I want to tap a color chip to mark it as printed and see instant visual feedback,
so that I can track my printing progress with a satisfying, reliable interaction.

## Acceptance Criteria

1. **Given** a pending (incomplete) color chip on a queued figure
   **When** the user clicks/taps the chip
   **Then** the chip transitions from pending state (muted bg, dot at 40% opacity, muted text) to completed state (spool hex bg, white dot at 35% opacity, computed contrast text) with a 100-200ms ease-out animation including scale 0.95→1.0

2. **Given** a completed color chip
   **When** the user clicks/taps the chip
   **Then** the chip transitions back to pending state with the same animation (true toggle, no confirmation)

3. **Given** the chip toggle fires
   **When** one state mutation occurs
   **Then** the chip visual, the figure's progress bar, and the color ranking count all update in a single React render cycle within ~16ms

4. **Given** the ColorChip component
   **When** rendered
   **Then** it meets minimum 44px height, uses pill shape (rounded-full), and has `role="switch"` with `aria-checked` state

5. **Given** a chip in the expanded Color View for the current color
   **When** the chip is in pending state
   **Then** it displays a pulsing outline indicating "this is the color you're working on"

6. **Given** chip toggle in Color View or Figure View
   **When** the interaction occurs
   **Then** the behavior is identical — same animation, same cascade, same feedback (view-agnostic)

7. **Given** near-white spool color in light mode or near-black in dark mode
   **When** the chip dot is rendered
   **Then** a conditional visibility border is applied based on perceived lightness thresholds (>0.85 light mode, <0.15 dark mode)

## Tasks / Subtasks

- [x] Task 1: Add CSS transition and scale animation to ColorChip (AC: #1, #2)
  - [x] 1.1 Add `transition-all duration-150 ease-out` to the root element for smooth state changes (background-color, opacity, transform)
  - [x] 1.2 Add `active:scale-95` for the press-down feedback; the release snaps back to scale-100 via the transition
- [x] Task 2: Add accessibility attributes to ColorChip (AC: #4)
  - [x] 2.1 Change the root `<span>` to `<button>` element for native keyboard support (Enter/Space to activate)
  - [x] 2.2 Add `role="switch"` and `aria-checked={isCompleted}` to the root element
  - [x] 2.3 Add `aria-label` describing the action (e.g., "Mark White PLA as printed" / "Unmark White PLA")
  - [x] 2.4 Add `cursor-pointer` to indicate interactivity
- [x] Task 3: Wire toggle handler in ColorRankingEntry (AC: #3, #6)
  - [x] 3.1 Import `usePrintFlowStore` and select the `toggleChip` mutation
  - [x] 3.2 Pass `onClick={() => toggleChip(qi.id, spoolId)}` to each `ColorChip` in the expanded figure list
- [x] Task 4: Write/update tests (AC: all)
  - [x] 4.1 ColorChip: verify `role="switch"` and `aria-checked` values for both states
  - [x] 4.2 ColorChip: verify click handler is called when chip is clicked
  - [x] 4.3 ColorChip: verify `button` element is rendered (not `span`)
  - [x] 4.4 ColorRankingEntry: verify clicking a chip calls `toggleChip` with correct queueItemId and spoolId
  - [x] 4.5 ColorRankingEntry: verify progress bar updates after chip toggle (integration with store)

### Review Findings

- [x] [Review][Patch] Cover the AC3 UI cascade in tests after a chip toggle [app/routes/_queue.home.test.tsx:136]
- [x] [Review][Patch] Disable or de-interactivate `ColorChip` when `onClick` is omitted [app/components/ColorChip.tsx:19]
- [x] [Review][Patch] Reset the singleton store between `ColorRankingEntry` test cases [app/components/ColorRankingEntry.test.tsx:10]

## Dev Notes

### Story Intent

This story activates the **signature interaction** of the entire app — the color chip toggle. The ColorChip component already exists from story 3.2 with full visual state rendering (pending/completed via saturation-as-state, `isCurrent` pulsing outline, visibility borders). This story makes it **interactive**: clickable, animated, accessible, and wired to the Zustand store's `toggleChip` mutation.

The changes are surgical:
1. ColorChip becomes a `<button>` with `role="switch"`, `aria-checked`, CSS transitions, and scale animation
2. ColorRankingEntry passes the `onClick` handler that calls `store.toggleChip(queueItemId, spoolId)`

No new files are created. No new components. No new store mutations. Everything needed already exists — this story connects the pieces.

### Architecture Requirements

**Single-mutation cascade:** The chip toggle must produce a single state mutation (`toggleChip`) that triggers one React render cycle. The chip visual, progress bar, and color ranking count all derive from the same Zustand state — when `queueItem.completedColors` changes, React re-renders all consumers of that state slice automatically. No separate updates, no orchestration needed.

**View-agnostic interaction:** The `ColorChip` component is the same everywhere. Story 3.4 (Figure View) will render `ColorChip` with the same `onClick` handler pattern. The toggle behavior is intrinsic to ColorChip, not to the view that hosts it.

### Component Modifications

**ColorChip (`app/components/ColorChip.tsx`) — MODIFY:**

Current state: uses `<span>` root elements, has optional `onClick` prop, no accessibility attributes, no CSS transitions.

Required changes:

```tsx
// Change the root element from <span> to <button>
// Add these attributes to BOTH the completed and pending branches:
<button
  type="button"
  role="switch"
  aria-checked={isCompleted}
  aria-label={isCompleted ? `Unmark ${spool.name}` : `Mark ${spool.name} as printed`}
  className={cn(
    "inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full px-3 py-1.5",
    "transition-all duration-150 ease-out active:scale-95",
    // ... existing state-specific classes
  )}
  onClick={onClick}
>
```

Key implementation notes:
- The two branches (completed / pending) should BOTH use `<button>` as root
- Consider consolidating into a single return with conditional classes/styles to reduce duplication (DRY)
- `transition-all duration-150 ease-out` covers background-color, color, opacity, and transform in one declaration
- `active:scale-95` provides the "press" feel; releasing snaps back to scale-100 via the CSS transition — this achieves the 0.95→1.0 scale specification without JavaScript animation
- Do NOT add `useEffect`, `useState`, or any animation library — CSS transitions handle everything
- Remove default `<button>` styling that browsers add (use `border-0` or Tailwind's button reset if needed)

**ColorRankingEntry (`app/components/ColorRankingEntry.tsx`) — MODIFY:**

Current state: renders `ColorChip` without passing `onClick`. Has access to `qi.id` and `spoolId` in the render loop.

Required changes:

```tsx
// Add store import
import { usePrintFlowStore } from "~/lib/store"

// Inside the component, select toggleChip:
const toggleChip = usePrintFlowStore((s) => s.toggleChip)

// In the ColorChip render loop (line ~131), add onClick:
<ColorChip
  key={`${qi.id}-${spoolId}`}
  spool={spool}
  isCompleted={qi.completedColors.includes(spoolId)}
  isCurrent={spoolId === currentSpoolId}
  onClick={() => toggleChip(qi.id, spoolId)}
/>
```

**Files to modify:**
- `app/components/ColorChip.tsx` — add `<button>`, `role="switch"`, `aria-checked`, `aria-label`, CSS transitions, `active:scale-95`, `cursor-pointer`
- `app/components/ColorChip.test.tsx` — add tests for accessibility attributes, click handler
- `app/components/ColorRankingEntry.tsx` — wire `toggleChip` from store to ColorChip `onClick`
- `app/components/ColorRankingEntry.test.tsx` — add test for chip toggle integration

**Files to create:**
- None

**Existing files used — do NOT modify:**
- `app/lib/store.ts` — `toggleChip(queueItemId, spoolId)` already exists and is tested (12+ tests from story 3.1)
- `app/lib/derived.ts` — `computeColorRanking()`, `computeFigureProgress()`, `computeCompletionStatus()` already exist
- `app/lib/types.ts` — `Spool`, `Figure`, `QueueItem` interfaces are stable
- `app/lib/color-utils.ts` — `getPerceivedLightness()`, `hexToContrast()` already exist
- `app/lib/utils.ts` — `cn()` utility
- `app/routes/_queue.home.tsx` — Color View route (no changes needed — ranking re-derives automatically)
- `app/routes/_queue.tsx` — Queue layout (no changes needed — stat cards re-derive automatically)

### Existing Code Patterns to Follow

**Store selector pattern** (from `ColorRankingEntry.tsx` — currently only uses props, but other components show the pattern):
```tsx
// From app/routes/_queue.home.tsx:
const spools = usePrintFlowStore((s) => s.spools)
const figures = usePrintFlowStore((s) => s.figures)
const queueItems = usePrintFlowStore((s) => s.queueItems)
```

**Import ordering** (enforced by project convention):
```
1. React / React Router (react, react-router)
2. Third-party (lucide-react)
3. ~/lib/ (store, derived, types, color-utils, utils)
4. ~/hooks/ (use-mobile)
5. ~/components/ui/* (button, card, badge, collapsible, etc.)
6. ~/components/* (ColorChip, ColorRankingEntry, StatCard)
```

**Event handler naming** (from architecture): `handle` prefix — e.g., the prop is `onClick`, the store mutation is `toggleChip`.

### Testing Requirements

- Framework: Vitest + React Testing Library
- Test files co-located: `ColorChip.test.tsx` next to `ColorChip.tsx`, etc.
- Use `store.setState()` to seed test state directly
- Factory functions from `app/lib/test-utils.ts`: `createSpool()`, `createFigure()`, `createQueueItem()`
- Use `createRoutesStub` from `react-router` for route component tests

**ColorChip tests to add/update (`app/components/ColorChip.test.tsx`):**

- `renders role="switch" with aria-checked=false when pending` — verify button has `role="switch"` and `aria-checked="false"`
- `renders role="switch" with aria-checked=true when completed` — verify `aria-checked="true"`
- `calls onClick handler when clicked` — render with mock `onClick`, click the button, assert called once
- `renders as button element` — verify `screen.getByRole("switch")` returns a `<button>`

**ColorRankingEntry tests to add (`app/components/ColorRankingEntry.test.tsx`):**

- `toggles chip state when ColorChip is clicked` — seed store with a queue item, expand the entry, click a pending chip, assert `store.getState().queueItems.get(id).completedColors` includes the spoolId
- `un-toggles chip when completed ColorChip is clicked` — seed store with a completed chip, click it, assert spoolId removed from completedColors

### Implementation Guardrails

1. **Do NOT add animation libraries.** CSS transitions + `active:scale-95` are sufficient. No framer-motion, no spring animations, no JS-driven animation.
2. **Do NOT use `useMemo`, `useCallback`, or `React.memo`.** React Compiler handles memoization.
3. **Do NOT use `useEffect`.** The toggle is an event handler → store mutation → re-render. No effects needed.
4. **Do NOT add completion cascade logic.** Story 3.5 handles figure completion animation and the completed section. This story only toggles the chip state.
5. **Do NOT modify `store.ts` or `derived.ts`.** The `toggleChip` mutation and all derived computations already work correctly.
6. **Do NOT add success toasts.** Visual state changes (chip fill, progress bar, ranking count) ARE the feedback.
7. **Use ternary operators, not `&&`, for conditional rendering** when the condition could be 0.
8. **`tabular-nums` on all numeric displays** — already present, don't remove.
9. **Handle the `onClick` prop correctly.** When ColorChip is used purely for display (no toggle context), `onClick` remains optional. When used in ColorRankingEntry's expanded list, `onClick` is always provided.
10. **Reset default button styles.** The `<button>` element has default browser styling (borders, background, padding) that must be reset. Tailwind's preflight handles most of this, but verify there are no unexpected borders or backgrounds. The existing Tailwind classes (`rounded-full`, `px-3`, `py-1.5`, `bg-muted` or inline `backgroundColor`) should fully override defaults.

### Previous Story Intelligence

Story 3.2 established:
- ColorChip component with complete visual state rendering — pending/completed via saturation-as-state, isCurrent pulsing outline, visibility borders
- ColorRankingEntry with Collapsible expansion showing figure list with ColorChips and progress bars
- Color View route with ranked list and context-aware empty states
- StatCard row and URL-based Tabs toggle

**Code review findings from 3.2 to learn from:**
- Dark mode glow was applied unconditionally — fixed to dark-only via CSS custom property + `dark:` variant. Be careful with conditional styling that should only apply in specific themes.
- Import ordering violations are caught in review — follow the convention from the start.

Story 3.1 established:
- `toggleChip(queueItemId, spoolId)` store mutation — production-tested with 12+ unit tests
- `computeColorRanking()` returns `ColorRankingEntry[]` sorted by count, with `hasOrders` flag
- `computeFigureProgress()` returns `{ completed, total }` with intersection semantics
- ES2023.Array support for `.toSorted()`

### Git Intelligence

Recent commits:
- `feat:` prefix for new feature implementations
- `fix:` prefix for code review fixes
- `merge:` prefix for branch merges
- Code review runs in passes (pass 1, pass 2, pass 3)
- TypeScript compiles cleanly with `--noEmit`

### Project Structure Notes

- All component modifications in `app/components/` (PascalCase)
- Test files co-located: `ComponentName.test.tsx` next to `ComponentName.tsx`
- Route files in `app/routes/` — no route changes needed for this story
- Route config in `app/routes.ts` — no changes needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — State Management Patterns, Component Boundaries, Naming Patterns, Testing Strategy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — ColorChip anatomy, Chip toggle interaction, Animation timing, Accessibility requirements]
- [Source: _bmad-output/planning-artifacts/prd.md — FR17 (toggle chip), FR18 (un-toggle chip)]
- [Source: _bmad-output/project-context.md — React Compiler rules, React Patterns, TypeScript patterns]
- [Source: _bmad-output/implementation-artifacts/3-2-color-view-ranked-color-list-expandable-figure-lists.md — Previous story learnings, file list, code review findings]
- [Source: app/components/ColorChip.tsx — Current implementation to modify]
- [Source: app/components/ColorRankingEntry.tsx — Current implementation to modify]
- [Source: app/lib/store.ts — toggleChip mutation]
- [Source: app/lib/derived.ts — computeColorRanking, computeFigureProgress]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Tasks 1 & 2: Changed ColorChip root from `<span>` to `<button>` with `type="button"`, `role="switch"`, `aria-checked`, `aria-label` on both completed and pending branches. Added `transition-all duration-150 ease-out active:scale-95 cursor-pointer` for animation and interactivity. No JS animation libraries, no useEffect, no useState — pure CSS transitions.
- Task 3: Imported `usePrintFlowStore` in ColorRankingEntry, selected `toggleChip` mutation, passed `onClick={() => toggleChip(qi.id, spoolId)}` to each ColorChip in the expanded figure list. Single-mutation cascade — chip, progress bar, and ranking count all update from one store mutation.
- Task 4: Added 4 new ColorChip tests (role=switch with aria-checked for both states, click handler, button element verification) and 2 new ColorRankingEntry integration tests (toggle adds spoolId to completedColors, un-toggle removes it). All 187 tests pass, 0 regressions.

### File List

- app/components/ColorChip.tsx (modified)
- app/components/ColorChip.test.tsx (modified)
- app/components/ColorRankingEntry.tsx (modified)
- app/components/ColorRankingEntry.test.tsx (modified)

## Change Log

- Story 3.3 implemented: ColorChip toggle interaction with accessibility, CSS animations, store wiring, and tests (Date: 2026-03-31)
