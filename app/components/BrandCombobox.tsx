import { useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { brandKey } from "~/lib/migration"
import type { Brand } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"

export type BrandSelection =
  | { kind: "none" }
  | { kind: "existing"; brandId: string }
  | { kind: "new"; name: string }

interface BrandComboboxProps {
  brands: Map<string, Brand>
  value: BrandSelection
  onChange: (value: BrandSelection) => void
  id?: string
}

export function BrandCombobox({
  brands,
  value,
  onChange,
  id,
}: BrandComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const sortedBrands = Array.from(brands.values()).toSorted((a, b) =>
    a.name.localeCompare(b.name)
  )
  const trimmedQuery = query.trim()
  const filteredBrands = trimmedQuery
    ? sortedBrands.filter((brand) =>
        brand.name.toLowerCase().includes(trimmedQuery.toLowerCase())
      )
    : sortedBrands
  const exactMatch = sortedBrands.find(
    (brand) => brandKey(brand.name) === brandKey(trimmedQuery)
  )

  // A staged (not yet committed) new brand gets its own selected row so the
  // open list agrees with what the trigger shows.
  const stagedName = value.kind === "new" ? value.name : null
  const showStagedRow =
    stagedName !== null &&
    (trimmedQuery.length === 0 ||
      stagedName.toLowerCase().includes(trimmedQuery.toLowerCase()))
  const queryMatchesStaged =
    stagedName !== null && brandKey(stagedName) === brandKey(trimmedQuery)
  const showCreateRow =
    trimmedQuery.length > 0 && exactMatch === undefined && !queryMatchesStaged

  const label =
    value.kind === "existing"
      ? (brands.get(value.brandId)?.name ?? "No brand")
      : value.kind === "new"
        ? value.name
        : "No brand"

  function select(selection: BrandSelection) {
    onChange(selection)
    handleOpenChange(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setQuery("")
  }

  function isSelected(brand: Brand) {
    return value.kind === "existing" && value.brandId === brand.id
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return
    e.preventDefault()
    if (trimmedQuery.length === 0) return
    if (exactMatch) {
      select({ kind: "existing", brandId: exactMatch.id })
    } else if (stagedName !== null && queryMatchesStaged) {
      select({ kind: "new", name: stagedName })
    } else {
      select({ kind: "new", name: trimmedQuery })
    }
  }

  return (
    <Popover modal open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          data-testid="brand-combobox-trigger"
        >
          <span
            className={cn(
              "truncate",
              value.kind === "none" && "text-muted-foreground"
            )}
          >
            {label}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) gap-1.5"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search or create brand..."
          data-testid="brand-combobox-input"
        />
        <div
          className="flex max-h-56 flex-col gap-0.5 overflow-y-auto"
          role="listbox"
          aria-label="Brands"
        >
          <button
            type="button"
            role="option"
            aria-selected={value.kind === "none"}
            onClick={() => select({ kind: "none" })}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
            data-testid="brand-option-none"
          >
            <Check
              className={cn(
                "size-4 shrink-0",
                value.kind === "none" ? "opacity-100" : "opacity-0"
              )}
              aria-hidden="true"
            />
            No brand
          </button>
          {filteredBrands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              role="option"
              aria-selected={isSelected(brand)}
              onClick={() => select({ kind: "existing", brandId: brand.id })}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              data-testid={`brand-option-${brand.id}`}
            >
              <Check
                className={cn(
                  "size-4 shrink-0",
                  isSelected(brand) ? "opacity-100" : "opacity-0"
                )}
                aria-hidden="true"
              />
              <span className="truncate">{brand.name}</span>
            </button>
          ))}
          {stagedName !== null && showStagedRow ? (
            <button
              type="button"
              role="option"
              aria-selected={true}
              onClick={() => select({ kind: "new", name: stagedName })}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              data-testid="brand-option-staged"
            >
              <Check
                className="size-4 shrink-0 opacity-100"
                aria-hidden="true"
              />
              <span className="truncate">{stagedName}</span>
            </button>
          ) : null}
          {showCreateRow ? (
            <button
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => select({ kind: "new", name: trimmedQuery })}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              data-testid="brand-create-option"
            >
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Create &ldquo;{trimmedQuery}&rdquo;
              </span>
            </button>
          ) : null}
        </div>
        {filteredBrands.length === 0 && !showCreateRow && !showStagedRow ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            No brands found.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
