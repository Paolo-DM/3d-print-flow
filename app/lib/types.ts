export interface Spool {
  id: string
  name: string
  hex: string
}

export interface Figure {
  id: string
  name: string
  franchise: string
  size: number
  notes: string
  requiredColors: string[]
}

export interface QueueItem {
  id: string
  figureId: string
  type: "stock" | "order"
  completedColors: string[]
}
