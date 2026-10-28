import type { SpoolFinish } from "~/lib/types"
import { Badge } from "~/components/ui/badge"

export const FINISH_LABELS: Record<SpoolFinish, string> = {
  basic: "Basic",
  matte: "Matte",
}

/** Text, not a swatch effect: the finish must read without relying on color. */
export function FinishBadge({ finish }: { finish?: SpoolFinish }) {
  if (!finish) return null
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      {FINISH_LABELS[finish]}
    </Badge>
  )
}
