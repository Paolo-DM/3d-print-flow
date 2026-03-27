import { useState } from "react"
import { Disc3 } from "lucide-react"

import type { Spool } from "~/lib/types"
import { usePrintFlowStore } from "~/lib/store"
import { useIsMobile } from "~/hooks/use-mobile"
import { SpoolCard } from "~/components/SpoolCard"
import { SpoolForm } from "~/components/SpoolForm"
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

export default function SpoolLibrary() {
  const spools = usePrintFlowStore((s) => s.spools)
  const spoolList = Array.from(spools.values())
  const isMobile = useIsMobile()

  const [open, setOpen] = useState(false)
  const [editingSpool, setEditingSpool] = useState<Spool | null>(null)

  const title = editingSpool ? "Edit Spool" : "Add Spool"

  function handleAddSpool() {
    setEditingSpool(null)
    setOpen(true)
  }

  function handleEditSpool(spool: Spool) {
    setEditingSpool(spool)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setEditingSpool(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      handleClose()
    }
  }

  const formContent = (
    <SpoolForm
      key={editingSpool?.id ?? "create"}
      spool={editingSpool ?? undefined}
      onSave={handleClose}
      onCancel={handleClose}
    />
  )

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Spool Library</h1>
        <Button onClick={handleAddSpool}>Add Spool</Button>
      </div>

      {spoolList.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Disc3 />
            </EmptyMedia>
            <EmptyTitle>No Spools Yet</EmptyTitle>
            <EmptyDescription>
              Add your filament spools to start building your color library.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={handleAddSpool}>Add Your First Spool</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {spoolList.map((spool) => (
            <SpoolCard key={spool.id} spool={spool} onEdit={handleEditSpool} />
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
