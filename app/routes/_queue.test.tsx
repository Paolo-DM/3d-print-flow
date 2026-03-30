// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { createRoutesStub } from "react-router"

import QueueLayout from "~/routes/_queue"

afterEach(cleanup)

describe("QueueLayout", () => {
  it("renders child route content via Outlet", async () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: QueueLayout,
        children: [
          {
            index: true,
            Component: () => <div>child route content</div>,
          },
        ],
      },
    ])

    render(<Stub initialEntries={["/"]} />)
    expect(await screen.findByText("child route content")).toBeTruthy()
  })
})
