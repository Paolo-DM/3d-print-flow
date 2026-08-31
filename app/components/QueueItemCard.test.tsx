// @vitest-environment jsdom
import "fake-indexeddb/auto"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { store } from "~/lib/store"
import {
  createBrand,
  createFigure,
  createOrder,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"
import { QueueItemCard } from "~/components/QueueItemCard"

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

describe("QueueItemCard", () => {
  it("renders figure name and brand name", () => {
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      brandId: "b1",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: figure.id,
      completedCounts: {},
    })
    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    expect(screen.getByText("Naruto")).toBeTruthy()
    expect(screen.getByText("Shippuden")).toBeTruthy()
  })

  it("renders Order badge for order-type items", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      orderId: "00000000-0000-4000-8000-000000000001",
      completedCounts: {},
    })
    const order = createOrder({ id: qi.orderId!, reference: "ORD-001" })
    store.setState({ orders: new Map([[order.id, order]]) })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    expect(screen.getByText("ORD-001")).toBeTruthy()
  })

  it("renders Stock badge for stock-type items", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      orderId: null,
      completedCounts: {},
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    expect(screen.getByText("Stock")).toBeTruthy()
  })

  it("renders all color chips with correct completed state", () => {
    const figure = createFigure({
      id: "f1",
      requiredColors: ["s-white", "s-red", "s-blue"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-red": 1 },
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    expect(screen.getAllByRole("switch")).toHaveLength(3)
    expect(screen.getByLabelText("Mark White PLA as printed")).toBeTruthy()
    expect(screen.getByLabelText("Unmark Red PLA")).toBeTruthy()
    expect(screen.getByLabelText("Mark Blue PLA as printed")).toBeTruthy()
  })

  it("renders progress bar with correct fraction", () => {
    const figure = createFigure({
      id: "f1",
      requiredColors: ["s-white", "s-red", "s-blue"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-red": 1 },
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    expect(screen.getByText("1/3")).toBeTruthy()
  })

  it("renders progress fraction with tabular-nums", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    const fraction = screen.getByText("0/1")
    expect(fraction.className).toContain("tabular-nums")
  })

  it("clicking a chip calls toggleChip with correct args", () => {
    const figure = createFigure({
      id: "f1",
      requiredColors: ["s-white", "s-red"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })
    const toggleChip = vi.fn()

    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
      toggleChip,
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    fireEvent.click(screen.getByLabelText("Mark White PLA as printed"))

    expect(toggleChip).toHaveBeenCalledWith("q1", "s-white")
  })

  it("shows a warning when figure colors reference missing spools", () => {
    const figure = createFigure({
      id: "f/with space",
      requiredColors: ["s-white", "s-missing"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: figure.id,
      completedCounts: {},
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    expect(screen.getByText("Needs attention")).toBeTruthy()
    expect(screen.getByText("Naruto is missing 1 required spool")).toBeTruthy()
    expect(screen.getAllByRole("switch")).toHaveLength(1)
    expect(screen.getByText("0/2")).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "Edit figure" }).getAttribute("href")
    ).toBe("/catalog?edit=f%2Fwith%20space")
    fireEvent.click(screen.getByRole("button", { name: "Remove line" }))
    expect(screen.getByRole("alertdialog")).toBeTruthy()
  })

  it("applies animate-completion-pulse class when completionPhase is pulsing", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-white": 1 },
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
        completionPhase="pulsing"
      />
    )

    const card = screen.getByTestId("queue-item-card")
    expect(card.className).toContain("animate-completion-pulse")
  })

  it("applies animate-completion-collapse class when completionPhase is collapsing", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: { "s-white": 1 },
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
        completionPhase="collapsing"
      />
    )

    const card = screen.getByTestId("queue-item-card")
    expect(card.className).toContain("animate-completion-collapse")
  })

  it("does not apply animation classes when no completionPhase", () => {
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    const card = screen.getByTestId("queue-item-card")
    expect(card.className).not.toContain("animate-completion")
  })

  it("renders remove button with AlertDialog", async () => {
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    fireEvent.click(screen.getByLabelText("Remove Goku"))
    await screen.findByRole("alertdialog")

    expect(screen.getByText("Remove from queue?")).toBeTruthy()
    expect(screen.getByText("Cancel")).toBeTruthy()
    // Use getAllByText since "Remove" appears in both trigger label and dialog button
    expect(screen.getAllByText("Remove").length).toBeGreaterThan(0)
  })

  it("confirm in AlertDialog calls removeFromQueue", async () => {
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedCounts: {},
    })
    const removeFromQueue = vi.fn()
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
      removeFromQueue,
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    fireEvent.click(screen.getByLabelText("Remove Goku"))
    await screen.findByRole("alertdialog")
    fireEvent.click(screen.getByText("Remove"))
    expect(removeFromQueue).toHaveBeenCalledWith("q1")
  })
})

describe("QueueItemCard finished lines", () => {
  const finishedFigure = createFigure({
    id: "f1",
    name: "Silente",
    brandId: "b1",
    requiredColors: ["s-white", "s-red"],
  })

  function createFinishedItem(completedAt: string | null) {
    return createQueueItem({
      id: "q1",
      figureId: finishedFigure.id,
      orderId: "00000000-0000-4000-8000-000000000001",
      quantity: 2,
      completedCounts: { "s-white": 2, "s-red": 2 },
      completedAt,
    })
  }

  it("shows identity, quantity, progress, and a semantic completion time", () => {
    const qi = createFinishedItem("2026-08-31T13:22:48.666Z")
    const order = createOrder({ id: qi.orderId!, reference: "ORD-001" })
    store.setState({ orders: new Map([[order.id, order]]) })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={finishedFigure}
        brands={brands}
        spools={spools}
        finished
      />
    )

    expect(screen.getByText("Silente")).toBeTruthy()
    expect(screen.getByText("Shippuden")).toBeTruthy()
    expect(screen.getByText("ORD-001")).toBeTruthy()
    expect(screen.getByTestId("quantity-badge").textContent).toBe("×2")
    expect(screen.getByText("4/4")).toBeTruthy()
    const time = screen
      .getByTestId("finished-time")
      .querySelector("time") as HTMLTimeElement
    expect(time).toBeTruthy()
    expect(time.getAttribute("datetime")).toBe("2026-08-31T13:22:48.666Z")
    expect(screen.getByTestId("finished-time").textContent).toMatch(/Finished/)
  })

  it("falls back when the completion time is missing or unreadable", () => {
    const { unmount } = render(
      <QueueItemCard
        queueItem={createFinishedItem(null)}
        figure={finishedFigure}
        brands={brands}
        spools={spools}
        finished
      />
    )
    expect(
      screen.getByText("Finished — time unavailable").querySelector("time")
    ).toBeNull()
    unmount()

    render(
      <QueueItemCard
        queueItem={createFinishedItem("not-a-timestamp")}
        figure={finishedFigure}
        brands={brands}
        spools={spools}
        finished
      />
    )
    expect(screen.getByText("Finished — time unavailable")).toBeTruthy()
  })

  it("keeps color chips reversible so progress can be corrected", () => {
    const qi = createFinishedItem("2026-08-31T13:22:48.666Z")
    const toggleChip = vi.fn()
    store.setState({
      spools,
      figures: new Map([[finishedFigure.id, finishedFigure]]),
      queueItems: new Map([[qi.id, qi]]),
      toggleChip,
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={finishedFigure}
        brands={brands}
        spools={spools}
        finished
      />
    )

    fireEvent.click(screen.getByLabelText("White PLA: 2 of 2 copies printed"))
    expect(toggleChip).toHaveBeenCalledWith("q1", "s-white")
  })

  it("makes quantity changes and removal unavailable", () => {
    render(
      <QueueItemCard
        queueItem={createFinishedItem("2026-08-31T13:22:48.666Z")}
        figure={finishedFigure}
        brands={brands}
        spools={spools}
        finished
      />
    )

    expect(screen.queryByLabelText("Increase quantity of Silente")).toBeNull()
    expect(screen.queryByLabelText("Decrease quantity of Silente")).toBeNull()
    expect(screen.queryByTestId("quantity-value")).toBeNull()
    expect(screen.queryByLabelText("Remove Silente")).toBeNull()
  })

  it("read-only completed history still locks its chips", () => {
    render(
      <QueueItemCard
        queueItem={createFinishedItem("2026-08-31T13:22:48.666Z")}
        figure={finishedFigure}
        brands={brands}
        spools={spools}
        readOnly
      />
    )

    const chip = screen.getByLabelText(
      "White PLA: 2 of 2 copies printed"
    ) as HTMLButtonElement
    expect(chip.disabled).toBe(true)
    expect(screen.getByText("Completed line")).toBeTruthy()
  })
})

describe("QueueItemCard quantities", () => {
  it("shows a ×N badge next to the name when quantity > 1, nothing at 1", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const single = createQueueItem({ id: "q1", figureId: "f1", quantity: 1 })

    const { unmount } = render(
      <QueueItemCard
        queueItem={single}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )
    expect(screen.queryByTestId("quantity-badge")).toBeNull()
    unmount()

    const multi = createQueueItem({ id: "q2", figureId: "f1", quantity: 3 })
    render(
      <QueueItemCard
        queueItem={multi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )
    expect(screen.getByTestId("quantity-badge").textContent).toBe("×3")
  })

  it("chips show completed-copies/quantity as text", () => {
    const figure = createFigure({
      id: "f1",
      requiredColors: ["s-white", "s-red"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      quantity: 2,
      completedCounts: { "s-red": 1 },
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    expect(screen.getByText("0/2")).toBeTruthy()
    expect(screen.getByText("1/2")).toBeTruthy()
  })

  it("progress uses copies × colors totals", () => {
    const figure = createFigure({
      id: "f1",
      requiredColors: ["s-white", "s-red"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      quantity: 2,
      completedCounts: { "s-red": 1 },
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    expect(screen.getByText("1/4")).toBeTruthy()
  })

  it("the + stepper calls setQuantity with quantity + 1 and is disabled at 99", () => {
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({ id: "q1", figureId: "f1", quantity: 2 })
    const setQuantity = vi.fn(() => ({
      type: "updated" as const,
      completed: false,
    }))
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
      setQuantity,
    })

    const { unmount } = render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    fireEvent.click(screen.getByLabelText("Increase quantity of Goku"))
    expect(setQuantity).toHaveBeenCalledWith("q1", 3)
    unmount()

    const maxed = createQueueItem({ id: "q2", figureId: "f1", quantity: 99 })
    render(
      <QueueItemCard
        queueItem={maxed}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )
    const plus = screen.getByLabelText(
      "Increase quantity of Goku"
    ) as HTMLButtonElement
    expect(plus.disabled).toBe(true)
  })

  it("the − stepper calls setQuantity with quantity − 1 and does nothing at 1", () => {
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({ id: "q1", figureId: "f1", quantity: 2 })
    const setQuantity = vi.fn(() => ({
      type: "updated" as const,
      completed: false,
    }))
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
      setQuantity,
    })

    const { unmount } = render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )

    fireEvent.click(screen.getByLabelText("Decrease quantity of Goku"))
    expect(setQuantity).toHaveBeenCalledWith("q1", 1)
    unmount()
    setQuantity.mockClear()

    const atOne = createQueueItem({ id: "q2", figureId: "f1", quantity: 1 })
    render(
      <QueueItemCard
        queueItem={atOne}
        figure={figure}
        brands={brands}
        spools={spools}
      />
    )
    fireEvent.click(screen.getByLabelText("Decrease quantity of Goku"))
    expect(setQuantity).not.toHaveBeenCalled()
  })
})
