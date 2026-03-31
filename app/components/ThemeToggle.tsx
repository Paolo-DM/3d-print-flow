import { useFetcher, useRouteLoaderData } from "react-router"
import { Moon, Sun } from "lucide-react"

import type { Theme } from "~/lib/theme.server"
import type { loader } from "~/root"
import { SidebarMenuButton } from "~/components/ui/sidebar"

export function ThemeToggle() {
  const fetcher = useFetcher()
  const loaderData = useRouteLoaderData<typeof loader>("root")

  const currentTheme: Theme = loaderData?.theme ?? "dark"
  const optimisticTheme: Theme =
    fetcher.formData?.get("theme") === "light"
      ? "light"
      : fetcher.formData?.get("theme") === "dark"
        ? "dark"
        : currentTheme
  const nextTheme: Theme = optimisticTheme === "dark" ? "light" : "dark"

  return (
    <fetcher.Form method="post" action="/action/set-theme">
      <input type="hidden" name="theme" value={nextTheme} />
      <SidebarMenuButton type="submit" tooltip={`Switch to ${nextTheme}`}>
        {optimisticTheme === "dark" ? <Sun /> : <Moon />}
        <span>{optimisticTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </SidebarMenuButton>
    </fetcher.Form>
  )
}
