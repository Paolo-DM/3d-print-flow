import { Pencil, Trash2 } from "lucide-react"

import { getPerceivedLightness } from "~/lib/color-utils"
import type { Figure, Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader } from "~/components/ui/card"

interface FigureCardProps {
  figure: Figure
  spools: Map<string, Spool>
  onEdit?: (figure: Figure) => void
  onDelete?: (figure: Figure) => void
}

export function FigureCard({ figure, spools, onEdit, onDelete }: FigureCardProps) {
  const resolvedSpools = figure.requiredColors
    .map((id) => spools.get(id))
    .filter((s): s is Spool => s !== undefined)

  return (
    <Card data-testid="figure-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold">{figure.name}</p>
            {figure.franchise ? (
              <p className="text-sm text-muted-foreground">{figure.franchise}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">{figure.size}%</p>
          </div>
          {onEdit || onDelete ? (
            <div className="flex gap-1">
              {onEdit ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(figure)}
                  aria-label={`Edit ${figure.name}`}
                >
                  <Pencil />
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(figure)}
                  aria-label={`Delete ${figure.name}`}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {resolvedSpools.length === 0 ? (
          <p className="text-sm text-muted-foreground">No colors assigned</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {resolvedSpools.map((spool) => {
              const lightness = getPerceivedLightness(spool.hex)
              return (
                <div key={spool.id} className="flex items-center gap-1">
                  <div
                    className={cn(
                      "size-4 shrink-0 rounded-full",
                      lightness > 0.85 && "border border-border",
                      lightness < 0.15 && "dark:border dark:border-border"
                    )}
                    style={{ backgroundColor: spool.hex }}
                    data-testid="color-swatch"
                  />
                  <span className="text-sm">{spool.name}</span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
