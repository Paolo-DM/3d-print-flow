import { useEffect, useState } from "react"
import { Pencil, Tags, Trash2 } from "lucide-react"

import { usePrintFlowStore } from "~/lib/store"
import type { Brand } from "~/lib/types"
import { pluralize } from "~/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { Input } from "~/components/ui/input"

interface BrandRow {
  brand: Brand
  figureCount: number
}

type RenameError = "invalid" | "collision"

const RENAME_ERROR_MESSAGES: Record<RenameError, string> = {
  invalid: "Enter a brand name.",
  collision: "This name is already in use.",
}

/**
 * Modal *content* for brand lifecycle management — the Sheet/Drawer shell that
 * hosts it lives in the catalog route. Rows and counts derive from the live
 * store maps on every render; nothing is snapshotted.
 */
export function BrandManager() {
  const brands = usePrintFlowStore((s) => s.brands)
  const figures = usePrintFlowStore((s) => s.figures)
  const renameBrand = usePrintFlowStore((s) => s.renameBrand)
  const deleteBrand = usePrintFlowStore((s) => s.deleteBrand)

  const [edit, setEdit] = useState<{ id: string; text: string } | null>(null)
  const [renameError, setRenameError] = useState<RenameError | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Strict brandId equality — the same rule the store commands apply, so a
  // figure pointing at no live brand counts towards nothing.
  const figureCounts = new Map<string, number>()
  for (const figure of figures.values()) {
    if (figure.brandId !== null) {
      figureCounts.set(
        figure.brandId,
        (figureCounts.get(figure.brandId) ?? 0) + 1
      )
    }
  }

  const rows: BrandRow[] = Array.from(brands.values())
    .map((brand) => ({
      brand,
      figureCount: figureCounts.get(brand.id) ?? 0,
    }))
    .toSorted((a, b) => a.brand.name.localeCompare(b.brand.name))

  const deletingBrand = deletingId ? brands.get(deletingId) : null
  const deletingCount = deletingId ? (figureCounts.get(deletingId) ?? 0) : 0

  /**
   * Escape while renaming must leave edit mode without dismissing the host
   * Sheet/Drawer. The host's Radix dismissable layer listens for Escape on the
   * *document* in the capture phase, so a React handler on the input can never
   * stop it — it runs long after the modal has decided to close. This listener
   * registers on mount, i.e. before the ancestor layer's (child effects flush
   * first), and marks the event handled; Radix skips an Escape whose default is
   * already prevented. It fires only when focus is in a rename field, so a
   * stacked AlertDialog keeps its own Escape. The body touches nothing but
   * stable state setters, so the mount-time closure never goes stale.
   */
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.dataset.renameField === undefined) return
      event.preventDefault()
      setEdit(null)
      setRenameError(null)
    }
    document.addEventListener("keydown", handleEscape, { capture: true })
    return () =>
      document.removeEventListener("keydown", handleEscape, { capture: true })
  }, [])

  function startRename(brand: Brand) {
    setEdit({ id: brand.id, text: brand.name })
    setRenameError(null)
  }

  function cancelRename() {
    setEdit(null)
    setRenameError(null)
  }

  function submitRename() {
    if (!edit) return
    const result = renameBrand(edit.id, edit.text)
    switch (result.type) {
      case "invalid":
        setRenameError("invalid")
        return
      case "collision":
        // Stay in edit mode with the typed text intact for correction.
        setRenameError("collision")
        return
      case "renamed":
      case "unchanged":
      // `not-found` means the brand vanished concurrently — the live-derived
      // rows have already dropped it, so there is nothing to report.
      case "not-found":
        cancelRename()
        return
      default: {
        const exhaustive: never = result
        return exhaustive
      }
    }
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return
    // Keep a stray submit inside the host modal from reaching its layer.
    e.preventDefault()
    e.stopPropagation()
    submitRename()
  }

  function confirmDelete() {
    // A row in edit mode renders no Delete button, so no rename state can be
    // pending for this brand.
    if (deletingId) deleteBrand(deletingId)
    setDeletingId(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Tags />
              </EmptyMedia>
              <EmptyTitle>No Brands Yet</EmptyTitle>
              <EmptyDescription>
                Brands appear here once you assign one to a figure.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="brand-manager-list">
            {rows.map(({ brand, figureCount }) => (
              <li
                key={brand.id}
                className="rounded-lg border border-border bg-card px-3 py-2"
                data-testid={`brand-row-${brand.id}`}
              >
                {edit?.id === brand.id ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        autoFocus
                        value={edit.text}
                        aria-label={`Brand name for ${brand.name}`}
                        aria-invalid={renameError !== null}
                        aria-describedby={
                          renameError !== null
                            ? `brand-rename-error-${brand.id}`
                            : undefined
                        }
                        onChange={(e) => {
                          setEdit({ id: brand.id, text: e.target.value })
                          setRenameError(null)
                        }}
                        onKeyDown={handleRenameKeyDown}
                        data-rename-field=""
                        data-testid={`brand-rename-input-${brand.id}`}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={submitRename}
                        data-testid={`brand-rename-save-${brand.id}`}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={cancelRename}
                        data-testid={`brand-rename-cancel-${brand.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                    {renameError !== null ? (
                      <p
                        id={`brand-rename-error-${brand.id}`}
                        role="alert"
                        className="text-sm text-destructive"
                        data-testid={`brand-rename-error-${brand.id}`}
                      >
                        {RENAME_ERROR_MESSAGES[renameError]}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium" title={brand.name}>
                        {brand.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {pluralize(figureCount, "figure")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Rename ${brand.name}`}
                      onClick={() => startRename(brand)}
                      data-testid={`brand-rename-${brand.id}`}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${brand.name}`}
                      onClick={() => setDeletingId(brand.id)}
                      data-testid={`brand-delete-${brand.id}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeletingId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              {!deletingBrand
                ? null
                : deletingCount === 0
                  ? `"${deletingBrand.name}" is not referenced by any figures.`
                  : `Deleting "${deletingBrand.name}" keeps its ${pluralize(deletingCount, "figure")} and moves them to "No brand".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
