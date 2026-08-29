import type { Brand, Figure, QueueItem } from "~/lib/types"

/** Legacy figure shape from schema v1 (free-text franchise). */
export interface FigureV1 {
  id: string
  name: string
  franchise: string
  size: number
  notes: string
  requiredColors: string[]
}

/**
 * Legacy queue-item shape from schema v1/v2 (one row = one physical copy,
 * completed colors as a set). Used only by legacy envelopes and the IDB
 * migration guard, so those paths don't silently inherit the v3 shape.
 */
export interface QueueItemLegacy {
  id: string
  figureId: string
  type: "stock" | "order"
  completedColors: string[]
  completedAt?: string | null
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

export function isValidQueueItemLegacy(
  value: unknown
): value is QueueItemLegacy {
  if (!isRecord(value)) return false
  return (
    typeof value.id === "string" &&
    typeof value.figureId === "string" &&
    (value.type === "stock" || value.type === "order") &&
    Array.isArray(value.completedColors) &&
    value.completedColors.every((c: unknown) => typeof c === "string") &&
    (!("completedAt" in value) ||
      typeof value.completedAt === "string" ||
      value.completedAt === null)
  )
}

/**
 * Single legacy→v3 mapping shared by the IDB live migration and the v1/v2
 * import paths: quantity 1, each completed color becomes a count of 1, and
 * `completedAt` is preserved verbatim (never re-derived here — the canonical
 * rule self-heals mismatches on the next mutation).
 */
export function migrateLegacyQueueItem(item: QueueItemLegacy): QueueItem {
  return {
    id: item.id,
    figureId: item.figureId,
    type: item.type,
    quantity: 1,
    completedCounts: Object.fromEntries(
      item.completedColors.map((spoolId) => [spoolId, 1])
    ),
    completedAt: item.completedAt ?? null,
  }
}

export function migrateLegacyQueueItems(
  queueItems: Record<string, QueueItemLegacy>
): Record<string, QueueItem> {
  const result: Record<string, QueueItem> = {}
  for (const [id, item] of Object.entries(queueItems)) {
    result[id] = migrateLegacyQueueItem(item)
  }
  return result
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
