import { createStore, useStore } from "zustand"
import { toast } from "sonner"

import { writeStore } from "~/lib/db"
import { computeCompletionStatus } from "~/lib/derived"
import { brandKey } from "~/lib/migration"
import type { Brand, Figure, QueueItem, Spool } from "~/lib/types"

/**
 * Brand lifecycle results — discriminated unions the UI switches on. The store
 * decides the outcome; the caller decides how to present it.
 */
export type RenameBrandResult =
  | { type: "renamed" }
  | { type: "unchanged" }
  | { type: "collision" }
  | { type: "invalid" }
  | { type: "not-found" }

export type DeleteBrandResult =
  | { type: "deleted"; detachedFigureCount: number }
  | { type: "not-found" }

/**
 * Queue command results — same contract as the brand lifecycle: the store
 * decides the outcome, the caller decides how to present it.
 */
export type AddToQueueResult =
  | { type: "created" }
  | { type: "merged"; quantity: number; clamped: boolean }
  | { type: "rejected" }
  | { type: "invalid" }

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

export const MAX_QUEUE_QUANTITY = 99

/**
 * Shared quantity guard: non-finite or non-integer input is rejected (null);
 * integers clamp to 1..99.
 */
function normalizeQuantity(quantity: number): number | null {
  if (!Number.isFinite(quantity) || !Number.isInteger(quantity)) return null
  return Math.max(1, Math.min(MAX_QUEUE_QUANTITY, quantity))
}

/**
 * Canonical `completedAt` rule, applied after every mutation that touches
 * counts, quantity, or a figure's `requiredColors`:
 * `isComplete ? (existing.completedAt ?? now) : null`.
 */
function deriveCompletedAt(
  item: QueueItem,
  figure: Figure | null | undefined
): string | null {
  return computeCompletionStatus(item, figure)
    ? (item.completedAt ?? new Date().toISOString())
    : null
}

/**
 * Merge target per CAP-6: the *active* (not complete by derivation) entry with
 * the same figure+type and the smallest id, or null when none exists.
 */
function findMergeTarget(
  queueItems: Map<string, QueueItem>,
  figures: Map<string, Figure>,
  figureId: string,
  type: "stock" | "order"
): QueueItem | null {
  let target: QueueItem | null = null
  for (const qi of queueItems.values()) {
    if (qi.figureId !== figureId || qi.type !== type) continue
    if (computeCompletionStatus(qi, figures.get(figureId))) continue
    if (!target || qi.id < target.id) target = qi
  }
  return target
}

// Module-level flag — NOT in store state (avoids re-renders)
let _persist = true

export function setPersist(value: boolean) {
  _persist = value
}

export function getPersist() {
  return _persist
}

interface PrintFlowState {
  spools: Map<string, Spool>
  brands: Map<string, Brand>
  figures: Map<string, Figure>
  queueItems: Map<string, QueueItem>
  /** Incremented on every full data replace (init, import, rollback) — lets UI key-reset ephemeral state. Not persisted. */
  dataGeneration: number
  createSpool: (data: Omit<Spool, "id">) => void
  /**
   * Create-or-match a brand by name (trim; case-insensitive dedup; first-seen
   * casing wins). Returns the matched-or-minted brand id, or null when the
   * name is empty after trimming.
   */
  createBrand: (name: string) => string | null
  /**
   * Rename a brand in place, preserving its id. Checked in order: missing id,
   * blank name, no-op, brandKey collision with a *different* brand — only then
   * is the trimmed name written.
   */
  renameBrand: (id: string, name: string) => RenameBrandResult
  /**
   * Remove a brand and null the `brandId` of every figure referencing it
   * (cascade-to-null, not reference blocking), both maps in one `set()`.
   */
  deleteBrand: (id: string) => DeleteBrandResult
  updateSpool: (id: string, updates: Partial<Omit<Spool, "id">>) => void
  deleteSpool: (id: string) => void
  createFigure: (data: Omit<Figure, "id">) => void
  updateFigure: (id: string, updates: Partial<Omit<Figure, "id">>) => void
  deleteFigure: (id: string) => void
  /**
   * Queue `quantity` copies of a figure (default 1). Merges into the active
   * same-figure+type entry when one exists (smallest id wins, counts
   * untouched, quantity clamped at 99); otherwise creates a fresh entry.
   */
  addToQueue: (
    figureId: string,
    type: "stock" | "order",
    quantity?: number
  ) => AddToQueueResult
  /**
   * Queue a whole order in one `set()`. Duplicate figure lines are summed
   * before applying; entries with a missing/colorless figure or invalid
   * quantity are skipped and reported.
   */
  addBatchToQueue: (
    entries: { figureId: string; quantity: number }[],
    type: "stock" | "order"
  ) => AddBatchResult
  /**
   * Adjust an *active* entry's quantity (integers clamp 1..99). Lowering
   * clamps any completed count above the new quantity and may complete the
   * entry.
   */
  setQuantity: (queueItemId: string, quantity: number) => SetQuantityResult
  removeFromQueue: (id: string) => void
  /** Advance a color's count by one copy, cycling past full back to 0. */
  toggleChip: (queueItemId: string, spoolId: string) => void
  /**
   * Restore a completed entry's full quantity to the queue via the merge
   * rule; the completed source entry stays untouched as history.
   */
  requeueCompleted: (queueItemId: string) => RequeueResult
}

export const store = createStore<PrintFlowState>((set, get) => ({
  spools: new Map(),
  brands: new Map(),
  figures: new Map(),
  queueItems: new Map(),
  dataGeneration: 0,

  createSpool(data) {
    set((state) => {
      const id = crypto.randomUUID()
      const next = new Map(state.spools)
      next.set(id, { id, ...data })
      return { spools: next }
    })
  },

  createBrand(name) {
    const trimmed = name.trim()
    if (trimmed.length === 0) return null
    const key = brandKey(trimmed)
    for (const brand of get().brands.values()) {
      if (brandKey(brand.name) === key) return brand.id
    }
    const id = crypto.randomUUID()
    set((state) => {
      const next = new Map(state.brands)
      next.set(id, { id, name: trimmed })
      return { brands: next }
    })
    return id
  },

  renameBrand(id, name) {
    const { brands } = get()
    const existing = brands.get(id)
    if (!existing) return { type: "not-found" }

    const trimmed = name.trim()
    if (trimmed.length === 0) return { type: "invalid" }
    if (trimmed === existing.name) return { type: "unchanged" }

    // A casing-only change under the same brandKey is a plain rename, so the
    // collision check ignores the brand being renamed.
    const key = brandKey(trimmed)
    for (const brand of brands.values()) {
      if (brand.id !== id && brandKey(brand.name) === key) {
        return { type: "collision" }
      }
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
      if (figure.brandId === id) {
        nextFigures.set(figureId, { ...figure, brandId: null })
        detachedFigureCount += 1
      }
    }

    set({ brands: nextBrands, figures: nextFigures })
    return { type: "deleted", detachedFigureCount }
  },

  updateSpool(id, updates) {
    set((state) => {
      const existing = state.spools.get(id)
      if (!existing) return state
      const next = new Map(state.spools)
      next.set(id, { ...existing, ...updates })
      return { spools: next }
    })
  },

  deleteSpool(id) {
    set((state) => {
      const next = new Map(state.spools)
      next.delete(id)
      return { spools: next }
    })
  },

  createFigure(data) {
    set((state) => {
      const id = crypto.randomUUID()
      const next = new Map(state.figures)
      next.set(id, { id, ...data })
      return { figures: next }
    })
  },

  updateFigure(id, updates) {
    set((state) => {
      const existing = state.figures.get(id)
      if (!existing) return state
      const nextFigure = { ...existing, ...updates }
      const nextFigures = new Map(state.figures)
      nextFigures.set(id, nextFigure)

      // A requiredColors change can complete or un-complete referencing
      // queue items — re-derive their completedAt in the same set().
      if (updates.requiredColors === undefined) return { figures: nextFigures }

      let nextQueue: Map<string, QueueItem> | null = null
      for (const [qid, qi] of state.queueItems) {
        if (qi.figureId !== id) continue
        const completedAt = deriveCompletedAt(qi, nextFigure)
        if (completedAt === qi.completedAt) continue
        if (!nextQueue) nextQueue = new Map(state.queueItems)
        nextQueue.set(qid, { ...qi, completedAt })
      }
      return nextQueue
        ? { figures: nextFigures, queueItems: nextQueue }
        : { figures: nextFigures }
    })
  },

  deleteFigure(id) {
    set((state) => {
      if (!state.figures.has(id)) return state
      const nextFigures = new Map(state.figures)
      nextFigures.delete(id)
      const nextQueue = new Map(state.queueItems)
      for (const [qid, qi] of nextQueue) {
        if (qi.figureId === id) nextQueue.delete(qid)
      }
      return { figures: nextFigures, queueItems: nextQueue }
    })
  },

  addToQueue(figureId, type, quantity = 1) {
    const normalized = normalizeQuantity(quantity)
    if (normalized === null) return { type: "invalid" }

    const { figures, queueItems } = get()
    const figure = figures.get(figureId)
    if (!figure || figure.requiredColors.length === 0) {
      return { type: "rejected" }
    }

    const next = new Map(queueItems)
    const target = findMergeTarget(queueItems, figures, figureId, type)
    if (target) {
      const mergedQuantity = Math.min(
        target.quantity + normalized,
        MAX_QUEUE_QUANTITY
      )
      const clamped = target.quantity + normalized > MAX_QUEUE_QUANTITY
      const updated: QueueItem = { ...target, quantity: mergedQuantity }
      next.set(target.id, {
        ...updated,
        completedAt: deriveCompletedAt(updated, figure),
      })
      set({ queueItems: next })
      return { type: "merged", quantity: mergedQuantity, clamped }
    }

    const id = crypto.randomUUID()
    next.set(id, {
      id,
      figureId,
      type,
      quantity: normalized,
      completedCounts: {},
      completedAt: null,
    })
    set({ queueItems: next })
    return { type: "created" }
  },

  addBatchToQueue(entries, type) {
    if (entries.length === 0) return { type: "empty" }

    // Pre-pass: sum duplicate figure lines before applying anything.
    const summed = new Map<string, number>()
    for (const entry of entries) {
      summed.set(
        entry.figureId,
        (summed.get(entry.figureId) ?? 0) + entry.quantity
      )
    }

    const { figures, queueItems } = get()
    const next = new Map(queueItems)
    const skipped: string[] = []
    let pieces = 0
    let created = 0
    let merged = 0

    for (const [figureId, rawQuantity] of summed) {
      const normalized = normalizeQuantity(rawQuantity)
      const figure = figures.get(figureId)
      if (
        normalized === null ||
        !figure ||
        figure.requiredColors.length === 0
      ) {
        skipped.push(figureId)
        continue
      }

      const target = findMergeTarget(next, figures, figureId, type)
      if (target) {
        const mergedQuantity = Math.min(
          target.quantity + normalized,
          MAX_QUEUE_QUANTITY
        )
        const updated: QueueItem = { ...target, quantity: mergedQuantity }
        next.set(target.id, {
          ...updated,
          completedAt: deriveCompletedAt(updated, figure),
        })
        merged += 1
        // pieces counts copies actually applied — a clamped merge adds only
        // the delta that landed, not the requested amount.
        pieces += mergedQuantity - target.quantity
      } else {
        const id = crypto.randomUUID()
        next.set(id, {
          id,
          figureId,
          type,
          quantity: normalized,
          completedCounts: {},
          completedAt: null,
        })
        created += 1
        pieces += normalized
      }
    }

    // One set() for the whole batch; skip it when nothing was applied.
    if (created > 0 || merged > 0) set({ queueItems: next })
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

    // Lowering clamps any completed count above the new quantity.
    const completedCounts = Object.fromEntries(
      Object.entries(existing.completedCounts).map(([spoolId, count]) => [
        spoolId,
        Math.min(count, normalized),
      ])
    )
    const updated: QueueItem = {
      ...existing,
      quantity: normalized,
      completedCounts,
    }
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
      const next = new Map(state.queueItems)
      next.delete(id)
      return { queueItems: next }
    })
  },

  toggleChip(queueItemId, spoolId) {
    set((state) => {
      const existing = state.queueItems.get(queueItemId)
      if (!existing) return state
      const figure = state.figures.get(existing.figureId)
      // Guard: taps on a spool outside the figure's requiredColors (or with
      // the figure missing) never mutate.
      if (!figure || !figure.requiredColors.includes(spoolId)) return state

      const count = existing.completedCounts[spoolId] ?? 0
      const nextCount = (count + 1) % (existing.quantity + 1)
      const nextItem: QueueItem = {
        ...existing,
        completedCounts: {
          ...existing.completedCounts,
          [spoolId]: nextCount,
        },
      }
      const next = new Map(state.queueItems)
      next.set(queueItemId, {
        ...nextItem,
        completedAt: deriveCompletedAt(nextItem, figure),
      })
      return { queueItems: next }
    })
  },

  requeueCompleted(queueItemId) {
    const { figures, queueItems } = get()
    const source = queueItems.get(queueItemId)
    if (!source) return { type: "not-found" }
    const figure = figures.get(source.figureId)
    // Only a complete-by-derivation entry can be requeued; the source stays
    // untouched as history.
    if (!computeCompletionStatus(source, figure)) return { type: "not-found" }

    const next = new Map(queueItems)
    const target = findMergeTarget(
      queueItems,
      figures,
      source.figureId,
      source.type
    )
    if (target) {
      const mergedQuantity = Math.min(
        target.quantity + source.quantity,
        MAX_QUEUE_QUANTITY
      )
      const clamped = target.quantity + source.quantity > MAX_QUEUE_QUANTITY
      const updated: QueueItem = { ...target, quantity: mergedQuantity }
      next.set(target.id, {
        ...updated,
        completedAt: deriveCompletedAt(updated, figure),
      })
      set({ queueItems: next })
      return {
        type: "requeued",
        merged: true,
        quantity: mergedQuantity,
        clamped,
      }
    }

    const id = crypto.randomUUID()
    next.set(id, {
      id,
      figureId: source.figureId,
      type: source.type,
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
    action: {
      label: "Retry",
      onClick: retryPersistence,
    },
  })
}

function retryPersistence() {
  const { spools, brands, figures, queueItems } = store.getState()
  Promise.all([
    writeStore("spools", spools),
    writeStore("brands", brands),
    writeStore("figures", figures),
    writeStore("queueItems", queueItems),
  ]).then(() => toast.dismiss("persistence-failure"), showPersistenceError)
}

// Subscribe callback for IndexedDB persistence
store.subscribe((state, prevState) => {
  if (!_persist) return
  if (state.spools !== prevState.spools)
    writeStore("spools", state.spools).catch(showPersistenceError)
  if (state.brands !== prevState.brands)
    writeStore("brands", state.brands).catch(showPersistenceError)
  if (state.figures !== prevState.figures)
    writeStore("figures", state.figures).catch(showPersistenceError)
  if (state.queueItems !== prevState.queueItems)
    writeStore("queueItems", state.queueItems).catch(showPersistenceError)
})

// Serialization helpers
export function toJSON() {
  const state = store.getState()
  return {
    spools: Object.fromEntries(state.spools),
    brands: Object.fromEntries(state.brands),
    figures: Object.fromEntries(state.figures),
    queueItems: Object.fromEntries(state.queueItems),
  }
}

export function fromJSON(data: {
  spools: Record<string, Spool>
  brands: Record<string, Brand>
  figures: Record<string, Figure>
  queueItems: Record<string, QueueItem>
}) {
  const queueItems = new Map(
    Object.entries(data.queueItems).map(([id, queueItem]) => [
      id,
      {
        ...queueItem,
        quantity: queueItem.quantity ?? 1,
        completedCounts: queueItem.completedCounts ?? {},
        completedAt: queueItem.completedAt ?? null,
      },
    ])
  )

  store.setState({
    spools: new Map(Object.entries(data.spools)),
    brands: new Map(Object.entries(data.brands)),
    figures: new Map(Object.entries(data.figures)),
    queueItems,
    dataGeneration: store.getState().dataGeneration + 1,
  })
}

// React hook
export function usePrintFlowStore<T>(
  selector: (state: PrintFlowState) => T
): T {
  return useStore(store, selector)
}
