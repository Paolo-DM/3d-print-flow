import { useState } from "react"

import { getPerceivedLightness } from "~/lib/color-utils"
import { computeAffectedQueueItems } from "~/lib/derived"
import { usePrintFlowStore } from "~/lib/store"
import type { Figure } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"

interface FigureFormProps {
  figure?: Figure
  onSave: () => void
  onCancel: () => void
}

export function FigureForm({ figure, onSave, onCancel }: FigureFormProps) {
  const [name, setName] = useState(figure?.name ?? "")
  const [franchise, setFranchise] = useState(figure?.franchise ?? "")
  const [size, setSize] = useState(figure?.size ?? 60)
  const [notes, setNotes] = useState(figure?.notes ?? "")
  const [selectedColors, setSelectedColors] = useState<string[]>(
    figure?.requiredColors ?? []
  )
  const [saved, setSaved] = useState(false)

  const spools = usePrintFlowStore((s) => s.spools)
  const queueItems = usePrintFlowStore((s) => s.queueItems)
  const createFigure = usePrintFlowStore((s) => s.createFigure)
  const updateFigure = usePrintFlowStore((s) => s.updateFigure)

  const spoolList = Array.from(spools.values())
  const affectedQueueItems = figure
    ? computeAffectedQueueItems(figure.id, queueItems)
    : []
  const canSave = name.trim().length > 0 && !saved

  function handleToggleSpool(spoolId: string) {
    setSelectedColors((prev) =>
      prev.includes(spoolId)
        ? prev.filter((id) => id !== spoolId)
        : [...prev, spoolId]
    )
  }

  function handleSave() {
    if (!canSave) return
    setSaved(true)
    const clampedSize = Math.round(Math.max(1, Math.min(999, size || 60)))
    const data = {
      name: name.trim(),
      franchise: franchise.trim(),
      size: clampedSize,
      notes,
      requiredColors: selectedColors.filter((id) => spools.has(id)),
    }
    if (figure) {
      updateFigure(figure.id, data)
    } else {
      createFigure(data)
    }
    onSave()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleSave()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col gap-6 p-4"
    >
      <FieldGroup className="min-h-0 flex-1">
        <Field>
          <FieldLabel htmlFor="figure-name">Name</FieldLabel>
          <Input
            id="figure-name"
            autoFocus={!figure}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Naruto Uzumaki"
            data-testid="figure-name-input"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="figure-franchise">Franchise</FieldLabel>
          <Input
            id="figure-franchise"
            value={franchise}
            onChange={(e) => setFranchise(e.target.value)}
            placeholder="e.g. Naruto Shippuden"
            data-testid="figure-franchise-input"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="figure-size">Size (%)</FieldLabel>
          <Input
            id="figure-size"
            type="number"
            min={1}
            max={999}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            data-testid="figure-size-input"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="figure-notes">Notes</FieldLabel>
          <Textarea
            id="figure-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            data-testid="figure-notes-input"
          />
        </Field>
        <Field className="min-h-0 flex-1">
          <FieldLabel>Colors</FieldLabel>
          {spoolList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No spools available. Create spools first.
            </p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-md">
              <div
                className="flex flex-wrap gap-2"
                data-testid="color-selection"
              >
                {spoolList.map((spool) => {
                  const isSelected = selectedColors.includes(spool.id)
                  const lightness = getPerceivedLightness(spool.hex)
                  return (
                    <button
                      key={spool.id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`Toggle ${spool.name}`}
                      onClick={() => handleToggleSpool(spool.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                        isSelected
                          ? "border-transparent bg-accent"
                          : "border-border bg-card"
                      )}
                      data-testid={`spool-toggle-${spool.id}`}
                    >
                      <div
                        className={cn(
                          "size-4 shrink-0 rounded-full",
                          lightness > 0.85 && "border border-border",
                          lightness < 0.15 && "dark:border dark:border-border"
                        )}
                        style={{ backgroundColor: spool.hex }}
                        aria-hidden="true"
                      />
                      <span>{spool.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </Field>
      </FieldGroup>
      <div className="mt-auto space-y-3">
        {figure && affectedQueueItems.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Saving will update {affectedQueueItems.length} queued item(s).
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSave}>
            Save
          </Button>
        </div>
      </div>
    </form>
  )
}
