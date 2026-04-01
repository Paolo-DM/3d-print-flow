# Story 2.3: Delete Figure with Cascade Confirmation

Status: done

## Story

As a user,
I want to delete figures I no longer need while understanding the impact on my print queue,
so that I can keep my catalog clean without accidentally losing queue progress.

## Acceptance Criteria

1. **Given** the user clicks delete on a figure that has NO active queue items, **When** the confirmation Dialog appears, **Then** it shows the figure name and confirms there are no queue items affected, with Cancel and Delete (destructive) buttons.

2. **Given** the user clicks delete on a figure that HAS active queue items, **When** the confirmation Dialog appears, **Then** it shows "Deleting this figure will also remove X queue item(s)" listing the affected items, with Cancel and Delete (destructive) buttons.

3. **Given** the user confirms deletion of a figure with active queue items, **When** the delete executes, **Then** the figure is removed from the store, all queue items referencing it are also removed, both changes are persisted to IndexedDB, and the catalog and queue views update immediately.

4. **Given** the user cancels the deletion, **When** they click Cancel, **Then** the Dialog closes with no changes.

## Tasks / Subtasks

- [x] Task 1: Add `deleteFigure` store mutation (AC: 3)
  - [x] 1.1 Add `deleteFigure: (id: string) => void` to `PrintFlowState` interface in `app/lib/store.ts`
  - [x] 1.2 Implement `deleteFigure` — MUST be atomic: remove the figure AND all queue items where `figureId === id` in a single `set()` call. Create new Maps for both `figures` and `queueItems`, delete the figure, iterate queueItems and delete matching entries, return both updated Maps
  - [x] 1.3 Follow exact `deleteSpool` pattern for the Map immutability: `const nextFigures = new Map(state.figures); nextFigures.delete(id);` — but extend with cascade: `const nextQueue = new Map(state.queueItems); for (const [qid, qi] of nextQueue) { if (qi.figureId === id) nextQueue.delete(qid); }`

- [x] Task 2: Add `computeAffectedQueueItems` pure function (AC: 1, 2)
  - [x] 2.1 Add to `app/lib/derived.ts`: `export function computeAffectedQueueItems(figureId: string, queueItems: Map<string, QueueItem>): QueueItem[]` — returns all queue items where `figureId` matches
  - [x] 2.2 Pattern: `Array.from(queueItems.values()).filter(qi => qi.figureId === figureId)` — mirrors `getReferencingFigures` pattern already in derived.ts
  - [x] 2.3 Import `QueueItem` from `~/lib/types`

- [x] Task 3: Add delete button to FigureCard (AC: 1, 2)
  - [x] 3.1 Add optional prop `onDelete?: (figure: Figure) => void` to `FigureCardProps` in `app/components/FigureCard.tsx`
  - [x] 3.2 When `onDelete` is provided, render a ghost Trash2 button next to the existing edit button — same pattern as SpoolCard (ghost variant, `size="icon-sm"`, `aria-label={`Delete ${figure.name}`}`)
  - [x] 3.3 Import `Trash2` from `lucide-react`
  - [x] 3.4 Backward-compatible: no delete button when `onDelete` not provided

- [x] Task 4: Integrate AlertDialog into catalog.tsx (AC: 1, 2, 3, 4)
  - [x] 4.1 Add state: `const [deletingFigure, setDeletingFigure] = useState<Figure | null>(null)`
  - [x] 4.2 Select `queueItems` from store: `const queueItems = usePrintFlowStore(s => s.queueItems)` and `deleteFigure` mutation
  - [x] 4.3 Compute affected items when dialog is open: `const affectedQueueItems = deletingFigure ? computeAffectedQueueItems(deletingFigure.id, queueItems) : []`
  - [x] 4.4 Wire `onDelete={handleDeleteFigure}` on each FigureCard where `handleDeleteFigure = (figure: Figure) => setDeletingFigure(figure)`
  - [x] 4.5 Render `AlertDialog` — open when `deletingFigure !== null`, `onOpenChange` clears state
  - [x] 4.6 Dialog title: "Delete Figure"
  - [x] 4.7 Dialog body (conditional):
    - If `affectedQueueItems.length === 0`: `"<figureName>" is not referenced by any queue items.`
    - If `affectedQueueItems.length > 0`: `Deleting "<figureName>" will also remove {count} queue item(s).`
  - [x] 4.8 Two buttons: Cancel (outline) + Delete (destructive variant)
  - [x] 4.9 `handleConfirmDelete`: call `deleteFigure(deletingFigure.id)`, then `setDeletingFigure(null)`
  - [x] 4.10 Close the Sheet/Drawer if it's open when delete is triggered (edge case: user could click delete from an edit context)

- [x] Task 5: Write tests (AC: 1-4)
  - [x] 5.1 Store mutation tests in `app/lib/store.test.ts`:
    - `deleteFigure` removes figure from figures Map
    - `deleteFigure` cascades: removes all queue items referencing the figure
    - `deleteFigure` does not affect queue items for other figures
    - `deleteFigure` no-ops for non-existent figure ID (state unchanged)
  - [x] 5.2 Derived function tests in `app/lib/derived.test.ts`:
    - `computeAffectedQueueItems` returns matching queue items
    - `computeAffectedQueueItems` returns empty array when no matches
    - `computeAffectedQueueItems` returns empty array for empty queueItems Map
  - [x] 5.3 Update `app/components/FigureCard.test.tsx`:
    - Delete button renders when `onDelete` provided
    - Delete button calls `onDelete` with the figure
    - No delete button when `onDelete` not provided
  - [x] 5.4 Update `app/routes/catalog.test.tsx`:
    - Delete button on FigureCard opens AlertDialog
    - AlertDialog shows "not referenced by any queue items" when no queue items exist
    - AlertDialog shows affected count when queue items reference the figure
    - Confirming delete removes figure from store
    - Confirming delete cascades to remove referencing queue items
    - Cancel closes dialog with no changes
  - [x] 5.5 Run full test suite — all existing 511 tests plus new tests must pass

### Review Findings

- [x] [Review][Patch] `deleteFigure` missing early-return guard for non-existent IDs — triggers spurious IndexedDB writes [app/lib/store.ts:81] — FIXED: added `if (!state.figures.has(id)) return state` guard and updated test to assert referential identity
- [x] [Review][Defer] `updateFigure` allows overwriting `id` field via spread at type boundary [app/lib/store.ts:75] — deferred, pre-existing pattern shared with `updateSpool`
- [x] [Review][Defer] `formContent` JSX eagerly created when Sheet/Drawer is closed [app/routes/catalog.tsx:99] — deferred, pre-existing pattern from story 2.2

## Dev Notes

### Architecture Requirements

**Store Mutation — `deleteFigure`:**

The `deleteFigure` mutation MUST be atomic. Unlike `deleteSpool` (which only deletes the spool), `deleteFigure` must cascade to queue items in a single `set()` call. This is a critical architectural requirement from the architecture doc: "Every mutation that changes entity data should be atomic — update all affected maps in a single `set()` call."

```ts
// Add to PrintFlowState interface:
deleteFigure: (id: string) => void

// Implementation (atomic cascade):
deleteFigure(id) {
  set((state) => {
    const nextFigures = new Map(state.figures)
    nextFigures.delete(id)
    const nextQueue = new Map(state.queueItems)
    for (const [qid, qi] of nextQueue) {
      if (qi.figureId === id) nextQueue.delete(qid)
    }
    return { figures: nextFigures, queueItems: nextQueue }
  })
},
```

The subscribe callback in store.ts already handles `state.figures !== prevState.figures` and `state.queueItems !== prevState.queueItems` for IndexedDB persistence. No persistence changes needed.

**Derived Function — `computeAffectedQueueItems`:**

Add to `app/lib/derived.ts` following the existing `getReferencingFigures` pattern:

```ts
export function computeAffectedQueueItems(
  figureId: string,
  queueItems: Map<string, QueueItem>,
): QueueItem[] {
  return Array.from(queueItems.values()).filter(
    (qi) => qi.figureId === figureId,
  )
}
```

### Existing Codebase Context

**Direct Pattern References (MUST follow):**
- `deleteSpool` in `app/lib/store.ts:52-58` — reference for Map immutability pattern, but extend with cascade logic
- AlertDialog in `app/routes/spools.tsx:150-188` — reference for dialog integration pattern: `deletingSpool` state, conditional dialog content, `handleConfirmDelete`. Key difference: spool deletion BLOCKS if referenced (shows "Cannot delete"), figure deletion CASCADES (shows impact then allows)
- `SpoolCard.tsx:42-49` — reference for delete button: ghost variant, `size="icon-sm"`, Trash2 icon, `aria-label`
- `getReferencingFigures` in `app/lib/derived.ts:3-10` — reference for `computeAffectedQueueItems` pattern
- FigureCard already has an edit button (story 2.2) — add delete button alongside it in the same button group

**Critical Difference from Spool Delete:**
- Spool deletion = referential GUARD (blocks if referenced → shows "Cannot delete — used by: [figure names]")
- Figure deletion = CASCADE (always allowed → shows impact count, then deletes figure + all referencing queue items)

**Already Installed and Available:**
- `app/components/ui/alert-dialog.tsx` — AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
- `app/components/ui/button.tsx` — Button with `variant="destructive"`
- `app/lib/derived.ts` — already has `getReferencingFigures`, add `computeAffectedQueueItems` here
- `lucide-react` — Trash2 icon (already used in SpoolCard)

**QueueItems Map Exists But Is Empty:**
The store already has `queueItems: Map<string, QueueItem>` from story 1.1 (data model setup). Queue items are not created until Epic 3 (story 3.1), so during testing of this story the queueItems Map will be empty unless explicitly populated via `store.setState()`. The cascade logic must still be implemented and tested — populate queueItems in test setup to verify cascade behavior.

**Component Hierarchy (catalog.tsx after this story):**
```
catalog.tsx (route)
├── Page header (h1 + "Add Figure" button)
├── Empty state (conditional)
│   └── shadcn Empty → "Add Figure" CTA
├── Card grid (conditional)
│   └── FigureCard (one per figure)
│       └── Edit button (Pencil) + Delete button (Trash2) — both ghost
├── Sheet (desktop) OR Drawer (mobile)
│   └── FigureForm
├── AlertDialog (delete confirmation)
│   ├── Title: "Delete Figure"
│   ├── Body: impact summary (conditional on queue items)
│   └── Footer: Cancel (outline) + Delete (destructive)
```

**State in catalog.tsx after this story:**
```ts
const [open, setOpen] = useState(false)                           // Sheet/Drawer
const [editingFigure, setEditingFigure] = useState<Figure | null>(null)  // edit form
const [deletingFigure, setDeletingFigure] = useState<Figure | null>(null) // delete dialog
const isMobile = useIsMobile()
```

### Key Patterns to Follow

1. **No `useMemo`/`useCallback`/`React.memo`** — React Compiler handles memoization
2. **No `useEffect`** — derive `affectedQueueItems` during render, not in an effect
3. **Atomic mutations** — `deleteFigure` updates both `figures` and `queueItems` Maps in a single `set()` call
4. **Use shadcn semantic tokens** — `bg-background`, `text-foreground`, `text-destructive` for delete button text in dialog
5. **Import ordering**: React/RR → third-party (lucide-react) → `~/lib/` → `~/components/` → relative
6. **Use `cn()`** from `~/lib/utils` for conditional Tailwind classes
7. **Co-locate tests** next to source files
8. **`interface` for object shapes** — strict TypeScript
9. **Direct Lucide imports** for tree-shaking: `import { Trash2 } from "lucide-react"`
10. **No success toasts** — visible state change (figure disappears) is sufficient feedback
11. **AlertDialog for destructive confirmation only** — not Sheet, not inline
12. **Destructive button variant only inside AlertDialog** — never as standalone button in main UI
13. **Radix UI unified package** — `import { AlertDialog } from "radix-ui"` (but use the shadcn wrappers from `~/components/ui/alert-dialog`)

### UX Requirements

**Dialog Content (from UX spec):**
- Title: "Delete Figure"
- Body varies by impact:
  - Zero queue items: `"<Name>" is not referenced by any queue items.`
  - Has queue items: `Deleting "<Name>" will also remove {count} queue item(s).`
- Footer: Cancel (outline variant, left) + Delete (destructive variant, right)
- Dialog closes on Cancel click, Escape key, or overlay click
- Destructive red button color: only inside the dialog, never standalone

**Delete Button on FigureCard:**
- Ghost variant, `size="icon-sm"`, Trash2 icon
- Positioned next to the existing edit (Pencil) button
- `aria-label={`Delete ${figure.name}`}` for accessibility
- Meets 44px minimum tap target via padding

### Testing Standards

- **Framework**: Vitest + React Testing Library
- **Environment**: jsdom
- **Run**: `npm test`
- **Store access in tests**: `usePrintFlowStore.setState()` to set up test state including queueItems
- **Import `fake-indexeddb/auto`** at top of test files interacting with the store
- **Mock `window.matchMedia`** for `useIsMobile()` — pattern in `spools.test.tsx`
- **Test factories**: `createFigure()` and `createSpool()` from `~/lib/test-utils`. No `createQueueItem()` factory exists yet — create queue items inline in tests with `{ id: "q1", figureId: "f1", type: "stock" as const, completedColors: [] }`
- **Test baseline**: 511 tests passing across 75 test files

### Previous Story Intelligence (Story 2.2)

**Patterns established in story 2.2 to carry forward:**
- FigureCard already has an `onEdit` prop with ghost Pencil button — add `onDelete` following the same optional prop pattern
- catalog.tsx already has Sheet/Drawer integration with `open`/`editingFigure` state — add `deletingFigure` state for AlertDialog
- Store already has `createFigure`/`updateFigure` — add `deleteFigure` following `deleteSpool` cascade pattern
- FigureCard button area has a flex row for action buttons — Trash2 goes next to Pencil

**Review findings from story 2.2 to avoid:**
- Import ordering: React/RR → third-party → `~/lib/` → `~/components/` → relative
- Trim string fields on save (franchise was not trimmed — already fixed in 2.2)
- Filter dangling spool IDs (already fixed in 2.2)

### Git Intelligence

**Recent commits:**
- `2915241` merge: story 2.2 into develop
- `3b8ea18` fix: code review fixes for story 2.2 (pass 2)
- `11eef5a` fix: code review fixes for story 2.2 (pass 1)
- `263c626` feat: story 2.2 — create edit figure, with color assignment

Commit `a27bda3` (story 1.5 — delete spool) is the most relevant reference for the delete + AlertDialog pattern.

### Project Structure Notes

**Modified Files:**
- `app/lib/store.ts` — add `deleteFigure` mutation (interface + implementation)
- `app/lib/derived.ts` — add `computeAffectedQueueItems` function
- `app/components/FigureCard.tsx` — add optional `onDelete` prop with Trash2 button
- `app/routes/catalog.tsx` — add AlertDialog, `deletingFigure` state, wire delete flow

**Updated Test Files:**
- `app/lib/store.test.ts` — add deleteFigure mutation tests (cascade + no-op)
- `app/lib/derived.test.ts` — add computeAffectedQueueItems tests
- `app/components/FigureCard.test.tsx` — add delete button tests
- `app/routes/catalog.test.tsx` — add AlertDialog integration tests

**No New Files** — all changes are additions to existing files.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — Referential Integrity (line 359), State Management Patterns (line 514-532), Process Patterns: Referential Integrity Errors (line 540)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Interaction Tiers (line 774-781), Dialog Pattern (line 849-853), Button Hierarchy (line 783-793), Feedback Patterns (line 795-808)]
- [Source: _bmad-output/planning-artifacts/prd.md — FR9]
- [Source: app/lib/store.ts — deleteSpool mutation (line 52-58)]
- [Source: app/routes/spools.tsx — AlertDialog pattern (line 150-188)]
- [Source: app/components/SpoolCard.tsx — Delete button pattern (line 42-49)]
- [Source: app/lib/derived.ts — getReferencingFigures pattern (line 3-10)]
- [Source: _bmad-output/implementation-artifacts/2-2-create-edit-figure-with-color-assignment.md — Previous story]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded without issues.

### Completion Notes List

- Added `deleteFigure` to `PrintFlowState` interface and implemented as atomic cascade: removes figure and all referencing queue items in a single `set()` call.
- Added `computeAffectedQueueItems` to `derived.ts` following the `getReferencingFigures` pattern.
- Updated `FigureCard` with optional `onDelete` prop; renders Trash2 ghost button alongside edit button; backward-compatible.
- Updated `catalog.tsx`: added `deletingFigure` state, `queueItems`/`deleteFigure` store selectors, `affectedQueueItems` derived during render (no useEffect), AlertDialog with conditional body text and destructive Delete button. `handleDeleteFigure` also closes any open Sheet/Drawer.
- All 4 new test suites pass; 747 total tests pass (no regressions).

### File List

- `app/lib/store.ts` (modified)
- `app/lib/derived.ts` (modified)
- `app/components/FigureCard.tsx` (modified)
- `app/routes/catalog.tsx` (modified)
- `app/lib/store.test.ts` (modified)
- `app/lib/derived.test.ts` (modified)
- `app/components/FigureCard.test.tsx` (modified)
- `app/routes/catalog.test.tsx` (modified)

## Change Log

- 2026-03-30: Story 2.3 implemented — delete figure with cascade confirmation. Added `deleteFigure` mutation (atomic cascade), `computeAffectedQueueItems` derived function, delete button on FigureCard, and AlertDialog integration in catalog route. 16 new tests added; 747 total pass.
