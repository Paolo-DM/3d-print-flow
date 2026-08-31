import { useState } from "react"
import {
  Archive,
  ChevronDown,
  Copy,
  PackageCheck,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import {
  computeCompletionStatus,
  deriveOrderState,
  getOrderRows,
  sortOrders,
} from "~/lib/derived"
import { usePrintFlowStore } from "~/lib/store"
import type { Order, Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/ui/button"
import { ColorChip } from "~/components/ColorChip"
import { QuantityBadge } from "~/components/QuantityBadge"
import { OrderIdentity } from "~/components/OrderIdentity"
import { QueueItemCard } from "~/components/QueueItemCard"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"

function CompletedArchiveItem({
  queueItemId,
  figureName,
  brandName,
  requiredColors,
  quantity,
  completedAt,
  spools,
  onRequeue,
  onRemove,
}: {
  queueItemId: string
  figureName: string
  brandName: string | null
  requiredColors: string[]
  quantity: number
  completedAt: string | null
  spools: Map<string, Spool>
  onRequeue: (queueItemId: string) => void
  onRemove: (queueItemId: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card" data-testid="completed-item">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
            aria-label={`View details for ${figureName}`}
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-1.5 text-sm font-medium">
                {figureName}
                <QuantityBadge quantity={quantity} />
              </p>
              {brandName ? (
                <p className="text-xs text-muted-foreground">{brandName}</p>
              ) : null}
              {completedAt ? (
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  Completed{" "}
                  {new Date(completedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : null}
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 border-t px-4 pt-3 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {requiredColors.map((spoolId) => {
                const spool = spools.get(spoolId)
                if (!spool) return null
                return (
                  <ColorChip
                    key={`${queueItemId}-${spoolId}`}
                    spool={spool}
                    count={quantity}
                    quantity={quantity}
                  />
                )
              })}
            </div>
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRequeue(queueItemId)}
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Print Again
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${figureName}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete completed figure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove &ldquo;{figureName}&rdquo;
                      from your completed history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => onRemove(queueItemId)}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function ReadyOrder({ order }: { order: Order }) {
  const brands = usePrintFlowStore((state) => state.brands)
  const figures = usePrintFlowStore((state) => state.figures)
  const spools = usePrintFlowStore((state) => state.spools)
  const queueItems = usePrintFlowStore((state) => state.queueItems)
  const duplicateOrder = usePrintFlowStore((state) => state.duplicateOrder)
  const rows = getOrderRows(order.id, queueItems)

  function duplicate() {
    const result = duplicateOrder(order.id)
    if (result.type === "not-found") {
      toast.error("Couldn't duplicate — this order is no longer available.")
      return
    }
    toast.success(
      `${result.order.reference} created with ${result.lines} zero-progress line${result.lines === 1 ? "" : "s"}.`
    )
  }

  return (
    <article
      className="rounded-xl border bg-card p-4"
      data-testid="ready-order"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <OrderIdentity order={order} />
          <p className="mt-1 text-xs text-muted-foreground">
            Ready · {rows.length} line{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={duplicate}>
          <Copy /> Duplicate
        </Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <QueueItemCard
            key={row.id}
            queueItem={row}
            figure={figures.get(row.figureId)}
            brands={brands}
            spools={spools}
            mode="readOnly"
          />
        ))}
      </div>
    </article>
  )
}

export default function Completed() {
  const spools = usePrintFlowStore((s) => s.spools)
  const brands = usePrintFlowStore((s) => s.brands)
  const figures = usePrintFlowStore((s) => s.figures)
  const orders = usePrintFlowStore((s) => s.orders)
  const queueItems = usePrintFlowStore((s) => s.queueItems)
  const requeueCompleted = usePrintFlowStore((s) => s.requeueCompleted)
  const removeFromQueue = usePrintFlowStore((s) => s.removeFromQueue)

  const completedItems = Array.from(queueItems.values())
    .filter((qi) => {
      if (qi.orderId !== null) return false
      const figure = figures.get(qi.figureId)
      return figure ? computeCompletionStatus(qi, figure) : false
    })
    .toSorted((a, b) => {
      // Most recently completed first
      if (!a.completedAt || !b.completedAt) return 0
      return b.completedAt.localeCompare(a.completedAt)
    })
  const readyOrders = sortOrders(
    orders.values(),
    queueItems,
    figures,
    spools,
    "9999-12-31"
  ).filter(
    (order) =>
      deriveOrderState(order.id, queueItems, figures, spools) === "ready"
  )

  function handleRequeue(queueItemId: string) {
    const source = queueItems.get(queueItemId)
    const figureName = source
      ? (figures.get(source.figureId)?.name ?? "Figure")
      : "Figure"
    const result = requeueCompleted(queueItemId)
    switch (result.type) {
      case "requeued": {
        const qtyLabel = result.quantity > 1 ? ` ×${result.quantity}` : ""
        // merged: target ≥1 + completed source ≥1 ⇒ quantity ≥2, always ×N
        toast.success(
          result.merged
            ? `Merged into queue: ${figureName} now${qtyLabel}${
                result.clamped ? " (capped at 99)" : ""
              }`
            : `${figureName}${qtyLabel} back in queue`
        )
        return
      }
      case "not-found":
        toast.error("Couldn't requeue — this entry is no longer available.")
        return
      default: {
        const exhaustive: never = result
        return exhaustive
      }
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 text-2xl font-bold">Completed</h1>

      {completedItems.length === 0 && readyOrders.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Archive />
            </EmptyMedia>
            <EmptyTitle>No completed figures yet</EmptyTitle>
            <EmptyDescription>
              Figures will appear here once all their colors have been printed.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="animate-fade-in-up space-y-6">
          {readyOrders.length > 0 ? (
            <section aria-labelledby="ready-orders-heading">
              <h2
                id="ready-orders-heading"
                className="mb-3 flex items-center gap-2 text-lg font-semibold"
              >
                <PackageCheck className="size-5" /> Ready orders
              </h2>
              <div className="space-y-3">
                {readyOrders.map((order) => (
                  <ReadyOrder key={order.id} order={order} />
                ))}
              </div>
            </section>
          ) : null}
          {completedItems.length > 0 ? (
            <section aria-labelledby="completed-stock-heading">
              <h2
                id="completed-stock-heading"
                className="mb-3 text-lg font-semibold"
              >
                Completed stock
              </h2>
              <div className="space-y-3">
                {completedItems.map((qi) => {
                  const figure = figures.get(qi.figureId)
                  if (!figure) return null
                  return (
                    <CompletedArchiveItem
                      key={qi.id}
                      queueItemId={qi.id}
                      figureName={figure.name}
                      brandName={
                        figure.brandId !== null
                          ? (brands.get(figure.brandId)?.name ?? null)
                          : null
                      }
                      requiredColors={figure.requiredColors}
                      quantity={qi.quantity}
                      completedAt={qi.completedAt}
                      spools={spools}
                      onRequeue={handleRequeue}
                      onRemove={removeFromQueue}
                    />
                  )
                })}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
