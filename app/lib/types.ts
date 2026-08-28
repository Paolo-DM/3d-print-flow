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
  completedColors: string[]
  completedAt: string | null
}
