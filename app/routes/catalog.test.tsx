// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { createRoutesStub } from "react-router"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { store } from "~/lib/store"
import { createFigure, createSpool } from "~/lib/test-utils"
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

  it("renders disabled Add Figure button in header", () => {
    renderCatalog()

    const addButtons = screen.getAllByText("Add Figure").map((el) => el.closest("button"))
    expect(addButtons.some((btn) => btn?.disabled === true)).toBe(true)
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
})
