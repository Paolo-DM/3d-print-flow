import { useFetcher, useRouteLoaderData } from "react-router"

import type { Theme } from "~/lib/theme.server"
import type { loader } from "~/root"

export const THEME_FETCHER_KEY = "set-theme"

export function useOptimisticTheme(): Theme {
  const fetcher = useFetcher({ key: THEME_FETCHER_KEY })
  const loaderData = useRouteLoaderData<typeof loader>("root")

  const submittedTheme = fetcher.formData?.get("theme")
  if (submittedTheme === "dark" || submittedTheme === "light") {
    return submittedTheme
  }

  return loaderData?.theme ?? "dark"
}
