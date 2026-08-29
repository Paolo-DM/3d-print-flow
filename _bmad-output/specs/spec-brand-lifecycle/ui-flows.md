# UI Flows — Brand Manager

## Surface

- "Manage brands" sits in the catalog header, always visible and enabled — including with an empty catalog or zero brands (the manager then shows an empty message). No new route.
- Responsive modal: Sheet on desktop / Drawer on mobile, same `useIsMobile` mechanism as the figure form. The catalog only ever opens one modal, which is what makes manager and figure form mutually exclusive (CAP-7) — preserve that.
- Rows: every brand, case-insensitively alphabetized (`localeCompare`, same ordering as catalog sections and combobox), each showing name and figure count (including 0) with inline rename, "Merge into…", and delete actions. The "No brand" pseudo-group is not a row.
- Rows derive from live store maps every render; transient state (rename text, pending merge target) key-resets on `dataGeneration` (CAP-7).
- Row and dialog figure counts are the number of live figures with `brandId === brand.id` — strict equality, the same rule the store commands apply — derived from the live figures map at render, never snapshotted.
- The manager stays open beneath the merge and delete AlertDialogs. This is a deliberate divergence from the figure-delete precedent (`catalog.tsx` closes the form modal *before* opening its AlertDialog); the stacked case needs explicit coverage on both Sheet and Drawer.
- No success toasts anywhere — the visible state change is the feedback.

## Rename

Inline edit → save calls `renameBrand(id, text)` and switches:

- `renamed` — row shows the new name; the list re-sorts.
- `unchanged` — exit edit mode, nothing else.
- `invalid` — rejected inline without mutation (presentation implementation-defined).
- `collision` — open the merge confirmation dialog with source = this brand, target = `existingId`. Cancel returns to the edit state with the typed text intact. On confirm the target keeps its current name: the typed text is discarded along with the source, so recasing the survivor is a separate, subsequent rename of the target.
- `not-found` — the brand vanished concurrently; the live-derived row list has already dropped it. No dialog.

Because the id is stable, catalog filter selection, an open combobox selection, and figure references are unaffected beyond the displayed text.

## Merge

- Explicit path: "Merge into…" presents a target-brand selector (existing primitives) listing all brands except the source. Choosing a target opens the confirmation dialog. When no other brand exists (a lone brand in the store), the action is disabled rather than opening an empty selector.
- Both paths — explicit and rename-collision — converge on **one** dialog implementation: an AlertDialog naming source brand, target brand, and moved-figure count. The dialog names each brand by its stored name, not by any typed text.
- Confirm calls `mergeBrands(sourceId, targetId)`; on `merged` the dialog closes, the manager stays open, and rows update (source gone, target's count grown).
- Any non-`merged` result at confirm time closes the dialog with no mutation and no message — the live-derived rows have already reconciled.
- CAP-7 precedence: a stale form selection of a merged-away brand saves as null, never remapped to the target.
- Catalog after merge: the source's chip and section disappear; moved figures render under the target and **adopt the target's current filter state** (no filter reset — if the target is deselected they stay hidden).

## Delete

- Delete opens a destructive AlertDialog stating the referenced-figure count and that figures are kept and moved to "No brand" (CAP-4). A zero-reference delete uses the same dialog with count 0.
- Confirm calls `deleteBrand(id)`; rows update, the catalog drops the brand's chip and section, and detached figures appear under "No brand" **subject to that group's current filter state** — if `no-brand` is currently deselected they stay hidden until reselected.
- Any non-`deleted` result at confirm time closes the dialog the same way — no mutation, no message.
