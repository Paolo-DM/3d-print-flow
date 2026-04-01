# Story 4.2: JSON Import with Atomic Replace

Status: review

## Story

As a user,
I want to import a previously exported JSON file to restore all my data,
So that I can recover from data loss or transfer data to a new device.

## Acceptance Criteria

1. **Given** the Import action in the sidebar **When** the user clicks it **Then** a file picker opens allowing selection of a JSON file

2. **Given** the user selects a valid JSON file **When** the file is loaded **Then** a confirmation AlertDialog appears with the warning "This will replace ALL current data with the imported file. This action cannot be undone." with Cancel and Confirm buttons

3. **Given** the user confirms the import **When** the import executes **Then** `_persist` is set to false, all three Maps in the Zustand store are replaced with parsed data via `fromJSON()`, `db.replaceAll()` writes all data in a single idb transaction (atomic), `_persist` is set to true, and the app re-renders with the imported state

4. **Given** the import transaction fails at any point **When** an error occurs during `db.replaceAll()` **Then** the transaction rolls back, existing data in IndexedDB remains unchanged, the AlertDialog stays open with an error message, and no store state is corrupted

5. **Given** the user selects an invalid or malformed JSON file **When** parsing fails **Then** the AlertDialog shows an error message and existing data remains untouched

6. **Given** the user clicks Cancel on the confirmation AlertDialog **When** the AlertDialog closes **Then** no changes are made to any data

## Tasks / Subtasks

- [x] Task 1: Add `importData()` and validation to `app/lib/export-import.ts` (AC: 1, 2, 3, 4, 5)
  - [x] 1.1 Add `validateExportEnvelope(data: unknown): data is ExportEnvelope` — runtime validation for incoming JSON: check `version` is number, `exportedAt` is string, `data` exists with `spools`, `figures`, `queueItems` as `Record<string, Entity>` (validate entity shapes: Spool must have `id`, `name`, `hex`; Figure must have `id`, `name`, `franchise`, `size`, `notes`, `requiredColors`; QueueItem must have `id`, `figureId`, `type` of "stock"|"order", `completedColors`)
  - [x] 1.2 Add `readJsonFile(file: File): Promise<unknown>` — wraps `FileReader` to read file as text + `JSON.parse`, throws on invalid JSON
  - [x] 1.3 Add `importData(file: File): Promise<void>` — orchestrates the full import flow: `readJsonFile()` → `validateExportEnvelope()` → `setPersist(false)` → `fromJSON(data.data)` → `db.replaceAll(data.data)` → `setPersist(true)`. On `db.replaceAll()` failure: restore previous state via `fromJSON(previousState)`, `setPersist(true)`, re-throw error
  - [x] 1.4 Wrap the `fromJSON()` + `db.replaceAll()` calls inside `startTransition()` (architecture rule: `rerender-transitions` for full data replace)

- [x] Task 2: Add import tests to `app/lib/export-import.test.ts` (AC: 1, 2, 3, 4, 5)
  - [x] 2.1 Test `validateExportEnvelope` accepts valid export data
  - [x] 2.2 Test `validateExportEnvelope` rejects missing `version` field
  - [x] 2.3 Test `validateExportEnvelope` rejects missing `data` field
  - [x] 2.4 Test `validateExportEnvelope` rejects malformed entity records (e.g., spool missing `hex`)
  - [x] 2.5 Test `readJsonFile` parses valid JSON file content
  - [x] 2.6 Test `readJsonFile` throws on invalid JSON
  - [x] 2.7 Test `importData` replaces all store state on success
  - [x] 2.8 Test `importData` calls `db.replaceAll()` with correct data
  - [x] 2.9 Test `importData` restores previous state when `db.replaceAll()` fails
  - [x] 2.10 Test `importData` throws validation error for malformed files

- [x] Task 3: Create `ImportDialog` component in `app/components/ImportDialog.tsx` (AC: 1, 2, 4, 5, 6)
  - [x] 3.1 Create `ImportDialog` component using shadcn `AlertDialog` — controlled open state, receives an `open` boolean and `onOpenChange` callback
  - [x] 3.2 AlertDialog content: title "Replace All Data?", description "This will replace ALL current data with the imported file. This action cannot be undone."
  - [x] 3.3 Footer buttons: Cancel (closes dialog, no action) and "Replace All Data" (destructive variant)
  - [x] 3.4 On Confirm click: call `importData(selectedFile)`, handle promise — on success close dialog, on error display error message inline in the dialog (do NOT close)
  - [x] 3.5 Show selected filename in the dialog body for user confirmation
  - [x] 3.6 Error state: render error message text (e.g., "Invalid file format" or "Import failed — your data has not been changed") below the description, clear error on dialog close

- [x] Task 4: Wire up Import button in `app/components/AppSidebar.tsx` (AC: 1, 2, 6)
  - [x] 4.1 Remove `disabled` from the Import `SidebarMenuButton`
  - [x] 4.2 Add a hidden `<input type="file" accept=".json" />` ref element
  - [x] 4.3 On Import button click: trigger the hidden file input's `click()` method
  - [x] 4.4 On file selection (`onChange`): open the `ImportDialog` with the selected file
  - [x] 4.5 On dialog close (success or cancel): reset the file input value so the same file can be re-selected

- [x] Task 5: Add ImportDialog and AppSidebar import tests (AC: all)
  - [x] 5.1 Test ImportDialog renders confirmation warning text
  - [x] 5.2 Test ImportDialog Cancel closes without calling importData
  - [x] 5.3 Test ImportDialog Confirm triggers importData with the file
  - [x] 5.4 Test ImportDialog shows error message on import failure (dialog stays open)
  - [x] 5.5 Test ImportDialog closes on successful import
  - [x] 5.6 Update AppSidebar test: Import button is now enabled (update existing assertion)
  - [x] 5.7 Test AppSidebar Import button click opens file picker (mock file input)
  - [x] 5.8 Test file selection opens ImportDialog

- [x] Task 6: Run full test suite — zero regressions (AC: all)
  - [x] 6.1 All new import tests pass
  - [x] 6.2 All existing 246+ tests still pass

## Dev Notes

### Key Architecture Rules

- **No `useEffect`** — import is triggered by click event handlers, not Effects
- **No `useMemo` / `useCallback` / `React.memo`** — React Compiler handles memoization
- **No success toasts** — the visible state change (all data refreshed) IS the success feedback (architecture: "No toasts for normal operations")
- **Wrap data replace in `startTransition()`** — architecture rule `rerender-transitions` requires JSON import (full data replace) to use `startTransition` for non-blocking re-renders
- **Runtime validation at system boundaries** — JSON import is external data entering the app, so it requires runtime validation (architecture line 261). This is the ONLY place in the app that validates entity shapes at runtime
- **AlertDialog for destructive confirmations** — import is a destructive action (full data replace), use AlertDialog per UX spec (Dialog reserved for destructive confirmations only)
- **Import errors stay in dialog** — on failure: keep AlertDialog open, show error message, preserve existing data (architecture line 538, 357)

### Existing Infrastructure (DO NOT Rebuild)

| What | Where | Notes |
|------|-------|-------|
| `ExportEnvelope` interface | `app/lib/export-import.ts:3-7` | Reuse for validation type guard |
| `buildExportData()` | `app/lib/export-import.ts:9-15` | Use `toJSON()` snapshot for rollback state |
| `fromJSON(data)` | `app/lib/store.ts:188-208` | Replaces all 3 Maps atomically in store. Backfills `completedAt: null` for legacy data |
| `toJSON()` | `app/lib/store.ts:179-186` | Snapshot current state before import (for rollback) |
| `setPersist(false/true)` | `app/lib/store.ts:7-16` | Module-level flag. Suppresses IndexedDB writes during import |
| `db.replaceAll(data)` | `app/lib/db.ts:75-104` | Single idb transaction across all 3 stores — rolls back on failure |
| AlertDialog component | `app/components/ui/alert-dialog.tsx` | Full Radix AlertDialog with Action, Cancel, destructive variant |
| Import button placeholder | `app/components/AppSidebar.tsx:122-127` | Currently `disabled`, remove the `disabled` prop |
| `Upload` icon | Already imported in `AppSidebar.tsx` | Lucide icon for Import button |
| Test factories | `app/lib/test-utils.ts` | `createSpool()`, `createFigure()`, `createQueueItem()` |
| Existing AlertDialog usage | `QueueItemCard.tsx`, `catalog.tsx`, `spools.tsx` | Follow the same pattern for confirmation dialogs |

### Import Flow Sequence (from architecture)

```
[User clicks Import in sidebar]
  → Hidden <input type="file" accept=".json"> triggers
  → User selects file
  → ImportDialog opens with confirmation warning

[User clicks "Replace All Data"]
  → readJsonFile(file) → JSON.parse
  → validateExportEnvelope(parsed) → type guard validation
  → Snapshot current state: toJSON() (for rollback)
  → setPersist(false)
  → startTransition(() => {
      fromJSON(validatedData.data) → store.setState with new Maps
    })
  → db.replaceAll(validatedData.data) → single idb transaction (atomic)
  → setPersist(true)
  → Dialog closes, UI re-renders with imported state

[On db.replaceAll() failure]
  → Catch error
  → fromJSON(previousSnapshot) → restore original state
  → setPersist(true)
  → Dialog stays open, error message displayed
  → IndexedDB unchanged (transaction rolled back automatically)

[On validation failure]
  → Dialog stays open, error message: "Invalid file format"
  → No state changes, no IndexedDB changes
```

### Validation Strategy

Runtime validation is required because JSON import is an **external system boundary** (architecture line 261). Validate the `ExportEnvelope` shape:

```typescript
function validateExportEnvelope(data: unknown): data is ExportEnvelope {
  // 1. Check top-level: version (number), exportedAt (string), data (object)
  // 2. Check data.spools, data.figures, data.queueItems are Record<string, Entity>
  // 3. Validate entity shapes:
  //    - Spool: { id: string, name: string, hex: string }
  //    - Figure: { id: string, name: string, franchise: string, size: number, notes: string, requiredColors: string[] }
  //    - QueueItem: { id: string, figureId: string, type: "stock"|"order", completedColors: string[], completedAt?: string|null }
  // 4. Do NOT validate referential integrity (figureId → figures, requiredColors → spools)
  //    — the app tolerates orphaned references gracefully
}
```

No validation library (Zod, etc.) is used in this project — use plain TypeScript type guards with manual checks.

### File Input Pattern

Use a hidden `<input type="file">` controlled via ref, triggered by the Import button click:

```typescript
const fileInputRef = useRef<HTMLInputElement>(null)

// Import button onClick:
fileInputRef.current?.click()

// On file selection:
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    setSelectedFile(file)
    setImportDialogOpen(true)
  }
}

// On dialog close: reset input so same file can be re-selected
fileInputRef.current!.value = ""
```

### Error Messages

| Scenario | Error Message |
|----------|--------------|
| Invalid JSON (parse failure) | "The selected file is not valid JSON." |
| Missing required fields | "Invalid file format. Please select a file exported from 3D Print Flow." |
| `db.replaceAll()` fails | "Import failed — your data has not been changed. Please try again." |

### Testing Strategy

**Unit tests for `export-import.ts`:**
- `validateExportEnvelope`: valid data, missing fields, wrong types, malformed entities
- `readJsonFile`: valid JSON file, invalid JSON file (use `new File()` constructor)
- `importData`: success flow (mock `db.replaceAll`), failure flow (mock `db.replaceAll` to reject), validation failure flow

**Component tests for `ImportDialog.tsx`:**
- Renders warning text and buttons
- Cancel closes without calling import
- Confirm triggers import
- Error state renders error message and stays open
- Success closes dialog

**Component tests for `AppSidebar.tsx`:**
- Import button is enabled (update existing disabled assertion)
- Click triggers file input
- File selection opens dialog

**Testing environment:**
- Use `vitest` with `fake-indexeddb`
- Mock `db.replaceAll` for unit tests (avoid real IndexedDB in import flow tests)
- Use `new File(["..."], "test.json", { type: "application/json" })` for test files
- Pattern: `beforeEach` resets store state (consistent with existing tests)
- Component tests: `// @vitest-environment jsdom` directive

### Import Ordering (per architecture)

```typescript
// app/lib/export-import.ts additions:
// 1. React imports (startTransition)
import { startTransition } from "react"
// 2. Third-party (none needed)
// 3. Internal app/lib/
import { fromJSON, toJSON, setPersist } from "~/lib/store"
import { replaceAll } from "~/lib/db"

// app/components/ImportDialog.tsx:
// 1. React imports (useState)
import { useState } from "react"
// 2. Third-party (none needed)
// 3. Internal app/lib/
import { importData } from "~/lib/export-import"
// 4. Internal app/components/
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
```

### Project Structure Notes

- `app/lib/export-import.ts` — existing file, add import functions and validation alongside existing export functions
- `app/lib/export-import.test.ts` — existing file, add import test cases alongside existing export tests
- `app/components/ImportDialog.tsx` — new file for the import confirmation AlertDialog
- `app/components/ImportDialog.test.tsx` — new co-located test file
- `app/components/AppSidebar.tsx` — existing file, modify Import button + add file input
- `app/components/AppSidebar.test.tsx` — existing file, update Import button tests
- No new routes, no new dependencies, no new UI primitives needed

### Anti-Patterns to Avoid

- Do NOT add a success toast after import — the refreshed UI state IS the confirmation
- Do NOT close the AlertDialog on import failure — keep it open with the error message
- Do NOT validate referential integrity during import — the app handles orphaned refs gracefully
- Do NOT use `useEffect` for file reading or import orchestration — everything happens in event handlers
- Do NOT read from IndexedDB to check current state — use `toJSON()` from the in-memory store for the rollback snapshot
- Do NOT create a separate "import service" or "validation utility" module — keep everything in `export-import.ts`
- Do NOT use Zod or any validation library — use plain TypeScript type guards (consistent with project conventions)
- Do NOT add `useMemo`/`useCallback` — React Compiler handles this
- Do NOT modify the Export button or export functionality — that's done in Story 4.1
- Do NOT use `store.setState({ _persist: false })` — use the module-level `setPersist(false)` function instead (the `_persist` flag is NOT in Zustand state; it's a module-level variable)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.2, lines 694-725]
- [Source: _bmad-output/planning-artifacts/prd.md — FR33: Import JSON to restore data, FR34: Import with full-replace confirmation]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR8: Export produces re-importable snapshot, NFR9: Import is atomic]
- [Source: _bmad-output/planning-artifacts/architecture.md — Import flow sequence, lines 800-807]
- [Source: _bmad-output/planning-artifacts/architecture.md — Runtime validation at system boundaries, line 261]
- [Source: _bmad-output/planning-artifacts/architecture.md — Import errors: keep Dialog open, line 538, 357]
- [Source: _bmad-output/planning-artifacts/architecture.md — startTransition for import, line 150]
- [Source: _bmad-output/planning-artifacts/architecture.md — _persist flag is module-level, line 871]
- [Source: _bmad-output/planning-artifacts/architecture.md — db.replaceAll() atomic transaction, lines 700-706]
- [Source: _bmad-output/planning-artifacts/architecture.md — fromJSON()/toJSON() helpers, lines 330-331]
- [Source: _bmad-output/planning-artifacts/architecture.md — No success toasts, lines 549-550]
- [Source: _bmad-output/planning-artifacts/architecture.md — AlertDialog for destructive confirmations, line 683 (UX spec)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Import as destructive action with confirmation, line 781]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Import failure: dialog stays open, line 805]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Export/Import always visible in sidebar, line 447]
- [Source: app/lib/export-import.ts — ExportEnvelope interface, lines 3-7]
- [Source: app/lib/store.ts — fromJSON(), lines 188-208]
- [Source: app/lib/store.ts — toJSON(), lines 179-186]
- [Source: app/lib/store.ts — setPersist/getPersist, lines 7-16]
- [Source: app/lib/db.ts — replaceAll(), lines 75-104]
- [Source: app/components/ui/alert-dialog.tsx — AlertDialog components]
- [Source: app/components/AppSidebar.tsx — Import button placeholder, lines 122-127]

### Previous Story Intelligence

From Story 4.1 (JSON Export):
- 246 tests passing at completion (7 new tests added)
- Created `app/lib/export-import.ts` with `buildExportData()`, `triggerDownload()`, `exportData()`, `ExportEnvelope` interface
- `toJSON()` and `fromJSON()` confirmed working in `store.ts` (roundtrip tested in both `store.test.ts` and `export-import.test.ts`)
- Debug learnings: `// @vitest-environment jsdom` required for browser API tests (FileReader, DOM elements), `fireEvent` used over `@testing-library/user-event` (not installed)
- Export uses `buildExportData()` to create the envelope — import can validate against the same `ExportEnvelope` interface
- Import button was explicitly left disabled in AppSidebar for this story

### Git Intelligence

Recent commits show Story 4.1 (JSON Export) just completed:
- `5d4f55b` feat: implement export data functionality with download trigger and corresponding tests
- All changes followed established patterns: co-located tests, factory functions from `test-utils.ts`, store helpers
- `export-import.ts` and `export-import.test.ts` are the files to extend
- No new dependencies were added for export — import also needs no new deps

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered. All tests passed on first run.

### Completion Notes List

- Task 1: Added `validateExportEnvelope()` type guard with entity shape validation, `readJsonFile()` with FileReader + JSON.parse, and `importData()` orchestrating the full import flow with rollback on failure. `startTransition` wraps the `fromJSON()` call per architecture rule.
- Task 2: Added 13 unit tests covering validation (valid data, missing fields, malformed entities, non-object input, empty collections), file reading (valid/invalid JSON), and importData (success flow, db.replaceAll call verification, rollback on failure, validation error).
- Task 3: Created `ImportDialog` component with controlled AlertDialog, destructive "Replace All Data" action, error display inline, filename display, and error clearing on close.
- Task 4: Wired Import button in AppSidebar — removed `disabled`, added hidden file input with ref, connected click handler and file change handler, added ImportDialog with file input reset on close.
- Task 5: Added 6 ImportDialog tests (warning text, cancel, confirm, error stays open, success closes, filename display) and 2 AppSidebar tests (file input trigger, dialog open on file select). Updated existing assertion from disabled to enabled.
- Task 6: Full test suite — 268 tests passing, zero regressions.

### File List

- `app/lib/export-import.ts` — modified (added validateExportEnvelope, readJsonFile, importData + helper functions)
- `app/lib/export-import.test.ts` — modified (added 13 import tests)
- `app/components/ImportDialog.tsx` — new (import confirmation AlertDialog component)
- `app/components/ImportDialog.test.tsx` — new (6 component tests)
- `app/components/AppSidebar.tsx` — modified (enabled Import button, added file input + ImportDialog wiring)
- `app/components/AppSidebar.test.tsx` — modified (updated disabled assertion, added 2 import tests)

### Change Log

- 2026-03-31: Implemented JSON import with atomic replace — 22 new tests added, 268 total passing
