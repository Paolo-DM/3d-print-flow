// @vitest-environment jsdom
import "fake-indexeddb/auto"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { store } from "~/lib/store"
import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"
import { ColorRankingEntry } from "~/components/ColorRankingEntry"

beforeEach(() => {
  store.setState({
    spools: new Map(),
    figures: new Map(),
    queueItems: new Map(),
  })
})

afterEach(cleanup)

const whiteSpool = createSpool({ id: "s-white", name: "White PLA", hex: "#FFFFFF" })
const redSpool = createSpool({ id: "s-red", name: "Red PLA", hex: "#FF0000" })
const blueSpool = createSpool({ id: "s-blue", name: "Blue PLA", hex: "#0000FF" })

const spools = new Map([
  [whiteSpool.id, whiteSpool],
  [redSpool.id, redSpool],
  [blueSpool.id, blueSpool],
])

function makeEntry(overrides = {}) {
  return {
    spool: whiteSpool,
    count: 2,
    hasOrders: false,
    ...overrides,
  }
}

describe("ColorRankingEntry", () => {
  it("renders swatch, name, and count", () => {
    const entry = makeEntry()
    const figure = createFigure({ id: "f1", requiredColors: ["s-white", "s-red"] })
    const qi = createQueueItem({ figureId: "f1", completedColors: [] })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />,
    )

    expect(screen.getByText("White PLA")).toBeTruthy()
    expect(screen.getByText("2")).toBeTruthy()
    expect(screen.getByTestId("color-swatch")).toBeTruthy()
  })

  it("expands on click to show figure list", () => {
    const entry = makeEntry()
    const figure = createFigure({ id: "f1", name: "Naruto", franchise: "Shippuden", requiredColors: ["s-white"] })
    const qi = createQueueItem({ figureId: "f1", completedColors: [] })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />,
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    expect(screen.getByText("Naruto")).toBeTruthy()
  })

  it("orders appear above stock in expanded list", () => {
    const entry = makeEntry({ count: 2, hasOrders: true })
    const figure = createFigure({ id: "f1", name: "Stock Figure", requiredColors: ["s-white"] })
    const figure2 = createFigure({ id: "f2", name: "Order Figure", requiredColors: ["s-white"] })
    const stockQi = createQueueItem({ figureId: "f1", type: "stock", completedColors: [] })
    const orderQi = createQueueItem({ figureId: "f2", type: "order", completedColors: [] })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure], ["f2", figure2]])}
        queueItems={new Map([[stockQi.id, stockQi], [orderQi.id, orderQi]])}
        spools={spools}
        currentSpoolId="s-white"
      />,
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))

    const names = screen.getAllByText(/Figure/)
    const orderIndex = names.findIndex((el) => el.textContent === "Order Figure")
    const stockIndex = names.findIndex((el) => el.textContent === "Stock Figure")
    expect(orderIndex).toBeLessThan(stockIndex)
  })

  it("excludes figures that completed this color", () => {
    const entry = makeEntry({ count: 1 })
    const figure1 = createFigure({ id: "f1", name: "Incomplete", requiredColors: ["s-white"] })
    const figure2 = createFigure({ id: "f2", name: "Complete", requiredColors: ["s-white"] })
    const qi1 = createQueueItem({ figureId: "f1", completedColors: [] })
    const qi2 = createQueueItem({ figureId: "f2", completedColors: ["s-white"] })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure1], ["f2", figure2]])}
        queueItems={new Map([[qi1.id, qi1], [qi2.id, qi2]])}
        spools={spools}
        currentSpoolId="s-white"
      />,
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))

    expect(screen.getByText("Incomplete")).toBeTruthy()
    expect(screen.queryByText("Complete")).toBeNull()
  })

  it("shows order badge when entry has orders", () => {
    const entry = makeEntry({ hasOrders: true })
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({ figureId: "f1", type: "order", completedColors: [] })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />,
    )

    expect(screen.getByText("Order")).toBeTruthy()
  })

  it("renders rank position with tabular-nums", () => {
    const entry = makeEntry()
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({ figureId: "f1", completedColors: [] })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={3}
        figures={new Map([["f1", figure]])}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />,
    )

    const rankEl = screen.getByText("3")
    expect(rankEl.className).toContain("tabular-nums")
  })

  it("toggles chip state when ColorChip is clicked", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white", "s-red"] })
    const qi = createQueueItem({ id: "q1", figureId: "f1", completedColors: [] })
    const entry = makeEntry({ count: 1 })

    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        queueItems={new Map([["q1", qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />,
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    const pendingChip = screen.getByLabelText("Mark White PLA as printed")
    fireEvent.click(pendingChip)

    expect(
      store.getState().queueItems.get("q1")?.completedColors,
    ).toContain("s-white")
  })

  it("un-toggles chip when completed ColorChip is clicked", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white", "s-red"] })
    const qi = createQueueItem({ id: "q1", figureId: "f1", completedColors: ["s-red"] })
    const entry = makeEntry({ count: 1 })

    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        queueItems={new Map([["q1", qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />,
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    const completedChip = screen.getByLabelText("Unmark Red PLA")
    fireEvent.click(completedChip)

    expect(
      store.getState().queueItems.get("q1")?.completedColors,
    ).not.toContain("s-red")
  })
})
