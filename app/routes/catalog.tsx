import { useState } from "react"
import { Shapes } from "lucide-react"

import type { Figure } from "~/lib/types"
import { usePrintFlowStore } from "~/lib/store"
import { useIsMobile } from "~/hooks/use-mobile"
import { FigureCard } from "~/components/FigureCard"
import { FigureForm } from "~/components/FigureForm"
import { Button } from "~/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet"

export default function FigureCatalog() {
  const figures = usePrintFlowStore((s) => s.figures)
  const spools = usePrintFlowStore((s) => s.spools)
  const figureList = Array.from(figures.values())
  const isMobile = useIsMobile()

  const [open, setOpen] = useState(false)
  const [editingFigure, setEditingFigure] = useState<Figure | null>(null)

  const title = editingFigure ? "Edit Figure" : "Add Figure"

  const emptyDescription =
    spools.size > 0
      ? `Great, you have ${spools.size} spool${spools.size === 1 ? "" : "s"}! Create your first figure to start building your catalog.`
      : "Add filament spools first, then create figures to assign colors."

  function handleAddFigure() {
    setEditingFigure(null)
    setOpen(true)
  }

  function handleEditFigure(figure: Figure) {
    setEditingFigure(figure)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setEditingFigure(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      handleClose()
    }
  }

  const formContent = (
    <FigureForm
      key={editingFigure?.id ?? "create"}
      figure={editingFigure ?? undefined}
      onSave={handleClose}
      onCancel={handleClose}
    />
  )

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Figure Catalog</h1>
        <Button onClick={handleAddFigure}>Add Figure</Button>
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
            <Button onClick={handleAddFigure}>Add Figure</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {figureList.map((figure) => (
            <FigureCard
              key={figure.id}
              figure={figure}
              spools={spools}
              onEdit={handleEditFigure}
            />
          ))}
        </div>
      )}

      {isMobile ? (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
            {formContent}
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            {formContent}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
