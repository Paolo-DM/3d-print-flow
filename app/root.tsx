import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  data,
  isRouteErrorResponse,
  useLocation,
} from "react-router"

import type { Route } from "./+types/root"
import { AppSidebar } from "~/components/AppSidebar"
import { useOptimisticTheme } from "~/hooks/use-optimistic-theme"
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

export const meta: Route.MetaFunction = () => [{ title: "3D Print Flow" }]

export const links: Route.LinksFunction = () => [
  {
    rel: "icon",
    href: "/favicon.ico",
    sizes: "16x16 32x32 48x48",
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "32x32",
    href: "/favicon-32x32.png",
  },
  {
    rel: "apple-touch-icon",
    sizes: "180x180",
    href: "/apple-touch-icon.png",
  },
]

export async function loader({ request }: Route.LoaderArgs) {
  const raw = await themeCookie.parse(request.headers.get("Cookie"))
  const theme: Theme = raw === "light" ? "light" : "dark"

  const headers: HeadersInit = {}
  if (raw !== theme) {
    headers["Set-Cookie"] = await themeCookie.serialize(theme)
  }

  return data({ theme }, { headers })
}

export async function clientLoader({
  serverLoader,
}: Route.ClientLoaderArgs) {
  const [serverData] = await Promise.all([serverLoader(), initApp()])
  return serverData
}
clientLoader.hydrate = true as const

export function HydrateFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-screen items-center justify-center"
    >
      <img
        src="/brand/flow-spool-logo.png"
        alt=""
        width={32}
        height={32}
        className="size-8 animate-pulse object-contain motion-reduce:animate-none dark:brightness-0 dark:invert"
      />
      <span className="sr-only">Loading 3D Print Flow</span>
    </div>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useOptimisticTheme()

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

  const pageTitle = pageTitles[pathname] ?? ""

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Skip to content
          </a>
          <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background px-4 shadow-sm">
            <SidebarTrigger />
            {pageTitle ? (
              <h1 className="text-sm font-semibold text-foreground">
                {pageTitle}
              </h1>
            ) : null}
          </header>
          <div id="main-content">
            <Outlet />
          </div>
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
