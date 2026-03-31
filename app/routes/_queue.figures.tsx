import { useNavigate } from "react-router"
import { BookOpen, CheckCircle, Disc3, ListPlus } from "lucide-react"

import { usePrintFlowStore } from "~/lib/store"
import { computeCompletionStatus } from "~/lib/derived"
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

export default function FigureView() {
  const spools = usePrintFlowStore((s) => s.spools)
  const figures = usePrintFlowStore((s) => s.figures)
  const queueItems = usePrintFlowStore((s) => s.queueItems)
  const navigate = useNavigate()

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

  const incompleteItems = Array.from(queueItems.values())
    .filter((qi) => {
      const figure = figures.get(qi.figureId)
      return figure ? !computeCompletionStatus(qi, figure) : false
    })
    .toSorted((a, b) => {
      if (a.type === "order" && b.type !== "order") return -1
      if (a.type !== "order" && b.type === "order") return 1
      return 0
    })

  if (incompleteItems.length === 0) {
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {incompleteItems.map((qi) => {
        const figure = figures.get(qi.figureId)
        if (!figure) return null
        return (
          <QueueItemCard
            key={qi.id}
            queueItem={qi}
            figure={figure}
            spools={spools}
          />
        )
      })}
    </div>
  )
}
