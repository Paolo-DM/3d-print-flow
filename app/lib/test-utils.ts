import type { Brand, Figure, QueueItem, Spool } from "~/lib/types"

export function createSpool(overrides: Partial<Spool> = {}): Spool {
  return {
    id: crypto.randomUUID(),
    name: "White PLA",
    hex: "#FFFFFF",
    ...overrides,
  }
}

export function createBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: crypto.randomUUID(),
    name: "One Piece",
    ...overrides,
  }
}

export function createFigure(overrides: Partial<Figure> = {}): Figure {
  return {
    id: crypto.randomUUID(),
    name: "Naruto",
    brandId: null,
    size: 60,
    notes: "",
    requiredColors: [],
    ...overrides,
  }
}

export function createQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: crypto.randomUUID(),
    figureId: crypto.randomUUID(),
    type: "stock",
    quantity: 1,
    completedCounts: {},
    completedAt: null,
    ...overrides,
  }
}
