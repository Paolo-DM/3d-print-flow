# Story 2.1: Figure Catalog View & Empty State

Status: done

## Story

As a user opening the Figure Catalog,
I want to see my figure collection or be guided to create my first figure,
so that I can start building my catalog of printable designs.

## Acceptance Criteria

1. **Given** no figures exist in the store, **When** the user navigates to the Figure Catalog, **Then** an empty state is displayed using shadcn Empty component with icon, title, description contextually aware of spool state ("Great, you have X spools! Create Your First Figure" if spools exist), and a primary "Add Figure" action button.

2. **Given** figures exist in the store, **When** the user navigates to the Figure Catalog, **Then** all figures are displayed in a catalog list, each showing the figure name, franchise tag, size, and color chip previews (small swatches of assigned spool colors with spool names).

3. **Given** a figure with zero assigned colors, **When** it is displayed in the catalog, **Then** the color section shows a muted indicator like "No colors assigned" instead of an empty area.

4. **Given** the catalog view on desktop, **When** rendered, **Then** figures are displayed in a card grid with comfortable spacing.

5. **Given** the catalog view on mobile (<768px), **When** the layout adapts, **Then** figure cards stack in a single column.

## Tasks / Subtasks

- [x] Task 1: Create FigureCard component (AC: 2, 3, 4, 5)
  - [x] 1.1 Create `app/components/FigureCard.tsx` with props: `figure: Figure`, spools lookup (either `spools: Map<string, Spool>` or resolved spool data)
  - [x] 1.2 Render figure name (`text-lg font-semibold`), franchise tag (`text-sm text-muted-foreground`), and size (as `{size}%` text)
  - [x] 1.3 Render color chip previews for each spool ID in `figure.requiredColors` — small swatch circle (16-18px) with `backgroundColor: spool.hex` + spool name label (`text-sm`)
  - [x] 1.4 Apply visibility border on near-white/near-black swatches using `getPerceivedLightness(hex)` — same pattern as SpoolCard
  - [x] 1.5 When `requiredColors` is empty, render `"No colors assigned"` in `text-sm text-muted-foreground`
  - [x] 1.6 Use shadcn Card (CardHeader + CardContent) — follow SpoolCard structure
  - [x] 1.7 Add `data-testid="figure-card"` for testing

- [x] Task 2: Build catalog route (AC: 1, 2, 3, 4, 5)
  - [x] 2.1 Replace stub in `app/routes/catalog.tsx` with full implementation
  - [x] 2.2 Select figures and spools from store: `usePrintFlowStore(s => s.figures)`, `usePrintFlowStore(s => s.spools)`
  - [x] 2.3 Convert figures Map to array: `Array.from(figures.values())`
  - [x] 2.4 Conditionally render: if no figures → empty state; if figures exist → card grid
  - [x] 2.5 Empty state: use shadcn `Empty` with `EmptyMedia` (variant="icon", use `BookOpen` or `Shapes` icon from lucide-react), `EmptyTitle`, `EmptyDescription` (context-aware: include spool count if spools exist), `EmptyContent` with primary `Button` ("Add Figure")
  - [x] 2.6 Card grid: `div` with `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6` — same responsive pattern as spools.tsx
  - [x] 2.7 Page header: "Figure Catalog" heading (`text-2xl font-semibold`) with an "Add Figure" Button (disabled placeholder for Story 2.2)
  - [x] 2.8 Wrap content in `div` with `p-6 md:p-4` for responsive padding — match spools.tsx layout
  - [x] 2.9 Empty state CTA "Add Figure" button is a disabled placeholder (Story 2.2 implements the form)

- [x] Task 3: Write tests (AC: 1-5)
  - [x] 3.1 Create `app/components/FigureCard.test.tsx`
    - FigureCard renders figure name, franchise, and size
    - FigureCard renders color swatches for assigned spools
    - FigureCard renders "No colors assigned" when requiredColors is empty
    - FigureCard applies border for near-white spool swatches (lightness > 0.85)
  - [x] 3.2 Create `app/routes/catalog.test.tsx`
    - Empty state renders when store has no figures — verify empty state title, "Add Figure" button
    - Empty state description mentions spool count when spools exist
    - Figure cards render when store has figures — verify figure names appear
    - Figure with assigned colors shows spool swatches
    - Figure with no assigned colors shows "No colors assigned"
  - [x] 3.3 Run full test suite — all existing 70 tests must still pass (87 total pass, no regressions)

### Review Findings

- [x] [Review][Patch] Missing negative assertion for franchise non-rendering in test [app/components/FigureCard.test.tsx:65] — fixed: added paragraph count assertion
- [x] [Review][Patch] Import ordering violation: react-router after third-party imports [app/routes/catalog.test.tsx:4-6] — fixed: moved react-router import before @testing-library and vitest
- [x] [Review][Defer] Duplicate spool IDs in requiredColors produce duplicate React keys [app/components/FigureCard.tsx:33] — deferred, pre-existing data model concern

## Dev Notes

### Architecture Requirements

**Route Structure:**
The `catalog.tsx` route is a standalone route (not under the `_queue` layout). It renders in the main content area next to the sidebar. The route is already defined in `app/routes.ts` at path `/catalog`.

**State Access Pattern:**
```
usePrintFlowStore(s => s.figures)  →  Map<string, Figure>
usePrintFlowStore(s => s.spools)   →  Map<string, Spool>
Array.from(figures.values())       →  Figure[]
```
Select only the slices needed — not the full store. The spools Map is needed to resolve spool IDs in `figure.requiredColors` to actual spool names and hex colors.

**Derived State at Render Time:**
- Spool resolution: `figure.requiredColors.map(id => spools.get(id)).filter(Boolean)` — derived during render
- Perceived lightness for swatch borders: `getPerceivedLightness(spool.hex)` — same as SpoolCard
- Empty state context: `spools.size` used to generate context-aware message — derived during render
- No `useEffect`, no `useState` for derived values

**Component Hierarchy:**
```
catalog.tsx (route)
├── Page header (h1 + "Add Figure" button placeholder)
├── Empty state (conditional, when figures.size === 0)
│   └── shadcn Empty (EmptyMedia + EmptyTitle + EmptyDescription + EmptyContent)
│       └── Description is context-aware: mentions spool count if spools exist
└── Card grid (conditional, when figures.size > 0)
    └── FigureCard (one per figure)
        └── shadcn Card (CardHeader + CardContent)
            ├── Figure name (text-lg font-semibold)
            ├── Franchise tag (text-sm text-muted-foreground) — only if non-empty
            ├── Size display ({size}%)
            └── Color section:
                ├── If requiredColors has items → row of mini swatches (circle + spool name)
                └── If requiredColors is empty → "No colors assigned" (muted text)
```

**Empty State Context-Awareness:**
The empty state description changes based on spool state:
- If spools exist: "Great, you have X spools! Create your first figure to start building your catalog."
- If no spools: "Add filament spools first, then create figures to assign colors." (or similar guidance)

This follows the progressive onboarding pattern from the UX spec — each empty state knows what prerequisites exist.

### Existing Codebase Context

**Already Implemented (Stories 1.1-1.5):**
- `app/lib/types.ts` — `Figure { id, name, franchise, size, notes, requiredColors: string[] }`, `Spool { id, name, hex }`, `QueueItem { id, figureId, type, completedColors }`
- `app/lib/store.ts` — `usePrintFlowStore` with `figures: Map<string, Figure>`, `spools: Map<string, Spool>`. **Note:** Store only has spool mutations so far — figure mutations (createFigure, updateFigure, deleteFigure) are NOT yet implemented. This story does NOT need them (read-only view).
- `app/lib/derived.ts` — `getReferencingFigures(spoolId, figures)` — existing pattern for pure derived functions
- `app/lib/color-utils.ts` — `getPerceivedLightness(hex)`, `hexToContrast(hex)`
- `app/lib/test-utils.ts` — `createSpool()`, `createFigure()`, `createQueueItem()` test factories
- `app/hooks/use-mobile.ts` — `useIsMobile()` hook (768px breakpoint)
- `app/routes/spools.tsx` — **reference implementation** for this story's pattern (empty state + card grid + responsive layout)
- `app/components/SpoolCard.tsx` — **reference implementation** for card component pattern (swatch + name + action buttons)
- `app/routes/catalog.tsx` — currently a stub (`<h1>Figure Catalog</h1>`) — replace entirely
- `app/components/ui/empty.tsx` — shadcn Empty component (already installed)
- `app/components/ui/card.tsx` — shadcn Card component (already installed)
- `app/components/ui/button.tsx` — shadcn Button component (already installed)

**Does NOT need to be created in this story:**
- Figure mutations in store (Story 2.2)
- FigureForm component (Story 2.2)
- Sheet/Drawer for create/edit (Story 2.2)
- Delete flow (Story 2.3)

**Test Baseline:** 70 tests passing (Stories 1.1-1.5)

### Key Patterns to Follow

1. **No `useMemo`/`useCallback`/`React.memo`** — React Compiler handles memoization
2. **No `useEffect`** — this story is read-only. All state is derived during render
3. **Use shadcn semantic tokens** — `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`. Never hardcode colors for UI chrome
4. **Spool hex colors rendered as inline styles** — `style={{ backgroundColor: spool.hex }}`. These are dynamic user data, not theme tokens
5. **Import ordering**: React/RR → third-party (lucide-react) → `~/lib/` → `~/components/` → relative
6. **Use `cn()`** from `~/lib/utils` for conditional Tailwind classes
7. **Co-locate tests** next to source: `FigureCard.test.tsx` next to `FigureCard.tsx`, `catalog.test.tsx` next to `catalog.tsx`
8. **`interface` for object shapes** — strict TypeScript
9. **Conditional rendering with ternaries** not `&&` (figures.size can be 0, which is falsy)
10. **Direct Lucide imports** for tree-shaking: `import { BookOpen } from "lucide-react"`
11. **No success toasts** — visible state change is sufficient feedback
12. **No loading states** — all interactions are instant (NFR5)
13. **Follow SpoolCard/spools.tsx as reference** — this story mirrors Story 1.3's pattern for figures

### Responsive Layout Reference

| Breakpoint | Width | Grid Columns | Spacing |
|-----------|-------|-------------|---------|
| sm (default) | <768px | 1 column | `gap-4`, `p-4` |
| md | 768-1023px | 2 columns | `gap-4`, `p-4` |
| lg / desktop | 1024px+ | 3 columns | `gap-6`, `p-6` |

Grid classes: `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6`

### Color Swatch Display in FigureCard

Each spool assigned to a figure is shown as a small inline swatch:
- Circle (16-18px) with `backgroundColor: spool.hex` via inline style
- Spool name as `text-sm` label next to the circle
- Row layout: `flex flex-wrap gap-2 items-center`
- Visibility border when `getPerceivedLightness(hex) > 0.85` (light mode) or `< 0.15` (dark mode) — same as SpoolCard

Handle dangling references gracefully: if a spool ID in `requiredColors` has no matching spool in the store (edge case from data corruption or import), skip it silently — `spools.get(id)` returns `undefined`, filter with `.filter(Boolean)`.

### Testing Standards

- **Framework**: Vitest + React Testing Library
- **Environment**: jsdom (configured in `vitest.config.ts`)
- **Run**: `npm test` (single run), `npm run test:watch` (watch mode)
- **Store access in tests**: `usePrintFlowStore.setState()` to set up test state before rendering, or use `store.getState()` to verify
- **Import `fake-indexeddb/auto`** at top of test files that interact with the store
- **Mock `window.matchMedia`** for `useIsMobile()` — pattern already in `spools.test.tsx`
- **Test baseline**: 70 tests passing (Stories 1.1-1.5)
- **Test factories**: `createFigure()` and `createSpool()` from `~/lib/test-utils`

### Data Flow — Catalog Rendering

```
User navigates to /catalog
  → catalog.tsx renders
  → Selects figures and spools from store
  → figures.size === 0?
    → YES: Render empty state
      → spools.size > 0? Show "Great, you have X spools!" message
      → spools.size === 0? Show generic "create your first figure" message
      → "Add Figure" CTA button (disabled placeholder)
    → NO: Render card grid
      → For each figure:
        → FigureCard renders name, franchise, size
        → Resolves requiredColors IDs to Spool objects via spools Map
        → Renders mini swatches for each resolved spool
        → If requiredColors empty → "No colors assigned"
```

### Project Structure Notes

**New Files:**
- `app/components/FigureCard.tsx` — figure card component
- `app/components/FigureCard.test.tsx` — figure card tests
- `app/routes/catalog.test.tsx` — catalog route tests

**Modified Files:**
- `app/routes/catalog.tsx` — replace stub with full implementation

### Previous Story Intelligence (Story 1.5)

**Patterns Established in Epic 1:**
- `app/lib/derived.ts` created with pure derived functions — pattern for future derived state
- AlertDialog for destructive confirmations (Story 1.5)
- Sheet/Drawer responsive pattern with `useIsMobile()` (Story 1.4)
- SpoolCard with action buttons (edit + delete) in ghost variant (Stories 1.4-1.5)
- Empty state with shadcn Empty component (Story 1.3) — **direct reference for this story**
- Card grid with responsive breakpoints (Story 1.3) — **direct reference for this story**
- State-driven UI: `open` boolean + entity reference controls overlays

**Review findings from Epic 1 to avoid:**
- Import ordering must be: React/RR → third-party → `~/lib/` → `~/components/` → relative
- Use `lg:p-6` not `md:p-6` for desktop padding (Story 1.3 review finding)
- Avoid redundant gap classes (e.g., don't add `md:gap-4` when base `gap-4` covers it)

**Build State:** `npm run build` passes clean, 70 tests passing, TypeScript strict mode, no warnings

### Git Intelligence

**Recent commits (Epic 1 complete):**
- `a27bda3` feat: enhance SpoolCard with delete functionality and integrate AlertDialog
- `fddb221` feat: add HexColorPicker component with tests and integrate into SpoolForm
- `9bfb52d` feat: implement SpoolCard component and SpoolLibrary route with empty state handling
- `704c395` feat: add app shell, sidebar navigation and dark mode (Story 1.2)
- `175430b` feat: add data model, state management & persistence layer (Story 1.1)

**Commit message format:** `feat: <description>`

### Story 2.2 Awareness

Story 2.2 (Create & Edit Figure with Color Assignment) will add:
- Figure mutations to the store (createFigure, updateFigure)
- FigureForm component with color assignment UI
- Sheet/Drawer for create/edit forms
- The "Add Figure" buttons (header + empty state CTA) will be wired up

Keep the FigureCard component clean and focused on display — Story 2.2 will add `onEdit` prop. Story 2.3 will add `onDelete` prop. Design FigureCard props to be easily extensible (add optional callback props later without breaking changes).

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend Architecture, Component Architecture, Route Structure, State Management, Testing Strategy, Empty States]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Empty State Patterns, Figure Catalog Design, Card Grid Layout, Responsive Strategy, Typography, Accessibility]
- [Source: _bmad-output/planning-artifacts/prd.md — FR7, FR39, FR41]
- [Source: _bmad-output/implementation-artifacts/1-3-spool-library-view-empty-state.md — Direct pattern reference for empty state + card grid]
- [Source: _bmad-output/implementation-artifacts/1-5-delete-spool-with-referential-guard.md — Previous story patterns, derived.ts establishment]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Fixed test: `createFigure({ name: "Goku" })` defaults to franchise "Naruto", causing `getByText("Naruto")` to match multiple elements. Fixed by overriding franchise in test data.

### Completion Notes List

- Implemented `FigureCard` component with CardHeader (name, franchise, size) + CardContent (color swatches or "No colors assigned"). Follows SpoolCard border-visibility pattern for near-white/near-black swatches. Dangling spool references filtered silently.
- Replaced `catalog.tsx` stub with full implementation: context-aware empty state (spool count in description), responsive card grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), disabled "Add Figure" button placeholders.
- 17 new tests added (7 FigureCard + 10 catalog route). All 87 tests pass, build clean.

### File List

- `app/components/FigureCard.tsx` (new)
- `app/components/FigureCard.test.tsx` (new)
- `app/routes/catalog.tsx` (modified)
- `app/routes/catalog.test.tsx` (new)

## Change Log

- 2026-03-30: Implemented Story 2.1 — FigureCard component, catalog route with empty state and card grid, 17 new tests (87 total passing)
