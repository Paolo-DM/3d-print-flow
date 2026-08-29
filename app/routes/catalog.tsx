import { useState } from "react"
import { Check, Shapes } from "lucide-react"
import { toast } from "sonner"

import { MAX_QUEUE_QUANTITY, usePrintFlowStore } from "~/lib/store"
import { computeAffectedQueueItems } from "~/lib/derived"
import type { Brand, Figure, Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import { useIsMobile } from "~/hooks/use-mobile"
import { BrandManager } from "~/components/BrandManager"
import { FigureCard } from "~/components/FigureCard"
import { FigureForm } from "~/components/FigureForm"
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet"

/** Filter/group id for figures without a resolvable brand. */
const NO_BRAND = "no-brand"

/**
 * The catalog owns exactly one modal shell, so the figure form and the brand
 * manager can never be open at the same time (CAP-7).
 */
type CatalogModal =
  | { kind: "figure"; figure: Figure | null }
  | { kind: "brands" }

interface BrandGroup {
  id: string
  name: string
  figures: Figure[]
}

function groupFiguresByBrand(
  figures: Figure[],
  brands: Map<string, Brand>
): BrandGroup[] {
  const byBrandId = new Map<string, Figure[]>()
  for (const figure of figures) {
    // An unresolvable brandId groups under "No brand" (orphan tolerance)
    const groupId =
      figure.brandId !== null && brands.has(figure.brandId)
        ? figure.brandId
        : NO_BRAND
    const group = byBrandId.get(groupId)
    if (group) {
      group.push(figure)
    } else {
      byBrandId.set(groupId, [figure])
    }
  }

  const brandGroups: BrandGroup[] = []
  for (const [groupId, groupFigures] of byBrandId) {
    if (groupId === NO_BRAND) continue
    const brand = brands.get(groupId)
    if (!brand) continue
    brandGroups.push({ id: brand.id, name: brand.name, figures: groupFigures })
  }
  brandGroups.sort((a, b) => a.name.localeCompare(b.name))

  const brandless = byBrandId.get(NO_BRAND)
  if (brandless) {
    brandGroups.push({ id: NO_BRAND, name: "No brand", figures: brandless })
  }

  return brandGroups
}

function BrandGroupedCatalog({
  figures,
  brands,
  spools,
  onEdit,
  onDelete,
  orderMode,
  orderSelection,
  onOrderQuantityChange,
}: {
  figures: Figure[]
  brands: Map<string, Brand>
  spools: Map<string, Spool>
  onEdit: (figure: Figure) => void
  onDelete: (figure: Figure) => void
  orderMode: boolean
  orderSelection: ReadonlyMap<string, number>
  onOrderQuantityChange: (figureId: string, quantity: number) => void
}) {
  // Deselected-id set: groups appearing later (inline create, import) are
  // visible by default. The whole component is key-reset on import.
  const [deselectedIds, setDeselectedIds] = useState<ReadonlySet<string>>(
    new Set()
  )

  const groups = groupFiguresByBrand(figures, brands)
  const visibleGroups = groups.filter((group) => !deselectedIds.has(group.id))
  const allDeselected = groups.length > 0 && visibleGroups.length === 0

  function toggleGroup(id: string) {
    setDeselectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div>
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by brand"
        data-testid="brand-filter"
      >
        {groups.map((group) => {
          const selected = !deselectedIds.has(group.id)
          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleGroup(group.id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                selected
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-foreground/50 bg-card text-muted-foreground dark:border-foreground/45"
              )}
              data-testid={`brand-filter-${group.id}`}
            >
              {/* Always rendered so toggling never reflows the wrapped row */}
              <Check
                className={cn(
                  "size-3.5 shrink-0",
                  selected ? "opacity-100" : "opacity-0"
                )}
                aria-hidden="true"
              />
              {group.name}
            </button>
          )
        })}
      </div>

      {allDeselected ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Shapes />
            </EmptyMedia>
            <EmptyTitle>All brands hidden</EmptyTitle>
            <EmptyDescription>
              Every brand is deselected. Show all brands to see your figures
              again.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setDeselectedIds(new Set())}>
              Show all
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="animate-fade-in-up space-y-8">
          {visibleGroups.map((group) => (
            <section key={group.id} data-testid="brand-section">
              <h2 className="mb-3 text-lg font-semibold">{group.name}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {group.figures.map((figure) => (
                  <FigureCard
                    key={figure.id}
                    figure={figure}
                    brands={brands}
                    spools={spools}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    orderMode={orderMode}
                    orderQuantity={orderSelection.get(figure.id) ?? 0}
                    onOrderQuantityChange={onOrderQuantityChange}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FigureCatalog() {
  const figures = usePrintFlowStore((s) => s.figures)
  const brands = usePrintFlowStore((s) => s.brands)
  const spools = usePrintFlowStore((s) => s.spools)
  const queueItems = usePrintFlowStore((s) => s.queueItems)
  const deleteFigure = usePrintFlowStore((s) => s.deleteFigure)
  const addBatchToQueue = usePrintFlowStore((s) => s.addBatchToQueue)
  const dataGeneration = usePrintFlowStore((s) => s.dataGeneration)
  const figureList = Array.from(figures.values())
  const isMobile = useIsMobile()

  // Order mode (CAP-5): per-figure quantities staged locally, committed as one
  // batch. Stock/order is chosen once for the whole batch, defaulting to order.
  const [orderMode, setOrderMode] = useState(false)
  const [orderSelection, setOrderSelection] = useState<
    ReadonlyMap<string, number>
  >(new Map())
  const [batchType, setBatchType] = useState<"stock" | "order">("order")

  // Closing leaves `modal` intact so the exit animation keeps its content.
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState<CatalogModal>({
    kind: "figure",
    figure: null,
  })
  // Bumped on every open so reopening before the exit animation finishes
  // remounts the content instead of reusing a stale draft.
  const [openSeq, setOpenSeq] = useState(0)
  const [deletingFigure, setDeletingFigure] = useState<Figure | null>(null)

  const affectedQueueItems = deletingFigure
    ? computeAffectedQueueItems(deletingFigure.id, queueItems)
    : []

  const title =
    modal.kind === "brands"
      ? "Manage brands"
      : modal.figure
        ? "Edit Figure"
        : "Add Figure"

  const emptyDescription =
    spools.size > 0
      ? `Great, you have ${spools.size} spool${spools.size === 1 ? "" : "s"}! Create your first figure to start building your catalog.`
      : "Add filament spools first, then create figures to assign colors."

  function openModal(next: CatalogModal) {
    setModal(next)
    setOpenSeq((seq) => seq + 1)
    setOpen(true)
  }

  function handleAddFigure() {
    openModal({ kind: "figure", figure: null })
  }

  function handleEditFigure(figure: Figure) {
    openModal({ kind: "figure", figure })
  }

  function handleManageBrands() {
    openModal({ kind: "brands" })
  }

  function handleDeleteFigure(figure: Figure) {
    setOpen(false)
    setDeletingFigure(figure)
  }

  function handleClose() {
    setOpen(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      handleClose()
    }
  }

  function handleConfirmDelete() {
    if (deletingFigure) {
      deleteFigure(deletingFigure.id)
      setDeletingFigure(null)
    }
  }

  // Staged figures can be deleted (or replaced by an import) after selection —
  // derive the effective selection during render so the summary and the
  // confirm payload never count phantom pieces.
  const effectiveSelection = new Map(
    [...orderSelection].filter(([figureId]) => figures.has(figureId))
  )
  const selectedFigureCount = effectiveSelection.size
  const selectedPieceCount = [...effectiveSelection.values()].reduce(
    (sum, qty) => sum + qty,
    0
  )

  function exitOrderMode() {
    // Cancel/exit clears selection and resets the batch type default.
    setOrderMode(false)
    setOrderSelection(new Map())
    setBatchType("order")
  }

  function handleToggleOrderMode() {
    if (orderMode) {
      exitOrderMode()
    } else {
      setOrderMode(true)
    }
  }

  function handleOrderQuantityChange(figureId: string, quantity: number) {
    setOrderSelection((prev) => {
      const next = new Map(prev)
      if (quantity <= 0) {
        next.delete(figureId)
      } else {
        next.set(figureId, Math.min(quantity, MAX_QUEUE_QUANTITY))
      }
      return next
    })
  }

  function handleConfirmOrder() {
    const entries = [...effectiveSelection.entries()].map(
      ([figureId, quantity]) => ({ figureId, quantity })
    )
    // Staged figures that no longer exist were filtered from the payload —
    // count them as skipped so the toast stays honest about the order.
    const staleSkippedCount = orderSelection.size - effectiveSelection.size
    const result = addBatchToQueue(entries, batchType)
    switch (result.type) {
      case "queued": {
        const skippedCount = result.skipped.length + staleSkippedCount
        const skippedLabel = `${skippedCount} figure${
          skippedCount === 1 ? "" : "s"
        } skipped`
        if (result.created === 0 && result.merged === 0) {
          toast.warning(`Nothing queued · ${skippedLabel}`)
          break
        }
        const parts = [
          `${result.pieces} piece${result.pieces === 1 ? "" : "s"} queued`,
        ]
        if (result.merged > 0) {
          parts.push(
            `${result.merged} merged into existing ${
              result.merged === 1 ? "entry" : "entries"
            }`
          )
        }
        if (skippedCount > 0) {
          parts.push(skippedLabel)
        }
        toast.success(parts.join(" · "))
        break
      }
      case "empty":
        break
      default: {
        const exhaustive: never = result
        return exhaustive
      }
    }
    exitOrderMode()
  }

  // key-reset (not an Effect) drops transient state on a data replace and on
  // every reopen of the shared modal shell
  const modalContent =
    modal.kind === "brands" ? (
      <BrandManager key={`${dataGeneration}-${openSeq}`} />
    ) : (
      <FigureForm
        key={`${modal.figure?.id ?? "create"}-${openSeq}`}
        figure={modal.figure ?? undefined}
        onSave={handleClose}
        onCancel={handleClose}
      />
    )

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Figure Catalog</h1>
        <div className="flex items-center gap-2">
          {figureList.length > 0 ? (
            <Button
              variant={orderMode ? "secondary" : "outline"}
              aria-pressed={orderMode}
              onClick={handleToggleOrderMode}
              data-testid="order-mode-toggle"
            >
              {orderMode ? "Exit order mode" : "Add order"}
            </Button>
          ) : null}
          <Button variant="outline" onClick={handleManageBrands}>
            Manage brands
          </Button>
          <Button onClick={handleAddFigure}>Add Figure</Button>
        </div>
      </div>

      {figureList.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Shapes />
            </EmptyMedia>
            <EmptyTitle>No Figures Yet</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={handleAddFigure}>Add Figure</Button>
          </EmptyContent>
        </Empty>
      ) : (
        // key-reset on full data replace so an import resets the filter
        <BrandGroupedCatalog
          key={dataGeneration}
          figures={figureList}
          brands={brands}
          spools={spools}
          onEdit={handleEditFigure}
          onDelete={handleDeleteFigure}
          orderMode={orderMode}
          orderSelection={effectiveSelection}
          onOrderQuantityChange={handleOrderQuantityChange}
        />
      )}

      {orderMode ? (
        <div
          className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-popover/95 p-3 shadow-lg supports-backdrop-filter:bg-popover/90 supports-backdrop-filter:backdrop-blur-xs"
          data-testid="order-summary-bar"
        >
          <span className="text-sm font-medium tabular-nums">
            {selectedFigureCount} figure{selectedFigureCount === 1 ? "" : "s"} ·{" "}
            {selectedPieceCount} piece{selectedPieceCount === 1 ? "" : "s"}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="Queue as"
            >
              <Button
                variant={batchType === "stock" ? "secondary" : "ghost"}
                aria-pressed={batchType === "stock"}
                onClick={() => setBatchType("stock")}
              >
                Stock
              </Button>
              <Button
                variant={batchType === "order" ? "secondary" : "ghost"}
                aria-pressed={batchType === "order"}
                onClick={() => setBatchType("order")}
              >
                Order
              </Button>
            </div>
            <Button variant="outline" onClick={exitOrderMode}>
              Cancel
            </Button>
            <Button
              disabled={selectedFigureCount === 0}
              onClick={handleConfirmOrder}
            >
              Confirm
            </Button>
          </div>
        </div>
      ) : null}

      {isMobile ? (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
            {modalContent}
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            {modalContent}
          </SheetContent>
        </Sheet>
      )}

      <AlertDialog
        open={deletingFigure !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeletingFigure(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Figure</AlertDialogTitle>
            <AlertDialogDescription>
              {affectedQueueItems.length === 0
                ? `"${deletingFigure?.name}" is not referenced by any queue items.`
                : `Deleting "${deletingFigure?.name}" will also remove ${affectedQueueItems.length} queue item(s).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
