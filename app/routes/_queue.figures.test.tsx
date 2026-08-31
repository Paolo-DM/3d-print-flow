// @vitest-environment jsdom
import "fake-indexeddb/auto"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
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

  it("shows a finished order line once under Finished, after Remaining", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const silente = createFigure({
      id: "f-silente",
      name: "Silente",
      requiredColors: ["s1"],
    })
    const pending = createFigure({
      id: "f-pending",
      name: "Pending figure",
      requiredColors: ["s1"],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "ORD-001",
    })
    const finishedRow = createQueueItem({
      id: "q-finished",
      figureId: silente.id,
      orderId: order.id,
      quantity: 2,
      completedCounts: { s1: 2 },
      completedAt: "2026-08-31T13:22:48.666Z",
    })
    const remainingRow = createQueueItem({
      id: "q-remaining",
      figureId: pending.id,
      orderId: order.id,
    })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([
        [silente.id, silente],
        [pending.id, pending],
      ]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([
        [finishedRow.id, finishedRow],
        [remainingRow.id, remainingRow],
      ]),
    })

    renderFigureView()

    const remainingHeading = await screen.findByRole("heading", {
      name: "Remaining",
    })
    const finishedHeading = screen.getByRole("heading", { name: "Finished" })
    expect(
      remainingHeading.compareDocumentPosition(finishedHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(screen.getAllByText("Silente")).toHaveLength(1)

    const finishedSection = finishedHeading.closest("section") as HTMLElement
    const finishedCard = within(finishedSection).getByTestId("queue-item-card")
    expect(finishedCard.textContent).toContain("Silente")
    expect(finishedCard.textContent).toContain("ORD-001")
    expect(finishedCard.textContent).toContain("×2")
    expect(finishedCard.textContent).toContain("2/2")
    expect(finishedCard.querySelector("time")?.getAttribute("datetime")).toBe(
      "2026-08-31T13:22:48.666Z"
    )

    const remainingSection = remainingHeading.closest("section") as HTMLElement
    expect(within(remainingSection).getByText("Pending figure")).toBeTruthy()
  })

  it("scopes finished lines: hidden in stock scope, present in the order scope", async () => {
    const spool = createSpool({ id: "s1" })
    const figure = createFigure({
      id: "f1",
      name: "Order line",
      requiredColors: ["s1"],
    })
    const stockFigure = createFigure({
      id: "f2",
      name: "Stock line",
      requiredColors: ["s1"],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
    })
    const finishedRow = createQueueItem({
      id: "q-finished",
      figureId: figure.id,
      orderId: order.id,
      completedCounts: { s1: 1 },
      completedAt: "2026-08-31T13:22:48.666Z",
    })
    const siblingRow = createQueueItem({
      id: "q-sibling",
      figureId: figure.id,
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
        [figure.id, figure],
        [stockFigure.id, stockFigure],
      ]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([
        [finishedRow.id, finishedRow],
        [siblingRow.id, siblingRow],
        [stockRow.id, stockRow],
      ]),
    })

    const { unmount } = renderFigureView("/figures?scope=stock")
    expect(await screen.findByText("Stock line")).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Finished" })).toBeNull()
    expect(screen.queryByText("Order line")).toBeNull()
    unmount()

    renderFigureView(`/figures?scope=order:${order.id}`)
    expect(
      await screen.findByRole("heading", { name: "Finished" })
    ).toBeTruthy()
    expect(screen.getAllByText("Order line")).toHaveLength(2)
    expect(screen.queryByText("Stock line")).toBeNull()
  })

  it("never leaks completed stock lines or Ready order lines into the queue", async () => {
    const spool = createSpool({ id: "s1" })
    const readyFigure = createFigure({
      id: "f-ready",
      name: "Ready line",
      requiredColors: ["s1"],
    })
    const stockFigure = createFigure({
      id: "f-stock",
      name: "Done stock",
      requiredColors: ["s1"],
    })
    const activeFigure = createFigure({
      id: "f-active",
      name: "Active line",
      requiredColors: ["s1"],
    })
    const readyOrder = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "READY",
    })
    const readyRow = createQueueItem({
      id: "q-ready",
      figureId: readyFigure.id,
      orderId: readyOrder.id,
      completedCounts: { s1: 1 },
      completedAt: "2026-08-31T13:22:48.666Z",
    })
    const stockRow = createQueueItem({
      id: "q-done-stock",
      figureId: stockFigure.id,
      orderId: null,
      completedCounts: { s1: 1 },
      completedAt: "2026-08-30T13:22:48.666Z",
    })
    const activeRow = createQueueItem({
      id: "q-active",
      figureId: activeFigure.id,
      orderId: null,
    })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([
        [readyFigure.id, readyFigure],
        [stockFigure.id, stockFigure],
        [activeFigure.id, activeFigure],
      ]),
      orders: new Map([[readyOrder.id, readyOrder]]),
      queueItems: new Map([
        [readyRow.id, readyRow],
        [stockRow.id, stockRow],
        [activeRow.id, activeRow],
      ]),
    })

    renderFigureView()

    expect(await screen.findByText("Active line")).toBeTruthy()
    expect(screen.queryByText("Ready line")).toBeNull()
    expect(screen.queryByText("Done stock")).toBeNull()
    expect(screen.queryByRole("heading", { name: "Finished" })).toBeNull()
  })

  it("keeps a finished line while its broken sibling stays Remaining, with a time fallback", async () => {
    const spool = createSpool({ id: "s1" })
    const figure = createFigure({
      id: "f1",
      name: "Finished figure",
      requiredColors: ["s1"],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
    })
    const finishedRow = createQueueItem({
      id: "q-finished",
      figureId: figure.id,
      orderId: order.id,
      completedCounts: { s1: 1 },
      completedAt: null,
    })
    const brokenRow = createQueueItem({
      id: "q-broken",
      figureId: "gone",
      orderId: order.id,
    })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([[figure.id, figure]]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([
        [finishedRow.id, finishedRow],
        [brokenRow.id, brokenRow],
      ]),
    })

    renderFigureView()

    expect(
      await screen.findByRole("heading", { name: "Finished" })
    ).toBeTruthy()
    expect(screen.getByText("Finished figure")).toBeTruthy()
    expect(screen.getByText("Finished — time unavailable")).toBeTruthy()
    const brokenCard = screen
      .getByText("Missing figure")
      .closest("[data-testid='queue-item-card']") as HTMLElement
    expect(within(brokenCard).getByText("Needs attention")).toBeTruthy()
  })

  it("relocates a completing order line to Finished only after its cascade ends", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s1"],
    })
    const sibling = createFigure({
      id: "f2",
      name: "Vegeta",
      requiredColors: ["s1"],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
    })
    const row = createQueueItem({
      id: "q1",
      figureId: figure.id,
      orderId: order.id,
      completedCounts: {},
    })
    const siblingRow = createQueueItem({
      id: "q2",
      figureId: sibling.id,
      orderId: order.id,
      completedCounts: {},
    })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([
        [figure.id, figure],
        [sibling.id, sibling],
      ]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([
        [row.id, row],
        [siblingRow.id, siblingRow],
      ]),
    })

    renderFigureView()
    await screen.findByText("Goku")

    fireEvent.click(
      within(
        screen
          .getByText("Goku")
          .closest("[data-testid='queue-item-card']") as HTMLElement
      ).getByLabelText("Mark Red PLA as printed")
    )

    // While the cascade runs the line pulses in place and appears only once.
    const pulsingCard = screen
      .getByText("Goku")
      .closest("[data-testid='queue-item-card']") as HTMLElement
    expect(pulsingCard.className).toContain("animate-completion-pulse")
    expect(screen.getAllByText("Goku")).toHaveLength(1)
    expect(screen.queryByRole("heading", { name: "Finished" })).toBeNull()

    // jsdom has no AnimationEvent, so React 19 delegates the vendor-prefixed
    // event name — dispatch what React actually listens for.
    act(() => {
      pulsingCard.dispatchEvent(
        new Event("webkitAnimationEnd", { bubbles: true })
      )
    })
    expect(pulsingCard.className).toContain("animate-completion-collapse")
    act(() => {
      pulsingCard.dispatchEvent(
        new Event("webkitAnimationEnd", { bubbles: true })
      )
    })

    const finishedSection = screen
      .getByRole("heading", { name: "Finished" })
      .closest("section") as HTMLElement
    expect(within(finishedSection).getByText("Goku")).toBeTruthy()
    expect(screen.getAllByText("Goku")).toHaveLength(1)
    const remainingSection = screen
      .getByRole("heading", { name: "Remaining" })
      .closest("section") as HTMLElement
    expect(within(remainingSection).getByText("Vegeta")).toBeTruthy()
  })

  it("relocates immediately and reversibly under reduced motion", async () => {
    prefersReducedMotion = true

    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s1"],
    })
    const sibling = createFigure({
      id: "f2",
      name: "Vegeta",
      requiredColors: ["s1"],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
    })
    const row = createQueueItem({
      id: "q1",
      figureId: figure.id,
      orderId: order.id,
      completedCounts: {},
    })
    const siblingRow = createQueueItem({
      id: "q2",
      figureId: sibling.id,
      orderId: order.id,
      completedCounts: {},
    })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([
        [figure.id, figure],
        [sibling.id, sibling],
      ]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([
        [row.id, row],
        [siblingRow.id, siblingRow],
      ]),
    })

    renderFigureView()
    await screen.findByText("Goku")

    fireEvent.click(
      within(
        screen
          .getByText("Goku")
          .closest("[data-testid='queue-item-card']") as HTMLElement
      ).getByLabelText("Mark Red PLA as printed")
    )

    const finishedSection = screen
      .getByRole("heading", { name: "Finished" })
      .closest("section") as HTMLElement
    const finishedCard = within(finishedSection).getByTestId("queue-item-card")
    expect(finishedCard.textContent).toContain("Goku")
    expect(finishedCard.className).not.toContain("animate-completion")

    // The chip stays reversible: unmarking returns the line to Remaining.
    fireEvent.click(within(finishedCard).getByLabelText("Unmark Red PLA"))
    expect(screen.queryByRole("heading", { name: "Finished" })).toBeNull()
    expect(screen.getByText("Goku")).toBeTruthy()
  })

  it("moves a scoped order's lines out of the queue once it becomes Ready", async () => {
    prefersReducedMotion = true

    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({
      id: "f1",
      name: "Final line",
      requiredColors: ["s1"],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
    })
    const finishedRow = createQueueItem({
      id: "q-finished",
      figureId: figure.id,
      orderId: order.id,
      completedCounts: { s1: 1 },
      completedAt: "2026-08-31T13:22:48.666Z",
    })
    const lastRow = createQueueItem({
      id: "q-last",
      figureId: figure.id,
      orderId: order.id,
      completedCounts: {},
    })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([[figure.id, figure]]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([
        [finishedRow.id, finishedRow],
        [lastRow.id, lastRow],
      ]),
    })

    renderFigureView(`/figures?scope=order:${order.id}`)
    await screen.findByRole("heading", { name: "Finished" })

    const remainingSection = screen
      .getByRole("heading", { name: "Remaining" })
      .closest("section") as HTMLElement
    fireEvent.click(
      within(remainingSection).getByLabelText("Mark Red PLA as printed")
    )

    expect(screen.queryByTestId("queue-item-card")).toBeNull()
    expect(screen.getByText("All figures complete!")).toBeTruthy()
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
