import { Outlet, useLocation, useNavigate } from "react-router"

import { usePrintFlowStore } from "~/lib/store"
import {
  computeColorRanking,
  computeCompletionStatus,
  isCompletedToday,
} from "~/lib/derived"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { StatCard } from "~/components/StatCard"

export default function QueueLayout() {
  const spools = usePrintFlowStore((s) => s.spools)
  const figures = usePrintFlowStore((s) => s.figures)
  const queueItems = usePrintFlowStore((s) => s.queueItems)
  const location = useLocation()
  const navigate = useNavigate()

  const ranking = computeColorRanking(spools, figures, queueItems)

  const completedCount = Array.from(queueItems.values()).filter((qi) =>
    computeCompletionStatus(qi, figures.get(qi.figureId))
  ).length
  const completedTodayCount = Array.from(queueItems.values()).filter((qi) =>
    isCompletedToday(qi)
  ).length

  const ordersPending = Array.from(queueItems.values()).filter((qi) => {
    if (qi.type !== "order") return false
    const figure = figures.get(qi.figureId)
    return figure ? !computeCompletionStatus(qi, figure) : false
  }).length

  const queuedFigures = queueItems.size - completedCount

  const activeTab = location.pathname === "/figures" ? "figures" : "colors"

  function handleTabChange(value: string) {
    navigate(value === "figures" ? "/figures" : "/")
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 grid animate-fade-in-up grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="In Queue" value={queuedFigures} accent="queue" />
        <StatCard label="Colors Left" value={ranking.length} accent="colors" />
        <StatCard label="Orders" value={ordersPending} accent="orders" />
        <StatCard
          label="Done Today"
          value={completedTodayCount}
          accent="completed"
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4">
        <TabsList>
          <TabsTrigger value="colors">Color View</TabsTrigger>
          <TabsTrigger value="figures">Figure View</TabsTrigger>
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  )
}
