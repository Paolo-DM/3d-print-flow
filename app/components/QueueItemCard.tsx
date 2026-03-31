import { Trash2 } from "lucide-react"

import { usePrintFlowStore } from "~/lib/store"
import { computeFigureProgress } from "~/lib/derived"
import type { Figure, QueueItem, Spool } from "~/lib/types"
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
import { ColorChip } from "~/components/ColorChip"

export type CompletionPhase = "pulsing" | "collapsing"

interface QueueItemCardProps {
  queueItem: QueueItem
  figure: Figure
  spools: Map<string, Spool>
  completionPhase?: CompletionPhase
  onCompletionPhaseEnd?: (phase: CompletionPhase) => void
}

export function QueueItemCard({
  queueItem,
  figure,
  spools,
  completionPhase,
  onCompletionPhaseEnd,
}: QueueItemCardProps) {
  const toggleChip = usePrintFlowStore((s) => s.toggleChip)
  const removeFromQueue = usePrintFlowStore((s) => s.removeFromQueue)
  const progress = computeFigureProgress(queueItem, figure)
  const missingSpoolCount = figure.requiredColors.filter(
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
          "animate-completion-collapse overflow-hidden",
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
          <p className="truncate text-sm font-medium">{figure.name}</p>
          {figure.franchise ? (
            <p className="truncate text-xs text-muted-foreground">{figure.franchise}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {queueItem.type === "order" ? (
            <Badge
              variant="outline"
              className="text-order"
            >
              Order
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Stock
            </Badge>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${figure.name}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from queue?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove &ldquo;{figure.name}&rdquo; from the print
                  queue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => removeFromQueue(queueItem.id)}
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {figure.requiredColors.map((spoolId) => {
          const spool = spools.get(spoolId)
          if (!spool) return null
          return (
            <ColorChip
              key={`${queueItem.id}-${spoolId}`}
              spool={spool}
              isCompleted={queueItem.completedColors.includes(spoolId)}
              onClick={() => toggleChip(queueItem.id, spoolId)}
            />
          )
        })}
      </div>
      {missingSpoolCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          Missing {missingSpoolCount} spool reference
          {missingSpoolCount === 1 ? "" : "s"} for this figure.
        </p>
      ) : null}
      <div className="mt-auto flex items-center gap-2">
        <Progress value={percentage} className="flex-1" />
        <span className="text-xs text-muted-foreground tabular-nums">
          {progress.completed}/{progress.total}
        </span>
      </div>
    </div>
  )
}
