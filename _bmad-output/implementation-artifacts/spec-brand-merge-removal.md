---
title: 'Brand Merge Removal'
type: 'refactor'
created: '2026-08-29'
status: 'done'
route: 'one-shot'
context:
  - '{project-root}/_bmad-output/specs/spec-brand-lifecycle/SPEC.md'
---

# Brand Merge Removal

## Intent

**Problem:** Brand merging (shipped with the brand-lifecycle feature, commit 35925cb) wasn't wanted — the brandKey uniqueness guards already prevent duplicates, and the "Merge into…" affordance cluttered the brand manager. The spec revision of 2026-08-29 retired CAP-3.

**Approach:** Delete `mergeBrands`/`MergeBrandsResult` from the store, simplify the rename `collision` result to a payload-free variant, and replace both merge UI paths in BrandManager with an inline "This name is already in use." rejection that keeps the row in edit mode. Merge tests removed; collision-recovery and delete-dialog concurrent-vanish coverage added per review.

## Suggested Review Order

**Collision becomes an inline rejection**

- Entry point: collision now routes to the same inline-error mechanism as blank names, staged text kept.
  [`BrandManager.tsx:122`](../../app/components/BrandManager.tsx#L122)

- One message table for both rename errors; presentation stays implementation-defined per spec.
  [`BrandManager.tsx:33`](../../app/components/BrandManager.tsx#L33)

- The error paragraph renders whichever message applies, same testid and aria wiring as before.
  [`BrandManager.tsx:217`](../../app/components/BrandManager.tsx#L217)

**Store API shrinks**

- `collision` drops `existingId` — it existed solely to offer merge.
  [`store.ts:16`](../../app/lib/store.ts#L16)

- `mergeBrands` implementation deleted; `deleteBrand` follows `renameBrand` directly.
  [`store.ts:127`](../../app/lib/store.ts#L127)

**Coverage moved, not lost**

- Collision rejection asserted inline: no dialog, typed text preserved, no mutation.
  [`BrandManager.test.tsx:146`](../../app/components/BrandManager.test.tsx#L146)

- Review-added: typing clears the error and a corrected retype renames.
  [`BrandManager.test.tsx:169`](../../app/components/BrandManager.test.tsx#L169)

- Review-added: concurrent-vanish guard re-pinned on the delete dialog (was only tested via merge).
  [`BrandManager.test.tsx:202`](../../app/components/BrandManager.test.tsx#L202)

- Negative test pins the absence of any merge affordance via `brand-merge-` testids.
  [`BrandManager.test.tsx:191`](../../app/components/BrandManager.test.tsx#L191)

**Peripherals**

- Single-set() and persistence-failure tests rewritten from merge to delete.
  [`store.test.ts:487`](../../app/lib/store.test.ts#L487)

- Save-guard comment no longer mentions merge; behavior unchanged.
  [`FigureForm.tsx:59`](../../app/components/FigureForm.tsx#L59)

- Spec folder re-derived (CAP-3 tombstone, post-removal baseline 411/412, brownfield past tense).
  [`SPEC.md`](../specs/spec-brand-lifecycle/SPEC.md)
