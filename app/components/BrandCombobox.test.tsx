// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createBrand } from "~/lib/test-utils"
import { BrandCombobox, type BrandSelection } from "~/components/BrandCombobox"
import type { Brand } from "~/lib/types"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer"

afterEach(cleanup)

const naruto = createBrand({ id: "b-naruto", name: "Naruto" })
const onePiece = createBrand({ id: "b-onepiece", name: "One Piece" })
const marvel = createBrand({ id: "b-marvel", name: "Marvel" })

function brandsMap(...brands: Brand[]) {
  return new Map(brands.map((b) => [b.id, b]))
}

function renderCombobox(
  props: {
    brands?: Map<string, Brand>
    value?: BrandSelection
    onChange?: (value: BrandSelection) => void
  } = {}
) {
  const onChange = props.onChange ?? vi.fn()
  return {
    onChange,
    ...render(
      <BrandCombobox
        brands={props.brands ?? brandsMap(naruto, onePiece, marvel)}
        value={props.value ?? { kind: "none" }}
        onChange={onChange}
      />
    ),
  }
}

function openCombobox() {
  fireEvent.click(screen.getByTestId("brand-combobox-trigger"))
}

describe("BrandCombobox", () => {
  it('shows "No brand" on the trigger when nothing is selected', () => {
    renderCombobox()
    expect(screen.getByTestId("brand-combobox-trigger").textContent).toContain(
      "No brand"
    )
  })

  it("shows the selected brand's name on the trigger", () => {
    renderCombobox({ value: { kind: "existing", brandId: "b-naruto" } })
    expect(screen.getByTestId("brand-combobox-trigger").textContent).toContain(
      "Naruto"
    )
  })

  it('shows "No brand" on the trigger for an unresolvable brandId (orphan tolerance)', () => {
    renderCombobox({ value: { kind: "existing", brandId: "missing" } })
    expect(screen.getByTestId("brand-combobox-trigger").textContent).toContain(
      "No brand"
    )
  })

  it("shows the staged new brand's name on the trigger", () => {
    renderCombobox({ value: { kind: "new", name: "Ghibli" } })
    expect(screen.getByTestId("brand-combobox-trigger").textContent).toContain(
      "Ghibli"
    )
  })

  it("lists brands alphabetically when opened", () => {
    renderCombobox()
    openCombobox()

    const options = screen.getAllByRole("option")
    const labels = options.map((o) => o.textContent)
    expect(labels).toEqual(["No brand", "Marvel", "Naruto", "One Piece"])
  })

  it("allows wheel input on the native-scroll options list inside a modal drawer", () => {
    const manyBrands = brandsMap(
      ...Array.from({ length: 20 }, (_, index) =>
        createBrand({ id: `b-${index}`, name: `Brand ${index}` })
      )
    )
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerTitle>Figure</DrawerTitle>
          <DrawerDescription>Edit figure details.</DrawerDescription>
          <BrandCombobox
            brands={manyBrands}
            value={{ kind: "none" }}
            onChange={vi.fn()}
          />
        </DrawerContent>
      </Drawer>
    )
    openCombobox()

    const listbox = screen.getByRole("listbox")
    expect(listbox.classList.contains("max-h-56")).toBe(true)
    expect(listbox.classList.contains("overflow-y-auto")).toBe(true)
    listbox.style.overflowY = "auto"
    Object.defineProperties(listbox, {
      clientHeight: { configurable: true, value: 224 },
      scrollHeight: { configurable: true, value: 800 },
    })

    const wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 40,
    })
    listbox.dispatchEvent(wheel)

    expect(wheel.defaultPrevented).toBe(false)
    expect(
      document
        .querySelector('[data-slot="drawer-content"]')
        ?.getAttribute("data-state")
    ).toBe("open")
  })

  it("filters brands case-insensitively", () => {
    renderCombobox()
    openCombobox()

    fireEvent.change(screen.getByTestId("brand-combobox-input"), {
      target: { value: "naru" },
    })

    expect(screen.getByTestId("brand-option-b-naruto")).toBeTruthy()
    expect(screen.queryByTestId("brand-option-b-marvel")).toBeNull()
    expect(screen.queryByTestId("brand-option-b-onepiece")).toBeNull()
  })

  it("selecting a brand calls onChange with an existing selection", () => {
    const { onChange } = renderCombobox()
    openCombobox()

    fireEvent.click(screen.getByTestId("brand-option-b-naruto"))

    expect(onChange).toHaveBeenCalledWith({
      kind: "existing",
      brandId: "b-naruto",
    })
  })

  it('the "No brand" row clears the selection', () => {
    const { onChange } = renderCombobox({
      value: { kind: "existing", brandId: "b-naruto" },
    })
    openCombobox()

    fireEvent.click(screen.getByTestId("brand-option-none"))

    expect(onChange).toHaveBeenCalledWith({ kind: "none" })
  })

  it("offers a create row when the query matches no brand", () => {
    const { onChange } = renderCombobox()
    openCombobox()

    fireEvent.change(screen.getByTestId("brand-combobox-input"), {
      target: { value: "  Ghibli  " },
    })

    const createRow = screen.getByTestId("brand-create-option")
    expect(createRow.textContent).toContain("Ghibli")

    fireEvent.click(createRow)
    expect(onChange).toHaveBeenCalledWith({ kind: "new", name: "Ghibli" })
  })

  it("hides the create row when the query matches an existing brand case-insensitively", () => {
    renderCombobox()
    openCombobox()

    fireEvent.change(screen.getByTestId("brand-combobox-input"), {
      target: { value: "naruto" },
    })

    expect(screen.queryByTestId("brand-create-option")).toBeNull()
    expect(screen.getByTestId("brand-option-b-naruto")).toBeTruthy()
  })

  it("hides the create row when the query is empty", () => {
    renderCombobox()
    openCombobox()

    expect(screen.queryByTestId("brand-create-option")).toBeNull()
  })

  it("shows an empty message when nothing matches and no brands exist", () => {
    renderCombobox({ brands: new Map() })
    openCombobox()

    expect(screen.getByText("No brands found.")).toBeTruthy()
  })

  it("applies the id prop to the trigger", () => {
    renderCombobox()
    // renderCombobox does not pass id — rerender directly with one
    cleanup()
    render(
      <BrandCombobox
        id="figure-brand"
        brands={brandsMap(naruto)}
        value={{ kind: "none" }}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByTestId("brand-combobox-trigger").id).toBe("figure-brand")
  })

  describe("staged new brand row", () => {
    it("shows a checked, selected row for the staged brand when reopened", () => {
      renderCombobox({ value: { kind: "new", name: "Ghibli" } })
      openCombobox()

      const staged = screen.getByTestId("brand-option-staged")
      expect(staged.textContent).toContain("Ghibli")
      expect(staged.getAttribute("aria-selected")).toBe("true")
    })

    it("clicking the staged row re-selects it and closes the popover", () => {
      const { onChange } = renderCombobox({
        value: { kind: "new", name: "Ghibli" },
      })
      openCombobox()

      fireEvent.click(screen.getByTestId("brand-option-staged"))

      expect(onChange).toHaveBeenCalledWith({ kind: "new", name: "Ghibli" })
      expect(screen.queryByTestId("brand-combobox-input")).toBeNull()
    })

    it("hides the staged row when the query does not match it", () => {
      renderCombobox({ value: { kind: "new", name: "Ghibli" } })
      openCombobox()

      fireEvent.change(screen.getByTestId("brand-combobox-input"), {
        target: { value: "xyz" },
      })

      expect(screen.queryByTestId("brand-option-staged")).toBeNull()
    })

    it("typing the staged name (any casing) shows the staged row instead of a create row", () => {
      renderCombobox({ value: { kind: "new", name: "Ghibli" } })
      openCombobox()

      fireEvent.change(screen.getByTestId("brand-combobox-input"), {
        target: { value: "ghibli" },
      })

      expect(screen.getByTestId("brand-option-staged")).toBeTruthy()
      expect(screen.queryByTestId("brand-create-option")).toBeNull()
    })
  })

  describe("ARIA", () => {
    it("every child of the listbox has role option (create row included)", () => {
      renderCombobox()
      openCombobox()

      fireEvent.change(screen.getByTestId("brand-combobox-input"), {
        target: { value: "Ghibli" },
      })

      const listbox = screen.getByRole("listbox")
      const children = Array.from(listbox.children)
      expect(children.length).toBeGreaterThan(0)
      expect(
        children.every((child) => child.getAttribute("role") === "option")
      ).toBe(true)
      expect(
        within(listbox).getByTestId("brand-create-option").getAttribute("role")
      ).toBe("option")
    })

    it('renders the "No brands found." message outside the listbox', () => {
      renderCombobox({ brands: new Map() })
      openCombobox()

      const listbox = screen.getByRole("listbox")
      expect(within(listbox).queryByText("No brands found.")).toBeNull()
      expect(screen.getByText("No brands found.")).toBeTruthy()
    })
  })

  describe("Enter key", () => {
    it("selects the exact brandKey match regardless of casing", () => {
      const { onChange } = renderCombobox()
      openCombobox()

      fireEvent.change(screen.getByTestId("brand-combobox-input"), {
        target: { value: "  naruto " },
      })
      fireEvent.keyDown(screen.getByTestId("brand-combobox-input"), {
        key: "Enter",
      })

      expect(onChange).toHaveBeenCalledWith({
        kind: "existing",
        brandId: "b-naruto",
      })
      expect(screen.queryByTestId("brand-combobox-input")).toBeNull()
    })

    it("stages a create when no brand matches", () => {
      const { onChange } = renderCombobox()
      openCombobox()

      fireEvent.change(screen.getByTestId("brand-combobox-input"), {
        target: { value: "  Ghibli " },
      })
      fireEvent.keyDown(screen.getByTestId("brand-combobox-input"), {
        key: "Enter",
      })

      expect(onChange).toHaveBeenCalledWith({ kind: "new", name: "Ghibli" })
    })

    it("re-selects the staged brand with its original casing when the query matches it", () => {
      const { onChange } = renderCombobox({
        value: { kind: "new", name: "Ghibli" },
      })
      openCombobox()

      fireEvent.change(screen.getByTestId("brand-combobox-input"), {
        target: { value: "ghibli" },
      })
      fireEvent.keyDown(screen.getByTestId("brand-combobox-input"), {
        key: "Enter",
      })

      expect(onChange).toHaveBeenCalledWith({ kind: "new", name: "Ghibli" })
    })

    it("does nothing on an empty query", () => {
      const { onChange } = renderCombobox()
      openCombobox()

      fireEvent.keyDown(screen.getByTestId("brand-combobox-input"), {
        key: "Enter",
      })

      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByTestId("brand-combobox-input")).toBeTruthy()
    })
  })
})
