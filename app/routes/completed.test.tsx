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
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { store } from "~/lib/store"
import {
  createBrand,
  createFigure,
  createOrder,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"
import Completed from "~/routes/completed"

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

const whiteSpool = createSpool({
  id: "s-white",
  name: "White PLA",
  hex: "#FFFFFF",
})
const redSpool = createSpool({ id: "s-red", name: "Red PLA", hex: "#FF0000" })
const spools = new Map([
  [whiteSpool.id, whiteSpool],
  [redSpool.id, redSpool],
])

function renderCompleted() {
  const Stub = createRoutesStub([{ path: "/completed", Component: Completed }])
  return render(<Stub initialEntries={["/completed"]} />)
}

// captured before any test swaps store commands for mocks
const realRequeueCompleted = store.getState().requeueCompleted

describe("Completed route", () => {
  it("renders empty state when no completed items", () => {
    renderCompleted()
    expect(screen.getByText("No completed figures yet")).toBeTruthy()
  })

  it("renders empty state when queue items exist but none are complete", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderCompleted()
    expect(screen.getByText("No completed figures yet")).toBeTruthy()
  })

  it("renders completed items with figure name and brand name", () => {
    const brand = createBrand({ id: "b1", name: "Shippuden" })
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      brandId: "b1",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-white": 1 },
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    store.setState({
      spools,
      brands: new Map([["b1", brand]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderCompleted()
    expect(screen.getByText("Naruto")).toBeTruthy()
    expect(screen.getByText("Shippuden")).toBeTruthy()
  })

  it("renders chips as display-only (no onClick, disabled)", () => {
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-white": 1 },
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderCompleted()
    fireEvent.click(screen.getByLabelText("View details for Naruto"))
    const chips = screen.getAllByRole("switch")
    expect(chips).toHaveLength(1)
    expect(chips[0].getAttribute("disabled")).not.toBeNull()
  })

  it("shows completion date", () => {
    const figure = createFigure({
      id: "f1",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-white": 1 },
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderCompleted()
    // locale-agnostic: assert against the same formatter the component uses
    const expectedDate = new Date(
      "2026-03-30T10:00:00.000Z"
    ).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    expect(
      screen.getByText(
        (text) => text.includes("Completed") && text.includes(expectedDate)
      )
    ).toBeTruthy()
  })

  it("Print Again button calls requeueCompleted", () => {
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-white": 1 },
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    const requeueCompleted = vi.fn(() => ({
      type: "requeued" as const,
      merged: false,
      quantity: 1,
      clamped: false,
    }))
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
      requeueCompleted,
    })

    renderCompleted()
    fireEvent.click(screen.getByLabelText("View details for Naruto"))
    fireEvent.click(screen.getByText("Print Again"))
    expect(requeueCompleted).toHaveBeenCalledWith("q1")
  })

  it("Remove button opens AlertDialog with figure name", async () => {
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-white": 1 },
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderCompleted()
    fireEvent.click(screen.getByLabelText("View details for Goku"))
    fireEvent.click(screen.getByLabelText("Remove Goku"))

    await screen.findByRole("alertdialog")
    expect(screen.getByText("Delete completed figure?")).toBeTruthy()
    expect(screen.getByText("Cancel")).toBeTruthy()
    expect(screen.getAllByText("Remove").length).toBeGreaterThan(0)
  })

  it("Remove dialog confirm calls removeFromQueue", async () => {
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-white": 1 },
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    const removeFromQueue = vi.fn()
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
      removeFromQueue,
    })

    renderCompleted()
    fireEvent.click(screen.getByLabelText("View details for Goku"))
    fireEvent.click(screen.getByLabelText("Remove Goku"))

    await screen.findByRole("alertdialog")
    fireEvent.click(screen.getByText("Remove"))
    expect(removeFromQueue).toHaveBeenCalledWith("q1")
  })

  it("sorts completed items by completedAt descending (most recent first)", () => {
    const figure1 = createFigure({
      id: "f1",
      name: "Naruto",
      requiredColors: ["s-white"],
    })
    const figure2 = createFigure({
      id: "f2",
      name: "Goku",
      requiredColors: ["s-white"],
    })
    const qi1 = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-white": 1 },
      completedAt: "2026-03-28T10:00:00.000Z",
    })
    const qi2 = createQueueItem({
      id: "q2",
      figureId: "f2",
      completedCounts: { "s-white": 1 },
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    store.setState({
      spools,
      figures: new Map([
        ["f1", figure1],
        ["f2", figure2],
      ]),
      queueItems: new Map([
        ["q1", qi1],
        ["q2", qi2],
      ]),
    })

    renderCompleted()
    const items = screen.getAllByTestId("completed-item")
    expect(items[0].textContent).toContain("Goku")
    expect(items[1].textContent).toContain("Naruto")
  })

  it("reveals archive details only after expanding a completed item", () => {
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-white": 1 },
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderCompleted()
    expect(screen.queryByText("Print Again")).toBeNull()

    fireEvent.click(screen.getByLabelText("View details for Naruto"))

    expect(screen.getByText("Print Again")).toBeTruthy()
    expect(screen.getAllByRole("switch")).toHaveLength(1)
  })

  it("shows ×N on completed cards when quantity > 1", () => {
    const figure = createFigure({
      id: "f1",
      name: "Kratos",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      quantity: 2,
      completedCounts: { "s-white": 2 },
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderCompleted()
    expect(screen.getByTestId("quantity-badge").textContent).toBe("×2")
  })

  it("Print Again presents the requeue result as a toast", async () => {
    const { toast } = await import("sonner")
    const successSpy = vi.spyOn(toast, "success")
    const figure = createFigure({
      id: "f1",
      name: "Kratos",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      quantity: 2,
      completedCounts: { "s-white": 2 },
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
      // an earlier test replaced the command with a mock — restore the real one
      requeueCompleted: realRequeueCompleted,
    })

    renderCompleted()
    fireEvent.click(screen.getByLabelText("View details for Kratos"))
    fireEvent.click(screen.getByText("Print Again"))

    expect(successSpy).toHaveBeenCalledWith("Kratos ×2 back in queue")
    successSpy.mockRestore()
  })

  it("Print Again into an existing active entry presents the merged toast", async () => {
    const { toast } = await import("sonner")
    const successSpy = vi.spyOn(toast, "success")
    const figure = createFigure({
      id: "f1",
      name: "Kratos",
      requiredColors: ["s-white"],
    })
    const completed = createQueueItem({
      id: "q1",
      figureId: "f1",
      orderId: null,
      quantity: 2,
      completedCounts: { "s-white": 2 },
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    const active = createQueueItem({
      id: "q0",
      figureId: "f1",
      orderId: null,
      quantity: 1,
      completedCounts: {},
    })
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([
        ["q1", completed],
        ["q0", active],
      ]),
      requeueCompleted: realRequeueCompleted,
    })

    renderCompleted()
    fireEvent.click(screen.getByLabelText("View details for Kratos"))
    fireEvent.click(screen.getByText("Print Again"))

    expect(successSpy).toHaveBeenCalledWith("Merged into queue: Kratos now ×3")
    expect(store.getState().queueItems.get("q0")?.quantity).toBe(3)
    successSpy.mockRestore()
  })

  it("aggregates a Ready order and duplicates it with zero progress", () => {
    const order = createOrder({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "WEB-42",
      platform: "Etsy",
    })
    const figure = createFigure({
      id: "f1",
      name: "Kratos",
      requiredColors: ["s-white"],
    })
    const completed = createQueueItem({
      id: "q1",
      figureId: figure.id,
      orderId: order.id,
      quantity: 2,
      completedCounts: { "s-white": 2 },
      completedAt: "2026-08-30T10:00:00.000Z",
    })
    store.setState({
      spools,
      figures: new Map([[figure.id, figure]]),
      orders: new Map([[order.id, order]]),
      queueItems: new Map([[completed.id, completed]]),
    })

    renderCompleted()

    const readyOrder = screen.getByTestId("ready-order")
    expect(within(readyOrder).getAllByText("WEB-42").length).toBeGreaterThan(0)
    expect(screen.queryByText("Print Again")).toBeNull()
    expect(
      (
        within(readyOrder).getByRole("button", {
          name: "White PLA: 2 of 2 copies printed",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    expect(
      within(readyOrder).queryByLabelText("Decrease quantity of Kratos")
    ).toBeNull()
    expect(within(readyOrder).queryByLabelText("Remove Kratos")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }))

    expect(store.getState().orders.size).toBe(2)
    const duplicate = [...store.getState().orders.values()].find(
      (candidate) => candidate.id !== order.id
    )!
    expect(duplicate.reference).toBe("ORD-001")
    const duplicateRows = [...store.getState().queueItems.values()].filter(
      (row) => row.orderId === duplicate.id
    )
    expect(duplicateRows).toHaveLength(1)
    expect(duplicateRows[0]).toMatchObject({
      completedCounts: {},
      completedAt: null,
    })
  })
})
