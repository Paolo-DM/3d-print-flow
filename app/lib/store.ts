import { createStore, useStore } from "zustand"
import { toast } from "sonner"

import * as db from "~/lib/db"
import { isValidLocalDate } from "~/lib/date"
import {
  computeCompletionStatus,
  deriveOrderState,
  getQueueLines,
  isOpenOrder,
  type QueueScope,
} from "~/lib/derived"
import { brandKey, orderReferenceKey } from "~/lib/migration"
import type { Brand, Figure, Order, QueueItem, Spool } from "~/lib/types"

export type RenameBrandResult =
  | { type: "renamed" }
  | { type: "unchanged" }
  | { type: "collision" }
  | { type: "invalid" }
  | { type: "not-found" }

export type DeleteBrandResult =
  | { type: "deleted"; detachedFigureCount: number }
  | { type: "not-found" }

export type SetQuantityResult =
  | { type: "updated"; completed: boolean }
  | { type: "not-active" }
  | { type: "not-found" }
  | { type: "invalid" }

export type AddBatchResult =
  | {
      type: "queued"
      pieces: number
      created: number
      merged: number
      skipped: string[]
    }
  | { type: "empty" }

export type RequeueResult =
  | { type: "requeued"; merged: boolean; quantity: number; clamped: boolean }
  | { type: "not-found" }

export type SaveOrderResult =
  | { type: "created"; order: Order }
  | { type: "updated"; order: Order }
  | { type: "collision" }
  | { type: "invalid"; field: "reference" | "dueDate" }
  | { type: "not-found" }

export type DeleteOrderResult =
  | { type: "deleted"; removedLines: number }
  | { type: "not-found" }

export type DuplicateOrderResult =
  | { type: "duplicated"; order: Order; lines: number }
  | { type: "not-found" }

export interface OrderDraft {
  reference?: string
  customerName?: string | null
  platform?: string | null
  dueDate?: string | null
  notes?: string
}

export const MAX_QUEUE_QUANTITY = 99

function normalizeQuantity(quantity: number): number | null {
  if (!Number.isFinite(quantity) || !Number.isInteger(quantity)) return null
  return Math.max(1, Math.min(MAX_QUEUE_QUANTITY, quantity))
}

function deriveCompletedAt(
  item: QueueItem,
  figure: Figure | null | undefined
): string | null {
  return computeCompletionStatus(item, figure)
    ? (item.completedAt ?? new Date().toISOString())
    : null
}

/**
 * Points every figure using `fromId` at `toId`, carrying printed counts over.
 * A figure that already needs `toId` just drops `fromId` and keeps its own count.
 */
function remapSpool(
  state: Pick<PrintFlowState, "figures" | "queueItems">,
  fromId: string,
  toId: string
): Pick<PrintFlowState, "figures" | "queueItems"> {
  const figures = new Map(state.figures)
  for (const figure of state.figures.values()) {
    if (!figure.requiredColors.includes(fromId)) continue
    const requiredColors = figure.requiredColors.includes(toId)
      ? figure.requiredColors.filter((spoolId) => spoolId !== fromId)
      : figure.requiredColors.map((spoolId) =>
          spoolId === fromId ? toId : spoolId
        )
    figures.set(figure.id, { ...figure, requiredColors })
  }
  const queueItems = new Map(state.queueItems)
  for (const item of state.queueItems.values()) {
    const before = state.figures.get(item.figureId)
    const after = figures.get(item.figureId)
    if (!before || before === after) continue
    const { [fromId]: moved = 0, ...rest } = item.completedCounts
    const next = {
      ...item,
      completedCounts: before.requiredColors.includes(toId)
        ? rest
        : { ...rest, [toId]: moved },
    }
    queueItems.set(item.id, {
      ...next,
      completedAt: deriveCompletedAt(next, after),
    })
  }
  return { figures, queueItems }
}

function findMergeTarget(
  queueItems: Map<string, QueueItem>,
  figures: Map<string, Figure>,
  figureId: string,
  orderId: string | null
): QueueItem | null {
  let target: QueueItem | null = null
  for (const queueItem of queueItems.values()) {
    if (
      queueItem.figureId !== figureId ||
      queueItem.orderId !== orderId ||
      computeCompletionStatus(queueItem, figures.get(figureId))
    ) {
      continue
    }
    if (!target || queueItem.id < target.id) target = queueItem
  }
  return target
}

export function nextOrderReference(orders: Map<string, Order>): string {
  let max = 0
  for (const order of orders.values()) {
    const match = /^ORD-(\d+)$/i.exec(order.reference.trim())
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `ORD-${String(max + 1).padStart(3, "0")}`
}

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

function normalizeOrderDraft(
  draft: OrderDraft,
  orders: Map<string, Order>,
  currentId?: string
):
  | { type: "valid"; value: Omit<Order, "id" | "createdAt"> }
  | { type: "collision" }
  | { type: "invalid"; field: "reference" | "dueDate" } {
  const reference = (draft.reference ?? nextOrderReference(orders)).trim()
  if (!reference) return { type: "invalid", field: "reference" }
  const key = orderReferenceKey(reference)
  for (const order of orders.values()) {
    if (order.id !== currentId && orderReferenceKey(order.reference) === key) {
      return { type: "collision" }
    }
  }
  const dueDate = normalizeOptional(draft.dueDate)
  if (dueDate !== null && !isValidLocalDate(dueDate)) {
    return { type: "invalid", field: "dueDate" }
  }
  return {
    type: "valid",
    value: {
      reference,
      customerName: normalizeOptional(draft.customerName),
      platform: normalizeOptional(draft.platform),
      dueDate,
      notes: draft.notes?.trim() ?? "",
    },
  }
}

let persistEnabled = true
let persistenceTail: Promise<void> = Promise.resolve()
let persistenceBusy = false

export function setPersist(value: boolean) {
  persistEnabled = value
}

export function getPersist() {
  return persistEnabled
}

export function drainPersistence(): Promise<void> {
  return persistenceTail
}

/** Reset the in-memory persistence queue between isolated tests. */
export function _resetPersistence() {
  persistenceTail = Promise.resolve()
  persistenceBusy = false
}

interface PrintFlowState {
  spools: Map<string, Spool>
  brands: Map<string, Brand>
  figures: Map<string, Figure>
  orders: Map<string, Order>
  queueItems: Map<string, QueueItem>
  dataGeneration: number
  announcement: string
  announcementVersion: number
  createSpool: (data: Omit<Spool, "id">) => void
  createBrand: (name: string) => string | null
  renameBrand: (id: string, name: string) => RenameBrandResult
  deleteBrand: (id: string) => DeleteBrandResult
  updateSpool: (id: string, updates: Partial<Omit<Spool, "id">>) => void
  /** With a replacement, figures using the spool switch to it first. */
  deleteSpool: (id: string, replacementId?: string) => void
  createFigure: (data: Omit<Figure, "id">) => void
  updateFigure: (id: string, updates: Partial<Omit<Figure, "id">>) => void
  deleteFigure: (id: string) => void
  createOrder: (draft?: OrderDraft) => SaveOrderResult
  updateOrder: (id: string, draft: OrderDraft) => SaveOrderResult
  deleteOrder: (id: string) => DeleteOrderResult
  duplicateOrder: (id: string) => DuplicateOrderResult
  addBatchToQueue: (
    entries: { figureId: string; quantity: number }[],
    orderId: string | null
  ) => AddBatchResult
  setQuantity: (queueItemId: string, quantity: number) => SetQuantityResult
  removeFromQueue: (id: string) => void
  /** Removes every Queue line in scope; Orders and Completed are untouched. */
  clearQueue: (scope: QueueScope) => number
  toggleChip: (queueItemId: string, spoolId: string) => void
  requeueCompleted: (queueItemId: string) => RequeueResult
}

export const store = createStore<PrintFlowState>((set, get) => ({
  spools: new Map(),
  brands: new Map(),
  figures: new Map(),
  orders: new Map(),
  queueItems: new Map(),
  dataGeneration: 0,
  announcement: "",
  announcementVersion: 0,

  createSpool(data) {
    set((state) => {
      const id = crypto.randomUUID()
      const spools = new Map(state.spools)
      spools.set(id, { id, ...data })
      return { spools }
    })
  },

  createBrand(name) {
    const trimmed = name.trim()
    if (!trimmed) return null
    const key = brandKey(trimmed)
    for (const brand of get().brands.values()) {
      if (brandKey(brand.name) === key) return brand.id
    }
    const id = crypto.randomUUID()
    set((state) => {
      const brands = new Map(state.brands)
      brands.set(id, { id, name: trimmed })
      return { brands }
    })
    return id
  },

  renameBrand(id, name) {
    const { brands } = get()
    const existing = brands.get(id)
    if (!existing) return { type: "not-found" }
    const trimmed = name.trim()
    if (!trimmed) return { type: "invalid" }
    if (trimmed === existing.name) return { type: "unchanged" }
    const key = brandKey(trimmed)
    if (
      Array.from(brands.values()).some(
        (brand) => brand.id !== id && brandKey(brand.name) === key
      )
    ) {
      return { type: "collision" }
    }
    const next = new Map(brands)
    next.set(id, { ...existing, name: trimmed })
    set({ brands: next })
    return { type: "renamed" }
  },

  deleteBrand(id) {
    const { brands, figures } = get()
    if (!brands.has(id)) return { type: "not-found" }
    const nextBrands = new Map(brands)
    nextBrands.delete(id)
    const nextFigures = new Map(figures)
    let detachedFigureCount = 0
    for (const [figureId, figure] of figures) {
      if (figure.brandId !== id) continue
      nextFigures.set(figureId, { ...figure, brandId: null })
      detachedFigureCount += 1
    }
    set({ brands: nextBrands, figures: nextFigures })
    return { type: "deleted", detachedFigureCount }
  },

  updateSpool(id, updates) {
    set((state) => {
      const existing = state.spools.get(id)
      if (!existing) return state
      const spools = new Map(state.spools)
      spools.set(id, { ...existing, ...updates })
      return { spools }
    })
  },

  deleteSpool(id, replacementId) {
    set((state) => {
      if (!state.spools.has(id)) return state
      const spools = new Map(state.spools)
      spools.delete(id)
      // Remapped figures no longer need `id`, so nothing below breaks.
      const { figures, queueItems } =
        replacementId !== undefined &&
        replacementId !== id &&
        state.spools.has(replacementId)
          ? remapSpool(state, id, replacementId)
          : state
      const affectedReferences = new Set<string>()
      for (const row of queueItems.values()) {
        if (row.orderId === null) continue
        const figure = figures.get(row.figureId)
        if (figure?.requiredColors.includes(id)) {
          const reference = state.orders.get(row.orderId)?.reference
          if (reference) affectedReferences.add(reference)
        }
      }
      return {
        spools,
        figures,
        queueItems,
        announcement:
          affectedReferences.size > 0
            ? `${[...affectedReferences].join(", ")} moved to Needs attention after a spool was deleted.`
            : state.announcement,
        announcementVersion:
          affectedReferences.size > 0
            ? state.announcementVersion + 1
            : state.announcementVersion,
      }
    })
  },

  createFigure(data) {
    set((state) => {
      const id = crypto.randomUUID()
      const figures = new Map(state.figures)
      figures.set(id, { id, ...data })
      return { figures }
    })
  },

  updateFigure(id, updates) {
    set((state) => {
      const existing = state.figures.get(id)
      if (!existing) return state
      const nextFigure = { ...existing, ...updates }
      const figures = new Map(state.figures)
      figures.set(id, nextFigure)
      if (updates.requiredColors === undefined) return { figures }

      const queueItems = new Map(state.queueItems)
      const affectedReferences = new Set<string>()
      let changedQueue = false
      for (const [queueItemId, queueItem] of state.queueItems) {
        if (queueItem.figureId !== id) continue
        const completedAt = deriveCompletedAt(queueItem, nextFigure)
        if (completedAt !== queueItem.completedAt) {
          queueItems.set(queueItemId, { ...queueItem, completedAt })
          changedQueue = true
        }
        if (queueItem.orderId !== null) {
          const reference = state.orders.get(queueItem.orderId)?.reference
          if (reference) affectedReferences.add(reference)
        }
      }
      const announcement =
        affectedReferences.size > 0
          ? `${[...affectedReferences].join(", ")} updated after figure colors changed.`
          : state.announcement
      return changedQueue
        ? {
            figures,
            queueItems,
            announcement,
            announcementVersion:
              affectedReferences.size > 0
                ? state.announcementVersion + 1
                : state.announcementVersion,
          }
        : {
            figures,
            announcement,
            announcementVersion:
              affectedReferences.size > 0
                ? state.announcementVersion + 1
                : state.announcementVersion,
          }
    })
  },

  deleteFigure(id) {
    set((state) => {
      if (!state.figures.has(id)) return state
      const figures = new Map(state.figures)
      figures.delete(id)
      const queueItems = new Map(state.queueItems)
      const affectedReferences = new Set<string>()
      for (const [queueItemId, queueItem] of state.queueItems) {
        if (queueItem.figureId !== id) continue
        queueItems.delete(queueItemId)
        if (queueItem.orderId !== null) {
          const reference = state.orders.get(queueItem.orderId)?.reference
          if (reference) affectedReferences.add(reference)
        }
      }
      return {
        figures,
        queueItems,
        announcement:
          affectedReferences.size > 0
            ? `${[...affectedReferences].join(", ")} updated after a figure was deleted.`
            : state.announcement,
        announcementVersion:
          affectedReferences.size > 0
            ? state.announcementVersion + 1
            : state.announcementVersion,
      }
    })
  },

  createOrder(draft = {}) {
    const { orders } = get()
    const normalized = normalizeOrderDraft(draft, orders)
    if (normalized.type !== "valid") return normalized
    const id = crypto.randomUUID()
    const order: Order = {
      id,
      ...normalized.value,
      createdAt: new Date().toISOString(),
    }
    const next = new Map(orders)
    next.set(id, order)
    set({ orders: next })
    return { type: "created", order }
  },

  updateOrder(id, draft) {
    const { orders } = get()
    const existing = orders.get(id)
    if (!existing) return { type: "not-found" }
    const normalized = normalizeOrderDraft(
      {
        reference:
          draft.reference === undefined ? existing.reference : draft.reference,
        customerName:
          draft.customerName === undefined
            ? existing.customerName
            : draft.customerName,
        platform:
          draft.platform === undefined ? existing.platform : draft.platform,
        dueDate: draft.dueDate === undefined ? existing.dueDate : draft.dueDate,
        notes: draft.notes === undefined ? existing.notes : draft.notes,
      },
      orders,
      id
    )
    if (normalized.type !== "valid") return normalized
    const order = { ...existing, ...normalized.value }
    const next = new Map(orders)
    next.set(id, order)
    set({ orders: next })
    return { type: "updated", order }
  },

  deleteOrder(id) {
    const { orders, queueItems } = get()
    if (!orders.has(id)) return { type: "not-found" }
    const nextOrders = new Map(orders)
    nextOrders.delete(id)
    const nextQueueItems = new Map(queueItems)
    let removedLines = 0
    for (const [queueItemId, queueItem] of queueItems) {
      if (queueItem.orderId !== id) continue
      nextQueueItems.delete(queueItemId)
      removedLines += 1
    }
    set({ orders: nextOrders, queueItems: nextQueueItems })
    return { type: "deleted", removedLines }
  },

  duplicateOrder(id) {
    const { orders, queueItems } = get()
    const source = orders.get(id)
    if (!source) return { type: "not-found" }
    const newId = crypto.randomUUID()
    const order: Order = {
      ...source,
      id: newId,
      reference: nextOrderReference(orders),
      createdAt: new Date().toISOString(),
    }
    const nextOrders = new Map(orders)
    nextOrders.set(newId, order)
    const quantities = new Map<string, number>()
    for (const queueItem of queueItems.values()) {
      if (queueItem.orderId !== id) continue
      quantities.set(
        queueItem.figureId,
        (quantities.get(queueItem.figureId) ?? 0) + queueItem.quantity
      )
    }
    const nextQueueItems = new Map(queueItems)
    let lines = 0
    for (const [figureId, quantity] of quantities) {
      let remaining = quantity
      while (remaining > 0) {
        const queueItemId = crypto.randomUUID()
        const chunk = Math.min(remaining, MAX_QUEUE_QUANTITY)
        nextQueueItems.set(queueItemId, {
          id: queueItemId,
          figureId,
          orderId: newId,
          quantity: chunk,
          completedCounts: {},
          completedAt: null,
        })
        remaining -= chunk
        lines += 1
      }
    }
    set({ orders: nextOrders, queueItems: nextQueueItems })
    return { type: "duplicated", order, lines }
  },

  addBatchToQueue(entries, orderId) {
    if (entries.length === 0) return { type: "empty" }
    const summed = new Map<string, number>()
    for (const entry of entries) {
      summed.set(
        entry.figureId,
        (summed.get(entry.figureId) ?? 0) + entry.quantity
      )
    }
    const { figures, orders, queueItems, spools } = get()
    if (orderId !== null) {
      if (!isOpenOrder(orderId, orders, queueItems, figures, spools)) {
        return {
          type: "queued",
          pieces: 0,
          created: 0,
          merged: 0,
          skipped: [...summed.keys()],
        }
      }
    }
    const next = new Map(queueItems)
    const skipped: string[] = []
    let pieces = 0
    let created = 0
    let merged = 0
    for (const [figureId, rawQuantity] of summed) {
      const quantity = normalizeQuantity(rawQuantity)
      const figure = figures.get(figureId)
      if (!quantity || !figure || figure.requiredColors.length === 0) {
        skipped.push(figureId)
        continue
      }
      const mergeTarget = findMergeTarget(next, figures, figureId, orderId)
      if (mergeTarget) {
        const mergedQuantity = Math.min(
          mergeTarget.quantity + quantity,
          MAX_QUEUE_QUANTITY
        )
        if (mergedQuantity === mergeTarget.quantity) {
          skipped.push(figureId)
          continue
        }
        const updated = { ...mergeTarget, quantity: mergedQuantity }
        next.set(mergeTarget.id, {
          ...updated,
          completedAt: deriveCompletedAt(updated, figure),
        })
        pieces += mergedQuantity - mergeTarget.quantity
        merged += 1
      } else {
        const queueItemId = crypto.randomUUID()
        next.set(queueItemId, {
          id: queueItemId,
          figureId,
          orderId,
          quantity,
          completedCounts: {},
          completedAt: null,
        })
        pieces += quantity
        created += 1
      }
    }
    if (created || merged) set({ queueItems: next })
    return { type: "queued", pieces, created, merged, skipped }
  },

  setQuantity(queueItemId, quantity) {
    const normalized = normalizeQuantity(quantity)
    if (normalized === null) return { type: "invalid" }
    const { figures, queueItems } = get()
    const existing = queueItems.get(queueItemId)
    if (!existing) return { type: "not-found" }
    const figure = figures.get(existing.figureId)
    if (computeCompletionStatus(existing, figure)) return { type: "not-active" }
    const completedCounts = Object.fromEntries(
      Object.entries(existing.completedCounts).map(([spoolId, count]) => [
        spoolId,
        Math.min(count, normalized),
      ])
    )
    const updated = { ...existing, quantity: normalized, completedCounts }
    const completed = computeCompletionStatus(updated, figure)
    const next = new Map(queueItems)
    next.set(queueItemId, {
      ...updated,
      completedAt: deriveCompletedAt(updated, figure),
    })
    set({ queueItems: next })
    return { type: "updated", completed }
  },

  removeFromQueue(id) {
    set((state) => {
      if (!state.queueItems.has(id)) return state
      const queueItems = new Map(state.queueItems)
      queueItems.delete(id)
      return { queueItems }
    })
  },

  clearQueue(scope) {
    const { figures, queueItems, spools } = get()
    const lines = getQueueLines(queueItems, figures, spools, scope)
    if (lines.length === 0) return 0
    const next = new Map(queueItems)
    for (const line of lines) next.delete(line.id)
    set({ queueItems: next })
    return lines.length
  },

  toggleChip(queueItemId, spoolId) {
    set((state) => {
      const existing = state.queueItems.get(queueItemId)
      if (!existing) return state
      const figure = state.figures.get(existing.figureId)
      if (!figure || !figure.requiredColors.includes(spoolId)) return state
      const count = existing.completedCounts[spoolId] ?? 0
      const nextItem = {
        ...existing,
        completedCounts: {
          ...existing.completedCounts,
          [spoolId]: (count + 1) % (existing.quantity + 1),
        },
      }
      const queueItems = new Map(state.queueItems)
      queueItems.set(queueItemId, {
        ...nextItem,
        completedAt: deriveCompletedAt(nextItem, figure),
      })
      return { queueItems }
    })
  },

  requeueCompleted(queueItemId) {
    const { figures, queueItems } = get()
    const source = queueItems.get(queueItemId)
    if (
      !source ||
      source.orderId !== null ||
      !computeCompletionStatus(source, figures.get(source.figureId))
    ) {
      return { type: "not-found" }
    }
    const next = new Map(queueItems)
    const target = findMergeTarget(queueItems, figures, source.figureId, null)
    if (target) {
      const requested = target.quantity + source.quantity
      const quantity = Math.min(requested, MAX_QUEUE_QUANTITY)
      const updated = { ...target, quantity }
      next.set(target.id, {
        ...updated,
        completedAt: deriveCompletedAt(updated, figures.get(source.figureId)),
      })
      set({ queueItems: next })
      return {
        type: "requeued",
        merged: true,
        quantity,
        clamped: requested > MAX_QUEUE_QUANTITY,
      }
    }
    const id = crypto.randomUUID()
    next.set(id, {
      id,
      figureId: source.figureId,
      orderId: null,
      quantity: source.quantity,
      completedCounts: {},
      completedAt: null,
    })
    set({ queueItems: next })
    return {
      type: "requeued",
      merged: false,
      quantity: source.quantity,
      clamped: false,
    }
  },
}))

function showPersistenceError() {
  toast.error("Changes saved in memory but not persisted", {
    id: "persistence-failure",
    duration: Infinity,
    action: { label: "Retry", onClick: retryPersistence },
  })
}

async function writeChangedStores(changes: {
  spools?: Map<string, Spool>
  brands?: Map<string, Brand>
  figures?: Map<string, Figure>
  orders?: Map<string, Order>
  queueItems?: Map<string, QueueItem>
}) {
  if (typeof db.writeStores === "function") {
    await db.writeStores(changes)
    return
  }
  await Promise.all(
    Object.entries(changes).map(([name, map]) =>
      db.writeStore(
        name as "spools" | "brands" | "figures" | "orders" | "queueItems",
        map
      )
    )
  )
}

function enqueuePersistence(
  operation: () => Promise<void>,
  onSuccess?: () => void
) {
  const started = persistenceBusy
    ? persistenceTail.then(operation)
    : operation()
  persistenceBusy = true
  const handled = started.then(onSuccess, showPersistenceError)
  const settled = handled.finally(() => {
    if (persistenceTail === settled) persistenceBusy = false
  })
  persistenceTail = settled
}

function retryPersistence() {
  const snapshot = toJSON()
  enqueuePersistence(
    () => db.replaceAll(snapshot),
    () => toast.dismiss("persistence-failure")
  )
}

store.subscribe((state, previous) => {
  if (!persistEnabled) return
  const changes: Parameters<typeof writeChangedStores>[0] = {}
  if (state.spools !== previous.spools) changes.spools = new Map(state.spools)
  if (state.brands !== previous.brands) changes.brands = new Map(state.brands)
  if (state.figures !== previous.figures)
    changes.figures = new Map(state.figures)
  if (state.orders !== previous.orders) changes.orders = new Map(state.orders)
  if (state.queueItems !== previous.queueItems)
    changes.queueItems = new Map(state.queueItems)
  if (Object.keys(changes).length > 0) {
    enqueuePersistence(() => writeChangedStores(changes))
  }
})

export function toJSON() {
  const state = store.getState()
  return {
    spools: Object.fromEntries(state.spools),
    brands: Object.fromEntries(state.brands),
    figures: Object.fromEntries(state.figures),
    orders: Object.fromEntries(state.orders),
    queueItems: Object.fromEntries(state.queueItems),
  }
}

export function fromJSON(data: {
  spools: Record<string, Spool>
  brands: Record<string, Brand>
  figures: Record<string, Figure>
  orders: Record<string, Order>
  queueItems: Record<string, QueueItem>
}) {
  const queueItems = new Map(
    Object.entries(data.queueItems).map(([id, queueItem]) => {
      const orderId = queueItem.orderId ?? null
      return [
        id,
        {
          ...queueItem,
          orderId,
          quantity: queueItem.quantity ?? 1,
          completedCounts: queueItem.completedCounts ?? {},
          completedAt: queueItem.completedAt ?? null,
        },
      ]
    })
  )
  store.setState({
    spools: new Map(Object.entries(data.spools)),
    brands: new Map(Object.entries(data.brands)),
    figures: new Map(Object.entries(data.figures)),
    orders: new Map(Object.entries(data.orders)),
    queueItems,
    dataGeneration: store.getState().dataGeneration + 1,
  })
}

export function usePrintFlowStore<T>(
  selector: (state: PrintFlowState) => T
): T {
  return useStore(store, selector)
}
