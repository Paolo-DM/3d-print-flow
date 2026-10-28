import { useId } from "react"
import { Plus } from "lucide-react"

import type { Order } from "~/lib/types"
import { pluralize } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { NativeSelect } from "~/components/ui/native-select"

const STOCK = "stock"

/**
 * Sticky bar for figures staged in the catalog: shows the batch size and
 * where it will be queued (stock or an open order), then commits it.
 */
export function QueueBatchBar({
  figureCount,
  pieceCount,
  destination,
  openOrders,
  onDestinationChange,
  onNewOrder,
  onClear,
  onConfirm,
}: {
  figureCount: number
  pieceCount: number
  /** null queues the batch as stock. */
  destination: Order | null
  openOrders: readonly Order[]
  onDestinationChange: (orderId: string | null) => void
  onNewOrder: () => void
  onClear: () => void
  onConfirm: () => void
}) {
  const selectId = useId()

  return (
    <div
      className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-popover p-3 shadow-lg"
      data-testid="queue-batch-bar"
    >
      <p
        className="min-w-0 flex-1 basis-40 text-sm font-medium tabular-nums"
        aria-live="polite"
        data-testid="queue-batch-summary"
      >
        {figureCount === 0
          ? "Add figures to queue them"
          : `${pluralize(figureCount, "figure")} · ${pluralize(pieceCount, "piece")}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="text-sm text-muted-foreground">
          Queue for
        </label>
        <NativeSelect
          id={selectId}
          className="min-h-11 w-auto max-w-56"
          value={destination?.id ?? STOCK}
          onChange={(event) =>
            onDestinationChange(
              event.target.value === STOCK ? null : event.target.value
            )
          }
        >
          <option value={STOCK}>Stock</option>
          {openOrders.length > 0 ? (
            <optgroup label="Open orders">
              {openOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.reference}
                  {order.customerName ? ` · ${order.customerName}` : ""}
                </option>
              ))}
            </optgroup>
          ) : null}
        </NativeSelect>
        <Button variant="ghost" className="min-h-11" onClick={onNewOrder}>
          <Plus />
          New order
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" className="min-h-11" onClick={onClear}>
          Clear
        </Button>
        <Button
          className="min-h-11"
          disabled={pieceCount === 0}
          onClick={onConfirm}
        >
          {destination ? `Add to ${destination.reference}` : "Add to stock"}
        </Button>
      </div>
    </div>
  )
}
