import { Pencil, Trash2 } from "lucide-react"

import { getPerceivedLightness } from "~/lib/color-utils"
import type { Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { FinishBadge } from "~/components/FinishBadge"

interface SpoolCardProps {
  spool: Spool
  onEdit: (spool: Spool) => void
  onDelete: (spool: Spool) => void
}

export function SpoolCard({ spool, onEdit, onDelete }: SpoolCardProps) {
  const lightness = getPerceivedLightness(spool.hex)

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            "size-14 shrink-0 rounded-lg",
            lightness > 0.85 && "border border-border",
            lightness < 0.15 && "dark:border dark:border-border"
          )}
          style={{ backgroundColor: spool.hex }}
          aria-hidden="true"
          data-testid="spool-swatch"
        />
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {spool.name}
          </span>
          <FinishBadge finish={spool.finish} />
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(spool)}
            aria-label={`Edit ${spool.name}`}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(spool)}
            aria-label={`Delete ${spool.name}`}
          >
            <Trash2 />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
