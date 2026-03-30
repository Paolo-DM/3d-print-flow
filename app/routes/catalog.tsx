import { Shapes } from "lucide-react"

import { usePrintFlowStore } from "~/lib/store"
import { FigureCard } from "~/components/FigureCard"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"

export default function FigureCatalog() {
  const figures = usePrintFlowStore((s) => s.figures)
  const spools = usePrintFlowStore((s) => s.spools)
  const figureList = Array.from(figures.values())

  const emptyDescription =
    spools.size > 0
      ? `Great, you have ${spools.size} spool${spools.size === 1 ? "" : "s"}! Create your first figure to start building your catalog.`
      : "Add filament spools first, then create figures to assign colors."

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Figure Catalog</h1>
        <Button disabled>Add Figure</Button>
      </div>

      {figureList.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Shapes />
            </EmptyMedia>
            <EmptyTitle>No Figures Yet</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button disabled>Add Figure</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {figureList.map((figure) => (
            <FigureCard key={figure.id} figure={figure} spools={spools} />
          ))}
        </div>
      )}
    </div>
  )
}
