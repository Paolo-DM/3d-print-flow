import { toJSON } from "~/lib/store"

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
