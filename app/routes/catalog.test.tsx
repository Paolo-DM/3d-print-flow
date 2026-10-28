// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { createRoutesStub, useLocation } from "react-router"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { fromJSON, store, toJSON } from "~/lib/store"
import {
  createBrand,
  createFigure,
  createOrder,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"
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
    brands: new Map(),
    figures: new Map(),
    orders: new Map(),
    queueItems: new Map(),
    dataGeneration: 0,
  })
})

function renderCatalog(initialEntry = "/catalog") {
  function CatalogHarness() {
    const location = useLocation()
    return (
      <>
        <span data-testid="catalog-location" hidden>
          {location.pathname}
          {location.search}
        </span>
        <FigureCatalog />
      </>
    )
  }
  const Stub = createRoutesStub([
    { path: "/catalog", Component: CatalogHarness },
  ])
  return render(<Stub initialEntries={[initialEntry]} />)
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
    const brand1 = createBrand({ id: "b1", name: "Naruto Shippuden" })
    const brand2 = createBrand({ id: "b2", name: "Dragon Ball Z" })
    const figure1 = createFigure({ name: "Naruto", brandId: "b1" })
    const figure2 = createFigure({ name: "Goku", brandId: "b2" })
    store.setState({
      brands: new Map([
        [brand1.id, brand1],
        [brand2.id, brand2],
      ]),
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

    const addButtons = screen
      .getAllByText("Add Figure")
      .map((el) => el.closest("button"))
    expect(addButtons.every((btn) => btn?.disabled !== true)).toBe(true)
  })

  it("header Add Figure button opens the form panel", () => {
    renderCatalog()

    const headerButton = screen.getAllByText("Add Figure")[0].closest("button")!
    fireEvent.click(headerButton)

    expect(
      screen.getByText("Add Figure", {
        selector: "[data-slot='sheet-title'], [data-slot='drawer-title']",
      })
    ).toBeTruthy()
  })

  it("empty state CTA button opens the form panel", () => {
    renderCatalog()

    // The CTA is the second "Add Figure" button (inside the empty state EmptyContent)
    const addButtons = screen
      .getAllByText("Add Figure")
      .map((el) => el.closest("button")!)
    fireEvent.click(addButtons[addButtons.length - 1])

    expect(
      screen.getByText("Add Figure", {
        selector: "[data-slot='sheet-title'], [data-slot='drawer-title']",
      })
    ).toBeTruthy()
  })

  it("edit button on FigureCard opens form pre-populated with figure data", () => {
    const figure = createFigure({
      name: "Sasuke",
      brandId: null,
      size: 80,
      notes: "",
      requiredColors: [],
    })
    store.setState({ figures: new Map([[figure.id, figure]]) })

    renderCatalog()

    const editButton = screen.getByRole("button", { name: `Edit Sasuke` })
    fireEvent.click(editButton)

    expect(screen.getByText("Edit Figure")).toBeTruthy()
    const nameInput = screen.getByTestId(
      "figure-name-input"
    ) as HTMLInputElement
    expect(nameInput.value).toBe("Sasuke")
  })

  it("opens a blocked-work edit deep link and clears it when the panel closes", () => {
    const figure = createFigure({
      id: "f/with space",
      name: "Needs repair",
      requiredColors: ["missing-spool"],
    })
    store.setState({ figures: new Map([[figure.id, figure]]) })

    renderCatalog("/catalog?edit=f%2Fwith%20space")

    expect(
      (screen.getByTestId("figure-name-input") as HTMLInputElement).value
    ).toBe("Needs repair")
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(screen.getByTestId("catalog-location").textContent).toBe("/catalog")
    expect(screen.queryByTestId("figure-name-input")).toBeNull()
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
      queueItems: new Map([
        [q1.id, q1],
        [q2.id, q2],
      ]),
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

describe("brand grouping and filtering", () => {
  function seedGroupedCatalog() {
    const pokemon = createBrand({ id: "b-pokemon", name: "Pokemon" })
    const marvel = createBrand({ id: "b-marvel", name: "Marvel" })
    const pikachu = createFigure({
      id: "f-pikachu",
      name: "Pikachu",
      brandId: "b-pokemon",
    })
    const venom = createFigure({
      id: "f-venom",
      name: "Venom",
      brandId: "b-marvel",
    })
    const custom = createFigure({
      id: "f-custom",
      name: "Custom Figure",
      brandId: null,
    })
    store.setState({
      brands: new Map([
        [pokemon.id, pokemon],
        [marvel.id, marvel],
      ]),
      figures: new Map([
        [pikachu.id, pikachu],
        [venom.id, venom],
        [custom.id, custom],
      ]),
    })
  }

  it('groups figures into sections per brand, alphabetical with "No brand" last', () => {
    seedGroupedCatalog()
    renderCatalog()

    const sections = screen.getAllByTestId("brand-section")
    expect(sections).toHaveLength(3)
    const headings = sections.map((s) => s.querySelector("h2")?.textContent)
    expect(headings).toEqual(["Marvel", "Pokemon", "No brand"])
    expect(sections[0].textContent).toContain("Venom")
    expect(sections[1].textContent).toContain("Pikachu")
    expect(sections[2].textContent).toContain("Custom Figure")
  })

  it('renders no "No brand" section when every figure has a brand', () => {
    const pokemon = createBrand({ id: "b-pokemon", name: "Pokemon" })
    const pikachu = createFigure({
      id: "f1",
      name: "Pikachu",
      brandId: "b-pokemon",
    })
    store.setState({
      brands: new Map([[pokemon.id, pokemon]]),
      figures: new Map([[pikachu.id, pikachu]]),
    })
    renderCatalog()

    const headings = screen
      .getAllByTestId("brand-section")
      .map((s) => s.querySelector("h2")?.textContent)
    expect(headings).toEqual(["Pokemon"])
  })

  it('groups figures with an unresolvable brandId under "No brand" (orphan tolerance)', () => {
    const orphan = createFigure({
      id: "f1",
      name: "Orphan",
      brandId: "missing",
    })
    store.setState({ figures: new Map([[orphan.id, orphan]]) })
    renderCatalog()

    const sections = screen.getAllByTestId("brand-section")
    expect(sections).toHaveLength(1)
    expect(sections[0].querySelector("h2")?.textContent).toBe("No brand")
    expect(sections[0].textContent).toContain("Orphan")
  })

  it("renders a filter chip per group, all selected by default", () => {
    seedGroupedCatalog()
    renderCatalog()

    const filter = screen.getByTestId("brand-filter")
    const chips = Array.from(filter.querySelectorAll("button"))
    expect(
      chips.map((c) => c.querySelector('[data-slot="chip-label"]')?.textContent)
    ).toEqual(["All brands", "Marvel", "Pokemon", "No brand"])
    expect(chips.every((c) => c.getAttribute("aria-pressed") === "true")).toBe(
      true
    )
    expect(
      chips
        .slice(1)
        .every(
          (chip) =>
            chip.classList.contains("bg-accent") &&
            chip.classList.contains("text-accent-foreground")
        )
    ).toBe(true)
  })

  it("deselecting a brand chip hides its section; reselecting restores it", () => {
    seedGroupedCatalog()
    renderCatalog()

    fireEvent.click(screen.getByTestId("brand-filter-b-marvel"))

    let headings = screen
      .getAllByTestId("brand-section")
      .map((s) => s.querySelector("h2")?.textContent)
    expect(headings).toEqual(["Pokemon", "No brand"])
    expect(
      screen.getByTestId("brand-filter-b-marvel").getAttribute("aria-pressed")
    ).toBe("false")
    expect(
      screen
        .getByTestId("brand-filter-b-marvel")
        .classList.contains("text-muted-foreground")
    ).toBe(true)
    expect(
      screen
        .getByTestId("brand-filter-b-marvel")
        .classList.contains("text-accent-foreground")
    ).toBe(false)

    fireEvent.click(screen.getByTestId("brand-filter-b-marvel"))

    headings = screen
      .getAllByTestId("brand-section")
      .map((s) => s.querySelector("h2")?.textContent)
    expect(headings).toEqual(["Marvel", "Pokemon", "No brand"])
  })

  it('the "No brand" group is filterable like any brand', () => {
    seedGroupedCatalog()
    renderCatalog()

    fireEvent.click(screen.getByTestId("brand-filter-no-brand"))

    const headings = screen
      .getAllByTestId("brand-section")
      .map((s) => s.querySelector("h2")?.textContent)
    expect(headings).toEqual(["Marvel", "Pokemon"])
    expect(screen.queryByText("Custom Figure")).toBeNull()
  })

  it('deselecting every group shows an empty state with a one-action "Show all" reset', () => {
    seedGroupedCatalog()
    renderCatalog()

    fireEvent.click(screen.getByTestId("brand-filter-b-marvel"))
    fireEvent.click(screen.getByTestId("brand-filter-b-pokemon"))
    fireEvent.click(screen.getByTestId("brand-filter-no-brand"))

    expect(screen.queryAllByTestId("brand-section")).toHaveLength(0)
    expect(screen.getByText("All brands hidden")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Show all" }))

    expect(screen.getAllByTestId("brand-section")).toHaveLength(3)
  })

  it('"All brands" deselects every group, then selects them all again', () => {
    seedGroupedCatalog()
    renderCatalog()
    const all = screen.getByTestId("brand-filter-all")

    fireEvent.click(all)
    expect(all.getAttribute("aria-pressed")).toBe("false")
    expect(screen.queryAllByTestId("brand-section")).toHaveLength(0)

    fireEvent.click(all)
    expect(all.getAttribute("aria-pressed")).toBe("true")
    expect(screen.getAllByTestId("brand-section")).toHaveLength(3)
  })

  it('a partial selection marks "All brands" mixed and selects all on click', () => {
    seedGroupedCatalog()
    renderCatalog()
    const all = screen.getByTestId("brand-filter-all")

    fireEvent.click(screen.getByTestId("brand-filter-b-marvel"))
    expect(all.getAttribute("aria-pressed")).toBe("mixed")

    fireEvent.click(all)
    expect(screen.getAllByTestId("brand-section")).toHaveLength(3)
  })

  it("collapses many brands behind +N more, keeping deselected ones visible", () => {
    const brands = Array.from({ length: 14 }, (_, i) =>
      createBrand({ id: `b${i}`, name: `Brand ${String(i).padStart(2, "0")}` })
    )
    const figures = brands.map((brand) =>
      createFigure({ name: `Fig ${brand.name}`, brandId: brand.id })
    )
    store.setState({
      brands: new Map(brands.map((b) => [b.id, b])),
      figures: new Map(figures.map((f) => [f.id, f])),
    })
    renderCatalog()

    const more = screen.getByTestId("brand-filter-more")
    expect(more.textContent).toBe("+4 more")
    expect(screen.queryByTestId("brand-filter-b13")).toBeNull()

    fireEvent.click(more)
    fireEvent.click(screen.getByTestId("brand-filter-b13"))
    fireEvent.click(screen.getByTestId("brand-filter-more"))

    expect(screen.getByTestId("brand-filter-b13")).toBeTruthy()
    expect(screen.getByTestId("brand-filter-more").textContent).toBe("+3 more")
  })

  it("an import (full data replace) resets the filter to all-visible", () => {
    seedGroupedCatalog()
    renderCatalog()

    fireEvent.click(screen.getByTestId("brand-filter-b-marvel"))
    expect(screen.queryByText("Venom")).toBeNull()

    // Import replaces all data via fromJSON, which bumps dataGeneration
    const snapshot = toJSON()
    act(() => {
      fromJSON(snapshot)
    })

    expect(screen.getByText("Venom")).toBeTruthy()
    expect(
      screen.getByTestId("brand-filter-b-marvel").getAttribute("aria-pressed")
    ).toBe("true")
  })
})

describe("brand manager from the catalog", () => {
  function seedManagedCatalog() {
    const marvel = createBrand({ id: "b-marvel", name: "Marvel" })
    const pokemon = createBrand({ id: "b-pokemon", name: "Pokemon" })
    const venom = createFigure({
      id: "f-venom",
      name: "Venom",
      brandId: "b-marvel",
    })
    const pikachu = createFigure({
      id: "f-pikachu",
      name: "Pikachu",
      brandId: "b-pokemon",
    })
    const custom = createFigure({
      id: "f-custom",
      name: "Custom Figure",
      brandId: null,
    })
    store.setState({
      brands: new Map([
        [marvel.id, marvel],
        [pokemon.id, pokemon],
      ]),
      figures: new Map([
        [venom.id, venom],
        [pikachu.id, pikachu],
        [custom.id, custom],
      ]),
    })
  }

  function openManager() {
    fireEvent.click(screen.getByRole("button", { name: "Manage brands" }))
  }

  function closeModal() {
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
  }

  function sectionHeadings() {
    return screen
      .queryAllByTestId("brand-section")
      .map((section) => section.querySelector("h2")?.textContent)
  }

  it("opens from the header with an empty catalog and shows the empty message", () => {
    renderCatalog()

    openManager()

    expect(
      screen.getByText("Manage brands", {
        selector: "[data-slot='sheet-title'], [data-slot='drawer-title']",
      })
    ).toBeTruthy()
    expect(screen.getByText("No Brands Yet")).toBeTruthy()
  })

  function modalShells() {
    return document.querySelectorAll(
      "[data-slot='sheet-content'], [data-slot='drawer-content']"
    )
  }

  it("the catalog owns exactly one modal shell, so the manager and form can never coexist", () => {
    renderCatalog()

    fireEvent.click(screen.getAllByText("Add Figure")[0].closest("button")!)
    expect(modalShells()).toHaveLength(1)
    expect(screen.getByTestId("figure-name-input")).toBeTruthy()

    closeModal()
    openManager()

    // One shell, showing the manager and none of the form's fields
    expect(modalShells()).toHaveLength(1)
    expect(screen.queryByTestId("figure-name-input")).toBeNull()
    expect(screen.queryByTestId("brand-combobox-trigger")).toBeNull()
    expect(screen.getByText("No Brands Yet")).toBeTruthy()
  })

  it("reopening the shared modal starts the figure form from scratch", () => {
    const figure = createFigure({ id: "f-sasuke", name: "Sasuke" })
    store.setState({ figures: new Map([[figure.id, figure]]) })
    renderCatalog()

    fireEvent.click(screen.getByRole("button", { name: "Edit Sasuke" }))
    expect(
      (screen.getByTestId("figure-name-input") as HTMLInputElement).value
    ).toBe("Sasuke")

    closeModal()
    fireEvent.click(screen.getByRole("button", { name: "Add Figure" }))

    expect(
      screen.getByText("Add Figure", {
        selector: "[data-slot='sheet-title'], [data-slot='drawer-title']",
      })
    ).toBeTruthy()
    expect(
      (screen.getByTestId("figure-name-input") as HTMLInputElement).value
    ).toBe("")
  })

  it("Enter commits a rename inside the hosted manager", () => {
    seedManagedCatalog()
    renderCatalog()

    openManager()
    fireEvent.click(screen.getByRole("button", { name: "Rename Marvel" }))
    fireEvent.change(screen.getByTestId("brand-rename-input-b-marvel"), {
      target: { value: "Marvel Comics" },
    })
    fireEvent.keyDown(screen.getByTestId("brand-rename-input-b-marvel"), {
      key: "Enter",
    })

    expect(store.getState().brands.get("b-marvel")?.name).toBe("Marvel Comics")
    expect(screen.queryByTestId("brand-rename-input-b-marvel")).toBeNull()
    expect(screen.getByTestId("brand-manager-list")).toBeTruthy()
  })

  it("Escape cancels the rename without dismissing the hosted manager (Sheet)", () => {
    seedManagedCatalog()
    renderCatalog()

    openManager()
    fireEvent.click(screen.getByRole("button", { name: "Rename Marvel" }))
    fireEvent.change(screen.getByTestId("brand-rename-input-b-marvel"), {
      target: { value: "Half-typed" },
    })
    fireEvent.keyDown(screen.getByTestId("brand-rename-input-b-marvel"), {
      key: "Escape",
    })

    // Edit mode gone, manager still mounted, nothing renamed
    expect(screen.queryByTestId("brand-rename-input-b-marvel")).toBeNull()
    expect(screen.getByTestId("brand-manager-list")).toBeTruthy()
    expect(store.getState().brands.get("b-marvel")?.name).toBe("Marvel")

    // A second Escape, no longer in a rename field, closes the manager
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    })
    expect(screen.queryByTestId("brand-manager-list")).toBeNull()
  })

  it("Escape cancels the rename without dismissing the hosted manager (Drawer)", () => {
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    })

    try {
      seedManagedCatalog()
      renderCatalog()

      openManager()
      expect(
        screen.getByText("Manage brands", {
          selector: "[data-slot='drawer-title']",
        })
      ).toBeTruthy()

      fireEvent.click(screen.getByRole("button", { name: "Rename Marvel" }))
      fireEvent.keyDown(screen.getByTestId("brand-rename-input-b-marvel"), {
        key: "Escape",
      })

      expect(screen.queryByTestId("brand-rename-input-b-marvel")).toBeNull()
      expect(screen.getByTestId("brand-manager-list")).toBeTruthy()
    } finally {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      })
    }
  })

  it("a rename renames the section and chip while filter selection stays put", () => {
    seedManagedCatalog()
    renderCatalog()

    fireEvent.click(screen.getByTestId("brand-filter-b-pokemon"))

    openManager()
    fireEvent.click(screen.getByLabelText("Rename Marvel"))
    fireEvent.change(screen.getByTestId("brand-rename-input-b-marvel"), {
      target: { value: "Marvel Comics" },
    })
    fireEvent.click(screen.getByTestId("brand-rename-save-b-marvel"))
    closeModal()

    expect(sectionHeadings()).toEqual(["Marvel Comics", "No brand"])
    expect(
      screen
        .getByTestId("brand-filter-b-marvel")
        .querySelector('[data-slot="chip-label"]')?.textContent
    ).toBe("Marvel Comics")
    expect(
      screen.getByTestId("brand-filter-b-pokemon").getAttribute("aria-pressed")
    ).toBe("false")
  })

  it("an import (full data replace) drops in-progress manager state", () => {
    seedManagedCatalog()
    renderCatalog()

    openManager()
    fireEvent.click(screen.getByLabelText("Rename Marvel"))
    fireEvent.change(screen.getByTestId("brand-rename-input-b-marvel"), {
      target: { value: "Half-typed" },
    })

    act(() => {
      fromJSON(toJSON())
    })

    // key-reset on dataGeneration, not an Effect
    expect(screen.queryByTestId("brand-rename-input-b-marvel")).toBeNull()
    expect(store.getState().brands.get("b-marvel")?.name).toBe("Marvel")
  })

  it("deleted-brand figures land in a deselected 'No brand' group and stay hidden", () => {
    seedManagedCatalog()
    renderCatalog()

    fireEvent.click(screen.getByTestId("brand-filter-no-brand"))

    openManager()
    fireEvent.click(screen.getByLabelText("Delete Marvel"))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    closeModal()

    expect(store.getState().figures.get("f-venom")?.brandId).toBeNull()
    expect(sectionHeadings()).toEqual(["Pokemon"])
    expect(screen.queryByText("Venom")).toBeNull()

    fireEvent.click(screen.getByTestId("brand-filter-no-brand"))

    expect(sectionHeadings()).toEqual(["Pokemon", "No brand"])
    expect(screen.getByText("Venom")).toBeTruthy()
    expect(screen.getByText("Custom Figure")).toBeTruthy()
  })

  it("cancelling the delete dialog leaves the manager open and interactive (Sheet)", () => {
    seedManagedCatalog()
    renderCatalog()

    openManager()
    fireEvent.click(screen.getByLabelText("Delete Marvel"))
    expect(screen.getByRole("alertdialog")).toBeTruthy()
    // Both modal layers hold the document while stacked
    expect(document.body.style.pointerEvents).toBe("none")

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(
      screen.getByText("Manage brands", {
        selector: "[data-slot='sheet-title']",
      })
    ).toBeTruthy()
    expect(store.getState().brands.size).toBe(2)

    // Still interactive underneath the dismissed dialog — a role query also
    // proves the row was not left aria-hidden by the stacked layer
    fireEvent.click(screen.getByRole("button", { name: "Rename Marvel" }))
    expect(screen.getByTestId("brand-rename-input-b-marvel")).toBeTruthy()

    fireEvent.click(screen.getByTestId("brand-rename-cancel-b-marvel"))
    closeModal()

    // The stacked layers released the document when everything closed
    expect(document.body.style.pointerEvents).not.toBe("none")
  })

  it("cancelling the delete dialog leaves the manager open and interactive (Drawer)", () => {
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    })

    try {
      seedManagedCatalog()
      renderCatalog()

      openManager()
      expect(
        screen.getByText("Manage brands", {
          selector: "[data-slot='drawer-title']",
        })
      ).toBeTruthy()

      fireEvent.click(screen.getByLabelText("Delete Marvel"))
      expect(screen.getByRole("alertdialog")).toBeTruthy()

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

      expect(screen.queryByRole("alertdialog")).toBeNull()
      expect(
        screen.getByText("Manage brands", {
          selector: "[data-slot='drawer-title']",
        })
      ).toBeTruthy()
      expect(store.getState().brands.size).toBe(2)

      fireEvent.click(screen.getByRole("button", { name: "Rename Marvel" }))
      expect(screen.getByTestId("brand-rename-input-b-marvel")).toBeTruthy()
    } finally {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      })
    }
  })
})

describe("catalog queue batch", () => {
  function bar() {
    return screen.getByTestId("queue-batch-bar")
  }

  function summary() {
    return screen.getByTestId("queue-batch-summary").textContent
  }

  function chooseDestination(label: string) {
    const select = screen.getByLabelText("Queue for") as HTMLSelectElement
    const option = Array.from(select.options).find((o) =>
      o.textContent?.startsWith(label)
    )
    fireEvent.change(select, { target: { value: option!.value } })
  }

  function createOrderFromBar() {
    fireEvent.click(within(bar()).getByRole("button", { name: "New order" }))
    fireEvent.click(screen.getByRole("button", { name: "Create order" }))
  }

  function seedCatalog() {
    const spool = createSpool({ id: "s1", name: "Green" })
    const buzz = createFigure({
      id: "fig-buzz",
      name: "Buzz",
      requiredColors: ["s1"],
    })
    const woody = createFigure({
      id: "fig-woody",
      name: "Woody",
      requiredColors: ["s1"],
    })
    const colorless = createFigure({
      id: "fig-colorless",
      name: "Empty",
      requiredColors: [],
    })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([
        ["fig-buzz", buzz],
        ["fig-woody", woody],
        ["fig-colorless", colorless],
      ]),
    })
  }

  it("the bar appears once a figure is added and defaults to stock", () => {
    seedCatalog()
    renderCatalog()

    expect(screen.queryByTestId("queue-batch-bar")).toBeNull()
    fireEvent.click(screen.getByLabelText("Add Buzz"))

    expect(summary()).toBe("1 figure · 1 piece")
    expect(
      (screen.getByLabelText("Queue for") as HTMLSelectElement).value
    ).toBe("stock")
    expect(screen.getByRole("button", { name: "Add to stock" })).toBeTruthy()
  })

  it("adding and adjusting quantities updates the summary", () => {
    seedCatalog()
    renderCatalog()

    fireEvent.click(screen.getByLabelText("Add Buzz"))
    fireEvent.click(screen.getByLabelText("Add Woody"))
    fireEvent.click(screen.getByLabelText("Increase quantity of Buzz"))
    expect(summary()).toBe("2 figures · 3 pieces")

    // − at 1 unstages the figure
    fireEvent.click(screen.getByLabelText("Decrease quantity of Woody"))
    expect(summary()).toBe("1 figure · 2 pieces")
  })

  it("figures with no required colors offer no add control", () => {
    seedCatalog()
    renderCatalog()

    expect(screen.queryByLabelText("Add Empty")).toBeNull()
    expect(screen.getByText("Assign colors to queue this figure")).toBeTruthy()
  })

  it("adds the whole batch to stock in one store update and resets", () => {
    seedCatalog()
    renderCatalog()

    fireEvent.click(screen.getByLabelText("Add Buzz"))
    fireEvent.click(screen.getByLabelText("Increase quantity of Buzz"))
    fireEvent.click(screen.getByLabelText("Add Woody"))

    let notifications = 0
    const unsubscribe = store.subscribe(() => {
      notifications += 1
    })
    try {
      fireEvent.click(screen.getByRole("button", { name: "Add to stock" }))
      expect(notifications).toBe(1)
    } finally {
      unsubscribe()
    }

    const items = [...store.getState().queueItems.values()]
    expect(items).toHaveLength(2)
    expect(items.every((qi) => qi.orderId === null)).toBe(true)
    expect(items.find((qi) => qi.figureId === "fig-buzz")?.quantity).toBe(2)
    expect(items.find((qi) => qi.figureId === "fig-woody")?.quantity).toBe(1)
    expect(screen.queryByTestId("queue-batch-bar")).toBeNull()
  })

  it("creating a new order from the bar targets the batch at it", () => {
    seedCatalog()
    renderCatalog()
    fireEvent.click(screen.getByLabelText("Add Buzz"))
    createOrderFromBar()

    // the staged batch survives the order form
    expect(summary()).toBe("1 figure · 1 piece")
    fireEvent.click(screen.getByRole("button", { name: "Add to ORD-001" }))

    const items = [...store.getState().queueItems.values()]
    expect(items).toHaveLength(1)
    expect(items[0].orderId).toBe([...store.getState().orders.keys()][0])
  })

  it("the header New order button opens an empty batch for that order", () => {
    seedCatalog()
    renderCatalog()
    fireEvent.click(screen.getByRole("button", { name: "New order" }))
    fireEvent.click(screen.getByRole("button", { name: "Create order" }))

    expect(summary()).toBe("Add figures to queue them")
    const confirm = screen.getByRole("button", {
      name: "Add to ORD-001",
    }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
  })

  it("an existing open order can be picked as the destination", () => {
    seedCatalog()
    const order = createOrder({ reference: "ORD-042", customerName: "Ana" })
    store.setState({ orders: new Map([[order.id, order]]) })
    renderCatalog()

    fireEvent.click(screen.getByLabelText("Add Buzz"))
    chooseDestination("ORD-042 · Ana")
    fireEvent.click(screen.getByRole("button", { name: "Add to ORD-042" }))

    const items = [...store.getState().queueItems.values()]
    expect(items[0].orderId).toBe(order.id)
  })

  it("an order deep link preselects that order", () => {
    seedCatalog()
    const order = createOrder({ reference: "ORD-042" })
    store.setState({ orders: new Map([[order.id, order]]) })
    renderCatalog(`/catalog?order=${order.id}`)

    expect(bar().textContent).toContain("Add figures to queue them")
    expect(
      (screen.getByLabelText("Queue for") as HTMLSelectElement).value
    ).toBe(order.id)
  })

  it("does not reopen a Ready historical order from a direct catalog link", () => {
    seedCatalog()
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "ORD-042",
    })
    const completed = createQueueItem({
      id: "completed",
      figureId: "fig-buzz",
      orderId: order.id,
      completedCounts: { s1: 1 },
      completedAt: "2026-08-30T10:00:00.000Z",
    })
    store.setState({
      orders: new Map([[order.id, order]]),
      queueItems: new Map([[completed.id, completed]]),
    })

    renderCatalog(`/catalog?order=${order.id}`)

    expect(screen.queryByTestId("queue-batch-bar")).toBeNull()
    fireEvent.click(screen.getByLabelText("Add Buzz"))
    const select = screen.getByLabelText("Queue for") as HTMLSelectElement
    expect(select.value).toBe("stock")
    expect(Array.from(select.options).some((o) => o.value === order.id)).toBe(
      false
    )
  })

  it("clear drops the batch and the destination without queueing", () => {
    seedCatalog()
    renderCatalog()
    fireEvent.click(screen.getByLabelText("Add Buzz"))
    createOrderFromBar()

    fireEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(screen.queryByTestId("queue-batch-bar")).toBeNull()
    expect(store.getState().queueItems.size).toBe(0)
    fireEvent.click(screen.getByLabelText("Add Woody"))
    expect(screen.getByRole("button", { name: "Add to stock" })).toBeTruthy()
  })

  it("merges into an existing active entry per CAP-6", () => {
    seedCatalog()
    const order = createOrder({ reference: "ORD-042" })
    const existing = createQueueItem({
      id: "q-existing",
      figureId: "fig-buzz",
      orderId: order.id,
      quantity: 1,
    })
    store.setState({
      orders: new Map([[order.id, order]]),
      queueItems: new Map([["q-existing", existing]]),
    })

    renderCatalog(`/catalog?order=${order.id}`)
    fireEvent.click(screen.getByLabelText("Add Buzz"))
    fireEvent.click(screen.getByLabelText("Increase quantity of Buzz"))
    fireEvent.click(screen.getByRole("button", { name: "Add to ORD-042" }))

    expect(store.getState().queueItems.size).toBe(1)
    expect(store.getState().queueItems.get("q-existing")?.quantity).toBe(3)
  })

  it("the + button is disabled at 99", () => {
    seedCatalog()
    renderCatalog()
    fireEvent.click(screen.getByLabelText("Add Buzz"))

    const plus = screen.getByLabelText(
      "Increase quantity of Buzz"
    ) as HTMLButtonElement
    for (let i = 0; i < 98; i++) {
      fireEvent.click(plus)
    }

    expect(screen.getByTestId("figure-quantity-value").textContent).toBe("×99")
    expect(plus.disabled).toBe(true)
    expect(summary()).toBe("1 figure · 99 pieces")
  })

  it("confirm presents the piece total and destination as a success toast", async () => {
    const { toast } = await import("sonner")
    const successSpy = vi.spyOn(toast, "success")
    seedCatalog()
    renderCatalog()
    fireEvent.click(screen.getByLabelText("Add Buzz"))
    fireEvent.click(screen.getByLabelText("Increase quantity of Buzz"))
    fireEvent.click(screen.getByLabelText("Add Woody"))

    fireEvent.click(screen.getByRole("button", { name: "Add to stock" }))

    expect(successSpy).toHaveBeenCalledWith(
      "3 pieces queued as stock",
      expect.objectContaining({
        action: expect.objectContaining({ label: "View" }),
      })
    )
    successSpy.mockRestore()
  })

  it("a figure deleted after staging is dropped from the batch and reported as skipped", async () => {
    const { toast } = await import("sonner")
    const successSpy = vi.spyOn(toast, "success")
    seedCatalog()
    renderCatalog()
    fireEvent.click(screen.getByLabelText("Add Buzz"))
    fireEvent.click(screen.getByLabelText("Add Woody"))

    act(() => {
      store.getState().deleteFigure("fig-woody")
    })

    // the summary stops counting the phantom before confirm
    expect(summary()).toBe("1 figure · 1 piece")

    fireEvent.click(screen.getByRole("button", { name: "Add to stock" }))

    expect(successSpy).toHaveBeenCalledWith(
      "1 piece queued as stock · 1 figure skipped",
      expect.anything()
    )
    const items = [...store.getState().queueItems.values()]
    expect(items).toHaveLength(1)
    expect(items[0].figureId).toBe("fig-buzz")
    successSpy.mockRestore()
  })

  it("a confirmed batch that applied nothing uses a non-success toast", async () => {
    const { toast } = await import("sonner")
    const successSpy = vi.spyOn(toast, "success")
    const warningSpy = vi.spyOn(toast, "warning")
    seedCatalog()
    renderCatalog()
    fireEvent.click(screen.getByLabelText("Add Buzz"))

    // the figure still exists but loses its colors after staging — the store
    // skips it, so nothing lands
    act(() => {
      store.getState().updateFigure("fig-buzz", { requiredColors: [] })
    })

    fireEvent.click(screen.getByRole("button", { name: "Add to stock" }))

    expect(successSpy).not.toHaveBeenCalled()
    expect(warningSpy).toHaveBeenCalledWith("Nothing queued · 1 figure skipped")
    expect(store.getState().queueItems.size).toBe(0)
    successSpy.mockRestore()
    warningSpy.mockRestore()
  })
})
