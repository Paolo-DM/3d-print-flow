// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { createOrder } from "~/lib/test-utils"
import { OrderIdentity } from "~/components/OrderIdentity"

afterEach(cleanup)

describe("OrderIdentity", () => {
  const order = createOrder({
    reference: "WEB-42",
    customerName: "Ada Lovelace",
    platform: "Etsy",
    dueDate: "2026-09-12",
    notes: "Gift wrap\nUse the blue box",
  })

  it("renders the complete order metadata and notes", () => {
    render(<OrderIdentity order={order} />)

    expect(screen.getByText("WEB-42")).toBeTruthy()
    expect(screen.getByText("Ada Lovelace")).toBeTruthy()
    expect(screen.getByText("Etsy")).toBeTruthy()
    expect(screen.getByText("Due 2026-09-12")).toBeTruthy()
    expect(screen.getByText(/Gift wrap/).textContent).toContain(
      "Use the blue box"
    )
  })

  it("keeps compact identity to reference and platform", () => {
    render(<OrderIdentity order={order} compact />)

    expect(screen.getByText("WEB-42")).toBeTruthy()
    expect(screen.getByText("Etsy")).toBeTruthy()
    expect(screen.queryByText("Ada Lovelace")).toBeNull()
    expect(screen.queryByText(/Gift wrap/)).toBeNull()
  })
})
