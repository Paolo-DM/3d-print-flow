---
title: 'Brand chip contrast and combobox wheel scrolling'
type: 'bugfix'
created: '2026-08-28'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'b093db451168a5ad498ba13f0544b8a8e5562943'
context:
  - '{project-root}/_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Selected brand filter chips do not explicitly use the matching foreground token, leaving their text incorrect in the light theme. The brand combobox is portalled out of the figure drawer, so the drawer's modal scroll lock consumes mouse-wheel input even though dragging the list scrollbar still works.

**Approach:** Give selected chips the semantic accent foreground color and make the nested brand popover modal so its portalled content becomes the active scroll-lock region. Preserve the existing brand selection, filtering, creation, keyboard, and scrollbar behavior.

## Boundaries & Constraints

**Always:** Use existing semantic Tailwind tokens; keep both themes supported; retain the list's bounded native vertical scrolling and all existing combobox semantics.

**Ask First:** Any shared primitive change or new dependency.

**Never:** Hardcode a color, disable the figure drawer's modal behavior, manually synthesize scrolling from wheel deltas, or alter brand persistence/filter state behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Selected chip | Catalog in light theme with a visible brand group | Accent-background chip uses accent-foreground (white) text | N/A |
| Deselected chip | User toggles a brand group off | Existing card/muted treatment remains unchanged | N/A |
| Long brand list | Brand combobox opened inside the figure drawer | Mouse wheel and direct scrollbar dragging both scroll the bounded options list | N/A |
| Combobox interaction | Search, select, clear, stage, or press Enter | Existing behavior remains unchanged | N/A |

</frozen-after-approval>

## Code Map

- `app/routes/catalog.tsx` -- `BrandGroupedCatalog` renders selected/deselected filter-chip classes; the selected branch currently has `bg-accent` without `text-accent-foreground`.
- `app/routes/catalog.test.tsx` -- existing brand grouping/filter interaction coverage; add class assertions for selected and deselected chip states.
- `app/components/BrandCombobox.tsx` -- controlled Radix `Popover` is rendered from `FigureForm` inside a modal Vaul drawer; default non-modal portalled content sits outside the drawer scroll-lock boundary. Set this popover to modal and keep the native `overflow-y-auto` list.
- `app/components/BrandCombobox.test.tsx` -- existing selection, filtering, ARIA, staged-brand, and Enter-key regression suite; verify the option list retains bounded native overflow styling.
- `app/components/ui/popover.tsx` -- read-only evidence: content always uses `PopoverPrimitive.Portal`; no shared primitive change is needed.
- `app/components/ui/drawer.tsx` -- read-only evidence: Vaul drawer remains modal and therefore scroll-locks content outside its portal.
- `.impeccable.md` -- persistent repository design context referenced by tracked project documentation; include as a tracked project artifact without modifying its contents.

## Tasks & Acceptance

**Execution:**
- [x] `app/routes/catalog.tsx`, `app/routes/catalog.test.tsx` -- apply and verify the semantic selected-chip foreground class -- restore light-theme contrast without changing deselected styling.
- [x] `app/components/BrandCombobox.tsx`, `app/components/BrandCombobox.test.tsx` -- activate nested-popover modality and preserve native bounded overflow -- allow wheel scrolling inside the drawer without event-level workarounds.
- [x] `.impeccable.md` -- retain as repository design guidance -- resolve the pre-existing untracked artifact consistently with README references.

**Acceptance Criteria:**
- Given a selected brand filter chip in the light theme, when the catalog renders, then its text uses `text-accent-foreground` over `bg-accent`.
- Given the brand combobox is open inside the modal figure drawer with more options than fit, when the pointer is over the options and the user turns the mouse wheel, then the options scroll while the drawer stays open.
- Given the focused component and catalog tests, when run, then all existing brand selection and filtering behaviors still pass.

## Spec Change Log

## Design Notes

Radix Popover defaults to non-modal and portals content to `document.body`. In a modal Vaul drawer, the drawer's scroll lock treats that portalled list as outside content and prevents wheel scrolling. Radix's modal popover content installs the nested active scroll-lock boundary around its own portal, addressing the composition issue while retaining native overflow behavior.

## Verification

**Commands:**
- `npm test -- app/components/BrandCombobox.test.tsx app/routes/catalog.test.tsx` -- expected: focused regression suites pass.
- `npm run typecheck` -- expected: clean.
- `npx prettier --check app/components/BrandCombobox.tsx app/components/BrandCombobox.test.tsx app/routes/catalog.tsx app/routes/catalog.test.tsx` -- expected: clean.

**Manual checks:**
- In light theme, selected catalog brand chips have white semantic foreground text.
- In Add/Edit Figure, open a long brand list and confirm a mouse wheel scrolls the options without closing or moving the drawer.

## Suggested Review Order

**Nested modal scrolling**

- Make the portalled popover own scroll locking inside the modal drawer.
  [`BrandCombobox.tsx:96`](../../app/components/BrandCombobox.tsx#L96)

- Exercise real wheel input against an overflowing list in an open drawer.
  [`BrandCombobox.test.tsx:93`](../../app/components/BrandCombobox.test.tsx#L93)

**Brand chip contrast**

- Pair the selected accent background with its semantic foreground token.
  [`catalog.tsx:142`](../../app/routes/catalog.tsx#L142)

- Verify selected and deselected chip classes remain distinct.
  [`catalog.test.tsx:393`](../../app/routes/catalog.test.tsx#L393)

**Project design context**

- Preserve the documented visual and accessibility principles for future work.
  [`.impeccable.md:1`](../../.impeccable.md#L1)
