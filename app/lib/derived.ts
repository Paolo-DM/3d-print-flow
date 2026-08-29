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
  queueItems: Map<string, QueueItem>
): QueueItem[] {
  return Array.from(queueItems.values()).filter(
    (qi) => qi.figureId === figureId
  )
}

/** Copies of `queueItem` still to print in `spoolId` (stale counts clamp to 0). */
export function computeOutstandingCopies(
  queueItem: QueueItem,
  spoolId: string
): number {
  const count = queueItem.completedCounts[spoolId] ?? 0
  return queueItem.quantity - Math.min(count, queueItem.quantity)
}

export function computeColorRanking(
  spools: Map<string, Spool>,
  figures: Map<string, Figure>,
  queueItems: Map<string, QueueItem>
): ColorRankingEntry[] {
  const counts = new Map<string, number>()
  const orderFlags = new Map<string, boolean>()

  for (const qi of queueItems.values()) {
    const figure = figures.get(qi.figureId)
    if (!figure) continue
    for (const spoolId of figure.requiredColors) {
      const outstanding = computeOutstandingCopies(qi, spoolId)
      if (outstanding > 0) {
        counts.set(spoolId, (counts.get(spoolId) ?? 0) + outstanding)
        if (qi.type === "order") orderFlags.set(spoolId, true)
      }
    }
  }

  return [...counts.entries()]
    .flatMap(([spoolId, count]) => {
      const spool = spools.get(spoolId)
      if (!spool) return []
      return [{ spool, count, hasOrders: orderFlags.get(spoolId) ?? false }]
    })
    .toSorted(
      (a, b) =>
        b.count - a.count ||
        a.spool.name.localeCompare(b.spool.name) ||
        a.spool.id.localeCompare(b.spool.id)
    )
}

export function computeFigureProgress(
  queueItem: QueueItem,
  figure: Figure | null | undefined
): FigureProgress {
  if (!figure) return { completed: 0, total: 0 }
  const total = figure.requiredColors.length * queueItem.quantity
  let completed = 0
  for (const spoolId of figure.requiredColors) {
    const count = queueItem.completedCounts[spoolId] ?? 0
    completed += Math.min(count, queueItem.quantity)
  }
  return { completed, total }
}

export function computeCompletionStatus(
  queueItem: QueueItem,
  figure: Figure | null | undefined
): boolean {
  const { completed, total } = computeFigureProgress(queueItem, figure)
  return total > 0 && completed === total
}

export function isCompletedToday(
  queueItem: QueueItem,
  now: Date = new Date()
): boolean {
  if (!queueItem.completedAt) return false

  const completedAt = new Date(queueItem.completedAt)
  return (
    completedAt.getFullYear() === now.getFullYear() &&
    completedAt.getMonth() === now.getMonth() &&
    completedAt.getDate() === now.getDate()
  )
}
