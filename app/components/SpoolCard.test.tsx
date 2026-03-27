// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SpoolCard } from "~/components/SpoolCard"
import { createSpool } from "~/lib/test-utils"

afterEach(cleanup)

describe("SpoolCard", () => {
  it("renders spool name and color swatch with correct background", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<SpoolCard spool={spool} />)

    expect(screen.getByText("Red PLA")).toBeTruthy()

    const swatch = screen.getByTestId("spool-swatch")
    expect(swatch.style.backgroundColor).toBe("rgb(255, 0, 0)")
  })

  it("applies border for light colors (lightness > 0.85)", () => {
    const spool = createSpool({ name: "White PLA", hex: "#FFFFFF" })
    render(<SpoolCard spool={spool} />)

    const swatch = screen.getByTestId("spool-swatch")
    expect(swatch.className).toContain("border")
  })

  it("applies dark mode border for very dark colors (lightness < 0.15)", () => {
    const spool = createSpool({ name: "Black PLA", hex: "#000000" })
    render(<SpoolCard spool={spool} />)

    const swatch = screen.getByTestId("spool-swatch")
    expect(swatch.className).toContain("dark:border")
  })

  it("does not apply border for mid-range colors", () => {
    const spool = createSpool({ name: "Gray PLA", hex: "#808080" })
    render(<SpoolCard spool={spool} />)

    const swatch = screen.getByTestId("spool-swatch")
    expect(swatch.className).not.toContain("border-border")
  })
})
