import "fake-indexeddb/auto"

import { toast } from "sonner"
import { afterEach, describe, expect, it, type Mock, vi } from "vitest"

import * as db from "~/lib/db"
import { brandKey } from "~/lib/migration"
import {
  _resetPersistence,
  drainPersistence,
  fromJSON,
  getPersist,
  setPersist,
  store,
  toJSON,
} from "~/lib/store"
import {
  createBrand,
  createFigure,
  createOrder,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"
import type { Figure, QueueItem } from "~/lib/types"

vi.mock("~/lib/db", () => ({
  writeStore: vi.fn(() => Promise.resolve()),
  writeStores: vi.fn(() => Promise.resolve()),
  replaceAll: vi.fn(() => Promise.resolve()),
}))

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}))

function resetStore() {
  setPersist(false)
  store.setState({
    spools: new Map(),
    brands: new Map(),
    figures: new Map(),
    orders: new Map(),
    queueItems: new Map(),
    dataGeneration: 0,
    announcement: "",
    announcementVersion: 0,
  })
  _resetPersistence()
  vi.clearAllMocks()
  vi.mocked(db.writeStore).mockReturnValue(Promise.resolve())
  vi.mocked(db.writeStores).mockReturnValue(Promise.resolve())
  vi.mocked(db.replaceAll).mockReturnValue(Promise.resolve())
  setPersist(true)
}

afterEach(resetStore)

describe("store mutations", () => {
  it("createSpool adds a spool to the map", () => {
    store.getState().createSpool({ name: "Red PLA", hex: "#FF0000" })
    const spools = store.getState().spools
    expect(spools.size).toBe(1)
    const spool = [...spools.values()][0]
    expect(spool.name).toBe("Red PLA")
    expect(spool.hex).toBe("#FF0000")
    expect(spool.id).toBeTruthy()
  })

  it("createSpool generates a unique UUID", () => {
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    store.getState().createSpool({ name: "Blue", hex: "#0000FF" })
    const ids = [...store.getState().spools.values()].map((s) => s.id)
    expect(ids[0]).not.toBe(ids[1])
  })

  it("updateSpool creates a new Map reference (immutability)", () => {
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    const before = store.getState().spools
    const id = [...before.keys()][0]
    store.getState().updateSpool(id, { name: "Dark Red" })
    const after = store.getState().spools
    expect(before).not.toBe(after)
    expect(after.get(id)?.name).toBe("Dark Red")
  })

  it("updateSpool preserves unmodified fields", () => {
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    const id = [...store.getState().spools.keys()][0]
    store.getState().updateSpool(id, { name: "Dark Red" })
    expect(store.getState().spools.get(id)?.hex).toBe("#FF0000")
  })

  it("updateSpool is a no-op for unknown id", () => {
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    const before = store.getState().spools
    store.getState().updateSpool("nonexistent", { name: "X" })
    expect(store.getState().spools).toBe(before)
  })

  it("deleteSpool removes from Map", () => {
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    const id = [...store.getState().spools.keys()][0]
    store.getState().deleteSpool(id)
    expect(store.getState().spools.size).toBe(0)
  })

  it("deleteSpool with a replacement remaps figures and carries printed counts", () => {
    const green = createSpool({ id: "green" })
    const olive = createSpool({ id: "olive" })
    const red = createSpool({ id: "red" })
    const swap = createFigure({ id: "swap", requiredColors: ["green", "red"] })
    const both = createFigure({
      id: "both",
      requiredColors: ["olive", "green"],
    })
    const swapItem = createQueueItem({
      id: "q1",
      figureId: "swap",
      quantity: 2,
      completedCounts: { green: 2, red: 2 },
      completedAt: null,
    })
    const bothItem = createQueueItem({
      id: "q2",
      figureId: "both",
      quantity: 2,
      completedCounts: { green: 2, olive: 1 },
      completedAt: null,
    })
    store.setState({
      spools: new Map([green, olive, red].map((s) => [s.id, s])),
      figures: new Map([swap, both].map((f) => [f.id, f])),
      queueItems: new Map([swapItem, bothItem].map((q) => [q.id, q])),
    })

    store.getState().deleteSpool("green", "olive")

    const state = store.getState()
    expect(state.spools.has("green")).toBe(false)
    expect(state.figures.get("swap")?.requiredColors).toEqual(["olive", "red"])
    expect(state.figures.get("both")?.requiredColors).toEqual(["olive"])
    expect(state.queueItems.get("q1")?.completedCounts).toEqual({
      olive: 2,
      red: 2,
    })
    expect(state.queueItems.get("q1")?.completedAt).not.toBeNull()
    expect(state.queueItems.get("q2")?.completedCounts).toEqual({ olive: 1 })
    expect(state.queueItems.get("q2")?.completedAt).toBeNull()
  })

  it("createFigure adds a figure with UUID and correct data", () => {
    store.getState().createFigure({
      name: "Naruto",
      brandId: "brand-1",
      size: 75,
      notes: "test note",
      requiredColors: ["spool-1"],
    })
    const figures = store.getState().figures
    expect(figures.size).toBe(1)
    const figure = [...figures.values()][0]
    expect(figure.name).toBe("Naruto")
    expect(figure.brandId).toBe("brand-1")
    expect(figure.size).toBe(75)
    expect(figure.notes).toBe("test note")
    expect(figure.requiredColors).toEqual(["spool-1"])
    expect(figure.id).toBeTruthy()
  })

  it("createFigure generates a unique UUID", () => {
    store.getState().createFigure({
      name: "Naruto",
      brandId: null,
      size: 60,
      notes: "",
      requiredColors: [],
    })
    store.getState().createFigure({
      name: "Goku",
      brandId: null,
      size: 60,
      notes: "",
      requiredColors: [],
    })
    const ids = [...store.getState().figures.values()].map((f) => f.id)
    expect(ids[0]).not.toBe(ids[1])
  })

  it("updateFigure modifies name, brandId, size, notes, and requiredColors", () => {
    store.getState().createFigure({
      name: "Naruto",
      brandId: null,
      size: 60,
      notes: "",
      requiredColors: [],
    })
    const id = [...store.getState().figures.keys()][0]
    store.getState().updateFigure(id, {
      name: "Naruto Uzumaki",
      brandId: "brand-1",
      size: 80,
      notes: "updated",
      requiredColors: ["s1", "s2"],
    })
    const figure = store.getState().figures.get(id)
    expect(figure?.name).toBe("Naruto Uzumaki")
    expect(figure?.brandId).toBe("brand-1")
    expect(figure?.size).toBe(80)
    expect(figure?.notes).toBe("updated")
    expect(figure?.requiredColors).toEqual(["s1", "s2"])
  })

  it("updateFigure is a no-op for unknown id", () => {
    store.getState().createFigure({
      name: "Naruto",
      brandId: null,
      size: 60,
      notes: "",
      requiredColors: [],
    })
    const before = store.getState().figures
    store.getState().updateFigure("nonexistent", { name: "X" })
    expect(store.getState().figures).toBe(before)
  })

  it("updateFigure keeps the queueItems Map reference unchanged when no completedAt shifts", () => {
    // counts untouched by a color edit; completedAt null before and after
    const figure = createFigure({ id: "fig-1", requiredColors: ["s1", "s2"] })
    const queueItem = createQueueItem({
      id: "q1",
      figureId: figure.id,
      completedCounts: { s1: 1 },
      completedAt: null,
    })
    const queueItems = new Map([[queueItem.id, queueItem]])

    store.setState({
      figures: new Map([[figure.id, figure]]),
      queueItems,
    })

    store.getState().updateFigure(figure.id, {
      requiredColors: ["s1", "s3"],
    })

    expect(store.getState().queueItems).toBe(queueItems)
    expect(store.getState().queueItems.get(queueItem.id)).toEqual(queueItem)
  })

  it("updateFigure cascade: removing the only incomplete color completes referencing items in the same update", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-29T12:00:00.000Z"))

    const figure = createFigure({ id: "fig-1", requiredColors: ["s1", "s2"] })
    const queueItem = createQueueItem({
      id: "q1",
      figureId: figure.id,
      completedCounts: { s1: 1 },
      completedAt: null,
    })
    store.setState({
      figures: new Map([[figure.id, figure]]),
      queueItems: new Map([[queueItem.id, queueItem]]),
    })

    let notifications = 0
    const unsubscribe = store.subscribe(() => {
      notifications += 1
    })
    try {
      store.getState().updateFigure(figure.id, { requiredColors: ["s1"] })
      expect(notifications).toBe(1)
    } finally {
      unsubscribe()
    }

    expect(store.getState().queueItems.get("q1")?.completedAt).toBe(
      "2026-08-29T12:00:00.000Z"
    )
    expect(store.getState().queueItems.get("q1")?.completedCounts).toEqual({
      s1: 1,
    })

    vi.useRealTimers()
  })

  it("updateFigure cascade: adding a color un-completes referencing items in the same update", () => {
    const figure = createFigure({ id: "fig-1", requiredColors: ["s1"] })
    const queueItem = createQueueItem({
      id: "q1",
      figureId: figure.id,
      completedCounts: { s1: 1 },
      completedAt: "2026-08-01T10:00:00.000Z",
    })
    store.setState({
      figures: new Map([[figure.id, figure]]),
      queueItems: new Map([[queueItem.id, queueItem]]),
    })

    let notifications = 0
    const unsubscribe = store.subscribe(() => {
      notifications += 1
    })
    try {
      store.getState().updateFigure(figure.id, { requiredColors: ["s1", "s2"] })
      expect(notifications).toBe(1)
    } finally {
      unsubscribe()
    }

    expect(store.getState().queueItems.get("q1")?.completedAt).toBeNull()
  })

  it("announces the references of Ready orders returned to active work by a live color edit", () => {
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "WEB-42",
    })
    const first = createSpool({ id: "s1" })
    const added = createSpool({ id: "s2" })
    const figure = createFigure({ id: "fig-1", requiredColors: [first.id] })
    const queueItem = createQueueItem({
      id: "q1",
      figureId: figure.id,
      orderId: order.id,
      completedCounts: { [first.id]: 1 },
      completedAt: "2026-08-01T10:00:00.000Z",
    })
    store.setState({
      spools: new Map([
        [first.id, first],
        [added.id, added],
      ]),
      figures: new Map([[figure.id, figure]]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([[queueItem.id, queueItem]]),
      announcement: "",
    })

    store.getState().updateFigure(figure.id, {
      requiredColors: [first.id, added.id],
    })

    expect(
      store.getState().queueItems.get(queueItem.id)?.completedAt
    ).toBeNull()
    expect(store.getState().announcement).toContain("WEB-42")
  })

  it("increments the announcement version even when the message text repeats", () => {
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "WEB-42",
    })
    const first = createSpool({ id: "s1" })
    const added = createSpool({ id: "s2" })
    const figure = createFigure({ id: "fig-1", requiredColors: [first.id] })
    const queueItem = createQueueItem({
      id: "q1",
      figureId: figure.id,
      orderId: order.id,
    })
    store.setState({
      spools: new Map([
        [first.id, first],
        [added.id, added],
      ]),
      figures: new Map([[figure.id, figure]]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([[queueItem.id, queueItem]]),
      announcement: "",
      announcementVersion: 0,
    })

    store.getState().updateFigure(figure.id, {
      requiredColors: [first.id, added.id],
    })
    const firstMessage = store.getState().announcement
    expect(store.getState().announcementVersion).toBe(1)

    store.getState().updateFigure(figure.id, {
      requiredColors: [first.id, added.id],
    })
    expect(store.getState().announcement).toBe(firstMessage)
    expect(store.getState().announcementVersion).toBe(2)
  })

  it("deleteFigure removes figure from figures Map", () => {
    const figure = createFigure({ id: "fig-1" })
    store.setState({ figures: new Map([["fig-1", figure]]) })
    store.getState().deleteFigure("fig-1")
    expect(store.getState().figures.size).toBe(0)
  })

  it("deleteFigure cascades: removes all queue items referencing the figure", () => {
    const figure = createFigure({ id: "fig-1" })
    const q1 = createQueueItem({ id: "q1", figureId: "fig-1" })
    const q2 = createQueueItem({ id: "q2", figureId: "fig-1" })
    store.setState({
      figures: new Map([["fig-1", figure]]),
      queueItems: new Map([
        ["q1", q1],
        ["q2", q2],
      ]),
    })
    store.getState().deleteFigure("fig-1")
    expect(store.getState().figures.size).toBe(0)
    expect(store.getState().queueItems.size).toBe(0)
  })

  it("announces affected order references when a figure cascade removes lines", () => {
    const figure = createFigure({ id: "fig-1" })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "WEB-42",
    })
    const row = createQueueItem({
      id: "q1",
      figureId: figure.id,
      orderId: order.id,
    })
    store.setState({
      figures: new Map([[figure.id, figure]]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([[row.id, row]]),
      announcement: "",
      announcementVersion: 0,
    })

    store.getState().deleteFigure(figure.id)

    expect(store.getState().announcement).toContain("WEB-42")
    expect(store.getState().announcementVersion).toBe(1)
  })

  it("deleteFigure does not affect queue items for other figures", () => {
    const fig1 = createFigure({ id: "fig-1" })
    const fig2 = createFigure({ id: "fig-2" })
    const q1 = createQueueItem({ id: "q1", figureId: "fig-1" })
    const q2 = createQueueItem({ id: "q2", figureId: "fig-2" })
    store.setState({
      figures: new Map([
        ["fig-1", fig1],
        ["fig-2", fig2],
      ]),
      queueItems: new Map([
        ["q1", q1],
        ["q2", q2],
      ]),
    })
    store.getState().deleteFigure("fig-1")
    expect(store.getState().queueItems.size).toBe(1)
    expect(store.getState().queueItems.get("q2")).toEqual(q2)
  })

  it("deleteFigure is a no-op for non-existent figure ID", () => {
    const figure = createFigure({ id: "fig-1" })
    store.setState({ figures: new Map([["fig-1", figure]]) })
    const beforeFigures = store.getState().figures
    const beforeQueue = store.getState().queueItems
    store.getState().deleteFigure("nonexistent")
    expect(store.getState().figures.size).toBe(1)
    expect([...store.getState().figures.values()]).toEqual([figure])
    // References must be identical — true no-op avoids spurious persistence writes
    expect(store.getState().figures).toBe(beforeFigures)
    expect(store.getState().queueItems).toBe(beforeQueue)
  })
})

describe("brand mutations", () => {
  it("createBrand mints a brand with the trimmed name and returns its id", () => {
    const id = store.getState().createBrand("  One Piece  ")
    expect(id).toBeTruthy()
    const brands = store.getState().brands
    expect(brands.size).toBe(1)
    expect(brands.get(id!)).toEqual({ id, name: "One Piece" })
  })

  it("createBrand returns null for an empty or whitespace-only name", () => {
    expect(store.getState().createBrand("")).toBeNull()
    expect(store.getState().createBrand("   ")).toBeNull()
    expect(store.getState().brands.size).toBe(0)
  })

  it("createBrand matches an existing brand case-insensitively and returns its id", () => {
    const first = store.getState().createBrand("Naruto")
    const second = store.getState().createBrand("naruto")
    const third = store.getState().createBrand("  NARUTO ")

    expect(second).toBe(first)
    expect(third).toBe(first)
    expect(store.getState().brands.size).toBe(1)
    expect(store.getState().brands.get(first!)?.name).toBe("Naruto")
  })

  it("createBrand does not touch state when matching an existing brand", () => {
    store.getState().createBrand("Naruto")
    const before = store.getState().brands
    store.getState().createBrand("naruto")
    expect(store.getState().brands).toBe(before)
  })

  it("createBrand generates unique UUIDs for distinct names", () => {
    const a = store.getState().createBrand("Naruto")
    const b = store.getState().createBrand("One Piece")
    expect(a).not.toBe(b)
  })
})

describe("brand lifecycle commands", () => {
  const naruto = createBrand({ id: "b-naruto", name: "naruto" })
  const onePiece = createBrand({ id: "b-op", name: "One Piece" })

  /** Seed without persistence noise so writeStore calls belong to the command. */
  function seed(figures: ReturnType<typeof createFigure>[] = []) {
    setPersist(false)
    store.setState({
      brands: new Map([
        [naruto.id, naruto],
        [onePiece.id, onePiece],
      ]),
      figures: new Map(figures.map((figure) => [figure.id, figure])),
    })
    setPersist(true)
    vi.clearAllMocks()
  }

  function writtenStores() {
    return vi
      .mocked(db.writeStores)
      .mock.calls.flatMap((call) => Object.keys(call[0]))
      .sort()
  }

  function lastWrite(name: "brands" | "figures") {
    const call = vi
      .mocked(db.writeStores)
      .mock.calls.findLast((candidate) => candidate[0][name])
    return call?.[0][name]
  }

  /** The invariant every command must leave intact. */
  function expectUniqueNonBlankBrands() {
    const keys = [...store.getState().brands.values()].map((brand) => {
      expect(brand.name.trim().length).toBeGreaterThan(0)
      return brandKey(brand.name)
    })
    expect(new Set(keys).size).toBe(keys.length)
  }

  describe("renameBrand", () => {
    it("renames casing-only, preserving the id", () => {
      seed()
      const result = store.getState().renameBrand(naruto.id, "Naruto")

      expect(result).toEqual({ type: "renamed" })
      expect(store.getState().brands.get(naruto.id)).toEqual({
        id: naruto.id,
        name: "Naruto",
      })
      expect(store.getState().brands.size).toBe(2)
      expectUniqueNonBlankBrands()
    })

    it("stores the trimmed name", () => {
      seed()
      expect(store.getState().renameBrand(naruto.id, "  Naruto  ")).toEqual({
        type: "renamed",
      })
      expect(store.getState().brands.get(naruto.id)?.name).toBe("Naruto")
    })

    it("returns unchanged when the trimmed text equals the stored name", () => {
      seed()
      const before = store.getState().brands
      expect(store.getState().renameBrand(naruto.id, "  naruto  ")).toEqual({
        type: "unchanged",
      })
      expect(store.getState().brands).toBe(before)
      expect(db.writeStores).not.toHaveBeenCalled()
    })

    it("rejects an empty or whitespace-only name without mutating", () => {
      seed()
      const before = store.getState().brands
      expect(store.getState().renameBrand(naruto.id, "")).toEqual({
        type: "invalid",
      })
      expect(store.getState().renameBrand(naruto.id, "   ")).toEqual({
        type: "invalid",
      })
      expect(store.getState().brands).toBe(before)
      expect(db.writeStores).not.toHaveBeenCalled()
    })

    it("reports a collision with another brand and does not mutate", () => {
      seed()
      const before = store.getState().brands
      expect(store.getState().renameBrand(naruto.id, "  ONE PIECE ")).toEqual({
        type: "collision",
      })
      expect(store.getState().brands).toBe(before)
      expect(store.getState().brands.get(naruto.id)?.name).toBe("naruto")
      expectUniqueNonBlankBrands()
    })

    it("checks not-found before invalid", () => {
      seed()
      expect(store.getState().renameBrand("missing", "   ")).toEqual({
        type: "not-found",
      })
      expect(store.getState().renameBrand("missing", "Anything")).toEqual({
        type: "not-found",
      })
      expect(db.writeStores).not.toHaveBeenCalled()
    })

    it("writes only the brands store", () => {
      seed([createFigure({ id: "f1", brandId: naruto.id })])
      store.getState().renameBrand(naruto.id, "Naruto")

      expect(writtenStores()).toEqual(["brands"])
      expect(lastWrite("brands")?.get(naruto.id)).toEqual({
        id: naruto.id,
        name: "Naruto",
      })
    })

    it("heals an imported untrimmed name — same visible text is a rename", () => {
      const untrimmed = createBrand({ id: "b-untrimmed", name: "  Naruto  " })
      setPersist(false)
      store.setState({ brands: new Map([[untrimmed.id, untrimmed]]) })
      setPersist(true)
      vi.clearAllMocks()

      // trim(input) !== stored name, so this is `renamed`, not `unchanged`
      expect(store.getState().renameBrand(untrimmed.id, "Naruto")).toEqual({
        type: "renamed",
      })
      expect(store.getState().brands.get(untrimmed.id)?.name).toBe("Naruto")
      expectUniqueNonBlankBrands()
    })
  })

  describe("deleteBrand", () => {
    it("nulls every referencing figure, removes the brand, and counts them", () => {
      const f1 = createFigure({ id: "f1", brandId: naruto.id })
      const f2 = createFigure({ id: "f2", brandId: naruto.id })
      const f3 = createFigure({ id: "f3", brandId: onePiece.id })
      seed([f1, f2, f3])

      const result = store.getState().deleteBrand(naruto.id)

      expect(result).toEqual({ type: "deleted", detachedFigureCount: 2 })
      expect(store.getState().brands.has(naruto.id)).toBe(false)
      expect(store.getState().figures.get("f1")?.brandId).toBeNull()
      expect(store.getState().figures.get("f2")?.brandId).toBeNull()
      expect(store.getState().figures.get("f3")?.brandId).toBe(onePiece.id)
      expect(store.getState().figures.size).toBe(3)
      expectUniqueNonBlankBrands()
    })

    it("deletes a zero-figure brand with detachedFigureCount 0", () => {
      seed([createFigure({ id: "f1", brandId: onePiece.id })])

      expect(store.getState().deleteBrand(naruto.id)).toEqual({
        type: "deleted",
        detachedFigureCount: 0,
      })
      expect(store.getState().brands.has(naruto.id)).toBe(false)
      expect(store.getState().figures.get("f1")?.brandId).toBe(onePiece.id)
    })

    it("returns not-found for an unknown id without mutating", () => {
      seed([createFigure({ id: "f1", brandId: naruto.id })])
      const brands = store.getState().brands
      const figures = store.getState().figures

      expect(store.getState().deleteBrand("missing")).toEqual({
        type: "not-found",
      })
      expect(store.getState().brands).toBe(brands)
      expect(store.getState().figures).toBe(figures)
      expect(db.writeStores).not.toHaveBeenCalled()
    })

    it("leaves a figure whose brandId resolves to no brand untouched", () => {
      const orphan = createFigure({ id: "f-orphan", brandId: "gone" })
      seed([orphan, createFigure({ id: "f1", brandId: naruto.id })])

      store.getState().deleteBrand(naruto.id)

      expect(store.getState().figures.get("f-orphan")).toEqual(orphan)
      expect(store.getState().figures.get("f1")?.brandId).toBeNull()
    })

    it("cascades in both store state and persisted contents", () => {
      seed([createFigure({ id: "f1", brandId: naruto.id })])

      store.getState().deleteBrand(naruto.id)

      expect(writtenStores()).toEqual(["brands", "figures"])
      expect(lastWrite("brands")?.has(naruto.id)).toBe(false)
      const persistedFigures = lastWrite("figures") as
        | Map<string, Figure>
        | undefined
      expect(persistedFigures?.get("f1")?.brandId).toBeNull()
    })
  })

  it("delete applies brands+figures in a single set()", () => {
    // Two writeStore calls cannot tell one set() from two — count the store's
    // own notifications instead (CAP-5).
    seed([createFigure({ id: "f1", brandId: naruto.id })])

    let notifications = 0
    const unsubscribe = store.subscribe(() => {
      notifications += 1
    })

    try {
      store.getState().deleteBrand(naruto.id)
      expect(notifications).toBe(1)
    } finally {
      unsubscribe()
    }

    expect(store.getState().brands.has(naruto.id)).toBe(false)
    expect(store.getState().figures.get("f1")?.brandId).toBeNull()
  })

  it("a delete whose figures write rejects notifies and converges on retry", async () => {
    seed([createFigure({ id: "f1", brandId: naruto.id })])
    vi.mocked(db.writeStores).mockRejectedValueOnce(new Error("IDB failure"))

    store.getState().deleteBrand(naruto.id)

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())

    const actionArg = (toast.error as Mock).mock.calls[0][1]
    vi.mocked(db.replaceAll).mockClear()
    vi.mocked(db.replaceAll).mockResolvedValue(undefined)
    actionArg.action.onClick()

    await vi.waitFor(() =>
      expect(toast.dismiss).toHaveBeenCalledWith("persistence-failure")
    )

    const retry = vi.mocked(db.replaceAll).mock.calls[0][0]
    expect(retry.brands[naruto.id]).toBeUndefined()
    expect(retry.figures.f1.brandId).toBeNull()
  })
})

describe("order mutations", () => {
  it("creates trimmed optional fields and enforces case-insensitive references", () => {
    const created = store.getState().createOrder({
      reference: "  WEB-42  ",
      customerName: "  Ada  ",
      platform: " Etsy ",
      notes: "  fragile  ",
    })
    expect(created).toMatchObject({
      type: "created",
      order: {
        reference: "WEB-42",
        customerName: "Ada",
        platform: "Etsy",
        notes: "fragile",
      },
    })
    expect(store.getState().createOrder({ reference: " web-42 " })).toEqual({
      type: "collision",
    })
  })

  it("updates an order without changing its id or creation timestamp", () => {
    const original = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "ORD-001",
    })
    store.setState({ orders: new Map([[original.id, original]]) })

    const result = store.getState().updateOrder(original.id, {
      reference: "CUSTOM-7",
      dueDate: "2026-09-10",
    })

    expect(result).toMatchObject({
      type: "updated",
      order: {
        id: original.id,
        createdAt: original.createdAt,
        reference: "CUSTOM-7",
        dueDate: "2026-09-10",
      },
    })
    expect(
      store.getState().updateOrder(original.id, { dueDate: "2026-02-30" })
    ).toEqual({ type: "invalid", field: "dueDate" })
  })

  it("clears nullable order fields when an update explicitly passes null", () => {
    const original = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      customerName: "Ada",
      platform: "Etsy",
      dueDate: "2026-09-10",
    })
    store.setState({ orders: new Map([[original.id, original]]) })

    const result = store.getState().updateOrder(original.id, {
      customerName: null,
      platform: null,
      dueDate: null,
    })

    expect(result).toMatchObject({
      type: "updated",
      order: { customerName: null, platform: null, dueDate: null },
    })
  })

  it("deletes an order and all of its queue lines in one mutation", () => {
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
    })
    const linked = createQueueItem({ id: "linked", orderId: order.id })
    const stock = createQueueItem({ id: "stock" })
    store.setState({
      orders: new Map([[order.id, order]]),
      queueItems: new Map([
        [linked.id, linked],
        [stock.id, stock],
      ]),
    })

    expect(store.getState().deleteOrder(order.id)).toEqual({
      type: "deleted",
      removedLines: 1,
    })
    expect(store.getState().orders).toEqual(new Map())
    expect([...store.getState().queueItems.keys()]).toEqual([stock.id])
  })

  it("duplicates lines under a unique editable reference at zero progress", () => {
    const source = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "ORD-009",
    })
    const row = createQueueItem({
      id: "source-line",
      figureId: "figure",
      orderId: source.id,
      quantity: 3,
      completedCounts: { red: 3 },
      completedAt: "2026-08-30T10:00:00.000Z",
    })
    store.setState({
      orders: new Map([[source.id, source]]),
      queueItems: new Map([[row.id, row]]),
    })

    const result = store.getState().duplicateOrder(source.id)
    expect(result).toMatchObject({
      type: "duplicated",
      order: { reference: "ORD-010" },
      lines: 1,
    })
    if (result.type !== "duplicated") throw new Error("expected duplicate")
    const fresh = [...store.getState().queueItems.values()].find(
      (item) => item.orderId === result.order.id
    )!
    expect(fresh).toMatchObject({
      figureId: "figure",
      quantity: 3,
      completedCounts: {},
      completedAt: null,
    })
    expect(store.getState().queueItems.get(row.id)).toEqual(row)
  })

  it("preserves duplicate-order totals above 99 by splitting zero-progress lines", () => {
    const source = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "ORD-009",
    })
    const first = createQueueItem({
      id: "source-a",
      figureId: "figure",
      orderId: source.id,
      quantity: 70,
    })
    const second = createQueueItem({
      id: "source-b",
      figureId: "figure",
      orderId: source.id,
      quantity: 50,
    })
    store.setState({
      orders: new Map([[source.id, source]]),
      queueItems: new Map([
        [first.id, first],
        [second.id, second],
      ]),
    })

    const result = store.getState().duplicateOrder(source.id)
    expect(result).toMatchObject({ type: "duplicated", lines: 2 })
    if (result.type !== "duplicated") throw new Error("expected duplicate")
    const copied = [...store.getState().queueItems.values()].filter(
      (row) => row.orderId === result.order.id
    )
    expect(copied.map((row) => row.quantity).toSorted((a, b) => b - a)).toEqual(
      [99, 21]
    )
    expect(copied.reduce((sum, row) => sum + row.quantity, 0)).toBe(120)
    expect(copied.every((row) => row.completedAt === null)).toBe(true)
  })
})

describe("queue mutations", () => {
  const TEST_ORDER_ID = "00000000-0000-4000-8000-000000000001"

  function orderTarget(): string {
    if (!store.getState().orders.has(TEST_ORDER_ID)) {
      const order = createOrder({ id: TEST_ORDER_ID })
      const wasPersisting = getPersist()
      setPersist(false)
      store.setState({
        orders: new Map([...store.getState().orders, [order.id, order]]),
      })
      setPersist(wasPersisting)
    }
    return TEST_ORDER_ID
  }

  /** Seed a figure so queue commands pass their figure guards. */
  function seedFigure(
    id = "fig-1",
    requiredColors: string[] = ["s1"]
  ): ReturnType<typeof createFigure> {
    const figure = createFigure({ id, requiredColors })
    const wasPersisting = getPersist()
    setPersist(false)
    store.setState({
      figures: new Map([...store.getState().figures, [figure.id, figure]]),
    })
    setPersist(wasPersisting)
    return figure
  }

  describe("removeFromQueue", () => {
    it("removes the correct item", () => {
      const q1 = createQueueItem({ id: "q1", figureId: "fig-1" })
      const q2 = createQueueItem({ id: "q2", figureId: "fig-2" })
      store.setState({
        queueItems: new Map([
          ["q1", q1],
          ["q2", q2],
        ]),
      })
      store.getState().removeFromQueue("q1")
      expect(store.getState().queueItems.size).toBe(1)
      expect(store.getState().queueItems.has("q1")).toBe(false)
      expect(store.getState().queueItems.get("q2")).toEqual(q2)
    })

    it("is a no-op for non-existent ID", () => {
      const q1 = createQueueItem({ id: "q1" })
      store.setState({ queueItems: new Map([["q1", q1]]) })
      const before = store.getState().queueItems
      store.getState().removeFromQueue("nonexistent")
      expect(store.getState().queueItems).toBe(before)
    })
  })

  describe("clearQueue", () => {
    function seedMixedQueue() {
      const spool = createSpool({ id: "s1" })
      const figure = createFigure({ id: "fig", requiredColors: ["s1"] })
      const active = createOrder({ id: "o-active", reference: "ORD-001" })
      const ready = createOrder({ id: "o-ready", reference: "ORD-002" })
      const rows = [
        createQueueItem({ id: "stock-open", figureId: "fig" }),
        createQueueItem({
          id: "stock-done",
          figureId: "fig",
          completedCounts: { s1: 1 },
        }),
        createQueueItem({
          id: "active-open",
          figureId: "fig",
          orderId: "o-active",
        }),
        createQueueItem({
          id: "active-finished",
          figureId: "fig",
          orderId: "o-active",
          completedCounts: { s1: 1 },
        }),
        createQueueItem({
          id: "ready-line",
          figureId: "fig",
          orderId: "o-ready",
          completedCounts: { s1: 1 },
        }),
      ]
      store.setState({
        spools: new Map([["s1", spool]]),
        figures: new Map([["fig", figure]]),
        orders: new Map([
          [active.id, active],
          [ready.id, ready],
        ]),
        queueItems: new Map(rows.map((row) => [row.id, row])),
      })
    }

    it("removes every Queue line but keeps Completed history and orders", () => {
      seedMixedQueue()
      expect(store.getState().clearQueue({ kind: "all" })).toBe(3)
      expect([...store.getState().queueItems.keys()].sort()).toEqual([
        "ready-line",
        "stock-done",
      ])
      expect(store.getState().orders.size).toBe(2)
    })

    it("only touches lines inside the given scope", () => {
      seedMixedQueue()
      expect(store.getState().clearQueue({ kind: "stock" })).toBe(1)
      expect(store.getState().queueItems.has("stock-open")).toBe(false)
      expect(store.getState().queueItems.has("active-open")).toBe(true)
    })

    it("is a no-op when nothing is queued in scope", () => {
      seedMixedQueue()
      const before = store.getState().queueItems
      expect(
        store.getState().clearQueue({ kind: "order", orderId: "o-ready" })
      ).toBe(0)
      expect(store.getState().queueItems).toBe(before)
    })
  })

  describe("toggleChip", () => {
    it("advances a color's count by one at quantity 1 (toggle parity)", () => {
      seedFigure("fig-1", ["spool-1", "spool-2"])
      const q1 = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        completedCounts: {},
      })
      store.setState({ queueItems: new Map([["q1", q1]]) })
      store.getState().toggleChip("q1", "spool-1")
      expect(
        store.getState().queueItems.get("q1")?.completedCounts["spool-1"]
      ).toBe(1)
    })

    it("cycles a full color back to 0 at quantity 1 (untoggle parity)", () => {
      seedFigure("fig-1", ["spool-1", "spool-2"])
      const q1 = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        completedCounts: { "spool-1": 1, "spool-2": 1 },
      })
      store.setState({ queueItems: new Map([["q1", q1]]) })
      store.getState().toggleChip("q1", "spool-1")
      expect(store.getState().queueItems.get("q1")?.completedCounts).toEqual({
        "spool-1": 0,
        "spool-2": 1,
      })
    })

    it("cycles 0 -> 1 -> 2 -> 0 at quantity 2, driving completedAt", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-08-29T12:00:00.000Z"))

      seedFigure("fig-1", ["s1"])
      const q1 = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        quantity: 2,
        completedCounts: {},
      })
      store.setState({ queueItems: new Map([["q1", q1]]) })

      store.getState().toggleChip("q1", "s1")
      expect(store.getState().queueItems.get("q1")?.completedCounts.s1).toBe(1)
      expect(store.getState().queueItems.get("q1")?.completedAt).toBeNull()

      store.getState().toggleChip("q1", "s1")
      expect(store.getState().queueItems.get("q1")?.completedCounts.s1).toBe(2)
      expect(store.getState().queueItems.get("q1")?.completedAt).toBe(
        "2026-08-29T12:00:00.000Z"
      )

      store.getState().toggleChip("q1", "s1")
      expect(store.getState().queueItems.get("q1")?.completedCounts.s1).toBe(0)
      expect(store.getState().queueItems.get("q1")?.completedAt).toBeNull()

      vi.useRealTimers()
    })

    it("sets completedAt exactly when the last color reaches quantity", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-03-31T12:00:00.000Z"))

      seedFigure("fig-1", ["s1", "s2"])
      const q1 = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        quantity: 2,
        completedCounts: { s1: 2, s2: 1 },
      })
      store.setState({ queueItems: new Map([["q1", q1]]) })

      store.getState().toggleChip("q1", "s2")

      expect(store.getState().queueItems.get("q1")?.completedAt).toBe(
        "2026-03-31T12:00:00.000Z"
      )

      vi.useRealTimers()
    })

    it("clears a stored completedAt when a complete entry cycles past full", () => {
      // canonical rule, cleared branch: not complete → null
      seedFigure("fig-1", ["s1"])
      const q1 = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        quantity: 1,
        completedCounts: { s1: 1 },
        completedAt: "2026-08-01T10:00:00.000Z",
      })
      store.setState({ queueItems: new Map([["q1", q1]]) })

      store.getState().toggleChip("q1", "s1")
      expect(store.getState().queueItems.get("q1")?.completedAt).toBeNull()
    })

    it("preserves an existing completedAt when a mutation leaves the entry complete", () => {
      // canonical rule, preserved branch: still complete → existing stamp,
      // never re-stamped with now. Removing one of two fully-completed
      // required colors keeps the entry complete.
      const figure = seedFigure("fig-1", ["s1", "s2"])
      const q1 = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        quantity: 1,
        completedCounts: { s1: 1, s2: 1 },
        completedAt: "2026-08-01T10:00:00.000Z",
      })
      store.setState({ queueItems: new Map([["q1", q1]]) })

      store.getState().updateFigure(figure.id, { requiredColors: ["s1"] })

      expect(store.getState().queueItems.get("q1")?.completedAt).toBe(
        "2026-08-01T10:00:00.000Z"
      )
    })

    it("is a no-op for a non-existent queue item", () => {
      seedFigure("fig-1", ["s1"])
      const q1 = createQueueItem({ id: "q1", figureId: "fig-1" })
      store.setState({ queueItems: new Map([["q1", q1]]) })
      const before = store.getState().queueItems
      store.getState().toggleChip("nonexistent", "s1")
      expect(store.getState().queueItems).toBe(before)
    })

    it("is a no-op when the figure is missing", () => {
      const q1 = createQueueItem({ id: "q1", figureId: "fig-gone" })
      store.setState({ queueItems: new Map([["q1", q1]]) })
      const before = store.getState().queueItems
      store.getState().toggleChip("q1", "s1")
      expect(store.getState().queueItems).toBe(before)
    })

    it("is a no-op for a spool outside the figure's requiredColors", () => {
      seedFigure("fig-1", ["s1"])
      const q1 = createQueueItem({ id: "q1", figureId: "fig-1" })
      store.setState({ queueItems: new Map([["q1", q1]]) })
      const before = store.getState().queueItems
      vi.clearAllMocks()
      store.getState().toggleChip("q1", "s-unknown")
      expect(store.getState().queueItems).toBe(before)
      expect(db.writeStores).not.toHaveBeenCalled()
    })
  })

  describe("setQuantity", () => {
    it("updates the quantity of an active entry", () => {
      seedFigure("fig-1", ["s1"])
      const q1 = createQueueItem({ id: "q1", figureId: "fig-1", quantity: 1 })
      store.setState({ queueItems: new Map([["q1", q1]]) })

      expect(store.getState().setQuantity("q1", 5)).toEqual({
        type: "updated",
        completed: false,
      })
      expect(store.getState().queueItems.get("q1")?.quantity).toBe(5)
    })

    it("clamps integer input to 1..99", () => {
      seedFigure("fig-1", ["s1"])
      const q1 = createQueueItem({ id: "q1", figureId: "fig-1", quantity: 5 })
      store.setState({ queueItems: new Map([["q1", q1]]) })

      store.getState().setQuantity("q1", 0)
      expect(store.getState().queueItems.get("q1")?.quantity).toBe(1)
      store.getState().setQuantity("q1", 500)
      expect(store.getState().queueItems.get("q1")?.quantity).toBe(99)
    })

    it("rejects NaN, Infinity, and 1.5 without mutating", () => {
      seedFigure("fig-1", ["s1"])
      const q1 = createQueueItem({ id: "q1", figureId: "fig-1", quantity: 2 })
      store.setState({ queueItems: new Map([["q1", q1]]) })
      const before = store.getState().queueItems

      for (const quantity of [NaN, Infinity, 1.5]) {
        expect(store.getState().setQuantity("q1", quantity)).toEqual({
          type: "invalid",
        })
      }
      expect(store.getState().queueItems).toBe(before)
    })

    it("returns not-active for a completed-by-derivation entry", () => {
      seedFigure("fig-1", ["s1"])
      const q1 = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        quantity: 1,
        completedCounts: { s1: 1 },
      })
      store.setState({ queueItems: new Map([["q1", q1]]) })

      expect(store.getState().setQuantity("q1", 2)).toEqual({
        type: "not-active",
      })
      expect(store.getState().queueItems.get("q1")).toEqual(q1)
    })

    it("returns not-found for a missing entry", () => {
      expect(store.getState().setQuantity("missing", 2)).toEqual({
        type: "not-found",
      })
    })

    it("lowering 2 -> 1 clamps counts and completes when every color reaches 1", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-08-29T12:00:00.000Z"))

      seedFigure("fig-1", ["red", "gold"])
      const q1 = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        quantity: 2,
        completedCounts: { red: 2, gold: 1 },
      })
      store.setState({ queueItems: new Map([["q1", q1]]) })

      expect(store.getState().setQuantity("q1", 1)).toEqual({
        type: "updated",
        completed: true,
      })
      const updated = store.getState().queueItems.get("q1")!
      expect(updated.completedCounts).toEqual({ red: 1, gold: 1 })
      expect(updated.completedAt).toBe("2026-08-29T12:00:00.000Z")

      vi.useRealTimers()
    })

    it("lowering that does not complete reports completed: false", () => {
      seedFigure("fig-1", ["red", "gold"])
      const q1 = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        quantity: 3,
        completedCounts: { red: 3 },
      })
      store.setState({ queueItems: new Map([["q1", q1]]) })

      expect(store.getState().setQuantity("q1", 2)).toEqual({
        type: "updated",
        completed: false,
      })
      expect(store.getState().queueItems.get("q1")?.completedCounts).toEqual({
        red: 2,
      })
      expect(store.getState().queueItems.get("q1")?.completedAt).toBeNull()
    })
  })

  describe("addBatchToQueue", () => {
    it("queues the whole batch in one store update (one write per map)", () => {
      seedFigure("fig-a", ["s1"])
      seedFigure("fig-b", ["s2"])
      seedFigure("fig-c", ["s1", "s2"])
      const orderId = orderTarget()
      vi.clearAllMocks()

      let notifications = 0
      const unsubscribe = store.subscribe(() => {
        notifications += 1
      })
      let result
      try {
        result = store.getState().addBatchToQueue(
          [
            { figureId: "fig-a", quantity: 2 },
            { figureId: "fig-b", quantity: 1 },
            { figureId: "fig-c", quantity: 1 },
          ],
          orderId
        )
        expect(notifications).toBe(1)
      } finally {
        unsubscribe()
      }

      expect(result).toEqual({
        type: "queued",
        pieces: 4,
        created: 3,
        merged: 0,
        skipped: [],
      })
      const items = [...store.getState().queueItems.values()]
      expect(items).toHaveLength(3)
      expect(items.every((qi) => qi.orderId === TEST_ORDER_ID)).toBe(true)
      expect(items.find((qi) => qi.figureId === "fig-a")?.quantity).toBe(2)
      expect(
        vi
          .mocked(db.writeStores)
          .mock.calls.filter((call) => call[0].queueItems)
      ).toHaveLength(1)
    })

    it("sums duplicate figure lines before applying", () => {
      seedFigure("fig-a", ["s1"])

      const result = store.getState().addBatchToQueue(
        [
          { figureId: "fig-a", quantity: 1 },
          { figureId: "fig-a", quantity: 2 },
        ],
        orderTarget()
      )

      expect(result).toEqual({
        type: "queued",
        pieces: 3,
        created: 1,
        merged: 0,
        skipped: [],
      })
      expect([...store.getState().queueItems.values()][0].quantity).toBe(3)
    })

    it("an empty batch is a no-op", () => {
      const before = store.getState().queueItems
      expect(store.getState().addBatchToQueue([], TEST_ORDER_ID)).toEqual({
        type: "empty",
      })
      expect(store.getState().queueItems).toBe(before)
      expect(db.writeStores).not.toHaveBeenCalled()
    })

    it("skips every line when the target is a Ready historical order", () => {
      const figure = seedFigure("fig-a", ["s1"])
      const spool = createSpool({ id: "s1" })
      const order = createOrder({ id: TEST_ORDER_ID })
      const completed = createQueueItem({
        id: "completed",
        figureId: figure.id,
        orderId: order.id,
        completedCounts: { [spool.id]: 1 },
        completedAt: "2026-08-30T10:00:00.000Z",
      })
      store.setState({
        spools: new Map([[spool.id, spool]]),
        orders: new Map([[order.id, order]]),
        queueItems: new Map([[completed.id, completed]]),
      })

      expect(
        store
          .getState()
          .addBatchToQueue([{ figureId: figure.id, quantity: 1 }], order.id)
      ).toEqual({
        type: "queued",
        pieces: 0,
        created: 0,
        merged: 0,
        skipped: [figure.id],
      })
      expect(store.getState().queueItems).toEqual(
        new Map([[completed.id, completed]])
      )
    })

    it("skips missing and colorless figures and reports their ids", () => {
      seedFigure("fig-a", ["s1"])
      seedFigure("fig-colorless", [])

      const result = store.getState().addBatchToQueue(
        [
          { figureId: "fig-a", quantity: 1 },
          { figureId: "fig-colorless", quantity: 2 },
          { figureId: "fig-missing", quantity: 3 },
        ],
        orderTarget()
      )

      expect(result).toEqual({
        type: "queued",
        pieces: 1,
        created: 1,
        merged: 0,
        skipped: ["fig-colorless", "fig-missing"],
      })
      expect(store.getState().queueItems.size).toBe(1)
    })

    it("applies the merge rule per entry against existing active entries", () => {
      seedFigure("fig-a", ["s1"])
      seedFigure("fig-b", ["s1"])
      const existing = createQueueItem({
        id: "q1",
        figureId: "fig-a",
        orderId: orderTarget(),
        quantity: 1,
      })
      store.setState({ queueItems: new Map([["q1", existing]]) })

      const result = store.getState().addBatchToQueue(
        [
          { figureId: "fig-a", quantity: 2 },
          { figureId: "fig-b", quantity: 1 },
        ],
        orderTarget()
      )

      expect(result).toEqual({
        type: "queued",
        pieces: 3,
        created: 1,
        merged: 1,
        skipped: [],
      })
      expect(store.getState().queueItems.get("q1")?.quantity).toBe(3)
      expect(store.getState().queueItems.size).toBe(2)
    })

    it("a clamped merge counts only the applied delta: 98 + batch of 5 -> 99, pieces 1", () => {
      seedFigure("fig-a", ["s1"])
      const existing = createQueueItem({
        id: "q1",
        figureId: "fig-a",
        orderId: orderTarget(),
        quantity: 98,
      })
      store.setState({ queueItems: new Map([["q1", existing]]) })

      const result = store
        .getState()
        .addBatchToQueue([{ figureId: "fig-a", quantity: 5 }], orderTarget())

      expect(result).toEqual({
        type: "queued",
        pieces: 1,
        created: 0,
        merged: 1,
        skipped: [],
      })
      expect(store.getState().queueItems.get("q1")?.quantity).toBe(99)
    })

    it("reports a full merge target as skipped without claiming queued pieces", () => {
      seedFigure("fig-a", ["s1"])
      const existing = createQueueItem({
        id: "q1",
        figureId: "fig-a",
        orderId: orderTarget(),
        quantity: 99,
      })
      store.setState({ queueItems: new Map([[existing.id, existing]]) })
      const before = store.getState().queueItems

      const result = store
        .getState()
        .addBatchToQueue([{ figureId: "fig-a", quantity: 1 }], orderTarget())

      expect(result).toEqual({
        type: "queued",
        pieces: 0,
        created: 0,
        merged: 0,
        skipped: ["fig-a"],
      })
      expect(store.getState().queueItems).toBe(before)
    })

    it("a batch of only skipped entries mutates nothing", () => {
      const before = store.getState().queueItems
      vi.clearAllMocks()
      const result = store
        .getState()
        .addBatchToQueue(
          [{ figureId: "fig-missing", quantity: 1 }],
          TEST_ORDER_ID
        )
      expect(result).toEqual({
        type: "queued",
        pieces: 0,
        created: 0,
        merged: 0,
        skipped: ["fig-missing"],
      })
      expect(store.getState().queueItems).toBe(before)
      expect(db.writeStores).not.toHaveBeenCalled()
    })

    it("queues the sample order: 12 figures, 15 pieces, three entries at ×2", () => {
      const names = [
        "hagrid",
        "silente",
        "dobby",
        "minnie",
        "ash",
        "misty",
        "brok",
        "hulk",
        "batman",
        "buzz",
        "woody",
        "kratos",
      ]
      for (const name of names) seedFigure(`fig-${name}`, ["s1"])

      const entries = names.map((name) => ({
        figureId: `fig-${name}`,
        quantity: ["buzz", "woody", "kratos"].includes(name) ? 2 : 1,
      }))

      const result = store.getState().addBatchToQueue(entries, orderTarget())

      expect(result).toEqual({
        type: "queued",
        pieces: 15,
        created: 12,
        merged: 0,
        skipped: [],
      })
      const items = [...store.getState().queueItems.values()]
      expect(items).toHaveLength(12)
      expect(items.filter((qi) => qi.quantity === 2)).toHaveLength(3)
      expect(items.filter((qi) => qi.quantity === 1)).toHaveLength(9)
    })
  })

  describe("requeueCompleted", () => {
    function seedCompleted(quantity = 1) {
      seedFigure("fig-1", ["s1", "s2"])
      const q1 = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        orderId: null,
        quantity,
        completedCounts: { s1: quantity, s2: quantity },
        completedAt: "2026-08-01T10:00:00.000Z",
      })
      store.setState({ queueItems: new Map([["q1", q1]]) })
      return q1
    }

    it("creates a fresh entry at the source's full quantity; the source stays as history", () => {
      const source = seedCompleted(2)

      const result = store.getState().requeueCompleted("q1")

      expect(result).toEqual({
        type: "requeued",
        merged: false,
        quantity: 2,
        clamped: false,
      })
      const items = [...store.getState().queueItems.values()]
      expect(items).toHaveLength(2)
      const fresh = items.find((qi) => qi.id !== "q1")!
      expect(fresh.figureId).toBe("fig-1")
      expect(fresh.orderId).toBeNull()
      expect(fresh.quantity).toBe(2)
      expect(fresh.completedCounts).toEqual({})
      expect(fresh.completedAt).toBeNull()
      expect(store.getState().queueItems.get("q1")).toEqual(source)
    })

    it("merges into an existing active same-figure+type entry, counts untouched", () => {
      seedCompleted(2)
      const active = createQueueItem({
        id: "q0",
        figureId: "fig-1",
        orderId: null,
        quantity: 1,
        completedCounts: { s1: 1 },
      })
      store.setState({
        queueItems: new Map([...store.getState().queueItems, ["q0", active]]),
      })

      const result = store.getState().requeueCompleted("q1")

      expect(result).toEqual({
        type: "requeued",
        merged: true,
        quantity: 3,
        clamped: false,
      })
      expect(store.getState().queueItems.get("q0")?.quantity).toBe(3)
      expect(store.getState().queueItems.get("q0")?.completedCounts).toEqual({
        s1: 1,
      })
      expect(store.getState().queueItems.size).toBe(2)
    })

    it("clamps the merge at 99 and reports it", () => {
      seedCompleted(2)
      const active = createQueueItem({
        id: "q0",
        figureId: "fig-1",
        orderId: null,
        quantity: 98,
      })
      store.setState({
        queueItems: new Map([...store.getState().queueItems, ["q0", active]]),
      })

      expect(store.getState().requeueCompleted("q1")).toEqual({
        type: "requeued",
        merged: true,
        quantity: 99,
        clamped: true,
      })
      expect(store.getState().queueItems.get("q0")?.quantity).toBe(99)
    })

    it("returns not-found for a non-existent queue item", () => {
      const before = store.getState().queueItems
      expect(store.getState().requeueCompleted("nonexistent")).toEqual({
        type: "not-found",
      })
      expect(store.getState().queueItems).toBe(before)
    })

    it("returns not-found when the figure is gone (source not complete by derivation)", () => {
      const q1 = createQueueItem({ id: "q1", figureId: "fig-gone" })
      store.setState({ queueItems: new Map([["q1", q1]]) })
      const before = store.getState().queueItems
      expect(store.getState().requeueCompleted("q1")).toEqual({
        type: "not-found",
      })
      expect(store.getState().queueItems).toBe(before)
    })
  })
})

describe("persistence flag", () => {
  it("serializes rapid mutations with immutable snapshots in mutation order", async () => {
    let releaseFirst!: () => void
    const firstWrite = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    vi.mocked(db.writeStores)
      .mockImplementationOnce(() => firstWrite)
      .mockResolvedValue(undefined)

    const created = store
      .getState()
      .createOrder({ reference: "FIRST", customerName: "Ada" })
    if (created.type !== "created") throw new Error("expected create")
    store.getState().updateOrder(created.order.id, {
      reference: "SECOND",
      customerName: "Ada",
    })

    expect(db.writeStores).toHaveBeenCalledTimes(1)
    expect(
      vi.mocked(db.writeStores).mock.calls[0][0].orders?.get(created.order.id)
        ?.reference
    ).toBe("FIRST")

    releaseFirst()
    await drainPersistence()
    expect(db.writeStores).toHaveBeenCalledTimes(2)
    expect(
      vi.mocked(db.writeStores).mock.calls[1][0].orders?.get(created.order.id)
        ?.reference
    ).toBe("SECOND")
  })

  it("_persist = true triggers a transactional store write on mutation", () => {
    setPersist(true)
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    expect(db.writeStores).toHaveBeenCalledWith({ spools: expect.any(Map) })
  })

  it("_persist = false suppresses transactional writes on mutation", () => {
    setPersist(false)
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    expect(db.writeStores).not.toHaveBeenCalled()
  })

  it("brand creation writes the brands store", () => {
    setPersist(true)
    store.getState().createBrand("One Piece")
    expect(db.writeStores).toHaveBeenCalledWith({ brands: expect.any(Map) })
  })

  it("getPersist returns current flag value", () => {
    setPersist(false)
    expect(getPersist()).toBe(false)
    setPersist(true)
    expect(getPersist()).toBe(true)
  })
})

describe("serialization", () => {
  it("toJSON converts Maps to Records", () => {
    const spool = createSpool({ name: "Red", hex: "#FF0000" })
    const brand = createBrand({ name: "One Piece" })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      brands: new Map([[brand.id, brand]]),
    })
    const json = toJSON()
    expect(json.spools[spool.id]).toEqual(spool)
    expect(json.brands[brand.id]).toEqual(brand)
  })

  it("toJSON does not include dataGeneration", () => {
    expect("dataGeneration" in toJSON()).toBe(false)
  })

  it("fromJSON converts Records to Maps", () => {
    const spool = createSpool()
    const brand = createBrand()
    const figure = createFigure({ brandId: brand.id })
    const queueItem = createQueueItem({ figureId: figure.id })

    fromJSON({
      spools: { [spool.id]: spool },
      brands: { [brand.id]: brand },
      figures: { [figure.id]: figure },
      orders: {},
      queueItems: { [queueItem.id]: queueItem },
    })

    expect(store.getState().spools.get(spool.id)).toEqual(spool)
    expect(store.getState().brands.get(brand.id)).toEqual(brand)
    expect(store.getState().figures.get(figure.id)).toEqual(figure)
    expect(store.getState().queueItems.get(queueItem.id)).toEqual(queueItem)
  })

  it("fromJSON increments dataGeneration on every full replace", () => {
    const empty = {
      spools: {},
      brands: {},
      figures: {},
      orders: {},
      queueItems: {},
    }
    expect(store.getState().dataGeneration).toBe(0)
    fromJSON(empty)
    expect(store.getState().dataGeneration).toBe(1)
    fromJSON(empty)
    expect(store.getState().dataGeneration).toBe(2)
  })

  it("fromJSON backfills v3 defaults (quantity, counts, completedAt) for sparse rows", () => {
    const figure = createFigure()
    const sparseQueueItem: Pick<QueueItem, "id" | "figureId"> = {
      id: "q1",
      figureId: figure.id,
    }

    fromJSON({
      spools: {},
      brands: {},
      figures: { [figure.id]: figure },
      orders: {},
      queueItems: {
        [sparseQueueItem.id]: sparseQueueItem as unknown as QueueItem,
      },
    })

    const hydrated = store.getState().queueItems.get(sparseQueueItem.id)!
    expect(hydrated.quantity).toBe(1)
    expect(hydrated.completedCounts).toEqual({})
    expect(hydrated.completedAt).toBeNull()
  })

  it("toJSON → fromJSON roundtrip preserves data", () => {
    const spool = createSpool({ name: "Green", hex: "#00FF00" })
    const brand = createBrand({ name: "Sonic" })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      brands: new Map([[brand.id, brand]]),
    })
    const json = toJSON()
    resetStore()
    fromJSON(json)
    expect(store.getState().spools.get(spool.id)).toEqual(spool)
    expect(store.getState().brands.get(brand.id)).toEqual(brand)
  })
})

describe("persistence failure notification", () => {
  it("calls toast.error when a transaction rejects", async () => {
    vi.mocked(db.writeStores).mockRejectedValueOnce(new Error("IDB failure"))
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith(
      "Changes saved in memory but not persisted",
      expect.objectContaining({
        action: expect.objectContaining({ label: "Retry" }),
      })
    )
  })

  it("toast uses fixed ID and duration: Infinity", async () => {
    vi.mocked(db.writeStores).mockRejectedValueOnce(new Error("IDB failure"))
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        id: "persistence-failure",
        duration: Infinity,
      })
    )
  })

  it("a multi-store transaction reports one fixed-ID failure", async () => {
    const figure = createFigure({ id: "fig-1" })
    const queueItem = createQueueItem({ id: "q1", figureId: figure.id })

    setPersist(false)
    store.setState({
      figures: new Map([[figure.id, figure]]),
      queueItems: new Map([[queueItem.id, queueItem]]),
    })
    setPersist(true)
    vi.clearAllMocks()
    vi.mocked(db.writeStores).mockRejectedValueOnce(new Error("IDB failure"))

    store.getState().deleteFigure(figure.id)

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    expect(toast.error).toHaveBeenCalledWith(
      "Changes saved in memory but not persisted",
      expect.objectContaining({ id: "persistence-failure" })
    )
  })

  it("retry success rewrites one full five-map snapshot and dismisses the toast", async () => {
    vi.mocked(db.writeStores).mockRejectedValueOnce(new Error("IDB failure"))
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())

    // Reset mock so retry succeeds, and isolate the retry's own writes
    const actionArg = (toast.error as Mock).mock.calls[0][1]
    vi.mocked(db.replaceAll).mockClear()
    vi.mocked(db.replaceAll).mockResolvedValue(undefined)
    actionArg.action.onClick()
    await vi.waitFor(() =>
      expect(toast.dismiss).toHaveBeenCalledWith("persistence-failure")
    )

    expect(db.replaceAll).toHaveBeenCalledWith(
      expect.objectContaining({
        spools: expect.any(Object),
        brands: expect.any(Object),
        figures: expect.any(Object),
        orders: expect.any(Object),
        queueItems: expect.any(Object),
      })
    )
  })

  it("retry failure shows the error toast again", async () => {
    vi.mocked(db.writeStores).mockRejectedValueOnce(new Error("IDB failure"))
    vi.mocked(db.replaceAll).mockRejectedValueOnce(new Error("IDB failure"))
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())

    const callCountBefore = (toast.error as Mock).mock.calls.length
    const actionArg = (toast.error as Mock).mock.calls[0][1]
    actionArg.action.onClick()
    await vi.waitFor(() =>
      expect((toast.error as Mock).mock.calls.length).toBeGreaterThan(
        callCountBefore
      )
    )
  })

  it("successful writes produce no toast", async () => {
    vi.mocked(db.writeStores).mockResolvedValue(undefined)
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    await new Promise((r) => setTimeout(r, 0))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("_persist = false skips writes entirely", async () => {
    setPersist(false)
    vi.mocked(db.writeStores).mockRejectedValue(new Error("IDB failure"))
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    await new Promise((r) => setTimeout(r, 0))
    expect(db.writeStores).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })
})
