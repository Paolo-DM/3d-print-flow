// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { NOTES_MAX_LENGTH, Notes, NotesCounter } from "~/components/Notes"

afterEach(cleanup)

describe("Notes", () => {
  it("renders nothing for blank notes", () => {
    render(<Notes notes="   " />)
    expect(screen.queryByTestId("notes")).toBeNull()
  })

  it("shows short notes in full, without a toggle", () => {
    render(<Notes notes="Use the darker green" />)
    expect(screen.getByText("Use the darker green")).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("clamps long notes behind Show more / Show less", () => {
    render(<Notes notes={"word ".repeat(60)} />)
    const text = screen.getByTestId("notes").querySelector("p")!
    expect(text.className).toContain("line-clamp-3")

    fireEvent.click(screen.getByRole("button", { name: "Show more" }))
    expect(text.className).not.toContain("line-clamp-3")
    fireEvent.click(screen.getByRole("button", { name: "Show less" }))
    expect(text.className).toContain("line-clamp-3")
  })
})

describe("NotesCounter", () => {
  it("stays hidden until 80% of the limit, then counts", () => {
    const { rerender, container } = render(<NotesCounter length={10} />)
    expect(container.textContent).toBe("")

    rerender(<NotesCounter length={NOTES_MAX_LENGTH} />)
    expect(container.textContent).toBe(
      `${NOTES_MAX_LENGTH}/${NOTES_MAX_LENGTH}`
    )
  })
})
