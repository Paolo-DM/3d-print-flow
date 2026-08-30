import { CalendarDays, Store } from "lucide-react"

import type { Order } from "~/lib/types"
import { Badge } from "~/components/ui/badge"

export function OrderIdentity({
  order,
  compact = false,
}: {
  order: Order
  compact?: boolean
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{order.reference}</span>
        {order.platform ? (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Store className="size-3" aria-hidden="true" />
            {order.platform}
          </Badge>
        ) : null}
      </div>
      {!compact && (order.customerName || order.dueDate) ? (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {order.customerName ? <span>{order.customerName}</span> : null}
          {order.dueDate ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CalendarDays className="size-3" aria-hidden="true" />
              Due {order.dueDate}
            </span>
          ) : null}
        </div>
      ) : null}
      {!compact && order.notes ? (
        <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
          {order.notes}
        </p>
      ) : null}
    </div>
  )
}
