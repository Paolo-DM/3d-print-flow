import { Pencil } from "lucide-react"

import { getPerceivedLightness } from "~/lib/color-utils"
import type { Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"

interface SpoolCardProps {
  spool: Spool
  onEdit: (spool: Spool) => void
}

export function SpoolCard({ spool, onEdit }: SpoolCardProps) {
  const lightness = getPerceivedLightness(spool.hex)

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            "size-12 shrink-0 rounded-md",
            lightness > 0.85 && "border border-border",
            lightness < 0.15 && "dark:border dark:border-border"
          )}
          style={{ backgroundColor: spool.hex }}
          data-testid="spool-swatch"
        />
        <span className="flex-1 text-sm font-medium text-foreground">
          {spool.name}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(spool)}
          aria-label={`Edit ${spool.name}`}
        >
          <Pencil />
        </Button>
      </CardContent>
    </Card>
  )
}
