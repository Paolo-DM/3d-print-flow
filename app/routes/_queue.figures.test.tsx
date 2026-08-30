// @vitest-environment jsdom
import "fake-indexeddb/auto"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createRoutesStub } from "react-router"

import { store } from "~/lib/store"
import {
  createBrand,
  createFigure,
  createOrder,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"
import QueueLayout from "~/routes/_queue"
import FigureView from "~/routes/_queue.figures"

let prefersReducedMotion = false

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches:
        query === "(prefers-reduced-motion: reduce)" && prefersReducedMotion,
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
  })
  prefersReducedMotion = false
})

function renderFigureView(path = "/figures") {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: QueueLayout,
      children: [{ path: "figures", Component: FigureView }],
    },
  ])
  return render(<Stub initialEntries={[path]} />)
}

describe("FigureView route", () => {
  it("renders empty state when no spools exist", async () => {
    renderFigureView()
    expect(await screen.findByText("No filament spools yet")).toBeTruthy()
    expect(screen.getByText("Add Your First Spool")).toBeTruthy()
  })

  it("prioritizes the no-spools empty state even when figures and queue items exist", async () => {
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      requiredColors: ["s1"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })

    store.setState({
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderFigureView()
    expect(await screen.findByText("No filament spools yet")).toBeTruthy()
    expect(screen.queryByText("Naruto")).toBeNull()
  })

  it("renders empty state when spools exist but no figures", async () => {
    const spool = createSpool({ id: "s1" })
    store.setState({
      spools: new Map([["s1", spool]]),
    })

    renderFigureView()
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

    renderFigureView()
    expect(await screen.findByText("Print queue is empty")).toBeTruthy()
    expect(screen.getByText("Go to Catalog")).toBeTruthy()
  })

  it("renders all-complete empty state when all queue items are finished", async () => {
    const spool = createSpool({ id: "s1" })
    const figure = createFigure({ id: "f1", requiredColors: ["s1"] })
    const qi = createQueueItem({ figureId: "f1", completedCounts: { s1: 1 } })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([[qi.id, qi]]),
    })

    renderFigureView()
    expect(await screen.findByText("All figures complete!")).toBeTruthy()
  })

  it("renders QueueItemCards when queue items exist", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const brand = createBrand({ id: "b1", name: "Shippuden" })
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      brandId: "b1",
      requiredColors: ["s1"],
    })
    const qi = createQueueItem({ figureId: "f1", completedCounts: {} })
    store.setState({
      spools: new Map([["s1", spool]]),
      brands: new Map([["b1", brand]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([[qi.id, qi]]),
    })

    renderFigureView()
    expect(await screen.findByText("Naruto")).toBeTruthy()
    expect(screen.getByText("Shippuden")).toBeTruthy()
    expect(screen.getByText("0/1")).toBeTruthy()
  })

  it("an order scope renders only that order's figures", async () => {
    const spool = createSpool({ id: "s1" })
    const orderFigure = createFigure({
      id: "f-order",
      name: "Order figure",
      requiredColors: [spool.id],
    })
    const stockFigure = createFigure({
      id: "f-stock",
      name: "Stock figure",
      requiredColors: [spool.id],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
    })
    const orderRow = createQueueItem({
      id: "q-order",
      figureId: orderFigure.id,
      orderId: order.id,
    })
    const stockRow = createQueueItem({
      id: "q-stock",
      figureId: stockFigure.id,
      orderId: null,
    })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([
        [orderFigure.id, orderFigure],
        [stockFigure.id, stockFigure],
      ]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([
        [orderRow.id, orderRow],
        [stockRow.id, stockRow],
      ]),
    })

    renderFigureView(`/figures?scope=order:${order.id}`)

    expect(await screen.findByText("Order figure")).toBeTruthy()
    expect(screen.queryByText("Stock figure")).toBeNull()
  })

  it("explains an empty selected scope without claiming all figures are complete", async () => {
    const spool = createSpool({ id: "s1" })
    const figure = createFigure({ id: "f1", requiredColors: [spool.id] })
    const draft = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
    })
    const stock = createQueueItem({ figureId: figure.id, orderId: null })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([[figure.id, figure]]),
      orders: new Map([[draft.id, draft]]),
      queueItems: new Map([[stock.id, stock]]),
    })

    renderFigureView(`/figures?scope=order:${draft.id}`)

    expect(await screen.findByText("No figures in this scope")).toBeTruthy()
    expect(screen.queryByText("All figures complete!")).toBeNull()
  })

  it("orders appear before stock items", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const stockFigure = createFigure({
      id: "f1",
      name: "Stock Figure",
      requiredColors: ["s1"],
    })
    const orderFigure = createFigure({
      id: "f2",
      name: "Order Figure",
      requiredColors: ["s1"],
    })
    const stockQi = createQueueItem({
      id: "q-stock",
      figureId: "f1",
      orderId: null,
      completedCounts: {},
    })
    const orderQi = createQueueItem({
      id: "q-order",
      figureId: "f2",
      orderId: "00000000-0000-4000-8000-000000000001",
      completedCounts: {},
    })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([
        ["f1", stockFigure],
        ["f2", orderFigure],
      ]),
      queueItems: new Map([
        [stockQi.id, stockQi],
        [orderQi.id, orderQi],
      ]),
    })

    renderFigureView()
    await screen.findByText("Order Figure")
    screen.getByText("Stock Figure")

    const cards = screen.getAllByTestId("queue-item-card")
    const cardArray = Array.from(cards)
    const orderIndex = cardArray.findIndex((card) =>
      card.textContent?.includes("Order Figure")
    )
    const stockIndex = cardArray.findIndex((card) =>
      card.textContent?.includes("Stock Figure")
    )
    expect(orderIndex).toBeLessThan(stockIndex)
  })

  it("keeps completing item visible with pulse class after last chip is toggled", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s1"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderFigureView()
    await screen.findByText("Goku")

    // Toggle the only chip to complete the figure
    fireEvent.click(screen.getByLabelText("Mark Red PLA as printed"))

    // Item should still be visible (in completing animation)
    const card = screen.getByTestId("queue-item-card")
    expect(card.className).toContain("animate-completion-pulse")
  })

  it("completed item stays visible during animation phase", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s1"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderFigureView()
    await screen.findByText("Goku")

    fireEvent.click(screen.getByLabelText("Mark Red PLA as printed"))

    // Item is complete but still visible in completing animation
    expect(screen.getByTestId("queue-item-card")).toBeTruthy()
    expect(screen.getByText("Goku")).toBeTruthy()
    // Not showing empty state yet
    expect(screen.queryByText("All figures complete!")).toBeNull()
  })

  it("does not trigger cascade when figure has remaining incomplete chips", async () => {
    const spool1 = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const spool2 = createSpool({ id: "s2", name: "Blue PLA", hex: "#0000FF" })
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s1", "s2"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })
    store.setState({
      spools: new Map([
        ["s1", spool1],
        ["s2", spool2],
      ]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderFigureView()
    await screen.findByText("Goku")

    // Toggle only one chip (figure not complete)
    fireEvent.click(screen.getByLabelText("Mark Red PLA as printed"))

    const card = screen.getByTestId("queue-item-card")
    expect(card.className).not.toContain("animate-completion-pulse")
  })

  it("removes completed items immediately when reduced motion is enabled", async () => {
    prefersReducedMotion = true

    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s1"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderFigureView()
    await screen.findByText("Goku")

    fireEvent.click(screen.getByLabelText("Mark Red PLA as printed"))

    expect(screen.queryByTestId("queue-item-card")).toBeNull()
    expect(screen.getByText("All figures complete!")).toBeTruthy()
  })
})
