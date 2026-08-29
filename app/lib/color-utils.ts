/**
 * Converts a single sRGB channel (0-255) to linear light.
 */
function sRGBToLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

/**
 * Returns perceived lightness (relative luminance) of a hex color.
 * Range: 0 (black) to 1 (white).
 */
export function getPerceivedLightness(hex: string): number {
  const cleaned = hex.replace("#", "")
  const r = parseInt(cleaned.slice(0, 2), 16)
  const g = parseInt(cleaned.slice(2, 4), 16)
  const b = parseInt(cleaned.slice(4, 6), 16)

  return (
    0.2126 * sRGBToLinear(r) +
    0.7152 * sRGBToLinear(g) +
    0.0722 * sRGBToLinear(b)
  )
}

/**
 * Returns whichever of black or white has the higher WCAG contrast ratio
 * against the given background hex. The crossover point is approximately
 * 0.179 relative luminance.
 */
export function hexToContrast(hex: string): string {
  const lightness = getPerceivedLightness(hex)
  const contrastWithBlack = (lightness + 0.05) / 0.05
  const contrastWithWhite = 1.05 / (lightness + 0.05)

  return contrastWithBlack >= contrastWithWhite ? "#000000" : "#FFFFFF"
}
