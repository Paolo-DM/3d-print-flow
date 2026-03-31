// @vitest-environment jsdom
import "fake-indexeddb/auto"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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
import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"
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
    figures: new Map(),
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
      completedColors: [],
    })
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderCompleted()
    expect(screen.getByText("No completed figures yet")).toBeTruthy()
  })

  it("renders completed items with figure name and franchise", () => {
    const figure = createFigure({
      id: "f1",
      name: "Naruto",
      franchise: "Shippuden",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: ["s-white"],
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    store.setState({
      spools,
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
      completedColors: ["s-white"],
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
      completedColors: ["s-white"],
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    store.setState({
      spools,
      figures: new Map([["f1", figure]]),
      queueItems: new Map([["q1", qi]]),
    })

    renderCompleted()
    expect(screen.getByText(/Completed\s+Mar/)).toBeTruthy()
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
      completedColors: ["s-white"],
      completedAt: "2026-03-30T10:00:00.000Z",
    })
    const requeueCompleted = vi.fn()
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
      franchise: "DBZ",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: ["s-white"],
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
    expect(screen.getByText("Remove from queue?")).toBeTruthy()
    expect(screen.getByText("Cancel")).toBeTruthy()
    expect(screen.getAllByText("Remove").length).toBeGreaterThan(0)
  })

  it("Remove dialog confirm calls removeFromQueue", async () => {
    const figure = createFigure({
      id: "f1",
      name: "Goku",
      franchise: "DBZ",
      requiredColors: ["s-white"],
    })
    const qi = createQueueItem({
      id: "q1",
      figureId: "f1",
      completedColors: ["s-white"],
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
      completedColors: ["s-white"],
      completedAt: "2026-03-28T10:00:00.000Z",
    })
    const qi2 = createQueueItem({
      id: "q2",
      figureId: "f2",
      completedColors: ["s-white"],
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
      completedColors: ["s-white"],
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
})
