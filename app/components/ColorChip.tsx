import { Check } from "lucide-react"

import { hexToContrast } from "~/lib/color-utils"
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
  const isInteractive = onClick !== undefined

  if (isCompleted) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={true}
        aria-label={`Unmark ${spool.name}`}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-foreground/75 px-3 py-1.5 shadow-inner transition-[transform,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isInteractive
            ? "cursor-pointer hover:scale-105 active:scale-95"
            : "cursor-default"
        )}
        disabled={!isInteractive}
        style={{ backgroundColor: spool.hex, color: hexToContrast(spool.hex) }}
        onClick={onClick}
      >
        <Check className="size-4 shrink-0 stroke-[3]" aria-hidden="true" />
        <span className="max-w-30 truncate text-xs font-medium">
          {spool.name}
        </span>
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
        "inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-transparent bg-muted px-3 py-1.5 transition-[transform,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
        className="size-4 shrink-0 rounded-full ring-1 ring-foreground/30"
        style={{ backgroundColor: spool.hex }}
        aria-hidden="true"
      />
      <span className="max-w-30 truncate text-xs text-muted-foreground">
        {spool.name}
      </span>
    </button>
  )
}
