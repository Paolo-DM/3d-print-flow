// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { HydrateFallback, links, meta } from "./root"

afterEach(cleanup)

describe("root branding", () => {
  it("publishes the app title and favicon variants", () => {
    expect(meta({} as Parameters<typeof meta>[0])).toContainEqual({
      title: "3D Print Flow",
    })
    expect(links()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rel: "icon", href: "/favicon.ico" }),
        expect.objectContaining({
          rel: "icon",
          href: "/favicon-32x32.png",
        }),
        expect.objectContaining({
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
        }),
      ])
    )
  })

  it("renders an accessible branded hydration state", () => {
    render(<HydrateFallback />)

    expect(screen.getByRole("status").textContent).toContain(
      "Loading 3D Print Flow"
    )
    expect(
      screen.getByRole("status").querySelector("img")?.getAttribute("src")
    ).toBe("/brand/flow-spool-logo.png")
  })
})
