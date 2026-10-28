// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createSpool } from "~/lib/test-utils"
import { ColorChip } from "~/components/ColorChip"

afterEach(cleanup)

describe("ColorChip at quantity 1 (toggle parity)", () => {
  it("renders pending state with muted background and spool name", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const { container } = render(
      <ColorChip spool={spool} count={0} quantity={1} />
    )

    expect(screen.getByText("Red PLA")).toBeTruthy()
    const chip = container.firstElementChild as HTMLElement
    expect(chip.className).toContain("bg-muted")
  })

  it("renders completed state with spool hex background", () => {
    const spool = createSpool({ name: "Blue PLA", hex: "#0000FF" })
    const { container } = render(
      <ColorChip spool={spool} count={1} quantity={1} />
    )

    expect(screen.getByText("Blue PLA")).toBeTruthy()
    const chip = container.firstElementChild as HTMLElement
    expect(chip.style.backgroundColor).toBe("rgb(0, 0, 255)")
    expect(chip.className).toContain("border-foreground/75")
    expect(container.querySelector(".lucide-check")).toBeTruthy()
  })

  it("does not render count text at quantity 1", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} count={1} quantity={1} />)
    expect(screen.queryByText("1/1")).toBeNull()
  })

  it("renders a steady outline when isCurrent and pending", () => {
    const spool = createSpool({ name: "Green PLA", hex: "#00FF00" })
    const { container } = render(
      <ColorChip spool={spool} count={0} quantity={1} isCurrent />
    )

    const chip = container.firstElementChild as HTMLElement
    expect(chip.className).not.toContain("pulse")
    expect(chip.className).toContain("ring-2")
  })

  it("does not render the outline when not isCurrent", () => {
    const spool = createSpool({ name: "Green PLA", hex: "#00FF00" })
    const { container } = render(
      <ColorChip spool={spool} count={0} quantity={1} />
    )

    const chip = container.firstElementChild as HTMLElement
    expect(chip.className).not.toContain("ring-primary")
  })

  it("outlines the spool swatch in pending state regardless of its color", () => {
    const spool = createSpool({ name: "Black PLA", hex: "#000000" })
    const { container } = render(
      <ColorChip spool={spool} count={0} quantity={1} />
    )

    const dot = container.querySelector("span[style]") as HTMLElement
    expect(dot.className).toContain("ring-foreground/30")
    expect(dot.style.backgroundColor).toBe("rgb(0, 0, 0)")
  })

  it("renders role=switch with aria-checked=false when pending", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} count={0} quantity={1} />)

    const chip = screen.getByRole("switch")
    expect(chip.getAttribute("aria-checked")).toBe("false")
    expect(chip.getAttribute("aria-label")).toBe("Mark Red PLA as printed")
  })

  it("renders role=switch with aria-checked=true when completed", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} count={1} quantity={1} />)

    const chip = screen.getByRole("switch")
    expect(chip.getAttribute("aria-checked")).toBe("true")
    expect(chip.getAttribute("aria-label")).toBe("Unmark Red PLA")
  })

  it("calls onClick handler when clicked", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const handleClick = vi.fn()
    render(
      <ColorChip spool={spool} count={0} quantity={1} onClick={handleClick} />
    )

    fireEvent.click(screen.getByRole("switch"))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it("renders as button element", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} count={0} quantity={1} />)

    const chip = screen.getByRole("switch")
    expect(chip.tagName).toBe("BUTTON")
  })

  it("renders a disabled switch when no onClick is provided", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} count={0} quantity={1} />)

    const chip = screen.getByRole("switch") as HTMLButtonElement
    expect(chip.disabled).toBe(true)
  })

  it("renders an enabled switch when onClick is provided", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(
      <ColorChip spool={spool} count={0} quantity={1} onClick={() => {}} />
    )

    const chip = screen.getByRole("switch") as HTMLButtonElement
    expect(chip.disabled).toBe(false)
  })
})

describe("ColorChip at quantity > 1 (count states)", () => {
  it("renders the count as redundant text in every state", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })

    const zero = render(<ColorChip spool={spool} count={0} quantity={2} />)
    expect(screen.getByText("0/2")).toBeTruthy()
    zero.unmount()

    const partial = render(<ColorChip spool={spool} count={1} quantity={2} />)
    expect(screen.getByText("1/2")).toBeTruthy()
    partial.unmount()

    render(<ColorChip spool={spool} count={2} quantity={2} />)
    expect(screen.getByText("2/2")).toBeTruthy()
  })

  it("partial state keeps the muted base with a distinct border, not the completed fill", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const { container } = render(
      <ColorChip spool={spool} count={1} quantity={2} />
    )

    const chip = container.firstElementChild as HTMLElement
    expect(chip.className).toContain("bg-muted")
    expect(chip.className).toContain("border-foreground/40")
    expect(chip.style.backgroundColor).toBe("")
  })

  it("full state uses the completed treatment with check icon", () => {
    const spool = createSpool({ name: "Blue PLA", hex: "#0000FF" })
    const { container } = render(
      <ColorChip spool={spool} count={2} quantity={2} />
    )

    const chip = container.firstElementChild as HTMLElement
    expect(chip.style.backgroundColor).toBe("rgb(0, 0, 255)")
    expect(container.querySelector(".lucide-check")).toBeTruthy()
  })

  it("labels the button with the count instead of the switch labels", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} count={1} quantity={2} />)

    const chip = screen.getByRole("button")
    expect(chip.getAttribute("role")).toBeNull()
    expect(chip.getAttribute("aria-label")).toBe(
      "Red PLA: 1 of 2 copies printed"
    )
  })

  it("clamps a stray count above quantity for display", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    render(<ColorChip spool={spool} count={5} quantity={2} />)
    expect(screen.getByText("2/2")).toBeTruthy()
  })

  it("marks a reset to 0 (cycled past full) with the distinct reset animation", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const { container, rerender } = render(
      <ColorChip spool={spool} count={2} quantity={2} />
    )

    rerender(<ColorChip spool={spool} count={0} quantity={2} />)

    const chip = container.firstElementChild as HTMLElement
    expect(chip.className).toContain("animate-chip-reset")
  })

  it("does not mark an ordinary increment with the reset animation", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const { container, rerender } = render(
      <ColorChip spool={spool} count={0} quantity={2} />
    )

    rerender(<ColorChip spool={spool} count={1} quantity={2} />)

    const chip = container.firstElementChild as HTMLElement
    expect(chip.className).not.toContain("animate-chip-reset")
  })

  it("does not treat the quantity-1 untoggle (1 -> 0) as a reset", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const { container, rerender } = render(
      <ColorChip spool={spool} count={1} quantity={1} />
    )

    rerender(<ColorChip spool={spool} count={0} quantity={1} />)

    const chip = container.firstElementChild as HTMLElement
    expect(chip.className).not.toContain("animate-chip-reset")
  })

  it("re-triggers the reset animation on a second cycle past full after animationend", () => {
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const { container, rerender } = render(
      <ColorChip spool={spool} count={2} quantity={2} />
    )

    rerender(<ColorChip spool={spool} count={0} quantity={2} />)
    let chip = container.firstElementChild as HTMLElement
    expect(chip.className).toContain("animate-chip-reset")

    // jsdom has no AnimationEvent, so React 19 delegates the vendor-prefixed
    // event name — dispatch what React actually listens for.
    act(() => {
      chip.dispatchEvent(new Event("webkitAnimationEnd", { bubbles: true }))
    })
    chip = container.firstElementChild as HTMLElement
    expect(chip.className).not.toContain("animate-chip-reset")

    // count climbs back to full, then cycles past full again
    rerender(<ColorChip spool={spool} count={1} quantity={2} />)
    rerender(<ColorChip spool={spool} count={2} quantity={2} />)
    rerender(<ColorChip spool={spool} count={0} quantity={2} />)
    chip = container.firstElementChild as HTMLElement
    expect(chip.className).toContain("animate-chip-reset")
  })

  it("a stuck reset flag clears on the next count change even without animationend", () => {
    // prefers-reduced-motion: animation: none never fires animationend
    const spool = createSpool({ name: "Red PLA", hex: "#FF0000" })
    const { container, rerender } = render(
      <ColorChip spool={spool} count={2} quantity={2} />
    )

    rerender(<ColorChip spool={spool} count={0} quantity={2} />)
    expect((container.firstElementChild as HTMLElement).className).toContain(
      "animate-chip-reset"
    )

    // no animationend fired — an ordinary increment must drop the treatment
    rerender(<ColorChip spool={spool} count={1} quantity={2} />)
    expect(
      (container.firstElementChild as HTMLElement).className
    ).not.toContain("animate-chip-reset")
  })
})
