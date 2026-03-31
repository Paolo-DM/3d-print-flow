// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createSpool } from "~/lib/test-utils"
import { ColorChip } from "~/components/ColorChip"

afterEach(cleanup)

describe("ColorChip", () => {
  it("renders pending state with muted background and spool name", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const { container } = render(
      <ColorChip spool={spool} isCompleted={false} />,
    )

    expect(screen.getByText("Red PLA")).toBeTruthy()
    const chip = container.firstElementChild as HTMLElement
    expect(chip.className).toContain("bg-muted")
  })

  it("renders completed state with spool hex background", () => {
    const spool = createSpool({ name: "Blue PLA", hex: "#0000FF" })
    const { container } = render(
      <ColorChip spool={spool} isCompleted={true} />,
    )

    expect(screen.getByText("Blue PLA")).toBeTruthy()
    const chip = container.firstElementChild as HTMLElement
    expect(chip.style.backgroundColor).toBe("rgb(0, 0, 255)")
  })

  it("renders pulsing outline when isCurrent and pending", () => {
    const spool = createSpool({ name: "Green PLA", hex: "#00FF00" })
    const { container } = render(
      <ColorChip spool={spool} isCompleted={false} isCurrent />,
    )

    const chip = container.firstElementChild as HTMLElement
    expect(chip.className).toContain("animate-pulse")
    expect(chip.className).toContain("ring-2")
  })

  it("does not render pulsing outline when not isCurrent", () => {
    const spool = createSpool({ name: "Green PLA", hex: "#00FF00" })
    const { container } = render(
      <ColorChip spool={spool} isCompleted={false} />,
    )

    const chip = container.firstElementChild as HTMLElement
    expect(chip.className).not.toContain("animate-pulse")
  })

  it("applies border for near-white spool in pending state", () => {
    const spool = createSpool({ name: "White PLA", hex: "#FFFFFF" })
    const { container } = render(
      <ColorChip spool={spool} isCompleted={false} />,
    )

    const dot = container.querySelector(".rounded-full.opacity-40") as HTMLElement
    expect(dot.className).toContain("border")
  })

  it("renders role=switch with aria-checked=false when pending", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} isCompleted={false} />)

    const chip = screen.getByRole("switch")
    expect(chip.getAttribute("aria-checked")).toBe("false")
  })

  it("renders role=switch with aria-checked=true when completed", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} isCompleted={true} />)

    const chip = screen.getByRole("switch")
    expect(chip.getAttribute("aria-checked")).toBe("true")
  })

  it("calls onClick handler when clicked", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const handleClick = vi.fn()
    render(<ColorChip spool={spool} isCompleted={false} onClick={handleClick} />)

    fireEvent.click(screen.getByRole("switch"))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it("renders as button element", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} isCompleted={false} />)

    const chip = screen.getByRole("switch")
    expect(chip.tagName).toBe("BUTTON")
  })

  it("renders a disabled switch when no onClick is provided", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} isCompleted={false} />)

    const chip = screen.getByRole("switch") as HTMLButtonElement
    expect(chip.disabled).toBe(true)
  })

  it("renders an enabled switch when onClick is provided", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} isCompleted={false} onClick={() => {}} />)

    const chip = screen.getByRole("switch") as HTMLButtonElement
    expect(chip.disabled).toBe(false)
  })
})
