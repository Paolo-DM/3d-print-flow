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
  const isInteractive = onClick !== undefined

  if (isCompleted) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={true}
        aria-label={`Unmark ${spool.name}`}
        className={cn(
          "inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-150 ease-out",
          isInteractive ? "cursor-pointer active:scale-95" : "cursor-default",
        )}
        disabled={!isInteractive}
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
      </button>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={false}
      aria-label={`Mark ${spool.name} as printed`}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-2 rounded-full bg-muted px-3 py-1.5 transition-all duration-150 ease-out",
        isInteractive ? "cursor-pointer active:scale-95" : "cursor-default",
        isCurrent && "ring-2 ring-primary animate-pulse",
      )}
      disabled={!isInteractive}
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
    </button>
  )
}
