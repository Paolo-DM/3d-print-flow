// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createRoutesStub } from "react-router"

import { store } from "~/lib/store"
import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"
import QueueLayout from "~/routes/_queue"
import ColorView from "~/routes/_queue.home"

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

function renderColorView() {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: QueueLayout,
      children: [
        {
          index: true,
          Component: ColorView,
        },
      ],
    },
  ])
  return render(<Stub initialEntries={["/"]} />)
}

describe("ColorView route", () => {
  it("renders empty state when no spools exist", async () => {
    renderColorView()
    expect(await screen.findByText("No filament spools yet")).toBeTruthy()
    expect(screen.getByText("Add Your First Spool")).toBeTruthy()
  })

  it("renders empty state when spools exist but no figures", async () => {
    const spool = createSpool({ id: "s1" })
    store.setState({
      spools: new Map([["s1", spool]]),
    })

    renderColorView()
    expect(await screen.findByText("No figures in catalog")).toBeTruthy()
    expect(screen.getByText("Create Your First Figure")).toBeTruthy()
  })

  it("renders empty state when figures exist but queue is empty", async () => {
    const spool = createSpool({ id: "s1" })
    const figure = createFigure({ id: "f1", requiredColors: ["s1"] })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
    })

    renderColorView()
    expect(await screen.findByText("Print queue is empty")).toBeTruthy()
    expect(screen.getByText("Go to Catalog")).toBeTruthy()
  })

  it("renders all-complete empty state when queue items exist but all completed", async () => {
    const spool = createSpool({ id: "s1" })
    const figure = createFigure({ id: "f1", requiredColors: ["s1"] })
    const qi = createQueueItem({ figureId: "f1", completedColors: ["s1"] })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([[qi.id, qi]]),
    })

    renderColorView()
    expect(await screen.findByText("All colors complete!")).toBeTruthy()
  })

  it("renders ranked list when queue items with incomplete colors exist", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({ id: "f1", name: "Naruto", requiredColors: ["s1"] })
    const qi = createQueueItem({ figureId: "f1", completedColors: [] })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([[qi.id, qi]]),
    })

    renderColorView()
    expect(await screen.findByText("Red PLA")).toBeTruthy()
    expect(screen.getByTestId("color-ranking-entry")).toBeTruthy()
  })

  it("renders multiple ranked entries sorted by count descending", async () => {
    const spool1 = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const spool2 = createSpool({ id: "s2", name: "Blue PLA", hex: "#0000FF" })
    const figure1 = createFigure({ id: "f1", requiredColors: ["s1", "s2"] })
    const figure2 = createFigure({ id: "f2", requiredColors: ["s1"] })
    const qi1 = createQueueItem({ figureId: "f1", completedColors: [] })
    const qi2 = createQueueItem({ figureId: "f2", completedColors: [] })
    store.setState({
      spools: new Map([["s1", spool1], ["s2", spool2]]),
      figures: new Map([["f1", figure1], ["f2", figure2]]),
      queueItems: new Map([[qi1.id, qi1], [qi2.id, qi2]]),
    })

    renderColorView()
    const entries = await screen.findAllByTestId("color-ranking-entry")
    expect(entries).toHaveLength(2)
    // Red PLA should be first (count 2 vs count 1)
    expect(entries[0].textContent).toContain("Red PLA")
    expect(entries[1].textContent).toContain("Blue PLA")
  })

  it("updates chip state, figure progress, and ranking when a chip is toggled", async () => {
    const whiteSpool = createSpool({ id: "s-white", name: "White PLA", hex: "#FFFFFF" })
    const redSpool = createSpool({ id: "s-red", name: "Red PLA", hex: "#FF0000" })
    const naruto = createFigure({
      id: "f1",
      name: "Naruto",
      requiredColors: ["s-white", "s-red"],
    })
    const sasuke = createFigure({
      id: "f2",
      name: "Sasuke",
      requiredColors: ["s-white"],
    })
    const narutoQueueItem = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: [],
    })
    const sasukeQueueItem = createQueueItem({
      id: "q2",
      figureId: "f2",
      completedColors: [],
    })

    store.setState({
      spools: new Map([
        [whiteSpool.id, whiteSpool],
        [redSpool.id, redSpool],
      ]),
      figures: new Map([
        [naruto.id, naruto],
        [sasuke.id, sasuke],
      ]),
      queueItems: new Map([
        [narutoQueueItem.id, narutoQueueItem],
        [sasukeQueueItem.id, sasukeQueueItem],
      ]),
    })

    renderColorView()

    const whiteEntry = (await screen.findAllByTestId("color-ranking-entry")).find(
      (entry) => entry.textContent?.includes("White PLA"),
    ) as HTMLElement
    expect(whiteEntry).toBeTruthy()
    expect(
      screen
        .getAllByTestId("color-ranking-entry")
        .some((entry) => entry.textContent?.includes("Red PLA")),
    ).toBe(true)

    fireEvent.click(whiteEntry)

    const redChip = screen.getByLabelText("Mark Red PLA as printed")
    const narutoCard = redChip.closest("div.space-y-2") as HTMLElement
    expect(narutoCard).toBeTruthy()
    expect(within(narutoCard).getByText("0/2")).toBeTruthy()

    fireEvent.click(redChip)

    expect(within(narutoCard).getByLabelText("Unmark Red PLA")).toBeTruthy()
    expect(within(narutoCard).getByText("1/2")).toBeTruthy()
    expect(
      screen
        .getAllByTestId("color-ranking-entry")
        .some((entry) => entry.textContent?.includes("Red PLA")),
    ).toBe(false)
  })
})
