import { PackageCheck } from "lucide-react"
import { useSearchParams } from "react-router"

import { deriveOrderState, parseQueueScope, sortOrders } from "~/lib/derived"
import { usePrintFlowStore } from "~/lib/store"
import type { Order } from "~/lib/types"
import { useToday } from "~/hooks/use-today"
import { OrderCard } from "~/components/OrderCard"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"

export default function OrdersView() {
  const today = useToday()
  const spools = usePrintFlowStore((state) => state.spools)
  const figures = usePrintFlowStore((state) => state.figures)
  const orders = usePrintFlowStore((state) => state.orders)
  const queueItems = usePrintFlowStore((state) => state.queueItems)
  const [searchParams] = useSearchParams()
  const parsedScope = parseQueueScope(searchParams.get("scope"))
  const scope =
    parsedScope.kind === "order" && !orders.has(parsedScope.orderId)
      ? ({ kind: "all" } as const)
      : parsedScope
  const scopedOrders =
    scope.kind === "stock"
      ? []
      : scope.kind === "order"
        ? [orders.get(scope.orderId)].filter((order): order is Order => !!order)
        : orders.values()
  const visibleOrders = sortOrders(
    scopedOrders,
    queueItems,
    figures,
    spools,
    today
  ).filter(
    (order) =>
      deriveOrderState(order.id, queueItems, figures, spools) !== "ready"
  )

  if (visibleOrders.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageCheck />
          </EmptyMedia>
          <EmptyTitle>No orders in progress</EmptyTitle>
          <EmptyDescription>
            Create an order from the Figure Catalog, or find Ready orders in
            Completed.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      {visibleOrders.map((order) => (
        <OrderCard key={order.id} order={order} today={today} />
      ))}
    </div>
  )
}
