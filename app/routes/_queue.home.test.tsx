// @vitest-environment jsdom
import "fake-indexeddb/auto"

import {
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
  createFigure,
  createOrder,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"
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
    brands: new Map(),
    figures: new Map(),
    orders: new Map(),
    queueItems: new Map(),
  })
})

function renderColorView(path = "/") {
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
  return render(<Stub initialEntries={[path]} />)
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
    const qi = createQueueItem({ figureId: "f1", completedCounts: { s1: 1 } })
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
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      requiredColors: ["s1"],
    })
    const qi = createQueueItem({ figureId: "f1", completedCounts: {} })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([[qi.id, qi]]),
    })

    renderColorView()
    expect(await screen.findByText("Red PLA")).toBeTruthy()
    expect(screen.getByTestId("color-ranking-entry")).toBeTruthy()
  })

  it("an order scope contributes only that order's outstanding colors", async () => {
    const red = createSpool({ id: "s-red", name: "Red PLA" })
    const blue = createSpool({ id: "s-blue", name: "Blue PLA" })
    const redFigure = createFigure({ id: "f-red", requiredColors: [red.id] })
    const blueFigure = createFigure({
      id: "f-blue",
      requiredColors: [blue.id],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
    })
    const orderRow = createQueueItem({
      id: "q-order",
      figureId: redFigure.id,
      orderId: order.id,
    })
    const stockRow = createQueueItem({
      id: "q-stock",
      figureId: blueFigure.id,
      orderId: null,
    })
    store.setState({
      spools: new Map([
        [red.id, red],
        [blue.id, blue],
      ]),
      figures: new Map([
        [redFigure.id, redFigure],
        [blueFigure.id, blueFigure],
      ]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([
        [orderRow.id, orderRow],
        [stockRow.id, stockRow],
      ]),
    })

    renderColorView(`/?scope=order:${order.id}`)

    expect(await screen.findByText("Red PLA")).toBeTruthy()
    expect(screen.queryByText("Blue PLA")).toBeNull()
  })

  it("explains an empty selected scope without claiming all global work is complete", async () => {
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

    renderColorView(`/?scope=order:${draft.id}`)

    expect(await screen.findByText("No color work in this scope")).toBeTruthy()
    expect(screen.queryByText("All colors complete!")).toBeNull()
  })

  it("renders multiple ranked entries sorted by count descending", async () => {
    const spool1 = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const spool2 = createSpool({ id: "s2", name: "Blue PLA", hex: "#0000FF" })
    const figure1 = createFigure({ id: "f1", requiredColors: ["s1", "s2"] })
    const figure2 = createFigure({ id: "f2", requiredColors: ["s1"] })
    const qi1 = createQueueItem({ figureId: "f1", completedCounts: {} })
    const qi2 = createQueueItem({ figureId: "f2", completedCounts: {} })
    store.setState({
      spools: new Map([
        ["s1", spool1],
        ["s2", spool2],
      ]),
      figures: new Map([
        ["f1", figure1],
        ["f2", figure2],
      ]),
      queueItems: new Map([
        [qi1.id, qi1],
        [qi2.id, qi2],
      ]),
    })

    renderColorView()
    const entries = await screen.findAllByTestId("color-ranking-entry")
    expect(entries).toHaveLength(2)
    // Red PLA should be first (count 2 vs count 1)
    expect(entries[0].textContent).toContain("Red PLA")
    expect(entries[1].textContent).toContain("Blue PLA")
  })

  it("updates chip state, figure progress, and ranking when a chip is toggled", async () => {
    const whiteSpool = createSpool({
      id: "s-white",
      name: "White PLA",
      hex: "#FFFFFF",
    })
    const redSpool = createSpool({
      id: "s-red",
      name: "Red PLA",
      hex: "#FF0000",
    })
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
      completedCounts: {},
    })
    const sasukeQueueItem = createQueueItem({
      id: "q2",
      figureId: "f2",
      completedCounts: {},
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

    const whiteEntry = (
      await screen.findAllByTestId("color-ranking-entry")
    ).find((entry) => entry.textContent?.includes("White PLA")) as HTMLElement
    expect(whiteEntry).toBeTruthy()
    expect(
      screen
        .getAllByTestId("color-ranking-entry")
        .some((entry) => entry.textContent?.includes("Red PLA"))
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
        .some((entry) => entry.textContent?.includes("Red PLA"))
    ).toBe(false)
  })

  it("does not color-code a ranking entry by order presence", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({
      id: "f1",
      name: "Order Fig",
      requiredColors: ["s1"],
    })
    const qi = createQueueItem({
      figureId: "f1",
      orderId: "00000000-0000-4000-8000-000000000001",
      completedCounts: {},
    })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([[qi.id, qi]]),
    })

    renderColorView()
    const entry = await screen.findByTestId("color-ranking-entry")
    expect(within(entry).queryByText("Order")).toBeNull()
  })

  it("does not show Order badge on ranking entry when only stock items", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({
      id: "f1",
      name: "Stock Fig",
      requiredColors: ["s1"],
    })
    const qi = createQueueItem({
      figureId: "f1",
      orderId: null,
      completedCounts: {},
    })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([[qi.id, qi]]),
    })

    renderColorView()
    const entry = await screen.findByTestId("color-ranking-entry")
    expect(within(entry).queryByText("Order")).toBeNull()
  })

  it("shows order items above stock items in expanded list", async () => {
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
      figureId: "f1",
      orderId: null,
      completedCounts: {},
    })
    const orderQi = createQueueItem({
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

    renderColorView()
    fireEvent.click(await screen.findByTestId("color-ranking-entry"))

    const names = screen.getAllByText(/Figure/)
    const orderIndex = names.findIndex(
      (el) => el.textContent === "Order Figure"
    )
    const stockIndex = names.findIndex(
      (el) => el.textContent === "Stock Figure"
    )
    expect(orderIndex).toBeLessThan(stockIndex)
  })

  it("completed order lines neither rank nor persist within color entries", async () => {
    const red = createSpool({ id: "s-red", name: "Red PLA", hex: "#FF0000" })
    const blue = createSpool({ id: "s-blue", name: "Blue PLA", hex: "#0000FF" })
    const finishedFigure = createFigure({
      id: "f-finished",
      name: "Finished figure",
      requiredColors: [red.id, blue.id],
    })
    const pendingFigure = createFigure({
      id: "f-pending",
      name: "Pending figure",
      requiredColors: [red.id],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
    })
    const finishedRow = createQueueItem({
      id: "q-finished",
      figureId: finishedFigure.id,
      orderId: order.id,
      quantity: 3,
      completedCounts: { [red.id]: 3, [blue.id]: 3 },
      completedAt: "2026-08-31T13:22:48.666Z",
    })
    const pendingRow = createQueueItem({
      id: "q-pending",
      figureId: pendingFigure.id,
      orderId: order.id,
    })
    store.setState({
      spools: new Map([
        [red.id, red],
        [blue.id, blue],
      ]),
      figures: new Map([
        [finishedFigure.id, finishedFigure],
        [pendingFigure.id, pendingFigure],
      ]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([
        [finishedRow.id, finishedRow],
        [pendingRow.id, pendingRow],
      ]),
    })

    renderColorView()

    // Blue is demanded only by the finished line, so it must not rank at all;
    // Red counts only the pending line's outstanding copy.
    const entries = await screen.findAllByTestId("color-ranking-entry")
    expect(entries).toHaveLength(1)
    expect(entries[0].textContent).toContain("Red PLA")
    expect(entries[0].textContent).not.toContain("Blue PLA")
    // A single outstanding copy: the finished line's three copies never count.
    expect(entries[0].textContent).toContain("copy")
    expect(entries[0].textContent).not.toContain("copies")

    // The finished line does not persist inside the expanded color entry.
    fireEvent.click(entries[0])
    expect(screen.getByText("Pending figure")).toBeTruthy()
    expect(screen.queryByText("Finished figure")).toBeNull()
  })

  it("keeps the disappearing entry open long enough to animate the completed row out", async () => {
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

    renderColorView()

    fireEvent.click(await screen.findByTestId("color-ranking-entry"))
    expect(screen.getByText("Goku")).toBeTruthy()

    fireEvent.click(screen.getByLabelText("Mark Red PLA as printed"))

    const animatedCard = screen.getByText("Goku").closest("div.space-y-2")
    expect(animatedCard).toBeTruthy()
    expect(animatedCard?.className).toContain("animate-completion-pulse")
  })
})
