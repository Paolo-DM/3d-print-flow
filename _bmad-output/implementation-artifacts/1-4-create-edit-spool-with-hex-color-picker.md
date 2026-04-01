# Story 1.4: Create & Edit Spool with Hex Color Picker

Status: done

## Story

As a user,
I want to create new spools and edit existing ones with a visual color picker,
so that I can build and maintain my filament library with accurate color representation.

## Acceptance Criteria

1. **Given** the user clicks "Add Spool" (or the empty state CTA), **When** the create form opens, **Then** a Sheet appears on desktop or Drawer on mobile containing a form with Name input and HexColorPicker (react-colorful in Popover with hex input field and color preview swatch), using shadcn Field components.

2. **Given** the user fills in a spool name and selects a hex color, **When** the user clicks "Save", **Then** a new spool is created with `crypto.randomUUID()` as ID, added to the Zustand store, auto-saved to IndexedDB, and appears in the spool library.

3. **Given** the user clicks edit on an existing spool, **When** the edit form opens, **Then** the form is pre-populated with the spool's current name and hex color.

4. **Given** the user modifies the name or color of an existing spool, **When** the user clicks "Save", **Then** the spool is updated in the store, persisted to IndexedDB, and the library view reflects the changes immediately.

5. **Given** the user opens the create or edit form, **When** the user clicks "Cancel", **Then** the form closes with no changes saved and no confirmation prompt.

6. **Given** the HexColorPicker component, **When** it mounts for the first time, **Then** react-colorful is lazy-loaded via `React.lazy()` — not included in the initial bundle.

## Tasks / Subtasks

- [x] Task 1: Install required shadcn components (AC: 1)
  - [x] 1.1 Install `drawer` component via `npx shadcn@latest add drawer`
  - [x] 1.2 Install `popover` component via `npx shadcn@latest add popover`
  - [x] 1.3 Install `field` component via `npx shadcn@latest add field`
  - [x] 1.4 Install `label` component via `npx shadcn@latest add label` (if not pulled in by field)
  - [x] 1.5 Verify build passes after installs

- [x] Task 2: Build HexColorPicker component (AC: 1, 6)
  - [x] 2.1 Create `app/components/HexColorPicker.tsx`
  - [x] 2.2 Lazy-load react-colorful's `HexColorPicker` via `React.lazy(() => import("react-colorful").then(m => ({ default: m.HexColorPicker })))`
  - [x] 2.3 Wrap in `React.Suspense` with a minimal fallback (e.g., a 200x200 skeleton/placeholder div)
  - [x] 2.4 Wrap the lazy picker inside a shadcn `Popover`: trigger button shows current color swatch (32px circle with `style={{ backgroundColor: hex }}`), popover content contains the picker
  - [x] 2.5 Below the picker inside the popover, add a hex text `Input` (prefixed with `#`) for manual entry — bind bidirectionally with the picker
  - [x] 2.6 Component props: `value: string` (hex), `onChange: (hex: string) => void`
  - [x] 2.7 Apply visibility border on the trigger swatch for near-white/near-black colors using `getPerceivedLightness`

- [x] Task 3: Build SpoolForm component (AC: 1, 2, 3, 4, 5)
  - [x] 3.1 Create `app/components/SpoolForm.tsx` — shared form content for create and edit modes
  - [x] 3.2 Props: `spool?: Spool` (undefined = create mode, defined = edit mode), `onSave: () => void`, `onCancel: () => void`
  - [x] 3.3 Local state: `name` (string, default: `spool?.name ?? ""`), `hex` (string, default: `spool?.hex ?? "#6366f1"`)
  - [x] 3.4 Form layout using shadcn Field components: `FieldGroup` > `Field` + `FieldLabel` + `Input` for name, `Field` + `FieldLabel` + `HexColorPicker` for color
  - [x] 3.5 Footer with "Cancel" button (outline variant) and "Save" button (primary variant, disabled if name is empty)
  - [x] 3.6 On save (create mode): call `store.createSpool({ name: name.trim(), hex })` — store generates UUID internally
  - [x] 3.7 On save (edit mode): call `store.updateSpool(spool.id, { name: name.trim(), hex })`
  - [x] 3.8 Call `onSave()` after mutation to close the container
  - [x] 3.9 On cancel: call `onCancel()` — no confirmation dialog, just close

- [x] Task 4: Wire SpoolForm into Sheet/Drawer on spools route (AC: 1, 2, 3, 4, 5)
  - [x] 4.1 In `app/routes/spools.tsx`, add state: `open: boolean`, `editingSpool: Spool | null`
  - [x] 4.2 Use `useIsMobile()` from `~/hooks/use-mobile` to choose container
  - [x] 4.3 When `isMobile` → render `Drawer` with `DrawerContent` > `DrawerHeader` > `DrawerTitle` + `SpoolForm`
  - [x] 4.4 When desktop → render `Sheet` with `SheetContent` > `SheetHeader` > `SheetTitle` + `SpoolForm`
  - [x] 4.5 "Add Spool" header button: `onClick={() => { setEditingSpool(null); setOpen(true); }}`
  - [x] 4.6 Empty state CTA button: same handler as "Add Spool"
  - [x] 4.7 Add edit trigger to SpoolCard — pass `onEdit` callback prop, render edit button (ghost variant, Pencil icon)
  - [x] 4.8 Edit click: `setEditingSpool(spool); setOpen(true);`
  - [x] 4.9 `SheetTitle`/`DrawerTitle`: "Add Spool" when creating, "Edit Spool" when editing
  - [x] 4.10 On save/cancel: `setOpen(false); setEditingSpool(null);`

- [x] Task 5: Write tests (AC: 1-6)
  - [x] 5.1 Create `app/components/HexColorPicker.test.tsx`
  - [x] 5.2 Test: HexColorPicker renders trigger swatch with correct background color
  - [x] 5.3 Test: clicking trigger opens popover with color picker content
  - [x] 5.4 Test: hex input syncs value changes via onChange callback
  - [x] 5.5 Create `app/components/SpoolForm.test.tsx`
  - [x] 5.6 Test: create mode — renders empty name input and default color
  - [x] 5.7 Test: edit mode — pre-populates name and hex from provided spool
  - [x] 5.8 Test: save button is disabled when name is empty
  - [x] 5.9 Test: save calls createSpool for new spool with trimmed name
  - [x] 5.10 Test: save calls updateSpool for existing spool
  - [x] 5.11 Test: cancel calls onCancel without mutating store
  - [x] 5.12 Update `app/routes/spools.test.tsx` — test "Add Spool" button opens Sheet/Drawer
  - [x] 5.13 Run full test suite — all existing 47 tests must still pass

## Dev Notes

### Architecture Requirements

**Component Hierarchy:**
```
spools.tsx (route)
├── Page header (h1 + "Add Spool" Button → opens form)
├── Empty state (conditional, when spools.size === 0)
│   └── shadcn Empty → "Add Your First Spool" button → opens form
├── Card grid (conditional, when spools.size > 0)
│   └── SpoolCard (one per spool, with edit button → opens form)
└── Sheet (desktop) or Drawer (mobile) — controlled by open state
    ├── Header: "Add Spool" / "Edit Spool"
    └── SpoolForm
        ├── Field: Name (Input)
        ├── Field: Color (HexColorPicker)
        └── Footer: Cancel (outline) + Save (primary)

HexColorPicker (shared component)
├── Trigger: color swatch button (shows current hex)
└── Popover content
    ├── React.lazy(react-colorful HexColorPicker) in Suspense
    └── Hex text Input (#-prefixed)
```

**State Management:**
- Route-level state for form open/close and which spool is being edited: `useState`
- Form-level state for name and hex inputs: `useState` in SpoolForm
- Store mutations: `usePrintFlowStore(s => s.createSpool)` and `usePrintFlowStore(s => s.updateSpool)`
- Select only the slices you need — don't pull the full store

**Store Mutation Signatures (from store.ts):**
```ts
createSpool: (data: Omit<Spool, "id">) => void   // store generates crypto.randomUUID()
updateSpool: (id: string, updates: Partial<Omit<Spool, "id">>) => void
```

**Data Flow — Spool Creation:**
```
User clicks Save → SpoolForm.handleSave()
  → store.createSpool({ name: name.trim(), hex })
  → Zustand set() creates new Map with spool added
  → React re-renders (SpoolCard appears in grid)
  → subscribe callback → db.writeStore('spools', updated)
  → onSave() callback → setOpen(false)
```

**Sheet vs Drawer Decision:**
```tsx
const isMobile = useIsMobile()  // from ~/hooks/use-mobile

{isMobile ? (
  <Drawer open={open} onOpenChange={setOpen}>
    <DrawerContent>
      <DrawerHeader><DrawerTitle>{title}</DrawerTitle></DrawerHeader>
      <SpoolForm ... />
    </DrawerContent>
  </Drawer>
) : (
  <Sheet open={open} onOpenChange={setOpen}>
    <SheetContent>
      <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
      <SpoolForm ... />
    </SheetContent>
  </Sheet>
)}
```

**Lazy Loading react-colorful:**
```tsx
const LazyHexColorPicker = React.lazy(() =>
  import("react-colorful").then((m) => ({ default: m.HexColorPicker }))
)
```
This ensures react-colorful (2.8KB gzipped) loads only when the color picker Popover opens, not in the initial bundle. Wrap in `<Suspense fallback={<div className="h-[200px] w-[200px] bg-muted rounded" />}>`.

### shadcn Components to Install

| Component | Purpose | Install Command |
|-----------|---------|-----------------|
| `drawer` | Mobile form container (vaul-based bottom sheet) | `npx shadcn@latest add drawer` |
| `popover` | Color picker container | `npx shadcn@latest add popover` |
| `field` | Structured form layout (FieldGroup, Field, FieldLabel) | `npx shadcn@latest add field` |
| `label` | May be pulled by field; install if not | `npx shadcn@latest add label` |

**Already Installed:** Sheet, Input, Button, Card, Empty

### Existing Codebase Context

**Already Implemented (Stories 1.1-1.3):**
- `app/lib/types.ts` — `Spool` interface: `{ id: string; name: string; hex: string }`
- `app/lib/store.ts` — `usePrintFlowStore`, `createSpool()`, `updateSpool()`, `deleteSpool()`
- `app/lib/color-utils.ts` — `getPerceivedLightness(hex)`, `hexToContrast(hex)`
- `app/hooks/use-mobile.ts` — `useIsMobile()` hook (768px breakpoint)
- `app/routes/spools.tsx` — spool library with card grid and empty state (buttons currently disabled)
- `app/components/SpoolCard.tsx` — displays spool name + color swatch, needs edit button added
- `app/components/ui/sheet.tsx` — Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose
- `app/components/ui/input.tsx` — Input component
- `app/components/ui/button.tsx` — Button with variants (default, outline, secondary, ghost, destructive)
- `app/lib/test-utils.ts` — `createSpool()` factory for tests
- `package.json` — `react-colorful: "^5.6.1"` already in dependencies

**Not Installed (must install this story):**
- shadcn `drawer` — Drawer, DrawerContent, DrawerHeader, DrawerTitle
- shadcn `popover` — Popover, PopoverTrigger, PopoverContent
- shadcn `field` — FieldGroup, Field, FieldLabel, FieldDescription
- shadcn `label` — Label (check if field pulls it in)

### Key Patterns to Follow

1. **No `useMemo`/`useCallback`/`React.memo`** — React Compiler handles memoization
2. **No `useEffect`** — form state is local `useState`, no external sync needed
3. **Semantic tokens only for UI chrome** — `bg-background`, `text-foreground`, `bg-card`, `border-border`
4. **Spool hex rendered as inline styles** — `style={{ backgroundColor: hex }}` — these are dynamic user data, not theme tokens
5. **Import ordering**: React/RR → third-party → `~/lib/` → `~/components/` → relative
6. **Use `cn()`** from `~/lib/utils` for conditional Tailwind classes
7. **Co-locate tests** next to source files
8. **`interface` for object shapes, `type` for unions** — strict TypeScript
9. **Ternary operators for conditional rendering**, not `&&`
10. **Event handlers use `handle` prefix** — `handleSave()`, `handleCancel()`, `handleEditSpool()`
11. **No success toasts for normal operations** — spool appearing in grid is sufficient feedback
12. **No loading states for local operations** — all interactions are instant

### Form Behavior Rules

- **No autosave** — explicit "Save" button commits changes
- **Cancel discards without confirmation** — user hasn't committed yet
- **Validation**: Save button disabled when name is empty (trimmed). No other validation needed (hex is always valid from picker, manual hex input should sanitize)
- **Default color**: Provide a sensible default hex (e.g., `#6366f1` — indigo) for new spools so the picker is never empty
- **Name trimming**: Trim whitespace on save, not during typing

### Testing Standards

- **Framework**: Vitest + React Testing Library
- **Environment**: jsdom (configured in `vitest.config.ts`)
- **Run**: `npm test` (single run), `npm run test:watch` (watch mode)
- **Store access in tests**: `usePrintFlowStore.getState()` to set up and verify state
- **Import `fake-indexeddb/auto`** at top of test files that interact with the store
- **Mock `window.matchMedia`** via `Object.defineProperty` for `useIsMobile()` tests
- **Lazy component testing**: For HexColorPicker with React.lazy, wrap test renders in `<Suspense>` and use `waitFor` or `findBy` queries
- **Test baseline**: 47 tests passing (26 Story 1.1 + 12 Story 1.2 + 9 Story 1.3)

### Project Structure Notes

**New Files:**
- `app/components/HexColorPicker.tsx` — custom react-colorful wrapper
- `app/components/HexColorPicker.test.tsx` — component tests
- `app/components/SpoolForm.tsx` — shared form content for create/edit
- `app/components/SpoolForm.test.tsx` — form tests
- `app/components/ui/drawer.tsx` — shadcn install
- `app/components/ui/popover.tsx` — shadcn install
- `app/components/ui/field.tsx` — shadcn install
- `app/components/ui/label.tsx` — shadcn install (if not pulled by field)

**Modified Files:**
- `app/routes/spools.tsx` — add Sheet/Drawer with SpoolForm, wire up open state and handlers
- `app/components/SpoolCard.tsx` — add edit button (ghost, Pencil icon) with `onEdit` callback
- `app/routes/spools.test.tsx` — add tests for form opening

### Story 1.5 Awareness

Story 1.5 (Delete Spool with Referential Guard) will add a delete button to SpoolCard and a confirmation Dialog. When adding the edit button to SpoolCard in this story, place it so a delete button can naturally be added alongside it (e.g., a small actions area on the card). Do NOT implement delete — just leave room for it.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Component Architecture, Form Patterns, react-colorful Decision, State Management, Data Flow]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — HexColorPicker Component, Form Patterns, Sheet/Drawer Responsive, Button Hierarchy]
- [Source: _bmad-output/planning-artifacts/prd.md — FR1, FR3, FR5]
- [Source: _bmad-output/implementation-artifacts/1-3-spool-library-view-empty-state.md — Previous story patterns and learnings]

### Previous Story Intelligence (Story 1.3)

**Patterns Established:**
- shadcn component install: `npx shadcn@latest add <component>` — installs to `app/components/ui/`
- SpoolCard with color swatch, perceived lightness border logic
- Responsive card grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6`
- Empty state with shadcn Empty component and CTA button
- Page header with heading + action button
- Co-located tests with `render()` + `screen` queries

**Deferred from Story 1.3 (addressed by this story):**
- [Review][Defer] No hex/name input validation — this story adds form validation (save disabled when name empty)
- [Review][Defer] Disabled CTA buttons lack accessibility hint — this story enables those buttons

**Build State:** `npm run build` passes clean, 47 tests all passing, TypeScript strict mode, no warnings

### Git Intelligence

**Recent commits:**
- `9bfb52d` feat: implement SpoolCard component and SpoolLibrary route with empty state handling
- `704c395` feat: add app shell, sidebar navigation and dark mode (Story 1.2)
- `175430b` feat: add data model, state management & persistence layer (Story 1.1)

**Commit message format:** `feat: <description> (Story X.Y)`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None

### Completion Notes List

- Installed shadcn drawer, popover, field components (label already existed via field dependency)
- Built HexColorPicker with React.lazy for react-colorful (separate chunk: 4.74KB gzipped), Popover trigger with color swatch, bidirectional hex input, visibility border for near-white/near-black
- Built SpoolForm with create/edit modes, FieldGroup layout, save disabled when name empty, name trimming on save
- Wired Sheet (desktop) / Drawer (mobile) into spools route with `useIsMobile()`, added edit button (ghost/Pencil) to SpoolCard
- Used `key={editingSpool?.id ?? "create"}` on SpoolForm to reset form state when switching between create/edit
- All 57 tests pass (47 existing + 3 HexColorPicker + 6 SpoolForm + 1 spools route)
- Build passes clean, react-colorful lazy-loaded into separate chunk
- Followed React best practices: no useEffect, no useMemo/useCallback (React Compiler), ternary for conditionals, event handlers with handle prefix, semantic tokens for UI chrome

### Review Findings

- [x] [Review][Patch] Drawer/Sheet `onOpenChange` bypasses `handleClose`, leaving `editingSpool` stale on overlay dismiss [app/routes/spools.tsx:96,105]
- [x] [Review][Patch] Hex input sanitization: normalize to lowercase on manual entry, handle `#` prepend edge cases with pasted values [app/components/HexColorPicker.tsx:33-40]
- [x] [Review][Patch] SpoolForm missing `<form>` element — no Enter-to-submit, weaker screen reader semantics [app/components/SpoolForm.tsx:37]
- [x] [Review][Patch] Double-save race: rapid Save clicks can create duplicate spools before Sheet/Drawer closes [app/components/SpoolForm.tsx:26]
- [x] [Review][Patch] Missing route-level test for edit flow via SpoolCard edit button (AC 3) [app/routes/spools.test.tsx]
- [x] [Review][Patch] Missing test for Drawer rendering on mobile viewport (AC 1) [app/routes/spools.test.tsx]
- [x] [Review][Patch] Missing test for whitespace-only name keeping save disabled [app/components/SpoolForm.test.tsx]
- [x] [Review][Patch] Missing `autoFocus` on name input in create mode [app/components/SpoolForm.tsx:41]
- [x] [Review][Defer] HexColorPicker `inputValue` drifts from parent `value` when popover is open and parent changes externally — deferred, no external writers of hex exist in current architecture
- [x] [Review][Defer] `editingSpool` holds stale Spool snapshot instead of ID — deferred, no concurrent modification in single-user local app
- [x] [Review][Defer] `getPerceivedLightness` returns NaN for malformed hex strings — deferred, pre-existing in color-utils.ts
- [x] [Review][Defer] SpoolCard/grid missing list semantics for a11y (`role="list"`) — deferred, pre-existing pattern from Story 1.3
- [x] [Review][Defer] Editing concurrently deleted spool results in silent no-op — deferred, Story 1.5 concern
- [x] [Review][Patch] Mobile viewport test doesn't restore `innerWidth` on assertion failure — wrapped in try/finally [app/routes/spools.test.tsx]
- [x] [Review][Patch] Edit flow route test only checked title, not pre-populated form fields (AC 3) — added name input assertion [app/routes/spools.test.tsx]

### Change Log

- 2026-03-27: Implemented Story 1.4 — all 5 tasks complete, 57/57 tests passing

### File List

**New Files:**
- app/components/HexColorPicker.tsx
- app/components/HexColorPicker.test.tsx
- app/components/SpoolForm.tsx
- app/components/SpoolForm.test.tsx
- app/components/ui/drawer.tsx (shadcn install)
- app/components/ui/popover.tsx (shadcn install)
- app/components/ui/field.tsx (shadcn install)
- app/components/ui/label.tsx (shadcn install)

**Modified Files:**
- app/routes/spools.tsx — added Sheet/Drawer with SpoolForm, wired open state and handlers
- app/components/SpoolCard.tsx — added edit button (ghost, Pencil icon) with onEdit callback
- app/routes/spools.test.tsx — added test for Add Spool button opening Sheet
- app/components/ui/separator.tsx — updated by shadcn field install
- package.json — new dependency (vaul via drawer)
- package-lock.json — lock file update
