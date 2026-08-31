import { describe, expect, it } from "vitest"

import {
  isCanonicalISOString,
  isValidLocalDate,
  parseTimestamp,
  toCanonicalISOString,
} from "~/lib/date"

describe("local date validation", () => {
  it("accepts padded years 0001 through 0099 without Date.UTC coercion", () => {
    expect(isValidLocalDate("0001-01-01")).toBe(true)
    expect(isValidLocalDate("0099-12-31")).toBe(true)
  })

  it("applies Gregorian leap-year and calendar bounds", () => {
    expect(isValidLocalDate("2000-02-29")).toBe(true)
    expect(isValidLocalDate("1900-02-29")).toBe(false)
    expect(isValidLocalDate("2026-04-31")).toBe(false)
    expect(isValidLocalDate("0000-01-01")).toBe(false)
  })
})

describe("parseTimestamp", () => {
  it("returns milliseconds for a readable timestamp", () => {
    expect(parseTimestamp("2026-08-30T10:00:00.000Z")).toBe(
      Date.UTC(2026, 7, 30, 10)
    )
    expect(parseTimestamp("2026-08-30T10:00:00Z")).toBe(
      Date.UTC(2026, 7, 30, 10)
    )
  })

  it("returns null when the value is absent or unreadable", () => {
    expect(parseTimestamp(null)).toBe(null)
    expect(parseTimestamp(undefined)).toBe(null)
    expect(parseTimestamp("")).toBe(null)
    expect(parseTimestamp("not-a-timestamp")).toBe(null)
  })
})

describe("canonical timestamps", () => {
  it("accepts only the exact ISO string produced by Date.toISOString", () => {
    expect(isCanonicalISOString("2026-08-30T10:00:00.000Z")).toBe(true)
    expect(isCanonicalISOString("2026-08-30T10:00:00Z")).toBe(false)
    expect(isCanonicalISOString("not-a-date")).toBe(false)
  })

  it("normalizes parseable timestamps and falls back for invalid input", () => {
    expect(
      toCanonicalISOString("2026-08-30T10:00:00Z", "1970-01-01T00:00:00.000Z")
    ).toBe("2026-08-30T10:00:00.000Z")
    expect(toCanonicalISOString("invalid", "1970-01-01T00:00:00.000Z")).toBe(
      "1970-01-01T00:00:00.000Z"
    )
  })
})
