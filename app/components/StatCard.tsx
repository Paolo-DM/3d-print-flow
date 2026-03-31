import { cn } from "~/lib/utils"
import { Card, CardContent } from "~/components/ui/card"

type StatAccent = "queue" | "colors" | "orders" | "completed"

interface StatCardProps {
  label: string
  value: number
  accent?: StatAccent
  className?: string
}

export function StatCard({ label, value, accent, className }: StatCardProps) {
  return (
    <Card
      className={cn(
        "border-l-[3px] bg-card px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
      style={
        accent
          ? ({
              borderLeftColor: `var(--stat-${accent})`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <CardContent className="p-0">
        <p
          className="text-3xl font-black tracking-tight tabular-nums"
          style={
            accent
              ? ({ color: `var(--stat-${accent})` } as React.CSSProperties)
              : undefined
          }
        >
          {value}
        </p>
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
      </CardContent>
    </Card>
  )
}
