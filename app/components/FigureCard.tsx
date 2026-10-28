import { Minus, Pencil, Plus, Trash2 } from "lucide-react"

import { getPerceivedLightness } from "~/lib/color-utils"
import { MAX_QUEUE_QUANTITY } from "~/lib/store"
import type { Brand, Figure, Spool } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card"
import { Notes } from "~/components/Notes"

interface FigureCardProps {
  figure: Figure
  brands: Map<string, Brand>
  spools: Map<string, Spool>
  /** Highlights the card while it is staged for queueing. */
  selected?: boolean
  onEdit?: (figure: Figure) => void
  onDelete?: (figure: Figure) => void
  /** Footer slot, e.g. a {@link FigureQuantityControl}. */
  children?: React.ReactNode
}

export function FigureCard({
  figure,
  brands,
  spools,
  selected = false,
  onEdit,
  onDelete,
  children,
}: FigureCardProps) {
  const resolvedSpools = figure.requiredColors
    .map((id) => spools.get(id))
    .filter((s): s is Spool => s !== undefined)

  // Unresolvable brandId renders as brandless (Map.get → undefined)
  const brandName =
    figure.brandId !== null ? brands.get(figure.brandId)?.name : undefined

  return (
    <Card
      data-testid="figure-card"
      data-selected={selected || undefined}
      className={cn(
        "transition-shadow duration-200",
        selected && "ring-2 ring-primary"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-lg font-bold">{figure.name}</p>
            {brandName ? (
              <p className="truncate text-sm text-muted-foreground">
                {brandName}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">{figure.size}%</p>
          </div>
          <div className="flex shrink-0 gap-1">
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
      <CardContent className="flex flex-1 flex-col gap-3">
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
        <Notes notes={figure.notes} />
      </CardContent>
      {children ? (
        <CardFooter className="mt-auto px-4 py-3">{children}</CardFooter>
      ) : null}
    </Card>
  )
}

/**
 * Stages copies of a figure: an "Add" button at 0, a stepper above it.
 * − at 1 unstages the figure.
 */
export function FigureQuantityControl({
  figure,
  quantity,
  onQuantityChange,
}: {
  figure: Figure
  quantity: number
  onQuantityChange: (figureId: string, quantity: number) => void
}) {
  // Figures without required colors cannot be queued (the store rejects them).
  if (figure.requiredColors.length === 0) {
    return (
      <p className="flex min-h-11 items-center text-sm text-muted-foreground">
        Assign colors to queue this figure
      </p>
    )
  }

  if (quantity === 0) {
    return (
      <Button
        variant="outline"
        className="min-h-11 w-full"
        aria-label={`Add ${figure.name}`}
        onClick={() => onQuantityChange(figure.id, 1)}
      >
        <Plus />
        Add
      </Button>
    )
  }

  return (
    <div
      className="flex w-full items-center justify-between gap-2"
      role="group"
      aria-label={`Quantity for ${figure.name}`}
    >
      <span className="text-sm font-medium text-primary">Selected</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-11 rounded-full"
          aria-label={`Decrease quantity of ${figure.name}`}
          onClick={() => onQuantityChange(figure.id, quantity - 1)}
        >
          <Minus className="size-3.5" />
        </Button>
        <span
          className="min-w-[3ch] text-center text-sm font-medium tabular-nums"
          data-testid="figure-quantity-value"
        >
          ×{quantity}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-11 rounded-full"
          aria-label={`Increase quantity of ${figure.name}`}
          disabled={quantity >= MAX_QUEUE_QUANTITY}
          onClick={() => onQuantityChange(figure.id, quantity + 1)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
