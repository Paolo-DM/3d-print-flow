import { useEffect, useRef, useState } from "react"
import { ListPlus, Minus, Pencil, Plus, Trash2 } from "lucide-react"

import { getPerceivedLightness } from "~/lib/color-utils"
import { MAX_QUEUE_QUANTITY, store } from "~/lib/store"
import type { Brand, Figure, Spool } from "~/lib/types"
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
  brands: Map<string, Brand>
  spools: Map<string, Spool>
  onEdit?: (figure: Figure) => void
  onDelete?: (figure: Figure) => void
  /** Catalog order mode (CAP-5): quantity controls replace the action cluster. */
  orderMode?: boolean
  /** Selected copies in the pending order; 0 = not selected. */
  orderQuantity?: number
  onOrderQuantityChange?: (figureId: string, quantity: number) => void
}

export function FigureCard({
  figure,
  brands,
  spools,
  onEdit,
  onDelete,
  orderMode = false,
  orderQuantity = 0,
  onOrderQuantityChange,
}: FigureCardProps) {
  const [added, setAdded] = useState(false)
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (addedTimer.current) clearTimeout(addedTimer.current)
    },
    []
  )

  const resolvedSpools = figure.requiredColors
    .map((id) => spools.get(id))
    .filter((s): s is Spool => s !== undefined)

  // Unresolvable brandId renders as brandless (Map.get → undefined)
  const brandName =
    figure.brandId !== null ? brands.get(figure.brandId)?.name : undefined

  // Figures without required colors stay unselectable, same as the single add.
  const selectable = figure.requiredColors.length > 0
  const selected = orderMode && orderQuantity > 0

  function handleAddToQueue(type: "stock" | "order") {
    const result = store.getState().addToQueue(figure.id, type)
    if (result.type === "rejected" || result.type === "invalid") return
    // A clamped merge applied nothing (already at 99) — no "Added!" flash.
    if (result.type === "merged" && result.clamped) return
    setAdded(true)
    if (addedTimer.current) clearTimeout(addedTimer.current)
    addedTimer.current = setTimeout(() => setAdded(false), 1500)
  }

  return (
    <Card
      data-testid="figure-card"
      className={cn(
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        selected && "ring-2 ring-primary",
        orderMode && !selectable && "opacity-60",
        orderMode && selectable && !selected && "cursor-pointer"
      )}
      onClick={
        orderMode && selectable && !selected
          ? () => onOrderQuantityChange?.(figure.id, 1)
          : undefined
      }
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="truncate text-lg font-bold">{figure.name}</p>
            {brandName ? (
              <p className="truncate text-sm text-muted-foreground">
                {brandName}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">{figure.size}%</p>
          </div>
          {orderMode ? (
            selected ? (
              <div
                className="flex items-center gap-1"
                role="group"
                aria-label={`Order quantity for ${figure.name}`}
                // Card-level tap only selects; the stepper owns its taps.
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 rounded-full"
                  aria-label={`Decrease order quantity of ${figure.name}`}
                  onClick={() =>
                    // − at 1 deselects the figure.
                    onOrderQuantityChange?.(figure.id, orderQuantity - 1)
                  }
                >
                  <Minus className="size-3.5" />
                </Button>
                <span
                  className="min-w-[3ch] text-center text-sm font-medium tabular-nums"
                  data-testid="order-quantity-value"
                >
                  ×{orderQuantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 rounded-full"
                  aria-label={`Increase order quantity of ${figure.name}`}
                  disabled={orderQuantity >= MAX_QUEUE_QUANTITY}
                  onClick={() =>
                    onOrderQuantityChange?.(figure.id, orderQuantity + 1)
                  }
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="min-h-11"
                disabled={!selectable}
                aria-label={`Add ${figure.name} to order`}
                onClick={(e) => {
                  e.stopPropagation()
                  onOrderQuantityChange?.(figure.id, 1)
                }}
              >
                <ListPlus />
                Add
              </Button>
            )
          ) : (
            <div className="flex gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!selectable}
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
          )}
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
