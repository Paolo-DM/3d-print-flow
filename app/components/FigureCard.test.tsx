// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { store } from "~/lib/store"
import { createFigure, createSpool } from "~/lib/test-utils"
import { FigureCard } from "~/components/FigureCard"

afterEach(() => {
  cleanup()
  store.setState({ spools: new Map(), figures: new Map(), queueItems: new Map() })
})

describe("FigureCard", () => {
  it("renders figure name, franchise, and size", () => {
    const figure = createFigure({ name: "Naruto", franchise: "Naruto Shippuden", size: 75 })
    render(<FigureCard figure={figure} spools={new Map()} />)

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

    render(<FigureCard figure={figure} spools={spoolsMap} />)

    expect(screen.getByText("Red PLA")).toBeTruthy()
    expect(screen.getByText("Blue PLA")).toBeTruthy()
    const swatches = screen.getAllByTestId("color-swatch")
    expect(swatches).toHaveLength(2)
  })

  it('renders "No colors assigned" when requiredColors is empty', () => {
    const figure = createFigure({ requiredColors: [] })
    render(<FigureCard figure={figure} spools={new Map()} />)

    expect(screen.getByText("No colors assigned")).toBeTruthy()
  })

  it("applies border for near-white spool swatches (lightness > 0.85)", () => {
    const whiteSpool = createSpool({ id: "s1", name: "White PLA", hex: "#FFFFFF" })
    const figure = createFigure({ requiredColors: ["s1"] })
    const spoolsMap = new Map([[whiteSpool.id, whiteSpool]])

    render(<FigureCard figure={figure} spools={spoolsMap} />)

    const swatch = screen.getByTestId("color-swatch")
    expect(swatch.className).toContain("border")
  })

  it("silently skips dangling spool references", () => {
    const figure = createFigure({ requiredColors: ["nonexistent-id"] })
    render(<FigureCard figure={figure} spools={new Map()} />)

    expect(screen.getByText("No colors assigned")).toBeTruthy()
    expect(screen.queryByTestId("color-swatch")).toBeNull()
  })

  it("does not render franchise when it is empty", () => {
    const figure = createFigure({ name: "Custom Figure", franchise: "" })
    render(<FigureCard figure={figure} spools={new Map()} />)

    expect(screen.getByText("Custom Figure")).toBeTruthy()
    const header = screen.getByText("Custom Figure").closest("[data-slot='card-header']")!
    const paragraphs = header.querySelectorAll("p")
    // name + size = 2 paragraphs; franchise paragraph should be absent (would be 3 if rendered)
    expect(paragraphs).toHaveLength(2)
  })

  it("has data-testid figure-card", () => {
    const figure = createFigure()
    render(<FigureCard figure={figure} spools={new Map()} />)

    expect(screen.getByTestId("figure-card")).toBeTruthy()
  })

  it("renders edit button when onEdit is provided", () => {
    const figure = createFigure({ name: "Naruto" })
    const onEdit = vi.fn()
    render(<FigureCard figure={figure} spools={new Map()} onEdit={onEdit} />)

    expect(screen.getByRole("button", { name: "Edit Naruto" })).toBeTruthy()
  })

  it("edit button calls onEdit with the figure", () => {
    const figure = createFigure({ name: "Naruto" })
    const onEdit = vi.fn()
    render(<FigureCard figure={figure} spools={new Map()} onEdit={onEdit} />)

    fireEvent.click(screen.getByRole("button", { name: "Edit Naruto" }))

    expect(onEdit).toHaveBeenCalledOnce()
    expect(onEdit).toHaveBeenCalledWith(figure)
  })

  it("does not render edit button when onEdit is not provided", () => {
    const figure = createFigure({ name: "Naruto" })
    render(<FigureCard figure={figure} spools={new Map()} />)

    expect(screen.queryByRole("button", { name: "Edit Naruto" })).toBeNull()
  })

  it("renders delete button when onDelete is provided", () => {
    const figure = createFigure({ name: "Naruto" })
    const onDelete = vi.fn()
    render(<FigureCard figure={figure} spools={new Map()} onDelete={onDelete} />)

    expect(screen.getByRole("button", { name: "Delete Naruto" })).toBeTruthy()
  })

  it("delete button calls onDelete with the figure", () => {
    const figure = createFigure({ name: "Naruto" })
    const onDelete = vi.fn()
    render(<FigureCard figure={figure} spools={new Map()} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole("button", { name: "Delete Naruto" }))

    expect(onDelete).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledWith(figure)
  })

  it("does not render delete button when onDelete is not provided", () => {
    const figure = createFigure({ name: "Naruto" })
    render(<FigureCard figure={figure} spools={new Map()} />)

    expect(screen.queryByRole("button", { name: "Delete Naruto" })).toBeNull()
  })

  it("disables Add to Queue button when figure has zero requiredColors", () => {
    const figure = createFigure({ name: "Empty", requiredColors: [] })
    render(<FigureCard figure={figure} spools={new Map()} />)

    const btn = screen.getByRole("button", { name: "Add Empty to queue" })
    expect(btn.disabled).toBe(true)
  })

  it("Add to Queue Stock dispatches addToQueue with stock type", () => {
    const spool = createSpool({ id: "s1" })
    const figure = createFigure({ name: "Naruto", requiredColors: ["s1"] })
    render(<FigureCard figure={figure} spools={new Map([["s1", spool]])} />)

    const trigger = screen.getByRole("button", { name: "Add Naruto to queue" })
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" })
    fireEvent.click(screen.getByText("Stock"))

    const items = [...store.getState().queueItems.values()]
    expect(items).toHaveLength(1)
    expect(items[0].figureId).toBe(figure.id)
    expect(items[0].type).toBe("stock")
  })

  it("Add to Queue Order dispatches addToQueue with order type", () => {
    const spool = createSpool({ id: "s1" })
    const figure = createFigure({ name: "Naruto", requiredColors: ["s1"] })
    render(<FigureCard figure={figure} spools={new Map([["s1", spool]])} />)

    const trigger = screen.getByRole("button", { name: "Add Naruto to queue" })
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" })
    fireEvent.click(screen.getByText("Order"))

    const items = [...store.getState().queueItems.values()]
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe("order")
  })
})
