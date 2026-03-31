import { createStore, useStore } from "zustand"

import { writeStore } from "~/lib/db"
import { computeCompletionStatus } from "~/lib/derived"
import type { Figure, QueueItem, Spool } from "~/lib/types"

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
  figures: Map<string, Figure>
  queueItems: Map<string, QueueItem>
  createSpool: (data: Omit<Spool, "id">) => void
  updateSpool: (id: string, updates: Partial<Omit<Spool, "id">>) => void
  deleteSpool: (id: string) => void
  createFigure: (data: Omit<Figure, "id">) => void
  updateFigure: (id: string, updates: Partial<Omit<Figure, "id">>) => void
  deleteFigure: (id: string) => void
  addToQueue: (figureId: string, type: "stock" | "order") => void
  removeFromQueue: (id: string) => void
  toggleChip: (queueItemId: string, spoolId: string) => void
  requeueCompleted: (queueItemId: string) => void
}

export const store = createStore<PrintFlowState>((set) => ({
  spools: new Map(),
  figures: new Map(),
  queueItems: new Map(),

  createSpool(data) {
    set((state) => {
      const id = crypto.randomUUID()
      const next = new Map(state.spools)
      next.set(id, { id, ...data })
      return { spools: next }
    })
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
      const next = new Map(state.figures)
      next.set(id, { ...existing, ...updates })
      return { figures: next }
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

  addToQueue(figureId, type) {
    set((state) => {
      const id = crypto.randomUUID()
      const next = new Map(state.queueItems)
      next.set(id, {
        id,
        figureId,
        type,
        completedColors: [],
        completedAt: null,
      })
      return { queueItems: next }
    })
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
      const completedColors = existing.completedColors.includes(spoolId)
        ? existing.completedColors.filter((c) => c !== spoolId)
        : [...existing.completedColors, spoolId]
      const previousItem = existing
      const nextItem = {
        ...existing,
        completedColors,
      }
      const wasComplete = computeCompletionStatus(previousItem, figure)
      const isComplete = computeCompletionStatus(nextItem, figure)
      const completedAt =
        !wasComplete && isComplete
          ? new Date().toISOString()
          : wasComplete && !isComplete
            ? null
            : existing.completedAt
      const next = new Map(state.queueItems)
      next.set(queueItemId, { ...nextItem, completedAt })
      return { queueItems: next }
    })
  },

  requeueCompleted(queueItemId) {
    set((state) => {
      const existing = state.queueItems.get(queueItemId)
      if (!existing) return state
      const figure = state.figures.get(existing.figureId)
      if (!figure) return state
      const id = crypto.randomUUID()
      const next = new Map(state.queueItems)
      next.set(id, {
        id,
        figureId: existing.figureId,
        type: existing.type,
        completedColors: [],
        completedAt: null,
      })
      return { queueItems: next }
    })
  },
}))

// Subscribe callback for IndexedDB persistence
store.subscribe((state, prevState) => {
  if (!_persist) return
  if (state.spools !== prevState.spools) writeStore("spools", state.spools)
  if (state.figures !== prevState.figures) writeStore("figures", state.figures)
  if (state.queueItems !== prevState.queueItems)
    writeStore("queueItems", state.queueItems)
})

// Serialization helpers
export function toJSON() {
  const state = store.getState()
  return {
    spools: Object.fromEntries(state.spools),
    figures: Object.fromEntries(state.figures),
    queueItems: Object.fromEntries(state.queueItems),
  }
}

export function fromJSON(data: {
  spools: Record<string, Spool>
  figures: Record<string, Figure>
  queueItems: Record<string, QueueItem>
}) {
  const queueItems = new Map(
    Object.entries(data.queueItems).map(([id, queueItem]) => [
      id,
      {
        ...queueItem,
        completedAt: queueItem.completedAt ?? null,
      },
    ])
  )

  store.setState({
    spools: new Map(Object.entries(data.spools)),
    figures: new Map(Object.entries(data.figures)),
    queueItems,
  })
}

// React hook
export function usePrintFlowStore<T>(
  selector: (state: PrintFlowState) => T
): T {
  return useStore(store, selector)
}
