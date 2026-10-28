import { useState } from "react"
import { Check } from "lucide-react"

import { hexToContrast } from "~/lib/color-utils"
import type { Spool } from "~/lib/types"
import { cn } from "~/lib/utils"

interface ColorChipProps {
  spool: Spool
  /** Copies printed in this color (clamped to quantity for display). */
  count: number
  /** Copies required — the queue entry's quantity. */
  quantity: number
  isCurrent?: boolean
  onClick?: () => void
}

/**
 * Three-state chip: pending → partial → full, advancing one copy per tap and
 * cycling past full back to 0. At quantity 1 it looks and behaves exactly like
 * the original two-state toggle (role="switch", same aria-labels). At higher
 * quantities the count is carried as redundant text (`1/2`) — never hue alone.
 */
export function ColorChip({
  spool,
  count,
  quantity,
  isCurrent,
  onClick,
}: ColorChipProps) {
  const isInteractive = onClick !== undefined
  const clamped = Math.min(count, quantity)
  const isCompleted = quantity > 0 && clamped >= quantity
  const isPartial = !isCompleted && clamped > 0
  const showCount = quantity > 1

  // Adjust state during render: remember the previous count so cycling past
  // full (reset to 0) gets a visually distinct treatment from an increment.
  // justReset is recomputed on EVERY count change — onAnimationEnd alone can
  // never clear it under prefers-reduced-motion (animation: none fires no
  // animationend), so a stale true must not survive the next change.
  const [prevCount, setPrevCount] = useState(count)
  const [justReset, setJustReset] = useState(false)
  if (prevCount !== count) {
    setPrevCount(count)
    setJustReset(count === 0 && prevCount >= quantity && quantity > 1)
  }

  const interactivity = isInteractive
    ? "cursor-pointer active:scale-[0.97]"
    : "cursor-default"

  if (isCompleted) {
    return (
      <button
        type="button"
        role={quantity === 1 ? "switch" : undefined}
        aria-checked={quantity === 1 ? true : undefined}
        aria-label={
          quantity === 1
            ? `Unmark ${spool.name}`
            : `${spool.name}: ${clamped} of ${quantity} copies printed`
        }
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-foreground/75 px-3 py-1.5 shadow-inner transition-[transform,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          interactivity
        )}
        disabled={!isInteractive}
        style={{ backgroundColor: spool.hex, color: hexToContrast(spool.hex) }}
        onClick={onClick}
      >
        <Check className="size-4 shrink-0 stroke-[3]" aria-hidden="true" />
        <span className="max-w-30 truncate text-xs font-medium">
          {spool.name}
        </span>
        {showCount ? (
          <span className="text-xs font-semibold tabular-nums">
            {clamped}/{quantity}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <button
      type="button"
      role={quantity === 1 ? "switch" : undefined}
      aria-checked={quantity === 1 ? false : undefined}
      aria-label={
        quantity === 1
          ? `Mark ${spool.name} as printed`
          : `${spool.name}: ${clamped} of ${quantity} copies printed`
      }
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border-2 bg-muted px-3 py-1.5 transition-[transform,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isPartial ? "border-foreground/40" : "border-transparent",
        interactivity,
        isCurrent && "ring-2 ring-primary",
        justReset && "animate-chip-reset"
      )}
      disabled={!isInteractive}
      onClick={onClick}
      onAnimationEnd={justReset ? () => setJustReset(false) : undefined}
    >
      <span
        className="size-4 shrink-0 rounded-full ring-1 ring-foreground/30"
        style={{ backgroundColor: spool.hex }}
        aria-hidden="true"
      />
      <span
        className={cn(
          "max-w-30 truncate text-xs",
          isPartial ? "font-medium text-foreground" : "text-muted-foreground"
        )}
      >
        {spool.name}
      </span>
      {showCount ? (
        <span
          className={cn(
            "text-xs tabular-nums",
            isPartial
              ? "font-semibold text-foreground"
              : "text-muted-foreground"
          )}
        >
          {clamped}/{quantity}
        </span>
      ) : null}
    </button>
  )
}
