import { useState } from "react"

import { importData } from "~/lib/export-import"
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

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File | null
}

export function ImportDialog({ open, onOpenChange, file }: ImportDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  function handleOpenChange(next: boolean, options?: { force?: boolean }) {
    if (!next && importing && !options?.force) {
      return
    }

    if (!next) {
      setError(null)
    }
    onOpenChange(next)
  }

  async function handleConfirm(e: React.MouseEvent) {
    e.preventDefault()
    if (!file) return

    setImporting(true)
    setError(null)
    try {
      await importData(file)
      handleOpenChange(false, { force: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => {
          if (importing) {
            e.preventDefault()
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Replace All Data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will replace ALL current data with the imported file. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {file && (
          <p className="text-sm text-muted-foreground">
            File: <span className="font-medium text-foreground">{file.name}</span>
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={importing}
          >
            Replace All Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
