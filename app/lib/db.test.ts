import "fake-indexeddb/auto"

import { openDB } from "idb"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"

import { _resetDB, hydrate, replaceAll, writeStore } from "~/lib/db"
import {
  createBrand,
  createFigure,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}))

afterEach(() => {
  _resetDB()
  // Clear IndexedDB between tests
  indexedDB = new IDBFactory()
  vi.clearAllMocks()
})

/** Seed a pre-brand (schema v1) database the way the old build created it. */
async function seedV1Database(rows: {
  spools?: Record<string, unknown>[]
  figures?: Record<string, unknown>[]
  queueItems?: Record<string, unknown>[]
}) {
  const db = await openDB("print-flow", 1, {
    upgrade(db) {
      db.createObjectStore("spools", { keyPath: "id" })
      db.createObjectStore("figures", { keyPath: "id" })
      db.createObjectStore("queueItems", { keyPath: "id" })
    },
  })
  for (const spool of rows.spools ?? []) await db.put("spools", spool)
  for (const figure of rows.figures ?? []) await db.put("figures", figure)
  for (const queueItem of rows.queueItems ?? [])
    await db.put("queueItems", queueItem)
  db.close()
}

function v1Figure(
  id: string,
  franchise: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    name: `Figure ${id}`,
    franchise,
    size: 60,
    notes: "",
    requiredColors: [],
    ...overrides,
  }
}

describe("writeStore + hydrate roundtrip", () => {
  it("writes spools and reads them back", async () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const map = new Map([[spool.id, spool]])

    await writeStore("spools", map)
    const data = await hydrate()

    expect(data.spools[spool.id]).toEqual(spool)
  })

  it("hydrates all four stores", async () => {
    const spool = createSpool()
    const brand = createBrand()
    const figure = createFigure({ brandId: brand.id })
    const queueItem = createQueueItem({ figureId: figure.id })

    await writeStore("spools", new Map([[spool.id, spool]]))
    await writeStore("brands", new Map([[brand.id, brand]]))
    await writeStore("figures", new Map([[figure.id, figure]]))
    await writeStore("queueItems", new Map([[queueItem.id, queueItem]]))

    _resetDB()
    const data = await hydrate()

    expect(data.spools[spool.id]).toEqual(spool)
    expect(data.brands[brand.id]).toEqual(brand)
    expect(data.figures[figure.id]).toEqual(figure)
    expect(data.queueItems[queueItem.id]).toEqual(queueItem)
  })

  it("writeStore replaces previous contents", async () => {
    const spool1 = createSpool({ name: "First" })
    const spool2 = createSpool({ name: "Second" })

    await writeStore("spools", new Map([[spool1.id, spool1]]))
    await writeStore("spools", new Map([[spool2.id, spool2]]))

    _resetDB()
    const data = await hydrate()

    expect(Object.keys(data.spools)).toHaveLength(1)
    expect(data.spools[spool2.id]).toEqual(spool2)
    expect(data.spools[spool1.id]).toBeUndefined()
  })
})

describe("replaceAll", () => {
  it("atomically replaces all stores", async () => {
    const oldSpool = createSpool({ name: "Old" })
    await writeStore("spools", new Map([[oldSpool.id, oldSpool]]))

    const newSpool = createSpool({ name: "New" })
    const newBrand = createBrand({ name: "Dragon Ball" })
    const newFigure = createFigure({ name: "Goku", brandId: newBrand.id })
    const newQueueItem = createQueueItem({ figureId: newFigure.id })

    await replaceAll({
      spools: { [newSpool.id]: newSpool },
      brands: { [newBrand.id]: newBrand },
      figures: { [newFigure.id]: newFigure },
      queueItems: { [newQueueItem.id]: newQueueItem },
    })

    _resetDB()
    const data = await hydrate()

    expect(data.spools[oldSpool.id]).toBeUndefined()
    expect(data.spools[newSpool.id]).toEqual(newSpool)
    expect(data.brands[newBrand.id]).toEqual(newBrand)
    expect(data.figures[newFigure.id]).toEqual(newFigure)
    expect(data.queueItems[newQueueItem.id]).toEqual(newQueueItem)
  })

  it("returns empty records when database is empty", async () => {
    const data = await hydrate()
    expect(Object.keys(data.spools)).toHaveLength(0)
    expect(Object.keys(data.brands)).toHaveLength(0)
    expect(Object.keys(data.figures)).toHaveLength(0)
    expect(Object.keys(data.queueItems)).toHaveLength(0)
  })
})

describe("schema upgrade", () => {
  it("fresh install creates all four stores without migrating", async () => {
    await hydrate()
    const db = await openDB("print-flow", 2)
    expect([...db.objectStoreNames].sort()).toEqual([
      "brands",
      "figures",
      "queueItems",
      "spools",
    ])
    db.close()
  })

  it("migrates a v1 database: derives brands, rewires figures, drops franchise", async () => {
    await seedV1Database({
      figures: [
        v1Figure("a", "Naruto"),
        v1Figure("b", "naruto"),
        v1Figure("c", "  "),
        v1Figure("d", "One Piece"),
      ],
    })

    const data = await hydrate()

    const brandNames = Object.values(data.brands).map((b) => b.name)
    expect(brandNames.sort()).toEqual(["Naruto", "One Piece"])

    const naruto = Object.values(data.brands).find((b) => b.name === "Naruto")!
    const onePiece = Object.values(data.brands).find(
      (b) => b.name === "One Piece"
    )!
    expect(data.figures.a.brandId).toBe(naruto.id)
    expect(data.figures.b.brandId).toBe(naruto.id)
    expect(data.figures.c.brandId).toBeNull()
    expect(data.figures.d.brandId).toBe(onePiece.id)

    for (const figure of Object.values(data.figures)) {
      expect("franchise" in figure).toBe(false)
    }
  })

  it("leaves spools and queue items untouched during migration", async () => {
    const spool = { id: "s1", name: "Red PLA", hex: "#FF0000" }
    const queueItem = {
      id: "q1",
      figureId: "a",
      type: "stock",
      completedColors: [],
      completedAt: null,
    }
    await seedV1Database({
      spools: [spool],
      figures: [v1Figure("a", "Naruto")],
      queueItems: [queueItem],
    })

    const data = await hydrate()

    expect(data.spools).toEqual({ s1: spool })
    expect(data.queueItems).toEqual({ q1: queueItem })
  })

  it("is idempotent: reopening an already-migrated database changes nothing", async () => {
    await seedV1Database({
      figures: [v1Figure("a", "Naruto"), v1Figure("b", "One Piece")],
    })

    const first = await hydrate()
    _resetDB()
    const second = await hydrate()

    expect(second).toEqual(first)
    expect(Object.keys(second.brands)).toHaveLength(2)
  })
})

describe("connection lifecycle", () => {
  it("closes its cached connection when a newer version opens elsewhere (blocking handler)", async () => {
    await hydrate() // caches an open version-2 connection

    // Without our blocking handler closing the cached connection, this
    // version-3 open would stall until the test times out.
    const newer = await openDB("print-flow", 3, { upgrade() {} })

    expect(newer.version).toBe(3)
    newer.close()
  })

  it("does not cache a failed open: a later attempt reopens fresh", async () => {
    // A database already at version 3 makes our version-2 open reject
    // with VersionError.
    const newer = await openDB("print-flow", 3, { upgrade() {} })
    newer.close()

    await expect(hydrate()).rejects.toThrow()

    // The failure cause goes away (fresh browser profile). No _resetDB():
    // getDB itself must have dropped the rejected promise.
    indexedDB = new IDBFactory()

    const data = await hydrate()
    expect(Object.keys(data.spools)).toHaveLength(0)
    expect(Object.keys(data.brands)).toHaveLength(0)
  })

  it("surfaces a toast while an old open connection blocks the upgrade (blocked handler)", async () => {
    // An inert pre-upgrade tab: open at version 1 and never close on
    // versionchange (no blocking handler).
    const oldTab = await openDB("print-flow", 1, {
      upgrade(db) {
        db.createObjectStore("spools", { keyPath: "id" })
        db.createObjectStore("figures", { keyPath: "id" })
        db.createObjectStore("queueItems", { keyPath: "id" })
      },
    })

    const pending = hydrate()
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith(
      "Database update blocked — close other 3D Print Flow tabs",
      expect.objectContaining({ id: "db-blocked" })
    )

    // Closing the old tab unblocks the upgrade and the open completes.
    oldTab.close()
    await pending
  })
})
