import { getPerceivedLightness } from "~/lib/color-utils"
import type { Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Card, CardContent } from "~/components/ui/card"

interface SpoolCardProps {
  spool: Spool
}

export function SpoolCard({ spool }: SpoolCardProps) {
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
        <span className="text-sm font-medium text-foreground">
          {spool.name}
        </span>
      </CardContent>
    </Card>
  )
}
