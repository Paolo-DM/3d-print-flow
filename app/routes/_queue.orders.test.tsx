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

  it("partitions a non-Ready order into Remaining before Finished", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const silente = createFigure({
      id: "f-silente",
      name: "Silente",
      requiredColors: [spool.id],
    })
    const pending = createFigure({
      id: "f-pending",
      name: "Pending figure",
      requiredColors: [spool.id],
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
      completedCounts: { [spool.id]: 2 },
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

    renderOrders()

    const card = await screen.findByTestId("order-card")
    expect(within(card).getAllByText("Silente")).toHaveLength(1)
    expect(within(card).getByText("2/3")).toBeTruthy()

    const finishedHeading = within(card).getByRole("heading", {
      name: "Finished",
    })
    const finishedSection = finishedHeading.closest("section") as HTMLElement
    const finishedCard = within(finishedSection).getByTestId("queue-item-card")
    expect(finishedCard.textContent).toContain("Silente")
    expect(finishedCard.textContent).toContain("×2")
    expect(finishedCard.querySelector("time")?.getAttribute("datetime")).toBe(
      "2026-08-31T13:22:48.666Z"
    )
    expect(
      within(finishedCard).queryByLabelText("Increase quantity of Silente")
    ).toBeNull()
    expect(within(finishedCard).queryByLabelText("Remove Silente")).toBeNull()

    const pendingCard = within(card)
      .getByText("Pending figure")
      .closest("[data-testid='queue-item-card']") as HTMLElement
    expect(
      pendingCard.compareDocumentPosition(finishedCard) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("reversing a finished line's chip returns it to Remaining", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({
      id: "f1",
      name: "Silente",
      requiredColors: [spool.id],
    })
    const sibling = createFigure({
      id: "f2",
      name: "Sibling figure",
      requiredColors: [spool.id],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "ORD-001",
    })
    const finishedRow = createQueueItem({
      id: "q-finished",
      figureId: figure.id,
      orderId: order.id,
      completedCounts: { [spool.id]: 1 },
      completedAt: "2026-08-31T13:22:48.666Z",
    })
    const siblingRow = createQueueItem({
      id: "q-sibling",
      figureId: sibling.id,
      orderId: order.id,
    })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([
        [figure.id, figure],
        [sibling.id, sibling],
      ]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([
        [finishedRow.id, finishedRow],
        [siblingRow.id, siblingRow],
      ]),
    })

    renderOrders()
    const card = await screen.findByTestId("order-card")

    const finishedSection = within(card)
      .getByRole("heading", { name: "Finished" })
      .closest("section") as HTMLElement
    fireEvent.click(within(finishedSection).getByLabelText("Unmark Red PLA"))

    expect(within(card).queryByRole("heading", { name: "Finished" })).toBeNull()
    expect(screen.getByLabelText("Increase quantity of Silente")).toBeTruthy()
    expect(store.getState().queueItems.get("q-finished")?.completedAt).toBe(
      null
    )
  })

  it("keeps a finished line visible while a broken sibling needs attention", async () => {
    const spool = createSpool({ id: "s1" })
    const figure = createFigure({
      id: "f1",
      name: "Finished figure",
      requiredColors: [spool.id],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "BLOCKED",
    })
    const finishedRow = createQueueItem({
      id: "q-finished",
      figureId: figure.id,
      orderId: order.id,
      completedCounts: { [spool.id]: 1 },
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

    renderOrders()
    const card = await screen.findByTestId("order-card")

    expect(within(card).getAllByText("Needs attention").length).toBeGreaterThan(
      0
    )
    const finishedSection = within(card)
      .getByRole("heading", { name: "Finished" })
      .closest("section") as HTMLElement
    expect(within(finishedSection).getByText("Finished figure")).toBeTruthy()
    expect(
      within(finishedSection).getByText("Finished — time unavailable")
    ).toBeTruthy()
  })

  it("keeps a complete but issue-blocked line locked outside Finished", async () => {
    const spool = createSpool({ id: "s1", name: "Red PLA", hex: "#FF0000" })
    const figure = createFigure({
      id: "f1",
      name: "Blocked figure",
      requiredColors: [spool.id, "gone"],
    })
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "BLOCKED",
    })
    const row = createQueueItem({
      id: "q-blocked",
      figureId: figure.id,
      orderId: order.id,
      completedCounts: { [spool.id]: 1, gone: 1 },
    })
    store.setState({
      spools: new Map([[spool.id, spool]]),
      figures: new Map([[figure.id, figure]]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([[row.id, row]]),
    })

    renderOrders()
    const card = await screen.findByTestId("order-card")

    // It is complete by count but its own issue keeps it out of Finished.
    expect(within(card).queryByRole("heading", { name: "Finished" })).toBeNull()
    expect(within(card).getAllByText("Needs attention").length).toBeGreaterThan(
      0
    )
    // Complete rows stay locked: no reversible chips, no quantity, no removal.
    const chip = within(card).getByLabelText(
      "Unmark Red PLA"
    ) as HTMLButtonElement
    expect(chip.disabled).toBe(true)
    expect(within(card).getByText("Completed line")).toBeTruthy()
    expect(
      within(card).queryByLabelText("Increase quantity of Blocked figure")
    ).toBeNull()
    expect(within(card).queryByLabelText("Remove Blocked figure")).toBeNull()
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
