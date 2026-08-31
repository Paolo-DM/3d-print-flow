---
title: 'Finished Order Lines in Queue'
type: 'feature'
created: '2026-08-31'
status: 'done'
baseline_commit: '6d4fdf072e7d687d5c8fd1963768dbf2caf6c65a'
review_loop_iteration: 0
context:
  - '{project-root}/PRODUCT.md'
  - '{project-root}/CONTEXT.md'
  - '{project-root}/_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Completing every color for one figure inside a large customer order makes that Order Line disappear from the Figure queue, weakening progress feedback even though the parent Order remains in production.

**Approach:** Keep Finished Order Lines visible as correctable progress evidence in non-Ready Orders, separate them from remaining work, and preserve the action-only color ranking. Remove the identified old history from the supplied untracked export without touching current production data.

## Boundaries & Constraints

**Always:** Derive completion from current Figure colors and quantity, never `completedAt`. Retain a valid Finished Order Line until its parent becomes Ready, including with a broken sibling. Figures and Order cards show Remaining before Finished. Finished lines keep reversible color chips but disable quantity changes and removal. Sort timestamped lines newest-first, then missing timestamps last by ID; show semantic time or an unavailable fallback. Scopes apply. Completed Stock Lines and Ready Orders remain Completed-only and locked; Work by color stays demand-only. Preserve all catalog data and active `ORD-001`. Keep the export untracked with its `version` and `exportedAt`.

**Ask First:** Any schema, persistence, migration, Order lifecycle, full-to-zero color-cycle, or Ready-history edit change; persistent finished content in Work by color; deletions beyond the approved export set.

**Never:** Let Finished lines affect ranking or Queue metrics, enable their quantity/removal controls, leak Ready lines into Queue, remove Silente from `ORD-001`, or commit the export.

**Approved export deletions:** Order/row pairs `27d75860-b090-5234-b289-05da6f6e2c50`/`7d2df7d9-842b-4d33-bcb5-d960501a4822`, `3d97d861-1a45-5385-a2f9-b6eb3450a371`/`c0eabe80-d85a-4bc5-8377-dd3a434d329f`, `860ecf94-85cf-5cd0-9c92-7fa681c66724`/`f088d3f8-c625-447d-8dcc-7b5a7a23369e`, `a56c9cce-bf66-5a42-8dcd-5a08b22e043e`/`d234de79-3dcf-49f2-a3f9-722f47b27d9a`, `e3df1041-e5ca-538d-a333-8027938c95f1`/`d0ebf1cc-580f-449d-9143-16d909c20e51`, `f0a371c8-c653-5c34-88a5-802270561538`/`1ab44f31-5344-4188-b5c0-838d47ab7c61`; Stock rows `b6ee7c14-15bb-450a-83f2-22467a1c9fc4`, `f010f04e-0405-47e2-82e2-ef6618a30573`, `qi-charmander`.

</frozen-after-approval>

## Code Map

- `app/lib/derived.ts:135-210` -- aggregate state and retention predicate.
- `app/routes/_queue.figures.tsx:59-200` -- scoped row partition and animation.
- `app/components/OrderCard.tsx:39-160` -- Remaining/Finished grids.
- `app/components/QueueItemCard.tsx:84-251` -- Finished controls and `<time>`.
- `app/routes/_queue.home.tsx:71-267` -- transient completion and demand guard.
- `3d-print-flow-export-2026-08-31.json` -- untracked cleanup.

## Tasks & Acceptance

**Execution:**
- [x] `CONTEXT.md` -- distinguish Finished Order Lines in Queue from the Completed workspace.
- [x] `app/lib/derived.ts`, `app/lib/derived.test.ts` -- add/test retention for active, blocked, Ready, stock, orphaned, invalid, and quantity cases.
- [x] `app/components/QueueItemCard.tsx`, `app/components/QueueItemCard.test.tsx` -- add Finished metadata/reversible chips; lock quantity/removal.
- [x] `app/routes/_queue.figures.tsx`, `app/routes/_queue.figures.test.tsx` -- partition Remaining/Finished sections, scopes, motion, and pulse deduplication.
- [x] `app/components/OrderCard.tsx`, `app/routes/_queue.orders.test.tsx` -- partition each non-Ready Order while preserving issues, progress, and Ready filtering.
- [x] `app/routes/_queue.home.test.tsx` -- prove completed Order Lines neither rank nor persist within color entries.
- [x] `3d-print-flow-export-2026-08-31.json` -- remove approved IDs only; verify counts, references, protected pre/post hashes, and `??` status.

**Acceptance Criteria:**
- Given active `ORD-001` with Silente complete, when Figures or Orders opens, then Silente appears once under Finished with identity, quantity, progress, and time after Remaining.
- Given All, Stock, or Order scope, when rows derive, then only Finished lines from visible non-Ready Orders appear; completed stock and Ready Orders do not.
- Given a non-final Order Line completes, when its cascade ends, then it appears once under Finished; with reduced motion it relocates immediately.
- Given a Finished Order Line, when its specific color chip is toggled, then that progress reverses and the line returns to Remaining; quantity and removal stay unavailable.
- Given a Finished line with a broken sibling, when Queue renders, then it remains while the broken line stays Remaining with Needs attention; missing time has a fallback.
- Given a Stock Line or final Order Line completes, when state updates, then Stock or the Ready Order leaves Queue for Completed.
- Given a selected Order becomes Ready mid-session, when the scoped Queue rerenders, then its lines leave Queue, the existing all-complete/no-orders feedback appears, and the Ready aggregate is available in Completed.
- Given the cleaned export, when parsed and validated as v4, then only the approved historical records are absent and `ORD-001` plus Silente are byte-equivalent to their protected pre-cleanup objects.

## Spec Change Log

## Verification

**Commands:**
- `npm test` -- all route, component, derivation, and import/export tests pass.
- `npm run typecheck` -- strict TypeScript and generated route types pass.
- `npm run build` -- production bundle succeeds.
- `npx prettier --check "app/**/*.{ts,tsx}" CONTEXT.md` -- tracked code/context is formatted.
- Export validation script -- v4 validation, protected hashes, final counts, reference integrity, and `??` Git status all pass.

## Suggested Review Order

**Retention rule**

- Start here: what makes a line Finished, derived from colors, never `completedAt`.
  [`derived.ts:219`](../../app/lib/derived.ts#L219)

- Stock lines and Ready parents are excluded here, so no view has to re-check.
  [`derived.ts:240`](../../app/lib/derived.ts#L240)

- Unreadable timestamps sort as missing, matching what the card renders.
  [`derived.ts:253`](../../app/lib/derived.ts#L253)

**Queue partition**

- Finished lines wait for the completion cascade, so a line never renders twice.
  [`_queue.figures.tsx:190`](../../app/routes/_queue.figures.tsx#L190)

- Remaining keeps the old filter; only the variable name changed.
  [`_queue.figures.tsx:174`](../../app/routes/_queue.figures.tsx#L174)

- The empty state now needs both partitions empty, preserving all-complete feedback.
  [`_queue.figures.tsx:198`](../../app/routes/_queue.figures.tsx#L198)

**Order card partition**

- One pass splits each order's rows; order progress and issues are untouched.
  [`OrderCard.tsx:42`](../../app/components/OrderCard.tsx#L42)

- Highest-risk stop: a complete row that is not Finished stays locked as before.
  [`OrderCard.tsx:169`](../../app/components/OrderCard.tsx#L169)

**Finished card presentation**

- Semantic `<time>` with a fallback when the timestamp is absent or unreadable.
  [`QueueItemCard.tsx:89`](../../app/components/QueueItemCard.tsx#L89)

- Removal is withheld in both places it could appear; chips stay reversible.
  [`QueueItemCard.tsx:183`](../../app/components/QueueItemCard.tsx#L183)

- The footer trades the quantity stepper for the completion time.
  [`QueueItemCard.tsx:236`](../../app/components/QueueItemCard.tsx#L236)

**Language**

- Names the Finished Order Line and separates it from the Completed workspace.
  [`CONTEXT.md:17`](../../CONTEXT.md#L17)

**Tests**

- Retention across active, blocked, Ready, stock, orphaned, invalid, and quantity cases.
  [`derived.test.ts:612`](../../app/lib/derived.test.ts#L612)

- Ordering, including the unreadable-timestamp case.
  [`derived.test.ts:774`](../../app/lib/derived.test.ts#L774)

- Relocation only after the cascade ends, and immediately under reduced motion.
  [`_queue.figures.test.tsx:600`](../../app/routes/_queue.figures.test.tsx#L600)

- Section order and identity, quantity, progress, and time on the card.
  [`_queue.figures.test.tsx:364`](../../app/routes/_queue.figures.test.tsx#L364)

- Regression guard for the lock on complete but issue-blocked rows.
  [`_queue.orders.test.tsx:410`](../../app/routes/_queue.orders.test.tsx#L410)

- Per-order partition with progress, issues, and chip reversal preserved.
  [`_queue.orders.test.tsx:234`](../../app/routes/_queue.orders.test.tsx#L234)

- Finished lines neither rank nor persist inside color entries.
  [`_queue.home.test.tsx:395`](../../app/routes/_queue.home.test.tsx#L395)

- Finished metadata, reversible chips, and locked quantity and removal.
  [`QueueItemCard.test.tsx:387`](../../app/components/QueueItemCard.test.tsx#L387)
