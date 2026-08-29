// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { store } from "~/lib/store"
import { createBrand, createFigure } from "~/lib/test-utils"
import { BrandManager } from "~/components/BrandManager"

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
    queueItems: new Map(),
    dataGeneration: 0,
  })
})

function seedTwoBrands() {
  const naruto = createBrand({ id: "b-naruto", name: "naruto" })
  const onePiece = createBrand({ id: "b-op", name: "One Piece" })
  const f1 = createFigure({ id: "f1", name: "Kakashi", brandId: "b-naruto" })
  const f2 = createFigure({ id: "f2", name: "Sasuke", brandId: "b-naruto" })
  const f3 = createFigure({ id: "f3", name: "Luffy", brandId: "b-op" })
  store.setState({
    brands: new Map([
      [naruto.id, naruto],
      [onePiece.id, onePiece],
    ]),
    figures: new Map([
      [f1.id, f1],
      [f2.id, f2],
      [f3.id, f3],
    ]),
  })
}

function rowTexts() {
  return Array.from(screen.getByTestId("brand-manager-list").children).map(
    (li) => li.textContent ?? ""
  )
}

describe("BrandManager", () => {
  it("shows an empty message when no brands exist", () => {
    render(<BrandManager />)

    expect(screen.getByText("No Brands Yet")).toBeTruthy()
    expect(screen.queryByTestId("brand-manager-list")).toBeNull()
  })

  it("lists brands case-insensitively alphabetized with figure counts", () => {
    const zelda = createBrand({ id: "b-zelda", name: "zelda" })
    const mario = createBrand({ id: "b-mario", name: "Mario" })
    const animal = createBrand({ id: "b-animal", name: "animal crossing" })
    const link = createFigure({ id: "f1", brandId: "b-zelda" })
    store.setState({
      brands: new Map([
        [zelda.id, zelda],
        [mario.id, mario],
        [animal.id, animal],
      ]),
      figures: new Map([[link.id, link]]),
    })

    render(<BrandManager />)

    const texts = rowTexts()
    expect(texts).toHaveLength(3)
    expect(texts[0]).toContain("animal crossing")
    expect(texts[1]).toContain("Mario")
    expect(texts[2]).toContain("zelda")
    // Zero-figure brands are listed with count 0
    expect(texts[1]).toContain("0 figures")
    expect(texts[2]).toContain("1 figure")
  })

  it("renames a brand in place, preserving its id, and re-sorts the list", () => {
    seedTwoBrands()
    render(<BrandManager />)

    fireEvent.click(screen.getByLabelText("Rename naruto"))
    fireEvent.change(screen.getByTestId("brand-rename-input-b-naruto"), {
      target: { value: "Zelda" },
    })
    fireEvent.click(screen.getByTestId("brand-rename-save-b-naruto"))

    expect(store.getState().brands.get("b-naruto")).toEqual({
      id: "b-naruto",
      name: "Zelda",
    })
    const texts = rowTexts()
    expect(texts[0]).toContain("One Piece")
    expect(texts[1]).toContain("Zelda")
    expect(screen.queryByTestId("brand-rename-input-b-naruto")).toBeNull()
  })

  it("saving unchanged text exits edit mode without mutating", () => {
    seedTwoBrands()
    render(<BrandManager />)

    const before = store.getState().brands
    fireEvent.click(screen.getByLabelText("Rename naruto"))
    fireEvent.click(screen.getByTestId("brand-rename-save-b-naruto"))

    expect(screen.queryByTestId("brand-rename-input-b-naruto")).toBeNull()
    expect(store.getState().brands).toBe(before)
  })

  it("rejects a blank rename inline, staying in edit mode without mutating", () => {
    seedTwoBrands()
    render(<BrandManager />)

    const before = store.getState().brands
    fireEvent.click(screen.getByLabelText("Rename naruto"))
    fireEvent.change(screen.getByTestId("brand-rename-input-b-naruto"), {
      target: { value: "   " },
    })
    fireEvent.click(screen.getByTestId("brand-rename-save-b-naruto"))

    expect(screen.getByTestId("brand-rename-error-b-naruto")).toBeTruthy()
    expect(screen.getByTestId("brand-rename-input-b-naruto")).toBeTruthy()
    expect(store.getState().brands).toBe(before)
  })

  it("a rename collision offers the merge dialog; cancelling keeps the typed text", () => {
    seedTwoBrands()
    render(<BrandManager />)

    const before = store.getState().brands
    fireEvent.click(screen.getByLabelText("Rename naruto"))
    fireEvent.change(screen.getByTestId("brand-rename-input-b-naruto"), {
      target: { value: "one piece" },
    })
    fireEvent.click(screen.getByTestId("brand-rename-save-b-naruto"))

    expect(screen.getByRole("alertdialog")).toBeTruthy()
    expect(
      screen.getByText(
        `Merging "naruto" into "One Piece" moves 2 figures and deletes "naruto".`
      )
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(store.getState().brands).toBe(before)
    expect(
      (screen.getByTestId("brand-rename-input-b-naruto") as HTMLInputElement)
        .value
    ).toBe("one piece")
  })

  it("confirming a collision merge discards the typed casing and keeps the target name", () => {
    seedTwoBrands()
    render(<BrandManager />)

    fireEvent.click(screen.getByLabelText("Rename naruto"))
    fireEvent.change(screen.getByTestId("brand-rename-input-b-naruto"), {
      target: { value: "ONE PIECE" },
    })
    fireEvent.click(screen.getByTestId("brand-rename-save-b-naruto"))
    fireEvent.click(screen.getByRole("button", { name: "Merge" }))

    const brands = store.getState().brands
    expect(brands.size).toBe(1)
    expect(brands.get("b-op")?.name).toBe("One Piece")
    expect(store.getState().figures.get("f1")?.brandId).toBe("b-op")
    expect(store.getState().figures.get("f2")?.brandId).toBe("b-op")
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(rowTexts()).toHaveLength(1)
    expect(rowTexts()[0]).toContain("3 figures")
  })

  it("explicit merge: the selector excludes the source and the dialog names both brands and the count", () => {
    seedTwoBrands()
    render(<BrandManager />)

    fireEvent.click(screen.getByTestId("brand-merge-b-naruto"))

    expect(screen.getByTestId("brand-merge-target-b-op")).toBeTruthy()
    expect(screen.queryByTestId("brand-merge-target-b-naruto")).toBeNull()

    fireEvent.click(screen.getByTestId("brand-merge-target-b-op"))

    expect(
      screen.getByText(
        `Merging "naruto" into "One Piece" moves 2 figures and deletes "naruto".`
      )
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Merge" }))

    expect(store.getState().brands.has("b-naruto")).toBe(false)
    expect(store.getState().figures.get("f1")?.brandId).toBe("b-op")
  })

  it("cancelling the explicit merge dialog mutates nothing", () => {
    seedTwoBrands()
    render(<BrandManager />)

    const brands = store.getState().brands
    const figures = store.getState().figures
    fireEvent.click(screen.getByTestId("brand-merge-b-naruto"))
    fireEvent.click(screen.getByTestId("brand-merge-target-b-op"))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(store.getState().brands).toBe(brands)
    expect(store.getState().figures).toBe(figures)
  })

  it("confirming a merge whose source vanished concurrently mutates nothing", () => {
    seedTwoBrands()
    render(<BrandManager />)

    fireEvent.click(screen.getByTestId("brand-merge-b-naruto"))
    fireEvent.click(screen.getByTestId("brand-merge-target-b-op"))
    expect(screen.getByRole("alertdialog")).toBeTruthy()

    // The source disappears underneath the open dialog
    act(() => {
      store.getState().deleteBrand("b-naruto")
    })

    // Still open, but its brands no longer resolve — no literal "undefined"
    expect(screen.getByRole("alertdialog").textContent).not.toContain(
      "undefined"
    )

    const brands = store.getState().brands
    const figures = store.getState().figures

    fireEvent.click(screen.getByRole("button", { name: "Merge" }))

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(store.getState().brands).toBe(brands)
    expect(store.getState().figures).toBe(figures)
    expect(store.getState().brands.has("b-naruto")).toBe(false)
  })

  it("disables merge when the store holds a lone brand", () => {
    const lone = createBrand({ id: "b-lone", name: "Lonely" })
    store.setState({ brands: new Map([[lone.id, lone]]) })

    render(<BrandManager />)

    expect(
      (screen.getByTestId("brand-merge-b-lone") as HTMLButtonElement).disabled
    ).toBe(true)
  })

  it("delete states the referenced-figure count and that figures are kept", () => {
    seedTwoBrands()
    render(<BrandManager />)

    fireEvent.click(screen.getByLabelText("Delete naruto"))

    expect(
      screen.getByText(
        `Deleting "naruto" keeps its 2 figures and moves them to "No brand".`
      )
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(store.getState().brands.has("b-naruto")).toBe(false)
    expect(store.getState().figures.size).toBe(3)
    expect(store.getState().figures.get("f1")?.brandId).toBeNull()
    expect(store.getState().figures.get("f2")?.brandId).toBeNull()
  })

  it("delete wording for a brand with no figures", () => {
    const naruto = createBrand({ id: "b-naruto", name: "naruto" })
    const onePiece = createBrand({ id: "b-op", name: "One Piece" })
    store.setState({
      brands: new Map([
        [naruto.id, naruto],
        [onePiece.id, onePiece],
      ]),
    })

    render(<BrandManager />)

    fireEvent.click(screen.getByLabelText("Delete naruto"))

    expect(
      screen.getByText(`"naruto" is not referenced by any figures.`)
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(store.getState().brands.size).toBe(1)
  })

  it("cancelling delete leaves the brand and its figures untouched", () => {
    seedTwoBrands()
    render(<BrandManager />)

    const brands = store.getState().brands
    const figures = store.getState().figures
    fireEvent.click(screen.getByLabelText("Delete naruto"))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(store.getState().brands).toBe(brands)
    expect(store.getState().figures).toBe(figures)
  })
})
