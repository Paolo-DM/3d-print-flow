// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { createRoutesStub } from "react-router"

import { exportData } from "~/lib/export-import"
import { AppSidebar } from "~/components/AppSidebar"

vi.mock("~/lib/export-import", () => ({
  exportData: vi.fn(),
  importData: vi.fn(),
}))
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

  it("renders enabled Export and Import buttons in footer", () => {
    renderSidebar()

    const exportButton = screen.getByText("Export").closest("button")
    const importButton = screen.getByText("Import").closest("button")
    expect(exportButton?.disabled).toBe(false)
    expect(importButton?.disabled).toBe(false)
  })

  it("clicking Export triggers the download flow", () => {
    renderSidebar()

    const exportButton = screen.getByText("Export").closest("button")!
    fireEvent.click(exportButton)

    expect(exportData).toHaveBeenCalled()
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

  it("Import button click triggers hidden file input", () => {
    renderSidebar()

    const fileInput = screen.getByTestId(
      "import-file-input"
    ) as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, "click")

    const importButton = screen.getByText("Import").closest("button")!
    fireEvent.click(importButton)

    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it("file selection opens ImportDialog", () => {
    renderSidebar()

    const fileInput = screen.getByTestId(
      "import-file-input"
    ) as HTMLInputElement

    const testFile = new File(['{"test": true}'], "test.json", {
      type: "application/json",
    })

    Object.defineProperty(fileInput, "files", {
      value: [testFile],
      writable: false,
    })

    fireEvent.change(fileInput)

    expect(screen.getByText("Replace All Data?")).toBeTruthy()
  })
})
