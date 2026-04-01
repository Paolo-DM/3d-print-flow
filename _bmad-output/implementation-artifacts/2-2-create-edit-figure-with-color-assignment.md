# Story 2.2: Create & Edit Figure with Color Assignment

Status: done

## Story

As a user,
I want to create new figures and edit existing ones, assigning colors from my spool library,
so that I can define what each figure needs for printing.

## Acceptance Criteria

1. **Given** the user clicks "Add Figure" (header button or empty state CTA), **When** the create form opens, **Then** a Sheet (desktop) or Drawer (mobile) appears with fields: Name (required), Franchise tag (optional), Size (numeric, default 60%), Notes (optional textarea), and a color assignment section showing all available spools as selectable items (swatch + name).

2. **Given** the color assignment section, **When** the user toggles spools to assign colors, **Then** selected spools are highlighted, and deselecting removes the assignment; each spool can only be assigned once (deduplicated via toggle).

3. **Given** the user fills in figure details and optionally assigns colors, **When** the user clicks "Save", **Then** a new figure is created with `crypto.randomUUID()` as ID, the assigned spool IDs stored in `requiredColors`, persisted to IndexedDB via store subscription, and appears in the catalog immediately.

4. **Given** a figure can be created with zero colors, **When** the user saves a figure without selecting any spools, **Then** the figure is created successfully with an empty `requiredColors` array.

5. **Given** the user clicks edit on an existing figure, **When** the edit form opens, **Then** all fields are pre-populated with the figure's current values, and the color assignment shows currently assigned spools as selected.

6. **Given** the user modifies any field or color assignment on an existing figure, **When** the user clicks "Save", **Then** the figure is updated in the store and persisted to IndexedDB; the catalog view reflects changes immediately.

7. **Given** the user removes a spool from a figure's color assignment, **When** they deselect a previously selected spool and save, **Then** the spool ID is removed from the figure's `requiredColors` array.

## Tasks / Subtasks

- [x] Task 0: Install shadcn textarea component (prerequisite)
  - [x] 0.1 Run `npx shadcn@latest add textarea` to generate `app/components/ui/textarea.tsx`

- [x] Task 1: Add figure mutations to store (AC: 3, 4, 6, 7)
  - [x] 1.1 Add `createFigure` mutation to `PrintFlowState` interface and store: `(data: Omit<Figure, "id">) => void`
  - [x] 1.2 Add `updateFigure` mutation to `PrintFlowState` interface and store: `(id: string, updates: Partial<Omit<Figure, "id">>) => void`
  - [x] 1.3 Follow exact same pattern as `createSpool`/`updateSpool` — `crypto.randomUUID()` for ID, functional `set()`, new Map copy
  - [x] 1.4 Write store tests: createFigure adds to figures Map, updateFigure modifies existing figure, updateFigure no-ops on missing ID

- [x] Task 2: Create FigureForm component (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 2.1 Create `app/components/FigureForm.tsx` with props: `figure?: Figure`, `onSave: () => void`, `onCancel: () => void`
  - [x] 2.2 Form state via `useState`: `name` (string), `franchise` (string), `size` (number, default 60), `notes` (string), `selectedColors` (string[] of spool IDs)
  - [x] 2.3 Use shadcn `FieldGroup` + `Field` + `FieldLabel` + `Input` for Name, Franchise, Size fields — follow SpoolForm pattern
  - [x] 2.4 Use shadcn `Textarea` for Notes field (import from `~/components/ui/textarea`)
  - [x] 2.5 Size field: `type="number"`, `min={1}`, `max={999}`, display as percentage context
  - [x] 2.6 Color assignment section: render all available spools (from store) as toggleable items — spool swatch circle + spool name; selected spools get visual highlight (e.g., `bg-accent` + `ring-2 ring-ring`); clicking toggles selection
  - [x] 2.7 Each spool item: `button` with `type="button"`, inline `backgroundColor: spool.hex` for swatch, spool name text, aria-pressed for accessibility
  - [x] 2.8 Swatch visibility border: apply same `getPerceivedLightness` border pattern as SpoolCard/FigureCard
  - [x] 2.9 Validation: `name.trim().length > 0` required for Save to be enabled; all other fields optional
  - [x] 2.10 On save: call `createFigure` or `updateFigure` (based on whether `figure` prop exists), then call `onSave()`
  - [x] 2.11 Pre-populate all fields when `figure` prop is provided (edit mode), including `selectedColors` from `figure.requiredColors`
  - [x] 2.12 Prevent double-submit with `saved` boolean state (same pattern as SpoolForm)
  - [x] 2.13 Wrap in `<form onSubmit={handleSubmit}>` with `e.preventDefault()` for Enter key support

- [x] Task 3: Integrate Sheet/Drawer into catalog.tsx (AC: 1, 5)
  - [x] 3.1 Add state: `const [open, setOpen] = useState(false)` and `const [editingFigure, setEditingFigure] = useState<Figure | null>(null)`
  - [x] 3.2 Add `useIsMobile()` hook
  - [x] 3.3 Wire "Add Figure" header button `onClick` → `setEditingFigure(null); setOpen(true)`
  - [x] 3.4 Wire empty state CTA button `onClick` → same handler
  - [x] 3.5 Remove `disabled` from both "Add Figure" buttons
  - [x] 3.6 Dynamic title: `editingFigure ? "Edit Figure" : "Add Figure"`
  - [x] 3.7 Render `Drawer` (mobile) or `Sheet` (desktop) — identical pattern to `spools.tsx` lines 130-148
  - [x] 3.8 Pass `key={editingFigure?.id ?? "create"}` to FigureForm for state reset on entity change
  - [x] 3.9 handleClose: `setOpen(false); setEditingFigure(null)`

- [x] Task 4: Add edit action to FigureCard (AC: 5)
  - [x] 4.1 Add optional prop `onEdit?: (figure: Figure) => void` to FigureCardProps
  - [x] 4.2 When `onEdit` is provided, render a ghost edit button (Pencil icon) — same pattern as SpoolCard
  - [x] 4.3 Pass `onEdit={handleEditFigure}` from catalog.tsx where `handleEditFigure` sets `editingFigure` and opens the form
  - [x] 4.4 Keep FigureCard backward-compatible: if `onEdit` is not provided, no edit button rendered

- [x] Task 5: Write tests (AC: 1-7)
  - [x] 5.1 Add store mutation tests in `app/lib/store.test.ts` (file already exists with spool mutation tests):
    - createFigure adds figure with UUID, correct data, and all fields
    - updateFigure modifies name/franchise/size/notes/requiredColors
    - updateFigure returns unchanged state for non-existent ID
  - [x] 5.2 Create `app/components/FigureForm.test.tsx`:
    - Renders all form fields (name, franchise, size, notes)
    - Shows available spools as selectable items
    - Toggling a spool adds/removes it from selection (visual state)
    - Save button disabled when name is empty
    - Calls createFigure on save with correct data (new figure)
    - Pre-populates fields in edit mode
    - Calls updateFigure on save with correct data (existing figure)
    - Can save with zero colors selected
  - [x] 5.3 Update `app/routes/catalog.test.tsx`:
    - "Add Figure" header button opens Sheet/Drawer
    - Empty state CTA opens Sheet/Drawer
    - Edit button on FigureCard opens form pre-populated
  - [x] 5.4 Update `app/components/FigureCard.test.tsx`:
    - Edit button renders when onEdit provided
    - Edit button calls onEdit with figure
    - No edit button when onEdit not provided
  - [x] 5.5 Run full test suite — all existing 87 tests plus new tests must pass

### Review Findings (Pass 3)

- [x] [Review][Defer] `getPerceivedLightness` returns NaN for malformed hex strings — pre-existing utility, already deferred from story 1.4
- [x] [Review][Defer] `useIsMobile` hydration mismatch risk with SSR — pre-existing hook, same pattern in spools.tsx
- [x] [Review][Defer] Long figure/franchise names have no truncation — pre-existing layout pattern, cosmetic

### Review Findings (Pass 2)

- [x] [Review][Patch] Size field allows 0/NaN/negative/out-of-range values — HTML5 validation bypassed by e.preventDefault(); clamp on save [app/components/FigureForm.tsx:47]

### Review Findings (Pass 1)

- [x] [Review][Patch] Franchise not trimmed on save — inconsistent with name.trim(); whitespace-only franchise renders empty `<p>` in FigureCard [app/components/FigureForm.tsx:48]
- [x] [Review][Patch] Dangling spool IDs persist in edit mode — selectedColors init from figure.requiredColors without filtering against current spools Map; deleted spool IDs saved silently [app/components/FigureForm.tsx:51]

## Dev Notes

### Architecture Requirements

**Store Mutations to Add:**
The store (`app/lib/store.ts`) currently has `createSpool`, `updateSpool`, `deleteSpool`. This story adds `createFigure` and `updateFigure` following the exact same patterns:

```ts
// Add to PrintFlowState interface:
createFigure: (data: Omit<Figure, "id">) => void
updateFigure: (id: string, updates: Partial<Omit<Figure, "id">>) => void

// Implementation follows createSpool/updateSpool pattern exactly:
createFigure(data) {
  set((state) => {
    const id = crypto.randomUUID()
    const next = new Map(state.figures)
    next.set(id, { id, ...data })
    return { figures: next }
  })
},
updateFigure(id, updates) {
  set((state) => {
    const existing = state.figures.get(id)
    if (!existing) return state
    const next = new Map(state.figures)
    next.set(id, { ...existing, ...updates })
    return { figures: next }
  })
}
```

The subscribe callback already handles `state.figures !== prevState.figures` → `writeStore("figures", state.figures)` (line 63 in store.ts). No persistence changes needed.

**Component Hierarchy (catalog.tsx after this story):**
```
catalog.tsx (route)
├── Page header (h1 + "Add Figure" button — NOW WIRED)
├── Empty state (conditional)
│   └── shadcn Empty → "Add Figure" CTA — NOW WIRED
├── Card grid (conditional)
│   └── FigureCard (one per figure)
│       └── Now with edit button (Pencil icon, ghost)
├── Sheet (desktop) OR Drawer (mobile)
│   └── FigureForm
│       ├── Name (Input, required)
│       ├── Franchise (Input, optional)
│       ├── Size (Input type=number, default 60)
│       ├── Notes (Textarea, optional)
│       └── Color assignment (toggleable spool items)
```

**State in catalog.tsx:**
```ts
const [open, setOpen] = useState(false)
const [editingFigure, setEditingFigure] = useState<Figure | null>(null)
const isMobile = useIsMobile()
```
No `useEffect`. The Sheet/Drawer open state and editing entity are the only local state. All figure data comes from the store.

### Existing Codebase Context

**Direct Pattern References (MUST follow):**
- `app/components/SpoolForm.tsx` — **the reference implementation** for FigureForm. Same props pattern (`entity?: T`, `onSave`, `onCancel`), same `saved` boolean guard, same form structure with FieldGroup/Field/FieldLabel/Input, same handleSubmit with `e.preventDefault()`
- `app/routes/spools.tsx` — **the reference implementation** for Sheet/Drawer integration in catalog.tsx. Same `open`/`editingEntity`/`isMobile` state pattern, same handleAdd/handleEdit/handleClose handlers, same conditional Drawer vs Sheet rendering, same `key={entity?.id ?? "create"}` on form
- `app/components/SpoolCard.tsx` — **the reference implementation** for edit button on FigureCard. Ghost variant, `size="icon-sm"`, Pencil icon, `aria-label`

**Already Installed and Available:**
- `app/components/ui/field.tsx` — FieldGroup, Field, FieldLabel, FieldDescription
- `app/components/ui/input.tsx` — Input
- `app/components/ui/textarea.tsx` — **DOES NOT EXIST YET**. Install before use: `npx shadcn@latest add textarea`
- `app/components/ui/sheet.tsx` — Sheet, SheetContent, SheetHeader, SheetTitle
- `app/components/ui/drawer.tsx` — Drawer, DrawerContent, DrawerHeader, DrawerTitle
- `app/components/ui/button.tsx` — Button
- `app/hooks/use-mobile.ts` — useIsMobile()
- `app/lib/color-utils.ts` — getPerceivedLightness()
- `app/lib/utils.ts` — cn()
- `app/lib/test-utils.ts` — createFigure(), createSpool() factories

**Does NOT exist yet (do not import):**
- `deleteFigure` store mutation (Story 2.3)
- `onDelete` prop on FigureCard (Story 2.3)
- Queue item affected count warning (Epic 3)

**Test Baseline:** 87 tests passing (Epic 1 complete + Story 2.1)

### Color Assignment UI Pattern

The color assignment section is a multi-select using spool items as toggleable buttons. This is specific to the Figure form and does not exist yet:

- Display all spools from the store as a flex-wrap grid of toggleable items
- Each item: small swatch circle (inline `backgroundColor: spool.hex`) + spool name text
- Selected state: visual highlight — `bg-accent ring-2 ring-ring` (or similar accent treatment)
- Unselected state: default card-like appearance — `bg-card border border-border`
- Toggle behavior: click toggles in/out of `selectedColors` array
- Use `aria-pressed={isSelected}` for accessibility
- Swatch visibility border: same `getPerceivedLightness` pattern as elsewhere
- If no spools exist: show a muted message "No spools available. Create spools first." (no navigation action — the user can use the sidebar)
- Section label: "Colors" using FieldLabel

**Toggle logic:**
```ts
function handleToggleSpool(spoolId: string) {
  setSelectedColors(prev =>
    prev.includes(spoolId)
      ? prev.filter(id => id !== spoolId)
      : [...prev, spoolId]
  )
}
```

### Key Patterns to Follow

1. **No `useMemo`/`useCallback`/`React.memo`** — React Compiler handles memoization
2. **No `useEffect`** — form state via `useState`, store access via selectors, no syncing
3. **Use shadcn semantic tokens** — `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-accent`, `ring-ring`
4. **Spool hex colors as inline styles** — `style={{ backgroundColor: spool.hex }}`
5. **Import ordering**: React/RR → third-party (lucide-react) → `~/lib/` → `~/components/` → relative
6. **Use `cn()`** from `~/lib/utils` for conditional Tailwind classes
7. **Co-locate tests** next to source files
8. **`interface` for object shapes** — strict TypeScript
9. **Direct Lucide imports** for tree-shaking: `import { Pencil } from "lucide-react"`
10. **No success toasts** — visible state change is sufficient feedback
11. **No loading states** — all interactions are instant (NFR5)
12. **Form: explicit "Save" button**, no autosave. "Cancel" discards without confirmation
13. **`key` prop on FigureForm** for state reset: `key={editingFigure?.id ?? "create"}`

### Responsive Layout

| Context | Form Container | Notes |
|---------|---------------|-------|
| Desktop (>=768px) | Sheet (right side panel) | SheetContent, SheetHeader, SheetTitle |
| Mobile (<768px) | Drawer (bottom sheet) | DrawerContent, DrawerHeader, DrawerTitle |

Detection via `useIsMobile()` hook. Same pattern as `spools.tsx`.

### Testing Standards

- **Framework**: Vitest + React Testing Library
- **Environment**: jsdom
- **Run**: `npm test`
- **Store access in tests**: `usePrintFlowStore.setState()` or `store.setState()` to set up test state
- **Import `fake-indexeddb/auto`** at top of test files interacting with the store
- **Mock `window.matchMedia`** for `useIsMobile()` — pattern in `spools.test.tsx`
- **Test factories**: `createFigure()` and `createSpool()` from `~/lib/test-utils`
- **Test baseline**: 87 tests passing

### Data Flow

```
User clicks "Add Figure"
  → setEditingFigure(null), setOpen(true)
  → Sheet/Drawer opens with empty FigureForm
  → User fills name, selects spools
  → handleSave() → createFigure({ name, franchise, size, notes, requiredColors: selectedColors })
  → Store figures Map updated → subscribe fires IndexedDB write
  → onSave() → setOpen(false)
  → catalog.tsx re-renders → new figure appears in grid

User clicks edit (Pencil) on FigureCard
  → handleEditFigure(figure) → setEditingFigure(figure), setOpen(true)
  → Sheet/Drawer opens with pre-populated FigureForm
  → User modifies fields/colors
  → handleSave() → updateFigure(figure.id, { name, franchise, size, notes, requiredColors: selectedColors })
  → Store figures Map updated → subscribe fires IndexedDB write
  → onSave() → setOpen(false)
  → catalog.tsx re-renders → updated figure visible in grid
```

### Project Structure Notes

**New Files:**
- `app/components/FigureForm.tsx` — figure create/edit form with color assignment
- `app/components/FigureForm.test.tsx` — figure form tests

**Modified Files:**
- `app/lib/store.ts` — add `createFigure`, `updateFigure` mutations to interface and implementation
- `app/routes/catalog.tsx` — add Sheet/Drawer, wire buttons, import FigureForm
- `app/components/FigureCard.tsx` — add optional `onEdit` prop with edit button

**Updated Test Files:**
- `app/lib/store.test.ts` — add figure mutation tests (create if file doesn't exist)
- `app/routes/catalog.test.tsx` — add form integration tests
- `app/components/FigureCard.test.tsx` — add edit button tests

### Previous Story Intelligence (Story 2.1)

**Patterns from Story 2.1 to carry forward:**
- FigureCard uses `CardHeader` for name/franchise/size and `CardContent` for colors — add edit button in a logical position (e.g., alongside the header or in a card action area)
- `figure.requiredColors.map(id => spools.get(id)).filter(Boolean)` for resolving spool IDs — reuse this pattern in FigureForm to show which spools are selected
- The catalog route already selects `figures` and `spools` from store — extend with mutation selectors and form state
- Disabled "Add Figure" buttons already exist in the right positions — just remove `disabled` and wire `onClick`
- Empty state CTA and header button are separate Button elements — both need the same handler

**Review findings from Story 2.1 to avoid:**
- Import ordering: React/RR → third-party → `~/lib/` → `~/components/` → relative
- Use `lg:p-6` not `md:p-6` for desktop padding
- When testing with `createFigure()` factory, override franchise to avoid matching default "Naruto" accidentally

### Git Intelligence

**Recent commits:**
- `5675a3f` fix: code review fixes for story 2.1 — import ordering, test assertion
- `59441e0` feat: story 2.1 — figure catalog view, empty state
- `a27bda3` feat: enhance SpoolCard with delete functionality
- `fddb221` feat: add HexColorPicker + SpoolForm + Sheet/Drawer integration
- `9bfb52d` feat: implement SpoolCard and SpoolLibrary route

**Commit `fddb221` is the most relevant** — it introduced the SpoolForm + Sheet/Drawer pattern that this story mirrors for figures.

### Story 2.3 Awareness

Story 2.3 (Delete Figure with Cascade Confirmation) will add:
- `deleteFigure` store mutation
- `onDelete` prop on FigureCard
- AlertDialog for delete confirmation with queue item impact

Design FigureCard's action button area to accommodate a future delete button. The SpoolCard pattern (flex row of ghost icon buttons) works well.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend Architecture, State Management Patterns, Testing Framework, Process Patterns (Form Patterns)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Form Patterns, Modal & Overlay Patterns, Component Strategy, Color Assignment Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md — FR6, FR8, FR10, FR11, FR12]
- [Source: app/components/SpoolForm.tsx — Direct pattern reference for FigureForm]
- [Source: app/routes/spools.tsx — Direct pattern reference for Sheet/Drawer integration]
- [Source: app/components/SpoolCard.tsx — Direct pattern reference for edit button on FigureCard]
- [Source: app/lib/store.ts — Store mutations pattern (createSpool/updateSpool)]
- [Source: _bmad-output/implementation-artifacts/2-1-figure-catalog-view-empty-state.md — Previous story]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation followed patterns directly from SpoolForm/spools.tsx reference files.

### Completion Notes List

- Installed `app/components/ui/textarea.tsx` via shadcn CLI
- Added `createFigure` and `updateFigure` mutations to store following identical `createSpool`/`updateSpool` pattern (functional `set()`, new Map copy, crypto.randomUUID())
- Created `FigureForm.tsx` with all required fields (name, franchise, size, notes, color assignment), `saved` guard, `e.preventDefault()` on submit, and `aria-pressed` on spool toggles
- Updated `catalog.tsx`: removed `disabled`, added `open`/`editingFigure` state, `useIsMobile()`, Sheet/Drawer with dynamic title, `handleAddFigure`/`handleEditFigure`/`handleClose`
- Updated `FigureCard.tsx`: added optional `onEdit` prop with ghost Pencil button; backward compatible
- All 511 tests pass (75 test files); baseline was 87 tests

### File List

- `app/components/ui/textarea.tsx` (new — shadcn install)
- `app/lib/store.ts` (modified — added createFigure, updateFigure)
- `app/components/FigureForm.tsx` (new)
- `app/routes/catalog.tsx` (modified — Sheet/Drawer integration, wired buttons)
- `app/components/FigureCard.tsx` (modified — optional onEdit prop)
- `app/lib/store.test.ts` (modified — figure mutation tests)
- `app/components/FigureForm.test.tsx` (new)
- `app/routes/catalog.test.tsx` (modified — form integration tests)
- `app/components/FigureCard.test.tsx` (modified — edit button tests)

## Change Log

- 2026-03-30: Story 2.2 implemented — figure create/edit form with color assignment, Sheet/Drawer integration, edit button on FigureCard, store mutations, full test coverage
