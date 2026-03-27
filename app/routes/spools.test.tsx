// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createRoutesStub } from "react-router"

import { store } from "~/lib/store"
import { createFigure, createSpool } from "~/lib/test-utils"
import SpoolLibrary from "~/routes/spools"

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

beforeEach(() => {
  store.setState({
    spools: new Map(),
    figures: new Map(),
    queueItems: new Map(),
  })
})

function renderSpools() {
  const Stub = createRoutesStub([
    { path: "/spools", Component: SpoolLibrary },
  ])
  return render(<Stub initialEntries={["/spools"]} />)
}

describe("SpoolLibrary route", () => {
  it("renders empty state when store has no spools", () => {
    renderSpools()

    expect(screen.getByText("No Spools Yet")).toBeTruthy()
    expect(screen.getByText("Add Your First Spool")).toBeTruthy()
    expect(
      screen.getByText(
        "Add your filament spools to start building your color library."
      )
    ).toBeTruthy()
  })

  it("renders spool cards when store has spools", () => {
    const spool1 = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const spool2 = createSpool({ name: "Blue ABS", hex: "#0000FF" })

    store.setState({
      spools: new Map([
        [spool1.id, spool1],
        [spool2.id, spool2],
      ]),
    })

    renderSpools()

    expect(screen.getByText("Red PLA")).toBeTruthy()
    expect(screen.getByText("Blue ABS")).toBeTruthy()
  })

  it("renders page header with Spool Library title and enabled Add Spool button", () => {
    renderSpools()

    expect(screen.getByText("Spool Library")).toBeTruthy()
    const addButton = screen.getByText("Add Spool").closest("button")
    expect(addButton?.disabled).toBe(false)
  })

  it("near-white spool (#FFFFFF) gets a border class on its swatch", () => {
    const whiteSpool = createSpool({ name: "White PLA", hex: "#FFFFFF" })

    store.setState({
      spools: new Map([[whiteSpool.id, whiteSpool]]),
    })

    renderSpools()

    const swatch = screen.getByTestId("spool-swatch")
    expect(swatch.className).toContain("border")
  })

  it("does not render empty state when spools exist", () => {
    const spool = createSpool({ name: "Green PLA", hex: "#00FF00" })

    store.setState({
      spools: new Map([[spool.id, spool]]),
    })

    renderSpools()

    expect(screen.queryByText("No Spools Yet")).toBeNull()
  })

  it("Add Spool button opens Sheet with form title", async () => {
    renderSpools()

    const addButton = screen.getByText("Add Spool").closest("button")!
    fireEvent.click(addButton)

    expect(await screen.findByText("Add Spool", { selector: "[data-slot='sheet-title'], [data-slot='drawer-title']" })).toBeTruthy()
  })

  it("edit button on SpoolCard opens form with pre-populated fields", async () => {
    const spool = createSpool({ name: "Test PLA", hex: "#ff0000" })
    store.setState({ spools: new Map([[spool.id, spool]]) })
    renderSpools()

    const editButton = screen.getByLabelText("Edit Test PLA")
    fireEvent.click(editButton)

    expect(await screen.findByText("Edit Spool", { selector: "[data-slot='sheet-title'], [data-slot='drawer-title']" })).toBeTruthy()

    const nameInput = screen.getByTestId("spool-name-input") as HTMLInputElement
    expect(nameInput.value).toBe("Test PLA")
  })

  it("renders Drawer on mobile viewport", async () => {
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    })

    try {
      renderSpools()

      const addButton = screen.getByText("Add Spool").closest("button")!
      fireEvent.click(addButton)

      expect(await screen.findByText("Add Spool", { selector: "[data-slot='drawer-title']" })).toBeTruthy()
    } finally {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      })
    }
  })

  it("delete button on card opens AlertDialog", async () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    store.setState({ spools: new Map([[spool.id, spool]]) })

    renderSpools()

    fireEvent.click(screen.getByLabelText("Delete Red PLA"))

    expect(await screen.findByRole("alertdialog")).toBeTruthy()
  })

  it("unreferenced spool: AlertDialog shows spool name, no-figures message, Cancel and Delete buttons", async () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    store.setState({ spools: new Map([[spool.id, spool]]) })

    renderSpools()

    fireEvent.click(screen.getByLabelText("Delete Red PLA"))

    await screen.findByRole("alertdialog")

    expect(screen.getByText("Delete Spool")).toBeTruthy()
    expect(screen.getByText('Delete "Red PLA"? No figures use this spool.')).toBeTruthy()
    expect(screen.getByText("Cancel")).toBeTruthy()
    expect(screen.getByText("Delete")).toBeTruthy()
  })

  it("referenced spool: AlertDialog shows Cannot Delete and lists figure names, no Delete button", async () => {
    const spool = createSpool({ id: "spool-1", name: "Red PLA", hex: "#FF0000" })
    const figure1 = createFigure({ name: "Naruto", requiredColors: ["spool-1"] })
    const figure2 = createFigure({ name: "Goku", requiredColors: ["spool-1"] })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([
        [figure1.id, figure1],
        [figure2.id, figure2],
      ]),
    })

    renderSpools()

    fireEvent.click(screen.getByLabelText("Delete Red PLA"))

    await screen.findByRole("alertdialog")

    expect(screen.getByText("Cannot Delete")).toBeTruthy()
    expect(screen.getByText('"Red PLA" is used by the following figures:')).toBeTruthy()
    expect(screen.getByText("Naruto")).toBeTruthy()
    expect(screen.getByText("Goku")).toBeTruthy()
    expect(screen.getByText("Close")).toBeTruthy()
    expect(screen.queryByText("Delete")).toBeNull()
  })

  it("confirming delete removes spool from store", async () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    store.setState({ spools: new Map([[spool.id, spool]]) })

    renderSpools()

    fireEvent.click(screen.getByLabelText("Delete Red PLA"))

    await screen.findByRole("alertdialog")

    fireEvent.click(screen.getByText("Delete"))

    expect(store.getState().spools.has(spool.id)).toBe(false)
  })

  it("dialog closes after successful deletion", async () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    store.setState({ spools: new Map([[spool.id, spool]]) })

    renderSpools()

    fireEvent.click(screen.getByLabelText("Delete Red PLA"))

    await screen.findByRole("alertdialog")

    fireEvent.click(screen.getByText("Delete"))

    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})
