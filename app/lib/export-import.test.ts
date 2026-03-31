// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildExportData,
  exportData,
  importData,
  readJsonFile,
  validateExportEnvelope,
} from "~/lib/export-import"
import { fromJSON, store, toJSON } from "~/lib/store"
import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"

const mockReplaceAll = vi.fn()

vi.mock("~/lib/db", () => ({
  writeStore: vi.fn(),
  replaceAll: (...args: unknown[]) => mockReplaceAll(...args),
}))

function resetStore() {
  store.setState({
    spools: new Map(),
    figures: new Map(),
    queueItems: new Map(),
  })
}

afterEach(() => {
  resetStore()
  mockReplaceAll.mockReset()
})

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

function buildValidEnvelope() {
  const spool = createSpool({ id: "s1" })
  const figure = createFigure({ id: "f1", requiredColors: ["s1"] })
  const queueItem = createQueueItem({
    id: "q1",
    figureId: "f1",
    type: "stock",
  })
  return {
    version: 1,
    exportedAt: "2026-03-31T00:00:00.000Z",
    data: {
      spools: { s1: spool },
      figures: { f1: figure },
      queueItems: { q1: queueItem },
    },
  }
}

describe("validateExportEnvelope", () => {
  it("accepts valid export data", () => {
    expect(validateExportEnvelope(buildValidEnvelope())).toBe(true)
  })

  it("rejects missing version field", () => {
    const envelope = buildValidEnvelope()
    const { version: _, ...rest } = envelope
    expect(validateExportEnvelope(rest)).toBe(false)
  })

  it("rejects missing data field", () => {
    const { data: _, ...rest } = buildValidEnvelope()
    expect(validateExportEnvelope(rest)).toBe(false)
  })

  it("rejects malformed spool (missing hex)", () => {
    const envelope = buildValidEnvelope()
    ;(envelope.data.spools as Record<string, unknown>).s1 = {
      id: "s1",
      name: "White PLA",
    }
    expect(validateExportEnvelope(envelope)).toBe(false)
  })

  it("rejects malformed figure (missing requiredColors)", () => {
    const envelope = buildValidEnvelope()
    const { requiredColors: _, ...badFigure } = envelope.data.figures.f1
    ;(envelope.data.figures as Record<string, unknown>).f1 = badFigure
    expect(validateExportEnvelope(envelope)).toBe(false)
  })

  it("rejects malformed queueItem (invalid type)", () => {
    const envelope = buildValidEnvelope()
    ;(envelope.data.queueItems as Record<string, unknown>).q1 = {
      ...envelope.data.queueItems.q1,
      type: "invalid",
    }
    expect(validateExportEnvelope(envelope)).toBe(false)
  })

  it("rejects malformed queueItem (invalid completedAt)", () => {
    const envelope = buildValidEnvelope()
    ;(envelope.data.queueItems as Record<string, unknown>).q1 = {
      ...envelope.data.queueItems.q1,
      completedAt: 123,
    }
    expect(validateExportEnvelope(envelope)).toBe(false)
  })

  it("rejects non-object input", () => {
    expect(validateExportEnvelope("string")).toBe(false)
    expect(validateExportEnvelope(null)).toBe(false)
    expect(validateExportEnvelope(42)).toBe(false)
  })

  it("accepts empty entity collections", () => {
    const envelope = {
      version: 1,
      exportedAt: "2026-03-31T00:00:00.000Z",
      data: { spools: {}, figures: {}, queueItems: {} },
    }
    expect(validateExportEnvelope(envelope)).toBe(true)
  })
})

describe("readJsonFile", () => {
  it("parses valid JSON file content", async () => {
    const content = JSON.stringify({ hello: "world" })
    const file = new File([content], "test.json", {
      type: "application/json",
    })

    const result = await readJsonFile(file)
    expect(result).toEqual({ hello: "world" })
  })

  it("throws on invalid JSON", async () => {
    const file = new File(["not json {{{"], "bad.json", {
      type: "application/json",
    })

    await expect(readJsonFile(file)).rejects.toThrow(
      "The selected file is not valid JSON."
    )
  })
})

describe("importData", () => {
  it("replaces all store state on success", async () => {
    const envelope = buildValidEnvelope()
    const file = new File([JSON.stringify(envelope)], "import.json", {
      type: "application/json",
    })

    mockReplaceAll.mockResolvedValue(undefined)

    await importData(file)

    const state = store.getState()
    expect(state.spools.get("s1")).toBeTruthy()
    expect(state.figures.get("f1")).toBeTruthy()
    expect(state.queueItems.get("q1")).toBeTruthy()
  })

  it("calls db.replaceAll() with correct data", async () => {
    const envelope = buildValidEnvelope()
    const file = new File([JSON.stringify(envelope)], "import.json", {
      type: "application/json",
    })

    mockReplaceAll.mockResolvedValue(undefined)

    await importData(file)

    expect(mockReplaceAll).toHaveBeenCalledWith(envelope.data)
  })

  it("restores previous state when db.replaceAll() fails", async () => {
    const originalSpool = createSpool({ id: "original" })
    store.setState({
      spools: new Map([["original", originalSpool]]),
      figures: new Map(),
      queueItems: new Map(),
    })

    const envelope = buildValidEnvelope()
    const file = new File([JSON.stringify(envelope)], "import.json", {
      type: "application/json",
    })

    mockReplaceAll.mockRejectedValue(new Error("IDB write failed"))

    await expect(importData(file)).rejects.toThrow(
      "Import failed — your data has not been changed. Please try again."
    )

    const state = store.getState()
    expect(state.spools.get("original")).toEqual(originalSpool)
    expect(state.spools.has("s1")).toBe(false)
  })

  it("throws validation error for malformed files", async () => {
    const file = new File(
      [JSON.stringify({ invalid: true })],
      "bad.json",
      { type: "application/json" }
    )

    await expect(importData(file)).rejects.toThrow(
      "Invalid file format. Please select a file exported from 3D Print Flow."
    )
  })
})
