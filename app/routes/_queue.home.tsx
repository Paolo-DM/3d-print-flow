import { useNavigate } from "react-router"
import { BookOpen, CheckCircle, Disc3, ListPlus } from "lucide-react"

import { usePrintFlowStore } from "~/lib/store"
import { computeColorRanking } from "~/lib/derived"
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

export default function ColorView() {
  const spools = usePrintFlowStore((s) => s.spools)
  const figures = usePrintFlowStore((s) => s.figures)
  const queueItems = usePrintFlowStore((s) => s.queueItems)
  const navigate = useNavigate()

  const ranking = computeColorRanking(spools, figures, queueItems)

  if (ranking.length === 0) {
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
            Every queued figure has all colors printed. Add more figures or check
            the completed section.
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
        />
      ))}
    </div>
  )
}
