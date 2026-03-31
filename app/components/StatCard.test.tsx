// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { StatCard } from "~/components/StatCard"

afterEach(cleanup)

describe("StatCard", () => {
  it("renders value and label correctly", () => {
    render(<StatCard label="Queued figures" value={12} />)

    expect(screen.getByText("12")).toBeTruthy()
    expect(screen.getByText("Queued figures")).toBeTruthy()
  })

  it("applies tabular-nums to value", () => {
    render(<StatCard label="Count" value={5} />)

    const value = screen.getByText("5")
    expect(value.className).toContain("tabular-nums")
  })

  it("applies custom className", () => {
    const { container } = render(
      <StatCard label="Orders" value={3} className="text-orange-600" />,
    )

    const card = container.querySelector("[data-slot='card']")
    expect(card?.className).toContain("text-orange-600")
  })

  it("renders zero value correctly", () => {
    render(<StatCard label="Empty" value={0} />)

    expect(screen.getByText("0")).toBeTruthy()
  })
})
