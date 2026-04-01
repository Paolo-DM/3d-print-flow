---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - 'prd.md'
  - 'architecture.md'
  - 'ux-design-specification.md'
---

# 3d-print-flow - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for 3d-print-flow, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: User can create a new filament spool with a name and hex color value
- FR2: User can view all spools in a visual library showing each spool's name and color preview
- FR3: User can edit an existing spool's name and hex color
- FR4: User can delete a spool only if not referenced by any figure; system shows which figures reference it if blocked
- FR5: User can select a color using a hex color picker when creating or editing a spool
- FR6: User can create a new figure with name, franchise tag, size (% of original, default 60%), notes, and required colors (spool references)
- FR7: User can view all figures in a catalog list
- FR8: User can edit an existing figure's name, franchise, size, notes, and assigned colors
- FR9: User can delete a figure; deletion also removes all queue items referencing it, with confirmation showing impact
- FR10: User can assign one or more spools as required colors (deduplicated)
- FR11: User can remove a spool assignment from a figure
- FR12: User can create a figure with zero colors
- FR13: Editing a catalog figure's colors propagates to all queued instances in real-time (live binding)
- FR14: User can add a figure from the catalog to the print queue
- FR15: When adding to queue, user can mark the item as stock or order
- FR16: Queue items inherit their color set from the catalog figure via live binding
- FR17: User can toggle a color chip on a queue item to mark that color as printed
- FR18: User can un-toggle a previously completed color chip (reversible, no confirmation)
- FR19: Each queue item displays a progress indicator showing completed vs. total colors
- FR20: When all color chips are complete, item moves to completed section
- FR21: User can view all completed figures in a collapsible archive section
- FR22: User can re-queue a completed figure with one action ("print again"), resetting all chips using catalog's current colors
- FR23: User can remove a queue item from the queue (with confirmation)
- FR24: Home/default view displays ranked list of filament colors sorted by count of queued figures with incomplete chips
- FR25: Order-flagged queue items surface above stock items within color ranking
- FR26: Selecting a color reveals all queued figures with an incomplete chip for that color
- FR27: Color ranking recalculates immediately on every chip toggle, un-toggle, queue addition, or removal
- FR28: User can switch between Color view (home/default) and Figure view
- FR29: Figure view displays all queued figures with their color chip progress
- FR30: Every data mutation auto-saves to persistent local storage
- FR31: User can export all app data as a single JSON file
- FR32: Export action is always visible in the app interface
- FR33: User can import a JSON file to restore all app data
- FR34: Import replaces all current data (full overwrite) with confirmation modal
- FR35: User sees all previous data immediately upon opening the app
- FR36: If persistence fails, a non-blocking toast notifies the user with retry action
- FR37: User can navigate between all major sections from a persistent navigation element
- FR38: When no spools exist, contextual prompt guides user to create first spool
- FR39: When no figures exist, contextual prompt guides user to create first figure
- FR40: When queue is empty, contextual prompt guides user to add figures
- FR41: Empty state prompts provide direct action buttons
- FR42: When editing a catalog figure with active queue items, edit form shows count of affected items

### NonFunctional Requirements

- NFR1: Color ranking recalculates and renders within ~16ms after any chip toggle, queue addition, or removal
- NFR2: All local CRUD operations reflect in UI within a single animation frame
- NFR3: App initial load completes in under 2 seconds on modern laptop
- NFR4: App remains responsive with up to 100 figures, 30 spools, 30 active queue items
- NFR5: No operation displays a loading spinner — all local interactions are instant
- NFR6: Every data mutation triggers an IndexedDB write; no mutation silently lost
- NFR7: If an IndexedDB write fails, user is notified within 2 seconds
- NFR8: JSON export produces a file that restores exact state when imported
- NFR9: JSON import is atomic — all data replaced successfully or import fails with existing data unchanged
- NFR10: App recovers gracefully from crashes — all persisted data available on next load
- NFR11: In-memory state and IndexedDB state never diverge during normal operation

### Additional Requirements

- Starter template already initialized (React Router v7 framework template via `npx create-react-router@7.13.1`)
- idb v8.0.3 for IndexedDB wrapper — three stores: `spools`, `figures`, `queueItems`
- Zustand v5.0.12 for state management — `Map<string, Entity>` stores, module-level `_persist` flag, subscribe callback for IndexedDB writes
- react-colorful v5.6.1 for hex color picker — lazy-loaded via `React.lazy()`
- Vitest v4.1.1 + @testing-library/react + fake-indexeddb for testing
- crypto.randomUUID() for all entity IDs
- SSR enabled (`ssr: true`) — serves app shell, dark mode inline `<script>` prevents flash
- Derived state as pure functions in `derived.ts` — ranking, progress, completion, empty states — never stored, computed during render
- Persistence batching: `_persist = false` during hydration and import, `true` for normal mutations
- Subscribe callback writes only changed stores via reference equality check
- `db.replaceAll()` uses single idb transaction for atomic import
- Implementation sequence: data model + persistence → state management → derived functions → route views + components → CRUD forms → import/export → error boundaries → tests

### UX Design Requirements

- UX-DR1: ColorChip component — saturation-as-state encoding: pending (muted bg, dot at 40% opacity, muted text) vs. completed (spool hex bg, white dot at 35% opacity, computed contrast text). 100-200ms ease-out animation with scale 0.95-1.0. Min 44px height, pill shape, rounded-full
- UX-DR2: ColorChip visibility borders — light mode: dots with perceived lightness > 0.85 get border. Dark mode: perceived lightness < 0.15 get subtle border. Computed at render time
- UX-DR3: ColorChip "current" state — in Color View expansion, pending chip gets pulsing outline indicating "this is the color you're working on"
- UX-DR4: ColorRankingEntry component — ranked row: rank position (tabular-nums), 32px color swatch (dark mode subtle glow), spool name, figure count label, order badge (warm Badge variant), figure count number (text-2xl bold right-aligned), expandable via Collapsible
- UX-DR5: Figure completion cascade — chip fills (100-200ms) then card highlights briefly with subtle pulse (~500ms) then collapses out of list. Single-color figures chain animations sequentially. Respect prefers-reduced-motion
- UX-DR6: StatCard row — 4 summary cards above main content: Queued figures, Colors needed, Orders pending (warm color), Completed today (primary color). Values in text-2xl bold tabular-nums
- UX-DR7: Sidebar navigation — sidebar-07 pattern (collapsible to icons). Sections: Queue (Color View, Figure View), Library (Figure Catalog, Filament Spools), Archive (Completed). Export/Import always visible at bottom
- UX-DR8: Empty state progressive onboarding — context-aware CTAs using shadcn Empty component: no spools then "Add Your First Spool"; spools but no figures then "Create Your First Figure"; figures but empty queue then "Add a figure to the queue". Direct action buttons, no generic messages
- UX-DR9: Form containers — Sheet (side panel) on desktop, Drawer (bottom sheet) on mobile via useIsMobile() hook. shadcn Field components for form structure. No autosave, explicit Save button
- UX-DR10: Dark mode hydration — .dark class applied via inline script before React hydrates to prevent white flash
- UX-DR11: Neutral canvas, chromatic data — all UI chrome uses desaturated shadcn semantic tokens. Filament spool hex colors are the only saturated elements on screen
- UX-DR12: Responsive layout — 3 breakpoints: desktop (1024px+, full sidebar, grid layouts), md (768-1023px, sidebar collapses to icons, 2-column cards, 2x2 stat cards), sm (<768px, sidebar hidden/hamburger, single-column, Drawer replaces Sheet)
- UX-DR13: Tabular numeric display — all counts, fractions, and rankings use font-variant-numeric: tabular-nums for vertical alignment
- UX-DR14: Color contrast computation — auto-compute perceived lightness from spool hex to determine dark/light text on spool-colored backgrounds
- UX-DR15: Chip toggle ARIA — role="switch" or role="checkbox" with aria-checked state for accessibility
- UX-DR16: Order priority visual treatment — order-flagged figures always above stock within each color ranking entry. Order badge in warm color, stock badge in neutral muted
- UX-DR17: View-agnostic chip toggle — identical chip interaction mechanics in Color View, Figure View, or any context. Same animation, same cascade, same feedback
- UX-DR18: Within-run flow — expanded color view keeps all figures visible; user moves down list toggling chips without navigating away. No auto-rearranging views mid-interaction
- UX-DR19: HexColorPicker component — react-colorful wrapped in shadcn Popover with hex input field and color preview swatch. Lazy-loaded

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Create spool with name and hex color |
| FR2 | Epic 1 | View spool library |
| FR3 | Epic 1 | Edit spool name and hex color |
| FR4 | Epic 1 | Delete spool with referential guard |
| FR5 | Epic 1 | Hex color picker for spool CRUD |
| FR6 | Epic 2 | Create figure with name, franchise, size, notes, colors |
| FR7 | Epic 2 | View figure catalog |
| FR8 | Epic 2 | Edit figure details and colors |
| FR9 | Epic 2 | Delete figure with cascade and confirmation |
| FR10 | Epic 2 | Assign spools as required colors (deduplicated) |
| FR11 | Epic 2 | Remove spool assignment from figure |
| FR12 | Epic 2 | Create figure with zero colors |
| FR13 | Epic 2 | Catalog edit propagation to queue (live binding) |
| FR14 | Epic 3 | Add figure to queue from catalog |
| FR15 | Epic 3 | Stock/order flag on queue add |
| FR16 | Epic 3 | Queue items inherit colors via live binding |
| FR17 | Epic 3 | Toggle color chip to mark printed |
| FR18 | Epic 3 | Un-toggle chip (reversible, no confirmation) |
| FR19 | Epic 3 | Progress indicator (completed vs. total) |
| FR20 | Epic 3 | Completion flow — all chips done moves to completed |
| FR21 | Epic 3 | Completed section (collapsible archive) |
| FR22 | Epic 3 | Re-queue completed figure ("print again") |
| FR23 | Epic 3 | Remove queue item (with confirmation) |
| FR24 | Epic 3 | Color ranking — ranked by incomplete chip count |
| FR25 | Epic 3 | Orders surface above stock in ranking |
| FR26 | Epic 3 | Expand color to see all figures with incomplete chip |
| FR27 | Epic 3 | Ranking recalculates on every interaction |
| FR28 | Epic 3 | Switch between Color view and Figure view |
| FR29 | Epic 3 | Figure view with chip progress |
| FR30 | Epic 1 | Auto-save on every mutation |
| FR31 | Epic 4 | Export all data as JSON |
| FR32 | Epic 4 | Export always visible in interface |
| FR33 | Epic 4 | Import JSON to restore data |
| FR34 | Epic 4 | Import with full-replace confirmation modal |
| FR35 | Epic 1 | Data persists across sessions |
| FR36 | Epic 4 | Persistence failure toast with retry |
| FR37 | Epic 1 | Persistent navigation between sections |
| FR38 | Epic 1 | Empty state — no spools |
| FR39 | Epic 2 | Empty state — no figures |
| FR40 | Epic 3 | Empty state — empty queue |
| FR41 | Epic 1-3 | Empty state prompts with direct action buttons |
| FR42 | Epic 3 | Edit form shows affected queue item count |

## Epic List

### Epic 1: App Foundation & Spool Management
User can navigate the app with a persistent sidebar, manage filament spools (create, view, edit, delete with hex color picker), and all data persists automatically across sessions.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR30, FR35, FR37, FR38, FR41 (partial)

### Epic 2: Figure Catalog Management
User can build and maintain a figure catalog — create figures with name, franchise, size, notes, and assign colors from the spool library. Edit figures with live binding to queue. Delete figures with impact awareness.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR39, FR41 (partial)

### Epic 3: Print Queue & Color-First Production
User can add figures to the queue (stock or order), toggle color chips to track progress, view the color-first ranking, switch between Color and Figure views, complete figures, and re-queue from the completed archive. The full core production loop.
**FRs covered:** FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR40, FR41 (partial), FR42

### Epic 4: Data Portability & Error Resilience
User can export all data as a JSON backup with one click, import from a backup to restore full app state, and receive clear feedback if data persistence ever fails.
**FRs covered:** FR31, FR32, FR33, FR34, FR36

## Epic 1: App Foundation & Spool Management

User can navigate the app with a persistent sidebar, manage filament spools (create, view, edit, delete with hex color picker), and all data persists automatically across sessions.

### Story 1.1: Data Model, State Management & Persistence Layer

As a developer setting up the app,
I want the core data model, Zustand store, and IndexedDB persistence layer in place,
So that all future features have a reliable foundation for state management and data persistence.

**Acceptance Criteria:**

**Given** the app codebase with React Router v7 starter template
**When** dependencies are installed (idb, zustand, react-colorful, vitest, @testing-library/react, fake-indexeddb)
**Then** all packages are available and the app builds successfully

**Given** the lib directory structure
**When** entity types are defined in `app/lib/types.ts`
**Then** `Spool`, `Figure`, and `QueueItem` interfaces exist with all fields per architecture spec (Spool: id, name, hex; Figure: id, name, franchise, size, notes, requiredColors; QueueItem: id, figureId, type, completedColors)

**Given** the Zustand store in `app/lib/store.ts`
**When** the store is initialized
**Then** it contains `spools`, `figures`, and `queueItems` as `Map<string, Entity>` with CRUD mutations for spools (createSpool, updateSpool, deleteSpool)

**Given** the IndexedDB persistence layer in `app/lib/db.ts`
**When** the app starts for the first time
**Then** the database is created with three object stores (`spools`, `figures`, `queueItems`) using idb with schema versioning

**Given** the hydration module in `app/lib/init.ts`
**When** the app loads
**Then** all three IndexedDB stores are read via `Promise.all()`, Maps are populated in Zustand with `_persist = false`, and `_persist` is set to `true` after hydration completes

**Given** the Zustand subscribe callback
**When** any spool mutation occurs with `_persist = true`
**Then** only the changed store is written to IndexedDB via reference equality check

**Given** the color utilities in `app/lib/color-utils.ts`
**When** a hex color value is provided
**Then** `getPerceivedLightness()` returns a 0-1 value and `hexToContrast()` returns appropriate dark/light text color

**Given** the test setup
**When** store mutation tests and persistence integration tests run
**Then** all tests pass using fake-indexeddb for IndexedDB simulation

### Story 1.2: App Shell, Sidebar Navigation & Dark Mode

As a user,
I want a persistent sidebar for navigating between app sections and automatic dark mode support,
So that I can move between all areas of the app and use it comfortably in any lighting condition.

**Acceptance Criteria:**

**Given** the app is opened in a browser
**When** the page loads
**Then** the app shell renders with a sidebar (sidebar-07 pattern) containing navigation sections: Queue (Color View, Figure View), Library (Figure Catalog, Filament Spools), Archive (Completed), and placeholders for Export/Import at the bottom

**Given** the sidebar is visible on desktop (1024px+)
**When** the viewport is resized to md (768-1023px)
**Then** the sidebar collapses to icon-only mode

**Given** the viewport is below 768px (sm)
**When** the user views the app on mobile
**Then** the sidebar is hidden behind a hamburger trigger

**Given** the user has dark mode as their system preference
**When** the app loads via SSR
**Then** the `.dark` class is applied via inline `<script>` before React hydrates, preventing any flash of light mode

**Given** any navigation item in the sidebar
**When** the user clicks it
**Then** the corresponding route loads in the main content area and the active item is highlighted

**Given** the app shell layout
**When** rendered on any viewport
**Then** all UI chrome uses desaturated shadcn semantic tokens (neutral canvas principle)

**Given** route configuration in `app/routes.ts`
**When** routes are defined
**Then** all route files exist as stubs (`_queue.tsx`, `_queue.home.tsx`, `_queue.figures.tsx`, `catalog.tsx`, `spools.tsx`, `completed.tsx`) rendering placeholder content

### Story 1.3: Spool Library View & Empty State

As a user opening the Filament Spools section,
I want to see my spool library or be guided to create my first spool,
So that I can start building my filament collection.

**Acceptance Criteria:**

**Given** no spools exist in the store
**When** the user navigates to the Filament Spools section
**Then** an empty state is displayed using shadcn Empty component with icon, title "No Spools Yet", description, and a primary "Add Your First Spool" action button

**Given** spools exist in the store
**When** the user navigates to the Filament Spools section
**Then** all spools are displayed in a visual library, each showing the spool's name and a color preview swatch of its hex color

**Given** the spool library view
**When** rendered on desktop
**Then** spools are displayed in a card grid layout with comfortable spacing

**Given** the spool library view on mobile (<768px)
**When** the layout adapts
**Then** spool cards stack in a single column with tighter spacing

**Given** a spool with a near-white hex color (perceived lightness > 0.85) in light mode
**When** the spool color preview is rendered
**Then** a subtle border is applied so the swatch remains visible against the background

### Story 1.4: Create & Edit Spool with Hex Color Picker

As a user,
I want to create new spools and edit existing ones with a visual color picker,
So that I can build and maintain my filament library with accurate color representation.

**Acceptance Criteria:**

**Given** the user clicks "Add Spool" (or the empty state CTA)
**When** the create form opens
**Then** a Sheet appears on desktop or Drawer on mobile containing a form with Name input and HexColorPicker (react-colorful in Popover with hex input field and color preview swatch), using shadcn Field components

**Given** the user fills in a spool name and selects a hex color
**When** the user clicks "Save"
**Then** a new spool is created with `crypto.randomUUID()` as ID, added to the Zustand store, auto-saved to IndexedDB, and appears in the spool library

**Given** the user clicks edit on an existing spool
**When** the edit form opens
**Then** the form is pre-populated with the spool's current name and hex color

**Given** the user modifies the name or color of an existing spool
**When** the user clicks "Save"
**Then** the spool is updated in the store, persisted to IndexedDB, and the library view reflects the changes immediately

**Given** the user opens the create or edit form
**When** the user clicks "Cancel"
**Then** the form closes with no changes saved and no confirmation prompt

**Given** the HexColorPicker component
**When** it mounts for the first time
**Then** react-colorful is lazy-loaded via `React.lazy()` — not included in the initial bundle

### Story 1.5: Delete Spool with Referential Guard

As a user,
I want to delete spools I no longer use while being protected from breaking my figure catalog,
So that my spool library stays clean without accidentally orphaning figures.

**Acceptance Criteria:**

**Given** the user clicks delete on a spool that is NOT referenced by any figure
**When** the confirmation Dialog appears
**Then** it shows the spool name and a message confirming no figures use this spool, with Cancel and Delete (destructive) buttons

**Given** the user confirms deletion of an unreferenced spool
**When** the delete executes
**Then** the spool is removed from the Zustand store, removed from IndexedDB, and disappears from the library view

**Given** the user clicks delete on a spool that IS referenced by one or more figures
**When** the Dialog appears
**Then** it shows "Cannot delete — used by: [list of figure names]" and only a Close/Cancel button (no delete option)

## Epic 2: Figure Catalog Management

User can build and maintain a figure catalog — create figures with name, franchise, size, notes, and assign colors from the spool library. Edit figures with live binding to queue. Delete figures with impact awareness.

### Story 2.1: Figure Catalog View & Empty State

As a user opening the Figure Catalog,
I want to see my figure collection or be guided to create my first figure,
So that I can start building my catalog of printable designs.

**Acceptance Criteria:**

**Given** no figures exist in the store
**When** the user navigates to the Figure Catalog
**Then** an empty state is displayed using shadcn Empty component with icon, title, description contextually aware of spool state ("Great, you have X spools! Create Your First Figure" if spools exist), and a primary "Add Figure" action button

**Given** figures exist in the store
**When** the user navigates to the Figure Catalog
**Then** all figures are displayed in a catalog list, each showing the figure name, franchise tag, size, and color chip previews (small swatches of assigned spool colors with spool names)

**Given** a figure with zero assigned colors
**When** it is displayed in the catalog
**Then** the color section shows a muted indicator like "No colors assigned" instead of an empty area

**Given** the catalog view on desktop
**When** rendered
**Then** figures are displayed in a card grid with comfortable spacing

**Given** the catalog view on mobile (<768px)
**When** the layout adapts
**Then** figure cards stack in a single column

### Story 2.2: Create & Edit Figure with Color Assignment

As a user,
I want to create new figures and edit existing ones, assigning colors from my spool library,
So that I can define what each figure needs for printing.

**Acceptance Criteria:**

**Given** the user clicks "Add Figure" (or the empty state CTA)
**When** the create form opens
**Then** a Sheet (desktop) or Drawer (mobile) appears with fields: Name (required), Franchise tag (optional), Size (numeric, default 60%), Notes (optional textarea), and a color assignment section showing all available spools as selectable items (swatch + name)

**Given** the color assignment section
**When** the user toggles spools to assign colors
**Then** selected spools are highlighted, and deselecting removes the assignment; each spool can only be assigned once (deduplicated)

**Given** the user fills in figure details and optionally assigns colors
**When** the user clicks "Save"
**Then** a new figure is created with `crypto.randomUUID()` as ID, the assigned spool IDs stored in `requiredColors`, persisted to IndexedDB, and appears in the catalog

**Given** a figure can be created with zero colors
**When** the user saves a figure without selecting any spools
**Then** the figure is created successfully with an empty `requiredColors` array

**Given** the user clicks edit on an existing figure
**When** the edit form opens
**Then** all fields are pre-populated with the figure's current values, and the color assignment shows currently assigned spools as selected

**Given** the user modifies any field or color assignment on an existing figure
**When** the user clicks "Save"
**Then** the figure is updated in the store and persisted to IndexedDB; the catalog view reflects changes immediately

**Given** the user removes a spool from a figure's color assignment
**When** they deselect a previously selected spool and save
**Then** the spool ID is removed from the figure's `requiredColors` array

### Story 2.3: Delete Figure with Cascade Confirmation

As a user,
I want to delete figures I no longer need while understanding the impact on my print queue,
So that I can keep my catalog clean without accidentally losing queue progress.

**Acceptance Criteria:**

**Given** the user clicks delete on a figure that has NO active queue items
**When** the confirmation Dialog appears
**Then** it shows the figure name and confirms there are no queue items affected, with Cancel and Delete (destructive) buttons

**Given** the user clicks delete on a figure that HAS active queue items
**When** the confirmation Dialog appears
**Then** it shows "Deleting this figure will also remove X queue item(s)" listing the affected items, with Cancel and Delete (destructive) buttons

**Given** the user confirms deletion of a figure with active queue items
**When** the delete executes
**Then** the figure is removed from the store, all queue items referencing it are also removed, both changes are persisted to IndexedDB, and the catalog and queue views update immediately

**Given** the user cancels the deletion
**When** they click Cancel
**Then** the Dialog closes with no changes

### Story 2.4: Catalog-to-Queue Live Binding

As a user,
I want edits to my catalog figures to automatically update any queued instances,
So that I never have stale color information in my print queue.

**Acceptance Criteria:**

**Given** a figure is in the catalog AND has one or more active queue items
**When** the user adds a new spool to the figure's `requiredColors` and saves
**Then** all queued instances of that figure immediately show the new color chip (derived from the updated catalog figure at render time), and queue progress recalculates (e.g., 3/5 becomes 3/6)

**Given** a figure has active queue items and a color chip was already marked complete
**When** the user removes that spool from the figure's `requiredColors` and saves
**Then** the queued instances no longer show that color chip, the `completedColors` entry for the removed spool becomes irrelevant, and progress recalculates

**Given** the live binding architecture
**When** any catalog figure edit is saved
**Then** no manual sync or queue item update is needed — queue views derive color chips from the catalog figure's current `requiredColors` at render time

**Given** the derived function `computeAffectedQueueItems(figureId, queueItems)`
**When** called with a figure ID
**Then** it returns the count and list of queue items referencing that figure (used by FR42 in Epic 3)

## Epic 3: Print Queue & Color-First Production

User can add figures to the queue (stock or order), toggle color chips to track progress, view the color-first ranking, switch between Color and Figure views, complete figures, and re-queue from the completed archive. The full core production loop.

### Story 3.1: Add to Queue & Queue Store Mutations

As a user,
I want to add figures from my catalog to the print queue as stock or order items,
So that I can start tracking what needs to be printed.

**Acceptance Criteria:**

**Given** the user is in the Figure Catalog and clicks "Add to Queue" on a figure
**When** the add-to-queue action is triggered
**Then** a prompt or toggle allows the user to select Stock or Order type before confirming

**Given** the user confirms adding a figure to the queue
**When** the queue item is created
**Then** a new QueueItem is added to the Zustand store with `crypto.randomUUID()` ID, the figure's ID as `figureId`, selected type (stock/order), empty `completedColors` array, and is persisted to IndexedDB

**Given** a figure is already in the queue
**When** the user adds the same figure again
**Then** a second, independent queue item is created (multiple instances of the same figure are allowed)

**Given** the Zustand store
**When** queue mutations are defined
**Then** `addToQueue`, `removeFromQueue`, `toggleChip`, and `requeueCompleted` mutations exist and work correctly

**Given** the derived state module `app/lib/derived.ts`
**When** derived functions are implemented
**Then** `computeColorRanking(spools, figures, queueItems)`, `computeFigureProgress(queueItem, figure)`, and `computeCompletionStatus(queueItem, figure)` exist as pure functions, tested with unit tests

### Story 3.2: Color View — Ranked Color List & Expandable Figure Lists

As a user,
I want to see a ranked list of filament colors showing which spool has the most queued figures waiting,
So that I can instantly decide which spool to load next.

**Acceptance Criteria:**

**Given** queue items exist with incomplete color chips
**When** the user views the Color View (home/default route)
**Then** a ranked list of filament colors is displayed, sorted descending by the count of queued figures with incomplete chips for each color

**Given** the Color View
**When** rendered
**Then** each ColorRankingEntry shows: rank position (tabular-nums), 32px color swatch (spool hex), spool name, figure count label, figure count number (text-2xl bold right-aligned), and an order badge if any order-flagged items need that color

**Given** order-flagged queue items exist alongside stock items
**When** the ranking is displayed
**Then** within each color entry, order-flagged figures appear above stock figures in the expandable list

**Given** a color entry in the ranking
**When** the user clicks/taps to expand it
**Then** a Collapsible section reveals all queued figures with an incomplete chip for that color, showing each figure's name, franchise, all color chips (with the current color's chip highlighted via pulsing outline), and progress bar

**Given** the expanded figure list for a color
**When** a figure has already completed that color
**Then** it does NOT appear in the list (filtered to actionable items only)

**Given** the queue is empty
**When** the user views the Color View
**Then** an empty state is displayed with contextual CTA guiding them to add figures to the queue (aware of whether spools/figures exist)

**Given** dark mode is active
**When** color swatches are rendered
**Then** swatches display with a subtle glow effect

### Story 3.3: ColorChip Toggle — The Signature Interaction

As a user,
I want to tap a color chip to mark it as printed and see instant visual feedback,
So that I can track my printing progress with a satisfying, reliable interaction.

**Acceptance Criteria:**

**Given** a pending (incomplete) color chip on a queued figure
**When** the user clicks/taps the chip
**Then** the chip transitions from pending state (muted bg, dot at 40% opacity, muted text) to completed state (spool hex bg, white dot at 35% opacity, computed contrast text) with a 100-200ms ease-out animation including scale 0.95→1.0

**Given** a completed color chip
**When** the user clicks/taps the chip
**Then** the chip transitions back to pending state with the same animation (true toggle, no confirmation)

**Given** the chip toggle fires
**When** one state mutation occurs
**Then** the chip visual, the figure's progress bar, and the color ranking count all update in a single React render cycle within ~16ms

**Given** the ColorChip component
**When** rendered
**Then** it meets minimum 44px height, uses pill shape (rounded-full), and has `role="switch"` with `aria-checked` state

**Given** a chip in the expanded Color View for the current color
**When** the chip is in pending state
**Then** it displays a pulsing outline indicating "this is the color you're working on"

**Given** chip toggle in Color View or Figure View
**When** the interaction occurs
**Then** the behavior is identical — same animation, same cascade, same feedback (view-agnostic)

**Given** near-white spool color in light mode or near-black in dark mode
**When** the chip dot is rendered
**Then** a conditional visibility border is applied based on perceived lightness thresholds (>0.85 light mode, <0.15 dark mode)

### Story 3.4: Figure View — Queue as Figure Cards

As a user,
I want to see my print queue organized by figure with all color chips and progress visible,
So that I can check on individual figure status and toggle chips from a figure-centric perspective.

**Acceptance Criteria:**

**Given** queue items exist
**When** the user switches to the Figure View via the Tabs toggle
**Then** all queued figures are displayed as cards (QueueItemCard), each showing: figure name, franchise tag, order/stock badge, all color chips (using ColorChip component), and a progress bar with numeric fraction (e.g., 3/6)

**Given** the queue layout route `_queue.tsx`
**When** rendered
**Then** it displays a StatCard row (4 cards: Queued figures, Colors needed, Orders pending in warm color, Completed today in primary color) and a Tabs toggle (Color View / Figure View) above the `<Outlet />`

**Given** the Tabs toggle
**When** the user switches between Color View and Figure View
**Then** navigation occurs via React Router URL change (/ and /figures), the active tab reflects the current route, and the same queue data is displayed in a different layout

**Given** the Figure View on desktop
**When** rendered
**Then** figure cards display in a 2-3 column grid

**Given** the Figure View on mobile
**When** the layout adapts
**Then** figure cards stack in a single column

**Given** all numeric displays (stat cards, progress fractions, ranking counts)
**When** rendered
**Then** they use `font-variant-numeric: tabular-nums` for vertical alignment

### Story 3.5: Figure Completion, Cascade & Completed Section

As a user,
I want figures to automatically complete when all colors are done and move to an archive I can browse,
So that finished work is tracked and the queue stays focused on what's left.

**Acceptance Criteria:**

**Given** a queued figure with one remaining incomplete color chip
**When** the user toggles that last chip to complete
**Then** the chip fill animation plays (100-200ms), then the card briefly highlights with a subtle pulse (~500ms), then the card smoothly collapses out of the active queue list

**Given** a single-color figure (only one chip)
**When** the user toggles that chip
**Then** the chip animation completes first, then the completion animation chains sequentially (not simultaneous)

**Given** `prefers-reduced-motion` is enabled
**When** a figure completes
**Then** the completion cascade applies instant state change instead of animations

**Given** the Completed section route
**When** the user navigates to it
**Then** all completed queue items are displayed in a collapsible archive showing figure name, franchise, all chips (all filled), and completion status

**Given** a completed figure in the archive
**When** the user clicks "Print Again"
**Then** a new queue item is created for that figure using the catalog's current `requiredColors` (not the colors at time of completion), all chips reset to incomplete, and it appears in the active queue and color ranking immediately

**Given** the user clicks remove on an active queue item
**When** the confirmation Dialog appears
**Then** it shows the figure name and confirms removal, with Cancel and Remove (destructive) buttons; confirming removes the item from the store and IndexedDB

### Story 3.6: Order Priority in Color Ranking

As a user fulfilling customer orders,
I want order-flagged figures to always appear before stock items in the color ranking,
So that I prioritize customer orders during every color run.

**Acceptance Criteria:**

**Given** the color ranking computation
**When** both order and stock queue items need the same color
**Then** order-flagged items appear above stock items within that color's expanded figure list

**Given** a color entry in the ranking
**When** it contains order-flagged items
**Then** an order badge (warm Badge variant) is displayed on the ranking entry indicating orders are present

**Given** the ranking sort algorithm
**When** computing the ranked list
**Then** the overall color sort is by total incomplete count (orders + stock), but within each color's figure list, orders sort above stock; within each tier, figures are unsorted (stable order)

**Given** the Figure View
**When** displaying queue items
**Then** order items show a warm-colored order Badge and stock items show a neutral muted Badge

### Story 3.7: Edit Form Affected Queue Items Warning

As a user editing a catalog figure,
I want to see how many queued items will be affected before I save,
So that I make informed decisions about catalog changes that impact my active queue.

**Acceptance Criteria:**

**Given** the user opens the edit form for a figure that has active queue items
**When** the form renders
**Then** a message above the Save button displays "Saving will update X queued item(s)" using `computeAffectedQueueItems()`

**Given** the user opens the edit form for a figure with NO active queue items
**When** the form renders
**Then** no affected items warning is shown

**Given** the affected count display
**When** rendered
**Then** it uses a non-alarming style (informational, not destructive) since the propagation is a feature, not a risk

## Epic 4: Data Portability & Error Resilience

User can export all data as a JSON backup with one click, import from a backup to restore full app state, and receive clear feedback if data persistence ever fails.

### Story 4.1: JSON Export

As a user,
I want to export all my data as a single JSON file with one click,
So that I have a complete backup I can use to restore my data if anything goes wrong.

**Acceptance Criteria:**

**Given** the Export action in the sidebar
**When** the user clicks it
**Then** a JSON file is downloaded containing all spools, figures, queue items (with chip progress), a version field (integer), and an exportedAt timestamp (ISO 8601 UTC)

**Given** the JSON export format
**When** the file is generated
**Then** all `Map<string, Entity>` stores are serialized to `Record<string, Entity>` via `toJSON()` helper, producing a complete snapshot of all app data

**Given** the Export button
**When** viewed in the sidebar at any time
**Then** it is always visible and accessible — not buried in settings or behind a menu

**Given** the export completes
**When** the browser downloads the file
**Then** no success toast is shown — the download itself is the confirmation

### Story 4.2: JSON Import with Atomic Replace

As a user,
I want to import a previously exported JSON file to restore all my data,
So that I can recover from data loss or transfer data to a new device.

**Acceptance Criteria:**

**Given** the Import action in the sidebar
**When** the user clicks it
**Then** a file picker opens allowing selection of a JSON file

**Given** the user selects a valid JSON file
**When** the file is loaded
**Then** a confirmation Dialog appears with the warning "This will replace ALL current data with the imported file. This action cannot be undone." with Cancel and Confirm buttons

**Given** the user confirms the import
**When** the import executes
**Then** `_persist` is set to false, all three Maps in the Zustand store are replaced with parsed data via `fromJSON()`, `db.replaceAll()` writes all data in a single idb transaction (atomic), `_persist` is set to true, and the app re-renders with the imported state

**Given** the import transaction fails at any point
**When** an error occurs during `db.replaceAll()`
**Then** the transaction rolls back, existing data in IndexedDB remains unchanged, the Dialog stays open with an error message, and no store state is corrupted

**Given** the user selects an invalid or malformed JSON file
**When** parsing fails
**Then** the Dialog shows an error message and existing data remains untouched

**Given** the user clicks Cancel on the confirmation Dialog
**When** the Dialog closes
**Then** no changes are made to any data

### Story 4.3: Persistence Failure Notification with Retry

As a user,
I want to be notified if my data fails to save and have a way to retry,
So that I never silently lose work.

**Acceptance Criteria:**

**Given** an IndexedDB write fails during the Zustand subscribe callback
**When** the error is caught
**Then** a Sonner toast appears within 2 seconds with the message "Changes saved in memory but not persisted" and a "Retry" action button

**Given** the persistence failure toast is visible
**When** the user clicks "Retry"
**Then** the failed write is attempted again; on success the toast dismisses, on failure it remains

**Given** the persistence failure toast
**When** displayed
**Then** it is non-blocking — the user can continue interacting with the app since in-memory state is the source of truth

**Given** normal app operation
**When** every mutation succeeds in persisting to IndexedDB
**Then** no toast is shown — no success toasts for normal operations
