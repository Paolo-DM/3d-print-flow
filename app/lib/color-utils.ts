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
 * Returns a text color (dark or light) suitable for display on the given background hex.
 * Threshold: lightness > 0.5 → dark text, else light text.
 */
export function hexToContrast(hex: string): string {
  return getPerceivedLightness(hex) > 0.5 ? "#000000" : "#FFFFFF"
}
