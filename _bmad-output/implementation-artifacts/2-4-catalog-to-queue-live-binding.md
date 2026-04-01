# Story 2.4: Catalog-to-Queue Live Binding

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want edits to my catalog figures to automatically update any queued instances,
so that I never have stale color information in my print queue.

## Acceptance Criteria

1. **Given** a figure is in the catalog AND has one or more active queue items, **When** the user adds a new spool to the figure's `requiredColors` and saves, **Then** all queued instances of that figure immediately show the new color chip (derived from the updated catalog figure at render time), and queue progress recalculates (for example, `3/5` becomes `3/6`).

2. **Given** a figure has active queue items and a color chip was already marked complete, **When** the user removes that spool from the figure's `requiredColors` and saves, **Then** the queued instances no longer show that color chip, the `completedColors` entry for the removed spool becomes irrelevant, and progress recalculates.

3. **Given** the live binding architecture, **When** any catalog figure edit is saved, **Then** no manual sync or queue item update is needed; queue views derive color chips from the catalog figure's current `requiredColors` at render time.

4. **Given** the derived function `computeAffectedQueueItems(figureId, queueItems)`, **When** called with a figure ID, **Then** it returns the count and list of queue items referencing that figure (used by FR42 in Epic 3).

## Tasks / Subtasks

- [x] Task 1: Surface live-binding impact in the catalog edit form (AC: 3, 4)
  - [x] 1.1 Reuse `computeAffectedQueueItems()` from `app/lib/derived.ts`; do not add duplicate filtering logic in `FigureForm`
  - [x] 1.2 In `app/components/FigureForm.tsx`, select `queueItems` from the store and compute the affected items during render only when `figure` exists
  - [x] 1.3 Render helper copy above the action buttons when editing a figure with active queue items: `Saving will update X queued item(s).`
  - [x] 1.4 Do not show the helper in create mode or when the affected count is zero

- [x] Task 2: Preserve the normalized live-binding contract (AC: 1, 2, 3)
  - [x] 2.1 Keep `QueueItem` normalized: it continues to store only `id`, `figureId`, `type`, and `completedColors`
  - [x] 2.2 Keep `updateFigure()` as a figure-only mutation in `app/lib/store.ts`; do not mutate or iterate `queueItems` during figure edits
  - [x] 2.3 Do not copy `requiredColors` onto queue items and do not add any queue-side sync step on save
  - [x] 2.4 When colors are removed from a figure, do not scrub `completedColors`; future queue derivation must ignore IDs no longer present in the current figure
  - [x] 2.5 Preserve the existing save guard in `FigureForm`: `requiredColors` must still be filtered to spool IDs that exist in `spools`

- [x] Task 3: Add regression coverage for the live-binding behavior that exists before Epic 3 UI lands (AC: 1, 2, 3, 4)
  - [x] 3.1 Update `app/components/FigureForm.test.tsx` to cover the affected-queue-item warning in edit mode
  - [x] 3.2 Add a test proving the warning is hidden in create mode and hidden for figures with zero affected queue items
  - [x] 3.3 Add a test proving editing a figure changes `requiredColors` while leaving `queueItems` untouched
  - [x] 3.4 Update `app/lib/store.test.ts` to assert the `queueItems` Map reference does not change when `updateFigure()` runs
  - [x] 3.5 Reuse `createQueueItem()` from `app/lib/test-utils.ts` for queue-linked form and store tests

- [x] Task 4: Avoid pulling Epic 3 implementation into this story (AC: 1, 2, 3)
  - [x] 4.1 Do not add `addToQueue`, `toggleChip`, `removeFromQueue`, `requeueCompleted`, `computeFigureProgress`, or `computeCompletionStatus` in this story
  - [x] 4.2 Do not build production queue UI components (`QueueItemCard`, `ColorChip`, `ColorRankingEntry`) here
  - [x] 4.3 Keep any live-binding verification that cannot be expressed in current production UI inside tests only

## Dev Notes

### Story Intent

This story is about locking in the data contract for live catalog-to-queue binding before Epic 3 builds the queue experience. The queue routes still exist only as stubs, so the implementation here should strengthen the catalog-side behavior and add guardrail tests rather than prematurely building queue screens.

### Architecture Requirements

**Normalized queue model is the core requirement:**

- `Figure.requiredColors` remains the canonical source for which color chips a queued figure should show.
- `QueueItem` references a figure by `figureId`; it does not own a copied snapshot of colors.
- Queue progress and chip rendering must be derived from the current figure data at render time, not synchronized into queue state on save.

**Current store contract to preserve:**

```ts
export interface QueueItem {
  id: string
  figureId: string
  type: "stock" | "order"
  completedColors: string[]
}
```

`updateFigure()` should continue to update only the `figures` Map. If queued instances need to display new chips after a figure edit, that must happen because the queue UI re-derives from `figure.requiredColors`, not because the mutation rewrites queue items.

**Important nuance for removed colors:**

When a spool ID is removed from `figure.requiredColors`, existing queue items may still contain that spool ID in `completedColors`. That stale entry should become irrelevant rather than being scrubbed during the catalog edit. Epic 3 progress/chip derivation must intersect `completedColors` with the figure's current `requiredColors`.

### Existing Codebase Context

**Relevant production files today:**

- `app/components/FigureForm.tsx` already owns figure create/edit input state and submits through `createFigure()` / `updateFigure()`
- `app/routes/catalog.tsx` already passes `figure`, `onSave`, and `onCancel` into `FigureForm`
- `app/lib/store.ts` already has `figures` and `queueItems` Maps plus `updateFigure()` and `deleteFigure()`
- `app/lib/derived.ts` already exports `computeAffectedQueueItems()` and the catalog delete flow already relies on it
- `app/routes/_queue.home.tsx` and `app/routes/_queue.figures.tsx` are still placeholder routes; this story should not convert them into real queue views

**Existing helper to reuse:**

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

Do not duplicate this logic in `FigureForm`, `catalog.tsx`, or tests.

### Implementation Guardrails

1. Derive affected queue counts during render; do not add `useEffect`, local sync state, or store state for this.
2. Do not denormalize colors into queue items or add queue item migration logic on figure save.
3. Do not read IndexedDB directly; all behavior stays inside the Zustand store plus pure helpers.
4. Do not introduce success toasts; the project standard is visible UI state change only.
5. Keep React Compiler guidance intact: no new `useMemo`, `useCallback`, or `React.memo` unless there is a proven escape-hatch need.
6. Follow the existing import order: React -> third-party -> `~/lib/` -> `~/hooks/` -> `~/components/`.

### Testing Requirements

- Framework: Vitest + React Testing Library + `fake-indexeddb`
- Use `store.setState()` to seed figures and queue items in tests
- Use `createFigure()`, `createSpool()`, and `createQueueItem()` from `app/lib/test-utils.ts`
- Reuse the existing `matchMedia` mock pattern from `FigureForm.test.tsx` / `catalog.test.tsx`
- Prefer store-contract tests over premature queue-route assertions because the production queue UI is not part of this story yet

### Previous Story Intelligence

Story 2.3 already established two important foundations:

- `computeAffectedQueueItems()` exists and is production-used in the catalog delete confirmation flow
- `deleteFigure()` already proves the app treats figure-to-queue relationships as first-class data integrity concerns

That means Story 2.4 should extend the same queue-awareness into figure editing rather than inventing a parallel pattern.

### Git Intelligence

Recent commits relevant to this story:

- `c92e2e8` merge: story 2.3 into develop
- `5493e86` fix: code review fixes for story 2.3 (pass 1)
- `728f18d` feat: story 2.3 - delete figure with cascade confirmation
- `2915241` merge: story 2.2 into develop
- `3b8ea18` fix: code review fixes for story 2.2 (pass 2)

The most relevant implementation pattern is the queue-aware catalog work from Story 2.3, especially the reuse of `computeAffectedQueueItems()` and the avoidance of redundant state.

### Latest Technical Notes

- React Router's current framework routing docs still center route configuration in `app/routes.ts` with `layout()`, `index()`, and `route()` helpers, which matches this project's existing route tree.
- Zustand's current API guidance still expects immutable updates through `set(...)`, with shallow merging by default; the project's `new Map(prev)` mutation pattern stays aligned with that recommendation.
- React's current guidance still recommends deriving render-only values during render instead of using Effects, which directly supports computing affected queue counts inline in `FigureForm`.

### Project Structure Notes

**Expected production edits:**

- `app/components/FigureForm.tsx`

**Expected test edits:**

- `app/components/FigureForm.test.tsx`
- `app/lib/store.test.ts`

**Files that should probably remain unchanged in this story:**

- `app/routes/_queue.home.tsx`
- `app/routes/_queue.figures.tsx`
- `app/routes/_queue.tsx`

If a developer feels pulled toward adding queue rendering to satisfy AC 1 and AC 2, that is a signal they are drifting into Epic 3 scope. Validate the live-binding contract through tests and catalog-side UX only.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 2, Story 2.4]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR13, FR16, FR42, NFR2, NFR4]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Frontend Architecture, Entity Reference Pattern, State Management Patterns, Form Patterns, Requirements to Structure Mapping, Data Flow]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - desktop-first workflow, queue/card mental model, view-agnostic interaction guidance]
- [Source: `_bmad-output/implementation-artifacts/2-3-delete-figure-with-cascade-confirmation.md` - previous story learnings]
- [Source: `_bmad-output/project-context.md` - React Compiler, TypeScript, file organization, styling guidance]
- [Source: https://reactrouter.com/start/framework/routing]
- [Source: https://reactrouter.com/api/framework-conventions/routes.ts]
- [Source: https://zustand.docs.pmnd.rs/reference/apis/create]
- [Source: https://react.dev/learn/you-might-not-need-an-effect]
- [Source: https://react.dev/learn/react-compiler/introduction]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `git log --oneline -5`
- `npm test -- app/components/FigureForm.test.tsx app/lib/store.test.ts`
- `npm test`
- `npm run typecheck`

### Implementation Plan

- Add edit-mode regression tests around affected queue item messaging and normalized queue persistence.
- Reuse `computeAffectedQueueItems()` in `FigureForm` to derive the warning during render only when editing.
- Verify `updateFigure()` keeps queue data untouched, including stale `completedColors` entries for removed figure colors.

### Completion Notes List

- Story context created on 2026-03-30.
- Story status set to `ready-for-dev`.
- Scope boundary documented: preserve normalized live binding now, build queue UI in Epic 3.
- Reused `computeAffectedQueueItems()` in `FigureForm` to show an edit-only helper when queued figures will be affected by a save.
- Added form and store regression tests proving figure edits update `requiredColors` without mutating queue items or scrubbing stale `completedColors`.
- Fixed the existing typing mismatch in `app/routes/_queue.test.tsx` so the repository `typecheck` command passes during story validation.
- Validation passed: `npm test` and `npm run typecheck`.

### File List

- `app/components/FigureForm.tsx`
- `app/components/FigureForm.test.tsx`
- `app/lib/store.test.ts`
- `app/routes/_queue.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-4-catalog-to-queue-live-binding.md`

### Change Log

- 2026-03-30: Story implementation started; sprint status moved to `in-progress`.
- 2026-03-30: Added catalog edit affected-queue-item messaging, regression coverage for normalized live binding, and a test-only route typing fix required for clean validation; story moved to `review`.
