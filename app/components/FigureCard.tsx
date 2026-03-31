import { useEffect, useRef, useState } from "react"
import { ListPlus, Pencil, Trash2 } from "lucide-react"

import { getPerceivedLightness } from "~/lib/color-utils"
import { store } from "~/lib/store"
import type { Figure, Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader } from "~/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"

interface FigureCardProps {
  figure: Figure
  spools: Map<string, Spool>
  onEdit?: (figure: Figure) => void
  onDelete?: (figure: Figure) => void
}

export function FigureCard({ figure, spools, onEdit, onDelete }: FigureCardProps) {
  const [added, setAdded] = useState(false)
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current)
  }, [])

  const resolvedSpools = figure.requiredColors
    .map((id) => spools.get(id))
    .filter((s): s is Spool => s !== undefined)

  function handleAddToQueue(type: "stock" | "order") {
    store.getState().addToQueue(figure.id, type)
    setAdded(true)
    if (addedTimer.current) clearTimeout(addedTimer.current)
    addedTimer.current = setTimeout(() => setAdded(false), 1500)
  }

  return (
    <Card data-testid="figure-card" className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="truncate text-lg font-bold">{figure.name}</p>
            {figure.franchise ? (
              <p className="truncate text-sm text-muted-foreground">{figure.franchise}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">{figure.size}%</p>
          </div>
          <div className="flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={figure.requiredColors.length === 0}
                  aria-label={`Add ${figure.name} to queue`}
                >
                  {added ? (
                    <span className="text-xs font-medium">Added!</span>
                  ) : (
                    <ListPlus />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAddToQueue("stock")}>
                  Stock
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddToQueue("order")}>
                  Order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {onEdit ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(figure)}
                aria-label={`Edit ${figure.name}`}
              >
                <Pencil />
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(figure)}
                aria-label={`Delete ${figure.name}`}
              >
                <Trash2 />
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {resolvedSpools.length === 0 ? (
          <p className="text-sm text-muted-foreground">No colors assigned</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
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
                    aria-hidden="true"
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
