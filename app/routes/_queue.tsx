import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router"

import {
  computeQueueSummary,
  parseQueueScope,
  queueScopeKey,
} from "~/lib/derived"
import { usePrintFlowStore } from "~/lib/store"
import { QueueScopeFilter } from "~/components/QueueScopeFilter"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"

export default function QueueLayout() {
  const spools = usePrintFlowStore((state) => state.spools)
  const figures = usePrintFlowStore((state) => state.figures)
  const orders = usePrintFlowStore((state) => state.orders)
  const queueItems = usePrintFlowStore((state) => state.queueItems)
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const parsedScope = parseQueueScope(searchParams.get("scope"))
  const scope =
    parsedScope.kind === "order" && !orders.has(parsedScope.orderId)
      ? ({ kind: "all" } as const)
      : parsedScope
  const summary = computeQueueSummary(
    orders,
    queueItems,
    figures,
    spools,
    scope
  )
  const activeTab =
    location.pathname === "/figures"
      ? "figures"
      : location.pathname === "/orders"
        ? "orders"
        : "colors"

  function handleTabChange(value: string) {
    const pathname =
      value === "figures" ? "/figures" : value === "orders" ? "/orders" : "/"
    navigate({ pathname, search: searchParams.toString() })
  }

  function handleScopeChange(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value === "all") next.delete("scope")
    else next.set("scope", value)
    setSearchParams(next, { replace: true })
  }

  const metrics = [
    ["Work", summary.work],
    ["Colors", summary.colors],
    ["Active", summary.active],
    ["Ready", summary.ready],
    ["Needs attention", summary.needsAttention],
  ] as const

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <dl
          className="flex flex-wrap gap-x-5 gap-y-2"
          aria-label="Queue summary"
        >
          {metrics.map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <QueueScopeFilter
          orders={[...orders.values()]}
          value={queueScopeKey(scope)}
          onChange={handleScopeChange}
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4">
        <TabsList>
          <TabsTrigger value="colors">Work by color</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="figures">Figures</TabsTrigger>
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  )
}
