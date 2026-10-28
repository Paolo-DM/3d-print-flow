import { useState } from "react"

import { getPerceivedLightness } from "~/lib/color-utils"
import { computeAffectedQueueItems } from "~/lib/derived"
import { usePrintFlowStore } from "~/lib/store"
import type { Figure } from "~/lib/types"
import { cn } from "~/lib/utils"
import { BrandCombobox, type BrandSelection } from "~/components/BrandCombobox"
import { NOTES_MAX_LENGTH, NotesCounter } from "~/components/Notes"
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
  const spools = usePrintFlowStore((s) => s.spools)
  const brands = usePrintFlowStore((s) => s.brands)
  const queueItems = usePrintFlowStore((s) => s.queueItems)
  const createFigure = usePrintFlowStore((s) => s.createFigure)
  const updateFigure = usePrintFlowStore((s) => s.updateFigure)
  const createBrand = usePrintFlowStore((s) => s.createBrand)

  const [name, setName] = useState(figure?.name ?? "")
  // An unresolvable brandId renders as brandless; saving then writes null.
  const [brandSelection, setBrandSelection] = useState<BrandSelection>(() =>
    figure?.brandId != null && brands.has(figure.brandId)
      ? { kind: "existing", brandId: figure.brandId }
      : { kind: "none" }
  )
  const [size, setSize] = useState(figure?.size ?? 60)
  const [notes, setNotes] = useState(figure?.notes ?? "")
  const [selectedColors, setSelectedColors] = useState<string[]>(
    figure?.requiredColors ?? []
  )
  const [saved, setSaved] = useState(false)

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

  function resolveBrandId(): string | null {
    switch (brandSelection.kind) {
      case "existing":
        // Re-resolved against the live brands map: a brand deleted since the
        // form opened saves as null rather than as an orphan reference.
        return brands.has(brandSelection.brandId)
          ? brandSelection.brandId
          : null
      case "new":
        // Staged inline creation: committed only now, at save.
        return createBrand(brandSelection.name)
      case "none":
        return null
    }
  }

  function handleSave() {
    if (!canSave) return
    setSaved(true)
    const clampedSize = Math.round(Math.max(1, Math.min(999, size || 60)))
    const brandId = resolveBrandId()
    const data = {
      name: name.trim(),
      brandId,
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
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        <FieldGroup className="gap-6">
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
            <FieldLabel htmlFor="figure-brand">Brand</FieldLabel>
            <BrandCombobox
              id="figure-brand"
              brands={brands}
              value={brandSelection}
              onChange={setBrandSelection}
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
              placeholder="e.g. Paint the spots with the darker green"
              maxLength={NOTES_MAX_LENGTH}
              data-testid="figure-notes-input"
            />
            <NotesCounter length={notes.length} />
          </Field>
          <Field>
            <FieldLabel>Colors</FieldLabel>
            {spoolList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No spools available. Create spools first.
              </p>
            ) : (
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
                          ? "border-primary bg-accent"
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
            )}
          </Field>
        </FieldGroup>
      </div>
      <div className="shrink-0 space-y-3 border-t border-border/70 bg-popover/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] supports-backdrop-filter:bg-popover/90 supports-backdrop-filter:backdrop-blur-xs">
        {figure && affectedQueueItems.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Saving will update {affectedQueueItems.length} queued item(s).
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!canSave} className="flex-1">
            Save
          </Button>
        </div>
      </div>
    </form>
  )
}
