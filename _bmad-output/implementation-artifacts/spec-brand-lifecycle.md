---
title: 'Brand Lifecycle Management'
type: 'feature'
created: '2026-08-29'
status: 'done'
baseline_commit: 'bdb7375758e8146acc2ab755d312f4d790b37527'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-brand-lifecycle/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-brand-lifecycle/store-api.md'
  - '{project-root}/_bmad-output/specs/spec-brand-lifecycle/ui-flows.md'
  - '{project-root}/_bmad-output/specs/spec-brand-lifecycle/test-expectations.md'
  - '{project-root}/_bmad-output/specs/spec-brand-lifecycle/brownfield.md'
  - '{project-root}/_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** SPEC-brand (commit b093db4) shipped Brand as a create-only entity, so a mistyped brand, a duplicate that should be one brand, or an obsolete zero-figure brand is permanently visible in the catalog — fixable only by re-editing every figure or by export-file surgery.

**Approach:** Add rename / merge / delete as three synchronous store commands returning discriminated results, driven from a new always-available "Manage brands" modal on the catalog; tighten v2 import to reject brand collections that would break the brandKey-uniqueness invariant those commands rely on; close the stale-selection gap in FigureForm.

## Boundaries & Constraints

**Always:** The canonical contract is `_bmad-output/specs/spec-brand-lifecycle/` (SPEC + store-api + ui-flows + test-expectations + brownfield) — it governs on every conflict with this file. Reuse `brandKey` from `app/lib/migration.ts`. Each command applies its brand+figure changes in a single `set()` and makes no UI decisions. Rename preserves the brand id. After every command the brand set stays unique by brandKey with non-blank names. Compose only from existing `app/components/ui/` primitives. Plain TypeScript type guards. React Compiler (no manual `useMemo`/`useCallback`/`React.memo`), minimal `useEffect` (derive during render, key-reset over Effects). Tailwind semantic tokens + `cn()`. Tests co-located, vitest + `fireEvent`.

**Ask First:** Any deviation from `store-api.md` result variants or check order. Any change to the export schema, the IndexedDB version, or the invalid-format error message. Adding an npm dependency. Introducing a new transactional persistence mechanism.

**Never:** Success toasts. Undo. Brand metadata beyond `name`. Bulk merge beyond one source→target. Brand management outside the catalog manager (no new route, no lifecycle inside `BrandCombobox`, no section-header actions). Referential-integrity or record-key/embedded-id validation on import. Blocking a delete on referenced figures.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rename, casing only | `renameBrand(id, "Naruto")`, stored `"naruto"` | `{ type: "renamed" }`; name updated, id preserved | N/A |
| Rename, no-op | trimmed text strictly equals stored name | `{ type: "unchanged" }`, no mutation | N/A |
| Rename, blank | `""` / `"   "` | `{ type: "invalid" }`, no mutation | Rejected inline in the row |
| Rename, collision | brandKey equals a *different* brand's | `{ type: "collision", existingId }`, no mutation | UI offers merge into `existingId` |
| Rename, missing id | id absent from brands | `{ type: "not-found" }` (checked first) | Row already gone; no dialog |
| Merge | distinct existing ids | `{ type: "merged", movedFigureCount }`; source figures rewired, source brand removed, one `set()` | N/A |
| Merge, self | `sourceId === targetId` (even if missing) | `{ type: "same-brand" }` (checked before not-found) | N/A |
| Merge, missing | either id absent | `{ type: "not-found" }`, no mutation | Dialog closes silently |
| Delete | brand with 0 or N figures | `{ type: "deleted", detachedFigureCount }`; matching figures `brandId: null`, brand removed, one `set()` | N/A |
| Orphan figure | `brandId` resolves to no brand | Untouched by merge and delete | N/A |
| Import v2, blank brand name | brand `name` blank after trim | Rejected, existing invalid-format message | Existing inline import error |
| Import v2, duplicate brandKey | two brands share brandKey | Rejected, same message | Existing inline import error |
| Save form, stale brand | selected brand deleted/merged since open | Figure saved with `brandId: null` | N/A |

</frozen-after-approval>

## Code Map

- `app/lib/store.ts` — `PrintFlowState` interface (:20) and the `createStore` body; `createBrand` (:61) is the pattern to follow for brandKey dedup. Persistence subscriber (:220) writes per-store on map identity change → a brands+figures command yields two `writeStore` calls. `retryPersistence` (:209) already rewrites all four stores. Add the three commands + exported result unions here.
- `app/lib/migration.ts` — `brandKey` (:31). Import it; never restate the rule.
- `app/lib/export-import.ts` — `isValidBrand` (:72) checks only string types; `validateExportEnvelope` (:135) calls it via `allValuesMatch`; invalid-format message at :210. Tighten here only — v1 path (`migrateV1Figures`) needs nothing.
- `app/routes/catalog.tsx` — header (:266) holds "Add Figure"; single `open` state (:206) drives Sheet/Drawer (:296) via `useIsMobile`; `BrandGroupedCatalog` (:88) holds a *deselected-id* set and is key-reset on `dataGeneration` (:287); `NO_BRAND` sentinel (:44). Figure-delete AlertDialog (:316) is a sibling that closes the form first — the brand dialogs deliberately do the opposite.
- `app/components/FigureForm.tsx` — `brandSelection` resolved against `brands.has` at open (:30); `handleSave` (:56) trusts the stale id — the CAP-7 gap.
- `app/components/BrandManager.tsx` — **new**. Modal *content* only; the Sheet/Drawer shell stays in `catalog.tsx`.
- `app/components/ui/` — `sheet` (`SheetContent` has no scroll container of its own), `drawer` (vaul, forces `repositionInputs={false}`), `alert-dialog` (`AlertDialogAction`/`Cancel` accept `variant`), `popover` (non-modal by default — right primitive for the merge-target selector), `button`, `input`.
- Test conventions (read before writing tests): `app/lib/store.test.ts` — local `resetStore()` in `afterEach`, `vi.mock("~/lib/db", …)`, `vi.mock("sonner", …)`, persistence-failure pattern at :557-668. `app/routes/catalog.test.tsx` — `createRoutesStub`, per-file `matchMedia` polyfill in `beforeAll`, store seeded in `beforeEach`. `app/routes/spools.test.tsx:156-178` — the Drawer variant is exercised by overriding `window.innerWidth`, **not** by mocking `useIsMobile`. Factories in `app/lib/test-utils.ts`. No setup file, no `jest-dom`, no `user-event`; `// @vitest-environment jsdom` on line 1 and `import "fake-indexeddb/auto"` first.

## Tasks & Acceptance

**Execution:**
- [x] `app/lib/store.ts` -- add `renameBrand` / `mergeBrands` / `deleteBrand` to the state interface and body, with exported discriminated result types -- the matrix above is the contract; check order is load-bearing
- [x] `app/lib/store.test.ts` -- cover every matrix row, both-store `writeStore` calls, the brandKey invariant, orphan tolerance, and a merge whose `figures` write rejects then converges via retry -- these are the regression net for the invariant
- [x] `app/lib/export-import.ts` -- make `isValidBrand` a type predicate and add a brand-collection check (non-blank, unique brandKey) used by `validateExportEnvelope` -- CAP-6 without touching the v1 path or the message
- [x] `app/lib/export-import.test.ts` -- blank-name and duplicate-brandKey v2 rejection, v2 round-trip, v1 unaffected -- proves the tightening is scoped
- [x] `app/components/BrandManager.tsx` -- new modal content: live-derived alphabetized rows with figure counts, inline rename, "Merge into…" popover selector, and the two AlertDialogs -- both merge entry paths converge on one dialog
- [x] `app/components/BrandManager.test.tsx` -- rename variants incl. collision→cancel/confirm, explicit merge, disabled lone-brand merge, delete wording for 0 and N -- unit-level flow coverage
- [x] `app/routes/catalog.tsx` -- add the always-visible header action and replace the boolean modal state with a discriminated `{ kind: "figure" | "brands" }` state over the one Sheet/Drawer -- mutual exclusion by construction (CAP-7)
- [x] `app/routes/catalog.test.tsx` -- open from an empty catalog, stacked-dialog cancel on **both** Sheet and Drawer, and post-operation catalog/filter semantics -- the integration contract in `ui-flows.md`
- [x] `app/components/FigureForm.tsx` -- re-resolve the selected brand id at save (`brands.has(id) ? id : null`) -- closes the orphan-write gap
- [x] `app/components/FigureForm.test.tsx` -- stale selection saves null after the brand is deleted and after it is merged away -- null wins over merge rewiring for the open form

**Acceptance Criteria:**
- Given the catalog with no figures and no brands, when the user opens "Manage brands", then the manager opens and shows an empty message.
- Given a brand renamed in the manager, when the manager closes, then its catalog section header and filter chip show the new name and the filter selection state is unchanged.
- Given brands A and B where B is deselected in the catalog filter, when A is merged into B, then A's figures render under B only if B is reselected, and A's chip and section are gone.
- Given a brand whose figures exist and "No brand" is deselected, when the brand is deleted, then its figures are retained with `brandId: null` and stay hidden until "No brand" is reselected.
- Given the merge or delete AlertDialog open over the manager, when the user cancels, then the manager is still open and interactive — verified on the Sheet and the Drawer variant.
- Given `npm test`, when the suite runs, then the only failure is the pre-existing locale-dependent `completed.test.tsx` "shows completion date".

## Design Notes

One modal, one state — replace `open`/`editingFigure` with a single discriminated modal state so the brand manager and figure form can never be open together:

```tsx
type CatalogModal = { kind: "figure"; figure: Figure | null } | { kind: "brands" }
const [modal, setModal] = useState<CatalogModal>({ kind: "figure", figure: null })
const [open, setOpen] = useState(false)   // closing leaves `modal` intact for the exit animation
```

The manager is `<BrandManager key={dataGeneration} />` — key-reset, not an Effect, for transient rename/merge state on import. Rows, counts, and the merge-target list derive from the live `brands`/`figures` maps every render; nothing is snapshotted. A rename `collision` keeps the row in edit mode so cancelling the merge returns to the typed text.

Known risk to verify, not to design around: a Radix `AlertDialog` stacked over the vaul `Drawer` can leave `pointer-events: none` on `document.body`. The Drawer-variant cancel test exists to catch it; if it reproduces, prefer a fix local to the manager/catalog composition over changing shared `ui/` primitives, and report it.

## Verification

**Commands:**
- `npx vitest run app/lib/store.test.ts app/lib/export-import.test.ts` -- expected: all green
- `npx vitest run app/components/BrandManager.test.tsx app/components/FigureForm.test.tsx app/routes/catalog.test.tsx` -- expected: all green
- `npm test` -- expected: 1 failed (`completed.test.tsx` "shows completion date"), every other test passed; total count grown by the new tests
- `npm run typecheck` -- expected: no errors

## Suggested Review Order

**Store contract — the outcomes everything else switches on**

- Start here: three discriminated result unions define the whole feature's vocabulary.
  [`store.ts:13`](../../app/lib/store.ts#L13)

- Ordered checks; a casing-only change is a rename, and the id never moves.
  [`store.ts:113`](../../app/lib/store.ts#L113)

- Rewires every source figure and drops the source brand in one `set()`.
  [`store.ts:137`](../../app/lib/store.ts#L137)

- Cascades `brandId` to null rather than blocking on referenced figures.
  [`store.ts:160`](../../app/lib/store.ts#L160)

**Import invariant — what keeps those commands well-defined**

- Type predicate, no casts: non-blank names, unique brandKey, orphans still tolerated.
  [`export-import.ts:83`](../../app/lib/export-import.ts#L83)

- Swapped into v2 validation only; the v1 path and error message are untouched.
  [`export-import.ts:162`](../../app/lib/export-import.ts#L162)

**Manager UI — live derivation and the modal-stacking edges**

- Rows, counts and merge targets derive from live store maps every render.
  [`BrandManager.tsx:76`](../../app/components/BrandManager.tsx#L76)

- Highest-risk stop: capture-phase Escape cancels the rename without dismissing the host modal.
  [`BrandManager.tsx:102`](../../app/components/BrandManager.tsx#L102)

- Collision keeps the row in edit mode so cancelling the merge restores typed text.
  [`BrandManager.tsx:127`](../../app/components/BrandManager.tsx#L127)

- Dialog copy renders only when both brands resolve — no `undefined` mid-animation.
  [`BrandManager.tsx:348`](../../app/components/BrandManager.tsx#L348)

**Catalog wiring — mutual exclusion by construction**

- One discriminated modal state; the manager and figure form cannot coexist.
  [`catalog.tsx:51`](../../app/routes/catalog.tsx#L51)

- Every open bumps a sequence folded into the content key, so reopens start clean.
  [`catalog.tsx:242`](../../app/routes/catalog.tsx#L242)

- Always-visible header action, reachable with an empty catalog.
  [`catalog.tsx:302`](../../app/routes/catalog.tsx#L302)

**Form consistency**

- Brand id re-resolved at save: a merged-away brand writes null, never the target.
  [`FigureForm.tsx:56`](../../app/components/FigureForm.tsx#L56)

**Tests**

- Full command matrix, single-`set()` proof, orphan tolerance, persistence-failure retry.
  [`store.test.ts:286`](../../app/lib/store.test.ts#L286)

- Hosted Escape/Enter plus stacked-dialog cancel on both Sheet and Drawer.
  [`catalog.test.tsx:497`](../../app/routes/catalog.test.tsx#L497)

- Manager flows in isolation, including a concurrently vanished merge source.
  [`BrandManager.test.tsx:64`](../../app/components/BrandManager.test.tsx#L64)

- Blank-name and duplicate-brandKey rejection; verbatim untrimmed import.
  [`export-import.test.ts:626`](../../app/lib/export-import.test.ts#L626)

- Stale selection saves null after the brand is deleted and after it is merged.
  [`FigureForm.test.tsx:374`](../../app/components/FigureForm.test.tsx#L374)
