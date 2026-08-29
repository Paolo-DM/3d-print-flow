# Store API — Brand Lifecycle Commands

Three new actions on the Zustand store (`app/lib/store.ts`), alongside the existing `createBrand`. Synchronous, discriminated results, plain object literals — event handlers switch on `result.type`; the store makes no UI decisions.

```ts
renameBrand(id: string, name: string):
  | { type: "renamed" }
  | { type: "unchanged" }
  | { type: "collision"; existingId: string }
  | { type: "invalid" }
  | { type: "not-found" }

mergeBrands(sourceId: string, targetId: string):
  | { type: "merged"; movedFigureCount: number }
  | { type: "same-brand" }
  | { type: "not-found" }

deleteBrand(id: string):
  | { type: "deleted"; detachedFigureCount: number }
  | { type: "not-found" }
```

## renameBrand semantics

Variants are checked in this order; every non-`renamed` variant mutates nothing.

- `not-found` — `id` is not in the brands map.
- `invalid` — name is empty after trim.
- `unchanged` — trimmed name strictly equals the brand's current name. A casing-only difference under the same brandKey is **not** unchanged — it is a plain `renamed`.
- `collision` — `brandKey(trimmed)` equals the brandKey of a *different* brand; returns that brand's id so the UI can offer merge into it.
- `renamed` — name set to the trimmed value; id preserved; one `set()` touching brands only.

## mergeBrands semantics

Checked in this order — `same-brand`, then `not-found`, then `merged` — so `mergeBrands(x, x)` for a missing `x` returns `same-brand`.

- `same-brand` — `sourceId === targetId`; no mutation. The UI prevents this by construction (target selector excludes the source; a same-brand casing rename never reaches merge), but the store guards it anyway.
- `not-found` — either id missing; no mutation.
- `merged` — every figure with `brandId === sourceId` gets `brandId = targetId`; the source brand is removed; brands and figures updated together in one `set()`. `movedFigureCount` is the number of rewired figures (0 is valid — merging an unreferenced brand just deletes the source).

## deleteBrand semantics

- `not-found` — no mutation.
- `deleted` — every figure with `brandId === id` gets `brandId = null`; the brand is removed; one `set()` updating brands and figures together. `detachedFigureCount` is the number of nulled figures (0 is valid).

## Shared rules

- Commands return before persistence completes; persistence flows through the existing store subscriber, which writes per changed store — merge and delete change both maps, so they produce **two** `writeStore` IndexedDB transactions (accepted non-atomicity stance).
- Either transaction can land without the other (a crash or quota failure between commits). Both intermediate states are recoverable by design and neither is corruption: brand-deleted-but-figures-unrewired degrades a merge to a delete (figures render brandless on reload, per orphan tolerance), and figures-rewired-but-source-brand-alive leaves a zero-figure brand the manager can delete again. A failed write surfaces through the existing persistence-failure toast, whose `retryPersistence` rewrites all four stores from live state.
- Uniqueness invariant: after any command, the brand set is unique by `brandKey` with non-blank names. `brandKey` is imported from `app/lib/migration.ts` — do not duplicate the rule.
- Figures whose `brandId` does not resolve to any brand are untouched by merge and delete (orphan tolerance — they already render as brandless).
