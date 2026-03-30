import "fake-indexeddb/auto"

import { afterEach, describe, expect, it, vi } from "vitest"

import * as db from "~/lib/db"
import { fromJSON, getPersist, setPersist, store, toJSON } from "~/lib/store"
import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"

vi.mock("~/lib/db", () => ({
  writeStore: vi.fn(),
}))

function resetStore() {
  store.setState({
    spools: new Map(),
    figures: new Map(),
    queueItems: new Map(),
  })
  setPersist(true)
  vi.clearAllMocks()
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
      franchise: "Naruto Shippuden",
      size: 75,
      notes: "test note",
      requiredColors: ["spool-1"],
    })
    const figures = store.getState().figures
    expect(figures.size).toBe(1)
    const figure = [...figures.values()][0]
    expect(figure.name).toBe("Naruto")
    expect(figure.franchise).toBe("Naruto Shippuden")
    expect(figure.size).toBe(75)
    expect(figure.notes).toBe("test note")
    expect(figure.requiredColors).toEqual(["spool-1"])
    expect(figure.id).toBeTruthy()
  })

  it("createFigure generates a unique UUID", () => {
    store.getState().createFigure({ name: "Naruto", franchise: "", size: 60, notes: "", requiredColors: [] })
    store.getState().createFigure({ name: "Goku", franchise: "", size: 60, notes: "", requiredColors: [] })
    const ids = [...store.getState().figures.values()].map((f) => f.id)
    expect(ids[0]).not.toBe(ids[1])
  })

  it("updateFigure modifies name, franchise, size, notes, and requiredColors", () => {
    store.getState().createFigure({ name: "Naruto", franchise: "Naruto", size: 60, notes: "", requiredColors: [] })
    const id = [...store.getState().figures.keys()][0]
    store.getState().updateFigure(id, {
      name: "Naruto Uzumaki",
      franchise: "Naruto Shippuden",
      size: 80,
      notes: "updated",
      requiredColors: ["s1", "s2"],
    })
    const figure = store.getState().figures.get(id)
    expect(figure?.name).toBe("Naruto Uzumaki")
    expect(figure?.franchise).toBe("Naruto Shippuden")
    expect(figure?.size).toBe(80)
    expect(figure?.notes).toBe("updated")
    expect(figure?.requiredColors).toEqual(["s1", "s2"])
  })

  it("updateFigure is a no-op for unknown id", () => {
    store.getState().createFigure({ name: "Naruto", franchise: "", size: 60, notes: "", requiredColors: [] })
    const before = store.getState().figures
    store.getState().updateFigure("nonexistent", { name: "X" })
    expect(store.getState().figures).toBe(before)
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
    store.setState({ spools: new Map([[spool.id, spool]]) })
    const json = toJSON()
    expect(json.spools[spool.id]).toEqual(spool)
  })

  it("fromJSON converts Records to Maps", () => {
    const spool = createSpool()
    const figure = createFigure()
    const queueItem = createQueueItem({ figureId: figure.id })

    fromJSON({
      spools: { [spool.id]: spool },
      figures: { [figure.id]: figure },
      queueItems: { [queueItem.id]: queueItem },
    })

    expect(store.getState().spools.get(spool.id)).toEqual(spool)
    expect(store.getState().figures.get(figure.id)).toEqual(figure)
    expect(store.getState().queueItems.get(queueItem.id)).toEqual(queueItem)
  })

  it("toJSON → fromJSON roundtrip preserves data", () => {
    const spool = createSpool({ name: "Green", hex: "#00FF00" })
    store.setState({ spools: new Map([[spool.id, spool]]) })
    const json = toJSON()
    resetStore()
    fromJSON(json)
    expect(store.getState().spools.get(spool.id)).toEqual(spool)
  })
})
