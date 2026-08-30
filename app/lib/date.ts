const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidLocalDate(value: string): boolean {
  const match = LOCAL_DATE_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [
    31,
    leap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  return day <= daysInMonth[month - 1]
}

export function isCanonicalISOString(value: string): boolean {
  const timestamp = Date.parse(value)
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  )
}

export function toCanonicalISOString(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value) return fallback
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : fallback
}
