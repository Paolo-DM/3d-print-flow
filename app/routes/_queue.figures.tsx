import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { BookOpen, CheckCircle, Disc3, ListPlus } from "lucide-react"

import { usePrintFlowStore } from "~/lib/store"
import {
  computeCompletionStatus,
  isFinishedOrderLine,
  parseQueueScope,
  queueItemMatchesScope,
  queueScopeKey,
  sortFinishedLines,
} from "~/lib/derived"
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
  const orders = usePrintFlowStore((state) => state.orders)
  const [searchParams] = useSearchParams()
  const parsedScope = parseQueueScope(searchParams.get("scope"))
  const scope =
    parsedScope.kind === "order" && !orders.has(parsedScope.orderId)
      ? ({ kind: "all" } as const)
      : parsedScope

  return <ScopedFigureView key={queueScopeKey(scope)} scope={scope} />
}

function ScopedFigureView({
  scope,
}: {
  scope: ReturnType<typeof parseQueueScope>
}) {
  const [, setTick] = useState(0)
  const prevCompletionRef = useRef(new Map<string, boolean>())
  const completingRef = useRef(new Map<string, CompletionPhase>())

  const spools = usePrintFlowStore((s) => s.spools)
  const brands = usePrintFlowStore((s) => s.brands)
  const figures = usePrintFlowStore((s) => s.figures)
  const allQueueItems = usePrintFlowStore((s) => s.queueItems)
  const navigate = useNavigate()
  const reducedMotion = prefersReducedMotion()

  const queueItems = new Map(
    Array.from(allQueueItems).filter(([, row]) =>
      queueItemMatchesScope(row, scope)
    )
  )

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

  if (allQueueItems.size === 0) {
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

  if (queueItems.size === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle />
          </EmptyMedia>
          <EmptyTitle>No figures in this scope</EmptyTitle>
          <EmptyDescription>
            Choose another queue scope to see its queued figures.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  // Include incomplete items + items in the completion animation
  const remainingItems = Array.from(queueItems.values())
    .filter((qi) => {
      const figure = figures.get(qi.figureId)
      if (!figure) return true
      return (
        !computeCompletionStatus(qi, figure) || completingRef.current.has(qi.id)
      )
    })
    .toSorted((a, b) => {
      if (a.orderId !== null && b.orderId === null) return -1
      if (a.orderId === null && b.orderId !== null) return 1
      return a.id.localeCompare(b.id)
    })

  // Finished Order Lines stay as correctable progress evidence, relocating
  // here only once their completion animation has finished (never twice).
  const finishedItems = sortFinishedLines(
    Array.from(queueItems.values()).filter(
      (qi) =>
        isFinishedOrderLine(qi, allQueueItems, figures, spools) &&
        !completingRef.current.has(qi.id)
    )
  )

  if (remainingItems.length === 0 && finishedItems.length === 0) {
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

  const remainingGrid = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {remainingItems.map((qi) => {
        const figure = figures.get(qi.figureId)
        const phase = completingRef.current.get(qi.id)
        return (
          <QueueItemCard
            key={qi.id}
            queueItem={qi}
            figure={figure}
            brands={brands}
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

  if (finishedItems.length === 0) {
    return <div className="animate-fade-in-up">{remainingGrid}</div>
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {remainingItems.length > 0 ? (
        <section aria-labelledby="remaining-lines-heading">
          <h2
            id="remaining-lines-heading"
            className="mb-3 text-lg font-semibold"
          >
            Remaining
          </h2>
          {remainingGrid}
        </section>
      ) : null}
      <section aria-labelledby="finished-lines-heading">
        <h2 id="finished-lines-heading" className="mb-3 text-lg font-semibold">
          Finished
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {finishedItems.map((qi) => (
            <QueueItemCard
              key={qi.id}
              queueItem={qi}
              figure={figures.get(qi.figureId)}
              brands={brands}
              spools={spools}
              mode="finished"
            />
          ))}
        </div>
      </section>
    </div>
  )
}
