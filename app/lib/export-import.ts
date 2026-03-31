import { startTransition } from "react"

import { replaceAll } from "~/lib/db"
import { fromJSON, setPersist, toJSON } from "~/lib/store"

export interface ExportEnvelope {
  version: number
  exportedAt: string
  data: ReturnType<typeof toJSON>
}

export function buildExportData(): ExportEnvelope {
  return {
    version: 1,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidSpool(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.hex === "string"
  )
}

function isValidFigure(value: unknown): boolean {
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

export function validateExportEnvelope(
  data: unknown
): data is ExportEnvelope {
  if (!isRecord(data)) return false
  if (typeof data.version !== "number") return false
  if (typeof data.exportedAt !== "string") return false
  if (!isRecord(data.data)) return false

  const d = data.data
  if (!isRecord(d.spools) || !isRecord(d.figures) || !isRecord(d.queueItems))
    return false

  return (
    allValuesMatch(d.spools, isValidSpool) &&
    allValuesMatch(d.figures, isValidFigure) &&
    allValuesMatch(d.queueItems, isValidQueueItem)
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

  if (!validateExportEnvelope(parsed)) {
    throw new Error(
      "Invalid file format. Please select a file exported from 3D Print Flow."
    )
  }

  const previousState = toJSON()

  setPersist(false)
  try {
    startTransition(() => {
      fromJSON(parsed.data)
    })
    await replaceAll(parsed.data)
    setPersist(true)
  } catch (error) {
    fromJSON(previousState)
    setPersist(true)
    throw new Error(
      "Import failed — your data has not been changed. Please try again."
    )
  }
}
