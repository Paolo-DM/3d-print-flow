// @vitest-environment jsdom
import "fake-indexeddb/auto"

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { createRoutesStub } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { store } from "~/lib/store"
import {
  createFigure,
  createOrder,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"
import QueueLayout from "~/routes/_queue"
import OrdersView from "~/routes/_queue.orders"

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
})

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

function renderOrders(path = "/orders") {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: QueueLayout,
      children: [{ path: "orders", Component: OrdersView }],
    },
  ])
  return render(<Stub initialEntries={[path]} />)
}

describe("Orders queue view", () => {
  it("shows Draft, Active, and exact Needs attention causes but omits Ready", async () => {
    const spool = createSpool({ id: "s1" })
    const activeFigure = createFigure({
      id: "active-figure",
      name: "Active figure",
      requiredColors: [spool.id],
    })
    const blockedFigure = createFigure({
      id: "blocked-figure",
      name: "Blocked figure",
      requiredColors: [],
    })
    const draft = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "DRAFT",
    })
    const active = createOrder({
      id: "00000000-0000-4000-8000-000000000002",
      reference: "ACTIVE",
    })
    const blocked = createOrder({
      id: "00000000-0000-4000-8000-000000000003",
      reference: "BLOCKED",
    })
    const ready = createOrder({
      id: "00000000-0000-4000-8000-000000000004",
      reference: "READY",
    })
    const rows = [
      createQueueItem({
        id: "active-row",
        figureId: activeFigure.id,
        orderId: active.id,
      }),
      createQueueItem({
        id: "blocked-row",
        figureId: blockedFigure.id,
        orderId: blocked.id,
      }),
      createQueueItem({
        id: "ready-row",
        figureId: activeFigure.id,
        orderId: ready.id,
        completedCounts: { [spool.id]: 1 },
      }),
    ]
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([
        [activeFigure.id, activeFigure],
        [blockedFigure.id, blockedFigure],
      ]),
      orders: new Map(
        [draft, active, blocked, ready].map((order) => [order.id, order])
      ),
      queueItems: new Map(rows.map((row) => [row.id, row])),
    })

    renderOrders()

    const cards = await screen.findAllByTestId("order-card")
    const cardText = cards.map((card) => card.textContent ?? "")
    expect(cardText.some((text) => text.includes("DRAFT"))).toBe(true)
    expect(screen.getByText("Draft")).toBeTruthy()
    expect(cardText.some((text) => text.includes("ACTIVE"))).toBe(true)
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0)
    expect(cardText.some((text) => text.includes("BLOCKED"))).toBe(true)
    expect(screen.getAllByText("Needs attention").length).toBeGreaterThan(0)
    expect(
      screen.getByText("Blocked figure has no required colors")
    ).toBeTruthy()
    expect(cardText.every((text) => !text.includes("READY"))).toBe(true)
  })

  it("sorts overdue work first and honors an order scope", async () => {
    const figure = createFigure({ id: "f", requiredColors: ["s"] })
    const spool = createSpool({ id: "s" })
    const normal = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "NORMAL",
      dueDate: null,
    })
    const overdue = createOrder({
      id: "00000000-0000-4000-8000-000000000002",
      reference: "OVERDUE",
      dueDate: "2000-01-01",
    })
    const rows = [normal, overdue].map((order) =>
      createQueueItem({
        id: `q-${order.id}`,
        figureId: figure.id,
        orderId: order.id,
      })
    )
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([[figure.id, figure]]),
      orders: new Map([normal, overdue].map((order) => [order.id, order])),
      queueItems: new Map(rows.map((row) => [row.id, row])),
    })

    const { unmount } = renderOrders()
    const references = (await screen.findAllByTestId("order-card")).map(
      (card) => card.textContent
    )
    expect(references[0]).toContain("OVERDUE")
    unmount()

    renderOrders(`/orders?scope=order:${normal.id}`)
    const scopedCards = await screen.findAllByTestId("order-card")
    expect(scopedCards).toHaveLength(1)
    expect(
      within(scopedCards[0]).getAllByText("NORMAL").length
    ).toBeGreaterThan(0)
    expect(scopedCards[0].textContent).not.toContain("OVERDUE")
  })

  it("links Add items back to the catalog composer for that order", async () => {
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "WEB-42",
    })
    store.setState({ orders: new Map([[order.id, order]]) })

    renderOrders()

    expect(
      (await screen.findByRole("link", { name: /Add items/i })).getAttribute(
        "href"
      )
    ).toBe(`/catalog?order=${order.id}`)
  })

  it("confirms a linked-order cascade and leaves state unchanged on cancel", async () => {
    const spool = createSpool({ id: "s" })
    const figure = createFigure({
      id: "f",
      name: "Cascade figure",
      requiredColors: [spool.id],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "DELETE-ME",
    })
    const row = createQueueItem({
      id: "q",
      figureId: figure.id,
      orderId: order.id,
    })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([[figure.id, figure]]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([[row.id, row]]),
    })
    renderOrders()

    fireEvent.click(
      await screen.findByRole("button", { name: "Delete DELETE-ME" })
    )
    expect(
      screen.getByText(/also removes 1 linked line from the queue/i)
    ).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(store.getState().orders.has(order.id)).toBe(true)
    expect(store.getState().queueItems.has(row.id)).toBe(true)

    fireEvent.click(screen.getByRole("button", { name: "Delete DELETE-ME" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete order" }))
    expect(store.getState().orders.has(order.id)).toBe(false)
    expect(store.getState().queueItems.has(row.id)).toBe(false)
  })

  it("keeps an order as a visible Draft after its last line is removed", async () => {
    const spool = createSpool({ id: "s" })
    const figure = createFigure({
      id: "f",
      name: "Last line",
      requiredColors: [spool.id],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "KEEP-DRAFT",
    })
    const row = createQueueItem({
      id: "q",
      figureId: figure.id,
      orderId: order.id,
    })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([[figure.id, figure]]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([[row.id, row]]),
    })
    renderOrders()

    fireEvent.click(
      await screen.findByRole("button", { name: "Remove Last line" })
    )
    const dialog = screen.getByRole("alertdialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }))

    expect(store.getState().orders.has(order.id)).toBe(true)
    expect(store.getState().queueItems.has(row.id)).toBe(false)
    expect(await screen.findByText("Draft")).toBeTruthy()
    expect(screen.getByText(/No items yet/i)).toBeTruthy()
  })
})
