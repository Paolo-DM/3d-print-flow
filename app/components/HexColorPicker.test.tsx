// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Suspense } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { HexColorPicker } from "~/components/HexColorPicker"

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
})

afterEach(cleanup)

function renderPicker(value = "#ff0000", onChange = vi.fn()) {
  return {
    onChange,
    ...render(
      <Suspense fallback={<div>Loading...</div>}>
        <HexColorPicker value={value} onChange={onChange} />
      </Suspense>
    ),
  }
}

describe("HexColorPicker", () => {
  it("renders trigger swatch with correct background color", () => {
    renderPicker("#3b82f6")

    const trigger = screen.getByTestId("color-swatch-trigger")
    expect(trigger.style.backgroundColor).toBe("rgb(59, 130, 246)")
  })

  it("clicking trigger opens popover with hex input", async () => {
    renderPicker("#ff0000")

    const trigger = screen.getByTestId("color-swatch-trigger")
    fireEvent.click(trigger)

    const hexInput = await screen.findByTestId("hex-input")
    expect(hexInput).toBeTruthy()
  })

  it("hex input syncs value changes via onChange callback", async () => {
    const onChange = vi.fn()
    renderPicker("#ff0000", onChange)

    const trigger = screen.getByTestId("color-swatch-trigger")
    fireEvent.click(trigger)

    const hexInput = await screen.findByTestId("hex-input")
    fireEvent.change(hexInput, { target: { value: "#00ff00" } })

    expect(onChange).toHaveBeenCalledWith("#00ff00")
  })
})
