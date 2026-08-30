// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { formatLocalToday, useToday } from "~/hooks/use-today"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("useToday", () => {
  it("formats dates from local calendar fields", () => {
    expect(formatLocalToday(new Date(2026, 7, 9, 23, 30))).toBe("2026-08-09")
  })

  it("refreshes just after local midnight", () => {
    vi.useFakeTimers()
    let current = new Date(2026, 7, 30, 23, 59, 59, 900)
    const now = () => new Date(current)
    const { result } = renderHook(() => useToday(now))

    expect(result.current).toBe("2026-08-30")
    current = new Date(2026, 7, 31, 0, 0, 0, 100)
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe("2026-08-31")
  })
})
