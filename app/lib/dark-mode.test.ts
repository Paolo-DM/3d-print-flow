// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: prefersDark,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

function runDarkModeScript() {
  const theme = localStorage.getItem("theme")
  const isDark =
    theme === "dark" ||
    (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  if (isDark) document.documentElement.classList.add("dark")
}

describe("dark mode script", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark")
    localStorage.clear()
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("applies .dark class when localStorage theme is 'dark'", () => {
    localStorage.setItem("theme", "dark")
    runDarkModeScript()
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("does not apply .dark class when localStorage theme is 'light'", () => {
    localStorage.setItem("theme", "light")
    runDarkModeScript()
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("applies .dark class when no localStorage and system prefers dark", () => {
    mockMatchMedia(true)
    runDarkModeScript()
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("does not apply .dark class when no localStorage and system prefers light", () => {
    mockMatchMedia(false)
    runDarkModeScript()
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("localStorage overrides system preference", () => {
    localStorage.setItem("theme", "light")
    mockMatchMedia(true)
    runDarkModeScript()
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })
})
