import type { Order } from "~/lib/types"

export function QueueScopeFilter({
  orders,
  value,
  onChange,
}: {
  orders: readonly Order[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <span className="text-muted-foreground">Scope</span>
      <select
        className="min-h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Queue scope"
      >
        <option value="all">All</option>
        <option value="stock">Stock</option>
        {orders.map((order) => (
          <option key={order.id} value={`order:${order.id}`}>
            {order.reference}
            {order.platform ? ` · ${order.platform}` : ""}
          </option>
        ))}
      </select>
    </label>
  )
}
