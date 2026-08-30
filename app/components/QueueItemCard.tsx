import { Minus, Plus, Trash2 } from "lucide-react"

import { MAX_QUEUE_QUANTITY, usePrintFlowStore } from "~/lib/store"
import {
  computeCompletionStatus,
  computeFigureProgress,
  computeQueueItemIssue,
} from "~/lib/derived"
import type { Brand, Figure, QueueItem, Spool } from "~/lib/types"
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
import { Progress } from "~/components/ui/progress"
import { ColorChip } from "~/components/ColorChip"
import { QuantityBadge } from "~/components/QuantityBadge"
import { OrderIdentity } from "~/components/OrderIdentity"

export type CompletionPhase = "pulsing" | "collapsing"

interface QueueItemCardProps {
  queueItem: QueueItem
  figure: Figure | null | undefined
  brands: Map<string, Brand>
  spools: Map<string, Spool>
  completionPhase?: CompletionPhase
  onCompletionPhaseEnd?: (phase: CompletionPhase) => void
  readOnly?: boolean
}

function RemoveLineDialog({
  queueItemId,
  figureName,
  compact = false,
}: {
  queueItemId: string
  figureName: string
  compact?: boolean
}) {
  const removeFromQueue = usePrintFlowStore((state) => state.removeFromQueue)

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={compact ? "icon" : "sm"}
          aria-label={compact ? `Remove ${figureName}` : undefined}
        >
          {compact ? <Trash2 className="size-3.5" /> : "Remove line"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove from queue?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove &ldquo;{figureName}&rdquo; from the print queue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => removeFromQueue(queueItemId)}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function QueueItemCard({
  queueItem,
  figure,
  brands,
  spools,
  completionPhase,
  onCompletionPhaseEnd,
  readOnly = false,
}: QueueItemCardProps) {
  const toggleChip = usePrintFlowStore((s) => s.toggleChip)
  const setQuantity = usePrintFlowStore((s) => s.setQuantity)
  const orders = usePrintFlowStore((s) => s.orders)
  const order =
    queueItem.orderId === null ? undefined : orders.get(queueItem.orderId)
  const issue = computeQueueItemIssue(
    queueItem,
    figure ? new Map([[figure.id, figure]]) : new Map(),
    spools
  )
  const progress = computeFigureProgress(queueItem, figure)
  // During the completion pulse/collapse window the entry is complete by
  // derivation and setQuantity would answer not-active — freeze the stepper.
  const isComplete = computeCompletionStatus(queueItem, figure)
  const brandName =
    figure?.brandId !== null && figure?.brandId !== undefined
      ? brands.get(figure.brandId)?.name
      : undefined
  const missingSpoolCount = (figure?.requiredColors ?? []).filter(
    (spoolId) => !spools.has(spoolId)
  ).length
  const percentage =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3 shadow-sm transition-shadow duration-200 hover:shadow",
        completionPhase === "pulsing" && "animate-completion-pulse",
        completionPhase === "collapsing" &&
          "animate-completion-collapse overflow-hidden"
      )}
      data-testid="queue-item-card"
      onAnimationEnd={
        completionPhase
          ? () => onCompletionPhaseEnd?.(completionPhase)
          : undefined
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1.5">
            <p className="truncate text-sm font-medium">
              {figure?.name ?? "Missing figure"}
            </p>
            <QuantityBadge quantity={queueItem.quantity} />
          </div>
          {brandName ? (
            <p className="truncate text-xs text-muted-foreground">
              {brandName}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {order ? (
            <OrderIdentity order={order} compact />
          ) : (
            <span className="text-xs text-muted-foreground">Stock</span>
          )}
          {!readOnly ? (
            <RemoveLineDialog
              queueItemId={queueItem.id}
              figureName={figure?.name ?? "this line"}
              compact
            />
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(figure?.requiredColors ?? []).map((spoolId) => {
          const spool = spools.get(spoolId)
          if (!spool) return null
          return (
            <ColorChip
              key={`${queueItem.id}-${spoolId}`}
              spool={spool}
              count={queueItem.completedCounts[spoolId] ?? 0}
              quantity={queueItem.quantity}
              onClick={
                readOnly ? undefined : () => toggleChip(queueItem.id, spoolId)
              }
            />
          )
        })}
      </div>
      {issue ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm">
          <p className="font-medium text-destructive">Needs attention</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{issue.reason}</p>
          <div className="mt-2 flex gap-2">
            {issue.type !== "missing-figure" ? (
              <Button asChild variant="outline" size="sm">
                <a href={`/catalog?edit=${encodeURIComponent(issue.figureId)}`}>
                  Edit figure
                </a>
              </Button>
            ) : null}
            <RemoveLineDialog
              queueItemId={queueItem.id}
              figureName={figure?.name ?? "this line"}
            />
          </div>
        </div>
      ) : missingSpoolCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          Missing {missingSpoolCount} spool reference
          {missingSpoolCount === 1 ? "" : "s"}.
        </p>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2">
        {!readOnly ? (
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label={`Quantity for ${figure?.name ?? "missing figure"}`}
          >
            <Button
              variant="outline"
              size="icon"
              className="size-11 rounded-full"
              aria-label={`Decrease quantity of ${figure?.name ?? "missing figure"}`}
              disabled={isComplete}
              onClick={() => {
                // − at 1 does nothing: removal stays the trash + dialog flow.
                if (queueItem.quantity > 1) {
                  setQuantity(queueItem.id, queueItem.quantity - 1)
                }
              }}
            >
              <Minus className="size-3.5" />
            </Button>
            <span
              className="min-w-[3ch] text-center text-sm font-medium tabular-nums"
              data-testid="quantity-value"
            >
              ×{queueItem.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-11 rounded-full"
              aria-label={`Increase quantity of ${figure?.name ?? "missing figure"}`}
              disabled={queueItem.quantity >= MAX_QUEUE_QUANTITY || isComplete}
              onClick={() => setQuantity(queueItem.id, queueItem.quantity + 1)}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Completed line</span>
        )}
        <div className="flex flex-1 items-center gap-2">
          <Progress value={percentage} className="flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums">
            {progress.completed}/{progress.total}
          </span>
        </div>
      </div>
    </div>
  )
}
