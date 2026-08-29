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

  it("updateFigure keeps the queueItems Map reference unchanged", () => {
    const figure = createFigure({ id: "fig-1", requiredColors: ["s1"] })
    const queueItem = createQueueItem({
      id: "q1",
      figureId: figure.id,
      completedColors: ["s1"],
    })
    const queueItems = new Map([[queueItem.id, queueItem]])

    store.setState({
      figures: new Map([[figure.id, figure]]),
      queueItems,
    })

    store.getState().updateFigure(figure.id, {
      requiredColors: ["s2"],
    })

    expect(store.getState().queueItems).toBe(queueItems)
    expect(store.getState().queueItems.get(queueItem.id)).toEqual(queueItem)
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
        existingId: onePiece.id,
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

  describe("mergeBrands", () => {
    it("rewires source figures, deletes the source, and counts the moves", () => {
      const f1 = createFigure({ id: "f1", brandId: naruto.id })
      const f2 = createFigure({ id: "f2", brandId: naruto.id })
      const f3 = createFigure({ id: "f3", brandId: onePiece.id })
      seed([f1, f2, f3])

      const result = store.getState().mergeBrands(naruto.id, onePiece.id)

      expect(result).toEqual({ type: "merged", movedFigureCount: 2 })
      expect(store.getState().brands.has(naruto.id)).toBe(false)
      expect(store.getState().brands.get(onePiece.id)).toEqual(onePiece)
      expect(store.getState().figures.get("f1")?.brandId).toBe(onePiece.id)
      expect(store.getState().figures.get("f2")?.brandId).toBe(onePiece.id)
      expect(store.getState().figures.get("f3")?.brandId).toBe(onePiece.id)
      expectUniqueNonBlankBrands()
    })

    it("merges a zero-figure source with movedFigureCount 0", () => {
      seed([createFigure({ id: "f1", brandId: onePiece.id })])

      expect(store.getState().mergeBrands(naruto.id, onePiece.id)).toEqual({
        type: "merged",
        movedFigureCount: 0,
      })
      expect(store.getState().brands.has(naruto.id)).toBe(false)
      expect(store.getState().figures.get("f1")?.brandId).toBe(onePiece.id)
    })

    it("returns same-brand before not-found", () => {
      seed()
      expect(store.getState().mergeBrands(naruto.id, naruto.id)).toEqual({
        type: "same-brand",
      })
      expect(store.getState().mergeBrands("missing", "missing")).toEqual({
        type: "same-brand",
      })
      expect(db.writeStore).not.toHaveBeenCalled()
    })

    it("returns not-found when either id is missing", () => {
      seed([createFigure({ id: "f1", brandId: naruto.id })])
      const brands = store.getState().brands
      const figures = store.getState().figures

      expect(store.getState().mergeBrands("missing", onePiece.id)).toEqual({
        type: "not-found",
      })
      expect(store.getState().mergeBrands(naruto.id, "missing")).toEqual({
        type: "not-found",
      })
      expect(store.getState().brands).toBe(brands)
      expect(store.getState().figures).toBe(figures)
      expect(db.writeStore).not.toHaveBeenCalled()
    })

    it("leaves a figure whose brandId resolves to no brand untouched", () => {
      const orphan = createFigure({ id: "f-orphan", brandId: "gone" })
      const owned = createFigure({ id: "f1", brandId: naruto.id })
      seed([orphan, owned])

      store.getState().mergeBrands(naruto.id, onePiece.id)

      expect(store.getState().figures.get("f-orphan")).toEqual(orphan)
      expect(store.getState().figures.get("f1")?.brandId).toBe(onePiece.id)
    })

    it("writes both the brands and figures stores in one command", () => {
      seed([createFigure({ id: "f1", brandId: naruto.id })])

      store.getState().mergeBrands(naruto.id, onePiece.id)

      expect(writtenStores()).toEqual(["brands", "figures"])
      expect(lastWrite("brands")?.has(naruto.id)).toBe(false)
      const persistedFigures = lastWrite("figures") as
        | Map<string, Figure>
        | undefined
      expect(persistedFigures?.get("f1")?.brandId).toBe(onePiece.id)
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

  it("merge and delete each apply brands+figures in a single set()", () => {
    // Two writeStore calls cannot tell one set() from two — count the store's
    // own notifications instead (CAP-5).
    seed([
      createFigure({ id: "f1", brandId: naruto.id }),
      createFigure({ id: "f2", brandId: onePiece.id }),
    ])

    let notifications = 0
    const unsubscribe = store.subscribe(() => {
      notifications += 1
    })

    try {
      store.getState().mergeBrands(naruto.id, onePiece.id)
      expect(notifications).toBe(1)

      store.getState().deleteBrand(onePiece.id)
      expect(notifications).toBe(2)
    } finally {
      unsubscribe()
    }

    expect(store.getState().brands.size).toBe(0)
    expect(store.getState().figures.get("f1")?.brandId).toBeNull()
    expect(store.getState().figures.get("f2")?.brandId).toBeNull()
  })

  it("a merge whose figures write rejects notifies and converges on retry", async () => {
    seed([createFigure({ id: "f1", brandId: naruto.id })])
    vi.mocked(db.writeStore).mockImplementation((name) =>
      name === "figures"
        ? Promise.reject(new Error("IDB failure"))
        : Promise.resolve()
    )

    store.getState().mergeBrands(naruto.id, onePiece.id)

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
    expect(persistedFigures?.get("f1")?.brandId).toBe(onePiece.id)
  })
})

describe("queue mutations", () => {
  it("addToQueue creates a QueueItem with correct fields and UUID", () => {
    store.getState().addToQueue("fig-1", "stock")
    const items = store.getState().queueItems
    expect(items.size).toBe(1)
    const item = [...items.values()][0]
    expect(item.id).toBeTruthy()
    expect(item.figureId).toBe("fig-1")
    expect(item.type).toBe("stock")
    expect(item.completedColors).toEqual([])
    expect(item.completedAt).toBeNull()
  })

  it("addToQueue allows duplicate figureId entries", () => {
    store.getState().addToQueue("fig-1", "stock")
    store.getState().addToQueue("fig-1", "order")
    const items = [...store.getState().queueItems.values()]
    expect(items).toHaveLength(2)
    expect(items[0].figureId).toBe("fig-1")
    expect(items[1].figureId).toBe("fig-1")
    expect(items[0].id).not.toBe(items[1].id)
  })

  it("removeFromQueue removes the correct item", () => {
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

  it("removeFromQueue is no-op for non-existent ID", () => {
    const q1 = createQueueItem({ id: "q1" })
    store.setState({ queueItems: new Map([["q1", q1]]) })
    const before = store.getState().queueItems
    store.getState().removeFromQueue("nonexistent")
    expect(store.getState().queueItems).toBe(before)
  })

  it("toggleChip adds spool ID to completedColors when absent", () => {
    const q1 = createQueueItem({ id: "q1", completedColors: [] })
    store.setState({ queueItems: new Map([["q1", q1]]) })
    store.getState().toggleChip("q1", "spool-1")
    expect(store.getState().queueItems.get("q1")?.completedColors).toEqual([
      "spool-1",
    ])
  })

  it("toggleChip removes spool ID from completedColors when present", () => {
    const q1 = createQueueItem({
      id: "q1",
      completedColors: ["spool-1", "spool-2"],
    })
    store.setState({ queueItems: new Map([["q1", q1]]) })
    store.getState().toggleChip("q1", "spool-1")
    expect(store.getState().queueItems.get("q1")?.completedColors).toEqual([
      "spool-2",
    ])
  })

  it("toggleChip is no-op for non-existent queue item", () => {
    const q1 = createQueueItem({ id: "q1" })
    store.setState({ queueItems: new Map([["q1", q1]]) })
    const before = store.getState().queueItems
    store.getState().toggleChip("nonexistent", "spool-1")
    expect(store.getState().queueItems).toBe(before)
  })

  it("toggleChip stamps completedAt when an item becomes complete", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-31T12:00:00.000Z"))

    const figure = createFigure({ id: "fig-1", requiredColors: ["spool-1"] })
    const q1 = createQueueItem({
      id: "q1",
      figureId: figure.id,
      completedColors: [],
      completedAt: null,
    })

    store.setState({
      figures: new Map([[figure.id, figure]]),
      queueItems: new Map([["q1", q1]]),
    })

    store.getState().toggleChip("q1", "spool-1")

    expect(store.getState().queueItems.get("q1")?.completedAt).toBe(
      "2026-03-31T12:00:00.000Z"
    )

    vi.useRealTimers()
  })

  it("toggleChip clears completedAt when a completed item becomes incomplete", () => {
    const figure = createFigure({ id: "fig-1", requiredColors: ["spool-1"] })
    const q1 = createQueueItem({
      id: "q1",
      figureId: figure.id,
      completedColors: ["spool-1"],
      completedAt: "2026-03-31T12:00:00.000Z",
    })

    store.setState({
      figures: new Map([[figure.id, figure]]),
      queueItems: new Map([["q1", q1]]),
    })

    store.getState().toggleChip("q1", "spool-1")

    expect(store.getState().queueItems.get("q1")?.completedAt).toBeNull()
  })

  it("requeueCompleted creates new queue item from catalog's current requiredColors with empty completedColors", () => {
    const figure = createFigure({
      id: "fig-1",
      requiredColors: ["s1", "s2"],
    })
    const q1 = createQueueItem({
      id: "q1",
      figureId: "fig-1",
      type: "order",
      completedColors: ["s1", "s2"],
    })
    store.setState({
      figures: new Map([["fig-1", figure]]),
      queueItems: new Map([["q1", q1]]),
    })
    store.getState().requeueCompleted("q1")
    const items = [...store.getState().queueItems.values()]
    expect(items).toHaveLength(2)
    const newItem = items.find((i) => i.id !== "q1")!
    expect(newItem.figureId).toBe("fig-1")
    expect(newItem.type).toBe("order")
    expect(newItem.completedColors).toEqual([])
    expect(newItem.completedAt).toBeNull()
    // Original is NOT removed
    expect(store.getState().queueItems.has("q1")).toBe(true)
  })

  it("requeueCompleted is no-op for non-existent queue item", () => {
    const before = store.getState().queueItems
    store.getState().requeueCompleted("nonexistent")
    expect(store.getState().queueItems).toBe(before)
  })

  it("requeueCompleted is no-op when figure doesn't exist", () => {
    const q1 = createQueueItem({ id: "q1", figureId: "fig-gone" })
    store.setState({ queueItems: new Map([["q1", q1]]) })
    const before = store.getState().queueItems
    store.getState().requeueCompleted("q1")
    expect(store.getState().queueItems).toBe(before)
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

  it("fromJSON backfills missing completedAt values for older queue items", () => {
    const figure = createFigure()
    const legacyQueueItem: Omit<QueueItem, "completedAt"> = {
      id: "q1",
      figureId: figure.id,
      type: "stock",
      completedColors: [],
    }

    fromJSON({
      spools: {},
      brands: {},
      figures: { [figure.id]: figure },
      queueItems: {
        [legacyQueueItem.id]: legacyQueueItem as unknown as QueueItem,
      },
    })

    expect(
      store.getState().queueItems.get(legacyQueueItem.id)?.completedAt
    ).toBeNull()
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
