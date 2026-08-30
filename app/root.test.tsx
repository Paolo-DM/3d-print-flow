// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import routes from "./routes"
import App, { HydrateFallback, links, meta } from "./root"
import { store } from "~/lib/store"

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

afterEach(() => {
  cleanup()
  store.setState({ announcement: "", announcementVersion: 0 })
})

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

  it("wires the Orders queue route into the route manifest", () => {
    expect(JSON.stringify(routes)).toContain('"path":"orders"')
    expect(JSON.stringify(routes)).toContain(
      '"file":"routes/_queue.orders.tsx"'
    )
  })

  it("remounts the polite live region for repeated announcement text", () => {
    store.setState({ announcement: "WEB-42 updated", announcementVersion: 1 })
    const Stub = createRoutesStub([
      {
        id: "root",
        path: "/",
        Component: App,
        children: [{ index: true, Component: () => <p>Queue content</p> }],
      },
    ])
    const { container } = render(<Stub initialEntries={["/"]} />)
    const selector = '[aria-live="polite"][aria-atomic="true"]'
    const firstRegion = container.querySelector(selector)
    expect(firstRegion?.textContent).toBe("WEB-42 updated")

    act(() => {
      store.setState({
        announcement: "WEB-42 updated",
        announcementVersion: 2,
      })
    })

    const secondRegion = container.querySelector(selector)
    expect(secondRegion?.textContent).toBe("WEB-42 updated")
    expect(secondRegion).not.toBe(firstRegion)
  })
})
