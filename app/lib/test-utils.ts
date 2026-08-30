import type { Brand, Figure, Order, QueueItem, Spool } from "~/lib/types"

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

export function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: crypto.randomUUID(),
    reference: "ORD-001",
    customerName: null,
    platform: null,
    dueDate: null,
    notes: "",
    createdAt: "2026-08-30T10:00:00.000Z",
    ...overrides,
  }
}

export function createQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: crypto.randomUUID(),
    figureId: crypto.randomUUID(),
    orderId: null,
    quantity: 1,
    completedCounts: {},
    completedAt: null,
    ...overrides,
  }
}
