import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { getPerceivedLightness } from "~/lib/color-utils"
import {
  computeFigureProgress,
  type ColorRankingEntry as ColorRankingEntryType,
} from "~/lib/derived"
import type { Figure, QueueItem, Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Badge } from "~/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import { Progress } from "~/components/ui/progress"
import { ColorChip } from "~/components/ColorChip"

interface ColorRankingEntryProps {
  entry: ColorRankingEntryType
  rank: number
  figures: Map<string, Figure>
  queueItems: Map<string, QueueItem>
  spools: Map<string, Spool>
  currentSpoolId: string
}

export function ColorRankingEntry({
  entry,
  rank,
  figures,
  queueItems,
  spools,
  currentSpoolId,
}: ColorRankingEntryProps) {
  const [open, setOpen] = useState(false)
  const lightness = getPerceivedLightness(entry.spool.hex)

  const matchingItems = Array.from(queueItems.values())
    .filter((qi) => {
      const figure = figures.get(qi.figureId)
      if (!figure) return false
      if (!figure.requiredColors.includes(currentSpoolId)) return false
      return !qi.completedColors.includes(currentSpoolId)
    })
    .toSorted((a, b) => {
      if (a.type === "order" && b.type !== "order") return -1
      if (a.type !== "order" && b.type === "order") return 1
      return 0
    })

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50"
          data-testid="color-ranking-entry"
        >
          <span className="w-6 text-center text-sm text-muted-foreground tabular-nums">
            {rank}
          </span>
          <span
            className={cn("size-8 shrink-0 rounded-md dark:[box-shadow:var(--swatch-glow)]", lightness > 0.85 && "border border-border", lightness < 0.15 && "dark:border dark:border-border")}
            style={
              {
                backgroundColor: entry.spool.hex,
                "--swatch-glow": `0 0 8px ${entry.spool.hex}40`,
              } as React.CSSProperties
            }
            data-testid="color-swatch"
          />
          <span className="min-w-0 flex-1">
            <span className="text-sm font-semibold">{entry.spool.name}</span>
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            figures
          </span>
          {entry.hasOrders ? (
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              Order
            </Badge>
          ) : null}
          <span className="min-w-[2ch] text-right text-2xl font-bold tabular-nums">
            {entry.count}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 pb-3 pl-9 pr-3 pt-1">
          {matchingItems.map((qi) => {
            const figure = figures.get(qi.figureId)
            if (!figure) return null
            const progress = computeFigureProgress(qi, figure)
            const percentage =
              progress.total > 0
                ? Math.round((progress.completed / progress.total) * 100)
                : 0
            return (
              <div key={qi.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{figure.name}</p>
                    {figure.franchise ? (
                      <p className="text-xs text-muted-foreground">
                        {figure.franchise}
                      </p>
                    ) : null}
                  </div>
                  {qi.type === "order" ? (
                    <Badge
                      variant="outline"
                      className="text-orange-600 dark:text-orange-400"
                    >
                      Order
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {figure.requiredColors.map((spoolId) => {
                    const spool = spools.get(spoolId)
                    if (!spool) return null
                    return (
                      <ColorChip
                        key={`${qi.id}-${spoolId}`}
                        spool={spool}
                        isCompleted={qi.completedColors.includes(spoolId)}
                        isCurrent={spoolId === currentSpoolId}
                      />
                    )
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={percentage} className="flex-1" />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
