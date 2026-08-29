import { startTransition } from "react"

import { replaceAll } from "~/lib/db"
import {
  brandKey,
  isRecord,
  isValidFigureV1,
  migrateV1Figures,
  type FigureV1,
} from "~/lib/migration"
import { fromJSON, setPersist, toJSON } from "~/lib/store"
import type { Brand, Figure, QueueItem, Spool } from "~/lib/types"

export interface ExportEnvelope {
  version: 2
  exportedAt: string
  data: ReturnType<typeof toJSON>
}

/** Legacy v1 envelope — accepted as import input only, never exported. */
export interface ExportEnvelopeV1 {
  version: 1
  exportedAt: string
  data: {
    spools: Record<string, Spool>
    figures: Record<string, FigureV1>
    queueItems: Record<string, QueueItem>
  }
}

export function buildExportData(): ExportEnvelope {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: toJSON(),
  }
}

function triggerDownload(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
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
  const envelope = buildExportData()
  const json = JSON.stringify(envelope, null, 2)
  const filename = `3d-print-flow-export-${formatLocalDate()}.json`
  triggerDownload(json, filename)
}

function isValidSpool(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.hex === "string"
  )
}

function isValidBrand(value: unknown): value is Brand {
  if (!isRecord(value)) return false
  return typeof value.id === "string" && typeof value.name === "string"
}

/**
 * A v2 brand collection must uphold the invariant the brand lifecycle commands
 * rely on: every name non-blank, every `brandKey` unique. Figures are not
 * checked against it — orphan tolerance still stands.
 */
function isValidBrandCollection(
  value: unknown
): value is Record<string, Brand> {
  if (!isRecord(value)) return false
  const seenKeys = new Set<string>()
  for (const brand of Object.values(value)) {
    if (!isValidBrand(brand)) return false
    const key = brandKey(brand.name)
    if (key.length === 0 || seenKeys.has(key)) return false
    seenKeys.add(key)
  }
  return true
}

function isValidFigure(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (typeof value.brandId === "string" || value.brandId === null) &&
    typeof value.size === "number" &&
    typeof value.notes === "string" &&
    Array.isArray(value.requiredColors) &&
    value.requiredColors.every((c: unknown) => typeof c === "string")
  )
}

function isValidQueueItem(value: unknown): boolean {
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

function allValuesMatch(
  record: unknown,
  validator: (v: unknown) => boolean
): boolean {
  if (!isRecord(record)) return false
  return Object.values(record).every(validator)
}

function validateEnvelopeShell(data: unknown): data is {
  version: number
  exportedAt: string
  data: Record<string, unknown>
} {
  if (!isRecord(data)) return false
  if (typeof data.version !== "number") return false
  if (typeof data.exportedAt !== "string") return false
  return isRecord(data.data)
}

export function validateV1Envelope(data: unknown): data is ExportEnvelopeV1 {
  if (!validateEnvelopeShell(data)) return false
  if (data.version !== 1) return false

  const d = data.data
  return (
    allValuesMatch(d.spools, isValidSpool) &&
    allValuesMatch(d.figures, isValidFigureV1) &&
    allValuesMatch(d.queueItems, isValidQueueItem)
  )
}

export function validateExportEnvelope(data: unknown): data is ExportEnvelope {
  if (!validateEnvelopeShell(data)) return false
  if (data.version !== 2) return false

  const d = data.data
  return (
    allValuesMatch(d.spools, isValidSpool) &&
    isValidBrandCollection(d.brands) &&
    allValuesMatch(d.figures, isValidFigure) &&
    allValuesMatch(d.queueItems, isValidQueueItem)
  )
}

/** Rebuild with explicit fields so stray properties (e.g. a leftover `franchise` on a v2 figure) are stripped, never persisted. */
function rebuildBrands(brands: Record<string, Brand>): Record<string, Brand> {
  const result: Record<string, Brand> = {}
  for (const [id, brand] of Object.entries(brands)) {
    result[id] = { id: brand.id, name: brand.name }
  }
  return result
}

function rebuildFigures(
  figures: Record<string, Figure>
): Record<string, Figure> {
  const result: Record<string, Figure> = {}
  for (const [id, figure] of Object.entries(figures)) {
    result[id] = {
      id: figure.id,
      name: figure.name,
      brandId: figure.brandId,
      size: figure.size,
      notes: figure.notes,
      requiredColors: [...figure.requiredColors],
    }
  }
  return result
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
    const { brands, figures } = migrateV1Figures(parsed.data.figures)
    next = {
      spools: parsed.data.spools,
      brands,
      figures,
      queueItems: parsed.data.queueItems,
    }
  } else if (validateExportEnvelope(parsed)) {
    next = {
      spools: parsed.data.spools,
      brands: rebuildBrands(parsed.data.brands),
      figures: rebuildFigures(parsed.data.figures),
      queueItems: parsed.data.queueItems,
    }
  } else {
    throw new Error(
      "Invalid file format. Please select a file exported from 3D Print Flow."
    )
  }

  const previousState = toJSON()

  setPersist(false)
  try {
    startTransition(() => {
      fromJSON(next)
    })
    await replaceAll(next)
    setPersist(true)
  } catch (error) {
    fromJSON(previousState)
    setPersist(true)
    throw new Error(
      "Import failed — your data has not been changed. Please try again."
    )
  }
}
