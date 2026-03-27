import type { Figure } from "~/lib/types"

export function getReferencingFigures(
  spoolId: string,
  figures: Map<string, Figure>
): Figure[] {
  return Array.from(figures.values()).filter((f) =>
    f.requiredColors.includes(spoolId)
  )
}
