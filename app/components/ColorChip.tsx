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
          "inline-flex min-h-10 items-center gap-1.5 rounded-full px-2.5 py-1 shadow-inner transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isInteractive
            ? "cursor-pointer hover:scale-105 active:scale-95"
            : "cursor-default"
        )}
        disabled={!isInteractive}
        style={{ backgroundColor: spool.hex, color: hexToContrast(spool.hex) }}
        onClick={onClick}
      >
        <span
          className={cn(
            "size-3.5 shrink-0 rounded-full bg-white/35",
            lightness > 0.85 && "border border-border",
            lightness < 0.15 && "dark:border dark:border-border"
          )}
          aria-hidden="true"
        />
        <span className="max-w-30 truncate text-xs">{spool.name}</span>
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
        "inline-flex min-h-10 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isInteractive
          ? "cursor-pointer hover:scale-105 active:scale-95"
          : "cursor-default",
        isCurrent &&
          "animate-[pulse_2s_ease-in-out_infinite] ring-2 ring-primary"
      )}
      disabled={!isInteractive}
      onClick={onClick}
    >
      <span
        className={cn(
          "size-3.5 shrink-0 rounded-full opacity-40",
          lightness > 0.85 && "border border-border",
          lightness < 0.15 && "dark:border dark:border-border"
        )}
        style={{ backgroundColor: spool.hex }}
        aria-hidden="true"
      />
      <span className="max-w-30 truncate text-xs text-muted-foreground">
        {spool.name}
      </span>
    </button>
  )
}
