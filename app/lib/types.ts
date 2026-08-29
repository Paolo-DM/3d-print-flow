export interface Spool {
  id: string
  name: string
  hex: string
}

export interface Brand {
  id: string
  name: string
}

export interface Figure {
  id: string
  name: string
  brandId: string | null
  size: number
  notes: string
  requiredColors: string[]
}

export interface QueueItem {
  id: string
  figureId: string
  type: "stock" | "order"
  /** Integer 1..99 — copies of the figure this entry represents. */
  quantity: number
  /**
   * spoolId -> copies printed in that color, 0..quantity. A missing key reads
   * as 0; keys outside the figure's `requiredColors` are tolerated on read and
   * ignored by every derived computation.
   */
  completedCounts: Record<string, number>
  completedAt: string | null
}
