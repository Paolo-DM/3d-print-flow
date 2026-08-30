// @vitest-environment jsdom
import "fake-indexeddb/auto"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { store } from "~/lib/store"
import {
  createBrand,
  createFigure,
  createOrder,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"
import { ColorRankingEntry } from "~/components/ColorRankingEntry"

beforeEach(() => {
  store.setState({
    spools: new Map(),
    brands: new Map(),
    figures: new Map(),
    orders: new Map(),
    queueItems: new Map(),
  })
})

afterEach(cleanup)

const whiteSpool = createSpool({
  id: "s-white",
  name: "White PLA",
  hex: "#FFFFFF",
})
const redSpool = createSpool({ id: "s-red", name: "Red PLA", hex: "#FF0000" })
const blueSpool = createSpool({
  id: "s-blue",
  name: "Blue PLA",
  hex: "#0000FF",
})

const spools = new Map([
  [whiteSpool.id, whiteSpool],
  [redSpool.id, redSpool],
  [blueSpool.id, blueSpool],
])

const shippuden = createBrand({ id: "b1", name: "Shippuden" })
const brands = new Map([[shippuden.id, shippuden]])

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
    const figure = createFigure({
      id: "f1",
      requiredColors: ["s-white", "s-red"],
    })
    const qi = createQueueItem({ figureId: "f1", completedCounts: {} })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        brands={brands}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    expect(screen.getByText("White PLA")).toBeTruthy()
    expect(screen.getByText("2")).toBeTruthy()
    expect(screen.getByTestId("color-swatch")).toBeTruthy()
  })

  it("expands on click to show figure list", () => {
    const entry = makeEntry()
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      brandId: "b1",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({ figureId: "f1", completedCounts: {} })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        brands={brands}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    expect(screen.getByText("Naruto")).toBeTruthy()
    expect(screen.getByText("Shippuden")).toBeTruthy()
  })

  it("orders appear above stock in expanded list", () => {
    const entry = makeEntry({ count: 2, hasOrders: true })
    const figure = createFigure({
      id: "f1",
      name: "Stock Figure",
      requiredColors: ["s-white"],
    })
    const figure2 = createFigure({
      id: "f2",
      name: "Order Figure",
      requiredColors: ["s-white"],
    })
    const stockQi = createQueueItem({
      figureId: "f1",
      orderId: null,
      completedCounts: {},
    })
    const orderQi = createQueueItem({
      figureId: "f2",
      orderId: "00000000-0000-4000-8000-000000000001",
      completedCounts: {},
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={
          new Map([
            ["f1", figure],
            ["f2", figure2],
          ])
        }
        brands={brands}
        queueItems={
          new Map([
            [stockQi.id, stockQi],
            [orderQi.id, orderQi],
          ])
        }
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))

    const names = screen.getAllByText(/Figure/)
    const orderIndex = names.findIndex(
      (el) => el.textContent === "Order Figure"
    )
    const stockIndex = names.findIndex(
      (el) => el.textContent === "Stock Figure"
    )
    expect(orderIndex).toBeLessThan(stockIndex)
  })

  it("excludes figures that completed this color", () => {
    const entry = makeEntry({ count: 1 })
    const figure1 = createFigure({
      id: "f1",
      name: "Incomplete",
      requiredColors: ["s-white"],
    })
    const figure2 = createFigure({
      id: "f2",
      name: "Complete",
      requiredColors: ["s-white"],
    })
    const qi1 = createQueueItem({ figureId: "f1", completedCounts: {} })
    const qi2 = createQueueItem({
      figureId: "f2",
      completedCounts: { "s-white": 1 },
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={
          new Map([
            ["f1", figure1],
            ["f2", figure2],
          ])
        }
        brands={brands}
        queueItems={
          new Map([
            [qi1.id, qi1],
            [qi2.id, qi2],
          ])
        }
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))

    expect(screen.getByText("Incomplete")).toBeTruthy()
    expect(screen.queryByText("Complete")).toBeNull()
  })

  it("does not substitute a generic badge for order identity", () => {
    const entry = makeEntry({ hasOrders: true })
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      figureId: "f1",
      orderId: "00000000-0000-4000-8000-000000000001",
      completedCounts: {},
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        brands={brands}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    expect(screen.queryByText("Order")).toBeNull()
  })

  it("renders the linked order reference and platform in expanded work", () => {
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "WEB-42",
      platform: "Etsy",
    })
    const entry = makeEntry({ hasOrders: true })
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      figureId: figure.id,
      orderId: order.id,
    })
    store.setState({ orders: new Map([[order.id, order]]) })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([[figure.id, figure]])}
        brands={brands}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    expect(screen.getByText("WEB-42")).toBeTruthy()
    expect(screen.getByText("Etsy")).toBeTruthy()
    expect(screen.queryByText("Order")).toBeNull()
  })

  it("renders separator between order and stock items in expanded list", () => {
    const entry = makeEntry({ count: 2, hasOrders: true })
    const figure = createFigure({
      id: "f1",
      name: "Stock Figure",
      requiredColors: ["s-white"],
    })
    const figure2 = createFigure({
      id: "f2",
      name: "Order Figure",
      requiredColors: ["s-white"],
    })
    const stockQi = createQueueItem({
      figureId: "f1",
      orderId: null,
      completedCounts: {},
    })
    const orderQi = createQueueItem({
      figureId: "f2",
      orderId: "00000000-0000-4000-8000-000000000001",
      completedCounts: {},
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={
          new Map([
            ["f1", figure],
            ["f2", figure2],
          ])
        }
        brands={brands}
        queueItems={
          new Map([
            [stockQi.id, stockQi],
            [orderQi.id, orderQi],
          ])
        }
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    expect(screen.getByTestId("order-stock-separator")).toBeTruthy()
  })

  it("does not render separator when all items are orders", () => {
    const entry = makeEntry({ count: 2, hasOrders: true })
    const figure = createFigure({
      id: "f1",
      name: "Order A",
      requiredColors: ["s-white"],
    })
    const figure2 = createFigure({
      id: "f2",
      name: "Order B",
      requiredColors: ["s-white"],
    })
    const qi1 = createQueueItem({
      figureId: "f1",
      orderId: "00000000-0000-4000-8000-000000000001",
      completedCounts: {},
    })
    const qi2 = createQueueItem({
      figureId: "f2",
      orderId: "00000000-0000-4000-8000-000000000001",
      completedCounts: {},
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={
          new Map([
            ["f1", figure],
            ["f2", figure2],
          ])
        }
        brands={brands}
        queueItems={
          new Map([
            [qi1.id, qi1],
            [qi2.id, qi2],
          ])
        }
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    expect(screen.queryByTestId("order-stock-separator")).toBeNull()
  })

  it("does not render separator when all items are stock", () => {
    const entry = makeEntry({ count: 2 })
    const figure = createFigure({
      id: "f1",
      name: "Stock A",
      requiredColors: ["s-white"],
    })
    const figure2 = createFigure({
      id: "f2",
      name: "Stock B",
      requiredColors: ["s-white"],
    })
    const qi1 = createQueueItem({
      figureId: "f1",
      orderId: null,
      completedCounts: {},
    })
    const qi2 = createQueueItem({
      figureId: "f2",
      orderId: null,
      completedCounts: {},
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={
          new Map([
            ["f1", figure],
            ["f2", figure2],
          ])
        }
        brands={brands}
        queueItems={
          new Map([
            [qi1.id, qi1],
            [qi2.id, qi2],
          ])
        }
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    expect(screen.queryByTestId("order-stock-separator")).toBeNull()
  })

  it("renders stock badge on stock items in expanded list", () => {
    const entry = makeEntry({ count: 1 })
    const figure = createFigure({
      id: "f1",
      name: "Stock Figure",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      figureId: "f1",
      orderId: null,
      completedCounts: {},
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        brands={brands}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    expect(screen.getByText("Stock")).toBeTruthy()
  })

  it("renders rank position with tabular-nums", () => {
    const entry = makeEntry()
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({ figureId: "f1", completedCounts: {} })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={3}
        figures={new Map([["f1", figure]])}
        brands={brands}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    const rankEl = screen.getByText("3")
    expect(rankEl.className).toContain("tabular-nums")
  })

  it("toggles chip state when ColorChip is clicked", () => {
    const figure = createFigure({
      id: "f1",
      requiredColors: ["s-white", "s-red"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })
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
        brands={brands}
        queueItems={new Map([["q1", qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    const pendingChip = screen.getByLabelText("Mark White PLA as printed")
    fireEvent.click(pendingChip)

    expect(
      store.getState().queueItems.get("q1")?.completedCounts["s-white"]
    ).toBe(1)
  })

  it("un-toggles chip when completed ColorChip is clicked", () => {
    const figure = createFigure({
      id: "f1",
      requiredColors: ["s-white", "s-red"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-red": 1 },
    })
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
        brands={brands}
        queueItems={new Map([["q1", qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    const completedChip = screen.getByLabelText("Unmark Red PLA")
    fireEvent.click(completedChip)

    expect(
      store.getState().queueItems.get("q1")?.completedCounts["s-red"]
    ).toBe(0)
  })

  it("keeps a row visible while copies of the current color are outstanding", () => {
    const entry = makeEntry({ count: 1 })
    const figure = createFigure({
      id: "f1",
      name: "Kratos",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      figureId: "f1",
      quantity: 2,
      completedCounts: { "s-white": 1 },
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        brands={brands}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    expect(screen.getByText("Kratos")).toBeTruthy()
    // per-spool count on the chip plus the progress fraction, both as text
    expect(screen.getAllByText("1/2").length).toBeGreaterThan(0)
  })

  it("hides a row once the current color reached quantity on that entry", () => {
    const entry = makeEntry({ count: 1 })
    const figure = createFigure({
      id: "f1",
      name: "Done",
      requiredColors: ["s-white", "s-red"],
    })
    const qi = createQueueItem({
      figureId: "f1",
      quantity: 2,
      completedCounts: { "s-white": 2 },
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        brands={brands}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    expect(screen.queryByText("Done")).toBeNull()
  })

  it("shows a ×N badge on multi-copy rows", () => {
    const entry = makeEntry({ count: 2 })
    const figure = createFigure({
      id: "f1",
      name: "Kratos",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      figureId: "f1",
      quantity: 2,
      completedCounts: {},
    })

    render(
      <ColorRankingEntry
        entry={entry}
        rank={1}
        figures={new Map([["f1", figure]])}
        brands={brands}
        queueItems={new Map([[qi.id, qi]])}
        spools={spools}
        currentSpoolId="s-white"
      />
    )

    fireEvent.click(screen.getByTestId("color-ranking-entry"))
    expect(screen.getByTestId("quantity-badge").textContent).toBe("×2")
  })
})
