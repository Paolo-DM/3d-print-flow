# Story 1.2: App Shell, Sidebar Navigation & Dark Mode

Status: done

## Story

As a user,
I want a persistent sidebar for navigating between app sections and automatic dark mode support,
so that I can move between all areas of the app and use it comfortably in any lighting condition.

## Acceptance Criteria

1. **Given** the app is opened in a browser, **When** the page loads, **Then** the app shell renders with a sidebar (sidebar-07 pattern) containing navigation sections: Queue (Color View, Figure View), Library (Figure Catalog, Filament Spools), Archive (Completed), and placeholders for Export/Import at the bottom.

2. **Given** the sidebar is visible on desktop (1024px+), **When** the viewport is resized to md (768-1023px), **Then** the sidebar collapses to icon-only mode.

3. **Given** the viewport is below 768px (sm), **When** the user views the app on mobile, **Then** the sidebar is hidden behind a hamburger trigger.

4. **Given** the user has dark mode as their system preference, **When** the app loads via SSR, **Then** the `.dark` class is applied via inline `<script>` before React hydrates, preventing any flash of light mode.

5. **Given** any navigation item in the sidebar, **When** the user clicks it, **Then** the corresponding route loads in the main content area and the active item is highlighted.

6. **Given** the app shell layout, **When** rendered on any viewport, **Then** all UI chrome uses desaturated shadcn semantic tokens (neutral canvas principle).

7. **Given** route configuration in `app/routes.ts`, **When** routes are defined, **Then** all route files exist as stubs (`_queue.tsx`, `_queue.home.tsx`, `_queue.figures.tsx`, `catalog.tsx`, `spools.tsx`, `completed.tsx`) rendering placeholder content.

## Tasks / Subtasks

- [x] Task 1: Install required shadcn components (AC: 1, 2, 3)
  - [x] 1.1 Install sidebar component via `npx shadcn@latest add sidebar`
  - [x] 1.2 Install separator component via `npx shadcn@latest add separator`
  - [x] 1.3 Install tooltip component via `npx shadcn@latest add tooltip`
  - [x] 1.4 Install sonner (toast) component via `npx shadcn@latest add sonner`
  - [x] 1.5 Verify all components install without errors and build passes

- [x] Task 2: Set up route stubs and routing configuration (AC: 5, 7)
  - [x] 2.1 Create layout route `app/routes/_queue.tsx` — renders `<Outlet />` (stat cards and tabs will come in later stories)
  - [x] 2.2 Create `app/routes/_queue.home.tsx` — placeholder with heading "Color View"
  - [x] 2.3 Create `app/routes/_queue.figures.tsx` — placeholder with heading "Figure View"
  - [x] 2.4 Create `app/routes/catalog.tsx` — placeholder with heading "Figure Catalog"
  - [x] 2.5 Create `app/routes/spools.tsx` — placeholder with heading "Spool Library"
  - [x] 2.6 Create `app/routes/completed.tsx` — placeholder with heading "Completed"
  - [x] 2.7 Update `app/routes.ts` to define all routes using `route()`, `layout()`, and `index()` from `@react-router/dev/routes`:
    - `/` → `_queue` layout → `_queue.home` (index)
    - `/figures` → `_queue` layout → `_queue.figures`
    - `/catalog` → `catalog`
    - `/spools` → `spools`
    - `/completed` → `completed`
  - [x] 2.8 Delete `app/routes/home.tsx` (replaced by `_queue.home.tsx`)

- [x] Task 3: Create AppSidebar component (AC: 1, 2, 3, 5, 6)
  - [x] 3.1 Create `app/components/AppSidebar.tsx` using shadcn sidebar primitives (`Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`)
  - [x] 3.2 Define navigation sections with icons from lucide-react:
    - **Queue**: Color View (Palette icon, path `/`), Figure View (LayoutGrid icon, path `/figures`)
    - **Library**: Figure Catalog (BookOpen icon, path `/catalog`), Filament Spools (Disc3 icon, path `/spools`)
    - **Archive**: Completed (CheckCircle icon, path `/completed`)
    - **Data** (footer): Export (Download icon) and Import (Upload icon) as disabled placeholder buttons
  - [x] 3.3 Use `useLocation()` from react-router to highlight active navigation item via `isActive` prop on `SidebarMenuButton`
  - [x] 3.4 Use `NavLink` from react-router for navigation items so active state works with React Router
  - [x] 3.5 Set sidebar to `collapsible="icon"` for responsive collapse behavior (sidebar-07 pattern)

- [x] Task 4: Create the `use-mobile` hook (AC: 3)
  - [x] 4.1 Create `app/hooks/use-mobile.ts` — exports `useIsMobile()` hook
  - [x] 4.2 Implement using `window.matchMedia("(max-width: 767px)")` with a listener for changes
  - [x] 4.3 Return boolean indicating mobile viewport (<768px)

- [x] Task 5: Update root.tsx — app shell layout with sidebar, dark mode, init (AC: 1, 4, 6)
  - [x] 5.1 Add dark mode inline `<script>` in `<head>` (inside Layout) that runs before React hydrates:
    - Reads `localStorage.getItem("theme")`
    - Falls back to `window.matchMedia("(prefers-color-scheme: dark)").matches`
    - Applies `.dark` class to `<html>` element if dark mode
    - Script must be a raw string in `dangerouslySetInnerHTML` to execute before hydration
  - [x] 5.2 Wrap `<body>` content with `SidebarProvider` and `SidebarInset` from shadcn sidebar
  - [x] 5.3 Add `<AppSidebar />` component inside the `SidebarProvider`
  - [x] 5.4 Add `<SidebarTrigger />` (hamburger button) in the main content header area for mobile toggle
  - [x] 5.5 Add `<Toaster />` from sonner for toast notifications (used in later stories)
  - [x] 5.6 Call `initApp()` from `~/lib/init` to hydrate Zustand store from IndexedDB on startup
  - [x] 5.7 Ensure the main content area uses `<Outlet />` for route rendering
  - [x] 5.8 Keep existing `ErrorBoundary` export

- [x] Task 6: Write tests (AC: 1-7)
  - [x] 6.1 Create `app/components/AppSidebar.test.tsx` — test that all navigation sections and items render, test active item highlighting
  - [x] 6.2 Create `app/routes/_queue.test.tsx` — test that layout route renders Outlet
  - [x] 6.3 Test dark mode script logic: verify `.dark` class application based on system preference and localStorage

## Dev Notes

### Architecture Requirements

**App Shell Structure (root.tsx):**
```
root.tsx Layout
├── <head>
│   ├── Dark mode inline <script> (before React hydrates)
│   ├── <Meta />, <Links />
├── <body>
│   ├── SidebarProvider
│   │   ├── AppSidebar
│   │   └── SidebarInset
│   │       ├── header with SidebarTrigger (mobile hamburger)
│   │       └── <main> with <Outlet />
│   ├── <Toaster /> (Sonner)
│   ├── <ScrollRestoration />
│   └── <Scripts />
```

**Sidebar Pattern:** sidebar-07 from shadcn — collapsible sidebar with icon-only mode. The shadcn `Sidebar` component with `collapsible="icon"` handles the 3 responsive states (full → icon-only → hidden) automatically via CSS and the `SidebarProvider` context.

**Routing Architecture:**
- React Router v7 file-based routing with `app/routes.ts` as the config file
- Use `route()`, `layout()`, `index()` helpers from `@react-router/dev/routes`
- Layout routes (prefixed with `_`) provide shared UI without adding URL segments
- `_queue.tsx` is a layout route wrapping Color View and Figure View (will contain stat cards + tabs in Story 1.3+)
- SSR is enabled (`react-router.config.ts` has `ssr: true`)

**Dark Mode Hydration Script:**
The inline script must be a blocking `<script>` in `<head>` (not a React component) to prevent FOUC (Flash of Unstyled Content). It must:
1. Check `localStorage.getItem("theme")` first
2. Fall back to `matchMedia("(prefers-color-scheme: dark)")`
3. Apply `.dark` to `document.documentElement` synchronously
4. This story implements system-preference detection only (no manual toggle UI — that's post-MVP)

**App Initialization:**
- `initApp()` from `~/lib/init` must be called once when the app mounts
- It hydrates the Zustand store from IndexedDB (sets `_persist = false` during load, `true` after)
- Call it in the default `App` component using a top-level `useEffect` (this is a legitimate external system sync)
- Alternatively, call from a client-only module side-effect if root is SSR'd

### Existing Codebase Context

**Already Implemented (Story 1.1):**
- `app/lib/types.ts` — Spool, Figure, QueueItem interfaces
- `app/lib/store.ts` — Zustand store with CRUD mutations, `toJSON()`, `fromJSON()`, `usePrintFlowStore()` hook
- `app/lib/db.ts` — IndexedDB persistence (idb wrapper)
- `app/lib/init.ts` — `initApp()` hydration orchestrator (module-level guard, safe to call multiple times)
- `app/lib/color-utils.ts` — `getPerceivedLightness()`, `hexToContrast()`
- `app/lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
- `app/lib/test-utils.ts` — Test factories (`createSpool`, `createFigure`, `createQueueItem`)
- `app/components/ui/button.tsx` — shadcn Button (only shadcn component installed so far)
- `app/app.css` — Full theme with light/dark oklch tokens, sidebar tokens, all semantic vars ready
- `app/root.tsx` — Minimal shell with Layout, App, ErrorBoundary (to be expanded)
- `app/routes.ts` — Single index route (to be rewritten)
- `app/routes/home.tsx` — Placeholder (to be deleted)

**What Does NOT Exist Yet (must be created):**
- `app/components/AppSidebar.tsx`
- `app/hooks/use-mobile.ts`
- Any shadcn components besides Button (sidebar, separator, tooltip, sonner)
- Any route files besides home.tsx
- `app/lib/constants.ts` (create only if needed for breakpoint values)

**Installed Dependencies (from package.json):**
- Production: react-router, zustand, idb, react-colorful, clsx, class-variance-authority, tailwind-merge, lucide-react, radix-ui, sonner, @fontsource-variable/inter
- Dev: vitest, @testing-library/react, fake-indexeddb, vite, @tailwindcss/vite, babel-plugin-react-compiler, typescript, eslint, prettier
- Note: `sonner` npm package is already installed; the shadcn `sonner` component wraps it with theme integration

**shadcn Configuration:**
- Style: radix-nova
- Icon library: lucide
- Base color: mist (oklch-based)
- Component aliases: `~/components/ui`, `~/lib`, `~/hooks`
- Install command: `npx shadcn@latest add <component>`

### Key Patterns to Follow

1. **No `useMemo`/`useCallback`/`React.memo`** — React Compiler handles memoization automatically
2. **Minimize `useEffect`** — only use for external system sync (initApp hydration is a valid use case)
3. **Use shadcn semantic tokens** — `bg-background`, `text-foreground`, `bg-sidebar`, etc. Never hardcode colors
4. **Import ordering**: React/RR → third-party → `~/lib/` → `~/components/` → relative
5. **Interfaces for object shapes, types for unions** — strict TypeScript throughout
6. **Co-locate tests** next to source: `AppSidebar.test.tsx` next to `AppSidebar.tsx`
7. **Use `cn()`** from `~/lib/utils` for conditional Tailwind class composition
8. **Sonner** for toast notifications — add `<Toaster />` in root but no toasts fired in this story
9. **Only `db.ts` imports from `idb`** — no other file touches IndexedDB directly

### Testing Standards

- **Framework**: Vitest + React Testing Library
- **Config**: `vitest.config.ts` already configured with node environment and tsconfig paths
- **Test naming**: `{source}.test.{ts,tsx}` co-located with source
- **Run**: `npm test` (single run), `npm run test:watch` (watch mode)
- **For component tests**: Use `render()` from `@testing-library/react`, query with `screen`
- **For route tests**: May need to wrap in `MemoryRouter` or use `createRoutesStub` from react-router
- **Tests from Story 1.1 (26 tests)**: Must not regress — run full suite after implementation

### Responsive Breakpoints

| Breakpoint | Width | Sidebar Behavior |
|-----------|-------|-----------------|
| Desktop (default) | 1024px+ | Full sidebar (220px width) |
| `md` | 768-1023px | Icon-only collapsed sidebar |
| `sm` / mobile | <768px | Hidden, hamburger trigger |

### Navigation Items Reference

| Section | Item | Icon (lucide-react) | Route Path |
|---------|------|-------|------------|
| Queue | Color View | `Palette` | `/` |
| Queue | Figure View | `LayoutGrid` | `/figures` |
| Library | Figure Catalog | `BookOpen` | `/catalog` |
| Library | Filament Spools | `Disc3` | `/spools` |
| Archive | Completed | `CheckCircle` | `/completed` |
| Data | Export | `Download` | (button, disabled) |
| Data | Import | `Upload` | (button, disabled) |

### Project Structure Notes

- All new route files go in `app/routes/`
- AppSidebar goes in `app/components/` (shared across all routes)
- use-mobile hook goes in `app/hooks/` (shadcn convention)
- shadcn components auto-install to `app/components/ui/`
- No new files in `app/lib/` expected for this story (unless constants.ts is needed)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — App Shell, Routing, Component Architecture sections]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Sidebar Design, Dark Mode, Responsive Breakpoints sections]
- [Source: _bmad-output/implementation-artifacts/1-1-data-model-state-management-persistence-layer.md — Patterns and learnings]

### Previous Story Intelligence (Story 1.1)

**Patterns Established:**
- Zustand store with Map-based canonical state and reference-equality persistence
- Module-level guard pattern for one-time initialization (`init.ts`)
- `_persist` flag pattern to prevent write-back during hydration
- Co-located test files with factory functions in `test-utils.ts`
- `fake-indexeddb/auto` import for IndexedDB testing in Node

**Deferred Work:**
- IndexedDB error handling deferred to Story 4.3 (persistence-failure-notification-with-retry)
- No try/catch around `initApp()` yet — acceptable for now

**Build Verification:**
- `npm run build` passes clean
- 26 tests all passing in <231ms
- TypeScript strict mode, no warnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed shadcn sonner component: removed `next-themes` import (not used in React Router project), set theme to "system"
- jsdom lacks `window.matchMedia` — added mock in component tests via `Object.defineProperty`

### Completion Notes List

- Installed shadcn sidebar, separator, tooltip, sonner components via shadcn MCP server (batch install)
- shadcn auto-generated `use-mobile.ts` hook (Task 4) as part of sidebar install
- Created 6 route stubs: `_queue.tsx` (layout), `_queue.home.tsx`, `_queue.figures.tsx`, `catalog.tsx`, `spools.tsx`, `completed.tsx`
- Updated `routes.ts` with full routing config using `route()`, `layout()`, `index()`
- Deleted old `home.tsx` route
- Created `AppSidebar.tsx` with 3 nav sections (Queue, Library, Archive) + disabled Data footer (Export/Import)
- Updated `root.tsx` with dark mode inline script, SidebarProvider/SidebarInset layout, SidebarTrigger, Toaster, initApp() call, TooltipProvider
- Added `suppressHydrationWarning` to `<html>` to prevent hydration mismatch from dark mode script
- Added `jsdom` as dev dependency for component testing
- 12 new tests: 6 AppSidebar tests, 1 queue layout test, 5 dark mode script tests
- All 38 tests pass (26 existing + 12 new), build clean

### File List

- app/components/AppSidebar.tsx (new)
- app/components/AppSidebar.test.tsx (new)
- app/components/ui/sidebar.tsx (new, shadcn)
- app/components/ui/separator.tsx (new, shadcn)
- app/components/ui/tooltip.tsx (new, shadcn)
- app/components/ui/sonner.tsx (new, shadcn — modified to remove next-themes)
- app/components/ui/input.tsx (new, shadcn)
- app/components/ui/skeleton.tsx (new, shadcn)
- app/components/ui/sheet.tsx (new, shadcn)
- app/hooks/use-mobile.ts (new, shadcn)
- app/routes/_queue.tsx (new)
- app/routes/_queue.home.tsx (new)
- app/routes/_queue.figures.tsx (new)
- app/routes/_queue.test.tsx (new)
- app/routes/catalog.tsx (new)
- app/routes/spools.tsx (new)
- app/routes/completed.tsx (new)
- app/routes/home.tsx (deleted)
- app/routes.ts (modified)
- app/root.tsx (modified)
- app/lib/dark-mode.test.ts (new)
- package.json (modified — jsdom added)

### Review Findings

- [x] [Review][Decision] Missing "Data" section label for Export/Import footer — dismissed, current separator approach preferred
- [x] [Review][Patch] Remove unused `next-themes` dependency from package.json — fixed, uninstalled
- [x] [Review][Defer] `initApp()` fire-and-forget with no error handling [app/root.tsx:47] — deferred, pre-existing (Story 4.3)
- [x] [Review][Defer] No catch-all / 404 route defined [app/routes.ts] — deferred, pre-existing (out of scope for this story)
- [x] [Review][Defer] `vite-plugin-babel` in production deps instead of devDependencies [package.json] — deferred, pre-existing

### Change Log

- 2026-03-27: Implemented Story 1.2 — App shell with sidebar navigation, routing, dark mode, and toast infrastructure
- 2026-03-27: Code review completed — 1 decision, 1 patch, 3 deferred, 13 dismissed
