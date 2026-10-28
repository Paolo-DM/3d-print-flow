import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Shapes } from "lucide-react"
import { toast } from "sonner"

import { MAX_QUEUE_QUANTITY, usePrintFlowStore } from "~/lib/store"
import {
  computeAffectedQueueItems,
  isOpenOrder,
  sortOrders,
} from "~/lib/derived"
import type { Figure, Order } from "~/lib/types"
import { pluralize } from "~/lib/utils"
import { useIsMobile } from "~/hooks/use-mobile"
import { useToday } from "~/hooks/use-today"
import { BrandGroupedCatalog } from "~/components/BrandGroupedCatalog"
import { BrandManager } from "~/components/BrandManager"
import { FigureCard, FigureQuantityControl } from "~/components/FigureCard"
import { FigureForm } from "~/components/FigureForm"
import { OrderForm } from "~/components/OrderForm"
import { QueueBatchBar } from "~/components/QueueBatchBar"
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
  DrawerDescription,
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet"

/**
 * The catalog owns exactly one modal shell, so the figure form and the brand
 * manager can never be open at the same time (CAP-7).
 */
type CatalogModal =
  | { kind: "figure"; figure: Figure | null }
  | { kind: "brands" }
  | { kind: "order" }

export default function FigureCatalog() {
  const [searchParams] = useSearchParams()

  return <FigureCatalogContent key={searchParams.get("edit") ?? ""} />
}

function FigureCatalogContent() {
  const figures = usePrintFlowStore((s) => s.figures)
  const brands = usePrintFlowStore((s) => s.brands)
  const spools = usePrintFlowStore((s) => s.spools)
  const queueItems = usePrintFlowStore((s) => s.queueItems)
  const orders = usePrintFlowStore((s) => s.orders)
  const deleteFigure = usePrintFlowStore((s) => s.deleteFigure)
  const addBatchToQueue = usePrintFlowStore((s) => s.addBatchToQueue)
  const dataGeneration = usePrintFlowStore((s) => s.dataGeneration)
  const figureList = Array.from(figures.values())
  const isMobile = useIsMobile()
  const today = useToday()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const isOpen = (orderId: string) =>
    isOpenOrder(orderId, orders, queueItems, figures, spools)

  // Staged copies per figure, queued together into one destination. A link
  // from Orders (`?order=<id>`) preselects that order as the destination.
  const [batch, setBatch] = useState<ReadonlyMap<string, number>>(new Map())
  const [destinationId, setDestinationId] = useState<string | null>(() => {
    const requested = searchParams.get("order")
    return requested && isOpen(requested) ? requested : null
  })
  // An order deleted or turned Ready since it was picked falls back to stock.
  const destination =
    destinationId !== null && isOpen(destinationId)
      ? (orders.get(destinationId) ?? null)
      : null
  const openOrders = sortOrders(
    Array.from(orders.values()).filter((order) => isOpen(order.id)),
    queueItems,
    figures,
    spools,
    today
  )

  const requestedEdit = searchParams.get("edit")
  const initialEditFigure = requestedEdit
    ? (figures.get(requestedEdit) ?? null)
    : null

  // Closing leaves `modal` intact so the exit animation keeps its content.
  const [open, setOpen] = useState(initialEditFigure !== null)
  const [modal, setModal] = useState<CatalogModal>(() => ({
    kind: "figure",
    figure: initialEditFigure,
  }))
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
      : modal.kind === "order"
        ? "New order"
        : modal.figure
          ? "Edit Figure"
          : "Add Figure"
  const modalDescription =
    modal.kind === "brands"
      ? "Create, rename, or remove the brands used to group figures."
      : modal.kind === "order"
        ? "Enter the order details. Figures you add next are queued for this order."
        : modal.figure
          ? "Update this figure and its required filament colors."
          : "Create a figure and assign its required filament colors."

  const emptyDescription =
    spools.size > 0
      ? `Great, you have ${pluralize(spools.size, "spool")}! Create your first figure to start building your catalog.`
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

  function handleNewOrder() {
    openModal({ kind: "order" })
  }

  function handleDeleteFigure(figure: Figure) {
    handleClose()
    setDeletingFigure(figure)
  }

  function handleClose() {
    setOpen(false)
    if (searchParams.has("edit")) {
      const next = new URLSearchParams(searchParams)
      next.delete("edit")
      setSearchParams(next, { replace: true })
    }
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
  // derive the effective batch during render so the summary and the confirm
  // payload never count phantom pieces.
  const effectiveBatch = new Map(
    [...batch].filter(([figureId]) => figures.has(figureId))
  )
  const batchFigureCount = effectiveBatch.size
  const batchPieceCount = [...effectiveBatch.values()].reduce(
    (sum, qty) => sum + qty,
    0
  )
  const showBatchBar = batchFigureCount > 0 || destination !== null

  function changeDestination(orderId: string | null) {
    setDestinationId(orderId)
    // The deep link only seeds the first destination; drop it once it no
    // longer describes the page.
    if (searchParams.has("order")) {
      const next = new URLSearchParams(searchParams)
      next.delete("order")
      setSearchParams(next, { replace: true })
    }
  }

  function resetBatch() {
    setBatch(new Map())
    changeDestination(null)
  }

  function handleQuantityChange(figureId: string, quantity: number) {
    setBatch((prev) => {
      const next = new Map(prev)
      if (quantity <= 0) {
        next.delete(figureId)
      } else {
        next.set(figureId, Math.min(quantity, MAX_QUEUE_QUANTITY))
      }
      return next
    })
  }

  function handleConfirmBatch() {
    const entries = [...effectiveBatch.entries()].map(
      ([figureId, quantity]) => ({ figureId, quantity })
    )
    // Staged figures that no longer exist were filtered from the payload —
    // count them as skipped so the toast stays honest about the batch.
    const staleSkippedCount = batch.size - effectiveBatch.size
    const orderId = destination?.id ?? null
    const result = addBatchToQueue(entries, orderId)
    switch (result.type) {
      case "queued": {
        const skippedCount = result.skipped.length + staleSkippedCount
        const skippedLabel = `${pluralize(skippedCount, "figure")} skipped`
        if (result.created === 0 && result.merged === 0) {
          toast.warning(`Nothing queued · ${skippedLabel}`)
          break
        }
        const parts = [
          `${pluralize(result.pieces, "piece")} queued ${
            destination ? `for ${destination.reference}` : "as stock"
          }`,
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
        const scope = orderId === null ? "stock" : `order:${orderId}`
        toast.success(parts.join(" · "), {
          action: {
            label: "View",
            onClick: () =>
              navigate(`/figures?scope=${encodeURIComponent(scope)}`),
          },
        })
        break
      }
      case "empty":
        break
      default: {
        const exhaustive: never = result
        return exhaustive
      }
    }
    resetBatch()
  }

  // key-reset (not an Effect) drops transient state on a data replace and on
  // every reopen of the shared modal shell
  const modalContent =
    modal.kind === "brands" ? (
      <BrandManager key={`${dataGeneration}-${openSeq}`} />
    ) : modal.kind === "order" ? (
      <OrderForm
        key={`order-${openSeq}`}
        onSaved={(order: Order) => {
          changeDestination(order.id)
          setOpen(false)
        }}
        onCancel={handleClose}
      />
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleManageBrands}>
            Manage brands
          </Button>
          {figureList.length > 0 ? (
            <Button variant="outline" onClick={handleNewOrder}>
              New order
            </Button>
          ) : null}
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
          renderFigure={(figure) => {
            const quantity = effectiveBatch.get(figure.id) ?? 0
            return (
              <FigureCard
                key={figure.id}
                figure={figure}
                brands={brands}
                spools={spools}
                selected={quantity > 0}
                onEdit={handleEditFigure}
                onDelete={handleDeleteFigure}
              >
                <FigureQuantityControl
                  figure={figure}
                  quantity={quantity}
                  onQuantityChange={handleQuantityChange}
                />
              </FigureCard>
            )
          }}
        />
      )}

      {showBatchBar ? (
        <QueueBatchBar
          figureCount={batchFigureCount}
          pieceCount={batchPieceCount}
          destination={destination}
          openOrders={openOrders}
          onDestinationChange={changeDestination}
          onNewOrder={handleNewOrder}
          onClear={resetBatch}
          onConfirm={handleConfirmBatch}
        />
      ) : null}

      {isMobile ? (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription className="sr-only">
                {modalDescription}
              </DrawerDescription>
            </DrawerHeader>
            {/* Flex column so each form owns its scroll area and keeps its
                actions pinned to the bottom */}
            <div className="flex min-h-0 flex-1 flex-col">{modalContent}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription className="sr-only">
                {modalDescription}
              </SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col">{modalContent}</div>
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
