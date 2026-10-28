import { useState } from "react"
import { StickyNote } from "lucide-react"

import { cn } from "~/lib/utils"

/** Longest note a figure or order accepts from the forms. */
export const NOTES_MAX_LENGTH = 500

// ponytail: character/line heuristic instead of measuring overflow; a narrow
// card can clamp a shorter note with no toggle. Measure with a ref if it bites.
const CLAMP_MIN_LENGTH = 140
const CLAMP_MIN_LINES = 4

/**
 * Free-text notes as a quiet callout — they are print instructions, so they
 * read stronger than metadata. Long notes clamp to three lines with a toggle.
 * Renders nothing when there are none.
 */
export function Notes({
  notes,
  className,
}: {
  notes: string | undefined
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const text = notes?.trim()
  if (!text) return null

  const clampable =
    text.length > CLAMP_MIN_LENGTH || text.split("\n").length >= CLAMP_MIN_LINES

  return (
    <div
      className={cn(
        "flex gap-2 rounded-md bg-muted/70 px-2.5 py-2 text-xs/relaxed text-foreground/80",
        className
      )}
      data-testid="notes"
    >
      <StickyNote
        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "wrap-anywhere whitespace-pre-wrap",
            clampable && !expanded && "line-clamp-3"
          )}
        >
          <span className="sr-only">Notes: </span>
          {text}
        </p>
        {clampable ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((prev) => !prev)}
            className="relative mt-1 font-medium text-primary after:absolute after:-inset-2 hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Live character count under a notes textarea, shown once nearing the cap. */
export function NotesCounter({ length }: { length: number }) {
  if (length < NOTES_MAX_LENGTH * 0.8) return null
  return (
    <p
      className={cn(
        "text-right text-xs tabular-nums",
        length >= NOTES_MAX_LENGTH
          ? "text-destructive"
          : "text-muted-foreground"
      )}
      aria-live="polite"
    >
      {length}/{NOTES_MAX_LENGTH}
    </p>
  )
}
