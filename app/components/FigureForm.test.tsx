// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Suspense } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { store } from "~/lib/store"
import { createFigure, createSpool } from "~/lib/test-utils"
import { FigureForm } from "~/components/FigureForm"

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

function renderForm(props: {
  figure?: ReturnType<typeof createFigure>
  onSave?: () => void
  onCancel?: () => void
} = {}) {
  const onSave = props.onSave ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  return {
    onSave,
    onCancel,
    ...render(
      <Suspense fallback={<div>Loading...</div>}>
        <FigureForm
          figure={props.figure}
          onSave={onSave}
          onCancel={onCancel}
        />
      </Suspense>
    ),
  }
}

describe("FigureForm", () => {
  it("renders all form fields in create mode", () => {
    renderForm()

    expect(screen.getByTestId("figure-name-input")).toBeTruthy()
    expect(screen.getByTestId("figure-franchise-input")).toBeTruthy()
    expect(screen.getByTestId("figure-size-input")).toBeTruthy()
    expect(screen.getByTestId("figure-notes-input")).toBeTruthy()
  })

  it("save button is disabled when name is empty", () => {
    renderForm()

    const saveButton = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement
    expect(saveButton.disabled).toBe(true)
  })

  it("save button is enabled when name has content", () => {
    renderForm()

    fireEvent.change(screen.getByTestId("figure-name-input"), {
      target: { value: "Naruto" },
    })

    const saveButton = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement
    expect(saveButton.disabled).toBe(false)
  })

  it("save button stays disabled when name is whitespace-only", () => {
    renderForm()

    fireEvent.change(screen.getByTestId("figure-name-input"), {
      target: { value: "   " },
    })

    const saveButton = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement
    expect(saveButton.disabled).toBe(true)
  })

  it("shows available spools as selectable items", () => {
    const spool1 = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const spool2 = createSpool({ name: "Blue PLA", hex: "#0000FF" })
    store.setState({
      spools: new Map([
        [spool1.id, spool1],
        [spool2.id, spool2],
      ]),
    })

    renderForm()

    expect(screen.getByText("Red PLA")).toBeTruthy()
    expect(screen.getByText("Blue PLA")).toBeTruthy()
  })

  it("shows no-spools message when store has no spools", () => {
    renderForm()

    expect(screen.getByText("No spools available. Create spools first.")).toBeTruthy()
  })

  it("toggling a spool marks it as selected (aria-pressed)", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    store.setState({ spools: new Map([[spool.id, spool]]) })

    renderForm()

    const toggle = screen.getByTestId(`spool-toggle-${spool.id}`)
    expect(toggle.getAttribute("aria-pressed")).toBe("false")

    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-pressed")).toBe("true")
  })

  it("toggling a selected spool deselects it", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    store.setState({ spools: new Map([[spool.id, spool]]) })

    renderForm()

    const toggle = screen.getByTestId(`spool-toggle-${spool.id}`)
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-pressed")).toBe("false")
  })

  it("calls createFigure on save with correct data for new figure", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    store.setState({ spools: new Map([[spool.id, spool]]) })

    const onSave = vi.fn()
    renderForm({ onSave })

    fireEvent.change(screen.getByTestId("figure-name-input"), {
      target: { value: "  Naruto  " },
    })
    fireEvent.change(screen.getByTestId("figure-franchise-input"), {
      target: { value: "Naruto Shippuden" },
    })
    fireEvent.change(screen.getByTestId("figure-size-input"), {
      target: { value: "80" },
    })
    fireEvent.change(screen.getByTestId("figure-notes-input"), {
      target: { value: "test note" },
    })
    fireEvent.click(screen.getByTestId(`spool-toggle-${spool.id}`))

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSave).toHaveBeenCalledOnce()
    const figures = Array.from(store.getState().figures.values())
    expect(figures).toHaveLength(1)
    expect(figures[0].name).toBe("Naruto")
    expect(figures[0].franchise).toBe("Naruto Shippuden")
    expect(figures[0].size).toBe(80)
    expect(figures[0].notes).toBe("test note")
    expect(figures[0].requiredColors).toEqual([spool.id])
  })

  it("can save a figure with zero colors selected", () => {
    const onSave = vi.fn()
    renderForm({ onSave })

    fireEvent.change(screen.getByTestId("figure-name-input"), {
      target: { value: "Goku" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSave).toHaveBeenCalledOnce()
    const figures = Array.from(store.getState().figures.values())
    expect(figures).toHaveLength(1)
    expect(figures[0].requiredColors).toEqual([])
  })

  it("pre-populates all fields in edit mode", () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    store.setState({ spools: new Map([[spool.id, spool]]) })

    const figure = createFigure({
      name: "Naruto",
      franchise: "Naruto Shippuden",
      size: 75,
      notes: "my note",
      requiredColors: ["s1"],
    })

    renderForm({ figure })

    expect((screen.getByTestId("figure-name-input") as HTMLInputElement).value).toBe("Naruto")
    expect((screen.getByTestId("figure-franchise-input") as HTMLInputElement).value).toBe("Naruto Shippuden")
    expect((screen.getByTestId("figure-size-input") as HTMLInputElement).value).toBe("75")
    expect((screen.getByTestId("figure-notes-input") as HTMLTextAreaElement).value).toBe("my note")
    const toggle = screen.getByTestId(`spool-toggle-${spool.id}`)
    expect(toggle.getAttribute("aria-pressed")).toBe("true")
  })

  it("calls updateFigure on save with correct data in edit mode", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({ name: "OldName", franchise: "OldFranchise", size: 60, notes: "", requiredColors: [] })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([[figure.id, figure]]),
    })

    const onSave = vi.fn()
    renderForm({ figure, onSave })

    fireEvent.change(screen.getByTestId("figure-name-input"), {
      target: { value: "NewName" },
    })
    fireEvent.click(screen.getByTestId(`spool-toggle-${spool.id}`))

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSave).toHaveBeenCalledOnce()
    const updated = store.getState().figures.get(figure.id)
    expect(updated?.name).toBe("NewName")
    expect(updated?.requiredColors).toEqual([spool.id])
  })

  it("cancel calls onCancel without mutating store", () => {
    const onCancel = vi.fn()
    renderForm({ onCancel })

    fireEvent.change(screen.getByTestId("figure-name-input"), {
      target: { value: "Something" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(store.getState().figures.size).toBe(0)
  })
})
