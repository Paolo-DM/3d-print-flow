import type { Figure, QueueItem } from "~/lib/types"

export function getReferencingFigures(
  spoolId: string,
  figures: Map<string, Figure>
): Figure[] {
  return Array.from(figures.values()).filter((f) =>
    f.requiredColors.includes(spoolId)
  )
}

export function computeAffectedQueueItems(
  figureId: string,
  queueItems: Map<string, QueueItem>,
): QueueItem[] {
  return Array.from(queueItems.values()).filter(
    (qi) => qi.figureId === figureId,
  )
}
