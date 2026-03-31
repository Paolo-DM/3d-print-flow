import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { getPerceivedLightness } from "~/lib/color-utils"
import {
  computeCompletionStatus,
  computeFigureProgress,
  type ColorRankingEntry as ColorRankingEntryType,
} from "~/lib/derived"
import { usePrintFlowStore } from "~/lib/store"
import type { Figure, QueueItem, Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Badge } from "~/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import { Progress } from "~/components/ui/progress"
import { Separator } from "~/components/ui/separator"
import { ColorChip } from "~/components/ColorChip"
import type { CompletionPhase } from "~/components/QueueItemCard"

interface ColorRankingEntryProps {
  entry: ColorRankingEntryType
  rank: number
  figures: Map<string, Figure>
  queueItems: Map<string, QueueItem>
  spools: Map<string, Spool>
  currentSpoolId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  externalCompletionPhases?: ReadonlyMap<string, CompletionPhase>
  onExternalCompletionPhaseEnd?: (
    queueItemId: string,
    phase: CompletionPhase
  ) => void
}

export function ColorRankingEntry({
  entry,
  rank,
  figures,
  queueItems,
  spools,
  currentSpoolId,
  open: controlledOpen,
  onOpenChange,
  externalCompletionPhases,
  onExternalCompletionPhaseEnd,
}: ColorRankingEntryProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const [, setTick] = useState(0)
  const prevCompletionRef = useRef(new Map<string, boolean>())
  const completingRef = useRef(new Map<string, CompletionPhase>())
  const toggleChip = usePrintFlowStore((s) => s.toggleChip)
  const lightness = getPerceivedLightness(entry.spool.hex)
  const open = controlledOpen ?? localOpen
  const handleOpenChange = onOpenChange ?? setLocalOpen
  const completionPhases = externalCompletionPhases ?? completingRef.current

  // Track figure completion for cascade animation
  const completionMap = new Map<string, boolean>()
  for (const [id, qi] of queueItems) {
    const figure = figures.get(qi.figureId)
    if (figure && figure.requiredColors.includes(currentSpoolId)) {
      completionMap.set(id, computeCompletionStatus(qi, figure))
    }
  }

  if (!externalCompletionPhases) {
    for (const [id, isComplete] of completionMap) {
      const wasComplete = prevCompletionRef.current.get(id)
      if (
        wasComplete === false &&
        isComplete &&
        !completingRef.current.has(id)
      ) {
        completingRef.current.set(id, "pulsing")
      }
    }

    for (const id of completingRef.current.keys()) {
      if (!queueItems.has(id)) completingRef.current.delete(id)
    }
  }

  useEffect(() => {
    prevCompletionRef.current = completionMap
  })

  const matchingItems = Array.from(queueItems.values())
    .filter((qi) => {
      const figure = figures.get(qi.figureId)
      if (!figure) return false
      if (!figure.requiredColors.includes(currentSpoolId)) return false
      return (
        !qi.completedColors.includes(currentSpoolId) ||
        completionPhases.has(qi.id)
      )
    })
    .toSorted((a, b) => {
      if (a.type === "order" && b.type !== "order") return -1
      if (a.type !== "order" && b.type === "order") return 1
      return 0
    })

  const orderEndIndex = matchingItems.findIndex((qi) => qi.type !== "order")
  const hasOrderStockBoundary =
    orderEndIndex > 0 && orderEndIndex < matchingItems.length

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-200 hover:bg-muted/60"
          data-testid="color-ranking-entry"
        >
          <span className="w-6 text-center text-base font-bold text-muted-foreground tabular-nums">
            {rank}
          </span>
          <span
            className={cn(
              "size-8 shrink-0 rounded-md dark:[box-shadow:var(--swatch-glow)]",
              lightness > 0.85 && "border border-border",
              lightness < 0.15 && "dark:border dark:border-border"
            )}
            style={
              {
                backgroundColor: entry.spool.hex,
                "--swatch-glow": `0 0 8px ${entry.spool.hex}40`,
              } as React.CSSProperties
            }
            data-testid="color-swatch"
          />
          <span className="min-w-0 flex-1">
            <span className="text-base font-semibold">{entry.spool.name}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            figures
          </span>
          {entry.hasOrders ? (
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              Order
            </Badge>
          ) : null}
          <span className="min-w-[2ch] text-right text-3xl font-extrabold tabular-nums">
            {entry.count}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="animate-fade-in-up space-y-3 pt-1 pr-3 pb-3 pl-9">
          {matchingItems.map((qi, index) => {
            const figure = figures.get(qi.figureId)
            if (!figure) return null
            const progress = computeFigureProgress(qi, figure)
            const percentage =
              progress.total > 0
                ? Math.round((progress.completed / progress.total) * 100)
                : 0
            const phase = completionPhases.get(qi.id)
            return (
              <div key={qi.id}>
                {index === orderEndIndex && hasOrderStockBoundary && (
                  <Separator className="my-3" data-testid="order-stock-separator" />
                )}
                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-3 transition-colors duration-150 hover:border-primary/20",
                    phase === "pulsing" && "animate-completion-pulse",
                    phase === "collapsing" &&
                      "animate-completion-collapse overflow-hidden"
                  )}
                  onAnimationEnd={
                    phase
                      ? externalCompletionPhases
                        ? () => onExternalCompletionPhaseEnd?.(qi.id, phase)
                        : () => {
                            if (phase === "pulsing") {
                              completingRef.current.set(qi.id, "collapsing")
                            } else {
                              completingRef.current.delete(qi.id)
                            }
                            setTick((n) => n + 1)
                          }
                      : undefined
                  }
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{figure.name}</p>
                      {figure.franchise ? (
                        <p className="truncate text-xs text-muted-foreground">
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
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
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
                          key={`${qi.id}-${spoolId}`}
                          spool={spool}
                          isCompleted={qi.completedColors.includes(spoolId)}
                          isCurrent={spoolId === currentSpoolId}
                          onClick={() => toggleChip(qi.id, spoolId)}
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
              </div>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
