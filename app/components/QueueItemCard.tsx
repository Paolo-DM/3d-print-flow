import { usePrintFlowStore } from "~/lib/store"
import { computeFigureProgress } from "~/lib/derived"
import type { Figure, QueueItem, Spool } from "~/lib/types"
import { Badge } from "~/components/ui/badge"
import { Progress } from "~/components/ui/progress"
import { ColorChip } from "~/components/ColorChip"

interface QueueItemCardProps {
  queueItem: QueueItem
  figure: Figure
  spools: Map<string, Spool>
}

export function QueueItemCard({
  queueItem,
  figure,
  spools,
}: QueueItemCardProps) {
  const toggleChip = usePrintFlowStore((s) => s.toggleChip)
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
      className="space-y-2 rounded-md border p-3"
      data-testid="queue-item-card"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{figure.name}</p>
          {figure.franchise ? (
            <p className="text-xs text-muted-foreground">{figure.franchise}</p>
          ) : null}
        </div>
        {queueItem.type === "order" ? (
          <Badge
            variant="outline"
            className="text-orange-600 dark:text-orange-400"
          >
            Order
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Stock
          </Badge>
        )}
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
      <div className="flex items-center gap-2">
        <Progress value={percentage} className="flex-1" />
        <span className="text-xs text-muted-foreground tabular-nums">
          {progress.completed}/{progress.total}
        </span>
      </div>
    </div>
  )
}
