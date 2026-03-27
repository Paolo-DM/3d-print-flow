// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { createRoutesStub } from "react-router"

import { AppSidebar } from "~/components/AppSidebar"
import { SidebarProvider } from "~/components/ui/sidebar"
import { TooltipProvider } from "~/components/ui/tooltip"

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

function renderSidebar(initialPath = "/") {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </TooltipProvider>
      ),
    },
    { path: "/figures", Component: () => <div>figures</div> },
    { path: "/catalog", Component: () => <div>catalog</div> },
    { path: "/spools", Component: () => <div>spools</div> },
    { path: "/completed", Component: () => <div>completed</div> },
  ])

  return render(<Stub initialEntries={[initialPath]} />)
}

describe("AppSidebar", () => {
  it("renders all navigation section labels", () => {
    renderSidebar()

    expect(screen.getByText("Queue")).toBeTruthy()
    expect(screen.getByText("Library")).toBeTruthy()
    expect(screen.getByText("Archive")).toBeTruthy()
  })

  it("renders all navigation items", () => {
    renderSidebar()

    expect(screen.getByText("Color View")).toBeTruthy()
    expect(screen.getByText("Figure View")).toBeTruthy()
    expect(screen.getByText("Figure Catalog")).toBeTruthy()
    expect(screen.getByText("Filament Spools")).toBeTruthy()
    expect(screen.getByText("Completed")).toBeTruthy()
  })

  it("renders disabled Export and Import buttons in footer", () => {
    renderSidebar()

    const exportButton = screen.getByText("Export").closest("button")
    const importButton = screen.getByText("Import").closest("button")
    expect(exportButton?.disabled).toBe(true)
    expect(importButton?.disabled).toBe(true)
  })

  it("highlights active navigation item based on current route", () => {
    renderSidebar("/")

    const colorViewLink = screen.getByText("Color View").closest("a")
    const menuButton = colorViewLink?.closest("[data-sidebar='menu-button']")
    expect(menuButton?.getAttribute("data-active")).toBe("true")
  })

  it("does not highlight inactive navigation items", () => {
    renderSidebar("/")

    const figureViewLink = screen.getByText("Figure View").closest("a")
    const menuButton = figureViewLink?.closest("[data-sidebar='menu-button']")
    expect(menuButton?.getAttribute("data-active")).toBe("false")
  })

  it("navigation items are links with correct paths", () => {
    renderSidebar()

    expect(screen.getByText("Color View").closest("a")?.getAttribute("href")).toBe("/")
    expect(screen.getByText("Figure View").closest("a")?.getAttribute("href")).toBe("/figures")
    expect(screen.getByText("Figure Catalog").closest("a")?.getAttribute("href")).toBe("/catalog")
    expect(screen.getByText("Filament Spools").closest("a")?.getAttribute("href")).toBe("/spools")
    expect(screen.getByText("Completed").closest("a")?.getAttribute("href")).toBe("/completed")
  })
})
