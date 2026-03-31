// @vitest-environment jsdom
import "fake-indexeddb/auto"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { store } from "~/lib/store"
import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"
import { QueueItemCard } from "~/components/QueueItemCard"

beforeEach(() => {
  store.setState({
    spools: new Map(),
    figures: new Map(),
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

describe("QueueItemCard", () => {
  it("renders figure name and franchise", () => {
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      franchise: "Shippuden",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: [],
    })

    render(<QueueItemCard queueItem={qi} figure={figure} spools={spools} />)

    expect(screen.getByText("Naruto")).toBeTruthy()
    expect(screen.getByText("Shippuden")).toBeTruthy()
  })

  it("renders Order badge for order-type items", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      type: "order",
      completedColors: [],
    })

    render(<QueueItemCard queueItem={qi} figure={figure} spools={spools} />)

    expect(screen.getByText("Order")).toBeTruthy()
  })

  it("renders Stock badge for stock-type items", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      type: "stock",
      completedColors: [],
    })

    render(<QueueItemCard queueItem={qi} figure={figure} spools={spools} />)

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
      completedColors: ["s-red"],
    })

    render(<QueueItemCard queueItem={qi} figure={figure} spools={spools} />)

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
      completedColors: ["s-red"],
    })

    render(<QueueItemCard queueItem={qi} figure={figure} spools={spools} />)

    expect(screen.getByText("1/3")).toBeTruthy()
  })

  it("renders progress fraction with tabular-nums", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: [],
    })

    render(<QueueItemCard queueItem={qi} figure={figure} spools={spools} />)

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
      completedColors: [],
    })
    const toggleChip = vi.fn()

    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
      toggleChip,
    })

    render(<QueueItemCard queueItem={qi} figure={figure} spools={spools} />)

    fireEvent.click(screen.getByLabelText("Mark White PLA as printed"))

    expect(toggleChip).toHaveBeenCalledWith("q1", "s-white")
  })

  it("shows a warning when figure colors reference missing spools", () => {
    const figure = createFigure({
      id: "f1",
      requiredColors: ["s-white", "s-missing"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: [],
    })

    render(<QueueItemCard queueItem={qi} figure={figure} spools={spools} />)

    expect(
      screen.getByText("Missing 1 spool reference for this figure.")
    ).toBeTruthy()
    expect(screen.getAllByRole("switch")).toHaveLength(1)
    expect(screen.getByText("0/2")).toBeTruthy()
  })

  it("applies animate-completion-pulse class when completionPhase is pulsing", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: ["s-white"],
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        spools={spools}
        completionPhase="pulsing"
      />,
    )

    const card = screen.getByTestId("queue-item-card")
    expect(card.className).toContain("animate-completion-pulse")
  })

  it("applies animate-completion-collapse class when completionPhase is collapsing", () => {
    const figure = createFigure({ id: "f1", requiredColors: ["s-white"] })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: ["s-white"],
    })

    render(
      <QueueItemCard
        queueItem={qi}
        figure={figure}
        spools={spools}
        completionPhase="collapsing"
      />,
    )

    const card = screen.getByTestId("queue-item-card")
    expect(card.className).toContain("animate-completion-collapse")
  })

  it("does not apply animation classes when no completionPhase", () => {
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      franchise: "DBZ",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: [],
    })

    render(
      <QueueItemCard queueItem={qi} figure={figure} spools={spools} />,
    )

    const card = screen.getByTestId("queue-item-card")
    expect(card.className).not.toContain("animate-completion")
  })

  it("renders remove button with AlertDialog", async () => {
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      franchise: "DBZ",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: [],
    })

    render(<QueueItemCard queueItem={qi} figure={figure} spools={spools} />)

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
      franchise: "DBZ",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: [],
    })
    const removeFromQueue = vi.fn()
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
      removeFromQueue,
    })

    render(<QueueItemCard queueItem={qi} figure={figure} spools={spools} />)

    fireEvent.click(screen.getByLabelText("Remove Goku"))
    await screen.findByRole("alertdialog")
    fireEvent.click(screen.getByText("Remove"))
    expect(removeFromQueue).toHaveBeenCalledWith("q1")
  })
})
