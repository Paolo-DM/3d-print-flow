import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import {
  computeCompletionStatus,
  computeOrderProgress,
  deriveOrderState,
  getOrderRows,
  isFinishedOrderLine,
  isOrderOverdue,
  sortFinishedLines,
} from "~/lib/derived"
import { usePrintFlowStore } from "~/lib/store"
import type { Order } from "~/lib/types"
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
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Progress } from "~/components/ui/progress"
import { OrderForm } from "~/components/OrderForm"
import { OrderIdentity } from "~/components/OrderIdentity"
import { QueueItemCard } from "~/components/QueueItemCard"

export function OrderCard({ order, today }: { order: Order; today: string }) {
  const [editing, setEditing] = useState(false)
  const spools = usePrintFlowStore((state) => state.spools)
  const brands = usePrintFlowStore((state) => state.brands)
  const figures = usePrintFlowStore((state) => state.figures)
  const queueItems = usePrintFlowStore((state) => state.queueItems)
  const deleteOrder = usePrintFlowStore((state) => state.deleteOrder)
  const rows = getOrderRows(order.id, queueItems)
  const remainingRows: typeof rows = []
  const completedRows: typeof rows = []
  for (const row of rows) {
    if (isFinishedOrderLine(row, queueItems, figures, spools)) {
      completedRows.push(row)
    } else {
      remainingRows.push(row)
    }
  }
  const finishedRows = sortFinishedLines(completedRows)
  const state = deriveOrderState(order.id, queueItems, figures, spools)
  const progress = computeOrderProgress(order.id, queueItems, figures)
  const percentage = progress.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0
  const overdue = isOrderOverdue(order, state, today)
  const stateLabel =
    state === "draft"
      ? "Draft"
      : state === "blocked"
        ? "Needs attention"
        : state === "ready"
          ? "Ready"
          : "Active"

  return (
    <article className="rounded-xl border bg-card p-4" data-testid="order-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <OrderIdentity order={order} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={state === "blocked" ? "destructive" : "outline"}>
              {stateLabel}
            </Badge>
            {overdue ? (
              <span className="text-xs font-medium text-destructive">
                Overdue
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing((value) => !value)}
          >
            <Pencil /> Edit
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/catalog?order=${order.id}`}>
              <Plus /> Add items
            </a>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${order.reference}`}
              >
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {order.reference}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {rows.length === 0
                    ? "This Draft has no linked queue lines."
                    : `This also removes ${rows.length} linked line${rows.length === 1 ? "" : "s"} from the queue. Completed history for other orders is unchanged.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => deleteOrder(order.id)}
                >
                  Delete order
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 rounded-lg border">
          <OrderForm
            order={order}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No items yet. Add figures when this order is ready for intake.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2">
            <Progress value={percentage} className="flex-1" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {progress.completed}/{progress.total}
            </span>
          </div>
          {remainingRows.length > 0 ? (
            <div
              className={cn(
                "mt-4 grid gap-3",
                remainingRows.length > 1 && "md:grid-cols-2"
              )}
            >
              {remainingRows.map((row) => (
                <QueueItemCard
                  key={row.id}
                  queueItem={row}
                  figure={figures.get(row.figureId)}
                  brands={brands}
                  spools={spools}
                  // A complete row that is not a Finished Order Line is blocked
                  // by its own issue; it stays locked as it was before.
                  mode={
                    computeCompletionStatus(row, figures.get(row.figureId))
                      ? "readOnly"
                      : "editable"
                  }
                />
              ))}
            </div>
          ) : null}
          {finishedRows.length > 0 ? (
            <section
              aria-label={`Finished lines for ${order.reference}`}
              className="mt-4"
            >
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Finished
              </h3>
              <div
                className={cn(
                  "grid gap-3",
                  finishedRows.length > 1 && "md:grid-cols-2"
                )}
              >
                {finishedRows.map((row) => (
                  <QueueItemCard
                    key={row.id}
                    queueItem={row}
                    figure={figures.get(row.figureId)}
                    brands={brands}
                    spools={spools}
                    mode="finished"
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </article>
  )
}
