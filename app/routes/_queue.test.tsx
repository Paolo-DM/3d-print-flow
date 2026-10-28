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
    orders: new Map(),
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
          path: "orders",
          Component: () => <div>orders view content</div>,
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

  it("renders the compact queue summary with derived values", async () => {
    const spool = createSpool({ id: "s1", hex: "#FF0000" })
    const figure = createFigure({ id: "f1", requiredColors: ["s1"] })
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

    renderQueue()

    const work = (await screen.findByText("Work")).parentElement!
    expect(within(work).getByText("1")).toBeTruthy()
    expect(screen.getByText("Colors")).toBeTruthy()
    expect(screen.getByText("Active")).toBeTruthy()
    expect(screen.getByText("Ready")).toBeTruthy()
    expect(screen.getByText("Needs attention")).toBeTruthy()
  })

  it("renders Colors, Orders, and Figures tabs", async () => {
    renderQueue()

    expect(await screen.findByText("Work by color")).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Orders" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Figures" })).toBeTruthy()
  })

  it("shows Work by color as active on root path", async () => {
    renderQueue("/")

    const colorTab = await screen.findByText("Work by color")
    expect(
      colorTab.closest("[data-slot='tabs-trigger']")?.getAttribute("data-state")
    ).toBe("active")
  })

  it("falls back to All when a scoped order is missing", async () => {
    renderQueue("/?scope=order:missing")

    const scope = await screen.findByLabelText("Queue scope")
    expect((scope as HTMLSelectElement).value).toBe("all")
  })

  it("Clear queue is disabled when nothing is queued", async () => {
    renderQueue()

    const clear = (await screen.findByRole("button", {
      name: "Clear queue",
    })) as HTMLButtonElement
    expect(clear.disabled).toBe(true)
  })

  it("Clear queue confirms, then removes only the active lines", async () => {
    const spool = createSpool({ id: "s1" })
    const figure = createFigure({ id: "f1", requiredColors: ["s1"] })
    const open = createQueueItem({ id: "open", figureId: "f1", quantity: 2 })
    const done = createQueueItem({
      id: "done",
      figureId: "f1",
      completedCounts: { s1: 1 },
    })
    store.setState({
      spools: new Map([["s1", spool]]),
      figures: new Map([["f1", figure]]),
      queueItems: new Map([
        [open.id, open],
        [done.id, done],
      ]),
    })
    renderQueue()

    fireEvent.click(await screen.findByRole("button", { name: "Clear queue" }))
    expect(screen.getByRole("alertdialog").textContent).toContain(
      "1 line (2 pieces)"
    )
    fireEvent.click(screen.getByRole("button", { name: "Remove 1 line" }))

    expect([...store.getState().queueItems.keys()]).toEqual(["done"])
  })
})
