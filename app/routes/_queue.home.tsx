import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { BookOpen, CheckCircle, Disc3, ListPlus } from "lucide-react"

import { usePrintFlowStore } from "~/lib/store"
import {
  computeColorRanking,
  computeCompletionStatus,
  type ColorRankingEntry as ColorRankingEntryType,
} from "~/lib/derived"
import { prefersReducedMotion } from "~/lib/motion"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { ColorRankingEntry } from "~/components/ColorRankingEntry"
import type { CompletionPhase } from "~/components/QueueItemCard"

interface CompletingEntrySnapshot {
  entry: ColorRankingEntryType
  rank: number
  queueItemId: string
  rowPhase?: CompletionPhase
  entryPhase?: CompletionPhase
}

export default function ColorView() {
  const [, setTick] = useState(0)
  const [openEntries, setOpenEntries] = useState(new Set<string>())
  const prevRankingRef = useRef(
    new Map<string, { entry: ColorRankingEntryType; rank: number }>()
  )
  const prevCompletionRef = useRef(new Map<string, boolean>())
  const completingEntriesRef = useRef(
    new Map<string, CompletingEntrySnapshot>()
  )

  const spools = usePrintFlowStore((s) => s.spools)
  const figures = usePrintFlowStore((s) => s.figures)
  const queueItems = usePrintFlowStore((s) => s.queueItems)
  const navigate = useNavigate()
  const reducedMotion = prefersReducedMotion()

  const ranking = computeColorRanking(spools, figures, queueItems)
  const currentRankingIds = new Set(ranking.map((e) => e.spool.id))

  // Detect if any figure just completed (drives entry-level animation)
  const completionMap = new Map<string, boolean>()
  let figureJustCompleted = false
  const justCompletedIds = new Set<string>()
  for (const [id, qi] of queueItems) {
    const figure = figures.get(qi.figureId)
    if (figure) {
      const isComplete = computeCompletionStatus(qi, figure)
      completionMap.set(id, isComplete)
      const wasComplete = prevCompletionRef.current.get(id)
      if (wasComplete === false && isComplete) {
        figureJustCompleted = true
        justCompletedIds.add(id)
      }
    }
  }

  // Only animate entry removal when caused by a figure completion
  if (!reducedMotion && figureJustCompleted) {
    for (const [spoolId, snapshot] of prevRankingRef.current) {
      if (currentRankingIds.has(spoolId)) continue
      if (completingEntriesRef.current.has(spoolId)) continue
      if (!spools.has(spoolId)) continue

      const queueItemId = Array.from(justCompletedIds).find((id) => {
        const qi = queueItems.get(id)
        const figure = qi ? figures.get(qi.figureId) : null
        return figure?.requiredColors.includes(spoolId)
      })

      if (queueItemId) {
        completingEntriesRef.current.set(spoolId, {
          entry: snapshot.entry,
          rank: snapshot.rank,
          queueItemId,
          rowPhase: openEntries.has(spoolId) ? "pulsing" : undefined,
          entryPhase: openEntries.has(spoolId) ? undefined : "pulsing",
        })
      }
    }
  }

  for (const [spoolId, snapshot] of completingEntriesRef.current) {
    if (!spools.has(spoolId)) {
      completingEntriesRef.current.delete(spoolId)
      continue
    }

    if (
      !queueItems.has(snapshot.queueItemId) ||
      currentRankingIds.has(spoolId)
    ) {
      completingEntriesRef.current.delete(spoolId)
    }
  }

  useEffect(() => {
    prevRankingRef.current = new Map(
      ranking.map((entry, index) => [
        entry.spool.id,
        { entry, rank: index + 1 },
      ])
    )
    prevCompletionRef.current = completionMap
  })

  function setEntryOpen(spoolId: string, open: boolean) {
    setOpenEntries((prev) => {
      const next = new Set(prev)
      if (open) {
        next.add(spoolId)
      } else {
        next.delete(spoolId)
      }
      return next
    })
  }

  if (ranking.length === 0 && completingEntriesRef.current.size === 0) {
    if (spools.size === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Disc3 />
            </EmptyMedia>
            <EmptyTitle>No filament spools yet</EmptyTitle>
            <EmptyDescription>
              Add your filament spools first, then create figures and queue them
              for printing.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => navigate("/spools")}>
              Add Your First Spool
            </Button>
          </EmptyContent>
        </Empty>
      )
    }

    if (figures.size === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No figures in catalog</EmptyTitle>
            <EmptyDescription>
              Create figure designs and assign colors from your spool library.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => navigate("/catalog")}>
              Create Your First Figure
            </Button>
          </EmptyContent>
        </Empty>
      )
    }

    if (queueItems.size === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListPlus />
            </EmptyMedia>
            <EmptyTitle>Print queue is empty</EmptyTitle>
            <EmptyDescription>
              Add figures from your catalog to start tracking production.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => navigate("/catalog")}>Go to Catalog</Button>
          </EmptyContent>
        </Empty>
      )
    }

    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle />
          </EmptyMedia>
          <EmptyTitle>All colors complete!</EmptyTitle>
          <EmptyDescription>
            Every queued figure has all colors printed. Add more figures or
            check the completed section.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-1">
      {ranking.map((entry, index) => (
        <ColorRankingEntry
          key={entry.spool.id}
          entry={entry}
          rank={index + 1}
          figures={figures}
          queueItems={queueItems}
          spools={spools}
          currentSpoolId={entry.spool.id}
          open={openEntries.has(entry.spool.id)}
          onOpenChange={(open) => setEntryOpen(entry.spool.id, open)}
        />
      ))}
      {Array.from(completingEntriesRef.current).map(([spoolId, snapshot]) => {
        if (currentRankingIds.has(spoolId)) return null
        return (
          <div
            key={spoolId}
            className={cn(
              "rounded-lg",
              snapshot.entryPhase === "pulsing" && "animate-completion-pulse",
              snapshot.entryPhase === "collapsing" &&
                "animate-completion-collapse overflow-hidden"
            )}
            onAnimationEnd={(e) => {
              if (e.target !== e.currentTarget || !snapshot.entryPhase) return

              if (snapshot.entryPhase === "pulsing") {
                completingEntriesRef.current.set(spoolId, {
                  ...snapshot,
                  entryPhase: "collapsing",
                })
              } else {
                completingEntriesRef.current.delete(spoolId)
              }
              setTick((n) => n + 1)
            }}
          >
            <ColorRankingEntry
              entry={snapshot.entry}
              rank={snapshot.rank}
              figures={figures}
              queueItems={queueItems}
              spools={spools}
              currentSpoolId={spoolId}
              open={openEntries.has(spoolId)}
              onOpenChange={(open) => setEntryOpen(spoolId, open)}
              externalCompletionPhases={
                snapshot.rowPhase
                  ? new Map([[snapshot.queueItemId, snapshot.rowPhase]])
                  : undefined
              }
              onExternalCompletionPhaseEnd={(queueItemId, phase) => {
                const current = completingEntriesRef.current.get(spoolId)
                if (!current || current.queueItemId !== queueItemId) return

                completingEntriesRef.current.set(spoolId, {
                  ...current,
                  rowPhase: phase === "pulsing" ? "collapsing" : undefined,
                  entryPhase:
                    phase === "collapsing" ? "pulsing" : current.entryPhase,
                })
                setTick((n) => n + 1)
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
