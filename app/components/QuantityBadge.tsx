import { Badge } from "~/components/ui/badge"

/** ×N marker for multi-copy queue entries — renders nothing at quantity 1. */
export function QuantityBadge({ quantity }: { quantity: number }) {
  if (quantity <= 1) return null
  return (
    <Badge
      variant="secondary"
      className="tabular-nums"
      data-testid="quantity-badge"
    >
      ×{quantity}
    </Badge>
  )
}
