import { describe, expect, it } from "vitest"

import { getPerceivedLightness, hexToContrast } from "~/lib/color-utils"

describe("getPerceivedLightness", () => {
  it("returns ~1.0 for white", () => {
    expect(getPerceivedLightness("#FFFFFF")).toBeCloseTo(1.0, 2)
  })

  it("returns ~0.0 for black", () => {
    expect(getPerceivedLightness("#000000")).toBeCloseTo(0.0, 2)
  })

  it("returns a mid-range value for pure red", () => {
    const lightness = getPerceivedLightness("#FF0000")
    expect(lightness).toBeGreaterThan(0.1)
    expect(lightness).toBeLessThan(0.3)
  })

  it("handles hex without # prefix", () => {
    expect(getPerceivedLightness("FFFFFF")).toBeCloseTo(1.0, 2)
  })

  it("returns higher value for green than red (human perception)", () => {
    const red = getPerceivedLightness("#FF0000")
    const green = getPerceivedLightness("#00FF00")
    expect(green).toBeGreaterThan(red)
  })
})

describe("hexToContrast", () => {
  it("returns dark color for white background", () => {
    expect(hexToContrast("#FFFFFF")).toBe("#000000")
  })

  it("returns light color for black background", () => {
    expect(hexToContrast("#000000")).toBe("#FFFFFF")
  })

  it("returns light color for dark blue", () => {
    expect(hexToContrast("#000080")).toBe("#FFFFFF")
  })

  it("returns dark color for yellow", () => {
    expect(hexToContrast("#FFFF00")).toBe("#000000")
  })
})
