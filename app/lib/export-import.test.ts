// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildExportData,
  exportData,
  importData,
  readJsonFile,
  validateExportEnvelope,
  validateV1Envelope,
} from "~/lib/export-import"
import fixture from "~/lib/fixtures/export-v1-2026-08-28.json"
import { fromJSON, store, toJSON } from "~/lib/store"
import {
  createBrand,
  createFigure,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"

const mockReplaceAll = vi.fn()

vi.mock("~/lib/db", () => ({
  writeStore: vi.fn(() => Promise.resolve()),
  replaceAll: (...args: unknown[]) => mockReplaceAll(...args),
}))

function resetStore() {
  store.setState({
    spools: new Map(),
    brands: new Map(),
    figures: new Map(),
    queueItems: new Map(),
    dataGeneration: 0,
  })
}

function fileFrom(payload: unknown): File {
  return new File([JSON.stringify(payload)], "import.json", {
    type: "application/json",
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

  it("version is exactly 2", () => {
    const result = buildExportData()
    expect(result.version).toBe(2)
  })

  it("exportedAt is a valid ISO 8601 UTC string", () => {
    const result = buildExportData()
    const parsed = new Date(result.exportedAt)
    expect(parsed.toISOString()).toBe(result.exportedAt)
    expect(result.exportedAt).toMatch(/Z$/)
  })

  it("data contains serialized spools, brands, figures, and queueItems as Record<string, Entity>", () => {
    const spool = createSpool({ id: "s1", name: "White PLA", hex: "#FFFFFF" })
    const brand = createBrand({ id: "b1", name: "Naruto" })
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      brandId: "b1",
      requiredColors: ["s1"],
    })
    const queueItem = createQueueItem({
      id: "q1",
      figureId: "f1",
      type: "stock",
    })

    store.setState({
      spools: new Map([["s1", spool]]),
      brands: new Map([["b1", brand]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", queueItem]]),
    })

    const result = buildExportData()

    expect(result.data.spools).toEqual({ s1: spool })
    expect(result.data.brands).toEqual({ b1: brand })
    expect(result.data.figures).toEqual({ f1: figure })
    expect(result.data.queueItems).toEqual({ q1: queueItem })
  })

  it("roundtrip: export output can be parsed and fed to fromJSON to restore identical state", () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const brand = createBrand({ id: "b1", name: "Dragon Ball" })
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      brandId: "b1",
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
      brands: new Map([["b1", brand]]),
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
    expect(state.brands.get("b1")).toEqual(brand)
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
    const mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-url")
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
  const brand = createBrand({ id: "b1", name: "One Piece" })
  const figure = createFigure({
    id: "f1",
    brandId: "b1",
    requiredColors: ["s1"],
  })
  const queueItem = createQueueItem({
    id: "q1",
    figureId: "f1",
    type: "stock",
  })
  return {
    version: 2,
    exportedAt: "2026-03-31T00:00:00.000Z",
    data: {
      spools: { s1: spool },
      brands: { b1: brand },
      figures: { f1: figure },
      queueItems: { q1: queueItem },
    },
  }
}

function buildValidV1Envelope() {
  const spool = createSpool({ id: "s1" })
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
      figures: {
        f1: {
          id: "f1",
          name: "Naruto",
          franchise: "Naruto",
          size: 60,
          notes: "",
          requiredColors: ["s1"],
        },
      },
      queueItems: { q1: queueItem },
    },
  }
}

describe("validateExportEnvelope", () => {
  it("accepts valid v2 export data", () => {
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

  it("rejects v1 envelopes (handled by validateV1Envelope instead)", () => {
    expect(validateExportEnvelope(buildValidV1Envelope())).toBe(false)
  })

  it("rejects missing brands collection", () => {
    const envelope = buildValidEnvelope()
    const { brands: _, ...data } = envelope.data
    expect(validateExportEnvelope({ ...envelope, data })).toBe(false)
  })

  it("rejects malformed brand (missing name)", () => {
    const envelope = buildValidEnvelope()
    ;(envelope.data.brands as Record<string, unknown>).b1 = { id: "b1" }
    expect(validateExportEnvelope(envelope)).toBe(false)
  })

  it("rejects a blank or whitespace-only brand name", () => {
    const blank = buildValidEnvelope()
    ;(blank.data.brands as Record<string, unknown>).b1 = { id: "b1", name: "" }
    expect(validateExportEnvelope(blank)).toBe(false)

    const whitespace = buildValidEnvelope()
    ;(whitespace.data.brands as Record<string, unknown>).b1 = {
      id: "b1",
      name: "   ",
    }
    expect(validateExportEnvelope(whitespace)).toBe(false)
  })

  it("rejects two brands sharing a brandKey", () => {
    const envelope = buildValidEnvelope()
    const brands = envelope.data.brands as Record<string, unknown>
    brands.b1 = { id: "b1", name: "One Piece" }
    brands.b2 = { id: "b2", name: "  ONE PIECE " }
    expect(validateExportEnvelope(envelope)).toBe(false)
  })

  it("accepts brands whose names differ beyond casing and whitespace", () => {
    const envelope = buildValidEnvelope()
    const brands = envelope.data.brands as Record<string, unknown>
    brands.b1 = { id: "b1", name: "One Piece" }
    brands.b2 = { id: "b2", name: "One Piece Film" }
    expect(validateExportEnvelope(envelope)).toBe(true)
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

  it("rejects v2 figure without brandId", () => {
    const envelope = buildValidEnvelope()
    const { brandId: _, ...badFigure } = envelope.data.figures.f1
    ;(envelope.data.figures as Record<string, unknown>).f1 = badFigure
    expect(validateExportEnvelope(envelope)).toBe(false)
  })

  it("accepts v2 figure with brandId null", () => {
    const envelope = buildValidEnvelope()
    ;(envelope.data.figures as Record<string, unknown>).f1 = {
      ...envelope.data.figures.f1,
      brandId: null,
    }
    expect(validateExportEnvelope(envelope)).toBe(true)
  })

  it("accepts v2 figure carrying a stray franchise key", () => {
    const envelope = buildValidEnvelope()
    ;(envelope.data.figures as Record<string, unknown>).f1 = {
      ...envelope.data.figures.f1,
      franchise: "stray",
    }
    expect(validateExportEnvelope(envelope)).toBe(true)
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
      version: 2,
      exportedAt: "2026-03-31T00:00:00.000Z",
      data: { spools: {}, brands: {}, figures: {}, queueItems: {} },
    }
    expect(validateExportEnvelope(envelope)).toBe(true)
  })
})

describe("validateV1Envelope", () => {
  it("accepts a valid v1 envelope", () => {
    expect(validateV1Envelope(buildValidV1Envelope())).toBe(true)
  })

  it("rejects v2 envelopes", () => {
    expect(validateV1Envelope(buildValidEnvelope())).toBe(false)
  })

  it("rejects a v1 figure without franchise", () => {
    const envelope = buildValidV1Envelope()
    const { franchise: _, ...badFigure } = envelope.data.figures.f1
    ;(envelope.data.figures as Record<string, unknown>).f1 = badFigure
    expect(validateV1Envelope(envelope)).toBe(false)
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
    mockReplaceAll.mockResolvedValue(undefined)

    await importData(fileFrom(buildValidEnvelope()))

    const state = store.getState()
    expect(state.spools.get("s1")).toBeTruthy()
    expect(state.brands.get("b1")).toBeTruthy()
    expect(state.figures.get("f1")).toBeTruthy()
    expect(state.queueItems.get("q1")).toBeTruthy()
  })

  it("calls db.replaceAll() with correct data", async () => {
    const envelope = buildValidEnvelope()
    mockReplaceAll.mockResolvedValue(undefined)

    await importData(fileFrom(envelope))

    expect(mockReplaceAll).toHaveBeenCalledWith(envelope.data)
  })

  it("strips a stray franchise key from v2 figures", async () => {
    const envelope = buildValidEnvelope()
    ;(envelope.data.figures as Record<string, unknown>).f1 = {
      ...envelope.data.figures.f1,
      franchise: "stray",
    }
    mockReplaceAll.mockResolvedValue(undefined)

    await importData(fileFrom(envelope))

    const imported = store.getState().figures.get("f1")!
    expect("franchise" in imported).toBe(false)
    const persisted = mockReplaceAll.mock.calls[0][0] as ReturnType<
      typeof toJSON
    >
    expect("franchise" in persisted.figures.f1).toBe(false)
  })

  it("v2 export → import round-trips to identical state (lossless)", async () => {
    const spool = createSpool({ id: "s1" })
    const brand = createBrand({ id: "b1", name: "Marvel" })
    const figure = createFigure({
      id: "f1",
      name: "Venom",
      brandId: "b1",
      requiredColors: ["s1"],
    })
    const queueItem = createQueueItem({ id: "q1", figureId: "f1" })
    store.setState({
      spools: new Map([["s1", spool]]),
      brands: new Map([["b1", brand]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", queueItem]]),
    })

    const exported = JSON.parse(JSON.stringify(buildExportData()))
    const before = toJSON()
    resetStore()
    mockReplaceAll.mockResolvedValue(undefined)

    await importData(fileFrom(exported))

    expect(toJSON()).toEqual(before)
  })

  describe("v1 imports", () => {
    it("derives brands from franchise values and links figures", async () => {
      mockReplaceAll.mockResolvedValue(undefined)

      await importData(fileFrom(buildValidV1Envelope()))

      const state = store.getState()
      expect(state.brands.size).toBe(1)
      const brand = [...state.brands.values()][0]
      expect(brand.name).toBe("Naruto")
      const figure = state.figures.get("f1")!
      expect(figure.brandId).toBe(brand.id)
      expect("franchise" in figure).toBe(false)
    })

    it("imports a v1 figure with empty franchise as brandId null without minting a brand", async () => {
      const envelope = buildValidV1Envelope()
      envelope.data.figures.f1.franchise = "   "
      mockReplaceAll.mockResolvedValue(undefined)

      await importData(fileFrom(envelope))

      expect(store.getState().brands.size).toBe(0)
      expect(store.getState().figures.get("f1")?.brandId).toBeNull()
    })

    it("dedups case-variant franchises into one brand (first-seen casing in ascending id order)", async () => {
      const envelope = buildValidV1Envelope()
      const payload = {
        ...envelope,
        data: {
          ...envelope.data,
          figures: {
            a: { ...envelope.data.figures.f1, id: "a", franchise: "Naruto" },
            b: { ...envelope.data.figures.f1, id: "b", franchise: "naruto" },
          },
        },
      }
      mockReplaceAll.mockResolvedValue(undefined)

      await importData(fileFrom(payload))

      const state = store.getState()
      expect(state.brands.size).toBe(1)
      const brand = [...state.brands.values()][0]
      expect(brand.name).toBe("Naruto")
      expect(state.figures.get("a")?.brandId).toBe(brand.id)
      expect(state.figures.get("b")?.brandId).toBe(brand.id)
    })

    it("imports the real 2026-08-28 fixture: 7 brands, 22 figures, spools and queue items untouched", async () => {
      mockReplaceAll.mockResolvedValue(undefined)

      await importData(fileFrom(fixture))

      const state = store.getState()
      expect(state.spools.size).toBe(25)
      expect(state.brands.size).toBe(7)
      expect(state.figures.size).toBe(22)
      expect(state.queueItems.size).toBe(10)

      const brandNames = [...state.brands.values()].map((b) => b.name).sort()
      expect(brandNames).toEqual(
        [
          "Dragon Ball",
          "Lilo & Stitch",
          "Marvel",
          "Naruto",
          "One Piece",
          "Pokemon",
          "Sonic",
        ].sort()
      )

      const brandIdByName = new Map(
        [...state.brands.values()].map((b) => [b.name, b.id])
      )
      const figuresPerBrand = (name: string) =>
        [...state.figures.values()]
          .filter((f) => f.brandId === brandIdByName.get(name))
          .map((f) => f.name)
          .sort()
      expect(figuresPerBrand("One Piece")).toEqual(
        [
          "Sanji",
          "Jinbe",
          "Nico Robin",
          "Zoro",
          "Chopper",
          "Brook",
          "Nami",
          "Luffy",
          "Franky",
          "Usopp",
        ].sort()
      )
      expect(figuresPerBrand("Pokemon")).toEqual(
        ["Charmander", "Eevee", "Pikachu", "Squirtle", "Venusaur"].sort()
      )
      expect(figuresPerBrand("Marvel")).toEqual(["Spiderman", "Venom"].sort())
      expect(figuresPerBrand("Lilo & Stitch")).toEqual(
        ["Angel", "Stitch"].sort()
      )
      expect(figuresPerBrand("Sonic")).toEqual(["Sonic the Hedgehog"])
      expect(figuresPerBrand("Naruto")).toEqual(["Kakashi"])
      expect(figuresPerBrand("Dragon Ball")).toEqual(["Goku"])

      // Spools and queue items pass through byte-identical
      expect(Object.fromEntries(state.spools)).toEqual(fixture.data.spools)
      expect(Object.fromEntries(state.queueItems)).toEqual(
        fixture.data.queueItems
      )
    })

    it("re-importing a fresh v2 export of migrated v1 data restores identical state", async () => {
      mockReplaceAll.mockResolvedValue(undefined)

      await importData(fileFrom(fixture))
      const migrated = toJSON()

      const reExport = JSON.parse(JSON.stringify(buildExportData()))
      expect(reExport.version).toBe(2)

      resetStore()
      await importData(fileFrom(reExport))

      expect(toJSON()).toEqual(migrated)
    })
  })

  it("restores previous state when db.replaceAll() fails", async () => {
    const originalSpool = createSpool({ id: "original" })
    store.setState({
      spools: new Map([["original", originalSpool]]),
      brands: new Map(),
      figures: new Map(),
      queueItems: new Map(),
    })

    mockReplaceAll.mockRejectedValue(new Error("IDB write failed"))

    await expect(importData(fileFrom(buildValidEnvelope()))).rejects.toThrow(
      "Import failed — your data has not been changed. Please try again."
    )

    const state = store.getState()
    expect(state.spools.get("original")).toEqual(originalSpool)
    expect(state.spools.has("s1")).toBe(false)
    expect(state.brands.size).toBe(0)
  })

  describe("v2 brand-collection validation", () => {
    it("rejects a blank brand name with the invalid-format message, leaving data untouched", async () => {
      const originalSpool = createSpool({ id: "original" })
      store.setState({ spools: new Map([["original", originalSpool]]) })

      const envelope = buildValidEnvelope()
      ;(envelope.data.brands as Record<string, unknown>).b1 = {
        id: "b1",
        name: "   ",
      }

      await expect(importData(fileFrom(envelope))).rejects.toThrow(
        "Invalid file format. Please select a file exported from 3D Print Flow."
      )
      expect(store.getState().spools.get("original")).toEqual(originalSpool)
      expect(mockReplaceAll).not.toHaveBeenCalled()
    })

    it("rejects two brands sharing a brandKey with the same message", async () => {
      const envelope = buildValidEnvelope()
      const brands = envelope.data.brands as Record<string, unknown>
      brands.b1 = { id: "b1", name: "One Piece" }
      brands.b2 = { id: "b2", name: "one piece" }

      await expect(importData(fileFrom(envelope))).rejects.toThrow(
        "Invalid file format. Please select a file exported from 3D Print Flow."
      )
      expect(mockReplaceAll).not.toHaveBeenCalled()
    })

    it("still round-trips an app-generated multi-brand v2 export", async () => {
      const marvel = createBrand({ id: "b1", name: "Marvel" })
      const pokemon = createBrand({ id: "b2", name: "Pokemon" })
      const venom = createFigure({ id: "f1", name: "Venom", brandId: "b1" })
      const pikachu = createFigure({ id: "f2", name: "Pikachu", brandId: "b2" })
      store.setState({
        brands: new Map([
          ["b1", marvel],
          ["b2", pokemon],
        ]),
        figures: new Map([
          ["f1", venom],
          ["f2", pikachu],
        ]),
      })

      const exported = JSON.parse(JSON.stringify(buildExportData()))
      const before = toJSON()
      resetStore()
      mockReplaceAll.mockResolvedValue(undefined)

      await importData(fileFrom(exported))

      expect(toJSON()).toEqual(before)
    })

    it("imports brand names verbatim — a padded name is accepted, not trimmed", async () => {
      const envelope = buildValidEnvelope()
      ;(envelope.data.brands as Record<string, unknown>).b1 = {
        id: "b1",
        name: "  Naruto  ",
      }
      mockReplaceAll.mockResolvedValue(undefined)

      await importData(fileFrom(envelope))

      expect(store.getState().brands.get("b1")?.name).toBe("  Naruto  ")
      const persisted = mockReplaceAll.mock.calls[0][0] as ReturnType<
        typeof toJSON
      >
      expect(persisted.brands.b1.name).toBe("  Naruto  ")
    })

    it("does not apply to v1 files (migration derives valid brands by construction)", async () => {
      const envelope = buildValidV1Envelope()
      const payload = {
        ...envelope,
        data: {
          ...envelope.data,
          figures: {
            a: { ...envelope.data.figures.f1, id: "a", franchise: "Naruto" },
            b: { ...envelope.data.figures.f1, id: "b", franchise: "  naruto " },
            c: { ...envelope.data.figures.f1, id: "c", franchise: "   " },
          },
        },
      }
      mockReplaceAll.mockResolvedValue(undefined)

      await importData(fileFrom(payload))

      const state = store.getState()
      expect(state.brands.size).toBe(1)
      expect([...state.brands.values()][0].name).toBe("Naruto")
      expect(state.figures.get("c")?.brandId).toBeNull()
    })
  })

  it("throws validation error for malformed files", async () => {
    await expect(importData(fileFrom({ invalid: true }))).rejects.toThrow(
      "Invalid file format. Please select a file exported from 3D Print Flow."
    )
  })

  it("rejects unknown schema versions with the invalid-format error, leaving data untouched", async () => {
    const originalSpool = createSpool({ id: "original" })
    store.setState({ spools: new Map([["original", originalSpool]]) })

    const envelope = { ...buildValidEnvelope(), version: 3 }
    await expect(importData(fileFrom(envelope))).rejects.toThrow(
      "Invalid file format. Please select a file exported from 3D Print Flow."
    )

    const nonNumeric = { ...buildValidEnvelope(), version: "2" }
    await expect(importData(fileFrom(nonNumeric))).rejects.toThrow(
      "Invalid file format. Please select a file exported from 3D Print Flow."
    )

    expect(store.getState().spools.get("original")).toEqual(originalSpool)
    expect(mockReplaceAll).not.toHaveBeenCalled()
  })
})
