import { useState } from "react"
import { Archive, ChevronDown, RotateCcw, Trash2 } from "lucide-react"

import { computeCompletionStatus } from "~/lib/derived"
import { usePrintFlowStore } from "~/lib/store"
import type { Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/ui/button"
import { ColorChip } from "~/components/ColorChip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"

function CompletedArchiveItem({
  queueItemId,
  figureName,
  franchise,
  requiredColors,
  completedAt,
  spools,
  onRequeue,
  onRemove,
}: {
  queueItemId: string
  figureName: string
  franchise: string | null | undefined
  requiredColors: string[]
  completedAt: string | null
  spools: Map<string, Spool>
  onRequeue: (queueItemId: string) => void
  onRemove: (queueItemId: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card" data-testid="completed-item">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
            aria-label={`View details for ${figureName}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{figureName}</p>
              {franchise ? (
                <p className="text-xs text-muted-foreground">{franchise}</p>
              ) : null}
              {completedAt ? (
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  Completed{" "}
                  {new Date(completedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : null}
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 border-t px-4 pt-3 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {requiredColors.map((spoolId) => {
                const spool = spools.get(spoolId)
                if (!spool) return null
                return (
                  <ColorChip
                    key={`${queueItemId}-${spoolId}`}
                    spool={spool}
                    isCompleted={true}
                  />
                )
              })}
            </div>
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRequeue(queueItemId)}
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Print Again
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Remove ${figureName}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove from queue?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove &ldquo;{figureName}&rdquo; from the print
                      queue.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => onRemove(queueItemId)}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export default function Completed() {
  const spools = usePrintFlowStore((s) => s.spools)
  const figures = usePrintFlowStore((s) => s.figures)
  const queueItems = usePrintFlowStore((s) => s.queueItems)
  const requeueCompleted = usePrintFlowStore((s) => s.requeueCompleted)
  const removeFromQueue = usePrintFlowStore((s) => s.removeFromQueue)

  const completedItems = Array.from(queueItems.values())
    .filter((qi) => {
      const figure = figures.get(qi.figureId)
      return figure ? computeCompletionStatus(qi, figure) : false
    })
    .toSorted((a, b) => {
      // Most recently completed first
      if (!a.completedAt || !b.completedAt) return 0
      return b.completedAt.localeCompare(a.completedAt)
    })

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 text-2xl font-bold">Completed</h1>

      {completedItems.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Archive />
            </EmptyMedia>
            <EmptyTitle>No completed figures yet</EmptyTitle>
            <EmptyDescription>
              Figures will appear here once all their colors have been printed.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="animate-fade-in-up space-y-3">
          {completedItems.map((qi) => {
            const figure = figures.get(qi.figureId)
            if (!figure) return null
            return (
              <CompletedArchiveItem
                key={qi.id}
                queueItemId={qi.id}
                figureName={figure.name}
                franchise={figure.franchise}
                requiredColors={figure.requiredColors}
                completedAt={qi.completedAt}
                spools={spools}
                onRequeue={requeueCompleted}
                onRemove={removeFromQueue}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
