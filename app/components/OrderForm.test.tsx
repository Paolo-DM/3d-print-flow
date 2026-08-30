// @vitest-environment jsdom
import "fake-indexeddb/auto"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { setPersist, store } from "~/lib/store"
import { createOrder } from "~/lib/test-utils"
import { OrderForm } from "~/components/OrderForm"

beforeEach(() => {
  setPersist(false)
  store.setState({ orders: new Map() })
})

afterEach(() => {
  cleanup()
  setPersist(true)
})

describe("OrderForm", () => {
  it("suggests max ORD numeric suffix + 1 with three-digit padding", () => {
    const first = createOrder({ reference: "ORD-009" })
    const second = createOrder({ reference: "custom" })
    store.setState({
      orders: new Map([
        [first.id, first],
        [second.id, second],
      ]),
    })

    render(<OrderForm onSaved={vi.fn()} onCancel={vi.fn()} />)

    expect((screen.getByLabelText("Reference") as HTMLInputElement).value).toBe(
      "ORD-010"
    )
  })

  it("creates one trimmed order and reports it", () => {
    const onSaved = vi.fn()
    render(<OrderForm onSaved={onSaved} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("Reference"), {
      target: { value: "  WEB-42  " },
    })
    fireEvent.change(screen.getByLabelText("Customer name"), {
      target: { value: "  Ada  " },
    })
    fireEvent.change(screen.getByLabelText("Platform"), {
      target: { value: "  Etsy  " },
    })
    fireEvent.change(screen.getByLabelText("Due date"), {
      target: { value: "2026-09-12" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create order" }))

    const order = [...store.getState().orders.values()][0]
    expect(order).toMatchObject({
      reference: "WEB-42",
      customerName: "Ada",
      platform: "Etsy",
      dueDate: "2026-09-12",
    })
    expect(onSaved).toHaveBeenCalledWith(order)
  })

  it("focuses the reference and commits nothing on a case-insensitive collision", () => {
    const existing = createOrder({ reference: "WEB-42" })
    store.setState({ orders: new Map([[existing.id, existing]]) })
    render(<OrderForm onSaved={vi.fn()} onCancel={vi.fn()} />)

    const reference = screen.getByLabelText("Reference")
    fireEvent.change(reference, { target: { value: " web-42 " } })
    fireEvent.click(screen.getByRole("button", { name: "Create order" }))

    expect(store.getState().orders.size).toBe(1)
    expect(document.activeElement).toBe(reference)
    expect(screen.getByText("Order reference must be unique.")).toBeTruthy()
  })

  it("focuses a blank reference and leaves the edited order unchanged", () => {
    const existing = createOrder({ reference: "ORD-001", dueDate: null })
    store.setState({ orders: new Map([[existing.id, existing]]) })
    render(<OrderForm order={existing} onSaved={vi.fn()} onCancel={vi.fn()} />)

    const reference = screen.getByLabelText("Reference")
    fireEvent.change(reference, { target: { value: "   " } })
    fireEvent.submit(reference.closest("form")!)

    expect(store.getState().orders.get(existing.id)).toEqual(existing)
    expect(document.activeElement).toBe(reference)
  })

  it("shows a recoverable error when the edited order disappears", () => {
    const existing = createOrder({ reference: "ORD-001" })
    store.setState({ orders: new Map([[existing.id, existing]]) })
    render(<OrderForm order={existing} onSaved={vi.fn()} onCancel={vi.fn()} />)

    store.setState({ orders: new Map() })
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(screen.getByRole("alert").textContent).toContain(
      "This order no longer exists"
    )
  })
})
