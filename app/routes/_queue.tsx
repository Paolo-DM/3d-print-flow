import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  computeQueueSummary,
  getQueueLines,
  parseQueueScope,
  queueScopeKey,
  type QueueScope,
} from "~/lib/derived"
import { usePrintFlowStore } from "~/lib/store"
import { pluralize } from "~/lib/utils"
import { QueueScopeFilter } from "~/components/QueueScopeFilter"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/ui/button"
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
        <div className="flex flex-wrap items-center gap-2">
          <QueueScopeFilter
            orders={[...orders.values()]}
            value={queueScopeKey(scope)}
            onChange={handleScopeChange}
          />
          <ClearQueueButton scope={scope} />
        </div>
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

function ClearQueueButton({ scope }: { scope: QueueScope }) {
  const spools = usePrintFlowStore((state) => state.spools)
  const figures = usePrintFlowStore((state) => state.figures)
  const orders = usePrintFlowStore((state) => state.orders)
  const queueItems = usePrintFlowStore((state) => state.queueItems)
  const clearQueue = usePrintFlowStore((state) => state.clearQueue)
  const lines = getQueueLines(queueItems, figures, spools, scope)
  const pieces = lines.reduce((sum, line) => sum + line.quantity, 0)
  const scopeLabel =
    scope.kind === "all"
      ? "the queue"
      : scope.kind === "stock"
        ? "stock"
        : (orders.get(scope.orderId)?.reference ?? "this order")
  const lineLabel = `${pluralize(lines.length, "line")}`

  function handleClear() {
    const removed = clearQueue(scope)
    toast.success(`Removed ${pluralize(removed, "line")} from ${scopeLabel}`)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={lines.length === 0}
        >
          <Trash2 />
          {scope.kind === "all" ? "Clear queue" : "Clear scope"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear {scopeLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes {lineLabel} ({pluralize(pieces, "piece")}) and their
            printed progress.{" "}
            {scope.kind === "stock"
              ? "Orders and Completed history are unchanged."
              : "Orders are kept (emptied ones become drafts) and Completed history is unchanged."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleClear}>
            Remove {lineLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
