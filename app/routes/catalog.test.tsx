// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { createRoutesStub } from "react-router"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { store } from "~/lib/store"
import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"
import FigureCatalog from "~/routes/catalog"

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

function renderCatalog() {
  const Stub = createRoutesStub([
    { path: "/catalog", Component: FigureCatalog },
  ])
  return render(<Stub initialEntries={["/catalog"]} />)
}

describe("FigureCatalog route", () => {
  it("renders empty state when store has no figures", () => {
    renderCatalog()

    expect(screen.getByText("No Figures Yet")).toBeTruthy()
    const addButtons = screen.getAllByText("Add Figure")
    expect(addButtons.length).toBeGreaterThan(0)
  })

  it("renders empty state description with spool count when spools exist", () => {
    const spool1 = createSpool({ name: "Red PLA" })
    const spool2 = createSpool({ name: "Blue PLA" })
    store.setState({
      spools: new Map([
        [spool1.id, spool1],
        [spool2.id, spool2],
      ]),
    })

    renderCatalog()

    expect(
      screen.getByText(
        "Great, you have 2 spools! Create your first figure to start building your catalog."
      )
    ).toBeTruthy()
  })

  it("renders generic empty state description when no spools exist", () => {
    renderCatalog()

    expect(
      screen.getByText(
        "Add filament spools first, then create figures to assign colors."
      )
    ).toBeTruthy()
  })

  it("renders figure cards when store has figures", () => {
    const figure1 = createFigure({ name: "Naruto", franchise: "Naruto Shippuden" })
    const figure2 = createFigure({ name: "Goku", franchise: "Dragon Ball Z" })
    store.setState({
      figures: new Map([
        [figure1.id, figure1],
        [figure2.id, figure2],
      ]),
    })

    renderCatalog()

    expect(screen.getByText("Naruto")).toBeTruthy()
    expect(screen.getByText("Goku")).toBeTruthy()
  })

  it("does not render empty state when figures exist", () => {
    const figure = createFigure({ name: "Naruto" })
    store.setState({ figures: new Map([[figure.id, figure]]) })

    renderCatalog()

    expect(screen.queryByText("No Figures Yet")).toBeNull()
  })

  it("renders figure with assigned colors showing spool swatches", () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({ name: "Naruto", requiredColors: ["s1"] })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([[figure.id, figure]]),
    })

    renderCatalog()

    expect(screen.getByText("Red PLA")).toBeTruthy()
    expect(screen.getByTestId("color-swatch")).toBeTruthy()
  })

  it('renders "No colors assigned" for figure with no assigned colors', () => {
    const figure = createFigure({ name: "Naruto", requiredColors: [] })
    store.setState({ figures: new Map([[figure.id, figure]]) })

    renderCatalog()

    expect(screen.getByText("No colors assigned")).toBeTruthy()
  })

  it("renders page header with Figure Catalog title", () => {
    renderCatalog()

    expect(screen.getByText("Figure Catalog")).toBeTruthy()
  })

  it("renders enabled Add Figure button in header", () => {
    renderCatalog()

    const addButtons = screen.getAllByText("Add Figure").map((el) => el.closest("button"))
    expect(addButtons.every((btn) => btn?.disabled !== true)).toBe(true)
  })

  it("header Add Figure button opens the form panel", () => {
    renderCatalog()

    const headerButton = screen.getAllByText("Add Figure")[0].closest("button")!
    fireEvent.click(headerButton)

    expect(screen.getByText("Add Figure", { selector: "[data-slot='sheet-title'], [data-slot='drawer-title']" })).toBeTruthy()
  })

  it("empty state CTA button opens the form panel", () => {
    renderCatalog()

    // The CTA is the second "Add Figure" button (inside the empty state EmptyContent)
    const addButtons = screen.getAllByText("Add Figure").map((el) => el.closest("button")!)
    fireEvent.click(addButtons[addButtons.length - 1])

    expect(screen.getByText("Add Figure", { selector: "[data-slot='sheet-title'], [data-slot='drawer-title']" })).toBeTruthy()
  })

  it("edit button on FigureCard opens form pre-populated with figure data", () => {
    const figure = createFigure({ name: "Sasuke", franchise: "Naruto", size: 80, notes: "", requiredColors: [] })
    store.setState({ figures: new Map([[figure.id, figure]]) })

    renderCatalog()

    const editButton = screen.getByRole("button", { name: `Edit Sasuke` })
    fireEvent.click(editButton)

    expect(screen.getByText("Edit Figure")).toBeTruthy()
    const nameInput = screen.getByTestId("figure-name-input") as HTMLInputElement
    expect(nameInput.value).toBe("Sasuke")
  })

  it("renders singular spool count in empty description when exactly one spool exists", () => {
    const spool = createSpool({ name: "Red PLA" })
    store.setState({ spools: new Map([[spool.id, spool]]) })

    renderCatalog()

    expect(
      screen.getByText(
        "Great, you have 1 spool! Create your first figure to start building your catalog."
      )
    ).toBeTruthy()
  })

  it("delete button on FigureCard opens AlertDialog", () => {
    const figure = createFigure({ name: "Naruto" })
    store.setState({ figures: new Map([[figure.id, figure]]) })

    renderCatalog()

    fireEvent.click(screen.getByRole("button", { name: "Delete Naruto" }))

    expect(screen.getByRole("alertdialog")).toBeTruthy()
    expect(screen.getByText("Delete Figure")).toBeTruthy()
  })

  it('AlertDialog shows "not referenced by any queue items" when no queue items exist', () => {
    const figure = createFigure({ name: "Naruto" })
    store.setState({ figures: new Map([[figure.id, figure]]) })

    renderCatalog()

    fireEvent.click(screen.getByRole("button", { name: "Delete Naruto" }))

    expect(
      screen.getByText(`"Naruto" is not referenced by any queue items.`)
    ).toBeTruthy()
  })

  it("AlertDialog shows affected count when queue items reference the figure", () => {
    const figure = createFigure({ name: "Naruto" })
    const q1 = createQueueItem({ figureId: figure.id })
    const q2 = createQueueItem({ figureId: figure.id })
    store.setState({
      figures: new Map([[figure.id, figure]]),
      queueItems: new Map([[q1.id, q1], [q2.id, q2]]),
    })

    renderCatalog()

    fireEvent.click(screen.getByRole("button", { name: "Delete Naruto" }))

    expect(
      screen.getByText(`Deleting "Naruto" will also remove 2 queue item(s).`)
    ).toBeTruthy()
  })

  it("confirming delete removes figure from store", () => {
    const figure = createFigure({ name: "Naruto" })
    store.setState({ figures: new Map([[figure.id, figure]]) })

    renderCatalog()

    fireEvent.click(screen.getByRole("button", { name: "Delete Naruto" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(store.getState().figures.size).toBe(0)
  })

  it("confirming delete cascades to remove referencing queue items", () => {
    const figure = createFigure({ name: "Naruto" })
    const q1 = createQueueItem({ figureId: figure.id })
    store.setState({
      figures: new Map([[figure.id, figure]]),
      queueItems: new Map([[q1.id, q1]]),
    })

    renderCatalog()

    fireEvent.click(screen.getByRole("button", { name: "Delete Naruto" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(store.getState().figures.size).toBe(0)
    expect(store.getState().queueItems.size).toBe(0)
  })

  it("cancel closes dialog with no changes", () => {
    const figure = createFigure({ name: "Naruto" })
    store.setState({ figures: new Map([[figure.id, figure]]) })

    renderCatalog()

    fireEvent.click(screen.getByRole("button", { name: "Delete Naruto" }))
    expect(screen.getByRole("alertdialog")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(store.getState().figures.size).toBe(1)
  })
})
