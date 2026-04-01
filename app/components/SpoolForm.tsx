import { useState } from "react"

import { usePrintFlowStore } from "~/lib/store"
import type { Spool } from "~/lib/types"
import { Button } from "~/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { HexColorPicker } from "~/components/HexColorPicker"

interface SpoolFormProps {
  spool?: Spool
  onSave: () => void
  onCancel: () => void
}

const DEFAULT_HEX = "#6366f1"

export function SpoolForm({ spool, onSave, onCancel }: SpoolFormProps) {
  const [name, setName] = useState(spool?.name ?? "")
  const [hex, setHex] = useState(spool?.hex ?? DEFAULT_HEX)
  const [saved, setSaved] = useState(false)
  const createSpool = usePrintFlowStore((s) => s.createSpool)
  const updateSpool = usePrintFlowStore((s) => s.updateSpool)

  const canSave = name.trim().length > 0 && !saved

  function handleSave() {
    if (!canSave) return
    setSaved(true)
    if (spool) {
      updateSpool(spool.id, { name: name.trim(), hex })
    } else {
      createSpool({ name: name.trim(), hex })
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
            <FieldLabel htmlFor="spool-name">Name</FieldLabel>
            <Input
              id="spool-name"
              autoFocus={!spool}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. White PLA"
              data-testid="spool-name-input"
            />
          </Field>
          <Field>
            <FieldLabel>Color</FieldLabel>
            <HexColorPicker value={hex} onChange={setHex} />
          </Field>
        </FieldGroup>
      </div>
      <div className="shrink-0 border-t border-border/70 bg-popover/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] supports-backdrop-filter:bg-popover/90 supports-backdrop-filter:backdrop-blur-xs">
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
