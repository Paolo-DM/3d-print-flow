// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createBrand, createFigure, createSpool } from "~/lib/test-utils"
import { FigureCard, FigureQuantityControl } from "~/components/FigureCard"

afterEach(cleanup)

const shippuden = createBrand({ id: "b1", name: "Naruto Shippuden" })
const brands = new Map([[shippuden.id, shippuden]])

describe("FigureCard", () => {
  it("renders figure name, brand, and size", () => {
    const figure = createFigure({ name: "Naruto", brandId: "b1", size: 75 })
    render(<FigureCard figure={figure} brands={brands} spools={new Map()} />)

    expect(screen.getByText("Naruto")).toBeTruthy()
    expect(screen.getByText("Naruto Shippuden")).toBeTruthy()
    expect(screen.getByText("75%")).toBeTruthy()
  })

  it("renders color swatches for assigned spools", () => {
    const spool1 = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const spool2 = createSpool({ id: "s2", name: "Blue PLA", hex: "#0000FF" })
    const figure = createFigure({ requiredColors: ["s1", "s2"] })
    const spoolsMap = new Map([
      [spool1.id, spool1],
      [spool2.id, spool2],
    ])

    render(<FigureCard figure={figure} brands={brands} spools={spoolsMap} />)

    expect(screen.getByText("Red PLA")).toBeTruthy()
    expect(screen.getByText("Blue PLA")).toBeTruthy()
    const swatches = screen.getAllByTestId("color-swatch")
    expect(swatches).toHaveLength(2)
  })

  it('renders "No colors assigned" when requiredColors is empty', () => {
    const figure = createFigure({ requiredColors: [] })
    render(<FigureCard figure={figure} brands={brands} spools={new Map()} />)

    expect(screen.getByText("No colors assigned")).toBeTruthy()
  })

  it("applies border for near-white spool swatches (lightness > 0.85)", () => {
    const whiteSpool = createSpool({
      id: "s1",
      name: "White PLA",
      hex: "#FFFFFF",
    })
    const figure = createFigure({ requiredColors: ["s1"] })
    const spoolsMap = new Map([[whiteSpool.id, whiteSpool]])

    render(<FigureCard figure={figure} brands={brands} spools={spoolsMap} />)

    const swatch = screen.getByTestId("color-swatch")
    expect(swatch.className).toContain("border")
  })

  it("silently skips dangling spool references", () => {
    const figure = createFigure({ requiredColors: ["nonexistent-id"] })
    render(<FigureCard figure={figure} brands={brands} spools={new Map()} />)

    expect(screen.getByText("No colors assigned")).toBeTruthy()
    expect(screen.queryByTestId("color-swatch")).toBeNull()
  })

  it("does not render a brand subtitle when the figure has no brand", () => {
    const figure = createFigure({ name: "Custom Figure", brandId: null })
    render(<FigureCard figure={figure} brands={brands} spools={new Map()} />)

    expect(screen.getByText("Custom Figure")).toBeTruthy()
    const header = screen
      .getByText("Custom Figure")
      .closest("[data-slot='card-header']")!
    const paragraphs = header.querySelectorAll("p")
    // name + size = 2 paragraphs; brand paragraph should be absent (would be 3 if rendered)
    expect(paragraphs).toHaveLength(2)
  })

  it("does not render a brand subtitle for an unresolvable brandId (orphan tolerance)", () => {
    const figure = createFigure({ name: "Custom Figure", brandId: "missing" })
    render(<FigureCard figure={figure} brands={brands} spools={new Map()} />)

    const header = screen
      .getByText("Custom Figure")
      .closest("[data-slot='card-header']")!
    expect(header.querySelectorAll("p")).toHaveLength(2)
  })

  it("has data-testid figure-card", () => {
    const figure = createFigure()
    render(<FigureCard figure={figure} brands={brands} spools={new Map()} />)

    expect(screen.getByTestId("figure-card")).toBeTruthy()
  })

  it("renders edit button when onEdit is provided", () => {
    const figure = createFigure({ name: "Naruto" })
    const onEdit = vi.fn()
    render(
      <FigureCard
        figure={figure}
        brands={brands}
        spools={new Map()}
        onEdit={onEdit}
      />
    )

    expect(screen.getByRole("button", { name: "Edit Naruto" })).toBeTruthy()
  })

  it("edit button calls onEdit with the figure", () => {
    const figure = createFigure({ name: "Naruto" })
    const onEdit = vi.fn()
    render(
      <FigureCard
        figure={figure}
        brands={brands}
        spools={new Map()}
        onEdit={onEdit}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Edit Naruto" }))

    expect(onEdit).toHaveBeenCalledOnce()
    expect(onEdit).toHaveBeenCalledWith(figure)
  })

  it("does not render edit button when onEdit is not provided", () => {
    const figure = createFigure({ name: "Naruto" })
    render(<FigureCard figure={figure} brands={brands} spools={new Map()} />)

    expect(screen.queryByRole("button", { name: "Edit Naruto" })).toBeNull()
  })

  it("renders delete button when onDelete is provided", () => {
    const figure = createFigure({ name: "Naruto" })
    const onDelete = vi.fn()
    render(
      <FigureCard
        figure={figure}
        brands={brands}
        spools={new Map()}
        onDelete={onDelete}
      />
    )

    expect(screen.getByRole("button", { name: "Delete Naruto" })).toBeTruthy()
  })

  it("delete button calls onDelete with the figure", () => {
    const figure = createFigure({ name: "Naruto" })
    const onDelete = vi.fn()
    render(
      <FigureCard
        figure={figure}
        brands={brands}
        spools={new Map()}
        onDelete={onDelete}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Delete Naruto" }))

    expect(onDelete).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledWith(figure)
  })

  it("does not render delete button when onDelete is not provided", () => {
    const figure = createFigure({ name: "Naruto" })
    render(<FigureCard figure={figure} brands={brands} spools={new Map()} />)

    expect(screen.queryByRole("button", { name: "Delete Naruto" })).toBeNull()
  })

  it("renders the figure notes when present", () => {
    const figure = createFigure({ name: "Naruto", notes: "Hair at 0.12mm" })
    render(<FigureCard figure={figure} brands={brands} spools={new Map()} />)

    expect(screen.getByTestId("notes").textContent).toContain("Hair at 0.12mm")
  })

  it("renders no notes block for blank notes", () => {
    const figure = createFigure({ name: "Naruto", notes: "  " })
    render(<FigureCard figure={figure} brands={brands} spools={new Map()} />)

    expect(screen.queryByTestId("notes")).toBeNull()
  })
})

describe("FigureQuantityControl", () => {
  it("explains why a figure without colors cannot be added", () => {
    const figure = createFigure({ name: "Empty", requiredColors: [] })
    render(
      <FigureQuantityControl
        figure={figure}
        quantity={0}
        onQuantityChange={vi.fn()}
      />
    )

    expect(screen.queryByRole("button", { name: "Add Empty" })).toBeNull()
    expect(screen.getByText("Assign colors to queue this figure")).toBeTruthy()
  })

  it("stages one copy from Add, then steps the quantity", () => {
    const figure = createFigure({ name: "Naruto", requiredColors: ["s1"] })
    const onQuantityChange = vi.fn()
    const { rerender } = render(
      <FigureQuantityControl
        figure={figure}
        quantity={0}
        onQuantityChange={onQuantityChange}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Add Naruto" }))
    expect(onQuantityChange).toHaveBeenLastCalledWith(figure.id, 1)

    rerender(
      <FigureQuantityControl
        figure={figure}
        quantity={1}
        onQuantityChange={onQuantityChange}
      />
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Increase quantity of Naruto" })
    )
    expect(onQuantityChange).toHaveBeenLastCalledWith(figure.id, 2)
    // − at 1 unstages
    fireEvent.click(
      screen.getByRole("button", { name: "Decrease quantity of Naruto" })
    )
    expect(onQuantityChange).toHaveBeenLastCalledWith(figure.id, 0)
  })
})
