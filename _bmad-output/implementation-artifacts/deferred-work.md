# Deferred Work

## Deferred from: code review of story-1-1-data-model-state-management-persistence-layer (2026-03-27)

- **Unhandled IndexedDB failures** — `initApp()` has no error recovery if `hydrate()` fails (initialized flag stuck at `true`, no retry possible). Store subscriber swallows `writeStore()` errors silently. `getDB()` caches rejected promises permanently. All three issues are covered by Story 4.3 (persistence-failure-notification-with-retry).

## Deferred from: code review of 1-2-app-shell-sidebar-navigation-dark-mode (2026-03-27)

- **`initApp()` fire-and-forget** — Called in `useEffect` with no `.catch()`. Unhandled promise rejection if hydration fails. Covered by Story 4.3.
- **No catch-all / 404 route** — Navigating to an unknown path falls through to the root ErrorBoundary with no sidebar/navigation. Consider adding a splat route in a future story.
- **`vite-plugin-babel` in production deps** — Build tool listed in `dependencies` instead of `devDependencies`. Pre-existing, minor cleanup.

## Deferred from: code review of 1-3-spool-library-view-empty-state (2026-03-27)

- **No hex/name input validation** — `getPerceivedLightness()` returns NaN for malformed hex values (3-char, missing hash, invalid chars), silently disabling border logic. Empty or very long spool names produce blank or overflowing cards. Validation belongs in Story 1.4 form (input boundary).
- **Disabled CTA buttons lack accessibility hint** — "Add Spool" and "Add Your First Spool" buttons are `disabled` with no tooltip or `aria-label` explaining why. Story 1.4 enables these buttons, making this transient.

## Deferred from: code review of 1-4-create-edit-spool-with-hex-color-picker (2026-03-27)

- **HexColorPicker `inputValue` drifts from parent `value`** — When popover is open and parent changes `value` externally, `inputValue` (local state) becomes stale. No external writers of hex exist in current architecture; becomes relevant if undo/redo or multi-tab sync is added.
- **`editingSpool` holds stale Spool snapshot** — Route stores full Spool object instead of just ID. No concurrent modification possible in single-user local app. Revisit if multi-tab sync is added.
- **`getPerceivedLightness` returns NaN for malformed hex** — Pre-existing in color-utils.ts. Not introduced by this change. Relevant if external data import is added.
- **SpoolCard/grid missing list semantics** — Cards rendered in a plain `<div>` grid with no `role="list"`/`role="listitem"`. Pre-existing from Story 1.3.
- **Editing concurrently deleted spool is a silent no-op** — `updateSpool` returns early if spool doesn't exist. Story 1.5 adds delete; should handle this edge case there.

## Deferred from: code review of 2-1-figure-catalog-view-empty-state (2026-03-30)

- **Duplicate spool IDs in requiredColors produce duplicate React keys** — If `requiredColors` contains the same spool ID more than once, `FigureCard` renders multiple swatches with the same `key={spool.id}`, triggering a React duplicate key warning. Fix: deduplicate during resolution or use array index in key. Data model concern — should be addressed at store/form validation level when figure mutations are added in Story 2.2.

## Deferred from: code review of 2-2-create-edit-figure-with-color-assignment (2026-03-30)

- **`useIsMobile` hydration mismatch risk** — `useIsMobile()` hook may return different values on server vs client, causing a Drawer/Sheet hydration mismatch on mobile. Pre-existing pattern shared with spools.tsx. Revisit if SSR is enabled.
- **Long figure/franchise names have no truncation** — FigureCard header text lacks `truncate` or `break-words` classes. Very long names could push the edit button off-screen. Pre-existing layout pattern, cosmetic.

## Deferred from: code review of 3-1-add-to-queue-queue-store-mutations (2026-03-31)

- **No validation in `fromJSON` deserialization** — `fromJSON` blindly deserializes data and rebuilds Maps without validating referential integrity. Orphaned queue items or broken spool references in IndexedDB are loaded silently. Pre-existing in store.ts, not introduced by story 3.1.

## Deferred from: code review of 3-2-color-view-ranked-color-list-expandable-figure-lists (2026-03-31)

- **`deleteFigure` always creates new `queueItems` Map** — Even when no queue items reference the deleted figure, a new Map is allocated and returned, causing unnecessary subscriber notifications and IndexedDB writes. Pre-existing in store.ts.
- **`getPerceivedLightness` produces NaN for non-standard hex strings** — `parseInt` returns NaN for 3-digit shorthand hex or malformed strings, silently disabling border logic and glow effects. Pre-existing in color-utils.ts. Previously deferred in stories 1.3 and 1.4.

## Deferred from: code review of cookie-dark-mode-toggle (2026-03-31)

- **Theme cookie missing `secure` flag** — `themeCookie` omits `secure: true`, so on HTTPS deployments the cookie is also sent over plain HTTP. Low risk since it's only a UI preference, not a session token. Add conditionally based on environment when deploying to production.
- **No unit tests for cookie-based theme logic** — Old `dark-mode.test.ts` was deleted (tested the removed inline script). Server-side `parseTheme` logic, the action route, and the toggle component have no test coverage. Consider adding tests for the cookie parse/serialize round-trip and action validation.
- source_spec: `_bmad-output/implementation-artifacts/spec-spool-sort-and-theme-toggle-perf.md`
  summary: Pre-existing test failure in app/routes/completed.test.tsx ("shows completion date", regex /Completed\s+Mar/) — date formatting appears locale/environment dependent.
  evidence: Fails on clean baseline f47c7ae with this spec's changes stashed (verified 2026-08-28), so unrelated to this story; 1 failed / 276 passed on main.

## Deferred from: Codex review of spec-brand (2026-08-28)

- **Stale open edit form can overwrite freshly imported data** — `importData()` replaces store maps without navigation while `catalog.tsx` retains a captured `editingFigure` snapshot; saving a form opened before an import overwrites (or silently no-ops on) the imported figure. Pre-existing today with `franchise`, brand-independent — not addressed by the brand spec. Revisit if imports become frequent or multi-tab sync is added.

## Deferred from: code review of spec-brand (2026-08-28)

- source_spec: `_bmad-output/implementation-artifacts/spec-brand.md`
  summary: Figures inside catalog brand sections render in Map insertion order; consider alphabetical sorting within each section to match the spool-library precedent (commit 30e1bfb).
  evidence: Brand sections, filter chips, and the combobox all sort alphabetically, making the unsorted intra-section figure order visibly inconsistent; the flat grid had the same insertion order pre-change, so this is pre-existing ordering behavior surfaced by grouping.

## Deferred from: code review of spec-brand-lifecycle (2026-08-29)

- source_spec: `_bmad-output/implementation-artifacts/spec-brand-lifecycle.md`
  summary: `brandKey` does not Unicode-normalize, so two brand names differing only by NFC vs NFD (e.g. "Pokémon" typed two ways) are treated as distinct everywhere brandKey is the uniqueness rule.
  evidence: `brandKey` in app/lib/migration.ts is `name.trim().toLowerCase()` with no `.normalize()`; visually identical brands would pass the v2 import uniqueness check, evade renameBrand's collision detection, and produce two sections in the catalog. Pre-existing — brandKey predates this story and governs v1 migration and inline create as well, so changing it affects migration output and needs its own scope.

- source_spec: `_bmad-output/implementation-artifacts/spec-brand-lifecycle.md`
  summary: Focus is not returned to the row's Rename button after an inline rename is saved or cancelled in the brand manager.
  evidence: The autoFocused input unmounts with no focus target named, so inside the Sheet/Drawer focus falls to the container and a keyboard user's next Tab restarts from the top of the modal; confirming a merge or delete removes the row entirely with the same effect. Not required by ui-flows.md, and a correct fix needs per-row refs, so it is more than a trivial patch.

- source_spec: `_bmad-output/implementation-artifacts/spec-brand-lifecycle.md`
  summary: The alphabetical `a.name.localeCompare(b.name)` comparator is now inlined in three places — catalog.tsx, BrandCombobox.tsx, and BrandManager.tsx — which ui-flows.md requires to stay identical.
  evidence: This is exactly the 3-occurrence threshold the project's DRY stance names for extraction, and a future ordering change (e.g. explicit locale or `sensitivity`) would have to be applied three times or silently diverge. Deferred because extracting it edits two files this story otherwise does not touch.

- source_spec: `_bmad-output/implementation-artifacts/spec-brand-lifecycle.md`
  summary: FigureForm is not key-reset on `dataGeneration`, so an import landing while the figure form is open leaves a draft whose `figure.id` may no longer exist; saving silently discards the user's edits.
  evidence: catalog.tsx key-resets BrandManager on dataGeneration but keys FigureForm on the figure id only; `updateFigure`'s missing-id guard returns state unchanged while `onSave()` still fires and closes the modal. Pre-existing (the form was never dataGeneration-keyed) and overlapping the 2026-08-28 Codex deferral above, which describes the same race from the overwrite direction.
