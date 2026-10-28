import { useState } from "react"
import { Shapes, Square, SquareCheck, SquareMinus } from "lucide-react"

import type { Brand, Figure } from "~/lib/types"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"

/** Filter/group id for figures without a resolvable brand. */
const NO_BRAND = "no-brand"

/** Brand chips shown before the rest collapse behind "+N more". */
const COLLAPSED_CHIP_LIMIT = 10

interface BrandGroup {
  id: string
  name: string
  figures: Figure[]
}

function groupFiguresByBrand(
  figures: Figure[],
  brands: Map<string, Brand>
): BrandGroup[] {
  const byBrandId = new Map<string, Figure[]>()
  for (const figure of figures) {
    // An unresolvable brandId groups under "No brand" (orphan tolerance)
    const groupId =
      figure.brandId !== null && brands.has(figure.brandId)
        ? figure.brandId
        : NO_BRAND
    const group = byBrandId.get(groupId)
    if (group) {
      group.push(figure)
    } else {
      byBrandId.set(groupId, [figure])
    }
  }

  const brandGroups: BrandGroup[] = []
  for (const [groupId, groupFigures] of byBrandId) {
    if (groupId === NO_BRAND) continue
    const brand = brands.get(groupId)
    if (!brand) continue
    brandGroups.push({ id: brand.id, name: brand.name, figures: groupFigures })
  }
  brandGroups.sort((a, b) => a.name.localeCompare(b.name))

  const brandless = byBrandId.get(NO_BRAND)
  if (brandless) {
    brandGroups.push({ id: NO_BRAND, name: "No brand", figures: brandless })
  }

  return brandGroups
}

export function BrandGroupedCatalog({
  figures,
  brands,
  renderFigure,
}: {
  figures: Figure[]
  brands: Map<string, Brand>
  renderFigure: (figure: Figure) => React.ReactNode
}) {
  // Deselected-id set: groups appearing later (inline create, import) are
  // visible by default. The whole component is key-reset on import.
  const [deselectedIds, setDeselectedIds] = useState<ReadonlySet<string>>(
    new Set()
  )

  const groups = groupFiguresByBrand(figures, brands)
  const visibleGroups = groups.filter((group) => !deselectedIds.has(group.id))
  const allSelected = visibleGroups.length === groups.length
  const allDeselected = groups.length > 0 && visibleGroups.length === 0

  function toggleGroup(id: string) {
    setDeselectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAll() {
    setDeselectedIds(
      allSelected ? new Set(groups.map((group) => group.id)) : new Set()
    )
  }

  // Many brands collapse behind a "+N more" chip. Deselected groups stay
  // visible so a hidden filter is never itself hidden.
  const collapsible = groups.length > COLLAPSED_CHIP_LIMIT + 2
  const [expanded, setExpanded] = useState(false)
  const chipGroups =
    collapsible && !expanded
      ? groups.filter(
          (group, index) =>
            index < COLLAPSED_CHIP_LIMIT || deselectedIds.has(group.id)
        )
      : groups
  const overflowCount = groups.length - chipGroups.length

  return (
    <div>
      <div
        className="mb-8 flex flex-wrap items-center gap-x-1.5 gap-y-3"
        role="group"
        aria-label="Filter by brand"
        data-testid="brand-filter"
      >
        {groups.length > 1 ? (
          <>
            <SelectAllToggle
              pressed={allSelected ? true : allDeselected ? false : "mixed"}
              onClick={toggleAll}
              data-testid="brand-filter-all"
            />
            <span className="mx-1.5 h-4 w-px bg-border" aria-hidden="true" />
          </>
        ) : null}
        {chipGroups.map((group) => (
          <FilterChip
            key={group.id}
            pressed={!deselectedIds.has(group.id)}
            count={group.figures.length}
            onClick={() => toggleGroup(group.id)}
            data-testid={`brand-filter-${group.id}`}
          >
            {group.name}
          </FilterChip>
        ))}
        {collapsible && (expanded || overflowCount > 0) ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((prev) => !prev)}
            className={cn(
              chipBase,
              "px-2.5 text-muted-foreground hover:text-foreground"
            )}
            data-testid="brand-filter-more"
          >
            {expanded ? "Show less" : `+${overflowCount} more`}
          </button>
        ) : null}
      </div>

      {allDeselected ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Shapes />
            </EmptyMedia>
            <EmptyTitle>All brands hidden</EmptyTitle>
            <EmptyDescription>
              Every brand is deselected. Show all brands to see your figures
              again.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setDeselectedIds(new Set())}>
              Show all
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="animate-fade-in-up space-y-8">
          {visibleGroups.map((group) => (
            <section key={group.id} data-testid="brand-section">
              <h2 className="mb-3 text-lg font-semibold">{group.name}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {group.figures.map(renderFigure)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Shared chip shell: 32px visual height, with the ::after hit area padding it
 * out to 44px for touch. The row's 12px vertical gap keeps hit areas apart.
 */
const chipBase =
  "relative inline-flex h-8 items-center gap-1.5 rounded-full border border-transparent text-sm whitespace-nowrap outline-none select-none transition-[color,background-color,border-color,scale] duration-150 ease-out after:absolute after:inset-x-0 after:-inset-y-1.5 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]"

/**
 * Master toggle for the brand chips. Styled as a tri-state checkbox rather
 * than a chip so it never reads as one more brand.
 */
function SelectAllToggle({
  pressed,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-pressed" | "children"> & {
  pressed: boolean | "mixed"
}) {
  const Icon =
    pressed === true ? SquareCheck : pressed === "mixed" ? SquareMinus : Square
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        chipBase,
        "-ml-1 px-2 font-medium text-foreground hover:bg-muted"
      )}
      {...props}
    >
      <Icon
        className={cn(
          "size-4",
          pressed === false ? "text-muted-foreground" : "text-primary"
        )}
        aria-hidden="true"
      />
      <span data-slot="chip-label">All brands</span>
    </button>
  )
}

function FilterChip({
  pressed,
  count,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-pressed"> & {
  pressed: boolean
  count: number
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        chipBase,
        "pr-2.5 pl-3",
        pressed
          ? "bg-accent font-medium text-accent-foreground hover:bg-primary/15"
          : "border-dashed border-foreground/25 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        className
      )}
      {...props}
    >
      <span
        data-slot="chip-label"
        className={cn(
          !pressed && "line-through decoration-muted-foreground/60"
        )}
      >
        {children}
      </span>
      <span
        className={cn(
          "text-xs tabular-nums",
          pressed ? "text-accent-foreground/70" : "text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  )
}
