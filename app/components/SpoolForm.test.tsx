// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Suspense } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { store } from "~/lib/store"
import { createSpool } from "~/lib/test-utils"
import { SpoolForm } from "~/components/SpoolForm"

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
  spool?: ReturnType<typeof createSpool>
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
        <SpoolForm
          spool={props.spool}
          onSave={onSave}
          onCancel={onCancel}
        />
      </Suspense>
    ),
  }
}

describe("SpoolForm", () => {
  it("create mode — renders empty name input and default color", () => {
    renderForm()

    const nameInput = screen.getByTestId("spool-name-input") as HTMLInputElement
    expect(nameInput.value).toBe("")

    const swatch = screen.getByTestId("color-swatch-trigger")
    expect(swatch.style.backgroundColor).toBe("rgb(99, 102, 241)")
  })

  it("edit mode — pre-populates name and hex from provided spool", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#ff0000" })
    renderForm({ spool })

    const nameInput = screen.getByTestId("spool-name-input") as HTMLInputElement
    expect(nameInput.value).toBe("Red PLA")

    const swatch = screen.getByTestId("color-swatch-trigger")
    expect(swatch.style.backgroundColor).toBe("rgb(255, 0, 0)")
  })

  it("save button is disabled when name is empty", () => {
    renderForm()

    const saveButton = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement
    expect(saveButton.disabled).toBe(true)
  })

  it("save calls createSpool for new spool with trimmed name", () => {
    const onSave = vi.fn()
    renderForm({ onSave })

    const nameInput = screen.getByTestId("spool-name-input")
    fireEvent.change(nameInput, { target: { value: "  Blue PLA  " } })

    const saveButton = screen.getByRole("button", { name: "Save" })
    fireEvent.click(saveButton)

    expect(onSave).toHaveBeenCalledOnce()
    const spools = Array.from(store.getState().spools.values())
    expect(spools).toHaveLength(1)
    expect(spools[0].name).toBe("Blue PLA")
    expect(spools[0].hex).toBe("#6366f1")
  })

  it("save calls updateSpool for existing spool", () => {
    const spool = createSpool({ name: "Old Name", hex: "#ff0000" })
    store.setState({
      spools: new Map([[spool.id, spool]]),
    })

    const onSave = vi.fn()
    renderForm({ spool, onSave })

    const nameInput = screen.getByTestId("spool-name-input")
    fireEvent.change(nameInput, { target: { value: "New Name" } })

    const saveButton = screen.getByRole("button", { name: "Save" })
    fireEvent.click(saveButton)

    expect(onSave).toHaveBeenCalledOnce()
    const updated = store.getState().spools.get(spool.id)
    expect(updated?.name).toBe("New Name")
  })

  it("cancel calls onCancel without mutating store", () => {
    const onCancel = vi.fn()
    renderForm({ onCancel })

    const nameInput = screen.getByTestId("spool-name-input")
    fireEvent.change(nameInput, { target: { value: "Something" } })

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    fireEvent.click(cancelButton)

    expect(onCancel).toHaveBeenCalledOnce()
    expect(store.getState().spools.size).toBe(0)
  })

  it("save button stays disabled when name is whitespace-only", () => {
    renderForm()

    const nameInput = screen.getByTestId("spool-name-input")
    fireEvent.change(nameInput, { target: { value: "   " } })

    const saveButton = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement
    expect(saveButton.disabled).toBe(true)
  })
})
