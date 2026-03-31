import type { Figure, QueueItem, Spool } from "~/lib/types"

export interface ColorRankingEntry {
  spool: Spool
  count: number
  hasOrders: boolean
}

export interface FigureProgress {
  completed: number
  total: number
}

export function getReferencingFigures(
  spoolId: string,
  figures: Map<string, Figure>
): Figure[] {
  return Array.from(figures.values()).filter((f) =>
    f.requiredColors.includes(spoolId)
  )
}

export function computeAffectedQueueItems(
  figureId: string,
  queueItems: Map<string, QueueItem>,
): QueueItem[] {
  return Array.from(queueItems.values()).filter(
    (qi) => qi.figureId === figureId,
  )
}

export function computeColorRanking(
  spools: Map<string, Spool>,
  figures: Map<string, Figure>,
  queueItems: Map<string, QueueItem>,
): ColorRankingEntry[] {
  const counts = new Map<string, number>()
  const orderFlags = new Map<string, boolean>()

  for (const qi of queueItems.values()) {
    const figure = figures.get(qi.figureId)
    if (!figure) continue
    for (const spoolId of figure.requiredColors) {
      if (!qi.completedColors.includes(spoolId)) {
        counts.set(spoolId, (counts.get(spoolId) ?? 0) + 1)
        if (qi.type === "order") orderFlags.set(spoolId, true)
      }
    }
  }

  return [...counts.entries()]
    .toSorted(([, a], [, b]) => b - a)
    .flatMap(([spoolId, count]) => {
      const spool = spools.get(spoolId)
      if (!spool) return []
      return [{ spool, count, hasOrders: orderFlags.get(spoolId) ?? false }]
    })
}

export function computeFigureProgress(
  queueItem: QueueItem,
  figure: Figure | null | undefined,
): FigureProgress {
  if (!figure) return { completed: 0, total: 0 }
  const total = figure.requiredColors.length
  const completed = figure.requiredColors.filter((c) =>
    queueItem.completedColors.includes(c),
  ).length
  return { completed, total }
}

export function computeCompletionStatus(
  queueItem: QueueItem,
  figure: Figure | null | undefined,
): boolean {
  const { completed, total } = computeFigureProgress(queueItem, figure)
  return total > 0 && completed === total
}
