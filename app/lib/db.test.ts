import "fake-indexeddb/auto"

import { openDB } from "idb"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  _resetDB,
  hydrate,
  replaceAll,
  writeStore,
  writeStores,
} from "~/lib/db"
import v1Fixture from "~/lib/fixtures/export-v1-2026-08-28.json"
import {
  createBrand,
  createFigure,
  createOrder,
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

/** Seed an existing schema-v2 database without going through app startup. */
async function seedV2Database(
  rows: {
    spools?: unknown[]
    brands?: unknown[]
    figures?: unknown[]
    queueItems?: unknown[]
  } = {}
) {
  const db = await openDB("print-flow", 2, {
    upgrade(db) {
      db.createObjectStore("spools", { keyPath: "id" })
      db.createObjectStore("brands", { keyPath: "id" })
      db.createObjectStore("figures", { keyPath: "id" })
      db.createObjectStore("queueItems", { keyPath: "id" })
    },
  })
  for (const spool of rows.spools ?? []) await db.put("spools", spool)
  for (const brand of rows.brands ?? []) await db.put("brands", brand)
  for (const figure of rows.figures ?? []) await db.put("figures", figure)
  for (const queueItem of rows.queueItems ?? [])
    await db.put("queueItems", queueItem)
  db.close()
}

/** Seed a schema-v3 database to exercise the exact v3 -> v4 IDB upgrade. */
async function seedV3Database(
  rows: {
    spools?: unknown[]
    brands?: unknown[]
    figures?: unknown[]
    queueItems?: unknown[]
  } = {}
) {
  const db = await openDB("print-flow", 3, {
    upgrade(db) {
      db.createObjectStore("spools", { keyPath: "id" })
      db.createObjectStore("brands", { keyPath: "id" })
      db.createObjectStore("figures", { keyPath: "id" })
      db.createObjectStore("queueItems", { keyPath: "id" })
    },
  })
  for (const spool of rows.spools ?? []) await db.put("spools", spool)
  for (const brand of rows.brands ?? []) await db.put("brands", brand)
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

function expectStarterCatalog(data: Awaited<ReturnType<typeof hydrate>>) {
  expect(data.spools).toEqual(v1Fixture.data.spools)
  expect(data.brands).toEqual({
    "4d5b503d-e96b-44bf-bfaa-77a80ecfdb90": {
      id: "4d5b503d-e96b-44bf-bfaa-77a80ecfdb90",
      name: "Marvel",
    },
    "fa792920-805b-4a59-bf9f-9c762d8df72d": {
      id: "fa792920-805b-4a59-bf9f-9c762d8df72d",
      name: "Pokemon",
    },
    "fe49ac2e-5592-4fa5-828f-95d1d52f634f": {
      id: "fe49ac2e-5592-4fa5-828f-95d1d52f634f",
      name: "Lilo & Stitch",
    },
  })
  expect(data.figures).toEqual({
    "fig-pikachu": {
      id: "fig-pikachu",
      name: "Pikachu",
      brandId: "fa792920-805b-4a59-bf9f-9c762d8df72d",
      size: 60,
      notes: "",
      requiredColors: ["sp-yellow", "sp-black", "sp-red", "sp-brown"],
    },
    "fig-spiderman": {
      id: "fig-spiderman",
      name: "Spiderman",
      brandId: "4d5b503d-e96b-44bf-bfaa-77a80ecfdb90",
      size: 60,
      notes: "",
      requiredColors: ["sp-red", "sp-dark-blue", "sp-black", "sp-white"],
    },
    "fig-stitch": {
      id: "fig-stitch",
      name: "Stitch",
      brandId: "fe49ac2e-5592-4fa5-828f-95d1d52f634f",
      size: 60,
      notes: "",
      requiredColors: [
        "sp-blue",
        "sp-light-blue",
        "sp-purple",
        "sp-pink",
        "sp-black",
        "sp-white",
      ],
    },
  })
  expect(data.queueItems).toEqual({})
  expect(data.orders).toEqual({})

  for (const figure of Object.values(data.figures)) {
    expect(data.brands[figure.brandId!]).toBeDefined()
    for (const spoolId of figure.requiredColors) {
      expect(data.spools[spoolId]).toBeDefined()
    }
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

  it("hydrates all five stores", async () => {
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
    expect(data.orders).toEqual({})
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

  it("writes multiple changed maps in one real transaction", async () => {
    const spool = createSpool({ id: "s1" })
    const brand = createBrand({ id: "b1" })

    await writeStores({
      spools: new Map([[spool.id, spool]]),
      brands: new Map([[brand.id, brand]]),
    })

    const data = await hydrate()
    expect(data.spools).toEqual({ [spool.id]: spool })
    expect(data.brands).toEqual({ [brand.id]: brand })
  })

  it("aborts every changed store when a later synchronous write fails", async () => {
    const originalSpool = createSpool({ id: "old-spool" })
    const originalBrand = createBrand({ id: "old-brand" })
    await writeStores({
      spools: new Map([[originalSpool.id, originalSpool]]),
      brands: new Map([[originalBrand.id, originalBrand]]),
    })

    const replacement = createSpool({ id: "new-spool" })
    const invalidBrand = { name: "Missing keyPath id" }
    await expect(
      writeStores({
        spools: new Map([[replacement.id, replacement]]),
        brands: new Map([["invalid", invalidBrand as never]]),
      })
    ).rejects.toThrow()

    _resetDB()
    const data = await hydrate()
    expect(data.spools).toEqual({ [originalSpool.id]: originalSpool })
    expect(data.brands).toEqual({ [originalBrand.id]: originalBrand })
  })

  it("repairs dangling v4 order links with a collision-safe persisted order", async () => {
    const missingOrderId = "00000000-0000-4000-8000-000000000009"
    const collision = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: `Recovered · ${missingOrderId}`,
    })
    const row = createQueueItem({ orderId: missingOrderId })
    await writeStore("orders", new Map([[collision.id, collision]]))
    await writeStore("queueItems", new Map([[row.id, row]]))

    const first = await hydrate()
    expect(first.orders[missingOrderId]).toMatchObject({
      id: missingOrderId,
      reference: `Recovered · ${missingOrderId} · 2`,
      customerName: null,
      platform: null,
      dueDate: null,
    })

    _resetDB()
    const reopened = await hydrate()
    expect(reopened.orders[missingOrderId]).toEqual(
      first.orders[missingOrderId]
    )
  })

  it("repairs malformed shared order links to one persisted UUID order", async () => {
    const firstRow = createQueueItem({ id: "q-invalid-a" })
    const secondRow = createQueueItem({ id: "q-invalid-b" })
    const malformed = new Map([
      [firstRow.id, { ...firstRow, orderId: "not-a-uuid" }],
      [secondRow.id, { ...secondRow, orderId: "not-a-uuid" }],
    ])
    await writeStore("queueItems", malformed as never)

    const data = await hydrate()
    const repairedA = data.queueItems[firstRow.id].orderId
    const repairedB = data.queueItems[secondRow.id].orderId
    expect(repairedA).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
    expect(repairedB).toBe(repairedA)
    expect(data.orders[repairedA!]).toBeDefined()

    _resetDB()
    const reopened = await hydrate()
    expect(reopened.queueItems[firstRow.id].orderId).toBe(repairedA)
    expect(reopened.orders[repairedA!]).toEqual(data.orders[repairedA!])
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
      orders: {},
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

  it("persists an intentionally empty replacement across reopen", async () => {
    await replaceAll({
      spools: {},
      brands: {},
      figures: {},
      orders: {},
      queueItems: {},
    })
    _resetDB()

    const data = await hydrate()
    expect(Object.keys(data.spools)).toHaveLength(0)
    expect(Object.keys(data.brands)).toHaveLength(0)
    expect(Object.keys(data.figures)).toHaveLength(0)
    expect(Object.keys(data.queueItems)).toHaveLength(0)
  })
})

describe("schema upgrade", () => {
  it("fresh install atomically hydrates the exact starter catalog", async () => {
    const data = await hydrate()
    const db = await openDB("print-flow", 4)

    expect([...db.objectStoreNames].sort()).toEqual([
      "brands",
      "figures",
      "orders",
      "queueItems",
      "spools",
    ])
    expectStarterCatalog(data)
    db.close()
  })

  it("does not seed an existing empty v2 database", async () => {
    await seedV2Database()

    expect(await hydrate()).toEqual({
      spools: {},
      brands: {},
      figures: {},
      orders: {},
      queueItems: {},
    })
  })

  it("does not add starter records to an existing populated v2 database", async () => {
    const spool = createSpool({ id: "custom-spool" })
    const brand = createBrand({ id: "custom-brand" })
    const figure = createFigure({ id: "custom-figure", brandId: brand.id })
    const legacyQueueItem = {
      id: "custom-queue-item",
      figureId: figure.id,
      type: "stock",
      completedColors: [],
      completedAt: null,
    }
    await seedV2Database({
      spools: [spool],
      brands: [brand],
      figures: [figure],
      queueItems: [legacyQueueItem],
    })

    expect(await hydrate()).toEqual({
      spools: { [spool.id]: spool },
      brands: { [brand.id]: brand },
      figures: { [figure.id]: figure },
      orders: {},
      queueItems: {
        [legacyQueueItem.id]: {
          id: legacyQueueItem.id,
          figureId: figure.id,
          orderId: null,
          quantity: 1,
          completedCounts: {},
          completedAt: null,
        },
      },
    })
  })

  it("migrates v2 queue rows to v4 with first-class order identity", async () => {
    await seedV2Database({
      queueItems: [
        {
          id: "q1",
          figureId: "f1",
          type: "order",
          completedColors: ["s1", "s2"],
          completedAt: "2026-08-12T13:16:46.541Z",
        },
        {
          id: "q2",
          figureId: "f1",
          type: "stock",
          completedColors: [],
          // completedAt absent — legacy rows may omit it
        },
      ],
    })

    const data = await hydrate()

    expect(data.queueItems).toEqual({
      q1: {
        id: "q1",
        figureId: "f1",
        orderId: expect.any(String),
        quantity: 1,
        completedCounts: { s1: 1, s2: 1 },
        completedAt: "2026-08-12T13:16:46.541Z",
      },
      q2: {
        id: "q2",
        figureId: "f1",
        orderId: null,
        quantity: 1,
        completedCounts: {},
        completedAt: null,
      },
    })
  })

  it("migrates a real schema-v3 database to v4 without merging rows", async () => {
    const spool = createSpool({ id: "s1" })
    const figure = createFigure({
      id: "f1",
      name: "Legacy figure",
      requiredColors: [spool.id],
    })
    await seedV3Database({
      spools: [spool],
      figures: [figure],
      queueItems: [
        {
          id: "q-order",
          figureId: figure.id,
          type: "order",
          quantity: 3,
          completedCounts: { [spool.id]: 2 },
          completedAt: "invalid-legacy-stamp",
        },
        {
          id: "q-stock",
          figureId: figure.id,
          type: "stock",
          quantity: 2,
          completedCounts: {},
          completedAt: null,
        },
      ],
    })

    const data = await hydrate()
    expect(Object.keys(data.queueItems).sort()).toEqual(["q-order", "q-stock"])
    expect(data.queueItems["q-order"]).toMatchObject({
      orderId: expect.any(String),
      quantity: 3,
      completedCounts: { s1: 2 },
      completedAt: "invalid-legacy-stamp",
    })
    expect(data.queueItems["q-stock"].orderId).toBeNull()
    const migratedOrder = data.orders[data.queueItems["q-order"].orderId!]
    expect(migratedOrder).toMatchObject({
      reference: "Imported · Legacy figure · q-order",
      createdAt: "1970-01-01T00:00:00.000Z",
    })

    _resetDB()
    expect(await hydrate()).toEqual(data)
  })

  it("deletes v2 queue rows that fail the legacy guard during the upgrade", async () => {
    await seedV2Database({
      queueItems: [
        {
          id: "q-good",
          figureId: "f1",
          type: "stock",
          completedColors: [],
          completedAt: null,
        },
        {
          id: "q-bad",
          figureId: "f1",
          type: "stock",
          completedColors: "not-an-array",
          completedAt: null,
        },
      ],
    })

    const data = await hydrate()

    expect(Object.keys(data.queueItems)).toEqual(["q-good"])
  })

  it("preserves duplicate active rows one-for-one, never consolidating", async () => {
    await seedV2Database({
      queueItems: [
        {
          id: "q-dup-a",
          figureId: "f1",
          type: "order",
          completedColors: [],
          completedAt: null,
        },
        {
          id: "q-dup-b",
          figureId: "f1",
          type: "order",
          completedColors: [],
          completedAt: null,
        },
      ],
    })

    const data = await hydrate()

    expect(Object.keys(data.queueItems).sort()).toEqual(["q-dup-a", "q-dup-b"])
    expect(data.queueItems["q-dup-a"].quantity).toBe(1)
    expect(data.queueItems["q-dup-b"].quantity).toBe(1)
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
    expect(data.spools["sp-yellow"]).toBeUndefined()
    expect(data.figures["fig-pikachu"]).toBeUndefined()
  })

  it("aborts fresh database creation when starter seeding fails", async () => {
    const originalPut = IDBObjectStore.prototype.put
    let putCount = 0
    const failingPut = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (
        this: IDBObjectStore,
        value: unknown,
        key?: IDBValidKey
      ) {
        putCount += 1
        if (putCount === 6) {
          throw new DOMException("Seed failed", "AbortError")
        }
        return key === undefined
          ? originalPut.call(this, value)
          : originalPut.call(this, value, key)
      })

    try {
      await expect(hydrate()).rejects.toThrow()
    } finally {
      failingPut.mockRestore()
    }
    expect(putCount).toBe(6)

    const data = await hydrate()
    expectStarterCatalog(data)
  })

  it("v1 upgrade applies figure/brand migration and queue mapping in one upgrade", async () => {
    const spool = { id: "s1", name: "Red PLA", hex: "#FF0000" }
    const queueItem = {
      id: "q1",
      figureId: "a",
      type: "stock",
      completedColors: ["s1"],
      completedAt: "2026-04-01T08:26:13.501Z",
    }
    await seedV1Database({
      spools: [spool],
      figures: [v1Figure("a", "Naruto")],
      queueItems: [queueItem],
    })

    const data = await hydrate()

    // figure/brand migration ran
    expect(Object.values(data.brands).map((b) => b.name)).toEqual(["Naruto"])
    expect("franchise" in data.figures.a).toBe(false)
    // spools untouched; queue rows mapped to v3 with completedAt verbatim
    expect(data.spools).toEqual({ s1: spool })
    expect(data.queueItems).toEqual({
      q1: {
        id: "q1",
        figureId: "a",
        orderId: null,
        quantity: 1,
        completedCounts: { s1: 1 },
        completedAt: "2026-04-01T08:26:13.501Z",
      },
    })
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
    await hydrate() // caches an open version-4 connection

    // Without our blocking handler closing the cached connection, this
    // version-5 open would stall until the test times out.
    const newer = await openDB("print-flow", 5, { upgrade() {} })

    expect(newer.version).toBe(5)
    newer.close()
  })

  it("does not cache a failed open: a later attempt reopens fresh", async () => {
    // A database already at version 5 makes our version-4 open reject
    // with VersionError.
    const newer = await openDB("print-flow", 5, { upgrade() {} })
    newer.close()

    await expect(hydrate()).rejects.toThrow()

    // The failure cause goes away (fresh browser profile). No _resetDB():
    // getDB itself must have dropped the rejected promise.
    indexedDB = new IDBFactory()

    const data = await hydrate()
    expect(Object.keys(data.spools)).toHaveLength(25)
    expect(Object.keys(data.brands)).toHaveLength(3)
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
