import { useEffect, useState } from "react"

const systemNow = () => new Date()

export function formatLocalToday(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Local date that refreshes just after midnight without polling. */
export function useToday(now: () => Date = systemNow): string {
  const [today, setToday] = useState(() => formatLocalToday(now()))

  useEffect(() => {
    const current = now()
    const nextMidnight = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + 1
    )
    const timeout = window.setTimeout(
      () => {
        setToday(formatLocalToday(now()))
      },
      Math.max(1, nextMidnight.getTime() - current.getTime() + 50)
    )
    return () => window.clearTimeout(timeout)
  }, [today, now])

  return today
}
