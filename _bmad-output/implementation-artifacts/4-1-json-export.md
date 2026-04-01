# Story 4.1: JSON Export

Status: done

## Story

As a user,
I want to export all my data as a single JSON file with one click,
So that I have a complete backup I can use to restore my data if anything goes wrong.

## Acceptance Criteria

1. **Given** the Export action in the sidebar **When** the user clicks it **Then** a JSON file is downloaded containing all spools, figures, queue items (with chip progress and completedAt), a `version` field (integer `1`), and an `exportedAt` timestamp (ISO 8601 UTC)

2. **Given** the JSON export format **When** the file is generated **Then** all `Map<string, Entity>` stores are serialized to `Record<string, Entity>` via the existing `toJSON()` helper in `app/lib/store.ts:179-186`, producing a complete snapshot of all app data

3. **Given** the Export button in the sidebar footer **When** viewed at any time **Then** it is enabled and always visible — not buried in settings or behind a menu

4. **Given** the export completes **When** the browser downloads the file **Then** no success toast is shown — the browser download itself is the confirmation (per architecture: "No success toasts — the visible state change IS the success feedback")

## Tasks / Subtasks

- [x] Task 1: Create `app/lib/export-import.ts` with `exportData()` function (AC: 1, 2)
  - [x] 1.1 Create the file at `app/lib/export-import.ts`
  - [x] 1.2 Implement `exportData()` that calls `toJSON()` from store, wraps in `{ version: 1, exportedAt: new Date().toISOString(), data: ... }`, serializes to JSON string, and triggers browser download via a dynamically created `<a>` element with a Blob URL
  - [x] 1.3 Filename format: `3d-print-flow-export-YYYY-MM-DD.json` using the current local date
  - [x] 1.4 Clean up the temporary Blob URL after download triggers (`URL.revokeObjectURL`)

- [x] Task 2: Create `app/lib/export-import.test.ts` with export tests (AC: 1, 2, 4)
  - [x] 2.1 Test that `exportData()` produces correct JSON structure with `version`, `exportedAt`, and `data` fields
  - [x] 2.2 Test that `data` contains serialized `spools`, `figures`, and `queueItems` as `Record<string, Entity>`
  - [x] 2.3 Test that `exportedAt` is a valid ISO 8601 UTC string
  - [x] 2.4 Test that `version` is exactly `1`
  - [x] 2.5 Test roundtrip: `exportData()` output can be parsed back and fed to `fromJSON()` to restore identical state

- [x] Task 3: Wire up the Export sidebar button (AC: 3, 4)
  - [x] 3.1 In `app/components/AppSidebar.tsx`, remove `disabled` from the Export `SidebarMenuButton`
  - [x] 3.2 Add `onClick` handler that calls `exportData()` from `app/lib/export-import.ts`
  - [x] 3.3 Keep the Import button `disabled` (that's Story 4.2)

- [x] Task 4: Update AppSidebar tests (AC: 3)
  - [x] 4.1 Update existing test that asserts Export button is disabled — it should now be enabled
  - [x] 4.2 Add test that clicking Export triggers the download flow (mock URL.createObjectURL and document.createElement)
  - [x] 4.3 Verify Import button remains disabled

- [x] Task 5: Run full test suite — zero regressions (AC: all)
  - [x] 5.1 All new export tests pass
  - [x] 5.2 All existing 239+ tests still pass

## Dev Notes

### Key Architecture Rules

- **No `useEffect`** — export is triggered by a click event handler, not an Effect
- **No `useMemo` / `useCallback` / `React.memo`** — React Compiler handles memoization
- **No success toasts** — the browser download is the feedback (architecture: "No toasts for normal operations — chip toggle, CRUD, export")
- **Store `toJSON()` already exists** at `app/lib/store.ts:179-186` — reuse it, do NOT reimplement serialization

### Existing Infrastructure (DO NOT Rebuild)

| What | Where | Notes |
|------|-------|-------|
| `toJSON()` | `app/lib/store.ts:179-186` | Converts all 3 Maps to Records — import and call it |
| `fromJSON(data)` | `app/lib/store.ts:188-208` | For roundtrip test verification |
| Export button placeholder | `app/components/AppSidebar.tsx:115-120` | Currently `disabled`, remove the `disabled` prop |
| Import button placeholder | `app/components/AppSidebar.tsx:121-126` | Keep `disabled` — that's Story 4.2 |
| `Download` icon | Already imported in `AppSidebar.tsx` | Lucide icon for Export button |
| Test factories | `app/lib/test-utils.ts` | `createSpool()`, `createFigure()`, `createQueueItem()` |
| Sonner toaster | `app/root.tsx:66` | Already configured — but NOT needed for export (no toast on success) |

### JSON Export Format (from architecture.md)

```json
{
  "version": 1,
  "exportedAt": "2026-03-26T14:30:00.000Z",
  "data": {
    "spools": { "uuid-1": { "id": "uuid-1", "name": "White PLA", "hex": "#FFFFFF" } },
    "figures": { "uuid-2": { "id": "uuid-2", "name": "Naruto", "franchise": "Naruto", "size": 60, "notes": "", "requiredColors": ["uuid-1"] } },
    "queueItems": { "uuid-3": { "id": "uuid-3", "figureId": "uuid-2", "type": "stock", "completedColors": [], "completedAt": null } }
  }
}
```

Key format rules:
- `version`: integer `1` (incremented on future schema changes)
- `exportedAt`: ISO 8601 UTC string (`new Date().toISOString()`)
- `data`: Maps serialized to Records via `toJSON()`
- All field names: camelCase
- Entity references: store target entity's `id` string (`figureId`, spool IDs in `requiredColors`)

### Browser Download Pattern

Use the standard Blob + anchor pattern:

```typescript
function triggerDownload(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

This is the standard browser-compatible approach — no libraries needed.

### File Naming

Filename: `3d-print-flow-export-YYYY-MM-DD.json`

Use local date (not UTC) for the filename — the user's local date is more intuitive for identifying backups. The `exportedAt` field inside the JSON uses UTC for machine precision.

### Testing Strategy

**Unit tests for `export-import.ts`:**
- Test the JSON structure (version, exportedAt, data shape)
- Test roundtrip: export → parse → fromJSON → state matches
- Mock browser APIs for download trigger (`URL.createObjectURL`, `document.createElement`)

**Component tests for `AppSidebar.tsx`:**
- Export button is enabled (no `disabled` attribute)
- Import button remains disabled
- Click handler triggers export (mock `exportData`)

**Testing environment:**
- Use `vitest` with `fake-indexeddb`
- Store state setup: populate via `store.getState().addSpool(...)` etc., or `fromJSON()` with test data
- Factory helpers from `app/lib/test-utils.ts`
- Pattern: `beforeEach` resets store state (consistent with existing tests)

### Import Ordering (per architecture)

```typescript
// 1. React / React Router imports (none needed for export-import.ts)
// 2. Third-party libraries (none needed)
// 3. Internal app/lib/ imports
import { toJSON } from "~/lib/store"
```

### Project Structure Notes

- `app/lib/export-import.ts` — new file, architecture-prescribed location [Source: architecture.md, line 465, 642]
- `app/lib/export-import.test.ts` — co-located test file [Source: architecture.md, line 473-474]
- `app/components/AppSidebar.tsx` — existing file, modify Export button only [Source: AppSidebar.tsx:115-120]
- No new routes, no new components, no new dependencies

### Anti-Patterns to Avoid

- Do NOT add a success toast after export — the download IS the confirmation
- Do NOT create a loading spinner — export is instant for this data size
- Do NOT import from `idb` or `db.ts` — export reads from in-memory store via `toJSON()`, not from IndexedDB
- Do NOT add `useMemo`/`useCallback` — React Compiler handles this
- Do NOT create a separate "export service" or "download utility" module — keep everything in `export-import.ts`
- Do NOT modify the Import button — that's Story 4.2

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.1, lines 670-693]
- [Source: _bmad-output/planning-artifacts/prd.md — FR31: Export all data as JSON, FR32: Export always visible]
- [Source: _bmad-output/planning-artifacts/architecture.md — JSON Export Format, lines 488-506]
- [Source: _bmad-output/planning-artifacts/architecture.md — export-import.ts location, lines 465, 642]
- [Source: _bmad-output/planning-artifacts/architecture.md — Toast rules: no success toasts, line 549-550]
- [Source: _bmad-output/planning-artifacts/architecture.md — State read on demand in handlers, line 149]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Export always visible in sidebar, lines 447, 641, 834]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — No toast for export, line 801]
- [Source: app/lib/store.ts — toJSON() function, lines 179-186]
- [Source: app/lib/store.ts — fromJSON() function, lines 188-208]
- [Source: app/components/AppSidebar.tsx — Export button placeholder, lines 115-120]

### Previous Story Intelligence

From Story 3.7 (Edit Form Affected Queue Items Warning):
- 239 tests passing at completion
- All Epic 3 stories done — clean baseline for Epic 4
- Established patterns: co-located tests, factory functions from `test-utils.ts`, store selectors, no success toasts
- `toJSON()`/`fromJSON()` roundtrip already tested in `store.test.ts`

### Git Intelligence

Recent commits show Epic 3 completion:
- `46c8e8d` feat: add order and stock item separation in ColorRankingEntry and corresponding tests
- `adc64d8` feat: enhance queue item completion animations and add completed items management
- All changes followed established patterns: co-located tests, immutable sorts, store selectors
- No breaking changes or dependency updates that would affect export implementation

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initial `exportData` browser download test failed due to missing jsdom environment directive — added `// @vitest-environment jsdom`
- `@testing-library/user-event` not installed — switched to `fireEvent` (consistent with existing test patterns)

### Completion Notes List

- Created `app/lib/export-import.ts` with `buildExportData()` (pure data) and `exportData()` (triggers download)
- Exported `ExportEnvelope` interface for type safety
- Uses existing `toJSON()` from store — no serialization reimplementation
- Browser download via standard Blob + anchor + revokeObjectURL pattern
- Filename uses local date (`YYYY-MM-DD`), `exportedAt` uses UTC ISO 8601
- Export button enabled in sidebar footer with `onClick={exportData}` — no success toast
- Import button remains disabled (Story 4.2)
- 7 new tests (6 unit + 1 component), all 246 tests pass with zero regressions

### Change Log

- 2026-03-31: Implemented Story 4.1 JSON Export — all ACs satisfied, 246/246 tests pass

### File List

- `app/lib/export-import.ts` (new) — export data builder and browser download trigger
- `app/lib/export-import.test.ts` (new) — 6 unit tests for export structure, roundtrip, and download
- `app/components/AppSidebar.tsx` (modified) — Export button enabled with onClick handler
- `app/components/AppSidebar.test.tsx` (modified) — updated Export enabled assertion, added click test
