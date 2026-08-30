import { startTransition } from "react"

import { replaceAll } from "~/lib/db"
import { isCanonicalISOString, isValidLocalDate } from "~/lib/date"
import {
  brandKey,
  isRecord,
  isValidFigureV1,
  isValidQueueItemLegacy,
  isValidQueueItemV3,
  migrateLegacyQueueItems,
  migrateV1Figures,
  migrateV3QueueItems,
  orderReferenceKey,
  type FigureV1,
  type QueueItemLegacy,
  type QueueItemV3,
} from "~/lib/migration"
import {
  drainPersistence,
  fromJSON,
  MAX_QUEUE_QUANTITY,
  setPersist,
  toJSON,
} from "~/lib/store"
import type { Brand, Figure, Order, QueueItem, Spool } from "~/lib/types"

export interface ExportEnvelope {
  version: 4
  exportedAt: string
  data: ReturnType<typeof toJSON>
}

export interface ExportEnvelopeV1 {
  version: 1
  exportedAt: string
  data: {
    spools: Record<string, Spool>
    figures: Record<string, FigureV1>
    queueItems: Record<string, QueueItemLegacy>
  }
}

export interface ExportEnvelopeV2 {
  version: 2
  exportedAt: string
  data: {
    spools: Record<string, Spool>
    brands: Record<string, Brand>
    figures: Record<string, Figure>
    queueItems: Record<string, QueueItemLegacy>
  }
}

export interface ExportEnvelopeV3 {
  version: 3
  exportedAt: string
  data: {
    spools: Record<string, Spool>
    brands: Record<string, Brand>
    figures: Record<string, Figure>
    queueItems: Record<string, QueueItemV3>
  }
}

export function buildExportData(): ExportEnvelope {
  return { version: 4, exportedAt: new Date().toISOString(), data: toJSON() }
}

function triggerDownload(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function formatLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function exportData() {
  triggerDownload(
    JSON.stringify(buildExportData(), null, 2),
    `3d-print-flow-export-${formatLocalDate()}.json`
  )
}

function isValidSpool(value: unknown): value is Spool {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.hex === "string"
  )
}

function isValidBrand(value: unknown): value is Brand {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  )
}

function isValidBrandCollection(
  value: unknown
): value is Record<string, Brand> {
  if (!isRecord(value)) return false
  const seen = new Set<string>()
  for (const [recordKey, brand] of Object.entries(value)) {
    if (!isValidBrand(brand) || recordKey !== brand.id) return false
    const normalizedName = brandKey(brand.name)
    if (!normalizedName || seen.has(normalizedName)) return false
    seen.add(normalizedName)
  }
  return true
}

function isValidFigure(value: unknown): value is Figure {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (typeof value.brandId === "string" || value.brandId === null) &&
    typeof value.size === "number" &&
    typeof value.notes === "string" &&
    Array.isArray(value.requiredColors) &&
    value.requiredColors.every((color) => typeof color === "string")
  )
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export { isValidLocalDate } from "~/lib/date"

export function isValidOrder(value: unknown): value is Order {
  if (!isRecord(value)) return false
  const optionalTrimmed = (field: unknown) =>
    field === null ||
    (typeof field === "string" && field.length > 0 && field === field.trim())
  return (
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.reference === "string" &&
    value.reference.length > 0 &&
    value.reference === value.reference.trim() &&
    optionalTrimmed(value.customerName) &&
    optionalTrimmed(value.platform) &&
    (value.dueDate === null ||
      (typeof value.dueDate === "string" && isValidLocalDate(value.dueDate))) &&
    typeof value.notes === "string" &&
    typeof value.createdAt === "string" &&
    isCanonicalISOString(value.createdAt)
  )
}

function isValidOrderCollection(
  value: unknown
): value is Record<string, Order> {
  if (!isRecord(value)) return false
  const references = new Set<string>()
  for (const [key, order] of Object.entries(value)) {
    if (!isValidOrder(order) || key !== order.id) return false
    const referenceKey = orderReferenceKey(order.reference)
    if (references.has(referenceKey)) return false
    references.add(referenceKey)
  }
  return true
}

export function isValidQueueItem(value: unknown): value is QueueItem {
  if (
    !isRecord(value) ||
    "type" in value ||
    typeof value.id !== "string" ||
    typeof value.figureId !== "string" ||
    !(
      value.orderId === null ||
      (typeof value.orderId === "string" && UUID_PATTERN.test(value.orderId))
    )
  ) {
    return false
  }
  const quantity = value.quantity
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_QUEUE_QUANTITY ||
    !isRecord(value.completedCounts)
  ) {
    return false
  }
  if (
    !Object.values(value.completedCounts).every(
      (count) =>
        typeof count === "number" &&
        Number.isInteger(count) &&
        count >= 0 &&
        count <= quantity
    )
  ) {
    return false
  }
  return (
    !("completedAt" in value) ||
    typeof value.completedAt === "string" ||
    value.completedAt === null
  )
}

function allEntriesMatch(
  record: unknown,
  validator: (value: unknown) => boolean
): boolean {
  return (
    isRecord(record) &&
    Object.entries(record).every(
      ([key, value]) =>
        validator(value) &&
        isRecord(value) &&
        typeof value.id === "string" &&
        key === value.id
    )
  )
}

function validateEnvelopeShell(data: unknown): data is {
  version: number
  exportedAt: string
  data: Record<string, unknown>
} {
  return (
    isRecord(data) &&
    typeof data.version === "number" &&
    typeof data.exportedAt === "string" &&
    isRecord(data.data)
  )
}

export function validateV1Envelope(data: unknown): data is ExportEnvelopeV1 {
  return (
    validateEnvelopeShell(data) &&
    data.version === 1 &&
    allEntriesMatch(data.data.spools, isValidSpool) &&
    allEntriesMatch(data.data.figures, isValidFigureV1) &&
    allEntriesMatch(data.data.queueItems, isValidQueueItemLegacy)
  )
}

export function validateV2Envelope(data: unknown): data is ExportEnvelopeV2 {
  return (
    validateEnvelopeShell(data) &&
    data.version === 2 &&
    allEntriesMatch(data.data.spools, isValidSpool) &&
    isValidBrandCollection(data.data.brands) &&
    allEntriesMatch(data.data.figures, isValidFigure) &&
    allEntriesMatch(data.data.queueItems, isValidQueueItemLegacy)
  )
}

export function validateV3Envelope(data: unknown): data is ExportEnvelopeV3 {
  return (
    validateEnvelopeShell(data) &&
    data.version === 3 &&
    allEntriesMatch(data.data.spools, isValidSpool) &&
    isValidBrandCollection(data.data.brands) &&
    allEntriesMatch(data.data.figures, isValidFigure) &&
    allEntriesMatch(data.data.queueItems, isValidQueueItemV3)
  )
}

export function validateExportEnvelope(data: unknown): data is ExportEnvelope {
  if (!validateEnvelopeShell(data) || data.version !== 4) return false
  const envelope = data.data
  if (
    !allEntriesMatch(envelope.spools, isValidSpool) ||
    !isValidBrandCollection(envelope.brands) ||
    !allEntriesMatch(envelope.figures, isValidFigure) ||
    !isValidOrderCollection(envelope.orders) ||
    !allEntriesMatch(envelope.queueItems, isValidQueueItem)
  ) {
    return false
  }
  const orders = envelope.orders as Record<string, Order>
  const queueItems = envelope.queueItems as Record<string, QueueItem>
  return Object.values(queueItems).every(
    (queueItem) => queueItem.orderId === null || orders[queueItem.orderId]
  )
}

function rebuildBrands(brands: Record<string, Brand>): Record<string, Brand> {
  return Object.fromEntries(
    Object.entries(brands).map(([key, brand]) => [
      key,
      { id: brand.id, name: brand.name },
    ])
  )
}

function rebuildFigures(
  figures: Record<string, Figure>
): Record<string, Figure> {
  return Object.fromEntries(
    Object.entries(figures).map(([key, figure]) => [
      key,
      {
        id: figure.id,
        name: figure.name,
        brandId: figure.brandId,
        size: figure.size,
        notes: figure.notes,
        requiredColors: [...figure.requiredColors],
      },
    ])
  )
}

function rebuildOrders(orders: Record<string, Order>): Record<string, Order> {
  return Object.fromEntries(
    Object.entries(orders).map(([key, order]) => [key, { ...order }])
  )
}

export function rebuildQueueItems(
  queueItems: Record<string, QueueItem>
): Record<string, QueueItem> {
  return Object.fromEntries(
    Object.entries(queueItems).map(([key, queueItem]) => {
      const completedCounts = Object.fromEntries(
        Object.entries(queueItem.completedCounts).flatMap(([spoolId, count]) =>
          Number.isInteger(count)
            ? [[spoolId, Math.max(0, Math.min(count, queueItem.quantity))]]
            : []
        )
      )
      return [
        key,
        {
          id: queueItem.id,
          figureId: queueItem.figureId,
          orderId: queueItem.orderId,
          quantity: queueItem.quantity,
          completedCounts,
          completedAt: queueItem.completedAt ?? null,
        },
      ]
    })
  )
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string))
      } catch {
        reject(new Error("The selected file is not valid JSON."))
      }
    }
    reader.onerror = () => reject(new Error("Failed to read file."))
    reader.readAsText(file)
  })
}

export async function importData(file: File): Promise<void> {
  const parsed = await readJsonFile(file)
  let next: ReturnType<typeof toJSON>

  if (validateV1Envelope(parsed)) {
    const migratedFigures = migrateV1Figures(parsed.data.figures)
    const migratedQueue = migrateV3QueueItems(
      migrateLegacyQueueItems(parsed.data.queueItems),
      migratedFigures.figures
    )
    next = {
      spools: parsed.data.spools,
      brands: migratedFigures.brands,
      figures: migratedFigures.figures,
      orders: migratedQueue.orders,
      queueItems: migratedQueue.queueItems,
    }
  } else if (validateV2Envelope(parsed)) {
    const figures = rebuildFigures(parsed.data.figures)
    const migratedQueue = migrateV3QueueItems(
      migrateLegacyQueueItems(parsed.data.queueItems),
      figures
    )
    next = {
      spools: parsed.data.spools,
      brands: rebuildBrands(parsed.data.brands),
      figures,
      orders: migratedQueue.orders,
      queueItems: migratedQueue.queueItems,
    }
  } else if (validateV3Envelope(parsed)) {
    const figures = rebuildFigures(parsed.data.figures)
    const migratedQueue = migrateV3QueueItems(parsed.data.queueItems, figures)
    next = {
      spools: parsed.data.spools,
      brands: rebuildBrands(parsed.data.brands),
      figures,
      orders: migratedQueue.orders,
      queueItems: migratedQueue.queueItems,
    }
  } else if (validateExportEnvelope(parsed)) {
    next = {
      spools: parsed.data.spools,
      brands: rebuildBrands(parsed.data.brands),
      figures: rebuildFigures(parsed.data.figures),
      orders: rebuildOrders(parsed.data.orders),
      queueItems: rebuildQueueItems(parsed.data.queueItems),
    }
  } else {
    throw new Error(
      "Invalid file format. Please select a file exported from 3D Print Flow."
    )
  }

  await drainPersistence()
  const previousState = toJSON()
  setPersist(false)
  try {
    startTransition(() => fromJSON(next))
    await replaceAll(next)
    setPersist(true)
  } catch {
    fromJSON(previousState)
    setPersist(true)
    throw new Error(
      "Import failed — your data has not been changed. Please try again."
    )
  }
}
