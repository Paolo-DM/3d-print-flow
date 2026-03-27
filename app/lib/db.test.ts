import "fake-indexeddb/auto"

import { afterEach, describe, expect, it } from "vitest"

import { _resetDB, hydrate, replaceAll, writeStore } from "~/lib/db"
import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"

afterEach(() => {
  _resetDB()
  // Clear IndexedDB between tests
  indexedDB = new IDBFactory()
})

describe("writeStore + hydrate roundtrip", () => {
  it("writes spools and reads them back", async () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const map = new Map([[spool.id, spool]])

    await writeStore("spools", map)
    const data = await hydrate()

    expect(data.spools[spool.id]).toEqual(spool)
  })

  it("hydrates all three stores", async () => {
    const spool = createSpool()
    const figure = createFigure()
    const queueItem = createQueueItem({ figureId: figure.id })

    await writeStore("spools", new Map([[spool.id, spool]]))
    await writeStore("figures", new Map([[figure.id, figure]]))
    await writeStore("queueItems", new Map([[queueItem.id, queueItem]]))

    _resetDB()
    const data = await hydrate()

    expect(data.spools[spool.id]).toEqual(spool)
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
    const newFigure = createFigure({ name: "Goku" })
    const newQueueItem = createQueueItem({ figureId: newFigure.id })

    await replaceAll({
      spools: { [newSpool.id]: newSpool },
      figures: { [newFigure.id]: newFigure },
      queueItems: { [newQueueItem.id]: newQueueItem },
    })

    _resetDB()
    const data = await hydrate()

    expect(data.spools[oldSpool.id]).toBeUndefined()
    expect(data.spools[newSpool.id]).toEqual(newSpool)
    expect(data.figures[newFigure.id]).toEqual(newFigure)
    expect(data.queueItems[newQueueItem.id]).toEqual(newQueueItem)
  })

  it("returns empty records when database is empty", async () => {
    const data = await hydrate()
    expect(Object.keys(data.spools)).toHaveLength(0)
    expect(Object.keys(data.figures)).toHaveLength(0)
    expect(Object.keys(data.queueItems)).toHaveLength(0)
  })
})
