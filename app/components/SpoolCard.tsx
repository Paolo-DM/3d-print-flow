import { Pencil, Trash2 } from "lucide-react"

import { getPerceivedLightness } from "~/lib/color-utils"
import type { Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"

interface SpoolCardProps {
  spool: Spool
  onEdit: (spool: Spool) => void
  onDelete: (spool: Spool) => void
}

export function SpoolCard({ spool, onEdit, onDelete }: SpoolCardProps) {
  const lightness = getPerceivedLightness(spool.hex)

  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            "size-12 shrink-0 rounded-lg dark:[box-shadow:var(--spool-glow)]",
            lightness > 0.85 && "border border-border",
            lightness < 0.15 && "dark:border dark:border-border"
          )}
          style={
            {
              backgroundColor: spool.hex,
              "--spool-glow": `0 0 10px ${spool.hex}30`,
            } as React.CSSProperties
          }
          data-testid="spool-swatch"
        />
        <span className="flex-1 text-sm font-semibold text-foreground">
          {spool.name}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(spool)}
            aria-label={`Edit ${spool.name}`}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
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
