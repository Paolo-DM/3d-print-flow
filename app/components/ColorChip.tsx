import { getPerceivedLightness, hexToContrast } from "~/lib/color-utils"
import type { Spool } from "~/lib/types"
import { cn } from "~/lib/utils"

interface ColorChipProps {
  spool: Spool
  isCompleted: boolean
  isCurrent?: boolean
  onClick?: () => void
}

export function ColorChip({
  spool,
  isCompleted,
  isCurrent,
  onClick,
}: ColorChipProps) {
  const lightness = getPerceivedLightness(spool.hex)

  if (isCompleted) {
    return (
      <span
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 py-1.5"
        style={{ backgroundColor: spool.hex, color: hexToContrast(spool.hex) }}
        onClick={onClick}
      >
        <span
          className={cn(
            "size-[18px] shrink-0 rounded-full bg-white/35",
            lightness > 0.85 && "border border-border",
            lightness < 0.15 && "dark:border dark:border-border",
          )}
        />
        <span className="text-sm">{spool.name}</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex min-h-[44px] items-center gap-2 rounded-full bg-muted px-3 py-1.5",
        isCurrent && "ring-2 ring-primary animate-pulse",
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          "size-[18px] shrink-0 rounded-full opacity-40",
          lightness > 0.85 && "border border-border",
          lightness < 0.15 && "dark:border dark:border-border",
        )}
        style={{ backgroundColor: spool.hex }}
      />
      <span className="text-sm text-muted-foreground">{spool.name}</span>
    </span>
  )
}
