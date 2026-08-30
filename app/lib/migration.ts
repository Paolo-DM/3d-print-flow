import type { Brand, Figure, Order, QueueItem } from "~/lib/types"
import { toCanonicalISOString } from "~/lib/date"

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

/** Schema-v3 queue row: batched quantities, but no first-class order. */
export interface QueueItemV3 {
  id: string
  figureId: string
  type: "stock" | "order"
  quantity: number
  completedCounts: Record<string, number>
  completedAt: string | null
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
export function migrateLegacyQueueItem(item: QueueItemLegacy): QueueItemV3 {
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
): Record<string, QueueItemV3> {
  const result: Record<string, QueueItemV3> = {}
  for (const [id, item] of Object.entries(queueItems)) {
    result[id] = migrateLegacyQueueItem(item)
  }
  return result
}

export function isValidQueueItemV3(value: unknown): value is QueueItemV3 {
  if (!isRecord(value)) return false
  if (
    typeof value.id !== "string" ||
    typeof value.figureId !== "string" ||
    (value.type !== "stock" && value.type !== "order") ||
    !Number.isInteger(value.quantity) ||
    (value.quantity as number) < 1 ||
    (value.quantity as number) > 99 ||
    !isRecord(value.completedCounts)
  ) {
    return false
  }
  return (
    Object.values(value.completedCounts).every(
      (count) =>
        Number.isInteger(count) &&
        (count as number) >= 0 &&
        (count as number) <= (value.quantity as number)
    ) &&
    (typeof value.completedAt === "string" || value.completedAt === null)
  )
}

function hash32(input: string, seed: number): number {
  let hash = seed >>> 0
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Stable UUID-shaped identifier for deterministic live/import migrations. */
export function deterministicUUID(input: string): string {
  const words = [
    hash32(input, 0x811c9dc5),
    hash32(input, 0x9e3779b9),
    hash32(input, 0x85ebca6b),
    hash32(input, 0xc2b2ae35),
  ]
  const hex = words.map((word) => word.toString(16).padStart(8, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${(
    (Number.parseInt(hex.slice(16, 18), 16) & 0x3f) |
    0x80
  )
    .toString(16)
    .padStart(2, "0")}${hex.slice(18, 20)}-${hex.slice(20, 32)}`
}

export function orderReferenceKey(reference: string): string {
  return reference.trim().toLowerCase()
}

export function makeUniqueOrderReference(
  base: string,
  usedKeys: Set<string>
): string {
  const trimmed = base.trim()
  let candidate = trimmed
  let suffix = 2
  while (usedKeys.has(orderReferenceKey(candidate))) {
    candidate = `${trimmed} · ${suffix}`
    suffix += 1
  }
  usedKeys.add(orderReferenceKey(candidate))
  return candidate
}

/** Convert v3 rows without merging, minting one deterministic order per row. */
export function migrateV3QueueItems(
  queueItems: Record<string, QueueItemV3>,
  figures: Record<string, Figure>,
  existingOrders: Record<string, Order> = {}
): { orders: Record<string, Order>; queueItems: Record<string, QueueItem> } {
  const orders: Record<string, Order> = { ...existingOrders }
  const migrated: Record<string, QueueItem> = {}
  const usedReferences = new Set(
    Object.values(orders).map((order) => orderReferenceKey(order.reference))
  )

  for (const queueItemId of Object.keys(queueItems).sort()) {
    const item = queueItems[queueItemId]
    let orderId: string | null = null
    if (item.type === "order") {
      orderId = deterministicUUID(`legacy-order:${item.id}`)
      const figureName = figures[item.figureId]?.name.trim() || "Unknown figure"
      const reference = makeUniqueOrderReference(
        `Imported · ${figureName} · ${item.id}`,
        usedReferences
      )
      orders[orderId] = {
        id: orderId,
        reference,
        customerName: null,
        platform: null,
        dueDate: null,
        notes: "",
        createdAt: toCanonicalISOString(
          item.completedAt,
          "1970-01-01T00:00:00.000Z"
        ),
      }
    }
    migrated[queueItemId] = {
      id: item.id,
      figureId: item.figureId,
      orderId,
      quantity: item.quantity,
      completedCounts: { ...item.completedCounts },
      completedAt: item.completedAt,
    }
  }

  return { orders, queueItems: migrated }
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
