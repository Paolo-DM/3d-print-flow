// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { afterEach, describe, expect, it, vi } from "vitest"

import { buildExportData, exportData } from "~/lib/export-import"
import { fromJSON, store } from "~/lib/store"
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
}

afterEach(resetStore)

describe("buildExportData", () => {
  it("produces correct JSON structure with version, exportedAt, and data fields", () => {
    const result = buildExportData()

    expect(result).toHaveProperty("version")
    expect(result).toHaveProperty("exportedAt")
    expect(result).toHaveProperty("data")
    expect(Object.keys(result)).toEqual(["version", "exportedAt", "data"])
  })

  it("version is exactly 1", () => {
    const result = buildExportData()
    expect(result.version).toBe(1)
  })

  it("exportedAt is a valid ISO 8601 UTC string", () => {
    const result = buildExportData()
    const parsed = new Date(result.exportedAt)
    expect(parsed.toISOString()).toBe(result.exportedAt)
    expect(result.exportedAt).toMatch(/Z$/)
  })

  it("data contains serialized spools, figures, and queueItems as Record<string, Entity>", () => {
    const spool = createSpool({ id: "s1", name: "White PLA", hex: "#FFFFFF" })
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      requiredColors: ["s1"],
    })
    const queueItem = createQueueItem({
      id: "q1",
      figureId: "f1",
      type: "stock",
    })

    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", queueItem]]),
    })

    const result = buildExportData()

    expect(result.data.spools).toEqual({ s1: spool })
    expect(result.data.figures).toEqual({ f1: figure })
    expect(result.data.queueItems).toEqual({ q1: queueItem })
  })

  it("roundtrip: export output can be parsed and fed to fromJSON to restore identical state", () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      franchise: "Dragon Ball",
      size: 80,
      requiredColors: ["s1"],
    })
    const queueItem = createQueueItem({
      id: "q1",
      figureId: "f1",
      type: "order",
      completedColors: ["s1"],
      completedAt: "2026-03-31T10:00:00.000Z",
    })

    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", queueItem]]),
    })

    const exported = buildExportData()
    const json = JSON.stringify(exported)
    const parsed = JSON.parse(json)

    // Reset store and restore from export
    resetStore()
    expect(store.getState().spools.size).toBe(0)

    fromJSON(parsed.data)

    const state = store.getState()
    expect(state.spools.get("s1")).toEqual(spool)
    expect(state.figures.get("f1")).toEqual(figure)
    expect(state.queueItems.get("q1")).toEqual(queueItem)
  })
})

describe("exportData", () => {
  it("triggers browser download with correct filename and JSON content", () => {
    const mockClick = vi.fn()
    const mockAnchor = {
      href: "",
      download: "",
      click: mockClick,
    }

    vi.spyOn(document, "createElement").mockReturnValue(
      mockAnchor as unknown as HTMLElement
    )
    const mockCreateObjectURL = vi
      .fn()
      .mockReturnValue("blob:mock-url")
    const mockRevokeObjectURL = vi.fn()
    vi.stubGlobal("URL", {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    })

    exportData()

    expect(document.createElement).toHaveBeenCalledWith("a")
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(mockAnchor.href).toBe("blob:mock-url")
    expect(mockAnchor.download).toMatch(
      /^3d-print-flow-export-\d{4}-\d{2}-\d{2}\.json$/
    )
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url")

    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
})
