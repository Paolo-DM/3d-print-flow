# Story 4.3: Persistence Failure Notification with Retry

Status: review

## Story

As a user,
I want to be notified if my data fails to save and have a way to retry,
so that I never silently lose work.

## Acceptance Criteria

1. **Given** an IndexedDB write fails during the Zustand subscribe callback **When** the error is caught **Then** a Sonner toast appears within 2 seconds with the message "Changes saved in memory but not persisted" and a "Retry" action button

2. **Given** the persistence failure toast is visible **When** the user clicks "Retry" **Then** the failed write is attempted again; on success the toast dismisses, on failure it remains

3. **Given** the persistence failure toast **When** displayed **Then** it is non-blocking — the user can continue interacting with the app since in-memory state is the source of truth

4. **Given** normal app operation **When** every mutation succeeds in persisting to IndexedDB **Then** no toast is shown — no success toasts for normal operations

## Tasks / Subtasks

- [x] Task 1: Add persistence error handling with Sonner toast to `app/lib/store.ts` (AC: 1, 2, 3, 4)
  - [x] 1.1 Import `toast` from `"sonner"` (after existing third-party imports, before internal imports)
  - [x] 1.2 Add `showPersistenceError()` function — calls `toast.error("Changes saved in memory but not persisted", { id: "persistence-failure", duration: Infinity, action: { label: "Retry", onClick: retryPersistence } })`
  - [x] 1.3 Add `retryPersistence()` function — reads current store state via `store.getState()`, writes all 3 stores via `Promise.all([writeStore("spools", ...), writeStore("figures", ...), writeStore("queueItems", ...)])`, on success calls `toast.dismiss("persistence-failure")`, on failure calls `showPersistenceError()`
  - [x] 1.4 Add `.catch(showPersistenceError)` to each `writeStore()` call in the existing subscribe callback (lines 169-176)

- [x] Task 2: Add persistence failure tests to `app/lib/store.test.ts` (AC: 1, 2, 3, 4)
  - [x] 2.1 Test: when `writeStore` rejects, `toast.error` is called with message "Changes saved in memory but not persisted" and action with label "Retry"
  - [x] 2.2 Test: toast uses fixed ID `"persistence-failure"` and `duration: Infinity`
  - [x] 2.3 Test: retry success — mock `writeStore` to reject once then resolve, extract `onClick` from `toast.error` action arg, call it, flush promises, assert `toast.dismiss("persistence-failure")` called
  - [x] 2.4 Test: retry failure — mock `writeStore` to always reject, call retry `onClick`, flush promises, assert `toast.error` called again (toast remains)
  - [x] 2.5 Test: successful writes produce no toast — mock `writeStore` to resolve, trigger mutation, flush promises, assert `toast.error` NOT called
  - [x] 2.6 Test: `_persist = false` skips writes entirely (verify exists, add if missing)

- [x] Task 3: Run full test suite — zero regressions (AC: all)
  - [x] 3.1 All new persistence failure tests pass
  - [x] 3.2 All existing 268+ tests still pass

## Dev Notes

### Key Architecture Rules

- **No `useEffect`** — persistence error handling lives in the store subscribe callback, not a React Effect
- **No `useMemo` / `useCallback` / `React.memo`** — React Compiler handles memoization
- **No success toasts** — only error toasts for persistence failures (architecture: "No toasts for normal operations")
- **Sonner `toast` is imperative** — safe to import and call from non-React code (`store.ts`). It is NOT a hook
- **In-memory state is source of truth** — persistence failure does not affect the UI or user's ability to continue working (NFR11)
- **Notification within 2 seconds** — NFR7 requires the toast to appear within 2s of the failed write. The `.catch()` fires as soon as the Promise rejects, which is well within this window

### Existing Infrastructure (DO NOT Rebuild)

| What | Where | Notes |
|------|-------|-------|
| `writeStore()` | `app/lib/db.ts:61-73` | Async, no internal try-catch — errors propagate to caller |
| Subscribe callback | `app/lib/store.ts:169-176` | Fire-and-forget with NO error handling — THIS IS WHAT YOU'RE FIXING |
| `_persist` flag | `app/lib/store.ts:7-16` | Module-level variable, gates subscribe callback writes |
| `store.getState()` | `app/lib/store.ts` | Zustand API to read current state for retry |
| `<Toaster />` | `app/root.tsx:66` | Already mounted in app shell — DO NOT add another |
| Sonner component | `app/components/ui/sonner.tsx` | Custom-styled with Lucide icons, system theme |
| Test factories | `app/lib/test-utils.ts` | `createSpool()`, `createFigure()`, `createQueueItem()` |
| Existing store tests | `app/lib/store.test.ts` | Subscribe callback persistence tests already exist — add to this file |

### Implementation Details

**Current subscribe callback (store.ts:169-176) — the code you're modifying:**

```typescript
store.subscribe((state, prevState) => {
  if (!_persist) return
  if (state.spools !== prevState.spools) writeStore("spools", state.spools)
  if (state.figures !== prevState.figures) writeStore("figures", state.figures)
  if (state.queueItems !== prevState.queueItems)
    writeStore("queueItems", state.queueItems)
})
```

**Problem:** `writeStore()` returns a Promise that is never caught. If IndexedDB write fails, the error is silently swallowed (unhandled promise rejection).

**Fix:** Add `.catch(showPersistenceError)` to each call. Add `showPersistenceError()` and `retryPersistence()` helpers above the subscribe callback.

**Target code after modification:**

```typescript
function showPersistenceError() {
  toast.error("Changes saved in memory but not persisted", {
    id: "persistence-failure",
    duration: Infinity,
    action: {
      label: "Retry",
      onClick: retryPersistence,
    },
  })
}

function retryPersistence() {
  const { spools, figures, queueItems } = store.getState()
  Promise.all([
    writeStore("spools", spools),
    writeStore("figures", figures),
    writeStore("queueItems", queueItems),
  ]).then(
    () => toast.dismiss("persistence-failure"),
    showPersistenceError
  )
}

// Subscribe callback for IndexedDB persistence
store.subscribe((state, prevState) => {
  if (!_persist) return
  if (state.spools !== prevState.spools)
    writeStore("spools", state.spools).catch(showPersistenceError)
  if (state.figures !== prevState.figures)
    writeStore("figures", state.figures).catch(showPersistenceError)
  if (state.queueItems !== prevState.queueItems)
    writeStore("queueItems", state.queueItems).catch(showPersistenceError)
})
```

**Design decisions:**

- **Fixed toast ID `"persistence-failure"`** — prevents toast stacking if multiple stores fail in rapid succession. Each new failure updates the existing toast instead of creating another
- **`duration: Infinity`** — toast stays visible until user retries or manually dismisses (per UX spec)
- **Retry writes ALL stores from current state** — uses `store.getState()` to get the latest state (not stale data from time of failure). This ensures any changes made after the failure are also persisted
- **`Promise.all` for retry** — all 3 stores must succeed for toast to dismiss. On partial failure, toast remains
- **`writeStore` is idempotent** (clear + re-write), so writing unchanged stores during retry is harmless (<50ms total)
- **`showPersistenceError` and `retryPersistence` are module-level functions** — not exported. They are implementation details of the persistence layer

### Testing Strategy

**Mock setup:**

```typescript
import { toast } from "sonner"

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}))
```

`vi.mock()` is hoisted by Vitest, so the mock is in place before `store.ts` imports `sonner`.

**Triggering persistence failures:**

Mock `writeStore` from `~/lib/db` to reject, then trigger a store mutation (e.g., `createSpool()`). The subscribe callback fires synchronously, but the `.catch()` handler fires asynchronously. Flush the microtask queue before asserting:

```typescript
await new Promise((r) => setTimeout(r, 0))
// or: await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
```

**Extracting the retry handler from mock:**

```typescript
const actionArg = (toast.error as Mock).mock.calls[0][1]
actionArg.action.onClick() // trigger retry
```

**Testing environment:** Default vitest environment (NOT jsdom) — no DOM rendering needed for store tests.

### Anti-Patterns to Avoid

- Do NOT add `try-catch` inside `writeStore()` in `db.ts` — catch at the call site (subscribe callback) so the consumer controls error behavior
- Do NOT create a separate error handling module or service — keep helpers in `store.ts` next to the subscribe callback
- Do NOT retry with stale data from time of failure — always use `store.getState()` for latest state
- Do NOT add a loading/pending/retrying state — retry is async and invisible; toast remains until success
- Do NOT add error handling to `initApp()` or `importData()` — they have their own error flows, out of scope
- Do NOT modify `db.ts`, `root.tsx`, `sonner.tsx`, or any component files
- Do NOT import React in `store.ts` — `toast` from Sonner is imperative, not a hook
- Do NOT add success toasts for any operation
- Do NOT use `useEffect` for this feature
- Do NOT use `useMemo`/`useCallback`/`React.memo`

### Project Structure Notes

- `app/lib/store.ts` — modify: add `toast` import, add `showPersistenceError()` + `retryPersistence()`, add `.catch()` to subscribe callback
- `app/lib/store.test.ts` — modify: add persistence failure test cases in a new `describe` block
- No new files, no new dependencies, no new routes, no new components

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR36: persistence failure notification with retry]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR6: zero silent data loss, NFR7: failure notification within 2s, NFR11: in-memory state authority]
- [Source: _bmad-output/planning-artifacts/architecture.md — Subscribe callback persistence pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md — Sonner toast for persistence failures, no success toasts]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Toast: "Changes saved in memory but not persisted" with Retry action, non-blocking, stays until dismissed]
- [Source: app/lib/store.ts:169-176 — Current subscribe callback with no error handling]
- [Source: app/lib/store.ts:7-16 — _persist module-level flag]
- [Source: app/lib/db.ts:61-73 — writeStore() async function, no try-catch]
- [Source: app/root.tsx:66 — Toaster already mounted]
- [Source: app/components/ui/sonner.tsx — Sonner Toaster with custom Lucide icons]

### Previous Story Intelligence

From Story 4.2 (JSON Import with Atomic Replace):
- 268 tests passing at completion (22 new tests added)
- `importData()` in `export-import.ts` has its own error handling (try-catch with state rollback) — do NOT duplicate or interfere
- `replaceAll()` errors are caught inside `importData()` — they don't flow through the subscribe callback because `_persist = false` during import
- `writeStore` is only called from the subscribe callback when `_persist = true`
- Existing test patterns: `vi.mock()` for `db` module, `beforeEach` resets store state, mock patterns for async functions
- `store.test.ts` already has subscribe callback persistence tests — add the new failure tests alongside them

### Git Intelligence

Recent commits:
- `1ed5298` feat: implement import functionality with ImportDialog and corresponding tests
- `5d4f55b` feat: implement export data functionality with download trigger and corresponding tests
- All changes follow established patterns: co-located tests, factory functions from `test-utils.ts`
- `store.ts` and `store.test.ts` are the primary files to modify — same as stories 1.1, 4.1, 4.2

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- `writeStore` mock needed to return `Promise.resolve()` by default (not `undefined`) since `.catch()` is now chained on every call
- Same fix applied to `export-import.test.ts` which also mocks `~/lib/db`
- Retry failure test used `mockRejectedValueOnce` (×4) instead of `mockRejectedValue` to prevent microtask leakage into subsequent tests

### Completion Notes List

- Added `toast` import from `"sonner"` to `store.ts`
- Added `showPersistenceError()` — displays non-blocking error toast with fixed ID and Retry action
- Added `retryPersistence()` — writes all 3 stores from latest state, dismisses toast on success, re-shows on failure
- Added `.catch(showPersistenceError)` to all 3 `writeStore()` calls in subscribe callback
- Added 6 new tests covering: error toast display, toast config (ID, duration), retry success, retry failure, no toast on success, persist=false skip
- Updated `writeStore` mock in `store.test.ts` and `export-import.test.ts` to return `Promise.resolve()` by default
- All 276 tests pass (8 new, 268 existing)

### Change Log

- 2026-03-31: Implemented persistence failure notification with retry (Story 4.3)

### File List

- `app/lib/store.ts` — modified: added toast import, showPersistenceError, retryPersistence, .catch() on subscribe writes
- `app/lib/store.test.ts` — modified: added sonner mock, 6 persistence failure tests, updated writeStore mock to return Promise
- `app/lib/export-import.test.ts` — modified: updated writeStore mock to return Promise
