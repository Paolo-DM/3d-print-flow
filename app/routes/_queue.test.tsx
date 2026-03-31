// @vitest-environment jsdom
import "fake-indexeddb/auto"

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createRoutesStub } from "react-router"

import { store } from "~/lib/store"
import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"
import QueueLayout from "~/routes/_queue"

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

function renderQueue(initialPath = "/") {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: QueueLayout,
      children: [
        {
          index: true,
          Component: () => <div>color view content</div>,
        },
        {
          path: "figures",
          Component: () => <div>figure view content</div>,
        },
      ],
    },
  ])

  return render(<Stub initialEntries={[initialPath]} />)
}

describe("QueueLayout", () => {
  it("renders child route content via Outlet", async () => {
    renderQueue()
    expect(await screen.findByText("color view content")).toBeTruthy()
  })

  it("renders stat cards with correct values", async () => {
    const spool = createSpool({ id: "s1", hex: "#FF0000" })
    const figure = createFigure({ id: "f1", requiredColors: ["s1"] })
    const qi = createQueueItem({
      figureId: "f1",
      type: "stock",
      completedColors: [],
    })

    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([[qi.id, qi]]),
    })

    renderQueue()

    expect(await screen.findByText("Queued figures")).toBeTruthy()
    expect(screen.getByText("Colors needed")).toBeTruthy()
    expect(screen.getByText("Orders pending")).toBeTruthy()
    expect(screen.getByText("Completed today")).toBeTruthy()
  })

  it("renders tabs with Color View and Figure View", async () => {
    renderQueue()

    expect(await screen.findByText("Color View")).toBeTruthy()
    expect(screen.getByText("Figure View")).toBeTruthy()
  })

  it("shows Color View tab as active on root path", async () => {
    renderQueue("/")

    const colorTab = await screen.findByText("Color View")
    expect(
      colorTab.closest("[data-slot='tabs-trigger']")?.getAttribute("data-state")
    ).toBe("active")
  })

  it("counts only today's completed queue items in the stat card", async () => {
    const spool = createSpool({ id: "s1", hex: "#FF0000" })
    const figure = createFigure({ id: "f1", requiredColors: ["s1"] })
    const today = new Date()
    const completedTodayAt = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      12
    ).toISOString()
    const completedYesterdayAt = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1,
      12
    ).toISOString()
    const completedToday = createQueueItem({
      id: "q1",
      figureId: figure.id,
      completedColors: ["s1"],
      completedAt: completedTodayAt,
    })
    const completedYesterday = createQueueItem({
      id: "q2",
      figureId: figure.id,
      completedColors: ["s1"],
      completedAt: completedYesterdayAt,
    })

    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([
        [completedToday.id, completedToday],
        [completedYesterday.id, completedYesterday],
      ]),
    })

    renderQueue()

    const label = await screen.findByText("Completed today")
    const card = label.closest("[data-slot='card']") as HTMLElement
    expect(card).toBeTruthy()
    expect(within(card).getByText("1")).toBeTruthy()
  })
})
