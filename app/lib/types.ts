export const SPOOL_FINISHES = ["basic", "matte"] as const
export type SpoolFinish = (typeof SPOOL_FINISHES)[number]

export interface Spool {
  id: string
  name: string
  hex: string
  /** Absent when the user never said — older exports and custom spools. */
  finish?: SpoolFinish
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

export interface Order {
  id: string
  /** Human-facing identity. Unique after trimming, case-insensitively. */
  reference: string
  customerName: string | null
  platform: string | null
  /** Local calendar date (`YYYY-MM-DD`), or null when the order is undated. */
  dueDate: string | null
  notes: string
  createdAt: string
}

export interface QueueItem {
  id: string
  figureId: string
  /** null means stock; an order id keeps customer batches independent. */
  orderId: string | null
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
