import { useEffect } from "react"
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  data,
  isRouteErrorResponse,
  useLocation,
  useRouteLoaderData,
} from "react-router"

import type { Route } from "./+types/root"
import { AppSidebar } from "~/components/AppSidebar"
import { Toaster } from "~/components/ui/sonner"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import { TooltipProvider } from "~/components/ui/tooltip"
import { initApp } from "~/lib/init"
import { type Theme, themeCookie } from "~/lib/theme.server"
import "./app.css"

export async function loader({ request }: Route.LoaderArgs) {
  const raw = await themeCookie.parse(request.headers.get("Cookie"))
  const theme: Theme = raw === "light" ? "light" : "dark"

  const headers: HeadersInit = {}
  if (raw !== theme) {
    headers["Set-Cookie"] = await themeCookie.serialize(theme)
  }

  return data({ theme }, { headers })
}

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useRouteLoaderData<typeof loader>("root")
  const theme: Theme = loaderData?.theme ?? "dark"

  return (
    <html lang="en" className={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

const pageTitles: Record<string, string> = {
  "/": "Queue",
  "/figures": "Queue",
  "/catalog": "Figure Catalog",
  "/spools": "Filament Spools",
  "/completed": "Completed",
}

export default function App() {
  const { pathname } = useLocation()

  useEffect(() => {
    initApp()
  }, [])

  const pageTitle = pageTitles[pathname] ?? ""

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background/80 px-4 shadow-sm backdrop-blur-sm">
            <SidebarTrigger />
            {pageTitle ? (
              <h1 className="text-sm font-semibold text-foreground">
                {pageTitle}
              </h1>
            ) : null}
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!"
  let details = "An unexpected error occurred."
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
