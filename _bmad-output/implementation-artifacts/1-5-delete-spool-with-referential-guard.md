# Story 1.5: Delete Spool with Referential Guard

Status: done

## Story

As a user,
I want to delete spools I no longer use while being protected from breaking my figure catalog,
so that my spool library stays clean without accidentally orphaning figures.

## Acceptance Criteria

1. **Given** the user clicks delete on a spool that is NOT referenced by any figure, **When** the confirmation AlertDialog appears, **Then** it shows the spool name and a message confirming no figures use this spool, with Cancel and Delete (destructive variant) buttons.

2. **Given** the user confirms deletion of an unreferenced spool, **When** the delete executes, **Then** the spool is removed from the Zustand store, removed from IndexedDB (via subscribe callback), and disappears from the library view.

3. **Given** the user clicks delete on a spool that IS referenced by one or more figures, **When** the AlertDialog appears, **Then** it shows "Cannot Delete" as the title and lists the figure names that reference this spool, with only a Close button (no delete option).

## Tasks / Subtasks

- [x] Task 1: Install shadcn alert-dialog component (AC: 1, 3)
  - [x] 1.1 Run `npx shadcn@latest add alert-dialog`
  - [x] 1.2 Verify build passes after install

- [x] Task 2: Create referential guard utility function (AC: 1, 3)
  - [x] 2.1 Create `getReferencingFigures(spoolId: string, figures: Map<string, Figure>): Figure[]` in `app/lib/derived.ts`
  - [x] 2.2 Iterates `figures.values()`, returns figures whose `requiredColors` includes the given `spoolId`
  - [x] 2.3 Write unit tests in `app/lib/derived.test.ts`

- [x] Task 3: Add delete button to SpoolCard (AC: 1, 3)
  - [x] 3.1 Add `onDelete: (spool: Spool) => void` prop to `SpoolCardProps`
  - [x] 3.2 Add a Trash2 icon button (ghost variant, `size="icon-sm"`) alongside the existing edit button
  - [x] 3.3 `aria-label={`Delete ${spool.name}`}`
  - [x] 3.4 Group edit + delete buttons in a flex container

- [x] Task 4: Wire delete flow into spools route (AC: 1, 2, 3)
  - [x] 4.1 Add state: `deletingSpool: Spool | null`
  - [x] 4.2 Add `handleDeleteSpool(spool: Spool)` — sets `deletingSpool`
  - [x] 4.3 Pass `onDelete={handleDeleteSpool}` to each SpoolCard
  - [x] 4.4 Compute `referencingFigures` from store figures using `getReferencingFigures(deletingSpool.id, figures)` — derived during render, not in effect
  - [x] 4.5 Render AlertDialog controlled by `deletingSpool !== null`
  - [x] 4.6 **Unreferenced case** (referencingFigures.length === 0):
    - AlertDialogTitle: "Delete Spool"
    - AlertDialogDescription: `Delete "${spool.name}"? No figures use this spool.`
    - AlertDialogCancel: "Cancel"
    - AlertDialogAction: "Delete" (destructive variant)
    - On confirm: call `store.deleteSpool(spool.id)`, set `deletingSpool(null)`
  - [x] 4.7 **Referenced case** (referencingFigures.length > 0):
    - AlertDialogTitle: "Cannot Delete"
    - AlertDialogDescription: `"${spool.name}" is used by the following figures:`
    - List each referencing figure name
    - AlertDialogCancel: "Close" (only button, no delete action)
  - [x] 4.8 On AlertDialog close/cancel: `setDeletingSpool(null)`

- [x] Task 5: Write tests (AC: 1, 2, 3)
  - [x] 5.1 `app/lib/derived.test.ts` — unit tests for `getReferencingFigures`:
    - Returns empty array when no figures reference the spool
    - Returns matching figures when spool ID is in requiredColors
    - Returns empty array when figures map is empty
  - [x] 5.2 `app/components/SpoolCard.test.tsx` — create or update tests:
    - Delete button renders with correct aria-label
    - Delete button calls onDelete with the spool
  - [x] 5.3 `app/routes/spools.test.tsx` — route-level tests:
    - Delete button on card opens AlertDialog
    - Unreferenced spool: AlertDialog shows spool name, "No figures use this spool", Cancel and Delete buttons
    - Referenced spool: AlertDialog shows "Cannot Delete" and lists figure names, no Delete button
    - Confirming delete removes spool from store
    - Dialog closes after successful deletion
  - [x] 5.4 Run full test suite — all existing 57 tests must still pass

## Dev Notes

### Architecture Requirements

**Referential Integrity Pattern (from architecture.md):**
> "Check before delete, never after. Show affected items in confirmation Dialog. Never allow orphaned references."

The guard is implemented at the UI layer: the AlertDialog content changes based on whether references exist. The store's `deleteSpool(id)` remains a simple Map.delete — the UI prevents calling it when references exist. This keeps the store mutations simple and pushes the guard logic to the presentation layer where the user sees feedback.

**Entity Reference Pattern:**
- Figures reference spools by ID: `Figure.requiredColors: string[]` (array of spool IDs)
- Direction: QueueItem -> Figure -> Spool (no circular references)
- The guard checks: does any Figure's `requiredColors` array include this spool's `id`?

**Component Hierarchy:**
```
spools.tsx (route)
├── Page header (h1 + "Add Spool" Button)
├── Empty state (conditional)
├── Card grid (conditional)
│   └── SpoolCard (one per spool)
│       ├── Color swatch
│       ├── Spool name
│       ├── Edit button (Pencil, ghost)
│       └── Delete button (Trash2, ghost) ← NEW
├── Sheet/Drawer (create/edit form — existing)
└── AlertDialog (delete confirmation) ← NEW
    ├── Unreferenced: title + description + Cancel + Delete(destructive)
    └── Referenced: title + description + figure list + Close
```

**AlertDialog vs Dialog:**
Use `alert-dialog` (not `dialog`) because:
- Destructive confirmation requires an explicit response — no click-outside-to-dismiss
- Semantically correct for actions that cannot be undone
- Follows UX principle: "Reserve modals for destructive confirmations only"

**Derived State — getReferencingFigures:**
This is a pure function that belongs in `app/lib/derived.ts` (which does not yet exist — this story creates it). The architecture mandates: "Derived state as pure functions... extracted as pure functions that accept store state and return derived values."

```ts
// app/lib/derived.ts
export function getReferencingFigures(
  spoolId: string,
  figures: Map<string, Figure>
): Figure[] {
  return Array.from(figures.values()).filter((f) =>
    f.requiredColors.includes(spoolId)
  )
}
```

Call this during render in the route component — derived on demand, never stored in state.

**Store Mutation Signature (existing, no changes needed):**
```ts
deleteSpool: (id: string) => void  // simple Map.delete, already implemented
```

**Data Flow — Spool Deletion:**
```
User clicks Delete button on SpoolCard
  → handleDeleteSpool(spool) → setDeletingSpool(spool)
  → AlertDialog opens
  → Route computes: referencingFigures = getReferencingFigures(spool.id, figures)
  → If unreferenced: show confirm dialog
    → User clicks "Delete" → handleConfirmDelete()
      → store.deleteSpool(spool.id)
      → Zustand set() creates new Map with spool removed
      → React re-renders (card disappears from grid)
      → subscribe callback → db.writeStore('spools', updated)
      → setDeletingSpool(null) → AlertDialog closes
  → If referenced: show "Cannot Delete" dialog
    → User clicks "Close" → setDeletingSpool(null) → AlertDialog closes
```

### shadcn Components to Install

| Component | Purpose | Install Command |
|-----------|---------|-----------------|
| `alert-dialog` | Delete confirmation dialog (prevents click-outside dismiss) | `npx shadcn@latest add alert-dialog` |

**Already Installed:** Sheet, Drawer, Input, Button, Card, Empty, Popover, Field, Label

### Existing Codebase Context

**Already Implemented (Stories 1.1-1.4):**
- `app/lib/types.ts` — `Spool { id, name, hex }`, `Figure { id, name, franchise, size, notes, requiredColors: string[] }`, `QueueItem { id, figureId, type, completedColors: string[] }`
- `app/lib/store.ts` — `usePrintFlowStore`, `createSpool()`, `updateSpool()`, `deleteSpool(id)` (simple Map.delete, no guard)
- `app/lib/color-utils.ts` — `getPerceivedLightness(hex)`, `hexToContrast(hex)`
- `app/hooks/use-mobile.ts` — `useIsMobile()` hook (768px breakpoint)
- `app/routes/spools.tsx` — spool library with card grid, empty state, Sheet/Drawer for create/edit form
- `app/components/SpoolCard.tsx` — spool card with color swatch, name, edit button (Pencil, ghost, `size="icon-sm"`)
- `app/components/SpoolForm.tsx` — create/edit form, double-save guard via `saved` state
- `app/components/HexColorPicker.tsx` — lazy-loaded react-colorful wrapper
- `app/components/ui/button.tsx` — Button with variants: default, outline, secondary, ghost, **destructive**
- `app/lib/test-utils.ts` — `createSpool()`, `createFigure()`, `createQueueItem()` factories

**Does NOT exist (create in this story):**
- `app/lib/derived.ts` — pure derived state functions (first one: `getReferencingFigures`)
- `app/lib/derived.test.ts` — tests for derived functions
- `app/components/ui/alert-dialog.tsx` — shadcn install

### Key Patterns to Follow

1. **No `useMemo`/`useCallback`/`React.memo`** — React Compiler handles memoization
2. **No `useEffect`** — derive referencing figures during render, delete in event handler
3. **Semantic tokens for UI chrome** — `bg-background`, `text-foreground`, `bg-card`, `border-border`
4. **Import ordering**: React/RR → third-party (lucide-react) → `~/lib/` → `~/components/` → relative
5. **Use `cn()`** from `~/lib/utils` for conditional Tailwind classes
6. **Co-locate tests** next to source files
7. **`interface` for object shapes** — strict TypeScript
8. **Event handlers use `handle` prefix** — `handleDeleteSpool()`, `handleConfirmDelete()`
9. **No success toasts** — spool disappearing from grid is sufficient feedback
10. **No loading states** — all interactions are instant
11. **Ternary for conditional rendering**, not `&&`
12. **Direct Lucide imports** for tree-shaking: `import { Trash2 } from "lucide-react"`

### AlertDialog Pattern

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"

<AlertDialog open={deletingSpool !== null} onOpenChange={(open) => { if (!open) setDeletingSpool(null) }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription>{description}</AlertDialogDescription>
    </AlertDialogHeader>
    {/* figure list for referenced case */}
    <AlertDialogFooter>
      <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
      {/* AlertDialogAction only when unreferenced */}
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**AlertDialog is controlled** via the `open` prop (driven by `deletingSpool` state). No trigger element — the delete button on SpoolCard sets `deletingSpool`, which opens the dialog.

### Testing Standards

- **Framework**: Vitest + React Testing Library
- **Environment**: jsdom (configured in `vitest.config.ts`)
- **Run**: `npm test` (single run), `npm run test:watch` (watch mode)
- **Store access in tests**: `store.setState()` to set up, `store.getState()` to verify
- **Import `fake-indexeddb/auto`** at top of test files that interact with the store
- **Mock `window.matchMedia`** for `useIsMobile()` — pattern already in `spools.test.tsx`
- **Test baseline**: 57 tests passing (26 Story 1.1 + 12 Story 1.2 + 9 Story 1.3 + 10 Story 1.4)
- **AlertDialog testing**: Query `[role="alertdialog"]` for the dialog container; query button text for Cancel/Delete/Close

### Project Structure Notes

**New Files:**
- `app/lib/derived.ts` — pure derived state functions (getReferencingFigures)
- `app/lib/derived.test.ts` — unit tests for derived functions
- `app/components/ui/alert-dialog.tsx` — shadcn install

**Modified Files:**
- `app/components/SpoolCard.tsx` — add delete button (Trash2, ghost) and `onDelete` prop
- `app/routes/spools.tsx` — add AlertDialog for delete confirmation, `deletingSpool` state, reference check logic
- `app/routes/spools.test.tsx` — add tests for delete flow (unreferenced, referenced, confirm, cancel)
- `app/components/SpoolCard.test.tsx` — add/update tests for delete button (may need to create this file if no SpoolCard-specific tests exist beyond route-level)

### Previous Story Intelligence (Story 1.4)

**Patterns Established:**
- Sheet/Drawer responsive pattern with `useIsMobile()`
- SpoolCard with edit button (ghost, Pencil, `size="icon-sm"`) — delete button should match this style
- State-driven UI containers: `open` boolean + entity reference (`editingSpool`) controls Sheet/Drawer — same pattern for `deletingSpool` controlling AlertDialog
- `key` prop on form for state reset: `key={editingSpool?.id ?? "create"}`
- Double-save prevention via local `saved` state flag

**Deferred from Story 1.4 (relevant to this story):**
- [Review][Defer] Editing concurrently deleted spool results in silent no-op — this story does NOT need to address this (single-user app, edit form closes before delete can happen; no concurrent modification scenario in practice)

**Review findings from 1.4 to learn from:**
- Drawer/Sheet `onOpenChange` must call full `handleClose()` to reset state (not just `setOpen(false)`) — same pattern applies to AlertDialog: `onOpenChange` must reset `deletingSpool`
- Double-action prevention: Save button disabled after click via `saved` state — consider whether rapid delete clicks need similar prevention (likely no: AlertDialog is modal, can't click delete while closed)

**Build State:** `npm run build` passes clean, 57 tests all passing, TypeScript strict mode, no warnings

### Git Intelligence

**Recent commits:**
- `fddb221` feat: add HexColorPicker component with tests and integrate into SpoolForm; enhance SpoolCard with edit functionality
- `9bfb52d` feat: implement SpoolCard component and SpoolLibrary route with empty state handling
- `704c395` feat: add app shell, sidebar navigation and dark mode (Story 1.2)
- `175430b` feat: add data model, state management & persistence layer (Story 1.1)

**Commit message format:** `feat: <description>`

### Story 2.1 Awareness

Story 2.1 (Figure Catalog View & Empty State) will be the first story in Epic 2. The `derived.ts` file created in this story establishes the pattern for all future derived state functions (`computeColorRanking`, `computeFigureProgress`, etc.). Keep `getReferencingFigures` simple and self-contained — future stories will add more functions to this file.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.5]
- [Source: _bmad-output/planning-artifacts/architecture.md — Referential Integrity, Entity Reference Pattern, State Management Patterns, Error Handling, Testing Strategy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Destructive Confirmation Principle, Modal Usage Guidelines]
- [Source: _bmad-output/planning-artifacts/prd.md — FR4]
- [Source: _bmad-output/implementation-artifacts/1-4-create-edit-spool-with-hex-color-picker.md — Previous story patterns, review findings, component patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Installed shadcn alert-dialog component via MCP server recommendation
- Created `app/lib/derived.ts` with `getReferencingFigures` — pure function for referential guard, derived during render (no useEffect)
- Added Trash2 delete button to SpoolCard alongside edit button in a flex container
- Wired AlertDialog into spools route with two cases: unreferenced (confirm delete) and referenced (Cannot Delete with figure list)
- Referencing figures computed as derived state during render, not stored in state
- All 70 tests pass (57 baseline + 3 derived unit + 2 SpoolCard component + 5 route-level AlertDialog + 3 existing SpoolCard tests updated with required props)
- Build passes clean with no warnings

### Change Log

- 2026-03-27: Story 1.5 implemented — delete spool with referential guard (all 5 tasks complete)

### File List

- `app/components/ui/alert-dialog.tsx` (new — shadcn install)
- `app/lib/derived.ts` (new — getReferencingFigures pure function)
- `app/lib/derived.test.ts` (new — 3 unit tests)
- `app/components/SpoolCard.tsx` (modified — added onDelete prop, Trash2 button, flex container)
- `app/components/SpoolCard.test.tsx` (modified — added 2 delete tests, updated existing tests with required props)
- `app/routes/spools.tsx` (modified — added AlertDialog, deletingSpool state, referential guard logic)
- `app/routes/spools.test.tsx` (modified — added 5 delete flow tests)
