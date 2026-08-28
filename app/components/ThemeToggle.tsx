import { useFetcher } from "react-router"
import { Moon, Sun } from "lucide-react"

import type { Theme } from "~/lib/theme.server"
import {
  THEME_FETCHER_KEY,
  useOptimisticTheme,
} from "~/hooks/use-optimistic-theme"
import { SidebarMenuButton } from "~/components/ui/sidebar"

export function ThemeToggle() {
  const fetcher = useFetcher({ key: THEME_FETCHER_KEY })
  const theme = useOptimisticTheme()
  const nextTheme: Theme = theme === "dark" ? "light" : "dark"

  return (
    <fetcher.Form method="post" action="/action/set-theme">
      <input type="hidden" name="theme" value={nextTheme} />
      <SidebarMenuButton type="submit" tooltip={`Switch to ${nextTheme}`}>
        {theme === "dark" ? <Sun /> : <Moon />}
        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </SidebarMenuButton>
    </fetcher.Form>
  )
}
