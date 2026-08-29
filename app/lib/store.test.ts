import "fake-indexeddb/auto"

import { toast } from "sonner"
import { afterEach, describe, expect, it, type Mock, vi } from "vitest"

import * as db from "~/lib/db"
import { brandKey } from "~/lib/migration"
import { fromJSON, getPersist, setPersist, store, toJSON } from "~/lib/store"
import {
  createBrand,
  createFigure,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"
import type { Figure, QueueItem } from "~/lib/types"

vi.mock("~/lib/db", () => ({
  writeStore: vi.fn(() => Promise.resolve()),
}))

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}))

function resetStore() {
  store.setState({
    spools: new Map(),
    brands: new Map(),
    figures: new Map(),
    queueItems: new Map(),
    dataGeneration: 0,
  })
  setPersist(true)
  vi.clearAllMocks()
  vi.mocked(db.writeStore).mockReturnValue(Promise.resolve())
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
      .mocked(db.writeStore)
      .mock.calls.map((call) => call[0])
      .sort()
  }

  function lastWrite(name: "brands" | "figures") {
    const call = vi
      .mocked(db.writeStore)
      .mock.calls.findLast((c) => c[0] === name)
    return call?.[1]
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
      expect(db.writeStore).not.toHaveBeenCalled()
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
      expect(db.writeStore).not.toHaveBeenCalled()
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
      expect(db.writeStore).not.toHaveBeenCalled()
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
      expect(db.writeStore).not.toHaveBeenCalled()
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
    vi.mocked(db.writeStore).mockImplementation((name) =>
      name === "figures"
        ? Promise.reject(new Error("IDB failure"))
        : Promise.resolve()
    )

    store.getState().deleteBrand(naruto.id)

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())

    const actionArg = (toast.error as Mock).mock.calls[0][1]
    vi.mocked(db.writeStore).mockClear()
    vi.mocked(db.writeStore).mockImplementation(() => Promise.resolve())
    actionArg.action.onClick()

    await vi.waitFor(() =>
      expect(toast.dismiss).toHaveBeenCalledWith("persistence-failure")
    )

    expect(writtenStores()).toEqual([
      "brands",
      "figures",
      "queueItems",
      "spools",
    ])
    expect(lastWrite("brands")?.has(naruto.id)).toBe(false)
    const persistedFigures = lastWrite("figures") as
      | Map<string, Figure>
      | undefined
    expect(persistedFigures?.get("f1")?.brandId).toBeNull()
  })
})

describe("queue mutations", () => {
  /** Seed a figure so queue commands pass their figure guards. */
  function seedFigure(
    id = "fig-1",
    requiredColors: string[] = ["s1"]
  ): ReturnType<typeof createFigure> {
    const figure = createFigure({ id, requiredColors })
    store.setState({
      figures: new Map([...store.getState().figures, [figure.id, figure]]),
    })
    return figure
  }

  describe("addToQueue", () => {
    it("creates a QueueItem with quantity 1, empty counts, and UUID", () => {
      seedFigure("fig-1")
      const result = store.getState().addToQueue("fig-1", "stock")
      expect(result).toEqual({ type: "created" })
      const items = store.getState().queueItems
      expect(items.size).toBe(1)
      const item = [...items.values()][0]
      expect(item.id).toBeTruthy()
      expect(item.figureId).toBe("fig-1")
      expect(item.type).toBe("stock")
      expect(item.quantity).toBe(1)
      expect(item.completedCounts).toEqual({})
      expect(item.completedAt).toBeNull()
    })

    it("accepts an explicit quantity on create, clamped to 99", () => {
      seedFigure("fig-1")
      store.getState().addToQueue("fig-1", "order", 15)
      expect([...store.getState().queueItems.values()][0].quantity).toBe(15)

      store.setState({ queueItems: new Map() })
      store.getState().addToQueue("fig-1", "order", 250)
      expect([...store.getState().queueItems.values()][0].quantity).toBe(99)
    })

    it("rejects a missing figure and a figure with no required colors", () => {
      seedFigure("fig-colorless", [])
      expect(store.getState().addToQueue("missing", "stock")).toEqual({
        type: "rejected",
      })
      expect(store.getState().addToQueue("fig-colorless", "stock")).toEqual({
        type: "rejected",
      })
      expect(store.getState().queueItems.size).toBe(0)
    })

    it("rejects non-integer or non-finite quantity without mutating", () => {
      seedFigure("fig-1")
      for (const quantity of [1.5, NaN, Infinity, -Infinity]) {
        expect(store.getState().addToQueue("fig-1", "stock", quantity)).toEqual(
          { type: "invalid" }
        )
      }
      expect(store.getState().queueItems.size).toBe(0)
    })

    it("merges into an active same-figure+type entry, counts untouched", () => {
      seedFigure("fig-1", ["s1", "s2"])
      const existing = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        type: "order",
        quantity: 2,
        completedCounts: { s1: 1 },
      })
      store.setState({ queueItems: new Map([["q1", existing]]) })

      const result = store.getState().addToQueue("fig-1", "order")

      expect(result).toEqual({ type: "merged", quantity: 3, clamped: false })
      expect(store.getState().queueItems.size).toBe(1)
      const merged = store.getState().queueItems.get("q1")!
      expect(merged.quantity).toBe(3)
      expect(merged.completedCounts).toEqual({ s1: 1 })
      expect(merged.completedAt).toBeNull()
    })

    it("creates a new row for a different type (stock vs order stay separate)", () => {
      seedFigure("fig-1")
      const existing = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        type: "stock",
      })
      store.setState({ queueItems: new Map([["q1", existing]]) })

      expect(store.getState().addToQueue("fig-1", "order")).toEqual({
        type: "created",
      })
      expect(store.getState().queueItems.size).toBe(2)
    })

    it("never merges into a completed-by-derivation entry", () => {
      seedFigure("fig-1", ["s1"])
      const completed = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        type: "stock",
        quantity: 1,
        completedCounts: { s1: 1 },
        completedAt: "2026-08-01T10:00:00.000Z",
      })
      store.setState({ queueItems: new Map([["q1", completed]]) })

      expect(store.getState().addToQueue("fig-1", "stock")).toEqual({
        type: "created",
      })
      expect(store.getState().queueItems.size).toBe(2)
      expect(store.getState().queueItems.get("q1")).toEqual(completed)
    })

    it("with several active candidates the smallest id receives the merge", () => {
      seedFigure("fig-1", ["s1"])
      const a = createQueueItem({ id: "qa", figureId: "fig-1", type: "stock" })
      const b = createQueueItem({ id: "qb", figureId: "fig-1", type: "stock" })
      store.setState({
        queueItems: new Map([
          ["qb", b],
          ["qa", a],
        ]),
      })

      store.getState().addToQueue("fig-1", "stock")

      expect(store.getState().queueItems.get("qa")?.quantity).toBe(2)
      expect(store.getState().queueItems.get("qb")?.quantity).toBe(1)
    })

    it("clamps a merge at 99 and reports it: 98 + 2 -> 99 clamped", () => {
      seedFigure("fig-1", ["s1"])
      const existing = createQueueItem({
        id: "q1",
        figureId: "fig-1",
        type: "stock",
        quantity: 98,
      })
      store.setState({ queueItems: new Map([["q1", existing]]) })

      expect(store.getState().addToQueue("fig-1", "stock", 2)).toEqual({
        type: "merged",
        quantity: 99,
        clamped: true,
      })
      expect(store.getState().queueItems.get("q1")?.quantity).toBe(99)
    })
  })

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
      expect(db.writeStore).not.toHaveBeenCalled()
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
          "order"
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
      expect(items.every((qi) => qi.type === "order")).toBe(true)
      expect(items.find((qi) => qi.figureId === "fig-a")?.quantity).toBe(2)
      expect(
        vi
          .mocked(db.writeStore)
          .mock.calls.filter((call) => call[0] === "queueItems")
      ).toHaveLength(1)
    })

    it("sums duplicate figure lines before applying", () => {
      seedFigure("fig-a", ["s1"])

      const result = store.getState().addBatchToQueue(
        [
          { figureId: "fig-a", quantity: 1 },
          { figureId: "fig-a", quantity: 2 },
        ],
        "order"
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
      expect(store.getState().addBatchToQueue([], "order")).toEqual({
        type: "empty",
      })
      expect(store.getState().queueItems).toBe(before)
      expect(db.writeStore).not.toHaveBeenCalled()
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
        "order"
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
        type: "order",
        quantity: 1,
      })
      store.setState({ queueItems: new Map([["q1", existing]]) })

      const result = store.getState().addBatchToQueue(
        [
          { figureId: "fig-a", quantity: 2 },
          { figureId: "fig-b", quantity: 1 },
        ],
        "order"
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
        type: "order",
        quantity: 98,
      })
      store.setState({ queueItems: new Map([["q1", existing]]) })

      const result = store
        .getState()
        .addBatchToQueue([{ figureId: "fig-a", quantity: 5 }], "order")

      expect(result).toEqual({
        type: "queued",
        pieces: 1,
        created: 0,
        merged: 1,
        skipped: [],
      })
      expect(store.getState().queueItems.get("q1")?.quantity).toBe(99)
    })

    it("a batch of only skipped entries mutates nothing", () => {
      const before = store.getState().queueItems
      const result = store
        .getState()
        .addBatchToQueue([{ figureId: "fig-missing", quantity: 1 }], "order")
      expect(result).toEqual({
        type: "queued",
        pieces: 0,
        created: 0,
        merged: 0,
        skipped: ["fig-missing"],
      })
      expect(store.getState().queueItems).toBe(before)
      expect(db.writeStore).not.toHaveBeenCalled()
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

      const result = store.getState().addBatchToQueue(entries, "order")

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
        type: "order",
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
      expect(fresh.type).toBe("order")
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
        type: "order",
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
        type: "order",
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
  it("_persist = true triggers writeStore on mutation", () => {
    setPersist(true)
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    expect(db.writeStore).toHaveBeenCalledWith("spools", expect.any(Map))
  })

  it("_persist = false suppresses writeStore on mutation", () => {
    setPersist(false)
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    expect(db.writeStore).not.toHaveBeenCalled()
  })

  it("brand creation triggers writeStore for the brands store", () => {
    setPersist(true)
    store.getState().createBrand("One Piece")
    expect(db.writeStore).toHaveBeenCalledWith("brands", expect.any(Map))
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
      queueItems: { [queueItem.id]: queueItem },
    })

    expect(store.getState().spools.get(spool.id)).toEqual(spool)
    expect(store.getState().brands.get(brand.id)).toEqual(brand)
    expect(store.getState().figures.get(figure.id)).toEqual(figure)
    expect(store.getState().queueItems.get(queueItem.id)).toEqual(queueItem)
  })

  it("fromJSON increments dataGeneration on every full replace", () => {
    const empty = { spools: {}, brands: {}, figures: {}, queueItems: {} }
    expect(store.getState().dataGeneration).toBe(0)
    fromJSON(empty)
    expect(store.getState().dataGeneration).toBe(1)
    fromJSON(empty)
    expect(store.getState().dataGeneration).toBe(2)
  })

  it("fromJSON backfills v3 defaults (quantity, counts, completedAt) for sparse rows", () => {
    const figure = createFigure()
    const sparseQueueItem: Pick<QueueItem, "id" | "figureId" | "type"> = {
      id: "q1",
      figureId: figure.id,
      type: "stock",
    }

    fromJSON({
      spools: {},
      brands: {},
      figures: { [figure.id]: figure },
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
  it("calls toast.error when writeStore rejects", async () => {
    vi.mocked(db.writeStore).mockRejectedValueOnce(new Error("IDB failure"))
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
    vi.mocked(db.writeStore).mockRejectedValueOnce(new Error("IDB failure"))
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

  it("multi-store failures reuse the fixed toast ID", async () => {
    const figure = createFigure({ id: "fig-1" })
    const queueItem = createQueueItem({ id: "q1", figureId: figure.id })

    setPersist(false)
    store.setState({
      figures: new Map([[figure.id, figure]]),
      queueItems: new Map([[queueItem.id, queueItem]]),
    })
    setPersist(true)
    vi.clearAllMocks()
    vi.mocked(db.writeStore)
      .mockRejectedValueOnce(new Error("IDB failure"))
      .mockRejectedValueOnce(new Error("IDB failure"))

    store.getState().deleteFigure(figure.id)

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2))
    expect((toast.error as Mock).mock.calls).toEqual([
      [
        "Changes saved in memory but not persisted",
        expect.objectContaining({ id: "persistence-failure" }),
      ],
      [
        "Changes saved in memory but not persisted",
        expect.objectContaining({ id: "persistence-failure" }),
      ],
    ])
  })

  it("retry success rewrites all four stores and dismisses the toast", async () => {
    vi.mocked(db.writeStore).mockRejectedValueOnce(new Error("IDB failure"))
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())

    // Reset mock so retry succeeds, and isolate the retry's own writes
    const actionArg = (toast.error as Mock).mock.calls[0][1]
    vi.mocked(db.writeStore).mockClear()
    vi.mocked(db.writeStore).mockResolvedValue(undefined)
    actionArg.action.onClick()
    await vi.waitFor(() =>
      expect(toast.dismiss).toHaveBeenCalledWith("persistence-failure")
    )

    const retriedStores = vi
      .mocked(db.writeStore)
      .mock.calls.map((call) => call[0])
      .sort()
    expect(retriedStores).toEqual(["brands", "figures", "queueItems", "spools"])
  })

  it("retry failure shows the error toast again", async () => {
    vi.mocked(db.writeStore)
      .mockRejectedValueOnce(new Error("IDB failure")) // initial write
      .mockRejectedValueOnce(new Error("IDB failure")) // retry: spools
      .mockRejectedValueOnce(new Error("IDB failure")) // retry: brands
      .mockRejectedValueOnce(new Error("IDB failure")) // retry: figures
      .mockRejectedValueOnce(new Error("IDB failure")) // retry: queueItems
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
    vi.mocked(db.writeStore).mockResolvedValue(undefined)
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    await new Promise((r) => setTimeout(r, 0))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("_persist = false skips writes entirely", async () => {
    setPersist(false)
    vi.mocked(db.writeStore).mockRejectedValue(new Error("IDB failure"))
    store.getState().createSpool({ name: "Red", hex: "#FF0000" })
    await new Promise((r) => setTimeout(r, 0))
    expect(db.writeStore).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })
})
