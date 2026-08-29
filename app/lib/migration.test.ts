import { describe, expect, it } from "vitest"

import fixture from "~/lib/fixtures/export-v1-2026-08-28.json"
import {
  brandKey,
  isRecord,
  isValidFigureV1,
  isValidQueueItemLegacy,
  migrateLegacyQueueItem,
  migrateLegacyQueueItems,
  migrateV1Figures,
  type FigureV1,
  type QueueItemLegacy,
} from "~/lib/migration"

function v1Figure(overrides: Partial<FigureV1> = {}): FigureV1 {
  return {
    id: crypto.randomUUID(),
    name: "Naruto",
    franchise: "Naruto",
    size: 60,
    notes: "",
    requiredColors: [],
    ...overrides,
  }
}

function loadFixtureFigures(): Record<string, FigureV1> {
  const data: unknown = fixture
  if (!isRecord(data) || !isRecord(data.data) || !isRecord(data.data.figures)) {
    throw new Error("Fixture does not have the expected envelope shape")
  }
  const result: Record<string, FigureV1> = {}
  for (const [id, row] of Object.entries(data.data.figures)) {
    if (!isValidFigureV1(row)) {
      throw new Error(`Fixture figure ${id} is not a valid v1 figure`)
    }
    result[id] = row
  }
  return result
}

function legacyQueueItem(
  overrides: Partial<QueueItemLegacy> = {}
): QueueItemLegacy {
  return {
    id: crypto.randomUUID(),
    figureId: "fig-1",
    type: "stock",
    completedColors: [],
    completedAt: null,
    ...overrides,
  }
}

describe("isValidQueueItemLegacy", () => {
  it("accepts a valid legacy queue item", () => {
    expect(isValidQueueItemLegacy(legacyQueueItem())).toBe(true)
  })

  it("accepts an absent completedAt", () => {
    const { completedAt: _, ...withoutCompletedAt } = legacyQueueItem()
    expect(isValidQueueItemLegacy(withoutCompletedAt)).toBe(true)
  })

  it("rejects the v3 shape (completedCounts, no completedColors)", () => {
    expect(
      isValidQueueItemLegacy({
        id: "q1",
        figureId: "f1",
        type: "stock",
        quantity: 1,
        completedCounts: {},
        completedAt: null,
      })
    ).toBe(false)
  })

  it("rejects malformed rows", () => {
    expect(isValidQueueItemLegacy(null)).toBe(false)
    expect(isValidQueueItemLegacy("row")).toBe(false)
    expect(
      isValidQueueItemLegacy(legacyQueueItem({ type: "gift" as never }))
    ).toBe(false)
    expect(
      isValidQueueItemLegacy(legacyQueueItem({ completedColors: [1] as never }))
    ).toBe(false)
    expect(
      isValidQueueItemLegacy(legacyQueueItem({ completedAt: 123 as never }))
    ).toBe(false)
  })
})

describe("migrateLegacyQueueItem", () => {
  it("maps to quantity 1 with completed colors as counts of 1", () => {
    const legacy = legacyQueueItem({
      id: "q1",
      figureId: "f1",
      type: "order",
      completedColors: ["s1", "s2"],
      completedAt: "2026-04-01T08:26:13.501Z",
    })

    expect(migrateLegacyQueueItem(legacy)).toEqual({
      id: "q1",
      figureId: "f1",
      type: "order",
      quantity: 1,
      completedCounts: { s1: 1, s2: 1 },
      completedAt: "2026-04-01T08:26:13.501Z",
    })
  })

  it("preserves completedAt verbatim and never re-derives it", () => {
    // mismatched legacy data: no colors completed but a stamp present
    const stamped = migrateLegacyQueueItem(
      legacyQueueItem({ completedAt: "2026-01-01T00:00:00.000Z" })
    )
    expect(stamped.completedAt).toBe("2026-01-01T00:00:00.000Z")

    const { completedAt: _, ...withoutCompletedAt } = legacyQueueItem()
    expect(migrateLegacyQueueItem(withoutCompletedAt).completedAt).toBeNull()
  })

  it("migrateLegacyQueueItems maps a whole record by id", () => {
    const a = legacyQueueItem({ id: "a", completedColors: ["s1"] })
    const b = legacyQueueItem({ id: "b" })

    const result = migrateLegacyQueueItems({ a, b })

    expect(Object.keys(result).sort()).toEqual(["a", "b"])
    expect(result.a.completedCounts).toEqual({ s1: 1 })
    expect(result.b.quantity).toBe(1)
  })
})

describe("brandKey", () => {
  it("lowercases and trims", () => {
    expect(brandKey("  One Piece  ")).toBe("one piece")
    expect(brandKey("NARUTO")).toBe("naruto")
  })
})

describe("isValidFigureV1", () => {
  it("accepts a valid v1 figure", () => {
    expect(isValidFigureV1(v1Figure())).toBe(true)
  })

  it("rejects a figure without franchise (v2 shape)", () => {
    const { franchise: _, ...rest } = v1Figure()
    expect(isValidFigureV1({ ...rest, brandId: null })).toBe(false)
  })

  it("rejects non-record values", () => {
    expect(isValidFigureV1(null)).toBe(false)
    expect(isValidFigureV1("figure")).toBe(false)
    expect(isValidFigureV1([])).toBe(false)
  })

  it("rejects malformed requiredColors", () => {
    expect(
      isValidFigureV1(v1Figure({ requiredColors: [1] as unknown as string[] }))
    ).toBe(false)
  })
})

describe("migrateV1Figures", () => {
  it("mints one brand per distinct franchise and links figures by id", () => {
    const f1 = v1Figure({ id: "a", franchise: "One Piece" })
    const f2 = v1Figure({ id: "b", franchise: "Naruto" })
    const { brands, figures } = migrateV1Figures({ a: f1, b: f2 })

    expect(Object.keys(brands)).toHaveLength(2)
    const names = Object.values(brands).map((b) => b.name)
    expect(names.sort()).toEqual(["Naruto", "One Piece"])
    const onePiece = Object.values(brands).find((b) => b.name === "One Piece")!
    const naruto = Object.values(brands).find((b) => b.name === "Naruto")!
    expect(figures.a.brandId).toBe(onePiece.id)
    expect(figures.b.brandId).toBe(naruto.id)
    expect(brands[onePiece.id].id).toBe(onePiece.id)
  })

  it("maps empty and whitespace-only franchise to brandId null without minting a brand", () => {
    const f1 = v1Figure({ id: "a", franchise: "" })
    const f2 = v1Figure({ id: "b", franchise: "   " })
    const { brands, figures } = migrateV1Figures({ a: f1, b: f2 })

    expect(Object.keys(brands)).toHaveLength(0)
    expect(figures.a.brandId).toBeNull()
    expect(figures.b.brandId).toBeNull()
  })

  it("dedups case variants: first occurrence in ascending id order wins the casing", () => {
    const f1 = v1Figure({ id: "a", franchise: "Naruto" })
    const f2 = v1Figure({ id: "b", franchise: "naruto" })
    const { brands, figures } = migrateV1Figures({ b: f2, a: f1 })

    expect(Object.keys(brands)).toHaveLength(1)
    const brand = Object.values(brands)[0]
    expect(brand.name).toBe("Naruto")
    expect(figures.a.brandId).toBe(brand.id)
    expect(figures.b.brandId).toBe(brand.id)
  })

  it("uses the lower-id occurrence's casing even when it is lowercase", () => {
    const f1 = v1Figure({ id: "a", franchise: "naruto" })
    const f2 = v1Figure({ id: "b", franchise: "Naruto" })
    const { brands } = migrateV1Figures({ a: f1, b: f2 })

    expect(Object.values(brands)[0].name).toBe("naruto")
  })

  it("trims the franchise before using it as the brand name", () => {
    const f1 = v1Figure({ id: "a", franchise: "  One Piece  " })
    const { brands } = migrateV1Figures({ a: f1 })

    expect(Object.values(brands)[0].name).toBe("One Piece")
  })

  it("drops the franchise field and preserves every other figure field", () => {
    const f1 = v1Figure({
      id: "a",
      name: "Luffy",
      franchise: "One Piece",
      size: 80,
      notes: "gear five",
      requiredColors: ["s1", "s2"],
    })
    const { figures } = migrateV1Figures({ a: f1 })

    expect("franchise" in figures.a).toBe(false)
    expect(figures.a).toEqual({
      id: "a",
      name: "Luffy",
      brandId: figures.a.brandId,
      size: 80,
      notes: "gear five",
      requiredColors: ["s1", "s2"],
    })
    expect(figures.a.requiredColors).not.toBe(f1.requiredColors)
  })

  it("mints brand ids as UUIDs", () => {
    const { brands } = migrateV1Figures({
      a: v1Figure({ id: "a", franchise: "One Piece" }),
    })
    const brand = Object.values(brands)[0]
    expect(brand.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })

  describe("real-data fixture", () => {
    const expectedTable: Record<string, string[]> = {
      "One Piece": [
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
      ],
      Pokemon: ["Charmander", "Eevee", "Pikachu", "Squirtle", "Venusaur"],
      Marvel: ["Spiderman", "Venom"],
      "Lilo & Stitch": ["Angel", "Stitch"],
      Sonic: ["Sonic the Hedgehog"],
      Naruto: ["Kakashi"],
      "Dragon Ball": ["Goku"],
    }

    it("derives exactly the 7-brand / 22-figure table", () => {
      const v1Figures = loadFixtureFigures()
      const { brands, figures } = migrateV1Figures(v1Figures)

      expect(Object.keys(figures)).toHaveLength(22)
      expect(Object.keys(brands)).toHaveLength(7)

      const idByName = new Map(Object.values(brands).map((b) => [b.name, b.id]))
      expect([...idByName.keys()].sort()).toEqual(
        Object.keys(expectedTable).sort()
      )

      for (const [brandName, figureNames] of Object.entries(expectedTable)) {
        const brandId = idByName.get(brandName)
        const linked = Object.values(figures)
          .filter((f) => f.brandId === brandId)
          .map((f) => f.name)
        expect(linked.sort()).toEqual(figureNames.sort())
      }
    })

    it("no fixture figure retains a franchise field", () => {
      const { figures } = migrateV1Figures(loadFixtureFigures())
      for (const figure of Object.values(figures)) {
        expect("franchise" in figure).toBe(false)
      }
    })
  })
})
