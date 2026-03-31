import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { BookOpen, CheckCircle, Disc3, ListPlus } from "lucide-react"

import { usePrintFlowStore } from "~/lib/store"
import { computeCompletionStatus } from "~/lib/derived"
import { prefersReducedMotion } from "~/lib/motion"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { QueueItemCard } from "~/components/QueueItemCard"
import type { CompletionPhase } from "~/components/QueueItemCard"

export default function FigureView() {
  const [, setTick] = useState(0)
  const prevCompletionRef = useRef(new Map<string, boolean>())
  const completingRef = useRef(new Map<string, CompletionPhase>())

  const spools = usePrintFlowStore((s) => s.spools)
  const figures = usePrintFlowStore((s) => s.figures)
  const queueItems = usePrintFlowStore((s) => s.queueItems)
  const navigate = useNavigate()
  const reducedMotion = prefersReducedMotion()

  // Build current completion map (pure derivation during render)
  const completionMap = new Map<string, boolean>()
  for (const [id, qi] of queueItems) {
    const figure = figures.get(qi.figureId)
    if (figure) {
      completionMap.set(id, computeCompletionStatus(qi, figure))
    }
  }

  // Detect newly completed items by comparing with previous render
  for (const [id, isComplete] of completionMap) {
    const wasComplete = prevCompletionRef.current.get(id)
    if (
      !reducedMotion &&
      wasComplete === false &&
      isComplete &&
      !completingRef.current.has(id)
    ) {
      completingRef.current.set(id, "pulsing")
    }
  }

  // Clean up completing items that no longer exist in the store
  for (const id of completingRef.current.keys()) {
    if (!queueItems.has(id)) {
      completingRef.current.delete(id)
    }
  }

  // Update previous completion state after each render
  useEffect(() => {
    prevCompletionRef.current = completionMap
  })

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

  // Include incomplete items + items in the completion animation
  const visibleItems = Array.from(queueItems.values())
    .filter((qi) => {
      const figure = figures.get(qi.figureId)
      if (!figure) return false
      return (
        !computeCompletionStatus(qi, figure) || completingRef.current.has(qi.id)
      )
    })
    .toSorted((a, b) => {
      if (a.type === "order" && b.type !== "order") return -1
      if (a.type !== "order" && b.type === "order") return 1
      return 0
    })

  if (visibleItems.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle />
          </EmptyMedia>
          <EmptyTitle>All figures complete!</EmptyTitle>
          <EmptyDescription>
            Every queued figure has all colors printed. Add more figures or
            check the completed section.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="animate-fade-in-up grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {visibleItems.map((qi) => {
        const figure = figures.get(qi.figureId)
        if (!figure) return null
        const phase = completingRef.current.get(qi.id)
        return (
          <QueueItemCard
            key={qi.id}
            queueItem={qi}
            figure={figure}
            spools={spools}
            completionPhase={phase}
            onCompletionPhaseEnd={(completedPhase) => {
              if (completedPhase === "pulsing") {
                completingRef.current.set(qi.id, "collapsing")
              } else {
                completingRef.current.delete(qi.id)
              }
              setTick((n) => n + 1)
            }}
          />
        )
      })}
    </div>
  )
}
