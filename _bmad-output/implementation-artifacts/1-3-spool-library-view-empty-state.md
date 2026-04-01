# Story 1.3: Spool Library View & Empty State

Status: done

## Story

As a user opening the Filament Spools section,
I want to see my spool library or be guided to create my first spool,
so that I can start building my filament collection.

## Acceptance Criteria

1. **Given** no spools exist in the store, **When** the user navigates to the Filament Spools section, **Then** an empty state is displayed using shadcn Empty component with icon, title "No Spools Yet", description, and a primary "Add Your First Spool" action button.

2. **Given** spools exist in the store, **When** the user navigates to the Filament Spools section, **Then** all spools are displayed in a visual library, each showing the spool's name and a color preview swatch of its hex color.

3. **Given** the spool library view, **When** rendered on desktop, **Then** spools are displayed in a card grid layout with comfortable spacing.

4. **Given** the spool library view on mobile (<768px), **When** the layout adapts, **Then** spool cards stack in a single column with tighter spacing.

5. **Given** a spool with a near-white hex color (perceived lightness > 0.85) in light mode, **When** the spool color preview is rendered, **Then** a subtle border is applied so the swatch remains visible against the background.

## Tasks / Subtasks

- [x] Task 1: Install required shadcn components (AC: 1, 2)
  - [x] 1.1 Install `card` component via `npx shadcn@latest add card`
  - [x] 1.2 Install `empty` component via `npx shadcn@latest add empty`
  - [x] 1.3 Verify build passes after install

- [x] Task 2: Build SpoolCard component (AC: 2, 5)
  - [x] 2.1 Create `app/components/SpoolCard.tsx` — displays a single spool as a shadcn Card with color swatch and name
  - [x] 2.2 Render a color swatch (square or circle, minimum 48px) using the spool's `hex` as inline background color
  - [x] 2.3 Compute perceived lightness via `getPerceivedLightness(hex)` from `~/lib/color-utils` at render time
  - [x] 2.4 Apply subtle `border border-border` on the swatch when perceived lightness > 0.85 (light mode) or < 0.15 (dark mode, use `dark:` variant)
  - [x] 2.5 Display spool name as card text using semantic tokens (`text-foreground`)
  - [x] 2.6 Apply contrast-aware text color on the swatch label (if any text overlays the swatch) via `hexToContrast(hex)`

- [x] Task 3: Build SpoolLibrary route (AC: 1, 2, 3, 4)
  - [x] 3.1 Replace stub in `app/routes/spools.tsx` with full implementation
  - [x] 3.2 Select spools from store: `usePrintFlowStore(s => s.spools)`
  - [x] 3.3 Convert spools Map to array: `Array.from(spools.values())`
  - [x] 3.4 Conditionally render: if no spools → empty state; if spools exist → card grid
  - [x] 3.5 Empty state: use shadcn `Empty` with `EmptyMedia` (variant="icon", use `Disc3` icon from lucide-react), `EmptyTitle` ("No Spools Yet"), `EmptyDescription` ("Add your filament spools to start building your color library."), `EmptyContent` with primary `Button` ("Add Your First Spool")
  - [x] 3.6 Card grid: `div` with `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-4` responsive classes
  - [x] 3.7 Page header: "Spool Library" heading (`text-2xl font-semibold`) with an "Add Spool" Button (disabled placeholder for Story 1.4)
  - [x] 3.8 Wrap content in `div` with `p-6 md:p-4` for responsive padding

- [x] Task 4: Write tests (AC: 1-5)
  - [x] 4.1 Create `app/routes/spools.test.tsx`
  - [x] 4.2 Test: empty state renders when store has no spools — verify "No Spools Yet" title, "Add Your First Spool" button
  - [x] 4.3 Test: spool cards render when store has spools — verify spool names and color swatches appear
  - [x] 4.4 Test: near-white spool (#FFFFFF) gets a border class applied to its swatch
  - [x] 4.5 Create `app/components/SpoolCard.test.tsx`
  - [x] 4.6 Test: SpoolCard renders spool name and color swatch with correct background
  - [x] 4.7 Test: SpoolCard applies border for light colors (lightness > 0.85) and dark colors (lightness < 0.15)
  - [x] 4.8 Run full test suite — all existing 38 tests must still pass

## Dev Notes

### Architecture Requirements

**Route Structure:**
The `spools.tsx` route is a standalone route (not under the `_queue` layout). It renders in the main content area next to the sidebar. The route is already defined in `app/routes.ts` at path `/spools`.

**State Access Pattern:**
```
usePrintFlowStore(s => s.spools)  →  Map<string, Spool>
Array.from(spools.values())       →  Spool[]
```
Select only the `spools` slice — not the full store. Components only re-render when the spools Map reference changes.

**Derived State at Render Time:**
- Perceived lightness: call `getPerceivedLightness(spool.hex)` during render for each spool — React Compiler handles memoization
- Contrast text: call `hexToContrast(spool.hex)` during render if needed for text overlays
- No `useEffect`, no `useState` for derived values

**Component Hierarchy:**
```
spools.tsx (route)
├── Page header (h1 + Add Spool button placeholder)
├── Empty state (conditional, when spools.size === 0)
│   └── shadcn Empty (EmptyMedia + EmptyTitle + EmptyDescription + EmptyContent)
└── Card grid (conditional, when spools.size > 0)
    └── SpoolCard (one per spool)
        └── shadcn Card (CardContent with color swatch + name)
```

**shadcn Components to Install:**
- `card` — Card, CardContent, CardHeader, CardTitle (use what's needed)
- `empty` — Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent

**Empty State CTA:**
The "Add Your First Spool" button is a placeholder in this story — it does not open a form. Story 1.4 implements the create/edit form. For now, render the Button but it does nothing (or renders as disabled). The "Add Spool" button in the page header is similarly a placeholder.

**Color Swatch Visibility Rules:**
- Light mode: swatches with `getPerceivedLightness(hex) > 0.85` → add `border border-border`
- Dark mode: swatches with `getPerceivedLightness(hex) < 0.15` → add `dark:border dark:border-border`
- Apply both rules on every swatch — the `dark:` variant handles mode switching automatically

### Existing Codebase Context

**Already Implemented (Stories 1.1 + 1.2):**
- `app/lib/types.ts` — `Spool` interface: `{ id: string; name: string; hex: string }`
- `app/lib/store.ts` — `usePrintFlowStore` hook, `spools: Map<string, Spool>`, `createSpool()`, `updateSpool()`, `deleteSpool()`
- `app/lib/color-utils.ts` — `getPerceivedLightness(hex): number`, `hexToContrast(hex): string`
- `app/lib/test-utils.ts` — `createSpool()` factory for tests
- `app/routes/spools.tsx` — stub with heading only (replace entirely)
- `app/components/AppSidebar.tsx` — sidebar nav with link to `/spools` (Disc3 icon) already working
- `app/components/ui/button.tsx` — shadcn Button ready to use
- `app/root.tsx` — app shell with SidebarProvider, initApp(), dark mode, Toaster
- `app/app.css` — full theme with light/dark oklch tokens, `--border`, `--card`, etc.

**Not Yet Installed (must install):**
- shadcn `card` component
- shadcn `empty` component

**Test Baseline:** 38 tests passing (26 from Story 1.1 + 12 from Story 1.2)

### Key Patterns to Follow

1. **No `useMemo`/`useCallback`/`React.memo`** — React Compiler handles memoization
2. **No `useEffect`** — this story has no external system sync. All state is derived during render
3. **Use shadcn semantic tokens** — `bg-background`, `text-foreground`, `bg-card`, `border-border`. Never hardcode colors for UI chrome
4. **Spool hex colors rendered as inline styles** — `style={{ backgroundColor: spool.hex }}`. These are dynamic user data, not theme tokens
5. **Import ordering**: React/RR → third-party → `~/lib/` → `~/components/` → relative
6. **Use `cn()`** from `~/lib/utils` for conditional Tailwind classes (e.g., border visibility)
7. **Co-locate tests** next to source: `SpoolCard.test.tsx` next to `SpoolCard.tsx`, `spools.test.tsx` next to `spools.tsx`
8. **Interfaces for object shapes, types for unions** — strict TypeScript
9. **Conditional rendering with ternaries**, not `&&` (spools.size can be 0, which is falsy)

### Testing Standards

- **Framework**: Vitest + React Testing Library
- **Environment**: jsdom (already configured in `vitest.config.ts`)
- **Run**: `npm test` (single run), `npm run test:watch` (watch mode)
- **For component tests**: Use `render()`, query with `screen`, assert with `expect`
- **Store access in tests**: Use `usePrintFlowStore.getState()` to set up test state before rendering
- **Mock pattern from Story 1.2**: jsdom lacks `window.matchMedia` — add mock via `Object.defineProperty` if testing responsive behavior
- **Import `fake-indexeddb/auto`** at the top of test files that interact with the store (persistence fires on mutations)

### Responsive Layout Reference

| Breakpoint | Width | Grid Columns | Spacing |
|-----------|-------|-------------|---------|
| sm (default) | <768px | 1 column | `gap-4`, `p-4` |
| md | 768-1023px | 2 columns | `gap-4`, `p-4` |
| lg / desktop | 1024px+ | 3 columns | `gap-6`, `p-6` |

### Project Structure Notes

- `app/routes/spools.tsx` — modify (replace stub)
- `app/components/SpoolCard.tsx` — new component
- `app/components/SpoolCard.test.tsx` — new test
- `app/routes/spools.test.tsx` — new test
- `app/components/ui/card.tsx` — new (shadcn install)
- `app/components/ui/empty.tsx` — new (shadcn install)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend Architecture, Component Architecture, Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Empty State Patterns, Design System Foundation, Spacing & Layout, Accessibility]
- [Source: _bmad-output/planning-artifacts/prd.md — FR2, FR38, FR41]
- [Source: _bmad-output/implementation-artifacts/1-2-app-shell-sidebar-navigation-dark-mode.md — Previous story patterns and learnings]

### Previous Story Intelligence (Story 1.2)

**Patterns Established:**
- shadcn component install: `npx shadcn@latest add <component>` — installs to `app/components/ui/`
- AppSidebar with NavLink for active navigation highlighting
- SidebarProvider + SidebarInset layout in root.tsx
- Dark mode via inline script in `<head>` before hydration
- `suppressHydrationWarning` on `<html>` element
- jsdom + `Object.defineProperty(window, 'matchMedia', ...)` for responsive testing
- Co-located tests with `render()` + `screen` queries

**Deferred Work:**
- IndexedDB error handling → Story 4.3
- Catch-all 404 route → out of scope
- `vite-plugin-babel` in prod deps instead of devDeps → pre-existing

**Build State:**
- `npm run build` passes clean
- 38 tests all passing
- TypeScript strict mode, no warnings

### Git Intelligence

**Recent commits:**
- `704c395` feat: add app shell, sidebar navigation and dark mode (Story 1.2)
- `175430b` feat: add data model, state management & persistence layer (Story 1.1)
- `906fe0d` feat: initial commit

**Patterns from recent work:**
- Commit message format: `feat: <description> (Story X.Y)`
- shadcn components installed via CLI, not manually created
- Test files co-located with source
- `fake-indexeddb/auto` imported in test files for IndexedDB support

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- SpoolCard test for mid-range color initially used #0000FF (blue) which has lightness 0.07 (< 0.15), triggering dark border. Fixed to use #808080 (gray, lightness ~0.22).

### Completion Notes List

- Task 1: Installed shadcn `card` and `empty` components via MCP server. Build verified clean.
- Task 2: Created SpoolCard component with color swatch (48px), perceived lightness border logic for light/dark modes, semantic tokens.
- Task 3: Replaced spools.tsx stub with full implementation — empty state with shadcn Empty component (Disc3 icon), responsive card grid (1/2/3 columns), page header with disabled "Add Spool" placeholder.
- Task 4: Created 9 tests across 2 files — all pass. Full suite: 47 tests passing (38 existing + 9 new).

### Change Log

- 2026-03-27: Story 1.3 implemented — spool library view with empty state, SpoolCard component, responsive grid, and tests.

### Review Findings

- [x] [Review][Patch] Padding breakpoint `md:p-6` should be `lg:p-6` per spec responsive table [app/routes/spools.tsx:20]
- [x] [Review][Patch] Redundant `md:gap-4` on grid — base `gap-4` already covers md breakpoint [app/routes/spools.tsx:42]
- [x] [Review][Patch] Import ordering: `~/components/` imports before `~/lib/` imports [app/components/SpoolCard.tsx:1-4]
- [x] [Review][Defer] No hex/name input validation — malformed hex causes NaN in lightness, empty/long names unhandled — deferred, pre-existing (Story 1.4 form validation)
- [x] [Review][Defer] Disabled CTA buttons lack accessibility hint (tooltip/aria-label for "coming soon") — deferred, pre-existing (Story 1.4 enables buttons)

### File List

- app/components/ui/card.tsx (new — shadcn install)
- app/components/ui/empty.tsx (new — shadcn install)
- app/components/SpoolCard.tsx (new)
- app/components/SpoolCard.test.tsx (new)
- app/routes/spools.tsx (modified — replaced stub)
- app/routes/spools.test.tsx (new)
