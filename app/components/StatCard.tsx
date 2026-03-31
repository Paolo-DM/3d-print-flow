import { cn } from "~/lib/utils"
import { Card, CardContent } from "~/components/ui/card"

interface StatCardProps {
  label: string
  value: number
  className?: string
}

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <Card className={cn("p-4 py-0", className)}>
      <CardContent className="p-0">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
