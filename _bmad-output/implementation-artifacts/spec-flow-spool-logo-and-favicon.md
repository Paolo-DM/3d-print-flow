---
title: 'Add Flow Spool logo and favicon'
type: 'feature'
created: '2026-08-29'
status: 'done'
route: 'one-shot'
---

# Add Flow Spool logo and favicon

## Intent

**Problem:** The supplied Flow Spool artwork was not represented in the application shell or browser chrome, leaving the app with generic iconography and an unrelated favicon.

**Approach:** Preserve the exact artwork as a source asset, derive a tightly cropped transparent web logo and platform-sized favicon variants, then bind them into the sidebar, hydration state, and document metadata with accessible theme-aware presentation.

## Suggested Review Order

**Brand presentation**

- Start with the linked sidebar identity and collapsed-state logo treatment.
  [`AppSidebar.tsx:77`](../../app/components/AppSidebar.tsx#L77)

- Review title, favicon declarations, and accessible hydration branding together.
  [`root.tsx:26`](../../app/root.tsx#L26)

**Artwork**

- Inspect the transparent, square-cropped production master derived from the supplied PNG.
  [flow-spool-logo.png](../../public/brand/flow-spool-logo.png)

- Confirm the browser-sized mark remains legible at its smallest supported size.
  [favicon-32x32.png](../../public/favicon-32x32.png)

**Verification**

- Root tests lock metadata, favicon variants, and hydration accessibility.
  [`root.test.tsx:9`](../../app/root.test.tsx#L9)

- Sidebar coverage locks the home link, artwork path, and visible brand name.
  [`AppSidebar.test.tsx:63`](../../app/components/AppSidebar.test.tsx#L63)
