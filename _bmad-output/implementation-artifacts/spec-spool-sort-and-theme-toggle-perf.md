---
title: 'Alphabetical spool library + instant theme toggle'
type: 'feature'
created: '2026-08-28'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'f47c7aef142c29a16aa8ed1875337b440a2930fd'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (1) The Spool Library renders spools in Map insertion order, which makes a growing library hard to scan. (2) Switching dark/light mode feels slow **in production** (localhost is fine): the `<html>` class is derived solely from root loader data, so it only flips after the set-theme POST completes and the root loader revalidates — two sequential network round-trips over real-world latency. The toggle's existing optimistic state changes only the button icon, not the page theme.

**Approach:** Sort the spool list alphabetically at render time. For the theme, apply the optimistic-theme pattern via a **shared keyed fetcher**: `useOptimisticTheme()` and `ThemeToggle` both use `useFetcher({ key: "set-theme" })`, so `Layout` flips the `<html>` class on the next router render, without awaiting the network, converging to loader data once revalidation lands. The keyed fetcher avoids `useFetchers()` scanning entirely (no `formAction` string matching, no insertion-order ambiguity).

## Boundaries & Constraints

**Always:** Cookie stays the single source of truth once the submission settles. Root loader revalidation after the theme action must remain enabled — loader data has to converge to the cookie value or the theme snaps back when `fetcher.formData` clears. Validate the in-flight `formData` value at runtime — only `"dark"`/`"light"` are used, anything else is ignored (never cast `FormData.get()` to `Theme` unchecked). The no-flicker guarantee applies to the successful action + revalidation path; on action or network failure the optimistic value clears when the fetcher goes idle and the theme silently reverts to the cookie value — that revert IS the defined failure behavior, no error UI. Rapid clicks resubmit the shared keyed fetcher (last submission wins, abort semantics); the button stays enabled. Spool sorting uses explicit `"en"` locale with `{ sensitivity: "base", numeric: true }`; ties keep insertion order (stable sort). Follow React Compiler rules — no manual `useMemo`/`useCallback`. Tailwind semantic tokens only.

**Ask First:** Any change to the `/action/set-theme` contract or the cookie definition in `theme.server.ts`. Adding `shouldRevalidate` anywhere.

**Never:** No theme libraries, no localStorage, no "system" mode (per spec-cookie-dark-mode-toggle). No sort-order UI controls — fixed alphabetical only. Do not reorder spools in other views (e.g. FigureForm color assignment) — out of scope.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Spool list order | Spools added in arbitrary order | Cards render A→Z by name, case-insensitive, `"en"` locale, numeric-aware | N/A |
| Empty library | No spools | Empty state unchanged | N/A |
| Toggle click | App in dark mode | `<html>` class flips to `light` on next router render, without awaiting the network; cookie persisted, no full reload | N/A |
| Submission settles | Action + revalidation succeed | Theme stays as chosen — no flicker back to old theme | N/A |
| Action/network failure | POST fails or returns 400 | Optimistic value clears on idle; theme silently reverts to cookie value | Silent revert, no error UI |
| Rapid double-click | Two clicks before settle | Last submission wins; theme reflects latest `formData` throughout | N/A |
| SSR first paint | JS not yet loaded | Correct theme class already on `<html>` (unchanged behavior) | N/A |

</frozen-after-approval>

## Code Map

- `app/routes/spools.tsx:46` -- `spoolList` built via `Array.from(spools.values())` in insertion order; sort here
- `app/routes/spools.test.tsx` -- route test idioms: `createRoutesStub`, `store.setState` reset, `createSpool` from `~/lib/test-utils`
- `app/root.tsx:55-60` -- `Layout` derives theme only from `useRouteLoaderData("root")` — the latency source
- `app/root.tsx:39-45` -- root `clientLoader` awaits `serverLoader()` + `initApp()`; `initApp` is guarded (no-op after first run), so revalidation cost is the network round-trips, not re-init
- `app/components/ThemeToggle.tsx:12-19` -- existing optimistic derivation (affects icon/label only); replace with shared hook
- `app/routes/action.set-theme.ts` -- validates POST, sets cookie — read-only
- `app/lib/theme.server.ts` -- `Theme` type + cookie definition — read-only (type-only client imports are fine, already done by ThemeToggle)
- `app/hooks/use-mobile.ts` -- hooks directory convention for the new hook

## Tasks & Acceptance

**Execution:**
- [x] `app/hooks/use-optimistic-theme.ts` -- Create `useOptimisticTheme()`: `useFetcher({ key: "set-theme" })` + root loader theme via `useRouteLoaderData`; when the fetcher's `formData` theme is exactly `"dark"` or `"light"`, return it, else return loader theme -- single validated source for instant theme
- [x] `app/root.tsx` -- `Layout` uses `useOptimisticTheme()` for the `<html>` class -- theme flips without awaiting the network
- [x] `app/components/ThemeToggle.tsx` -- Use `useFetcher({ key: "set-theme" })` (same key) for the Form and derive icon/label/next value from `useOptimisticTheme()` -- one shared fetcher, one derived value
- [x] `app/routes/spools.tsx` -- Sort `spoolList` with `a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true })` -- stable, scannable order
- [x] `app/routes/spools.test.tsx` -- Add test: seed spools out of alphabetical order incl. a lowercase name, assert rendered card names appear A→Z case-insensitively -- covers I/O row 1
- [x] `app/hooks/use-optimistic-theme.test.tsx` -- Add test via `createRoutesStub` with a deferred `/action/set-theme` action: on toggle submit the hook returns the new theme before the action resolves and keeps it after settle -- covers optimistic + convergence rows

**Acceptance Criteria:**
- Given spools named "Zinc", "amber", "Blue" in the store, when the Spool Library renders, then cards appear in order amber, Blue, Zinc
- Given the app is dark, when the toggle is clicked, then the `<html>` class is `light` on the next router render without awaiting the action response, and after settle the theme remains `light` with no intermediate revert
- Given the theme POST fails, when the fetcher returns to idle, then the theme reverts to the cookie-derived loader value with no error UI
- Given the server renders the page with a `light` cookie, when JS has not loaded, then `<html class="light">` is already present

## Spec Change Log

## Design Notes

For a mutation fetcher, `formData` persists through both the `submitting` and its submission-driven `loading` (revalidation) states (verified against react-router 7.13.1), so the shared keyed fetcher yields a gap-free optimistic value from click until root loader data converges — this is why no flicker occurs on the success path and why root revalidation must stay enabled. The shared `useFetcher({ key: "set-theme" })` gives both components the same fetcher instance without `useFetchers()` scanning, `formAction` matching, or insertion-order assumptions; rapid re-clicks abort and replace the prior submission, so `formData` always reflects the latest intent.

## Verification

**Commands:**
- `npm test` -- expected: all tests pass, including new spool-order and optimistic-theme tests
- `npm run typecheck` -- expected: typegen + tsc pass with no errors

**Manual checks (if no CLI):**
- `npm run build && npm run start` (production build, where the latency is reported): click the theme toggle — page theme flips instantly even with DevTools network throttling enabled; reload preserves the chosen theme.

## Suggested Review Order

**Optimistic theme — shared keyed fetcher**

- Entry point: one validated source combining the keyed fetcher's in-flight value with loader data
  [`use-optimistic-theme.ts:8`](../../app/hooks/use-optimistic-theme.ts#L8)

- `Layout` swaps loader-only derivation for the hook — the `<html>` class now flips without awaiting the network
  [`root.tsx:56`](../../app/root.tsx#L56)

- Toggle submits through the same keyed fetcher, so its submission is visible to the hook
  [`ThemeToggle.tsx:12`](../../app/components/ThemeToggle.tsx#L12)

**Spool ordering**

- Locale-pinned, case-insensitive, numeric-aware sort on a fresh array copy; ties keep insertion order
  [`spools.tsx:47`](../../app/routes/spools.tsx#L47)

**Tests**

- Gate-deferred action proves the flip happens before the action resolves, then converges
  [`use-optimistic-theme.test.tsx:57`](../../app/hooks/use-optimistic-theme.test.tsx#L57)

- Failure revert, rapid double-click, and invalid-value scenarios pin the boundary behaviors
  [`use-optimistic-theme.test.tsx:104`](../../app/hooks/use-optimistic-theme.test.tsx#L104)

- Real `ThemeToggle` integration guards the keyed-fetcher contract against silent severing
  [`use-optimistic-theme.test.tsx:248`](../../app/hooks/use-optimistic-theme.test.tsx#L248)

- Ordering test locks case-insensitivity and numeric awareness ("Spool 2" before "Spool 10")
  [`spools.test.tsx:75`](../../app/routes/spools.test.tsx#L75)
