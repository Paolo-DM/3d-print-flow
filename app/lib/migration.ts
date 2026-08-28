import type { Brand, Figure } from "~/lib/types"

/** Legacy figure shape from schema v1 (free-text franchise). */
export interface FigureV1 {
  id: string
  name: string
  franchise: string
  size: number
  notes: string
  requiredColors: string[]
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isValidFigureV1(value: unknown): value is FigureV1 {
  if (!isRecord(value)) return false
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.franchise === "string" &&
    typeof value.size === "number" &&
    typeof value.notes === "string" &&
    Array.isArray(value.requiredColors) &&
    value.requiredColors.every((c: unknown) => typeof c === "string")
  )
}

/** Dedup key for brand names: case-insensitive match on the trimmed name. */
export function brandKey(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Single derivation rule shared by v1 import migration and live IndexedDB
 * migration: trim the franchise; empty maps to `brandId: null` (no brand
 * minted); dedup key is the lowercased trimmed name; the first occurrence's
 * casing becomes the brand's name. Figures are processed in ascending
 * figure-id order (JS string sort = IDB key order) so "first occurrence"
 * is deterministic across both migration paths.
 */
export function migrateV1Figures(figures: Record<string, FigureV1>): {
  brands: Record<string, Brand>
  figures: Record<string, Figure>
} {
  const brands: Record<string, Brand> = {}
  const brandIdByKey = new Map<string, string>()
  const migrated: Record<string, Figure> = {}

  for (const figureId of Object.keys(figures).sort()) {
    const figure = figures[figureId]
    const name = figure.franchise.trim()
    let brandId: string | null = null

    if (name.length > 0) {
      const key = brandKey(name)
      const existingId = brandIdByKey.get(key)
      if (existingId !== undefined) {
        brandId = existingId
      } else {
        brandId = crypto.randomUUID()
        brandIdByKey.set(key, brandId)
        brands[brandId] = { id: brandId, name }
      }
    }

    migrated[figureId] = {
      id: figure.id,
      name: figure.name,
      brandId,
      size: figure.size,
      notes: figure.notes,
      requiredColors: [...figure.requiredColors],
    }
  }

  return { brands, figures: migrated }
}
