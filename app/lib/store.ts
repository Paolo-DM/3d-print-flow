import { createStore, useStore } from "zustand"

import { writeStore } from "~/lib/db"
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
      const nextFigures = new Map(state.figures)
      nextFigures.delete(id)
      const nextQueue = new Map(state.queueItems)
      for (const [qid, qi] of nextQueue) {
        if (qi.figureId === id) nextQueue.delete(qid)
      }
      return { figures: nextFigures, queueItems: nextQueue }
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
  store.setState({
    spools: new Map(Object.entries(data.spools)),
    figures: new Map(Object.entries(data.figures)),
    queueItems: new Map(Object.entries(data.queueItems)),
  })
}

// React hook
export function usePrintFlowStore<T>(
  selector: (state: PrintFlowState) => T
): T {
  return useStore(store, selector)
}
