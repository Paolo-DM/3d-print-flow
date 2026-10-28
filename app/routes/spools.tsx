import { useState } from "react"
import { Disc3 } from "lucide-react"

import type { Spool } from "~/lib/types"
import { getReferencingFigures } from "~/lib/derived"
import { usePrintFlowStore } from "~/lib/store"
import { useIsMobile } from "~/hooks/use-mobile"
import { SpoolCard } from "~/components/SpoolCard"
import { SpoolForm } from "~/components/SpoolForm"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/ui/button"
import { NativeSelect } from "~/components/ui/native-select"
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
  const figures = usePrintFlowStore((s) => s.figures)
  const deleteSpool = usePrintFlowStore((s) => s.deleteSpool)
  const spoolList = Array.from(spools.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true })
  )
  const isMobile = useIsMobile()

  const [open, setOpen] = useState(false)
  const [editingSpool, setEditingSpool] = useState<Spool | null>(null)
  const [deletingSpool, setDeletingSpool] = useState<Spool | null>(null)
  const [replacementId, setReplacementId] = useState("")

  const title = editingSpool ? "Edit Spool" : "Add Spool"

  const referencingFigures = deletingSpool
    ? getReferencingFigures(deletingSpool.id, figures)
    : []
  const replacementOptions = spoolList.filter(
    (spool) => spool.id !== deletingSpool?.id
  )
  const canReplace =
    referencingFigures.length > 0 && replacementOptions.length > 0

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

  function handleDeleteSpool(spool: Spool) {
    setDeletingSpool(spool)
    setReplacementId("")
  }

  function handleConfirmDelete() {
    if (deletingSpool) {
      deleteSpool(deletingSpool.id, replacementId || undefined)
      setDeletingSpool(null)
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
        <h1 className="text-2xl font-bold">Spool Library</h1>
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
        <div className="grid animate-fade-in-up grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {spoolList.map((spool) => (
            <SpoolCard
              key={spool.id}
              spool={spool}
              onEdit={handleEditSpool}
              onDelete={handleDeleteSpool}
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

      <AlertDialog
        open={deletingSpool !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeletingSpool(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {canReplace
                ? "Replace Spool"
                : referencingFigures.length > 0
                  ? "Cannot Delete"
                  : "Delete Spool"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {referencingFigures.length > 0
                ? `"${deletingSpool?.name}" is used by the following figures:`
                : `Delete "${deletingSpool?.name}"? No figures use this spool.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {referencingFigures.length > 0 ? (
            <ul className="list-disc pl-6 text-sm text-foreground">
              {referencingFigures.map((figure) => (
                <li key={figure.id}>{figure.name}</li>
              ))}
            </ul>
          ) : null}
          {canReplace ? (
            <label className="grid gap-1.5 text-sm font-medium">
              Replace with
              <NativeSelect
                value={replacementId}
                onChange={(event) => setReplacementId(event.target.value)}
              >
                <option value="" disabled>
                  Choose a spool…
                </option>
                {replacementOptions.map((spool) => (
                  <option key={spool.id} value={spool.id}>
                    {spool.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>
              {referencingFigures.length > 0 && !canReplace
                ? "Close"
                : "Cancel"}
            </AlertDialogCancel>
            {referencingFigures.length === 0 || canReplace ? (
              <AlertDialogAction
                variant="destructive"
                disabled={canReplace && replacementId === ""}
                onClick={handleConfirmDelete}
              >
                {canReplace ? "Replace & Delete" : "Delete"}
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
