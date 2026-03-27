import React, { Suspense, useState } from "react"

import { getPerceivedLightness } from "~/lib/color-utils"
import { cn } from "~/lib/utils"
import { Input } from "~/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"

const LazyHexColorPicker = React.lazy(() =>
  import("react-colorful").then((m) => ({ default: m.HexColorPicker }))
)

interface HexColorPickerProps {
  value: string
  onChange: (hex: string) => void
}

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

export function HexColorPicker({ value, onChange }: HexColorPickerProps) {
  const [inputValue, setInputValue] = useState(value)
  const [open, setOpen] = useState(false)
  const lightness = getPerceivedLightness(value)

  function handlePickerChange(hex: string) {
    onChange(hex)
    setInputValue(hex)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.toLowerCase()
    if (!raw.startsWith("#")) {
      raw = `#${raw}`
    }
    raw = raw.slice(0, 7)
    setInputValue(raw)
    if (HEX_PATTERN.test(raw)) {
      onChange(raw)
    }
  }

  function handleOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setInputValue(value)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "size-8 shrink-0 rounded-full",
            lightness > 0.85 && "border border-border",
            lightness < 0.15 && "dark:border dark:border-border"
          )}
          style={{ backgroundColor: value }}
          aria-label={`Color: ${value}`}
          data-testid="color-swatch-trigger"
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Suspense
          fallback={
            <div className="h-[200px] w-[200px] rounded bg-muted" />
          }
        >
          <LazyHexColorPicker color={value} onChange={handlePickerChange} />
        </Suspense>
        <Input
          value={inputValue}
          onChange={handleInputChange}
          maxLength={7}
          aria-label="Hex color value"
          data-testid="hex-input"
        />
      </PopoverContent>
    </Popover>
  )
}
