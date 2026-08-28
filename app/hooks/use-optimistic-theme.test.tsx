// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { createRoutesStub, data, useFetcher } from "react-router"

import type { Theme } from "~/lib/theme.server"
import {
  THEME_FETCHER_KEY,
  useOptimisticTheme,
} from "~/hooks/use-optimistic-theme"
import { ThemeToggle } from "~/components/ThemeToggle"
import { SidebarProvider } from "~/components/ui/sidebar"
import { TooltipProvider } from "~/components/ui/tooltip"

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

function createGate() {
  let open!: () => void
  const opened = new Promise<void>((resolve) => {
    open = resolve
  })
  return { opened, open }
}

function ThemeProbe({ submitValue }: { submitValue?: string }) {
  const fetcher = useFetcher({ key: THEME_FETCHER_KEY })
  const theme = useOptimisticTheme()
  const nextTheme: Theme = theme === "dark" ? "light" : "dark"

  return (
    <fetcher.Form method="post" action="/action/set-theme">
      <input type="hidden" name="theme" value={submitValue ?? nextTheme} />
      <button type="submit">toggle</button>
      <span data-testid="theme">{theme}</span>
      <span data-testid="state">{fetcher.state}</span>
    </fetcher.Form>
  )
}

describe("useOptimisticTheme", () => {
  it("returns the submitted theme before the action resolves and keeps it after settle", async () => {
    let cookieTheme: Theme = "dark"
    const gate = createGate()

    const Stub = createRoutesStub([
      {
        id: "root",
        path: "/",
        Component: () => <ThemeProbe />,
        HydrateFallback: () => null,
        loader: () => ({ theme: cookieTheme }),
      },
      {
        path: "/action/set-theme",
        action: async ({ request }) => {
          const formData = await request.formData()
          await gate.opened
          const theme = formData.get("theme")
          if (theme === "dark" || theme === "light") {
            cookieTheme = theme
          }
          return { success: true }
        },
      },
    ])

    render(<Stub initialEntries={["/"]} />)

    expect((await screen.findByTestId("theme")).textContent).toBe("dark")

    fireEvent.click(screen.getByText("toggle"))

    // Optimistic: the hook flips before the action resolves.
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("light")
    })
    expect(screen.getByTestId("state").textContent).not.toBe("idle")

    gate.open()

    // Convergence: loader data now matches, no revert after settle.
    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("idle")
    })
    expect(screen.getByTestId("theme").textContent).toBe("light")
  })

  it("reverts to the loader theme when the action fails", async () => {
    const gate = createGate()

    const Stub = createRoutesStub([
      {
        id: "root",
        path: "/",
        Component: () => <ThemeProbe />,
        HydrateFallback: () => null,
        loader: () => ({ theme: "dark" as Theme }),
      },
      {
        path: "/action/set-theme",
        action: async () => {
          await gate.opened
          return data({ success: false }, { status: 400 })
        },
      },
    ])

    render(<Stub initialEntries={["/"]} />)

    expect((await screen.findByTestId("theme")).textContent).toBe("dark")

    fireEvent.click(screen.getByText("toggle"))

    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("light")
    })

    gate.open()

    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("idle")
    })
    expect(screen.getByTestId("theme").textContent).toBe("dark")
  })

  it("reflects the latest submission when clicked twice before settle", async () => {
    let cookieTheme: Theme = "dark"
    const gate = createGate()

    const Stub = createRoutesStub([
      {
        id: "root",
        path: "/",
        Component: () => <ThemeProbe />,
        HydrateFallback: () => null,
        loader: () => ({ theme: cookieTheme }),
      },
      {
        path: "/action/set-theme",
        action: async ({ request }) => {
          const formData = await request.formData()
          await gate.opened
          const theme = formData.get("theme")
          if (theme === "dark" || theme === "light") {
            cookieTheme = theme
          }
          return { success: true }
        },
      },
    ])

    render(<Stub initialEntries={["/"]} />)

    expect((await screen.findByTestId("theme")).textContent).toBe("dark")

    fireEvent.click(screen.getByText("toggle"))
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("light")
    })

    // Second click before the first submission settles: last one wins.
    fireEvent.click(screen.getByText("toggle"))
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("dark")
    })

    gate.open()

    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("idle")
    })
    expect(screen.getByTestId("theme").textContent).toBe("dark")
  })

  it("ignores in-flight form values that are not 'dark' or 'light'", async () => {
    const gate = createGate()

    const Stub = createRoutesStub([
      {
        id: "root",
        path: "/",
        Component: () => <ThemeProbe submitValue="purple" />,
        HydrateFallback: () => null,
        loader: () => ({ theme: "dark" as Theme }),
      },
      {
        path: "/action/set-theme",
        action: async () => {
          await gate.opened
          return data({ success: false }, { status: 400 })
        },
      },
    ])

    render(<Stub initialEntries={["/"]} />)

    expect((await screen.findByTestId("theme")).textContent).toBe("dark")

    fireEvent.click(screen.getByText("toggle"))

    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("submitting")
    })
    expect(screen.getByTestId("theme").textContent).toBe("dark")

    gate.open()

    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("idle")
    })
    expect(screen.getByTestId("theme").textContent).toBe("dark")
  })
})

function SharedThemeReadout() {
  const theme = useOptimisticTheme()
  return <span data-testid="shared-theme">{theme}</span>
}

function ToggleHarness() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <ThemeToggle />
        <SharedThemeReadout />
      </SidebarProvider>
    </TooltipProvider>
  )
}

describe("ThemeToggle keyed-fetcher integration", () => {
  it("the real ThemeToggle's submission flips the shared optimistic theme before the action resolves", async () => {
    let cookieTheme: Theme = "dark"
    const gate = createGate()

    const Stub = createRoutesStub([
      {
        id: "root",
        path: "/",
        Component: () => <ToggleHarness />,
        HydrateFallback: () => null,
        loader: () => ({ theme: cookieTheme }),
      },
      {
        path: "/action/set-theme",
        action: async ({ request }) => {
          const formData = await request.formData()
          await gate.opened
          const theme = formData.get("theme")
          if (theme === "dark" || theme === "light") {
            cookieTheme = theme
          }
          return { success: true }
        },
      },
    ])

    render(<Stub initialEntries={["/"]} />)

    // Dark theme: the toggle offers "Light Mode".
    expect(await screen.findByText("Light Mode")).toBeTruthy()
    expect(screen.getByTestId("shared-theme").textContent).toBe("dark")

    fireEvent.click(screen.getByText("Light Mode").closest("button")!)

    // Before the gate opens (action unresolved), the real component's keyed
    // submission is already visible: label flips and the shared hook reads "light".
    expect(await screen.findByText("Dark Mode")).toBeTruthy()
    expect(screen.getByTestId("shared-theme").textContent).toBe("light")

    gate.open()

    // Convergence: after settle + revalidation the theme stays "light".
    await waitFor(() => {
      expect(cookieTheme).toBe("light")
    })
    await waitFor(() => {
      expect(screen.getByTestId("shared-theme").textContent).toBe("light")
      expect(screen.getByText("Dark Mode")).toBeTruthy()
    })
  })
})
