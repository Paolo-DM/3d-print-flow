# Store API — Brand Lifecycle Commands

Two actions on the Zustand store (`app/lib/store.ts`), alongside the existing `createBrand`. Synchronous, discriminated results, plain object literals — event handlers switch on `result.type`; the store makes no UI decisions. `mergeBrands` and `MergeBrandsResult` (revision 1) no longer exist — the collision variant's `existingId` payload goes with them, since it existed solely to offer merge.

```ts
renameBrand(id: string, name: string):
  | { type: "renamed" }
  | { type: "unchanged" }
  | { type: "collision" }
  | { type: "invalid" }
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
- `collision` — `brandKey(trimmed)` equals the brandKey of a *different* brand; the UI surfaces an inline rejection.
- `renamed` — name set to the trimmed value; id preserved; one `set()` touching brands only.

## deleteBrand semantics

- `not-found` — no mutation.
- `deleted` — every figure with `brandId === id` gets `brandId = null`; the brand is removed; one `set()` updating brands and figures together. `detachedFigureCount` is the number of nulled figures (0 is valid).

## Shared rules

- Commands return before persistence completes; persistence flows through the existing store subscriber, which writes per changed store — delete changes both maps, so it produces **two** `writeStore` IndexedDB transactions (accepted non-atomicity stance).
- Either transaction can land without the other (a crash or quota failure between commits). Both intermediate states are recoverable by design and neither is corruption: brand-removed-but-figures-unnulled leaves orphan references that render brandless on reload (orphan tolerance), and figures-nulled-but-brand-alive leaves a zero-figure brand the manager can delete again. A failed write surfaces through the existing persistence-failure toast, whose `retryPersistence` rewrites all four stores from live state.
- Uniqueness invariant: after any command, the brand set is unique by `brandKey` with non-blank names. `brandKey` is imported from `app/lib/migration.ts` — do not duplicate the rule.
- Figures whose `brandId` does not resolve to any brand are untouched by delete (orphan tolerance — they already render as brandless).
