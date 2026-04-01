---
title: 'Cookie-based dark/light theme toggle with SSR'
type: 'feature'
created: '2026-03-31'
status: 'done'
baseline_commit: '26111e0'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current dark-mode inline script in root.tsx checks `theme === ""` instead of `theme === "dark"`, silently ignoring explicit dark preferences. The approach also causes hydration mismatches and relies on localStorage which is invisible to SSR.

**Approach:** Replace the inline script with a `createCookie`-based solution. The root loader reads the cookie and passes the theme to `<html class>` on the first byte. A `/action/set-theme` route sets the cookie via `fetcher.submit()`. A toggle in the sidebar switches between dark/light. Default to dark when no cookie exists.

## Boundaries & Constraints

**Always:** Only two modes — dark and light. Cookie is single source of truth. Default to dark. No third-party theme libraries.

**Ask First:** Changes to the sidebar layout beyond adding the toggle button.

**Never:** No "system" option. No localStorage for theme. No remix-themes/next-themes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First visit (no cookie) | No theme cookie | Server renders `<html class="dark">`, cookie set to "dark" | N/A |
| Explicit dark cookie | Cookie = "dark" | Server renders `<html class="dark">` | N/A |
| Explicit light cookie | Cookie = "light" | Server renders `<html class="light">` | N/A |
| Toggle dark → light | Click toggle while dark | Fetcher submits "light", UI updates instantly, cookie persisted | N/A |
| Toggle light → dark | Click toggle while light | Fetcher submits "dark", UI updates instantly, cookie persisted | N/A |
| Invalid cookie value | Cookie = "garbage" | Treated as no cookie → defaults to "dark" | N/A |

</frozen-after-approval>

## Code Map

- `app/lib/theme.server.ts` -- Cookie definition with createCookie, parseTheme helper
- `app/root.tsx` -- Root loader returns theme, Layout receives it, removes inline script
- `app/routes/action.set-theme.ts` -- Action route to set cookie via POST
- `app/routes.ts` -- Register new action route
- `app/components/ThemeToggle.tsx` -- Sun/moon toggle button using fetcher
- `app/components/AppSidebar.tsx` -- Add ThemeToggle to sidebar footer
- `app/app.css` -- Fix Tailwind v4 dark custom-variant
- `app/lib/dark-mode.test.ts` -- Remove (inline script no longer exists)

## Tasks & Acceptance

**Execution:**
- [x] `app/lib/theme.server.ts` -- Create cookie and parseTheme helper -- Single source of truth for theme cookie logic
- [x] `app/routes/action.set-theme.ts` -- Create action route that parses form "theme" field, validates, sets cookie -- Enables client-side toggle without full reload
- [x] `app/routes.ts` -- Add `route("action/set-theme", "routes/action.set-theme.ts")` -- Wire up the action route
- [x] `app/root.tsx` -- Add loader reading theme cookie, pass theme to Layout via useRouteLoaderData or props, set `<html class={theme}>`, remove darkModeScript/dangerouslySetInnerHTML/suppressHydrationWarning -- SSR-correct theme from first byte
- [x] `app/components/ThemeToggle.tsx` -- Create toggle with Sun/Moon icons, useFetcher to POST to /action/set-theme, optimistic UI -- Instant visual feedback
- [x] `app/components/AppSidebar.tsx` -- Import and render ThemeToggle in SidebarFooter above Export/Import -- User-accessible toggle
- [x] `app/app.css` line 6 -- Change `(&:is(.dark *))` to `(&:where(.dark, .dark *))` -- Fix zero-specificity dark variant per Tailwind v4 docs
- [x] `app/lib/dark-mode.test.ts` -- Delete file -- Old inline script tests are obsolete

**Acceptance Criteria:**
- Given a first visit with no cookie, when the page loads, then `<html>` has class "dark" and the theme cookie is set to "dark"
- Given the toggle is clicked, when the fetcher completes, then the theme flips and no full page reload occurs
- Given the server renders the page, when JS has not yet loaded, then the correct theme class is already on `<html>`
- Given an invalid cookie value, when the page loads, then it defaults to dark

## Verification

**Commands:**
- `npx vitest run` -- expected: all tests pass
- `npx tsc --noEmit` -- expected: no type errors

## Suggested Review Order

**Cookie infrastructure**

- Theme type and cookie definition — single source of truth for the "theme" cookie
  [`theme.server.ts:3`](../../app/lib/theme.server.ts#L3)

- Root loader reads cookie, normalizes to Theme, auto-sets on first visit or tampered value
  [`root.tsx:26`](../../app/root.tsx#L26)

- Layout consumes loader data to set `<html class>` SSR-correctly
  [`root.tsx:38`](../../app/root.tsx#L38)

**Toggle interaction**

- Action route validates POST, serializes cookie in Set-Cookie header
  [`action.set-theme.ts:5`](../../app/routes/action.set-theme.ts#L5)

- ThemeToggle uses fetcher + optimistic UI for instant visual feedback
  [`ThemeToggle.tsx:8`](../../app/components/ThemeToggle.tsx#L8)

- Toggle placed in sidebar footer above Export/Import
  [`AppSidebar.tsx:144`](../../app/components/AppSidebar.tsx#L144)

**Supporting changes**

- Tailwind v4 dark variant fixed to zero-specificity `:where()` selector
  [`app.css:6`](../../app/app.css#L6)

- Action route registered in routes config
  [`routes.ts:11`](../../app/routes.ts#L11)
