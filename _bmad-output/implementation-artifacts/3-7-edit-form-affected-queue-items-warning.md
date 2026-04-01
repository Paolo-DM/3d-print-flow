# Story 3.7: Edit Form Affected Queue Items Warning

Status: done

## Story

As a user editing a catalog figure,
I want to see how many queued items will be affected before I save,
So that I make informed decisions about catalog changes that impact my active queue.

## Acceptance Criteria

1. **Given** the user opens the edit form for a figure that has active queue items **When** the form renders **Then** a message above the Save button displays "Saving will update X queued item(s)" using `computeAffectedQueueItems()`

2. **Given** the user opens the edit form for a figure with NO active queue items **When** the form renders **Then** no affected items warning is shown

3. **Given** the affected count display **When** rendered **Then** it uses a non-alarming style (informational, not destructive) since the propagation is a feature, not a risk

## Implementation Status: Already Complete

**Critical context for the dev agent:** All three ACs are already fully implemented in the codebase. This feature was built organically during earlier Epic 3 stories. This story is a **verification-only** task — no code changes needed.

### What Already Exists (DO NOT Rebuild)

| AC | Implementation | Where | Status |
|----|---------------|-------|--------|
| AC1 | `computeAffectedQueueItems(figure.id, queueItems)` → warning text above Save | `app/components/FigureForm.tsx:35-37,160-164` | Done |
| AC2 | Conditional: only computes/shows when `figure` prop exists (edit mode) and `affectedQueueItems.length > 0` | `app/components/FigureForm.tsx:35-37,160` | Done |
| AC3 | Uses `text-sm text-muted-foreground` — informational, not alarming | `app/components/FigureForm.tsx:161` | Done |

### Supporting Infrastructure

| What | Where | Notes |
|------|-------|-------|
| `computeAffectedQueueItems(figureId, queueItems)` | `app/lib/derived.ts:23-30` | Pure function: filters queueItems by `figureId`, returns `QueueItem[]` |
| FigureForm edit mode detection | `app/components/FigureForm.tsx:35` | `figure` prop present = edit mode, absent = create mode |
| Store integration | `app/components/FigureForm.tsx:30` | Selects `queueItems` from store for computation |
| Catalog route passes figure prop | `app/routes/catalog.tsx:99-106` | `figure={editingFigure ?? undefined}` — undefined for create, Figure for edit |
| Live binding (FR13) | `app/lib/store.ts` `updateFigure` | After save, queue views re-derive from updated catalog data automatically |

### Test Coverage (3 tests)

| Test | File | Lines | Status |
|------|------|-------|--------|
| Shows warning in edit mode with 2 queued items | `app/components/FigureForm.test.tsx` | 241-265 | Passing |
| Hides warning in create mode | `app/components/FigureForm.test.tsx` | 267-280 | Passing |
| Hides warning when edited figure has no active queue items | `app/components/FigureForm.test.tsx` | 282-302 | Passing |

## Tasks / Subtasks

- [x] Task 1: Verify `computeAffectedQueueItems` function exists and is correct (AC: 1)
  - [x] 1.1 Confirm `app/lib/derived.ts:23-30` filters by `figureId` and returns `QueueItem[]`
  - [x] 1.2 Confirm function is imported and used in `FigureForm.tsx:4,35-37`

- [x] Task 2: Verify warning message renders correctly (AC: 1, 2)
  - [x] 2.1 Confirm `FigureForm.tsx:160-164` conditionally shows "Saving will update X queued item(s)."
  - [x] 2.2 Confirm warning only appears when `figure` prop exists AND `affectedQueueItems.length > 0`

- [x] Task 3: Verify non-alarming styling (AC: 3)
  - [x] 3.1 Confirm `text-sm text-muted-foreground` class — informational, not destructive red/orange

- [x] Task 4: Verify test coverage (AC: 1, 2, 3)
  - [x] 4.1 Confirm 3 dedicated tests in `FigureForm.test.tsx:241-302`
  - [x] 4.2 Run full test suite — 239 tests passing, zero regressions

## Dev Notes

### Key Architectural Rules

- **No `useEffect` for state derivation** — `computeAffectedQueueItems` is called during render (line 35-37)
- **No `useMemo` / `useCallback` / `React.memo`** — React Compiler handles memoization
- **Store selectors** — `usePrintFlowStore((s) => s.queueItems)` selects minimum needed
- **Pure derived functions** — `computeAffectedQueueItems` in `derived.ts` takes data as args, no side effects

### Project Structure Notes

No files need modification. All implementation aligns with architecture:
- `app/lib/derived.ts` — pure derived computation (per architecture: "derived state functions are pure")
- `app/components/FigureForm.tsx` — form component showing warning above Save button (per UX spec and FR42)
- `app/components/FigureForm.test.tsx` — co-located tests (per project convention)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.7, lines 646-665]
- [Source: _bmad-output/planning-artifacts/prd.md — FR42: Edit form shows affected queue item count]
- [Source: _bmad-output/planning-artifacts/architecture.md — FR42 data flow, lines 786-792]
- [Source: _bmad-output/planning-artifacts/architecture.md — Form Patterns, line 558]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Form behavior, line 825]
- [Source: app/lib/derived.ts — computeAffectedQueueItems, lines 23-30]
- [Source: app/components/FigureForm.tsx — warning implementation, lines 35-37, 160-164]

### Previous Story Intelligence

From Story 3.6 (Order Priority in Color Ranking):
- 239 tests passing at completion
- `computeAffectedQueueItems` was already present in `derived.ts` before 3.6
- Test patterns: factory functions from `test-utils.ts`, store reset in `beforeEach`

### Git Intelligence

Recent commits show Story 3.6 was the last completed work:
- `46c8e8d` feat: add order and stock item separation in ColorRankingEntry and corresponding tests
- All changes followed established patterns: co-located tests, immutable sorts, store selectors

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — verification-only story, no code changes needed.

### Change Log

- 2026-03-31: Verified story 3-7 — all ACs already implemented, 239 tests passing, status → review
- 2026-03-31: Code review passed — all ACs verified, architecture compliant, no issues found, status → done

### Completion Notes List

- All 3 ACs verified as already implemented in FigureForm.tsx and derived.ts
- 3 dedicated tests confirmed passing in FigureForm.test.tsx
- Full test suite: 239 tests passing, zero regressions
- Feature was implemented organically during earlier Epic 3 stories (likely during Story 2.2 or catalog-related work)
- dev-story verification pass: no code changes needed, all validations green

### File List

No files modified — verification only.

Verified files:
- `app/components/FigureForm.tsx` — warning implementation confirmed at lines 35-37, 160-164
- `app/lib/derived.ts` — `computeAffectedQueueItems` function confirmed at lines 23-30
- `app/components/FigureForm.test.tsx` — 3 warning-related tests confirmed at lines 241-302
