---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-27'
inputDocuments:
  - 'prd.md'
  - 'ux-design-specification.md'
  - 'product-brief-3d-print-flow.md'
  - 'product-brief-3d-print-flow-distillate.md'
  - 'prd-validation-report.md'
  - 'project-context.md'
workflowType: 'architecture'
project_name: '3d-print-flow'
user_name: 'Paolo'
date: '2026-03-26'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
42 FRs across 6 domains:
- **Spool Management (FR1-FR5):** CRUD with hex color picker, referential deletion guard
- **Figure Catalog (FR6-FR13):** CRUD with multi-spool color assignment, live catalog-to-queue binding on edit
- **Queue Management (FR14-FR23):** Add from catalog, stock/order flag, per-figure chip toggle (mark/unmark), progress tracking, completion flow, print-again re-queue, removal with confirmation
- **Color-First Planning (FR24-FR29):** Ranked color list (frequency of incomplete chips), order priority surfacing, expandable figure lists per color, dual view (Color View home + Figure View)
- **Data Persistence (FR30-FR36):** Auto-save on every mutation, JSON export (always visible), JSON import (full replace, atomic), persistence failure notification with retry
- **Onboarding (FR37-FR42):** Progressive empty state CTAs, navigation, catalog edit impact notification

Architecturally, the FRs describe three entity types (Spool, Figure, QueueItem) with referential relationships and a single derived computation (color frequency ranking) that must be live and instant.

**Non-Functional Requirements:**
11 NFRs driving architectural decisions:
- **NFR1-NFR2:** Single animation frame (~16ms) for ranking recalculation and all local CRUD — mandates derived state during render, not async
- **NFR3:** Under 2s initial load — mandates bundle optimization and efficient IndexedDB hydration
- **NFR4:** Performant at 100 figures, 30 spools, 30 queue items — defines the upper bound for in-memory data model
- **NFR5:** No loading spinners — all local operations are synchronous from user's perspective
- **NFR6-NFR7:** Every mutation writes to IndexedDB; failure notified within 2s — mandates write-behind persistence with error surfacing
- **NFR8-NFR9:** JSON export/import is complete and atomic — mandates serialization of full app state
- **NFR10:** Crash recovery without corruption — mandates safe IndexedDB write patterns
- **NFR11:** In-memory state is source of truth — the defining architectural constraint

**UX Architectural Implications:**
- 4 custom components + 12+ shadcn/ui components — moderate component tree complexity
- Sidebar-07 layout pattern (collapsible sidebar + main content)
- Chip toggle: 100-200ms animation, saturation-as-state encoding, computed contrast colors from hex values
- Figure completion cascade: chip fill -> card highlight (~500ms) -> collapse out of list
- Desktop-first responsive: 3 breakpoints (default, md:768px, sm:<768px)
- Sheet on desktop / Drawer on mobile for forms
- Dark mode via `.dark` class with oklch color tokens
- No loading states, no spinners, no skeletons for local operations

### Scale & Complexity

- **Primary domain:** Client-side web application (React SPA, zero backend)
- **Complexity level:** Medium — simple infrastructure (no server, no auth, no deployment complexity), moderate data relationships (three entities with referential integrity + live binding + derived ranking)
- **Data volume ceiling:** ~100 figures x 30 spools x 30 queue items — comfortably fits in memory, no pagination or virtualization needed

**Architectural Components (enumerated):**

| Component | Responsibility |
|-----------|---------------|
| Spool Store | In-memory `Map<string, Spool>` with CRUD operations |
| Figure Store | In-memory `Map<string, Figure>` with CRUD operations |
| QueueItem Store | In-memory `Map<string, QueueItem>` with CRUD, chip toggle, completion |
| Persistence Layer | IndexedDB wrapper: hydration, write-behind saves, error surfacing |
| Hydration/Init Module | One-time app startup: parallel IndexedDB reads, module-level guard |
| Import/Export Module | JSON serialization/deserialization, atomic import, schema versioning |
| State Management Core | Canonical entity state + derived computations (ranking, progress, completion, empty states) |
| Color View (route) | Home/default — ranked color list with expandable figure lists |
| Figure View (route) | Queue displayed as figure cards with chip progress |
| Figure Catalog (route) | Catalog CRUD with color assignment |
| Spool Library (route) | Spool CRUD with hex color picker |
| Completed Section (route) | Archive with print-again re-queue |
| ColorChip | Custom — signature toggle interaction with saturation-as-state |
| ColorRankingEntry | Custom — ranked row with Collapsible figure list |
| HexColorPicker | Custom — color picker in Popover (wrapping react-colorful) |
| StatCard | Custom — summary statistics cards |
| Error Boundary Layer | App-level and route-level error boundaries for crash recovery (NFR10) and persistence failure handling (FR36) |
| App Shell/Layout | Sidebar navigation, view toggle, responsive layout chrome |

**Total: 18 components**

### Technical Constraints & Dependencies

- **React 19 + React Router v7** — framework mode with `@react-router/dev`, file-based routing, SSR via react-router-serve (serves app shell, no server-side data)
- **React Compiler** — automatic memoization; code must follow Rules of React (pure renders, no side effects during render). No manual useMemo/useCallback/React.memo
- **TypeScript strict** — no `any` without documentation
- **Tailwind CSS v4 + shadcn/ui** — utility-first styling, semantic color tokens from app.css, Radix primitives for accessibility
- **Vite 7** — build tool, supports dynamic imports and code splitting
- **IndexedDB** — sole persistence layer, chosen over localStorage for no 5MB limit and structured data support
- **Minimal useEffect** — derive state during render, use event handlers, use React Router loaders/actions. Effects only for external system synchronization
- **No backend** — no API, no auth, no cloud services, no server-side state

### Cross-Cutting Concerns Identified

1. **State management** — in-memory store driving all derived state (ranking, progress, completion). Must support instant recalculation on every mutation. The state model is the architectural centerpiece
2. **Persistence layer** — write-behind IndexedDB with error surfacing. Must handle app startup hydration, per-mutation writes, crash recovery, and export/import serialization
3. **Referential integrity** — application-level enforcement: spools referenced by figures, figures referenced by queue items. Deletion guards, cascade awareness, orphan prevention
4. **Derived state computation** — color ranking, figure progress, completion detection, empty state awareness — all computed from canonical entity state, never stored
5. **Responsive layout** — sidebar collapse behavior, Sheet/Drawer switching, card grid reflow, tap target compliance across breakpoints
6. **Dark mode hydration** — the `.dark` class must be applied via inline `<script>` before React hydrates to prevent a white flash. This is a UX-critical SSR boundary decision — if the user sees light theme flash before dark mode applies, trust is broken
7. **Error boundaries** — app-level and route-level error boundaries for crash recovery (NFR10), persistence failure handling (FR36, NFR7), and graceful degradation
8. **Empty state orchestration** — progressive onboarding CTAs that are context-aware across views (knows about spool/figure/queue prerequisites)

### Open Architectural Questions

1. **IndexedDB hydration: blocking vs. Suspense?** — NFR5 says "no loading spinners." IndexedDB reads are local (~<50ms), not network calls. Blocking render until hydration completes avoids the need for Suspense fallbacks and matches the UX spec's "trust through invisible reliability" principle. Suspense may be unnecessary overhead for a local-first app. Decision needed in architecture step.

### Vercel React Best Practices — Architectural Rules

Systematic cross-reference of all 57 Vercel React best practices rules against this project's requirements. Rules are grouped by architectural impact — only applicable rules are listed.

#### Mandatory Architectural Rules (CRITICAL impact)

| Rule | Architectural Decision |
|------|----------------------|
| `async-parallel` | IndexedDB hydration loads all 3 stores (spools, figures, queue items) via `Promise.all()`, not sequentially |
| `bundle-barrel-imports` | **Direct imports for Lucide React** (`lucide-react/dist/esm/icons/...`). Radix UI is already wrapped by shadcn/ui components — barrel import rule is handled by the component library pattern |
| `bundle-dynamic-imports` | HexColorPicker (react-colorful) lazy-loaded via `React.lazy()`. Non-home routes (Catalog, Spool Library, Completed) are automatically code-split by React Router v7 framework mode — no manual lazy loading needed for routes |
| `rerender-derived-state-no-effect` | **The defining rule for this app.** Color ranking, figure progress, completion detection — ALL derived during render. Never stored in state. Never computed via useEffect |

#### High-Impact Architectural Rules

| Rule | Architectural Decision |
|------|----------------------|
| `rendering-hydration-no-flicker` | Dark mode `.dark` class applied via inline `<script>` before React hydrates, preventing light-mode flash on SSR |
| `rerender-move-effect-to-event` | Chip toggle, CRUD, import/export — all mutations in event handlers. Effects only for IndexedDB persistence sync |
| `rerender-functional-setstate` | All state mutations use functional form `setState(prev => ...)` to prevent stale closures during rapid chip toggling |
| `js-set-map-lookups` / `js-index-maps` | Entity stores use `Map<string, Entity>` for O(1) lookups. Foundation for ranking computation and live binding |
| `js-tosorted-immutable` | Ranking sort uses `.toSorted()`, never `.sort()`. Immutability required for React Compiler optimization |
| `advanced-init-once` | IndexedDB initialization guarded against double-mount (`let didInit = false`). React dev mode double-mounts effects |
| `client-localstorage-schema` (adapted) | IndexedDB schema and JSON export format are versioned for future migrations |

#### Applicable Medium-Impact Rules

| Rule | When It Applies |
|------|----------------|
| `bundle-conditional` | Color picker module loads only when popover opens |
| `bundle-preload` | Preload Catalog/Spool routes on sidebar hover/focus |
| `rerender-lazy-state-init` | IndexedDB hydration uses `useState(() => loadFromDB())` |
| `rerender-derived-state` | Subscribe to derived booleans (`hasOrders`, `isQueueEmpty`) not raw values |
| `rerender-defer-reads` | State read on demand in handlers (e.g., JSON export reads full state at click time) |
| `rerender-transitions` | JSON import (full data replace) wrapped in `startTransition` |
| `rendering-conditional-render` | Ternary operators, not `&&`, for conditional rendering (color counts can be 0) |
| `rendering-content-visibility` | `content-visibility: auto` on long figure lists at scale |
| `rendering-hoist-jsx` | Static JSX (empty state templates, nav structure) hoisted outside components |
| `rendering-activity` | React 19 `<Activity>` (confirmed available in React 19.2.4) for collapsible Completed section — preserves state without unmounting |
| `js-combine-iterations` | Ranking computation as single loop over queue items, not chained filter/map/reduce |
| `client-passive-event-listeners` | Scroll/touch listeners marked `{ passive: true }` |

#### Explicitly Not Applicable (No Backend)

Server auth, server caching, React.cache(), LRU cache, after(), SWR deduplication, API route optimization — all skipped. No server-side data fetching exists in this architecture.

## Starter Template Evaluation

### Primary Technology Domain

Client-side web application (React SPA) — identified from project requirements. React Router v7 in framework mode with SSR for the app shell, all data operations client-side via IndexedDB.

### Starter: React Router v7 Framework Template (Already Initialized)

**Rationale:** The project is already initialized with the React Router v7 framework template. All technology choices are made and configured. No starter evaluation needed — the foundation is in place.

**Initialization Command (already executed):**

```bash
npx create-react-router@7.13.1 3d-print-flow
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript strict mode
- React 19.2.4 with React Compiler (babel-plugin-react-compiler v1.0.0) for automatic memoization
- Node.js runtime for SSR via `react-router-serve`

**Styling Solution:**
- Tailwind CSS v4.2.1 with `@tailwindcss/vite` plugin
- shadcn v4.1.0 component library (Radix UI v1.4.3 primitives)
- Inter Variable font via `@fontsource-variable/inter`
- tw-animate-css v1.4.0 for CSS animations
- Prettier plugin for consistent Tailwind class ordering

**Build Tooling:**
- Vite 7.3.1 with `vite-plugin-babel` (React Compiler integration) and `vite-tsconfig-paths`
- React Router v7 dev server (`react-router dev`)
- Production build via `react-router build`
- Production serve via `react-router-serve`

**Testing Framework:**
- Not yet configured — to be decided in architectural decisions step

**Code Organization:**
- React Router v7 file-based routing in `app/routes/`
- Route config in `app/routes.ts` using `@react-router/dev/routes` helpers
- SSR enabled (`ssr: true`) — serves app shell, no server-side data

**Development Experience:**
- Vite HMR with React Compiler
- TypeScript type generation via `react-router typegen`
- ESLint with `eslint-plugin-react-hooks` v7.0.1 (recommended-latest preset, includes compiler rules)
- Prettier with tailwindcss plugin for consistent formatting

### Remaining Technology Decisions (Not Provided by Starter)

These will be addressed in the architectural decisions step:
- **State management approach** — how to structure the in-memory store
- **IndexedDB wrapper** — which library (idb, idb-keyval, Dexie, or raw API)
- **Testing framework** — Vitest + Testing Library, or alternatives
- **Color picker library** — react-colorful or alternatives
- **UUID generation** — for entity IDs (crypto.randomUUID() or library)

**Note:** Project initialization is complete. The first implementation story should focus on the data model and persistence layer, not project setup.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- IndexedDB wrapper library selection
- State management approach

**Important Decisions (Shape Architecture):**
- Testing framework
- Color picker library

**Nice-to-Have Decisions (Can Be Deferred):**
- UUID generation strategy
- Hosting & deployment target

**Deferred Decisions (Post-MVP):**
- None — all decisions needed for MVP are made

### Data Architecture

**IndexedDB Wrapper: idb v8.0.3**

| Attribute | Value |
|-----------|-------|
| Decision | Use `idb` (v8.0.3) as the IndexedDB wrapper |
| Rationale | Thin promise wrapper (~1.15KB) over native IndexedDB. Provides multiple object stores, schema versioning via upgrade callbacks, and full transactional control — without the weight of a full ORM. We don't need Dexie's reactive queries or advanced indexing because all computation happens in memory, not at the DB layer |
| Alternatives Rejected | `idb-keyval` (too simple — single store, no schema versioning), `Dexie` (30KB, ORM features unnecessary for 3 small stores with in-memory query) |
| Affects | Persistence Layer, Hydration/Init Module, Import/Export Module |

**Schema Design:**
- Three object stores: `spools`, `figures`, `queueItems`
- Each store keyed by entity ID (UUID v4 via `crypto.randomUUID()`)
- Schema version tracked in the database for future migrations
- JSON export format includes a version field for portability

**Data Validation:**
- TypeScript interfaces as the source of truth for entity shapes
- Runtime validation at system boundaries only: JSON import (external data entering the app) and IndexedDB hydration (data read from persistence on startup)
- No runtime validation for in-app mutations — TypeScript enforces shape at compile time

**UUID Generation: crypto.randomUUID()**

| Attribute | Value |
|-----------|-------|
| Decision | Use native `crypto.randomUUID()` for all entity IDs |
| Rationale | Native browser API, supported in all target browsers (Chrome 92+, Firefox 95+, Safari 15.4+, Edge 92+). Zero dependencies, generates v4 UUIDs |
| Alternatives Rejected | `uuid` package (~3KB, no advantage over the native API) |
| Affects | All entity creation (spools, figures, queue items) |

### Authentication & Security

Not applicable. This is a local-first personal tool with no backend, no user accounts, no network communication, and no sensitive data. No authentication or security architecture needed.

### API & Communication Patterns

Not applicable. No backend, no API, no server-side data fetching. All data operations are client-side IndexedDB reads/writes.

### Frontend Architecture

**State Management: Zustand (~1KB)**

| Attribute | Value |
|-----------|-------|
| Decision | Use Zustand as the state management solution |
| Rationale | Selector-based subscriptions provide precise re-render control — components only re-render when their selected slice changes. The store holds canonical `Map<string, Entity>` objects for O(1) lookups. Mutations are plain functions calling `set()` (inherently functional, aligning with `rerender-functional-setstate`). A `subscribe` callback fires IndexedDB writes after every state change. ~1KB gzipped |
| Alternatives Rejected | React Context + useState (coarser re-render scope — context re-renders all consumers), Jotai (more complex API than needed for 3 entity types), useSyncExternalStore (more boilerplate for same result) |
| Affects | State Management Core, all route views, Persistence Layer integration |

**State Architecture Pattern:**

```
Zustand Store (canonical state)
├── spools: Map<string, Spool>
├── figures: Map<string, Figure>
├── queueItems: Map<string, QueueItem>
├── _persist: boolean (controls whether subscribe writes to IndexedDB)
└── mutations: createSpool(), updateFigure(), toggleChip(), etc.
        │
        ├──→ Updates in-memory state (instant UI)
        └──→ Subscribe callback fires async IndexedDB write (when _persist === true)

Derived State (computed during render as pure functions, never stored)
├── colorRanking: computed from queueItems + figures + spools
├── figureProgress: computed from queueItem chip states
├── completionStatus: computed from figureProgress
└── emptyStates: computed from store emptiness checks
```

**Persistence Batching via `_persist` Flag:**

The Zustand subscribe callback checks a `_persist` flag before writing to IndexedDB. This prevents redundant writes during bulk operations:

- **Normal mutations** (chip toggle, CRUD): `_persist = true` (default) — every mutation triggers an IndexedDB write
- **Hydration** (app startup): `_persist = false` — loading from IndexedDB into the store should not write back to IndexedDB
- **JSON import**: `_persist = false` — the import action replaces all 3 Maps, writes to IndexedDB directly in a single transaction, then sets `_persist = true`

```ts
store.subscribe((state, prevState) => {
  if (!state._persist) return
  // write changed stores to IndexedDB
})
```

**Map Serialization Strategy:**

`Map` objects don't serialize to JSON natively (`JSON.stringify(new Map())` returns `"{}"`). The store exposes serialization helpers:
- `toJSON()`: converts all `Map<string, Entity>` stores to `Record<string, Entity>` for JSON export
- `fromJSON()`: converts `Record<string, Entity>` back to `Map<string, Entity>` for JSON import and IndexedDB hydration
- Zustand works fine with Maps internally — selectors return the Map, components iterate with `Array.from(map.values())`

**Derived State as Pure Functions:**

All derived computations (ranking, progress, completion, empty states) are extracted as pure functions that accept store state and return derived values. This ensures:
- Testability: pass known state, assert derived output — no component rendering needed
- Reusability: same derivation logic used in Color View, Figure View, and any future view
- React Compiler compatibility: pure functions with no side effects are optimally memoized

**Color Picker: react-colorful v5.6.1**

| Attribute | Value |
|-----------|-------|
| Decision | Use `react-colorful` for hex color selection |
| Rationale | Tiny (2.8KB gzipped), tree-shakeable, hooks-based. Wrapped in shadcn Popover per UX spec. Dynamically imported via `React.lazy()` — only loads when the color picker popover opens |
| Alternatives Rejected | `@uiw/react-color` (larger), custom implementation (not worth the effort) |
| Affects | HexColorPicker custom component, Spool CRUD forms |

**Radix UI Package Note:**

The project uses the unified `radix-ui` v1.4.3 package (not the old per-component `@radix-ui/react-*` packages). Imports use `import { Dialog } from "radix-ui"`. shadcn v4.1.0 is compatible with this unified package. The `bundle-barrel-imports` concern for Radix is handled by this unified package architecture — no separate barrel import mitigation needed for Radix.

**Error Handling Standards:**

- **Persistence failures:** Caught in the IndexedDB write callback, surfaced via Sonner toast with retry action (FR36, NFR7)
- **Import failures:** Caught in the import module, surfaced in the import Dialog — existing data preserved (NFR9)
- **Render errors:** React error boundaries at app-level (catch-all) and route-level (per-view recovery). Display fallback UI with retry option
- **Referential integrity violations:** Prevented at the mutation layer — deletion guards check references before allowing deletes (FR4, FR9)

### Testing Framework

**Vitest v4.1.1 + React Testing Library + fake-indexeddb**

| Attribute | Value |
|-----------|-------|
| Decision | Use Vitest with @testing-library/react for testing, fake-indexeddb for IndexedDB testing in Node |
| Rationale | Vitest uses the same Vite config — zero additional setup, shared transforms and resolvers. React Testing Library for component testing. fake-indexeddb provides an in-memory IndexedDB implementation for Node, enabling full persistence roundtrip testing (write → read → verify) without a browser |
| Alternatives Rejected | Jest (separate config, doesn't share Vite transforms), Vitest Browser Mode for all tests (slower, reserve for E2E smoke tests if needed) |
| Affects | All components and modules |

**Testing Strategy:**
- **Unit tests** for derived state pure functions (ranking algorithm, progress calculation, completion detection, referential integrity checks) — pass known state, assert output
- **Unit tests** for store mutations — verify state transitions and `_persist` flag behavior
- **Integration tests** for persistence layer via fake-indexeddb — full write/read/hydration cycle, JSON export/import roundtrip, schema migration
- **Component tests** for custom components (ColorChip toggle behavior, ColorRankingEntry expansion) via React Testing Library
- **E2E smoke tests** via Vitest Browser Mode if needed (deferred to implementation)

### Infrastructure & Deployment

**Hosting: SSR-capable host (deployment target deferred)**

| Attribute | Value |
|-----------|-------|
| Decision | Keep SSR enabled (`ssr: true`). Specific deployment target deferred — Vercel is the natural fit but not locked in |
| Rationale | SSR is already configured. The dark mode hydration fix (inline `<script>`) is cleaner when server-rendered. SSR serves the app shell faster. No cost to keeping it enabled |
| Alternatives Rejected | SPA mode (`ssr: false`) — loses SSR shell speed and cleaner dark mode script rendering |
| Affects | App Shell/Layout, deployment configuration |

### Decision Impact Analysis

**Implementation Sequence:**
1. **idb + Zustand + entity types** — data model and persistence layer (foundation for everything)
2. **State Management Core** — Zustand store with mutations, `_persist` flag, subscribe callback for IndexedDB writes, hydration/init module with `toJSON()`/`fromJSON()` helpers
3. **Derived state pure functions** — ranking algorithm, progress calculation, completion detection (testable independently)
4. **Route views + custom components** — Color View, Figure View, ColorChip, ColorRankingEntry
5. **CRUD forms + react-colorful** — Figure Catalog, Spool Library with hex color picker
6. **Import/Export module** — JSON serialization with schema versioning, atomic import
7. **Error boundaries + toast notifications** — error handling layer
8. **Vitest test suite** — unit, component, and integration tests (with fake-indexeddb)

**Cross-Component Dependencies:**
- Zustand store is consumed by all route views and custom components
- idb persistence layer is accessed only through the Zustand subscribe callback and the hydration/init module — no direct DB access from components
- Derived state pure functions depend on the Zustand store shape — entity type definitions must be stable before building views
- react-colorful is isolated to the HexColorPicker component — no cross-dependencies
- fake-indexeddb is a dev dependency only — no production impact

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

12 areas where AI agents could make different choices, grouped into 5 categories.

### Naming Patterns

**IndexedDB Store Naming:**
- Store names: `spools`, `figures`, `queueItems` (camelCase, plural)
- Entity IDs: UUID v4 strings via `crypto.randomUUID()`

**TypeScript Entity Naming:**
- Interfaces for entities: `Spool`, `Figure`, `QueueItem` (PascalCase, singular)
- Use `interface` for entity shapes, `type` for unions/intersections (per project-context.md)
- Entity types live in `app/lib/types.ts` — single source of truth for all entity shapes

**Component Naming:**
- React components: PascalCase — `ColorChip.tsx`, `ColorRankingEntry.tsx`
- Component files: PascalCase matching the component name — `ColorChip.tsx`, not `color-chip.tsx`
- shadcn/ui components remain in `app/components/ui/` with their default naming (lowercase kebab: `button.tsx`, `dialog.tsx`)
- Custom components in `app/components/` use PascalCase: `ColorChip.tsx`, `StatCard.tsx`

**Function Naming:**
- Zustand mutations: verb + noun — `createSpool()`, `updateFigure()`, `toggleChip()`, `deleteSpool()`
- Derived state functions: `compute` prefix — `computeColorRanking()`, `computeFigureProgress()`, `computeCompletionStatus()`
- Event handlers in components: `handle` prefix — `handleChipToggle()`, `handleSave()`, `handleDelete()`
- Utility functions: camelCase, descriptive — `getPerceivedLightness()`, `hexToContrast()`

**Route File Naming:**
- React Router v7 convention: lowercase with dots for nesting — `home.tsx`, `catalog.tsx`, `spools.tsx`, `completed.tsx`
- Route config in `app/routes.ts` using `@react-router/dev/routes` helpers

### Structure Patterns

**Project Organization:**

```
app/
├── routes/              # Route modules (React Router v7 file-based)
│   ├── home.tsx         # Color View (home/default)
│   ├── figures.tsx      # Figure View
│   ├── catalog.tsx      # Figure Catalog
│   ├── spools.tsx       # Spool Library
│   └── completed.tsx    # Completed Section
├── components/          # Shared components
│   ├── ui/              # shadcn/ui components (auto-generated, don't edit)
│   ├── ColorChip.tsx    # Custom: signature chip toggle
│   ├── ColorRankingEntry.tsx  # Custom: ranked row with collapsible
│   ├── HexColorPicker.tsx     # Custom: color picker wrapper
│   └── StatCard.tsx     # Custom: summary stat card
├── lib/                 # Utilities, state, persistence
│   ├── types.ts         # Entity interfaces (Spool, Figure, QueueItem)
│   ├── store.ts         # Zustand store (canonical state + mutations)
│   ├── derived.ts       # Pure functions for derived state (ranking, progress)
│   ├── db.ts            # idb persistence layer (schema, read, write)
│   ├── export-import.ts # JSON export/import with serialization helpers
│   └── utils.ts         # General utilities (cn(), color contrast, etc.)
├── routes.ts            # Route config
├── root.tsx             # App shell, error boundary, sidebar layout
└── app.css              # Theme tokens (oklch, shadcn semantic vars)
```

**Test Organization:**
- Tests co-located next to source files: `store.test.ts` next to `store.ts`, `ColorChip.test.tsx` next to `ColorChip.tsx`
- Test files named `{source}.test.{ts,tsx}`
- No separate `__tests__/` directory — co-location reduces navigation friction
- Test utilities (fake-indexeddb setup, test factories) in `app/lib/test-utils.ts`

**Import Ordering:**
1. React / React Router imports
2. Third-party libraries (zustand, idb, react-colorful)
3. Internal `app/lib/` imports
4. Internal `app/components/` imports
5. Relative imports (siblings)
- Prettier handles formatting; no manual sorting needed

### Format Patterns

**JSON Export Format:**

```json
{
  "version": 1,
  "exportedAt": "2026-03-26T14:30:00.000Z",
  "data": {
    "spools": { "uuid-1": { "id": "uuid-1", "name": "White PLA", "hex": "#FFFFFF" } },
    "figures": { "uuid-2": { "id": "uuid-2", "name": "Naruto" } },
    "queueItems": { "uuid-3": { "id": "uuid-3", "figureId": "uuid-2" } }
  }
}
```

- `version` field: integer, incremented on schema changes
- `exportedAt`: ISO 8601 UTC string
- `data`: Record<string, Entity> for each store (Map serialized via `toJSON()`)
- All field names: camelCase
- Entity references: store the target entity's `id` string (e.g., `figureId`, `spoolId`)

**Entity Reference Pattern:**
- Figures reference spools by ID: `requiredColors: string[]` (array of spool IDs)
- Queue items reference figures by ID: `figureId: string`
- Queue items store chip completion state: `completedColors: string[]` (array of spool IDs that are marked complete)
- No circular references. Direction is always: QueueItem → Figure → Spool

### State Management Patterns

**Zustand Store Rules:**
- Single store file: `app/lib/store.ts`
- Store holds `Map<string, Entity>` for each entity type + `_persist: boolean`
- Mutations are defined inside the store creator, not exported separately
- Mutations always use functional `set()`: `set(state => ({ ... }))`
- Mutations never read from `get()` when `set()` provides the current state
- Every mutation that changes entity data should be atomic — update all affected maps in a single `set()` call

**Selector Patterns:**
- Components select the minimum data they need: `useStore(s => s.spools)` not `useStore(s => s)`
- Derived state computed in the component body (not in a selector) using pure functions from `app/lib/derived.ts`
- Example: `const ranking = computeColorRanking(spools, figures, queueItems)` — called during render

**Immutability Rules:**
- Never mutate Maps in place — create new Maps: `new Map(prev)` then `.set()` or `.delete()`
- Use `.toSorted()` not `.sort()` for ranking
- Use spread for objects: `{ ...entity, name: newName }`

### Process Patterns

**Error Handling:**
- **Persistence errors:** Try/catch in the IndexedDB write callback. On failure: surface Sonner toast with message + retry action. Never silently swallow
- **Import errors:** Try/catch in the import function. On failure: keep Dialog open, show error message, preserve existing data. Atomic: if any part fails, nothing changes
- **Render errors:** Error boundary in `root.tsx` (app-level catch-all) + per-route error boundaries. Display a friendly fallback with "Try Again" button
- **Referential integrity errors:** Check before delete, never after. Show affected items in confirmation Dialog. Never allow orphaned references

**No Loading States (NFR5):**
- No loading spinners, skeletons, or "loading..." text for any local operation
- IndexedDB hydration blocks the initial render (not Suspense) — practically instant (<50ms)
- All state mutations are synchronous from the user's perspective — in-memory state updates instantly, IndexedDB write is async and invisible

**Toast Notification Rules:**
- Sonner toast only for errors that need user attention (persistence failure)
- No success toasts — the visible state change IS the success feedback
- No toasts for normal operations (chip toggle, CRUD, export)
- Toast includes a retry action button when applicable

**Form Patterns:**
- Forms use shadcn Field components consistently
- No autosave on forms — explicit "Save" button
- Cancel discards without confirmation
- Validation inline below the field, not in a summary
- When editing a figure with active queue items, show affected count above Save button

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow the file organization in `app/` exactly — routes, components, lib, and their subdivisions
2. Use the Zustand store as the only source of truth — never read from IndexedDB directly in components
3. Derive state during render using pure functions from `app/lib/derived.ts` — never store derived values in state or compute via useEffect
4. Use `interface` for entity shapes and keep them in `app/lib/types.ts`
5. Follow the naming conventions: PascalCase components, camelCase functions/variables, verb+noun mutations, compute prefix for derived functions
6. Never use `useMemo`, `useCallback`, or `React.memo` — React Compiler handles memoization
7. Never use `useEffect` for state derivation or event handling — only for external system synchronization (IndexedDB persistence setup)
8. Use direct Lucide imports: `import { Check } from "lucide-react"` is fine since Vite tree-shakes effectively with the project's setup, but prefer direct imports for icons used in hot paths

**Anti-Patterns to Avoid:**
- Storing derived state (ranking, progress) in Zustand or useState
- Using useEffect to sync state between entities
- Reading from IndexedDB in components — always go through the store
- Using `.sort()` instead of `.toSorted()` on arrays from state
- Adding success toasts for normal operations
- Creating loading states for local operations
- Importing from `@radix-ui/react-*` — use `radix-ui` unified package or shadcn wrappers

## Project Structure & Boundaries

### Complete Project Directory Structure

```
3d-print-flow/
├── .github/                     # CI/CD (future, if needed)
├── .claude/                     # Claude Code configuration (existing)
├── _bmad/                       # BMad workflow config (existing)
├── _bmad-output/                # BMad planning artifacts (existing)
├── app/
│   ├── routes/                  # Route modules (React Router v7)
│   │   ├── _queue.tsx           # Layout: stat cards + Tabs (Color/Figure) + <Outlet/>
│   │   ├── _queue.home.tsx      # Color View — home/default (FR24-FR29)
│   │   ├── _queue.figures.tsx   # Figure View — queue as figure cards (FR28-FR29)
│   │   ├── catalog.tsx          # Figure Catalog — CRUD (FR6-FR13)
│   │   ├── spools.tsx           # Spool Library — CRUD (FR1-FR5)
│   │   └── completed.tsx        # Completed Section — archive + re-queue (FR20-FR22)
│   ├── components/              # Shared components
│   │   ├── ui/                  # shadcn/ui components (auto-generated)
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── empty.tsx
│   │   │   ├── field.tsx
│   │   │   ├── item.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── tooltip.tsx
│   │   ├── ColorChip.tsx        # Custom: chip toggle (FR17-FR18)
│   │   ├── ColorChip.test.tsx
│   │   ├── ColorRankingEntry.tsx # Custom: ranked row + collapsible (FR24-FR26)
│   │   ├── ColorRankingEntry.test.tsx
│   │   ├── HexColorPicker.tsx   # Custom: react-colorful wrapper (FR5)
│   │   ├── StatCard.tsx         # Custom: summary stat card
│   │   ├── AppSidebar.tsx       # Sidebar navigation (FR37)
│   │   ├── EmptyState.tsx       # Reusable empty state CTA (FR38-FR41)
│   │   ├── QueueItemCard.tsx    # Figure card with chips + progress (FR19)
│   │   ├── SpoolForm.tsx        # Spool CRUD form (shared between Sheet/Drawer)
│   │   └── FigureForm.tsx       # Figure CRUD form (shared between Sheet/Drawer)
│   ├── hooks/                   # Custom hooks (shadcn convention)
│   │   └── use-mobile.ts       # useIsMobile() for Sheet/Drawer switching
│   ├── lib/                     # Utilities, state, persistence
│   │   ├── types.ts             # Entity interfaces: Spool, Figure, QueueItem
│   │   ├── store.ts             # Zustand store: canonical state + mutations
│   │   ├── store.test.ts        # Store mutation tests
│   │   ├── derived.ts           # Pure functions: ranking, progress, completion, affected items
│   │   ├── derived.test.ts      # Derived state unit tests
│   │   ├── db.ts                # idb persistence: schema, read, write, replaceAll
│   │   ├── db.test.ts           # Persistence integration tests (fake-indexeddb)
│   │   ├── init.ts              # App hydration: db.hydrate() → store population
│   │   ├── init.test.ts         # Hydration tests
│   │   ├── export-import.ts     # JSON export/import + toJSON/fromJSON helpers
│   │   ├── export-import.test.ts
│   │   ├── color-utils.ts       # Perceived lightness, contrast, visibility borders
│   │   ├── constants.ts         # Animation durations, tap targets, breakpoints
│   │   ├── utils.ts             # cn(), general utilities
│   │   └── test-utils.ts        # Test factories, fake-indexeddb setup
│   ├── routes.ts                # Route config (@react-router/dev/routes)
│   ├── root.tsx                 # App shell: sidebar layout, error boundary, dark mode script, Sonner
│   └── app.css                  # Theme tokens (oklch, shadcn semantic vars)
├── public/                      # Static assets (if any)
├── build/                       # Build output (gitignored)
├── package.json                 # Dependencies and scripts
├── react-router.config.ts       # React Router config (ssr: true)
├── vite.config.ts               # Vite + React Compiler + Tailwind
├── tsconfig.json                # TypeScript strict config
├── .prettierrc                  # Prettier config
├── eslint.config.js             # ESLint config
└── .gitignore
```

### Architectural Boundaries

**Component Boundaries:**

```
┌─────────────────────────────────────────────────┐
│  root.tsx (App Shell)                           │
│  ├── Sidebar navigation (AppSidebar)            │
│  ├── Error boundary (app-level)                 │
│  ├── Dark mode inline <script>                  │
│  ├── Sonner toast container                     │
│  └── <Outlet /> → route views                   │
├─────────────────────────────────────────────────┤
│  _queue.tsx (Queue Layout)                      │
│  ├── StatCard row (queued, colors, orders, done)│
│  ├── Tabs toggle (Color View / Figure View)     │
│  │   Tab state = current route URL              │
│  └── <Outlet /> → _queue.home or _queue.figures │
├─────────────────────────────────────────────────┤
│  Route Views                                    │
│  ├── _queue.home.tsx  → computes ranking via    │
│  │                      derived, renders        │
│  │                      ColorRankingEntry       │
│  ├── _queue.figures.tsx → computes progress,    │
│  │                        renders QueueItemCard │
│  ├── catalog.tsx  → figure CRUD, FigureForm     │
│  │                  in Sheet (desktop) or       │
│  │                  Drawer (mobile)             │
│  ├── spools.tsx   → spool CRUD, SpoolForm       │
│  │                  in Sheet/Drawer             │
│  └── completed.tsx → completed items, requeue   │
├─────────────────────────────────────────────────┤
│  Zustand Store (app/lib/store.ts)               │
│  ├── Canonical state: Maps                       │
│  ├── Mutations: CRUD + toggleChip + requeue      │
│  ├── _persist flag                               │
│  └── subscribe → IndexedDB write callback        │
├─────────────────────────────────────────────────┤
│  Persistence Layer (app/lib/db.ts)              │
│  ├── idb schema (3 stores, versioned)           │
│  ├── hydrate(): reads all stores → returns data │
│  ├── writeStore(): writes single entity change  │
│  └── replaceAll(): atomic full-replace (import) │
│       └── Single idb transaction across all 3   │
│          stores — rolls back on any failure     │
├─────────────────────────────────────────────────┤
│  Init Module (app/lib/init.ts)                  │
│  ├── Called once on app startup (module guard)   │
│  ├── db.hydrate() via Promise.all()             │
│  ├── store.fromJSON() with _persist = false     │
│  └── Sets _persist = true when done             │
├─────────────────────────────────────────────────┤
│  IndexedDB (browser)                            │
└─────────────────────────────────────────────────┘
```

**Data Access Rules:**
- Components **never** access IndexedDB directly — always through the Zustand store
- The Zustand store **never** reads from IndexedDB after initial hydration — in-memory state is truth
- Only `db.ts` touches the idb API — no other file imports from `idb`
- Only `export-import.ts` handles JSON serialization — no other file does `toJSON()`/`fromJSON()`
- Only `init.ts` orchestrates app startup hydration — root.tsx calls it, doesn't implement it

**State Boundaries:**
- Zustand store owns all entity state — no entity data in component useState
- Component-local state only for UI concerns: form input values, collapsible open/closed, popover visibility
- Derived state functions in `derived.ts` are pure — they read from store state passed as arguments, never from the store directly
- View toggle (Color View / Figure View) is route-based — current URL determines active tab, not client-side state

### Requirements to Structure Mapping

**FR Category → Files:**

| FR Category | Primary Files | Supporting Files |
|-------------|--------------|-----------------|
| **Spool Management (FR1-FR5)** | `routes/spools.tsx` | `lib/store.ts`, `components/SpoolForm.tsx`, `components/HexColorPicker.tsx`, `lib/types.ts` |
| **Figure Catalog (FR6-FR13)** | `routes/catalog.tsx` | `lib/store.ts`, `components/FigureForm.tsx`, `lib/types.ts`, `lib/derived.ts` (computeAffectedQueueItems for FR42) |
| **Queue Management (FR14-FR23)** | `routes/_queue.home.tsx`, `routes/_queue.figures.tsx` | `lib/store.ts`, `components/QueueItemCard.tsx`, `components/ColorChip.tsx` |
| **Color-First Planning (FR24-FR29)** | `routes/_queue.home.tsx`, `routes/_queue.tsx` | `lib/derived.ts` (computeColorRanking), `components/ColorRankingEntry.tsx`, `components/StatCard.tsx` |
| **Data Persistence (FR30-FR36)** | `lib/db.ts`, `lib/export-import.ts`, `lib/init.ts` | `lib/store.ts` (subscribe callback), `root.tsx` (Sonner toast) |
| **Navigation (FR37)** | `components/AppSidebar.tsx` | `root.tsx` (layout), `routes.ts` (config) |
| **Onboarding (FR38-FR42)** | `components/EmptyState.tsx` | All route views (conditional rendering), `lib/derived.ts` (computeAffectedQueueItems for FR42) |

**Cross-Cutting Concerns → Files:**

| Concern | Files |
|---------|-------|
| **State management** | `lib/store.ts`, `lib/types.ts` |
| **Derived state** | `lib/derived.ts` (ranking, progress, completion, affected items, empty states) |
| **Persistence** | `lib/db.ts`, `lib/store.ts` (subscribe), `lib/init.ts` (hydration) |
| **Error handling** | `root.tsx` (error boundary), `lib/db.ts` (try/catch), `root.tsx` (Sonner) |
| **Dark mode hydration** | `root.tsx` (inline script) |
| **Responsive layout** | `root.tsx` (sidebar), `hooks/use-mobile.ts`, all route views (Tailwind responsive) |
| **Form containers** | `hooks/use-mobile.ts` → Sheet (desktop) or Drawer (mobile) wrapping SpoolForm/FigureForm |
| **Empty states** | `components/EmptyState.tsx`, all route views |
| **Import/Export** | `lib/export-import.ts`, `components/AppSidebar.tsx` (buttons) |
| **Constants** | `lib/constants.ts` (animation durations, tap targets, breakpoints) |

### Data Flow

```
[App Startup]
  root.tsx mounts
    → init.ts runs (module-level guard, once per app load)
    → db.hydrate() loads all 3 IndexedDB stores via Promise.all()
    → store.fromJSON() populates Maps (with _persist = false)
    → _persist = true, app renders

[User Toggles Chip]
  ColorChip.onClick
    → store.toggleChip(queueItemId, spoolId)
    → set(state => new Map with updated completedColors)
    → React re-renders
    → _queue.tsx calls computeColorRanking() → stat cards update
    → _queue.home.tsx calls computeColorRanking() → new ranking
    → subscribe callback fires → db.writeStore('queueItems', updated)

[User Creates Spool]
  SpoolForm.onSubmit (inside Sheet or Drawer)
    → store.createSpool({ id: crypto.randomUUID(), name, hex })
    → set(state => new Map with added spool)
    → React re-renders
    → subscribe callback fires → db.writeStore('spools', updated)

[User Edits Catalog Figure with Active Queue Items (FR42)]
  FigureForm renders
    → computeAffectedQueueItems(figureId, queueItems) → count
    → shows "Saving will update N queued items" above Save button
  FigureForm.onSubmit
    → store.updateFigure(figureId, updates)
    → Live binding: queue views re-derive from updated figure data

[User Switches Queue View]
  Tabs in _queue.tsx
    → React Router navigation (/ → /figures or /figures → /)
    → URL change triggers route transition
    → New route view renders with same store data, different layout

[User Imports JSON]
  ImportDialog.onConfirm
    → store.set({ _persist: false })
    → exportImport.fromJSON(fileData) → parsed Maps
    → store.set({ spools, figures, queueItems })
    → db.replaceAll(fileData) → single idb transaction (atomic, rolls back on failure)
    → store.set({ _persist: true })
    → React re-renders with full new state

[User Exports JSON]
  AppSidebar.onExportClick
    → exportImport.toJSON(store.getState()) → JSON string
    → Browser downloads file
```

### Development Workflow

**Dev Server:** `npm run dev` → `react-router dev` → Vite HMR + React Compiler
**Type Check:** `npm run typecheck` → `react-router typegen && tsc`
**Build:** `npm run build` → `react-router build` → optimized output in `build/`
**Production:** `npm start` → `react-router-serve ./build/server/index.js`
**Format:** `npm run format` → `prettier --write`
**Test:** `npm test` → `vitest` (to be configured)

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices verified compatible:
- React 19.2.4 + React Router 7.13.1 + React Compiler 1.0.0 — verified working together in the existing project setup
- Zustand 5.0.12 works with React 19 and React Compiler (v5 API: `create` from `zustand`, `subscribe((state, prevState) => ...)`)
- idb 8.0.3 is a pure promise wrapper — no framework dependencies, works anywhere
- react-colorful 5.6.1 is hooks-based — compatible with React 19 and React Compiler
- Vitest 4.1.1 + Vite 7.3.1 — same ecosystem, shared config
- Tailwind CSS v4.2.1 + shadcn v4.1.0 + radix-ui 1.4.3 — already configured and working

No version conflicts. No contradictory decisions.

**Zustand v5 API Note:** Zustand v5 had breaking changes from v4. The patterns in this document (`set(state => ...)`, `subscribe((state, prevState) => ...)`) are v5-compatible. Implementing agents should reference Zustand v5 documentation, not v4 tutorials.

**Pattern Consistency:**
- Naming: PascalCase components, camelCase functions, verb+noun mutations, compute prefix for derived — consistent throughout
- Structure: co-located tests, lib for logic, components for UI, routes for views — no overlap or ambiguity
- State: Zustand store as single source of truth, derived during render, no useEffect for state — reinforced in multiple sections

**Structure Alignment:**
- Layout route (`_queue.tsx`) properly supports the shared Tabs + StatCard pattern for queue views
- Form components (`SpoolForm`, `FigureForm`) properly support Sheet/Drawer responsive pattern
- `init.ts` properly separated from `root.tsx` — clean separation of hydration logic from shell layout
- All boundaries respect the data access rules (components → store → db, never shortcuts)

### Persistence Write Granularity

The subscribe callback writes **only the changed store**, not the full state. Uses reference equality (O(1)) since Zustand mutations create new Map references:

```ts
// _persist flag lives OUTSIDE the store as a module-level variable
// to avoid triggering React re-renders when toggled
let _persist = true

store.subscribe((state, prevState) => {
  if (!_persist) return
  if (state.spools !== prevState.spools) db.writeStore('spools', state.spools)
  if (state.figures !== prevState.figures) db.writeStore('figures', state.figures)
  if (state.queueItems !== prevState.queueItems) db.writeStore('queueItems', state.queueItems)
})
```

**`db.writeStore` implementation:** Opens a single idb transaction and `put()`s each entry from the Map. At 30 items max, this completes in <50ms. Writes the full store contents per transaction — not a per-entity diff at the IndexedDB level.

**`_persist` flag location:** Module-level variable in `store.ts`, NOT in the Zustand store state. This keeps the store purely about entity data and avoids triggering React re-renders when the flag toggles during hydration/import.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (42/42):**

| FR Range | Coverage | Architectural Support |
|----------|---------|----------------------|
| FR1-FR5 (Spool CRUD) | ✅ Full | `routes/spools.tsx` + `SpoolForm.tsx` + `HexColorPicker.tsx` + store mutations |
| FR6-FR13 (Figure Catalog) | ✅ Full | `routes/catalog.tsx` + `FigureForm.tsx` + store mutations + `derived.ts` (affected items for FR42) |
| FR14-FR23 (Queue Management) | ✅ Full | `_queue.home.tsx` + `_queue.figures.tsx` + `ColorChip.tsx` + `QueueItemCard.tsx` + store mutations |
| FR24-FR29 (Color Planning) | ✅ Full | `_queue.home.tsx` + `_queue.tsx` (layout) + `derived.ts` (ranking) + `ColorRankingEntry.tsx` + `StatCard.tsx` |
| FR30-FR36 (Persistence) | ✅ Full | `db.ts` + `init.ts` + `export-import.ts` + store subscribe + `root.tsx` (Sonner toast) |
| FR37 (Navigation) | ✅ Full | `AppSidebar.tsx` + `root.tsx` + `routes.ts` |
| FR38-FR42 (Onboarding) | ✅ Full | `EmptyState.tsx` + all route views + `derived.ts` (affected items) |

**Non-Functional Requirements Coverage (11/11):**

| NFR | Coverage | How |
|-----|---------|-----|
| NFR1-2 (16ms recalculation) | ✅ | Derived during render as pure functions. Single loop ranking. Map-based O(1) lookups. React Compiler auto-memoizes |
| NFR3 (2s initial load) | ✅ | Bundle optimization (direct Lucide imports, auto code-split routes, dynamic react-colorful). Parallel IndexedDB hydration via Promise.all() |
| NFR4 (scale at 100/30/30) | ✅ | In-memory Maps, no virtualization needed at this scale. Single-loop ranking is O(n*m) where both are small |
| NFR5 (no spinners) | ✅ | Blocking hydration (<50ms). All mutations update in-memory state instantly. IndexedDB writes are invisible |
| NFR6-7 (persist every mutation) | ✅ | Zustand subscribe callback with reference equality diffing — only changed store written. Sonner toast with retry on failure |
| NFR8-9 (export complete, import atomic) | ✅ | toJSON/fromJSON helpers. db.replaceAll() uses single idb transaction — rolls back on failure |
| NFR10 (crash recovery) | ✅ | Error boundaries. IndexedDB persists across crashes. init.ts re-hydrates on next load |
| NFR11 (in-memory truth) | ✅ | Zustand store is source of truth. IndexedDB never read after hydration. Derived state computed from memory |

### Implementation Readiness Validation ✅

**Decision Completeness:**
- All critical decisions documented with specific versions ✅
- Implementation patterns comprehensive (naming, structure, state, errors, forms, toasts) ✅
- Consistency rules explicit with enforcement guidelines and anti-patterns ✅
- Concrete examples: data flow diagrams, JSON export format, state architecture pattern, subscribe callback code ✅

**Structure Completeness:**
- Full file tree with every file and directory ✅
- All integration points specified in boundary diagram ✅
- Component boundaries clearly defined with data access rules ✅
- FR-to-file mapping complete for all 42 FRs ✅

**Pattern Completeness:**
- All potential conflict points identified (12 areas, 5 categories) ✅
- Naming conventions comprehensive (stores, entities, components, functions, routes) ✅
- State management patterns specified (store rules, selector patterns, immutability rules) ✅
- Process patterns complete (error handling, no-loading-states, toast rules, form patterns) ✅

### Testing Strategy (Refined)

**Subscribe callback persistence tests** (in `store.test.ts` or `persistence.test.ts`):
- Toggle a chip → verify only `queueItems` store is written (not spools or figures)
- Create a spool → verify only `spools` store is written
- Set `_persist = false` → mutate → verify no write happens
- Import flow → verify `db.replaceAll()` is called, not individual writes

**Test factory pattern** (in `test-utils.ts`):
Builder functions that create valid entities with sensible defaults and optional overrides:
```ts
createSpool({ name: 'Red PLA' })     // fills in id, hex with defaults
createFigure({ name: 'Naruto' })     // fills in id, franchise, size, colors
createQueueItem({ figureId: '...' }) // fills in id, type, completedColors
```

### Gap Analysis Results

**Critical Gaps:** 0
**Important Gaps:** 0 (Zustand version pinned to v5.0.12, `_persist` moved to module-level)
**Nice-to-Have Gaps:** 2 (routes.ts layout config syntax, AppSidebar active route highlighting — both standard React Router patterns)

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (42 FRs, 11 NFRs, UX spec)
- [x] Scale and complexity assessed (medium, 100/30/30 ceiling)
- [x] Technical constraints identified (React Compiler, minimal useEffect, no backend)
- [x] Cross-cutting concerns mapped (8 concerns)
- [x] Vercel React best practices cross-referenced (57 rules, 25 applicable)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions (idb 8.0.3, Zustand 5.0.12, Vitest 4.1.1, react-colorful 5.6.1)
- [x] Technology stack fully specified
- [x] State architecture pattern defined (Zustand + Maps + derived during render)
- [x] Persistence pattern defined (module-level _persist flag, subscribe with reference equality diff, atomic import)
- [x] Performance considerations addressed (single-frame rendering, bundle optimization, parallel hydration)

**✅ Implementation Patterns**
- [x] Naming conventions established (12 conflict areas covered)
- [x] Structure patterns defined (file organization, test location, import ordering)
- [x] State management patterns specified (store rules, selectors, immutability)
- [x] Process patterns documented (errors, no-loading-states, toasts, forms)
- [x] Enforcement guidelines with anti-patterns listed

**✅ Project Structure**
- [x] Complete directory structure defined (every file named)
- [x] Component boundaries established (diagram with data access rules)
- [x] Integration points mapped (data flow for all 7 key operations)
- [x] Requirements to structure mapping complete (all 42 FRs → specific files)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — all FRs and NFRs have explicit architectural support, all technology choices are verified compatible, and implementation patterns are comprehensive enough to prevent agent conflicts.

**Key Strengths:**
- Derived-during-render pattern is both architecturally mandated (NFR1) and Vercel best-practice aligned — no risk of stale state
- Clean data flow: components → Zustand → idb, with explicit rules about who touches what
- Module-level `_persist` flag + reference equality subscribe callback — elegant, performant, no React re-render overhead
- Map-based entity stores provide O(1) lookups while maintaining React immutability via `new Map()`
- Pure derived functions are independently testable without rendering
- Layout route for queue views eliminates duplication and makes the view toggle route-aware
- Subscribe callback persistence tests cover the critical Zustand → IndexedDB bridge

**Areas for Future Enhancement:**
- Keyboard shortcuts for power users (post-MVP, per UX spec)
- Phase 2 color overrides will require evolving the queue item data model
- Performance profiling at scale if catalog grows beyond 100 figures
- Zustand devtools integration for debugging (requires Map → object serialization)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries — especially data access rules
- Derive state during render using pure functions from `derived.ts` — never store or useEffect
- Use Zustand v5 API — reference v5 docs, not v4 tutorials
- Refer to this document for all architectural questions

**First Implementation Priority:**
Install remaining dependencies (`idb`, `zustand`, `react-colorful`, `vitest`, `@testing-library/react`, `fake-indexeddb`), then build the data model + persistence layer (`lib/types.ts`, `lib/store.ts`, `lib/db.ts`, `lib/init.ts`) — this is the foundation everything else depends on.
