import { parseTimestamp } from "~/lib/date"
import type { Figure, Order, QueueItem, Spool } from "~/lib/types"

export interface ColorRankingEntry {
  spool: Spool
  count: number
  hasOrders: boolean
}

export interface FigureProgress {
  completed: number
  total: number
}

export type WorkState = "draft" | "blocked" | "ready" | "active"

export type QueueScope =
  | { kind: "all" }
  | { kind: "stock" }
  | { kind: "order"; orderId: string }

export interface QueueItemIssue {
  type: "missing-figure" | "no-colors" | "missing-spool"
  reason: string
  figureId: string
  spoolIds?: string[]
}

export interface QueueSummary {
  work: number
  colors: number
  active: number
  ready: number
  needsAttention: number
}

export function parseQueueScope(value: string | null): QueueScope {
  if (value === "stock") return { kind: "stock" }
  if (value?.startsWith("order:") && value.length > 6) {
    return { kind: "order", orderId: value.slice(6) }
  }
  return { kind: "all" }
}

export function queueScopeKey(scope: QueueScope): string {
  return scope.kind === "order" ? `order:${scope.orderId}` : scope.kind
}

export function queueItemMatchesScope(
  queueItem: QueueItem,
  scope: QueueScope
): boolean {
  if (scope.kind === "all") return true
  if (scope.kind === "stock") return queueItem.orderId === null
  return queueItem.orderId === scope.orderId
}

export function getReferencingFigures(
  spoolId: string,
  figures: Map<string, Figure>
): Figure[] {
  return Array.from(figures.values()).filter((figure) =>
    figure.requiredColors.includes(spoolId)
  )
}

export function computeAffectedQueueItems(
  figureId: string,
  queueItems: Map<string, QueueItem>
): QueueItem[] {
  return Array.from(queueItems.values()).filter(
    (queueItem) => queueItem.figureId === figureId
  )
}

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
  queueItems: Map<string, QueueItem>,
  scope: QueueScope = { kind: "all" }
): ColorRankingEntry[] {
  const counts = new Map<string, number>()
  const orderFlags = new Map<string, boolean>()

  for (const queueItem of queueItems.values()) {
    if (!queueItemMatchesScope(queueItem, scope)) continue
    const figure = figures.get(queueItem.figureId)
    if (!figure) continue
    for (const spoolId of figure.requiredColors) {
      const outstanding = computeOutstandingCopies(queueItem, spoolId)
      if (outstanding <= 0 || !spools.has(spoolId)) continue
      counts.set(spoolId, (counts.get(spoolId) ?? 0) + outstanding)
      if (queueItem.orderId !== null) orderFlags.set(spoolId, true)
    }
  }

  return [...counts.entries()]
    .flatMap(([spoolId, count]) => {
      const spool = spools.get(spoolId)
      return spool
        ? [{ spool, count, hasOrders: orderFlags.get(spoolId) ?? false }]
        : []
    })
    .toSorted(
      (left, right) =>
        right.count - left.count ||
        left.spool.name.localeCompare(right.spool.name) ||
        left.spool.id.localeCompare(right.spool.id)
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
    completed += Math.min(
      queueItem.completedCounts[spoolId] ?? 0,
      queueItem.quantity
    )
  }
  return { completed, total }
}

export function computeCompletionStatus(
  queueItem: QueueItem,
  figure: Figure | null | undefined
): boolean {
  const progress = computeFigureProgress(queueItem, figure)
  return progress.total > 0 && progress.completed === progress.total
}

export function computeQueueItemIssue(
  queueItem: QueueItem,
  figures: Map<string, Figure>,
  spools: Map<string, Spool>
): QueueItemIssue | null {
  const figure = figures.get(queueItem.figureId)
  if (!figure) {
    return {
      type: "missing-figure",
      reason: `Figure ${queueItem.figureId} is missing`,
      figureId: queueItem.figureId,
    }
  }
  if (figure.requiredColors.length === 0) {
    return {
      type: "no-colors",
      reason: `${figure.name} has no required colors`,
      figureId: figure.id,
    }
  }
  const spoolIds = figure.requiredColors.filter(
    (spoolId) => !spools.has(spoolId)
  )
  if (spoolIds.length > 0) {
    return {
      type: "missing-spool",
      reason: `${figure.name} is missing ${spoolIds.length} required spool${spoolIds.length === 1 ? "" : "s"}`,
      figureId: figure.id,
      spoolIds,
    }
  }
  return null
}

export function deriveRowsState(
  rows: readonly QueueItem[],
  figures: Map<string, Figure>,
  spools: Map<string, Spool>
): WorkState {
  if (rows.length === 0) return "draft"
  if (rows.some((row) => computeQueueItemIssue(row, figures, spools))) {
    return "blocked"
  }
  if (
    rows.every((row) => computeCompletionStatus(row, figures.get(row.figureId)))
  ) {
    return "ready"
  }
  return "active"
}

export function getOrderRows(
  orderId: string,
  queueItems: Map<string, QueueItem>
): QueueItem[] {
  return Array.from(queueItems.values()).filter(
    (queueItem) => queueItem.orderId === orderId
  )
}

export function deriveOrderState(
  orderId: string,
  queueItems: Map<string, QueueItem>,
  figures: Map<string, Figure>,
  spools: Map<string, Spool>
): WorkState {
  return deriveRowsState(getOrderRows(orderId, queueItems), figures, spools)
}

/**
 * A Finished Order Line: an issue-free Order Line whose every required color
 * is printed for every copy — derived from current Figure colors and quantity,
 * never from `completedAt`. It is retained in the Queue as correctable
 * progress evidence until its parent Order becomes Ready. Stock Lines never
 * qualify: once complete they belong in Completed.
 */
export function isFinishedOrderLine(
  queueItem: QueueItem,
  queueItems: Map<string, QueueItem>,
  figures: Map<string, Figure>,
  spools: Map<string, Spool>
): boolean {
  if (queueItem.orderId === null) return false
  if (!computeCompletionStatus(queueItem, figures.get(queueItem.figureId))) {
    return false
  }
  if (computeQueueItemIssue(queueItem, figures, spools)) return false
  return (
    deriveOrderState(queueItem.orderId, queueItems, figures, spools) !== "ready"
  )
}

/**
 * Newest completion first; lines whose timestamp is missing or unreadable last,
 * ordered by id. An unreadable timestamp sorts as missing so the order matches
 * the card, which renders those lines without a time.
 */
export function sortFinishedLines(rows: readonly QueueItem[]): QueueItem[] {
  return rows.toSorted((left, right) => {
    const leftTime = parseTimestamp(left.completedAt)
    const rightTime = parseTimestamp(right.completedAt)
    if (leftTime !== null && rightTime !== null && leftTime !== rightTime) {
      return rightTime - leftTime
    }
    if (leftTime !== null && rightTime === null) return -1
    if (leftTime === null && rightTime !== null) return 1
    return left.id.localeCompare(right.id)
  })
}

export function computeOrderProgress(
  orderId: string,
  queueItems: Map<string, QueueItem>,
  figures: Map<string, Figure>
): FigureProgress {
  let completed = 0
  let total = 0
  for (const row of queueItems.values()) {
    if (row.orderId !== orderId) continue
    const progress = computeFigureProgress(row, figures.get(row.figureId))
    completed += progress.completed
    total += progress.total
  }
  return { completed, total }
}

export function isOrderOverdue(
  order: Order,
  state: WorkState,
  today: string
): boolean {
  return state !== "ready" && order.dueDate !== null && order.dueDate < today
}

export function sortOrders(
  orders: Iterable<Order>,
  queueItems: Map<string, QueueItem>,
  figures: Map<string, Figure>,
  spools: Map<string, Spool>,
  today: string
): Order[] {
  return Array.from(orders).toSorted((left, right) => {
    const leftState = deriveOrderState(left.id, queueItems, figures, spools)
    const rightState = deriveOrderState(right.id, queueItems, figures, spools)
    const leftOverdue = isOrderOverdue(left, leftState, today)
    const rightOverdue = isOrderOverdue(right, rightState, today)
    if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1
    if (left.dueDate !== right.dueDate) {
      if (left.dueDate === null) return 1
      if (right.dueDate === null) return -1
      return left.dueDate.localeCompare(right.dueDate)
    }
    return (
      left.createdAt.localeCompare(right.createdAt) ||
      left.reference.localeCompare(right.reference) ||
      left.id.localeCompare(right.id)
    )
  })
}

export function computeQueueSummary(
  orders: Map<string, Order>,
  queueItems: Map<string, QueueItem>,
  figures: Map<string, Figure>,
  spools: Map<string, Spool>,
  scope: QueueScope = { kind: "all" }
): QueueSummary {
  const scopedRows = Array.from(queueItems.values()).filter((row) =>
    queueItemMatchesScope(row, scope)
  )
  const ranking = computeColorRanking(spools, figures, queueItems, scope)
  let work = 0
  for (const row of scopedRows) {
    const figure = figures.get(row.figureId)
    if (!figure) continue
    for (const spoolId of figure.requiredColors) {
      work += computeOutstandingCopies(row, spoolId)
    }
  }

  let active = 0
  let ready = 0
  let needsAttention = 0
  if (scope.kind !== "stock") {
    const relevantOrders =
      scope.kind === "order"
        ? [orders.get(scope.orderId)].filter((order): order is Order => !!order)
        : Array.from(orders.values())
    for (const order of relevantOrders) {
      const state = deriveOrderState(order.id, queueItems, figures, spools)
      if (state === "active") active += 1
      if (state === "ready") ready += 1
      if (state === "blocked") needsAttention += 1
    }
  }
  if (scope.kind !== "order") {
    for (const row of scopedRows) {
      if (row.orderId !== null) continue
      const state = deriveRowsState([row], figures, spools)
      if (state === "active") active += 1
      if (state === "ready") ready += 1
      if (state === "blocked") needsAttention += 1
    }
  }

  return { work, colors: ranking.length, active, ready, needsAttention }
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
